/** Click-presentation QA: boots the page, runs the opening countdown, walks every chapter with
 *  buttons/keys/swipes, exercises autoplay, panels, Explore, editor and reduced motion.
 *  Usage: node scripts/qa-click.mjs [--out=qa/click-current] [--no-mobile]
 */
import { chromium, devices } from 'playwright';
import { mkdir, writeFile, readdir, access } from 'node:fs/promises';
import { homedir } from 'node:os';

const args = process.argv.slice(2);
const opt = (n, d) => { const a = args.find(x => x.startsWith(n + '=')); return a ? a.slice(n.length + 1) : d; };
const url = process.env.QA_URL || 'http://127.0.0.1:5173';
const out = opt('--out', 'qa/click-current');
await mkdir(out, { recursive: true });

let executablePath = chromium.executablePath();
try { await access(executablePath); } catch {
  const cache = homedir() + '/Library/Caches/ms-playwright'; const dirs = await readdir(cache);
  const dir = dirs.filter(x => x.startsWith('chromium_headless_shell-')).sort().at(-1);
  executablePath = `${cache}/${dir}/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
}
const browser = await chromium.launch({ headless: true, executablePath, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
const R = { date: new Date().toISOString(), errors: [], missing: [], fails: [], checks: {} };
const fail = (m) => { R.fails.push(m); console.log('FAIL', m); };
const ok = (name, v, m) => { R.checks[name] = v; console.log(v ? 'ok  ' : 'FAIL', name, m === undefined ? '' : JSON.stringify(m)); if (!v) R.fails.push(name + (m === undefined ? '' : ' ' + JSON.stringify(m))); };
function wire(page, tag) {
  page.on('pageerror', e => { R.errors.push(`[${tag}] ${e.stack || e.message}`); console.log('ERROR', tag, e.message); });
  page.on('console', m => { if (m.type() === 'error') { R.errors.push(`[${tag}] ${m.text()}`); console.log('CONSOLE', m.text().slice(0, 300)); } else if (m.type() === 'warning' && /GL_INVALID|Shader|THREE/.test(m.text())) console.log('WARN', m.text().slice(0, 200)); });
  page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) { R.missing.push(r.url()); console.log('MISSING', r.status(), r.url()); } });
  page.on('requestfailed', r => { if (!/favicon/.test(r.url())) { R.missing.push(r.url()); console.log('REQFAIL', r.url()); } });
}
const S = (page) => page.evaluate(() => ({ cur, curBeat, prog: +prog.toFixed(3), started, playing, still: !!(window.STILL && STILL[curBeat]), manual: !!(TRUCKS[0] && TRUCKS[0].veh.manual), speed: TRUCKS[0] ? +TRUCKS[0].veh.speed.toFixed(3) : null, paused: presentation.isPaused, elapsedT: elapsed, cam: camera.position.toArray().map(v => +v.toFixed(3)), near: camera.near, shell: FAC.processing.userData.stages.shell.visible, flashAnims: document.getElementById('flash').getAnimations().length, tr: presentation.isTransitioning, panel: presentation.panel, ex: EX.on, remaining: +presentation.remainingTime.toFixed(1), complete: presentation.sequenceComplete, opening: !!presentation.opening, clock: document.getElementById('clock').textContent, autoHidden: document.getElementById('auto-countdown').hidden, status: document.getElementById('presentation-status').textContent.trim(), play: document.getElementById('play').textContent.trim(), title: document.getElementById('slide-title')?.textContent, count: document.getElementById('chapter-count').textContent.replace(/\s+/g, ' '), scrollY: window.scrollY, docH: document.documentElement.scrollHeight, overflow: document.documentElement.scrollWidth > innerWidth, frames: CINEMA_STATS.frames }));
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.png` });
const wait = (page, ms) => page.waitForTimeout(ms);

async function boot(page, tag) {
  const t0 = Date.now();
  await page.goto(url);
  await page.waitForSelector('#start.ready:not(.error)', { timeout: 180000 });
  R[tag + 'ReadyMs'] = Date.now() - t0;
  return R[tag + 'ReadyMs'];
}

// ---------------- desktop ----------------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); wire(page, 'desktop');
  console.log('READY', await boot(page, 'desktop'));
  await shot(page, 'd0-loader');
  let s = await S(page);
  ok('no-scroll-track', s.docH <= 900 + 1 && s.scrollY === 0, { docH: s.docH });
  await page.click('#start'); await wait(page, 350);
  s = await S(page);
  ok('opening-countdown-runs', s.opening && !s.started, s.opening);
  const n1 = await page.evaluate(() => document.getElementById('opening-number').textContent);
  await shot(page, 'd1-countdown');
  await wait(page, 1200);
  const n2 = await page.evaluate(() => document.getElementById('opening-number').textContent);
  ok('countdown-decrements', n1 === '3' && n2 === '2', { n1, n2 });
  await wait(page, 2200);
  s = await S(page);
  ok('countdown-finishes', s.started && !s.opening && s.cur === 0 && s.curBeat === (await page.evaluate(() => CH[0].beats[0])), s);
  ok('chapter-1-not-autoplay', !s.playing && s.autoHidden, { playing: s.playing, autoHidden: s.autoHidden });
  await wait(page, 1500);
  s = await S(page);
  ok('sequence-advances', s.prog > .1 && s.prog < 1, s.prog);
  await shot(page, 'd2-ch1');
  // next button through every chapter
  const chapterShots = [];
  const N = await page.evaluate(() => CH.length);
  for (let i = 1; i < N; i++) {
    await page.click('#next'); await wait(page, 500);
    s = await S(page);
    ok(`transition-locks-${i}`, s.tr === true, { tr: s.tr });
    await wait(page, 1300);
    s = await S(page);
    ok(`next-to-${i + 1}`, s.cur === i && !s.tr, { cur: s.cur, tr: s.tr, count: s.count });
    await wait(page, 2500);
    await shot(page, `d3-ch${i + 1}-mid`);
    chapterShots.push(await S(page));
  }
  s = await S(page);
  ok('next-becomes-replay-at-end', await page.evaluate(() => document.getElementById('next').classList.contains('replay') && /Qayta/.test(document.getElementById('next').textContent)));
  // wait for the final chapter to complete → replay control
  await wait(page, 12000);
  s = await S(page);
  ok('final-complete', s.complete && /Qayta/.test(s.play), { complete: s.complete, play: s.play });
  await shot(page, 'd4-ch6-end');
  // keyboard
  await page.keyboard.press('Home'); await wait(page, 1900); s = await S(page); ok('key-home', s.cur === 0, s.cur);
  await page.keyboard.press('End'); await wait(page, 1900); s = await S(page); ok('key-end', s.cur === N - 1, s.cur);
  await page.keyboard.press('ArrowLeft'); await wait(page, 1900); s = await S(page); ok('key-left', s.cur === N - 2, s.cur);
  await page.keyboard.press('ArrowRight'); await wait(page, 1900); s = await S(page); ok('key-right', s.cur === N - 1, s.cur);
  // rail click + completed markers
  await page.locator('#rail button').nth(1).click(); await wait(page, 1900); s = await S(page);
  ok('rail-click', s.cur === 1, s.cur);
  const rail = await page.evaluate(() => Array.from(document.querySelectorAll('#rail button')).map(b => ({ cur: b.getAttribute('aria-current'), done: b.classList.contains('completed'), mark: b.querySelector('.chapter-state').textContent })));
  ok('rail-active-obvious', rail[1].cur === 'true' && rail.filter(r => r.cur === 'true').length === 1, rail);
  ok('rail-completed-marks', rail[0].done && rail[N - 1].done && rail[0].mark === '✓', rail);
  // rapid clicks: queue the latest request
  await page.keyboard.press('Home'); await wait(page, 1900);
  await page.click('#next'); await wait(page, 80); await page.click('#next'); await wait(page, 80); await page.click('#next');
  await wait(page, 4200); s = await S(page);
  ok('rapid-clicks-queue', s.cur === Math.min(3, N - 1) && !s.tr, { cur: s.cur, tr: s.tr });
  // beat navigation: third beat of the current chapter
  const thirdBeat = await page.evaluate(() => CH[cur].beats[2]);
  await page.locator('#beat-nav button').nth(2).click(); await wait(page, 1900); s = await S(page);
  ok('beat-nav', s.curBeat === thirdBeat, { curBeat: s.curBeat, want: thirdBeat });
  await shot(page, 'd5-ch4-beat3');
  // beat 15 is a still: the slot keeps counting, but camera and world clock are pinned
  ok('beat-nav-still-pinned', s.still && !s.paused, { still: s.still, paused: s.paused });
  const st1 = s; await wait(page, 700); s = await S(page);
  ok('still-sequence-advances', s.prog > st1.prog, { from: st1.prog, to: s.prog });
  ok('still-camera-fixed', s.cam.join() === st1.cam.join(), { from: st1.cam, to: s.cam });
  ok('still-world-frozen', s.elapsedT === st1.elapsedT, { from: st1.elapsedT, to: s.elapsedT });
  // autoplay countdown
  await page.keyboard.press('Home'); await wait(page, 1900);
  await page.click('#play'); await wait(page, 400); s = await S(page);
  ok('autoplay-visible', s.playing && !s.autoHidden && /Keyingi bo‘lim: \d\d:\d\d/.test(s.clock), { clock: s.clock, autoHidden: s.autoHidden });
  const r1 = s.remaining; await wait(page, 1500); s = await S(page); const r2 = s.remaining;
  ok('autoplay-counts-down', r2 < r1 - 1 && r2 > r1 - 2.2, { r1, r2 });
  await shot(page, 'd6-autoplay');
  // editor pauses the timer
  await page.click('#edit-open'); await wait(page, 500); s = await S(page);
  ok('editor-opens', s.panel === 'editor' && /pauza/i.test(s.status), { panel: s.panel, status: s.status });
  const r3 = s.remaining; await wait(page, 1500); s = await S(page);
  ok('editor-pauses-timer', Math.abs(s.remaining - r3) < .2, { r3, now: s.remaining });
  await shot(page, 'd7-editor');
  // edit a figure, save → metrics refresh
  const firstInput = page.locator('#editor input').first(); const original = await firstInput.inputValue();
  await firstInput.fill(String(Number(original) + 1)); await page.click('#edit-save'); await wait(page, 600); s = await S(page);
  ok('editor-save-closes', s.panel === null && !!localStorage_ok(await page.evaluate(() => localStorage.getItem('chicken-figs'))), s.panel);
  await page.click('#edit-open'); await wait(page, 300); await page.click('#edit-reset'); await wait(page, 300); await page.keyboard.press('Escape'); await wait(page, 400); s = await S(page);
  ok('escape-closes-editor', s.panel === null && s.playing, { panel: s.panel, playing: s.playing });
  // hidden tab pauses
  const r4 = (await S(page)).remaining;
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await wait(page, 1500);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await wait(page, 200); s = await S(page);
  ok('hidden-tab-pauses-timer', Math.abs(s.remaining - r4) < .5, { r4, now: s.remaining });
  // autoplay advances to chapter 2 by itself
  const remaining = (await S(page)).remaining; await wait(page, remaining * 1000 + 2500); s = await S(page);
  ok('autoplay-advances', s.cur === 1 && s.playing, { cur: s.cur, playing: s.playing });
  // selecting another chapter resets the countdown
  await page.locator('#rail button').nth(2).click(); await wait(page, 1900); s = await S(page);
  ok('chapter-change-resets-timer', s.cur === 2 && s.remaining > 13, { remaining: s.remaining, playing: s.playing });
  await page.click('#play'); await wait(page, 300); s = await S(page);
  ok('pause-hides-countdown', !s.playing && s.autoHidden, { playing: s.playing, autoHidden: s.autoHidden });
  // details panel
  await page.click('#details-open'); await wait(page, 700); s = await S(page);
  ok('details-opens', s.panel === 'details', s.panel);
  const detailCount = await page.evaluate(() => document.querySelectorAll('#details-body .archive-beat').length);
  const beatCount = await page.evaluate(() => CH[cur].beats.length);
  ok('details-lists-beats', detailCount === beatCount, detailCount);
  await shot(page, 'd8-details');
  await page.keyboard.press('Escape'); await wait(page, 400); s = await S(page); ok('escape-closes-details', s.panel === null);
  // explore mode keeps the chapter
  const before = await S(page);
  await page.click('#explore-btn'); await wait(page, 1000); s = await S(page);
  ok('explore-on', s.ex && await page.evaluate(() => document.body.classList.contains('exploring')));
  const yaw0 = await page.evaluate(() => EX.wantYaw);
  await page.mouse.move(600, 450); await page.mouse.down(); await page.mouse.move(760, 470, { steps: 8 }); await page.mouse.up(); await wait(page, 300);
  ok('explore-drag', Math.abs(await page.evaluate(() => EX.wantYaw) - yaw0) > .05);
  const d0 = await page.evaluate(() => EX.wantDist); await page.mouse.wheel(0, -400); await wait(page, 300);
  ok('explore-wheel', await page.evaluate(() => EX.wantDist) !== d0);
  await page.locator('#explore-chips button').nth(3).click(); await wait(page, 900);
  ok('explore-chip', (await page.evaluate(() => document.getElementById('explore-name').textContent)) === 'Qayta ishlash');
  await shot(page, 'd9-explore');
  await page.keyboard.press('Escape'); await wait(page, 900); s = await S(page);
  ok('explore-off-keeps-chapter', !s.ex && s.cur === before.cur && s.curBeat === before.curBeat, { cur: s.cur, was: before.cur });
  // tooltip on the exploded cuts (the chapter that ends with beat 4)
  const cutsChapter = await page.evaluate(() => CH.findIndex(c => c.beats.includes(4)));
  await page.locator('#rail button').nth(cutsChapter).click(); await wait(page, 1900);
  await page.locator('#beat-nav button').nth(4).click(); await wait(page, 1900 + 2600);
  const pt = await page.evaluate(() => { const m = G.birdDressed.userData.parts.breastL, v = m.getWorldPosition(new THREE.Vector3()).project(camera); return { x: (v.x * .5 + .5) * innerWidth, y: (-v.y * .5 + .5) * innerHeight }; });
  await page.mouse.move(pt.x, pt.y, { steps: 4 }); await wait(page, 400);
  const tip = await page.evaluate(() => ({ on: document.getElementById('part-tip').classList.contains('on'), text: document.getElementById('part-tip').textContent.replace(/\s+/g, ' ').slice(0, 80) }));
  ok('part-tooltip', tip.on, tip);
  await shot(page, 'd10-cuts-tooltip');
  // still beats 12 (parked lorry) and 10 (pre-staged hall interior) in the same chapter
  await page.locator('#beat-nav button').nth(3).click(); await wait(page, 1900); s = await S(page);
  ok('truck-still-parked', s.curBeat === 12 && s.manual && s.speed === 0 && !s.paused, { curBeat: s.curBeat, manual: s.manual, speed: s.speed });
  await shot(page, 'd13-truck-still');
  await page.click('#explore-btn'); await wait(page, 800); s = await S(page);
  ok('explore-unparks-truck', s.ex && !s.manual, { ex: s.ex, manual: s.manual });
  await page.keyboard.press('Escape'); await wait(page, 900); s = await S(page);
  ok('explore-back-reparks', !s.ex && s.curBeat === 12 && s.manual, { ex: s.ex, curBeat: s.curBeat, manual: s.manual });
  await page.locator('#beat-nav button').nth(2).click(); await wait(page, 300);
  const flashes = [];
  for (const t of [300, 900, 1200]) { await wait(page, t); flashes.push((await S(page)).flashAnims); }
  s = await S(page);
  ok('interior-still-staged', s.curBeat === 10 && s.near === 0.06 && s.shell === false, { curBeat: s.curBeat, near: s.near, shell: s.shell });
  ok('truck-unparked-on-exit', !s.manual, { manual: s.manual });
  ok('interior-still-no-mid-beat-flash', flashes.every(f => f === 0), flashes);
  await shot(page, 'd14-interior-still');
  // number formatting consistency
  const nums = await page.evaluate(() => Array.from(document.querySelectorAll('.metric-value')).map(e => e.textContent));
  ok('numbers-uz-format', nums.every(n => !/\d\.\d{3}/.test(n) && !/\d{4,}/.test(n)), nums);
  // replay from the final chapter
  await page.keyboard.press('End'); await wait(page, 1900 + 14500); s = await S(page);
  ok('final-replay-button', /Qayta/.test(s.play), s.play);
  await page.click('#next'); await wait(page, 500); s = await S(page);
  ok('replay-restarts-countdown', s.opening && !s.started, s.opening);
  await wait(page, 3300); s = await S(page);
  ok('replay-lands-chapter-1', s.started && s.cur === 0, s.cur);
  // idle: render loop must stop after the sequence finishes
  await wait(page, 9500);
  const f0 = (await S(page)).frames; await wait(page, 1500); const f1 = (await S(page)).frames;
  ok('idle-stops-rendering', f1 - f0 <= 3, { frames: f1 - f0 });
  // small desktop + short landscape layout
  await page.setViewportSize({ width: 1100, height: 700 }); await wait(page, 900); await shot(page, 'd11-1100x700');
  ok('no-overflow-1100', !(await S(page)).overflow);
  await page.setViewportSize({ width: 844, height: 390 }); await wait(page, 900); await shot(page, 'd12-844x390');
  ok('no-overflow-844x390', !(await S(page)).overflow);
  await ctx.close();
}
function localStorage_ok(v) { return !!v; }

// ---------------- reduced motion ----------------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage(); wire(page, 'reduced');
  await boot(page, 'reduced'); await page.click('#start'); await wait(page, 3500);
  let s = await S(page);
  ok('reduced-static-chapter', s.started && s.complete && !s.playing, { complete: s.complete, playing: s.playing });
  await page.click('#next'); await wait(page, 2200); s = await S(page);
  ok('reduced-instant-nav', s.cur === 1 && !s.tr, { cur: s.cur, tr: s.tr });
  const f0 = s.frames; await wait(page, 1500); s = await S(page);
  ok('reduced-idle', s.frames - f0 <= 3, s.frames - f0);
  await shot(page, 'r1-reduced');
  await ctx.close();
}

// ---------------- mobile ----------------
if (!args.includes('--no-mobile')) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage(); wire(page, 'iphone');
  console.log('READY mobile', await boot(page, 'mobile'));
  await shot(page, 'm0-loader');
  await page.click('#start'); await wait(page, 3500);
  let s = await S(page);
  ok('mobile-start', s.started && s.cur === 0, s);
  await wait(page, 1500); await shot(page, 'm1-ch1');
  const targets = await page.evaluate(() => Array.from(document.querySelectorAll('#rail button,.ctrl button,#beat-nav button,#info-toggle,#explore-btn,#edit-open')).filter(b => b.offsetParent).map(b => { const r = b.getBoundingClientRect(); return [b.id || b.className || b.textContent.trim(), Math.round(r.width), Math.round(r.height)]; }));
  ok('mobile-touch-targets', targets.every(t => t[1] >= 44 && t[2] >= 44), targets.filter(t => t[1] < 44 || t[2] < 44));
  // swipe left on the canvas → next chapter
  const frame = await page.locator('#scene-frame').boundingBox();
  const cx = frame.x + frame.width / 2, cy = frame.y + frame.height / 2;
  await page.touchscreen.tap(cx, cy).catch(() => {});
  await page.evaluate(([x, y]) => { const c = document.getElementById('gl'); const o = { pointerId: 9, pointerType: 'touch', isPrimary: true, bubbles: true, clientX: x, clientY: y }; c.dispatchEvent(new PointerEvent('pointerdown', o)); c.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: x - 120 })); c.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: x - 140 })); }, [cx, cy]);
  await wait(page, 2000); s = await S(page);
  ok('mobile-swipe-next', s.cur === 1, s.cur);
  await page.evaluate(([x, y]) => { const c = document.getElementById('gl'); const o = { pointerId: 10, pointerType: 'touch', isPrimary: true, bubbles: true, clientX: x, clientY: y }; c.dispatchEvent(new PointerEvent('pointerdown', o)); c.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: x + 140 })); }, [cx, cy]);
  await wait(page, 2000); s = await S(page);
  ok('mobile-swipe-prev', s.cur === 0, s.cur);
  await page.locator('#rail button').nth(1).click(); await wait(page, 2200); s = await S(page);
  ok('mobile-rail', s.cur === 1, s.cur);
  await shot(page, 'm2-ch4');
  await page.click('#info-toggle'); await wait(page, 500);
  ok('mobile-info-expands', await page.evaluate(() => document.getElementById('scene-layer').classList.contains('expanded')));
  await shot(page, 'm3-ch4-expanded');
  await page.keyboard.press('Escape'); await wait(page, 300);
  await page.click('#play'); await wait(page, 600); s = await S(page);
  ok('mobile-autoplay', s.playing && !s.autoHidden, { clock: s.clock });
  await shot(page, 'm4-autoplay');
  await page.click('#play'); await wait(page, 300);
  await page.click('#explore-btn'); await wait(page, 1200); s = await S(page);
  ok('mobile-explore', s.ex);
  await shot(page, 'm5-explore');
  await page.click('#explore-btn'); await wait(page, 900); s = await S(page);
  ok('mobile-explore-back', !s.ex && s.cur === 1, { cur: s.cur });
  await page.locator('#rail button').nth(await page.evaluate(() => CH.findIndex(c => c.beats.includes(4)))).click(); await wait(page, 2200); await page.locator('#beat-nav button').nth(4).click(); await wait(page, 4500);
  await shot(page, 'm6-ch5-cuts');
  ok('mobile-no-overflow', !(await S(page)).overflow);
  await ctx.close();
}
await browser.close();
if (R.errors.length) fail(`${R.errors.length} page/console errors`);
if (R.missing.length) fail(`${R.missing.length} failed requests`);
await writeFile(`${out}/click-report.json`, JSON.stringify(R, null, 2));
console.log('\nRESULT', R.fails.length ? 'FAIL ' + R.fails.length : 'PASS', 'errors', R.errors.length, 'missing', R.missing.length);
process.exit(R.fails.length ? 1 : 0);
