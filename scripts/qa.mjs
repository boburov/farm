/* Sokin Savdo — QA.
 *
 * Asosiy kafolat (prompts/STEP_1.MD): ekranda buyurtmachi hujjatlarida yo'q
 * raqam ko'rinmasligi kerak. `no-fabricated-numbers` shuni tekshiradi va
 * ruxsat etilgan ro'yxat qo'lda, ataylab yangilanadi — avtomatik emas.
 *
 *   npm run dev      # boshqa terminalda
 *   npm run qa
 *
 * Sozlamalar: QA_URL (default http://127.0.0.1:5173), QA_OUT (default qa/current)
 */
import { chromium } from 'playwright';
import { access, readdir, mkdir, writeFile } from 'node:fs/promises';

const URL = process.env.QA_URL || 'http://127.0.0.1:5173';
const OUT = process.env.QA_OUT || 'qa/current';

/* Hujjatlardan olingan, ekranda ko'rinishi mumkin bo'lgan yagona raqamlar:
 *   2010  — yil belgisi (docx 1-xatboshi)
 *   3     — ishchi soni (docx 1-xatboshi)
 *   200   — yillik aylanma, mln so'm (docx 1-xatboshi)
 *   6     — yiliga aylanma soni (docx 2-xatboshi)
 * Boshqa har qanday raqam — xato.
 * Yangi yil qo'shilsa, uning raqamlari shu yerga qo'lda, manbasi bilan qo'shiladi. */
const ALLOWED = new Set(['2010', '3', '200', '6']);

const SIZES = [[1920, 1080], [1600, 900], [1440, 900], [1280, 720], [1024, 768], [390, 844]];

const results = [];
const pass = (name, note = '') => results.push({ name, ok: true, note });
const fail = (name, note) => results.push({ name, ok: false, note });

async function resolveChromium() {
  let executablePath = chromium.executablePath();
  try { await access(executablePath); return executablePath; } catch {}
  const cache = `${process.env.HOME}/Library/Caches/ms-playwright`;
  const dirs = await readdir(cache);
  const dir = dirs.filter(x => x.startsWith('chromium_headless_shell-')).sort().at(-1);
  return `${cache}/${dir}/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
}

/* ko'rinadigan matndan barcha raqam guruhlarini ajratadi */
const NUMBERS = () => {
  const text = document.getElementById('page').innerText;
  return [...text.matchAll(/\d+/g)].map(m => m[0]);
};

await mkdir(OUT, { recursive: true });
const executablePath = await resolveChromium();
const browser = await chromium.launch({
  headless: true, executablePath,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
});

/* ---------------------------------------------------------------- sahifa -- */

const errors = [];
const external = [];
const failedReq = [];

const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('requestfailed', r => failedReq.push(r.url()));
page.on('request', r => { if (!r.url().startsWith(URL) && !r.url().startsWith('data:')) external.push(r.url()); });

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('.page.ready', { timeout: 15000 });
await page.waitForTimeout(2500);   /* hisoblagichlar tugashini kutamiz */

/* 1. o'ylab topilgan raqam yo'q */
{
  const nums = await page.evaluate(NUMBERS);
  const bad = [...new Set(nums)].filter(n => !ALLOWED.has(n));
  bad.length
    ? fail('no-fabricated-numbers', 'ruxsat etilmagan raqam: ' + bad.join(', '))
    : pass('no-fabricated-numbers', nums.length + ' ta raqam, hammasi ro\'yxatda');
}

/* 2. ikki statistika kartasi va uch panel */
{
  const c = await page.evaluate(() => ({
    stats: document.querySelectorAll('.stat').length,
    scenes: document.querySelectorAll('.backdrop-scene').length,
    arrows: document.querySelectorAll('.flow-arrow').length
  }));
  const z = await page.evaluate(() => document.querySelectorAll('.zone').length);
  c.stats === 2 && c.scenes === 3 && c.arrows === 2 && z === 3
    ? pass('layout-shape', '2 statistika · 3 fon sahnasi · 3 zona yozuvi · 2 strelka')
    : fail('layout-shape', JSON.stringify({ ...c, zones: z }));
}

/* 3. yil belgisi ko'rinadi */
{
  const y = await page.evaluate(() => {
    const b = document.querySelector('.year-badge');
    return b ? b.textContent.trim() : null;
  });
  y ? pass('year-badge', y) : fail('year-badge', 'topilmadi');
}

/* 4. hisoblagichlar oxirgi qiymatga yetdi */
{
  const nums = await page.evaluate(() =>
    [...document.querySelectorAll('.stat-num')].map(n => [n.textContent, n.dataset.to]));
  const stuck = nums.filter(([now, to]) => now !== to);
  stuck.length
    ? fail('counters-land', JSON.stringify(stuck))
    : pass('counters-land', nums.map(n => n[0]).join(', '));
}

/* 5. pastki zanjir — 3 bosqich */
{
  const n = await page.evaluate(() => document.querySelectorAll('.chain li:not(.arrow)').length);
  n === 3 ? pass('chain-three-steps') : fail('chain-three-steps', `${n} ta bosqich`);
}

/* 6. fon bor — butun ekranni qoplaydigan foto yoki vektor sahnalar */
{
  const st = await page.evaluate(() => {
    const host = document.querySelector('.backdrop');
    const img = host.querySelector('.backdrop-photo');
    const r = host.getBoundingClientRect();
    return {
      photo: host.classList.contains('has-photo'),
      scenes: host.querySelectorAll('svg.scene').length,
      full: Math.round(r.width) >= innerWidth && Math.round(r.height) >= innerHeight,
      natural: img ? [img.naturalWidth, img.naturalHeight] : null,
      /* body foni fon qatlamini bekitib qo'ymasin (avval shu xato bo'lgan) */
      bodyBg: getComputedStyle(document.body).backgroundImage
    };
  });
  (st.photo || st.scenes === 3) && st.full && st.bodyBg === 'none'
    ? pass('backdrop-fullscreen', st.photo ? 'foto ' + st.natural.join('x') : '3 vektor sahna')
    : fail('backdrop-fullscreen', JSON.stringify(st));
}

/* 6b. jingalak strelkalar suratdagi zona chegaralarida turibdi */
{
  const st = await page.evaluate(() => {
    const img = document.querySelector('.backdrop-photo');
    const at = (window.YEARS[0].arrowsAt) || [];
    const nodes = [...document.querySelectorAll('.flow-arrow')];
    if (!img || !img.naturalWidth) return { skipped: true };
    const scale = Math.max(innerWidth / img.naturalWidth, innerHeight / img.naturalHeight);
    const rw = img.naturalWidth * scale, off = (innerWidth - rw) / 2;
    return {
      diffs: nodes.map((n, i) => {
        const want = off + at[i] * rw;
        const got = n.getBoundingClientRect().left + n.getBoundingClientRect().width / 2;
        return Math.abs(want - got);
      }),
      onScreen: nodes.every(n => {
        const r = n.getBoundingClientRect();
        return r.left >= 0 && r.right <= innerWidth;
      })
    };
  });
  if (st.skipped) pass('arrows-on-zone-edges', 'foto yo\'q — o\'tkazib yuborildi');
  else st.diffs.every(d => d < 2) && st.onScreen
    ? pass('arrows-on-zone-edges', 'chetlanish < 2px')
    : fail('arrows-on-zone-edges', JSON.stringify(st));
}

/* 7. hech qanday tashqi so'rov yo'q (offline kafolati) */
external.length
  ? fail('no-external-requests', external.join(', '))
  : pass('no-external-requests');

/* 8. 404 / yuklanmagan resurs yo'q.
 *    assets/photos/ dagi fayl yo'q bo'lsa sahifa vektor sahnaga tushadi —
 *    bu kutilgan zaxira holati, qattiq xato emas. */
{
  const OPTIONAL = /assets\/photos\//;
  const hard = failedReq.filter(u => !OPTIONAL.test(u));
  const soft = failedReq.filter(u => OPTIONAL.test(u));
  hard.length
    ? fail('no-failed-requests', hard.join(', '))
    : pass('no-failed-requests', soft.length ? soft.length + ' ta panel fotosi hali qo\'yilmagan' : '');
}

/* 9. konsol va sahifa xatolari (rasm 404 lari yuqorida hisobga olindi) */
{
  const hard = errors.filter(e => !/Failed to load resource/.test(e));
  hard.length ? fail('no-errors', hard.join(' | ')) : pass('no-errors');
}

await page.close();

/* ------------------------------------------------------------- o'lchamlar */

for (const [w, h] of SIZES) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForSelector('.page.ready', { timeout: 15000 });
  await p.waitForTimeout(2200);
  await p.screenshot({ path: `${OUT}/${w}x${h}.png` });

  const m = await p.evaluate(() => {
    const d = document.documentElement;
    return { sw: d.scrollWidth, cw: d.clientWidth, sh: d.scrollHeight, ch: d.clientHeight };
  });
  const label = `${w}x${h}`;
  m.sw > m.cw
    ? fail(`no-horizontal-overflow@${label}`, `${m.sw} > ${m.cw}`)
    : pass(`no-horizontal-overflow@${label}`);

  /* desktopda sahifa bir ekranga sig'ishi shart; mobilda scroll ruxsat */
  if (w > 900) {
    m.sh > m.ch + 1
      ? fail(`single-screen@${label}`, `${m.sh} > ${m.ch}`)
      : pass(`single-screen@${label}`);
  }
  await p.close();
}

/* ------------------------------------------------- harakat kamaytirilgan -- */

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForSelector('.page.ready', { timeout: 15000 });
  await p.waitForTimeout(600);
  const st = await p.evaluate(() => {
    const items = [...document.querySelectorAll('.reveal')];
    const hidden = items.filter(c => getComputedStyle(c).opacity !== '1').length;
    const nums = [...document.querySelectorAll('.stat-num')].map(n => [n.textContent, n.dataset.to]);
    return { hidden, stuck: nums.filter(([a, b]) => a !== b) };
  });
  st.hidden === 0 && st.stuck.length === 0
    ? pass('reduced-motion-shows-everything')
    : fail('reduced-motion-shows-everything', JSON.stringify(st));
  await p.screenshot({ path: `${OUT}/reduced-motion.png` });
  await ctx.close();
}

/* ------------------------------------------ parchalanish moduli (demo) ---- */

{
  const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const demoErrors = [];
  p.on('pageerror', e => demoErrors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') demoErrors.push(m.text()); });
  try {
    await p.goto(`${URL}/demo/chicken-parts.html`, { waitUntil: 'networkidle' });
    await p.waitForFunction(
      () => document.getElementById('status').textContent !== 'yuklanmoqda…',
      { timeout: 90000 });
    const status = await p.textContent('#status');
    if (/XATO/.test(status)) throw new Error(status);

    const info = await p.evaluate(() => {
      const T = THREE, P = ChickenParts.parts;
      const at = s => {
        ChickenParts.setSpread(s);
        const v = new T.Vector3();
        const out = {};
        Object.keys(P).forEach(k => { P[k].getWorldPosition(v); out[k] = v.length(); });
        return out;
      };
      const a = at(0), b = at(1);
      ChickenParts.setSpread(0);
      return { parts: Object.keys(P), home: a, spread: b };
    });

    const expect = ['torso', 'wingL', 'wingR', 'legL', 'legR', 'neck', 'tail'];
    const missing = expect.filter(k => !info.parts.includes(k));
    if (missing.length) fail('chicken-parts-nodes', 'yo\'q: ' + missing.join(', '));
    else pass('chicken-parts-nodes', '7 bo\'lak');

    /* torso joyida qoladi, qolgan oltitasi tashqariga uchadi */
    const flew = expect.filter(k => k !== 'torso').filter(k => info.spread[k] > info.home[k] + 1);
    flew.length === 6
      ? pass('chicken-parts-spread', '6 bo\'lak asoslarga uchdi')
      : fail('chicken-parts-spread', `faqat ${flew.length} ta bo'lak uchdi`);

    await p.screenshot({ path: `${OUT}/chicken-parts.png` });
    demoErrors.length
      ? fail('chicken-parts-no-errors', demoErrors.join(' | '))
      : pass('chicken-parts-no-errors');
  } catch (e) {
    fail('chicken-parts-demo', e.message);
  }
  await p.close();
}

await browser.close();

/* --------------------------------------------------------------- hisobot -- */

const failed = results.filter(r => !r.ok);
const lines = results.map(r => `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.note ? ' — ' + r.note : ''}`);
console.log(lines.join('\n'));
console.log(`\n${results.length - failed.length}/${results.length} o'tdi  ·  skrinshotlar: ${OUT}`);

await writeFile(`${OUT}/report.json`, JSON.stringify({ url: URL, results }, null, 2));

if (failed.length) {
  console.error(`\n${failed.length} ta tekshiruv yiqildi.`);
  process.exit(1);
}
