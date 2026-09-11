/** Original anatomical surface assets. Rebuild: npm run assets.
 * Geometry uses continuous profile lofts, swept curves and overlapping feather
 * vanes. No downloaded/AI-generated models. Units: metres; +Z forward, Y up.
 * GLBs retain authored region bone weights for the site's existing skeleton.
 */
import * as T from 'three';
import sharp from 'sharp';
import {mkdir, writeFile, copyFile} from 'node:fs/promises';
const OUT=(process.argv.find(a=>a.startsWith('--out='))||'--out=assets/models').slice(6);
for(const d of [OUT,'assets/textures','assets/environment']) await mkdir(d,{recursive:true});
const TAU=Math.PI*2, mix=(a,b,t)=>a+(b-a)*t, clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
let seed=719;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const V=(a)=>new T.Vector3(...a);
function surface(n,m,fn){
 const p=[],uv=[],idx=[];
 for(let i=0;i<=n;i++)for(let j=0;j<=m;j++){p.push(...fn(i/n,j/m));uv.push(j/m,i/n);}
 for(let i=0;i<n;i++)for(let j=0;j<m;j++){const a=i*(m+1)+j,b=a+m+1;idx.push(a,a+1,b,b,a+1,b+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
// Cubic profile interpolation includes sculpted cross sections, offsets and taper.
function sample(rows,t){
 const f=clamp(t)* (rows.length-1),i=Math.min(rows.length-2,Math.floor(f)),u=f-i;
 return rows[0].map((_,k)=>((2*rows[i][k]+(-rows[Math.max(0,i-1)][k]+rows[i+1][k])*u+(2*rows[Math.max(0,i-1)][k]-5*rows[i][k]+4*rows[i+1][k]-rows[Math.min(rows.length-1,i+2)][k])*u*u+(-rows[Math.max(0,i-1)][k]+3*rows[i][k]-3*rows[i+1][k]+rows[Math.min(rows.length-1,i+2)][k])*u*u*u)*.5));
}
function loft(rows,n=44,m=32,sculpt=0){
 const g=surface(n,m,(t,u)=>{const [z,y,rx,ry,cx=0]=sample(rows,t),a=u*TAU;
 const ripple=1+sculpt*Math.sin(a*3+t*14)*Math.sin(Math.PI*t)**2;
 return [cx+Math.cos(a)*Math.max(.00005,rx)*ripple,y+Math.sin(a)*Math.max(.00005,ry)*ripple,z];});
 // Closed ends: a centre vertex per end ring keeps every cut and body watertight.
 const idx=Array.from(g.index.array),pos=Array.from(g.attributes.position.array),uv=Array.from(g.attributes.uv.array);
 for(const end of [0,n]){const c=pos.length/3,[z,y,,,cx=0]=sample(rows,end===0?0:1);pos.push(cx,y,z);uv.push(.5,end===0?0:1);for(let j=0;j<m;j++){const a=end*(m+1)+j;if(end===0)idx.push(c,a+1,a);else idx.push(c,a,a+1);}}
 g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.deleteAttribute('normal');g.computeVertexNormals();return g;
}
function sweep(rows,n=24,m=12){
 const curve=new T.CatmullRomCurve3(rows.map(r=>V(r.slice(0,3))));
 const g=surface(n,m,(t,u)=>{
 const p=curve.getPoint(t),d=curve.getTangent(t),ref=Math.abs(d.x)<.85?V([1,0,0]):V([0,0,1]);
 const x=new T.Vector3().crossVectors(d,ref).normalize(),z=new T.Vector3().crossVectors(d,x).normalize();
 const rs=sample(rows,t),a=u*TAU,r=Math.max(.00005,rs[3]);
 return p.addScaledVector(x,Math.cos(a)*r).addScaledVector(z,Math.sin(a)*r*(rs[4]||1)).toArray();
 });
 // Closed swept ends keep food joints and cloth cuffs watertight.
 const idx=Array.from(g.index.array),pos=Array.from(g.attributes.position.array),uv=Array.from(g.attributes.uv.array);
 for(const end of [0,n]){const c=pos.length/3;pos.push(...rows[end===0?0:rows.length-1].slice(0,3));uv.push(.5,end===0?0:1);for(let j=0;j<m;j++){const a=end*(m+1)+j;if(end===0)idx.push(c,a+1,a);else idx.push(c,a,a+1);}}
 g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.deleteAttribute('normal');g.computeVertexNormals();return g;
}
function feather(from,to,width,bow=.003,detail=6,outward=[0,1,0]){
 const a=V(from),b=V(to),d=b.clone().sub(a),side=new T.Vector3().crossVectors(d,V(outward)).normalize();
 if(side.length()<.1)side.set(1,0,0);
 const norm=new T.Vector3().crossVectors(side,d).normalize();
 const g=surface(detail,4,(t,u)=>{
  const w=width*Math.pow(Math.sin(Math.PI*t),.62)*(1-.22*t),x=(u-.5)*2;
  return a.clone().addScaledVector(d,t).addScaledVector(side,x*w).addScaledVector(norm,Math.sin(Math.PI*t)*bow+(1-x*x)*width*.15).toArray();
 });return g;
}
function colorize(g,c,bone=1,weightFn){
 const p=g.attributes.position,cols=[],joints=[],weights=[],col=new T.Color(c).convertSRGBToLinear();
 for(let i=0;i<p.count;i++){
  const shade=.975+.025*Math.sin(i*1.21);cols.push(col.r*shade,col.g*shade,col.b*shade);
  const w=weightFn?weightFn(p.getX(i),p.getY(i),p.getZ(i)):[[bone,1]];
  const total=w.reduce((a,b)=>a+b[1],0);for(let k=0;k<4;k++){joints.push(w[k]?.[0]||0);weights.push(w[k]?w[k][1]/total:0);}
 }
 g.setAttribute('color',new T.Float32BufferAttribute(cols,3));g.setAttribute('skinIndex',new T.Uint16BufferAttribute(joints,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));return g;
}
function combine(gs){
 const attrs=['position','normal','uv','color','skinIndex','skinWeight'],out=new T.BufferGeometry(),indices=[];let base=0;
 // Preserve authored indices and UV seams; no triangle-soup expansion.
 for(const g of gs){const n=g.attributes.position.count;if(g.index)for(const i of g.index.array)indices.push(base+i);else for(let i=0;i<n;i++)indices.push(base+i);base+=n;}
 for(const k of attrs){if(!gs.every(g=>g.attributes[k]))continue;const size=gs[0].attributes[k].itemSize,arr=new (k==='skinIndex'?Uint16Array:Float32Array)(base*size);let o=0;for(const g of gs){arr.set(g.attributes[k].array,o);o+=g.attributes[k].array.length;}out.setAttribute(k,new T.BufferAttribute(arr,size));}
 out.setIndex(indices);out.computeBoundingBox();return out;
}
const adultRows=[[-.183,.282,.004,.008],[-.149,.283,.047,.047],[-.108,.288,.080,.070],[-.055,.276,.102,.092],[.007,.270,.108,.100],[.066,.285,.086,.104],[.106,.313,.057,.078],[.122,.346,.035,.060],[.135,.381,.024,.041],[.143,.412,.020,.028],[.153,.437,.023,.022],[.158,.451,.005,.009]];
const chickRows=[[-.12,.270,.003,.009],[-.10,.270,.055,.055],[-.052,.275,.094,.089],[.007,.279,.104,.102],[.055,.297,.087,.095],[.092,.325,.061,.070],[.12,.373,.032,.046],[.14,.412,.032,.032],[.15,.43,.005,.008]];
function bodyWeights(x,y,z){
 if(y>.418)return [[6,1]];if(y>.386)return [[4,clamp((.427-y)/.05)],[5,clamp((y-.385)/.05)]];
 if(y>.335)return [[2,clamp((.385-y)/.06)],[3,clamp((y-.332)/.06)]];
 return [[1,clamp((.085-z)/.12,.15,.9)],[2,clamp((z+.03)/.12,.1,.85)]];
}
function poultry(adult,lod){
 const parts=[[],[],[]],density=lod?0:1,sc=adult?1:.36;
 function add(g,c=0xf0e8da,slot=0,bone=1,weight){colorize(g,c,bone,weight);if(sc!==1)g.scale(sc,sc,sc);parts[slot].push(g);}
 const rows=adult?adultRows:chickRows;
 add(loft(rows,lod?14:60,lod?10:40,.008),adult?0xe7ddcc:0xf2cc77,0,1,bodyWeights);
 // Body coverts lie along the surface, tips pointing toward the rump.
 if(!lod){
  const rowCount=adult?16:13;
  for(let i=0;i<rowCount;i++){
   const t=.11+i/(rowCount-1)*.77, [z,y,rx,ry]=sample(rows,t),nr=Math.max(9,Math.round(rx*330));
   for(let j=0;j<nr;j++){
    const a=(j+(i%2)*.5)/nr*TAU, tipT=Math.max(.035,t-(adult?.074:.062));
    const [zz,yy,rrx,rry]=sample(rows,tipT);const n=V([Math.cos(a),Math.sin(a),0]);
    const root=V([Math.cos(a)*rx,y+Math.sin(a)*ry,z]).addScaledVector(n,.0006);
    const tip=V([Math.cos(a)*rrx,yy+Math.sin(a)*rry,zz]).addScaledVector(n,adult?.0035:.004);
    add(feather(root.toArray(),tip.toArray(),adult?.0135:.011,adult?.0007:.0015,4,n.toArray()),adult?(j%5===0?0xe7decd:0xeee5d5):0xf9d785,0,1,bodyWeights);
   }
  }
 }
 // Head has a distinct orbital arch and tapered cheek instead of a sphere.
 const hr=adult?.031:.052,hy=adult?.452:.447,hz=adult?.153:.148;
 const head=loft([[hz-hr*1.1,hy,.002,.008],[hz-hr*.65,hy,hr*.77,hr*.87],[hz,hy,hr,hr*1.05],[hz+hr*.7,hy-.004,hr*.79,hr*.8],[hz+hr*1.17,hy-.010,hr*.26,hr*.32],[hz+hr*1.3,hy-.012,.002,.003]],lod?9:25,lod?8:24,.01);
 add(head,adult?0xf6eee0:0xffe39c,0,6);
 // Closed mandibles, curved culmen and a visible seam.
 add(sweep([[0,hy-.003,hz+hr,.011],[0,hy-.006,hz+hr+.016,.010],[0,hy-.014,hz+hr+.034,.001]],lod?4:12,lod?6:10),0xd6a14d,1,6);
 add(sweep([[0,hy-.018,hz+hr,.008],[0,hy-.018,hz+hr+.016,.007],[0,hy-.015,hz+hr+.030,.0007]],lod?4:10,lod?6:8),0xb77f35,1,6);
 for(const side of [-1,1]){
  const ex=side*hr*.89,ey=hy+.004,ez=hz+hr*.36;
  const eye=new T.SphereGeometry(adult?.0085:.0105,lod?6:16,lod?4:10);eye.scale(.4,1,1);eye.translate(ex,ey,ez);add(eye,0xa16a25,2,6);
  const pupil=new T.SphereGeometry(adult?.0048:.0068,lod?6:12,lod?4:8);pupil.scale(.34,1,1);pupil.translate(ex+side*.002,ey,ez+.001);add(pupil,0x100c07,2,6);
  // Lower eyelid rim; top lid is attached exclusively to blink bone.
  if(!lod){
  const eyeR=adult?.0091:.011;
  const rim=sweep(Array.from({length:9},(_,i)=>{let a=.1+i/8*Math.PI;return [ex,ey-Math.sin(a)*eyeR,ez+Math.cos(a)*eyeR,.0014]}),16,6);add(rim,adult?0xb78865:0xd8b976,1,6);
  const lid=sweep(Array.from({length:9},(_,i)=>{let a=i/8*Math.PI;return [ex,ey+Math.sin(a)*eyeR,ez+Math.cos(a)*eyeR,.0017]}),16,6);add(lid,adult?0xecdccb:0xf9dda0,0,7);
  const nostril=new T.SphereGeometry(.0019,8,6);nostril.scale(.4,.7,1.7);nostril.translate(side*.008,hy-.006,hz+hr+.012);add(nostril,0x69452e,2,6);
  }
  if(adult&&!lod){
   add(sweep([[side*.008,hy-.023,.171,.001],[side*.010,hy-.040,.169,.009],[side*.009,hy-.054,.168,.004],[side*.008,hy-.056,.167,.0005]],16,12),0xaa302a,1,6);
   const ear=new T.SphereGeometry(.008,12,8);ear.scale(.3,1.1,.8);ear.translate(side*.028,hy-.017,.133);add(ear,0xded2ba,1,6);
  }
 }
 if(adult){
  const shape=new T.Shape();shape.moveTo(.117,.472);shape.bezierCurveTo(.13,.474,.16,.474,.192,.472);
  shape.lineTo(.194,.480);shape.lineTo(.182,.489);shape.lineTo(.179,.478);
  shape.lineTo(.168,.504);shape.lineTo(.160,.482);shape.lineTo(.149,.510);shape.lineTo(.142,.486);shape.lineTo(.130,.503);shape.lineTo(.125,.482);shape.lineTo(.117,.490);shape.closePath();
  const comb=new T.ExtrudeGeometry(shape,{depth:.0034,bevelEnabled:true,bevelSize:.0012,bevelThickness:.0012,bevelSegments:lod?1:2,steps:1,curveSegments:lod?2:8});
  const pp=comb.attributes.position;for(let i=0;i<pp.count;i++){const x=pp.getX(i),y=pp.getY(i),z=pp.getZ(i);pp.setXYZ(i,z-.0017,y,x);}comb.computeVertexNormals();add(comb,0xbb332b,1,6);
 }
 for(const side of [-1,1]){
  const wingBone=side===1?9:11,wingTip=wingBone+1;
  if(adult){
   for(let j=0;j<(lod?4:10);j++){
    const q=j/(lod?3:9);add(feather([side*(.086+q*.004),.300-q*.038,.061-q*.014],[side*(.10+q*.001),.223-q*.010,-.096-q*.061],.017,.002,lod?2:7,[side,0,0]),j%3?0xe9dfcd:0xd6cbb9,0,j<5?wingBone:wingTip);
   }
   if(!lod)for(let row=0;row<3;row++)for(let j=0;j<9;j++){
    let z=.055-j*.018,y=.324-row*.024,x=side*(.102+row*.002);
    add(feather([x,y,z],[x+side*.002,y-.033,z-.026],.014,.001,4,[side,0,0]),0xf0e6d5,0,wingBone);
   }
  }else{
   for(let j=0;j<(lod?3:7);j++)add(feather([side*.09,.300-j*.007,.024-j*.008],[side*.098,.254-j*.003,-.035-j*.007],.016,.002,lod?2:4,[side,0,0]),0xf6d27d,0,wingBone);
  }
  // Feathered thigh to visible hock, with explicit bone regions.
  const hip=side===1?13:17,knee=hip+1,hock=hip+2,foot=hip+3;
  add(sweep([[side*.061,.264,-.016,.031],[side*.063,.222,-.025,.036],[side*.061,.173,-.010,.022],[side*.060,.113,.004,.014]],lod?8:22,lod?7:12),adult?0xe1d5bf:0xe9bd63,0,hip,(x,y)=>[[hip,clamp((y-.15)/.1)],[knee,1-clamp((y-.15)/.1)]]);
  add(sweep([[side*.06,.116,.006,.011],[side*.06,.086,.001,.0077],[side*.06,.046,.005,.007],[side*.06,.008,.016,.010]],lod?6:22,lod?6:12),0xc99851,1,hock);
  if(!lod)for(let j=0;j<10;j++)add(sweep([[side*.06-.005,.020+j*.008,.012,.0006],[side*.06,.019+j*.008,.014,.0009],[side*.06+.005,.020+j*.008,.012,.0006]],5,5),0xa4773c,1,hock);
  for(const [off,len] of [[-.018,.035],[0,.052],[.019,.037],[.008,-.032]]){
   const endx=side*.06+off,endz=.015+len;
   add(sweep([[side*.06,.009,.014,.0055],[side*.06+off*.45,.006,.015+len*.4,.0044],[endx,.005,endz,.0027]],lod?3:12,lod?5:7),0xd7a65c,1,foot);
   if(!lod)add(sweep([[endx,.005,endz,.0028],[endx+off*.12,.005,endz+Math.sign(len)*.006,.0018],[endx+off*.15,.001,endz+Math.sign(len)*.010,.0002]],6,6),0x7b6547,1,foot);
  }
 }
 if(adult){for(let i=-3;i<=3;i++)add(feather([i*.007,.300,-.145],[i*.018,.400-Math.abs(i)*.010,-.270+Math.abs(i)*.012],.017,.005,lod?2:8),i%2?0xd9ceba:0xeee4d3,0,8);}
 else if(!lod)for(let i=-1;i<=1;i++)add(feather([i*.013,.29,-.098],[i*.014,.325,-.132],.012,.004,4),0xeecb7d,0,8);
 return parts.map((gs,slot)=>({name:['plumage','keratin','eyes'][slot],geo:combine(gs),mat:slot,extras:{slot,adult,rig:true}}));
}
// Cut models are sculpted through asymmetric cross sections, each with its own pivot.
function food(){
 const out=[];const add=(name,geo,mat=3)=>out.push({name,geo,mat});
 for(const side of [-1,1]){
  const suffix=side===1?'L':'R';
  const breast=loft([[-.18,.65,.008,.008,.16],[-.10,.708,.13,.085,.157],[.02,.716,.16,.103,.163],[.17,.702,.145,.097,.17],[.32,.689,.111,.071,.174],[.47,.67,.07,.044,.168],[.61,.65,.023,.018,.13],[.66,.64,.001,.001,.115]],50,40,.025);breast.scale(side,1,1);if(side<0)flip(breast);add('breast'+suffix,breast);
  const tender=loft([[-.12,.601,.004,.005,.095],[.02,.617,.043,.032,.095],[.21,.615,.038,.031,.11],[.40,.615,.027,.018,.105],[.54,.621,.001,.002,.085]],30,20,.017);tender.scale(side,1,1);if(side<0)flip(tender);add('tender'+suffix,tender);
  add('thigh'+suffix,sweep([[side*.29,.46,-.33,.010],[side*.38,.47,-.25,.115],[side*.43,.39,-.12,.14],[side*.43,.29,-.02,.088],[side*.40,.24,.04,.025]],30,30),4);
  add('drum'+suffix,sweep([[side*.42,.28,.03,.055],[side*.44,.215,.105,.102],[side*.415,.115,.18,.10],[side*.355,.020,.23,.049],[side*.321,-.043,.251,.025]],36,30),4);
  add('drumBone'+suffix,sweep([[side*.321,-.038,.252,.021],[side*.311,-.089,.265,.018],[side*.312,-.11,.27,.029],[side*.312,-.129,.273,.010]],14,16),5);
  add('thighBone'+suffix,sweep([[side*.30,.47,-.34,.027],[side*.305,.47,-.387,.022],[side*.31,.47,-.415,.031]],12,12),5);
  add('wing'+suffix,sweep([[side*.29,.54,.23,.048],[side*.43,.51,.175,.066],[side*.54,.40,.07,.060],[side*.57,.39,-.012,.047],[side*.61,.47,-.14,.038],[side*.63,.50,-.21,.025],[side*.66,.47,-.26,.014],[side*.67,.39,-.31,.001]],42,18),4);
 }
 // Back cavity has an actual open end and recessed inner wall, with no graphic detail.
 const back=loft([[-.49,.47,.065,.075],[-.42,.47,.18,.12],[-.28,.46,.255,.16],[-.06,.46,.27,.17],[.15,.49,.20,.14],[.32,.52,.12,.08],[.39,.54,.035,.040]],40,36,.018);add('back',back,4);
 add('rest',loft([[-.64,.43,.004,.009],[-.59,.46,.08,.05],[-.53,.47,.10,.06],[-.48,.46,.07,.04]],18,20,.02),4);
 // Whole dressed bird: broad twin breast surface / keel, hollow rear and neck collars.
 let whole=loft([[-.43,.29,.040,.034],[-.37,.31,.082,.052],[-.28,.31,.187,.141],[-.13,.31,.255,.187],[.05,.29,.249,.180],[.20,.245,.187,.13],[.30,.20,.088,.079]],64,48,.012);
 const pp=whole.attributes.position;for(let i=0;i<pp.count;i++){const x=pp.getX(i),y=pp.getY(i),z=pp.getZ(i);if(y>.3)pp.setY(i,y+.022*Math.sin(Math.abs(x)*13)*Math.exp(-z*z*13)-.008*Math.exp(-x*x*1500));}whole.computeVertexNormals();
 const w=[whole];
 for(const side of [-1,1]){
  w.push(sweep([[side*.17,.20,.10,.065],[side*.235,.185,.16,.101],[side*.21,.14,.26,.083],[side*.14,.12,.34,.051],[side*.10,.14,.39,.027]],32,24));
  w.push(sweep([[side*.207,.332,-.18,.030],[side*.268,.245,-.10,.039],[side*.27,.183,-.01,.031],[side*.248,.185,.073,.020],[side*.223,.24,.057,.018],[side*.206,.28,.01,.006]],30,18));
 }
 add('whole',combine(w),4);
 const inner=loft([[.301,.20,.086,.077],[.277,.205,.065,.055],[.24,.21,.022,.024],[.234,.215,.001,.001]],20,24);flip(inner);add('cavity',inner,6);
 const neck=loft([[-.431,.29,.039,.033],[-.411,.29,.027,.023],[-.385,.29,.003,.003]],16,20);flip(neck);add('neckCavity',neck,6);
 return out;
}
function flip(g){if(g.index){const ar=g.index.array;for(let i=0;i<ar.length;i+=3)[ar[i+1],ar[i+2]]=[ar[i+2],ar[i+1]];}else{for(const a of Object.values(g.attributes)){for(let i=0;i<a.count;i+=3)for(let j=0;j<a.itemSize;j++){let k=(i+1)*a.itemSize+j,l=(i+2)*a.itemSize+j;[a.array[k],a.array[l]]=[a.array[l],a.array[k]];}}}g.computeVertexNormals();return g;}
// Continuous tailored garment surfaces, with explicit limb weights.
function humanSurfaces(){
 const nodes=[],torsos=[],legs=[],boots=[],palms=[];
 const add=(arr,g,bone,fn)=>arr.push(colorize(g,0xffffff,bone,fn));
 const trunk=loft([[.88,0,.135,.10],[.97,0,.152,.105],[1.07,0,.14,.093],[1.23,0,.171,.110],[1.36,0,.187,.106],[1.405,0,.167,.085],[1.45,0,.055,.052]],25,24,.012).rotateX(-Math.PI/2);
 add(torsos,trunk,1,(x,y)=>y<1.10?[[0,clamp((1.10-y)/.15)],[1,clamp((y-.95)/.15)]]:[[1,clamp((1.30-y)/.20)],[2,clamp((y-1.10)/.20)]]);
 for(const side of [-1,1]){
  const sh=side===1?5:8,el=sh+1,ha=sh+2,hi=side===1?11:15,kn=hi+1,an=hi+2;
  add(torsos,sweep([[side*.164,1.401,0,.060],[side*.187,1.350,0,.062],[side*.185,1.245,-.004,.055],[side*.185,1.157,0,.047],[side*.185,1.085,0,.050],[side*.185,.987,0,.040],[side*.185,.923,0,.038]],28,16),sh,(x,y)=>[[sh,clamp((y-1.10)/.10)],[el,1-clamp((y-1.10)/.10)]]);
  add(legs,sweep([[side*.095,.936,0,.095],[side*.095,.845,0,.099],[side*.095,.68,-.004,.086],[side*.095,.514,0,.072],[side*.095,.453,-.004,.071],[side*.095,.26,-.002,.063],[side*.095,.103,.002,.057]],30,16),hi,(x,y)=>[[hi,clamp((y-.45)/.12)],[kn,1-clamp((y-.45)/.12)]]);
  const shoe=loft([[-.085,.05,.007,.015,side*.095],[-.06,.058,.060,.050,side*.095],[.005,.063,.060,.057,side*.095],[.06,.047,.066,.038,side*.095],[.155,.039,.061,.027,side*.095],[.195,.034,.012,.018,side*.095]],20,16);add(boots,shoe,an);
  add(palms,sweep([[side*.185,.929,0,.033],[side*.185,.897,.010,.039],[side*.185,.861,.015,.037],[side*.185,.831,.027,.013]],14,12),ha);
 }
 for(const [name,gs,slot]of [['torso',torsos,0],['trousers',legs,0],['boots',boots,2],['palms',palms,1]])nodes.push({name,geo:combine(gs),mat:1,extras:{slot}});
 return nodes;
}

// Binary glTF writer: standard float attributes, packed ORM textures and named nodes.
async function glb(name,meshes){
 const doc={asset:{version:'2.0',generator:'Bir tovuqdan anatomical loft generator 1.0',copyright:'Original assets authored for this project'},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],buffers:[{byteLength:0}],bufferViews:[],accessors:[],materials:[],textures:[],images:[],samplers:[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}]};
 const blocks=[];let offset=0;
 function accessor(attr){const ar=attr.array,b=Buffer.from(ar.buffer,ar.byteOffset,ar.byteLength),pad=(4-b.length%4)%4;const vi=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});blocks.push(b,Buffer.alloc(pad));offset+=b.length+pad;const a={bufferView:vi,componentType:ar instanceof Uint16Array?5123:ar instanceof Uint32Array?5125:5126,count:attr.count,type:({1:'SCALAR',2:'VEC2',3:'VEC3',4:'VEC4'})[attr.itemSize]};
 if(attr.itemSize===3){a.min=[Infinity,Infinity,Infinity];a.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<attr.count;i++)for(let k=0;k<3;k++){a.min[k]=Math.min(a.min[k],ar[i*3+k]);a.max[k]=Math.max(a.max[k],ar[i*3+k]);}}
 doc.accessors.push(a);return doc.accessors.length-1;}
 function tx(uri){let i=doc.images.findIndex(x=>x.uri===uri);if(i<0){i=doc.images.length;doc.images.push({uri});doc.textures.push({source:i,sampler:0});}return {index:i};}
 const defs=[['feather',.88,0xffffff],['keratin',.54,0xffffff],['eyes',.23,0xffffff],['meat',.52,0xffffff],['skin',.65,0xffffff],['bone',.51,0xeee5cf],['skin',.82,0xb38b73]];
 for(const [type,rough,col] of defs){const c=new T.Color(col).convertSRGBToLinear();const mat={name:type,pbrMetallicRoughness:{baseColorFactor:[c.r,c.g,c.b,1],metallicFactor:0,roughnessFactor:rough},doubleSided:type==='feather'};
 if(['feather','meat','skin'].includes(type)){mat.pbrMetallicRoughness.baseColorTexture=tx(`../textures/${type}-color.webp`);mat.pbrMetallicRoughness.metallicRoughnessTexture=tx(`../textures/${type}-orm.webp`);mat.normalTexture={...tx(`../textures/${type}-normal.webp`),scale:type==='feather'?.24:.17};mat.occlusionTexture={...tx(`../textures/${type}-orm.webp`),strength:.35};}doc.materials.push(mat);}
 const names={position:'POSITION',normal:'NORMAL',uv:'TEXCOORD_0',color:'COLOR_0',skinIndex:'_RIG_JOINTS',skinWeight:'_RIG_WEIGHTS'};
 for(const {name,geo,mat,extras} of meshes){for(const [key,at]of Object.entries(geo.attributes))if(at.count!==geo.attributes.position.count)throw new Error(name+' mismatched '+key);const attrs={};for(const [key,a] of Object.entries(geo.attributes))if(names[key])attrs[names[key]]=accessor(a);const primitive={attributes:attrs,material:mat};if(geo.index)primitive.indices=accessor(geo.index);const i=doc.meshes.length;doc.meshes.push({name,primitives:[primitive]});doc.nodes.push({name,mesh:i,extras:extras||{}});doc.scenes[0].nodes.push(i);}
 doc.buffers[0].byteLength=offset;let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const bin=Buffer.concat(blocks);const header=Buffer.alloc(12);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);const chunk=(b,type)=>{const h=Buffer.alloc(8);h.writeUInt32LE(b.length);h.writeUInt32LE(type,4);return Buffer.concat([h,b]);};
 await writeFile(`${OUT}/${name}.glb`,Buffer.concat([header,chunk(json,0x4e4f534a),chunk(bin,0x004e4942)]));
 return {file:`${name}.glb`,triangles:meshes.reduce((n,x)=>n+(x.geo.index?x.geo.index.count:x.geo.attributes.position.count)/3,0),bytes:28+json.length+bin.length};
}
// Offline 2K material bakes. Color in sRGB, tangent-space normals and ORM linear.
// Feather UV spans one vane; rows of physical coverts handle direction/overlap.
async function bake(type,size=2048){
 const N=size*size,height=new Float32Array(N),color=Buffer.alloc(N*3),orm=Buffer.alloc(N*3),normal=Buffer.alloc(N*3);
 const noise=(x,y)=>{let h=Math.imul(x+139,374761393)^Math.imul(y+37,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,u=x/size,v=y/size,coarse=Math.sin(u*TAU*3+Math.sin(v*TAU*2))*.5+Math.sin(v*TAU*5+u*TAU)*.25,nn=noise(x,y)-.5;
  let h,base,rough,ao;
  if(type==='feather'){
   const spine=Math.exp(-Math.pow((u-.5)*180,2)),barb=Math.sin((v+Math.abs(u-.5)*.72)*TAU*148),fine=Math.sin((v+Math.abs(u-.5)*.75)*TAU*480);
   h=spine*.15+barb*.018+fine*.007+nn*.004;base=[244,238,222].map(c=>c+barb*2+coarse*2+nn*1.2-Math.abs(u-.5)*6);rough=205+barb*6+coarse*8;ao=249-Math.abs(barb)*3;
  }else if(type==='skin'){
   const gx=u*110,gy=v*100,ix=Math.floor(gx),iy=Math.floor(gy),cx=.25+noise(ix,iy)*.5,cy=.25+noise(ix+7,iy)*.5,d=Math.hypot(gx-ix-cx,(gy-iy-cy)*1.12),pore=Math.exp(-d*d*165),rim=Math.exp(-Math.pow((d-.13)*19,2));
   h=-pore*.025+rim*.008+nn*.006+coarse*.011;base=[239,214,183].map((c,k)=>c+coarse*(k===0?3:6)+nn*1.8-pore*4);rough=185+coarse*13+nn*7;ao=252-pore*8;
  }else{
   const fibre=Math.sin((u*190+Math.sin(v*TAU)*.7+Math.sin(v*TAU*3)*.22)*TAU),membrane=Math.pow(Math.max(0,Math.sin(u*TAU*8+v*6)),24);
   h=fibre*.008+coarse*.018+nn*.004;base=[235,186,170].map((c,k)=>c+coarse*(k?9:4)+fibre*1.5+membrane*(k?13:3)+nn*1.1);rough=172+coarse*14-membrane*18;ao=251-Math.abs(fibre)*2;
  }
  height[i]=h;for(let c=0;c<3;c++)color[i*3+c]=clamp(base[c],0,255);orm[i*3]=ao;orm[i*3+1]=rough;orm[i*3+2]=0;
 }
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,dx=(height[y*size+(x+1)%size]-height[y*size+(x+size-1)%size])*11,dy=(height[((y+1)%size)*size+x]-height[((y+size-1)%size)*size+x])*11,l=Math.hypot(dx,dy,1);
  normal[i*3]=(-dx/l*.5+.5)*255;normal[i*3+1]=(dy/l*.5+.5)*255;normal[i*3+2]=(1/l*.5+.5)*255;
 }
 await Promise.all([['color',color],['normal',normal],['orm',orm]].map(async([suffix,buffer])=>{
  const img=sharp(buffer,{raw:{width:size,height:size,channels:3}});await img.webp({quality:suffix==='color'?88:96,effort:5}).toFile(`assets/textures/${type}-${suffix}.webp`);
  await sharp(buffer,{raw:{width:size,height:size,channels:3}}).resize(512).webp({quality:85}).toFile(`assets/textures/${type}-${suffix}-512.webp`);
 }));
}
for(const type of (process.argv.includes('--models-only')?[]:['feather','meat','skin'])){await bake(type);console.log('Baked',type);}
const manifest=[];
for(const adult of [true,false])for(const lod of [false,true]){const name=(adult?'hen':'chick')+(lod?'-lod':'-hero');manifest.push(await glb(name,poultry(adult,lod)));console.log('Exported',name);}
manifest.push(await glb('poultry-cuts',food()));
manifest.push(await glb('worker-surfaces',humanSurfaces()));
await writeFile(`${OUT}/manifest.json`,JSON.stringify({generator:'scripts/generate-assets.mjs',units:'metres',forward:'+Z',up:'+Y',license:'Original project assets',assets:manifest},null,2));
console.log(JSON.stringify(manifest,null,2));
