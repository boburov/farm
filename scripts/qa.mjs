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

/* Har sahifada ekranga chiqishi mumkin bo'lgan yagona raqamlar, manbasi bilan.
 * Yangi yil qo'shilsa, raqamlari shu yerga QO'LDA, hujjatdagi o'rnini
 * ko'rsatib qo'shiladi. Ro'yxatni kengaytirish — ongli qaror. */
const ALLOWED = {
  /* docx 1-2-xatboshi: "3 ta ishchi ... Yillik aylanma 200 mln",
     "bir yilda 6 marta aylanma" */
  '2010': ['2010', '3', '200', '6'],

  /* docx 3-4-xatboshi (xlsx "Лист2" D/E ustunlari bilan mos):
       2020 — 4 mlrd kredit · 25 ming bosh · 50 ishchi · 7.5 mlrd aylanma
              · 375 tonna · 20 000 so'm/kg
       2021 — 20 mlrd · 200 ming bosh · 100 ishchi · 60 mlrd · 3 000 tonna
              · 20 000 so'm/kg
     400 / 700 / 100 / 0 — o'sish foizi, shu ikki ustundan hisoblangan
       (2021-2020)/2020; 1 — "1 kg go'sht narxi"; 6 — "6 marta aylanma". */
  '2020-2021': ['2020', '2021', '4', '25', '50', '7.5', '375', '20000',
                '20', '200', '100', '60', '3000', '400', '700', '0', '1', '6']
};

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

/* Ko'rinadigan matndan raqamlarni ajratadi.
   Avval mingliklar orasidagi uzilmas probel olib tashlanadi ("20 000" → "20000"),
   keyin kasrli sonlar butun holda olinadi ("7.5" ikkiga bo'linib ketmasin). */
const NUMBERS = () => {
  const text = document.getElementById('page').innerText
    .replace(/(\d)[\s  ](?=\d)/g, '$1');
  return [...text.matchAll(/\d+(?:[.,]\d+)?/g)].map(m => m[0].replace(',', '.'));
};

const settle = async (p, ms = 3200) => {
  await p.waitForSelector('.page.ready', { timeout: 15000 });
  await p.waitForTimeout(ms);          /* hisoblagichlar tugashini kutamiz */
};

await mkdir(OUT, { recursive: true });
const executablePath = await resolveChromium();
const browser = await chromium.launch({
  headless: true, executablePath,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
});

/* --------------------------------------------------------------- sahifalar */

const errors = [];
const external = [];
const failedReq = [];

const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('requestfailed', r => failedReq.push(r.url()));
page.on('request', r => { if (!r.url().startsWith(URL) && !r.url().startsWith('data:')) external.push(r.url()); });

await page.goto(URL, { waitUntil: 'networkidle' });

const deck = await page.evaluate(() => window.YEARS.map(y => ({ id: y.id, layout: y.layout })));
deck.length >= 2
  ? pass('deck-size', deck.map(d => d.id + ' (' + d.layout + ')').join(' · '))
  : fail('deck-size', 'kutilgan kamida 2 sahifa, topildi ' + deck.length);

for (const [i, info] of deck.entries()) {
  if (i) await page.keyboard.press('ArrowRight');
  await settle(page);
  const tag = info.id;

  /* 1. o'ylab topilgan raqam yo'q */
  {
    const nums = await page.evaluate(NUMBERS);
    const allow = new Set(ALLOWED[tag] || []);
    const bad = [...new Set(nums)].filter(n => !allow.has(n));
    bad.length
      ? fail(`no-fabricated-numbers@${tag}`, 'ruxsat etilmagan: ' + bad.join(', '))
      : pass(`no-fabricated-numbers@${tag}`, nums.length + ' ta raqam, hammasi ro\'yxatda');
  }

  /* 2. hisoblagichlar oxirgi qiymatga yetdi */
  {
    const stuck = await page.evaluate(() =>
      [...document.querySelectorAll('[data-to]')]
        .map(n => [n.textContent.replace(/[\s  ]/g, ''), String(n.dataset.to)])
        .filter(([now, to]) => now !== to));
    stuck.length
      ? fail(`counters-land@${tag}`, JSON.stringify(stuck))
      : pass(`counters-land@${tag}`);
  }

  /* 3. fon butun ekranni qoplaydi (manfiy z-index xatosiga qarshi qo'riqchi) */
  {
    const st = await page.evaluate(() => {
      const host = document.querySelector('.backdrop');
      const img = host.querySelector('.backdrop-photo');
      const r = host.getBoundingClientRect();
      return {
        photo: host.classList.contains('has-photo'),
        full: Math.round(r.width) >= innerWidth && Math.round(r.height) >= innerHeight,
        natural: img ? img.naturalWidth + 'x' + img.naturalHeight : null,
        bodyBg: getComputedStyle(document.body).backgroundImage
      };
    });
    st.full && st.bodyBg === 'none'
      ? pass(`backdrop-fullscreen@${tag}`, st.photo ? 'foto ' + st.natural : 'vektor zaxira')
      : fail(`backdrop-fullscreen@${tag}`, JSON.stringify(st));
  }

  /* 4. sahifa turiga xos tuzilma */
  if (info.layout === 'single') {
    const c = await page.evaluate(() => ({
      stats: document.querySelectorAll('.stat').length,
      zones: document.querySelectorAll('.zone').length,
      arrows: document.querySelectorAll('.flow-arrow').length,
      chain: document.querySelectorAll('.chain li:not(.arrow)').length
    }));
    c.stats === 2 && c.zones === 3 && c.arrows === 2 && c.chain === 3
      ? pass(`layout-shape@${tag}`, '2 statistika · 3 zona · 2 strelka · 3 bosqich')
      : fail(`layout-shape@${tag}`, JSON.stringify(c));

    /* strelkalar suratdagi zona chegaralarida turibdi */
    const ar = await page.evaluate(() => {
      const img = document.querySelector('.backdrop-photo');
      const y = window.YEARS.find(v => v.layout === 'single');
      const at = (y && y.arrowsAt) || [];
      const nodes = [...document.querySelectorAll('.flow-arrow')];
      if (!img || !img.naturalWidth) return 'skipped';
      const scale = Math.max(innerWidth / img.naturalWidth, innerHeight / img.naturalHeight);
      const rw = img.naturalWidth * scale, off = (innerWidth - rw) / 2;
      return nodes.map((n, k) => {
        const r = n.getBoundingClientRect();
        return Math.abs((off + at[k] * rw) - (r.left + r.width / 2));
      });
    });
    ar === 'skipped' || ar.every(d => d < 2)
      ? pass(`arrows-on-zone-edges@${tag}`, ar === 'skipped' ? 'foto yo\'q' : 'chetlanish < 2px')
      : fail(`arrows-on-zone-edges@${tag}`, JSON.stringify(ar));
  } else {
    const c = await page.evaluate(() => ({
      cols: document.querySelectorAll('.col').length,
      rows: document.querySelectorAll('.row').length,
      growth: document.querySelectorAll('.row-growth').length,
      chain: document.querySelectorAll('.chain li:not(.arrow)').length
    }));
    c.cols === 2 && c.rows === 12 && c.growth === 6 && c.chain === 3
      ? pass(`layout-shape@${tag}`, '2 ustun · 12 qator · 6 o\'sish · 3 bosqich')
      : fail(`layout-shape@${tag}`, JSON.stringify(c));

    /* o'sish ustuni bir xil vertikal chiziqda */
    const xs = await page.evaluate(() =>
      [...document.querySelectorAll('.row-growth')]
        .map(n => Math.round(n.getBoundingClientRect().left)));
    new Set(xs).size === 1
      ? pass(`growth-column-aligned@${tag}`, 'x = ' + xs[0])
      : fail(`growth-column-aligned@${tag}`, JSON.stringify(xs));

    /* Har bir foiz ikki yil raqamidan kelib chiqishi shart — bu o'sish
       ustuni "o'ylab topilgan raqam"ga aylanib ketmasligining kafolati. */
    const derived = await page.evaluate(() => {
      const y = window.YEARS.find(v => v.layout === 'compare');
      const [a, b] = y.columns;
      return b.rows.map((r, k) => {
        const from = a.rows[k].value, to = r.value;
        const want = Math.round((to - from) / from * 100);
        return { shown: r.growth, want: (want > 0 ? '+' : '') + want + '%' };
      }).filter(x => x.shown !== x.want);
    });
    derived.length
      ? fail(`growth-matches-arithmetic@${tag}`, JSON.stringify(derived))
      : pass(`growth-matches-arithmetic@${tag}`, 'har bir foiz ikki raqamdan chiqadi');
  }
}

/* 5. tashqi so'rov yo'q (offline kafolati) */
external.length
  ? fail('no-external-requests', external.join(', '))
  : pass('no-external-requests');

/* 6. 404 yo'q. assets/photos/ dagi fayl yo'q bo'lsa sahifa vektor sahnaga
      tushadi — bu kutilgan zaxira holati, qattiq xato emas. */
{
  const OPTIONAL = /assets\/photos\//;
  const hard = failedReq.filter(u => !OPTIONAL.test(u));
  const soft = failedReq.filter(u => OPTIONAL.test(u));
  hard.length
    ? fail('no-failed-requests', hard.join(', '))
    : pass('no-failed-requests', soft.length ? soft.length + ' ta foto zaxiraga tushdi' : '');
}

/* 7. konsol va sahifa xatolari (rasm 404 lari yuqorida hisobga olindi) */
{
  const hard = errors.filter(e => !/Failed to load resource/.test(e));
  hard.length ? fail('no-errors', hard.join(' | ')) : pass('no-errors');
}

await page.close();

/* ------------------------------------------------------------- o'lchamlar */

for (const [w, h] of SIZES) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  await p.goto(URL, { waitUntil: 'networkidle' });

  for (const [i, info] of deck.entries()) {
    if (i) await p.keyboard.press('ArrowRight');
    await settle(p, 2400);
    await p.screenshot({ path: `${OUT}/${info.id}-${w}x${h}.png` });

    const m = await p.evaluate(() => {
      const d = document.documentElement;
      return { sw: d.scrollWidth, cw: d.clientWidth, sh: d.scrollHeight, ch: d.clientHeight };
    });
    const label = `${info.id}@${w}x${h}`;
    m.sw > m.cw
      ? fail(`no-horizontal-overflow@${label}`, `${m.sw} > ${m.cw}`)
      : pass(`no-horizontal-overflow@${label}`);

    /* desktopda sahifa bir ekranga sig'ishi shart; mobilda scroll ruxsat */
    if (w > 900) {
      m.sh > m.ch + 1
        ? fail(`single-screen@${label}`, `${m.sh} > ${m.ch}`)
        : pass(`single-screen@${label}`);
    }
  }
  await p.close();
}

/* ------------------------------------------------- harakat kamaytirilgan -- */

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForSelector('.page.ready', { timeout: 15000 });
  await p.waitForTimeout(700);
  const st = await p.evaluate(() => ({
    hidden: [...document.querySelectorAll('.reveal')]
      .filter(c => getComputedStyle(c).opacity !== '1').length,
    stuck: [...document.querySelectorAll('[data-to]')]
      .map(n => [n.textContent.replace(/[\s  ]/g, ''), String(n.dataset.to)])
      .filter(([a, b]) => a !== b)
  }));
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
        const v = new T.Vector3(), out = {};
        Object.keys(P).forEach(k => { P[k].getWorldPosition(v); out[k] = v.length(); });
        return out;
      };
      const a = at(0), b = at(1);
      ChickenParts.setSpread(0);
      return { parts: Object.keys(P), home: a, spread: b };
    });

    const expect = ['torso', 'wingL', 'wingR', 'legL', 'legR', 'neck', 'tail'];
    const missing = expect.filter(k => !info.parts.includes(k));
    missing.length
      ? fail('chicken-parts-nodes', 'yo\'q: ' + missing.join(', '))
      : pass('chicken-parts-nodes', '7 bo\'lak');

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
console.log(results.map(r => `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.note ? ' — ' + r.note : ''}`).join('\n'));
console.log(`\n${results.length - failed.length}/${results.length} o'tdi  ·  skrinshotlar: ${OUT}`);

await writeFile(`${OUT}/report.json`, JSON.stringify({ url: URL, results }, null, 2));

if (failed.length) {
  console.error(`\n${failed.length} ta tekshiruv yiqildi.`);
  process.exit(1);
}
