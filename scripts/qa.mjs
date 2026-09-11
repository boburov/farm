/** Browser QA for the cinematic site. Usage:
 *   node scripts/qa.mjs [--quick] [--sizes=1440x900,390x844] [--beats=1,4] [--no-interact] [--no-timing]
 * Env: QA_URL (default http://127.0.0.1:5173), QA_OUT (default qa/current), QA_BUDGET=1 to fail on triangle budgets.
 * Writes screenshots, report.json and summary.md. Exit code 1 on page errors, failed requests or threshold violations.
 */
import { chromium, devices } from 'playwright';
import { mkdir, writeFile, readdir, access } from 'node:fs/promises';
import { homedir } from 'node:os';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const a = args.find(x => x.startsWith(n + '=')); return a ? a.slice(n.length + 1) : d; };
const quick = flag('--quick') || !!process.env.QA_QUICK;
const url = process.env.QA_URL || 'http://127.0.0.1:5173';
const out = process.env.QA_OUT || 'qa/current';
await mkdir(out, { recursive: true });

const SIZES = (opt('--sizes', quick ? '1440x900,390x844' : '1440x900,1920x1080,390x844,430x932,844x390')).split(',').map(s => s.split('x').map(Number));
const BEATS = opt('--beats', quick ? '1,4,8,10' : '0,1,2,3,4,6,7,8,10,11,12,14,15').split(',').map(Number);
const BUDGET = { 0: 900000, 1: 900000, 2: 900000, 3: 900000, 4: 300000, 6: 600000, 7: 600000, 8: 300000, 10: 600000, 11: 600000, 12: 600000, 14: 600000, 15: 600000 };
const MAX_FRAME_MS = 120, MAX_CALLS = Number(process.env.QA_MAX_CALLS || 1500); // draw-call reduction is Pass 5 work

let executablePath = chromium.executablePath();
try { await access(executablePath); } catch {
  const cache = homedir() + '/Library/Caches/ms-playwright'; const dirs = await readdir(cache);
  const dir = dirs.filter(x => x.startsWith('chromium_headless_shell-')).sort().at(-1);
  executablePath = `${cache}/${dir}/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
}
const browser = await chromium.launch({ headless: true, executablePath, args: ['--use-angle=metal', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const report = { url, date: new Date().toISOString(), quick, views: [], timing: [], interactions: {}, errors: [], warnings: [], missing: [], fails: [] };
const fail = (msg) => { report.fails.push(msg); console.log('FAIL', msg); };

function wire(page, tag) {
  page.on('pageerror', e => { report.errors.push(`[${tag}] ${e.stack || e.message}`); console.log('ERROR', tag, e.message); });
  page.on('console', m => {
    const t = m.text();
    if (m.type() === 'error') { if (/ERR_INTERNET_DISCONNECTED|fonts\.g/.test(t) || /fonts\.g/.test(m.location()?.url || '')) { report.warnings.push(`[${tag}] ${t}`); return; } report.errors.push(`[${tag}] console.error: ${t}`); console.log('CONSOLE', t.slice(0, 300)); }
    else if (m.type() === 'warning' && /GL_INVALID|WebGL|Shader|shader|attribute|THREE/.test(t)) { report.warnings.push(`[${tag}] ${t.slice(0, 400)}`); console.log('WARN', t.slice(0, 200)); }
  });
  const external = (u) => /^https?:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)/.test(u); // optional web fonts: a warning, never a failure
  page.on('response', r => { if (r.status() >= 400) { if (external(r.url())) { report.warnings.push(`[${tag}] external ${r.status()} ${r.url()}`); return; } report.missing.push({ url: r.url(), status: r.status() }); console.log('MISSING', r.status(), r.url()); } });
  page.on('requestfailed', r => { if (/favicon/.test(r.url())) return; if (external(r.url())) { report.warnings.push(`[${tag}] external request failed ${r.url()}`); return; } report.missing.push({ url: r.url(), status: 'failed', error: r.failure()?.errorText }); console.log('REQFAIL', r.url()); });
}
async function boot(page) {
  const start = Date.now();
  await page.goto(url);
  await page.waitForSelector('#start.ready:not(.error)', { timeout: 180000 });
  const readyMs = Date.now() - start;
  await page.click('#start');
  await page.evaluate(() => { setPlaying(false); window.__qa = { gap: 0, last: performance.now() }; (function loop(n) { window.__qa.gap = Math.max(window.__qa.gap, n - window.__qa.last); window.__qa.last = n; requestAnimationFrame(loop); })(performance.now()); });
  return readyMs;
}
const seek = (page, id, at = .62) => page.evaluate(([id, at]) => { const ci = CH.findIndex(c => c.beats.includes(id)), c = CH[ci], n = c.beats.indexOf(id), before = c.beats.slice(0, n).reduce((a, b) => a + BEATS[b].dur, 0); goTo(ci, { force: true, at: (before + BEATS[id].dur * at) / c.dur, hard: true }); setPlaying(false); window.__qa.gap = 0; window.__qa.last = performance.now(); }, [id, at]);
const state = (page) => page.evaluate(() => ({ beat: curBeat, progress: +prog.toFixed(4), playing, overflow: document.documentElement.scrollWidth > innerWidth, geometry: renderer.info.memory.geometries, textures: renderer.info.memory.textures, cam: camera.position.toArray().map(v => +v.toFixed(2)), fov: +camera.fov.toFixed(1), modelLoaded: !!PoultryAssets.ready, failures: PoultryAssets.failures, env: (window.ENV && ENV.status) ? ENV.status() : null, stats: window.CINEMA_STATS ? Object.assign({}, CINEMA_STATS) : null, maxGapMs: +window.__qa.gap.toFixed(1) }));

// ---------- main sweep ----------
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage(); wire(page, 'main');
report.readyMs = await boot(page); console.log('READY', report.readyMs);
report.gpu = await page.evaluate(() => { const gl = renderer.getContext(), d = gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
console.log('GPU', report.gpu);
const softwareGpu = /SwiftShader|llvmpipe|Software/i.test(report.gpu);

for (const [width, height] of SIZES) {
  await page.setViewportSize({ width, height }); await page.waitForTimeout(300);
  for (const id of BEATS) {
    await seek(page, id); await page.waitForTimeout(1800);
    const s = await state(page);
    report.views.push({ width, height, id, ...s });
    await page.screenshot({ path: `${out}/${width}-${height}-beat-${id}.png` });
    console.log('VIEW', width, height, 'beat', id, 'tris', s.stats?.triangles, 'calls', s.stats?.calls, 'gap', s.maxGapMs + 'ms');
    if (s.overflow) fail(`horizontal overflow at ${width}x${height} beat ${id}`);
    if (s.beat !== id) fail(`beat mismatch: wanted ${id} got ${s.beat} at ${width}x${height}`);
    if (s.maxGapMs > 1500) fail(`frame stall ${s.maxGapMs} ms entering beat ${id} at ${width}x${height}`);
    if (process.env.QA_BUDGET && BUDGET[id] && s.stats && s.stats.triangles > BUDGET[id]) fail(`triangles ${s.stats.triangles} > budget ${BUDGET[id]} at beat ${id}`);
    if (s.stats && s.stats.calls > MAX_CALLS) fail(`draw calls ${s.stats.calls} > ${MAX_CALLS} at beat ${id} ${width}x${height}`);
  }
}

// ---------- timing while playing (desktop) ----------
if (!flag('--no-timing')) {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(200);
  for (const id of BEATS) {
    await seek(page, id, .3); await page.waitForTimeout(900);
    const t = await page.evaluate(async () => {
      setPlaying(true);
      const samples = []; let last = performance.now(), f0 = CINEMA_STATS.frames, cpu = [];
      await new Promise(res => { const tick = (n) => { samples.push(n - last); last = n; cpu.push(CINEMA_STATS.cpuMs); if (CINEMA_STATS.frames - f0 >= 60 || samples.length > 300) res(); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
      setPlaying(false);
      const warm = samples.slice(3).sort((a, b) => a - b), pick = (p) => warm[Math.min(warm.length - 1, Math.floor(p * warm.length))] || 0;
      return { frames: CINEMA_STATS.frames - f0, p50: +pick(.5).toFixed(1), p95: +pick(.95).toFixed(1), max: +(warm.at(-1) || 0).toFixed(1), cpuP95: +(cpu.sort((a, b) => a - b)[Math.floor(cpu.length * .95)] || 0).toFixed(1), triangles: CINEMA_STATS.triangles, calls: CINEMA_STATS.calls, dpr: CINEMA_STATS.dpr, quality: CINEMA_STATS.quality };
    });
    report.timing.push({ id, ...t, fps: t.p50 ? +(1000 / t.p50).toFixed(1) : null });
    console.log('TIMING beat', id, 'p50', t.p50, 'p95', t.p95, 'max', t.max, 'cpu95', t.cpuP95, 'fps~', t.p50 ? (1000 / t.p50).toFixed(0) : '-');
    if (!softwareGpu && t.max > MAX_FRAME_MS && t.frames > 10) fail(`max frame ${t.max} ms while playing beat ${id} (limit ${MAX_FRAME_MS})`);
  }
}

// ---------- interactions (desktop) ----------
if (!flag('--no-interact') && !flag('--no-interactions')) {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(400); // interactions assume the desktop layout
  const I = report.interactions;
  // render-on-demand: paused scene must stop rendering
  await seek(page, 1); await page.waitForTimeout(2200);
  I.idleFrames = await page.evaluate(async () => { const a = CINEMA_STATS.frames; await new Promise(r => setTimeout(r, 1500)); return CINEMA_STATS.frames - a; });
  if (I.idleFrames > 3) fail(`render loop still running while paused: ${I.idleFrames} frames in 1.5 s`);
  // scroll takes over autoplay
  I.scroll = await page.evaluate(async () => { setPlaying(true); await new Promise(r => setTimeout(r, 300)); const y = Math.round(trackLen() * .4); window.scrollTo(0, y); await new Promise(r => setTimeout(r, 1500)); return { playing, globalProg: +globalProg().toFixed(3) }; });
  if (I.scroll.playing) fail('manual scroll did not pause autoplay');
  if (Math.abs(I.scroll.globalProg - .4) > .03) fail(`scroll seek landed at ${I.scroll.globalProg}, expected ~0.4`);
  // progress bar seek (single seek)
  const bar = await page.locator('#progress').boundingBox();
  await page.mouse.move(bar.x + bar.width * .5, bar.y + bar.height / 2); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(600);
  I.progressSeek = await page.evaluate(() => +globalProg().toFixed(3));
  if (Math.abs(I.progressSeek - .5) > .03) fail(`progress seek landed at ${I.progressSeek}, expected ~0.5`);
  // chapter rail + keyboard
  await page.locator('#rail button').nth(2).click(); await page.waitForTimeout(700);
  I.rail = await page.evaluate(() => cur);
  if (I.rail !== 2) fail(`rail button 3 went to chapter ${I.rail}`);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(700);
  I.arrowRight = await page.evaluate(() => cur);
  if (I.arrowRight !== 3) fail(`ArrowRight went to chapter ${I.arrowRight}`);
  // explore mode
  await page.click('#explore-btn'); await page.waitForTimeout(900);
  I.exploreOn = await page.evaluate(() => EX.on && document.body.classList.contains('exploring'));
  if (!I.exploreOn) fail('explore mode did not open');
  await page.locator('#explore-chips button').nth(3).click(); await page.waitForTimeout(600);
  I.exploreChip = await page.evaluate(() => ({ name: document.getElementById('explore-name').textContent, dist: +EX.wantDist.toFixed(1) }));
  const yaw0 = await page.evaluate(() => EX.wantYaw);
  await page.mouse.move(700, 450); await page.mouse.down(); await page.mouse.move(820, 470, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(300);
  I.exploreDrag = +(await page.evaluate(() => EX.wantYaw) - yaw0).toFixed(3);
  if (!I.exploreDrag) fail('explore drag did not rotate the camera');
  const d0 = await page.evaluate(() => EX.wantDist); await page.mouse.wheel(0, -400); await page.waitForTimeout(300);
  I.exploreWheel = +(await page.evaluate(() => EX.wantDist) - d0).toFixed(1);
  if (!I.exploreWheel) fail('explore wheel did not zoom');
  await page.screenshot({ path: `${out}/explore.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(600);
  I.exploreOff = await page.evaluate(() => !EX.on);
  if (!I.exploreOff) fail('Escape did not leave explore mode');
  // part tooltips at beat 4 (exploded cuts)
  await seek(page, 4, .8); await page.waitForTimeout(1500);
  const pt = await page.evaluate(() => { const m = G.birdDressed.userData.parts.breastL, v = m.getWorldPosition(new THREE.Vector3()).project(camera); return { x: (v.x * .5 + .5) * innerWidth, y: (-v.y * .5 + .5) * innerHeight }; });
  await page.mouse.move(pt.x, pt.y, { steps: 4 }); await page.waitForTimeout(400);
  I.tooltip = await page.evaluate(() => ({ on: document.getElementById('part-tip').classList.contains('on'), text: document.getElementById('part-tip').textContent.replace(/\s+/g, ' ').slice(0, 120) }));
  if (!I.tooltip.on) fail('part tooltip did not appear over the breast fillet');
  await page.screenshot({ path: `${out}/tooltip.png` });
  // figures editor
  await page.click('#edit-open'); await page.waitForTimeout(400);
  I.editorOpen = await page.evaluate(() => document.getElementById('editor').classList.contains('open'));
  if (!I.editorOpen) fail('editor did not open');
  const firstInput = page.locator('#editor input').first(); const original = await firstInput.inputValue();
  await firstInput.fill(String(Number(original) ? Number(original) + 1 : original)); await page.click('#edit-save'); await page.waitForTimeout(500);
  I.editorSaved = await page.evaluate(() => !!localStorage.getItem('chicken-figs'));
  if (!I.editorSaved) fail('editor save did not persist to localStorage');
  const stillOpen = await page.evaluate(() => document.getElementById('editor').classList.contains('open'));
  if (stillOpen) { await page.evaluate(() => document.getElementById('edit-reset').scrollIntoView()); await page.click('#edit-reset', { force: true, timeout: 5000 }).catch(() => {}); await page.waitForTimeout(300); await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  I.editorClosed = await page.evaluate(() => !document.getElementById('editor').classList.contains('open'));
  if (!I.editorClosed) fail('editor did not close');
  // resize sweep at beat 4: subject must stay inside the viewport
  await seek(page, 4, .8);
  I.resize = [];
  for (const [w, h] of [[1920, 1080], [390, 844], [844, 390], [1440, 900]]) {
    await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(700);
    I.resize.push(await page.evaluate(([w, h]) => { const parts = Object.values(G.birdDressed.userData.parts); const pts = parts.map(m => m.getWorldPosition(new THREE.Vector3()).project(camera)); const out = pts.filter(p => Math.abs(p.x) > .98 || Math.abs(p.y) > .98).length; return { w, h, inside: out === 0, outside: out, aspect: +camera.aspect.toFixed(3), overflow: document.documentElement.scrollWidth > innerWidth }; }, [w, h]));
  }
  for (const r of I.resize) { if (!r.inside) fail(`cut spread leaves the viewport at ${r.w}x${r.h}`); if (r.overflow) fail(`overflow after resize to ${r.w}x${r.h}`); }
}
await context.close();

// ---------- reduced motion + mobile emulation contexts ----------
if (!quick || flag('--contexts')) {
  const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const p2 = await rm.newPage(); wire(p2, 'reduced');
  await boot(p2);
  await p2.waitForTimeout(2400); // let the boot-time sky crossfade settle before sampling the idle loop
  report.interactions.reducedMotion = await p2.evaluate(async () => { const a = CINEMA_STATS.frames; await new Promise(r => setTimeout(r, 1500)); return { REDUCED, playing, idleFrames: CINEMA_STATS.frames - a }; });
  if (report.interactions.reducedMotion.idleFrames > 3) fail('render loop kept running under reduced motion');
  if (!report.interactions.reducedMotion.REDUCED) fail('prefers-reduced-motion not detected');
  if (report.interactions.reducedMotion.playing) fail('autoplay started under reduced motion');
  await p2.screenshot({ path: `${out}/reduced-motion.png` }); await rm.close();
  const mob = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
  const p3 = await mob.newPage(); wire(p3, 'iphone');
  await boot(p3); await seek(p3, 4, .8); await p3.waitForTimeout(1500);
  report.interactions.mobile = await p3.evaluate(() => ({ dpr: CINEMA_STATS.dpr, small: SMALL, overflow: document.documentElement.scrollWidth > innerWidth, tapTargets: Array.from(document.querySelectorAll('.ctrl button,#rail button')).filter(b => b.offsetParent).every(b => { const r = b.getBoundingClientRect(); return r.height >= 40 && r.width >= 40; }) }));
  if (!report.interactions.mobile.tapTargets) fail('mobile controls smaller than 40 px');
  if (report.interactions.mobile.overflow) fail('mobile overflow');
  await p3.screenshot({ path: `${out}/iphone-beat-4.png` }); await mob.close();
}

// ---------- write ----------
if (report.errors.length) fail(`${report.errors.length} page/console errors`);
if (report.missing.length) fail(`${report.missing.length} failed requests`);
const md = ['# QA summary', '', `date ${report.date}  ·  gpu ${report.gpu}  ·  ready ${report.readyMs} ms  ·  errors ${report.errors.length}  ·  missing ${report.missing.length}  ·  fails ${report.fails.length}`, '',
  '| size | beat | triangles | calls | geometries | textures | entry gap ms |', '|---|---|---|---|---|---|---|',
  ...report.views.map(v => `| ${v.width}×${v.height} | ${v.id} | ${v.stats?.triangles ?? ''} | ${v.stats?.calls ?? ''} | ${v.geometry} | ${v.textures} | ${v.maxGapMs} |`), '',
  '| beat | fps~ | p50 ms | p95 ms | max ms | cpu p95 ms |', '|---|---|---|---|---|---|',
  ...report.timing.map(t => `| ${t.id} | ${t.fps ?? ''} | ${t.p50} | ${t.p95} | ${t.max} | ${t.cpuP95} |`), '',
  report.fails.length ? '## Failures\n' + report.fails.map(f => '- ' + f).join('\n') : 'No failures.', ''];
await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
await writeFile(`${out}/summary.md`, md.join('\n'));
await browser.close();
console.log(report.fails.length ? `DONE with ${report.fails.length} failures` : 'DONE clean');
if (report.fails.length) process.exitCode = 1;
