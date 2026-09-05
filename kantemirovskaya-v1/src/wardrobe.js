import {T,mat,mesh,box,cyl} from './graphics.js';
import {fabric} from './materials.js';
const cache=new Map();

/** Tailor the existing skinned mesh; preserve its bones, UVs and photographed head. */
export function garmentGeometry(base,name,stage) {
  if(!['shirt','pants'].includes(name))return base;
  const key=name+stage;if(cache.has(key))return cache.get(key);
  const g=base.clone(),p=g.attributes.position,si=g.attributes.skinIndex,sw=g.attributes.skinWeight;
  for(let i=0;i<p.count;i++) {
    let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    if(name==='shirt') {
      let arms=0;for(let j=0;j<4;j++)if([5,6,8,9].includes(si.array[i*4+j]))arms+=sw.array[i*4+j];
      const body=1-Math.min(1,arms),hem=Math.max(0,Math.min(1,(1.27-y)/.26));
      const relaxed=stage===0?.027:stage===1?.031:stage===2?.014:.026;
      x+=Math.sign(x)*body*relaxed*(.6+hem*.9);
      z+=Math.sign(z)*body*(relaxed*.55+hem*.018);
      // Small broad folds, not a noisy displacement over the whole body.
      z+=Math.sin(y*58+x*11)*.004*hem*body;
      if(stage>=3&&y<1.14&&body>.5)z=Math.sign(z)*Math.max(Math.abs(z),.16*Math.sqrt(Math.max(0,1-(x/.265)**2)));
      if(y<1.13)y-=body*(stage>=3?.115:stage===0?.055:.035)*Math.max(0,(1.13-y)/.13);
      const armX=Math.sign(x)*(.25+(1.35-y)*.075);
      x+=(x-armX)*arms*(stage<2?.16:.09);z*=1+arms*.12;
    }else {
      const sign=Math.sign(x),axis=sign*.103,leg=Math.max(0,Math.min(1,(.95-y)/.23));
      x+=(x-axis)*leg*(stage<2?.27:.19);z*=1+leg*.16;
      const fold=Math.exp(-(((y-.20)/.075)**2))+.6*Math.exp(-(((y-.52)/.09)**2));
      z+=Math.sin(y*100+x*6)*.0035*fold;
    }
    p.setXYZ(i,x,y,z);
  }
  p.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();cache.set(key,g);return g;
}

function stitch(g,points,material,r=.0015) {
  const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
  return mesh(g,new T.TubeGeometry(path,16,r,4,false),material);
}
export function finishOutfit(avatar,stage) {
  const g=avatar.detail,thread=mat(stage===4?'#c2b795':stage===2?'#c7c9bc':'#47565b',.86);
  const dark=mat('#2d3432',.88);
  // Garment construction: shoulder seams, longer jacket hem, sleeve cuffs.
  for(const s of[-1,1]) {
    stitch(g,[[s*.065,1.455,.093],[s*.15,1.43,.119],[s*.208,1.4,.08]],thread);
    if(stage>=3)stitch(g,[[s*.045,1.20,.192],[s*.075,1.06,.186],[s*.15,.947,.133]],thread);
  }
  if(stage<2) {
    const hem=fabric(stage===0?'#3c4845':'#885039');
    const m=mesh(g,new T.CylinderGeometry(.191,.194,.045,32,1,true),hem,0,stage===0?.979:1.005,0);
    m.scale.z=.80;
    for(let i=0;i<26;i++){const a=i/26*6.283;stitch(g,[[Math.sin(a)*.193,.964,Math.cos(a)*.155],[Math.sin(a)*.193,.993,Math.cos(a)*.155]],thread,.0008);}
  }
  if(stage>=3) {
    const gold=mat('#c6ae6d',.23,.8);
    const pin=cyl(g,gold,-.114,1.38,.189,.009,.004);pin.rotation.x=Math.PI/2;
    stitch(g,[[0,1.065,-.15],[0,1.22,-.16],[0,1.40,-.108]],thread);
  }
  for(const side of['l','r']) {
    const foot=avatar.bones[side+'Foot'];
    const sole=mesh(foot,new T.SphereGeometry(1,16,8),stage<3?mat('#c5c1ae',.87):dark,0,-.076,.068,.061,.022,.149);
    sole.castShadow=true;
    if(stage<3)for(let j=0;j<4;j++)stitch(foot,[[-.029,-.012-j*.005,.07+j*.022],[.027,-.012-j*.005,.07+j*.022]],mat('#d8d4c3'),.002);
    else stitch(foot,[[-.035,-.036,.16],[0,-.027,.18],[.035,-.036,.16]],thread,.001);
  }
}

/** Keep seams and lapels on top of the newly draped fabric, including curved panels. */
export function fitGarmentDetails(avatar,stage) {
  const shirt=avatar.body.children.find(o=>o.name==='shirt')?.geometry.attributes.position;
  if(!shirt)return;
  const surface=(x,y)=>{
    let best=Infinity,z=.12;
    for(let i=0;i<shirt.count;i++){if(shirt.getZ(i)<0)continue;const d=(shirt.getX(i)-x)**2+(shirt.getY(i)-y)**2;if(d<best){best=d;z=shirt.getZ(i);}}
    return z;
  };
  avatar.detail.traverse(o=>{
    if(!o.isMesh||!['BufferGeometry','TubeGeometry'].includes(o.geometry.type))return;
    let geometry=o.geometry;
    if(geometry.type==='BufferGeometry') {
      // Subdivide flat cloth panels before fitting them to a rounded torso.
      const source=geometry.index?geometry.toNonIndexed():geometry.clone();let vertices=Array.from(source.attributes.position.array);source.dispose();
      for(let level=0;level<2;level++) {const next=[];for(let i=0;i<vertices.length;i+=9){const a=vertices.slice(i,i+3),b=vertices.slice(i+3,i+6),c=vertices.slice(i+6,i+9),mid=(a,b)=>a.map((v,k)=>(v+b[k])/2),ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);next.push(...a,...ab,...ca,...ab,...b,...bc,...ca,...bc,...c,...ab,...bc,...ca);}vertices=next;}
      geometry.dispose();geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));o.geometry=geometry;
    }
    const p=geometry.attributes.position;
    for(let i=0;i<p.count;i++) {const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(z>.055&&y>1.01&&y<1.45&&Math.abs(x)<.21)p.setZ(i,Math.max(z,surface(x,y)+.008+(z-.11)*.18));}
    p.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
  });
}
