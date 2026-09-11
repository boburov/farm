/* Terrain and world-projected ground materials (Three r128, classic script; loads after the main script).
 * - Heightfield ground: subtle relief everywhere except under the farm, cluster, market, retail, fields and road
 *   corridors (all kept at y = 0 with smooth margins), plus a gentle rise toward the distant hills.
 * - One material factory: MeshStandardMaterial sampled by WORLD XZ position at two scales (near/far) so tiling never
 *   shows from the air, blended between grass / dirt / dry mud by low-frequency noise, with a painted farm-yard splat,
 *   a cloud-shadow term and fine luminance breakup. Also used for fields, soil, gravel and asphalt (single sets).
 * - Textures: CC0 Poly Haven sets in assets/textures/pbr (see assets/ASSET-SOURCES.md); 512 variants on small screens.
 */
(function(){
  var T=THREE, TERRAIN=window.TERRAIN={ready:null,height:null,materials:{},uniforms:[]};
  var small=Math.min(innerWidth,innerHeight)<640||/Mobi|Android/i.test(navigator.userAgent);
  var manager=new T.LoadingManager(); manager.setURLModifier(function(url){ return small&&/assets\/textures\/pbr\/.*\.webp$/.test(url)&&!/-512\.webp$/.test(url)?url.replace(/(-2k)?\.webp$/,'-512.webp'):url; });
  TERRAIN.assetsReady=new Promise(function(resolve,reject){manager.onLoad=resolve;manager.onError=function(url){reject(new Error("Texture load: "+url));};});
  var texLoader=new T.TextureLoader(manager);
  function placeholder(rgb){ var t=new T.DataTexture(new Uint8Array(rgb.concat([255])),1,1,T.RGBAFormat); t.needsUpdate=true; return t; }
  var PH={color:placeholder([120,120,110]),normal:placeholder([128,128,255]),orm:placeholder([255,200,0]),white:placeholder([255,255,255])};
  PH.white.encoding=T.sRGBEncoding;
  var pending=[];
  function load(file,srgb){
    var t=texLoader.load('assets/textures/pbr/'+file,function(tex){ tex.needsUpdate=true; if(window.renderer) renderer.initTexture(tex); if(window.invalidateScene) invalidateScene(); });
    t.wrapS=t.wrapT=T.RepeatWrapping; t.anisotropy=8; t.encoding=srgb?T.sRGBEncoding:T.LinearEncoding; t.flipY=true; return t;
  }
  /** A PBR set = diff (sRGB), nor_gl, arm. hi=true uses the 2k colour map. */
  function set(slug,hi){ return {color:load(slug+'_diff'+(hi?'-2k':'')+'.webp',true),normal:load(slug+'_nor_gl.webp',false),orm:load(slug+'_arm.webp',false)}; }

  // ---------------------------------------------------------------- noise + splat textures (canvas, linear)
  function noiseTex(){
    var n=256,c=document.createElement('canvas');c.width=c.height=n;var g=c.getContext('2d'),img=g.createImageData(n,n),d=img.data;
    var seed=1234;function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
    var grids=[8,16,32,64].map(function(f){var a=new Float32Array(f*f);for(var i=0;i<f*f;i++)a[i]=rnd();return {f:f,a:a};});
    function val(gd,x,y){var f=gd.f,fx=x*f,fy=y*f,x0=Math.floor(fx),y0=Math.floor(fy),tx=fx-x0,ty=fy-y0;tx=tx*tx*(3-2*tx);ty=ty*ty*(3-2*ty);
      function at(i,j){return gd.a[((j%f+f)%f)*f+((i%f+f)%f)];}
      return (at(x0,y0)*(1-tx)+at(x0+1,y0)*tx)*(1-ty)+(at(x0,y0+1)*(1-tx)+at(x0+1,y0+1)*tx)*ty;}
    for(var y=0;y<n;y++)for(var x=0;x<n;x++){var u=x/n,v=y/n,i=(y*n+x)*4;
      var r=val(grids[0],u,v)*.5+val(grids[1],u,v)*.3+val(grids[2],u,v)*.2;   // large scale mask
      var gch=val(grids[1],u+.3,v+.7)*.6+val(grids[2],u,v)*.4;               // medium
      var b=val(grids[3],u,v)*.7+val(grids[2],u+.5,v)*.3;                     // fine
      d[i]=r*255;d[i+1]=gch*255;d[i+2]=b*255;d[i+3]=255;}
    g.putImageData(img,0,0);var t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.encoding=T.LinearEncoding;t.minFilter=T.LinearMipmapLinearFilter;return t;
  }
  var SPLAT_RECT=[-80,20,30,100];   // x0,z0,x1,z1 of the farm yard splat in metres
  function splatTex(){
    var n=256,c=document.createElement('canvas');c.width=c.height=n;var g=c.getContext('2d');
    var sx=n/(SPLAT_RECT[2]-SPLAT_RECT[0]),sz=n/(SPLAT_RECT[3]-SPLAT_RECT[1]);
    function px(x,z){return [(x-SPLAT_RECT[0])*sx,(z-SPLAT_RECT[1])*sz];}
    g.fillStyle='#000';g.fillRect(0,0,n,n);
    // R = bare earth yard with soft edges
    var a=px(-51,36),b=px(13,80);var grd=g.createRadialGradient((a[0]+b[0])/2,(a[1]+b[1])/2,Math.min(b[0]-a[0],b[1]-a[1])*.25,(a[0]+b[0])/2,(a[1]+b[1])/2,Math.max(b[0]-a[0],b[1]-a[1])*.62);
    grd.addColorStop(0,'rgba(255,0,0,1)');grd.addColorStop(.75,'rgba(255,0,0,.85)');grd.addColorStop(1,'rgba(255,0,0,0)');g.fillStyle=grd;g.fillRect(a[0]-12,a[1]-12,b[0]-a[0]+24,b[1]-a[1]+24);
    // worn paths from the barn doors to the feeders
    g.lineCap='round';g.strokeStyle='rgba(255,0,0,.9)';g.lineWidth=7;[[[-30,36],[-34,52]],[[-8,36],[-8,50]],[[-30,36],[-24,64]],[[-8,36],[-24,64]]].forEach(function(p){var s=px(p[0][0],p[0][1]),e=px(p[1][0],p[1][1]);g.beginPath();g.moveTo(s[0],s[1]);g.lineTo(e[0],e[1]);g.stroke();});
    // G = damp mud around the drinker line, B = dust baths
    g.globalCompositeOperation='lighter';
    var w=px(-16,60);var wg=g.createRadialGradient(w[0],w[1],2,w[0],w[1],14);wg.addColorStop(0,'rgba(0,255,0,.9)');wg.addColorStop(1,'rgba(0,255,0,0)');g.fillStyle=wg;g.fillRect(w[0]-16,w[1]-16,32,32);
    [[-37,68],[1,66],[-44,44]].forEach(function(p){var q=px(p[0],p[1]);var dg=g.createRadialGradient(q[0],q[1],1,q[0],q[1],8);dg.addColorStop(0,'rgba(0,0,255,.8)');dg.addColorStop(1,'rgba(0,0,255,0)');g.fillStyle=dg;g.fillRect(q[0]-9,q[1]-9,18,18);});
    var t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.ClampToEdgeWrapping;t.encoding=T.LinearEncoding;t.flipY=false;return t;
  }
  var noise=noiseTex(), splat=splatTex();

  // ---------------------------------------------------------------- material factory
  var FRAG_DECL=[
    'uniform sampler2D uDirt,uDirtN,uDirtORM,uMud,uMudN,uMudORM,uNoise,uSplat;',
    'uniform vec4 uSplatRect; uniform float uNear,uFar,uCloud,uTime,uBlend,uVar; varying vec3 vWorldPos;',
    'vec4 sampleDual(sampler2D t, vec2 m, float far){ return mix(texture2D(t,m*uNear),texture2D(t,m*uFar),far); }',
    'void groundWeights(vec2 m, out float wDirt, out float wMud, out vec4 sp){',
    '  vec2 mr=vec2(m.x*0.866-m.y*0.5,m.x*0.5+m.y*0.866);',
    '  vec4 n1=texture2D(uNoise,m*0.00047); vec4 n2=texture2D(uNoise,mr*0.00173+0.37); vec4 n3=texture2D(uNoise,m*0.0061+0.11);',
    '  float big=n1.r*0.55+n2.g*0.45; float med=n2.r*0.5+n3.g*0.5;',
    '  wDirt=smoothstep(0.60,0.80,big*0.7+med*0.3)*uBlend; wMud=smoothstep(0.74,0.90,med*0.55+n1.g*0.45)*uBlend;',
    '  vec2 su=(m-uSplatRect.xy)/(uSplatRect.zw-uSplatRect.xy); float inside=step(0.0,su.x)*step(su.x,1.0)*step(0.0,su.y)*step(su.y,1.0);',
    '  sp=texture2D(uSplat,clamp(su,0.0,1.0))*inside; wDirt=max(wDirt,sp.r); wMud=max(wMud,sp.g*0.8); }'
  ].join('\n');
  var MAP=[
    '#ifdef USE_MAP',
    '  vec2 m=vWorldPos.xz; float far=smoothstep(40.0,180.0,length(vWorldPos-cameraPosition)); float wDirt,wMud; vec4 sp; groundWeights(m,wDirt,wMud,sp);',
    '  vec3 g=mapTexelToLinear(sampleDual(map,m,far)).rgb; vec3 dcol=sRGBToLinear(sampleDual(uDirt,m,far)).rgb; vec3 mcol=sRGBToLinear(sampleDual(uMud,m,far)).rgb;',
    '  vec3 col=mix(mix(g,dcol,wDirt),mcol,wMud);',
    '  float ao=mix(mix(sampleDual(roughnessMap,m,far).r,sampleDual(uDirtORM,m,far).r,wDirt),sampleDual(uMudORM,m,far).r,wMud); col*=mix(1.0,ao,0.55);',
    '  col*=1.0-sp.b*0.35;',
    '  col*=mix(1.0,0.70+0.30*texture2D(uNoise,m*0.0017+vec2(uTime*0.004,uTime*0.0015)).r,uCloud);',
    '  col*=mix(1.0,0.82+0.36*texture2D(uNoise,m*0.021).b,uVar);',
    '  diffuseColor.rgb*=col;',
    '#endif'
  ].join('\n');
  var ROUGH=[
    'float roughnessFactor=roughness;',
    '#ifdef USE_ROUGHNESSMAP',
    '  { vec2 m=vWorldPos.xz; float far=smoothstep(40.0,180.0,length(vWorldPos-cameraPosition)); float wDirt,wMud; vec4 sp; groundWeights(m,wDirt,wMud,sp);',
    '    float r=mix(mix(sampleDual(roughnessMap,m,far).g,sampleDual(uDirtORM,m,far).g,wDirt),sampleDual(uMudORM,m,far).g,wMud); roughnessFactor*=mix(r,1.0,sp.g*0.4)*(1.0-sp.g*0.35); }',
    '#endif'
  ].join('\n');
  var NORMAL=[
    '#ifdef TANGENTSPACE_NORMALMAP',
    '  { vec2 m=vWorldPos.xz; float far=smoothstep(40.0,180.0,length(vWorldPos-cameraPosition)); float wDirt,wMud; vec4 sp; groundWeights(m,wDirt,wMud,sp);',
    '    vec3 nA=texture2D(normalMap,m*uNear).xyz, nB=texture2D(uDirtN,m*uNear).xyz, nC=texture2D(uMudN,m*uNear).xyz;',
    '    vec3 mapN=mix(mix(nA,nB,wDirt),nC,wMud)*2.0-1.0; mapN.xy*=normalScale*(1.0-far*0.8);',
    '    normal=perturbNormal2Arb(-vViewPosition,normal,mapN,faceDirection); }',
    '#endif'
  ].join('\n');
  function groundMaterial(base,opts){
    opts=opts||{}; var dirt=opts.dirt||base, mud=opts.mud||base;
    var m=stdMat({map:PH.color,normalMap:PH.normal,roughnessMap:PH.orm,roughness:1,metalness:0,color:opts.color||0xffffff,normalScale:new T.Vector2(opts.normal||.6,opts.normal||.6),envMapIntensity:.55});
    m.map=base.color; m.normalMap=base.normal; m.roughnessMap=base.orm;
    var uni={uDirt:{value:dirt.color},uDirtN:{value:dirt.normal},uDirtORM:{value:dirt.orm},uMud:{value:mud.color},uMudN:{value:mud.normal},uMudORM:{value:mud.orm},
      uNoise:{value:noise},uSplat:{value:splat},uSplatRect:{value:new T.Vector4(SPLAT_RECT[0],SPLAT_RECT[1],SPLAT_RECT[2],SPLAT_RECT[3])},
      uNear:{value:1/(opts.near||3.0)},uFar:{value:1/(opts.far||23.0)},uCloud:{value:0},uTime:{value:0},uBlend:{value:opts.blend===false?0:1},uVar:{value:opts.variation===undefined?1:opts.variation}};
    m.onBeforeCompile=function(shader){
      Object.keys(uni).forEach(function(k){ shader.uniforms[k]=uni[k]; });
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWorldPos;').replace('#include <fog_vertex>','#include <fog_vertex>\nvWorldPos=(modelMatrix*vec4(transformed,1.0)).xyz;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+FRAG_DECL)
        .replace('#include <map_fragment>',MAP).replace('#include <roughnessmap_fragment>',ROUGH).replace('#include <normal_fragment_maps>',NORMAL);
    };
    m.customProgramCacheKey=function(){ return 'ground-v1'; };
    m.userData.ground=uni; TERRAIN.uniforms.push(uni); return m;
  }

  // ---------------------------------------------------------------- triplanar factory (walls, roofs, machinery)
  var TRI_DECL=[
    'uniform float uTriScale; varying vec3 vWorldPos; varying vec3 vWorldN;',
    'vec3 triW(vec3 n){ vec3 w=abs(n); w=pow(w,vec3(6.0)); return w/(w.x+w.y+w.z); }',
    'vec4 triSample(sampler2D t, vec3 p, vec3 w){ return texture2D(t,p.yz*uTriScale)*w.x+texture2D(t,p.xz*uTriScale)*w.y+texture2D(t,p.xy*uTriScale)*w.z; }'
  ].join('\n');
  var TRI_MAP=['#ifdef USE_MAP','  { vec3 w=triW(normalize(vWorldN)); vec4 tc=triSample(map,vWorldPos,w); tc=mapTexelToLinear(tc); diffuseColor*=tc;',
    '    #ifdef USE_ROUGHNESSMAP',' float ao=triSample(roughnessMap,vWorldPos,w).r; diffuseColor.rgb*=mix(1.0,ao,0.5);','    #endif','  }','#endif'].join('\n');
  var TRI_ROUGH=['float roughnessFactor=roughness;','#ifdef USE_ROUGHNESSMAP','  roughnessFactor*=triSample(roughnessMap,vWorldPos,triW(normalize(vWorldN))).g;','#endif'].join('\n');
  var TRI_NORMAL=['#ifdef TANGENTSPACE_NORMALMAP','  { vec3 w=triW(normalize(vWorldN)); vec3 s=sign(vWorldN);',
    '    vec3 nx=texture2D(normalMap,vWorldPos.yz*uTriScale).xyz*2.0-1.0, ny=texture2D(normalMap,vWorldPos.xz*uTriScale).xyz*2.0-1.0, nz=texture2D(normalMap,vWorldPos.xy*uTriScale).xyz*2.0-1.0;',
    '    nx.xy*=normalScale; ny.xy*=normalScale; nz.xy*=normalScale;',
    '    vec3 wn=normalize(vWorldN); vec3 pn=normalize(vec3(0.0,nx.y,nx.x)*w.x*s.x+vec3(ny.x,0.0,ny.y)*w.y*s.y+vec3(nz.x,nz.y,0.0)*w.z*s.z+wn);',
    '    normal=normalize((viewMatrix*vec4(pn,0.0)).xyz); }','#endif'].join('\n');
  TERRAIN.triplanar=function(base,opts){
    opts=opts||{};
    var m=stdMat({map:PH.color,normalMap:PH.normal,roughnessMap:PH.orm,roughness:opts.roughness||1,metalness:opts.metalness||0,color:opts.color||0xffffff,normalScale:new T.Vector2(opts.normal||.6,opts.normal||.6),envMapIntensity:opts.env===undefined?.7:opts.env});
    m.map=base.color; m.normalMap=base.normal; m.roughnessMap=base.orm; if(opts.metalness){ m.metalnessMap=base.orm; }
    var uni={uTriScale:{value:1/(opts.scale||2.0)}};
    m.onBeforeCompile=function(shader){
      shader.uniforms.uTriScale=uni.uTriScale;
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWorldPos; varying vec3 vWorldN;')
        .replace('#include <fog_vertex>','#include <fog_vertex>\nvWorldPos=(modelMatrix*vec4(transformed,1.0)).xyz; vWorldN=normalize(mat3(modelMatrix)*objectNormal);');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+TRI_DECL)
        .replace('#include <map_fragment>',TRI_MAP).replace('#include <roughnessmap_fragment>',TRI_ROUGH).replace('#include <normal_fragment_maps>',TRI_NORMAL);
    };
    m.customProgramCacheKey=function(){ return 'triplanar-v1'+(opts.metalness?'-m':''); };
    m.userData.triplanar=uni; return m;
  };
  TERRAIN.sets=sets;

  // ---------------------------------------------------------------- height field with flat footprints
  var seed=97; function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  var VN=64, vgrid=new Float32Array(VN*VN); for(var i=0;i<VN*VN;i++) vgrid[i]=rnd();
  function vnoise(x,z){ var fx=x-Math.floor(x),fz=z-Math.floor(z),ix=Math.floor(x),iz=Math.floor(z); fx=fx*fx*(3-2*fx); fz=fz*fz*(3-2*fz);
    function at(i,j){ return vgrid[((j%VN+VN)%VN)*VN+((i%VN+VN)%VN)]; }
    return (at(ix,iz)*(1-fx)+at(ix+1,iz)*fx)*(1-fz)+(at(ix,iz+1)*(1-fx)+at(ix+1,iz+1)*fx)*fz; }
  var ss=function(a,b,x){ var t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };
  var RECTS=[[-75,-42,22,92],[-215,-135,485,235],[-1055,260,-905,380],[1330,830,1470,970]]; // farm, cluster, market, retail
  var FIELDS=[[-900,-700,700,420,0.12],[620,-820,760,380,-0.08],[-1250,640,820,400,0.05],[900,440,900,460,0.16],[-200,-1150,1000,420,0],[260,1080,1100,480,-0.05],[1500,-200,760,900,.09],[-1650,-120,700,860,-.11]]; // mirrors buildLand's patchDefs
  var MARGIN=60;
  function rectDist(x,z,r){ var dx=Math.max(r[0]-x,0,x-r[2]),dz=Math.max(r[1]-z,0,z-r[3]); return Math.hypot(dx,dz); }
  function fieldDist(x,z,f){ var c=Math.cos(-f[4]),s=Math.sin(-f[4]),lx=(x-f[0])*c-(z-f[1])*s,lz=(x-f[0])*s+(z-f[1])*c; return rectDist(lx,lz,[-f[2]/2,-f[3]/2,f[2]/2,f[3]/2]); }
  function segDist(x,z,a,b){ var dx=b[0]-a[0],dz=b[1]-a[1],l2=dx*dx+dz*dz,t=l2?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/l2)):0; return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t); }
  function flatMask(x,z){
    var f=1;
    for(var i=0;i<RECTS.length;i++) f*=ss(0,MARGIN,rectDist(x,z,RECTS[i]));
    for(i=0;i<FIELDS.length;i++) f*=ss(0,MARGIN,fieldDist(x,z,FIELDS[i]));
    if(window.ROAD_DEFS) for(i=0;i<ROAD_DEFS.length;i++){ var pts=ROAD_DEFS[i].pts; for(var k=0;k+1<pts.length;k++) f*=ss(ROAD_DEFS[i].w/2+6,ROAD_DEFS[i].w/2+6+MARGIN,segDist(x,z,pts[k],pts[k+1])); }
    return f;
  }
  TERRAIN.height=function(x,z){
    var r=Math.hypot(x,z), relief=(vnoise(x/520+3.1,z/520+7.7)*4.5+vnoise(x/170+9.2,z/170+1.4)*1.6-2.4);
    var hills=12*ss(1500,2900,r)*(0.4+0.6*vnoise(x/700+5,z/700+2));
    return (relief+hills)*flatMask(x,z);
  };
  window.WORLD=window.WORLD||{}; WORLD.groundAt=function(x,z){ return TERRAIN.height(x,z); };
  function grid(size,segs,fn,skipInside){
    var n=segs+1,pos=new Float32Array(n*n*3),uv=new Float32Array(n*n*2),idx=[];
    for(var j=0;j<n;j++)for(var i=0;i<n;i++){var x=(i/segs-.5)*size,z=(j/segs-.5)*size,o=j*n+i;pos[o*3]=x;pos[o*3+1]=fn(x,z);pos[o*3+2]=z;uv[o*2]=x/6000+.5;uv[o*2+1]=z/6000+.5;}
    var cell=size/segs;
    for(j=0;j<segs;j++)for(i=0;i<segs;i++){ if(skipInside){ var cx=(i+.5)/segs*size-size/2,cz=(j+.5)/segs*size-size/2; if(Math.abs(cx)+cell/2<=skipInside&&Math.abs(cz)+cell/2<=skipInside) continue; } var a=j*n+i,b=a+1,c=a+n,d=c+1;idx.push(a,c,b,b,c,d);}
    var g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingSphere();return g;
  }
  TERRAIN.build=function(){
    var group=new T.Group();group.name='terrain';
    /* the fine grid must contain every built footprint (market at x −980, retail at x 1400) so their floors stay flat */
    var inner=new T.Mesh(grid(3200,small?110:200,TERRAIN.height),TERRAIN.materials.grass);inner.receiveShadow=true;inner.castShadow=false;group.add(inner);
    /* the coarse ring has no cells under the fine grid, so nothing can poke through floors */
    var outer=new T.Mesh(grid(9000,48,TERRAIN.height,1600),TERRAIN.materials.grass);outer.receiveShadow=true;group.add(outer);
    return group;
  };
  // ---------------------------------------------------------------- materials replace the canvas ground set
  var sets={};
  TERRAIN.materials.build=function(){
    var arch=function(slug){ return set(slug,false); };
    sets.corrRoof=arch('corrugated_iron_02'); sets.corrWall=arch('corrugated_iron_03'); sets.concreteWall=arch('concrete_wall_008'); sets.painted=arch('painted_concrete'); sets.floor=arch('concrete_floor_worn_001'); sets.metal=arch('metal_plate');
    var hi=!small;
    sets.grass=set('aerial_grass_rock',hi); sets.dirt=set('park_dirt',hi); sets.mud=set('brown_mud_dry',hi);
    sets.field=set('stony_dirt_path',false); sets.gravel=set('grassy_cobblestone',false); sets.asphalt=set('asphalt_02',false);
    TERRAIN.materials.grass=groundMaterial(sets.grass,{dirt:sets.dirt,mud:sets.mud,near:3.2,far:23,normal:.65});
    TERRAIN.materials.field=groundMaterial(sets.field,{dirt:sets.mud,mud:sets.dirt,near:2.6,far:19,normal:.5,color:0xb9b09a});
    TERRAIN.materials.soil=groundMaterial(sets.dirt,{dirt:sets.mud,mud:sets.mud,near:2.4,far:16,normal:.6});
    TERRAIN.materials.gravel=groundMaterial(sets.gravel,{blend:false,near:2.6,far:16,normal:.6,variation:.5,color:0xd9d4c8});
    TERRAIN.materials.asphalt=groundMaterial(sets.asphalt,{blend:false,near:5.0,far:26,normal:.35,variation:.6,color:0xb9bcbe});
    MAT.grass=TERRAIN.materials.grass; MAT.field=TERRAIN.materials.field; MAT.soil=TERRAIN.materials.soil; MAT.gravel=TERRAIN.materials.gravel; MAT.asphalt=TERRAIN.materials.asphalt;
    /* architecture: real cladding, concrete and floor sets projected in world space (no UV stretching on long walls) */
    /* white profiled sheet: flat colour, corrugated relief and occlusion from the iron set */
    var sheet={color:PH.white,normal:sets.corrWall.normal,orm:sets.corrWall.orm}, roofSheet={color:PH.white,normal:sets.corrRoof.normal,orm:sets.corrRoof.orm};
    MAT.wall=TERRAIN.triplanar(sheet,{scale:2.4,normal:.8,roughness:.62,metalness:.22,color:0xe8eae6,env:.8});
    MAT.wallGreen=TERRAIN.triplanar(sheet,{scale:2.4,normal:.8,roughness:.62,metalness:.22,color:0x5f8f74,env:.8});
    MAT.wallDark=TERRAIN.triplanar(sets.painted,{scale:2.2,normal:.5,roughness:.9,color:0x3a4640});
    MAT.roof=TERRAIN.triplanar(roofSheet,{scale:2.2,normal:.7,roughness:.55,metalness:.45,color:0x9ea4a8,env:.9});
    MAT.barnSide=TERRAIN.triplanar(sheet,{scale:2.2,normal:.7,roughness:.68,metalness:.18,color:0xdcdfd9,env:.7});
    MAT.concrete=TERRAIN.triplanar(sets.floor,{scale:3.0,normal:.5,roughness:.95,color:0xd3d3cd});
    MAT.concreteSmall=TERRAIN.triplanar(sets.concreteWall,{scale:1.6,normal:.55,roughness:.93,color:0xd7d8d2});
  };
  var origBM=buildMaterials; buildMaterials=function(){ origBM();
    /* the canvas ground/cladding maps are superseded: free their GPU copies */
    ['grass','field','soil','gravel','asphalt','wall','wallGreen','wallDark','roof','barnSide','concrete','concreteSmall'].forEach(function(k){ var m=MAT[k]; if(!m) return; ['map','normalMap','roughnessMap','bumpMap'].forEach(function(t){ if(m[t]&&m[t].dispose) m[t].dispose(); }); });
    TERRAIN.materials.build(); };
  // the grass set gates the loader (first frame is an aerial); the rest streams in behind it
  TERRAIN.ready=new Promise(function(res){ var n=0; function done(){ if(++n>=3) res(); } ['color','normal','orm'].forEach(function(k){ var check=function(){ var t=sets.grass&&sets.grass[k]; if(t&&t.image&&t.image.width>1){ done(); } else setTimeout(check,80); }; setTimeout(check,120); }); setTimeout(res,12000); });
  var CLOUD={day:.22,morning:.16,golden:.10,dawn:.06};
  var origTick=worldTick; worldTick=function(t,dt,cam){ origTick(t,dt,cam); var st=(window.ENV&&ENV.target)||''; var c=CLOUD[st]||0; for(var i=0;i<TERRAIN.uniforms.length;i++){ TERRAIN.uniforms[i].uCloud.value=c; TERRAIN.uniforms[i].uTime.value=t; } };
})();
