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

  /* Har panel — bitta vektor sahna. Yil uchun keng foto berilgan bo'lsa,
     u butun bandni qoplab ustiga chiqadi (quyida stripPhoto). */
  function panelNode(p){
    var d=el('div','panel reveal');
    d.innerHTML=window.SCENES?SCENES(p.scene):'';
    return d;
  }

  /* Butun bandni qoplaydigan keng surat. Yuklanmasa vektor sahnalar qoladi. */
  function stripPhoto(y,host){
    if(!y.photo) return;
    var img=new Image();
    img.className='strip-photo';
    img.alt=y.photoAlt||'';
    img.decoding='async';
    img.addEventListener('load',function(){ host.classList.add('has-photo'); });
    img.addEventListener('error',function(){ img.remove(); });
    img.src=y.photo;
    host.appendChild(img);
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
    top.appendChild(el('div','year-badge reveal',y.title));
    right.forEach(function(s){ top.appendChild(statNode(s)); });
    page.appendChild(top);

    /* panellar, ustidagi keng foto va ular orasidagi strelkalar */
    var panels=el('div','panels');
    y.panels.forEach(function(p){ panels.appendChild(panelNode(p)); });
    stripPhoto(y,panels);
    for(var i=1;i<y.panels.length;i++){
      var a=el('div','panel-arrow panel-arrow--'+i+' reveal');
      a.innerHTML=window.ICONS?ICONS('arrow'):'';
      panels.appendChild(a);
    }
    page.appendChild(panels);

    page.appendChild(chainNode(y.chain));
    page.appendChild(el('div','footer-bar'));

    document.title=y.title+' — Sokin Savdo';

    /* navbatma-navbat ochilish */
    var order=Array.prototype.slice.call(page.querySelectorAll('.reveal'));
    order.forEach(function(n,i){ n.style.setProperty('--d',(REDUCED?0:i*70)+'ms'); });

    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        page.classList.add('ready');
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
