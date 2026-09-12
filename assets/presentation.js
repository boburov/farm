/* Bo'limlar boshqaruvi. Dunyo, renderer va BEATS index.html da qoladi.
   Ekrandagi BARCHA matn va raqam assets/story.js dan keladi — bu faylda
   birorta biznes raqami yozilmagan va hisoblanmaydi.
   Soatlar faqat ko'rinadigan, bloklanmagan kadrlardan yuradi.            */
(function(){
  'use strict';
  var P=window.FarmPresentation={}, state=presentation={
    currentChapter:0,currentBeat:0,isTransitioning:false,isPlaying:false,isPaused:false,
    remainingTime:0,sequenceElapsed:0,sequenceComplete:false,holdElapsed:0,
    panel:null,queuedChapter:null,completed:new Set(),transition:null
  };
  var S=window.STORY;
  var shell=document.getElementById('overlay'), frameEl=document.getElementById('scene-frame'),
    veil=document.getElementById('scene-veil'), shade=document.getElementById('panel-shade'),
    beatNav=document.getElementById('beat-nav'), caption=document.getElementById('scene-caption'),
    slideCopy=document.getElementById('slide-copy'), dataCopy=document.getElementById('data-copy'),
    dataLayer=document.getElementById('data-layer'), heroEl=document.getElementById('hero'),
    photoEl=document.getElementById('photo'), photoImg=document.getElementById('photo-img'),
    photoCap=document.getElementById('photo-caption'), photoBtn=document.getElementById('photo-open'),
    infoToggle=document.getElementById('info-toggle'), layers=[sceneLayer,dataLayer];
  var metricValues={}, metricTweens=[], panelFocus=null, beatSlot=-1, infoExpanded=false, renderedKey=null;
  var iconPaths={
    left:'<path d="m14 5-7 7 7 7"/>',right:'<path d="m10 5 7 7-7 7"/>',
    replay:'<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',
    arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>'
  };
  function icon(n){return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">'+iconPaths[n]+'</svg>';}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  /* ---------------------------------------------------------- content --
     Bir sahna = bir klik = bir fikr. Sahna ma'lumoti STORY dan olinadi;
     bu yerda hech narsa hisoblanmaydi.                                   */
  function isHero(i){ return !!(CH[i]&&CH[i].hero); }
  function slotOf(){ var c=CH[cur]; if(!c) return 0; var i=c.beats.indexOf(curBeat); return i<0?0:i; }
  function sceneAt(ci,slot){
    if(ci<=0||isHero(ci)) return null;
    var ch=S.chapters[ci-1]; if(!ch) return null;
    return ch.scenes[clamp(slot,0,ch.scenes.length-1)];
  }
  function currentScene(){ return sceneAt(cur,slotOf()); }

  /* raqam matni: yil kabi "static" qiymatlar guruhlanmaydi (2010, 2 010 emas) */
  function figureText(f,v){ return f.static?String(v):uzNumber(Math.round(v),0); }

  function figuresHTML(list){
    if(!list||!list.length) return '';
    return '<div class="metrics">'+list.map(function(f,i){
      var id=f.id||('f'+i), isNum=typeof f.value==='number';
      var prior=metricValues[id], from=(!isNum||prior===undefined)?f.value:prior;
      if(isNum) metricValues[id]=f.value;
      if(isNum&&!f.static&&!REDUCED&&from!==f.value)
        metricTweens.push({el:'fig-'+id,f:f,from:from,to:f.value,t:0});
      var shown=isNum?figureText(f,REDUCED?f.value:from):esc(f.value);
      return '<div class="metric'+(f.featured?' featured':'')+'" style="--metric-i:'+i+'">'+
        '<div class="metric-label">'+esc(f.label)+'</div>'+
        '<div class="metric-value-wrap"><div class="metric-value" id="fig-'+id+'">'+shown+'</div>'+
        (f.unit?'<span class="metric-unit">'+esc(f.unit)+'</span>':'')+'</div></div>';
    }).join('')+'</div>';
  }

  function chipsHTML(list){
    if(!list||!list.length) return '';
    return '<div class="fact-chips">'+list.map(function(c,i){
      return '<span class="fact-chip" style="--chip-i:'+i+'">'+esc(c)+'</span>';
    }).join('')+'</div>';
  }

  /* Sabab -> natija. Har sahnada bitta, matn — STORY dan. */
  function causeHTML(sc){
    if(!sc.cause||!sc.effect) return '';
    return '<div class="cause-effect"><span class="ce-part"><i>'+esc(S.ui.causeLabel)+'</i>'+esc(sc.cause)+
      '</span><span class="ce-arrow" aria-hidden="true"></span><span class="ce-part ce-out"><i>'+
      esc(S.ui.effectLabel)+'</i>'+esc(sc.effect)+'</span></div>';
  }

  /* Vertikal integratsiya ko'rsatkichi: to'ldirilgan bo'g'in = o'z tizimimizda.
     Raqam yozilmaydi — faqat vizual holat.                                */
  function chainHTML(sc){
    var own={}; (sc.own||[]).forEach(function(i){ own[i]=1; });
    var h='<div class="chain-strip"><div class="chain-head"><span>'+esc(S.ui.chainTitle)+
      '</span><span class="chain-key"><i class="on"></i>'+esc(S.ui.chainOwn)+'</span></div><ol>';
    S.chain.forEach(function(name,i){
      var cls=(own[i]?'on':'off')+(sc.focus===i?' focus':'');
      h+='<li class="'+cls+'" style="--link-i:'+i+'"><span class="bar"></span><span class="nm">'+esc(name)+'</span></li>';
    });
    return h+'</ol></div>';
  }

  /* Diagramma faqat manbadagi raqamlar bilan chiziladi. */
  function chartHTML(ch){
    if(!ch||!ch.rows||!ch.rows.length) return '';
    var max=Math.max.apply(null,ch.rows.map(function(r){return r.value;}).concat([1]));
    var h='<div class="mini-chart"><div class="chart-title">'+esc(ch.title)+'</div>';
    ch.rows.forEach(function(r,i){
      h+='<div class="chart-row'+(r.accent?' accent':'')+'" style="--row-i:'+i+'">'+
        '<span class="cr-label">'+esc(r.label)+'</span>'+
        '<span class="cr-track"><i style="width:'+Math.max(0.6,r.value/max*100)+'%"></i></span>'+
        '<b class="cr-value">'+uzNumber(r.value,0)+(r.unit?' <span>'+esc(r.unit)+'</span>':'')+'</b></div>';
    });
    return h+'</div>';
  }

  /* Yo'l xaritasi. Sana berilmagan nuqtada "—" turadi, raqam o'ylab topilmaydi. */
  var ROAD_LABEL={done:'Bajarildi',live:'Ishga tushgan',now:'Hozir',building:'Qurilmoqda',planned:'Rejada'};
  function roadmapHTML(list){
    if(!list||!list.length) return '';
    var h='<div class="roadmap"><ol>';
    list.forEach(function(pt,i){
      var known=!!pt.year;
      h+='<li class="rm '+pt.state+(known?'':' unknown')+'" style="--rm-i:'+i+'">'+
        '<span class="rm-dot" aria-hidden="true"></span>'+
        '<span class="rm-title">'+esc(pt.title)+'</span>'+
        '<span class="rm-year">'+(known?esc(pt.year):esc(S.ui.empty))+'</span>'+
        '<span class="rm-state">'+esc(ROAD_LABEL[pt.state]||'')+'</span></li>';
    });
    return h+'</ol></div>';
  }

  /* Reja kartalari. Qiymat tasdiqlanmagan bo'lsa karta xira va "—". */
  function plansHTML(pl){
    if(!pl) return '';
    var h='<div class="plans">';
    pl.cards.forEach(function(c,i){
      var has=c.value!==null&&c.value!==undefined&&c.value!=='';
      h+='<div class="plan'+(has?'':' empty')+'" style="--plan-i:'+i+'"><div class="plan-label">'+esc(c.label)+
        '</div><div class="plan-value">'+(has?esc(c.value):esc(S.ui.empty))+
        (has&&c.unit?' <span>'+esc(c.unit)+'</span>':'')+'</div></div>';
    });
    h+='</div><div class="plan-deadline"><span>Muddat</span><b>'+
      (pl.deadline?esc(pl.deadline):esc(S.ui.empty))+'</b></div>';
    return h;
  }

  function photoFor(sc){
    if(!sc||!sc.photo||!S.photos||!S.photos.length) return null;
    for(var i=0;i<S.photos.length;i++) if(S.photos[i].key===sc.photo) return S.photos[i];
    return null;
  }

  /* ------------------------------------------------------------- hero -- */
  function fillHero(){
    var h=S.hero;
    document.getElementById('hero-eyebrow').textContent=h.eyebrow;
    document.getElementById('hero-title').innerHTML=h.title;
    document.getElementById('hero-line').innerHTML=h.line;
    document.getElementById('hero-lead').innerHTML='<b>'+h.lead+'</b> <span>'+h.leadMuted+'</span>';
    document.getElementById('hero-chips').innerHTML=h.chips.map(function(c){
      return '<span class="fact-chip">'+esc(c)+'</span>';
    }).join('');
    document.getElementById('hero-count').innerHTML='00 <span>/ '+pad2(CH.length-1)+'</span>';
    document.getElementById('load-state').textContent=S.ui.loading;
  }
  fillHero();

  P.renderSummary=function(force){
    var key=cur+':'+slotOf();
    if(!force&&key===renderedKey)return;   /* bir sahna — bir render, aks holda
                                              sanoq boshlang'ich qiymatni yo'qotadi */
    renderedKey=key;
    metricTweens=[];
    var hero=isHero(cur);
    document.body.classList.toggle('on-hero',hero);
    heroEl.hidden=!hero; heroEl.inert=!hero;
    caption.hidden=hero;
    if(hero){ slideCopy.innerHTML=''; dataCopy.innerHTML=''; photoBtn.hidden=true; return; }
    var sc=currentScene(); if(!sc) return;
    slideCopy.innerHTML=
      '<div class="slide-period">'+esc(sc.period)+'</div>'+
      '<div class="slide-category eyebrow">'+esc(sc.eyebrow)+'</div>'+
      '<h1 id="slide-title">'+sc.title+'</h1>'+
      '<p class="slide-intro">'+esc(sc.intro)+'</p>';
    dataCopy.innerHTML=
      '<p class="data-lead"><b>'+esc(sc.conclusion)+'</b> <span>'+esc(sc.lead)+'</span></p>'+
      causeHTML(sc)+figuresHTML(sc.figures)+chartHTML(sc.chart)+
      chipsHTML(sc.chips)+roadmapHTML(sc.roadmap)+plansHTML(sc.plans)+
      (sc.brandMark?'<div class="data-mark">'+esc(S.brand)+'<span>.</span></div>':'')+
      chainHTML(sc);
    var ph=photoFor(sc);
    photoBtn.hidden=!ph;
    photoBtn.dataset.key=ph?ph.key:'';
    layers.forEach(function(l){l.scrollTop=0;l.classList.toggle('expanded',infoExpanded);});
  };

  function setExpanded(v){
    infoExpanded=v;layers.forEach(function(l){l.classList.toggle('expanded',v);});document.body.classList.toggle('info-expanded',v);
    infoToggle.innerHTML=icon(v?'minus':'plus');infoToggle.setAttribute('aria-expanded',String(v));
    infoToggle.setAttribute('aria-label',v?'Ma’lumotni yig‘ish':'Barcha ma’lumotni ko‘rsatish');P.layout();invalidateScene();
  }
  infoToggle.hidden=false;infoToggle.innerHTML=icon('plus');
  infoToggle.addEventListener('click',function(){setExpanded(!infoExpanded);});

  function renderBeatNav(){
    beatSlot=-1;beatNav.innerHTML='';
    if(isHero(cur))return;
    CH[cur].beats.forEach(function(id,i){
      var b=document.createElement('button');b.textContent=pad2(i+1);b.title=BEATS[id].t;
      b.setAttribute('aria-label',BEATS[id].t+' sahnasini ko‘rish');
      b.addEventListener('click',function(){P.selectBeat(i);});beatNav.appendChild(b);
    });
  }
  P.onBeat=function(id){
    state.currentBeat=id;var slot=CH[cur]?CH[cur].beats.indexOf(id):-1;
    document.getElementById('beat-title').textContent=BEATS[id]?BEATS[id].t:'';
    document.getElementById('beat-index').textContent=pad2(slot+1)+' / '+pad2(CH[cur]?CH[cur].beats.length:1);
    Array.from(beatNav.children).forEach(function(b,i){b.setAttribute('aria-current',String(i===slot));});
    /* har sahna o'z matnini oladi: bo'lim ichida ham matn almashadi */
    if(started)P.renderSummary();
    hideTip();
  };
  P.updateHUD=function(){
    if(cur<0)return;
    state.currentChapter=cur;
    document.getElementById('ch-num').textContent=pad2(cur);
    document.getElementById('ch-title').textContent=CH[cur].t;
    document.getElementById('chapter-count').innerHTML=pad2(cur)+' <span>/ '+pad2(CH.length-1)+'</span>';
    var lastSlot=isHero(cur)||state.slot>=CH[cur].beats.length-1;
    var last=cur===CH.length-1&&lastSlot, nextBtn=document.getElementById('next');
    document.getElementById('prev').disabled=(cur===0&&(isHero(cur)||state.slot===0))||EX.on;
    nextBtn.disabled=EX.on;nextBtn.classList.toggle('replay',last);
    nextBtn.innerHTML=last?icon('replay')+'<span class="button-label">'+S.ui.replay+'</span>'
                          :'<span class="button-label">'+S.ui.next+'</span>'+icon('arrow');
    nextBtn.setAttribute('aria-label',last?'Boshiga qaytish':S.ui.next);
    P.updateProgress();P.updateStatus();
  };
  P.updateProgress=function(){
    if(cur<0)return;
    elDone.style.width=((cur+1)/CH.length*100)+'%';
    progEl.setAttribute('aria-valuemax',String(CH.length));
    progEl.setAttribute('aria-valuenow',String(cur+1));
    progEl.setAttribute('aria-valuetext',pad2(cur)+' / '+pad2(CH.length-1)+' · '+CH[cur].t);
    state.remainingTime=0;
  };
  P.updateStatus=function(){
    var status=document.getElementById('presentation-status');
    if(status) status.innerHTML='<i></i>Sizning sur’atingizda';
  };
  P.setPlaying=function(v){ /* avtoijro yo'q: operator har bo'limni o'zi ochadi */ };
  function announce(){
    var sc=currentScene();
    document.getElementById('chapter-announcement').textContent=
      pad2(cur)+' / '+pad2(CH.length-1)+'. '+CH[cur].t+(sc?'. '+sc.intro:'');
  }
  /* ------------------------------------------------------------ sahna --
     Bir bo'lim ketma-ket sahnalardan iborat. Har sahna o'z animatsiyasini
     o'ynaydi va SHU YERDA TO'XTAB TURADI — keyingisi faqat klik bilan
     ochiladi (nutq ritmi operator qo'lida).                              */
  function slotStart(ci,slot){ return CH[ci].times.slice(0,slot).reduce(function(a,b){return a+b;},0); }
  function slotLimitOf(ci,slot){
    var c=CH[ci], last=slot>=c.beats.length-1;
    return last?c.dur:Math.max(0,slotStart(ci,slot)+c.times[slot]-0.001);
  }
  function slotFromProg(ci,p){
    var c=CH[ci], tp=p*c.dur, acc=0;
    for(var i=0;i<c.beats.length;i++){
      if(tp<acc+c.times[i]||i===c.beats.length-1) return i;
      acc+=c.times[i];
    }
    return 0;
  }
  function armSlot(ci,slot,atEnd){
    var c=CH[ci], lim=slotLimitOf(ci,slot);
    state.slot=slot; state.slotLimit=lim;
    var t=(atEnd||REDUCED)?lim:slotStart(ci,slot);
    state.sequenceElapsed=t; prog=c.dur?t/c.dur:0;
    state.slotDone=t>=lim-1e-6;
    state.sequenceComplete=state.slotDone&&slot>=c.beats.length-1;
    if(state.sequenceComplete)state.completed.add(ci);
  }
  function playSlot(slot){
    if(isHero(cur))return;
    armSlot(cur,clamp(slot,0,CH[cur].beats.length-1),false);
    state.isPaused=false;lastNow=performance.now();
    P.updateHUD();invalidateScene(1400);
  }
  P.slotInfo=function(){return {chapter:cur,slot:state.slot,slots:isHero(cur)?1:CH[cur].beats.length,
    beat:curBeat,done:!!state.slotDone,hero:isHero(cur)};};
  function holdSlot(slot){
    if(isHero(cur))return;
    armSlot(cur,clamp(slot,0,CH[cur].beats.length-1),true);
    P.updateHUD();invalidateScene(1000);
  }
  function finishSlot(){
    state.sequenceElapsed=state.slotLimit;prog=CH[cur].dur?state.slotLimit/CH[cur].dur:1;
    state.slotDone=true;
    if(state.slot>=CH[cur].beats.length-1){state.sequenceComplete=true;state.completed.add(cur);}
    P.updateHUD();invalidateScene(900);
  }
  function blocked(){return !!(state.panel||EX.on||document.hidden);}
  function stillOf(idx){return window.STILL&&STILL[idx]||null;}
  function poseAt(p){
    var b=beatAt(cur,p),sc=BEATS[b.idx];
    if(b.idx!==curBeat)enterBeat(b.idx,false);
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
    var _slot=slotFromProg(i,prog);
    state.slot=_slot;state.slotLimit=slotLimitOf(i,_slot);
    state.slotDone=state.sequenceElapsed>=state.slotLimit-1e-6;
    state.sequenceComplete=state.slotDone&&_slot>=CH[i].beats.length-1;
    if(infoExpanded)setExpanded(false);
    document.body.dataset.chapter=String(i);
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
    invalidateScene(1700);
  };
  P.selectBeat=function(slot){
    if(!started||state.isTransitioning||blocked()||isHero(cur))return;
    holdSlot(slot);
  };
  P.playSlot=playSlot; P.holdSlot=holdSlot;
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
  /* Taqdimot 00-bo'limda (hero) ochiladi; sanoq va yuklash ekrani yo'q. */
  P.start=function(replay){
    if(state.panel)P.closePanel();if(EX.on)P.explore(false);
    started=false;state.isPaused=false;state.completed.clear();
    state.transition=null;state.isTransitioning=false;state.queuedChapter=null;
    layers.forEach(function(l){l.classList.remove('is-leaving','is-entering');l.inert=false;});
    veil.style.opacity='0';
    started=true;shell.inert=false;metricValues={};renderedKey=null;
    commit(0,{instant:true});
    if(replay)document.getElementById('hero-cta').focus({preventScroll:true});
    lastNow=performance.now();invalidateScene();
  };
  P.layout=function(){
    var r=frameEl.getBoundingClientRect();
    P.view={left:r.left,top:r.top,width:Math.max(1,r.width),height:Math.max(1,r.height),right:r.right,bottom:r.bottom};
    var style=document.documentElement.style;
    style.setProperty('--view-left',r.left+'px');style.setProperty('--view-top',r.top+'px');
    style.setProperty('--view-right',(innerWidth-r.right)+'px');style.setProperty('--view-bottom',(innerHeight-r.bottom)+'px');
  };

  /* --------------------------------------------------- foto (overlay) -- */
  P.openPanel=function(which){
    if(!started||state.isTransitioning||which!=='photo')return;
    var sc=currentScene(), ph=photoFor(sc); if(!ph)return;
    panelFocus=document.activeElement;
    state.panel='photo';hideTip();
    photoImg.src='assets/photos/'+ph.file; photoImg.alt=ph.caption||'';
    photoCap.textContent=ph.caption||'';
    shell.inert=true;shade.hidden=false;
    photoEl.hidden=false;photoEl.inert=false;photoEl.setAttribute('aria-hidden','false');
    requestAnimationFrame(function(){photoEl.classList.add('open');});
    document.getElementById('photo-close').focus({preventScroll:true});
  };
  P.closePanel=function(restore){
    if(!state.panel)return;
    photoEl.classList.remove('open');photoEl.inert=true;photoEl.setAttribute('aria-hidden','true');
    photoEl.hidden=true;photoImg.removeAttribute('src');
    state.panel=null;shell.inert=!started;shade.hidden=true;lastNow=performance.now();
    if(restore!==false&&panelFocus&&panelFocus.isConnected)panelFocus.focus({preventScroll:true});
    invalidateScene();
  };
  P.refreshFigures=function(){ if(cur>=0)P.renderSummary(true); };

  P.explore=function(v){
    v=!!v;if(v===EX.on||!started||state.isTransitioning||state.panel)return;
    hideTip();clearAnchors();
    if(v){
      var prev=BEATS[curBeat];if(prev&&prev.exit)prev.exit();
      EX.saved={chapter:cur,progress:prog,sequenceElapsed:state.sequenceElapsed,holdElapsed:state.holdElapsed,complete:state.sequenceComplete,paused:state.isPaused};
      EX.on=true;stage(['farm','slaughter','cluster','flows','roads','roads2','trucks','dust','crew','grass']);
      prepBuilds(15);envSnap('day');setClip(false);compMat.uniforms.fade.value=0;
      EX.tgt.set(110,10,20);EX.wantTgt.copy(EX.tgt);EX.dist=EX.wantDist=420;EX.yaw=EX.wantYaw=-.7;EX.pitch=EX.wantPitch=.52;
      Array.from(exChips.children).forEach(function(b){b.setAttribute('aria-pressed','false');});
    }else{
      EX.on=false;EX.drag=null;document.body.classList.remove('dragging');
      var saved=EX.saved;cur=saved.chapter;prog=saved.progress;
      enterBeat(beatAt(cur,prog).idx,true);
      state.sequenceElapsed=saved.sequenceElapsed;state.holdElapsed=saved.holdElapsed;
      state.sequenceComplete=saved.complete;state.isPaused=saved.paused;
    }
    exPanel.classList.toggle('on',v);document.body.classList.toggle('exploring',v);
    exBtn.setAttribute('aria-pressed',String(v));
    layers.forEach(function(l){l.inert=v;});beatNav.inert=v;
    lastNow=performance.now();P.layout();P.updateHUD();invalidateScene(1800);
  };
  function tickMetrics(dt){
    metricTweens=metricTweens.filter(function(a){
      a.t=Math.min(1,a.t+dt/1.25);
      var el=document.getElementById(a.el);
      if(el)el.textContent=figureText(a.f,lerp(a.from,a.to,easeOut(a.t)));
      return a.t<1;
    });
  }
  P.frame=function(now){
    if(document.hidden)return;
    now=now||performance.now();var wallDt=Math.max(0,(now-lastNow)/1000),dt=Math.min(wallDt,.05);lastNow=now;
    var suspended=!!state.panel, active=started&&!suspended&&!EX.on&&!state.isTransitioning&&!state.isPaused;
    var sequence=active&&!state.slotDone;
    var transitions=state.isTransitioning&&!suspended;
    var live=sequence||transitions||!suspended&&(metricTweens.length||blend.on)||EX.on&&now<dirtyUntil;
    if(!live&&now>dirtyUntil)return;
    if(transitions)transitionTick(wallDt);
    if(!started){if(step>=BUILD_STEPS.length){var bootPose=cur>=0?poseAt(prog):null;if(bootPose){lookNow.copy(bootPose.target);camera.lookAt(bootPose.target);envApply(bootPose.target,280);if(window.ENV)ENV.tick();}renderFrame(0);}if(!frameHandle)frameHandle=requestAnimationFrame(frame);return;}
    if(sequence){
      var lim=state.slotLimit===undefined?CH[cur].dur:state.slotLimit;
      state.sequenceElapsed=Math.min(lim,state.sequenceElapsed+wallDt);
      prog=CH[cur].dur?state.sequenceElapsed/CH[cur].dur:0;
      if(state.sequenceElapsed>=lim-1e-6){
        state.slotDone=true;
        if(state.slot>=CH[cur].beats.length-1){state.sequenceComplete=true;state.completed.add(cur);}
        P.updateHUD();invalidateScene(600);
      }
    }
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
      focusNow=(REDUCED||pose.still)?focus:damp(focusNow,focus,6.5,dt);
      compMat.uniforms.focus.value=focusNow;compMat.uniforms.range.value=Math.max(8,focusNow*1.4);
      if(animateWorld)worldTick(elapsed,dt,camera);
      else if(pose.still&&stillPrime&&started){
        stillPrime=false;camera.updateMatrixWorld();worldTick(elapsed,1/60,camera);
      }else{if(window.ENV)ENV.tick();}
      if(curBeat===4)updateAnchors(!state.isTransitioning&&!state.panel&&pose.upP>.42);else updateAnchors(false);
      if(!suspended)tickMetrics(dt);P.updateProgress();renderFrame(elapsed);
    }
    if(!frameHandle)frameHandle=requestAnimationFrame(frame);
  };

  /* ------------------------------------------------------- boshqaruv --- */
  document.getElementById('prev').innerHTML=icon('left')+'<span class="button-label">'+S.ui.prev+'</span>';
  function navIndex(){return state.queuedChapter?state.queuedChapter.i:state.transition?state.transition.i:cur;}
  /* Bir klik = bir fikr: avval joriy sahna animatsiyasi tugatiladi, keyin
     keyingi sahna, bo'lim tugagach — keyingi bo'lim (veil bilan).        */
  function next(){
    /* bo'limlar orasidagi o'tish (1,45 s) davomida bosilgan klik e'tiborsiz
       qoldiriladi — aks holda tasodifiy ikkinchi klik butun bo'limni
       o'tkazib yuborardi. Jonli taqdimotda bu qabul qilinmaydi.        */
    if(state.isTransitioning||state.panel)return;
    if(!isHero(cur)){
      if(!state.slotDone){finishSlot();return;}
      if(state.slot<CH[cur].beats.length-1){playSlot(state.slot+1);return;}
    }
    if(cur===CH.length-1)P.start(true);else P.goTo(cur+1);
  }
  function prev(){
    if(state.isTransitioning||state.panel)return;
    if(!isHero(cur)&&state.slot>0){holdSlot(state.slot-1);return;}
    if(cur>0)P.goTo(cur-1,{at:1});
  }
  document.getElementById('next').addEventListener('click',next);
  document.getElementById('prev').addEventListener('click',prev);
  document.getElementById('hero-cta').addEventListener('click',function(){P.goTo(1);});
  document.getElementById('hero-link').addEventListener('click',function(){P.goTo(1);});
  photoBtn.addEventListener('click',function(){P.openPanel('photo');});
  document.getElementById('photo-close').addEventListener('click',function(){P.closePanel();});
  photoEl.addEventListener('click',function(e){ if(e.target===photoEl||e.target===photoImg)P.closePanel(); });
  shade.addEventListener('click',function(){P.closePanel();});

  function fullscreen(){
    var d=document, el=d.documentElement;
    try{
      if(d.fullscreenElement||d.webkitFullscreenElement){ (d.exitFullscreen||d.webkitExitFullscreen).call(d); }
      else{ var r=(el.requestFullscreen||el.webkitRequestFullscreen).call(el); if(r&&r.catch)r.catch(function(){}); }
    }catch(e){}
  }
  document.getElementById('hero-full').addEventListener('click',fullscreen);
  P.fullscreen=fullscreen;

  /* Pult (PageUp/PageDown), o'q tugmalar, probel, F — to'liq ekran. */
  window.addEventListener('keydown',function(e){
    if(e.key==='Escape'){
      if(state.panel)P.closePanel();else if(EX.on)P.explore(false);else if(infoExpanded)setExpanded(false);
      return;
    }
    if(state.panel){
      if(e.key==='ArrowRight'||e.key==='PageDown'||e.key==='ArrowLeft'||e.key==='PageUp'){P.closePanel();e.preventDefault();}
      return;
    }
    if(!started||blocked()||e.altKey||e.ctrlKey||e.metaKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable)return;
    var k=e.key;
    if(k==='ArrowRight'||k==='PageDown')next();
    else if(k==='ArrowLeft'||k==='PageUp')prev();
    else if(k==='Home')P.goTo(0);
    else if(k==='End')P.goTo(CH.length-1);
    else if(k===' '&&e.target.tagName!=='BUTTON')next();
    else if(k==='f'||k==='F')fullscreen();
    else return;
    e.preventDefault();
  });

  /* Kanvasga klik — keyingi bo'lim (operator pultsiz ham o'tadi). */
  var swipe=null, swipePointers=new Set();
  canvas.addEventListener('pointerdown',function(e){
    if(EX.on||!started||blocked())return;
    swipePointers.add(e.pointerId);
    swipe=swipePointers.size===1?{id:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now()}:null;
    if(e.pointerType!=='mouse'){try{canvas.setPointerCapture(e.pointerId);}catch(err){}}
  });
  canvas.addEventListener('pointerup',function(e){
    swipePointers.delete(e.pointerId);var s=swipe;swipe=null;
    if(!s||s.id!==e.pointerId||EX.on||!started||blocked()||isHero(cur))return;
    var dx=e.clientX-s.x,dy=e.clientY-s.y;
    if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5&&performance.now()-s.t<1400){P.goTo(navIndex()+(dx<0?1:-1));return;}
    if(Math.abs(dx)<8&&Math.abs(dy)<8)next();
  });
  canvas.addEventListener('pointercancel',function(e){swipe=null;swipePointers.delete(e.pointerId);});

  var motion=matchMedia('(prefers-reduced-motion: reduce)');
  motion.addEventListener('change',function(e){
    REDUCED=e.matches;
    if(REDUCED){blend.on=false;metricTweens=[];if(started){state.sequenceElapsed=CH[cur].dur;state.sequenceComplete=true;prog=1;P.renderSummary(true);}}
    invalidateScene();
  });
  new ResizeObserver(function(){P.layout();invalidateScene(700);}).observe(frameEl);
  P.layout();P.updateStatus();
})();
