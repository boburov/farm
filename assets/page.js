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
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
    renderer.outputEncoding=T.sRGBEncoding;
    renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.toneMappingExposure=.98;
    host.appendChild(renderer.domElement);

    var scene=new T.Scene();
    var camera=new T.PerspectiveCamera(34,1,.1,120);

    /* envMap yo'q — yorug'lik ataylab yumshoq, aks holda go'sht oqarib ketadi */
    scene.add(new T.HemisphereLight(0xf2f8f4,0xb9cfc2,.62));
    var key=new T.DirectionalLight(0xffffff,.95); key.position.set(4,8,6); scene.add(key);
    var fill=new T.DirectionalLight(0xcfe2d6,.38);
    fill.position.set(-6,3,-5); scene.add(fill);
    var rim=new T.DirectionalLight(0xffffff,.3);
    rim.position.set(0,4,-8); scene.add(rim);

    /* asoslarsiz: kichik oq panelda to'q yashil kursilar ortiqcha */
    ChickenParts.showBases(false);
    ChickenParts.mount(scene,{
      length:cfg.length||1,
      ringRadius:cfg.ringRadius||1.25,  /* kichik kadrda bo'laklar yaqinroq tursin */
      position:[0,0,0]
    });

    /* Go'sht tabiiy ravishda och — oq panelda yo'qolmasligi uchun materiallar
       biroz to'qlashtiriladi (envMap yo'q, aks-nur ham yo'q). */
    ChickenParts.root.traverse(function(o){
      if(!o.isMesh||!o.material||!o.material.color) return;
      o.material.color.multiplyScalar(.93);
      if(o.material.roughness!==undefined) o.material.roughness=Math.min(o.material.roughness,.58);
    });

    var radius=cfg.radius||4.8, height=cfg.height||2.5, look=cfg.look||.28;
    function resize(){
      var w=host.clientWidth, h=host.clientHeight;
      if(!w||!h) return;
      renderer.setSize(w,h,false);
      camera.aspect=w/h; camera.updateProjectionMatrix();
    }
    resize();

    var t0=performance.now(), spin=cfg.spin!==false&&!REDUCED;
    function frame(now){
      scene3d.raf=requestAnimationFrame(frame);
      var el=(now-t0)/1000;
      /* avval sochiladi, keyin sekin aylanadi */
      var spread=REDUCED?1:Math.min(1,Math.max(0,(el-.35)/2.2));
      ChickenParts.setSpread(spread);
      var a=(cfg.yaw||.7)+(spin?el*.16:0);
      camera.position.set(Math.sin(a)*radius,height,Math.cos(a)*radius);
      camera.lookAt(0,look,0);
      renderer.render(scene,camera);
    }
    scene3d={renderer:renderer,onResize:resize,raf:0};
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
        buildScene(host,cfg);
        host.classList.add('is-ready');
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

  function render(y){
    var page=document.getElementById('page');
    disposeScene();              /* oldingi sahifadagi 3D to'xtatiladi */
    page.innerHTML='';
    page.classList.remove('ready');
    page.dataset.layout=y.layout||'single';
    overlays=[];

    if(y.layout==='compare') renderCompare(y,page);
    else if(y.layout==='project') renderProject(y,page);
    else renderSingle(y,page);

    document.title=(y.layout==='single'?y.title:y.id.replace('-','–')+'-yillar')+
                   ' — Sokin Savdo';

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
  function pagerNode(years,at,go){
    if(years.length<2) return null;
    var nav=el('nav','pager');
    nav.setAttribute('aria-label','Sahifalar');
    years.forEach(function(y,i){
      var b=el('button','dot'+(i===at?' is-current':''));
      b.type='button';
      b.title=y.title||y.id;
      b.setAttribute('aria-label',(y.title||y.id)+' sahifasi');
      if(i===at) b.setAttribute('aria-current','true');
      b.addEventListener('click',function(){ go(i); });
      nav.appendChild(b);
    });
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
  });
})();
