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
  }];
})();
