/** Split the photoreal raw chicken into retail cuts by plane regions — v2, exact planar caps.
 *
 *  Input : assets/models/raw-chicken.glb (one mesh: body shell with the legs merged in, plus two separate closed wing shells).
 *  Output: assets/models/raw-chicken-cuts.glb — root node "raw-chicken-cuts" with children breastL, breastR, thighL, thighR,
 *          drumL, drumR, wingL, wingR, rest — in the site's dressed-bird frame (breast +Y, neck -Z, drumsticks +Z, resting on
 *          y=0, centred in x/z, length 1.0 along Z = half turn about Y of the file axes, then translate).
 *
 *  Each piece node: extras {center,min,max} = bbox of its skin triangles; mesh primitives in this order:
 *    1. skin  — the original material/textures, UVs and normals interpolated at the cuts (exact clipped input triangles)
 *    2. cap   — material "raw-chicken-cut", flat normals = cut-plane normal, one exact polygon per planar cut
 *    3. inner — only for "rest": the skin copied with reversed winding + negated normals, material "raw-chicken-inner"
 *  The rest gets no caps (its inner shell shows the holes as flesh), so like the wings its cap primitive is a zero-area
 *  placeholder triangle. Nothing is lost: every input triangle (or its clipped
 *  fragments) ends up in exactly one piece; the script verifies this by area.
 *
 *  Regions are intersections of half-spaces (n points OUT of the region; inside = n·p - d < 0). Neighbouring regions share a
 *  plane, so they are disjoint by construction and the extraction order does not matter. The two wing shells are separate
 *  closed components of the input that only touch the body (no vertex lies inside it), so each wing is its whole shell and
 *  has no planar cut: its cap primitive is a single zero-area placeholder triangle (keeps the skin/cap primitive order).
 *  Drum/thigh are separated by angled knee planes (the two legs are posed differently, so each side has its own), breast/thigh
 *  by a slanted hip plane that follows the crease between the breast dome and the thigh.
 *
 *  Caps: for each plane of a region, the FULL body-shell cross-section is computed as closed loops (every triangle crossing
 *  the plane yields a segment whose end points are keyed by the welded mesh edge, so neighbours share points exactly), the
 *  loops are projected into the plane's 2D basis, clipped by the region's other half-spaces (2D Sutherland–Hodgman), slivers
 *  dropped, holes matched to their outer loop, ear-clipped (three's Earcut) and emitted facing the region's outward normal.
 *
 *  Usage: node scripts/split-raw-chicken.mjs [--in=assets/models/raw-chicken.glb] [--out=assets/models/raw-chicken-cuts.glb]
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, quantize } from '@gltf-transform/functions';
import { Earcut } from 'three/src/extras/Earcut.js';
import { stat } from 'node:fs/promises';

const args = process.argv.slice(2);
const opt = (n, d) => { const a = args.find(x => x.startsWith(n + '=')); return a ? a.slice(n.length + 1) : d; };
const IN = opt('--in', 'assets/models/raw-chicken.glb'), OUT = opt('--out', 'assets/models/raw-chicken-cuts.glb');
const EPS = 1e-6;            // plane-side tolerance for the skin clipper (positions are in a ~1.0 sized frame)
const SLIVER = 1e-4;         // cap polygons below this area are dropped (also kills microscopic self-intersection loops)
const COLLINEAR = 2e-5;      // loop vertices closer than this to their neighbours' chord are dropped before ear clipping
const CAP_UV_SCALE = .5;    // cap UVs = plane coordinates mapped into [0,1] (any UVs are fine; keeps quantize happy)

// ---- small vector helpers ---------------------------------------------------------------------------------------------
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const triArea = (a, b, c) => { const v = cross(sub(b, a), sub(c, a)); return Math.hypot(v[0], v[1], v[2]) / 2; };

// ---- regions -----------------------------------------------------------------------------------------------------------
/** half-space {n, d}: n is the unit normal pointing OUT of the region, p0 a point on the plane; inside = n·p - d < 0 */
const half = (n, p0) => { const u = norm(n); return { n: u, d: dot(u, p0) }; };
const flip = (pl) => ({ n: pl.n.map(x => -x), d: -pl.d });
const AX = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const lt = (axis, v) => half(AX[axis], AX[axis].map(c => c * v));                    // axis <  v
const ge = (axis, v) => half(AX[axis].map(c => -c), AX[axis].map(c => c * v));       // axis >= v
// shared planes
const midX = lt('x', 0);                       // breastL / drumL side: x < 0 ; breastR / drumR: flip
const breastOuterL = ge('x', -.19), breastOuterR = lt('x', .19);   // breast outer wall in front of the thigh (z < -.10)
// hip planes (vertical, slanted in plan): the crease between breast dome and thigh runs from (x ∓.19, z -.10) to (x ∓.11, z .13);
// breast = inside, thigh = flip. Behind z=-.10 this plane binds instead of the vertical outer wall; the thigh additionally
// stops at |x| = .11 so the plane's drift behind the breast does not reach the back saddle between the legs.
const hipL = half([-.23, 0, .08], [-.19, 0, -.10]), hipR = half([.23, 0, .08], [.19, 0, -.10]);
const thighFront = ge('z', -.10);              // thigh front = wing rear (flip)
// the breast dome (y up to .46) ends in a steep cliff at z≈.13–.145; behind it the back saddle sits at y≈.297, so the floor at
// y=.30 leaves the saddle to the rest and the rear plane at z=.16 keeps the whole dome including its natural rear face.
const breastFloor = ge('y', .30), breastRear = lt('z', .16);
// knee planes (drum side is "inside"); a real drumstick cut goes through the knee joint, roughly perpendicular to the drumstick.
// L leg rises steeply to the rear: the cut runs from (z .22, y .45) down to (z .32, y .30).
const kneeL = half([0, -.10, -.15], [0, .45, .22]);
// R leg lies almost horizontal with its knee further forward: the cut runs from (z .16, y .48) down to (z .30, y .27).
const kneeR = half([0, -.14, -.21], [0, .48, .16]);
/** REGIONS in extraction order. `whole`: name of an input component taken entirely (the wing shells). */
const REGIONS = [
  { name: 'wingL', whole: 'wingL', planes: [] },   // the whole shell, nothing cut from the body
  { name: 'wingR', whole: 'wingR', planes: [] },
  { name: 'drumL', planes: [kneeL, ge('y', .22), midX] },
  { name: 'drumR', planes: [kneeR, ge('y', .22), flip(midX)] },
  { name: 'thighL', planes: [thighFront, flip(kneeL), flip(hipL), lt('x', -.11), ge('y', .26)] },
  { name: 'thighR', planes: [thighFront, flip(kneeR), flip(hipR), ge('x', .11), ge('y', .26)] },
  { name: 'breastL', planes: [breastFloor, ge('z', -.42), breastRear, breastOuterL, hipL, midX] },
  { name: 'breastR', planes: [breastFloor, ge('z', -.42), breastRear, breastOuterR, hipR, flip(midX)] },
];
const ORDER = ['breastL', 'breastR', 'thighL', 'thighR', 'drumL', 'drumR', 'wingL', 'wingR', 'rest'];

// ---- load + move into the site frame ------------------------------------------------------------------------------------
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(IN); const root = doc.getRoot();
const srcNode = root.listNodes().find(n => n.getMesh()), srcMesh = srcNode.getMesh(), srcPrim = srcMesh.listPrimitives()[0];
const skinMat = srcPrim.getMaterial();
const sc = srcNode.getScale(), tr = srcNode.getTranslation();
const acc = (s) => srcPrim.getAttribute(s); const nV = acc('POSITION').getCount();
const P = new Float64Array(nV * 3), N = new Float64Array(nV * 3), UV = new Float64Array(nV * 2), e = [];
for (let i = 0; i < nV; i++) {
  acc('POSITION').getElement(i, e); P[i * 3] = -(e[0] * sc[0] + tr[0]); P[i * 3 + 1] = e[1] * sc[1] + tr[1]; P[i * 3 + 2] = -(e[2] * sc[2] + tr[2]);
  acc('NORMAL').getElement(i, e); N[i * 3] = -e[0]; N[i * 3 + 1] = e[1]; N[i * 3 + 2] = -e[2];
  acc('TEXCOORD_0').getElement(i, e); UV[i * 2] = e[0]; UV[i * 2 + 1] = e[1];
}
const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
for (let i = 0; i < nV; i++) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P[i * 3 + k]); mx[k] = Math.max(mx[k], P[i * 3 + k]); }
const off = [(mn[0] + mx[0]) / 2, mn[1], (mn[2] + mx[2]) / 2];
for (let i = 0; i < nV; i++) for (let k = 0; k < 3; k++) P[i * 3 + k] -= off[k];
const idxAcc = srcPrim.getIndices(); const nT = idxAcc.getCount() / 3; const IDX = new Uint32Array(nT * 3);
for (let i = 0; i < nT * 3; i++) IDX[i] = idxAcc.getScalar(i);
console.log('in :', IN, '| triangles', nT, '| vertices', nV, '| size', (mx[0] - mn[0]).toFixed(3), (mx[1] - mn[1]).toFixed(3), (mx[2] - mn[2]).toFixed(3));

// weld by exact (quantized) position → canonical vertex ids, then connected components (the wings are separate shells)
const canon = new Int32Array(nV); let nCanon = 0; { const keyOf = new Map(); for (let i = 0; i < nV; i++) { const k = P[i * 3] + ',' + P[i * 3 + 1] + ',' + P[i * 3 + 2]; let c = keyOf.get(k); if (c === undefined) { c = nCanon++; keyOf.set(k, c); } canon[i] = c; } }
const compOf = new Int32Array(nT), compName = {};
{
  const par = new Int32Array(nCanon).map((_, i) => i); const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let t = 0; t < nT; t++) { const a = find(canon[IDX[t * 3]]), b = find(canon[IDX[t * 3 + 1]]), c = find(canon[IDX[t * 3 + 2]]); par[a] = b; par[find(b)] = find(c); }
  const stats = new Map();
  for (let t = 0; t < nT; t++) { const r = find(canon[IDX[t * 3]]); compOf[t] = r; const s = stats.get(r) || { tris: 0, sx: 0 }; s.tris++; s.sx += P[IDX[t * 3] * 3]; stats.set(r, s); }
  const comps = [...stats.entries()].sort((a, b) => b[1].tris - a[1].tris);
  compName[comps[0][0]] = 'body';
  const wings = comps.slice(1); if (wings.length !== 2) throw new Error('expected exactly two wing shells besides the body, found ' + comps.length + ' components');
  for (const [r, s] of wings) compName[r] = s.sx < 0 ? 'wingL' : 'wingR';
  console.log('components:', comps.map(([r, s]) => `${compName[r]}=${s.tris} tris`).join(', '));
}
const bodyTris = []; for (let t = 0; t < nT; t++) if (compName[compOf[t]] === 'body') bodyTris.push(t);

// polygon = { v:[{p,n,uv}...] (convex, source winding), tri: source triangle index }
let remainder = [];
for (let t = 0; t < nT; t++) {
  const v = []; for (let k = 0; k < 3; k++) { const i = IDX[t * 3 + k]; v.push({ p: [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], n: [N[i * 3], N[i * 3 + 1], N[i * 3 + 2]], uv: [UV[i * 2], UV[i * 2 + 1]] }); }
  remainder.push({ v, tri: t });
}
const inputArea = new Float64Array(nT); for (const poly of remainder) inputArea[poly.tri] = triArea(poly.v[0].p, poly.v[1].p, poly.v[2].p);

// ---- skin clipping (Sutherland–Hodgman on convex polygons, vertices on the plane go to both sides) ------------------------
const sd = (pl, p) => dot(pl.n, p) - pl.d;
function lerpV(a, b, t) { const m = (u, v) => u + (v - u) * t; return { p: [m(a.p[0], b.p[0]), m(a.p[1], b.p[1]), m(a.p[2], b.p[2])], n: [m(a.n[0], b.n[0]), m(a.n[1], b.n[1]), m(a.n[2], b.n[2])], uv: [m(a.uv[0], b.uv[0]), m(a.uv[1], b.uv[1])] }; }
function polyArea(v) { let s = 0; for (let i = 1; i + 1 < v.length; i++) s += triArea(v[0].p, v[i].p, v[i + 1].p); return s; }
/** split a convex polygon by a plane → {inside, outside} (either may be null) */
function splitPoly(poly, pl) {
  const v = poly.v, d = v.map(x => sd(pl, x.p)), side = d.map(x => x > EPS ? 1 : x < -EPS ? -1 : 0);
  if (!side.some(s => s > 0)) return { inside: poly, outside: null };
  if (!side.some(s => s < 0)) return { inside: null, outside: poly };
  const ins = [], outs = [];
  for (let i = 0; i < v.length; i++) {
    const j = (i + 1) % v.length, a = v[i], b = v[j];
    if (side[i] === 0) { ins.push(a); outs.push(a); } else if (side[i] < 0) ins.push(a); else outs.push(a);
    if (side[i] * side[j] < 0) { const m = lerpV(a, b, d[i] / (d[i] - d[j])); ins.push(m); outs.push(m); }
  }
  const mk = (list) => list.length >= 3 && polyArea(list) > 1e-14 ? { v: list, tri: poly.tri } : null;
  return { inside: mk(ins), outside: mk(outs) };
}
/** take everything inside all planes (plus whole components) out of the remainder */
function extract(region) {
  const piece = [], rest = [];
  for (const poly of remainder) {
    if (region.whole && compName[compOf[poly.tri]] === region.whole) { piece.push(poly); continue; }
    if (compName[compOf[poly.tri]] !== 'body' || !region.planes.length) { rest.push(poly); continue; }   // wing shells are never clipped
    let cur = poly, dead = false;
    for (const pl of region.planes) { const r = splitPoly(cur, pl); if (r.outside) rest.push(r.outside); if (!r.inside) { dead = true; break; } cur = r.inside; }
    if (!dead) piece.push(cur);
  }
  remainder = rest; return piece;
}

// ---- exact caps: full body-shell cross-section per plane, clipped by the region's other half-spaces ------------------------
const sectionCache = new Map();
/** closed loops of the body shell on the plane, as 3D points; segments are oriented so the solid is on the left when looking
 *  against n (CCW in the (u,v) basis with u×v = n) — used as a check, holes are classified by nesting. */
function crossSection(pl) {
  const key = pl.n.map(x => x.toFixed(9)).join(',') + '|' + pl.d.toFixed(9);
  if (sectionCache.has(key)) return sectionCache.get(key);
  const dist = new Float64Array(nV); for (let i = 0; i < nV; i++) { let d = sd(pl, [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]); if (Math.abs(d) < 1e-9) d = 1e-9; dist[i] = d; }
  const segs = [];   // {a:{key,p}, b:{key,p}}
  const ek = (i, j) => { const a = canon[i], b = canon[j]; return a < b ? a * nV + b : b * nV + a; };
  const ip = (i, j) => { const t = dist[i] / (dist[i] - dist[j]); return [P[i * 3] + (P[j * 3] - P[i * 3]) * t, P[i * 3 + 1] + (P[j * 3 + 1] - P[i * 3 + 1]) * t, P[i * 3 + 2] + (P[j * 3 + 2] - P[i * 3 + 2]) * t]; };
  for (const t of bodyTris) {
    const i0 = IDX[t * 3], i1 = IDX[t * 3 + 1], i2 = IDX[t * 3 + 2];
    const s0 = dist[i0] > 0, s1 = dist[i1] > 0, s2 = dist[i2] > 0; if (s0 === s1 && s1 === s2) continue;
    const pts = []; for (const [i, j] of [[i0, i1], [i1, i2], [i2, i0]]) if ((dist[i] > 0) !== (dist[j] > 0)) pts.push({ key: ek(i, j), p: ip(i, j) });
    if (pts.length !== 2) continue;
    const p0 = [P[i0 * 3], P[i0 * 3 + 1], P[i0 * 3 + 2]], p1 = [P[i1 * 3], P[i1 * 3 + 1], P[i1 * 3 + 2]], p2 = [P[i2 * 3], P[i2 * 3 + 1], P[i2 * 3 + 2]];
    const faceN = cross(sub(p1, p0), sub(p2, p0)), dir = cross(pl.n, faceN);
    if (dot(sub(pts[1].p, pts[0].p), dir) < 0) pts.reverse();
    segs.push({ a: pts[0], b: pts[1], used: false });
  }
  // chain by edge keys (undirected walk; orientation checked by majority afterwards)
  const byKey = new Map(); segs.forEach((s, i) => { for (const k of [s.a.key, s.b.key]) { if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(i); } });
  const loops = []; let open = 0, flippedLoops = 0;
  for (let s0 = 0; s0 < segs.length; s0++) {
    if (segs[s0].used) continue;
    const pts = [segs[s0].a.p]; let agree = 1, cur = s0, curKey = segs[s0].b.key; segs[s0].used = true; pts.push(segs[s0].b.p);
    const startKey = segs[s0].a.key;
    while (curKey !== startKey) {
      const next = (byKey.get(curKey) || []).find(i => !segs[i].used); if (next === undefined) { open++; break; }
      const s = segs[next]; s.used = true; cur = next;
      if (s.a.key === curKey) { agree++; curKey = s.b.key; pts.push(s.b.p); } else { agree--; curKey = s.a.key; pts.push(s.a.p); }
    }
    if (curKey === startKey) pts.pop();      // closed: the last point repeats the first
    if (pts.length < 3) continue;
    if (agree < 0) { pts.reverse(); flippedLoops++; }
    loops.push(pts);
  }
  const res = { loops, open, flippedLoops, segs: segs.length }; sectionCache.set(key, res); return res;
}
/** 2D basis on the plane: u × v = n */
function basis(pl) { const n = pl.n; const u = norm(cross(Math.abs(n[1]) < .9 ? [0, 1, 0] : [1, 0, 0], n)); const v = cross(n, u); return { u, v, o: n.map(x => x * pl.d) }; }
const area2 = (poly) => { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
function clip2(poly, A, B, C) {   // keep A*x + B*y + C < 0 ; vertices on the line kept once
  const d = poly.map(q => A * q[0] + B * q[1] + C), side = d.map(x => x > EPS ? 1 : x < -EPS ? -1 : 0);
  if (!side.some(s => s > 0)) return poly; if (!side.some(s => s < 0)) return null;
  const out = [];
  for (let i = 0; i < poly.length; i++) { const j = (i + 1) % poly.length; if (side[i] <= 0) out.push(poly[i]); if (side[i] * side[j] < 0) { const t = d[i] / (d[i] - d[j]); out.push([poly[i][0] + (poly[j][0] - poly[i][0]) * t, poly[i][1] + (poly[j][1] - poly[i][1]) * t]); } }
  return out.length >= 3 ? out : null;
}
/** drop vertices within `tol` of the chord between their neighbours (smooth mesh loops are locally almost collinear, which
 *  makes ear clipping produce hairline slivers; tol is below the quantization step so the cap still meets the skin cut) */
function simplifyLoop(poly, tol) {
  let out = poly, changed = true;
  while (changed && out.length > 3) { changed = false; const keep = []; for (let i = 0; i < out.length; i++) { const a = out[(i + out.length - 1) % out.length], b = out[i], c = out[(i + 1) % out.length]; const dx = c[0] - a[0], dy = c[1] - a[1], l = Math.hypot(dx, dy); const dist = l < 1e-12 ? Math.hypot(b[0] - a[0], b[1] - a[1]) : Math.abs(dx * (b[1] - a[1]) - dy * (b[0] - a[0])) / l; if (dist < tol && out.length - (out.length - keep.length - (i + 1 - keep.length)) > 3 && keep.length + (out.length - i - 1) >= 3) { changed = true; continue; } keep.push(b); } out = keep; }
  return out;
}
function pointInPoly(q, poly) { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside; } return inside; }
/** cap triangles (vertices {p,n,uv}) for one plane of a region */
function capOnPlane(region, pl, log) {
  const sec = crossSection(pl); const { u, v, o } = basis(pl);
  const others = region.planes.filter(q => q !== pl).map(q => ({ A: dot(q.n, u), B: dot(q.n, v), C: dot(q.n, o) - q.d }));
  let polys = [];
  if (process.env.DEBUG_SECTIONS && sec.loops.length > 1) for (const loop of sec.loops) { const bm = [1e9, 1e9, 1e9], bM = [-1e9, -1e9, -1e9]; for (const p of loop) for (let k = 0; k < 3; k++) { bm[k] = Math.min(bm[k], p[k]); bM[k] = Math.max(bM[k], p[k]); } log.push(`      loop ${loop.length} pts, area2d ${area2(loop.map(p => [dot(sub(p, o), u), dot(sub(p, o), v)])).toFixed(5)}, bbox ${bm.map(x => x.toFixed(3))} .. ${bM.map(x => x.toFixed(3))}`); }
  for (const loop of sec.loops) {
    let poly = loop.map(p => [dot(sub(p, o), u), dot(sub(p, o), v)]);
    for (const h of others) { poly = clip2(poly, h.A, h.B, h.C); if (!poly) break; }
    if (poly) poly = simplifyLoop(poly, COLLINEAR);
    if (poly && poly.length >= 3 && Math.abs(area2(poly)) >= SLIVER) polys.push(poly);
  }
  if (!polys.length) return [];
  // classify by nesting parity: a polygon inside an odd number of others is a hole
  const depth = polys.map((p, i) => polys.reduce((k, q, j) => k + (j !== i && pointInPoly(p[0], q) ? 1 : 0), 0));
  const outers = [], holes = [];
  polys.forEach((p, i) => { const s = area2(p); const want = depth[i] % 2 === 0 ? 1 : -1; if (Math.sign(s) !== want) p.reverse(); (want > 0 ? outers : holes).push(p); });
  const tris = []; let capArea = 0;
  for (const outer of outers) {
    const myHoles = holes.filter(h => pointInPoly(h[0], outer));
    const flat = [], holeIdx = []; for (const q of outer) flat.push(q[0], q[1]); for (const h of myHoles) { holeIdx.push(flat.length / 2); for (const q of h) flat.push(q[0], q[1]); }
    const ind = Earcut.triangulate(flat, holeIdx.length ? holeIdx : null, 2);
    for (let i = 0; i < ind.length; i += 3) {
      let a = ind[i], b = ind[i + 1], c = ind[i + 2];
      const qa = [flat[a * 2], flat[a * 2 + 1]], qb = [flat[b * 2], flat[b * 2 + 1]], qc = [flat[c * 2], flat[c * 2 + 1]];
      const s = area2([qa, qb, qc]); if (Math.abs(s) < 1e-13) continue; const tri = s > 0 ? [qa, qb, qc] : [qa, qc, qb]; capArea += Math.abs(s);
      tris.push({ v: tri.map(q => ({ p: [o[0] + q[0] * u[0] + q[1] * v[0], o[1] + q[0] * u[1] + q[1] * v[1], o[2] + q[0] * u[2] + q[1] * v[2]], n: pl.n.slice(), uv: [q[0] * CAP_UV_SCALE + .5, q[1] * CAP_UV_SCALE + .5] })), tri: -1 });
    }
  }
  log.push(`    plane n=(${pl.n.map(x => x.toFixed(2)).join(',')}) d=${pl.d.toFixed(3)}: section loops ${sec.loops.length}${sec.open ? ' open ' + sec.open : ''}${sec.flippedLoops ? ' flipped ' + sec.flippedLoops : ''} → cap polys ${outers.length}+${holes.length} holes, ${tris.length} tris, area ${capArea.toFixed(4)}`);
  return tris;
}

// ---- run ----------------------------------------------------------------------------------------------------------------
const PIECES = {};
for (const region of REGIONS) {
  const skin = extract(region), log = [], cap = [];
  for (const pl of region.planes) cap.push(...capOnPlane(region, pl, log));
  PIECES[region.name] = { skin, cap };
  console.log(`${region.name}: skin polys ${skin.length}, cap tris ${cap.length}\n${log.join('\n')}`);
}
PIECES.rest = { skin: remainder, cap: [] };

// ---- checks: nothing lost, one blob per piece -------------------------------------------------------------------------------
{
  const covered = new Float64Array(nT); let frags = 0;
  for (const name of ORDER) for (const poly of PIECES[name].skin) { covered[poly.tri] += polyArea(poly.v); frags++; }
  let worst = 0, missing = 0; for (let t = 0; t < nT; t++) { const rel = Math.abs(covered[t] - inputArea[t]) / Math.max(inputArea[t], 1e-12); if (inputArea[t] > 1e-12 && covered[t] === 0) missing++; worst = Math.max(worst, inputArea[t] > 1e-9 ? rel : 0); }
  const totalIn = inputArea.reduce((a, b) => a + b, 0), totalOut = covered.reduce((a, b) => a + b, 0);
  console.log(`coverage: ${frags} skin fragments from ${nT} input triangles | area in ${totalIn.toFixed(6)} out ${totalOut.toFixed(6)} | worst per-triangle rel. error ${worst.toExponential(2)} | triangles with no fragment ${missing}`);
  if (missing || worst > 1e-6) throw new Error('coverage check failed');
  for (const name of ORDER) {   // connected blobs by shared vertex positions
    const key = new Map(), par = []; const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    const id = (p) => { const k = p.map(x => x.toFixed(6)).join(','); let i = key.get(k); if (i === undefined) { i = par.length; par.push(i); key.set(k, i); } return i; };
    for (const poly of PIECES[name].skin) { const ids = poly.v.map(q => id(q.p)); for (let i = 1; i < ids.length; i++) par[find(ids[i])] = find(ids[0]); }
    const sizes = new Map(); for (const poly of PIECES[name].skin) { const r = find(id(poly.v[0].p)); sizes.set(r, (sizes.get(r) || 0) + 1); }
    const list = [...sizes.entries()].sort((a, b) => b[1] - a[1]);
    if (list.length > 1) {
      const bb = (r) => { const bm = [1e9, 1e9, 1e9], bM = [-1e9, -1e9, -1e9]; for (const poly of PIECES[name].skin) if (find(id(poly.v[0].p)) === r) for (const q of poly.v) for (let k = 0; k < 3; k++) { bm[k] = Math.min(bm[k], q.p[k]); bM[k] = Math.max(bM[k], q.p[k]); } return bm.map(x => x.toFixed(3)) + ' .. ' + bM.map(x => x.toFixed(3)); };
      console.log(`  ${name}: ${list.length} blobs — ` + list.slice(0, 5).map(([r, n], i) => `${n} frags${i ? ' at ' + bb(r) : ''}`).join('; '));
    }
  }
}

// ---- emit ------------------------------------------------------------------------------------------------------------------
function triangulate(polys) { const out = []; for (const poly of polys) for (let i = 1; i + 1 < poly.v.length; i++) out.push(poly.v[0], poly.v[i], poly.v[i + 1]); return out; }
const buffer = root.listBuffers()[0];
function primitive(verts, material, reverse = false) {
  const key = new Map(), pos = [], nor = [], uv = [], ind = [];
  for (const v of verts) {
    const nn = reverse ? v.n.map(x => -x) : v.n;
    const k = v.p.map(x => x.toFixed(6)).join(',') + '|' + nn.map(x => x.toFixed(3)).join(',') + '|' + v.uv.map(x => x.toFixed(5)).join(',');
    let i = key.get(k); if (i === undefined) { i = pos.length / 3; key.set(k, i); pos.push(...v.p); const l = Math.hypot(...nn) || 1; nor.push(nn[0] / l, nn[1] / l, nn[2] / l); uv.push(...v.uv); } ind.push(i);
  }
  if (reverse) for (let i = 0; i < ind.length; i += 3) { const t = ind[i + 1]; ind[i + 1] = ind[i + 2]; ind[i + 2] = t; }
  const prim = doc.createPrimitive().setMaterial(material)
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(nor)).setBuffer(buffer))
    .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(uv)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(pos.length / 3 > 65535 ? new Uint32Array(ind) : new Uint16Array(ind)).setBuffer(buffer));
  return { prim, tris: ind.length / 3, verts: pos.length / 3 };
}
const capMat = doc.createMaterial('raw-chicken-cut').setBaseColorFactor([0.86, 0.47, 0.40, 1]).setRoughnessFactor(.62).setMetallicFactor(0);
const innerMat = doc.createMaterial('raw-chicken-inner').setBaseColorFactor([0.80, 0.42, 0.36, 1]).setRoughnessFactor(.7).setMetallicFactor(0);
const scene = root.listScenes()[0];
const holder = doc.createNode('raw-chicken-cuts'); scene.addChild(holder);
const summary = []; let skinTotal = 0, capTotal = 0;
for (const name of ORDER) {
  const pc = PIECES[name], mesh = doc.createMesh(name), sk = triangulate(pc.skin), cp = triangulate(pc.cap);
  const a = primitive(sk, skinMat); mesh.addPrimitive(a.prim);
  let b = null;
  if (cp.length) { b = primitive(cp, capMat); mesh.addPrimitive(b.prim); }
  else {   // no planar cut (the wing shells, the rest): zero-area placeholder so every piece keeps the skin, cap[, inner] primitive order
    const c = [0, 1, 2].map(k => sk.reduce((s, v) => s + v.p[k], 0) / sk.length); const q = { p: c, n: [1, 0, 0], uv: [.5, .5] };
    b = primitive([q, q, q], capMat); b.tris = 0; mesh.addPrimitive(b.prim); console.log(`  ${name}: no planar cut — cap primitive is a zero-area placeholder triangle`);
  }
  if (name === 'rest') mesh.addPrimitive(primitive(sk, innerMat, true).prim);
  const bm = [1e9, 1e9, 1e9], bM = [-1e9, -1e9, -1e9]; for (const v of sk) for (let k = 0; k < 3; k++) { bm[k] = Math.min(bm[k], v.p[k]); bM[k] = Math.max(bM[k], v.p[k]); }
  const r6 = (x) => Math.round(x * 1e6) / 1e6;
  const node = doc.createNode(name).setMesh(mesh).setExtras({ center: [r6((bm[0] + bM[0]) / 2), r6((bm[1] + bM[1]) / 2), r6((bm[2] + bM[2]) / 2)], min: bm.map(r6), max: bM.map(r6) }); holder.addChild(node);
  skinTotal += a.tris; capTotal += b ? b.tris : 0;
  summary.push({ name, skinTris: a.tris, capTris: b ? b.tris : 0 });
  console.log(`${name.padEnd(8)} skin ${String(a.tris).padStart(6)} tris  cap ${String(b ? b.tris : 0).padStart(5)}  bbox ${bm.map(v => v.toFixed(3)).join(',')} .. ${bM.map(v => v.toFixed(3)).join(',')}`);
}
scene.removeChild(srcNode); srcNode.dispose(); srcMesh.dispose();
root.getAsset().generator = 'scripts/split-raw-chicken.mjs (gltf-transform)';
await doc.transform(quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }), dedup(), prune());
await io.write(OUT, doc);
const size = (await stat(OUT)).size;
console.log('out:', OUT, '| skin triangles', skinTotal, '| cap triangles', capTotal, '| size', size, size > 2.5e6 ? '(TOO BIG)' : '');
console.log('SUMMARY ' + JSON.stringify({ pieces: summary, skinTrisTotal: skinTotal, sizeBytes: size }));
