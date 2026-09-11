/* GLB adapter. The scene director, IK bones, instancing and part API stay intact.
 * Assets come from the Blender pipeline (scripts/blender, real skins + named joints) or the Node fallback generator
 * (custom _RIG_* attributes already in the site's bone order). Joint indices are remapped by bone NAME so file order never matters. */
(function(){
  var T=THREE, A=window.PoultryAssets={models:{},rigCache:{},lodCache:{},food:null,failures:[],manifest:null};
  A.BONES={
    hen:['root','spine','chest','neck0','neck1','neck2','head','lids','tail','wingL','wingTipL','wingR','wingTipR','hipL','kneeL','hockL','footL','hipR','kneeR','hockR','footR'],
    worker:['root','spine','chest','neck','head','shL','elL','haL','shR','elR','haR','hiL','knL','anL','toL','hiR','knR','anR','toR']
  };
  T.Cache.enabled=true;
  var manager=new T.LoadingManager(),loader=new T.GLTFLoader(manager);
  manager.setURLModifier(function(url){
    if(Math.min(innerWidth,innerHeight)<640&&/assets\/textures\/.*\.webp$/.test(url)&&!/-512\.webp$/.test(url))return url.replace('.webp','-512.webp');
    return url;
  });
  function familyOf(name){ return /^worker/.test(name)?'worker':'hen'; }
  /* Float32 vec3 colours, Uint16 joint indices in the site's bone order, Float32 weights summing to 1. */
  function canonicalise(o,name){
    var g=o.geometry, at=g.attributes;
    if(at._rig_joints){ g.setAttribute('skinIndex',at._rig_joints); g.deleteAttribute('_rig_joints'); }
    if(at._rig_weights){ g.setAttribute('skinWeight',at._rig_weights); g.deleteAttribute('_rig_weights'); }
    if(o.isSkinnedMesh&&o.skeleton&&at.skinIndex){
      var names=A.BONES[familyOf(name)], bones=o.skeleton.bones, lut=new Uint16Array(bones.length), missing=[];
      bones.forEach(function(b,i){ var j=names.indexOf(b.name); if(j<0){ missing.push(b.name); j=0; } lut[i]=j; });
      if(missing.length) throw new Error(name+': unknown bones '+missing.join(','));
      var src=at.skinIndex, idx=new Uint16Array(src.count*4);
      for(var i=0;i<src.count*4;i++) idx[i]=lut[src.array[i]];
      g.setAttribute('skinIndex',new T.BufferAttribute(idx,4));
    }
    if(at.skinWeight){
      var w=at.skinWeight, wf=new Float32Array(w.count*4), norm=w.normalized?(w.array instanceof Uint8Array?255:65535):1;
      for(var k=0;k<w.count;k++){ var s=0; for(var c=0;c<4;c++){ wf[k*4+c]=w.array[k*4+c]/norm; s+=wf[k*4+c]; } if(s>1e-6&&Math.abs(s-1)>.01) for(c=0;c<4;c++) wf[k*4+c]/=s; }
      g.setAttribute('skinWeight',new T.BufferAttribute(wf,4));
    }
    if(at.color&&(at.color.itemSize!==3||!(at.color.array instanceof Float32Array))){
      var col=at.color, n=col.count, cf=new Float32Array(n*3), cn=col.normalized?(col.array instanceof Uint8Array?255:65535):1;
      for(var v=0;v<n;v++) for(var ch=0;ch<3;ch++) cf[v*3+ch]=col.array[v*col.itemSize+ch]/cn;
      g.setAttribute('color',new T.BufferAttribute(cf,3));
    }
    if(!at.color){ var cnt=at.position.count, ones=new Float32Array(cnt*3); ones.fill(1); g.setAttribute('color',new T.BufferAttribute(ones,3)); }
    if(at.uv&&!at.uv2) g.setAttribute('uv2',at.uv);
    if(o.userData.slot===undefined) o.userData.slot=0;
  }
  function load(name){return new Promise(function(resolve,reject){
    loader.load('assets/models/'+name+'.glb',function(gltf){
      var nodes={};
      try{
        gltf.scene.traverse(function(o){ if(o.isMesh){ o.geometry.name=name+'/'+o.name; canonicalise(o,name); nodes[o.name]=o; } });
      }catch(e){ A.failures.push(name); reject(e); return; }
      A.models[name]=nodes; resolve(nodes);
    },undefined,function(e){ A.failures.push(name); reject(new Error(name+': '+(e.message||'asset load failed'))); });
  });}
  function loadOptional(name,fallback){ return load(name).catch(function(){ A.failures=A.failures.filter(function(f){return f!==name;}); A.models[name]=A.models[fallback]; }); }
  /* the manifest lists which tiers exist, so no request is ever made for a missing file */
  A.loadLiving=function(){
    return fetch('assets/models/manifest.json').then(function(r){ return r.ok?r.json():{assets:[]}; }).catch(function(){ return {assets:[]}; }).then(function(m){
      A.manifest=m; var have={}; (m.assets||[]).forEach(function(x){ have[x.file.replace(/\.glb$/,'')]=x; });
      var required=['hen-hero','hen-lod','chick-hero','chick-lod','worker-surfaces'];
      return Promise.all(required.map(load)).then(function(){
        return Promise.all([['hen-mid','hen-hero'],['chick-mid','chick-hero']].map(function(p){ return have[p[0]]?loadOptional(p[0],p[1]):(A.models[p[0]]=A.models[p[1]]); }));
      });
    }).then(function(){ A.ready=true; });
  };
  // Photoreal studio hen: "Chicken" by pooiloui2 (Sketchfab, CC BY 4.0) prepared in the chicken2 project; no skeleton, so it is posed as a whole.
  A.loadHero=function(){return A.heroPromise||(A.heroPromise=new Promise(function(resolve,reject){
    loader.load('assets/models/hen-photoreal.glb',function(gltf){A.heroModel=gltf.scene;resolve(gltf.scene);},undefined,function(e){A.failures.push('hen-photoreal');reject(new Error('hen-photoreal: '+(e.message||'asset load failed')));});
  }));};
  A.hero=function(height){
    var o=A.heroModel.clone(true),meshes=[];
    o.traverse(function(n){if(!n.isMesh)return;n.castShadow=n.receiveShadow=true;meshes.push(n);var m=n.material;
      if(m&&m.isMeshStandardMaterial){m.side=T.DoubleSide;m.shadowSide=T.DoubleSide;m.envMapIntensity=.9;m.roughness=Math.min(m.roughness,.82);}});
    o.updateMatrixWorld(true);
    // The comb is the highest point: its offset from the centre gives the facing direction, which is turned to +Z.
    var box=new T.Box3().setFromObject(o),c=box.getCenter(new T.Vector3()),top=new T.Vector3(0,-Infinity,0),v=new T.Vector3();
    meshes.forEach(function(m){var p=m.geometry.attributes.position;for(var i=0;i<p.count;i+=2){v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);if(v.y>top.y)top.copy(v);}});
    var yaw=Math.atan2(top.x-c.x,top.z-c.z),inner=new T.Group(),wrap=new T.Group();
    inner.add(o);inner.rotation.y=-yaw;wrap.add(inner);wrap.updateMatrixWorld(true);
    box.setFromObject(wrap);var size=box.getSize(new T.Vector3());c=box.getCenter(new T.Vector3());
    inner.position.set(-c.x,-box.min.y,-c.z);
    var s=height/size.y;wrap.scale.setScalar(s);wrap.userData.s=s;wrap.userData.size=size.multiplyScalar(s);wrap.name='hero-hen-photoreal';
    return wrap;
  };
  // Photoreal whole raw chicken: Tripo-generated GLB from the user's downloads, prepared by scripts/prep-raw-chicken.mjs
  // (61k triangles, WebP maps, KHR_mesh_quantization). No skeleton; the procedural carcass stays the fallback.
  A.loadRaw=function(){return A.rawPromise||(A.rawPromise=new Promise(function(resolve,reject){
    loader.load('assets/models/raw-chicken.glb',function(gltf){A.rawModel=gltf.scene;resolve(gltf.scene);},undefined,function(e){A.failures.push('raw-chicken');reject(new Error('raw-chicken: '+(e.message||'asset load failed')));});
  }));};
  /* Rotation that turns the file's axes into the site's dressed-bird frame (breast up, length along Z, neck at -Z):
     the file is Y-up with the neck at +Z and the trussed drumsticks at -Z, so a half turn about Y. */
  A.rawPose={rx:0,ry:Math.PI,rz:0};
  /* Normalised clone: rests on y=0, centred on x/z, scaled so its length along Z equals `length` (site metres). */
  A.raw=function(length,ownMaterials){
    var o=A.rawModel.clone(true),inner=new T.Group(),wrap=new T.Group(),mats=[];
    o.traverse(function(n){if(!n.isMesh)return;n.castShadow=n.receiveShadow=true;if(ownMaterials)n.material=n.material.clone();var m=n.material;
      if(m&&m.isMeshStandardMaterial){m.metalness=0;m.envMapIntensity=.85;m.side=T.FrontSide;mats.push(m);}});
    wrap.userData.mats=mats;
    inner.add(o);inner.rotation.set(A.rawPose.rx,A.rawPose.ry,A.rawPose.rz);wrap.add(inner);wrap.updateMatrixWorld(true);
    var box=new T.Box3().setFromObject(wrap),size=box.getSize(new T.Vector3()),c=box.getCenter(new T.Vector3());
    inner.position.set(-c.x,-box.min.y,-c.z);
    var s=length/size.z;wrap.scale.setScalar(s);wrap.userData.s=s;wrap.userData.size=size.multiplyScalar(s);wrap.name='whole-raw-chicken-photoreal';
    return wrap;
  };
  /* Feather / skin dissolve without transparency sorting: a tileable value-noise alphaMap in [.55,1] with alphaTest .5,
     so animating `opacity` 1 → .48 erodes the surface in a noise pattern (and .48 → 1 grows it back). One compile per material. */
  A.dissolveTexture=function(){
    if(A._noise) return A._noise;
    var N=256,d=new Uint8Array(N*N*4),lat=[8,16,32,64],amp=[.5,.25,.15,.10];
    function rnd(x,y,s){ var v=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453; return v-Math.floor(v); }
    for(var y=0;y<N;y++)for(var x=0;x<N;x++){
      var v=0,tot=0;
      for(var o=0;o<lat.length;o++){ var L=lat[o],fx=x/N*L,fy=y/N*L,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy; tx=tx*tx*(3-2*tx); ty=ty*ty*(3-2*ty);
        var a=rnd(ix,iy,o),b=rnd((ix+1)%L,iy,o),c=rnd(ix,(iy+1)%L,o),e=rnd((ix+1)%L,(iy+1)%L,o);
        v+=amp[o]*((a*(1-tx)+b*tx)*(1-ty)+(c*(1-tx)+e*tx)*ty); tot+=amp[o]; }
      v/=tot; var byte=Math.round((.55+.45*v)*255),i=(y*N+x)*4; d[i]=d[i+1]=d[i+2]=byte; d[i+3]=255;
    }
    var t=new T.DataTexture(d,N,N,T.RGBAFormat); t.wrapS=t.wrapT=T.RepeatWrapping; t.needsUpdate=true; A._noise=t; return t;
  };
  A.prepareDissolve=function(obj){
    var mats=[];
    obj.traverse(function(o){ if(!o.isMesh||!o.material||!o.material.isMeshStandardMaterial) return; var m=o.material;
      if(!m.alphaMap){ m.alphaMap=A.dissolveTexture(); m.alphaTest=.5; m.transparent=false; m.opacity=1; m.needsUpdate=true; }
      if(mats.indexOf(m)<0) mats.push(m); });
    return mats;
  };
  // Photoreal retail cuts: scripts/split-raw-chicken.mjs slices the same GLB by plane regions (exact caps, inner flesh
  // shell on the remainder) and writes it already in the site frame at length 1.0, so A.rawCuts(L) overlays A.raw(L).
  A.loadRawCuts=function(){return A.rawCutsPromise||(A.rawCutsPromise=new Promise(function(resolve,reject){
    loader.load('assets/models/raw-chicken-cuts.glb',function(gltf){
      /* three r128 raycasts against raw attribute values, so the quantized int16 positions must become floats
         (same normalised range, the node keeps its quantization scale) for the part tooltip to hit the pieces */
      gltf.scene.traverse(function(o){ if(!o.isMesh) return; var g=o.geometry,at=g.attributes.position; if(!at||!at.normalized) return;
        var arr=at.array,k=arr instanceof Int16Array?1/32767:arr instanceof Int8Array?1/127:1,n=at.count,f=new Float32Array(n*3);
        for(var i=0;i<n;i++){ f[i*3]=at.getX(i)*k; f[i*3+1]=at.getY(i)*k; f[i*3+2]=at.getZ(i)*k; }   /* getX/Y/Z: works for interleaved buffers too */
        g.setAttribute('position',new T.BufferAttribute(f,3)); g.computeBoundingBox(); g.computeBoundingSphere(); });
      A.rawCutsModel=gltf.scene;resolve(gltf.scene);},undefined,function(e){A.failures.push('raw-chicken-cuts');reject(new Error('raw-chicken-cuts: '+(e.message||'asset load failed')));});
  }));};
  /* Same interface as A.cuts(): root.userData.parts (breastL … rest), each a Group pivoted on its bbox centre with
     userData.home / homeQuaternion; the piece node keeps its own (quantization) transform inside an offset group. */
  A.rawCuts=function(length){
    var root=new T.Group(),parts={},o=A.rawCutsModel.clone(true),holder=o.getObjectByName('raw-chicken-cuts')||o;
    root.name='photoreal-poultry-cuts'; root.scale.setScalar(length); root.userData.s=length;
    holder.children.slice().forEach(function(n){
      var m=new T.Group(),off=new T.Group(),c=n.userData.center||[0,0,0]; m.name=n.name;
      holder.remove(n); off.position.set(-c[0],-c[1],-c[2]); off.add(n); m.add(off); m.position.set(c[0],c[1],c[2]);
      n.traverse(function(x){ if(!x.isMesh) return; x.castShadow=x.receiveShadow=true; x.userData.part=m.name; var mat=x.material;
        if(mat&&mat.isMeshStandardMaterial){ mat.metalness=0; mat.envMapIntensity=/cut|inner/.test(mat.name||'')?.5:.85; } });
      m.userData.home=m.position.clone(); m.userData.homeQuaternion=m.quaternion.clone();
      m.userData.size=new T.Vector3().fromArray(n.userData.max||[0,0,0]).sub(new T.Vector3().fromArray(n.userData.min||[0,0,0])).multiplyScalar(length);
      parts[m.name]=m; root.add(m);
    });
    root.userData.parts=parts;
    root.userData.explode=function(progress){ /* legacy interface: no-op, the flight is driven by index.html */ root.userData.explosion=progress; };
    return root;
  };
  A.loadFood=function(){return A.foodPromise||(A.foodPromise=load('poultry-cuts').then(function(nodes){A.food=nodes;if(window.MAT)A.foodMaterials();}));};
  var TINTS=[0xffffff,0xb87c48,0x97928a,0x49423c];
  function merge(nodes,variant,groups){
    var geo=new T.BufferGeometry(),keys=['position','normal','uv','uv2','color','skinIndex','skinWeight'],indices=[],base=0;
    var lists=Object.keys(nodes).map(function(k){return {o:nodes[k],g:nodes[k].geometry};});
    var tint=new T.Color(TINTS[variant%4]||0xffffff).convertSRGBToLinear();
    lists.forEach(function(e){var start=indices.length,n=e.g.attributes.position.count;if(e.g.index)for(var i of e.g.index.array)indices.push(base+i);else for(var j=0;j<n;j++)indices.push(base+j);if(groups)geo.addGroup(start,indices.length-start,e.o.userData.slot);base+=n;});
    keys.forEach(function(key){if(!lists.every(function(e){return e.g.attributes[key];}))return;var size=lists[0].g.attributes[key].itemSize,arr=new (key==='skinIndex'?Uint16Array:Float32Array)(base*size),offset=0;
      lists.forEach(function(e){var at=e.g.attributes[key],tinted=key==='color'&&(e.o.userData.slot===0||e.o.userData.slot===3);for(var i=0;i<at.array.length;i++)arr[offset+i]=at.array[i]*(tinted?[tint.r,tint.g,tint.b][i%3]:1);offset+=at.array.length;});geo.setAttribute(key,new T.BufferAttribute(arr,size));
    });geo.setIndex(indices);geo.computeBoundingBox();geo.computeBoundingSphere();return geo;
  }
  /* tier: 'hero' (studio + nearest birds) or 'mid' (other rigged birds); chicks share one tint so variant is dropped */
  A.rigGeometry=function(variant,adult,tier){
    tier=tier||'hero'; var fam=adult?'hen':'chick', v=adult?variant:0, key=fam+v+':'+tier;
    return A.rigCache[key]||(A.rigCache[key]=merge(A.models[fam+'-'+tier]||A.models[fam+'-hero'],v,true));
  };
  A.lodGeometry=function(variant,adult){var fam=adult?'hen':'chick', v=adult?variant:0, key=fam+v;return A.lodCache[key]||(A.lodCache[key]=merge(A.models[fam+'-lod'],v,false));};
  A.livingMaterials=function(){
    var nodes=A.models['hen-hero'];
    A.feather=nodes.plumage.material;A.feather.vertexColors=true;A.feather.envMapIntensity=.7;
    if(A.feather.normalScale)A.feather.normalScale.set(.55,.55);A.feather.roughness=Math.max(A.feather.roughness,.85);
    A.keratin=nodes.keratin.material;A.keratin.vertexColors=true;A.keratin.roughness=Math.min(A.keratin.roughness||.6,.68);
    A.eye=nodes.eyes.material;A.eye.vertexColors=true;A.eye.roughness=.18;A.eye.envMapIntensity=1.2;
    if(nodes.cards){ A.featherCard=nodes.cards.material; A.featherCard.vertexColors=true; A.featherCard.side=T.DoubleSide; A.featherCard.alphaTest=Math.max(A.featherCard.alphaTest||0,.45); A.featherCard.transparent=false; A.featherCard.depthWrite=true; A.featherCard.roughness=.9; A.featherCard.envMapIntensity=.6; }
    else A.featherCard=A.feather;
    A.skinMaterials=[A.feather,A.keratin,A.eye,A.featherCard].map(function(m){var c=m.clone();c.skinning=true;return c;});
    MAT.feather=A.feather;MAT.featherBrown=A.feather;
  };
  A.foodMaterials=function(){
    if(!A.food)return;
    MAT.meat=A.food.breastL.material;MAT.skinOn=A.food.whole.material;MAT.bone=A.food.drumBoneL.material;
    MAT.meatDeep=MAT.meat.clone();MAT.meatDeep.color.setHex(0xe8c8b9).convertSRGBToLinear();
    [MAT.meat,MAT.skinOn,MAT.meatDeep].forEach(function(m){m.envMapIntensity=.75;m.normalScale.set(.16,.16);});
  };
  var dirs={breastL:[.44,.69,.30],breastR:[-.44,.69,.30],tenderL:[.19,.30,.53],tenderR:[-.19,.30,.53],thighL:[.73,.03,-.30],thighR:[-.73,.03,-.30],drumL:[.65,-.06,.63],drumR:[-.65,-.06,.63],wingL:[1.10,.37,-.12],wingR:[-1.10,.37,-.12],back:[0,-.10,-.08],rest:[0,.06,-.74]};
  A.cuts=function(){
    var root=new T.Group(),parts={};root.name='anatomical-poultry-cuts';
    Object.keys(A.food).forEach(function(name){if(/whole|Cavity|cavity/.test(name))return;
      var src=A.food[name],g=src.geometry.clone();g.computeBoundingBox();var pivot=src.userData.home?new T.Vector3().fromArray(src.userData.home):g.boundingBox.getCenter(new T.Vector3());g.translate(-pivot.x,-pivot.y,-pivot.z);g.computeBoundingSphere();
      var m=new T.Mesh(g,src.material);m.name=name;m.position.copy(pivot);m.castShadow=m.receiveShadow=true;
      m.userData.home=pivot.clone();m.userData.homeQuaternion=m.quaternion.clone();
      var parent=src.userData.attachTo||(name.indexOf('Bone')>=0?name.replace('Bone',''):null);
      m.userData.attachTo=parent; m.userData.dir=new T.Vector3().fromArray(src.userData.dir||dirs[parent||name]||[0,0,0]);
      parts[name]=m;root.add(m);
    });
    root.userData.parts=parts;
    root.userData.explode=function(progress){
      var p=Math.max(0,Math.min(1,progress)),e=p*p*(3-2*p);
      Object.keys(parts).forEach(function(k){var m=parts[k];if(m.userData.attachTo)return;
        m.position.copy(m.userData.home).addScaledVector(m.userData.dir,e);
        m.quaternion.copy(m.userData.homeQuaternion);
        var d=m.userData.dir;m.rotateZ(-d.x*e*.10);m.rotateY(d.x*e*.13);
      });
      Object.keys(parts).forEach(function(k){var m=parts[k],owner=parts[m.userData.attachTo];if(!owner)return;
        m.position.copy(m.userData.home).sub(owner.userData.home).applyQuaternion(owner.quaternion).add(owner.position);m.quaternion.copy(owner.quaternion);
      });root.userData.explosion=p;
    };root.userData.explode(0);return root;
  };
  A.whole=function(){
    var root=new T.Group();root.name='whole-dressed-chicken';
    if(!A.rawGeometry){
      var low=Infinity;['whole','cavity','neckCavity'].forEach(function(k){var g=A.food[k].geometry;g.computeBoundingBox();low=Math.min(low,g.boundingBox.min.y);});
      A.rawGeometry={};['whole','cavity','neckCavity'].forEach(function(k){A.rawGeometry[k]=A.food[k].geometry.clone().translate(0,-low,0);});
    }
    ['whole','cavity','neckCavity'].forEach(function(k){var m=new T.Mesh(A.rawGeometry[k],A.food[k].material);m.name=k;m.castShadow=m.receiveShadow=true;root.add(m);});return root;
  };
})();
