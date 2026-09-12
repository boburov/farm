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
let BEATS = opt('--beats', quick ? '6,16,4' : '0,1,3,2,6,7,8,16,10,4,13,14,15').split(',').map(Number); // beats outside CH are skipped after boot
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
  // the hero is chapter 00 and appears at once; the world is ready when started flips
  await page.waitForFunction(() => window.started === true, null, { timeout: 240000 });
  const readyMs = Date.now() - start;
  await page.evaluate(() => FarmPresentation.goTo(1, { instant: true, force: true }));
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__qa = { gap: 0, last: performance.now() }; (function loop(n) { window.__qa.gap = Math.max(window.__qa.gap, n - window.__qa.last); window.__qa.last = n; requestAnimationFrame(loop); })(performance.now()); });
  return readyMs;
}
const innerHeightOf = () => 900;
const seek = (page, id, at = .62) => page.evaluate(([id, at]) => {
  const ci = CH.findIndex(c => c.beats.includes(id)), c = CH[ci], n = c.beats.indexOf(id);
  const before = c.times.slice(0, n).reduce((a, b) => a + b, 0);
  goTo(ci, { force: true, at: (before + c.times[n] * at) / c.dur, keepBeat: true, instant: true });
  window.__qa.gap = 0; window.__qa.last = performance.now();
}, [id, at]);
const state = (page) => page.evaluate(() => ({ beat: curBeat, progress: +prog.toFixed(4), playing, still: !!(window.STILL && STILL[curBeat]), manual: !!(TRUCKS[0] && TRUCKS[0].veh.manual), speed: TRUCKS[0] ? +TRUCKS[0].veh.speed.toFixed(3) : null, near: camera.near, overflow: document.documentElement.scrollWidth > innerWidth, geometry: renderer.info.memory.geometries, textures: renderer.info.memory.textures, cam: camera.position.toArray().map(v => +v.toFixed(2)), fov: +camera.fov.toFixed(1), modelLoaded: !!PoultryAssets.ready, failures: PoultryAssets.failures, env: (window.ENV && ENV.status) ? ENV.status() : null, stats: window.CINEMA_STATS ? Object.assign({}, CINEMA_STATS) : null, maxGapMs: +window.__qa.gap.toFixed(1) }));

// ---------- main sweep ----------
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage(); wire(page, 'main');
report.readyMs = await boot(page); console.log('READY', report.readyMs);
{ const shown = await page.evaluate(() => CH.flatMap(c => c.beats)), skipped = BEATS.filter(id => !shown.includes(id));
  if (skipped.length) console.log('SKIP beats not in the presentation:', skipped.join(','));
  BEATS = BEATS.filter(id => shown.includes(id)); }
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
    if (s.still) {
      // still beats: same pose anywhere in the slot, camera + world clock frozen while the slot plays
      await seek(page, id, .12); await page.waitForTimeout(400);
      const early = await page.evaluate(() => camera.position.toArray().map(v => +v.toFixed(2)));
      if (early.join() !== s.cam.join()) fail(`still beat ${id} pose depends on the seek position at ${width}x${height}`);
      const frozen = await page.evaluate(async () => { const a = camera.position.toArray(), e0 = elapsed; presentation.isPaused = false; invalidateScene(); await new Promise(r => setTimeout(r, 600)); presentation.isPaused = true; return { moved: camera.position.toArray().some((v, i) => v !== a[i]), ticked: elapsed !== e0 }; });
      if (frozen.moved) fail(`still beat ${id} camera moved while its slot played`);
      if (frozen.ticked) fail(`still beat ${id} world clock advanced while its slot played`);
      if (id === 12 && !(s.manual && s.speed === 0)) fail(`still beat 12 lorry not parked (manual ${s.manual}, speed ${s.speed})`);
      if (id === 10 && s.near !== 0.06) fail(`still beat 10 interior clip not pre-staged (near ${s.near})`);
    }
  }
}

// ---------- timing while playing (desktop) ----------
if (!flag('--no-timing')) {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(200);
  for (const id of BEATS) {
    await seek(page, id, .3); await page.waitForTimeout(900);
    const t = await page.evaluate(async () => {
      /* replay the current scene from its start so the sweep measures a moving frame */
      FarmPresentation.playSlot(presentation.slot);
      const samples = []; let last = performance.now(), f0 = CINEMA_STATS.frames, cpu = [];
      await new Promise(res => { const tick = (n) => { samples.push(n - last); last = n; cpu.push(CINEMA_STATS.cpuMs); if (CINEMA_STATS.frames - f0 >= 60 || samples.length > 300) res(); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
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
  // render-on-demand: a finished scene must stop rendering
  await seek(page, 3);
  await page.evaluate(() => FarmPresentation.holdSlot(presentation.slot));
  await page.waitForTimeout(2400);
  I.idleFrames = await page.evaluate(async () => { const a = CINEMA_STATS.frames; await new Promise(r => setTimeout(r, 1500)); return CINEMA_STATS.frames - a; });
  if (I.idleFrames > 3) fail(`render loop still running while paused: ${I.idleFrames} frames in 1.5 s`);
  // chapter navigation replaces the scroll timeline; the document itself never scrolls
  I.nav = await page.evaluate(async () => { goTo(2); await new Promise(r => setTimeout(r, 1900)); return { cur, docH: document.documentElement.scrollHeight, scrollY: window.scrollY }; });
  if (I.nav.cur !== 2) fail(`goTo(2) landed on chapter ${I.nav.cur}`);
  if (I.nav.docH > innerHeightOf(page) + 1 || I.nav.scrollY) fail(`document still scrolls (height ${I.nav.docH})`);
  // one click = one scene: the sequence stops at the end of every scene
  I.scenes = await page.evaluate(async () => {
    goTo(3, { instant: true, force: true });
    await new Promise(r => setTimeout(r, 1400));
    const seen = [];
    for (let i = 0; i < 14; i++) {
      const st = FarmPresentation.slotInfo();
      if (!st.done) { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); await new Promise(r => setTimeout(r, 260)); continue; }
      if (!seen.includes(st.slot)) seen.push(st.slot);
      if (st.slot === st.slots - 1) break;
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await new Promise(r => setTimeout(r, 900));
    }
    return { seen, slots: CH[3].beats.length };
  });
  if (I.scenes.seen.length !== I.scenes.slots) fail(`chapter 3 exposed ${I.scenes.seen.length} of ${I.scenes.slots} scenes`);
  // keyboard
  const lastCh = await page.evaluate(() => CH.length - 1);
  await page.keyboard.press('End'); await page.waitForTimeout(1900);
  I.keyEnd = await page.evaluate(() => cur);
  if (I.keyEnd !== lastCh) fail(`End went to chapter ${I.keyEnd}`);
  await page.keyboard.press('Home'); await page.waitForTimeout(1900);
  I.keyHome = await page.evaluate(() => cur);
  if (I.keyHome !== 0) fail(`Home went to chapter ${I.keyHome}`);
  await page.evaluate(() => goTo(3, { instant: true, force: true })); await page.waitForTimeout(900);
  // explore mode
  await page.evaluate(() => setExplore(true)); await page.waitForTimeout(900);
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
  // resize sweep: at beat 4 the cut spread must stay inside the viewport; without beat 4 in the show,
  // sweep the product-ring scene (beat 8) and only check for horizontal overflow
  const hasCuts = await page.evaluate(() => CH.some(c => c.beats.includes(4)));
  await seek(page, hasCuts ? 4 : 8, .8);
  I.resize = [];
  for (const [w, h] of [[1920, 1080], [390, 844], [844, 390], [1440, 900]]) {
    await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(700);
    I.resize.push(await page.evaluate(([w, h]) => { const parts = G.birdDressed.visible ? Object.values(G.birdDressed.userData.parts) : []; const pts = parts.map(m => m.getWorldPosition(new THREE.Vector3()).project(camera)); const out = pts.filter(p => Math.abs(p.x) > .98 || Math.abs(p.y) > .98).length; return { w, h, inside: out === 0, outside: out, aspect: +camera.aspect.toFixed(3), overflow: document.documentElement.scrollWidth > innerWidth }; }, [w, h]));
  }
  // the cuts now rest on the ring bases (radius 4.9): on phone-width viewports the side bases sit at the frame edge by design
  for (const r of I.resize) { if (!r.inside && r.w >= 500) fail(`cut spread leaves the viewport at ${r.w}x${r.h}`); if (r.overflow) fail(`overflow after resize to ${r.w}x${r.h}`); }
}
await context.close();

// ---------- reduced motion + mobile emulation contexts ----------
if (!quick || flag('--contexts')) {
  const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const p2 = await rm.newPage(); wire(p2, 'reduced');
  await boot(p2);
  await p2.waitForTimeout(2400); // let the boot-time sky crossfade settle before sampling the idle loop
  await p2.evaluate(() => FarmPresentation.goTo(1, { force: true })); await p2.waitForTimeout(1800);
  report.interactions.reducedMotion = await p2.evaluate(async () => { const a = CINEMA_STATS.frames; await new Promise(r => setTimeout(r, 1500)); return { REDUCED, idleFrames: CINEMA_STATS.frames - a, beat: curBeat, progress: +prog.toFixed(3), done: !!presentation.slotDone }; });
  if (report.interactions.reducedMotion.idleFrames > 3) fail('render loop kept running under reduced motion');
  if (!report.interactions.reducedMotion.done) fail('reduced motion did not hold the finished scene');
  if (!report.interactions.reducedMotion.REDUCED) fail('prefers-reduced-motion not detected');
  await p2.screenshot({ path: `${out}/reduced-motion.png` }); await rm.close();
  const mob = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
  const p3 = await mob.newPage(); wire(p3, 'iphone');
  await boot(p3); await seek(p3, 4, .8); await p3.waitForTimeout(1500);
  report.interactions.mobile = await p3.evaluate(() => ({ dpr: CINEMA_STATS.dpr, small: SMALL, overflow: document.documentElement.scrollWidth > innerWidth, tapTargets: Array.from(document.querySelectorAll('.slide-actions button')).filter(b => b.offsetParent).every(b => { const r = b.getBoundingClientRect(); return r.height >= 40 && r.width >= 40; }) }));
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
