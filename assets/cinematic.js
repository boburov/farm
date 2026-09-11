/* Choreography, responsive composition and bounded background work. */
(function(){
  window.enhanceSceneUI=function(){
    document.body.dataset.beat=curBeat;
    sceneLayer.querySelectorAll('.z-right').forEach(function(panel){
      if(panel.querySelector('.panel-toggle'))return;
      var title=panel.querySelector('h3'),button=document.createElement('button');button.className='panel-toggle';
      button.textContent=(title?title.textContent:'Tafsilotlar')+' +';button.setAttribute('aria-expanded','false');
      button.addEventListener('click',function(){var open=panel.classList.toggle('expanded');button.setAttribute('aria-expanded',String(open));button.textContent=(title?title.textContent:'Tafsilotlar')+(open?' −':' +');if(window.invalidateScene)invalidateScene();});
      panel.prepend(button);
    });
  };
  var originalEnter=enterBeat;
  enterBeat=function(i,hard){originalEnter(i,hard);enhanceSceneUI();noteSceneLayer();if(window.invalidateScene)invalidateScene();};
  var originalRefresh=refreshFigures;
  refreshFigures=function(){originalRefresh();enhanceSceneUI();noteSceneLayer();if(window.invalidateScene)invalidateScene();};
  // Authored shot poses respond to normalized story progress; ambient motion is separate.
  BEATS[1].cam=[[-34,2.4,71],[-25,1.2,66],[-22,.72,62.8],[-21.6,.65,62.4]];
  BEATS[1].look=[[-23,.4,61],[-20.7,.33,60],[-20,.29,60],[-20,.29,60]];
  var farmEnter=BEATS[1].enter;
  BEATS[1].enter=function(){farmEnter.call(this);var b=FLOCK.birds[0];b.setAge(2);b.p.set(-20,FLOCK.ground,60);b.head=-.72;b.beh=BEH.IDLE;b.t=20;b.target=null;b.speed=0;b.want=0;};
  // Cinematic camera: composition offsets leave a clear field for existing data panels.
  var originalLook=camera.lookAt, hasRight=false, lastLook=performance.now(), lastOx=null, lastOy=null;
  window.noteSceneLayer=function(){ hasRight=!!sceneLayer.querySelector('.z-right'); };
  camera.lookAt=function(target){
    var portrait=W/H<.85,landscape=H<500&&W>H,studio=BEATS[curBeat]&&BEATS[curBeat].env==='studio';
    var fov=portrait?(studio?(curBeat===4?74:60):48):38;
    if(EX.on)fov=portrait?52:38;
    /* the lens eases to the wanted focal length instead of popping */
    var now=performance.now(), k=1-Math.exp(-Math.min(.1,(now-lastLook)/1000)*7); lastLook=now;
    var nf=Math.abs(camera.fov-fov)<.02?fov:camera.fov+(fov-camera.fov)*k;
    var ox=!portrait&&studio&&hasRight?.115:0;
    var oy=portrait?(studio?.10:.07):0;
    if(landscape)oy=.03;
    if(nf!==camera.fov||ox!==lastOx||oy!==lastOy){ camera.fov=nf; lastOx=ox; lastOy=oy; camera.setViewOffset(W,H,W*ox,H*oy,W,H); camera.updateProjectionMatrix(); }
    return originalLook.call(camera,target);
  };
  // Lightweight breathing / glances / blink on the hero's authored existing bones.
  var originalWorld=worldTick;
  worldTick=function(t,dt,cam){
    originalWorld(t,dt,cam);
    if(G.heroHenPhoto&&G.birdLive.visible&&G.studio.visible){
      var ph=G.heroHenPhoto,s0=ph.userData.s,br0=REDUCED?0:Math.sin(t*1.5)*.005;
      ph.scale.set(s0*(1+br0*.35),s0*(1+br0),s0*(1+br0*.35));
      ph.rotation.y=REDUCED?0:Math.sin(t*.23)*.045+Math.sin(t*.61)*.015;
      ph.rotation.z=REDUCED?0:Math.sin(t*.31)*.01;
    }else if(G.heroHenRig&&G.heroHenRig.bones&&G.birdLive.visible&&G.studio.visible){
      var b=G.heroHenRig.bones,br=REDUCED?0:Math.sin(t*1.7)*.004;
      b.chest.scale.set(1+br,1+br*.5,1);b.tail.rotation.x=REDUCED?0:Math.sin(t*.65)*.025;
      b.head.rotation.y=REDUCED?0:Math.sin(t*.38)*.05;
      var blink=REDUCED?0:Math.max(0,1-Math.abs((t%5.4)-3.2)/.09);b.lids.rotation.x=blink*.50;
    }
  };
  // Two pointers pinch; single pointer retains the established orbit behavior.
  var touches=new Map(),pinch=0;
  canvas.addEventListener('pointerdown',function(e){if(!EX.on)return;touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size===2){var p=Array.from(touches.values());pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);EX.drag=null;EX.moved=10;}});
  canvas.addEventListener('pointermove',function(e){if(!EX.on||!touches.has(e.pointerId))return;touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size===2){var p=Array.from(touches.values()),d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinch>0&&d>0)EX.wantDist=clamp(EX.wantDist*pinch/d,24,900);pinch=d;EX.drag=null;EX.moved=10;}});
  function release(e){touches.delete(e.pointerId);pinch=0;if(!touches.size){EX.drag=null;document.body.classList.remove('dragging');}}
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
  // Progress dragging uses the same duration scale as native document scrolling.
  var seeking=false;
  progEl.addEventListener('pointerdown',function(e){if(EX.on)setExplore(false);seeking=true;setPlaying(false);progEl.setPointerCapture(e.pointerId);seekFromClient(e.clientX);});
  progEl.addEventListener('pointermove',function(e){if(seeking)seekFromClient(e.clientX);});
  progEl.addEventListener('pointerup',function(){seeking=false;});progEl.addEventListener('pointercancel',function(){seeking=false;});
  var initialOpen=openEditor,initialClose=closeEditor,lastFocus=null;
  openEditor=function(){lastFocus=document.activeElement;initialOpen();editor.inert=false;editor.querySelector('input')?.focus({preventScroll:true});};
  closeEditor=function(){initialClose();editor.inert=true;if(lastFocus)lastFocus.focus({preventScroll:true});};
  // Existing listeners captured the original declarations; replace with the accessible wrapper.
  document.getElementById('edit-open').removeEventListener('click',initialOpen);document.getElementById('edit-open').addEventListener('click',openEditor);
  document.getElementById('edit-close').removeEventListener('click',initialClose);document.getElementById('edit-close').addEventListener('click',closeEditor);
  editor.inert=true;
  editor.addEventListener('keydown',function(e){if(e.key!=='Tab')return;var el=Array.from(editor.querySelectorAll('button,input')),first=el[0],last=el[el.length-1];if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault();}});
})();
