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
export function pbr(name,{color='#ffffff',repeat=1,roughness=1,normal=.6}={}) {
 const key=[name,color,repeat,roughness,normal].join(':');if(cache.has(key))return cache.get(key);
 const get=kind=>{const t=textures.get(name+'-'+kind).clone();t.repeat.set(repeat,repeat);t.needsUpdate=true;return t;};
 const arm=get('arm'),m=new T.MeshStandardMaterial({color,map:get('color'),normalMap:get('normal'),normalScale:new T.Vector2(normal,normal),roughnessMap:arm,aoMap:arm,aoMapIntensity:.5,roughness,metalness:0});cache.set(key,m);return m;
}
let weave;
export function fabric(color,kind='cotton') {
 if(!weave){weave=canvasTexture(256,256,(c,w,h)=>{const im=c.createImageData(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const v=175+Math.sin(x*Math.PI)*7+Math.sin(y*1.4)*5+(((x*127+y*79)%17)-8);const i=(y*w+x)*4;im.data.set([v,v,v,255],i);}c.putImageData(im,0,0);});weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.repeat.set(7,7);}
 const key='fabric'+color+kind;if(cache.has(key))return cache.get(key);
 const m=new T.MeshPhysicalMaterial({color,roughness:kind==='leather'?.42:.91,bumpMap:weave,bumpScale:kind==='leather'?.00025:.0008,sheen:kind==='wool'?.55:.18,sheenColor:new T.Color(color),sheenRoughness:.9});cache.set(key,m);return m;
}
