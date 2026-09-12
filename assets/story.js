/* =========================================================================
   assets/story.js — "Sokin Savdo" taqdimotining YAGONA MATN VA RAQAM MANBAI
   =========================================================================

   QOIDA (o'zgartirilmaydi):
   Ekranda ko'rinadigan har bir raqam faqat buyurtmachi bergan manbadan
   (docs/TZ-01-bosh-sahifa-va-hikoya.md, 8.1-bo'lim — tashrif nutqi faktlari)
   olinadi. Manbada bo'lmagan raqam ekranga CHIQMAYDI: na foiz, na tannarx,
   na foyda, na ish o'rni, na investitsiya, na sana. Raqam yo'q bo'lsa —
   satr umuman ko'rsatilmaydi yoki "—" turadi.

   Manbadagi raqamlar — hammasi shu yerda, boshqa joyda raqam yozilmaydi:
     2010          — faoliyat boshlangan yil
     3             — 2010-yildagi xodimlar soni
     25 000        — "kechagi kun" quvvati, bosh parranda
     1 500 000     — 2026-yildagi quvvat, bosh parranda
     2026          — hozirgi yil

   Manbadagi raqamsiz faktlar: islohotlar; "biznesni boshlash" -> "kapitalni
   ko'paytirish" va yirik sanoat bosqichi; vertikal integratsiya va klaster;
   Aviagen (Vengriya) ona tovuq / parent stock, nasldor tuxum va jo'ja
   o'zimizda, importga qaramlik va valyuta chiqishiga chek; Marel
   (Gollandiya) so'yish majmuasi va kolbasa sexi; chiqindisiz texnologiya —
   Rendering liniyasi; aqlli ko'p qavatli katak tizimlari.

   TASDIQLANMAGAN (buyurtmachi bermagan) qiymat = null. Kod null ni ekranga
   "—" qilib chiqaradi va kartani xiralashtiradi. Hech qachon taxminiy
   raqam yozilmasin.
   ========================================================================= */
(function () {
  'use strict';

  /* Qiymat zanjiri: 9 bo'g'in, yuqori oqimdan savdogacha.
     `own` — shu sahnada qaysi bo'g'inlar korxonaning o'zida (indekslar).
     `focus` — shu sahnada yoritiladigan bo'g'in.                        */
  var CHAIN = [
    'Ona tovuq', 'Nasldor tuxum', 'Jo‘ja', 'Boqish',
    'So‘yish', 'Qayta ishlash', 'Kolbasa', 'Rendering', 'Savdo'
  ];
  var ALL = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  window.STORY = {
    brand: 'Sokin Savdo',
    chain: CHAIN,

    /* Interfeys matnlari */
    ui: {
      next: 'Keyingi bo‘lim',
      prev: 'Oldingi',
      replay: 'Boshiga qaytish',
      heroCta: 'Hikoyani boshlash',
      heroLink: 'Hikoyani boshlash',
      loading: 'Sahnalar tayyorlanmoqda',
      ready: 'Tayyor',
      photo: 'Fotoni ko‘rish',
      photoClose: 'Yopish',
      chainTitle: 'Qiymat zanjiri',
      chainOwn: 'o‘z tizimimizda',
      causeLabel: 'Sabab',
      effectLabel: 'Natija',
      empty: '—'
    },

    /* 00 — Hero. 3D yo'q, faqat matn. */
    hero: {
      period: '2010 — 2026',
      eyebrow: 'Parrandachilik klasteri',
      title: 'Kichik go‘sht savdosidan<br>parranda klasterigacha.',
      line: '2010 · 3 xodim &nbsp;→&nbsp; 2026 · 1,5 mln bosh',
      lead: 'Biz 2010-yilda 3 nafar xodim va kichik go‘sht savdosidan faoliyat boshlagan edik.',
      leadMuted: 'Bugun — to‘liq vertikal integratsiyalashgan, 1,5 million bosh quvvatli parranda klasteri.',
      chips: ['Vertikal integratsiya', 'Ona tovuq — Aviagen', 'Chiqindisiz texnologiya']
    },

    /* Bo'limlar. Har sahna = bitta klik = bitta fikr.
       figures[]: {value, unit, label, static?} — value raqam bo'lsa sanaladi,
       matn bo'lsa sanalmaydi. static:true — yil kabi sanalmaydigan qiymat. */
    chapters: [
      /* ---------------------------------------------------- 01 · 2010 -- */
      {
        id: 'boshlanish',
        name: '2010 · Boshlanish',
        period: '2010',
        beats: [0, 1],
        times: [7, 7],
        scenes: [
          {
            eyebrow: 'Boshlanish',
            period: '2010',
            title: 'Uch kishi va<br>bitta go‘sht savdosi.',
            intro: '2010-yilda bor-yo‘g‘i 3 nafar xodim bilan kichik go‘sht savdosidan faoliyat boshlagan edik.',
            conclusion: 'U paytlarda bunchalik katta marralarni tasavvur ham qilolmasdik.',
            lead: 'Zanjirning faqat oxirgi bo‘g‘ini — savdo — o‘z qo‘limizda edi.',
            cause: 'Kichik go‘sht savdosi',
            effect: 'Zanjirda bitta bo‘g‘in',
            figures: [
              { id: 'y0', value: 2010, unit: 'yil', label: 'Faoliyat boshlangan', static: true },
              { id: 'staff', value: 3, unit: 'nafar', label: 'Xodimlar soni', featured: true }
            ],
            own: [8], focus: 8, photo: '2010-arxiv'
          },
          {
            eyebrow: 'Boshlanish',
            period: '2010',
            title: 'Hammasi<br>shu hovlidan boshlandi.',
            intro: 'Xomashyoni boshqalardan sotib olardik. Qiymat zanjirining qolgan hamma bo‘g‘ini tashqarida edi.',
            conclusion: 'Har bir bosqich uchun boshqalarga bog‘liq edik.',
            lead: 'Naslchilik, boqish, so‘yish va qayta ishlash — barchasi tashqarida.',
            cause: 'Bo‘g‘inlar tashqarida',
            effect: 'Zanjir ustidan nazorat yo‘q',
            figures: [
              { id: 'y0', value: 2010, unit: 'yil', label: 'Faoliyat boshlangan', static: true },
              { id: 'staff', value: 3, unit: 'nafar', label: 'Xodimlar soni', featured: true }
            ],
            own: [8], focus: 8
          }
        ]
      },

      /* ------------------------------------------- 02 · O'sish bosqichi -- */
      {
        id: 'osish',
        name: 'O‘sish · 25 ming bosh',
        period: 'Kechagi kun',
        beats: [3, 2],
        times: [6, 8],
        scenes: [
          {
            eyebrow: 'Islohotlar',
            period: 'Kechagi kun',
            title: 'Biznesni boshlashdan<br>yirik sanoatgacha.',
            intro: 'Islohotlar tadbirkorlar poyini bog‘lab turgan kishanlarni parchalab tashladi — biz yangi bosqichga chiqdik.',
            conclusion: '«Biznesni boshlash» bosqichidan «kapitalni ko‘paytirish» bosqichiga o‘tdik.',
            lead: 'Savdodan ishlab chiqarishga: parranda boqishni o‘z tizimimizga oldik.',
            cause: 'Tarixiy islohotlar',
            effect: 'Yirik sanoat bosqichi',
            figures: [
              { id: 'cap', value: 25000, unit: 'bosh parranda', label: 'Kechagi kun quvvati', featured: true }
            ],
            own: [3, 8], focus: 3
          },
          {
            eyebrow: 'O‘sish',
            period: 'Kechagi kun',
            title: 'Kechagi kun:<br>25 ming bosh parranda.',
            intro: 'Shu bosqichda 25 ming bosh parranda bilan ishladik va mahsulotni o‘z transportimizda bozorga chiqardik.',
            conclusion: 'Kapital o‘sdi — keyingi bo‘g‘inlarni sotib olishga kuch paydo bo‘ldi.',
            lead: 'Boqish va savdo o‘zimizda; oradagi bosqichlar hali tashqarida.',
            cause: '25 ming bosh quvvat',
            effect: 'Kapitalni ko‘paytirish',
            figures: [
              { id: 'cap', value: 25000, unit: 'bosh parranda', label: 'Kechagi kun quvvati', featured: true }
            ],
            own: [3, 8], focus: 8
          }
        ]
      },

      /* -------------------------------------------- 03 · Klaster 2026 --- */
      {
        id: 'klaster',
        name: 'Klaster · 2026',
        period: '2026',
        beats: [6, 7, 8, 16, 10, 4],
        times: [7, 6, 6, 6, 6, 11],
        scenes: [
          {
            eyebrow: 'Klaster',
            period: '2026',
            title: 'Vertikal integratsiya:<br>hammasi o‘zimizda.',
            intro: 'Vertikal integratsiya va klaster tizimini korxonamizda to‘liq joriy etdik.',
            conclusion: 'Kechagi 25 ming boshdan bugungi 1,5 million boshgacha.',
            lead: 'Yem zavodidan savdogacha — barcha bo‘g‘in bitta maydonda, bitta tizimda.',
            cause: 'Vertikal integratsiya',
            effect: 'Quvvat 1,5 million boshga yetdi',
            figures: [
              { id: 'cap', value: 1500000, unit: 'bosh parranda', label: '2026-yil quvvati', featured: true },
              { id: 'cap0', value: 25000, unit: 'bosh parranda', label: 'Kechagi kun' }
            ],
            chart: {
              title: 'Quvvat: kechagi kun → 2026-yil',
              rows: [
                { label: 'Kechagi kun', value: 25000, unit: 'bosh' },
                { label: '2026-yil', value: 1500000, unit: 'bosh', accent: true }
              ]
            },
            own: ALL
          },
          {
            eyebrow: 'Yagona zanjir',
            period: '2026',
            title: 'Bir bo‘g‘in ham<br>tizimdan chetga chiqmaydi.',
            intro: 'Ona tovuqdan tayyor mahsulotgacha bo‘lgan har bir bosqich endi korxonaning o‘zida.',
            conclusion: 'Oradagi vositachi yo‘q — qiymat ichkarida qoladi.',
            lead: 'Naslchilik, boqish, so‘yish, qayta ishlash, kolbasa, rendering va savdo — bitta zanjir.',
            cause: 'Bo‘g‘inlar birlashtirildi',
            effect: 'Qiymat tizim ichida qoladi',
            figures: [],
            own: ALL
          },
          {
            eyebrow: 'Ona tovuq',
            period: '2026',
            title: 'Eng katta yutug‘imiz —<br>Parent stock.',
            intro: 'Vengriyaning «Aviagen» kompaniyasi bilan hamkorlikda ona tovuq loyihasini tikladik.',
            conclusion: 'Nasldor tuxum va jo‘jani o‘zimizda ochiryapmiz.',
            lead: 'Importga qaramlikka va valyutaning chetga chiqib ketishiga chek qo‘yildi.',
            cause: 'Aviagen bilan ona tovuq loyihasi',
            effect: 'Importga qaramlik tugadi',
            figures: [],
            chips: ['Aviagen · Vengriya', 'Parent stock', 'Valyuta ichkarida qoladi'],
            own: ALL, focus: 0, credit: true, photo: 'aviagen'
          },
          {
            eyebrow: 'Aqlli katak',
            period: '2026',
            title: 'Joy tejamkor,<br>samaradorlik yuqori.',
            intro: 'Eng so‘nggi aqlli ko‘p qavatli katak tizimlarini yo‘lga qo‘ydik.',
            conclusion: 'Bir xil maydonda ko‘proq parranda, boshqaruv esa avtomatlashtirilgan.',
            lead: 'Yem, suv, harorat va yorug‘lik — hammasi bitta tizimdan boshqariladi.',
            cause: 'Ko‘p qavatli aqlli katak',
            effect: 'Joy tejaladi, samaradorlik oshadi',
            figures: [],
            chips: ['Ko‘p qavatli', 'Aqlli boshqaruv', 'Joy tejamkor'],
            own: ALL, focus: 3, photo: 'katak'
          },
          {
            eyebrow: 'Qayta ishlash',
            period: '2026',
            title: 'Dunyoda tengi yo‘q<br>uskunalar.',
            intro: 'Gollandiyaning «Marel» uskunalari bilan jihozlangan so‘yish majmuasini ishga tushirdik.',
            conclusion: 'Zamonaviy kolbasa sexi ham shu majmuaning davomi.',
            lead: 'Xomashyoni tashqariga chiqarmasdan, o‘zimizda chuqur qayta ishlaymiz.',
            cause: 'Marel so‘yish majmuasi',
            effect: 'Chuqur qayta ishlash o‘zimizda',
            figures: [],
            chips: ['Marel · Gollandiya', 'So‘yish majmuasi', 'Kolbasa sexi'],
            own: ALL, focus: 4, photo: 'marel'
          },
          {
            eyebrow: 'Chiqindisiz',
            period: '2026',
            title: 'Birorta chiqindi<br>tashqariga chiqmaydi.',
            intro: 'Ekologiyani asrash va tejamkorlik uchun «chiqindisiz texnologiya» asosida Rendering liniyasini o‘rnatdik.',
            conclusion: 'Hammasidan qo‘shimcha qiymat olamiz.',
            lead: 'Bir tovuqning har bir bo‘lagi alohida mahsulotga aylanadi.',
            cause: 'Rendering liniyasi',
            effect: 'Chiqindi 0 — qo‘shilgan qiymat',
            figures: [],
            chips: ['Rendering liniyasi', 'Chiqindisiz texnologiya', 'Qo‘shilgan qiymat'],
            own: ALL, focus: 7, photo: 'rendering'
          }
        ]
      },

      /* ------------------------------------------ 04 · Hozirgi bosqich -- */
      {
        id: 'hozir',
        name: 'Hozirgi bosqich',
        period: '2026 · Hozir',
        beats: [13],
        times: [9],
        scenes: [
          {
            eyebrow: 'Hozirgi bosqich',
            period: '2026 · Hozir',
            title: 'Qurilish<br>davom etmoqda.',
            intro: 'Klaster bugungi quvvatda to‘xtab qolgani yo‘q — keyingi bosqich qurilmoqda.',
            conclusion: 'Bosib o‘tilgan yo‘l va oldindagi qadamlar.',
            lead: 'Quyidagi yo‘l xaritasida tasdiqlangan sanalar berilgach to‘ldiriladi.',
            cause: 'Bugungi quvvat',
            effect: 'Keyingi bosqich qurilmoqda',
            figures: [],
            own: ALL,
            roadmap: [
              { title: 'Go‘sht savdosi, 3 xodim', year: '2010', state: 'done' },
              { title: '25 000 bosh parranda', year: null, state: 'done' },
              { title: 'Vertikal integratsiya', year: null, state: 'done' },
              { title: 'Ona tovuq — Aviagen', year: null, state: 'live' },
              { title: 'Marel so‘yish majmuasi', year: null, state: 'live' },
              { title: 'Kolbasa sexi', year: null, state: 'live' },
              { title: 'Rendering liniyasi', year: null, state: 'live' },
              { title: 'Aqlli ko‘p qavatli katak', year: null, state: 'live' },
              { title: '1 500 000 bosh quvvat', year: '2026', state: 'now' },
              { title: 'Qurilayotgan obyekt', year: null, state: 'building' },
              { title: 'Rejadagi obyekt', year: null, state: 'planned' }
            ]
          }
        ]
      },

      /* ---------------------------------------------------- 05 · Yakun -- */
      {
        id: 'yakun',
        name: 'Keyingi marra',
        period: 'Keyingi bosqich',
        beats: [14, 15],
        times: [8, 6],
        scenes: [
          {
            eyebrow: 'Bugungi klaster',
            period: '2026',
            title: 'Bugungi klaster —<br>ertangi poydevor.',
            intro: '2010-yilda 3 nafar xodim. 2026-yilda 1,5 million bosh quvvatli parranda klasteri.',
            conclusion: 'Kichik go‘sht savdosidan — to‘liq vertikal integratsiyalashgan klastergacha.',
            lead: 'Zanjirning har bir bo‘g‘ini korxonaning o‘zida.',
            cause: 'Vertikal integratsiya',
            effect: 'Barcha bo‘g‘in o‘z tizimimizda',
            figures: [
              { value: 2010, unit: 'yil', label: 'Boshlanish', static: true },
              { value: 3, unit: 'nafar', label: '2010-yilgi jamoa' },
              { value: 2026, unit: 'yil', label: 'Bugun', static: true },
              { id: 'cap', value: 1500000, unit: 'bosh parranda', label: 'Bugungi quvvat', featured: true }
            ],
            own: ALL
          },
          {
            eyebrow: 'Keyingi marra',
            period: 'Keyingi bosqich',
            title: 'Sokin Savdo.<br>Keyingi marra.',
            intro: 'Kelgusi bosqich ko‘rsatkichlari tasdiqlangach shu yerda ko‘rsatiladi.',
            conclusion: 'Bugungi klaster — kelajakdagi o‘sishning poydevori.',
            lead: 'Quyidagi ko‘rsatkichlar buyurtmachi tomonidan tasdiqlanmaguncha bo‘sh turadi.',
            cause: 'Bugungi klaster',
            effect: 'Keyingi bosqichning poydevori',
            figures: [],
            own: ALL,
            plans: {
              cards: [
                { label: 'Quvvat', value: null, unit: 'bosh/yil' },
                { label: 'Yangi ish o‘rni', value: null, unit: '' },
                { label: 'Eksport', value: null, unit: '' },
                { label: 'Investitsiya', value: null, unit: '' }
              ],
              deadline: null
            },
            brandMark: true
          }
        ]
      }
    ],

    /* Buyurtmachi bergan chicken.glb dagi yetti bo'lak va ularning o'zbekcha
       nomlari. `key` — modeldagi tugun nomi, `note` — yorliqning ikkinchi satri.
       Nomlar modelning haqiqiy bo'linishiga mos: to'sh va bel bitta bo'lakda,
       son va boldir esa butun oyoq bo'lib ajratilgan.                      */
    chickenParts: [
      { key: 'torso', name: 'To‘sh va bel', note: 'markaziy bo‘lak' },
      { key: 'wingL', name: 'Chap qanot' },
      { key: 'wingR', name: 'O‘ng qanot' },
      { key: 'legL',  name: 'Chap oyoq',  note: 'son va boldir' },
      { key: 'legR',  name: 'O‘ng oyoq',  note: 'son va boldir' },
      { key: 'neck',  name: 'Bo‘yin' },
      { key: 'tail',  name: 'Dum' }
    ],

    /* Real fotolar. Bo'sh ro'yxat = "Fotoni ko'rish" tugmasi hech qayerda
       ko'rinmaydi va hech qanday tarmoq so'rovi yuborilmaydi (oflayn talabi).
       Buyurtmachi rasm bergach: faylni assets/photos/ ga qo'ying va shu
       yerga bitta satr qo'shing — boshqa hech narsa o'zgarmaydi.
         {key:'aviagen', file:'aviagen.jpg', caption:'Ona tovuq korpusi'}
       Kalitlar: 2010-arxiv · aviagen · katak · marel · rendering        */
    photos: []
  };
})();
