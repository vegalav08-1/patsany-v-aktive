import { chromium, webkit } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { execFileSync } from 'node:child_process';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml'};
// Build an explicit repository-path variant, in addition to the portable root build.
execFileSync(process.execPath,['node_modules/vite/bin/vite.js','build','--base=/business-game/','--outDir=dist-prefixed'],{stdio:'inherit'});
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const prefixed=url.pathname.startsWith('/business-game/');
  const directory=resolve(prefixed?'dist-prefixed':'dist');
  const path=resolve(directory,`.${prefixed?url.pathname.slice('/business-game'.length):url.pathname}`);
  if(!path.startsWith(directory+'/')&&path!==directory){res.writeHead(403).end();return;}
  try{const file=(await stat(path)).isDirectory()?`${path}/index.html`:path;res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(await readFile(file));}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(4174,'127.0.0.1',resolve));
const records=[];
try{
 for(const [browserName,type] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await type.launch();
  try{
   for(const prefix of ['/','/business-game/']){
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
    await page.clock.install();
    await page.goto(`http://127.0.0.1:4174${prefix}?seed=production-proof&v=1`);
    await page.locator('#start:not([disabled])').waitFor();
    if(await page.evaluate(()=>!!window.__game))throw new Error('Test hook leaked to production');
    await page.locator('#start').click();
    await page.clock.runFor(3100);
    await page.locator('#pause').click();
    const frozen=await page.locator('#timer').textContent();
    await page.clock.runFor(5000);
    if(frozen!==await page.locator('#timer').textContent())throw new Error('Pause advanced production time');
    await page.locator('#resume').click();
    // Execute the real production RAF and collisions for the entire 90 seconds.
    for(let i=0;i<9;i++) await page.clock.runFor(10000);
    await page.locator('#results:not([hidden])').waitFor();
    await page.locator('#share').click();
    await page.locator('#share-preview:not([hidden])').waitFor();
    const text=await page.locator('#share-text').inputValue();
    if(!text.includes(`http://127.0.0.1:4174${prefix}?seed=production-proof&v=1`))throw new Error(`Broken challenge URL: ${text}`);
    const png=await page.locator('#share-preview').evaluate(async img=>{const b=await fetch(img.src).then(r=>r.arrayBuffer());return{bytes:b.byteLength,signature:Array.from(new Uint8Array(b).slice(0,8))}});
    if(png.signature.join(',')!=='137,80,78,71,13,10,26,10')throw new Error('Invalid production PNG');
    records.push({browser:browserName,prefix,fullActiveSeconds:90,testHookAbsent:true,challengePathCorrect:true,png,errors});
    if(errors.length)throw new Error(errors.join('\n'));
    await page.close();
   }
  }finally{await browser.close()}
 }
 await writeFile('reports/production-check.json',JSON.stringify(records,null,2));console.log(JSON.stringify(records,null,2));
}finally{await new Promise(resolve=>server.close(resolve))}
