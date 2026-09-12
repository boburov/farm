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

  /* --------------------------------------------------------------- zanjir */

  function chainNode(steps){
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
    var nodes=scope.querySelectorAll('.stat-num');
    Array.prototype.forEach.call(nodes,function(n,i){
      var to=parseFloat(n.dataset.to);
      if(!isFinite(to)) return;
      if(REDUCED){ n.textContent=String(to); return; }
      var dur=1000+i*120, start=null, delay=420+i*160;
      function step(ts){
        if(start===null) start=ts;
        var t=(ts-start-delay)/dur;
        if(t<0){ requestAnimationFrame(step); return; }
        if(t>=1){ n.textContent=String(to); return; }
        var e=1-Math.pow(1-t,3);
        n.textContent=String(Math.round(to*e));
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* --------------------------------------------------------------- render */

  function render(y){
    var page=document.getElementById('page');
    page.innerHTML='';
    page.classList.remove('ready');

    /* yuqori qator: chap statistika · yil · o'ng statistika */
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

    /* butun ekran foni + ustidagi zona yozuvlari va oqim strelkalari */
    page.appendChild(backdropNode(y));
    page.appendChild(overlayNode(y));

    page.appendChild(chainNode(y.chain));

    document.title=y.title+' — Sokin Savdo';

    /* navbatma-navbat ochilish */
    var order=Array.prototype.slice.call(page.querySelectorAll('.reveal'));
    order.forEach(function(n,i){ n.style.setProperty('--d',(REDUCED?0:i*70)+'ms'); });

    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        page.classList.add('ready');
        placeOverlays();
        runCounters(page);
      });
    });
  }

  var years=window.YEARS||[], at=0;
  if(!years.length){ console.error('YEARS bo\'sh'); return; }
  render(years[at]);

  /* bir nechta yil qo'shilganda o'qlar ishlaydi */
  addEventListener('keydown',function(e){
    if(years.length<2) return;
    if(e.key==='ArrowRight'&&at<years.length-1) render(years[++at]);
    else if(e.key==='ArrowLeft'&&at>0) render(years[--at]);
  });
})();
