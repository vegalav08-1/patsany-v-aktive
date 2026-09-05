import asyncio,json,traceback
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('reports/visual');OUT.mkdir(parents=True,exist_ok=True)
async def main():
 report={'errors':[],'captures':[],'physical_device_tested':False}
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
  for width,height in [(1280,720),(390,844)]:
   page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1,has_touch=width<700)
   page.set_default_timeout(60000)
   page.on('pageerror',lambda e:report['errors'].append(str(e)))
   page.on('console',lambda m:report['errors'].append(m.text) if m.type=='error' else None)
   try:
    await page.goto('http://127.0.0.1:4173/?test=1',wait_until='networkidle')
    await page.wait_for_function('!!window.__test');await page.wait_for_timeout(1700)
    await page.screenshot(path=str(OUT/f'{width}-menu.png'))
    report['captures'].append({'viewport':[width,height],'stats':await page.evaluate('window.__test.stats()')})
    if width==1280:
     for hero in range(4):
      await page.locator('.hero-option').nth(hero).click();await page.wait_for_timeout(350)
      await page.screenshot(path=str(OUT/f'hero-{hero}.png'))
     await page.locator('.hero-option').nth(2).click()
    await page.locator('#start').click();await page.wait_for_timeout(1500)
    await page.screenshot(path=str(OUT/f'{width}-game.png'))
    await page.evaluate('window.__test.funds(2500000);window.__test.warp(-22,24);window.__test.camera(Math.PI+.40,.17,3.8)')
    await page.wait_for_timeout(1800);await page.screenshot(path=str(OUT/f'{width}-suit.png'))
    if width==1280:
     await page.evaluate('window.__test.quality("high")');await page.wait_for_timeout(2500)
     await page.screenshot(path=str(OUT/'high-suit.png'))
     await page.evaluate('window.__test.warp(-22,-6);window.__test.camera(.58,.15,5)')
     await page.wait_for_timeout(1800);await page.screenshot(path=str(OUT/'high-courtyard.png'))
    await page.evaluate('window.__test.quality("low")');await page.wait_for_timeout(500)
    await page.screenshot(path=str(OUT/f'{width}-low.png'))
   except Exception as e:
    report['errors'].append(str(e));report['traceback']=traceback.format_exc()
    await page.screenshot(path=str(OUT/f'{width}-failure.png'))
   await page.close()
  await browser.close()
 (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps(report,ensure_ascii=False,indent=2))
 if report['errors']:raise SystemExit(1)
asyncio.run(main())
