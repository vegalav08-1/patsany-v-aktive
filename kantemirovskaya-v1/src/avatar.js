import { addOutfit } from './outfits.js';
import { T, mat, box, sphere, cyl, mesh, canvasTexture } from './graphics.js';
import { HEROES } from './model.js';
import { faceTextures, faceGeo } from './faces.js';
export { loadFaces } from './faces.js';
const palettes=[['#696d67','#484b49','#73766e','#b5b4a5'],['#253e44','#252e39','#eee9da','#dad7cb'],['#cbd6ce','#263d4b','#e7dfcd','#312b26'],['#293747','#293747','#ebe8df','#242221'],['#c0af90','#b6a383','#f3eee3','#41342a']];
export class Avatar {
 constructor(parent,hero=2,stage=0){
  this.root=new T.Group();parent.add(this.root);this.body=new T.Group();this.root.add(this.body);this.setLook(hero,stage);
  const shadowTex=canvasTexture(64,64,c=>{const gr=c.createRadialGradient(32,32,3,32,32,30);gr.addColorStop(0,'#00000077');gr.addColorStop(1,'#00000000');c.fillStyle=gr;c.fillRect(0,0,64,64);});
  this.shadow=new T.Mesh(new T.PlaneGeometry(1.2,1.2),new T.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false}));this.shadow.rotation.x=-Math.PI/2;this.shadow.position.y=.024;this.root.add(this.shadow);
 }
 setLook(hero,stage){
  this.hero=hero;this.stage=stage;this.body.clear();const h=HEROES[hero],p=palettes[stage],g=this.body,skin=mat(h.skin),cloth=mat(p[0]),pants=mat(p[1]),shoe=mat(p[3]);
  this.hips=new T.Group();g.add(this.hips);this.hips.position.y=.92;sphere(this.hips,pants,0,0,0,.177,.125,.105);this.legs=[];
  for(const s of [-1,1]){const leg=new T.Group();this.hips.add(leg);leg.position.x=s*.103;cyl(leg,pants,0,-.205,0,.068,.39,.093);sphere(leg,pants,0,-.398,.002,.065,.067,.063);const knee=new T.Group();leg.add(knee);knee.position.y=-.39;cyl(knee,pants,0,-.19,-.01,.05,.37,.065);sphere(knee,shoe,0,-.415,.052,.086,.07,.15);box(knee,stage<3?'#d4d1c2':'#252525',0,-.46,.05,.16,.025,.26);this.legs.push({leg,knee});}
  this.chest=new T.Group();g.add(this.chest);this.chest.position.y=1.19;const torso=cyl(this.chest,cloth,0,.012,0,.17,.45,.215);torso.scale.z*=.57;sphere(this.chest,cloth,0,.205,0,.216,.075,.121);cyl(g,skin,0,1.493,0,.058,.14);
  this.head=new T.Group();this.head.position.set(0,1.706,.012);g.add(this.head);sphere(this.head,skin,0,-.005,-.006,.157,.21,.151);const hair=mesh(this.head,new T.SphereGeometry(1,24,12,0,Math.PI*2,0,1.17),mat(h.hair),0,.006,-.012,.165,.213,.156);hair.rotation.z=hero===3?-.03:.025;for(const s of [-1,1])sphere(this.head,skin,s*.153,-.012,-.002,.023,.05,.024);
  const photo=new T.Mesh(faceGeo,new T.MeshStandardMaterial({map:faceTextures.get(h.id),transparent:true,alphaTest:.12,roughness:.94,side:T.FrontSide}));this.head.add(photo);photo.position.z=.014;
  this.arms=[];for(const s of [-1,1]){const arm=new T.Group();this.chest.add(arm);arm.position.set(s*.224,.19,0);arm.rotation.z=s*.07;sphere(arm,cloth,0,-.035,0,.077,.086,.077);cyl(arm,cloth,0,-.14,0,.052,.22,.07);const elbow=new T.Group();arm.add(elbow);elbow.position.y=-.26;elbow.rotation.x=-.11;cyl(elbow,cloth,0,-.116,0,.041,.215,.053);cyl(elbow,stage===0?'#595e58':p[2],0,-.224,0,.044,.044);sphere(elbow,skin,0,-.283,.004,.042,.067,.032);this.arms.push({arm,elbow});if(s===-1&&stage>=1){cyl(elbow,mat('#c5b37e',.28,.8),0,-.234,.015,.046,.025);sphere(elbow,'#28322f',0,-.229,.05,.024,.021,.007);}}
  addOutfit(g,this.chest,this.arms,stage,p,cloth);
 }
 update(t,moving,yaw){const walk=Math.sin(t*10)*moving,bounce=Math.abs(Math.sin(t*10))*moving;this.body.position.y=bounce*.025;this.head.rotation.z=Math.sin(t*2)*.012;this.legs.forEach(({leg,knee},i)=>{leg.rotation.x=walk*(i?-.55:.55);knee.rotation.x=Math.max(0,walk*(i?1:-1))*.7;});this.arms.forEach(({arm,elbow},i)=>{arm.rotation.x=walk*(i?.4:-.4);elbow.rotation.x=-.12-moving*.16;});if(Number.isFinite(yaw)){let d=yaw-this.root.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));this.root.rotation.y+=d*.2;}}
}
