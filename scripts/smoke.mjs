/** Fast smoke test for the presentation: boots the page (old #start loader or the future hero CTA),
 *  walks every chapter with ArrowRight, then End / Home, and collects page errors, console errors
 *  and failed requests. Screenshots c0..cN.png + report.json land in the out dir.
 *  Usage: QA_URL=<url> node scripts/smoke.mjs [--out=qa/smoke] [--sizes=1920x1080,1440x900]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile, readdir, access } from 'node:fs/promises';
import { homedir } from 'node:os';

const args = process.argv.slice(2);
const opt = (n, d) => { const a = args.find(x => x.startsWith(n + '=')); return a ? a.slice(n.length + 1) : d; };
const url = process.env.QA_URL || 'http://127.0.0.1:5188';
const out = opt('--out', 'qa/smoke');
const sizes = opt('--sizes', '1920x1080').split(',').map(s => { const [w, h] = s.split('x').map(Number); return { width: w, height: h }; });
await mkdir(out, { recursive: true });

let executablePath = chromium.executablePath();
try { await access(executablePath); } catch {
  const cache = homedir() + '/Library/Caches/ms-playwright'; const dirs = await readdir(cache);
  const dir = dirs.filter(x => x.startsWith('chromium_headless_shell-')).sort().at(-1);
  executablePath = `${cache}/${dir}/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
}
const browser = await chromium.launch({ headless: true, executablePath, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });

const R = { date: new Date().toISOString(), url, sizes, pageErrors: [], consoleErrors: [], failedRequests: [], fails: [], checks: {}, states: {} };
const ok = (name, v, m) => {
  R.checks[name] = v; console.log(v ? 'ok  ' : 'FAIL', name, m === undefined ? '' : JSON.stringify(m));
  if (!v) R.fails.push(name + (m === undefined ? '' : ' ' + JSON.stringify(m)));
};
function wire(page, tag) {
  page.on('pageerror', e => { R.pageErrors.push(`[${tag}] ${e.stack || e.message}`); console.log('ERROR', tag, e.message); });
  page.on('console', m => { if (m.type() === 'error') { R.consoleErrors.push(`[${tag}] ${m.text()}`); console.log('CONSOLE', m.text().slice(0, 300)); } });
  page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) { R.failedRequests.push(r.url()); console.log('MISSING', r.status(), r.url()); } });
  page.on('requestfailed', r => { if (!/favicon/.test(r.url())) { R.failedRequests.push(r.url()); console.log('REQFAIL', r.url()); } });
}
const S = (page) => page.evaluate(() => ({ cur, curBeat, started }));
const wait = (page, ms) => page.waitForTimeout(ms);
const isStarted = () => window.started === true;

/** Works for both the current loader page (#start.ready → click → chapter 1 starts at once) and the future hero (#hero-cta). */
async function boot(page) {
  const t0 = Date.now();
  await page.goto(url);
  await page.waitForFunction(() => window.started === true || !!document.querySelector('#start.ready') || !!document.querySelector('#hero-cta:not([disabled])'), null, { timeout: 180000 });
  const mode = await page.evaluate(() => window.started === true ? 'started' : document.querySelector('#start.ready') ? 'loader' : 'hero');
  if (mode === 'loader') { await page.click('#start'); await page.waitForFunction(isStarted, null, { timeout: 20000 }); }
  else if (mode === 'hero') { await page.waitForFunction(isStarted, null, { timeout: 20000 }); }
  return { mode, ms: Date.now() - t0 };
}

for (const size of sizes) {
  const tag = `${size.width}x${size.height}`, prefix = sizes.length > 1 ? tag + '-' : '';
  const shot = (page, name) => page.screenshot({ path: `${out}/${prefix}${name}.png` });
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); wire(page, tag);
  const states = R.states[tag] = [];
  try {
    const b = await boot(page);
    ok(`${tag} boot`, true, b);
    await shot(page, 'c0');
    let s = await S(page); states.push(s);
    ok(`${tag} started-at-chapter-0`, s.started === true && s.cur === 0, s);
    const N = await page.evaluate(() => CH.length);
    console.log('info', tag, 'chapters', N);
    // bir klik = bir sahna: har bo'limda bir nechta sahna bo'lishi mumkin
    let guard = 0, shots = 0, lastCh = 0;
    while (guard++ < 60) {
      const st = await page.evaluate(() => FarmPresentation.slotInfo());
      if (!st.done) { await page.keyboard.press('ArrowRight'); await wait(page, 600); continue; }
      if (st.chapter !== lastCh) { lastCh = st.chapter; await shot(page, `c${++shots}`); }
      if (st.chapter === N - 1 && st.slot === st.slots - 1) break;
      await page.keyboard.press('ArrowRight');
      await wait(page, st.slot === st.slots - 1 ? 2200 : 1400);
    }
    s = await S(page); states.push(s);
    ok(`${tag} walks-to-last-chapter`, s.cur === N - 1, s);
    ok(`${tag} visited-every-chapter`, shots === N - 1, { shots, want: N - 1 });
    await page.keyboard.press('End'); await wait(page, 1900); s = await S(page);
    ok(`${tag} key-end`, s.cur === N - 1, s);
    await page.keyboard.press('Home'); await wait(page, 1900); s = await S(page);
    ok(`${tag} key-home`, s.cur === 0, s);
    await page.keyboard.press('ArrowRight'); await wait(page, 2200); s = await S(page);
    ok(`${tag} arrow-right-after-home`, s.cur === Math.min(1, N - 1), s);
  } catch (e) {
    ok(`${tag} run`, false, String(e.message || e).slice(0, 300));
  }
  await ctx.close();
}
await browser.close();

const summary = `SMOKE errors=${R.pageErrors.length} console=${R.consoleErrors.length} missing=${R.failedRequests.length} fails=${R.fails.length}`;
R.summary = summary;
await writeFile(`${out}/report.json`, JSON.stringify(R, null, 2));
console.log('\n' + summary);
process.exit(R.pageErrors.length || R.consoleErrors.length || R.failedRequests.length || R.fails.length ? 1 : 0);
