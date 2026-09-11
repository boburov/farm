/** Validates the GLB assets against scripts/asset-spec.json and the site's own tables in index.html.
 * Usage: node scripts/validate-assets.mjs [files...] [--json] [--dir=assets/models]
 * Exit 1 on any failure. Node-generated fallback assets (custom _RIG_* attributes, no skins) are accepted.
 */
import { readFile, access } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { readGlb, meshNodes, nodeWorldMatrices, applyMat } from './lib/glb.mjs';

const args = process.argv.slice(2), asJson = args.includes('--json');
const dir = (args.find(a => a.startsWith('--dir=')) || '--dir=assets/models').slice(6);
const texroot = (args.find(a => a.startsWith('--texroot=')) || '').slice(10); // resolve image URIs as if the GLB lived here
const spec = JSON.parse(await readFile('scripts/asset-spec.json', 'utf8'));
const tol = spec.tolerances;
const files = args.filter(a => !a.startsWith('--'));
const list = files.length ? files : JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8')).assets.map(a => join(dir, a.file));
const report = { files: {}, siteSpec: [], fails: 0 };

// ---------- spec vs index.html ----------
try {
  const html = await readFile('index.html', 'utf8');
  const grab = (re) => { const m = html.match(re); return m ? m[1] : null; };
  const henTxt = grab(/var HEN=\{([^}]+)\}/), manTxt = grab(/var MAN=\{([^}]+)\}/);
  const parse = (t) => Object.fromEntries(t.replace(/\s+/g, '').split(',').filter(Boolean).map(kv => { const [k, v] = kv.split(':'); return [k, Number(v)]; }));
  const hen = parse(henTxt), man = parse(manTxt);
  for (const [k, v] of Object.entries(spec.hen.landmarks)) if (Math.abs(hen[k] - v) > 1e-9) report.siteSpec.push(`HEN.${k} differs: site ${hen[k]} spec ${v}`);
  for (const [k, v] of Object.entries(spec.worker.landmarks)) if (Math.abs(man[k] - v) > 1e-9) report.siteSpec.push(`MAN.${k} differs: site ${man[k]} spec ${v}`);
  const henRig = html.slice(html.indexOf('function henRigSpec'), html.indexOf('function henStaticGeo'));
  const names = [...henRig.matchAll(/\{name:"(\w+)"/g)].map(m => m[1]);
  const specNames = spec.hen.bones.map(b => b.name);
  if (names.join() !== specNames.join()) report.siteSpec.push(`hen bone order differs: site [${names}] spec [${specNames}]`);
  const humanRig = html.slice(html.indexOf('function humanRigSpec'), html.indexOf('function makeProp'));
  const hn = [...humanRig.matchAll(/\{name:"(\w+)"/g)].map(m => m[1]);
  if (hn.join() !== spec.worker.bones.map(b => b.name).join()) report.siteSpec.push(`worker bone order differs: site [${hn}]`);
  const chickS = Number(grab(/var CHICK_S=([\d.]+);/));
  if (Math.abs(chickS - spec.hen.chickScale) > 1e-9) report.siteSpec.push(`CHICK_S differs: ${chickS}`);
} catch (e) { report.siteSpec.push('could not check index.html: ' + e.message); }

// ---------- helpers ----------
const family = (f) => /^hen-/.test(f) ? 'hen' : /^chick-/.test(f) ? 'chick' : /^poultry-cuts/.test(f) ? 'dressed' : /^worker/.test(f) ? 'worker' : 'other';
function bounds(nodes) {
  const b = { min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9] };
  for (const n of nodes) for (const p of n.primitives) { const a = p.attributes.POSITION; for (let i = 0; i < a.count; i++) { const v = applyMat(n.world, [a[i * 3], a[i * 3 + 1], a[i * 3 + 2]]); for (let k = 0; k < 3; k++) { b.min[k] = Math.min(b.min[k], v[k]); b.max[k] = Math.max(b.max[k], v[k]); } } }
  return b;
}
function centroid(n) { const a = n.primitives[0].attributes.POSITION; const c = [0, 0, 0]; for (let i = 0; i < a.count; i++) { const v = applyMat(n.world, [a[i * 3], a[i * 3 + 1], a[i * 3 + 2]]); c[0] += v[0]; c[1] += v[1]; c[2] += v[2]; } return c.map(v => v / a.count); }
function triCount(n) { return n.primitives.reduce((s, p) => s + (p.indices ? p.indices.count : p.attributes.POSITION.count) / 3, 0); }
function watertight(prim, eps) {
  const pos = prim.attributes.POSITION, idx = prim.indices; if (!idx) return { ok: false, why: 'no index' };
  const key = new Map(), remap = new Int32Array(pos.count); const q = 1 / eps;
  for (let i = 0; i < pos.count; i++) { const k = `${Math.round(pos[i * 3] * q)},${Math.round(pos[i * 3 + 1] * q)},${Math.round(pos[i * 3 + 2] * q)}`; if (!key.has(k)) key.set(k, i); remap[i] = key.get(k); }
  const edges = new Map(); let degenerate = 0;
  for (let t = 0; t < idx.count; t += 3) { const a = remap[idx[t]], b = remap[idx[t + 1]], c = remap[idx[t + 2]]; if (a === b || b === c || a === c) { degenerate++; continue; } for (const [u, v] of [[a, b], [b, c], [c, a]]) { const k = u < v ? u + ':' + v : v + ':' + u; edges.set(k, (edges.get(k) || 0) + 1); } }
  let open = 0, over = 0; for (const c of edges.values()) { if (c === 1) open++; else if (c > 2) over++; }
  return { ok: open === 0, open, over, degenerate };
}
function boundaryLoops(prim, eps) { const w = watertight(prim, eps); return w.open; }

// ---------- per file ----------
for (const file of list) {
  const fails = [], notes = {}; const name = basename(file, '.glb'); const fam = family(name);
  let doc; try { doc = await readGlb(file); } catch (e) { report.files[name] = { fails: ['unreadable: ' + e.message] }; report.fails++; continue; }
  const json = doc.json;
  if (!json.asset || json.asset.version !== '2.0') fails.push('asset.version is not 2.0');
  if ((json.extensionsRequired || []).length) fails.push('extensionsRequired must be empty: ' + json.extensionsRequired.join());
  const nodes = meshNodes(doc); const names = nodes.map(n => n.name);
  notes.nodes = names; notes.triangles = Math.round(nodes.reduce((s, n) => s + triCount(n), 0));
  for (const n of nodes) {
    if (n.primitives.length !== 1) fails.push(`${n.name}: ${n.primitives.length} primitives (need exactly 1)`);
    for (const p of n.primitives) {
      if (p.mode !== 4) fails.push(`${n.name}: primitive mode ${p.mode} (need TRIANGLES)`);
      const pos = p.attributes.POSITION; if (!pos) { fails.push(`${n.name}: no POSITION`); continue; }
      for (const [k, a] of Object.entries(p.attributes)) if (a.count !== pos.count) fails.push(`${n.name}: ${k} count ${a.count} != ${pos.count}`);
      if (!p.attributes.NORMAL) fails.push(`${n.name}: no NORMAL`); if (!p.attributes.TEXCOORD_0) fails.push(`${n.name}: no TEXCOORD_0`);
      let nan = 0; for (let i = 0; i < pos.length; i++) if (!Number.isFinite(pos[i])) nan++; if (nan) fails.push(`${n.name}: ${nan} non-finite positions`);
      if (p.indices) { let mx = 0; for (let i = 0; i < p.indices.length; i++) if (p.indices[i] > mx) mx = p.indices[i]; if (mx >= pos.count) fails.push(`${n.name}: index ${mx} >= ${pos.count}`); }
      const nr = p.attributes.NORMAL; if (nr) { let bad = 0; for (let i = 0; i < nr.count; i += Math.max(1, Math.floor(nr.count / 2000))) { const l = Math.hypot(nr[i * 3], nr[i * 3 + 1], nr[i * 3 + 2]); if (Math.abs(l - 1) > tol.normalLen) bad++; } if (bad) fails.push(`${n.name}: ${bad} sampled normals not unit length`); }
      const J = p.attributes.JOINTS_0 || p.attributes._RIG_JOINTS, Wt = p.attributes.WEIGHTS_0 || p.attributes._RIG_WEIGHTS;
      if (fam === 'hen' || fam === 'chick' || fam === 'worker') {
        const boneN = fam === 'worker' ? spec.worker.bones.length : spec.hen.bones.length;
        if (!J || !Wt) fails.push(`${n.name}: missing skin attributes`);
        else { let mx = 0, badSum = 0; const norm = Wt.normalized ? (Wt.componentType === 5121 ? 255 : 65535) : 1; for (let i = 0; i < J.length; i++) if (J[i] > mx) mx = J[i]; if (mx >= boneN) fails.push(`${n.name}: joint index ${mx} >= ${boneN}`); for (let i = 0; i < Wt.count; i++) { const s = (Wt[i * 4] + Wt[i * 4 + 1] + Wt[i * 4 + 2] + Wt[i * 4 + 3]) / norm; if (Math.abs(s - 1) > tol.weightSum) badSum++; } if (badSum) fails.push(`${n.name}: ${badSum} vertices with weights not summing to 1`); }
        const slot = n.extras.slot; if (slot === undefined || slot < 0 || slot > 3) fails.push(`${n.name}: extras.slot missing/out of range`);
      }
    }
  }
  // skins: joint names and rest positions
  if (json.skins && json.skins.length) {
    const canon = (fam === 'worker' ? spec.worker.bones : spec.hen.bones); const scale = fam === 'chick' ? spec.hen.chickScale : 1;
    const world = nodeWorldMatrices(json);
    for (const skin of json.skins) {
      const jn = skin.joints.map(j => json.nodes[j].name); const missing = canon.map(b => b.name).filter(x => !jn.includes(x)); const extra = jn.filter(x => !canon.find(b => b.name === x));
      if (missing.length) fails.push(`skin missing joints: ${missing}`); if (extra.length) fails.push(`skin has unknown joints: ${extra}`);
      for (const j of skin.joints) { const b = canon.find(x => x.name === json.nodes[j].name); if (!b) continue; const p = applyMat(world[j], [0, 0, 0]); const d = Math.hypot(p[0] - b.at[0] * scale, p[1] - b.at[1] * scale, p[2] - b.at[2] * scale) * 1000; if (d > tol.jointPosMm) fails.push(`joint ${b.name} rest position off by ${d.toFixed(2)} mm`); }
    }
    const boneNames = new Set(canon.map(b => b.name)); for (const nm of names) if (boneNames.has(nm)) fails.push(`mesh node '${nm}' collides with a bone name`);
  }
  // family rules
  const has = (x) => names.includes(x);
  if (fam === 'hen' || fam === 'chick') {
    for (const req of spec.hen.nodes.hero) if (!has(req)) fails.push(`missing node ${req}`);
    const tier = /-hero/.test(name) ? 'hero' : /-mid/.test(name) ? 'mid' : 'lod'; const budget = (fam === 'chick' ? spec.chick.budgets : spec.hen.budgets)[tier];
    if (notes.triangles > budget) fails.push(`triangles ${notes.triangles} > ${tier} budget ${budget}`);
    const b = bounds(nodes); notes.bounds = b; const bb = fam === 'chick' ? spec.hen.bounds.chick : spec.hen.bounds.adult;
    const inR = (v, r) => v >= r[0] && v <= r[1];
    if (!inR(b.min[1], bb.minY)) fails.push(`min y ${b.min[1].toFixed(4)} outside ${bb.minY} (feet must touch the ground)`);
    if (!inR(b.max[1], bb.maxY)) fails.push(`max y ${b.max[1].toFixed(4)} outside ${bb.maxY}`);
    if (bb.eyeY && has('eyes')) { const e = centroid(nodes.find(n => n.name === 'eyes')); notes.eyes = e.map(v => +v.toFixed(4)); if (!inR(e[1], bb.eyeY)) fails.push(`eye height ${e[1].toFixed(4)} outside ${bb.eyeY}`); }
  }
  if (fam === 'dressed') {
    for (const req of spec.dressed.parts.concat(spec.dressed.whole)) if (!has(req)) fails.push(`missing node ${req}`);
    if (notes.triangles > spec.dressed.budgets.total) fails.push(`triangles ${notes.triangles} > ${spec.dressed.budgets.total}`);
    const whole = nodes.find(n => n.name === 'whole'); if (whole) { const b = bounds([whole]); notes.whole = { length: +(b.max[2] - b.min[2]).toFixed(3), width: +(b.max[0] - b.min[0]).toFixed(3), minY: +b.min[1].toFixed(3) }; const r = spec.dressed.bounds; if (notes.whole.length < r.wholeLengthZ[0] || notes.whole.length > r.wholeLengthZ[1]) fails.push(`whole length ${notes.whole.length} outside ${r.wholeLengthZ}`); if (notes.whole.width < r.wholeWidthX[0] || notes.whole.width > r.wholeWidthX[1]) fails.push(`whole width ${notes.whole.width} outside ${r.wholeWidthX}`); }
    notes.cuts = {};
    for (const part of spec.dressed.parts) { const n = nodes.find(x => x.name === part); if (!n) continue; const w = watertight(n.primitives[0], tol.weldEps); notes.cuts[part] = w; if (!w.ok) fails.push(`${part}: not watertight (${w.open} open edges, ${w.over} over-shared)`); }
  }
  if (fam === 'worker') {
    for (const req of spec.worker.nodes.required) if (!has(req)) fails.push(`missing node ${req}`);
    if (notes.triangles > spec.worker.budgets.total) fails.push(`triangles ${notes.triangles} > ${spec.worker.budgets.total}`);
    const boots = nodes.find(n => n.name === 'boots'); if (boots) { const b = bounds([boots]); if (b.min[1] < spec.worker.bounds.bootsMinY[0] || b.min[1] > spec.worker.bounds.bootsMinY[1]) fails.push(`boots min y ${b.min[1].toFixed(3)}`); }
    const all = bounds(nodes); notes.bounds = all;
  }
  // referenced textures exist (with -512 variants)
  for (const img of (json.images || [])) { if (!img.uri) continue; const p = join(texroot || dirname(file), img.uri); try { await access(p); const lo = p.replace(/\.webp$/, '-512.webp'); try { await access(lo); } catch { fails.push(`missing mobile texture ${lo}`); } } catch { fails.push(`missing texture ${p}`); } }
  report.files[name] = { fails, ...notes }; report.fails += fails.length;
  if (!asJson) { console.log(`${fails.length ? 'FAIL' : 'ok  '} ${name.padEnd(18)} tris ${String(notes.triangles).padStart(6)} nodes ${names.length}${notes.bounds ? `  y ${notes.bounds.min[1].toFixed(3)}…${notes.bounds.max[1].toFixed(3)}` : ''}${notes.whole ? `  whole ${notes.whole.length}×${notes.whole.width}` : ''}`); for (const f of fails) console.log('     - ' + f); }
}
if (report.siteSpec.length) { report.fails += report.siteSpec.length; if (!asJson) for (const f of report.siteSpec) console.log('SPEC - ' + f); }
if (asJson) console.log(JSON.stringify(report, null, 1)); else console.log(report.fails ? `${report.fails} failure(s)` : 'all assets valid');
process.exitCode = report.fails ? 1 : 0;
