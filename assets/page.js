/* Sokin Savdo Servis — taqdimotni YEARS ma'lumotidan quradi.
 *
 * Qobiq har sahnada bir xil: tepada so'zbelgi va davr, chapga tekislangan
 * sarlavha, o'rtada kontent, pastda vaqt chizig'i. Sahna turi `layout`
 * maydoni bilan tanlanadi (single · compare · project · plans).
 *
 * Hech qanday raqam bu faylda yozilmaydi — hammasi assets/years.js dan.
 */
(function(){
  'use strict';

  var REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag,cls,text){
    var n=document.createElement(tag);
    if(cls) n.className=cls;
    if(text!=null) n.textContent=text;
    return n;
  }

  /* Vaqt chizig'i va sahifa nomi uchun yil nomi: `period` bo'sh bo'lsa id'dan olinadi. */
  function yearName(y){
    return (y.period||'').trim()||y.navLabel||y.id.replace('-','–');
  }

  /* 20000 → "20 000" (uzilmas probel), 7.5 → "7.5" */
  function fmt(v,dec){
    var r=dec?Math.round(v*10)/10:Math.round(v), p=String(r).split('.');
    p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g,' ');
    return p.join('.');
  }

  /* Raqamli qiymat: hisoblagich + birlik. `suffix` — quyi chegara belgisi. */
  function value(cls,v,unit,suffix){
    var box=el('span',cls);
    if(v==null){ box.appendChild(el('span','lr-dash','—')); return box; }
    var n=el('span',null,'0');
    n.dataset.to=String(v);
    box.appendChild(n);
    if(suffix) box.appendChild(el('span','lr-suffix',suffix));
    if(unit) box.appendChild(el('em',null,unit));
    return box;
  }

  /* ------------------------------------------------------------ qobiq --- */

  /* Tepa qator: chapda so'zbelgi, o'ngda bosqich nomi va davr yonma-yon. */
  function shellTop(y){
    var top=el('header','shell-top');
    var left=el('div','shell-left');
    left.appendChild(el('span','wordmark',y.brand||'Сокин Савдо Сервис'));
    top.appendChild(left);
    var right=el('div','shell-right');
    if(y.eyebrow) right.appendChild(el('span','shell-eyebrow',y.eyebrow));
    right.appendChild(el('span','period',y.period||y.title||y.id));
    /* logo — o'ng yuqori burchakda */
    var logo=new Image();
    logo.className='brand-logo'; logo.src='assets/logo.png'; logo.alt='';
    top.appendChild(right);
    top.appendChild(logo);
    return top;
  }

  function lede(y){
    var d=el('div','lede');
    /* Har sahifa tepasida o'z yili. Sarlavhaning o'zi yil bo'lsa (2010) — takrorlanmaydi. */
    /* yil bo'lmagan sahifada (Истиқбол) yil sarlavhasi chiqmaydi */
    if(/^\d{4}/.test(y.id)&&String(y.title||'').indexOf(y.id)!==0){
      var n=yearName(y);
      if(/^\d{4}$/.test(n)) n+='-йил';
      else if(/^\d{4}–\d{4}$/.test(n)) n+='-йиллар';
      d.appendChild(el('div','lede-year reveal',n));
    }
    var h=el('h1','lede-title reveal');
    /* `titleBold` — sarlavha boshidagi shu qism qalin yoziladi */
    var t=String(y.title||'');
    if(y.titleBold&&t.indexOf(y.titleBold)===0){
      h.appendChild(el('strong','lede-bold',y.titleBold));
      h.appendChild(document.createTextNode(t.slice(y.titleBold.length)));
    } else h.textContent=t;
    d.appendChild(h);
    if(y.subtitle) d.appendChild(el('p','lede-sub reveal',y.subtitle));
    return d;
  }

  /* Suratdagi nuqta (0..1 ulush) piksel holatiga aylantiriladi. Rasm `cover`
     bilan chizilgani uchun qirqilish har o'lchamda boshqacha — shuning uchun
     haqiqiy o'lchamlar bo'yicha qayta hisoblanadi. */
  var overlays=[];
  function placeOverlays(){
    if(!overlays.length) return;
    var host=overlays[0].node.parentNode; if(!host) return;
    var img=host.querySelector('img'),
        W=host.clientWidth, H=host.clientHeight,
        nw=(img&&img.naturalWidth)||0, nh=(img&&img.naturalHeight)||0,
        scale=nw&&nh?Math.max(W/nw,H/nh):0,
        rw=scale?nw*scale:0, originX=scale?(W-rw)/2:0;
    overlays.forEach(function(o){
      o.node.style.left=(scale?originX+o.at*rw:o.at*W)+'px';
    });
  }
  addEventListener('resize',placeOverlays);

  /* Inshoot tasviri. Surat kelmasa maydon bo'sh qoladi — sahna buzilmaydi. */
  function visual(y){
    var fig=el('figure','visual reveal');
    if(y.strip){
      fig.classList.add('visual--strip');
      y.strip.forEach(function(s){
        var cell=el('div','strip-cell');
        cell.style.flexGrow=String(s.grow||1);
        var img=new Image();
        img.alt=s.label||'';
        img.decoding='async';
        img.addEventListener('load',function(){ fig.classList.add('has-photo'); });
        img.addEventListener('error',function(){ img.remove(); });
        img.src=s.photo;
        cell.appendChild(img);
        var t=el('div','zone reveal');
        t.appendChild(el('span','zone-label',s.label));
        cell.appendChild(t);
        fig.appendChild(cell);
      });
      return fig;
    }
    if(y.photo){
      var img=new Image();
      img.alt=y.photoAlt||'';
      img.decoding='async';
      img.addEventListener('load',function(){ fig.classList.add('has-photo'); placeOverlays(); });
      img.addEventListener('error',function(){ img.remove(); });
      img.src=y.photo;
      fig.appendChild(img);
    }
    (y.zones||[]).forEach(function(z){
      var t=el('div','zone reveal');
      t.appendChild(el('span','zone-label',z.label));
      fig.appendChild(t);
      overlays.push({node:t,at:z.at});
    });
    (y.arrowsAt||[]).forEach(function(f){
      var a=el('div','flow-arrow reveal');
      a.innerHTML=window.ICONS?ICONS('swoosh'):'';
      fig.appendChild(a);
      overlays.push({node:a,at:f});
    });
    return fig;
  }

  /* Ishlab chiqarish zanjiri: kichik yozuvlar, orasida nozik bog'lovchi. */
  /* `own` — shu sahifaning o'z bosqichlari (kichik harfdagi nomlar); ular yashil. */
  function flow(steps,own){
    if(!steps||!steps.length) return null;
    var ul=el('ul','flow reveal');
    steps.forEach(function(s,i){
      if(i) ul.appendChild(el('li','is-link'));
      var mine=own&&own.indexOf(String(s.label).trim().toLowerCase())>=0;
      ul.appendChild(el('li',mine?'is-own':null,s.label));
    });
    return ul;
  }

  /* ----------------------------------------------------------- daftar --- */

  /* Ikki yil yonma-yon: ustun sarlavhalari, tekislangan qatorlar, ingichka
     chiziqlar. O'sish foizi qiymat ostida kichik izoh. Quti yo'q. */
  function ledger(y){
    var wrap=el('div','ledger');
    var a=y.columns[0], b=y.columns[1];

    var head=el('div','ledger-head reveal');
    head.appendChild(el('span','lh-metric','Кўрсаткич'));
    [a,b].forEach(function(c){
      var s=el('span',null,c.year);
      if(c.yearNote) s.appendChild(el('small','lh-note',c.yearNote));
      head.appendChild(s);
    });
    head.appendChild(el('span','lh-metric',b.growthHead?'Ўсиш':''));
    wrap.appendChild(head);

    var rows=el('ul','ledger-rows');
    a.rows.forEach(function(ra,i){
      var rb=b.rows[i]||{};
      var li=el('li','ledger-row reveal'+(ra.lead||rb.lead?' is-lead':''));
      li.appendChild(el('span','lr-metric',rb.label||ra.label));
      [ra,rb].forEach(function(r){
        var v=value('lr-val',r.value,r.unit,r.suffix);
        /* `note` — qiymat ostida kichik izoh (masalan, "12%") */
        if(r.note) v.appendChild(el('small','lr-note'+(r.noteBelow?' is-below':''),r.note));
        li.appendChild(v);
      });
      /* o'sish foizi alohida tor ustunda — qatorlar bir xil balandlikda qoladi */
      li.appendChild(el('span','lr-delta',rb.growth||''));

      rows.appendChild(li);
    });
    wrap.appendChild(rows);
    return wrap;
  }

  /* --------------------------------------------------------- 3D sahna --- */

  /* three.js va GLB FAQAT kerak bo'lgan sahnada yuklanadi. Hammasi lokal. */
  var MODEL_SRC=['assets/vendor/three.min.js','assets/vendor/GLTFLoader.js',
                 'assets/poultry-runtime.js','assets/chicken-parts.js'];
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
      var c=scene3d.renderer.domElement;
      if(c.parentNode) c.parentNode.removeChild(c);
    }
    scene3d=null;
  }

  function buildScene(host,cfg){
    var T=THREE;
    var renderer=new T.WebGLRenderer({antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
    renderer.outputEncoding=T.sRGBEncoding;
    renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.0;
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=T.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    var scene=new T.Scene();
    var camera=new T.PerspectiveCamera(28,1,.1,140);

    /* Yumshoq studiya: asosiy + to'ldiruvchi + kontur. Qiymatlar past —
       envMap yo'q, aks holda go'sht plastikdek yaltirab ketadi. */
    scene.add(new T.HemisphereLight(0xffffff,0xd6e0d6,.60));
    var key=new T.DirectionalLight(0xfffaf2,.98);
    key.position.set(1.1,7.4,3.2); key.castShadow=true;
    key.shadow.mapSize.set(1024,1024);
    key.shadow.camera.left=-7; key.shadow.camera.right=7;
    key.shadow.camera.top=7;   key.shadow.camera.bottom=-3;
    key.shadow.camera.near=.5; key.shadow.camera.far=26;
    key.shadow.bias=-.0012;
    scene.add(key);
    var fill=new T.DirectionalLight(0xdfeae2,.44); fill.position.set(-4.6,2.6,3.4); scene.add(fill);
    var rim=new T.DirectionalLight(0xffffff,.3);   rim.position.set(0,3.4,-5.4);    scene.add(rim);

    /* ko'rinmas yer — faqat kontakt soyasini qabul qiladi */
    var ground=new T.Mesh(new T.PlaneGeometry(60,60),new T.ShadowMaterial({opacity:.1}));
    ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground);

    ChickenParts.showBases(false);
    ChickenParts.mount(scene,{length:1,position:[0,0,0]});
    var info=ChickenParts.showcase({
      gap:cfg.gap||.30,
      rows:cfg.rows||2,
      rowGap:cfg.rowGap||.45,
      baseline:0
    });

    ChickenParts.root.traverse(function(o){
      if(!o.isMesh) return;
      o.castShadow=true;
      if(o.material&&o.material.color){
        o.material.color.multiplyScalar(.96);
        if(o.material.roughness!==undefined)
          o.material.roughness=Math.max(Math.min(o.material.roughness,.72),.55);
        if(o.material.metalness!==undefined) o.material.metalness=0;
      }
    });

    /* yorliqlar — haqiqiy HTML, rasm ichiga singdirilmagan */
    var labels=[], layer=el('div','model-labels');
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
      var w=host.clientWidth, h=host.clientHeight, placed=[];
      labels.forEach(function(l){
        proj.copy(l.info.bottom).project(camera);
        var x=(proj.x*.5+.5)*w, yy=(-proj.y*.5+.5)*h;
        var half=l.node.offsetWidth/2||26, row=0;
        for(var i=0;i<placed.length;i++){
          var q=placed[i];
          if(q.row===row&&Math.abs(q.y-yy)<18&&Math.abs(q.x-x)<half+q.half+6){ row=1; break; }
        }
        placed.push({x:x,y:yy,half:half,row:row});
        l.node.classList.toggle('is-row2',row===1);
        l.node.style.transform='translate(-50%,0) translate('+x+'px,'+yy+'px)';
      });
    }

    function resize(){
      var w=host.clientWidth, h=host.clientHeight;
      if(!w||!h) return;
      renderer.setSize(w,h,false);
      camera.aspect=w/h;
      ChickenParts.showcaseCamera(camera,cfg.margin||1.1,cfg.tilt!==undefined?cfg.tilt:.2);
      placeLabels();
      renderer.render(scene,camera);
    }
    resize();

    var t0=performance.now(), done=false;
    function frame(now){
      scene3d.raf=requestAnimationFrame(frame);
      var t=(now-t0)/1000;
      /* butun tovuq ko'rinadi, keyin bo'laklarga ajraladi; oxirida
         mahsulotlar QIMIRLAMAYDI — yorliqlar o'qiladi */
      var p=REDUCED?1:Math.min(1,Math.max(0,(t-.2)/3.2));
      ChickenParts.showcaseIntro(p);
      renderer.render(scene,camera);
      if(p>=1&&!done){ done=true; host.classList.add('is-settled'); placeLabels(); }
      if(p>=1){
        cancelAnimationFrame(scene3d.raf); scene3d.raf=0;
        host.dataset.anim='stopped';
      }
    }
    var ro=null;
    if(window.ResizeObserver){ ro=new ResizeObserver(resize); ro.observe(host); }
    scene3d={renderer:renderer,onResize:resize,raf:0,ro:ro};
    addEventListener('resize',resize);
    scene3d.raf=requestAnimationFrame(frame);
  }

  /* Markazdagi yaxlit tovuq — bo'laklarga ajralmaydi va AYLANMAYDI:
     yonboshdan olingan bitta tanish siluetda qotib turadi (aylanayotgan
     model atrofdagi foizlardan diqqatni tortadi). Bir marta render qilinadi,
     keyin faqat o'lcham o'zgarganda qayta chiziladi.
     Vitrina sahnasidan farqi: yorliq yo'q, asoslar yo'q, kamera butun
     tovuqning gabaritiga qarab sozlanadi. */
  function buildWholeScene(host){
    var T=THREE;
    var renderer=new T.WebGLRenderer({antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
    renderer.outputEncoding=T.sRGBEncoding;
    renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.02;
    renderer.setClearAlpha(0);
    host.appendChild(renderer.domElement);

    var scene=new T.Scene();
    var camera=new T.PerspectiveCamera(26,1,.05,60);

    scene.add(new T.HemisphereLight(0xffffff,0xd6e0d6,.66));
    var key=new T.DirectionalLight(0xfffaf2,.92); key.position.set(1.6,4.2,3.0); scene.add(key);
    var fill=new T.DirectionalLight(0xdfeae2,.42); fill.position.set(-3.4,1.8,2.6); scene.add(fill);
    var rim=new T.DirectionalLight(0xffffff,.34);  rim.position.set(0,2.4,-4.2);   scene.add(rim);

    ChickenParts.showBases(false);
    var group=ChickenParts.mount(scene,{length:1,position:[0,0,0],yaw:0});
    ChickenParts.setSpread(0);

    ChickenParts.root.traverse(function(o){
      if(!o.isMesh||!o.material) return;
      if(o.material.roughness!==undefined)
        o.material.roughness=Math.max(Math.min(o.material.roughness,.74),.56);
      if(o.material.metalness!==undefined) o.material.metalness=0;
    });

    /* Kadrni butun tovuqning o'z gabaritiga moslash: model ildizi markazga
       suriladi, kamera esa shar radiusidan kelib chiqib orqaga chekinadi. */
    var box=new T.Box3().setFromObject(ChickenParts.root),
        c=box.getCenter(new T.Vector3()),
        r=box.getBoundingSphere(new T.Sphere()).radius||.5;
    group.position.set(-c.x,-c.y,-c.z);
    /* Yonbosh ko'rinish: model ramkasida tovuq Z bo'ylab yotadi, shuning
       uchun Y bo'yicha -90° — kallasi kameraga tiralib qolmaydi. */
    var pose=new T.Group(); pose.name='chicken-whole-pose';
    pose.rotation.y=-Math.PI/2;
    scene.remove(group); pose.add(group); scene.add(pose);

    function resize(){
      var w=host.clientWidth, h=host.clientHeight;
      if(!w||!h) return;
      renderer.setSize(w,h,false);
      camera.aspect=w/h;
      /* gorizontal ko'rish burchagi ham hisobga olinadi — tor kadrda
         tovuqning boshi va dumi chetdan chiqib ketmasin */
      var vt=Math.tan(camera.fov*Math.PI/360), m=r*1.18;
      camera.position.set(0,r*.30,Math.max(m/vt,m/(vt*camera.aspect)));
      camera.lookAt(0,0,0);
      camera.updateProjectionMatrix();
      renderer.render(scene,camera);
    }
    resize();

    var ro=null;
    if(window.ResizeObserver){ ro=new ResizeObserver(resize); ro.observe(host); }
    scene3d={renderer:renderer,onResize:resize,raf:0,ro:ro};
    addEventListener('resize',resize);
  }

  function wholeModelNode(){
    var host=el('div','cuts-model');
    host.setAttribute('aria-hidden','true');   /* ma'noni halqadagi raqamlar beradi */
    loadModelScripts()
      .then(function(){ return ChickenParts.load(); })
      .then(function(){
        if(!host.isConnected) return;
        buildWholeScene(host);
        host.classList.add('is-in');
      })
      .catch(function(e){
        console.warn('3D юкланмади:',e.message);
        host.remove();                          /* halqa 3D siz ham to'liq ishlaydi */
      });
    return host;
  }

  function modelNode(cfg){
    var host=el('div','model');
    host.setAttribute('aria-label','Товуқ бўлаклари — 3D кўргазма');
    loadModelScripts()
      .then(function(){ return ChickenParts.load(); })
      .then(function(){
        if(!host.isConnected) return;
        buildScene(host,cfg);
      })
      .catch(function(e){
        console.warn('3D юкланмади:',e.message);
        host.classList.add('is-failed');
      });
    return host;
  }

  /* ------------------------------------------------- bo'laklar halqasi --- */

  /* To'qqiz bo'lak markazdagi halqa atrofida ellips bo'ylab joylashadi.
     Burchaklar qo'lda tanlangan — yozuvlar bir-birining ustiga tushmasin;
     radius koeffitsienti (r) ayrimlarini ichkariroq oladi.
     Bo'lakning kattaligi ulushiga bog'liq, lekin chiziqli emas: eng kichigi
     ham ko'rinib tursin uchun daraja 0.65. */
  var ORBIT=[{a:0,r:1.08},{a:50,r:1.02},{a:100,r:1.1},{a:145,r:1.02},{a:180,r:1.02},
             {a:215,r:1.02},{a:260,r:1.1},{a:310,r:1.02}];
  /* Ellips radiuslari va markazi — .cuts maydonining foizida. Bo'yiga
     kichikroq, markazi esa biroz tepada: pastki bo'lakning yozuvi zanjir
     qatoriga tegib ketmasin. */
  var RX=36, RY=26.5, CY=49, GAP=.8;   /* GAP — yoylar orasidagi tirqish */

  /* Markazda yaxlit 3D tovuq turadi — u bilan birga halqa ham, "100%"
     yozuvi ham ortiqcha (buyurtmachi: "borderlar, 100% kerak emas").
     false qilinsa eski halqa + foiz doirasi qaytadi. */
  var CENTRE_3D=true;

  function cutsNode(centre){
    var items=(centre.items||[]).slice().sort(function(a,b){ return b.value-a.value; }),
        total=items.reduce(function(s,c){ return s+c.value; },0),
        top=items.length?items[0].value:1,
        host=el('div','cuts'),
        acc=0;

    var parts=items.map(function(c,i){
      var o=ORBIT[i]||{a:i*40,r:1}, t=o.a*Math.PI/180,
          len=Math.max(.8,c.value/total*100-GAP),
          off=acc/total*100+GAP/2;
      acc+=c.value;
      return {
        item:c,
        x:50+RX*o.r*Math.sin(t),
        y:CY-RY*o.r*Math.cos(t),
        len:len, off:off,
        k:.34+.66*Math.pow(c.value/top,.65)
      };
    });

    /* Halqa: har yoy — pathLength=100 bo'yicha kesilgan doira. Ranglar
       quyuq yashildan sarg'ish urg'uga o'tadi (palitradan tashqariga chiqmaydi). */
    var NS='http://www.w3.org/2000/svg';
    if(!CENTRE_3D){
      var svg=document.createElementNS(NS,'svg');
      svg.setAttribute('class','cuts-donut');
      svg.setAttribute('viewBox','0 0 240 240');
      svg.setAttribute('aria-hidden','true');
      var track=document.createElementNS(NS,'circle');
      track.setAttribute('class','cuts-track');
      track.setAttribute('cx','120'); track.setAttribute('cy','120'); track.setAttribute('r','86');
      svg.appendChild(track);
      var g=document.createElementNS(NS,'g');
      g.setAttribute('transform','rotate(-90 120 120)');
      parts.forEach(function(p,i){
        var arc=document.createElementNS(NS,'circle');
        arc.setAttribute('class','cuts-arc');
        arc.setAttribute('cx','120'); arc.setAttribute('cy','120'); arc.setAttribute('r','86');
        arc.setAttribute('pathLength','100');
        /* yoyning uzunligi CSS o'zgaruvchisida — sahna ochilganda noldan
           shu qiymatgacha chiziladi (`.cuts.is-in`). */
        arc.setAttribute('stroke-dashoffset',(-p.off).toFixed(2));
        arc.style.setProperty('--len',p.len.toFixed(2));
        arc.style.setProperty('--t',(i/(parts.length-1||1)).toFixed(3));
        arc.style.setProperty('--d',(120+i*70)+'ms');
        g.appendChild(arc);
      });
      svg.appendChild(g);
      host.appendChild(svg);
    }

    /* Halqadan bo'lakka ingichka bog'lovchi — qaysi yoy kimniki ekani ko'rinsin.
       Chiziq halqa chetidan boshlanib, rasmga yetmay tugaydi. */
    var stems=document.createElementNS(NS,'svg');
    stems.setAttribute('class','cuts-stems');
    stems.setAttribute('viewBox','0 0 100 100');
    stems.setAttribute('preserveAspectRatio','none');
    stems.setAttribute('aria-hidden','true');
    parts.forEach(function(p,i){
      var dx=p.x-50, dy=p.y-CY, f0=.42, f1=.72,
          ln=document.createElementNS(NS,'line');
      ln.setAttribute('class','cuts-stem');
      ln.setAttribute('x1',(50+dx*f0).toFixed(2)); ln.setAttribute('y1',(CY+dy*f0).toFixed(2));
      ln.setAttribute('x2',(50+dx*f1).toFixed(2)); ln.setAttribute('y2',(CY+dy*f1).toFixed(2));
      ln.setAttribute('vector-effect','non-scaling-stroke');
      ln.style.setProperty('--d',(320+i*70)+'ms');
      stems.appendChild(ln);
    });
    host.insertBefore(stems,host.firstChild);

    /* Halqa markazida yaxlit 3D tovuq: bo'laklar undan kelib chiqqani
       ko'rinib tursin. Yuklanmasa host o'chadi — halqa o'z holicha qoladi. */
    host.classList.add('has-model');
    host.appendChild(wholeModelNode());

    if(!CENTRE_3D){
      var core=el('div','cuts-core');
      var num=el('b','cuts-core-num','0');
      num.dataset.to=String(Math.round(total));   /* hisoblagich noldan sanaydi */
      var top=el('span','cuts-core-top');
      top.appendChild(num);
      top.appendChild(el('i',null,'%'));
      core.appendChild(top);
      core.appendChild(el('em','cuts-core-lbl',items.length+' бўлак'));
      host.appendChild(core);
    }

    parts.forEach(function(p,i){
      /* `reveal` emas: bo'lak markazdan o'z joyiga uchib chiqadi, shuning
         uchun o'zining transform'i kerak (`--xn`/`--yn` — markazgacha masofa). */
      var fig=el('figure','cut');
      fig.style.setProperty('--x',p.x.toFixed(2)+'%');
      fig.style.setProperty('--y',p.y.toFixed(2)+'%');
      fig.style.setProperty('--xn',p.x.toFixed(2));
      fig.style.setProperty('--yn',p.y.toFixed(2));
      fig.style.setProperty('--k',p.k.toFixed(3));
      fig.style.setProperty('--d',(160+i*70)+'ms');
      if(p.item.key){
        var img=new Image();
        img.alt=p.item.label; img.decoding='async';
        img.className='cut-img';
        img.addEventListener('load',function(){ fig.classList.add('has-photo'); });
        img.addEventListener('error',function(){ img.remove(); });
        img.src='assets/photos/cuts/'+p.item.key+'.png';
        fig.appendChild(img);
      }
      var cap=el('figcaption','cut-cap');
      var pct=el('b','cut-pct','0');
      pct.dataset.to=String(p.item.value);
      var wrap=el('span','cut-pct-wrap');
      wrap.appendChild(pct);
      wrap.appendChild(el('i',null,'%'));
      cap.appendChild(wrap);
      cap.appendChild(el('em','cut-name',p.item.label));
      fig.appendChild(cap);
      host.appendChild(fig);
    });

    host.style.setProperty('--cy',CY);
    return host;
  }

  /* ---------------------------------------------------------- sahnalar --- */

  /* 2010 — yirik yil, ikki asosiy raqam, uch bosqichli hikoya surati */
  function renderSingle(y,page){
    var scene=el('div','scene');
    scene.appendChild(lede(y));

    var story=el('div','story');
    var figs=el('div','figures');
    (y.stats||[]).forEach(function(s){
      var f=el('div','figure reveal');
      f.appendChild(value('figure-value',s.value,s.unit));
      f.appendChild(el('span','figure-label',s.label));
      if(s.note) f.appendChild(el('span','figure-note',s.note));
      figs.appendChild(f);
    });
    story.appendChild(figs);
    story.appendChild(visual(y));
    scene.appendChild(story);

    var f=flow(y.chain,y.chainOwn); if(f) scene.appendChild(f);
    page.appendChild(scene);
  }

  /* Taqqoslash — chapda inshoot (yoki 3D sahna), o'ngda daftar */
  function renderCompare(y,page){
    var scene=el('div','scene');
    scene.appendChild(lede(y));

    /* Markaziy ko'rgazma: `wheel` — rasmli bo'laklar halqasi, `model` — 3D
       sahna. Ikkalasi ham bo'lmasa oddiy surat qoladi. */
    var hasWheel=!!(y.centre&&y.centre.wheel),
        hasModel=!hasWheel&&!!(y.centre&&y.centre.model);
    var split=el('div','split'+(hasWheel||hasModel?' split--model':''));

    if(hasWheel||hasModel){
      var stage=el('div','stage reveal');
      stage.appendChild(hasWheel?cutsNode(y.centre):modelNode(y.centre.model));
      if(!hasWheel&&y.centre.items&&y.centre.items.length){
        var sh=el('div','shares');
        sh.appendChild(el('p','shares-title',y.centre.title));
        var ul=el('ul','shares-list');
        y.centre.items.forEach(function(it){
          var li=el('li');
          li.appendChild(el('b',null,it.value+'%'));
          li.appendChild(el('span',null,it.label));
          ul.appendChild(li);
        });
        sh.appendChild(ul);
        stage.appendChild(sh);
      }
      if(hasWheel&&y.centre.title)
        stage.insertBefore(el('p','shares-title',y.centre.title),stage.firstChild);
      split.appendChild(stage);
    }else{
      split.appendChild(visual(y));
    }

    split.appendChild(ledger(y));
    scene.appendChild(split);

    var f=flow(y.chain,y.chainOwn); if(f) scene.appendChild(f);
    page.appendChild(scene);
  }

  /* Loyiha — chapda inshoot tasviri, o'ngda ko'rsatkichlar (boshqa
     sahnalardagi kompozitsiya bilan bir xil). Surat kengroq maydon oladi,
     raqamlar esa o'ng ustunda yirik qilib teriladi. */
  function renderProject(y,page){
    var scene=el('div','scene');
    scene.appendChild(lede(y));

    if(y.partners){
      var pr=el('div','partners reveal');
      pr.appendChild(el('span',null,y.partners.a));
      pr.appendChild(el('span','x','\u00d7'));
      pr.appendChild(el('span',null,y.partners.b));
      if(y.partners.note) pr.appendChild(el('span','note',y.partners.note));
      scene.appendChild(pr);
    }

    var split=el('div','split split--project');
    split.appendChild(visual(y));

    /* O'ng ustun: loyiha qiymati (urg'uli) + uchta ko'rsatkich, pastida
       investitsiya taqsimoti. */
    var side=el('div','pdata');

    var strip=[];
    if(y.invest) strip.push({label:y.invest.label,value:y.invest.value,
                             unit:y.invest.unit,lead:true});
    (y.kpis||[]).forEach(function(k){ strip.push(k); });

    var ms=el('div','metrics');
    strip.forEach(function(c){
      var m=el('div','metric reveal'+(c.lead?' is-lead':''));
      m.appendChild(el('span','metric-label',c.label));
      m.appendChild(value('metric-value',c.value,c.unit));
      ms.appendChild(m);
    });
    side.appendChild(ms);

    if(y.invest&&y.invest.cells&&y.invest.cells.length){
      var sub=el('div','substrip reveal');
      y.invest.cells.forEach(function(c){
        var it=el('div','subcell');
        it.appendChild(el('span','sub-label',c.label));
        it.appendChild(value('sub-value',c.value,c.unit));
        sub.appendChild(it);
      });
      side.appendChild(sub);
    }

    split.appendChild(side);
    scene.appendChild(split);

    var tracks=(y.tracks&&y.tracks.items)||[];
    if(tracks.length){
      /* Jadval: chapda yo'nalish nomi, o'ngda qiymatlar ustunlari */
      var tr=el('div','tracks reveal');
      var th=el('div','tracks-head');
      ['Лойиҳа номи','Лойиҳа хисобига қўшилган қиймат','Таннархни камайтириш ҳисобига эришилган иқтисод'].forEach(function(t){ th.appendChild(el('span',null,t)); });
      tr.appendChild(th);
      tracks.forEach(function(t){
        var row=el('div','tracks-row');
        row.appendChild(el('span','track-label',t.label));
        [t.added,t.cost].forEach(function(c){
          var v=value('lr-val',c?c.value:null,c&&c.unit);
          if(c&&c.note) v.appendChild(el('small','lr-note',c.note));
          row.appendChild(v);
        });
        tr.appendChild(row);
      });
      scene.appendChild(tr);
    }
    /* oldingi sahifalardagidek bosqichlar zanjiri — pastda */
    var f=flow(y.chain,y.chainOwn); if(f) scene.appendChild(f);
    page.appendChild(scene);
  }

  /* Rejalar — beshta ustun, pastda jami */
  function renderPlans(y,page){
    var scene=el('div','scene');
    scene.appendChild(lede(y));

    var ol=el('ol','projects');
    y.items.forEach(function(it){
      var li=el('li','project reveal');
      li.appendChild(el('h2','project-name',it.title));

      var shot=el('div','project-shot');
      if(it.photo){
        var img=new Image();
        img.alt=it.title; img.decoding='async';
        img.addEventListener('load',function(){ shot.classList.add('has-photo'); });
        img.addEventListener('error',function(){ img.remove(); });
        img.src=it.photo;
        shot.appendChild(img);
      }
      li.appendChild(shot);

      var meta=el('div','project-meta');
      meta.appendChild(el('span','project-when',it.when));
      meta.appendChild(value('project-value',it.value,it.unit));
      li.appendChild(meta);
      ol.appendChild(li);
    });
    scene.appendChild(ol);

    if(y.total){
      var t=el('section','totals reveal');
      if(y.total.label&&y.total.label.trim()) t.appendChild(el('p','totals-label',y.total.label));
      y.total.cells.forEach(function(c){
        var cell=el('div','total');
        cell.appendChild(value('total-value',c.value,c.unit));
        cell.appendChild(el('span','total-label',c.label));
        t.appendChild(cell);
      });
      if(y.total.note) t.appendChild(el('span','totals-note',y.total.note));
      scene.appendChild(t);
    }
    var f=flow(y.chain,y.chainOwn); if(f) scene.appendChild(f);
    page.appendChild(scene);
  }

  /* ------------------------------------------------------- hisoblagich --- */

  function runCounters(scope){
    var nodes=scope.querySelectorAll('[data-to]');
    Array.prototype.forEach.call(nodes,function(n,i){
      var to=parseFloat(n.dataset.to);
      if(!isFinite(to)) return;
      var dec=to%1!==0;
      if(REDUCED){ n.textContent=fmt(to,dec); return; }
      var dur=720+i*35, start=null, delay=260+i*45;
      function step(ts){
        if(start===null) start=ts;
        var t=(ts-start-delay)/dur;
        if(t<0){ requestAnimationFrame(step); return; }
        if(t>=1){ n.textContent=fmt(to,dec); return; }
        n.textContent=fmt(to*(1-Math.pow(1-t,3)),dec);
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* -------------------------------------------------- vaqt chizig'i / nav */

  var ARROW_L='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '+
    'stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 8 12l7 7"/></svg>';
  var ARROW_R='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '+
    'stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';
  var FS_ON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '+
    'stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  var FS_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '+
    'stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';

  function toggleFullscreen(){
    if(document.fullscreenElement) document.exitFullscreen();
    else if(document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  }
  function navButton(cls,label,glyph,onClick){
    var b=el('button','navbtn '+cls);
    b.type='button'; b.title=label;
    b.setAttribute('aria-label',label);
    b.innerHTML=glyph;
    b.addEventListener('click',onClick);
    return b;
  }

  function timeline(years,at,go){
    var nav=el('nav','timeline');
    nav.setAttribute('aria-label','Тақдимот босқичлари');

    var steps=el('ol','tl-steps');
    years.forEach(function(y,i){
      var li=el('li','tl-step'+(i===at?' is-current':''));
      var b=el('button','tl-btn',yearName(y));
      b.type='button';
      if(i===at) b.setAttribute('aria-current','step');
      b.addEventListener('click',function(){ go(i); });
      li.appendChild(b);
      steps.appendChild(li);
    });
    nav.appendChild(steps);

    var ctl=el('div','tl-nav');
    var prev=navButton('navbtn--prev','Олдинги босқич',ARROW_L,function(){ go(at-1); });
    var next=navButton('navbtn--next','Кейинги босқич',ARROW_R,function(){ go(at+1); });
    prev.disabled=at===0; next.disabled=at===years.length-1;
    ctl.appendChild(prev); ctl.appendChild(next);
    var fs=navButton('navbtn--fs','Тўлиқ экран',
      document.fullscreenElement?FS_OFF:FS_ON,toggleFullscreen);
    ctl.appendChild(fs);
    document.addEventListener('fullscreenchange',function(){
      if(fs.isConnected) fs.innerHTML=document.fullscreenElement?FS_OFF:FS_ON;
    });
    nav.appendChild(ctl);
    return nav;
  }

  /* ------------------------------------------------------------ render --- */

  function ensureAmbient(){
    if(document.querySelector('.ambient')) return;
    var a=el('div','ambient');
    a.setAttribute('aria-hidden','true');
    a.innerHTML='<i></i><i></i><i></i>';
    document.body.insertBefore(a,document.body.firstChild);
  }

  function render(y,years,at,go){
    var page=document.getElementById('page');
    ensureAmbient();
    disposeScene();
    overlays=[];
    page.innerHTML='';
    page.classList.remove('ready');
    page.dataset.layout=y.layout||'single';
    page.dataset.id=y.id;

    page.appendChild(shellTop(y));

    if(y.layout==='compare') renderCompare(y,page);
    else if(y.layout==='project') renderProject(y,page);
    else if(y.layout==='plans') renderPlans(y,page);
    else renderSingle(y,page);

    page.appendChild(timeline(years,at,go));

    document.title=yearName(y)+' — Сокин Савдо Сервис';

    var order=Array.prototype.slice.call(page.querySelectorAll('.reveal'));
    order.forEach(function(n,i){ n.style.setProperty('--d',(REDUCED?0:i*45)+'ms'); });

    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        page.classList.add('ready');
        var wheel=page.querySelector('.cuts');
        if(wheel) wheel.classList.add('is-in');
        placeOverlays();
        runCounters(page);
      });
    });
  }

  /* ---------------------------------------------------- sahifalar orasi --- */

  var years=window.YEARS||[];
  if(!years.length){ console.error('YEARS bo\'sh'); return; }

  /* Zanjir yig'ilib boradi: har sahifada oldingi sahifalarning `chain` bosqichlari,
     keyin o'zinikilar. Bir xil nomli bosqich qaytarilmaydi. */
  (function(){
    var acc=[];
    years.forEach(function(y){
      if(y.chain) y.chainOwn=y.chain.map(function(s){ return String(s.label).trim().toLowerCase(); });
      (y.chain||[]).forEach(function(s){
        var key=String(s.label).trim().toLowerCase();
        if(!acc.some(function(a){ return String(a.label).trim().toLowerCase()===key; })) acc.push(s);
      });
      if(y.chain) y.chain=acc.slice();
    });
  })();

  function indexFromHash(){
    var id=decodeURIComponent((location.hash||'').replace(/^#/,''));
    var i=years.findIndex(function(y){ return y.id===id; });
    return i<0?0:i;
  }
  var at=indexFromHash();

  function show(i,pushHash){
    at=Math.max(0,Math.min(years.length-1,i));
    render(years[at],years,at,go);
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
    if(e.key==='ArrowRight'&&at<years.length-1) go(at+1);
    else if(e.key==='ArrowLeft'&&at>0) go(at-1);
    else if(e.key==='Home') go(0);
    else if(e.key==='End') go(years.length-1);
    else if(e.key==='f'||e.key==='F') toggleFullscreen();
  });
})();
