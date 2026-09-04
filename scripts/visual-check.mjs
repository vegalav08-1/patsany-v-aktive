import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
await mkdir('reports', { recursive: true });
const facts = [];
for (const [width, height] of [[360,640],[390,844],[430,932],[1366,768]]) {
  const page = await browser.newPage({ viewport:{width,height}, deviceScaleFactor:1 });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto('http://127.0.0.1:4173/?seed=visual-check');
  await page.locator('#start:not([disabled])').waitFor();
  await page.screenshot({ path:`reports/menu-${width}.png`, fullPage:true });
  const menuFit = await page.evaluate(() => ({scroll:document.documentElement.scrollWidth,client:innerWidth,height:document.documentElement.scrollHeight,viewport:innerHeight}));
  await page.locator('#start').click();
  await page.evaluate(() => { window.__game.step(3); window.__game.model.pause(); window.__game.render(); });
  await page.screenshot({path:`reports/game-${width}.png`,fullPage:true});
  for (const [stage,cash] of [[1,100000],[2,1000000],[3,10000000],[4,100000000]]) {
    if(width!==390) continue;
    await page.evaluate(cash => { const g=window.__game; g.model.resume();g.model.cash=cash;g.model.update(.01);g.model.pause();g.render(); },cash);
    await page.screenshot({path:`reports/stage-${stage}.png`,fullPage:true});
  }
  await page.evaluate(() => { const g=window.__game;g.start();const m=g.model;for(let t=0;t<90.1;t+=1/60){const next=m.route.find(r=>r.hitAt>m.elapsed+.04);if(next)m.moveTo(next.safeLane);g.step(1/60);} });
  await page.waitForFunction(()=>window.__game.cardReady);
  await page.screenshot({path:`reports/result-${width}.png`,fullPage:true});
  facts.push({width,height,menuFit,errors,result:await page.evaluate(()=>({capital:window.__game.model.netWorth,stage:window.__game.model.stage,time:window.__game.model.elapsed}))});
  await page.close();
}
await browser.close();
await writeFile('reports/visual-check.json',JSON.stringify(facts,null,2));
console.log(JSON.stringify(facts,null,2));
