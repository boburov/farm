/* Sokin Savdo — yil sahifasini YEARS ma'lumotidan quradi.
   Hech qanday raqam bu yerda yozilmaydi: hammasi assets/years.js dan keladi. */
(function(){
  'use strict';

  var REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag,cls,html){
    var n=document.createElement(tag);
    if(cls) n.className=cls;
    if(html!=null) n.innerHTML=html;
    return n;
  }
  /* 20000 → "20 000" (uzilmas probel), 7.5 → "7.5" */
  function fmt(v,dec){
    var r=dec?Math.round(v*10)/10:Math.round(v), p=String(r).split('.');
    p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g,'\u00A0');
    return p.join('.');
  }

  function icon(name,cls){
    var s=el('span',cls||'stat-icon');
    s.innerHTML=window.ICONS?ICONS(name):'';
    return s;
  }

  /* ------------------------------------------------------------ statistika */

  function statNode(s){
    var d=el('div','stat stat--'+s.side+' reveal');
    d.appendChild(icon(s.icon));
    var body=el('span','stat-body');

    /* chapda raqam tepada (3 ta / ishchi), o'ngda nom tepada (Yillik aylanma: / 200 mln so'm) */
    var value=el('span','stat-value');
    var num=el('span','stat-num','0');
    num.dataset.to=String(s.value);
    value.appendChild(num);
    if(s.unit) value.appendChild(el('span','stat-unit',s.unit));

    if(s.side==='right'){
      body.appendChild(el('span','stat-label',s.label));
      body.appendChild(value);
    }else{
      body.appendChild(value);
      body.appendChild(el('span','stat-label',s.label));
    }
    if(s.note) body.appendChild(el('span','stat-note',s.note));

    d.appendChild(body);
    return d;
  }

  /* --------------------------------------------------------------- panellar */

  /* Butun ekran foni: keng surat. Yuklanmasa orqasidagi uchta vektor sahna
     ko'rinib qoladi, shuning uchun sahifa hech qachon bo'sh chiqmaydi. */
  function backdropNode(y){
    var d=el('div','backdrop');

    var scenes=el('div','backdrop-scenes');
    (y.panels||[]).forEach(function(p){
      var s=el('div','backdrop-scene');
      s.innerHTML=window.SCENES?SCENES(p.scene):'';
      scenes.appendChild(s);
    });
    d.appendChild(scenes);

    if(y.photo){
      var img=new Image();
      img.className='backdrop-photo';
      img.alt=y.photoAlt||'';
      img.decoding='async';
      img.addEventListener('load',function(){
        d.classList.add('has-photo');
        placeOverlays();
      });
      img.addEventListener('error',function(){ img.remove(); });
      img.src=y.photo;
      d.appendChild(img);
    }
    return d;
  }

  /* Fon `cover` bilan chizilgani uchun surat ekrandan kengroq yoki balandroq
     bo'lib qirqiladi. Shu sababli suratdagi nuqta (0..1 ulush) piksel holatiga
     shu yerda, haqiqiy o'lchamlar bo'yicha qayta hisoblanadi — resize'da ham. */
  /* Pastdagi zanjir qatori `position:fixed` — oqimdan chiqadi, shuning uchun
     uning balandligi `--chain-h` orqali sahifaga qaytariladi (aks holda
     taqqoslash ustunlari uning ostiga kirib ketardi). */
  function measureChain(){
    var page=document.getElementById('page');
    if(!page) return;
    var c=page.querySelector('.chain'),
        h=(c&&getComputedStyle(c).position==='fixed')?c.offsetHeight:0;
    page.style.setProperty('--chain-h',h+'px');
  }
  addEventListener('resize',measureChain);
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(measureChain);

  var overlays=[];
  function placeOverlays(){
    if(!overlays.length) return;
    var img=document.querySelector('.backdrop-photo'),
        W=innerWidth, H=innerHeight,
        nw=(img&&img.naturalWidth)||0, nh=(img&&img.naturalHeight)||0,
        scale=nw&&nh?Math.max(W/nw,H/nh):0,
        rw=scale?nw*scale:0,
        originX=scale?(W-rw)/2:0;
    overlays.forEach(function(o){
      var host=o.node.parentNode; if(!host) return;
      /* qatlam `.page` paddingi ichida turadi — oyna koordinatasidan siljish ayriladi */
      var hostLeft=host.getBoundingClientRect().left,
          x=scale?originX+o.at*rw:o.at*W;
      o.node.style.left=(x-hostLeft)+'px';
    });
  }
  addEventListener('resize',placeOverlays);

  /* Suratdagi zonalar ustidagi yozuvlar + ular orasidagi strelkalar */
  function overlayNode(y){
    var host=el('div','overlay');
    overlays=[];

    (y.zones||[]).forEach(function(z){
      var t=el('div','zone reveal');
      t.appendChild(el('span','zone-label',z.label));
      host.appendChild(t);
      overlays.push({node:t,at:z.at});
    });

    (y.arrowsAt||[]).forEach(function(f){
      var a=el('div','flow-arrow reveal');
      a.innerHTML=window.ICONS?ICONS('swoosh'):'';
      host.appendChild(a);
      overlays.push({node:a,at:f});
    });

    return host;
  }

  /* --------------------------------------------------- taqqoslash ustuni */

  function rowNode(r,hasGrowthCol){
    var known=r.value!=null;
    var li=el('li','row reveal'+(known?'':' row--unknown'));
    li.appendChild(icon(r.icon,'row-icon'));

    var body=el('span','row-body');
    var v=el('span','row-value');
    if(known){
      /* hisoblagich faqat haqiqiy raqamda ishlaydi */
      var num=el('span',null,'0');
      num.dataset.to=String(r.value);
      v.appendChild(num);
      /* "400 dan oshiq" — aniq raqam emas, quyi chegara. Shuning uchun
         qiymat yoniga "+" qo'yiladi va bunday qatorda foiz ko'rsatilmaydi. */
      if(r.suffix) v.appendChild(el('span','row-suffix',r.suffix));
      if(r.unit) v.appendChild(el('span','row-unit',r.unit));
    }else{
      /* Hujjatda raqam yo'q — o'ylab topilmaydi, chiziqcha qo'yiladi.
         Bu STEP_1 qoidasining ko'rinadigan tomoni. */
      v.appendChild(el('span','row-dash','—'));
    }
    body.appendChild(v);
    body.appendChild(el('span','row-label',r.label));
    li.appendChild(body);

    /* ustunda o'sish bo'lsa, foizsiz qatorlar ham katak qoldiradi —
       aks holda grid ustuni siljib ketadi */
    if(hasGrowthCol) li.appendChild(el('span','row-growth',r.growth||''));
    return li;
  }

  /* ------------------------------------------------------------- 3D sahna */

  /* Tovuqning bo'laklarga sochilishi — assets/chicken-parts.js moduli.
     Skriptlar FAQAT shu kerak bo'lgan sahifada yuklanadi: boshqa sahifalar
     three.js va 4 MB GLB ni behuda ko'tarmasin. Hammasi lokal — tashqi
     so'rov yo'q, offline kafolati buzilmaydi. */
  var MODEL_SRC=[
    'assets/vendor/three.min.js',
    'assets/vendor/GLTFLoader.js',
    'assets/poultry-runtime.js',
    'assets/chicken-parts.js'
  ];
  var modelScripts=null;
  function loadModelScripts(){
    if(modelScripts) return modelScripts;
    modelScripts=MODEL_SRC.reduce(function(chain,src){
      return chain.then(function(){
        return new Promise(function(res,rej){
          var t=document.createElement('script');
          t.src=src; t.async=false;
          t.onload=res; t.onerror=function(){ rej(new Error(src)); };
          document.head.appendChild(t);
        });
      });
    },Promise.resolve());
    return modelScripts;
  }

  var scene3d=null;
  function disposeScene(){
    if(!scene3d) return;
    cancelAnimationFrame(scene3d.raf);
    removeEventListener('resize',scene3d.onResize);
    if(scene3d.ro) scene3d.ro.disconnect();
    if(window.ChickenParts&&ChickenParts.dispose) ChickenParts.dispose();
    if(scene3d.renderer){
      scene3d.renderer.dispose();
      if(scene3d.renderer.domElement.parentNode)
        scene3d.renderer.domElement.parentNode.removeChild(scene3d.renderer.domElement);
    }
    scene3d=null;
  }

  function buildScene(host,cfg){
    var T=THREE;
    var renderer=new T.WebGLRenderer({antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
    renderer.outputEncoding=T.sRGBEncoding;
    renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.02;
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=T.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    var scene=new T.Scene();
    var camera=new T.PerspectiveCamera(30,1,.1,120);

    /* yumshoq studiya yorug'ligi: asosiy + to'ldiruvchi + orqadan kontur.
       envMap yo'q, shuning uchun qiymatlar past — aks holda go'sht oqarib ketadi. */
    scene.add(new T.HemisphereLight(0xffffff,0xcfe0d6,.58));
    var key=new T.DirectionalLight(0xfff8f0,1.05);
    key.position.set(2.6,5.4,4.2);
    key.castShadow=true;
    key.shadow.mapSize.set(1024,1024);
    key.shadow.camera.left=-6; key.shadow.camera.right=6;
    key.shadow.camera.top=5; key.shadow.camera.bottom=-2;
    key.shadow.camera.near=.5; key.shadow.camera.far=20;
    key.shadow.bias=-.0012;
    scene.add(key);
    var fill=new T.DirectionalLight(0xdcebe2,.42); fill.position.set(-4.2,2.4,3); scene.add(fill);
    var rim=new T.DirectionalLight(0xffffff,.34);  rim.position.set(0,3.2,-5);   scene.add(rim);

    /* kontakt soyasi uchun ko'rinmas yer — faqat soyani qabul qiladi */
    var ground=new T.Mesh(new T.PlaneGeometry(40,40),
      new T.ShadowMaterial({opacity:.16}));
    ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground);

    ChickenParts.showBases(false);
    ChickenParts.mount(scene,{length:1,position:[0,0,0]});
    var info=ChickenParts.showcase({gap:cfg.gap||.36,baseline:0});

    ChickenParts.root.traverse(function(o){
      if(!o.isMesh) return;
      o.castShadow=true;
      if(o.material&&o.material.color){
        o.material.color.multiplyScalar(.95);
        if(o.material.roughness!==undefined)
          o.material.roughness=Math.min(o.material.roughness,.62);
      }
    });

    /* HTML yorliqlar — matn rasm ichida emas, haqiqiy DOM */
    var labels=[];
    var layer=el('div','model-labels');
    info.forEach(function(it){
      var l=el('div','model-label');
      l.title=it.full||it.name;
      l.appendChild(el('span','model-label-name',it.name));
      layer.appendChild(l);
      labels.push({node:l,info:it});
    });
    host.appendChild(layer);

    var proj=new T.Vector3();
    function placeLabels(){
      var w=host.clientWidth, h=host.clientHeight;
      var placed=[];
      labels.forEach(function(l){
        proj.copy(l.info.bottom).project(camera);
        var x=(proj.x*.5+.5)*w, y=(-proj.y*.5+.5)*h;
        /* To'qnashuvni oldini olish: qo'shni yorliq bilan kesishsa, pastki
           qatorga tushiriladi. Yo'l-yo'riq chizig'i shunda chiziladi. */
        var half=l.node.offsetWidth/2||30, row=0;
        for(var i=0;i<placed.length;i++){
          var q=placed[i];
          if(q.row===row&&Math.abs(q.x-x)<half+q.half+6){ row=1; break; }
        }
        placed.push({x:x,half:half,row:row});
        l.node.classList.toggle('is-row2',row===1);
        l.node.style.transform='translate(-50%,0) translate('+x+'px,'+y+'px)';
      });
    }

    function resize(){
      var w=host.clientWidth, h=host.clientHeight;
      if(!w||!h) return;
      renderer.setSize(w,h,false);
      camera.aspect=w/h;
      ChickenParts.showcaseCamera(camera,cfg.margin||1.2,cfg.tilt!==undefined?cfg.tilt:.24);
      placeLabels();
      renderer.render(scene,camera);   /* rAF to'xtagan bo'lsa ham yangilanadi */
    }
    resize();

    var t0=performance.now(), done=false;
    function frame(now){
      scene3d.raf=requestAnimationFrame(frame);
      var el2=(now-t0)/1000;
      /* qisqa, vazmin kirish: bo'laklar pastdan ko'tarilib joyiga o'tiradi.
         Uzluksiz aylanish YO'Q — yorliqlar o'qilishi kerak. */
      var p=REDUCED?1:Math.min(1,Math.max(0,(el2-.25)/1.5));
      ChickenParts.showcaseReveal(p);
      renderer.render(scene,camera);
      if(p>=1&&!done){ done=true; host.classList.add('is-settled'); placeLabels(); }
      if(p>=1&&!cfg.idle){
        cancelAnimationFrame(scene3d.raf); scene3d.raf=0;
        /* Sikl to'xtadi — uzluksiz aylanish yo'q, yorliqlar o'qiladi.
           Belgini QA ham, foydalanuvchi ham tekshira oladi. */
        host.dataset.anim='stopped';
      }
    }
    /* Blok balandligi CSS bilan beriladi va sahna qurilganda hali 0 bo'lishi
       mumkin — o'sha payt kamera ham, canvas ham noto'g'ri o'lchamda qolardi.
       ResizeObserver haqiqiy o'lcham paydo bo'lishi bilan qayta hisoblaydi. */
    var ro=null;
    if(window.ResizeObserver){ ro=new ResizeObserver(resize); ro.observe(host); }
    scene3d={renderer:renderer,onResize:resize,raf:0,ro:ro,host:host};
    addEventListener('resize',resize);
    scene3d.raf=requestAnimationFrame(frame);
  }

  function modelNode(cfg){
    var host=el('div','model');
    host.setAttribute('aria-label','Tovuqning bo\'laklarga ajralishi — 3D');
    loadModelScripts()
      .then(function(){ return ChickenParts.load(); })
      .then(function(){
        if(!host.isConnected) return;      /* sahifa almashib ketgan bo'lsa */
        host.classList.add('is-ready');    /* avval balandlik, keyin sahna */
        buildScene(host,cfg);
      })
      .catch(function(e){
        /* 3D yuklanmasa sahifa buzilmaydi — blok shunchaki bo'sh qoladi */
        console.warn('3D yuklanmadi:',e.message);
        host.classList.add('is-failed');
      });
    return host;
  }

  /* Ustunlar orasidagi bo'sh joyga qo'yiladigan blok (masalan tovuq
     bo'laklarining mahsulotdagi ulushi). Ixtiyoriy. */
  function centreNode(c){
    var box=el('aside','centre reveal'+(c.model?' centre--model':''));
    if(c.title) box.appendChild(el('h2','centre-title',c.title));
    if(c.model) box.appendChild(modelNode(c.model));
    var ul=el('ul','cuts');
    c.items.forEach(function(it){
      var li=el('li','cut');
      li.appendChild(el('span','cut-share',it.value+'%'));
      li.appendChild(el('span','cut-name',it.label));
      ul.appendChild(li);
    });
    box.appendChild(ul);
    if(c.note) box.appendChild(el('p','centre-note',c.note));
    return box;
  }

  function columnNode(c){
    var sec=el('section','col col--'+(c.tone||'dark'));

    var head=el('header','col-head reveal');
    head.appendChild(el('span','col-year',c.year));
    if(c.growthHead) head.appendChild(el('span','col-growth-head',c.growthHead));
    sec.appendChild(head);

    var hasGrowthCol=c.rows.some(function(r){ return r.growth!=null; });
    var ul=el('ul','rows');
    c.rows.forEach(function(r){ ul.appendChild(rowNode(r,hasGrowthCol)); });
    sec.appendChild(ul);
    return sec;
  }

  /* --------------------------------------------------------------- zanjir */

  function chainNode(steps){
    if(!steps||!steps.length) return null;
    var ul=el('ul','chain reveal');
    steps.forEach(function(step,i){
      if(i){
        var a=el('li','arrow');
        a.innerHTML=window.ICONS?ICONS('arrow'):'';
        ul.appendChild(a);
      }
      var li=el('li');
      li.appendChild(icon(step.icon,'chain-icon'));
      li.appendChild(el('span',null,step.label));
      ul.appendChild(li);
    });
    return ul;
  }

  /* ---------------------------------------------------------- hisoblagich */

  function runCounters(scope){
    var nodes=scope.querySelectorAll('[data-to]');
    Array.prototype.forEach.call(nodes,function(n,i){
      var to=parseFloat(n.dataset.to);
      if(!isFinite(to)) return;
      var dec=to%1!==0;              /* 7.5 kasr qoladi, 3000 butun sanaladi */
      if(REDUCED){ n.textContent=fmt(to,dec); return; }
      var dur=760+i*40, start=null, delay=300+i*55;
      function step(ts){
        if(start===null) start=ts;
        var t=(ts-start-delay)/dur;
        if(t<0){ requestAnimationFrame(step); return; }
        if(t>=1){ n.textContent=fmt(to,dec); return; }
        var e=1-Math.pow(1-t,3);
        n.textContent=fmt(to*e,dec);
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* --------------------------------------------------------------- render */

  /* Bitta yil: tepada ikki statistika kartasi va yil belgisi, suratda zona
     yozuvlari va oqim strelkalari. */
  function renderSingle(y,page){
    var top=el('div','top');
    var left=y.stats.filter(function(s){ return s.side!=='right'; });
    var right=y.stats.filter(function(s){ return s.side==='right'; });
    left.forEach(function(s){ top.appendChild(statNode(s)); });

    var title=el('div','title-block');
    if(y.brand) title.appendChild(el('p','brandline reveal',y.brand));
    title.appendChild(el('div','year-badge reveal',y.title));
    if(y.subtitle) title.appendChild(el('p','subtitle reveal',y.subtitle));
    top.appendChild(title);

    right.forEach(function(s){ top.appendChild(statNode(s)); });
    page.appendChild(top);

    page.appendChild(backdropNode(y));
    page.appendChild(overlayNode(y));
    var ch=chainNode(y.chain); if(ch) page.appendChild(ch);
  }

  /* Ikki yil yonma-yon: chapda o'tgan yil, o'ngda yangi yil va o'sish ustuni. */
  function renderCompare(y,page){
    var head=el('div','deck-head');
    if(y.brand) head.appendChild(el('p','brandline reveal',y.brand));
    head.appendChild(el('h1','deck-title reveal',y.title));
    if(y.subtitle) head.appendChild(el('p','subtitle reveal',y.subtitle));
    page.appendChild(head);

    page.appendChild(backdropNode(y));

    var wrap=el('div','compare');
    var cols=y.columns||[];
    if(cols[0]) wrap.appendChild(columnNode(cols[0]));
    if(y.centre) wrap.appendChild(centreNode(y.centre));
    cols.slice(1).forEach(function(c){ wrap.appendChild(columnNode(c)); });
    page.appendChild(wrap);

    var ch=chainNode(y.chain); if(ch) page.appendChild(ch);
  }

  /* Loyiha sahifasi: fon emas, gorizontal foto polosa. Tepada yil, hamkorlar
     va investitsiya kartasi; polosadan keyin ko'rsatkichlar qatori va
     majmuaning yo'nalishlari. */
  function renderProject(y,page){
    var head=el('header','proj-head');

    var yb=el('div','proj-year');
    if(y.brand) yb.appendChild(el('p','brandline reveal',y.brand));
    var badge=el('div','year-badge year-badge--wide reveal');
    badge.innerHTML='<span>'+y.title+'</span>'+
      (y.titleSuffix?'<span class="suffix">'+y.titleSuffix+'</span>':'');
    yb.appendChild(badge);
    if(y.subtitle) yb.appendChild(el('p','subtitle reveal',y.subtitle));
    head.appendChild(yb);

    if(y.partners){
      var pr=el('div','partners reveal');
      pr.appendChild(el('span','partner',y.partners.a));
      pr.appendChild(el('span','partner-x','×'));
      pr.appendChild(el('span','partner',y.partners.b));
      if(y.partners.note) pr.appendChild(el('span','partner-note',y.partners.note));
      head.appendChild(pr);
    }

    if(y.invest){
      var inv=el('div','invest reveal');
      inv.appendChild(el('p','invest-label',y.invest.label));
      var iv=el('p','invest-value');
      var n=el('span',null,'0'); n.dataset.to=String(y.invest.value);
      iv.appendChild(n);
      if(y.invest.unit) iv.appendChild(el('span','invest-unit',y.invest.unit));
      inv.appendChild(iv);
      var cells=el('ul','invest-cells');
      (y.invest.cells||[]).forEach(function(c){
        var li=el('li');
        li.appendChild(el('span','cell-label',c.label));
        var cv=el('span','cell-value');
        var cn=el('span',null,'0'); cn.dataset.to=String(c.value);
        cv.appendChild(cn);
        if(c.unit) cv.appendChild(el('span','cell-unit',c.unit));
        li.appendChild(cv);
        cells.appendChild(li);
      });
      inv.appendChild(cells);
      head.appendChild(inv);
    }
    page.appendChild(head);

    /* gorizontal foto polosa */
    var band=el('figure','band reveal');
    if(y.photo){
      var img=new Image();
      img.className='band-photo';
      img.alt=y.photoAlt||'';
      img.decoding='async';
      img.addEventListener('load',function(){ band.classList.add('has-photo'); });
      img.addEventListener('error',function(){ img.remove(); });
      img.src=y.photo;
      band.appendChild(img);
    }
    page.appendChild(band);

    if(y.kpis){
      var ul=el('ul','kpis');
      y.kpis.forEach(function(k){
        var li=el('li','kpi reveal');
        li.appendChild(icon(k.icon,'kpi-icon'));
        var b=el('span','kpi-body');
        b.appendChild(el('span','kpi-label',k.label));
        var v=el('span','kpi-value');
        var kn=el('span',null,'0'); kn.dataset.to=String(k.value);
        v.appendChild(kn);
        if(k.unit) v.appendChild(el('span','kpi-unit',k.unit));
        b.appendChild(v);
        li.appendChild(b);
        ul.appendChild(li);
      });
      page.appendChild(ul);
    }

    if(y.tracks){
      var sec=el('section','tracks');
      sec.appendChild(el('h2','tracks-title reveal',y.tracks.title));
      var ol=el('ol','track-list');
      y.tracks.items.forEach(function(t){
        var li=el('li','track reveal');
        li.appendChild(icon(t.icon,'track-icon'));
        var b=el('span','track-body');
        b.appendChild(el('span','track-label',t.label));
        if(t.note) b.appendChild(el('span','track-note',t.note));
        li.appendChild(b);
        ol.appendChild(li);
      });
      sec.appendChild(ol);
      page.appendChild(sec);
    }

    var ch2=chainNode(y.chain); if(ch2) page.appendChild(ch2);
  }

  /* Istiqboldagi loyihalar: beshta karta bir qatorda, pastda jami. */
  function renderPlans(y,page){
    var head=el('header','plans-head');

    var left=el('div','plans-title-block');
    if(y.brand) left.appendChild(el('p','brandline reveal',y.brand));
    left.appendChild(el('h1','plans-title reveal',y.title));
    if(y.subtitle) left.appendChild(el('p','subtitle reveal',y.subtitle));
    head.appendChild(left);

    if(y.taglines&&y.taglines.length){
      var tl=el('ul','taglines reveal');
      y.taglines.forEach(function(t){ tl.appendChild(el('li',null,t)); });
      head.appendChild(tl);
    }
    page.appendChild(head);

    var list=el('ol','plan-cards');
    y.items.forEach(function(it){
      var li=el('li','plan reveal');

      var top=el('div','plan-top');
      top.appendChild(icon(it.icon,'plan-icon'));
      top.appendChild(el('h2','plan-name',it.title));
      li.appendChild(top);

      /* Foto bo'lmasa karta buzilmaydi — o'rni yashil maydon bo'lib qoladi. */
      var shot=el('div','plan-shot');
      if(it.photo){
        var img=new Image();
        img.alt=it.title;
        img.decoding='async';
        img.addEventListener('load',function(){ shot.classList.add('has-photo'); });
        img.addEventListener('error',function(){ img.remove(); });
        img.src=it.photo;
        shot.appendChild(img);
      }
      li.appendChild(shot);

      var meta=el('div','plan-meta');
      meta.appendChild(el('span','plan-when',it.when));
      var v=el('span','plan-value');
      var n=el('span',null,'0'); n.dataset.to=String(it.value);
      v.appendChild(n);
      if(it.unit) v.appendChild(el('span','plan-unit',it.unit));
      meta.appendChild(v);
      li.appendChild(meta);

      if(it.bullets&&it.bullets.length){
        var ul=el('ul','plan-bullets');
        it.bullets.forEach(function(b){ ul.appendChild(el('li',null,b)); });
        li.appendChild(ul);
      }
      list.appendChild(li);
    });
    page.appendChild(list);

    if(y.total){
      var bar=el('section','plans-total reveal');
      bar.appendChild(el('p','plans-total-label',y.total.label));
      var cells=el('ul','total-cells');
      y.total.cells.forEach(function(c){
        var li=el('li');
        li.appendChild(icon(c.icon,'total-icon'));
        var b=el('span','total-body');
        var tv=el('span','total-value');
        var tn=el('span',null,'0'); tn.dataset.to=String(c.value);
        tv.appendChild(tn);
        if(c.unit) tv.appendChild(el('span','total-unit',c.unit));
        b.appendChild(tv);
        b.appendChild(el('span','total-label',c.label));
        li.appendChild(b);
        cells.appendChild(li);
      });
      bar.appendChild(cells);
      if(y.total.note){
        var nt=el('p','plans-total-note');
        nt.appendChild(icon('chart','total-icon'));
        nt.appendChild(el('span',null,y.total.note));
        bar.appendChild(nt);
      }
      page.appendChild(bar);
    }
  }

  /* Atmosfera qatlami bir marta quriladi va sahifalar almashganda qolaveradi. */
  function ensureAmbient(){
    if(document.querySelector('.ambient')) return;
    var a=el('div','ambient');
    a.setAttribute('aria-hidden','true');
    a.innerHTML='<span></span><span></span><span></span>';
    document.body.insertBefore(a,document.body.firstChild);
  }

  function render(y){
    var page=document.getElementById('page');
    ensureAmbient();
    disposeScene();              /* oldingi sahifadagi 3D to'xtatiladi */
    page.innerHTML='';
    page.classList.remove('ready');
    page.dataset.layout=y.layout||'single';
    overlays=[];

    if(y.layout==='compare') renderCompare(y,page);
    else if(y.layout==='project') renderProject(y,page);
    else if(y.layout==='plans') renderPlans(y,page);
    else renderSingle(y,page);

    document.title=(y.layout==='single'||y.layout==='plans'
                      ? y.title
                      : y.id.replace('-','–')+'-yillar')+' — Sokin Savdo';

    /* navbatma-navbat ochilish */
    var order=Array.prototype.slice.call(page.querySelectorAll('.reveal'));
    order.forEach(function(n,i){ n.style.setProperty('--d',(REDUCED?0:i*70)+'ms'); });

    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        page.classList.add('ready');
        measureChain();
        placeOverlays();
        runCounters(page);
      });
    });
  }

  /* ------------------------------------------------------- sahifalar orasi */

  /* Manzil satridagi hash sahifani belgilaydi: /#2022-2023.
     Shunda to'g'ridan-to'g'ri ochish, yangilash va brauzerning orqaga/oldinga
     tugmalari ishlaydi; havolani birovga yuborsa ham o'sha sahifa ochiladi. */
  function navButton(cls,label,glyph,onClick){
    var b=el('button','navbtn '+cls);
    b.type='button';
    b.setAttribute('aria-label',label);
    b.title=label;
    b.innerHTML=glyph;
    b.addEventListener('click',onClick);
    return b;
  }

  var ARROW_L='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '+
    'stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 8 12l7 7"/></svg>';
  var ARROW_R='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '+
    'stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';
  var FS_ON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '+
    'stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  var FS_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '+
    'stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';

  function toggleFullscreen(){
    if(document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen();
  }

  function pagerNode(years,at,go){
    if(years.length<2) return null;
    var nav=el('nav','pager');
    nav.setAttribute('aria-label','Sahifalar');

    nav.appendChild(navButton('navbtn--prev','Oldingi sahifa',ARROW_L,function(){ go(at-1); }));

    var dots=el('div','dots');
    years.forEach(function(y,i){
      var b=el('button','dot'+(i===at?' is-current':''));
      b.type='button';
      b.title=y.title||y.id;
      b.setAttribute('aria-label',(y.title||y.id)+' sahifasi');
      if(i===at) b.setAttribute('aria-current','true');
      b.addEventListener('click',function(){ go(i); });
      dots.appendChild(b);
    });
    nav.appendChild(dots);

    nav.appendChild(navButton('navbtn--next','Keyingi sahifa',ARROW_R,function(){ go(at+1); }));

    var fs=navButton('navbtn--fs','To‘liq ekran',
      document.fullscreenElement?FS_OFF:FS_ON,toggleFullscreen);
    nav.appendChild(fs);
    document.addEventListener('fullscreenchange',function(){
      if(fs.isConnected) fs.innerHTML=document.fullscreenElement?FS_OFF:FS_ON;
    });

    nav.querySelector('.navbtn--prev').disabled=at===0;
    nav.querySelector('.navbtn--next').disabled=at===years.length-1;
    return nav;
  }

  var years=window.YEARS||[];
  if(!years.length){ console.error('YEARS bo\'sh'); return; }

  function indexFromHash(){
    var id=decodeURIComponent((location.hash||'').replace(/^#/,''));
    var i=years.findIndex(function(y){ return y.id===id; });
    return i<0?0:i;
  }

  var at=indexFromHash();

  function show(i,pushHash){
    at=Math.max(0,Math.min(years.length-1,i));
    render(years[at]);
    var page=document.getElementById('page'),
        nav=pagerNode(years,at,go);
    if(nav) page.appendChild(nav);
    if(pushHash){
      var want='#'+years[at].id;
      if(location.hash!==want) location.hash=want;
    }
  }
  function go(i){ show(i,true); }

  show(at,false);
  if(!location.hash) history.replaceState(null,'','#'+years[at].id);

  addEventListener('hashchange',function(){
    var i=indexFromHash();
    if(i!==at) show(i,false);
  });

  addEventListener('keydown',function(e){
    if(years.length<2) return;
    if(e.key==='ArrowRight'&&at<years.length-1) go(at+1);
    else if(e.key==='ArrowLeft'&&at>0) go(at-1);
    else if(e.key==='Home') go(0);
    else if(e.key==='End') go(years.length-1);
    else if(e.key==='f'||e.key==='F') toggleFullscreen();
  });
})();
