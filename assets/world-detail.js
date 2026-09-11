/* Close architectural detail and reusable, distance-limited assets. */
(function(){
  var detailGroups=[],v=new T.Vector3(),oldBox=boxG,roundedCache={};
  function rounded(w,h,d){
    var key=[w,h,d].join('/'),source=roundedCache[key];
    if(!source){
      var radius=Math.min(.12,w*.12,h*.12,d*.12),g=new T.BoxGeometry(w,h,d,3,3,3),p=g.attributes.position;
      for(var i=0;i<p.count;i++){
        var x=p.getX(i),y=p.getY(i),z=p.getZ(i),cx=clamp(x,-w/2+radius,w/2-radius),cy=clamp(y,-h/2+radius,h/2-radius),cz=clamp(z,-d/2+radius,d/2-radius);
        v.set(x-cx,y-cy,z-cz).normalize().multiplyScalar(radius);p.setXYZ(i,cx+v.x,cy+v.y,cz+v.z);
      }g.computeVertexNormals();roundedCache[key]=source=g;
    }return source.clone();
  }
  function bevel(fn){return function(){var previous=boxG;boxG=rounded;try{return fn.apply(this,arguments);}finally{boxG=previous;}};}
  makeTruckV2=bevel(makeTruckV2);makeForklift=bevel(makeForklift);makeConveyor=bevel(makeConveyor);makePacker=bevel(makePacker);pack=bevel(pack);
  function batch(parent,parts,mat,range){if(!parts.length)return;var m=new T.Mesh(mergeGeoms(parts),mat);m.castShadow=false;m.receiveShadow=true;m.userData.noMerge=true;parent.add(m);if(range)detailGroups.push({node:m,range:range});return m;}
  function line(a,b,r){var d=new T.Vector3().subVectors(b,a),g=cylG(r,r,d.length(),8);g.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(new T.Quaternion().setFromUnitVectors(v.set(0,1,0),d.normalize())));g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);return g;}
  var originalHouse=poultryHouse;
  poultryHouse=function(len,wid,opts){
    var g=originalHouse(len,wid,opts),parts=[],dark=[];
    // Standing roof seams, full eave gutters, downpipes and foundations.
    for(var z=-len/2;z<=len/2;z+=1.2)for(var side of [-1,1])parts.push(line(V3(0,7.94,z),V3(side*(wid/2+.52),5.48,z),.025));
    for(var side of [-1,1]){
      parts.push(xform(cylG(.13,.13,len+1.6,10),side*(wid/2+.58),5.38,0,Math.PI/2,0,0));
      for(var z2 of [-len/2+2,len/2-2]){parts.push(xform(cylG(.075,.075,5.15,8),side*(wid/2+.45),2.69,z2));parts.push(line(V3(side*(wid/2+.45),.12,z2),V3(side*(wid/2+1.1),.12,z2),.075));}
      dark.push(xform(oldBox(.12,.22,len),side*(wid/2+.06),.22,0));
      for(var z3=-len/2+3;z3<len/2;z3+=6){parts.push(xform(oldBox(.08,.06,1.9),side*(wid/2+.08),3.1,z3));dark.push(xform(oldBox(.06,.32,1.8),side*(wid/2+.10),2.9,z3));}
    }
    for(var side of [-1,1])parts.push(xform(oldBox(.10,3.25,.15),side*(wid*.21+.05),1.62,len/2+.4));
    parts.push(xform(oldBox(wid*.42+.22,.10,.15),0,3.2,len/2+.4));
    batch(g,parts,MAT.steel,160);batch(g,dark,MAT.wallDark,160);
    g.userData.w=wid;g.userData.d=len;g.userData.h=g.userData.height||8; /* Explore framing reads w/h/d */
    return g;
  };
  var originalFacility=facility;
  facility=function(spec){
    var g=originalFacility(spec),det=g.userData.stages.detail,w=spec.w,d=spec.d,h=spec.h||9,parts=[],dark=[];
    for(var x=-w/2+2;x<w/2;x+=3){parts.push(xform(oldBox(.055,1.8,.10),x,h-2.6,d/2+.13));}
    for(var side of [-1,1]){parts.push(xform(cylG(.09,.09,h,8),side*(w/2+.22),h/2,-d/2+1));parts.push(xform(oldBox(.18,.12,d+1),side*(w/2+.15),h,0));}
    if(spec.docks)for(var i=0;i<spec.docks;i++){
      var dx=-w/2+w/(spec.docks+1)*(i+1);
      for(var y=1.55;y<3.4;y+=.20)parts.push(xform(oldBox(2.95,.025,.04),dx,y,d/2+1.53));
      for(var side of [-1,1]){dark.push(xform(oldBox(.14,1.2,.20),dx+side*1.6,1.55,d/2+1.58));parts.push(xform(cylG(.10,.10,.95,10),dx+side*2.1,.55,d/2+2.6));}
    }
    batch(det,parts,MAT.steel,190);batch(det,dark,MAT.rubber,150);return g;
  };
  var detailedTruck=makeTruckV2;
  makeTruckV2=function(white){
    var g=detailedTruck(white),u=g.userData,parts=[],black=[];
    for(var side of [-1,1]){
      parts.push(line(V3(side*1.22,2.8,1.55),V3(side*1.62,2.75,1.55),.022));
      parts.push(xform(rounded(.06,.42,.23),side*1.62,2.73,1.54));
      parts.push(xform(rounded(.09,.035,.22),side*1.27,1.95,.32));
      parts.push(xform(rounded(.28,.06,.78),side*1.21,1.02,.74));
      black.push(xform(oldBox(.013,1.12,.016),side*1.246,1.74,-.72));
      for(var z of [-1.35,-2.55]){black.push(xform(oldBox(.15,.13,.62),side*.82,.60,z));}
    }
    for(var i=-4;i<=4;i++)black.push(xform(oldBox(1.64,.035,.015),0,1.34+i*.055,2.11));
    for(var x of [-.8,.3])parts.push(line(V3(x,2.34,2.15),V3(x+.44,2.62,2.15),.013));
    batch(u.body,parts,MAT.chrome,95);batch(u.body,black,MAT.rubber,95);
    var tail=[];
    for(var z=-7.4;z<.3;z+=1.1)for(var side of [-1,1])tail.push(xform(oldBox(.015,2.58,.014),side*1.306,2.67,z));
    for(var x of [-1.13,1.13])for(var y of [1.75,2.8,3.6])tail.push(xform(rounded(.17,.085,.055),x,y,-8.02));
    batch(u.tbody,tail,MAT.steel,95);
    // Rounded tire sidewalls, inset rims and lug patterns share geometry.
    u.wheels.forEach(function(w){
      var r=w.r,profile=[[-.22,r*.70],[-.22,r*.87],[-.18,r*.98],[-.10,r],[.10,r],[.18,r*.98],[.22,r*.87],[.22,r*.70]].map(function(p){return new T.Vector2(p[1],p[0]);});
      w.tyre.geometry.dispose();w.tyre.geometry=new T.LatheGeometry(profile,24);w.tyre.rotation.z=Math.PI/2;
      var ring=new T.Mesh(new T.TorusGeometry(r*.57,.028,6,20),MAT.chrome);ring.rotation.y=Math.PI/2;ring.position.x=w.node.position.x>0?.225:-.225;w.node.add(ring);
    });return g;
  };
  var originalInterior=processingInterior;
  processingInterior=function(){
    var g=originalInterior(),parts=[],rails=[];
    for(var z=-14;z<=14;z+=2){parts.push(xform(oldBox(43,.025,.024),0,.032,z));}
    for(var x=-20;x<=20;x+=2){parts.push(xform(oldBox(.018,7,.012),x,3.5,15.83));}
    for(var z=-13;z<13;z+=2.4){rails.push(xform(oldBox(.022,.07,1.8),.71,1.18,z));rails.push(xform(oldBox(.022,.07,1.8),-.71,1.18,z));}
    // ceiling lights live in index.html's persistent hallLights pool (constant light count)
    batch(g,parts,MAT.wallDark,65);batch(g,rails,MAT.chrome,40);return g;
  };
  // Broadleaf silhouettes with open crowns replace stacked spherical canopies.
  treeGeom=function(scale){
    var parts=[],h=8.5*scale;
    parts.push([xform(cylG(.12*scale,.29*scale,h,7),0,h/2,0),0x594c37]);
    for(var k=0;k<7;k++){
      var a=k*2.399,b=V3(Math.cos(a)*1.9*scale,h*(.66+k*.027),Math.sin(a)*1.9*scale);
      parts.push([line(V3(0,h*.52,0),b,.065*scale),0x554a37]);
    }
    for(var i=0;i<180;i++){
      var a=i*2.399,rad=Math.sqrt((i+.5)/180)*3.1*scale,y=h*.70+Math.sin(i*1.93)*1.35*scale+(1-rad/(3.1*scale))*2.2*scale;
      var leaf=new T.PlaneGeometry(.8*scale,1.2*scale,1,2);var p=leaf.attributes.position;
      for(var j=0;j<p.count;j++){p.setZ(j,Math.abs(p.getX(j))*.30);if(Math.abs(p.getY(j))>.4*scale)p.setX(j,p.getX(j)*.16);}leaf.computeVertexNormals();leaf.rotateX(-.3-i*.71);leaf.rotateY(a);leaf.translate(Math.cos(a)*rad,y,Math.sin(a)*rad);
      parts.push([leaf,[0x355234,0x53623a,0x6a7448,0x435c36][i%4]]);
    }return mergeC(parts);
  };
  /* Far tree belts are impostors: two crossed alpha cards per tree from a Blender-rendered atlas (4 species × 2 angles),
     placed on the terrain height. Near windbreak rows keep the 3D card trees. Falls back to 3D trees if the atlas is absent. */
  var treeAtlasMeta=null, treeAtlas=null;
  function loadTreeAtlas(){
    return fetch('assets/textures/trees-atlas.json').then(function(r){ if(!r.ok) throw 0; return r.json(); }).then(function(meta){
      treeAtlasMeta=meta; var small=Math.min(innerWidth,innerHeight)<640;
      return new Promise(function(resolve,reject){treeAtlas=new T.TextureLoader().load('assets/textures/trees-atlas'+(small?'-512':'')+'.webp',function(t){ t.needsUpdate=true; if(window.invalidateScene) invalidateScene(); resolve(meta); },undefined,reject);
      treeAtlas.encoding=T.sRGBEncoding; treeAtlas.anisotropy=8; treeAtlas.wrapS=treeAtlas.wrapT=T.ClampToEdgeWrapping; });
    });
  }
  function impostorMesh(points){
    var meta=treeAtlasMeta, cells=meta.cells, n=points.length;
    var quad=new T.PlaneGeometry(1,1); quad.translate(0,.5,0);
    var g=new T.BufferGeometry(), pos=[],uv=[],nor=[],idx=[]; [0,Math.PI/2].forEach(function(rot,k){ var q=quad.clone(); q.rotateY(rot); var p=q.attributes.position,u=q.attributes.uv,nn=q.attributes.normal; var base=pos.length/3; for(var i=0;i<p.count;i++){ pos.push(p.getX(i),p.getY(i),p.getZ(i)); uv.push(u.getX(i),u.getY(i)); nor.push(0,1,0); } for(var j=0;j<q.index.count;j++) idx.push(base+q.index.array[j]); });
    g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); g.setAttribute('normal',new T.Float32BufferAttribute(nor,3)); g.setIndex(idx);
    var cellAttr=new Float32Array(n*4);
    var mat=stdMat({map:treeAtlas,color:0xffffff,roughness:.95,metalness:0,side:T.DoubleSide,alphaTest:.45,envMapIntensity:.4});
    mat.onBeforeCompile=function(sh){ sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 cell;').replace('#include <uv_vertex>','#include <uv_vertex>\nvUv=vec2(cell.x+uv.x*(cell.z-cell.x),cell.y+uv.y*(cell.w-cell.y));'); };
    mat.customProgramCacheKey=function(){ return 'tree-impostor'; };
    var im=new T.InstancedMesh(g,mat,n), dummy=new T.Object3D();
    points.forEach(function(p,i){ var c=cells[(i*7)%cells.length]; var sc=p[2]; var hgt=c.orthoScale*sc; var wid=hgt*c.aspect;
      dummy.position.set(p[0],(WORLD.groundAt?WORLD.groundAt(p[0],p[1]):0)-.05,p[1]); dummy.scale.set(wid,hgt,wid); dummy.rotation.y=(i*2.399)%6.283; dummy.updateMatrix(); im.setMatrixAt(i,dummy.matrix);
      cellAttr[i*4]=c.u0; cellAttr[i*4+1]=c.v0; cellAttr[i*4+2]=c.u1; cellAttr[i*4+3]=c.v1; });
    g.setAttribute('cell',new T.InstancedBufferAttribute(cellAttr,4));
    im.instanceMatrix.needsUpdate=true; im.castShadow=false; im.receiveShadow=false; im.frustumCulled=false; return im;
  }
  makeTreeBelt=function(){
    var group=new T.Group(),points=[];
    [[-560,-560,-560,560],[560,-620,560,300],[-800,300,300,860],[-300,-900,700,-900]].forEach(function(a){var n=Math.floor(Math.hypot(a[2]-a[0],a[3]-a[1])/20);for(var i=0;i<n;i++)points.push([lerp(a[0],a[2],i/n)+rr(-9,9),lerp(a[1],a[3],i/n)+rr(-9,9),rr(.75,1.25)]);});
    for(var j=0;j<95;j++){var a=RND()*6.283,r=rr(450,1700);points.push([Math.cos(a)*r,Math.sin(a)*r,rr(.7,1.6)]);}
    /* near windbreak rows north of the barns and along the gate road use real card trees */
    var near=[]; for(var k=0;k<11;k++) near.push([-84+k*10+rr(-2,2),-58+rr(-3,3)]); for(k=0;k<5;k++) near.push([-27,96+k*11+rr(-2,2)]); for(k=0;k<5;k++) near.push([-5,96+k*11+rr(-2,2)]);
    var mat=vcMat().clone();mat.side=T.DoubleSide; var geo=treeGeom(1);
    var nearMesh=new T.InstancedMesh(geo,mat,near.length),dummy=new T.Object3D();
    near.forEach(function(p,i){dummy.position.set(p[0],WORLD.groundAt?WORLD.groundAt(p[0],p[1]):0,p[1]);dummy.scale.setScalar(rr(.85,1.35));dummy.rotation.y=RND()*6.283;dummy.updateMatrix();nearMesh.setMatrixAt(i,dummy.matrix);});
    nearMesh.castShadow=true; nearMesh.receiveShadow=false; group.add(nearMesh);
    var fallback=new T.InstancedMesh(geo,mat,points.length);
    points.forEach(function(p,i){dummy.position.set(p[0],WORLD.groundAt?WORLD.groundAt(p[0],p[1]):0,p[1]);dummy.scale.setScalar(p[2]*1.2);dummy.rotation.y=RND()*6.283;dummy.updateMatrix();fallback.setMatrixAt(i,dummy.matrix);});
    fallback.frustumCulled=false; fallback.castShadow=false; group.add(fallback);
    WORLD.detailReady=loadTreeAtlas().then(function(){ var im=impostorMesh(points); group.add(im); fallback.visible=false; if(window.invalidateScene) invalidateScene(); }).catch(function(){ /* keep the 3D belt */ });
    return group;
  };
  var originalWorld=worldTick;
  worldTick=function(t,dt,cam){
    detailGroups.forEach(function(d){if(!isWorldVisible(d.node.parent))return;d.node.getWorldPosition(v);d.node.visible=cam.position.distanceTo(v)<d.range;});
    originalWorld(t,dt,cam);
  };
})();
