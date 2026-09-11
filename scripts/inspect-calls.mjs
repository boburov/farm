import { chromium } from 'playwright'; import { readdir } from 'node:fs/promises'; import { homedir } from 'node:os';
const cache=homedir()+'/Library/Caches/ms-playwright'; const dir=(await readdir(cache)).filter(x=>x.startsWith('chromium_headless_shell-')).sort().at(-1);
const b=await chromium.launch({headless:true,executablePath:`${cache}/${dir}/chrome-headless-shell-mac-arm64/chrome-headless-shell`,args:['--use-angle=metal']});const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://127.0.0.1:5173');await p.waitForSelector('#start.ready');await p.click('#start');
for(const [ci,at] of [[5,.72],[3,.8]]){
 await p.evaluate(([ci,at])=>{setPlaying(false);goTo(ci,{force:true,at,hard:true});},[ci,at]);await p.waitForTimeout(1200);
 const d=await p.evaluate(()=>{const T=THREE;const out={beat:curBeat,calls:CINEMA_STATS.calls,tris:CINEMA_STATS.triangles};const byTop={},byMat={};let visMeshes=0,instanced=0,skinned=0,points=0;
  camera.updateMatrixWorld();const fr=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  scene.traverseVisible(o=>{if(!(o.isMesh||o.isPoints||o.isLine))return;if(o.frustumCulled&&o.geometry.boundingSphere===null)o.geometry.computeBoundingSphere();if(o.frustumCulled&&!fr.intersectsObject(o))return;visMeshes++;if(o.isInstancedMesh)instanced++;if(o.isSkinnedMesh)skinned++;if(o.isPoints)points++;
   let t=o;while(t.parent&&t.parent!==scene)t=t.parent;const k=t.name||('#'+t.type);byTop[k]=(byTop[k]||0)+1;const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{const mk=m.name||m.type;byMat[mk]=(byMat[mk]||0)+1;});});
  out.visMeshes=visMeshes;out.instanced=instanced;out.skinned=skinned;out.points=points;out.byTop=Object.entries(byTop).sort((a,b)=>b[1]-a[1]).slice(0,12);out.byMat=Object.entries(byMat).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const G2=window.G;const named={};for(const k of Object.keys(G2)){const g=G2[k];if(!g||!g.isObject3D||!g.visible)continue;let n=0;g.traverseVisible(o=>{if(o.isMesh||o.isPoints)n++;});named[k]=n;}out.byG=Object.entries(named).sort((a,b)=>b[1]-a[1]).slice(0,14);out.qlog=window.QUALITY&&QUALITY.log;const inCluster={};G.cluster.traverseVisible(o=>{if(!(o.isMesh||o.isPoints))return;let t=o;while(t.parent&&t.parent!==G.cluster)t=t.parent;const k=(t.name||t.type)+(t.userData.stages?'(fac)':'');inCluster[k]=(inCluster[k]||0)+1;});out.cluster=Object.entries(inCluster).sort((a,b)=>b[1]-a[1]).slice(0,10);const inExp={};G.expansion.traverseVisible(o=>{if(!(o.isMesh||o.isPoints))return;let t=o;while(t.parent&&t.parent!==G.expansion)t=t.parent;const k=(t.name||t.type);inExp[k]=(inExp[k]||0)+1;});out.expansion=Object.entries(inExp).sort((a,b)=>b[1]-a[1]).slice(0,8);return out;});
 console.log(JSON.stringify(d));
}
await b.close();
