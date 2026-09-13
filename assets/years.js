/* Sokin Savdo Servis — yillar ma'lumoti.
 *
 * MANBA QOIDASI (prompts/STEP_1.MD): ekranda ko'rinadigan har bir raqam
 * buyurtmachi bergan hujjatdan olingan bo'lishi shart. O'ylab topilgan
 * raqam, taxmin, internetdan olingan statistika — yo'q.
 *
 * 2010-yil manbasi — docs/Tovuqchilik_rivojlanish_tarixi.docx, 1-2-xatboshi:
 *   "2010-yil 3 ta ishchi tovuq go'sht olib sotish bozor. Yillik aylanma 200 mln."
 *   "* bir yilda 6 marta aylanma bo'ladi"
 *
 * docs/Yaratilgan_qiymat_Sokin_savdo.xlsx → "Лист2" varag'ida 2010 ustuni bo'sh
 * (o'sha yili ishlab chiqarish bo'lmagan). U yerdagi 20 000 so'm/kg barcha
 * yillarga bir xil qo'yilgan hisob parametri — tarixiy narx emas, shuning uchun
 * 2010 sahifasida ko'rsatilmaydi.
 *
 * PANELLAR: `photo` — butun bandni qoplaydigan bitta keng surat (uchta zona:
 * ishlab chiqaruvchi · yuklash · bozor). U yuklanmasa `panels` dagi vektor
 * sahnalar (assets/scenes.js) ko'rinib qoladi.
 */
(function () {
  window.YEARS = [{
    id: '2010',
    layout: 'single',
    period: '2010',
    eyebrow: '',
    title: '2010-йил',

    stats: [
      { value: 3, unit: 'та', label: 'Ишчи' },
      {
        value: 200, unit: 'млн сўм', label: 'Йиллик айланма',
        note: ''
      }
    ],

    photo: 'assets/photos/2010.jpg',
    photoAlt: 'Сокин Савдо Сервис — Ишлаб чиқарувчидан олинган товуқ гўшти юк машинасига ' +
      'ортилиб, бозорга етказилмоқда',
    brand: 'Сокин Савдо Сервис',
    subtitle: 'Фаолиятни бозорда товуқ гўшти улгуржи савдоси ва дистрбюция билан бошлаш',

    /* Suratdagi nuqtalar — surat kengligining ulushi sifatida (0..1), piksel
       emas. Fon `cover` bilan qirqilgani uchun ekran nisbati o'zgarsa piksel
       holati ham o'zgaradi; `assets/page.js: placeOverlays` uni har safar
       qayta hisoblaydi, shuning uchun yozuv joyidan siljimaydi. */
    /* Uch surat ketma-ket; o'rtadagi jarayon (tashish) kengroq ko'rsatiladi. */
    strip: [
      { photo: 'assets/photos/2010-producer.jpg', label: 'Ишлаб чиқарувчи', grow: 1 },
      { photo: 'assets/photos/2010-transport.jpg', label: 'Ташиш', grow: 2.6 },
      { photo: 'assets/photos/2010-bazaar.jpg', label: 'Бозор', grow: 1 }
    ],
    panels: [
      { scene: 'producer' },
      { scene: 'transport' },
      { scene: 'bazaar' }
    ],

    chain: [
      { icon: 'factory', label: 'улгуржи савдо ва дистрибуция' },
      
    ]
  },

  /* ====================================================== 2020–2021 ====== */
  /* Manba — docs/Tovuqchilik_rivojlanish_tarixi.docx, 3-4-xatboshi:
   *   "2020-yil 4 mlrd kredit (yopilgan), bir aylanmadagi tovuq soni 25 ming
   *    dona, 50 ta ishchi. Yillik aylanma 7.5 mlrd so'm. Ishlab chiqarish
   *    hajmi 375 tonna. Bir kg go'sht narxi 20 000."
   *   "2021-yil 20 mlrd, bir aylanmadagi tovuq soni 200 ming tovuq, 100 ta
   *    ishchi. Yillik aylanma 60 mlrd. Ishlab chiqarish hajmi 3 000 tonna.
   *    Bir kg go'sht narxi 20 000."
   * Bu raqamlar docs/Yaratilgan_qiymat_Sokin_savdo.xlsx "Лист2" D va E
   * ustunlari bilan to'liq mos tushadi.
   *
   * `growth` — o'ylab topilgan emas, yuqoridagi ikki raqamdan hisoblangan:
   *   (2021 - 2020) / 2020 x 100.
   *   kredit  4 → 20      = +400%
   *   tovuq  25 → 200     = +700%
   *   ishchi 50 → 100     = +100%
   *   aylanma 7.5 → 60    = +700%
   *   hajm   375 → 3 000  = +700%
   *   narx   20 000 o'zgarmagan = 0%
   */
  {
    id: '2020-2021',
    layout: 'compare',
    period: '2020–2021',
    eyebrow: '',
    brand: 'Сокин Савдо Сервис',
    title: "Кредит маблағлари ҳисобидан товуқ боқиш ва гўшт маҳсулотларини ишлаб чиқариш лойиҳалари старт олди.",
    subtitle: '',

    photo: 'assets/photos/2020.jpg',
    photoAlt: 'Товуқхона, сўйиш ва қайта ишлаш линияси ҳамда юк машинаси',

    columns: [
      {
        year: '2020-йил', tone: 'dark',
        rows: [
          { icon: 'cash', value: 4, unit: 'млрд сўм', label: 'Кредит (олиниб ёпилган)' },
          { icon: 'hen', value: 25, unit: 'минг дона', label: 'Бир айланмадаги товуқ сони' },
          { icon: 'workers', value: 50, unit: 'та', label: 'Ишчи сони' },
          { icon: 'chart', value: 8, unit: 'млрд сўм', label: 'Йиллик айланма', lead: true },
          { icon: 'meat', value: 375, unit: 'тонна', label: 'Ишлаб чиқариш ҳажми (йилига)', lead: true },
        ]
      },
      {
        year: '2021-йил', tone: 'green',
        growthHead: '2020-га нисбатан ўсиш',
        rows: [
          { icon: 'cash', value: 20, unit: 'млрд сўм', label: 'Кредит (олиниб ёпилган)', growth: '+500%' },
          { icon: 'hen', value: 200, unit: 'минг дона', label: 'Бир айланмадаги товуқ сони', growth: '+800%' },
          { icon: 'workers', value: 100, unit: 'та', label: 'Ишчи сони', growth: '+200%' },
          { icon: 'chart', value: 60, unit: 'млрд сўм', label: 'Йиллик айланма', growth: '+750%' },
          { icon: 'meat', value: 3000, unit: 'тонна', label: 'Ишлаб чиқариш ҳажми (йилига)', growth: '+800%' },
        ]
      }
    ],

    chain: [
      { icon: 'barn', label: 'Боқиш' },
      { icon: 'blade', label: 'Сўйиш' },
      { icon: 'truck', label: 'Бозорга етказиш' }
    ]
  },

  /* ====================================================== 2022–2023 ====== */
  /* Manba — docs/Tovuqchilik_rivojlanish_tarixi.docx, 5-6-xatboshi:
   *   "2022-yil har bir kg ga 2 500, 2023-yil 1 250 so'mdan subsidiya.
   *    Yillik aylanma 66 mlrd. Ishlab chiqarish hajmi 3 300 tonna,
   *    3.7 mlrd summa soliq imtiyoz. Bir kg go'sht narxi 20 000."
   *   "2023-yil bir aylanmadagi tovuq soni 300 ming tovuq, 200 ta ishchi +
   *    ozuqa yem ishlab chiqarish (klaster boshlanishi). Yillik aylanma
   *    90 mlrd. Ishlab chiqarish hajmi 4 500 tonna. Ichki yem ishlab chiqarish
   *    hisobiga 6.9 mlrd (8%) tannarx arzonladi."
   * 2022 uchun bir aylanmadagi tovuq soni (220 ming) —
   *   docs/Yaratilgan_qiymat_Sokin_savdo.xlsx "Лист2" F3.
   *
   * 2022-yil ISHCHI SONI (150) ikkala hujjatda ham yo'q — uni BUYURTMACHI
   * og'zaki tasdiqladi (2026-09-12). Ya'ni manbasi hujjat emas, mijozning
   * o'zi; shu sababli alohida belgilab qo'yildi. Hujjatga kiritilsa, bu izoh
   * yangilanadi.
   *
   * `growth` — hisoblangan: (2023 - 2022) / 2022 x 100.
   *   subsidiya 2 500 → 1 250  = -50%   (subsidiya kamaydi)
   *   tovuq      220 → 300     = +36%
   *   ishchi     150 → 200     = +33%
   *   aylanma     66 → 90      = +36%
   *   hajm     3 300 → 4 500   = +36%
   *   narx    20 000 o'zgarmagan = 0%
   * Soliq/tannarx qatorida ikkala yilda bir xil ko'rsatkich yo'q — foiz ham
   * ko'rsatilmaydi.
   */
  {
    id: '2022-2023',
    layout: 'compare',
    period: '2022–2023',
    eyebrow: '',
    brand: 'Сокин Савдо Сервис',
    title: 'Давлат субсидияси ҳисобидан ем ишлаб чиқариш мажмуаси ишга тушурилди.',
    subtitle: 'Кластер тизими бошланди — таннарх пасайди, ишлаб чиқариш сурати ошди.',

    photo: 'assets/photos/2022.jpg',
    photoAlt: 'Ем заводи, товуқхоналар, сўйиш сехи ва юк машинаси',

    columns: [
      {
        year: '2022-йил', tone: 'dark',
        rows: [
          { icon: 'subsidy', value: 2500, unit: 'сўм', label: 'Ҳар бир кг га субсидия' },
          { icon: 'hen', value: 220, unit: 'минг дона', label: 'Бир айланмадаги товуқ сони' },
          { icon: 'workers', value: 150, unit: 'та', label: 'Ишчи сони' },
          { icon: 'chart', value: 66, unit: 'млрд сўм', label: 'Йиллик айланма', lead: true },
          { icon: 'meat', value: 3300, unit: 'тонна', label: 'Ишлаб чиқариш ҳажми (йилига)', lead: true },
          { icon: 'gear', value: null, label: 'Ички ем ҳисобига таннарх арзонлади (10,4%)' },

        ]
      },
      {
        year: '2023-йил', tone: 'green',
        growthHead: '2022-га нисбатан ўсиш',
        rows: [
          {
            icon: 'subsidy', value: 1250, unit: 'сўм', label: 'Ҳар бир кг га субсидия',
            growth: '-50%'
          },
          {
            icon: 'hen', value: 300, unit: 'минг дона', label: 'Бир айланмадаги товуқ сони',
            growth: '+36%'
          },
          {
            icon: 'workers', value: 200, unit: 'та', label: 'Ишчи сони',
            growth: '+33%'
          },
          {
            icon: 'chart', value: 90, unit: 'млрд сўм', label: 'Йиллик айланма', lead: true,
            growth: '+36%'
          },
          {
            icon: 'meat', value: 4500, unit: 'тонна', label: 'Ишлаб чиқариш ҳажми (йилига)', lead: true,
            growth: '+36%'
          },
          {
            icon: 'gear', value: 10.4, unit: 'млрд сўм',
            label: 'Ички ем ҳисобига таннарх арзонлади (11,5%)'
          },
          { icon: 'money', value: 20000, unit: 'сўм', label: '1 кг гўшт нархи' }
        ]
      }
    ],

    chain: [
      { icon: 'gear', label: 'Ем ишлаб чиқариш' },
      { icon: 'barn', label: 'Товуқ боқиш' },
      { icon: 'blade', label: 'Сўйиш' },
      { icon: 'truck', label: 'Бозорга етказиш' }
    ]
  },

  /* ====================================================== 2025–2026 ====== */
  /* Manba — docs/Tovuqchilik_rivojlanish_tarixi.docx, 7-8-xatboshi:
   *   "2025-yil bir aylanmadagi tovuq soni 800 ming tovuq, 300 ta ishchi.
   *    Tovuqni bo'laklarga bo'lib sotish boshlandi. Yillik aylanma 240 mlrd.
   *    Ishlab chiqarish hajmi 12 000 tonna, 8 mlrd summa soliq imtiyoz
   *    (2024-2025-yil)."
   *   "2026-yil bir aylanmadagi tovuq soni 1.5 mln dona. 400 dan oshiq ishchi.
   *    Vengriya Aviagen kompaniyasidan 75 ming bosh ona tovuq olib kelingan.
   *    Yillik aylanma 450 mlrd so'm. Ishlab chiqarish hajmi 22 500 tonna.
   *    31.4 mlrd summa soliq imtiyoz."
   * Hammasi docs/Yaratilgan_qiymat_Sokin_savdo.xlsx "Лист2" H va I ustunlari
   * bilan mos (800 000 / 1 500 000 bosh, 12 000 / 22 500 t, 240 / 450 mlrd,
   * soliq imtiyozi 8 / 31.4 mlrd).
   *
   * `growth` — hisoblangan: (2026 - 2025) / 2025 x 100.
   *   tovuq   800 ming → 1.5 mln = +88%
   *   aylanma     240 → 450      = +88%
   *   hajm     12 000 → 22 500   = +88%
   *   soliq         8 → 31.4     = +293%
   *   narx     20 000 o'zgarmagan = 0%
   * Ishchi soni qatorida foiz YO'Q: hujjatda "400 dan oshiq" deyilgan, ya'ni
   * bu aniq raqam emas, quyi chegara — undan foiz chiqarish noto'g'ri bo'lardi.
   *
   * DIQQAT: buyurtmachi bergan referens rasmda O'zbekiston Prezidentiga
   * tegishli iqtibos bor. U na .docx, na .xlsx da uchraydi — haqiqiy shaxsga
   * tasdiqlanmagan gap yozib qo'yish mumkin emas, shuning uchun sahifaga
   * kiritilmadi. Manbasi bo'lsa (rasmiy nutq, sana) — qo'shiladi.
   */
  {
    id: '2025-2026',
    layout: 'compare',
    period: '2025–2026',
    eyebrow: '',
    brand: 'Сокин Савдо Сервис',
    title: 'Кластер тармоқлари янада кенгайди ва товуқ гўштини бўлакларга ажратиш тизимини ташкил этиш билан ишлаб чиқариш қуввати оширилди.',
    subtitle: '2025-йилда : Бутун товуқни қисимларга ажратиш\n2026-йилда : Наслли "Она товуқ" лойиҳасининг бошланиши',

    photo: 'assets/photos/2025.jpg',
    photoAlt: 'Она товуқ хўжалиги, бўлакларга бўлиб ишлаш сехи ва қадоқлаш',

    columns: [
      {
        year: '2025-йил', tone: 'dark',
        rows: [
          /* `abs` — asl kattalik (dona). Ekranda "800 ming" ko'rinadi, lekin
             o'sish foizini tekshirish shu maydondan hisoblanadi: ikki yilda
             birlik har xil (ming / mln), xom raqamni solishtirish noto'g'ri. */
          {
            icon: 'hen', value: 800, unit: 'минг дона', abs: 800000,
            label: 'Бир айланмадаги товуқ сони'
          },
          { icon: 'workers', value: 300, unit: 'та', label: 'Ишчи сони' },
          { icon: 'chart', value: 242, unit: 'млрд сўм', label: 'Йиллик айланма', lead: true },
          { icon: 'meat', value: 11000, unit: 'тонна', label: 'Ишлаб чиқариш ҳажми (йилига)', lead: true },
          { icon: 'tax', value: null, unit: 'млрд сўм', label: 'Солиқ имтиёзи (2024–2025)' },
          { icon: 'chart', value: 19, unit: 'млрд сўм', label: 'Қўшилган қиймат' },
          { icon: 'gear', value: null, label: 'Таннархни камайтириш (8%)' },
          { icon: 'cuts', value: null, label: 'Товуқни бўлакларга бўлиб сотиш бошланди' }

        ]
      },
      {
        year: '2026-йил', yearNote: '(Кутилма)', tone: 'green',
        growthHead: '2025-га нисбатан ўсиш',
        rows: [
          {
            icon: 'hen', value: 1.5, unit: 'млн дона', abs: 1500000,
            label: 'Бир айланмадаги товуқ сони', growth: '+188%'
          },
          {
            icon: 'workers', value: 400, suffix: '+', unit: 'та',
            label: 'Ишчи сони', growth: "133%"
          },   /* hujjatda "400 dan oshiq" — shuning uchun "+" */
          {
            icon: 'chart', value: 315, unit: 'млрд сўм', label: 'Йиллик айланма', lead: true,
            growth: '+130%'
          },
          {
            icon: 'meat', value: 13100, unit: 'тонна', label: 'Ишлаб чиқариш ҳажми (йилига)', lead: true,
            growth: '+119%'
          },
          {
            icon: 'tax', value: 15, unit: 'млрд сўм', label: 'Солиқ имтиёзи',
            growth: '+293%'
          },
          { icon: 'chart', value: null, label: 'Қўшилган қиймат' },
          { icon: 'gear', value: 14, unit: 'млрд сўм', label: 'Таннархни камайтириш (5%)' },
          {
            icon: 'hen', value: 75, unit: 'минг бош',
            label: 'Венгрия Авиаген компаниясидан она товуқ'
          }
        ]
      }
    ],

    /* Manba — docs/Yaratilgan_qiymat_Sokin_savdo.xlsx, "Yaratilgan qiymat
       2025-2026" varag'i, C6:C14 ("Maxsulotdagi ulush"). Foizga o'girilgan.
       Varaqdagi jami 100.4% — buyurtmachi faylidagi yaxlitlash, shuning uchun
       sahifada jami ko'rsatilmaydi. */
    centre: {
      title: '',
      wheel: true,
      items: [
        { key: 'akorachka', label: 'Сон гўшти', value: 13.8 },
        { key: 'file', label: 'Филе (Кўкрак гўшти)', value: 35.6 },
        { key: 'qanot', label: 'Қанот', value: 12 },
        { key: 'golen', label: 'Товуқ Болдирчаси', value: 7 },
        { key: 'bedro', label: 'Сон', value: 12 },
        { key: 'drakon', label: 'Товуқ Болдири', value: 12 },
        { key: 'teri', label: 'Тери', value: 3 },
        { key: 'karkas', label: 'Товуқ Каркази', value: 5 },
      ]
    },

    chain: [
      { icon: 'hen', label: 'Она товуқ хўжалиги' },
      { icon: 'gear', label: 'Ем ишлаб чиқариш' },
      { icon: 'barn', label: 'Товуқ боқиш' },
      { icon: 'blade', label: 'Сўйиш ва қайта ишлаш' },
      { icon: 'cuts', label: 'Бўлакларга бўлиб сотиш' }
    ]
  },

  /* ====================================================== 2026–2027 ====== */
  /* Manba — docs/Tovuqchilik_rivojlanish_tarixi.docx, 9-xatboshi:
   *   "2026-2027-yil Parranda Investment hamkorlikda Gollandiya davlatining
   *    Marel kompaniyasining so'yish va qadoqlash majmuasi va rendering
   *    liniyasi (chiqindini qayta ishlash asosida yemga qo'shimcha mahsulot
   *    ishlab chiqarish) va ko'p qavatli kataklarda tovuq boqish tizimi.
   *    Loyihaning umumiy qiymati 35 mln dollar, shundan 20 mln dollar
   *    investitsiya Parranda Investment hisobidan. Shundan keyin 24 mln bosh
   *    parranda, 60 ming tonna go'sht ishlab chiqarish boshlanadi va summa
   *    1.5 trlnga yetadi. 180 mlrd summa soliq imtiyoz kutilyapti."
   *
   * DIQQAT — hujjatlar orasida ziddiyat: yillik aylanma docx'da "1.5 trln",
   * xlsx "Лист2" J6 da esa 1200 mlrd (= 1.2 trln). Bu yerda docx raqami
   * olindi, chunki buyurtmachi bergan referens rasmda ham 1.5 trln turibdi.
   * Qaysi biri to'g'ri ekanini buyurtmachidan so'rash kerak.
   *
   * Bu sahifada o'sish foizi yo'q: 2026-2027 — prognoz, oldingi yil bilan
   * bir xil ko'rsatkichlar qatori emas.
   */
  {
    id: '2026-2027',
    layout: 'project',
    period: '2026–2027',
    eyebrow: '',
    brand: 'Сокин Савдо Сервис',
    title: 'Янги лойиҳа: "Парранда инвестмент" МЧЖ ҳамкорлигидаги технологик трансформация',
    subtitle: 'Янги босқич — янада катта имкониятлар',

    photo: 'assets/photos/2026.jpg',
    photoAlt: 'Янги сўйиш ва қадоқлаш мажмуаси — кўчадан кўриниши',

    /* Uchinchi tomon nomlari hujjatdagidek matn bilan beriladi;
       logotiplar ishlatilmaydi. */


    invest: {
      label: 'Лойиҳанинг умумий қиймати',
      value: 20, unit: 'млн $',
      cells: [

      ]
    },

    kpis: [
      { icon: 'hen', label: 'Йиллик парранда сони', value: 12, unit: 'млн бош' },
      { icon: 'meat', label: 'Гўшт ишлаб чиқариш', value: 69, unit: 'минг тонна' },
      { icon: 'chart', label: 'Йиллик айланма (прогноз)', value: 1.2, unit: 'трлн сўм' },
      { icon: 'chart', label: 'Кутилаётган солиқ имтиёзи', value: 100, unit: 'млрд сўм' }
    ],

    tracks: {
      title: 'Мажмуанинг асосий йўналишлари',
      items: [
        { icon: 'cage', label: 'Кўп қаватли катакларда товуқ боқиш тизими', note: 'Таннархни камайтириш\n14 млрд сўм (1.2%) ' },
        { icon: 'pack', label: 'Парранда сўйиш, қайта ишлаш, сақлаш ва қадоқлаш', note: 'Қўшилган қиймат\n915 млрд сўм\nТаннархни камайтириш\n36 млрд сўм (3%)' },
        {
          icon: 'recycle', label: 'Рендеринг линияси',
          note: 'Қўшилган қиймат\n50 млрд сўм'
        }
      ]
    }
  },

  /* ================================================ istiqboldagi loyihalar === */
  /* Manba — docs/Tovuqchilik_rivojlanish_tarixi.docx, oxirgi blok:
   *   "Istiqboldagi loyihalar
   *    Andijon viloyatida yem ozuqa zavodi ishlab chiqarish — 2027-yil
   *      4-chorak, 10 mln doll
   *    Kalbasa maxsulotlari — 2027-yil 1-chorak, 2.5 mln doll
   *    Ona tovuq loyihasi — 2027-yil 2-chorak, 7 mln doll
   *    12 ta viloyatda 500 ta savdo do'konlari qurish — 2027-yil 4-chorak,
   *      7.5 mln doll
   *    Parranda va naslli chorva — 2027-yil 4-chorak, 9 mln doll
   *    Jami 36 mln doll loyiha, 1 780 ta ish o'rni yaratiladi."
   *
   * Jami tekshirildi: 10 + 2.5 + 7 + 7.5 + 9 = 36 — hujjatdagi jami bilan mos.
   * QA buni har safar qayta hisoblaydi (`plans-total-adds-up`).
   *
   * DIQQAT: buyurtmachi bergan referens rasmda har kartaning ostida 4-5 tadan
   * izoh bandi bor ("Yem ishlab chiqarish quvvati", "Mahalliy xom ashyodan
   * foydalanish" va h.k.). Ular hujjatda YO'Q — loyihalar mazmuni haqidagi
   * taxminlar. Shuning uchun kiritilmadi. Matn berilsa, `bullets` maydoniga
   * qo'shiladi.
   */
  {
    id: 'istiqbol',
    layout: 'plans',
    period: 'Истиқбол',
    eyebrow: '',
    brand: 'Сокин Савдо Сервис',
    title: 'Келажак сари қадам : Истиқболли стратегик лойиҳалар.',
    subtitle: '2027-йилгача янада катта имкониятлар.',
    taglines: ['Сифатли маҳсулот', 'Кучли иқтисодиёт', 'Барқарор келажак'],

    items: [
      {
        icon: 'gear', title: 'Юқори технологияли замонавий ем - озуқа заводини барпо этиш',
        when: '2027-йил 4-чорак', value: 10, unit: 'млн $', photo: 'assets/photos/plans-1.jpg'
      },
      {
        icon: 'meat', title: 'Юқори сифатли колбаса ва гўшт маҳсулотларини ишлаб чиқаришни йўлга қўйиш',
        when: '2027-йил 1-чорак', value: 2.5, unit: 'млн $', photo: 'assets/photos/plans-2.jpg'
      },
      {
        icon: 'hen', title: 'Наслли паррандачиликни ривожлантириш мақсадида махсус "Она товуқ" лойиҳасини татбиқ этиш',
        when: '2027-йил 2-чорак', value: 7, unit: 'млн $', photo: 'assets/photos/plans-3.jpg'
      },
      {
        icon: 'market', title: 'Республиканинг барча вилоятларида замонавий брендли 200та кластер савдо дўконларини қуриш ва халққа арзон маҳсулот етказиш.',
        when: '2027-йил 4-чорак', value: 7.5, unit: 'млн $', photo: 'assets/photos/plans-4.jpg'
      },
      {
        icon: 'barn', title: 'Халқаро стандартларга жавоб берадиган замонавий парранда ва наслли чорва фермасини ташкил этиш.',
        when: '2027-йил 4-чорак', value: 9, unit: 'млн $', photo: 'assets/photos/plans-5.jpg'
      }
    ],

    total: {
      label: 'Жами лойиҳалар',
      cells: [
        { icon: 'money', value: 36, unit: 'млн $', label: 'инвестиция' },
        { icon: 'workers', value: 2230, unit: 'та', label: 'иш ўрни ' },
        { icon: 'workers', value: 578, unit: 'млрд сўм ', label: 'Қўшилган қиймат' }
      ],
      note: 'Барқарор ривожланиш сари'
    }
  }];
})();
