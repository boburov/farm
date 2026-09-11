/** Orchestrates the Blender asset builds: runs a family script headless, packs baked PNGs to WebP (colour, normal, ORM),
 * rewrites the glTF to reference ../textures/*.webp, writes GLBs, validates them and installs into assets/models with a
 * manifest entry. Any failure keeps the Node fallback for that family.
 * Usage: node scripts/build-assets.mjs [--family=hen,chick,dressed,worker] [--skip-blender] [--quick] [--gpu] [--no-install]
 */
import { readFile, writeFile, mkdir, copyFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, basename, dirname } from 'node:path';
import sharp from 'sharp';
import { readGltf, buildGlb } from './lib/glb.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const a = args.find(x => x.startsWith(n + '=')); return a ? a.slice(n.length + 1) : d; };
const FAMILIES = opt('--family', 'hen,chick,dressed,worker').split(',');
const SKIP = args.includes('--skip-blender'), QUICK = args.includes('--quick'), GPU = args.includes('--gpu'), INSTALL = !args.includes('--no-install');
const BLENDER = process.env.BLENDER || '/Applications/Blender.app/Contents/MacOS/Blender';
const SCRIPT = { hen: ['scripts/blender/hen.py', []], chick: ['scripts/blender/hen.py', ['--chick']], dressed: ['scripts/blender/dressed.py', []], worker: ['scripts/blender/worker.py', []] };
const ALLOWED_EXT = new Set(['KHR_materials_clearcoat', 'KHR_materials_transmission', 'KHR_materials_unlit', 'KHR_texture_transform', 'KHR_mesh_quantization', 'EXT_texture_webp']);
await mkdir('build/logs', { recursive: true }); await mkdir('build/blender/out', { recursive: true }); await mkdir('assets/textures', { recursive: true });

function run(cmd, argv, log) {
  return new Promise((res) => { const chunks = []; const p = spawn(cmd, argv, { stdio: ['ignore', 'pipe', 'pipe'] }); const t = setTimeout(() => p.kill('SIGKILL'), 40 * 60 * 1000);
    p.stdout.on('data', d => chunks.push(d)); p.stderr.on('data', d => chunks.push(d)); p.on('close', async code => { clearTimeout(t); const out = Buffer.concat(chunks).toString(); if (log) await writeFile(log, out); res({ code, out }); }); });
}
async function packImage(png, base, isColor, size) {
  const outs = [];
  await sharp(png).webp({ quality: isColor ? 88 : 94, effort: 5 }).toFile(`assets/textures/${base}.webp`); outs.push(`assets/textures/${base}.webp`);
  await sharp(png).resize(Math.min(512, size)).webp({ quality: isColor ? 82 : 90, effort: 5 }).toFile(`assets/textures/${base}-512.webp`); outs.push(`assets/textures/${base}-512.webp`);
  return outs;
}
/** ORM = R:AO (baked), G:roughness (from the exporter's metallicRoughness image, channel G), B:0. */
async function packOrm(mrPng, aoPng, base) {
  const mr = sharp(mrPng); const meta = await mr.metadata(); const w = meta.width, h = meta.height;
  const g = await sharp(mrPng).extractChannel('green').raw().toBuffer();
  const r = aoPng && existsSync(aoPng) ? await sharp(aoPng).resize(w, h).toColourspace('b-w').raw().toBuffer() : Buffer.alloc(w * h, 255);
  const b = Buffer.alloc(w * h, 0); const rgb = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) { rgb[i * 3] = r[i]; rgb[i * 3 + 1] = g[i]; rgb[i * 3 + 2] = b[i]; }
  await sharp(rgb, { raw: { width: w, height: h, channels: 3 } }).webp({ quality: 92, effort: 5 }).toFile(`assets/textures/${base}.webp`);
  await sharp(rgb, { raw: { width: w, height: h, channels: 3 } }).resize(Math.min(512, w)).webp({ quality: 88 }).toFile(`assets/textures/${base}-512.webp`);
}
async function convert(gltfPath, family) {
  const doc = await readGltf(gltfPath); const json = doc.json; const dir = dirname(gltfPath); const name = basename(gltfPath, '.gltf');
  const packed = new Map(); const texDir = join(dir, 'tex');
  // classify images by how materials use them
  const usage = new Map();
  for (const m of json.materials || []) {
    const pbr = m.pbrMetallicRoughness || {};
    if (pbr.baseColorTexture) usage.set(json.textures[pbr.baseColorTexture.index].source, 'color');
    if (pbr.metallicRoughnessTexture) usage.set(json.textures[pbr.metallicRoughnessTexture.index].source, 'mr');
    if (m.normalTexture) usage.set(json.textures[m.normalTexture.index].source, 'normal');
    if (m.emissiveTexture) usage.set(json.textures[m.emissiveTexture.index].source, 'emissive');
  }
  for (let i = 0; i < (json.images || []).length; i++) {
    const img = json.images[i]; if (!img.uri) continue; const png = join(dir, decodeURIComponent(img.uri)); const kind = usage.get(i) || 'color';
    const raw = basename(img.uri, '.png').replace(/\.\d+$/, '');
    if (/cards/.test(raw)) { const base = /normal/.test(raw) ? 'hen-cards-normal' : 'hen-cards'; img.uri = `../textures/${base}.webp`; delete img.mimeType; packed.set(i, base); continue; } // atlas from scripts/feather-atlas.py
    const stem = raw.replace(/-color$/, '').replace(/-rough$/, '').replace(/-normal$/, '');
    const meta = await sharp(png).metadata();
    let base;
    if (kind === 'mr') { base = `${stem}-orm`; await packOrm(png, join(texDir, `${stem}-ao.png`), base); }
    else { base = `${stem}-${kind}`; await packImage(png, base, kind === 'color' || kind === 'emissive', meta.width); }
    img.uri = `../textures/${base}.webp`; delete img.mimeType; packed.set(i, base);
  }
  // occlusion shares the ORM image (R channel), as the runtime expects
  for (const m of json.materials || []) { if (/cards/.test(m.name || '')) { m.alphaMode = 'MASK'; m.alphaCutoff = .5; m.doubleSided = true; } const pbr = m.pbrMetallicRoughness || {}; if (pbr.metallicRoughnessTexture) m.occlusionTexture = { index: pbr.metallicRoughnessTexture.index, strength: .45 }; if (m.extensions) { for (const k of Object.keys(m.extensions)) if (!ALLOWED_EXT.has(k)) delete m.extensions[k]; if (!Object.keys(m.extensions).length) delete m.extensions; } }
  json.extensionsUsed = (json.extensionsUsed || []).filter(e => ALLOWED_EXT.has(e)); if (!json.extensionsUsed.length) delete json.extensionsUsed; delete json.extensionsRequired;
  json.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }]; for (const t of json.textures || []) t.sampler = 0;
  json.asset.generator = 'Bir tovuqdan Blender pipeline (scripts/blender) + scripts/build-assets.mjs'; json.asset.copyright = 'Original project assets';
  // the exporter's default scene may include the armature root; keep as is (GLTFLoader builds bones from it)
  const glb = buildGlb(json, doc.bins[0]); const out = `build/blender/out/${name}.glb`; await writeFile(out, glb);
  // previews rendered from build/blender/out resolve ../textures relative to it
  await mkdir('build/blender/textures', { recursive: true }); for (const base of packed.values()) await copyFile(`assets/textures/${base}.webp`, `build/blender/textures/${base}.webp`);
  return { file: out, textures: [...packed.values()], bytes: glb.length };
}
const results = {};
for (const fam of FAMILIES) {
  const [script, extra] = SCRIPT[fam]; const outDir = `build/blender/${fam}`; const log = `build/logs/blender-${fam}.log`;
  if (!SKIP) {
    if (!existsSync(script)) { console.log(`skip ${fam}: ${script} not written yet`); continue; }
    console.log(`blender ${fam} …`);
    const argv = ['-b', '--factory-startup', '-noaudio', '--python-exit-code', '1', '-P', script, '--', '--out', outDir, ...extra]; if (QUICK) argv.push('--quick'); if (GPU) argv.push('--gpu');
    const { code } = await run(BLENDER, argv, log);
    if (code !== 0) { console.log(`FAIL ${fam}: blender exit ${code} (see ${log})`); results[fam] = { ok: false, reason: 'blender exit ' + code }; continue; }
  }
  const files = (await readdir(outDir).catch(() => [])).filter(f => f.endsWith('.gltf'));
  if (!files.length) { console.log(`FAIL ${fam}: no glTF output`); results[fam] = { ok: false, reason: 'no output' }; continue; }
  const built = [];
  for (const f of files) { const r = await convert(join(outDir, f), fam); built.push(r); console.log(`  ${r.file} ${(r.bytes / 1024) | 0} KB textures ${r.textures.join(', ')}`); }
  const val = await run('node', ['scripts/validate-assets.mjs', '--texroot=assets/models', ...built.map(b => b.file)], `build/logs/validate-${fam}.log`);
  console.log(val.out.trim().split('\n').map(l => '  ' + l).join('\n'));
  results[fam] = { ok: val.code === 0, built, reason: val.code === 0 ? null : 'validation failed' };
}
if (INSTALL) {
  const manifestPath = 'assets/models/manifest.json';
  const manifest = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, 'utf8')) : { assets: [] };
  manifest.generator = 'scripts/build-assets.mjs (Blender) with scripts/generate-assets.mjs fallback'; manifest.units = 'metres'; manifest.forward = '+Z'; manifest.up = '+Y'; manifest.license = 'Original project assets';
  for (const [fam, r] of Object.entries(results)) {
    if (!r.ok) { console.log(`keep Node fallback for ${fam}: ${r.reason}`); for (const a of manifest.assets) if (a.family === fam) { a.source = 'node-fallback'; a.reason = r.reason; } continue; }
    for (const b of r.built) {
      const file = basename(b.file); await copyFile(b.file, join('assets/models', file));
      const st = await stat(join('assets/models', file)); const tier = /-hero/.test(file) ? 'hero' : /-mid/.test(file) ? 'mid' : /-lod/.test(file) ? 'lod' : 'set';
      const entry = { file, family: fam, tier, source: 'blender', bytes: st.size, textures: b.textures.map(t => basename(t)), validated: new Date().toISOString() };
      const i = manifest.assets.findIndex(a => a.file === file); if (i >= 0) manifest.assets[i] = { ...manifest.assets[i], ...entry }; else manifest.assets.push(entry);
    }
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2)); console.log('manifest updated');
}
console.log(JSON.stringify(Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.ok ? 'ok' : v.reason])), null, 0));
