/* Sokin Savdo — yillar ma'lumoti.
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
(function(){
  window.YEARS=[{
    id:'2010',
    layout:'single',
    year:'2010',
    title:'2010-yil',

    stats:[
      {side:'left',  icon:'workers', value:3,   unit:'ta',
       label:'ishchi'},
      {side:'right', icon:'money',   value:200, unit:'mln so‘m',
       label:'Yillik aylanma:', note:'yiliga 6 marta aylanma'}
    ],

    photo:'assets/photos/2010.jpg',
    photoAlt:'Ishlab chiqaruvchidan olingan tovuq go‘shti yuk mashinasiga '+
             'ortilib, bozorga yetkazilmoqda',
    brand:'Sokin Savdo',
    subtitle:'Bozorda tovuq go‘shti savdosi — qiymat zanjirining oxirgi bo‘g‘ini',

    /* Suratdagi nuqtalar — surat kengligining ulushi sifatida (0..1), piksel
       emas. Fon `cover` bilan qirqilgani uchun ekran nisbati o'zgarsa piksel
       holati ham o'zgaradi; `assets/page.js: placeOverlays` uni har safar
       qayta hisoblaydi, shuning uchun yozuv ham, strelka ham joyidan siljimaydi. */
    arrowsAt:[0.335, 0.645],
    zones:[
      {at:0.150, label:'Ishlab chiqaruvchi'},
      {at:0.490, label:'Tashish'},
      {at:0.825, label:'Bozor'}
    ],
    panels:[
      {scene:'producer'},
      {scene:'transport'},
      {scene:'bazaar'}
    ],

    chain:[
      {icon:'factory', label:'Ishlab chiqaruvchidan olish'},
      {icon:'truck',   label:'Tashish'},
      {icon:'market',  label:'Bozorga yetkazib sotish'}
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
    id:'2020-2021',
    layout:'compare',
    brand:'Sokin Savdo',
    title:'Kredit hisobiga tovuq boqish va so‘yish boshlandi',
    subtitle:'Zanjirga ikkita yangi bo‘g‘in qo‘shildi: boqish va so‘yish',

    photo:'assets/photos/2020.jpg',
    photoAlt:'Tovuqxona, so‘yish va qayta ishlash liniyasi hamda yuk mashinasi',

    columns:[
      {
        year:'2020-yil', tone:'dark',
        rows:[
          {icon:'cash',    value:4,     unit:'mlrd so‘m', label:'Kredit (olinib yopilgan)'},
          {icon:'hen',     value:25,    unit:'ming dona', label:'Bir aylanmadagi tovuq soni'},
          {icon:'workers', value:50,    unit:'ta',        label:'Ishchi soni'},
          {icon:'chart',   value:7.5,   unit:'mlrd so‘m', label:'Yillik aylanma (6 marta aylanma)'},
          {icon:'meat',    value:375,   unit:'tonna',     label:'Ishlab chiqarish hajmi (yiliga)'},
          {icon:'money',   value:20000, unit:'so‘m',      label:'1 kg go‘sht narxi'}
        ]
      },
      {
        year:'2021-yil', tone:'green',
        growthHead:'2020-ga nisbatan o‘sish',
        rows:[
          {icon:'cash',    value:20,    unit:'mlrd so‘m', label:'Kredit (olinib yopilgan)',        growth:'+400%'},
          {icon:'hen',     value:200,   unit:'ming dona', label:'Bir aylanmadagi tovuq soni',      growth:'+700%'},
          {icon:'workers', value:100,   unit:'ta',        label:'Ishchi soni',                     growth:'+100%'},
          {icon:'chart',   value:60,    unit:'mlrd so‘m', label:'Yillik aylanma (6 marta aylanma)',growth:'+700%'},
          {icon:'meat',    value:3000,  unit:'tonna',     label:'Ishlab chiqarish hajmi (yiliga)', growth:'+700%'},
          {icon:'money',   value:20000, unit:'so‘m',      label:'1 kg go‘sht narxi',               growth:'0%'}
        ]
      }
    ],

    chain:[
      {icon:'barn',   label:'Boqish'},
      {icon:'blade',  label:'So‘yish'},
      {icon:'truck',  label:'Bozorga yetkazish'}
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
   * DIQQAT: 2022-yil uchun ISHCHI SONI ikkala hujjatda ham YO'Q.
   * Buyurtmachi bergan referens rasmda "150+ ta" yozilgan, lekin u hujjatlarda
   * uchramaydi — shuning uchun bu yerda `value:null`, ekranda "—" chiqadi.
   * Agar raqam topilsa, shu joyga manbasi bilan qo'yiladi.
   *
   * `growth` — hisoblangan: (2023 - 2022) / 2022 x 100.
   *   subsidiya 2 500 → 1 250  = -50%   (subsidiya kamaydi)
   *   tovuq      220 → 300     = +36%
   *   aylanma     66 → 90      = +36%
   *   hajm     3 300 → 4 500   = +36%
   *   narx    20 000 o'zgarmagan = 0%
   * Ishchi soni va soliq/tannarx qatorlarida ikkala yilda bir xil ko'rsatkich
   * yo'q — foiz ham ko'rsatilmaydi.
   */
  {
    id:'2022-2023',
    layout:'compare',
    brand:'Sokin Savdo',
    title:'Subsidiya va ichki yem ishlab chiqarish',
    subtitle:'Klaster boshlandi — tannarx pasaydi, ishlab chiqarish oshdi',

    photo:'assets/photos/2022.jpg',
    photoAlt:'Yem zavodi, tovuqxonalar, so‘yish sexi va yuk mashinasi',

    columns:[
      {
        year:'2022-yil', tone:'dark',
        rows:[
          {icon:'subsidy', value:2500,  unit:'so‘m',      label:'Har bir kg ga subsidiya'},
          {icon:'hen',     value:220,   unit:'ming dona', label:'Bir aylanmadagi tovuq soni'},
          {icon:'workers', value:null,                    label:'Ishchi soni (hujjatda yo‘q)'},
          {icon:'chart',   value:66,    unit:'mlrd so‘m', label:'Yillik aylanma'},
          {icon:'meat',    value:3300,  unit:'tonna',     label:'Ishlab chiqarish hajmi (yiliga)'},
          {icon:'tax',     value:3.7,   unit:'mlrd so‘m', label:'Soliq imtiyozi'},
          {icon:'money',   value:20000, unit:'so‘m',      label:'1 kg go‘sht narxi'}
        ]
      },
      {
        year:'2023-yil', tone:'green',
        growthHead:'2022-ga nisbatan o‘sish',
        rows:[
          {icon:'subsidy', value:1250,  unit:'so‘m',      label:'Har bir kg ga subsidiya',
           growth:'-50%'},
          {icon:'hen',     value:300,   unit:'ming dona', label:'Bir aylanmadagi tovuq soni',
           growth:'+36%'},
          {icon:'workers', value:200,   unit:'ta',        label:'Ishchi soni'},
          {icon:'chart',   value:90,    unit:'mlrd so‘m', label:'Yillik aylanma',
           growth:'+36%'},
          {icon:'meat',    value:4500,  unit:'tonna',     label:'Ishlab chiqarish hajmi (yiliga)',
           growth:'+36%'},
          {icon:'gear',    value:6.9,   unit:'mlrd so‘m',
           label:'Ichki yem hisobiga tannarx arzonladi (8%)'},
          {icon:'money',   value:20000, unit:'so‘m',      label:'1 kg go‘sht narxi',
           growth:'0%'}
        ]
      }
    ],

    chain:[
      {icon:'gear',   label:'Yem ishlab chiqarish'},
      {icon:'barn',   label:'Tovuq boqish'},
      {icon:'blade',  label:'So‘yish'},
      {icon:'truck',  label:'Bozorga yetkazish'}
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
    id:'2025-2026',
    layout:'compare',
    brand:'Sokin Savdo',
    title:'Klaster yanada kengaydi',
    subtitle:'Sifatli nasl + qo‘shimcha qiymat = yanada katta imkoniyatlar',

    photo:'assets/photos/2025.jpg',
    photoAlt:'Ona tovuq xo‘jaligi, bo‘laklarga bo‘lib ishlash sexi va qadoqlash',

    columns:[
      {
        year:'2025-yil', tone:'dark',
        rows:[
          /* `abs` — asl kattalik (dona). Ekranda "800 ming" ko'rinadi, lekin
             o'sish foizini tekshirish shu maydondan hisoblanadi: ikki yilda
             birlik har xil (ming / mln), xom raqamni solishtirish noto'g'ri. */
          {icon:'hen',     value:800,   unit:'ming dona', abs:800000,
           label:'Bir aylanmadagi tovuq soni'},
          {icon:'workers', value:300,   unit:'ta',        label:'Ishchi soni'},
          {icon:'chart',   value:240,   unit:'mlrd so‘m', label:'Yillik aylanma'},
          {icon:'meat',    value:12000, unit:'tonna',     label:'Ishlab chiqarish hajmi (yiliga)'},
          {icon:'tax',     value:8,     unit:'mlrd so‘m', label:'Soliq imtiyozi (2024–2025)'},
          {icon:'money',   value:20000, unit:'so‘m',      label:'1 kg go‘sht narxi'},
          {icon:'cuts',    value:null,  label:'Tovuqni bo‘laklarga bo‘lib sotish boshlandi'}
        ]
      },
      {
        year:'2026-yil', tone:'green',
        growthHead:'2025-ga nisbatan o‘sish',
        rows:[
          {icon:'hen',     value:1.5,   unit:'mln dona',  abs:1500000,
           label:'Bir aylanmadagi tovuq soni', growth:'+88%'},
          {icon:'workers', value:400,   suffix:'+', unit:'ta',
           label:'Ishchi soni (hujjatda «400 dan oshiq»)'},
          {icon:'chart',   value:450,   unit:'mlrd so‘m', label:'Yillik aylanma',
           growth:'+88%'},
          {icon:'meat',    value:22500, unit:'tonna',     label:'Ishlab chiqarish hajmi (yiliga)',
           growth:'+88%'},
          {icon:'tax',     value:31.4,  unit:'mlrd so‘m', label:'Soliq imtiyozi',
           growth:'+293%'},
          {icon:'money',   value:20000, unit:'so‘m',      label:'1 kg go‘sht narxi',
           growth:'0%'},
          {icon:'hen',     value:75,    unit:'ming bosh',
           label:'Vengriya Aviagen kompaniyasidan ona tovuq'}
        ]
      }
    ],

    /* Manba — docs/Yaratilgan_qiymat_Sokin_savdo.xlsx, "Yaratilgan qiymat
       2025-2026" varag'i, C6:C14 ("Maxsulotdagi ulush"). Foizga o'girilgan.
       Varaqdagi jami 100.4% — buyurtmachi faylidagi yaxlitlash, shuning uchun
       sahifada jami ko'rsatilmaydi. */
    centre:{
      title:'Tovuq go‘shti bo‘laklari va mahsulotdagi ulushi',
      /* 3D: tovuq bo'laklarga ajraladi va sekin aylanadi.
         three.js va GLB faqat shu sahifada yuklanadi (assets/page.js). */
      model:{gap:.30, margin:1.05, tilt:.22},
      items:[
        {label:'Akorachka',  value:13.8},
        {label:'File',       value:35.6},
        {label:'Qanot',      value:8},
        {label:'Golen',      value:7},
        {label:'Bedro',      value:12},
        {label:'Drakon',     value:12},
        {label:'Teri',       value:3},
        {label:'Karkaz',     value:5},
        {label:'Qanot uchi', value:4}
      ]
    },

    chain:[
      {icon:'hen',    label:'Ona tovuq xo‘jaligi'},
      {icon:'gear',   label:'Yem ishlab chiqarish'},
      {icon:'barn',   label:'Tovuq boqish'},
      {icon:'blade',  label:'So‘yish va qayta ishlash'},
      {icon:'cuts',   label:'Bo‘laklarga bo‘lib sotish'}
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
    id:'2026-2027',
    layout:'project',
    brand:'Sokin Savdo',
    title:'2026–2027',
    titleSuffix:'yil',
    subtitle:'Yangi bosqich — yanada katta imkoniyatlar',

    photo:'assets/photos/2026.jpg',
    photoAlt:'Yangi so‘yish va qadoqlash majmuasi — kechki ko‘rinish',

    /* Uchinchi tomon nomlari hujjatdagidek matn bilan beriladi;
       logotiplar ishlatilmaydi. */
    partners:{
      a:'Parranda Investment',
      b:'Marel',
      note:'Gollandiya — so‘yish va qadoqlash yechimlari'
    },

    invest:{
      label:'Loyihaning umumiy qiymati',
      value:35, unit:'mln $',
      cells:[
        {label:'Parranda Investment hisobidan', value:20,  unit:'mln $'},
        {label:'Soliq imtiyoz (kutilayotgan)',  value:180, unit:'mlrd so‘m'}
      ]
    },

    kpis:[
      {icon:'hen',   label:'Yillik parranda soni',    value:24,  unit:'mln bosh'},
      {icon:'meat',  label:'Go‘sht ishlab chiqarish', value:60,  unit:'ming tonna'},
      {icon:'chart', label:'Yillik aylanma (prognoz)',value:1.5, unit:'trln so‘m'},
      {icon:'tax',   label:'Soliq imtiyoz (kutilayotgan)', value:180, unit:'mlrd so‘m'}
    ],

    tracks:{
      title:'Majmuaning asosiy yo‘nalishlari',
      items:[
        {icon:'cage',    label:'Ko‘p qavatli kataklarda tovuq boqish tizimi'},
        {icon:'blade',   label:'So‘yish majmuasi', note:'Marel'},
        {icon:'pack',    label:'Qadoqlash majmuasi', note:'Marel'},
        {icon:'recycle', label:'Rendering liniyasi',
         note:'Chiqindini qayta ishlab, yemga qo‘shimcha mahsulot'}
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
    id:'istiqbol',
    layout:'plans',
    brand:'Sokin Savdo',
    title:'Istiqboldagi loyihalar',
    subtitle:'2027-yilgacha — yanada katta imkoniyatlar',
    taglines:['Sifatli mahsulot','Kuchli iqtisodiyot','Barqaror kelajak'],

    items:[
      {icon:'gear',   title:'Andijon viloyatida yem ozuqa zavodi ishlab chiqarish',
       when:'2027-yil 4-chorak', value:10,  unit:'mln $', photo:'assets/photos/plans-1.jpg'},
      {icon:'meat',   title:'Kalbasa maxsulotlari',
       when:'2027-yil 1-chorak', value:2.5, unit:'mln $', photo:'assets/photos/plans-2.jpg'},
      {icon:'hen',    title:'Ona tovuq loyihasi',
       when:'2027-yil 2-chorak', value:7,   unit:'mln $', photo:'assets/photos/plans-3.jpg'},
      {icon:'market', title:'12 ta viloyatda 500 ta savdo do‘konlari qurish',
       when:'2027-yil 4-chorak', value:7.5, unit:'mln $', photo:'assets/photos/plans-4.jpg'},
      {icon:'barn',   title:'Parranda va naslli chorva',
       when:'2027-yil 4-chorak', value:9,   unit:'mln $', photo:'assets/photos/plans-5.jpg'}
    ],

    total:{
      label:'Jami loyihalar',
      cells:[
        {icon:'money',   value:36,   unit:'mln $', label:'investitsiya'},
        {icon:'workers', value:1780, unit:'ta',    label:'ish o‘rni yaratiladi'}
      ],
      note:'Barqaror rivojlanish sari'
    }
  }];
})();
