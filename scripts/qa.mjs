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
                '20', '200', '100', '60', '3000', '400', '700', '0', '1', '6'],

  /* docx 5-6-xatboshi + xlsx "Лист2" F3 (2022 bosh soni 220 000):
       2022 — 2 500 so'm/kg subsidiya · 220 ming bosh · 66 mlrd aylanma
              · 3 300 tonna · 3.7 mlrd soliq imtiyozi · 20 000 so'm/kg
       2023 — 1 250 so'm/kg · 300 ming bosh · 200 ishchi · 90 mlrd
              · 4 500 tonna · ichki yem hisobiga 6.9 mlrd (8%) · 20 000 so'm/kg
     50 / 36 / 33 / 0 — o'sish foizi, shu ikki ustundan hisoblangan; 1 — "1 kg".
     150 — 2022 ishchi soni: hujjatda yo'q, buyurtmachi tasdiqlagan
     (assets/years.js dagi izohga qarang). */
  '2022-2023': ['2022', '2023', '2500', '220', '150', '66', '3300', '3.7', '20000',
                '1250', '300', '200', '90', '4500', '6.9', '8', '50', '36', '33', '0', '1'],

  /* docx 7-8-xatboshi (xlsx "Лист2" H/I bilan mos):
       2025 — 800 ming bosh · 300 ishchi · 240 mlrd · 12 000 t
              · 8 mlrd soliq imtiyozi (2024-2025) · 20 000 so'm/kg
       2026 — 1.5 mln bosh · 400 dan oshiq ishchi · Aviagen'dan 75 ming bosh
              ona tovuq · 450 mlrd · 22 500 t · 31.4 mlrd · 20 000 so'm/kg
     88 / 293 / 0 — hisoblangan o'sish; 1 — "1 kg"; 2024 — soliq imtiyozi davri.
     Markazdagi bo'laklar ulushi — xlsx "Yaratilgan qiymat 2025-2026" C6:C14:
       13.8 · 35.6 · 8 · 7 · 12 · 12 · 3 · 5 · 4 */
  '2025-2026': ['2025', '2026', '800', '300', '240', '12000', '8', '20000', '2024',
                '1.5', '400', '75', '450', '22500', '31.4', '88', '293', '0', '1',
                '13.8', '35.6', '7', '12', '3', '5', '4'],

  /* docx 9-xatboshi: 35 mln $ loyiha (shundan 20 mln $ Parranda Investment
     hisobidan) · 24 mln bosh · 60 ming tonna · 1.5 trln so'm · 180 mlrd so'm
     soliq imtiyozi kutilyapti.
     DIQQAT: aylanma docx'da 1.5 trln, xlsx "Лист2" J6 da 1200 mlrd — ziddiyat
     buyurtmachidan so'ralishi kerak; hozircha docx raqami ko'rsatilyapti.
     Yo'nalishlar tartib raqami (1-4) CSS hisoblagichi bilan chiziladi,
     DOM matniga tushmaydi. */
  '2026-2027': ['2026', '2027', '35', '20', '180', '24', '60', '1.5'],

  /* docx oxirgi blok, "Istiqboldagi loyihalar":
       Andijon yem zavodi 2027 4-chorak 10 mln $ · Kalbasa 1-chorak 2.5 ·
       Ona tovuq 2-chorak 7 · 12 viloyatda 500 do'kon 4-chorak 7.5 ·
       Parranda va naslli chorva 4-chorak 9 · jami 36 mln $, 1 780 ish o'rni.
     Kartalar tartib raqami (1-5) CSS hisoblagichi bilan — DOM matniga tushmaydi. */
  'istiqbol': ['2027', '4', '1', '2', '10', '2.5', '7', '7.5', '9', '12', '500',
               '36', '1780']
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
/* Faqat sahna KONTENTIdan o'qiydi. Pastdagi vaqt chizig'i va tepadagi davr
   ko'rsatkichi — navigatsiya: ular barcha yillarni ko'rsatadi va sahifaga xos
   ruxsat ro'yxatiga aloqasi yo'q. */
const NUMBERS = () => {
  const host = document.querySelector('.scene');
  const text = (host ? host.innerText : '')
    .replace(/(\d)[\s  ](?=\d)/g, '$1');
  return [...text.matchAll(/\d+(?:[.,]\d+)?/g)].map(m => m[0].replace(',', '.'));
};

const settle = async (p, ms = 3200) => {
  await p.waitForSelector('.page.ready', { timeout: 15000 });
  /* 3D bor sahifada avval sahna tayyor bo'lishini kutamiz: QA dasturiy
     renderer (swiftshader) da ishlaydi va GLB yuklanishi asosiy oqimni band
     qiladi — aks holda hisoblagichlar rAF'i vaqtida ishga tushmay qoladi. */
  if (await p.$('.model')) {
    await p.waitForSelector('.model.is-ready', { timeout: 60000 }).catch(() => {});
    ms += 2500;
  }
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
/* `blob:` — GLTFLoader lokal GLB ichidagi teksturalardan yasagan manzil,
   tarmoqqa chiqmaydi; `data:` ham shunday. Ikkalasi tashqi so'rov emas. */
page.on('request', r => {
  const u = r.url();
  if (!u.startsWith(URL) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u);
});

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

  /* 3. fon butun ekranni qoplaydi (manfiy z-index xatosiga qarshi qo'riqchi).
        Har sahifada fon qatlami bo'lavermaydi: `project` gorizontal polosa,
        `plans` esa och gradient ishlatadi. Shuning uchun tekshiruv layout
        nomiga emas, elementning o'ziga bog'lanadi — yangi tur qo'shilsa QA
        o'zi moslashadi. */
  if (await page.$('.backdrop')) {
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
      stats: document.querySelectorAll('.figure').length,
      zones: document.querySelectorAll('.zone').length,
      arrows: document.querySelectorAll('.flow-arrow').length,
      chain: document.querySelectorAll('.flow li:not(.is-link)').length
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
  } else if (info.layout === 'plans') {
    const c = await page.evaluate(id => {
      const y = window.YEARS.find(v => v.id === id);
      return {
        cards: document.querySelectorAll('.project').length,
        totals: document.querySelectorAll('.total').length,
        want: { cards: y.items.length, totals: y.total.cells.length },
        /* Jami hujjatda alohida berilgan — kartalar yig'indisi bilan mos
           kelishi shart. Mos kelmasa biror raqam noto'g'ri. */
        sum: +y.items.reduce((a, b) => a + b.value, 0).toFixed(2),
        stated: y.total.cells[0].value
      };
    }, tag);
    c.cards === c.want.cards && c.totals === c.want.totals
      ? pass(`layout-shape@${tag}`, `${c.cards} loyiha · ${c.totals} jami katak`)
      : fail(`layout-shape@${tag}`, JSON.stringify(c));
    c.sum === c.stated
      ? pass(`plans-total-adds-up@${tag}`, `${c.sum} = ${c.stated} mln $`)
      : fail(`plans-total-adds-up@${tag}`, `kartalar yig'indisi ${c.sum}, hujjatda ${c.stated}`);
  } else if (info.layout === 'project') {
    const c = await page.evaluate(id => {
      const y = window.YEARS.find(v => v.id === id);
      return {
        band: document.querySelectorAll('.visual').length,
        bandPhoto: document.querySelector('.visual').classList.contains('has-photo'),
        kpis: document.querySelectorAll('.metric').length,
        subs: document.querySelectorAll('.subcell').length,
        tracks: document.querySelectorAll('.tracks li').length,
        want: { kpis: Math.min(4, 1 + y.kpis.length),
                subs: y.invest.cells.length, tracks: y.tracks.items.length }
      };
    }, tag);
    c.band === 1 && c.bandPhoto && c.kpis === c.want.kpis &&
    c.subs === c.want.subs && c.tracks === c.want.tracks
      ? pass(`layout-shape@${tag}`,
             `foto · ${c.kpis} ko'rsatkich · ${c.subs} taqsimot · ${c.tracks} yo'nalish`)
      : fail(`layout-shape@${tag}`, JSON.stringify(c));

    /* Polosa fon emas: sahifa oqimida turishi va ekranni to'la qoplamasligi shart. */
    const band = await page.evaluate(() => {
      const r = document.querySelector('.visual').getBoundingClientRect();
      return { h: Math.round(r.height), vh: innerHeight };
    });
    band.h < band.vh * 0.6
      ? pass(`band-is-a-strip@${tag}`, `${band.h}px / ${band.vh}px`)
      : fail(`band-is-a-strip@${tag}`, JSON.stringify(band));
  } else {
    /* Kutilgan sonlar ma'lumotdan olinadi — yangi yil qo'shilsa QA o'zi moslashadi. */
    const c = await page.evaluate(id => {
      const y = window.YEARS.find(v => v.id === id);
      const per = y.columns.map(col => col.rows.length);
      return {
        cols: document.querySelectorAll('.ledger-head span').length - 2,  /* 2 yil ustuni */
        rows: document.querySelectorAll('.ledger-row').length,
        growth: document.querySelectorAll('.lr-delta').length,
        chain: document.querySelectorAll('.flow li:not(.is-link)').length,
        want: { cols: y.columns.length, rows: per[0], growth: per[0], chain: y.chain.length }
      };
    }, tag);
    c.cols === c.want.cols && c.rows === c.want.rows &&
    c.growth === c.want.growth && c.chain === c.want.chain
      ? pass(`layout-shape@${tag}`,
             `${c.cols} ustun · ${c.rows} qator · ${c.growth} o'sish katagi · ${c.chain} bosqich`)
      : fail(`layout-shape@${tag}`, JSON.stringify(c));

    /* o'sish ustuni bir xil vertikal chiziqda */
    const xs = await page.evaluate(() =>
      [...document.querySelectorAll('.lr-delta')]
        .map(n => Math.round(n.getBoundingClientRect().right)));
    new Set(xs).size === 1
      ? pass(`growth-column-aligned@${tag}`, 'x = ' + xs[0])
      : fail(`growth-column-aligned@${tag}`, JSON.stringify(xs));

    /* Har bir foiz ikki yil raqamidan kelib chiqishi shart — bu o'sish
       ustuni "o'ylab topilgan raqam"ga aylanib ketmasligining kafolati. */
    const derived = await page.evaluate(id => {
      const y = window.YEARS.find(v => v.id === id);
      const [a, b] = y.columns;
      const checked = [];
      const bad = b.rows.map((r, k) => {
        /* `abs` bo'lsa o'shandan hisoblanadi: ekrandagi birliklar har xil
           bo'lishi mumkin ("800 ming" va "1.5 mln"), foiz esa asl
           kattaliklardan chiqishi shart. */
        const from = a.rows[k].abs ?? a.rows[k].value;
        const to = r.abs ?? r.value;
        /* Foiz faqat ikkala yilda ham raqam bo'lganda ko'rsatiladi.
           Bittasi yo'q bo'lsa — foiz ham bo'lmasligi shart. */
        if (from == null || to == null) {
          return r.growth != null
            ? { row: r.label, xato: 'raqami yo\'q qatorda foiz turibdi' } : null;
        }
        if (r.growth == null) return null;   /* ataylab ko'rsatilmagan */
        const want = Math.round((to - from) / from * 100);
        checked.push(r.growth);
        return r.growth === (want > 0 ? '+' : '') + want + '%'
          ? null : { row: r.label, shown: r.growth, want };
      }).filter(Boolean);
      return { bad, n: checked.length };
    }, tag);
    derived.bad.length
      ? fail(`growth-matches-arithmetic@${tag}`, JSON.stringify(derived.bad))
      : pass(`growth-matches-arithmetic@${tag}`,
             `${derived.n} ta foiz ikki raqamdan chiqadi`);

    /* Markazdagi 3D vitrina: brifdagi talablar o'lchanadi —
       yetti bo'lak, tik holat, kesishmaslik, kadr ichida, tinch turishi. */
    if (await page.$('.model')) {
      const m3 = await page.evaluate(() => {
        const host = document.querySelector('.model');
        const cv = host.querySelector('canvas');
        const info = window.ChickenParts && ChickenParts.showcaseInfo;
        if (!info) return { noInfo: true };
        /* Bo'laklar IKKI QATORDA turadi — kesishishni har qator ichida
           tekshirish kerak, aks holda turli qatordagi bo'laklar x bo'yicha
           ustma-ust tushgandek ko'rinadi. Qator = bir xil pastki chegara. */
        const bands = {};
        info.forEach(it => {
          const k = it.bottom.y.toFixed(3);
          (bands[k] = bands[k] || []).push(it);
        });
        let overlap = 0;
        Object.values(bands).forEach(band => {
          const row = [...band].sort((a, b) => a.center.x - b.center.x);
          for (let i = 1; i < row.length; i++) {
            const prev = row[i - 1], cur = row[i];
            if (prev.center.x + prev.width / 2 > cur.center.x - cur.width / 2) overlap++;
          }
        });
        /* har qator ichida bo'laklar bitta asosda turishi shart */
        const offBase = Object.values(bands).reduce((n, band) => {
          const base = band[0].bottom.y;
          return n + band.filter(it => Math.abs(it.bottom.y - base) > 0.001).length;
        }, 0);
        return {
          canvas: !!cv && cv.width > 0 && cv.height > 0,
          parts: info.length,
          labels: host.querySelectorAll('.model-label').length,
          settled: host.classList.contains('is-settled'),
          overlap, offBase, rows: Object.keys(bands).length,
          basesHidden: ChickenParts.ring ? !ChickenParts.ring.visible : null,
          names: info.map(i => i.name)
        };
      });
      m3.canvas && m3.parts === 7 && m3.labels === 7 && m3.overlap === 0 &&
      m3.offBase === 0 && m3.basesHidden && m3.rows === 2
        ? pass(`model-3d@${tag}`,
               `7 tik bo'lak, ${m3.rows} qator, kesishmaydi: ${m3.names.join(' · ')}`)
        : fail(`model-3d@${tag}`, JSON.stringify(m3));

      /* har bo'lak yorlig'i kadr ichidami */
      const inFrame = await page.evaluate(() => {
        const host = document.querySelector('.model');
        const r = host.getBoundingClientRect();
        return [...host.querySelectorAll('.model-label')].every(l => {
          const b = l.getBoundingClientRect();
          return b.left >= r.left - 2 && b.right <= r.right + 2 && b.top >= r.top;
        });
      });
      inFrame ? pass(`model-3d-in-frame@${tag}`)
              : fail(`model-3d-in-frame@${tag}`, 'yorliq kadrdan chiqib ketdi');

      /* Uzluksiz aylanish BO'LMASLIGI kerak — yorliqlar o'qilishi uchun.
         Piksel solishtirish dasturiy renderer'da beqaror, shuning uchun
         talabning o'zi o'lchanadi: animatsiya sikli to'xtaganmi. */
      const stopped = await page.evaluate(() =>
        document.querySelector('.model').dataset.anim === 'stopped');
      stopped
        ? pass(`model-3d-settles@${tag}`, 'joylashgach sikl to\'xtaydi')
        : fail(`model-3d-settles@${tag}`, 'animatsiya sikli ishlayapti');
    }
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

/* ------------------------------------------------------------ navigatsiya */

/* Hash manzil sahifani belgilaydi: to'g'ridan-to'g'ri ochish, brauzerning
   orqaga tugmasi va pastdagi nuqtalar — uchalasi bir holatni boshqaradi. */
{
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const last = deck[deck.length - 1];

  /* 1. to'g'ridan-to'g'ri hash bilan ochish */
  await p.goto(`${URL}/#${last.id}`, { waitUntil: 'networkidle' });
  await p.waitForSelector('.page.ready', { timeout: 15000 });
  const direct = await p.evaluate(() => document.getElementById('page').dataset.layout);
  direct === last.layout
    ? pass('hash-opens-page', `#${last.id} → ${direct}`)
    : fail('hash-opens-page', `kutilgan ${last.layout}, chiqdi ${direct}`);

  /* 2. hash yo'q bo'lsa birinchi sahifa va manzil to'ldiriladi */
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForSelector('.page.ready', { timeout: 15000 });
  const first = await p.evaluate(() => location.hash);
  first === '#' + deck[0].id
    ? pass('hash-filled-on-load', first)
    : fail('hash-filled-on-load', `kutilgan #${deck[0].id}, chiqdi "${first}"`);

  /* 3. nuqtalar: soni, joriysi belgilangan, bosilganda o'tadi */
  const dots = await p.evaluate(() => ({
    count: document.querySelectorAll('.timeline .tl-step').length,
    current: document.querySelectorAll('.timeline .tl-step.is-current').length
  }));
  dots.count === deck.length && dots.current === 1
    ? pass('timeline-steps', `${dots.count} ta bosqich, 1 tasi joriy`)
    : fail('timeline-steps', JSON.stringify(dots));

  await p.click('.timeline .tl-step:last-child .tl-btn');
  await p.waitForSelector('.page.ready', { timeout: 15000 });
  const afterClick = await p.evaluate(() => ({
    hash: location.hash,
    layout: document.getElementById('page').dataset.layout
  }));
  afterClick.hash === '#' + last.id && afterClick.layout === last.layout
    ? pass('timeline-click-navigates', afterClick.hash)
    : fail('timeline-click-navigates', JSON.stringify(afterClick));

  /* 4. brauzerning orqaga tugmasi qaytaradi */
  await p.goBack();
  await p.waitForFunction(id => location.hash === '#' + id, deck[0].id, { timeout: 8000 })
    .then(() => pass('browser-back-works'))
    .catch(() => fail('browser-back-works', 'orqaga bosilganda hash qaytmadi'));

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
