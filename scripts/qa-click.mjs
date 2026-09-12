/** "Sokin Savdo" — klik-taqdimot QA.
 *
 *  Tekshiradi: hero 00-bo'lim, klik oqimi (har sahna alohida to'xtaydi), pult
 *  tugmalari (PageUp/PageDown), o'q tugmalar, Home/End, F to'liq ekran,
 *  foto tugmasi (fayl yo'q -> tugma yo'q), qiymat zanjiri ko'rsatkichi,
 *  yo'l xaritasi, reja kartalari va — eng muhimi — EKRANDA FAQAT MANBADAGI
 *  RAQAMLAR borligini.
 *
 *  Ishlatish: QA_URL=http://127.0.0.1:5250 node scripts/qa-click.mjs --out=qa/click
 */
import { chromium } from 'playwright';
import { mkdir, writeFile, readdir, access } from 'node:fs/promises';
import { homedir } from 'node:os';

const args = process.argv.slice(2);
const opt = (n, d) => { const a = args.find(x => x.startsWith(n + '=')); return a ? a.slice(n.length + 1) : d; };
const url = process.env.QA_URL || 'http://127.0.0.1:5250';
const out = opt('--out', 'qa/click');
await mkdir(out, { recursive: true });

let executablePath = chromium.executablePath();
try { await access(executablePath); } catch {
  const cache = homedir() + '/Library/Caches/ms-playwright'; const dirs = await readdir(cache);
  const dir = dirs.filter(x => x.startsWith('chromium_headless_shell-')).sort().at(-1);
  executablePath = `${cache}/${dir}/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
}
const browser = await chromium.launch({ headless: true, executablePath, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });

const R = { date: new Date().toISOString(), url, errors: [], missing: [], fails: [], checks: {}, numbers: {} };
const ok = (name, v, m) => {
  R.checks[name] = !!v; console.log(v ? 'ok  ' : 'FAIL', name, m === undefined ? '' : JSON.stringify(m).slice(0, 220));
  if (!v) R.fails.push(name + (m === undefined ? '' : ' ' + JSON.stringify(m).slice(0, 220)));
};
function wire(page, tag) {
  page.on('pageerror', e => { R.errors.push(`[${tag}] ${e.stack || e.message}`); console.log('ERROR', tag, e.message); });
  page.on('console', m => { if (m.type() === 'error') { R.errors.push(`[${tag}] console: ${m.text()}`); console.log('CONSOLE', m.text().slice(0, 200)); } });
  page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) { R.missing.push(r.status() + ' ' + r.url()); console.log('MISSING', r.status(), r.url()); } });
  page.on('requestfailed', r => { if (!/favicon/.test(r.url())) { R.missing.push('FAIL ' + r.url()); console.log('REQFAIL', r.url()); } });
}
const S = (page) => page.evaluate(() => FarmPresentation.slotInfo());
const wait = (page, ms) => page.waitForTimeout(ms);

/* ---------- manbadagi raqamlar: boshqa hech qanday raqam ekranda bo'lmasin --
   Ruxsat etilgan: nutqdagi faktlar + interfeys sanog'i (00..06, 01/06).      */
// 25 = "25 ming" (manbadagi 25 000 so'z bilan), 1,5 = "1,5 mln" (1 500 000)
const ALLOWED = new Set(['2010', '2026', '3', '25', '25000', '1500000', '1,5']);
const UI_COUNTER = /^0?[0-9]$/;                    // 00..09 — bo'lim/sahna nomeri
function scanNumbers(texts) {
  const bad = [];
  for (const t of texts) {
    // "1 500 000" va "25 000" — ajratgich sifatida oddiy va tor probel
    const norm = t.replace(/[   ]/g, ' ');
    const found = norm.match(/\d[\d  ]*(?:,\d+)?/g) || [];
    for (const raw of found) {
      const token = raw.trim().replace(/ /g, '');
      if (!token) continue;
      if (ALLOWED.has(token)) continue;
      if (UI_COUNTER.test(token)) continue;
      bad.push({ token, in: t.slice(0, 90) });
    }
  }
  return bad;
}
const visibleTexts = (page) => page.evaluate(() => {
  const roots = ['#hero', '#slide-copy', '#data-copy', '#scene-caption', '.slide-actions'];
  const out = [];
  for (const sel of roots) {
    const el = document.querySelector(sel);
    if (!el || el.hidden || el.offsetParent === null) continue;
    el.querySelectorAll('*').forEach(n => {
      if (n.children.length === 0 && n.textContent.trim()) out.push(n.textContent.trim());
    });
  }
  return out;
});

const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await ctx.newPage(); wire(page, 'desktop');

// ---------- boot: hero darhol ko'rinadi, 3D keyin tayyor bo'ladi ----------
const t0 = Date.now();
await page.goto(url);
const heroEarly = await page.evaluate(() => {
  const h = document.getElementById('hero');
  return { present: !!h && !h.hidden, title: (document.getElementById('hero-title') || {}).textContent || '' };
});
ok('hero-visible-before-3d-ready', heroEarly.present, heroEarly);
await page.screenshot({ path: `${out}/d0-hero-loading.png` });
ok('no-loader-screen', await page.evaluate(() => !document.getElementById('loader')));
ok('no-countdown', await page.evaluate(() => !document.getElementById('opening-countdown') && !document.getElementById('auto-countdown')));
ok('no-figures-editor', await page.evaluate(() => !document.getElementById('editor') && !document.getElementById('details')));

await page.waitForFunction(() => window.started === true, null, { timeout: 240000 });
R.readyMs = Date.now() - t0;
console.log('READY', R.readyMs, 'ms');
await wait(page, 1200);
await page.screenshot({ path: `${out}/d1-hero.png` });

let s = await S(page);
ok('starts-on-hero', s.hero === true && s.chapter === 0, s);
ok('hero-cta-enabled', await page.evaluate(() => !document.getElementById('hero-cta').disabled));
ok('hero-hides-canvas', await page.evaluate(() => document.body.classList.contains('on-hero')));
ok('hero-title-from-story', await page.evaluate(() => document.getElementById('hero-title').textContent.includes('klasterigacha')));

const N = await page.evaluate(() => CH.length);
ok('six-chapters', N === 6, { N });
const plan = await page.evaluate(() => CH.map(c => ({ t: c.t, beats: c.beats.length })));
console.log('chapters', JSON.stringify(plan));

// ---------- hero -> 01 veil ----------
await page.click('#hero-cta'); await wait(page, 2200);
s = await S(page);
ok('cta-goes-to-chapter-1', s.chapter === 1 && !s.hero, s);
ok('canvas-visible-after-hero', await page.evaluate(() => !document.body.classList.contains('on-hero')));

// ---------- klik oqimi: har sahna alohida to'xtaydi ----------
const seen = [];
let guard = 0, badNums = [];
while (guard++ < 60) {
  s = await S(page);
  if (!s.done) { await page.keyboard.press('ArrowRight'); await wait(page, 700); continue; }
  await wait(page, 350);
  const key = `${s.chapter}.${s.slot}`;
  if (!seen.includes(key)) {
    seen.push(key);
    badNums = badNums.concat(scanNumbers(await visibleTexts(page)).map(b => ({ ...b, at: key })));
    await page.screenshot({ path: `${out}/s-ch${s.chapter}-${s.slot + 1}.png` });
  }
  if (s.chapter === N - 1 && s.slot === s.slots - 1) break;
  await page.keyboard.press('ArrowRight');
  await wait(page, s.slot === s.slots - 1 ? 2400 : 1500);
}
const expected = ['1.0', '1.1', '2.0', '2.1', '3.0', '3.1', '3.2', '3.3', '3.4', '3.5', '4.0', '5.0', '5.1'];
ok('every-scene-reached-in-order', JSON.stringify(seen) === JSON.stringify(expected), { seen });
ok('one-click-one-scene', seen.length === 13, { count: seen.length });

// ---------- ekranda faqat manbadagi raqamlar ----------
R.numbers.rejected = badNums;
ok('no-fabricated-numbers', badNums.length === 0, badNums.slice(0, 6));
const forbidden = await page.evaluate(() => {
  const t = document.body.innerText;
  return ['so‘m', "so'm", 'Tannarx', 'Foyda', 'Soliq', 'Raqamlar', 'Batafsil', 'SKU', 'mln', 'Bir tovuqdan']
    .filter(w => t.includes(w));
});
ok('no-invented-economics-words', forbidden.length === 0, forbidden);

// ---------- oxirgi sahna: takrorlash ----------
ok('last-scene-is-replay', await page.evaluate(() => document.getElementById('next').classList.contains('replay')));
await page.click('#next'); await wait(page, 1400);
s = await S(page);
ok('replay-returns-to-hero', s.hero === true && s.chapter === 0, s);

// ---------- klaviatura va pult ----------
await page.keyboard.press('PageDown'); await wait(page, 2200);
s = await S(page); ok('pagedown-advances', s.chapter === 1, s);
await page.keyboard.press('PageDown'); await wait(page, 900);
await page.keyboard.press('PageDown'); await wait(page, 1500);
s = await S(page); ok('pagedown-walks-scenes', s.chapter === 1 && s.slot === 1, s);
await page.keyboard.press('PageUp'); await wait(page, 900);
s = await S(page); ok('pageup-goes-back-a-scene', s.chapter === 1 && s.slot === 0 && s.done, s);
await page.keyboard.press('End'); await wait(page, 2200);
s = await S(page); ok('key-end', s.chapter === N - 1, s);
await page.keyboard.press('Home'); await wait(page, 2000);
s = await S(page); ok('key-home-returns-to-hero', s.hero === true, s);
await page.keyboard.press('Space'); await wait(page, 2200);
s = await S(page); ok('space-advances', s.chapter === 1, s);

// ---------- F: to'liq ekran so'rovi ----------
const fs = await page.evaluate(() => {
  let called = false;
  const orig = document.documentElement.requestFullscreen;
  document.documentElement.requestFullscreen = function () { called = true; return Promise.resolve(); };
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
  document.documentElement.requestFullscreen = orig;
  return called;
});
ok('f-requests-fullscreen', fs);

// ---------- kanvasga klik keyingi sahnaga o'tadi ----------
await page.evaluate(() => FarmPresentation.goTo(1, { instant: true, force: true }));
await wait(page, 1200);
const before = await S(page);
await page.mouse.click(960, 300); await wait(page, 900);
const after = await S(page);
ok('canvas-click-advances', after.done || after.slot > before.slot, { before, after });

// ---------- foto tugmasi: fayl ro'yxatda yo'q -> tugma yo'q ----------
const photoState = await page.evaluate(() => ({
  registered: (window.STORY.photos || []).length,
  buttonVisible: !document.getElementById('photo-open').hidden
}));
ok('photo-button-hidden-without-file', photoState.registered === 0 ? !photoState.buttonVisible : true, photoState);

// ---------- qiymat zanjiri ko'rsatkichi ----------
const chain = await page.evaluate(() => {
  const read = () => Array.from(document.querySelectorAll('.chain-strip li')).map(li => li.className);
  const out = {};
  FarmPresentation.goTo(1, { instant: true, force: true }); out.ch1 = read();
  FarmPresentation.goTo(3, { instant: true, force: true }); out.ch3 = read();
  return out;
});
ok('chain-strip-has-nine-links', chain.ch1.length === 9 && chain.ch3.length === 9, { n: chain.ch1.length });
ok('chain-grows-with-integration',
  chain.ch1.filter(c => c.includes('on')).length === 1 && chain.ch3.filter(c => c.includes('on')).length === 9,
  { ch1: chain.ch1.filter(c => c.includes('on')).length, ch3: chain.ch3.filter(c => c.includes('on')).length });

// ---------- yo'l xaritasi va reja kartalari ----------
await page.evaluate(() => FarmPresentation.goTo(4, { instant: true, force: true })); await wait(page, 1200);
const road = await page.evaluate(() => ({
  points: document.querySelectorAll('.roadmap .rm').length,
  now: document.querySelectorAll('.roadmap .rm.now').length,
  unknown: document.querySelectorAll('.roadmap .rm.unknown').length,
  dashes: Array.from(document.querySelectorAll('.roadmap .rm-year')).filter(e => e.textContent.trim() === '—').length
}));
ok('roadmap-eleven-points', road.points === 11, road);
ok('roadmap-marks-now', road.now === 1, road);
ok('roadmap-unknown-years-are-dashes', road.unknown === road.dashes && road.dashes > 0, road);

await page.evaluate(() => { FarmPresentation.goTo(5, { instant: true, force: true }); });
await wait(page, 900);
await page.evaluate(() => FarmPresentation.holdSlot(1)); await wait(page, 1200);
const plans = await page.evaluate(() => ({
  cards: document.querySelectorAll('.plan').length,
  empty: document.querySelectorAll('.plan.empty').length,
  deadline: (document.querySelector('.plan-deadline b') || {}).textContent
}));
ok('plan-cards-four', plans.cards === 4, plans);
ok('plan-cards-empty-until-confirmed', plans.empty === 4 && plans.deadline === '—', plans);
await page.screenshot({ path: `${out}/d2-plans.png` });

// ---------- hisoblagichlar faqat manbadagi raqamlarni sanaydi ----------
const counters = await page.evaluate(async () => {
  FarmPresentation.goTo(2, { instant: true, force: true });
  await new Promise(r => setTimeout(r, 2200));   // oldingi sahnadan qaytib sanaydi
  const a = (document.getElementById('fig-cap') || {}).textContent;
  FarmPresentation.goTo(3, { instant: true, force: true });
  await new Promise(r => setTimeout(r, 60));
  const mid = (document.getElementById('fig-cap') || {}).textContent;
  await new Promise(r => setTimeout(r, 1800));
  const b = (document.getElementById('fig-cap') || {}).textContent;
  return { a, mid, b };
});
const norm = (x) => (x || '').replace(/[    ]/g, '');
ok('capacity-counter-animates-25000-to-1500000',
  norm(counters.a) === '25000' && norm(counters.b) === '1500000' && norm(counters.mid) !== norm(counters.b), counters);

// ---------- o'lchamlar ----------
for (const [w, h, tag] of [[1440, 900, 'd3-1440x900'], [3840, 2160, 'd4-3840x2160'], [844, 390, 'd5-844x390'], [390, 844, 'd6-390x844']]) {
  await page.setViewportSize({ width: w, height: h }); await wait(page, 900);
  await page.evaluate(() => FarmPresentation.goTo(3, { instant: true, force: true })); await wait(page, 1400);
  const of = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  ok(`no-horizontal-overflow-${w}x${h}`, !of);
  await page.screenshot({ path: `${out}/${tag}.png` });
}
await page.setViewportSize({ width: 1920, height: 1080 });
await ctx.close();

// ---------- reduced motion ----------
{
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const p2 = await c.newPage(); wire(p2, 'reduced');
  await p2.goto(url);
  await p2.waitForFunction(() => window.started === true, null, { timeout: 240000 });
  await p2.waitForTimeout(1200);
  await p2.evaluate(() => FarmPresentation.goTo(3, { force: true }));
  await p2.waitForTimeout(1500);
  const st = await p2.evaluate(() => FarmPresentation.slotInfo());
  ok('reduced-motion-lands-and-holds', st.chapter === 3 && st.done === true, st);
  await p2.screenshot({ path: `${out}/r1-reduced.png` });
  await c.close();
}

// ---------- oflayn: hech qanday tashqi so'rov yo'q ----------
{
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p3 = await c.newPage();
  const external = [];
  p3.on('request', r => { const u = r.url(); if (!u.startsWith(url) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u); });
  wire(p3, 'offline');
  await p3.goto(url);
  await p3.waitForFunction(() => window.started === true, null, { timeout: 240000 });
  await p3.waitForTimeout(800);
  ok('no-external-requests', external.length === 0, external.slice(0, 5));
  await c.close();
}

await browser.close();
await writeFile(`${out}/click-report.json`, JSON.stringify(R, null, 2));
const passed = Object.values(R.checks).filter(Boolean).length, total = Object.keys(R.checks).length;
const verdict = R.fails.length === 0 && R.errors.length === 0 && R.missing.length === 0 ? 'PASS' : 'FAIL';
console.log(`\nRESULT ${verdict} — ${passed}/${total} checks, ${R.errors.length} errors, ${R.missing.length} missing, ${R.fails.length} failed`);
if (R.fails.length) console.log('failed:', R.fails.join(' | '));
process.exit(verdict === 'PASS' ? 0 : 1);
