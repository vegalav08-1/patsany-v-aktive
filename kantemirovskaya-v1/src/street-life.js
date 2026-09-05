import { T, mat, mesh, box, cyl, canvasTexture, sign } from './graphics.js';

const random = (seed = 47) => () => ((seed = seed * 16807 % 2147483647) / 2147483647);
const wood = mat('#785638', .88), iron = mat('#30413e', .62, .35);

function planter(parent, x, z, width = 1.5) {
  const g = new T.Group(); g.position.set(x, 0, z); parent.add(g);
  box(g, '#83796a', 0, .23, 0, width, .46, .64);
  box(g, '#c3b299', 0, .475, 0, width + .07, .055, .71);
  box(g, '#3c3729', 0, .49, 0, width - .10, .012, .52);
  for (let i = 0; i < 5; i++) box(g, '#aa9c84', 0, .08 + i * .073, .326, width - .06, .018, .013);
  const r = random(Math.round((x + 100) * 37 + z));
  const leaf = mat('#466c3d', .97), flower = [mat('#d89967'), mat('#e7d294'), mat('#b66170')];
  for (let i = 0; i < 18; i++) {
    const px = (r() - .5) * (width - .12), pz = (r() - .5) * .44, h = .18 + r() * .22;
    cyl(g, leaf, px, .49 + h / 2, pz, .009, h);
    const foliage = mesh(g, new T.OctahedronGeometry(.085, 0), leaf, px, .55 + h * .4, pz, 1, .55, 1);
    foliage.rotation.y = r() * 6.28;
    mesh(g, new T.IcosahedronGeometry(.045, 0), flower[i % 3], px, .49 + h, pz, 1, .55, 1);
  }
}

function bicycle(parent, x, z, angle) {
  const g = new T.Group(); parent.add(g); g.position.set(x, .03, z); g.rotation.y = angle;
  const paint = mat('#9d6445', .48, .4), steel = mat('#a8b3ad', .32, .7);
  function tube(a, b, radius, material) {
    const va = new T.Vector3(...a), vb = new T.Vector3(...b), delta = vb.clone().sub(va);
    const m = cyl(g, material, ...va.clone().add(vb).multiplyScalar(.5).toArray(), radius, delta.length());
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
  }
  for (const x of [-.57, .57]) {
    const tire = mesh(g, new T.TorusGeometry(.32, .033, 6, 24), mat('#242e2b'), x, .34, 0);
    mesh(g, new T.TorusGeometry(.286, .009, 4, 24), steel, x, .34, 0);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; tube([x, .34, 0], [x + Math.sin(a) * .28, .34 + Math.cos(a) * .28, 0], .0025, steel); }
    tire.castShadow = false;
  }
  const points = [[-.57,.34,0],[-.17,.81,0],[.05,.34,0],[.42,.85,0],[.57,.34,0]];
  for (const [a,b] of [[0,1],[1,2],[2,0],[1,3],[3,2],[3,4]]) tube(points[a],points[b],.018,paint);
  tube([-.17,.72,0],[-.2,.96,0],.016,steel); box(g,iron,-.22,.965,0,.23,.045,.115);
  tube([.42,.84,0],[.40,1.04,0],.017,steel); tube([.40,1.04,-.22],[.40,1.04,.22],.015,steel);
  box(g,iron,.05,.34,.14,.13,.035,.09); box(g,iron,.05,.34,-.14,.13,.035,.09);
}

/** Small landmarks are kept outside the player's clear walking corridor. */
export function decorateStreet(parent) {
  for (const z of [-30, 10, 42]) {
    planter(parent, -32.5, z + 2.7, 1.65);
    const bin = new T.Group(); parent.add(bin); bin.position.set(-33.7,0,z+1.2);
    cyl(bin,iron,0,.42,0,.235,.75); cyl(bin,mat('#182c28'),0,.805,0,.24,.055);
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2;box(bin,wood,Math.cos(a)*.23,.4,Math.sin(a)*.23,.025,.65,.025);}
  }
  bicycle(parent,-31.4,31.8,-.18); bicycle(parent,-7.4,-8.5,1.15);
  // Knee-height garden fencing with continuous rails and rounded caps.
  for (const [x,z,len] of [[-30.4,-15,8],[-8.7,37,6],[-30.4,43,6]]) {
    for(let p=0;p<=len;p+=1.25){cyl(parent,iron,x,.37,z+p,.025,.74);mesh(parent,new T.SphereGeometry(.041,8,6),iron,x,.75,z+p);}
    box(parent,iron,x,.58,z+len/2,.028,.028,len); box(parent,iron,x,.19,z+len/2,.023,.023,len);
  }
  // Parking bay paint is flat, worn and separate from collision geometry.
  const paint = new T.MeshStandardMaterial({color:'#d0ccad',roughness:1,transparent:true,opacity:.52,depthWrite:false});
  for(const z of[-47,-15,4,39,57]) for(const end of[-2.6,2.6]) {const p=mesh(parent,new T.PlaneGeometry(2.3,.075),paint,-26.4,.049,z+end);p.rotation.x=-Math.PI/2;p.castShadow=false;}
  const poster = new T.Group(); parent.add(poster); poster.position.set(-28.88,0,34.95); poster.rotation.y=Math.PI/2;
  for(const x of[-.48,.48]) box(poster,wood,x,1.5,.077,.04,.72,.025);
  sign(poster,'НАЧНИ С ЗАКАЗА',0,1.49,.09,.8,.49,0,'#e8c780');
  sign(poster,'ДОСТАВКА ПО ДВОРУ',0,1.27,.098,.7,.1,0,'#3e5a47');
  for(const [x,z]of[[-9.2,24],[-31.8,-35],[-8.5,-24]])planter(parent,x,z,1.6);
}

/** Geometry animation lives on the GPU; no scene traversal is needed each frame. */
export function addWind(material, strength = .06, grass = false) {
  const time = {value:0};
  const patch = shader => {
    shader.uniforms.uBreeze = time;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uBreeze;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 anchor = vec3(0.0);
        #ifdef USE_INSTANCING
          anchor = instanceMatrix[3].xyz;
        #endif
        float sway = sin(uBreeze * 1.35 + anchor.x * .51 + anchor.z * .31);
        transformed.x += sway * ${strength.toFixed(3)} * ${grass ? 'max(0.0, position.y) * 4.0' : '(position.y + .5)'};
        transformed.z += cos(uBreeze * .9 + anchor.z) * ${(.3*strength).toFixed(3)};`);
  };
  material.onBeforeCompile = patch;
  material.customProgramCacheKey = () => `breeze-${strength}-${grass}`;
  const depth = new T.MeshDepthMaterial({map:material.map,alphaTest:material.alphaTest,side:material.side,depthPacking:T.RGBADepthPacking});
  depth.onBeforeCompile = patch; depth.customProgramCacheKey = material.customProgramCacheKey;
  return {time, depth};
}

/** Pooled effects: at most 48 motes, with one draw call, including celebration. */
export class StreetEffects {
  constructor(scene) {
    const image=canvasTexture(32,32,c=>{const g=c.createRadialGradient(16,16,1,16,16,16);g.addColorStop(0,'#ffffffff');g.addColorStop(.35,'#fff4c7dd');g.addColorStop(1,'#fff4c700');c.fillStyle=g;c.fillRect(0,0,32,32);});
    this.data = Array.from({length:48},()=>({age:9,life:1,x:0,y:0,z:0,vx:0,vy:0,vz:0}));
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(144),3));geometry.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(144),3));
    this.points=new T.Points(geometry,new T.PointsMaterial({map:image,size:.115,transparent:true,depthWrite:false,vertexColors:true,blending:T.AdditiveBlending}));
    this.points.frustumCulled=false; this.points.userData.noAO=true; scene.add(this.points); this.cursor=0;
  }
  burst(x,z,level=false) {
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const count=level?36:15;
    for(let i=0;i<count;i++) {const p=this.data[this.cursor++%48],a=i*2.39996;Object.assign(p,{age:0,life:level?1.25:.7,x,y:level?.35:.65,z,vx:Math.sin(a)*(level?1.3:.75),vy:1.3+(i%5)*.23,vz:Math.cos(a)*(level?1.3:.75)});}
  }
  update(dt) {
    const pos=this.points.geometry.attributes.position,col=this.points.geometry.attributes.color;
    this.data.forEach((p,i)=>{p.age+=dt;if(p.age<p.life){p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=dt*2.4;pos.setXYZ(i,p.x,p.y,p.z);const a=1-p.age/p.life;col.setXYZ(i,a,a*.68,a*.22);}else{pos.setXYZ(i,0,-50,0);col.setXYZ(i,0,0,0);}});
    pos.needsUpdate=col.needsUpdate=true;
  }
}
