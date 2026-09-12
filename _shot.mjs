import { webkit } from 'playwright';
const b = await webkit.launch();
const p = await b.newPage({viewport:{width:1600,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://localhost:5173/#2025-2026',{waitUntil:'load'});
await p.waitForTimeout(4000);
const probe=()=>p.evaluate(()=>{
  const g=window.ChickenParts&&ChickenParts.group;
  return {hasCanvas:!!document.querySelector('.cuts-model canvas'),
          spinY:g&&g.parent?+g.parent.rotation.y.toFixed(3):null,
          w:(document.querySelector('.cuts-model')||{clientWidth:0}).clientWidth};
});
const a=await probe(); await p.waitForTimeout(2500); const c=await probe();
console.log(JSON.stringify({a,c,errs:errs.slice(0,5)}));
await p.screenshot({path:'shot-cuts.png'});
await b.close();
