"""One-time import from the already downloaded, attributed resource artifact."""
import sys,math,json,shutil,xml.etree.ElementTree as ET
from pathlib import Path
root=Path(__file__).resolve().parents[1]
resources=Path(sys.argv[1])
for folder in ['vendor','public/assets','src']:(root/folder).mkdir(parents=True,exist_ok=True)
for name in ['three.module.min.js','THREE-LICENSE.txt']:shutil.copyfile(resources/'vendor'/name,root/'vendor'/name)
for hero in ['left','back','center','right']:shutil.copyfile(resources/'existing-assets'/f'head-{hero}.webp',root/'public/assets'/f'head-{hero}.webp')
(root/'public/assets/favicon.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#244c3e"/><text x="32" y="44" text-anchor="middle" font-family="Arial" font-size="36" fill="#efd18d">П</text></svg>')
t=ET.parse(resources/'geography/osm.xml').getroot()
lat,lon=55.633587,37.654592
sx=111320*math.cos(math.radians(lat));sz=111320
nodes={n.attrib['id']:{'x':(float(n.attrib['lon'])-lon)*sx,'z':-(float(n.attrib['lat'])-lat)*sz,'tags':{c.attrib['k']:c.attrib['v'] for c in n.findall('tag')}} for n in t.findall('node')}
allowed={'building','building:levels','addr:housenumber','addr:street','highway','landuse','leisure','natural','railway','name'}
ways=[]
for w in t.findall('way'):
 tags={c.attrib['k']:c.attrib['v'] for c in w.findall('tag') if c.attrib['k'] in allowed}
 pts=[[round(nodes[n.attrib['ref']]['x'],2),round(nodes[n.attrib['ref']]['z'],2)] for n in w.findall('nd') if n.attrib['ref'] in nodes]
 if len(pts)<2 or not any(k in tags for k in ('building','highway','landuse','leisure','natural','railway')):continue
 xs=[p[0] for p in pts];zs=[p[1] for p in pts]
 if max(xs)<-160 or min(xs)>160 or max(zs)<-160 or min(zs)>160:continue
 ways.append({'id':w.attrib['id'],'tags':tags,'points':pts})
ns=[{'id':i,'x':round(n['x'],2),'z':round(n['z'],2),'tags':{k:v for k,v in n['tags'].items() if k in ['entrance','ref']}} for i,n in nodes.items() if n['tags'].get('entrance') and abs(n['x'])<180 and abs(n['z'])<180]
data={'center':{'lat':lat,'lon':lon},'size':100,'attribution':'© OpenStreetMap contributors — ODbL 1.0','fetched':'2026-09-05','ways':ways,'nodes':ns}
(root/'src/map-data.js').write_text('export default '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
print('Frozen local resources:',len(ways),'ways,',len(ns),'entrances')
