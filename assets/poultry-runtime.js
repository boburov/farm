/* GLB adapter — qisqartirilgan.
 *
 * 2010 infografika qayta qurilishidan keyin bu fayldan faqat bitta narsa kerak:
 * buyurtmachi bergan, bo'laklarga ajratilgan tovuq modelini yuklash va uni
 * har biri o'z bbox markazida aylanadigan Group'larga yig'ish.
 * Tirik tovuq / ishchi rigi, prosedural kesimlar, dissolve va merge kodi
 * olib tashlandi — git tarixida (3b09ac1 dan oldingi holatda) saqlanib qoldi.
 *
 * Model: assets/models/chicken-parts.glb (scripts/prep-chicken-parts.mjs).
 * Shartnoma: ildiz tugun `chicken-parts`, yetti bola tugun
 * torso · wingL · wingR · legL · legR · neck · tail, uzunlik 1.0,
 * pastki nuqta y=0, har tugunda extras {center,min,max}.
 */
(function(){
  var T=THREE, A=window.PoultryAssets={failures:[]};
  T.Cache.enabled=true;
  var manager=new T.LoadingManager(), loader=new T.GLTFLoader(manager);

  /* Model yo'li shu skriptning o'z manzilidan hisoblanadi, shunda modul
     ildizdagi index.html dan ham, demo/ ichidagi sahifadan ham ishlaydi. */
  A.modelPath=(function(){
    var s=document.currentScript&&document.currentScript.src;
    return s?s.replace(/[^/]*$/,'')+'models/':'assets/models/';
  })();

  /* three r128 nur (raycast) va bbox hisobini xom atribut qiymatlari ustida bajaradi,
     shuning uchun quantize qilingan Int16 pozitsiyalar float'ga aylantiriladi
     (diapazon o'zgarmaydi — tugun o'z quantization masshtabini saqlaydi). */
  function defloat(gltf){
    gltf.scene.traverse(function(o){
      if(!o.isMesh) return;
      var g=o.geometry, at=g.attributes.position;
      if(!at||!at.normalized) return;
      var arr=at.array,
          k=arr instanceof Int16Array?1/32767:arr instanceof Int8Array?1/127:1,
          n=at.count, f=new Float32Array(n*3);
      for(var i=0;i<n;i++){ f[i*3]=at.getX(i)*k; f[i*3+1]=at.getY(i)*k; f[i*3+2]=at.getZ(i)*k; }
      g.setAttribute('position',new T.BufferAttribute(f,3));
      g.computeBoundingBox(); g.computeBoundingSphere();
    });
  }

  A.loadChickenParts=function(){
    return A.chickenPartsPromise||(A.chickenPartsPromise=new Promise(function(resolve,reject){
      loader.load(A.modelPath+'chicken-parts.glb',function(gltf){
        defloat(gltf); A.chickenPartsModel=gltf.scene; resolve(gltf.scene);
      },undefined,function(e){
        A.failures.push('chicken-parts');
        reject(new Error('chicken-parts: '+(e.message||'asset load failed')));
      });
    }));
  };

  A.chickenParts=function(length){
    return buildParts(A.chickenPartsModel,'chicken-parts','chicken-parts',length);
  };

  /* Har bo'lak o'z bbox markazida aylanishi uchun ikki qavatli Group:
     m (markazda turadi) → off (tugunni -center ga suradi) → GLB tugunning o'zi
     (o'z quantization transformini saqlab qoladi). */
  function buildParts(model,holderName,rootName,length){
    var root=new T.Group(), parts={}, o=model.clone(true),
        holder=o.getObjectByName(holderName)||o;
    root.name=rootName; root.scale.setScalar(length); root.userData.s=length;
    holder.children.slice().forEach(function(n){
      var m=new T.Group(), off=new T.Group(), c=n.userData.center||[0,0,0];
      m.name=n.name;
      holder.remove(n);
      off.position.set(-c[0],-c[1],-c[2]); off.add(n); m.add(off);
      m.position.set(c[0],c[1],c[2]);
      n.traverse(function(x){
        if(!x.isMesh) return;
        x.castShadow=x.receiveShadow=true; x.userData.part=m.name;
        var mat=x.material;
        if(mat&&mat.isMeshStandardMaterial){
          mat.metalness=0;
          mat.envMapIntensity=/cut|inner/.test(mat.name||'')?.5:.85;
        }
      });
      m.userData.home=m.position.clone();
      m.userData.homeQuaternion=m.quaternion.clone();
      m.userData.size=new T.Vector3().fromArray(n.userData.max||[0,0,0])
        .sub(new T.Vector3().fromArray(n.userData.min||[0,0,0])).multiplyScalar(length);
      parts[m.name]=m; root.add(m);
    });
    root.userData.parts=parts;
    return root;
  }
})();
