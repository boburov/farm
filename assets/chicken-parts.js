/* Tovuqning bo'laklarga sochilib / yig'ilish animatsiyasi — mustaqil modul.
 *
 * Eski index.html ichidagi tarqoq koddan ajratib olingan (FLIGHT_TABLES, prepareFlight,
 * flyParts, showRingBases, partRing). Model: assets/models/chicken-parts.glb —
 * scripts/prep-chicken-parts.mjs tayyorlaydi. Yetti tugun: torso, wingL, wingR,
 * legL, legR, neck, tail. torso kursida qoladi, qolgan oltitasi halqadagi
 * asoslarga uchib qo'nadi.
 *
 * Talab: THREE (r128) + GLTFLoader + assets/poultry-runtime.js.
 *
 *   ChickenParts.load().then(function(){
 *     ChickenParts.mount(scene, {length:2.3, position:[0,.4,0]});
 *     ChickenParts.setSpread(0);   // 0 = butun tovuq, 1 = to'liq sochilgan
 *   });
 */
(function(){
  var T=THREE, A=window.PoultryAssets;
  var C=window.ChickenParts={root:null,ring:null,parts:null};

  /* Har bo'lak uchun: [nom, qo'nadigan asos indeksi, qo'nish burilishi (Euler), asosdagi kattalashtirish].
     Markazdagi bo'lak (torso) jadvalda yo'q — u kursida qoladi. */
  var FLIGHT=[
    ["neck", 0,[-Math.PI/2,0,0],        1.55],
    ["wingR",1,[0,-.20, Math.PI/2],     1.25],
    ["legR", 2,[0,-.55,0],              1   ],
    ["tail", 3,[-Math.PI/2,0,0],        2.10],
    ["legL", 4,[0, .55,0],              1   ],
    ["wingL",5,[0, .20,-Math.PI/2],     1.25]
  ];
  var PART_SCALE=1.75;   /* bo'laklar asosga uchayotib kattalashadi, har biri aniq o'qiladi */

  function clamp(v,a,b){ return v<a?a:v>b?b:v; }
  function beat(p,a,b){ return clamp((p-a)/(b-a),0,1); }
  function easeInOut(t){ return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; }

  C.load=function(){ return A.loadChickenParts(); };

  /* Oltita asosdan iborat halqa. Radius model uzunligiga nisbatan o'lchanadi,
     shunda mount() ga berilgan `length` o'zgarsa ham kompozitsiya buzilmaydi. */
  function buildRing(radius){
    var ring=new T.Group(); ring.name='chicken-parts-ring';
    for(var i=0;i<6;i++){
      var holder=new T.Group(), a=i/6*Math.PI*2;
      var base=new T.Mesh(
        new T.CylinderGeometry(1.18,1.28,.14,30),
        new T.MeshStandardMaterial({color:0x293b2e,roughness:.82,metalness:0,envMapIntensity:.25})
      );
      base.position.y=-.07; base.receiveShadow=true; base.name='holder-base';
      holder.add(base); holder.userData.base=base;
      holder.position.set(Math.sin(a)*radius,0.14,Math.cos(a)*radius);
      holder.rotation.y=a; holder.userData.a=a;
      ring.add(holder);
    }
    return ring;
  }

  /* Har bo'lak uchun: asosdagi qo'nish nuqtasi (root-local), qo'nish burilishi va yoy balandligi.
     Bo'lakning eng pastki uchi hisoblanadi, shunda u asos ustida osilib qolmay, tegib turadi. */
  function prepareFlight(){
    var root=C.root, ring=C.ring, parts=root.userData.parts;
    if(!parts||!ring) return;
    root.parent.updateMatrixWorld(true);
    var hw=new T.Vector3(), tmp=new T.Vector3(), pos=new T.Vector3();
    FLIGHT.forEach(function(fd,i){
      var m=parts[fd[0]], holder=ring.children[fd[1]];
      if(!m||!holder) return;
      var q=new T.Quaternion().setFromEuler(new T.Euler(fd[2][0],fd[2][1],fd[2][2]));
      m.userData.flyScale=PART_SCALE*(fd[3]||1);
      m.quaternion.copy(q); m.position.set(0,0,0); m.scale.setScalar(m.userData.flyScale);
      root.updateMatrixWorld(true);
      /* quantize qilingan Int16 pozitsiyalar — xom qiymatni qo'lda float'ga aylantiramiz */
      var minY=Infinity;
      m.traverse(function(o){
        if(!o.isMesh) return;
        var at=o.geometry.attributes.position, arr=at.array,
            k=at.normalized?(arr instanceof Int16Array?1/32767:arr instanceof Int8Array?1/127:1):1;
        for(var v=0;v<at.count;v++){
          pos.set(at.getX(v)*k,at.getY(v)*k,at.getZ(v)*k).applyMatrix4(o.matrixWorld);
          if(pos.y<minY) minY=pos.y;
        }
      });
      m.getWorldPosition(tmp);
      var bottom=tmp.y-minY;
      holder.getWorldPosition(hw); hw.y+=bottom+.006;     /* asos usti = holder'ning o'zi */
      m.userData.target=root.worldToLocal(hw.clone());
      m.userData.targetQuaternion=q;
      m.userData.lift=(1.5+i*.06)/root.scale.y;
      m.userData.order=i;
      m.position.copy(m.userData.home); m.quaternion.copy(m.userData.homeQuaternion); m.scale.setScalar(1);
    });
    root.updateMatrixWorld(true);
    root.userData.flightReady=true;
  }

  /* scene'ga o'rnatadi. opts: {length, position:[x,y,z], yaw, ringRadius} */
  C.mount=function(parent,opts){
    opts=opts||{};
    if(!A.chickenPartsModel) throw new Error('ChickenParts: avval load() ni kuting');
    var length=opts.length||2.3;
    var group=new T.Group(); group.name='chicken-parts-mount';
    var p=opts.position||[0,.4,0];
    group.position.set(p[0],p[1],p[2]);

    C.ring=buildRing(opts.ringRadius||(5.05/2.3*length));
    group.add(C.ring);

    C.root=A.chickenParts(length);
    C.root.rotation.y=(opts.yaw===undefined?-.30:opts.yaw);
    group.add(C.root);
    C.parts=C.root.userData.parts;

    parent.add(group);
    C.group=group;
    prepareFlight();
    C.setSpread(0);
    return group;
  };

  /* Asoslarni ko'rsatish/yashirish. Sahifa ichidagi kichik sahnada asoslar
     ortiqcha — ular o'chirilsa bo'laklar havoda "suzib" turadi.
     setSpread() bu bayroqni hurmat qiladi, aks holda har chaqiriqda qayta
     ko'rinib qolardi. */
  C.basesVisible=true;
  C.showBases=function(show){
    C.basesVisible=show!==false;
    if(C.ring) C.ring.visible=C.basesVisible;
  };

  /* p 0 = butun tovuq, 1 = har bo'lak o'z asosida. Har bir bo'lak ko'tarilib,
     yoy chizib tashqariga uchadi va joyiga qo'nadi; navbatma-navbat (staggered). */
  C.setSpread=function(p){
    var root=C.root; if(!root) return;
    var parts=root.userData.parts; if(!parts) return;
    if(!root.userData.flightReady) prepareFlight();
    p=clamp(p,0,1);
    FLIGHT.forEach(function(fd,i){
      var m=parts[fd[0]]; if(!m||!m.userData.target) return;
      var t=easeInOut(beat(p,i*.055,.62+i*.055)),
          h=m.userData.home, g=m.userData.target, u=1-t;
      var mx=(h.x+g.x)/2, my=Math.max(h.y,g.y)+m.userData.lift, mz=(h.z+g.z)/2;
      m.position.set(
        u*u*h.x+2*u*t*mx+t*t*g.x,
        u*u*h.y+2*u*t*my+t*t*g.y,
        u*u*h.z+2*u*t*mz+t*t*g.z
      );
      m.quaternion.copy(m.userData.homeQuaternion).slerp(m.userData.targetQuaternion,t);
      m.scale.setScalar(1+((m.userData.flyScale||PART_SCALE)-1)*t);
    });
    /* asoslar sochilish bilan birga ko'tariladi */
    if(C.ring){
      C.ring.visible=C.basesVisible;
      if(C.basesVisible) C.ring.children.forEach(function(h,i){
        var s=Math.max(.0001,easeInOut(beat(p,.06+i*.03,.29+i*.03)));
        h.scale.setScalar(s); h.visible=s>.002;
      });
    }
    root.userData.flight=p;
  };

  C.dispose=function(){
    if(C.group&&C.group.parent) C.group.parent.remove(C.group);
    C.group=C.root=C.ring=C.parts=null;
  };
})();
