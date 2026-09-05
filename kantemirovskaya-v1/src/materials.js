import { T, canvasTexture } from './graphics.js';
export const textures = new Map();
export async function loadMaterials() {
 const loader=new T.TextureLoader();
 await Promise.all(['asphalt','grass','plaster','bark'].flatMap(name=>['color','normal','arm'].map(async kind=>{
  const t=await loader.loadAsync(new URL(`../assets/pbr/${name}-${kind}.webp`,import.meta.url).href);
  t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;if(kind==='color')t.colorSpace=T.SRGBColorSpace;textures.set(name+'-'+kind,t);
 })));
}
const cache=new Map();
let meadow;
function meadowTexture() {
 if(meadow)return meadow;
 meadow=canvasTexture(512,512,(c,w,h)=>{
  let seed=391;const r=()=>((seed=seed*16807%2147483647)/2147483647);
  c.fillStyle='#6b7549';c.fillRect(0,0,w,h);
  for(let i=0;i<240;i++){const x=r()*w,y=r()*h,size=8+r()*42,g=c.createRadialGradient(x,y,0,x,y,size);g.addColorStop(0,i%3?'#9b9c5638':'#37472d44');g.addColorStop(1,'#68744000');c.fillStyle=g;c.fillRect(x-size,y-size,size*2,size*2);}
  for(let i=0;i<55000;i++){const x=r()*w,y=r()*h,light=r();c.strokeStyle=light>.6?'#9b9d6085':light>.25?'#57664080':'#333f2c60';c.lineWidth=.45+r()*.7;c.beginPath();c.moveTo(x,y);c.lineTo(x+r()*3-1.5,y-1-r()*4);c.stroke();}
 });meadow.wrapS=meadow.wrapT=T.RepeatWrapping;meadow.anisotropy=8;return meadow;
}
export function pbr(name,{color='#ffffff',repeat=1,roughness=1,normal=.6}={}) {
 const key=[name,color,repeat,roughness,normal].join(':');if(cache.has(key))return cache.get(key);
 const get=kind=>{const t=(name==='grass'&&kind==='color'?meadowTexture():textures.get(name+'-'+kind)).clone();t.repeat.set(repeat,repeat);t.needsUpdate=true;return t;};
 const arm=get('arm'),m=new T.MeshStandardMaterial({color,map:get('color'),normalMap:get('normal'),normalScale:new T.Vector2(normal,normal),roughnessMap:arm,aoMap:arm,aoMapIntensity:.5,roughness,metalness:0});cache.set(key,m);return m;
}
let weave;
export function fabric(color,kind='cotton') {
 if(!weave){weave=canvasTexture(256,256,(c,w,h)=>{const im=c.createImageData(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const v=160+Math.sin(x*1.57)*22+Math.sin(y*1.57)*18+(((x*127+y*79)%17)-8);const i=(y*w+x)*4;im.data.set([v,v,v,255],i);}c.putImageData(im,0,0);});weave.colorSpace=T.NoColorSpace;weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.repeat.set(9,9);}
 const key='fabric'+color+kind;if(cache.has(key))return cache.get(key);
 const m=new T.MeshPhysicalMaterial({color,roughness:kind==='leather'?.42:.91,bumpMap:weave,bumpScale:kind==='leather'?.00025:.0008,sheen:kind==='wool'?.55:.18,sheenColor:new T.Color(color),sheenRoughness:.9});cache.set(key,m);return m;
}
