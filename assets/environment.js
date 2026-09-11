/* HDRI environment for the cinematic site (Three r128, classic script).
 * - One sky dome drawn at the far plane samples the current/next state HDRI (CC0, Poly Haven) with a per-state
 *   azimuth shift so the sun in the sky matches the scene's light direction; a gradient fallback is used until loaded.
 * - A probe copy of the dome (sun clamped) is rendered through PMREMGenerator.fromScene for image based lighting.
 *   fromScene always yields RGBE-encoded PMREMs, so materials never recompile when states change.
 * - Crossfades run on wall-clock time; light/fog values keep blending through the site's envMix.
 * Loads after the main script; expects renderer, scene, camera, pmrem, ENVS, envCur, sky, sunGlow, skyUni, SMALL.
 */
(function(){
  var T=THREE, ENV=window.ENV={manifest:null,textures:{},pending:{},loaded:{},target:null,shown:null,mix:1,ready:false,bakes:0,failures:[]};
  /* WebGL2 filters half-float textures natively; WebGL1 needs the linear extensions, else 8-bit RGBE (nearest) */
  var gl2=renderer.capabilities.isWebGL2;
  var halfLinear=gl2||(!!renderer.extensions.get('OES_texture_half_float')&&!!renderer.extensions.get('OES_texture_half_float_linear'));
  var floatLinear=!!renderer.extensions.get('OES_texture_float_linear');
  var dataType=halfLinear?T.HalfFloatType:(floatLinear?T.FloatType:T.UnsignedByteType);
  ENV.dataType=dataType===T.HalfFloatType?'half':dataType===T.FloatType?'float':'rgbe8';
  var loader=new T.RGBELoader().setDataType(dataType);

  var glslSample=[
    '#include <common>',
    'uniform sampler2D texA,texB; uniform float useA,useB,rgbeA,rgbeB,shiftA,shiftB,clampA,clampB,mixAB,sunPow,gain;',
    'uniform vec3 top,horizon,bottom,sunDir,sunCol; varying vec3 vDir;',
    'vec3 gradientSky(vec3 d){',
    '  float h=d.y; vec3 col=mix(horizon,top,pow(clamp(h,0.0,1.0),0.55));',
    '  col=mix(col,bottom,pow(clamp(-h*1.6,0.0,1.0),0.6));',
    '  float s=max(dot(d,normalize(sunDir)),0.0);',
    '  col+=sunCol*pow(s,320.0)*2.4*sunPow; col+=sunCol*pow(s,10.0)*0.30*sunPow; col+=sunCol*pow(s,2.2)*0.07*sunPow;',
    '  return col; }',
    'vec3 sampleSky(sampler2D t,float rgbe,float shift,float clampV,vec3 d){',
    '  vec2 uv=vec2(atan(d.z,d.x)*RECIPROCAL_PI2+0.5+shift,asin(clamp(d.y,-1.0,1.0))*RECIPROCAL_PI+0.5);',
    '  uv.x=fract(uv.x); vec4 s=texture2D(t,uv);',
    '  vec3 c=rgbe>0.5?RGBEToLinear(s).rgb:s.rgb; return min(c*gain,vec3(clampV)); }',
    'vec3 skyColor(vec3 d){',
    '  vec3 g=gradientSky(d);',
    '  vec3 a=useA>0.5?sampleSky(texA,rgbeA,shiftA,clampA,d):g;',
    '  vec3 b=useB>0.5?sampleSky(texB,rgbeB,shiftB,clampB,d):g;',
    '  return mix(a,b,mixAB); }'
  ].join('\n');
  var vert='varying vec3 vDir; void main(){ vDir=position; vec4 p=projectionMatrix*mat4(mat3(viewMatrix))*vec4(position,1.0); gl_Position=p.xyww; }';
  var uni={
    texA:{value:null},texB:{value:null},useA:{value:0},useB:{value:0},rgbeA:{value:0},rgbeB:{value:0},
    shiftA:{value:0},shiftB:{value:0},clampA:{value:1e9},clampB:{value:1e9},mixAB:{value:0},gain:{value:1},
    top:skyUni.top,horizon:skyUni.horizon,bottom:skyUni.bottom,sunDir:skyUni.sunDir,sunCol:skyUni.sunCol,sunPow:skyUni.sunPow
  };
  var probeUni=Object.assign({},uni,{clampA:{value:1e9},clampB:{value:1e9}});
  function domeMaterial(u,probe){
    return new T.ShaderMaterial({uniforms:u,vertexShader:vert,side:T.BackSide,depthWrite:false,depthTest:false,fog:false,toneMapped:!probe,
      /* the probe renders into PMREM's RGBE target, so it must still run three's output encoding (no tone mapping) */
      fragmentShader:glslSample+'\nvoid main(){ vec3 col=skyColor(normalize(vDir)); gl_FragColor=vec4(col,1.0);'+(probe?'':'\n#include <tonemapping_fragment>')+'\n#include <encodings_fragment>\n}'});
  }
  var geo=new T.SphereGeometry(10,48,24);
  var dome=new T.Mesh(geo,domeMaterial(uni,false)); dome.frustumCulled=false; dome.renderOrder=-1000; dome.name='hdri-sky'; scene.add(dome);
  var probeScene=new T.Scene(), probe=new T.Mesh(geo,domeMaterial(probeUni,true)); probe.frustumCulled=false; probeScene.add(probe);
  /* the gradient sky sphere and the sprite sun are superseded; stage() still toggles their .visible flags */
  scene.remove(sky); scene.remove(sunGlow); sunGlow.visible=false;
  ENV.dome=dome; ENV.probeScene=probeScene; ENV.uni=uni; ENV.probeUni=probeUni; ENV.rt=function(){ return envRTcur; };

  var envRTcur=null, lastBakeMix=-1, lastBakeAt=-1e9, needBake=true;
  ENV.bake=function(){
    var old=envRTcur; envRTcur=pmrem.fromScene(probeScene,0,.1,100);
    scene.environment=envRTcur.texture; if(old) old.dispose();
    lastBakeMix=uni.mixAB.value; lastBakeAt=performance.now(); needBake=false; ENV.bakes++;
  };
  bakeEnv=function(){ needBake=true; };
  maybeBakeEnv=function(){};

  function stateFile(name,lo){ var s=ENV.manifest&&ENV.manifest.states[name]; if(!s) return null; return 'assets/environment/'+((SMALL||lo)?s.lo:s.file); }
  ENV.lowRes={};
  ENV.load=function(name,lo){
    if(ENV.textures[name]&&!(lo===false&&ENV.lowRes[name])) return Promise.resolve(ENV.textures[name]);
    var key=name+(lo?':lo':''); if(ENV.pending[key]) return ENV.pending[key];
    var file=stateFile(name,lo); if(!file) return Promise.reject(new Error('no HDRI for '+name));
    return ENV.pending[key]=new Promise(function(res,rej){
      loader.load(file,function(tex){
        tex.wrapS=T.RepeatWrapping; tex.wrapT=T.ClampToEdgeWrapping; tex.flipY=true; tex.needsUpdate=true;
        if(dataType!==T.UnsignedByteType){ tex.minFilter=T.LinearFilter; tex.magFilter=T.LinearFilter; }
        tex.generateMipmaps=false; renderer.initTexture(tex);
        var old=ENV.textures[name]; ENV.textures[name]=tex; ENV.lowRes[name]=!!lo&&!SMALL; ENV.loaded[name]=true; delete ENV.pending[key];
        if(ENV.target===name) showTexture(name,true);
        if(old&&old!==tex) setTimeout(function(){ old.dispose(); },3000);
        if(window.invalidateScene) invalidateScene();
        res(tex);
      },undefined,function(e){ ENV.failures.push(name); delete ENV.pending[key]; rej(e); });
    });
  };
  function slot(which,name){
    var s=ENV.manifest.states[name], tex=ENV.textures[name];
    var pu=probeUni, u=uni;
    u['tex'+which].value=tex||null; pu['tex'+which].value=tex||null;
    u['use'+which].value=tex?1:0; pu['use'+which].value=tex?1:0;
    u['rgbe'+which].value=dataType===T.UnsignedByteType?1:0; pu['rgbe'+which].value=u['rgbe'+which].value;
    u['shift'+which].value=s?s.shiftU:0; pu['shift'+which].value=s?s.shiftU:0;
    pu['clamp'+which].value=(s&&s.sunClamp)?s.sunClamp:1e9;
  }
  /* B is always the state being shown/faded in; A holds what was shown before */
  function showTexture(name,fadeFromA){
    if(fadeFromA&&(uni.useB.value||uni.useA.value)){ /* move current B to A, fade to new B */
      ['tex','use','rgbe','shift'].forEach(function(k){ uni[k+'A'].value=uni[k+'B'].value; probeUni[k+'A'].value=probeUni[k+'B'].value; });
      probeUni.clampA.value=probeUni.clampB.value; uni.mixAB.value=0; probeUni.mixAB.value=0;
    }
    slot('B',name); ENV.shown=name;
    if(!fadeFromA){ uni.mixAB.value=1; probeUni.mixAB.value=1; }
    needBake=true;
  }
  ENV.snap=function(name){
    ENV.target=name; ENV.load(name).catch(function(){});
    ['tex','use','rgbe','shift'].forEach(function(k){ uni[k+'A'].value=0; probeUni[k+'A'].value=0; });
    uni.useA.value=0; probeUni.useA.value=0; uni.texA.value=null; probeUni.texA.value=null;
    slot('B',name); uni.mixAB.value=1; probeUni.mixAB.value=1; ENV.shown=name; needBake=true; ENV.bake();
  };
  ENV.crossTo=function(name){
    if(ENV.target===name) return; ENV.target=name; ENV.load(name).catch(function(){});
    showTexture(name,true);
  };
  var lastNow=performance.now();
  ENV.tick=function(){
    var now=performance.now(), dt=Math.min(.1,(now-lastNow)/1000); lastNow=now;
    dome.visible=sky.visible;
    if(uni.mixAB.value<1){ var m=Math.min(1,uni.mixAB.value+dt/1.1); var e=m*m*(3-2*m); uni.mixAB.value=m; probeUni.mixAB.value=m; needBake=needBake||Math.abs(e-lastBakeMix)>.12||m>=1; if(window.invalidateScene) invalidateScene(300); }
    if(needBake&&now-lastBakeAt>(SMALL?250:120)) ENV.bake();
  };
  var origWorldTick=worldTick; worldTick=function(t,dt,cam){ origWorldTick(t,dt,cam); ENV.tick(); };
  var origSnap=envSnap; envSnap=function(name){ origSnap(name); ENV.snap(name); };
  var origMix=envMix; envMix=function(name,k){ if(name!==ENV.target) ENV.crossTo(name); var dt=k/1.6; origMix(name,1-Math.exp(-2.4*dt)); };
  var origApply=envApply; envApply=function(focus,radius){ origApply(focus,radius); sunGlow.visible=false; };

  /* state calibration from the manifest: sun direction/colour/intensity, fog colour, exposure */
  ENV.init=function(manifest){
    ENV.manifest=manifest;
    Object.keys(manifest.states).forEach(function(name){
      var s=manifest.states[name], e=ENVS[name]; if(!e) return;
      if(s.hasSun){ e.sun=s.sunDir.slice(); e.sunI=s.sunI; if(s.sunColor) e.sunC=parseInt(s.sunColor.slice(1),16); }
      e.hemiI=Math.min(e.hemiI,.18); e.exp=1.0;
      var f=s.horizon.map(function(v){ return Math.min(.9,v*.85); });
      e.fog=(Math.round(f[0]*255)<<16)|(Math.round(f[1]*255)<<8)|Math.round(f[2]*255);
      e.glow=s.hasSun?e.glow:0;
    });
    ambient.intensity=0; fill.intensity=.10;
    ENV.ready=true;
  };
  ENV.prefetchFor=function(beatIdx){
    var ci=CH.findIndex(function(c){ return c.beats.indexOf(beatIdx)>=0; }); if(ci<0) return;
    var names=[]; [ci,ci+1].forEach(function(i){ var c=CH[i]; if(c) c.beats.forEach(function(b){ var n=BEATS[b].env; if(names.indexOf(n)<0) names.push(n); if(b===10||b===12) names.indexOf('interior')<0&&names.push('interior'); }); });
    names.reduce(function(p,n){ return p.then(function(){ return ENV.load(n).catch(function(){}); }); },Promise.resolve());
  };
  var origEnter=enterBeat; enterBeat=function(i,hard){ origEnter(i,hard); ENV.prefetchFor(i); };
  ENV.status=function(){ return {type:ENV.dataType,target:ENV.target,shown:ENV.shown,mix:+uni.mixAB.value.toFixed(2),loaded:Object.keys(ENV.loaded),failures:ENV.failures,bakes:ENV.bakes}; };
  /* manifest + first sky: resolved before the loader marks the site ready */
  ENV.first=fetch('assets/environment/manifest.json').then(function(r){ if(!r.ok) throw new Error('manifest '+r.status); return r.json(); })
    .then(function(m){ ENV.init(m); var first=BEATS[0].env; /* the half-res sky gates the loader; the full-res one streams in afterwards on desktop */
      return ENV.load(first,true).then(function(){ if(!SMALL) setTimeout(function(){ ENV.load(first,false).catch(function(){}); },2500); }); })
    .catch(function(e){ console.warn('ENV:',e.message); ENV.failures.push('manifest'); });
})();
