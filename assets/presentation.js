/* Chapter controller. World, renderer, authored BEATS and FIGS remain shared.
   All clocks advance from visible, unblocked animation frames; never from scrolling. */
(function(){
  'use strict';
  var P=window.FarmPresentation={}, state=presentation={
    currentChapter:0,currentBeat:0,isTransitioning:false,isPlaying:false,isPaused:false,
    remainingTime:0,sequenceElapsed:0,sequenceComplete:false,holdElapsed:0,
    panel:null,queuedChapter:null,completed:new Set(),transition:null
  };
  var shell=document.getElementById('overlay'), frameEl=document.getElementById('scene-frame'),
    veil=document.getElementById('scene-veil'), details=document.getElementById('details'),
    detailBody=document.getElementById('details-body'), shade=document.getElementById('panel-shade'),
    beatNav=document.getElementById('beat-nav'), autoTimer=document.getElementById('auto-countdown'),
    slideCopy=document.getElementById('slide-copy'), dataCopy=document.getElementById('data-copy'), dataLayer=document.getElementById('data-layer'),
    infoToggle=document.getElementById('info-toggle'), layers=[sceneLayer,dataLayer];
  var metricValues={}, metricTweens=[], panelFocus=null, beatSlot=-1, infoExpanded=false;
  var iconPaths={
    left:'<path d="m14 5-7 7 7 7"/>',right:'<path d="m10 5 7 7-7 7"/>',
    play:'<path d="m8 5 11 7-11 7Z"/>',pause:'<path d="M8 5v14M16 5v14"/>',
    replay:'<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',
    arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>'
  };
  function icon(n){return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">'+iconPaths[n]+'</svg>';}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function delta(a,b,lower){
    if(!a)return '';
    var change=(b-a)/Math.abs(a)*100, good=lower?change<=0:change>=0;
    return '<span class="metric-change'+(good?'':' negative')+'">'+(change>0?'+':change<0?'−':'')+uzNumber(Math.abs(change),1)+'%</span> · boshlang‘ich holatga nisbatan';
  }
  function metric(id,label,value,unit,context,opts){return Object.assign({id:id,label:label,value:value,unit:unit,context:context,digits:0},opts||{});}
  var moneyUnit='mln so‘m', costUnit='so‘m/kg';
  function content(ci){
    var a=ECON.read(0),b=ECON.read(1),c=ECON.read(2),d=ECON.read(3),cut=calcData();
    var all=[
      {category:'Jarayonlar o‘zimizda',title:'2010-yil 3 nafar Hodim Bilan ',lead:'So‘yish o‘z qo‘limizda: vositachi yo‘q, tannarx pastroq.',
       intro:`"biznesni boshlash" bosqichidan "kapitalni ko'paytirish" va yirik sanoat bosqichiga o'tdik. O‘zimiz so‘yib, o‘zimiz sotdik.`,
       metrics:[metric('cost','Yangi tannarx',b.cost,costUnit,delta(a.cost,b.cost,true),{featured:true}),metric('prof','Foyda',b.prof,moneyUnit,delta(a.prof,b.prof),{digits:2,featured:true}),metric('sales','Sotuv hajmi',b.sales,'kg','2-bosqich · o‘z so‘yish'),metric('jobs','Bandlik',b.jobs,'ish o‘rni','Avval: '+uzNumber(a.jobs)+' ish o‘rni')],
       compare:[a.cost,b.cost],path:['Ferma','So‘yish','Qadoqlash','Savdo'],
       conclusion:'Qisqaroq va mustahkam zanjir. Ko‘proq nazorat.'},
      {category:'Integratsiyalashgan klaster',title:'Butun zanjir. Bitta tizim.',lead:'Yem, ferma, qayta ishlash, sovuq zanjir va bozor — bitta tizimda.',
       intro:'Don ichkariga kiradi, tayyor mahsulot tashqariga chiqadi. Har bir bosqich keyingisiga bog‘lanadi.',
       metrics:[metric('sales','Klaster sotuv hajmi',c.sales,'kg',delta(a.sales,c.sales)),metric('cost','Klaster tannarxi',c.cost,costUnit,delta(a.cost,c.cost,true),{featured:true}),metric('prof','Foyda',c.prof,moneyUnit,'3-bosqich · klaster',{digits:2}),metric('jobs','Bandlik',c.jobs,'ish o‘rni','3-bosqich · klaster')],
       chain:true,conclusion:'Yemdan bozorgacha — yagona qiymat zanjiri.'},
      {category:'Mahsulot va odamlar',title:'Bir tovuq. Ko‘proq qiymat.',lead:'Har bir bo‘lak alohida mahsulot, har bir bosqich yangi ish o‘rni.',
       intro:'Har bir bo‘lak alohida mahsulotga aylanadi. Ishlab chiqarish kengaygani sari yangi kasblar va ish o‘rinlari paydo bo‘ladi.',
       metrics:[metric('bird-price','Bir tovuq sotish narxi',cut.price,'so‘m/tovuq','Bir tovuq hisobida'),metric('jobs','Bandlik',d.jobs,'ish o‘rni',(d.jobs>=a.jobs?'+':'')+uzNumber(d.jobs-a.jobs)+' yangi ish o‘rni',{featured:true}),metric('added','Qo‘shilgan qiymat',num('cutValue',26),'%','Kiritilgan ko‘rsatkich',{digits:1,prefix:'+',featured:true,inlineUnit:true}),metric('bird-cost','Bir tovuq tannarxi',cut.cost,'so‘m/tovuq','Bir tovuq hisobida')],
       conclusion:'Ko‘p mahsulot. Ko‘proq ish o‘rni. Odamlar uchun maqbul narx.'},
      {category:'Yakuniy iqtisodiy natija',title:'Qiymatga aylangan tizim.',lead:'Tannarx kamaydi; tushum, foyda va bandlik o‘sdi.',
       intro:'Boshlang‘ich fermadan qo‘shimcha qiymat yaratadigan klastergacha: tannarx kamaydi, biznes va bandlik o‘sdi.',
       metrics:[metric('prof','Yakuniy foyda',d.prof,moneyUnit,delta(a.prof,d.prof),{digits:2,featured:true}),metric('rev','Yakuniy tushum',d.rev,moneyUnit,delta(a.rev,d.rev),{digits:2}),metric('cost','Yakuniy tannarx',d.cost,costUnit,delta(a.cost,d.cost,true)),metric('jobs','Bandlik',d.jobs,'ish o‘rni','Avval: '+uzNumber(a.jobs)+' ish o‘rni',{featured:true})],
       secondary:'Soliq: <b>'+uzNumber(d.tax,2)+' mln so‘m</b><span>Sotuv: <b>'+uzNumber(d.sales)+' kg</b></span>',
       compare:[a.cost,d.cost],conclusion:'Tannarxni kamaytirishdan — qiymat yaratishgacha.',replay:true}
    ];
    var c=all[ci]; c.category=pad2(ci+1)+' / '+c.category; return c;
  }
  function valueText(m,v){return (v>=0?m.prefix||'':'')+uzNumber(v,m.digits)+(m.inlineUnit?m.unit:'');}
  function metricHTML(m,i){
    var prior=metricValues[m.id], from=prior===undefined?m.value:prior;
    metricValues[m.id]=m.value;
    if(!REDUCED&&from!==m.value)metricTweens.push({id:m.id,from:from,to:m.value,t:0,m:m});
    return '<div class="metric'+(m.featured?' featured':'')+'" style="--metric-i:'+i+'"><div class="metric-label">'+m.label+'</div><div class="metric-value-wrap"><div class="metric-value'+(m.value<0?' negative':'')+'" id="metric-'+m.id+'">'+valueText(m,REDUCED?m.value:from)+'</div>'+(m.inlineUnit?'':'<span class="metric-unit">'+m.unit+'</span>')+'</div><div class="metric-context">'+m.context+'</div></div>';
  }
  function comparison(v){
    var max=Math.max.apply(null,v.concat([1]));
    return '<div class="comparison" aria-label="Tannarx: avval va hozir">'+v.map(function(n,i){return '<div class="compare-row"><span>'+(i?'Hozir':'Avval')+'</span><span class="compare-track"><i style="width:'+Math.max(0,n/max*100)+'%"></i></span><b>'+uzNumber(n)+' <span>so‘m/kg</span></b></div>';}).join('')+'</div>';
  }
  function visualsHTML(c){
    var h='';
    if(c.secondary)h+='<div class="metrics-secondary">'+c.secondary+'</div>';
    if(c.compare)h+=comparison(c.compare);
    if(c.path)h+='<div class="value-path" aria-label="Qiymat zanjiri">'+c.path.map(function(x,i){return (i?'<span aria-hidden="true">→</span>':'')+'<span class="path-node'+(c.external&&i>0&&i<c.path.length-1?' external':'')+'">'+x+'</span>';}).join('')+'</div>';
    return h;
  }
  P.renderSummary=function(){
    var c=content(cur); metricTweens=[];
    slideCopy.innerHTML='<div class="slide-category eyebrow">'+c.category+'</div><h1 id="slide-title">'+c.title+'</h1><p class="slide-intro">'+c.intro+'</p>';
    var h='<p class="data-lead"><b>'+c.conclusion+'</b> <span>'+c.lead+'</span></p><div class="metrics">'+c.metrics.map(metricHTML).join('')+'</div>';
    if(c.chain)h+='<ol class="cluster-chain" aria-label="Klaster bosqichlari">'+['Yem','Ferma','Qayta ishlash','Qadoqlash','Sovuq saqlash','Logistika','Bozor'].map(function(x,i){return '<li data-chain="'+i+'"><span>'+pad2(i+1)+'</span>'+x+'</li>';}).join('')+'</ol>';
    dataCopy.innerHTML=h;
    layers.forEach(function(l){l.scrollTop=0;l.classList.toggle('expanded',infoExpanded);});
  };
  function setExpanded(v){
    infoExpanded=v;layers.forEach(function(l){l.classList.toggle('expanded',v);});document.body.classList.toggle('info-expanded',v);
    infoToggle.innerHTML=icon(v?'minus':'plus');infoToggle.setAttribute('aria-expanded',String(v));infoToggle.setAttribute('aria-label',v?'Ma’lumotni yig‘ish':'Barcha asosiy raqamlarni ko‘rsatish');P.layout();invalidateScene();
  }
  infoToggle.hidden=false;infoToggle.innerHTML=icon('plus');infoToggle.addEventListener('click',function(){setExpanded(!infoExpanded);});
  document.getElementById('details-open').addEventListener('click',function(){P.openPanel('details');});
  function renderBeatNav(){
    beatSlot=-1;beatNav.innerHTML='';
    CH[cur].beats.forEach(function(id,i){
      var b=document.createElement('button');b.textContent=pad2(i+1);b.title=BEATS[id].t;b.setAttribute('aria-label',BEATS[id].t+' sahnasini ko‘rish');
      b.addEventListener('click',function(){P.selectBeat(i);});beatNav.appendChild(b);
    });
  }
  P.onBeat=function(id){
    state.currentBeat=id;var slot=CH[cur]&&CH[cur].beats.indexOf(id);
    document.getElementById('beat-title').textContent=BEATS[id].t;
    document.getElementById('beat-index').textContent=pad2(slot+1)+' / '+pad2(CH[cur].beats.length);
    Array.from(beatNav.children).forEach(function(b,i){b.setAttribute('aria-current',String(i===slot));});
    hideTip();
  };
  P.updateHUD=function(){
    if(cur<0)return;
    state.currentChapter=cur;elNum.textContent=pad2(cur+1);elTitle.textContent=CH[cur].t;
    document.getElementById('chapter-count').innerHTML=pad2(cur+1)+' <span>/ '+pad2(CH.length)+'</span>';
    railBtns.forEach(function(b,i){
      var done=state.completed.has(i),active=i===cur;
      b.setAttribute('aria-current',String(active));b.classList.toggle('completed',done);
      b.querySelector('.chapter-state').textContent=done&&!active?'✓':'';
      b.setAttribute('aria-label',pad2(i+1)+'-bo‘lim: '+CH[i].t+(active?' · joriy bo‘lim':done?' · ko‘rib chiqildi':''));
    });
    var last=cur===CH.length-1, nextBtn=document.getElementById('next');
    document.getElementById('prev').disabled=cur===0||EX.on;
    nextBtn.disabled=EX.on;nextBtn.classList.toggle('replay',last);
    nextBtn.innerHTML=last?icon('replay')+'<span class="button-label">Qayta ko‘rish</span>':'<span class="button-label">Keyingi bo‘lim</span>'+icon('arrow');
    nextBtn.setAttribute('aria-label',last?'Taqdimotni qayta boshlash':'Keyingi bo‘lim');
    P.updateProgress();P.updateStatus();
  };
  P.updateProgress=function(){
    if(cur<0)return;
    elDone.style.width=((cur+1)/CH.length*100)+'%';progEl.setAttribute('aria-valuenow',String(cur+1));progEl.setAttribute('aria-valuetext',pad2(cur+1)+' / '+pad2(CH.length)+' · '+CH[cur].t);
    var remaining=Math.max(0,CH[cur].dur-state.sequenceElapsed+CH[cur].hold-state.holdElapsed);
    state.remainingTime=state.isPlaying&&cur<CH.length-1?remaining:0;
    autoTimer.hidden=!state.isPlaying||cur===CH.length-1;
    document.body.classList.toggle('auto-on',!autoTimer.hidden);
    if(!autoTimer.hidden){
      var sec=Math.ceil(remaining);
      elClock.textContent='Keyingi bo‘lim: '+pad2(Math.floor(sec/60))+':'+pad2(sec%60);
      document.getElementById('timer-fill').style.width=(remaining/(CH[cur].dur+CH[cur].hold)*100)+'%';
    }
  };
  P.updateStatus=function(){
    var suspended=document.hidden||state.panel||EX.on;
    var text=EX.on?'Klasterni o‘rganish':state.isPlaying?(suspended?'Avtoijro · vaqtincha pauza':'Avtoijro davom etmoqda'):state.isPaused?'Taqdimot pauzada':state.sequenceComplete?'Sizning sur’atingizda':'Sahna namoyish etilmoqda';
    var status=document.getElementById('presentation-status');status.innerHTML='<i></i>'+text;
    var label=state.isPlaying?'Pauza':state.isPaused?'Davom etish':'Avtoijro';
    var playIcon=state.isPlaying?'pause':'play';
    if(cur===CH.length-1&&state.sequenceComplete){label='Qayta ko‘rish';playIcon='replay';}
    elPlay.innerHTML=icon(playIcon)+'<span class="button-label">'+label+'</span>';
    elPlay.setAttribute('aria-label',state.isPlaying?'Avtomatik taqdimotni pauza qilish':label==='Qayta ko‘rish'?'Taqdimotni qayta boshlash':'Avtomatik taqdimotni boshlash');
    elPlay.setAttribute('aria-pressed',String(state.isPlaying));elPlay.disabled=EX.on;
    P.updateProgress();
  };
  P.setPlaying=function(v){
    if(!started)return;
    if(v&&EX.on)return;
    state.isPlaying=!!v&&cur<CH.length-1;playing=state.isPlaying;
    state.isPaused=!v;lastNow=performance.now();P.updateStatus();invalidateScene();
  };
  function announce(){document.getElementById('chapter-announcement').textContent=pad2(cur+1)+' / '+pad2(CH.length)+'. '+CH[cur].t+'. '+content(cur).title;}
  function blocked(){return !!(state.panel||EX.on||document.hidden);}
  function stillOf(idx){return window.STILL&&STILL[idx]||null;}
  function poseAt(p){
    var b=beatAt(cur,p),sc=BEATS[b.idx];
    if(b.idx!==curBeat)enterBeat(b.idx,false);
    /* a still pins camera and object progress independently of the slot's local progress */
    var st=stillOf(b.idx), camP=st?st.cam:b.local, upP=st?st.up:b.local;
    if(sc.up)sc.up(upP,elapsed);
    var target, camFn=st&&st.camFn||sc.camFn;
    if(camFn)target=camFn.call(sc,camP,elapsed);
    else{var e=easeInOut(camP);camera.position.copy(curves.p.getPointAt(e));target=curves.l.getPointAt(e);}
    return {target:target,beat:b,sc:sc,still:st,camP:camP,upP:upP};
  }
  function commit(i,opts){
    opts=opts||{};
    if(started&&cur>=0&&cur!==i)state.completed.add(cur);
    var oldPos=camera.position.clone(),oldLook=lookNow.clone(),oldEnv=curBeat>=0?BEATS[curBeat].env:null;
    cur=i;prog=clamp(opts.at||0,0,1);state.currentChapter=i;state.sequenceElapsed=prog*CH[i].dur;
    state.sequenceComplete=prog>=1;state.holdElapsed=0;state.isPaused=!!opts.static;
    if(REDUCED&&!opts.keepBeat){prog=1;state.sequenceElapsed=CH[i].dur;state.sequenceComplete=true;}
    if(cur===CH.length-1){state.isPlaying=false;playing=false;}
    if(infoExpanded)setExpanded(false);
    renderBeatNav();var b=beatAt(cur,prog);enterBeat(b.idx,true);
    P.renderSummary();var pose=poseAt(prog);
    if(!REDUCED&&opts.animate&&!pose.still){
      var far=oldPos.distanceTo(camera.position)>420||oldEnv!==pose.sc.env;
      blend.pos.copy(far?camera.position.clone().sub(pose.target).multiplyScalar(1.10).add(pose.target):oldPos);
      blend.look.copy(far?pose.target:oldLook);blend.on=true;blend.t=0;blend.dur=1.08;
    }else{blend.on=false;lookNow.copy(pose.target);camera.lookAt(pose.target);}
    if(state.sequenceComplete)state.completed.add(cur);
    P.updateHUD();P.onBeat(curBeat);P.layout();announce();
  }
  P.goTo=function(i,opts){
    opts=opts||{};i=clamp(Math.round(i),0,CH.length-1);
    if(state.panel)return;
    if(EX.on){P.explore(false);}
    if(state.isTransitioning){state.queuedChapter={i:i,opts:opts};return;}
    if(cur===i&&!opts.force)return;
    if(!started||opts.instant||REDUCED){commit(i,opts);invalidateScene();return;}
    state.isTransitioning=true;state.queuedChapter=null;state.transition={time:0,i:i,opts:opts,committed:false};
    layers.forEach(function(l){l.classList.add('is-leaving');l.inert=true;});hideTip();clearAnchors();
    document.getElementById('transition-number').textContent=pad2(i+1);
    invalidateScene(1700);
  };
  P.selectBeat=function(slot){
    if(!started||state.isTransitioning||blocked())return;
    var c=CH[cur],at=c.times.slice(0,slot).reduce(function(a,b){return a+b;},0);
    if(REDUCED)at+=c.times[slot]*.97;
    var wasAuto=state.isPlaying;
    P.goTo(cur,{force:true,at:at/c.dur,keepBeat:true,static:REDUCED});
    state.isPlaying=wasAuto;playing=wasAuto;
  };
  function transitionTick(dt){
    var tr=state.transition;if(!tr)return;
    tr.time+=dt;
    var p=tr.time;
    veil.style.opacity=String(p<.32?smooth(p/.32):1-smooth(clamp((p-.32)/.72,0,1)));
    if(p>=.32&&!tr.committed){
      tr.committed=true;commit(tr.i,Object.assign({},tr.opts,{animate:true}));
      layers.forEach(function(l){l.classList.remove('is-leaving');l.classList.add('is-entering');});
      requestAnimationFrame(function(){layers.forEach(function(l){l.classList.remove('is-entering');});});
    }
    if(p>=1.45){
      state.isTransitioning=false;state.transition=null;veil.style.opacity='0';layers.forEach(function(l){l.inert=false;});
      var queued=state.queuedChapter;state.queuedChapter=null;
      if(queued){P.goTo(queued.i,queued.opts);}
    }
  }
  P.start=function(replay){
    if(state.panel)P.closePanel();if(EX.on)P.explore(false);
    started=false;playing=false;state.isPlaying=false;state.isPaused=false;state.completed.clear();state.transition=null;state.isTransitioning=false;state.queuedChapter=null;
    layers.forEach(function(l){l.classList.remove('is-leaving','is-entering');l.inert=false;});veil.style.opacity='0';
    loader.classList.add('gone');loader.inert=true;startBtn.disabled=true;
    setTimeout(function(){loader.hidden=true;},520);
    started=true;shell.inert=false;ECON.init();ECON.stage=-1;ECON.go(0,true);
    commit(0,{instant:true});
    if(!REDUCED){layers.forEach(function(l){l.classList.add('is-entering');});requestAnimationFrame(function(){layers.forEach(function(l){l.classList.remove('is-entering');});});}
    document.getElementById('next').focus({preventScroll:true});lastNow=performance.now();invalidateScene();
  };
  P.layout=function(){
    var r=frameEl.getBoundingClientRect();
    P.view={left:r.left,top:r.top,width:Math.max(1,r.width),height:Math.max(1,r.height),right:r.right,bottom:r.bottom};
    var style=document.documentElement.style;
    style.setProperty('--view-left',r.left+'px');style.setProperty('--view-top',r.top+'px');style.setProperty('--view-right',(innerWidth-r.right)+'px');style.setProperty('--view-bottom',(innerHeight-r.bottom)+'px');
  };
  P.renderDetails=function(){
    document.getElementById('details-kicker').textContent=pad2(cur+1)+' / '+pad2(CH.length)+' · Batafsil';
    document.getElementById('details-title').textContent=CH[cur].t;
    var c=content(cur), h='<div class="details-visuals">'+visualsHTML(c)+'</div>';
    if(cur===CH.length-1){
      h+='<div class="table-wrap"><table><caption>Bosqichlar bo‘yicha namunaviy hisob</caption><thead><tr><th>Ko‘rsatkich</th><th>Boshlang‘ich</th><th>O‘z so‘yish</th><th>Klaster</th><th>Qo‘shimcha qiymat</th></tr></thead><tbody>';
      var labels=['Tannarx, so‘m/kg','Sotuv, kg','Tushum, mln so‘m','Foyda, mln so‘m','Ish o‘rni','Soliq, mln so‘m'];
      ECON.keys.forEach(function(k,i){h+='<tr><td>'+labels[i]+'</td>'+[0,1,2,3].map(function(st){return '<td>'+ECON.text(k,ECON.read(st)[k])+'</td>';}).join('')+'</tr>';});
      h+='</tbody></table></div><p class="note">3D ustunlar sotuv, tushum, foyda, bandlik va soliqning boshlang‘ich holatga nisbatan o‘sishini ko‘rsatadi. Qiymatlar bir xil hisob davri uchun solishtiriladi.</p>';
    }
    CH[cur].beats.forEach(function(id,i){
      h+='<details class="archive-beat"'+(id===curBeat?' open':'')+'><summary><span>'+pad2(i+1)+'</span>'+BEATS[id].t+'</summary>'+(BEATS[id].dom?BEATS[id].dom():'')+'</details>';
    });
    detailBody.innerHTML=h;
    detailBody.querySelectorAll('[data-at]').forEach(function(el){el.classList.add('in','on');el.classList.remove('fade');if(el.dataset.fill){var f=el.querySelector('.fill');if(f)f.style.right=(100-Number(el.dataset.fill))+'%';}});
    detailBody.querySelectorAll('.ci').forEach(function(el){el.setAttribute('aria-label',el.dataset.k==='liveWeight'?'Tirik vazn, kilogramm':'So‘yilgandan keyingi chiqim, foiz');});
  };
  P.openPanel=function(which){
    if(!started||state.isTransitioning)return;
    if(state.panel){P.closePanel(false);}else panelFocus=document.activeElement;
    state.panel=which;hideTip();
    if(which==='editor')buildEditor();else P.renderDetails();
    var panel=which==='editor'?editor:details;
    shell.inert=true;exPanel.inert=true;shade.hidden=false;
    panel.classList.add('open');panel.inert=false;panel.setAttribute('aria-hidden','false');
    panel.querySelector('button').focus({preventScroll:true});P.updateStatus();
  };
  P.closePanel=function(restore){
    if(!state.panel)return;
    [editor,details].forEach(function(p){p.classList.remove('open');p.inert=true;p.setAttribute('aria-hidden','true');});
    state.panel=null;shell.inert=!started;exPanel.inert=false;shade.hidden=true;lastNow=performance.now();
    if(restore!==false&&panelFocus&&panelFocus.isConnected)panelFocus.focus({preventScroll:true});
    P.updateStatus();invalidateScene();
  };
  P.refreshFigures=function(){
    if(cur<0)return;
    P.renderSummary();if(state.panel==='details')P.renderDetails();
    /* Refresh text on existing anchors without replaying scene entry effects. */
    if(curBeat===4){var keys=['shBreast','shThigh','shDrum','shWing','shRest'];ANCH.forEach(function(a,i){var v=a.el.querySelector('.v');if(v)v.textContent=f(keys[i]);});}
  };
  P.explore=function(v){
    v=!!v;if(v===EX.on||!started||state.isTransitioning||state.panel)return;
    hideTip();clearAnchors();
    if(v){
      var prev=BEATS[curBeat];if(prev&&prev.exit)prev.exit();
      EX.saved={chapter:cur,progress:prog,sequenceElapsed:state.sequenceElapsed,holdElapsed:state.holdElapsed,complete:state.sequenceComplete,paused:state.isPaused,playing:state.isPlaying};
      EX.on=true;stage(['farm','slaughter','cluster','flows','roads','roads2','trucks','dust','crew','grass']);prepBuilds(15);envSnap('day');setClip(false);compMat.uniforms.fade.value=0;
      EX.tgt.set(110,10,20);EX.wantTgt.copy(EX.tgt);EX.dist=EX.wantDist=420;EX.yaw=EX.wantYaw=-.7;EX.pitch=EX.wantPitch=.52;
      exName.textContent='Klaster';exText.textContent='Torting — aylantiring. G‘ildirak yoki ikki barmoq bilan yaqinlashtiring. Binoni bosib, jarayon bilan tanishing.';
      Array.from(exChips.children).forEach(function(b){b.setAttribute('aria-pressed','false');});
    }else{
      EX.on=false;EX.drag=null;document.body.classList.remove('dragging');
      var saved=EX.saved;cur=saved.chapter;prog=saved.progress;
      enterBeat(beatAt(cur,prog).idx,true);
      state.sequenceElapsed=saved.sequenceElapsed;state.holdElapsed=saved.holdElapsed;state.sequenceComplete=saved.complete;state.isPaused=saved.paused;state.isPlaying=saved.playing;playing=state.isPlaying;
    }
    exPanel.classList.toggle('on',v);document.body.classList.toggle('exploring',v);exBtn.setAttribute('aria-pressed',String(v));
    exBtn.innerHTML=v?'Taqdimotga qaytish '+icon('left'):'Klasterni kezish <span aria-hidden="true">↗</span>';
    layers.forEach(function(l){l.inert=v;});beatNav.inert=v;
    lastNow=performance.now();P.layout();P.updateHUD();invalidateScene(1800);
  };
  function tickMetrics(dt){
    metricTweens=metricTweens.filter(function(a){a.t=Math.min(1,a.t+dt/1.1);var el=document.getElementById('metric-'+a.id);if(el)el.textContent=valueText(a.m,lerp(a.from,a.to,easeOut(a.t)));return a.t<1;});
  }
  function updateChain(p){
    if(curBeat!==7&&curBeat!==6)return;
    /* the cluster chapter is the single beat 6: its chain walks all seven steps (Yem … Bozor) while the buildings go up */
    var active=curBeat===7?Math.min(6,Math.floor(beat(p,.05,.75)*7)):curBeat===6?Math.min(6,Math.floor(beat(p,.06,.94)*7)):-1;
    dataCopy.querySelectorAll('[data-chain]').forEach(function(el,i){el.classList.toggle('is-active',i===active);el.classList.toggle('is-done',i<active);el.setAttribute('aria-current',i===active?'step':'false');});
  }
  P.frame=function(now){
    if(document.hidden)return;
    now=now||performance.now();var wallDt=Math.max(0,(now-lastNow)/1000),dt=Math.min(wallDt,.05);lastNow=now;
    var suspended=!!state.panel, active=started&&!suspended&&!EX.on&&!state.isTransitioning&&!state.isPaused;
    var sequence=active&&!state.sequenceComplete;
    var clockRuns=active&&state.isPlaying&&cur<CH.length-1;
    var transitions=state.isTransitioning&&!suspended;
    var live=sequence||clockRuns||transitions||!suspended&&(metricTweens.length||blend.on)||EX.on&&now<dirtyUntil;
    if(!live&&now>dirtyUntil)return;
    if(transitions)transitionTick(wallDt);
    if(!started){if(step>=BUILD_STEPS.length){var bootPose=cur>=0?poseAt(prog):null;if(bootPose){lookNow.copy(bootPose.target);camera.lookAt(bootPose.target);envApply(bootPose.target,280);if(window.ENV)ENV.tick();}renderFrame(0);}if(!frameHandle)frameHandle=requestAnimationFrame(frame);return;}
    if(sequence){
      state.sequenceElapsed=Math.min(CH[cur].dur,state.sequenceElapsed+wallDt);prog=state.sequenceElapsed/CH[cur].dur;
      if(prog>=1){state.sequenceComplete=true;state.completed.add(cur);P.updateHUD();invalidateScene(600);}
    }else if(clockRuns&&state.sequenceComplete){state.holdElapsed+=wallDt;if(state.holdElapsed>=CH[cur].hold)P.goTo(cur+1);}
    /* the beat about to be posed (not curBeat): keeps the entry frame of a still frozen too */
    var stillB=!EX.on&&cur>=0?stillOf(beatAt(cur,prog).idx):null;
    var animateWorld=!REDUCED&&!suspended&&!stillB&&(sequence||transitions||EX.on&&now<dirtyUntil);
    if(animateWorld)elapsed+=dt;
    if(EX.on){
      var exTarget=exTick(REDUCED?1:dt);envMix('day',clamp(dt*1.6,0,1));envApply(exTarget,420);maybeBakeEnv(elapsed);
      compMat.uniforms.focus.value=camera.position.distanceTo(exTarget);compMat.uniforms.range.value=200;
      if(animateWorld)worldTick(elapsed,dt,camera);else if(window.ENV)ENV.tick();
      updateAnchors(false);renderFrame(elapsed);
    }else{
      var pose=poseAt(prog),target=pose.target,sc=pose.sc;
      if(blend.on){
        if(!suspended)blend.t+=dt;
        var k=easeInOut(clamp(blend.t/blend.dur,0,1));
        camera.position.lerpVectors(blend.pos,camera.position,k);target=blend.look.clone().lerp(target,k);if(k>=1)blend.on=false;
      }
      lookNow.copy(target);camera.lookAt(target);
      envMix(sc.env,REDUCED?1:clamp(dt*1.6,0,1));envApply(target,sc.r||200);maybeBakeEnv(elapsed);
      var focus=sc.focusFn?camera.position.distanceTo(sc.focusFn(pose.camP,elapsed)):camera.position.distanceTo(target);
      focusNow=(REDUCED||pose.still)?focus:damp(focusNow,focus,6.5,dt);compMat.uniforms.focus.value=focusNow;compMat.uniforms.range.value=Math.max(8,focusNow*1.4);
      ECON.tick(REDUCED?2:dt);
      if(animateWorld)worldTick(elapsed,dt,camera);
      else if(pose.still&&stillPrime&&started){
        /* one settle tick with the still camera: crew LOD, flock packing, doors, hero pose, caster cull */
        stillPrime=false;camera.updateMatrixWorld();worldTick(elapsed,1/60,camera);
      }else{if(window.ENV)ENV.tick();}
      if(curBeat===4)updateAnchors(!state.isTransitioning&&!state.panel&&pose.upP>.42);else updateAnchors(false);
      if(!suspended)tickMetrics(dt);updateChain(pose.beat.local);P.updateProgress();renderFrame(elapsed);
    }
    if(!frameHandle)frameHandle=requestAnimationFrame(frame);
  };
  CH.forEach(function(c,i){
    var b=document.createElement('button');b.innerHTML='<span class="n">'+pad2(i+1)+'</span><span class="chapter-name">'+c.t+'</span><span class="chapter-state" aria-hidden="true"></span>';
    b.addEventListener('click',function(){P.goTo(i);});rail.appendChild(b);railBtns.push(b);
  });
  document.getElementById('prev').innerHTML=icon('left')+'<span class="button-label">Oldingi</span>';
  function navIndex(){return state.queuedChapter?state.queuedChapter.i:state.transition?state.transition.i:cur;}
  document.getElementById('next').addEventListener('click',function(){if(navIndex()===CH.length-1)P.start(true);else P.goTo(navIndex()+1);});
  document.getElementById('prev').addEventListener('click',function(){P.goTo(navIndex()-1);});
  elPlay.addEventListener('click',function(){if(cur===CH.length-1&&state.sequenceComplete)P.start(true);else P.setPlaying(!state.isPlaying);});
  document.getElementById('details-close').addEventListener('click',function(){P.closePanel();});
  document.getElementById('details-edit').addEventListener('click',function(){P.openPanel('editor');});
  shade.addEventListener('click',function(){P.closePanel();});
  [editor,details].forEach(function(panel){panel.addEventListener('keydown',function(e){
    if(e.key!=='Tab')return;var list=Array.from(panel.querySelectorAll('button,input,summary,a[href],[tabindex="0"]')).filter(function(el){return !el.disabled&&el.getClientRects().length>0;});
    var first=list[0],last=list[list.length-1];
    if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault();}
  });});
  window.addEventListener('keydown',function(e){
    if(e.key==='Escape'){
      if(state.panel)P.closePanel();else if(EX.on)P.explore(false);else if(infoExpanded){setExpanded(false);}
      return;
    }
    if(!started||blocked()||e.altKey||e.ctrlKey||e.metaKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable)return;
    var i=navIndex();
    if(e.key==='ArrowRight')P.goTo(i+1);else if(e.key==='ArrowLeft')P.goTo(i-1);else if(e.key==='Home')P.goTo(0);else if(e.key==='End')P.goTo(CH.length-1);
    else if(e.key===' '&&e.target.tagName!=='BUTTON')P.setPlaying(!state.isPlaying);else return;
    e.preventDefault();
  });
  var swipe=null, swipePointers=new Set();
  canvas.addEventListener('pointerdown',function(e){
    if(EX.on||!started||blocked()||e.pointerType==='mouse')return;
    swipePointers.add(e.pointerId);swipe=swipePointers.size===1?{id:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now()}:null;
    try{canvas.setPointerCapture(e.pointerId);}catch(err){}
  });
  canvas.addEventListener('pointerup',function(e){
    swipePointers.delete(e.pointerId);var s=swipe;swipe=null;
    if(!s||s.id!==e.pointerId||EX.on)return;
    var dx=e.clientX-s.x,dy=e.clientY-s.y;
    if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5&&performance.now()-s.t<1400){P.goTo(navIndex()+(dx<0?1:-1));}
    else partTip(e);
  });
  canvas.addEventListener('pointercancel',function(e){swipe=null;swipePointers.delete(e.pointerId);});
  canvas.addEventListener('pointerleave',hideTip);
  var motion=matchMedia('(prefers-reduced-motion: reduce)');motion.addEventListener('change',function(e){
    REDUCED=e.matches;if(REDUCED){blend.on=false;metricTweens=[];if(started){state.sequenceElapsed=CH[cur].dur;state.sequenceComplete=true;prog=1;P.setPlaying(false);P.renderSummary();}}invalidateScene();
  });
  new ResizeObserver(function(){P.layout();invalidateScene(700);}).observe(frameEl);
  P.layout();P.updateStatus();
})();
