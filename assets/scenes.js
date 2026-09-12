/* Panel sahnalari — brend uslubidagi vektor illyustratsiyalar.
 *
 * Bular fon fotosurati o'rnini bosadi. Haqiqiy foto qo'yilsa
 * (assets/photos/2010-1.jpg, -2, -3) sahifa avtomat uni ko'rsatadi
 * va sahna orqaga o'tadi — assets/page.js ga qarang.
 *
 * Kadr kvadrat (760x760), chunki panel ham deyarli kvadrat — `slice`
 * deyarli qirqmaydi. Butun kompozitsiya x∈[70,690] ichida turadi.
 *
 * Palitra sahifa tokenlariga mos: forest #14532d, forest-light #2e7651.
 */
(function(){
  var W=760, H=760, GROUND=520;

  var C={
    sky0:'#edf5f0', sky1:'#d3e6db',
    far:'#c4dccf', ground:'#b0d0be', groundLine:'#8cb9a1',
    light:'#eef5f1', mid:'#d3e3da', soft:'#aecdba',
    green:'#2e7651', dark:'#14532d', deep:'#0e3a20',
    meat:'#f2ddd0', meatDeep:'#e3c3b2'
  };

  function frame(id, inner){
    return '<svg class="scene" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+
      '<defs><linearGradient id="sky-'+id+'" x1="0" y1="0" x2="0" y2="1">'+
        '<stop offset="0" stop-color="'+C.sky0+'"/><stop offset="1" stop-color="'+C.sky1+'"/>'+
      '</linearGradient></defs>'+
      '<rect width="'+W+'" height="'+H+'" fill="url(#sky-'+id+')"/>'+
      /* butun kompozitsiya pastki chetdan kattalashtiriladi — kadrda
         ortiqcha bo'sh osmon qolmaydi, ufq tepaga ko'tariladi */
      '<g transform="translate(380,760) scale(1.18) translate(-380,-760)">'+
        /* uzoq tepaliklar */
        '<path d="M0 486 L140 456 L286 486 L432 452 L578 486 L760 458 L760 760 L0 760 Z" fill="'+C.far+'"/>'+
        '<rect y="'+GROUND+'" width="760" height="'+(H-GROUND)+'" fill="'+C.ground+'"/>'+
        '<rect y="'+GROUND+'" width="760" height="6" fill="'+C.groundLine+'"/>'+
        inner+
      '</g>'+
    '</svg>';
  }

  /* Odam silueti: bosh · tana · ikki oyoq. h — bo'y, baseY — oyoq osti. */
  function person(x,baseY,h,fill,arm){
    var r=h*0.105,
        headY=baseY-h+r,
        torsoTop=baseY-h+r*1.7,
        torsoBot=baseY-h*0.44,
        tw=h*0.30,
        legW=h*0.105,
        legGap=h*0.045;
    var s='<g fill="'+fill+'">'+
      '<circle cx="'+x+'" cy="'+headY+'" r="'+r+'"/>'+
      '<path d="M'+(x-tw/2)+' '+(torsoTop+tw*0.36)+
        ' a'+(tw/2)+' '+(tw*0.42)+' 0 0 1 '+tw+' 0'+
        ' L'+(x+tw*0.54)+' '+torsoBot+' L'+(x-tw*0.54)+' '+torsoBot+' Z"/>'+
      '<rect x="'+(x-legGap-legW)+'" y="'+(torsoBot-2)+'" width="'+legW+'" height="'+(baseY-torsoBot+2)+'" rx="'+(legW*0.3)+'"/>'+
      '<rect x="'+(x+legGap)+'" y="'+(torsoBot-2)+'" width="'+legW+'" height="'+(baseY-torsoBot+2)+'" rx="'+(legW*0.3)+'"/>';
    if(arm) s+='<rect x="'+(x+(arm<0?-tw*0.98:tw*0.42))+'" y="'+(torsoTop+tw*0.5)+
      '" width="'+(tw*0.56)+'" height="'+(h*0.075)+'" rx="'+(h*0.035)+'"/>';
    return s+'</g>';
  }

  /* Yashik: old tomoni panjarali — "quti" emas, "yashik" bo'lib o'qiladi. */
  function crate(x,y,w,h,fill,lid){
    var s='<g><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="5" fill="'+fill+'"/>';
    for(var i=1;i<4;i++){
      var cx=x+w*i/4;
      s+='<rect x="'+(cx-1.6)+'" y="'+(y+h*0.22)+'" width="3.2" height="'+(h*0.56)+'" rx="1.6" fill="'+C.light+'" opacity=".34"/>';
    }
    if(lid) s+='<rect x="'+(x+w*0.09)+'" y="'+(y-h*0.24)+'" width="'+(w*0.82)+'" height="'+(h*0.3)+'" rx="'+(h*0.15)+'" fill="'+lid+'"/>';
    return s+'</g>';
  }

  var S={};

  /* ---------------------------------------- 1 — ishlab chiqaruvchidan olish */
  S.producer=frame('a',
    /* ombor */
    '<path d="M148 520 V300 L380 202 L612 300 V520 Z" fill="'+C.light+'"/>'+
    '<path d="M148 300 L380 202 L612 300 Z" fill="'+C.green+'"/>'+
    '<path d="M380 202 L612 300 V520 L380 520 Z" fill="'+C.mid+'"/>'+
    /* katta eshik */
    '<rect x="316" y="378" width="128" height="142" fill="'+C.dark+'"/>'+
    '<rect x="332" y="398" width="42" height="78" fill="'+C.green+'" opacity=".45"/>'+
    '<rect x="386" y="398" width="42" height="78" fill="'+C.green+'" opacity=".45"/>'+
    /* derazalar */
    '<rect x="192" y="356" width="42" height="36" rx="3" fill="'+C.soft+'"/>'+
    '<rect x="248" y="356" width="42" height="36" rx="3" fill="'+C.soft+'"/>'+
    '<rect x="478" y="366" width="42" height="36" rx="3" fill="'+C.soft+'"/>'+
    '<rect x="534" y="366" width="42" height="36" rx="3" fill="'+C.soft+'"/>'+
    /* yon silos */
    '<rect x="624" y="322" width="62" height="198" rx="7" fill="'+C.mid+'"/>'+
    '<path d="M624 322 L655 286 L686 322 Z" fill="'+C.green+'"/>'+
    /* oldingi yashiklar */
    crate(140,586,168,60,C.dark,C.meat)+
    crate(140,652,168,60,C.deep)+
    crate(330,616,156,56,C.dark,C.meatDeep)+
    /* ishchi yashik ko'tarib turibdi */
    person(568,700,210,C.deep,+1)+
    crate(592,600,96,42,C.dark,null)
  );

  /* ------------------------------------------------------------ 2 — tashish */
  S.transport=frame('b',
    /* furgon: yon ko'rinish, orqa eshiklari ochiq */
    '<rect x="212" y="262" width="332" height="272" rx="12" fill="'+C.light+'"/>'+
    '<rect x="212" y="262" width="332" height="32" rx="12" fill="'+C.mid+'"/>'+
    '<path d="M212 284 L150 258 V538 L212 512 Z" fill="'+C.mid+'"/>'+
    '<path d="M544 284 L606 258 V538 L544 512 Z" fill="'+C.mid+'"/>'+
    /* ichki qorong'i bo'shliq */
    '<rect x="244" y="296" width="268" height="222" fill="'+C.dark+'"/>'+
    /* ichidagi yashiklar */
    crate(262,330,112,44,C.light)+
    crate(262,380,112,44,C.mid)+
    crate(262,430,112,44,C.light)+
    crate(386,356,112,44,C.mid)+
    crate(386,406,112,44,C.light)+
    crate(386,456,112,44,C.mid)+
    '<rect x="276" y="320" width="84" height="13" rx="6.5" fill="'+C.meat+'"/>'+
    '<rect x="400" y="346" width="84" height="13" rx="6.5" fill="'+C.meat+'"/>'+
    /* g'ildiraklar */
    '<circle cx="296" cy="540" r="32" fill="'+C.deep+'"/><circle cx="296" cy="540" r="13" fill="'+C.soft+'"/>'+
    '<circle cx="472" cy="540" r="32" fill="'+C.deep+'"/><circle cx="472" cy="540" r="13" fill="'+C.soft+'"/>'+
    /* ikki ishchi yashik tashiydi */
    person(122,712,206,C.deep,+1)+
    crate(146,612,92,40,C.dark,null)+
    person(654,704,198,C.deep,-1)+
    crate(538,606,92,40,C.dark,null)
  );

  /* -------------------------------------------------------------- 3 — bozor */
  S.bazaar=frame('c',
    /* rasta orqa devori */
    '<rect x="150" y="286" width="460" height="234" fill="'+C.mid+'"/>'+
    /* tent */
    '<path d="M124 286 L192 208 H568 L636 286 Z" fill="'+C.dark+'"/>'+
    '<path d="M124 286 q21 27 42 0 q21 27 42 0 q21 27 42 0 q21 27 42 0 q21 27 42 0'+
      ' q21 27 42 0 q21 27 42 0 q21 27 42 0 q21 27 42 0 q21 27 42 0 q21 27 42 0'+
      ' q21 27 42 0 z" fill="'+C.green+'"/>'+
    /* ustunlar */
    '<rect x="150" y="286" width="13" height="234" fill="'+C.soft+'"/>'+
    '<rect x="597" y="286" width="13" height="234" fill="'+C.soft+'"/>'+
    /* sotuvchi rasta ortida */
    person(520,470,168,C.dark,-1)+
    /* peshtaxta */
    '<rect x="168" y="470" width="424" height="22" rx="6" fill="'+C.dark+'"/>'+
    '<rect x="168" y="492" width="424" height="94" fill="'+C.deep+'"/>'+
    '<rect x="168" y="492" width="424" height="7" fill="'+C.green+'" opacity=".5"/>'+
    /* tovuq go'shti uyumi */
    '<g fill="'+C.meat+'">'+
      '<ellipse cx="232" cy="460" rx="48" ry="18"/>'+
      '<ellipse cx="316" cy="462" rx="44" ry="17"/>'+
      '<ellipse cx="272" cy="443" rx="42" ry="16"/>'+
      '<ellipse cx="432" cy="461" rx="45" ry="17"/>'+
      '<ellipse cx="510" cy="462" rx="38" ry="15"/>'+
      '<ellipse cx="472" cy="444" rx="37" ry="14"/>'+
    '</g>'+
    '<g fill="'+C.meatDeep+'" opacity=".7">'+
      '<ellipse cx="272" cy="437" rx="24" ry="8"/>'+
      '<ellipse cx="472" cy="438" rx="21" ry="7"/>'+
    '</g>'+
    /* tarozi */
    '<g fill="'+C.soft+'">'+
      '<rect x="350" y="424" width="54" height="13" rx="4"/>'+
      '<rect x="370" y="406" width="13" height="20"/>'+
      '<ellipse cx="377" cy="402" rx="31" ry="9"/>'+
    '</g>'+
    /* xaridor oldida, xalta ko'tarib */
    person(640,724,214,C.deep,-1)+
    '<rect x="586" y="614" width="40" height="52" rx="5" fill="'+C.dark+'"/>'
  );

  window.SCENES=function(name){ return S[name]||''; };
})();
