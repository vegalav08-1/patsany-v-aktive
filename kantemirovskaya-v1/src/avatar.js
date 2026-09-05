import { T, mat, mesh, box, sphere, cyl, canvasTexture } from './graphics.js';
import { RoundedBoxGeometry } from '../vendor/addons/geometries/RoundedBoxGeometry.js';
import { fabric } from './materials.js';
import { HEROES } from './model.js';
let human;const geometries={},faces=new Map(),looks=new Map();
export async function loadFaces(){
 const loader=new T.TextureLoader();const [data]=await Promise.all([
  fetch(new URL('../assets/models/human.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Не загрузилась 3D-модель');return r.json();}),
  ...HEROES.map(async h=>{const t=await loader.loadAsync(new URL(`../assets/face-${h.id}.webp`,import.meta.url).href);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;faces.set(h.id,t);})
 ]);human=data;
 for(const[name,p]of Object.entries(data.parts)){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p.position,3));g.setAttribute('uv',new T.Float32BufferAttribute(p.uv,2));g.setAttribute('skinIndex',new T.Uint16BufferAttribute(p.skinIndex,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(p.skinWeight,4));g.setAttribute('faceWeight',new T.Float32BufferAttribute(p.faceWeight,1));g.setIndex(p.index);g.computeVertexNormals();g.computeBoundingSphere();geometries[name]=g;}
}
const palettes=[['#555956','#343b41','#b4b3a7'],['#203b44','#29353f','#d1d4c9'],['#a9bdce','#303e50','#d9ded9'],['#243341','#243341','#e2e2da'],['#aa9879','#9b8c71','#eee8d9']];
function materialSet(hero,stage){const key=hero+':'+stage;if(looks.has(key))return looks.get(key);const h=HEROES[hero],p=palettes[stage];
 const skin=new T.MeshPhysicalMaterial({color:'#bb927c',roughness:.79,sheen:.08});
 const face=new T.MeshPhysicalMaterial({map:faces.get(h.id),roughness:.86});
 face.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float faceWeight; varying float vFaceWeight;').replace('#include <begin_vertex>','#include <begin_vertex>\nvFaceWeight=faceWeight;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying float vFaceWeight;').replace('#include <map_fragment>','#ifdef USE_MAP\nvec4 faceSample=texture2D(map,vMapUv);diffuseColor*=vec4(mix(vec3(.505,.335,.241),faceSample.rgb,clamp(vFaceWeight,0.,1.)),1.);\n#endif');};face.customProgramCacheKey=()=> 'face-projection-1';
 const hair=mat(h.hair,.99),set={head:face,skin,shirt:fabric(p[0],stage>=3?'wool':'cotton'),pants:fabric(p[1],'wool'),shoes:fabric(stage>=3?'#26211d':'#55564d','leather'),hair};looks.set(key,set);return set;
}
function panel(parent,pts,material){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts.flat(),3));const ix=[];for(let i=1;i<pts.length-1;i++)ix.push(0,i,i+1);g.setIndex(ix);g.computeVertexNormals();return mesh(parent,g,material);}
function curve(parent,points,r,material){const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(parent,new T.TubeGeometry(path,Math.max(8,points.length*3),r,5,false),material);}
function round(parent,material,x,y,z,w,h,d,r=.015){return mesh(parent,new RoundedBoxGeometry(w,h,d,2,r),material,x,y,z);}
export class Avatar{
 constructor(parent,hero=2,stage=0){this.root=new T.Group();parent.add(this.root);this.body=new T.Group();this.root.add(this.body);this.setLook(hero,stage);const t=canvasTexture(64,64,c=>{let gr=c.createRadialGradient(32,32,1,32,32,30);gr.addColorStop(0,'#00000080');gr.addColorStop(1,'#00000000');c.fillStyle=gr;c.fillRect(0,0,64,64);});this.shadow=new T.Mesh(new T.PlaneGeometry(.88,.70),new T.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}));this.shadow.rotation.x=-Math.PI/2;this.shadow.position.y=.026;this.root.add(this.shadow);}
 setLook(hero,stage){this.hero=hero;this.stage=stage;if(this.skeleton)this.skeleton.dispose();this.body.traverse(o=>{if(o.userData.accessory&&o.isMesh)o.geometry.dispose();});this.body.clear();this.body.scale.set([1.10,.96,1.035,1.02][hero],[1.02,.98,1,1.015][hero],1.025);
  const bones=human.bones.map(b=>{const o=new T.Bone();o.name=b.name;const pp=b.parent>=0?human.bones[b.parent].p:[0,0,0];o.position.set(b.p[0]-pp[0],b.p[1]-pp[1],b.p[2]-pp[2]);return o;});bones.forEach((b,i)=>human.bones[i].parent>=0?bones[human.bones[i].parent].add(b):this.body.add(b));this.bones=Object.fromEntries(bones.map(b=>[b.name,b]));this.skeleton=new T.Skeleton(bones);this.body.updateMatrixWorld(true);
  const materials=materialSet(hero,stage);for(const[name,g]of Object.entries(geometries)){const m=new T.SkinnedMesh(g,materials[name]);m.castShadow=m.receiveShadow=true;m.frustumCulled=false;this.body.add(m);m.bind(this.skeleton);}
  this.detail=new T.Group();this.bones.chest.add(this.detail);this.detail.position.set(0,-1.36,0);const g=this.detail,p=palettes[stage],cloth=materials.shirt,white=fabric(p[2]);
  const line=mat(stage>=3?'#17222a':'#3d4140',.95);
  if(stage===0){sphere(g,cloth,0,1.444,-.092,.125,.062,.075);curve(g,[[-.057,1.468,.044],[-.068,1.44,.11],[-.04,1.32,.133]],.003,white);curve(g,[[.057,1.468,.044],[.068,1.44,.11],[.055,1.32,.133]],.003,white);panel(g,[[-.127,1.19,.121],[.127,1.19,.121],[.115,1.085,.123],[-.113,1.085,.123]],cloth);curve(g,[[-.13,1.19,.125],[0,1.181,.154],[.13,1.19,.125]],.0016,line);curve(g,[[0,1.45,.116],[0,1.28,.148],[0,1.032,.128]],.0025,mat('#979789',.5,.25));}
  else{
   panel(g,[[-.055,1.485,.08],[.055,1.485,.08],[.067,1.321,.155],[-.067,1.321,.155]],white);
   for(const s of[-1,1])panel(g,[[s*.01,1.474,.118],[s*.06,1.494,.075],[s*.086,1.438,.126],[s*.033,1.41,.145]],white);
   if(stage>=3){for(const s of[-1,1]){panel(g,[[s*.068,1.476,.083],[s*.151,1.399,.12],[s*.108,1.36,.16],[s*.145,1.326,.145],[s*.017,1.185,.161],[s*.045,1.347,.168]],cloth);curve(g,[[s*.064,1.465,.096],[s*.124,1.397,.145],[s*.083,1.34,.165],[s*.017,1.188,.163]],.0013,mat(stage===4?'#76694f':'#485461',.8));panel(g,[[s*.071,1.167,.154],[s*.147,1.17,.135],[s*.148,1.149,.135],[s*.071,1.146,.156]],cloth);}
    panel(g,[[-.018,1.432,.153],[.018,1.432,.153],[.022,1.255,.163],[0,1.22,.165],[-.022,1.255,.163]],fabric(stage===4?'#3b504d':'#41596a'));
    for(const y of[1.235,1.148])sphere(g,mat('#5e5748',.35),.025,y,.161,.006,.006,.003);
    panel(g,[[-.11,1.356,.15],[-.05,1.356,.164],[-.054,1.381,.16],[-.105,1.374,.148]],white);
   }else{curve(g,[[0,1.462,.113],[0,1.32,.154],[0,1.02,.123]],.002,line);for(const y of[1.39,1.31,1.23,1.15])sphere(g,mat('#c0c4bd'),0,y,.157,.004,.004,.002);panel(g,[[-.16,1.347,.13],[-.089,1.347,.157],[-.089,1.286,.158],[-.15,1.287,.139]],cloth);}
  }
  for(const side of['l','r']){const hand=this.bones[side+'Hand'];if(stage>=3){const cuff=cyl(hand,white,0,.023,0,.033,.035);cuff.rotation.z=side==='l'?-.07:.07;}}
  if(stage>=1){const b=this.bones.lHand;cyl(b,fabric('#292623','leather'),0,.023,0,.035,.026);const dial=cyl(b,mat(stage===4?'#d3ba75':'#babbbb',.24,.9),.031,.023,0,.022,.006);dial.rotation.z=Math.PI/2;const face=cyl(b,mat('#182322',.16,.4),.035,.023,0,.018,.002);face.rotation.z=Math.PI/2;}
  if(stage===2)round(this.bones.rHand,mat('#18262d',.22,.65),0,-.052,.048,.068,.128,.009,.004);
  if(stage>=3){const bag=new T.Group();this.bones.rHand.add(bag);bag.position.set(-.009,-.16,.05);round(bag,fabric(stage===4?'#634532':'#302b27','leather'),0,-.06,0,.095,.255,.34,.018);curve(bag,[[0,.08,-.05],[0,.123,-.042],[0,.13,.041],[0,.08,.05]],.006,fabric('#30271e','leather'));box(bag,mat('#b8a77f',.3,.7),-.05,-.025,.11,.006,.017,.03);}
  this.detail.traverse(o=>o.userData.accessory=true);
 }
 update(t,moving,yaw){const w=Math.sin(t*9.5),b=this.bones;this.body.position.y=Math.abs(Math.sin(t*9.5))*moving*.015;b.hips.rotation.z=w*moving*.025;b.chest.rotation.y=w*moving*.045;b.chest.rotation.x=moving*.035+Math.sin(t*1.7)*.004;b.head.rotation.y=Math.sin(t*.65)*.022;
  for(const[side,s]of[['l',1],['r',-1]]){b[side+'Thigh'].rotation.x=w*s*moving*.52;b[side+'Shin'].rotation.x=Math.max(0,-w*s)*moving*.72;b[side+'Foot'].rotation.x=-Math.max(0,w*s)*moving*.12;b[side+'Arm'].rotation.x=-w*s*moving*.32;b[side+'ForeArm'].rotation.x=-.08-Math.max(0,w*s)*moving*.20;}
  if(Number.isFinite(yaw)){let d=yaw-this.root.rotation.y;this.root.rotation.y+=Math.atan2(Math.sin(d),Math.cos(d))*.2;}
 }
}
