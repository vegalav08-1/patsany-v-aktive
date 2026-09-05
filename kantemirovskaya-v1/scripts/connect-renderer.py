"""One-time update of src/app.js. Other game files are not modified."""
from pathlib import Path

app = Path(__file__).resolve().parents[1] / 'src' / 'app.js'
text = app.read_text()
if "from './rendering.js'" in text:
    print('Renderer already connected')
    raise SystemExit(0)

text = "import { lighting, Picture } from './rendering.js';\nimport { loadMaterials } from './materials.js';\n" + text
text = text.replace('let toastTimer,bannerTimer', 'let picture;let toastTimer,bannerTimer')
text = text.replace('cameraPitch=.48', 'cameraPitch=.26')
text = text.replace('cameraDistance=8.3', 'cameraDistance=5.2')
text = text.replace('camera.fov=57', 'camera.fov=53')
text = text.replace('camera.fov=48', 'camera.fov=44')
text = text.replace('cameraPos.set(pos.x+2,small?2.14:2.2,pos.z+(small?3.8:4.5))', 'cameraPos.set(pos.x+1.35,small?1.90:1.82,pos.z+(small?3.6:3.4))')
text = text.replace('cameraPitch=Math.max(.23,Math.min(.95', 'cameraPitch=Math.max(.06,Math.min(.80')
text = text.replace('renderer.render(scene,camera);}', 'picture.render();}')

start = text.index('function applyQuality()')
end = text.index('\n', start)
quality = '''function applyQuality(){
 const ratio={low:.85,medium:mobile()?1.15:1.35,high:1.6}[quality];
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,ratio));
 renderer.setSize(innerWidth,innerHeight,false);
 renderer.shadowMap.enabled=quality!=='low';
 const size=quality==='high'?2048:1536;
 if(sunlight.shadow.mapSize.x!==size){
  sunlight.shadow.mapSize.set(size,size);
  if(sunlight.shadow.map){sunlight.shadow.map.dispose();sunlight.shadow.map=null;}
 }
 picture?.resize(quality);
}'''
text = text[:start] + quality + text[end:]

start = text.index(' scene=new T.Scene();')
end = text.index(' world=createWorld(scene);', start)
setup = ''' scene=new T.Scene();
 camera=new T.PerspectiveCamera(53,innerWidth/innerHeight,.07,440);
 sunlight=await lighting(renderer,scene);
 picture=new Picture(renderer,scene,camera);
 await loadMaterials();
'''
text = text[:start] + setup + text[end:]
text = text.replace('Тестовая версия 1.0.', 'Версия 1.1: обновлённая графика.')
text = text.replace('pause,resume,begin,buy:id', 'camera:(yaw,pitch=.26,dist=5.2)=>{cameraYaw=yaw;cameraPitch=pitch;cameraDistance=dist;},quality:v=>{quality=v;applyQuality();},pause,resume,begin,buy:id')
app.write_text(text)
print('Connected HDR, materials, detailed models and quality controls.')
