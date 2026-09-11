/** Minimal glTF 2.0 / GLB reader and writer for the build tools (Node, no three.js dependency). */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const CT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

export function parseGlb(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB');
  const length = buf.readUInt32LE(8); let pos = 12, json = null, bin = null;
  while (pos < length) {
    const len = buf.readUInt32LE(pos), type = buf.readUInt32LE(pos + 4); pos += 8;
    if (type === 0x4e4f534a) json = JSON.parse(buf.subarray(pos, pos + len).toString('utf8'));
    else if (type === 0x004e4942) bin = buf.subarray(pos, pos + len);
    pos += len;
  }
  return { json, bin };
}
export async function readGlb(path) { return parseGlb(await readFile(path)); }
export async function readGltf(path) {
  const json = JSON.parse(await readFile(path, 'utf8'));
  const bins = await Promise.all((json.buffers || []).map(b => b.uri ? readFile(join(dirname(path), decodeURIComponent(b.uri))) : null));
  return { json, bins };
}
/** Returns a typed array view of an accessor (dense, de-interleaved). */
export function accessor(doc, index) {
  const { json } = doc; const a = json.accessors[index]; const bv = json.bufferViews[a.bufferView];
  const bin = doc.bins ? doc.bins[bv.buffer] : doc.bin;
  const Ctor = CT[a.componentType], n = SIZE[a.type], stride = bv.byteStride || 0;
  const start = (bv.byteOffset || 0) + (a.byteOffset || 0);
  if (!stride || stride === n * Ctor.BYTES_PER_ELEMENT) {
    const arr = new Ctor(bin.buffer.slice(bin.byteOffset + start, bin.byteOffset + start + a.count * n * Ctor.BYTES_PER_ELEMENT));
    return Object.assign(arr, { itemSize: n, count: a.count, normalized: !!a.normalized, componentType: a.componentType });
  }
  const out = new Ctor(a.count * n);
  for (let i = 0; i < a.count; i++) { const o = start + i * stride; const v = new Ctor(bin.buffer.slice(bin.byteOffset + o, bin.byteOffset + o + n * Ctor.BYTES_PER_ELEMENT)); out.set(v, i * n); }
  return Object.assign(out, { itemSize: n, count: a.count, normalized: !!a.normalized, componentType: a.componentType });
}
/** Node → world matrices (column-major 4×4) for every node. */
export function nodeWorldMatrices(json) {
  const nodes = json.nodes || [], world = new Array(nodes.length), parent = new Array(nodes.length).fill(-1);
  nodes.forEach((n, i) => (n.children || []).forEach(c => parent[c] = i));
  const local = nodes.map(n => n.matrix ? n.matrix.slice() : compose(n.translation || [0, 0, 0], n.rotation || [0, 0, 0, 1], n.scale || [1, 1, 1]));
  const get = (i) => { if (world[i]) return world[i]; world[i] = parent[i] < 0 ? local[i] : mul(get(parent[i]), local[i]); return world[i]; };
  nodes.forEach((_, i) => get(i)); return world;
}
export function compose(t, q, s) {
  const [x, y, z, w] = q, x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
  return [(1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0, (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0, (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0, t[0], t[1], t[2], 1];
}
export function mul(a, b) { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; }
export function applyMat(m, v) { return [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]]; }

/** Assemble a GLB from a glTF JSON document and one binary buffer. */
export function buildGlb(json, bin) {
  json = JSON.parse(JSON.stringify(json)); json.buffers = [{ byteLength: bin.length }];
  let jsonBuf = Buffer.from(JSON.stringify(json)); const pad = (4 - jsonBuf.length % 4) % 4; if (pad) jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(pad, 0x20)]);
  const binPad = (4 - bin.length % 4) % 4; const binBuf = binPad ? Buffer.concat([bin, Buffer.alloc(binPad)]) : bin;
  const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + binBuf.length, 8);
  const chunk = (b, t) => { const h = Buffer.alloc(8); h.writeUInt32LE(b.length, 0); h.writeUInt32LE(t, 4); return Buffer.concat([h, b]); };
  return Buffer.concat([header, chunk(jsonBuf, 0x4e4f534a), chunk(binBuf, 0x004e4942)]);
}
/** Mesh nodes with their primitives, decoded attributes, extras and world matrix. */
export function meshNodes(doc) {
  const { json } = doc; const world = nodeWorldMatrices(json); const out = [];
  (json.nodes || []).forEach((n, i) => {
    if (n.mesh === undefined) return; const mesh = json.meshes[n.mesh];
    out.push({ index: i, name: n.name || mesh.name || ('node' + i), meshName: mesh.name, extras: n.extras || {}, skin: n.skin, world: world[i],
      primitives: mesh.primitives.map(p => ({ mode: p.mode === undefined ? 4 : p.mode, material: p.material, attributes: Object.fromEntries(Object.entries(p.attributes).map(([k, v]) => [k, accessor(doc, v)])), indices: p.indices !== undefined ? accessor(doc, p.indices) : null })) });
  });
  return out;
}
