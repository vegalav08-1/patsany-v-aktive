import asyncio,json,traceback,os
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('reports');OUT.mkdir(exist_ok=True)
report={'checks':[],'errors':[],'viewports':[],'physical_device_tested':False}
def check(name,condition):
 report['checks'].append({'name':name,'passed':bool(condition)})
 if not condition:raise AssertionError(name)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
  for width,height in [(1366,768),(390,844),(360,640),(844,390)]:
   context=await browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,has_touch=width<700)
   page=await context.new_page();page.set_default_timeout(25000)
   errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
   page.on('console',lambda m:report['errors'].append(m.text) if m.type=='error' else None)
   try:
    await page.goto('http://127.0.0.1:4173/?test=1',wait_until='networkidle')
    await page.wait_for_function('!!window.__test');await page.wait_for_timeout(900)
    check(f'{width} menu visible',await page.locator('#start').is_visible())
    await page.screenshot(path=str(OUT/f'{width}-menu.png'))
    stats=await page.evaluate('window.__test.stats()');check(f'{width} actual triangles',stats['triangles']>1000)
    report['viewports'].append({'width':width,'height':height,'render':stats})
    if width==1366:
     for hero in range(4):
      await page.locator('.hero-option').nth(hero).click();await page.wait_for_timeout(150)
      await page.screenshot(path=str(OUT/f'hero-{hero}.png'))
    await page.locator('#start').click();await page.wait_for_timeout(750)
    check(f'{width} started',await page.evaluate('window.__test.state().mode')=='playing')
    old=await page.evaluate('window.__test.state().player')
    if width<700:
     r=await page.locator('#joystick').bounding_box();x=r['x']+r['width']/2;y=r['y']+r['height']/2
     client=await context.new_cdp_session(page)
     await client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y-29}]})
     await page.wait_for_timeout(1100)
     await client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:
     await page.keyboard.down('w');await page.wait_for_timeout(1100);await page.keyboard.up('w')
    new=await page.evaluate('window.__test.state().player');check(f'{width} movement',abs(new['z']-old['z'])>.2)
    await page.evaluate('window.__test.warp(-28,35)');await page.locator('#interact').click()
    check(f'{width} job started',await page.evaluate('!!window.__test.state().job'))
    await page.evaluate('window.__test.warp(-13,17)');await page.locator('#interact').click()
    check(f'{width} delivery paid',await page.evaluate('window.__test.state().deliveries')==1)
    await page.evaluate('window.__test.funds(16000);window.__test.warp(-14.4,28)');await page.locator('#interact').click()
    check(f'{width} asset bought',await page.evaluate('window.__test.state().owned.includes("coffee")'))
    await page.screenshot(path=str(OUT/f'{width}-game.png'))
    await page.locator('#pause').click();before=await page.evaluate('window.__test.state()');await page.wait_for_timeout(400);after=await page.evaluate('window.__test.state()')
    check(f'{width} pause freezes income',before['cash']==after['cash'] and before['elapsed']==after['elapsed'])
    await page.locator('#modal-close').click();await page.evaluate('window.__test.advance(10)')
    check(f'{width} passive income',await page.evaluate('window.__test.state().cash')>=7000)
    if width in [1366,390]:
     await page.evaluate('window.__test.warp(-22,24)')
     await page.locator('#camera').click()
     for stage,amount in enumerate([0,30000,150000,600000,2500000]):
      await page.evaluate('(v)=>window.__test.funds(v)',amount);await page.wait_for_timeout(800)
      await page.screenshot(path=str(OUT/f'{width}-stage-{stage}.png'))
    await page.evaluate('window.__test.advance(300)');await page.wait_for_timeout(900)
    check(f'{width} results',await page.locator('#results').is_visible())
    await page.screenshot(path=str(OUT/f'{width}-results.png'))
    if width==390:
     await page.locator('#share').click();await page.locator('.share-img').wait_for();check('PNG card visible',await page.locator('.share-img').is_visible());await page.screenshot(path=str(OUT/'share.png'));await page.locator('#modal-close').click()
    await page.locator('#restart').click();check(f'{width} restart clears wealth',await page.evaluate('window.__test.state().cash')==0)
    check(f'{width} no JS exceptions',not errs)
   except Exception as e:
    report['errors'].append(f'{width}: {e}');await page.screenshot(path=str(OUT/f'{width}-failure.png'));report['traceback']=traceback.format_exc()
   finally:await context.close()
  ctx=await browser.new_context(viewport={'width':390,'height':844});page=await ctx.new_page()
  try:
   await page.goto('http://127.0.0.1:4173/test-prefix/',wait_until='networkidle');await page.locator('#start').wait_for(timeout=20000)
   check('subdirectory route loads',await page.locator('#start').is_visible());check('test API absent normally',not await page.evaluate('!!window.__test'))
  except Exception as e:report['errors'].append(str(e))
  await browser.close()
 try:
  async with async_playwright() as p:
   browser=await p.webkit.launch(headless=True);page=await browser.new_page(viewport={'width':390,'height':844})
   await page.goto('http://127.0.0.1:4173/',wait_until='networkidle');await page.locator('#start').wait_for(timeout=30000);await page.locator('#start').click();await page.wait_for_timeout(700);await page.screenshot(path=str(OUT/'webkit-game.png'));report['webkit']='WebGL loaded and started';await browser.close()
 except Exception as e:report['webkit']='UNVERIFIED: '+str(e)
 report['passed']=not report['errors'] and all(x['passed'] for x in report['checks'])
 (OUT/'browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))
 if not report['passed']:raise SystemExit(1)
asyncio.run(main())
