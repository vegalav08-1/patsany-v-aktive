import { chromium, webkit } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base=process.env.GAME_QA_URL||'http://127.0.0.1:4180/';
const out=new URL('../reports/graphics-v1-2/',import.meta.url);
await mkdir(out,{recursive:true});
const report={date:new Date().toISOString(),url:base,physicalPhoneTested:false,checks:[],errors:[],screenshots:[]};
function check(name,value) {assert.ok(value,name);report.checks.push(name);}
async function shot(page,name) {await page.screenshot({path:new URL(name+'.png',out).pathname});report.screenshots.push(name+'.png');}
async function settle(page) {await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}

try {
 for(const [name,type] of (process.env.QUICK_QA?[['chromium',chromium]]:[['chromium',chromium],['webkit',webkit]])) {
  const browser=await type.launch();
  try {
   const sizes=process.env.QUICK_QA?[ [1280,800] ]:name==='chromium'?[[1280,800],[390,844],[360,640],[844,390]]:[[390,844]];
   for(const [width,height]of sizes) {
    const context=await browser.newContext({viewport:{width,height},hasTouch:width<700,deviceScaleFactor:1});
    const page=await context.newPage();page.setDefaultTimeout(90000);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
    await page.addInitScript(()=>Object.defineProperty(Navigator.prototype,'share',{value:undefined,configurable:true}));
    try {
     await page.goto(base+'?test=1');await page.waitForFunction(()=>!!window.__test);await settle(page);
     const prefix=`${name}-${width}`;
     check(prefix+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
     await shot(page,prefix+'-menu');
     await page.locator('#start').click();await page.waitForFunction(()=>window.__test.state().mode==='playing');
     if(width<700&&name==='chromium') {
      const b=await page.locator('#joystick').boundingBox(),cdp=await context.newCDPSession(page);
      const old=await page.evaluate(()=>window.__test.state().player.z);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+18}]});
      await page.waitForFunction(z=>Math.abs(window.__test.state().player.z-z)>.25,old);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      check(prefix+' touch joystick moves player',true);
      const stopped=await page.evaluate(()=>window.__test.state().player);
      await settle(page);check(prefix+' touch release stops player',await page.evaluate(p=>Math.hypot(window.__test.state().player.x-p.x,window.__test.state().player.z-p.z)<.02,stopped));
     }
     await page.evaluate(()=>window.__test.warp(-28,35));await page.locator('#interact').click();
     check(prefix+' order accepted',await page.evaluate(()=>!!window.__test.state().job));
     await page.evaluate(()=>window.__test.warp(-13,17));await page.locator('#interact').click();
     check(prefix+' delivery paid',await page.evaluate(()=>window.__test.state().deliveries===1));
     await page.evaluate(()=>{window.__test.funds(16000);window.__test.warp(-14.4,28)});await page.locator('#interact').click();
     check(prefix+' detailed coffee shop can be bought',await page.evaluate(()=>window.__test.state().owned.includes('coffee')));
     await shot(page,prefix+'-coffee');
     await page.locator('#pause').click();const before=await page.evaluate(()=>window.__test.state());
     await page.waitForTimeout(200);const paused=await page.evaluate(()=>window.__test.state());
     check(prefix+' pause freezes time and income',before.cash===paused.cash&&before.elapsed===paused.elapsed);
     await page.locator('#modal-close').click();await page.evaluate(()=>{window.__test.advance(10);window.__test.warp(-22,24);window.__test.funds(2500000);window.__test.camera(Math.PI+.4,.17,3.8)});
     await page.waitForTimeout(1000);await shot(page,prefix+'-suit');
     if(width===1280) {
      await page.evaluate(()=>{window.__test.warp(-22,-6);window.__test.camera(.58,.15,5)});await page.waitForTimeout(800);await shot(page,'after-courtyard');
      const normalStats=await page.evaluate(()=>window.__test.stats());report.scene=normalStats;console.log(prefix+' scene',JSON.stringify(normalStats));
      for(let hero=0;hero<4;hero++)for(let stage=0;stage<5;stage++) {
       await page.evaluate(([h,s])=>window.__test.look(h,s),[hero,stage]);await settle(page);
      }
      const warm=await page.evaluate(()=>window.__test.stats());
      for(let i=0;i<12;i++){await page.evaluate(i=>window.__test.look(i%4,i%5),i);await settle(page);}
      await page.evaluate(()=>window.__test.look(3,4));await settle(page);
      const repeated=await page.evaluate(()=>window.__test.stats());report.resourceReuse={warm,repeated};console.log('resource reuse',JSON.stringify(report.resourceReuse));
      check('changing all heroes/outfits does not accumulate GPU geometries',repeated.geometries<=warm.geometries+3);
      check('changing all heroes/outfits does not accumulate GPU textures',repeated.textures<=warm.textures+2);
      report.resourceReuse={warm,repeated};
      await page.evaluate(()=>{window.__test.look(2,4);window.__test.quality('high')});await settle(page);await shot(page,'high-courtyard');
      await page.evaluate(()=>window.__test.quality('low'));await settle(page);await shot(page,'low-courtyard');
      await page.evaluate(()=>window.__test.quality('medium'));
     }
     await page.evaluate(()=>window.__test.advance(300));await page.locator('#results').waitFor();
     check(prefix+' five-minute session finishes',await page.evaluate(()=>window.__test.state().elapsed===300));
     await shot(page,prefix+'-result');
     if(width===390) {
      await page.locator('#share').click();await page.locator('.share-img').waitFor();
      const png=await page.locator('.share-img').evaluate(async img=>Array.from(new Uint8Array(await(await fetch(img.src)).arrayBuffer()).slice(0,8)));
      check(prefix+' result is an actual PNG',png.join(',')==='137,80,78,71,13,10,26,10');
      await page.locator('#modal-close').click();
     }
     await page.locator('#restart').click();check(prefix+' restart resets capital',await page.evaluate(()=>window.__test.state().cash===0&&window.__test.state().owned.length===0));
     check(prefix+' clean browser console and resources',errors.length===0);
     console.log(prefix+': passed');
    }finally{report.errors.push(...errors);await context.close();}
   }
   const page=await browser.newPage();await page.goto(base+'test-prefix/');await page.locator('#start').waitFor({timeout:90000});
   check(name+' production subdirectory loads without test hook',await page.evaluate(()=>!window.__test));
   await page.close();
  }finally{await browser.close();}
 }
}catch(error){report.errors.push(error.stack);process.exitCode=1;}
report.passed=!report.errors.length;await writeFile(new URL('checks.json',out),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
