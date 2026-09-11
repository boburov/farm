/** Composes the Blender tree renders into assets/textures/trees-atlas.webp (4 species × 2 angles, 448×640 cells, 2 rows). */
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
const dir = 'build/blender/trees'; const meta = JSON.parse(await readFile(`${dir}/atlas.json`, 'utf8'));
const [cw, ch] = meta.cell; const cols = meta.cells.length, rows = meta.angles.length;
const layers = []; const cells = [];
meta.cells.forEach((c, i) => meta.angles.forEach((ang, j) => { layers.push({ input: `${dir}/${c.name}-${ang}.png`, left: i * cw, top: j * ch }); cells.push({ name: c.name, angle: ang, u0: i / cols, v0: 1 - (j + 1) / rows, u1: (i + 1) / cols, v1: 1 - j / rows, height: c.height, aspect: cw / ch, orthoScale: c.orthoScale }); }));
const base = sharp({ create: { width: cw * cols, height: ch * rows, channels: 4, background: { r: 60, g: 80, b: 40, alpha: 0 } } });
const png = await base.composite(layers).png().toBuffer();
// bleed colour into transparent texels so mipmaps stay clean at the edges
const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height; const out = Buffer.from(data);
for (let pass = 0; pass < 4; pass++) { const src = Buffer.from(out); for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = (y * W + x) * 4; if (src[i + 3] > 8) continue; let r = 0, g = 0, b = 0, n = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = ((y + dy) * W + (x + dx)) * 4; if (src[j + 3] > 8 || (pass > 0 && (src[j] || src[j + 1] || src[j + 2]))) { r += src[j]; g += src[j + 1]; b += src[j + 2]; n++; } } if (n) { out[i] = r / n; out[i + 1] = g / n; out[i + 2] = b / n; } } }
await sharp(out, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 88, alphaQuality: 100, effort: 5 }).toFile('assets/textures/trees-atlas.webp');
await sharp(out, { raw: { width: W, height: H, channels: 4 } }).resize(Math.round(W / 2)).webp({ quality: 84, alphaQuality: 100 }).toFile('assets/textures/trees-atlas-512.webp');
await writeFile('assets/textures/trees-atlas.json', JSON.stringify({ cells, cell: [cw, ch] }, null, 1));
console.log('atlas', W + 'x' + H, cells.length, 'cells');
