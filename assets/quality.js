/* Performance: static geometry merging per material inside stage groups, adaptive quality tiers (pixel ratio, occlusion,
 * shadow map size) driven by measured frame time while the story plays, and housekeeping. Loads after the main script. */
(function(){
  var T=THREE, Q=window.QUALITY={tier:0,base:DPR,dpr:DPR,aoOff:false,merged:0,mergedMeshes:0,log:[]};
  function tickAncestor(o,root){ while(o&&o!==root){ if(o.userData.tick||o.userData.noMerge||o.userData.owner) return true; o=o.parent; } return false; }
  function sig(m){ var g=m.geometry; return m.material.uuid+'|'+Object.keys(g.attributes).sort().join(',')+'|'+(g.index?'i':'n')+'|'+(m.castShadow?1:0)+(m.receiveShadow?1:0); }
  /** Merge every static, opaque, non-animated mesh under root that shares a material into one mesh per material. */
  Q.mergeStatic=function(root){
    if(!root||!T.BufferGeometryUtils) return 0;
    root.updateMatrixWorld(true); var inv=new T.Matrix4().copy(root.matrixWorld).invert(), groups={};
    root.traverse(function(m){
      if(!m.isMesh||m.isInstancedMesh||m.isSkinnedMesh||m===root||Array.isArray(m.material)) return;
      if(m.material.transparent||m.userData.noMerge||m.userData.tick||m.userData.owner||tickAncestor(m.parent,root)) return;
      if(!m.geometry.attributes.position||m.geometry.attributes.position.count>40000) return;
      var k=sig(m); (groups[k]=groups[k]||[]).push(m);
    });
    var removed=0;
    Object.keys(groups).forEach(function(k){
      var list=groups[k]; if(list.length<2) return;
      var geos=list.map(function(m){ var g=m.geometry.clone(); g.applyMatrix4(new T.Matrix4().multiplyMatrices(inv,m.matrixWorld)); return g; });
      var merged=T.BufferGeometryUtils.mergeBufferGeometries(geos,false); geos.forEach(function(g){ g.dispose(); });
      if(!merged) return;
      var mesh=new T.Mesh(merged,list[0].material); mesh.castShadow=list[0].castShadow; mesh.receiveShadow=list[0].receiveShadow; mesh.userData.mergedFrom=list.length; mesh.userData.noMerge=true;
      root.add(mesh); list.forEach(function(m){ if(m.parent) m.parent.remove(m); }); removed+=list.length; Q.mergedMeshes++;
    });
    Q.merged+=removed; return removed;
  };
  /** Roots are chosen so construction staging, interior shell toggles and Explore raycasting keep working. */
  Q.mergeAll=function(){
    var roots=[], t0=performance.now();
    Object.keys(FAC).forEach(function(k){ var f=FAC[k]; if(!f) return; if(f.userData.stages){ ['slab','frame','shell','detail'].forEach(function(s){ if(f.userData.stages[s]) roots.push(f.userData.stages[s]); }); } else roots.push(f); });
    [G.farm,G.cluster].forEach(function(g){ if(!g) return; g.children.forEach(function(c){ if(c.isGroup&&c.userData.w&&!FAC[c.name]&&roots.indexOf(c)<0) roots.push(c); }); });
    if(G.market) roots.push(G.market); if(G.retail) roots.push(G.retail); if(G.lamps) roots.push(G.lamps);
    var n=0; roots.forEach(function(r){ n+=Q.mergeStatic(r); });
    Q.log.push('merged '+n+' meshes into '+Q.mergedMeshes+' in '+Math.round(performance.now()-t0)+' ms');
    return n;
  };
  /* run once everything is built, before the warm-up compile */
  var idx=-1; for(var i=0;i<BUILD_STEPS.length;i++) if(BUILD_STEPS[i][0]==='Shaderlar tayyorlanmoqda') idx=i;
  if(idx>0) BUILD_STEPS.splice(idx,0,['Geometriya birlashtirilmoqda',function(){ Q.mergeAll(); Q.collectCasters(); }]);

  /* ---- adaptive quality: measured while the story plays; a stopped on-demand loop is never read as slow */
  var TIERS=SMALL?[{d:1,ao:false,sh:1024},{d:.85,ao:false,sh:1024},{d:.7,ao:false,sh:1024}]:[{d:1,ao:true,sh:3072},{d:.85,ao:true,sh:2048},{d:.72,ao:false,sh:2048},{d:.6,ao:false,sh:1024}];
  var samples=[],last=0,skip=45,lastChange=0,upStreak=0;
  Q.apply=function(i){
    var t=TIERS[i]; Q.tier=i; Q.dpr=+(Q.base*t.d).toFixed(2); Q.aoOff=!t.ao; DPR=Q.dpr; renderer.setPixelRatio(DPR); makeTargets();
    if(sun.shadow.mapSize.x!==t.sh){ sun.shadow.mapSize.set(t.sh,t.sh); if(sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map=null; } }
    CINEMA_STATS.quality=i; CINEMA_STATS.dpr=DPR; skip=45; samples.length=0; lastChange=performance.now(); Q.log.push('tier '+i+' dpr '+DPR); invalidateScene();
  };
  var origRender=renderFrame;
  renderFrame=function(t){
    var now=performance.now(); origRender(t);
    if(started&&playing&&!EX.on&&!document.hidden){ if(last){ var d=now-last; if(skip>0) skip--; else if(d<250) samples.push(d); } last=now; } else last=0;
    if(samples.length>=45&&now-lastChange>2500){
      var s=samples.slice().sort(function(a,b){return a-b;}), p50=s[s.length>>1]; samples.length=0; var slow=SMALL?38:21, fast=SMALL?26:13;
      if(p50>slow&&Q.tier<TIERS.length-1) Q.apply(Q.tier+1);
      else if(p50<fast&&Q.tier>0&&now-lastChange>6000){ if(++upStreak>=3){ upStreak=0; Q.apply(Q.tier-1); } }
      else upStreak=0;
    }
  };
  window.addEventListener('resize',function(){ Q.base=Math.min(devicePixelRatio||1,SMALL?1.35:1.5); Q.apply(Q.tier); });
  /* far static meshes stop casting shadows: at aerial distances a shadow texel spans tens of centimetres */
  var casters=[],_cv=new T.Vector3(),frameNo=0;
  Q.collectCasters=function(){ casters.length=0; scene.traverse(function(o){ if(o.isMesh&&!o.isSkinnedMesh&&!o.isInstancedMesh&&o.castShadow&&(o.userData.mergedFrom||o.userData.noMerge)) { o.userData.shadowCaster=true; casters.push(o); } }); Q.log.push('shadow casters tracked: '+casters.length); };
  var origWT=worldTick; worldTick=function(t,dt,cam){ origWT(t,dt,cam); if((frameNo++%8)!==0) return; for(var i=0;i<casters.length;i++){ var o=casters[i]; if(!o.parent) continue; o.getWorldPosition(_cv); o.castShadow=_cv.distanceTo(cam.position)<260; } };
  CINEMA_STATS.quality=0;
})();
