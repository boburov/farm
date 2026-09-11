/** Prepares the per-state environment HDRIs from the downloaded Poly Haven candidates.
 * For each site environment state it picks the candidate whose sun elevation is closest to the site's light
 * direction, measures the sun azimuth (so the runtime can rotate the sky to the site's azimuth), calibrates a gain
 * so that a mid-grey ground lands near display 0.35 under ACES, folds that gain into the shipped file, writes a
 * half-resolution copy for mobile and records everything in assets/environment/manifest.json.
 * Conventions match three.js r128: equirect u = atan2(dir.z, dir.x)/2π + 0.5, v = asin(dir.y)/π + 0.5, top row = zenith.
 * Usage: node scripts/prep-environment.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';

/** Ordered preference per state. All candidates are Poly Haven "puresky" files (no ground content) except where noted. */
const CANDIDATES = {
  dawn: ['syferfontein_6d_clear_puresky', 'syferfontein_18d_clear_puresky', 'kloppenheim_06_puresky', 'spruit_sunrise'],
  morning: ['kloofendal_38d_partly_cloudy_puresky', 'mud_road_puresky', 'kloofendal_28d_misty_puresky', 'kloofendal_48d_partly_cloudy_puresky'],
  day: ['kloofendal_48d_partly_cloudy_puresky', 'citrus_orchard_puresky', 'sunflowers_puresky', 'kloofendal_43d_clear_puresky'],
  golden: ['belfast_sunset_puresky', 'industrial_sunset_puresky', 'evening_road_01_puresky', 'kloppenheim_06_puresky'],
  dusk: ['qwantani_dusk_2_puresky', 'qwantani_sunset_puresky', 'belfast_sunset_puresky'],
  studio: ['studio_small_09'],
  interior: ['empty_warehouse_01'],
};
const NOT_PURESKY = new Set(['spruit_sunrise']);
/** States that may use a soft/hidden-sun sky; the analytic sun then provides a synthetic warm key. */
const SOFT_SUN_OK = { golden: true, dusk: true };
const RES = { studio: '1k', interior: '1k' };
const HAS_SUN = { studio: false, interior: false };
/** Readability targets: mid-grey ground display value and the sun:sky irradiance cap. */
/** Linear display targets (after ACES) for sun-lit mid-grey ground: sRGB ≈ 0.42–0.50 by day, dimmer at dusk. */
const TARGET = { dawn: .15, morning: .19, day: .20, golden: .15, dusk: .085, studio: .17, interior: .17 };
const SUN_RATIO_CAP = { dawn: 4.2, morning: 5.2, day: 5.6, golden: 4.0, dusk: 2.6 };
const ELEV_TOL_DEG = 14;

// ---------- Radiance RGBE ----------
function decodeHDR(buf) {
  let pos = 0, line = '', w = 0, h = 0, headerDone = false;
  const readLine = () => { let s = ''; while (pos < buf.length) { const c = buf[pos++]; if (c === 10) break; s += String.fromCharCode(c); } return s; };
  const first = readLine(); if (!first.startsWith('#?')) throw new Error('not a Radiance file');
  while (!headerDone) { line = readLine(); if (line === '') headerDone = true; if (pos >= buf.length) throw new Error('bad header'); }
  const res = readLine().match(/^-Y (\d+) \+X (\d+)$/); if (!res) throw new Error('unsupported orientation: ' + line);
  h = +res[1]; w = +res[2];
  const rgbe = new Uint8Array(w * h * 4);
  const scan = new Uint8Array(w * 4);
  for (let y = 0; y < h; y++) {
    if (buf[pos] === 2 && buf[pos + 1] === 2 && ((buf[pos + 2] << 8) | buf[pos + 3]) === w && w >= 8 && w < 32768) {
      pos += 4;
      for (let c = 0; c < 4; c++) {
        let x = 0;
        while (x < w) {
          let count = buf[pos++];
          if (count > 128) { count -= 128; const v = buf[pos++]; for (let i = 0; i < count; i++) scan[(x++) * 4 + c] = v; }
          else { for (let i = 0; i < count; i++) scan[(x++) * 4 + c] = buf[pos++]; }
        }
      }
      rgbe.set(scan, y * w * 4);
    } else { rgbe.set(buf.subarray(pos, pos + w * 4), y * w * 4); pos += w * 4; }
  }
  const rgb = new Float32Array(w * h * 3);
  for (let i = 0, n = w * h; i < n; i++) {
    const e = rgbe[i * 4 + 3]; if (!e) continue;
    const s = Math.pow(2, e - 136);
    rgb[i * 3] = rgbe[i * 4] * s; rgb[i * 3 + 1] = rgbe[i * 4 + 1] * s; rgb[i * 3 + 2] = rgbe[i * 4 + 2] * s;
  }
  return { w, h, rgb };
}
function frexp(v) { if (v === 0) return [0, 0]; let e = Math.ceil(Math.log2(v)); let m = v / Math.pow(2, e); if (m >= 1) { m /= 2; e++; } if (m < .5) { m *= 2; e--; } return [m, e]; }
function encodeHDR({ w, h, rgb }) {
  const out = [];
  const header = `#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n# prepared by scripts/prep-environment.mjs (Bir tovuqdan)\n\n-Y ${h} +X ${w}\n`;
  out.push(Buffer.from(header, 'latin1'));
  const scan = new Uint8Array(w * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3, r = rgb[i], g = rgb[i + 1], b = rgb[i + 2], m = Math.max(r, g, b);
      if (m < 1e-32) { scan[x * 4] = scan[x * 4 + 1] = scan[x * 4 + 2] = scan[x * 4 + 3] = 0; continue; }
      const [mant, e] = frexp(m); const s = mant * 256 / m;
      scan[x * 4] = Math.min(255, r * s | 0); scan[x * 4 + 1] = Math.min(255, g * s | 0); scan[x * 4 + 2] = Math.min(255, b * s | 0); scan[x * 4 + 3] = e + 128;
    }
    const chunks = [Buffer.from([2, 2, w >> 8, w & 255])];
    for (let c = 0; c < 4; c++) {
      const ch = new Uint8Array(w); for (let x = 0; x < w; x++) ch[x] = scan[x * 4 + c];
      let x = 0; const bytes = [];
      while (x < w) {
        let run = 1; while (x + run < w && run < 127 && ch[x + run] === ch[x]) run++;
        if (run >= 4) { bytes.push(128 + run, ch[x]); x += run; continue; }
        let start = x; let len = 0;
        while (x < w && len < 128) { let r2 = 1; while (x + r2 < w && r2 < 4 && ch[x + r2] === ch[x]) r2++; if (r2 >= 4) break; x++; len++; }
        bytes.push(len); for (let k = 0; k < len; k++) bytes.push(ch[start + k]);
      }
      chunks.push(Buffer.from(bytes));
    }
    out.push(...chunks);
  }
  return Buffer.concat(out);
}
function downsample({ w, h, rgb }) {
  const W = w >> 1, H = h >> 1, out = new Float32Array(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) {
    const a = ((y * 2) * w + x * 2) * 3 + c, b = a + 3, d = a + w * 3, e = d + 3;
    out[(y * W + x) * 3 + c] = (rgb[a] + rgb[b] + rgb[d] + rgb[e]) * .25;
  }
  return { w: W, h: H, rgb: out };
}

// ---------- analysis ----------
const lum = (r, g, b) => .2126 * r + .7152 * g + .0722 * b;
function analyze(img, hasSun) {
  const { w, h, rgb } = img;
  const dOmega = (y) => { const el = (0.5 - (y + .5) / h) * Math.PI; return (2 * Math.PI / w) * (Math.PI / h) * Math.cos(el); };
  // sun: brightest cell of a blurred 1/8 luminance map
  const bw = w >> 3, bh = h >> 3, small = new Float32Array(bw * bh);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) small[(y >> 3) * bw + (x >> 3)] += lum(rgb[(y * w + x) * 3], rgb[(y * w + x) * 3 + 1], rgb[(y * w + x) * 3 + 2]);
  let best = -1, bi = 0;
  for (let y = 1; y < bh - 1; y++) for (let x = 0; x < bw; x++) {
    let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += small[(y + dy) * bw + ((x + dx + bw) % bw)];
    if (s > best) { best = s; bi = y * bw + x; }
  }
  const sx = (bi % bw) * 8 + 4, sy = Math.floor(bi / bw) * 8 + 4;
  const uSun = (sx + .5) / w, vSun = 1 - (sy + .5) / h, elev = (vSun - .5) * Math.PI, az = (uSun - .5) * 2 * Math.PI;
  const sunDir = [Math.cos(az) * Math.cos(elev), Math.sin(elev), Math.sin(az) * Math.cos(elev)];
  // median sky luminance of the upper hemisphere, away from the sun (12° radius)
  const samples = [];
  const cosSunR = Math.cos(12 * Math.PI / 180);
  const dirOf = (x, y) => { const u = (x + .5) / w, v = 1 - (y + .5) / h, el = (v - .5) * Math.PI, a = (u - .5) * 2 * Math.PI; return [Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)]; };
  for (let y = 0; y < h >> 1; y += 4) for (let x = 0; x < w; x += 4) {
    const d = dirOf(x, y); if (hasSun && d[0] * sunDir[0] + d[1] * sunDir[1] + d[2] * sunDir[2] > cosSunR) continue;
    samples.push(lum(rgb[(y * w + x) * 3], rgb[(y * w + x) * 3 + 1], rgb[(y * w + x) * 3 + 2]));
  }
  samples.sort((a, b) => a - b);
  const median = samples[samples.length >> 1] || 1;
  const clamp = hasSun ? median * 12 : Infinity;
  // irradiance on a horizontal surface from the clamped sky, and the sun's normal irradiance above the clamp
  let eUp = 0, eSunN = 0, sunR = 0, sunG = 0, sunB = 0, sunN = 0;
  const hor = [0, 0, 0]; let horN = 0; const zen = [0, 0, 0]; let zenN = 0;
  for (let y = 0; y < h; y++) {
    const el = (0.5 - (y + .5) / h) * Math.PI, dw = dOmega(y), cosUp = Math.max(0, Math.sin(el));
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3, r = rgb[i], g = rgb[i + 1], b = rgb[i + 2], L = lum(r, g, b);
      const Lc = Math.min(L, clamp), k = L > 0 ? Lc / L : 0;
      eUp += Lc * cosUp * dw;
      if (L > clamp) { eSunN += (L - clamp) * dw; sunR += r; sunG += g; sunB += b; sunN++; }
      if (el > 0 && el < .06) { const d = dirOf(x, y); if (!hasSun || (d[0] * sunDir[0] + d[2] * sunDir[2]) / Math.max(1e-6, Math.hypot(d[0], d[2])) < Math.cos(20 * Math.PI / 180)) { hor[0] += r * k; hor[1] += g * k; hor[2] += b * k; horN++; } }
      if (el > 1.25) { zen[0] += r; zen[1] += g; zen[2] += b; zenN++; }
    }
  }
  const sunC = sunN ? [sunR, sunG, sunB].map(v => v / sunN) : [1, 1, 1];
  const sunMax = Math.max(...sunC, 1e-6);
  return { uSun, vSun, elevDeg: elev * 180 / Math.PI, azDeg: az * 180 / Math.PI, sunDir, median, clamp, eUp, eSunN,
    sunColor: sunC.map(v => v / sunMax), horizon: hor.map(v => v / Math.max(1, horN)), zenith: zen.map(v => v / Math.max(1, zenN)) };
}
const acesInv = (y) => { // inverse of the three.js ACES fit (RRTAndODTFit), scalar, for calibration only
  let x = y; for (let i = 0; i < 40; i++) { const a = x * (x + .0245786) - .000090537, b = x * (.983729 * x + .4329510) + .238081, f = a / b - y; const d = ((2 * x + .0245786) * b - a * (2 * .983729 * x + .4329510)) / (b * b); x -= f / d; } return x * 0.6; // three multiplies the input by exposure/0.6 before the fit
};
const hex = (rgb) => '#' + rgb.map(v => Math.round(255 * Math.pow(Math.min(1, Math.max(0, v)), 1 / 2.2)).toString(16).padStart(2, '0')).join('');

// ---------- site light directions (kept in sync with index.html ENVS) ----------
const html = await readFile('index.html', 'utf8');
const envsBlock = html.slice(html.indexOf('var ENVS={'), html.indexOf('};', html.indexOf('var ENVS={')));
const siteSun = {};
for (const m of envsBlock.matchAll(/(\w+):\s*\{[^}]*?sun:\[([^\]]+)\]/g)) siteSun[m[1]] = m[2].split(',').map(Number);
if (!siteSun.day) throw new Error('could not read ENVS sun directions from index.html');

await mkdir('assets/environment', { recursive: true });
const manifest = { version: 1, generator: 'scripts/prep-environment.mjs', license: 'CC0 1.0 (Poly Haven)', shift: 'sky shader samples u = fract(u + shiftU)', states: {} };
const cache = new Map();
async function load(slug, res) { const key = slug + res; if (!cache.has(key)) cache.set(key, decodeHDR(await readFile(`build/downloads/${slug}_${res}.hdr`))); return cache.get(key); }

for (const [state, slugs] of Object.entries(CANDIDATES)) {
  const res = RES[state] || '2k', hasSun = HAS_SUN[state] !== false;
  const target = siteSun[state]; const tn = Math.hypot(...target); const tdir = target.map(v => v / tn);
  const tElev = Math.asin(tdir[1]) * 180 / Math.PI, tAz = Math.atan2(tdir[2], tdir[0]);
  let chosen = null;
  const tried = [];
  for (const slug of slugs) {
    let img; try { img = await load(slug, res); } catch { console.warn(`  missing candidate ${slug}`); continue; }
    const a = analyze(img, hasSun);
    const skyTerm0 = .75 * a.eUp / Math.PI, ratio = hasSun ? (a.eSunN / Math.PI) / Math.max(1e-6, skyTerm0) : 0;
    let score = hasSun ? Math.abs(a.elevDeg - tElev) : 0;
    if (NOT_PURESKY.has(slug)) score += 10;          // landscape content shows above our horizon
    if (hasSun && ratio < 1.2 && !SOFT_SUN_OK[state]) score += 8; // diffuse sun: no readable key light
    score += slugs.indexOf(slug) * 1.5;              // authored preference order breaks near-ties
    tried.push({ slug, elevDeg: +a.elevDeg.toFixed(1), sunSkyRatio: +ratio.toFixed(2), score: +score.toFixed(1) });
    console.log(`  ${slug.padEnd(40)} elev ${a.elevDeg.toFixed(1).padStart(5)}°  sun/sky ${ratio.toFixed(2).padStart(6)}  score ${score.toFixed(1)}`);
    if (!chosen || score < chosen.score) chosen = { slug, img, a, err: Math.abs(a.elevDeg - tElev), score };
  }
  if (hasSun && chosen.err > ELEV_TOL_DEG) console.warn(`WARN ${state}: best candidate ${chosen.slug} elevation ${chosen.a.elevDeg.toFixed(1)}° vs site ${tElev.toFixed(1)}° (tolerance ${ELEV_TOL_DEG}°)`);
  const { slug, img, a } = chosen;
  // gain: albedo 0.3 ground, IBL term 0.75*eUp/π (stdMat envMapIntensity .75) + capped analytic sun
  const skyTerm = .75 * a.eUp / Math.PI;
  const softSun = hasSun && (a.eSunN / Math.PI) / Math.max(1e-6, skyTerm) < 1.2;
  const sunI0 = !hasSun ? 0 : softSun ? (SUN_RATIO_CAP[state] || 3) * skyTerm * .6 : Math.min(a.eSunN / Math.PI, (SUN_RATIO_CAP[state] || 3) * skyTerm);
  const linearTarget = acesInv(TARGET[state]);
  const gain = linearTarget / (0.3 * (skyTerm + sunI0 * (hasSun ? Math.max(.15, Math.sin(a.elevDeg * Math.PI / 180)) : 1)));
  const sunI = +(sunI0 * gain).toFixed(3);
  // final sun direction: site azimuth, HDRI elevation
  const el = a.elevDeg * Math.PI / 180;
  const sunDir = hasSun ? [Math.cos(tAz) * Math.cos(el), Math.sin(el), Math.sin(tAz) * Math.cos(el)] : tdir;
  const shiftU = hasSun ? ((a.uSun - (tAz / (2 * Math.PI) + .5)) % 1 + 1) % 1 : 0;
  const scaled = { w: img.w, h: img.h, rgb: new Float32Array(img.rgb.length) };
  for (let i = 0; i < img.rgb.length; i++) scaled.rgb[i] = img.rgb[i] * gain;
  await writeFile(`assets/environment/${state}.hdr`, encodeHDR(scaled));
  const small = downsample(scaled);
  await writeFile(`assets/environment/${state}-lo.hdr`, encodeHDR(small));
  manifest.states[state] = {
    file: `${state}.hdr`, lo: `${state}-lo.hdr`, width: img.w, height: img.h, source: slug, res, candidates: tried,
    url: `https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/${res}/${slug}_${res}.hdr`,
    hasSun, sunElevDeg: +a.elevDeg.toFixed(2), sunAzimuthFileDeg: +a.azDeg.toFixed(2), siteElevDeg: +tElev.toFixed(2),
    shiftU: +shiftU.toFixed(5), sunDir: sunDir.map(v => +v.toFixed(4)), gain: +gain.toFixed(4),
    sunClamp: hasSun ? +(a.clamp * gain).toFixed(3) : null, sunI, softSun, sunColor: softSun ? null : hex(a.sunColor),
    skyIrradiance: +(a.eUp * gain).toFixed(4), sunIrradiance: +(a.eSunN * gain).toFixed(3),
    horizon: a.horizon.map(v => +(v * gain).toFixed(4)), horizonHex: hex(a.horizon.map(v => v * gain)),
    zenith: a.zenith.map(v => +(v * gain).toFixed(4)), zenithHex: hex(a.zenith.map(v => v * gain)),
  };
  console.log(state.padEnd(8), slug.padEnd(40), `elev ${a.elevDeg.toFixed(1)}° (site ${tElev.toFixed(1)}°)`, `gain ${gain.toFixed(3)}`, `sunI ${sunI}`, `sky ${(a.eUp * gain).toFixed(2)}`, `horizon ${hex(a.horizon.map(v => v * gain))}`);
}
await writeFile('assets/environment/manifest.json', JSON.stringify(manifest, null, 2));
console.log('wrote assets/environment/manifest.json');
