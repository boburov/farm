/* Inline SVG ikonkalar — tarmoq so'rovi yo'q, offline kafolati saqlanadi.
 *
 * Ikki oila:
 *   FILL — buyurtmachi referensidagi uslub: qalin, yaxlit piktogrammalar.
 *          Sahifada ishlatiladigan hammasi shu yerda.
 *   LINE — nozik konturli variantlar. Hozir ishlatilmaydi, keyingi yillar
 *          (yem, parchalash, qadoqlash) uchun tayyor turibdi.
 * Bir nom ikkala oilada bo'lsa FILL ustun turadi.
 *
 * Hammasi 24x24 koordinatada (strelkalardan tashqari), currentColor bilan.
 * Diqqat: FILL ichidagi ildiz `fill="currentColor"` — stroke bilan chizilgan
 * yordamchi chiziqlarga albatta `fill="none"` yozish kerak, aks holda ochiq
 * kontur to'lib ketadi.
 */
(function(){

  /* ---------------------------------------------------- to'ldirilgan oila */
  var FILL={

    /* uch ishchi — o'rtadagisi oldinda, kattaroq */
    workers:'<circle cx="5.4" cy="7.6" r="2.5"/>'+
            '<path d="M1.2 20.2v-3.3a4.2 4.2 0 0 1 8.4 0v3.3z"/>'+
            '<circle cx="18.6" cy="7.6" r="2.5"/>'+
            '<path d="M14.4 20.2v-3.3a4.2 4.2 0 0 1 8.4 0v3.3z"/>'+
            '<circle cx="12" cy="5.6" r="3.1"/>'+
            '<path d="M6.6 21.4v-4.6a5.4 5.4 0 0 1 10.8 0v4.6z"/>',

    /* tanga ustuni — narx */
    money:  '<ellipse cx="12" cy="5.4" rx="7.6" ry="2.7"/>'+
            '<path d="M4.4 8.1c0 1.5 3.4 2.7 7.6 2.7s7.6-1.2 7.6-2.7v2.6c0 1.5-3.4 2.7-7.6 2.7'+
              'S4.4 12.2 4.4 10.7z"/>'+
            '<path d="M4.4 13.1c0 1.5 3.4 2.7 7.6 2.7s7.6-1.2 7.6-2.7v2.6c0 1.5-3.4 2.7-7.6 2.7'+
              'S4.4 17.2 4.4 15.7z"/>'+
            '<path d="M4.4 18.1c0 1.5 3.4 2.7 7.6 2.7s7.6-1.2 7.6-2.7v1.5c0 1.5-3.4 2.7-7.6 2.7'+
              'S4.4 21.1 4.4 19.6z"/>',

    /* pul dastasi — kredit */
    cash:   '<path d="M2 6.4h16.4v9.4H2z"/>'+
            '<rect x="4.4" y="8.8" width="11.6" height="4.6" rx="2.3" fill="#fff" opacity=".5"/>'+
            '<path d="M4 17.2h16.4v1.9H4z"/>'+
            '<path d="M6 20.4h16v1.9H6z"/>',

    /* tovuq silueti — bir aylanmadagi bosh soni.
       Bo'yin ataylab alohida: bosh bevosita tanaga tegib tursa, ikki dumaloq
       qo'shilib ketadi va siluet tovuqqa emas, boshqa hayvonga o'xshab qoladi. */
    hen:    '<path d="M6.2 10.8 2.3 4.9l.6 5.7-2.7 1.4 5.3 1.8z"/>'+        /* dum */
            '<ellipse cx="11.5" cy="14.3" rx="6.4" ry="5"/>'+               /* tana */
            '<path d="M14.5 11.4c-.5-2.3.5-4.2 2.6-5l2.3 3.5z"/>'+          /* bo'yin */
            '<circle cx="17.7" cy="5.7" r="2.9"/>'+                         /* bosh */
            '<path d="M20.5 5 23.9 6.1l-3.4 1.8z"/>'+                       /* tumshuq */
            '<path d="M15.3 3a1.4 1.4 0 1 1 2-1.2 1.4 1.4 0 1 1 2.2 1z"/>'+ /* taroq */
            '<circle cx="18.6" cy="5.2" r=".75" fill="#fff"/>'+
            '<path d="M9.4 19.2v2.4M13.6 19.2v2.4" fill="none" stroke="currentColor" '+
              'stroke-width="1.8" stroke-linecap="round"/>',

    /* o'sish grafigi — yillik aylanma */
    chart:  '<path d="M2.4 20.4h19.2v1.9H2.4z"/>'+
            '<path d="M4.4 13.4h3.4v6H4.4zM9.6 10.2H13v9.2H9.6zM14.8 6.6h3.4v12.8h-3.4z"/>'+
            '<path d="M4.9 9.2 10 5.4l3.4 2.5 5.2-4.7" fill="none" stroke="currentColor" '+
              'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'+
            '<path d="M14.9 2.2h4.6v4.4z"/>',

    /* go'sht kesimi — ishlab chiqarish hajmi.
       Faqat blob "zaytun"ga o'xshaydi; shaklni go'sht qiladigan narsa —
       ichidagi oq SUYAK. Koordinatalar absolyut, shunda kadrni to'la egallaydi. */
    meat:   '<path d="M2.6 12.1c0-4.3 4-7.7 9.2-7.7 5.5 0 9.6 3 9.6 7.1 0 4.6-4.3 8.1-9.9 8.1'+
              '-5.2 0-8.9-3-8.9-7.5z"/>'+
            '<path d="M15.9 8.8h1.7v6.6h-1.7z" fill="#fff" opacity=".72"/>'+
            '<circle cx="16.75" cy="8.5" r="1.45" fill="#fff" opacity=".72"/>'+
            '<circle cx="16.75" cy="15.7" r="1.45" fill="#fff" opacity=".72"/>'+
            '<ellipse cx="8.6" cy="11.6" rx="2.8" ry="2" fill="#fff" opacity=".32" '+
              'transform="rotate(-15 8.6 11.6)"/>',

    /* ishlab chiqaruvchi: ombor + tovuq belgisi */
    factory:'<path d="M2.2 21.4V9.1l5.3 3.1V9.1l5.3 3.1V5.4h8.9v16z"/>'+
            '<rect x="4.6" y="16.4" width="2.2" height="3" fill="#fff" opacity=".5"/>'+
            '<rect x="9.1" y="16.4" width="2.2" height="3" fill="#fff" opacity=".5"/>'+
            '<rect x="14.6" y="16.4" width="2.2" height="3" fill="#fff" opacity=".5"/>'+
            '<rect x="18.1" y="16.4" width="2.2" height="3" fill="#fff" opacity=".5"/>'+
            '<path d="M16.8 8.1a1.5 1.5 0 1 1 2.1 2.1c.7.8 1 1.8 1 2.7 0 1.8-1.5 3-3.4 3'+
              's-3.4-1.3-3.4-3.1c0-1.7 1.2-2.9 2.9-3.2z" fill="#fff" opacity=".55"/>',

    /* tovuqxona — boqish */
    barn:   '<path d="M12 3.1 22.2 8.3v2H1.8v-2z"/>'+
            '<path d="M3.7 10.9h16.6v9.9H3.7z"/>'+
            '<path d="M9.3 20.8v-6.1h5.4v6.1z" fill="#fff" opacity=".55"/>',

    /* qassob pichog'i — so'yish. Uchi chapda, dastasi o'ngda. */
    blade:  '<path d="M1.5 13.6 12.9 5.7v7.9z"/>'+                 /* tig' */
            '<path d="M12.9 5.7h2.4v7.9h-2.4z"/>'+                 /* tovon */
            '<rect x="15.3" y="7.9" width="7.2" height="3.3" rx="1.65"/>'+  /* dasta */
            '<circle cx="17.6" cy="9.55" r=".55" fill="#fff" opacity=".6"/>'+
            '<circle cx="20.2" cy="9.55" r=".55" fill="#fff" opacity=".6"/>',

    /* yuk mashinasi — tashish */
    truck:  '<path d="M1.4 5.6h11.9v10.9H1.4z"/>'+
            '<path d="M13.3 8.9h3.9l3.8 3.6v4h-7.7z"/>'+
            '<circle cx="6.4" cy="18.4" r="2.4"/>'+
            '<circle cx="17.2" cy="18.4" r="2.4"/>',

    /* bozor rastasi: tepada to'lqinli tent, ostida peshtaxta.
       Tent va rasta orasida bo'shliq qoldirilgan, aks holda bir xil rangdagi
       ikki shakl qo'shilib, bitta quti bo'lib ko'rinadi. */
    market: '<path d="M1.1 9.2 3.3 3.4h17.4l2.2 5.8z"/>'+
            '<path d="M1.1 9.2q2.2 3 4.4 0 2.2 3 4.4 0 2.2 3 4.4 0 2.2 3 4.4 0 2.2 3 4.3 0z"/>'+
            '<path d="M3.9 13.2h16.2v7.4H3.9z"/>'+
            '<rect x="2.9" y="12" width="18.2" height="2" rx=".7"/>'+
            '<rect x="9.3" y="15.4" width="5.4" height="5.2" fill="#fff" opacity=".55"/>'
  };

  /* ------------------------------------------- chiziqli oila (zaxirada) -- */
  var LINE={
    cycle:  '<path d="M20.2 12a8.2 8.2 0 1 1-2.6-6"/><path d="M20.4 2.6v3.8h-3.8"/>'+
            '<circle cx="12" cy="12" r="2.4"/>',
    feed:   '<path d="M3.4 19.6h17.2"/><path d="M5.4 19.6 12 6.8l6.6 12.8"/>'+
            '<path d="M8.4 14.2h7.2"/><circle cx="12" cy="4.2" r="1.4"/>',
    cuts:   '<path d="M4.6 8.2a3.4 3.4 0 0 1 5-3 3.4 3.4 0 0 1 5.6 2"/>'+
            '<path d="M4.6 8.2c-1.3 1.4-1.8 3-1.8 4.6 0 3.4 2.6 5.8 5.6 5.8"/>'+
            '<path d="M15.2 7.2c2.2.9 3.8 3 3.8 5.6 0 3.4-2.6 5.8-5.8 5.8"/>'+
            '<path d="M12 4.6v14.2"/>',
    box:    '<path d="M3.4 7.6 12 3.4l8.6 4.2v8.8L12 20.6l-8.6-4.2z"/>'+
            '<path d="M3.4 7.6 12 11.8l8.6-4.2"/><path d="M12 11.8v8.8"/>'
  };

  /* Zanjir qatoridagi qalin strelka — referensdagidek yaxlit yashil. */
  var ARROW=
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">'+
      '<path d="M2.6 9.7h11.1V5.2L22.4 12l-8.7 6.8v-4.5H2.6z"/>'+
    '</svg>';

  /* Fon suratidagi zonalar orasidagi qalin egri strelka — yaxlit, uchi keng
     uchburchak. Alohida viewBox, chunki u keng va past. */
  var SWOOSH=
    '<svg viewBox="0 0 126 56" fill="none" aria-hidden="true" focusable="false">'+
      '<path d="M6 47C24 15 58 4 90 21" stroke="currentColor" stroke-width="13" '+
        'stroke-linecap="round"/>'+
      '<path d="M118.9 38.2 86.2 40.1 102.2 10.1Z" fill="currentColor"/>'+
    '</svg>';

  window.ICONS=function(name){
    if(name==='swoosh') return SWOOSH;
    if(name==='arrow')  return ARROW;
    if(FILL[name]){
      return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" '+
             'focusable="false">'+FILL[name]+'</svg>';
    }
    var d=LINE[name]; if(!d) return '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" '+
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" '+
           'focusable="false">'+d+'</svg>';
  };
})();
