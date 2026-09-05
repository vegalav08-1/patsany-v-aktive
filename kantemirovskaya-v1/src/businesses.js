import {T, mat, box, cyl, sign, mesh, canvasTexture, batchStatic} from './graphics.js';
import {assetSpot} from './model.js';

const timber = mat('#825736',.85), trim = mat('#324b44',.52,.28), cream = mat('#e5dac4',.85);
const glass = new T.MeshPhysicalMaterial({color:'#99bdb5',metalness:.12,roughness:.16,transparent:true,opacity:.17,depthWrite:false,clearcoat:1});
const warm = new T.MeshStandardMaterial({color:'#ffe0a0',emissive:'#ffb75c',emissiveIntensity:.65,roughness:.4});
let menuMaterial;
function menuBoard() {
  if(menuMaterial)return menuMaterial;
  const texture=canvasTexture(256,384,(c,w,h)=>{
    c.fillStyle='#243b34';c.fillRect(0,0,w,h);c.fillStyle='#f2dfad';c.textAlign='center';
    c.font='bold 24px Arial';c.fillText('КОФЕ & ДЕЛО',w/2,52);c.fillRect(30,72,w-60,2);
    c.font='17px Arial';for(const[text,y]of[['ЭСПРЕССО',124],['КАПУЧИНО',168],['СВЕЖИЙ КРУАССАН',212],['НАЧНИ С МАЛОГО',312]])c.fillText(text,w/2,y);
    c.strokeStyle='#dbc795';c.strokeRect(10,10,w-20,h-20);
  });menuMaterial=new T.MeshStandardMaterial({map:texture,roughness:.9});return menuMaterial;
}
function cup(g,x,y,z){cyl(g,cream,x,y,z,.055,.12,.062);cyl(g,'#38291d',x,y+.063,z,.048,.003);const handle=mesh(g,new T.TorusGeometry(.028,.007,5,12),cream,x+.069,y,z);handle.rotation.y=Math.PI/2;}
function pot(g,x,y,z){cyl(g,mat('#af7050'),x,y+.15,z,.13,.30,.18);for(let i=0;i<7;i++){const a=i*2.4;const leaf=mesh(g,new T.ConeGeometry(.085,.45,5),mat(i%2?'#4a7149':'#648552'),x+Math.sin(a)*.11,y+.42,z+Math.cos(a)*.11);leaf.rotation.z=Math.sin(a)*.4;}}
function pendant(g,x){cyl(g,trim,x,2.5,.76,.013,.55);cyl(g,trim,x,2.23,.76,.19,.18,.075);cyl(g,warm,x,2.13,.76,.16,.014);}
function parcel(g,x,y,z,size=.35){box(g,'#be9462',x,y,z,size,size*.8,size*.82);box(g,'#e8c99e',x,y+size*.402,z,size*.13,.004,size*.83);box(g,'#e9e4ce',x,y,z+size*.414,size*.42,size*.22,.005);}

/** The five shops have distinct silhouettes, readable local signs and real interiors. */
export function createBusiness(parent,a) {
  const g=new T.Group();parent.add(g);g.position.set(a.x,0,a.z);g.rotation.y=a.x<-22?Math.PI/2:-Math.PI/2;
  box(g,'#837b68',0,.11,0,3.48,.22,3.16);box(g,'#bbb19a',0,.21,.25,3.39,.07,3.1);
  box(g,cream,0,1.56,-1.28,3.25,2.70,.14);for(const s of[-1,1])box(g,cream,s*1.58,1.56,0,.13,2.70,2.7);
  box(g,'#a9a18a',0,.25,0,3.11,.04,2.7);box(g,trim,0,2.89,0,3.56,.13,3.1);
  // Timber reveals, a recessed door, and a canopy with a visible underside.
  for(const x of[-1.51,.45,1.51])box(g,trim,x,1.48,1.35,.085,2.49,.13);
  box(g,trim,0,.48,1.34,3.2,.47,.16);box(g,timber,-.54,.47,1.431,1.82,.35,.028);
  for(let i=0;i<13;i++)box(g,'#a57b53',-1.4+i*.14,.47,1.45,.026,.32,.01);
  box(g,glass,-.52,1.54,1.39,1.83,1.68,.013);box(g,glass,1,1.46,1.389,.86,2.10,.018);
  box(g,trim,1,2.54,1.4,1.03,.065,.11);box(g,trim,1,.41,1.4,1.03,.06,.11);
  box(g,mat('#ccbc8c',.24,.75),.67,1.27,1.48,.035,.29,.05);
  box(g,a.color,0,2.66,1.42,3.42,.50,.17);sign(g,a.label,0,2.68,1.515,3.12,.37,0,a.color);
  box(g,trim,0,2.935,1.70,3.61,.12,.94);box(g,warm,0,2.862,1.7,2.95,.017,.075);
  for(const s of[-1,1]){box(g,trim,s*1.36,2.5,1.80,.024,.55,.024);pot(g,s*1.3,.3,1.88);}
  // Roof ventilation and wall cladding give a different profile from the old cubes.
  box(g,'#909a8b',-.7,3.13,-.55,.76,.38,.7);for(let i=0;i<7;i++)box(g,trim,-.7,3.29,-.82+i*.08,.66,.018,.02);
  for(let i=0;i<15;i++)box(g,timber,-1.663,.45+i*.16,-.02,.018,.025,2.4);
  pendant(g,-.85);pendant(g,.20);
  if(a.id==='coffee') {
    box(g,timber,-.5,.81,.30,1.83,1.03,.64);box(g,'#d8c9af',-.5,1.35,.30,1.95,.08,.75);
    for(let i=0;i<10;i++)box(g,'#ad8056',-1.30+i*.16,.85,.637,.019,.80,.015);
    box(g,mat('#bbc6bd',.25,.65),-.99,1.58,.23,.50,.41,.32);box(g,trim,-.99,1.57,.41,.44,.22,.022);
    for(const x of[-1.12,-.89]){cyl(g,'#b5c4bb',x,1.42,.49,.022,.08);cup(g,x,1.415,.48);}
    cup(g,-.18,1.445,.47);cup(g,.08,1.445,.43);
    box(g,menuBoard(),-.60,1.98,-1.19,.62,.91,.02);
    box(g,timber,.70,1.44,-1.07,.94,.05,.30);for(let i=0;i<5;i++)cup(g,.35+i*.17,1.525,-1.04);
  } else if(a.id==='shop') {
    for(let level=0;level<3;level++){box(g,timber,-.74,.64+level*.48,.18,1.18,.055,.53);for(let i=0;i<3;i++)parcel(g,-1.1+i*.34,.83+level*.48,.18,.27);}
    box(g,timber,.42,.83,.0,.47,1.1,.75);box(g,trim,.42,1.44,.0,.56,.1,.80);
    sign(g,'СВОЙ МАГАЗИН',-.6,2.19,-1.17,1.7,.26,0,'#657653');
  } else if(a.id==='cargo') {
    for(let l=0;l<3;l++){box(g,trim,-.45,.55+l*.58,-.31,2.1,.055,.68);for(const x of[-1.38,.48])box(g,trim,x,1.34,-.31,.065,2.2,.65);for(let i=0;i<4;i++)parcel(g,-1.16+i*.46,.78+l*.58,-.33,.39);}
    for(let i=0;i<3;i++)box(g,timber,-.6,.35+i*.10,1.96,1.12,.065,.70);
    parcel(g,-.83,.68,1.95,.42);parcel(g,-.37,.65,1.95,.37);
  } else if(a.id==='ai') {
    for(const x of[-1.09,-.40]){box(g,trim,x,1.29,-.57,.55,1.93,.56);for(let row=0;row<7;row++){box(g,'#1e2c31',x,.48+row*.25,-.28,.47,.18,.028);for(let k=0;k<4;k++)box(g,mat(k%2?'#72bdb5':'#bbd798',.4),x-.17+k*.11,.49+row*.25,-.25,.025,.025,.009);}}
    box(g,timber,-.28,.94,.35,1.84,.08,.68);box(g,trim,-.14,1.25,.18,.64,.40,.045);box(g,mat('#6cadb4',.3),-.14,1.25,.208,.59,.35,.008);
    sign(g,'ИДЕИ РАБОТАЮТ',0,2.25,-1.17,1.9,.24,0,'#3f6472');
  } else {
    box(g,timber,-.41,.88,.25,1.91,.96,.69);box(g,'#ece0c4',-.41,1.39,.25,2,.065,.79);
    for(let i=0;i<5;i++)box(g,mat('#bfbdac',.5),-.96+i*.21,1.54+i*.045,.15,.12,.25+i*.09,.20);
    box(g,trim,-.50,1.84,-1.15,1.41,.97,.03);sign(g,'ВАШ НОВЫЙ ОФИС',-.5,1.87,-1.12,1.3,.20,0,'#344b46');pot(g,.98,.25,-.75);
  }
  const upgrades=new T.Group();upgrades.visible=false;
  sign(upgrades,'ВАШ БИЗНЕС',0,2.35,1.515,1.40,.18,0,'#376f51');
  if(a.id==='coffee') {
    cyl(upgrades,timber,-.9,.72,2.62,.40,.065);cyl(upgrades,trim,-.9,.36,2.62,.05,.70);cup(upgrades,-.9,.82,2.62);
    for(const x of[-1.48,-.3]){box(upgrades,timber,x,.45,2.62,.36,.055,.38);box(upgrades,timber,x,.66,2.82,.36,.37,.04);for(const dx of[-.13,.13])box(upgrades,trim,x+dx,.22,2.62,.025,.43,.31);}
    const board=box(upgrades,menuBoard(),.25,.61,1.95,.52,.72,.04);board.rotation.x=-.12;
  }else{box(upgrades,mat('#c3ab65',.32,.6),-1.38,1.94,1.5,.14,.22,.045);}
  batchStatic(g);g.add(upgrades);batchStatic(upgrades);
  return {group:g,upgrades,spot:assetSpot(a)};
}
