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
  }];
})();
