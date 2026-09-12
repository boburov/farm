/* Inline SVG ikonkalar — tarmoq so'rovi yo'q, offline kafolati saqlanadi.
   Hammasi 24x24 koordinatada, 1.6px chiziq, currentColor bilan bo'yaladi. */
(function(){
  var P={
    /* --- 2010-yilda bor edi --- */
    workers:'<circle cx="8" cy="7" r="2.6"/><circle cx="16.5" cy="8" r="2.1"/>'+
            '<path d="M3.2 19.5v-1.2a4.8 4.8 0 0 1 9.6 0v1.2"/>'+
            '<path d="M14.6 19.5v-1a4 4 0 0 1 6.2-3.3"/>',
    money:  '<ellipse cx="12" cy="6.6" rx="7.2" ry="2.6"/>'+
            '<path d="M4.8 6.6v3.8c0 1.44 3.22 2.6 7.2 2.6s7.2-1.16 7.2-2.6V6.6"/>'+
            '<path d="M4.8 10.4v3.8c0 1.44 3.22 2.6 7.2 2.6s7.2-1.16 7.2-2.6v-3.8"/>'+
            '<path d="M4.8 14.2V18c0 1.44 3.22 2.6 7.2 2.6s7.2-1.16 7.2-2.6v-3.8"/>',
    cycle:  '<path d="M20.2 12a8.2 8.2 0 1 1-2.6-6"/><path d="M20.4 2.6v3.8h-3.8"/>'+
            '<circle cx="12" cy="12" r="2.4"/>',
    factory:'<path d="M3 20.4h18"/><path d="M4.2 20.4V9.6l5.4 3.2V9.6l5.4 3.2V6.2h4.8v14.2"/>'+
            '<path d="M8 16.6h1.8M12.4 16.6h1.8M16.8 16.6h1.8"/>',
    truck:  '<path d="M2.6 16.4V6.6h10.2v9.8"/><path d="M12.8 9.8h3.9l3.7 3.4v3.2h-7.6"/>'+
            '<circle cx="7" cy="17.8" r="1.9"/><circle cx="17.2" cy="17.8" r="1.9"/>'+
            '<path d="M8.9 17.8h6.4M2.6 17.8h2.5"/>',
    market: '<path d="M3 9.8h18l-1.4-4.2H4.4z"/><path d="M4.6 9.8v9.6h14.8V9.8"/>'+
            '<path d="M3 9.8a2.4 2.4 0 0 0 4.5 0 2.4 2.4 0 0 0 4.5 0 2.4 2.4 0 0 0 4.5 0 2.4 2.4 0 0 0 4.5 0"/>'+
            '<path d="M9.4 19.4v-5h5.2v5"/>',

    /* --- keyinchalik qo'shildi --- */
    feed:   '<path d="M3.4 19.6h17.2"/><path d="M5.4 19.6 12 6.8l6.6 12.8"/>'+
            '<path d="M8.4 14.2h7.2"/><circle cx="12" cy="4.2" r="1.4"/>',
    hen:    '<path d="M14.6 5.4a2.4 2.4 0 1 1 3.4 3.4"/>'+
            '<path d="M17.4 8.2c1.4 1.5 2 3.4 2 5.2 0 3.5-2.9 6.2-6.6 6.2-3.9 0-6.8-2.6-6.8-6.2 0-3.3 2.3-5.9 5.6-6.4"/>'+
            '<path d="M13.2 3.4c.9 0 1.6.6 1.7 1.5"/><path d="M19.4 9.6 22 8.4"/>'+
            '<path d="M9.4 19.4v1.4M14.4 19.4v1.4"/>',
    barn:   '<path d="M3.2 20.4V8.6L12 4.2l8.8 4.4v11.8z"/><path d="M3.2 8.6h17.6"/>'+
            '<path d="M9.4 20.4v-6.2h5.2v6.2"/><path d="M12 14.2v6.2"/>',
    blade:  '<path d="M4.2 15.4 15.6 4a2.6 2.6 0 0 1 3.7 3.7L7.9 19.1"/>'+
            '<path d="M4.2 15.4 3 21l5.6-1.2"/><path d="M13.8 5.8l4.4 4.4"/>',
    cuts:   '<path d="M4.6 8.2a3.4 3.4 0 0 1 5-3 3.4 3.4 0 0 1 5.6 2"/>'+
            '<path d="M4.6 8.2c-1.3 1.4-1.8 3-1.8 4.6 0 3.4 2.6 5.8 5.6 5.8"/>'+
            '<path d="M15.2 7.2c2.2.9 3.8 3 3.8 5.6 0 3.4-2.6 5.8-5.8 5.8"/>'+
            '<path d="M12 4.6v14.2"/>',
    box:    '<path d="M3.4 7.6 12 3.4l8.6 4.2v8.8L12 20.6l-8.6-4.2z"/>'+
            '<path d="M3.4 7.6 12 11.8l8.6-4.2"/><path d="M12 11.8v8.8"/>'+
            '<path d="M7.7 5.5l8.6 4.2"/>',

    /* --- zanjir (pastki qator) --- */
    arrow:  '<path d="M4 12h14"/><path d="M13.4 6.8 18.6 12l-5.2 5.2"/>',

    /* --- rasm zonalari orasidagi jingalak (egri) strelka --- */
    curl:   '<path d="M2.8 17.6c1.4-4.2 4.3-7.2 8.1-8.4 2.6-.8 5.3-.7 7.9.3"/>'+
            '<path d="M14.2 4.4 19.4 9l-4.1 4.6"/>'
  };
  window.ICONS=function(name){
    var d=P[name]; if(!d) return '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" '+
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+d+'</svg>';
  };
})();
