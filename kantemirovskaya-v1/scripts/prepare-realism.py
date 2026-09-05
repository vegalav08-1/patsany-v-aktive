"""Build redistributable CC0 materials and a clothed, riggable human mesh.
Requires Pillow and NumPy; the game/build itself has no Python dependency.
Only MakeHuman's CC0 data is used, not its AGPL application code.
"""
from pathlib import Path
import argparse, json, re, shutil
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--resources',type=Path,required=True);p.add_argument('--diffuse',type=Path,required=True)
args=p.parse_args();A=ROOT/'public/assets';(A/'pbr').mkdir(parents=True,exist_ok=True);(A/'models').mkdir(exist_ok=True)
for folder in [args.resources/'materials',args.diffuse]:
 for f in folder.glob('*.jpg'):
  im=Image.open(f).convert('RGB');im.save(A/'pbr'/(f.stem+'.webp'),quality=88,method=6)
shutil.copy2(args.resources/'reference/daylight.hdr',A/'pbr/daylight.hdr')
for name in ['left','back','center','right']:
 src=Image.open(A/('head-'+name+'.webp')).convert('RGBA');rgb=src.convert('RGB')
 arr=np.array(rgb).astype(float);low=np.array(rgb.filter(ImageFilter.GaussianBlur(24))).astype(float)
 lum=low.mean(axis=2,keepdims=True);balance=np.clip(lum/(low+1),.72,1.35);arr=arr*balance**.65
 arr*=np.array([1.04,.985,.96]);arr=np.clip(arr,0,255).astype('uint8')
 out=ImageEnhance.Color(Image.fromarray(arr,'RGB')).enhance(.84)
 canvas=Image.new('RGB',src.size,(182,143,123));canvas.paste(out,(0,0),src.getchannel('A'));canvas=canvas.resize((512,512),Image.Resampling.LANCZOS)
 canvas.save(A/('face-'+name+'.webp'),quality=93,method=6)
source=args.resources/'vendor/addons';target=ROOT/'vendor/addons';target.mkdir(parents=True,exist_ok=True)
seeds=['loaders/RGBELoader.js','postprocessing/EffectComposer.js','postprocessing/RenderPass.js','postprocessing/SSAOPass.js','postprocessing/OutputPass.js','postprocessing/ShaderPass.js','shaders/FXAAShader.js','geometries/RoundedBoxGeometry.js']
seen=set()
def module(rel):
 f=(source/rel).resolve()
 if f in seen:return
 if not f.is_file():raise FileNotFoundError(f)
 seen.add(f);dest=target/f.relative_to(source);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(f,dest)
 for path in re.findall(r"(?:from\s*|import\s*)['\"]([^'\"]+)['\"]",f.read_text()):
  if path.startswith('.'):module((f.parent/path).resolve().relative_to(source))
for s in seeds:module(s)
vs=[];uv=[];faces=[];group='';joint_indices={}
for line in (args.resources/'reference/base.obj').read_text().splitlines():
 s=line.split()
 if not s:continue
 if s[0]=='v':vs.append([float(x) for x in s[1:4]])
 elif s[0]=='vt':uv.append([float(x) for x in s[1:3]])
 elif s[0]=='g':group=s[1]
 elif s[0]=='f':
  f=[(int(v.split('/')[0])-1,int(v.split('/')[1])-1 if '/' in v and v.split('/')[1] else 0) for v in s[1:]]
  if group.startswith('joint-'):joint_indices.setdefault(group,set()).update(a for a,b in f)
  if group in ['body','helper-tights','helper-l-eye','helper-r-eye']:faces.append((group,f))
V=np.array(vs);UV=np.array(uv);J={k:V[list(v)].mean(0) for k,v in joint_indices.items()}
bones=[];segments=[]
def add(name,parent,source_a,source_b,target_a,target_b,width=1.):
 bones.append({'name':name,'parent':parent,'p':target_a});segments.append((np.array(source_a),np.array(source_b),np.array(target_a),np.array(target_b),width));return len(bones)-1
j=lambda n:J['joint-'+n]
add('hips',-1,j('pelvis'),j('spine-3'),[0,.95,0],[0,1.10,0],1.02)
add('spine',0,j('spine-3'),j('spine-1'),[0,1.10,0],[0,1.36,0],1.12)
add('chest',1,j('spine-1'),j('neck'),[0,1.36,0],[0,1.51,0],1.20)
add('neck',2,j('neck'),j('head'),[0,1.51,0],[0,1.63,0],1.02)
add('head',3,j('head'),j('head-2'),[0,1.63,0],[0,1.78,0],1.04)
for side,sign in [('l',1),('r',-1)]:
 u=add(side+'Arm',2,j(side+'-shoulder'),j(side+'-elbow'),[sign*.223,1.44,0],[sign*.263,1.167,.005],1.12)
 e=add(side+'ForeArm',u,j(side+'-elbow'),j(side+'-hand'),[sign*.263,1.167,.005],[sign*.281,.924,.028],1.06)
 add(side+'Hand',e,j(side+'-hand'),j(side+'-finger-3-4'),[sign*.281,.924,.028],[sign*.291,.797,.07],1.05)
for side,sign in [('l',1),('r',-1)]:
 u=add(side+'Thigh',0,j(side+'-upper-leg'),j(side+'-knee'),[sign*.099,.939,0],[sign*.103,.52,.012],.97)
 e=add(side+'Shin',u,j(side+'-knee'),j(side+'-ankle'),[sign*.103,.52,.012],[sign*.105,.108,0],1.0)
 add(side+'Foot',e,j(side+'-ankle'),j(side+'-foot-2'),[sign*.105,.108,0],[sign*.105,.06,.165],1.05)
def basis(a,b):
 d=b-a;length=np.linalg.norm(d);y=d/length;z=np.array([0.,0.,1.]);z-=y*(z@y)
 if np.linalg.norm(z)<.1:z=np.array([1.,0.,0.]);z-=y*(z@y)
 z/=np.linalg.norm(z);x=np.cross(y,z);return np.stack([x,y,z],axis=1),length
M=[]
for a,b,c,d,w in segments:
 sb,sl=basis(a,b);tb,tl=basis(c,d);mat=tb@np.diag([.106*w,tl/sl,.106*w])@sb.T;M.append((mat,c-mat@a))
def segdist(p,a,b):
 d=b-a;t=np.clip((p-a)@d/(d@d),0,1);return np.linalg.norm(p-a-d*t)
cache={}
def transform(idx,cloth=False):
 key=(idx,cloth)
 if key in cache:return cache[key]
 p=V[idx].copy();x,y,z=p;s=1 if x>=0 else -1
 if y>5.75:candidates=[3,4]
 elif abs(x)>2.0 and y>1.0:candidates=([5,6,7] if s>0 else [8,9,10])
 elif y<.6:candidates=([0,11,12,13] if s>0 else [0,14,15,16])
 else:candidates=[0,1,2,3]+([5] if s>0 else [8])
 distances=np.array([segdist(p,*segments[i][:2]) for i in candidates]);nearest=np.argsort(distances)[:3];ids=[candidates[i] for i in nearest];d=distances[nearest]
 w=1/(d+.18)**5;w/=w.sum()
 if y>6.25:ids=[4];w=np.array([1.])
 elif abs(x)>4.18:ids=[7 if s>0 else 10];w=np.array([1.])
 q=sum((M[i][0]@p+M[i][1])*a for i,a in zip(ids,w))
 if cloth:
  if .98<q[1]<1.46 and abs(q[0])<.23:
   q[0]*=1.065;q[2]*=1.075
   if q[2]>.09:q[2]=.09+(q[2]-.09)*.42
  q[2]+=np.sin(q[1]*122+q[0]*17)*.0025*np.exp(-((q[1]-1.035)/.105)**2)
  if q[1]<.90 and q[1]>.16:q[0]+=s*.003*np.sin(q[1]*110+q[2]*19)*np.exp(-((q[1]-.50)/.09)**2)
 ids=(ids+[0]*4)[:4];w=(list(w)+[0]*4)[:4];cache[key]=(q,ids,w);return q,ids,w
parts={name:{'position':[],'uv':[],'skinIndex':[],'skinWeight':[],'faceWeight':[],'index':[]} for name in ['head','skin','shirt','pants','shoes','hair']};dedup={k:{} for k in parts}
def emit(name,verts,cloth=False):
 part=parts[name];inds=[]
 for idx,uvid in verts:
  key=(idx,uvid)
  if key not in dedup[name]:
   q,si,sw=transform(idx,cloth);q=q.copy();old=V[idx]
   if name=='hair':q[0]*=1.008;q[2]*=1.008;q[1]+=.0015
   if name in ['head','hair']:
    tx=np.clip(.5+old[0]/2.1,0,1);ty=np.clip((old[1]-6.03)/(8.52-6.03),0,1);tex=[tx,ty];weight=float(np.clip((old[2]-.38)/.6,0,1))
   else:tex=UV[uvid].tolist();weight=0
   n=len(part['position'])//3;dedup[name][key]=n;part['position']+=q.round(5).tolist();part['uv']+=np.round(tex,5).tolist();part['skinIndex']+=si;part['skinWeight']+=np.round(sw,5).tolist();part['faceWeight'].append(round(weight,4))
  inds.append(dedup[name][key])
 for n in range(1,len(inds)-1):part['index'] += [inds[0],inds[n],inds[n+1]]
for g,f in faces:
 pts=V[[i for i,u in f]];mid=pts.mean(0);x,y,z=mid
 if g=='helper-tights':
  if y>5.88 or abs(x)>4.18:continue
  ty=np.mean([transform(i,True)[0][1] for i,u in f]);name='shirt' if ty>1.005 else 'pants' if ty>.135 else 'shoes';emit(name,f,True)
 else:
  if y>5.8:
   emit('head' if y>6.03 else 'skin',f);boundary=7.30+.57*np.clip((z+.15)/1.25,0,1)
   if y>boundary:emit('hair',f)
  elif abs(x)>4.12 and y>1.0:emit('skin',f)
model={'license':'CC0-1.0; derived from MakeHuman hm08 base, v1.3.0','bones':bones,'parts':parts}
(A/'models/human.json').write_text(json.dumps(model,separators=(',',':')))
licenses=ROOT/'licenses';licenses.mkdir(exist_ok=True)
shutil.copy2(args.resources/'reference/MAKEHUMAN-LICENSE.md',licenses/'MAKEHUMAN-DATA.md')
(licenses/'ASSETS.md').write_text('''# Third-party data

MakeHuman hm08 base data from v1.3.0: CC0-1.0. Only geometry and helper joints are used; no MakeHuman application code is included. Source: https://github.com/makehumancommunity/makehuman/tree/v1.3.0/makehuman/data/3dobjs .

Poly Haven asphalt_02, aerial_grass_rock, plastered_wall_04, bark_brown_02 and kloppenheim_06_puresky: CC0-1.0. Sources: https://polyhaven.com/license and individual asset pages. Original source URLs are recorded in material-sources.json.

Three.js r170 and selected add-ons: MIT, see vendor/THREE-LICENSE.txt.

OpenStreetMap contributors: ODbL-1.0, see https://www.openstreetmap.org/copyright .

Face photographs are user-provided, not CC0. The license above does not cover them.
''')
records=json.loads((args.resources/'sources.json').read_text())+json.loads((args.diffuse/'sources.json').read_text())
(licenses/'material-sources.json').write_text(json.dumps(records,indent=2))
print('Prepared mesh:',{k:len(v['index'])//3 for k,v in parts.items()},'add-ons',len(seen))
print('All runtime textures and geometry are local. No online asset loading.')
