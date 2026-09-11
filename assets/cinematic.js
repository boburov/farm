/* Authored camera, bird motion and Explore pinch. */
(function(){
  // Authored shot poses respond to normalized story progress; ambient motion is separate.
  BEATS[1].cam=[[-34,2.4,71],[-25,1.2,66],[-22,.72,62.8],[-21.6,.65,62.4]];
  BEATS[1].look=[[-23,.4,61],[-20.7,.33,60],[-20,.29,60],[-20,.29,60]];
  var farmEnter=BEATS[1].enter;
  BEATS[1].enter=function(){farmEnter.call(this);var b=FLOCK.birds[0];b.setAge(2);b.p.set(-20,FLOCK.ground,60);b.head=-.72;b.beh=BEH.IDLE;b.t=20;b.target=null;b.speed=0;b.want=0;};
  // Project the existing scene into its dedicated viewport, leaving text unobscured.
  var originalLook=camera.lookAt;
  camera.lookAt=function(){
    var r=window.FarmPresentation&&FarmPresentation.view;
    if(r){
      // Shots were authored for a 16:10 window (studio: the 1.24 desktop frame); a narrower frame keeps the same horizontal field of view.
      var studio=BEATS[curBeat]&&BEATS[curBeat].env==='studio', aspect=r.width/r.height;
      var base=studio?(curBeat===4?55:48):38, ref=studio?1.24:1.6, fov=base;
      if(aspect<ref)fov=2*Math.atan(Math.tan(base*Math.PI/360)*ref/aspect)*180/Math.PI;
      camera.fov=Math.min(fov,studio?72:62);
      camera.setViewOffset(r.width,r.height,-r.left,-r.top,W,H);
    }
    return originalLook.apply(camera,arguments);
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
})();
