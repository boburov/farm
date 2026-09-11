/** Downloads the CC0 environment and PBR texture sources used by the site.
 * Source: Poly Haven (https://polyhaven.com), license CC0 1.0 Universal.
 * Only the file CDN (dl.polyhaven.org) is reachable from the build machine, so every file is named explicitly here.
 * Raw downloads are cached in build/downloads/ (not shipped); shipped files are written to assets/.
 * Usage: node scripts/fetch-assets.mjs [--force] [--only=hdri|textures]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import sharp from 'sharp';

const CDN = 'https://dl.polyhaven.org/file/ph-assets';
const force = process.argv.includes('--force');
const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7);

/** Environment states of the site → Poly Haven HDRI. `res` is the shipped resolution. */
export const HDRIS = [
  { state: 'dawn', slug: 'spruit_sunrise', res: '2k' },
  { state: 'morning', slug: 'kloofendal_48d_partly_cloudy_puresky', res: '2k' },
  { state: 'day', slug: 'kloofendal_43d_clear_puresky', res: '2k' },
  { state: 'golden', slug: 'belfast_sunset_puresky', res: '2k' },
  { state: 'dusk', slug: 'qwantani_dusk_2_puresky', res: '2k' },
  { state: 'studio', slug: 'studio_small_09', res: '1k' },
  { state: 'interior', slug: 'empty_warehouse_01', res: '1k' },
  // Candidates kept for sun-elevation matching in prep-environment.mjs (the best match per state wins).
  { state: 'dawn-alt', slug: 'syferfontein_18d_clear_puresky', res: '2k' },
  { state: 'morning-alt', slug: 'kloofendal_28d_misty_puresky', res: '2k' },
  { state: 'morning-alt2', slug: 'kloofendal_38d_partly_cloudy_puresky', res: '2k' },
  { state: 'golden-alt', slug: 'industrial_sunset_puresky', res: '2k' },
  { state: 'golden-alt2', slug: 'syferfontein_6d_clear_puresky', res: '2k' },
  { state: 'golden-alt3', slug: 'kloppenheim_06_puresky', res: '2k' },
  { state: 'golden-alt4', slug: 'evening_road_01_puresky', res: '2k' },
  { state: 'dusk-alt', slug: 'qwantani_sunset_puresky', res: '2k' },
  { state: 'day-alt', slug: 'citrus_orchard_puresky', res: '2k' },
  { state: 'day-alt2', slug: 'sunflowers_puresky', res: '2k' },
  { state: 'morning-alt3', slug: 'mud_road_puresky', res: '2k' },
];

/** PBR sets. maps: diff (sRGB colour), nor_gl (OpenGL tangent normal), arm (R=AO, G=roughness, B=metal). */
export const TEXTURES = [
  { slug: 'aerial_grass_rock', use: 'ground grass', hi: true },
  { slug: 'park_dirt', use: 'farm yard soil', hi: true },
  { slug: 'brown_mud_dry', use: 'dry mud / worn paths', hi: true },
  { slug: 'gravel_road', use: 'road shoulders, aprons' },
  { slug: 'stony_dirt_path', use: 'field tracks' },
  { slug: 'asphalt_02', use: 'roads' },
  { slug: 'concrete_floor_worn_001', use: 'factory floors, docks' },
  { slug: 'concrete_wall_008', use: 'facility walls' },
  { slug: 'painted_concrete', use: 'interior walls' },
  { slug: 'corrugated_iron_02', use: 'barn roofs' },
  { slug: 'corrugated_iron_03', use: 'barn walls' },
  { slug: 'metal_plate', use: 'machinery' },
  { slug: 'rusty_metal_02', use: 'chassis, old fittings' },
  { slug: 'grassy_cobblestone', use: 'market square' },
];
const MAPS = ['diff', 'nor_gl', 'arm'];

async function fetchBuffer(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}
async function cached(url, file) {
  if (!force && existsSync(file)) return file;
  const buf = await fetchBuffer(url);
  await writeFile(file, buf);
  console.log('downloaded', url.replace(CDN + '/', ''), (buf.length / 1024 | 0) + ' KB');
  return file;
}
async function limit(items, n, fn) {
  const queue = items.slice(); const out = [];
  await Promise.all(Array.from({ length: n }, async () => { while (queue.length) out.push(await fn(queue.shift())); }));
  return out;
}

await mkdir('build/downloads', { recursive: true });
await mkdir('assets/environment', { recursive: true });
await mkdir('assets/textures/pbr', { recursive: true });
const sources = [];

if (!only || only === 'hdri') {
  await limit(HDRIS, 3, async h => {
    const url = `${CDN}/HDRIs/hdr/${h.res}/${h.slug}_${h.res}.hdr`;
    await cached(url, `build/downloads/${h.slug}_${h.res}.hdr`);
  });
}
// Shipped HDRIs are written per state by prep-environment.mjs; the provenance list covers every candidate.
for (const h of HDRIS) sources.push({ kind: 'HDRI', slug: h.slug, state: h.state, res: h.res, url: `${CDN}/HDRIs/hdr/${h.res}/${h.slug}_${h.res}.hdr`, file: 'assets/environment/<state>.hdr (selected by scripts/prep-environment.mjs)' });

if (!only || only === 'textures') {
  const jobs = [];
  for (const t of TEXTURES) for (const m of MAPS) {
    jobs.push({ t, m, res: '1k' });
    if (t.hi && m === 'diff') jobs.push({ t, m, res: '2k' });
  }
  await limit(jobs, 4, async ({ t, m, res }) => {
    const url = `${CDN}/Textures/jpg/${res}/${t.slug}/${t.slug}_${m}_${res}.jpg`;
    const raw = await cached(url, `build/downloads/${t.slug}_${m}_${res}.jpg`);
    const isColor = m === 'diff';
    const base = `assets/textures/pbr/${t.slug}_${m}`;
    const out = res === '2k' ? `${base}-2k.webp` : `${base}.webp`;
    if (force || !existsSync(out)) {
      await sharp(raw).webp({ quality: isColor ? 82 : 90, effort: 5 }).toFile(out);
      if (res === '1k') await sharp(raw).resize(512).webp({ quality: isColor ? 80 : 88, effort: 5 }).toFile(`${base}-512.webp`);
    }
  });
}
for (const t of TEXTURES) for (const m of MAPS) {
  const base = `assets/textures/pbr/${t.slug}_${m}`;
  sources.push({ kind: 'texture', slug: t.slug, map: m, res: '1k', url: `${CDN}/Textures/jpg/1k/${t.slug}/${t.slug}_${m}_1k.jpg`, file: `${base}.webp, ${base}-512.webp`, use: t.use });
  if (t.hi && m === 'diff') sources.push({ kind: 'texture', slug: t.slug, map: m, res: '2k', url: `${CDN}/Textures/jpg/2k/${t.slug}/${t.slug}_${m}_2k.jpg`, file: `${base}-2k.webp`, use: t.use });
}

// Attribution record (CC0 requires none, but the project documents every external source).
const lines = ['# External asset sources', '',
  'All files below come from Poly Haven (https://polyhaven.com) and are released under CC0 1.0 Universal',
  '(https://creativecommons.org/publicdomain/zero/1.0/). No attribution is legally required; it is given here for provenance.',
  'Downloaded by `scripts/fetch-assets.mjs`; JPG sources are converted to WebP and resized by the same script.',
  '', '| kind | asset | map | res | shipped file | use | source URL |', '|---|---|---|---|---|---|---|'];
for (const s of sources.sort((a, b) => (a.kind + a.slug + (a.map || '')).localeCompare(b.kind + b.slug + (b.map || ''))))
  lines.push(`| ${s.kind} | ${s.slug} | ${s.map || (s.state + ' state')} | ${s.res || ''} | ${s.file} | ${s.use || ''} | ${s.url} |`);
lines.push('', 'Models under assets/models/ and textures named hen-*, chick-*, dressed-*, feather-*, skin-*, meat-* are original project assets generated by scripts/ (see assets/models/manifest.json).', '');
await writeFile('assets/ASSET-SOURCES.md', lines.join('\n'));
console.log('sources recorded:', sources.length);
