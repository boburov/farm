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

  /* ==================================================== vitrina rejimi === */

  /* Har bo'lak TIK turib, tanish yuzi bilan kameraga qaraydigan mahsulot
     ko'rgazmasi. Burilishlar bir xil emas — GLB dagi har tugunning o'z
     o'lchamidan kelib chiqadi (dim = max-min, model ramkasida):
       torso  0.66 x 0.46 x 0.75  — uzunligi Z; X bo'yicha -90° tiklanadi
       legL/R 0.27 x 0.27 x 0.54  — xuddi shunday
       wingL/R 0.15 x 0.41 x 0.33 — yupqa o'q X; Y bo'yicha ±90° bilan keng
                                    yuzi kameraga buriladi
       neck   0.38 x 0.21 x 0.10  — yotib turadi; Z bo'yicha 90° bilan tikka
       tail   0.19 x 0.22 x 0.06  — keng yuzi allaqachon kameraga qaragan
     Nomlar anatomik — bu hujjatdagi 9 ta savdo bo'lagi EMAS (pastdagi izohga
     qarang). */
  var DISPLAY={
    neck: {rot:[0,0,Math.PI/2],        h:0.90, name:'Бўйин', full:'Бўйин'},
    wingL:{rot:[0,Math.PI/2,0],        h:1.08, name:'Қанот',  full:'Чап қанот'},
    legL: {rot:[-Math.PI/2,0,0.12],    h:1.10, name:'Оёқ',   full:'Чап оёқ (сон + болдир)'},
    torso:{rot:[-Math.PI/2,0,0],       h:1.34, name:'Тана',   full:'Тана — каркас'},
    legR: {rot:[-Math.PI/2,0,-0.12],   h:1.10, name:'Оёқ',   full:'Ўнг оёқ (сон + болдир)'},
    wingR:{rot:[0,-Math.PI/2,0],       h:1.08, name:'Қанот',  full:'Ўнг қанот'},
    tail: {rot:[0,0,0],                h:0.84, name:'Дум',    full:'Дум'}
  };
  /* chapdan o'ngga tartib: juftlar tananing ikki yonida */
  var ORDER=['neck','wingL','legL','torso','legR','wingR','tail'];

  /* Bo'lakning AYNAN burilgan gabaritini o'lchaydi: geometriya kvantlangan
     (Int16), shuning uchun xom qiymatlar qo'lda float'ga o'giriladi. */
  function measure(m){
    var box=new T.Box3(), v=new T.Vector3(), first=true;
    m.updateMatrixWorld(true);
    m.traverse(function(o){
      if(!o.isMesh) return;
      var at=o.geometry.attributes.position, arr=at.array,
          k=at.normalized?(arr instanceof Int16Array?1/32767:arr instanceof Int8Array?1/127:1):1;
      for(var i=0;i<at.count;i++){
        v.set(at.getX(i)*k,at.getY(i)*k,at.getZ(i)*k).applyMatrix4(o.matrixWorld);
        if(first){ box.min.copy(v); box.max.copy(v); first=false; }
        else box.expandByPoint(v);
      }
    });
    return box;
  }

  /* Bo'laklarni bir qatorga, bir asosga tik qo'yadi.
     opts: {gap, baseline, scale}
     Qaytaradi: [{key,name,group,width,height,center:Vector3,top:Vector3}] —
     yorliqlarni shu nuqtalarga bog'lash uchun. */
  C.showcase=function(opts){
    opts=opts||{};
    var root=C.root; if(!root) return [];
    var parts=root.userData.parts;
    var gap=opts.gap!==undefined?opts.gap:0.34;
    var info=[];

    /* Halqa va uchish holati bu rejimda ishlatilmaydi.
       MUHIM: o'lchash dunyo koordinatasida, joylashtirish esa ildiz ichida
       bo'ladi. Ildiz masshtabi 1 ga keltirilmasa, qator o'sha masshtabga
       ko'paytirilib, kadrdan chiqib ketadi. */
    C.showBases(false);
    root.rotation.set(0,0,0);
    root.scale.setScalar(1);
    root.position.set(0,0,0);
    if(C.group) C.group.position.set(0,0,0);
    root.updateMatrixWorld(true);

    /* Ikki bosqichli o'lchash. GLB `quantize` bosqichida har tugunga o'z
       transformi qo'shilgan, shuning uchun `extras.center` geometriyaning
       haqiqiy markaziga to'g'ri kelmaydi — taxmin qilib bo'lmaydi.
       Shu sababli avval burilgan gabarit o'lchanadi, masshtab topiladi,
       keyin QAYTA o'lchanib, bo'lak o'lchangan quti bo'yicha joyiga suriladi. */
    ORDER.forEach(function(key){
      var m=parts[key], d=DISPLAY[key];
      if(!m||!d) return;
      m.position.set(0,0,0);
      m.scale.setScalar(1);
      m.quaternion.setFromEuler(new T.Euler(d.rot[0],d.rot[1],d.rot[2]));
      var b1=measure(m), s1=b1.getSize(new T.Vector3());
      var sc=s1.y>1e-6?d.h/s1.y:1;
      m.scale.setScalar(sc);
      var b2=measure(m), s2=b2.getSize(new T.Vector3());
      info.push({key:key,name:d.name,full:d.full||d.name,group:m,box:b2,size:s2,scale:sc});
    });

    /* Joylashtirish. `rows:2` bo'lsa bo'laklar ikki qatorga bo'linadi va
       orqa qator TEPAGA ko'tariladi (chuqurlikka emas) — shunda old qator
       hech qachon orqasini to'smaydi va kamera to'g'ri old tomondan turadi. */
    var rows=Math.max(1,opts.rows||1);
    var rowGap=opts.rowGap!==undefined?opts.rowGap:0.42;
    var per=Math.ceil(info.length/rows);
    var bands=[];
    for(var r=0;r<rows;r++) bands.push(info.slice(r*per,(r+1)*per));

    var base=opts.baseline||0;
    var widest=0, yCursor=base;
    /* pastdan yuqoriga: oxirgi band pastda turadi */
    bands.slice().reverse().forEach(function(band){
      var total=band.reduce(function(a,it){ return a+it.size.x; },0)+gap*(band.length-1);
      widest=Math.max(widest,total);
      var bandH=band.reduce(function(a,it){ return Math.max(a,it.size.y); },0);
      var x=-total/2;
      band.forEach(function(it){
        var w=it.size.x, h=it.size.y, cx=x+w/2;
        var c=it.box.getCenter(new T.Vector3());
        it.restX=cx-c.x;
        it.restY=yCursor-it.box.min.y;
        it.restZ=-c.z;
        it.group.position.set(it.restX,it.restY,it.restZ);
        it.width=w; it.height=h;
        it.center=new T.Vector3(cx,yCursor+h/2,0);
        it.top=new T.Vector3(cx,yCursor+h,0);
        it.bottom=new T.Vector3(cx,yCursor,0);
        x+=w+gap;
      });
      yCursor+=bandH+rowGap;
    });

    C.showcaseHeight=yCursor-base-rowGap;
    C.showcaseInfo=info;
    C.showcaseWidth=widest;
    prepareWhole(info,base);
    return info;
  };

  /* Vitrina "butun tovuq" holatidan boshlanadi: har bo'lak avval o'z joyida
     turgan yaxlit tovuqni tashkil qiladi, keyin bo'laklarga ajralib qatorga
     tarqaladi. Shu yerda har bo'lak uchun o'sha BOSHLANG'ICH transform
     hisoblanadi (root ichida, vitrina kadriga sig'adigan qilib).

     Butun tovuq model ramkasida Z bo'ylab yotadi — to'g'ridan qaralsa
     kallasi bilan kameraga tiralib qoladi, shuning uchun Y bo'yicha -90°
     buriladi: yonboshdan, tanish siluet. */
  var WHOLE_YAW=-Math.PI/2;
  function prepareWhole(info,baseline){
    var q=new T.Quaternion().setFromEuler(new T.Euler(0,WHOLE_YAW,0));
    var box=null, rotHome=[];

    /* 1-bosqich: burilgan butun tovuqning gabaritini o'lchash (masshtab 1) */
    info.forEach(function(it){
      var m=it.group, h=m.userData.home.clone().applyQuaternion(q);
      rotHome.push(h);
      m.quaternion.copy(q).multiply(m.userData.homeQuaternion);
      m.position.copy(h);
      m.scale.setScalar(1);
      var b=measure(m);
      box=box?box.union(b):b;
    });
    if(!box) return;

    /* 2-bosqich: kadr ichiga sig'diruvchi masshtab va markaz.
       Butun tovuq kadrni to'ldirib yubormaydi: u vitrina o'lchamining ~2/3
       qismini egallaydi. Kattaroq bo'lsa tana bo'lagi qatordagi o'z
       o'lchamidan bir necha barobar katta chiqib, o'tish paytida kadr
       chetidan chiqib ketadi. */
    var size=box.getSize(new T.Vector3()), c=box.getCenter(new T.Vector3());
    var H=C.showcaseHeight||1, W=C.showcaseWidth||1;
    var s=Math.min(size.y>1e-6?H*.66/size.y:1, size.x>1e-6?W*.58/size.x:1);
    var cy=baseline+H*.5;

    info.forEach(function(it,i){
      var m=it.group;
      it.wholeQuaternion=new T.Quaternion().copy(q).multiply(m.userData.homeQuaternion);
      it.wholePos=rotHome[i].clone().sub(c).multiplyScalar(s).add(new T.Vector3(0,cy,0));
      it.wholeScale=s;
      /* vitrinadagi tayanch transformni qaytarib qo'yamiz */
      m.quaternion.setFromEuler(new T.Euler(DISPLAY[it.key].rot[0],DISPLAY[it.key].rot[1],DISPLAY[it.key].rot[2]));
      m.position.set(it.restX,it.restY,it.restZ);
      m.scale.setScalar(it.scale);
    });
    C.wholeReady=true;
  }

  /* Butun tovuqdan vitrinaga o'tish. p 0 = yaxlit tovuq, 1 = qatordagi
     bo'laklar. Har bo'lak navbatma-navbat, yoy chizib joyiga boradi. */
  C.showcaseSplit=function(p){
    var info=C.showcaseInfo; if(!info||!C.wholeReady){ C.showcaseReveal(p); return; }
    p=clamp(p,0,1);
    var pos=new T.Vector3();
    info.forEach(function(it,i){
      var t=easeInOut(beat(p,i*.05,.68+i*.05)), u=1-t, m=it.group;
      /* yoy: o'rtada biroz ko'tarilib o'tadi, shunda bo'laklar bir-birini kesmaydi.
         Ko'tarilish kichik — katta bo'lsa tepadagi qator kadrdan chiqib ketadi. */
      var lift=it.height*.30*Math.sin(t*Math.PI)*(1-t);
      pos.set(
        u*it.wholePos.x+t*it.restX,
        u*it.wholePos.y+t*it.restY+lift,
        u*it.wholePos.z+t*it.restZ
      );
      m.position.copy(pos);
      m.quaternion.copy(it.wholeQuaternion).slerp(
        new T.Quaternion().setFromEuler(new T.Euler(DISPLAY[it.key].rot[0],DISPLAY[it.key].rot[1],DISPLAY[it.key].rot[2])),t);
      m.scale.setScalar(it.wholeScale+(it.scale-it.wholeScale)*t);
    });
  };

  /* Kirish: tovuq yaxlit holda paydo bo'ladi (fade), bir lahza turadi,
     keyin bo'laklarga ajraladi. p 0..1 — butun sahna vaqti. */
  C.showcaseIntro=function(p){
    var info=C.showcaseInfo; if(!info) return;
    p=clamp(p,0,1);
    var fade=clamp(p/.14,0,1);
    info.forEach(function(it){
      it.group.traverse(function(o){
        if(o.isMesh&&o.material){ o.material.transparent=fade<1; o.material.opacity=fade; }
      });
    });
    C.showcaseSplit(beat(p,.26,1));
  };

  /* Vitrinani kadrga sig'diradigan kamera masofasi.
     Gorizontal yarim ko'rish burchagi: atan(tan(vfov/2) * aspect) —
     shuni hisobga olmasa qator kadrga sig'may qoladi. */
  C.showcaseDistance=function(fovDeg,aspect,margin){
    var w=(C.showcaseWidth||1)*(margin||1.12);
    var h=(C.showcaseHeight||1)*(margin||1.12);
    var vt=Math.tan(fovDeg*Math.PI/360);
    return Math.max(w/2/(vt*aspect), h/2/vt);
  };

  /* Kamera holati: old tomondan, biroz yuqoridan — mahsulot vitrinasi burchagi.
     Juda past turса ufq bo'laklarni kesib o'tadi; juda tepadan esa tanish
     yuzlari ko'rinmay qoladi. */
  C.showcaseCamera=function(camera,margin,tilt){
    var H=C.showcaseHeight||1;
    var d=C.showcaseDistance(camera.fov,camera.aspect,margin||1.16);
    var t=tilt===undefined?.26:tilt;          /* 0 = qat'iy old, 1 = tepadan */
    var mid=H*.5;
    camera.position.set(0,mid+H*t*.42,d);
    camera.lookAt(0,mid,0);
    camera.updateProjectionMatrix();
    return {distance:d,eyeY:camera.position.y,height:H};
  };

  /* Vitrina kirish animatsiyasi: bo'laklar pastdan ko'tarilib, joyiga
     o'tiradi. p 0..1. Aylanish yo'q — yorliqlar o'qilishi kerak. */
  C.showcaseReveal=function(p){
    var info=C.showcaseInfo; if(!info) return;
    p=clamp(p,0,1);
    info.forEach(function(it,i){
      var t=easeInOut(beat(p,i*.07,.55+i*.07));
      it.group.position.y=it.restY-(1-t)*it.height*.55;
      it.group.scale.setScalar(it.scale*(.88+.12*t));
      it.group.traverse(function(o){
        if(o.isMesh&&o.material){ o.material.transparent=t<1; o.material.opacity=t; }
      });
    });
  };

  C.dispose=function(){
    if(C.group&&C.group.parent) C.group.parent.remove(C.group);
    C.group=C.root=C.ring=C.parts=C.showcaseInfo=null;
    C.showcaseWidth=C.showcaseHeight=0;
  };
})();
