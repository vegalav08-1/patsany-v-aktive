import {T,mat,mesh,box,cyl,canvasTexture} from './graphics.js';
import {pbr} from './materials.js';
import {ASSETS,pointInPolygon} from './model.js';
import {addWind} from './street-life.js';
const rng=(s=13)=>()=>((s=s*16807%2147483647)/2147483647);
function plane(parent,points,material,y){const sh=new T.Shape();points.forEach(([x,z],i)=>i?sh.lineTo(x,-z):sh.moveTo(x,-z));const g=new T.ShapeGeometry(sh);g.rotateX(-Math.PI/2);return mesh(parent,g,material,0,y,0);}
const windows=[];
function windowMaterial(i){if(windows[i])return windows[i];const t=canvasTexture(256,256,(c,w,h)=>{c.fillStyle=['#26323a','#3f423e','#313731','#463f36'][i];c.fillRect(0,0,w,h);const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#657174');g.addColorStop(1,'#111817');c.fillStyle=g;c.fillRect(5,5,246,246);const r=rng(i+49);for(const side of [0,1]){const width=35+r()*45;for(let x=0;x<width;x++){const value=115+Math.sin(x*.32)*19;c.fillStyle=`rgb(${value+16},${value+13},${value+5})`;c.fillRect(side?256-x:x,4,1,236);}}c.fillStyle='#394449';c.fillRect(25,222,201,22);if(i===2){c.fillStyle='#594f40';c.fillRect(65,201,56,7);}c.fillStyle='#262e25';for(let q=0;q<9;q++)c.fillRect(42+q*5,214-r()*18,3,18);});windows[i]=new T.MeshPhysicalMaterial({map:t,color:'#bdc6c6',roughness:.25,metalness:.08,emissive:i===2?'#856846':'#000000',emissiveIntensity:i===2?.19:0,clearcoat:1,clearcoatRoughness:.09,envMapIntensity:.65});return windows[i];}
export function makeBuilding(parent,b,wallMat){
 wallMat=pbr('plaster',{normal:.35,color:['#d7d0bc','#c2c9bb','#cfbba3'][Math.abs(Number(b.id)||0)%3]});
 const pts=b.points,levels=Math.min(18,+(b.tags['building:levels']||3)),height=levels*3+.45;
 const area=pts.reduce((n,p,i)=>{const q=pts[(i+1)%pts.length];return n+p[0]*q[1]-q[0]*p[1];},0);
 const near=pts.some(([x,z])=>x>-60&&x<20&&Math.abs(z)<95);
 const frame=mat('#d5d6cf',.78),sill=pbr('plaster',{color:'#a9aaa0',normal:.3}),base=mat('#758074',.97),roof=mat('#686b64',.94),rail=mat('#414945',.68,.2);
 plane(parent,pts,roof,height);
 for(let i=0;i<pts.length-1;i++){
  const[x,z]=pts[i],[xx,zz]=pts[i+1],dx=xx-x,dz=zz-z,len=Math.hypot(dx,dz);if(len<.2)continue;
  const g=new T.Group();g.position.set((x+xx)/2,0,(z+zz)/2);g.rotation.y=-Math.atan2(dz,dx)+(area>0?Math.PI:0);parent.add(g);
  const detailed=near&&len>5;const bays=Math.max(1,Math.round(len/3.2)),bw=len/bays,ww=Math.min(1.46,bw*.53);
  box(g,base,0,.36,0,len,.72,.19);box(g,sill,0,height-.02,0,len+.12,.21,.26);box(g,roof,0,height+.19,-.02,len,.27,.18);box(g,wallMat,0,levels*3+.225,-.08,len,.45,.22);
  if(!detailed){box(g,wallMat,0,height/2,-.02,len,height,.18);for(let floor=0;floor<levels;floor++)for(let bay=0;bay<bays;bay++){const cx=-len/2+(bay+.5)*bw;box(g,windowMaterial((bay+floor)%4),cx,1.70+floor*3,.085,ww,1.55,.025);}continue;}
  for(let floor=0;floor<levels;floor++){
   const y=floor*3;box(g,wallMat,0,y+.465,-.08,len,.93,.22);box(g,wallMat,0,y+2.80,-.08,len,.40,.22);
   for(let bay=0;bay<bays;bay++){
    const cx=-len/2+(bay+.5)*bw,side=(bw-ww)/2;
    for(const s of [-1,1])box(g,wallMat,cx+s*(ww/2+side/2),y+1.765,-.08,side,1.67,.22);
    box(g,mat('#343a37'),cx,y+1.75,-.095,ww,1.63,.11);
    const glass=box(g,windowMaterial((bay*7+floor*3+i)%4),cx,y+1.75,-.027,ww-.105,1.52,.013);glass.castShadow=false;
    for(const s of[-1,1]){box(g,frame,cx+s*(ww/2-.028),y+1.75,.032,.055,1.62,.085);box(g,frame,cx,y+1.75+s*.787,.032,ww,.053,.085);}
    box(g,frame,cx-.10,y+1.75,.038,.044,1.6,.086);box(g,frame,cx+(ww/4-.04),y+2.065,.041,ww/2+.1,.035,.079);
    box(g,sill,cx,y+.932,.10,ww+.16,.073,.32);
    if(len>35&&bay%5===2&&floor>0){
     const balcony=new T.Group();g.add(balcony);balcony.position.set(cx,y+.78,.03);box(balcony,sill,0,0,.43,1.95,.14,1.1);box(balcony,rail,0,1.0,.92,1.87,.042,.042);
     for(let n=0;n<8;n++)cyl(balcony,rail,-.87+n*.25,.54,.92,.012,.92);
     for(const s of[-1,1]){box(balcony,rail,s*.91,1,.45,.034,.033,.94);cyl(balcony,rail,s*.91,.54,.45,.012,.92);}
     if((bay+floor)%3===0){box(balcony,mat('#989c90'),0,.47,.917,1.82,.79,.025);box(balcony,mat('#d0c6aa'),.54,.22,.4,.37,.38,.34);}
    }
    if(bay%7===1&&floor%2===1){const acx=cx+bw*.37;box(g,mat('#bcbeb5'),acx,y+1.73,.245,.63,.48,.36);const fan=cyl(g,mat('#66716c'),acx-.095,y+1.73,.431,.158,.012);fan.rotation.x=Math.PI/2;const grate=cyl(g,mat('#c1c7be'),acx-.095,y+1.73,.441,.11,.014);grate.rotation.x=Math.PI/2;for(let q=0;q<5;q++)box(g,mat('#919b92'),acx+.22,y+1.6+q*.055,.434,.065,.018,.008);}
   }
  }
  for(const s of[-1,1]){cyl(g,mat('#848f85',.65,.2),s*(len/2-.15),height/2,.145,.055,height-.1);for(let f=0;f<levels;f++)box(g,rail,s*(len/2-.15),f*3+1.1,.14,.13,.027,.13);}
 }
 if(near){const cx=pts.reduce((s,p)=>s+p[0],0)/pts.length,cz=pts.reduce((s,p)=>s+p[1],0)/pts.length;for(const zz of[-8,8]){box(parent,mat('#aaa99b'),cx,height+.38,cz+zz,.85,.76,1.12);box(parent,roof,cx,height+.82,cz+zz,1.05,.1,1.31);}}
}
let leafMat;
function foliageMaterial(){if(leafMat)return leafMat;const tex=canvasTexture(512,512,c=>{
 const r=rng(179);c.clearRect(0,0,512,512);c.strokeStyle='#605841';c.lineWidth=4;c.beginPath();c.moveTo(250,480);c.bezierCurveTo(240,360,290,170,240,40);c.stroke();
 for(let n=0;n<135;n++){const y=40+r()*400,x=250+(r()-.5)*Math.sqrt(Math.sin(y/512*Math.PI))*440,a=(r()-.5)*2.7,sz=16+r()*19;c.save();c.translate(x,y);c.rotate(a);const light=100+r()*65;c.fillStyle=`rgb(${light*.65},${light},${light*.39})`;c.beginPath();c.moveTo(0,-sz);c.bezierCurveTo(sz*.75,-sz*.35,sz*.55,sz*.40,0,sz);c.bezierCurveTo(-sz*.55,sz*.4,-sz*.75,-sz*.35,0,-sz);c.fill();c.strokeStyle='#bbc87d80';c.lineWidth=.65;c.beginPath();c.moveTo(0,-sz*.8);c.lineTo(0,sz*.82);c.stroke();c.restore();}
 });leafMat=new T.MeshStandardMaterial({map:tex,alphaTest:.4,side:T.DoubleSide,roughness:.98,color:'#ffffff'});return leafMat;}
function segment(g,a,b,r1,r2,material){const v=new T.Vector3().subVectors(b,a),m=cyl(g,material,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,r1,v.length(),r2);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;}
export function createTrees(parent,buildings){
 const r=rng(862),spots=[[-35,45,7],[-8,8,7],[-34,-11,6.5],[-35,28,6.6],[-9,-31,7.3],[-6,44,7.1]],bark=pbr('bark',{normal:.68,color:'#b4b0a0',repeat:2});
 for(let i=0;i<155;i++){const x=-90+r()*190,z=-125+r()*250;if(buildings.some(b=>pointInPolygon(x,z,b.points))||Math.abs(x+22.3)<5)continue;if(x>-40&&x<-3&&(ASSETS.some(a=>Math.hypot(a.x-x,a.z-z)<5)||r()>.38))continue;spots.push([x,z,5.4+r()*4]);}
 const count=spots.length*58,leaves=new T.InstancedMesh(new T.PlaneGeometry(1,1,1,1),foliageMaterial(),count),o=new T.Object3D();let n=0;
 spots.forEach(([x,z,h])=>{
  const base=new T.Vector3(x,0,z),top=new T.Vector3(x+.22,h*.67,z+.07);segment(parent,base,top,.18,.065,bark);
  for(let b=0;b<7;b++){const a=b*2.4+r(),start=new T.Vector3(x,h*(.33+b*.046),z),end=new T.Vector3(x+Math.sin(a)*(1.4+r()),h*(.64+r()*.24),z+Math.cos(a)*(1.4+r()));segment(parent,start,end,.055,.012,bark);}
  for(let j=0;j<58;j++){const a=r()*Math.PI*2,dy=r()*2-1,rr=Math.sqrt(Math.max(.1,1-dy*dy))*(1.5+r()*1.35);o.position.set(x+Math.sin(a)*rr,h*.73+dy*h*.30,z+Math.cos(a)*rr);o.rotation.set((r()-.5)*2.4,r()*6.28,(r()-.5)*1.3);const sc=1.8+r()*.9;o.scale.set(sc,sc,1);o.updateMatrix();leaves.setMatrixAt(n,o.matrix);leaves.setColorAt(n,new T.Color().setHSL(.20+r()*.055,.16+r()*.18,.66+r()*.16));n++;}
 });leaves.castShadow=leaves.receiveShadow=true;leaves.userData.noAO=true;leaves.userData.wind=addWind(leaves.material);leaves.customDepthMaterial=leaves.userData.wind.depth;parent.add(leaves);return leaves;
}
export function paverMaterial(){const tex=canvasTexture(512,512,c=>{const r=rng(77);c.fillStyle='#706f64';c.fillRect(0,0,512,512);for(let y=0;y<512;y+=64)for(let x=-64;x<512;x+=128){const xx=x+(y%128?64:0),v=138+r()*21;c.fillStyle=`rgb(${v+7},${v+6},${v})`;c.fillRect(xx+2,y+2,123,59);c.fillStyle='#b2b1a580';c.fillRect(xx+3,y+3,122,2);for(let k=0;k<180;k++){c.fillStyle=k%2?'#45493c18':'#ffffec28';c.fillRect(xx+r()*124,y+r()*61,1,1);}}});tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(2.5,2.5);return new T.MeshStandardMaterial({map:tex,bumpMap:tex,bumpScale:.015,roughness:.96});}
export function addGroundDetails(parent,buildings,ways){
 const r=rng(341),blade=new T.BufferGeometry(),pos=[],col=[];for(let j=0;j<5;j++){const a=j*2.4,x=Math.cos(a)*.065,z=Math.sin(a)*.065,h=.09+j*.033,w=.017;pos.push(x-w,0,z,x+w,0,z,x+.045,h,z+.02);for(let k=0;k<3;k++)col.push(k===2?.12:.035,k===2?.22:.075,k===2?.046:.016);}blade.setAttribute('position',new T.Float32BufferAttribute(pos,3));blade.setAttribute('color',new T.Float32BufferAttribute(col,3));blade.computeVertexNormals();
 const grass=new T.InstancedMesh(blade,new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:1}),1900),o=new T.Object3D();let n=0;
 const closeToRoad=(x,z)=>ways.some(w=>w.tags.highway&&w.points.some((p,i)=>{if(i===0)return false;const a=w.points[i-1],dx=p[0]-a[0],dz=p[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<(['footway','path','steps'].includes(w.tags.highway)?1.05:2.85);}));
 for(let k=0;k<20000&&n<1900;k++){const x=-43+r()*43,z=-62+r()*125;if(buildings.some(b=>pointInPolygon(x,z,b.points))||closeToRoad(x,z)||ASSETS.some(a=>Math.hypot(a.x-x,a.z-z)<3))continue;o.position.set(x,.013,z);o.rotation.y=r()*6.28;o.scale.setScalar(.65+r()*1.0);o.updateMatrix();grass.setMatrixAt(n++,o.matrix);}grass.count=n;grass.receiveShadow=true;grass.userData.noAO=true;parent.add(grass);
 for(const z of[-22,14,46]){cyl(parent,mat('#424947',.72,.4),-22.3,.032,z,.38,.025);const ring=new T.Mesh(new T.TorusGeometry(.31,.012,5,32),mat('#656e68',.75,.4));ring.rotation.x=Math.PI/2;ring.position.set(-22.3,.051,z);parent.add(ring);for(let i=-2;i<=2;i++)box(parent,mat('#202826'),-22.3+i*.075,.048,z,.018,.008,.47);}
 const wet=new T.MeshPhysicalMaterial({color:'#6d7976',roughness:.14,metalness:.2,transparent:true,opacity:.37,depthWrite:false,clearcoat:1});
 for(const[x,z,w,h]of[[-23.5,19,1.4,.6],[-20.7,-4,1.2,.37]]){const p=new T.Mesh(new T.CircleGeometry(1,24),wet);p.rotation.x=-Math.PI/2;p.position.set(x,.055,z);p.scale.set(w,h,1);parent.add(p);}
}
