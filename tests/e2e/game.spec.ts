import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { GameModel } from '../../src/game/model';
import { GAME, STAGES } from '../../src/config/game';

type Hook = {
  model: GameModel;
  heroId: string;
  cardReady: boolean;
  start: (sameSeed?: boolean) => void;
  pause: () => void;
  resume: () => void;
  step: (seconds: number) => void;
  render: () => void;
};
type AppWindow = Window & { __game: Hook; __pointerId?: number };
const faults = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  faults.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
});

test.afterEach(async ({ page }) => {
  expect(faults.get(page), 'No browser exceptions, console errors, or failed HTTP resources').toEqual([]);
});

async function openGame(page: Page, seed = 'smoke-route') {
  await page.goto(`/?seed=${seed}&v=1`);
  await expect(page.locator('#start')).toBeEnabled();
}

async function startGame(page: Page) {
  await page.locator('#start').click();
  await expect(page.locator('#game')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as AppWindow).__game.model.state)).toBe('playing');
}

async function snapshot(page: Page) {
  return page.evaluate(() => {
    const game = (window as unknown as AppWindow).__game;
    const m = game.model;
    return { state: m.state, cash: m.cash, elapsed: m.elapsed, lane: m.lane,
      assets: [...m.ownedAssets], stage: m.stage, capital: m.netWorth, seed: m.seed, heroId: game.heroId };
  });
}

async function finishRoute(page: Page) {
  // Follow each seeded safe lane using the real movement and collision model.
  // Advances the full 90 seconds; no result value is substituted.
  await page.evaluate(() => {
    const game = (window as unknown as AppWindow).__game;
    let iterations = 0;
    while (game.model.state === 'playing' && iterations++ < 6_000) {
      const row = game.model.route.find(candidate => candidate.hitAt > game.model.elapsed + 1e-7);
      if (row) game.model.moveTo(row.safeLane);
      game.step(.05); // Hook retains 1/60s model substeps; batches HUD work.
    }
    if (game.model.state !== 'results') throw new Error(`Full route stopped at ${game.model.elapsed}s: ${game.model.state}`);
  });
  await expect(page.locator('#results')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as AppWindow).__game.cardReady)).toBe(true);
}

test('all four real heroes select, save their names safely, and start with zero', async ({ page }) => {
  await openGame(page);
  await expect(page.locator('.group-photo')).toBeVisible();
  for (const [index, id] of ['left', 'back', 'center', 'right'].entries()) {
    await page.locator(`[data-hero="${id}"]`).click();
    await expect(page.locator(`[data-hero="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#hero-name')).toHaveValue(`Партнёр ${index + 1}`);
    expect(await page.locator(`[data-hero="${id}"] img`).evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(100);
    await startGame(page);
    const state = await snapshot(page);
    expect(state.heroId).toBe(id);
    expect(state.cash).toBe(0);
    expect(state.assets).toEqual([]);
    expect(state.stage).toBe(0);
    await page.locator('#pause').click();
    await page.locator('#exit').click();
  }
  await page.locator('#hero-name').fill('<b>Друг</b>');
  await page.locator('#hero-name').blur();
  await page.reload();
  await expect(page.locator('#hero-name')).toHaveValue('<b>Друг</b>');
  await startGame(page);
  await finishRoute(page);
  await expect(page.locator('#final-name')).toHaveText('<b>Друг</b>');
  await expect(page.locator('#final-name b')).toHaveCount(0);
});

test('swipe is one move, touch tap selects a lane, cancel and UI buttons do not steer', async ({ page, browserName }) => {
  await openGame(page);
  await startGame(page);
  const world = page.locator('#world');
  const box = (await world.boundingBox())!;
  const y = box.y + box.height * .55;
  await page.evaluate(() => (window as unknown as AppWindow).__game.model.moveTo(0));
  if (browserName === 'chromium') {
    // Chromium exposes native emulated touch drags through its public CDP API.
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width * .15, y, id: 7 }] });
    for (let step = 1; step <= 8; step++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width * (.15 + .73 * step / 8), y, id: 7 }] });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
  } else {
    // WebKit has no Playwright touch-drag API. Exercise the same pointer
    // gesture handler with trusted mouse pointers; touch taps follow below.
    await page.mouse.move(box.x + box.width * .15, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .88, y, { steps: 8 });
    await page.mouse.up();
  }
  expect((await snapshot(page)).lane).toBe(1); // Duplicate tap would incorrectly set 2.
  await page.touchscreen.tap(box.x + box.width * .77, y);
  expect((await snapshot(page)).lane).toBe(2);
  await page.touchscreen.tap(box.x + box.width * .24, y);
  expect((await snapshot(page)).lane).toBe(0);

  await world.evaluate(element => element.addEventListener('pointerdown', event => {
    (window as unknown as AppWindow).__pointerId = (event as PointerEvent).pointerId;
  }, { once: true }));
  await page.mouse.move(box.x + box.width * .2, y);
  await page.mouse.down();
  const pointerId = await page.evaluate(() => (window as unknown as AppWindow).__pointerId);
  await world.dispatchEvent('pointercancel', { pointerId, pointerType: 'mouse', isPrimary: true });
  await page.mouse.move(box.x + box.width * .8, y);
  await page.mouse.up();
  expect((await snapshot(page)).lane).toBe(0);

  await page.locator('#pause').click();
  expect((await snapshot(page)).lane).toBe(0);
  await page.locator('#resume').click();
  expect((await snapshot(page)).lane).toBe(0);
  await page.locator('#game .sound-toggle').click();
  expect((await snapshot(page)).lane).toBe(0);
  // Safari/macOS deliberately does not focus buttons on a mouse click.
  await page.locator('#game .sound-toggle').focus();
  await page.keyboard.press('ArrowRight'); // A focused button owns its keys.
  expect((await snapshot(page)).lane).toBe(0);
  await world.focus();
  await page.keyboard.press('ArrowRight');
  expect((await snapshot(page)).lane).toBe(1);
  await page.keyboard.press('a');
  expect((await snapshot(page)).lane).toBe(0);
});

test('pause freezes both income and timer; restart keeps one real animation clock', async ({ page }) => {
  await page.clock.install();
  await openGame(page);
  await page.clock.pauseAt(new Date(Date.now() + 1_000));
  await startGame(page);
  await page.evaluate(() => { const m = (window as unknown as AppWindow).__game.model; m.cash = 500; m.ownedAssets = ['coffee']; });
  await page.clock.runFor(1_000);
  const before = await snapshot(page);
  expect(before.elapsed).toBeGreaterThan(.85);
  expect(before.elapsed).toBeLessThan(1.15);
  expect(before.cash).toBeGreaterThan(2_200);
  await page.locator('#pause').click();
  const paused = await snapshot(page);
  await page.clock.runFor(2_000);
  await page.evaluate(() => (window as unknown as AppWindow).__game.step(10));
  expect(await snapshot(page)).toEqual(paused);
  await page.locator('#resume').click();
  await page.clock.runFor(1_000);
  expect((await snapshot(page)).elapsed - before.elapsed).toBeCloseTo(1, 1);
  for (let i = 0; i < 3; i++) {
    await page.locator('#pause').click();
    await page.locator('#restart-paused').click();
    const reset = await snapshot(page);
    expect(reset.cash).toBe(0);
    expect(reset.assets).toEqual([]);
    expect(reset.stage).toBe(0);
    await page.clock.runFor(1_000);
    const restarted = await snapshot(page);
    expect(restarted.elapsed).toBeGreaterThan(.85);
    expect(restarted.elapsed).toBeLessThan(1.15);
  }
  // Simulate the browser's visibility event; restoring visibility must not
  // restart the run until the player explicitly presses Continue.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('#pause-dialog')).toBeVisible();
  const hidden = await snapshot(page);
  expect(hidden.state).toBe('paused');
  await page.clock.runFor(5_000);
  expect(await snapshot(page)).toEqual(hidden);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect((await snapshot(page)).state).toBe('paused');
  await page.locator('#resume').click();
  expect((await snapshot(page)).state).toBe('playing');
});

test('a full seeded run saves the actual result; retry and new route reset progression', async ({ page }) => {
  await openGame(page, 'ninety-second-challenge');
  await startGame(page);
  await finishRoute(page);
  const finished = await snapshot(page);
  expect(finished.elapsed).toBe(GAME.duration);
  expect(finished.stage).toBeGreaterThanOrEqual(2);
  expect(finished.capital).toBeGreaterThan(0);
  await page.evaluate(() => (window as unknown as AppWindow).__game.step(5));
  expect(await snapshot(page)).toEqual(finished);
  const record = await page.evaluate(() => JSON.parse(localStorage.getItem('patsany-v-aktive:v1')!).records[0]);
  expect(record.capital).toBe(Math.floor(finished.capital));
  expect(record.stage).toBe(finished.stage);
  expect(record.seed).toBe(finished.seed);
  await page.locator('#retry').click();
  const retry = await snapshot(page);
  expect(retry.seed).toBe(finished.seed);
  expect(retry.cash).toBe(0);
  expect(retry.assets).toEqual([]);
  await finishRoute(page);
  await page.locator('#new-seed').click();
  const fresh = await snapshot(page);
  expect(fresh.seed).not.toBe(finished.seed);
  expect(fresh.cash).toBe(0);
  await page.reload();
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#menu .records-open').click();
  await expect(page.locator('#records-list li')).toHaveCount(2);
  await expect(page.locator('#records-dialog')).toContainText('Только ваши забеги в этом браузере.');
});

test('PNG downloads with a real signature and sharing has a selectable clipboard fallback', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'clipboard', { configurable: true, get: () => undefined });
    Object.defineProperty(Navigator.prototype, 'share', { configurable: true, value: undefined });
  });
  await openGame(page, 'share-exact-seed');
  await startGame(page);
  await finishRoute(page);
  await page.locator('#share').click();
  await expect(page.locator('#share-dialog')).toBeVisible();
  await expect(page.locator('#share-preview')).toBeVisible();
  await expect.poll(() => page.locator('#share-preview').evaluate(img => (img as HTMLImageElement).naturalWidth)).toBe(1080);
  expect(await page.locator('#share-preview').evaluate(img => (img as HTMLImageElement).naturalHeight)).toBe(1350);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#download-card').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('patsany-v-aktive.png');
  const output = testInfo.outputPath('result-card.png');
  await download.saveAs(output);
  const png = await readFile(output);
  expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(png.byteLength).toBeGreaterThan(20_000);
  const text = await page.locator('#share-text').inputValue();
  expect(text).toContain('за 90 секунд в “Пацаны в активе”');
  expect(text).toContain('seed=share-exact-seed');
  expect(text).toContain('http://127.0.0.1:4173/');
  await expect(page.locator('#local-warning')).toBeVisible();
  await page.locator('#copy-share').click();
  await expect(page.locator('#share-feedback')).toContainText('Скопируй его вручную');
  expect(await page.locator('#share-text').evaluate(field => {
    const input = field as HTMLTextAreaElement;
    return [input.selectionStart, input.selectionEnd, input.value.length];
  })).toEqual([0, text.length, text.length]);
  await page.screenshot({ path: testInfo.outputPath('share-fallback.png'), fullPage: true });
});

test('blocked localStorage leaves the complete game usable in memory', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => { throw new DOMException('Storage blocked', 'SecurityError'); } });
  });
  await openGame(page);
  await expect(page.locator('#toast')).toContainText('Сохранения недоступны');
  await page.locator('[data-hero="back"]').click();
  await page.locator('#hero-name').fill('Без хранилища');
  await page.locator('#hero-name').blur();
  await startGame(page);
  await finishRoute(page);
  await expect(page.locator('#final-name')).toHaveText('Без хранилища');
  await page.locator('#results .records-open').click();
  await expect(page.locator('#records-list li')).toHaveCount(1);
});

test('resizing preserves the active run and recalculates touch lanes', async ({ page }) => {
  await openGame(page);
  await startGame(page);
  await page.evaluate(() => (window as unknown as AppWindow).__game.step(8));
  const before = await snapshot(page);
  await page.setViewportSize({ width: 430, height: 932 });
  const after = await snapshot(page);
  expect(after.seed).toBe(before.seed);
  expect(after.elapsed).toBeGreaterThanOrEqual(before.elapsed);
  expect(after.elapsed - before.elapsed).toBeLessThan(1);
  expect(after.state).toBe('playing');
  const box = (await page.locator('#world').boundingBox())!;
  await page.touchscreen.tap(box.x + box.width * .76, box.y + box.height * .55);
  expect((await snapshot(page)).lane).toBe(2);
});

for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 1366, height: 768 }]) {
  test(`layout and stage screenshots ${viewport.width}×${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await openGame(page, `layout-${viewport.width}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('#start')).toBeInViewport();
    const buttonHeights = await page.locator('#menu button').evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().height));
    expect(buttonHeights.every(height => height >= 44)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('menu.png'), fullPage: true });
    await startGame(page);
    for (const stage of [0, 2, 4]) {
      await page.evaluate(({ stage, cash }) => {
        const game = (window as unknown as AppWindow).__game;
        game.model.cash = cash;
        game.step(.02);
        game.model.pause();
        game.render();
        if (game.model.stage !== stage) throw new Error(`Stage ${stage} did not render`);
      }, { stage, cash: STAGES[stage]!.threshold });
      await expect(page.locator('#pause')).toBeInViewport();
      await expect(page.locator('#asset-list')).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`stage-${stage}.png`), fullPage: true });
      await page.evaluate(() => (window as unknown as AppWindow).__game.model.resume());
    }
    await finishRoute(page);
    await expect(page.locator('#final-capital')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('results.png'), fullPage: true });
  });
}
