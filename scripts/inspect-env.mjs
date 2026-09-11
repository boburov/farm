import { chromium } from 'playwright';
import { readdir } from 'node:fs/promises'; import { homedir } from 'node:os';
const cache=homedir()+'/Library/Caches/ms-playwright'; const dir=(await readdir(cache)).filter(x=>x.startsWith('chromium_headless_shell-')).sort().at(-1);
const b=await chromium.launch({headless:true,executablePath:`${cache}/${dir}/chrome-headless-shell-mac-arm64/chrome-headless-shell`,args:['--use-angle=metal']});const p=await b.newPage({viewport:{width:1440,height:900}});
p.on('pageerror',e=>console.log('PAGEERR',e.message));p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,200))});
await p.goto('http://127.0.0.1:5173');await p.waitForSelector('#start.ready');await p.click('#start');
await p.evaluate(()=>{setPlaying(false);goTo(1,{force:true,at:.2,hard:true});});await p.waitForTimeout(2000);
const d=await p.evaluate(()=>{
  const T=THREE, out={};
  out.status=ENV.status(); out.sun={i:sun.intensity,c:'#'+sun.color.getHexString(),pos:sun.position.toArray().map(v=>+v.toFixed(1)),tgt:sun.target.position.toArray().map(v=>+v.toFixed(1)),castShadow:sun.castShadow};
  out.hemi=hemi.intensity; out.ambient=ambient.intensity; out.fill=fill.intensity; out.exposure=renderer.toneMappingExposure; out.envCur={sunI:envCur.sunI,exp:envCur.exp,fogD:envCur.fogD,fog:'#'+envCur.fog.getHexString()};
  out.ENVSmorning=ENVS.morning; out.env=scene.environment?{enc:scene.environment.encoding,fmt:scene.environment.format,type:scene.environment.type,w:scene.environment.image&&scene.environment.image.width}:null;
  out.uni={useA:ENV.uni.useA.value,useB:ENV.uni.useB.value,mix:ENV.uni.mixAB.value,shiftB:ENV.uni.shiftB.value,clampB:ENV.probeUni.clampB.value,texB:!!ENV.uni.texB.value,rgbeB:ENV.uni.rgbeB.value,gain:ENV.uni.gain.value};
  // read PMREM texels
  try{const rt=ENV.rt();const px=new Uint8Array(4*16);renderer.readRenderTargetPixels(rt,600,700,4,4,px);out.pmremSample=Array.from(px.slice(0,16));}catch(e){out.pmremErr=e.message;}
  // render the probe scene into a small byte target and read center
  try{const rt2=new T.WebGLRenderTarget(64,64);const cam=new T.PerspectiveCamera(60,1,.1,50);cam.position.set(0,0,0);cam.lookAt(1,0.3,0);const old=renderer.getRenderTarget();renderer.setRenderTarget(rt2);renderer.render(ENV.probeScene,cam);renderer.setRenderTarget(old);const px=new Uint8Array(4*4);renderer.readRenderTargetPixels(rt2,32,32,1,1,px);out.probePixel=Array.from(px);rt2.dispose();}catch(e){out.probeErr=e.message;}
  // read final composited frame from rtPost center
  try{const px=new Uint8Array(4);renderer.readRenderTargetPixels(rtPost,720,450,1,1,px);out.rtPostCenter=Array.from(px);}catch(e){out.rtPostErr=e.message;}
  // a test: standard material sphere lit only by env
  try{const g=new T.SphereGeometry(1,8,8),m=new T.MeshStandardMaterial({color:0xffffff,roughness:1});const mesh=new T.Mesh(g,m);const s2=new T.Scene();s2.environment=scene.environment;s2.add(mesh);const cam=new T.PerspectiveCamera(40,1,.1,50);cam.position.set(0,0,4);cam.lookAt(0,0,0);const rt3=new T.WebGLRenderTarget(32,32);const old=renderer.getRenderTarget();renderer.setRenderTarget(rt3);renderer.render(s2,cam);renderer.setRenderTarget(old);const px=new Uint8Array(4);renderer.readRenderTargetPixels(rt3,16,16,1,1,px);out.envLitSphere=Array.from(px);rt3.dispose();}catch(e){out.sphereErr=e.message;}
  out.shadow={near:sun.shadow.camera.near,far:sun.shadow.camera.far,l:sun.shadow.camera.left,r:sun.shadow.camera.right,bias:sun.shadow.bias,nb:sun.shadow.normalBias,map:sun.shadow.mapSize.toArray()};
  out.dome={visible:ENV.dome.visible,skyVisible:sky.visible,renderOrder:ENV.dome.renderOrder};
  return out;});
console.log(JSON.stringify(d,null,1));await b.close();
