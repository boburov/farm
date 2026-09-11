/** Prepare the photoreal whole raw chicken for the web.
 *  Input : the Tripo-generated GLB (1.37 M triangles, three 4K JPEG maps, KHR_mesh_quantization) as downloaded.
 *  Output: assets/models/raw-chicken.glb — simplified with meshoptimizer, WebP maps (colour 2K, ORM/normal 1K),
 *          re-quantized (three.js reads KHR_mesh_quantization without an extra decoder).
 *  Usage : node scripts/prep-raw-chicken.mjs [--in="<path to glb>"] [--out=assets/models/raw-chicken.glb] [--ratio=0.045] [--error=0.02]
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, quantize, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { stat } from 'node:fs/promises';

const args = process.argv.slice(2);
const opt = (n, d) => { const a = args.find(x => x.startsWith(n + '=')); return a ? a.slice(n.length + 1).replace(/^"|"$/g, '') : d; };
const IN = opt('--in', process.env.HOME + '/Downloads/whole-raw-chicken-3d-model/source/raw chicken 3d model.glb');
const OUT = opt('--out', 'assets/models/raw-chicken.glb');
const RATIO = +opt('--ratio', '0.045'), ERROR = +opt('--error', '0.02');

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(IN);
const root = doc.getRoot();
const tris = () => root.listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3, 0), 0);
console.log('in :', IN, '| triangles', tris(), '| size', (await stat(IN)).size);

// Tripo ships an all-zero custom attribute; nothing reads it.
for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) for (const sem of prim.listSemantics()) if (sem.startsWith('_')) { console.log('drop', sem); prim.setAttribute(sem, null); }

// Surface: the ORM blue channel is ~0 (mean 5.8/255) so the bird is dielectric; say so explicitly. AO channel is flat (≈255), no occlusion map.
for (const m of root.listMaterials()) { m.setMetallicFactor(0); m.setDoubleSided(false); m.setName('raw-chicken'); }
root.getAsset().generator = 'scripts/prep-raw-chicken.mjs (gltf-transform + meshoptimizer)';

await MeshoptSimplifier.ready;
await doc.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: RATIO, error: ERROR, lockBorder: false }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 86, resize: [2048, 2048], slots: /baseColorTexture/ }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 84, resize: [1024, 1024], slots: /metallicRoughnessTexture/ }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 92, resize: [1024, 1024], slots: /normalTexture/ }),
  quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }),
  dedup(), prune(),
);
for (const node of root.listNodes()) node.setName(node.getMesh() ? 'raw-chicken' : node.getName());
for (const mesh of root.listMeshes()) mesh.setName('raw-chicken');
await io.write(OUT, doc);
const bb = root.listMeshes()[0].listPrimitives()[0].getAttribute('POSITION');
console.log('out:', OUT, '| triangles', tris(), '| size', (await stat(OUT)).size, '| bbox min', bb.getMinNormalized([]).map(v => +v.toFixed(3)), 'max', bb.getMaxNormalized([]).map(v => +v.toFixed(3)));
