/* Sokin Savdo Servis — bosh sahifa (muqova).
 *
 * Manzil bo'sh yoki #home bo'lsa ko'rinadi; "Бошлаш" tugmasi (yoki Enter /
 * o'ng strelka) uni yopib, birinchi yilga o'tkazadi. Taqdimot ichidagi logo
 * bosilsa muqova qayta ochiladi. page.js dan OLDIN yuklanadi — boshlang'ich
 * manzilni u o'zgartirmasidan oldin o'qish uchun.
 */
(function(){
  'use strict';

  var FIRST='2010';
  var initial=(location.hash||'').replace(/^#/,'');
  var cover=document.getElementById('home');
  if(!cover) return;

  function open(){
    cover.hidden=false;
    /* keyingi kadrda — animatsiya boshidan o'ynasin */
    cover.classList.remove('is-in','is-out');
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ cover.classList.add('is-in'); }); });
    var b=cover.querySelector('.home-start'); if(b) b.focus({preventScroll:true});
  }
  function close(){
    cover.classList.add('is-out');
    setTimeout(function(){ cover.hidden=true; cover.classList.remove('is-in','is-out'); },520);
    if(location.hash==='#home'||!location.hash) location.hash='#'+FIRST;
  }

  cover.querySelector('.home-start').addEventListener('click',close);

  /* muqova ochiq paytda strelkalar orqadagi sahifani varaqlamasin */
  addEventListener('keydown',function(e){
    if(cover.hidden) return;
    if(e.key==='Enter'||e.key===' '||e.key==='ArrowRight'){ e.preventDefault(); close(); }
    e.stopImmediatePropagation();
  },true);

  addEventListener('hashchange',function(){
    if(location.hash==='#home'&&cover.hidden) open();
  });

  /* taqdimotdagi logo — bosh sahifaga qaytish */
  document.addEventListener('click',function(e){
    if(e.target.closest&&e.target.closest('.brand-logo')) location.hash='#home';
  });

  if(!initial||initial==='home') open();
  else cover.hidden=true;
})();
