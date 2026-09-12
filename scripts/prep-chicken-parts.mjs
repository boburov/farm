/** Buyurtmachi bergan bo'laklangan tovuq modelini vebga tayyorlaydi.
 *
 *  Kirish : ~/Desktop/chicken.glb — Tripo mesh, qo'lda kesilgan (92 MB, 2,7 mln
 *           uchburchak, uchta 4K JPEG). Tuzilishi:
 *             Chicken_Work     — tana + IKKI QANOT (bitta meshda, uch ajralgan orol)
 *             Leg_L / Leg_R    — butun oyoq (son + boldir), kesim yuzasi bilan
 *             Neck / Tail      — bo'yin va dum, kesim yuzasi bilan
 *             Chicken_Original — butun tovuqning nusxasi (tashlanadi)
 *
 *  Chiqish: assets/models/chicken-parts.glb — 7 ta alohida nomlangan bo'lak
 *           (torso, wingL, wingR, legL, legR, neck, tail), sayt koordinata
 *           tizimida (Y yuqoriga, pastki nuqta y=0, uzunlik 1.0), har bir
 *           tugunda extras {center,min,max} — assets/poultry-runtime.js
 *           aynan shu shartnomani o'qiydi (raw-chicken-cuts.glb bilan bir xil).
 *
 *  Ishlatish:
 *    node --max-old-space-size=8192 scripts/prep-chicken-parts.mjs
 *    [--in=<glb>] [--out=assets/models/chicken-parts.glb] [--ratio=0.11] [--error=0.02]
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, quantize, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { stat } from 'node:fs/promises';

const args = process.argv.slice(2);
const opt = (n, d) => { const a = args.find(x => x.startsWith(n + '=')); return a ? a.slice(n.length + 1).replace(/^"|"$/g, '') : d; };
const IN = opt('--in', process.env.HOME + '/Desktop/chicken.glb');
const OUT = opt('--out', 'assets/models/chicken-parts.glb');
const RATIO = +opt('--ratio', '0.11'), ERROR = +opt('--error', '0.02');
const ROOT_NAME = 'chicken-parts';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(IN);
const root = doc.getRoot();
const scene = root.listScenes()[0];
const tris = () => root.listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) =>
  k + (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3, 0), 0);
console.log('in :', IN, '| triangles', Math.round(tris()), '| bytes', (await stat(IN)).size);

const byName = (n) => root.listNodes().find(x => x.getName() === n);

/* Tripo COLOR_0 / COLOR_1 ni oq (1,1,1,1) qilib qo'shadi — hech qanday ma'lumot
   tashimaydi, lekin har tepaga 8 bayt qo'shadi va bo'lish paytida xato manbai
   bo'ladi. Nomi `_` bilan boshlanadigan xususiy atributlar ham keraksiz.     */
for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives())
  for (const sem of prim.listSemantics())
    if (sem.startsWith('COLOR_') || sem.startsWith('_')) prim.setAttribute(sem, null);
console.log('dropped COLOR_*/_ attributes');

/* ---------------------------------------------------------------- 1. tozalash
   Chicken_Original butun tovuqning ikkinchi nusxasi — bo'laklar bilan ustma-ust
   tushadi va faylning yarmini egallaydi.                                      */
for (const name of ['Chicken_Original', 'Node_0']) {
  const n = byName(name);
  if (n) { console.log('drop node', name); n.dispose(); }
}

/* -------------------------------------------- 2. Chicken_Work ni orollarga bo'lish
   Qanotlar alohida geometriya orollari, lekin bitta meshda eksport qilingan.
   Bog'langan komponentlar bo'yicha ajratamiz: eng kattasi — tana, qolgan ikkitasi
   x belgisiga qarab chap/o'ng qanot.                                          */
function splitIslands(prim) {
  const pos = prim.getAttribute('POSITION');
  const nv = pos.getCount();
  const ix = prim.getIndices();
  const idx = ix ? ix.getArray() : null;
  const ni = ix ? ix.getCount() : nv;

  // bir xil joydagi tepalar birlashtiriladi, aks holda kvantlangan dubllar orolni bo'lib yuboradi
  const key = new Map(), rep = new Int32Array(nv), a = [0, 0, 0];
  for (let i = 0; i < nv; i++) {
    pos.getElement(i, a);
    const k = Math.round(a[0] * 1e5) + '_' + Math.round(a[1] * 1e5) + '_' + Math.round(a[2] * 1e5);
    let v = key.get(k); if (v === undefined) { v = i; key.set(k, v); }
    rep[i] = v;
  }
  const parent = new Int32Array(nv); for (let i = 0; i < nv; i++) parent[i] = rep[i];
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const uni = (x, y) => { x = find(x); y = find(y); if (x !== y) parent[y] = x; };
  for (let t = 0; t < ni; t += 3) {
    const i0 = idx ? idx[t] : t, i1 = idx ? idx[t + 1] : t + 1, i2 = idx ? idx[t + 2] : t + 2;
    uni(rep[i0], rep[i1]); uni(rep[i1], rep[i2]);
  }
  // uchburchaklarni oroli bo'yicha guruhlash
  const groups = new Map();
  for (let t = 0; t < ni; t += 3) {
    const i0 = idx ? idx[t] : t;
    const r = find(rep[i0]);
    let g = groups.get(r); if (!g) { g = []; groups.set(r, g); }
    g.push(t);
  }
  return [...groups.values()].sort((x, y) => y.length - x.length);
}

/* orol uchburchaklaridan yangi primitiv yasaydi (barcha semantikalarni ko'chiradi) */
function primFromTriangles(srcPrim, triStarts) {
  const ix = srcPrim.getIndices();
  const idx = ix ? ix.getArray() : null;
  const semantics = srcPrim.listSemantics();
  const remap = new Map();
  const order = [];
  const indices = new Uint32Array(triStarts.length * 3);
  let w = 0;
  for (const t of triStarts) {
    for (let k = 0; k < 3; k++) {
      const src = idx ? idx[t + k] : t + k;
      let dst = remap.get(src);
      if (dst === undefined) { dst = order.length; remap.set(src, dst); order.push(src); }
      indices[w++] = dst;
    }
  }
  const out = doc.createPrimitive().setMaterial(srcPrim.getMaterial()).setMode(srcPrim.getMode());
  for (const sem of semantics) {
    const src = srcPrim.getAttribute(sem);
    const size = src.getElementSize();
    const srcArr = src.getArray();
    const Arr = srcArr.constructor;
    const arr = new Arr(order.length * size);
    /* xom qiymatlarni ko'chiramiz: getElement() normalizatsiyani yechadi va
       butun sonli buferga 1.0 ni 1 qilib yozib qo'yardi (rang qorayardi) */
    for (let i = 0; i < order.length; i++) { const o = order[i] * size, d = i * size;
      for (let k = 0; k < size; k++) arr[d + k] = srcArr[o + k]; }
    const acc = doc.createAccessor().setType(src.getType()).setArray(arr).setNormalized(src.getNormalized()).setBuffer(src.getBuffer());
    out.setAttribute(sem, acc);
  }
  out.setIndices(doc.createAccessor().setType('SCALAR').setArray(indices).setBuffer(ix ? ix.getBuffer() : root.listBuffers()[0]));
  return out;
}

const work = byName('Chicken_Work');
if (!work) throw new Error('Chicken_Work topilmadi');
const workPrim = work.getMesh().listPrimitives()[0];
const islands = splitIslands(workPrim);
console.log('Chicken_Work islands:', islands.map(g => g.length / 3 + ' tris').join(', '));
if (islands.length !== 3) console.warn('!! kutilgani 3 orol edi, topildi', islands.length);

const islandNodes = [];
for (const tri of islands) {
  const prim = primFromTriangles(workPrim, tri);
  // markazni topib chap/o'ng qanotni ajratamiz
  const pos = prim.getAttribute('POSITION'); const a = [0, 0, 0];
  let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, a); for (let k = 0; k < 3; k++) { if (a[k] < mn[k]) mn[k] = a[k]; if (a[k] > mx[k]) mx[k] = a[k]; } }
  islandNodes.push({ prim, cx: (mn[0] + mx[0]) / 2, tris: tri.length / 3 });
}
islandNodes.sort((a, b) => b.tris - a.tris);
const torso = islandNodes[0];
const wings = islandNodes.slice(1).sort((a, b) => a.cx - b.cx);   // eng chapdagisi = chap qanot
const named = [
  ['torso', torso.prim],
  ['wingL', wings[0] && wings[0].prim],
  ['wingR', wings[1] && wings[1].prim],
].filter(([, p]) => p);

for (const [name, prim] of named) {
  const mesh = doc.createMesh(name + '_mesh').addPrimitive(prim);
  const node = doc.createNode(name).setMesh(mesh);
  scene.addChild(node);
  console.log('  +', name, Math.round(prim.getIndices().getCount() / 3), 'tris');
}
work.dispose();

/* --------------------------------------------------- 3. qolgan bo'laklarni nomlash */
const RENAME = { Leg_L: 'legL', Leg_R: 'legR', Neck: 'neck', Tail: 'tail' };
for (const [from, to] of Object.entries(RENAME)) {
  const n = byName(from);
  if (!n) { console.warn('!!', from, 'topilmadi'); continue; }
  n.setName(to); if (n.getMesh()) n.getMesh().setName(to + '_mesh');
}

/* ------------------------------------------------------------ 4. materiallar */
for (const m of root.listMaterials()) {
  m.setMetallicFactor(0).setDoubleSided(false);
  if (/Cut_Surface/i.test(m.getName() || '')) m.setName('chicken-cut').setRoughnessFactor(0.62);
  else m.setName('chicken-skin');
}
root.getAsset().generator = 'scripts/prep-chicken-parts.mjs (gltf-transform + meshoptimizer)';

/* ----------------------------------------------------- 5. soddalashtirish va teksturalar
   lockBorder: kesim yuzasi bilan teri chegarasi mos qolishi uchun.            */
await MeshoptSimplifier.ready;
await doc.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: RATIO, error: ERROR, lockBorder: true }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 86, resize: [2048, 2048], slots: /baseColorTexture/ }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 84, resize: [1024, 1024], slots: /metallicRoughnessTexture/ }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 92, resize: [1024, 1024], slots: /normalTexture/ }),
  dedup(), prune(),
);
console.log('after simplify:', Math.round(tris()), 'triangles');

/* ------------------------------------------ 6. sayt koordinata tizimiga o'tkazish
   Model markazi y=0 da; sayt tizimida pastki nuqta y=0 bo'lishi kerak
   (raw-chicken-cuts.glb bilan bir xil), shuning uchun barcha tepalar ko'tariladi. */
const KEYS = ['torso', 'wingL', 'wingR', 'legL', 'legR', 'neck', 'tail'];
const parts = KEYS.map(byName).filter(Boolean);
if (parts.length !== 7) console.warn('!! 7 emas,', parts.length, 'bo‘lak topildi:', parts.map(n => n.getName()));

let minY = Infinity;
for (const n of parts) for (const p of n.getMesh().listPrimitives()) {
  const pos = p.getAttribute('POSITION'), a = [0, 0, 0];
  for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, a); if (a[1] < minY) minY = a[1]; }
}
console.log('y offset:', (-minY).toFixed(4));
const moved = new Set();
for (const n of parts) for (const p of n.getMesh().listPrimitives()) {
  const pos = p.getAttribute('POSITION');
  if (moved.has(pos)) continue; moved.add(pos);
  const arr = pos.getArray();
  for (let i = 1; i < arr.length; i += 3) arr[i] -= minY;
}

/* --------------------------------------------------- 7. extras {center,min,max} */
const meta = [];
for (const n of parts) {
  let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const p of n.getMesh().listPrimitives()) {
    const pos = p.getAttribute('POSITION'), a = [0, 0, 0];
    for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, a); for (let k = 0; k < 3; k++) { if (a[k] < mn[k]) mn[k] = a[k]; if (a[k] > mx[k]) mx[k] = a[k]; } }
  }
  const center = mx.map((v, i) => +((v + mn[i]) / 2).toFixed(6));
  n.setExtras({ center, min: mn.map(v => +v.toFixed(6)), max: mx.map(v => +v.toFixed(6)) });
  meta.push({ name: n.getName(), center, size: mx.map((v, i) => +(v - mn[i]).toFixed(3)) });
}

/* ------------------------------------------------ 8. yagona ildiz tugun + yozish */
const holder = doc.createNode(ROOT_NAME);
for (const n of parts) { scene.removeChild(n); holder.addChild(n); }
scene.addChild(holder);
for (const n of scene.listChildren()) if (n !== holder) { console.log('drop stray node', n.getName()); n.dispose(); }

await doc.transform(quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }), prune());
await io.write(OUT, doc);

console.log('\nout:', OUT, '|', Math.round(tris()), 'triangles |', ((await stat(OUT)).size / 1048576).toFixed(2), 'MB');
console.table(meta);
