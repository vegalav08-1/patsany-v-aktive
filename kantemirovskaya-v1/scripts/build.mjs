import { mkdir,rm,cp,readdir,stat,writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dist=path.join(root,'dist');
for(const f of await readdir(path.join(root,'src')))if(f.endsWith('.js')){const r=spawnSync(process.execPath,['--check',path.join(root,'src',f)],{stdio:'inherit'});if(r.status)process.exit(r.status);}
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
for(const f of ['index.html','style.css','src','vendor'])await cp(path.join(root,f),path.join(dist,f),{recursive:true});
await cp(path.join(root,'public/assets'),path.join(dist,'assets'),{recursive:true});
await rm(path.join(dist,'src/map-data.json'),{force:true});await writeFile(path.join(dist,'.nojekyll'),'');
let bytes=0,files=0;async function walk(p){for(const f of await readdir(p)){const q=path.join(p,f),s=await stat(q);if(s.isDirectory())await walk(q);else{bytes+=s.size;files++;}}}await walk(dist);console.log(`Built ${files} files, ${(bytes/1024/1024).toFixed(2)} MiB`);
