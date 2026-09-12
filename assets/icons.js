/* Inline SVG ikonkalar — tarmoq so'rovi yo'q, offline kafolati saqlanadi.
 *
 * Ikki oila:
 *   TO'LDIRILGAN (fill) — buyurtmachi referensidagi uslub: qalin, yaxlit
 *     piktogrammalar. Statistika kartalari va pastki zanjir shularni ishlatadi.
 *   CHIZIQLI (stroke)   — nozikroq variantlar, kerak bo'lsa qoladi.
 *
 * Hammasi 24x24 koordinatada (strelkalardan tashqari), currentColor bilan.
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

    /* tanga ustuni */
    money:  '<ellipse cx="12" cy="5.4" rx="7.6" ry="2.7"/>'+
            '<path d="M4.4 8.1c0 1.5 3.4 2.7 7.6 2.7s7.6-1.2 7.6-2.7v2.6c0 1.5-3.4 2.7-7.6 2.7'+
              'S4.4 12.2 4.4 10.7z"/>'+
            '<path d="M4.4 13.1c0 1.5 3.4 2.7 7.6 2.7s7.6-1.2 7.6-2.7v2.6c0 1.5-3.4 2.7-7.6 2.7'+
              'S4.4 17.2 4.4 15.7z"/>'+
            '<path d="M4.4 18.1c0 1.5 3.4 2.7 7.6 2.7s7.6-1.2 7.6-2.7v1.5c0 1.5-3.4 2.7-7.6 2.7'+
              'S4.4 21.1 4.4 19.6z"/>',

    /* ishlab chiqaruvchi: ombor + tovuq belgisi */
    factory:'<path d="M2.2 21.4V9.1l5.3 3.1V9.1l5.3 3.1V5.4h8.9v16z"/>'+
            '<rect x="4.6" y="16.4" width="2.2" height="3" fill="#fff" opacity=".5"/>'+
            '<rect x="9.1" y="16.4" width="2.2" height="3" fill="#fff" opacity=".5"/>'+
            '<rect x="14.6" y="16.4" width="2.2" height="3" fill="#fff" opacity=".5"/>'+
            '<rect x="18.1" y="16.4" width="2.2" height="3" fill="#fff" opacity=".5"/>'+
            '<path d="M16.8 8.1a1.5 1.5 0 1 1 2.1 2.1c.7.8 1 1.8 1 2.7 0 1.8-1.5 3-3.4 3'+
              's-3.4-1.3-3.4-3.1c0-1.7 1.2-2.9 2.9-3.2z" fill="#fff" opacity=".55"/>',

    /* yuk mashinasi */
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

  /* -------------------------------------------------------- chiziqli oila */
  var LINE={
    cycle:  '<path d="M20.2 12a8.2 8.2 0 1 1-2.6-6"/><path d="M20.4 2.6v3.8h-3.8"/>'+
            '<circle cx="12" cy="12" r="2.4"/>',
    feed:   '<path d="M3.4 19.6h17.2"/><path d="M5.4 19.6 12 6.8l6.6 12.8"/>'+
            '<path d="M8.4 14.2h7.2"/><circle cx="12" cy="4.2" r="1.4"/>',
    hen:    '<path d="M14.6 5.4a2.4 2.4 0 1 1 3.4 3.4"/>'+
            '<path d="M17.4 8.2c1.4 1.5 2 3.4 2 5.2 0 3.5-2.9 6.2-6.6 6.2-3.9 0-6.8-2.6-6.8-6.2'+
              ' 0-3.3 2.3-5.9 5.6-6.4"/>'+
            '<path d="M13.2 3.4c.9 0 1.6.6 1.7 1.5"/><path d="M19.4 9.6 22 8.4"/>',
    barn:   '<path d="M3.2 20.4V8.6L12 4.2l8.8 4.4v11.8z"/><path d="M3.2 8.6h17.6"/>'+
            '<path d="M9.4 20.4v-6.2h5.2v6.2"/>',
    blade:  '<path d="M4.2 15.4 15.6 4a2.6 2.6 0 0 1 3.7 3.7L7.9 19.1"/>'+
            '<path d="M4.2 15.4 3 21l5.6-1.2"/><path d="M13.8 5.8l4.4 4.4"/>',
    cuts:   '<path d="M4.6 8.2a3.4 3.4 0 0 1 5-3 3.4 3.4 0 0 1 5.6 2"/>'+
            '<path d="M4.6 8.2c-1.3 1.4-1.8 3-1.8 4.6 0 3.4 2.6 5.8 5.6 5.8"/>'+
            '<path d="M15.2 7.2c2.2.9 3.8 3 3.8 5.6 0 3.4-2.6 5.8-5.8 5.8"/>'+
            '<path d="M12 4.6v14.2"/>',
    box:    '<path d="M3.4 7.6 12 3.4l8.6 4.2v8.8L12 20.6l-8.6-4.2z"/>'+
            '<path d="M3.4 7.6 12 11.8l8.6-4.2"/><path d="M12 11.8v8.8"/>',
  };

  /* Zanjir qatoridagi qalin strelka — referensdagidek yaxlit yashil. */
  var ARROW=
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">'+
      '<path d="M2.6 9.7h11.1V5.2L22.4 12l-8.7 6.8v-4.5H2.6z"/>'+
    '</svg>';

  /* Fon suratidagi zonalar orasidagi qalin egri strelka — referensdagidek
     yaxlit, uchi keng uchburchak. Alohida viewBox, chunki u keng va past. */
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
