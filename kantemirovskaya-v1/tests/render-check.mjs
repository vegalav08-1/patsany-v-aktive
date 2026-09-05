import {chromium,webkit} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.GAME_QA_URL||'http://127.0.0.1:4180/';
const out=new URL('../reports/graphics-v1-2/',import.meta.url);await mkdir(out,{recursive:true});
const report={date:new Date().toISOString(),checks:[],errors:[],physicalPhoneTested:false};
for(const[name,type]of[['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch();
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1,hasTouch:true});page.setDefaultTimeout(90000);
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});
  page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url())});
  await page.goto(base+'?test=1');await page.waitForFunction(()=>!!window.__test);
  const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  for(const[w,h]of(name==='chromium'?[[1280,800],[390,844],[360,640]]:[[390,844]])){
   await page.setViewportSize({width:w,height:h});await page.waitForTimeout(700);await settle();
   await page.screenshot({path:new URL(`final-${name}-${w}-menu.png`,out).pathname});
   assert.ok(await page.locator('#start').isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   report.checks.push(name+' menu '+w+'x'+h);
  }
  await page.locator('#start').click();await page.evaluate(()=>{window.__test.funds(2500000);window.__test.warp(-22,24);window.__test.camera(Math.PI+.4,.17,3.8)});
  if(name==='chromium')await page.setViewportSize({width:1280,height:800});
  await page.waitForTimeout(800);await settle();await page.screenshot({path:new URL(`final-${name}-suit.png`,out).pathname});
  await page.evaluate(()=>{window.__test.warp(-22,-6);window.__test.camera(.58,.15,5)});await page.waitForTimeout(800);await settle();
  report[name+'Scene']=await page.evaluate(()=>window.__test.stats());
  for(const quality of['high','low','medium']){
   await page.evaluate(q=>window.__test.quality(q),quality);await settle();await page.screenshot({path:new URL(`final-${name}-${quality}.png`,out).pathname});
   report.checks.push(name+' '+quality+' renders');
  }
  await page.locator('#pause').click();const paused=await page.evaluate(()=>window.__test.state());await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>window.__test.state().elapsed),paused.elapsed);await page.locator('#modal-close').click();
  await page.evaluate(()=>window.__test.advance(300));await page.locator('#results').waitFor();await page.locator('#restart').click();
  assert.equal(await page.evaluate(()=>window.__test.state().cash),0);report.checks.push(name+' finish/restart after quality changes');
  console.log(name+': final rendering passed');
 }catch(e){report.errors.push(e.stack);process.exitCode=1;}finally{await browser.close();}
}
report.passed=!report.errors.length;await writeFile(new URL('render-check.json',out),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
