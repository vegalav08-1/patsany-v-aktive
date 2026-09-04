import './style.css';
import { GameModel } from './game/model';
import { GameRenderer, drawBusinessIcon } from './game/renderer';
import { GameAudio } from './game/audio';
import { installInput } from './game/input';
import { ASSETS, STAGES, GAME } from './config/game';
import { HEROES } from './config/heroes';
import { Saves, cleanName } from './ui/storage';
import { money, shortMoney, freshSeed, isLocal } from './ui/format';
import { makeCard, paintComparison, shareText, type CardResult } from './ui/share';
import { icon } from './ui/icons';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const saves = new Saves(), model = new GameModel(), audio = new GameAudio();
let heroId = HEROES.some(h => h.id === saves.data.heroId) ? saves.data.heroId : HEROES[0].id;
let seed = new URL(location.href).searchParams.get('seed')?.slice(0, 80) || freshSeed();
let ready = false, result: CardResult | null = null, cardBlob: Blob | null = null, cardUrl = '';
let shownStage = -1, shownAssets = '', toastUntil = 0, lastHud = 0;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const hero = () => HEROES.find(h => h.id === heroId)!;
const heroName = () => saves.data.names[heroId] || hero().defaultName;
const base = import.meta.env.BASE_URL;

$('#app').innerHTML = `
<aside class="desktop-note" aria-hidden="true"><span class="mini-brand">П / А</span><p>Каждая империя<br>начиналась<br><em>с нуля.</em></p><span class="edition">ДРУЖЕСКИЙ ЧЕЛЛЕНДЖ • 01</span></aside>
<main class="shell">
  <section id="menu" class="screen menu">
    <header class="menu-top"><span class="eyebrow">ДЕЛО ЗА ТОБОЙ</span><div class="top-actions"><button class="icon-button records-open" aria-label="Рекорды на этом устройстве">${icon('cup')}</button><button class="icon-button sound-toggle" aria-label="Выключить звук">${icon('sound')}</button></div></header>
    <div class="title-row"><h1>ПАЦАНЫ<br><span>В АКТИВЕ</span></h1><span class="time-stamp">90<span>СЕКУНД</span></span></div>
    <p class="intro">В кармане — ноль. В голове — план.</p>
    <div class="photo-block"><img class="group-photo" src="${base}assets/friends.webp" alt="Четверо друзей — герои игры"/><span class="photo-caption">СВОИ ЛЮДИ. БОЛЬШИЕ ПЛАНЫ.</span><span class="photo-tape" aria-hidden="true"></span></div>
    <div class="choose-title"><h2>Кто сегодня в деле?</h2><span>01 — 04</span></div>
    <div id="hero-list" class="hero-list" role="group" aria-label="Выбор героя"></div>
    <label class="name-row"><span>Твоё имя</span><input id="hero-name" maxlength="20" autocomplete="off" spellcheck="false" aria-label="Имя выбранного героя"/><span class="edit-mark" aria-hidden="true">↗</span></label>
    <div class="rules"><span>${icon('cash', 19)}<span>Собирай<small>выручку</small></span></span><span>${icon('business', 19)}<span>Покупай<small>бизнесы</small></span></span><span>${icon('loss', 19)}<span>Обходи<small>убытки</small></span></span></div>
    <p class="sr-only">Собирай выручку. Покупай бизнесы. Обходи убытки.</p>
    <button id="start" class="primary" disabled><span>Готовим героев…</span>${icon('arrow', 25)}</button>
    <footer class="menu-footer"><span>С нуля до своей империи</span><span>ОДИН ПАЛЕЦ</span></footer>
  </section>
  <section id="game" class="screen game" hidden>
    <header class="hud"><div class="hud-top"><div><span class="eyebrow">ТВОЙ КАПИТАЛ</span><strong id="capital">0 ₽</strong></div><div class="time-box"><span id="timer">1:30</span><span>ДО ФИНИША</span></div><button id="pause" class="icon-button" aria-label="Пауза">${icon('pause')}</button></div><div class="cash-row"><span>Наличные <b id="cash">0 ₽</b></span><span>Доход <b id="income">0 ₽/с</b></span></div><div class="stage-row"><span id="stage-label">На старте</span><span id="next-stage">до нового образа</span></div><div class="stage-progress"><i id="stage-progress"></i></div></header>
    <div class="playfield"><canvas id="world" aria-label="Игровое поле: три дорожки. Тап по дорожке или свайп для движения." tabindex="0"></canvas><div id="stage-toast" class="stage-toast" aria-live="polite"></div><div id="gesture-hint" class="gesture-hint"><span>← СВАЙП ИЛИ ТАП →</span><small>Выбирай дорожку. Бизнес покупается при касании.</small></div></div>
    <footer class="portfolio"><div class="portfolio-label"><span>ТВОИ АКТИВЫ</span><button class="icon-button sound-toggle" aria-label="Выключить звук">${icon('sound', 18)}</button></div><div id="asset-list" class="asset-list"></div></footer>
  </section>
  <section id="results" class="screen results" hidden>
    <header class="result-top"><span class="eyebrow">90 СЕКУНД. ТВОЯ ИСТОРИЯ.</span><button class="icon-button records-open" aria-label="Рекорды на этом устройстве">${icon('cup')}</button></header>
    <h1 class="result-heading">ВОТ ЭТО<br><span>ОБОРОТ.</span></h1><p id="result-line" class="intro"></p>
    <canvas id="comparison" aria-label="Было / Стало: герой на старте и в максимальном открытом образе"></canvas>
    <div class="result-money"><span class="eyebrow">КАПИТАЛ НА ФИНИШЕ</span><strong id="final-capital"></strong><span id="final-name"></span></div>
    <div class="result-facts"><div><span>Максимальный статус</span><b id="final-status"></b></div><div><span>Личный рекорд</span><b id="personal-best"></b></div></div>
    <div id="final-assets" class="final-assets"></div>
    <button id="share" class="primary"><span>Поделиться результатом</span>${icon('share')}</button>
    <div class="result-buttons"><button id="retry" class="secondary">${icon('restart', 18)}Повторить трассу</button><button id="new-seed" class="secondary">Новая трасса ${icon('arrow', 18)}</button></div>
    <button id="other-hero" class="text-button">Другой герой</button>
  </section>
  <div id="toast" class="toast" role="status" hidden></div>
</main>
<aside class="desktop-side" aria-hidden="true"><span class="side-number">90</span><span>СЕКУНД,<br>ЧТОБЫ ПОДНЯТЬСЯ.</span><div class="key-caps">← &nbsp; →</div><small>СТРЕЛКИ ИЛИ A / D</small></aside>
<dialog id="pause-dialog"><div class="dialog-inner"><span class="eyebrow">ДЕЛА ПОДОЖДУТ</span><h2>На паузе.</h2><p>Время и доход остановлены.<br>Продолжим с того же места.</p><button id="resume" class="primary">Продолжить ${icon('arrow')}</button><button id="restart-paused" class="secondary">Начать заново</button><button id="exit" class="text-button">Выйти в меню</button></div></dialog>
<dialog id="records-dialog"><div class="dialog-inner"><button class="icon-button dialog-close" aria-label="Закрыть">${icon('close')}</button><span class="eyebrow">БЕЗ ЛИШНЕЙ СКРОМНОСТИ</span><h2>Рекорды на<br>этом устройстве</h2><p>Только ваши забеги в этом браузере.</p><ol id="records-list"></ol></div></dialog>
<dialog id="share-dialog"><div class="dialog-inner share-inner"><button class="icon-button dialog-close" aria-label="Закрыть">${icon('close')}</button><h2>Теперь твой ход.</h2><p>Отправь карточку друзьям и предложи ту же трассу.</p><img id="share-preview" alt="PNG-карточка результата с фотографической головой героя, образами было и стало и капиталом"/><a id="download-card" class="primary" download="patsany-v-aktive.png">Сохранить PNG ${icon('arrow')}</a><button id="copy-share" class="secondary">Скопировать текст и ссылку</button><textarea id="share-text" rows="4" readonly aria-label="Текст челленджа и ссылка"></textarea><p id="local-warning" class="local-warning" hidden>Это локальная версия. Ссылка localhost недоступна друзьям. После публикации здесь будет адрес игры.</p><p id="share-feedback" role="status"></p></div></dialog>
`;

const heads: Record<string, HTMLImageElement> = {};
const canvas = $<HTMLCanvasElement>('#world');
const renderer = new GameRenderer(canvas, heads);
audio.enabled = saves.data.sound;
function toast(text: string) { $('#toast').textContent = text; $('#toast').hidden = false; toastUntil = performance.now() + 3000; }
function show(screen: 'menu' | 'game' | 'results') {
  for (const id of ['menu', 'game', 'results']) $(`#${id}`).hidden = screen !== id;
  document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(d => d.close());
  if (screen === 'game') { renderer.resize(); canvas.focus({ preventScroll: true }); }
}
function updateSound() {
  for (const button of document.querySelectorAll<HTMLButtonElement>('.sound-toggle')) {
    button.innerHTML = icon(audio.enabled ? 'sound' : 'mute');
    button.setAttribute('aria-label', audio.enabled ? 'Выключить звук' : 'Включить звук');
    button.setAttribute('aria-pressed', String(audio.enabled));
  }
}
function selectHero(id: string) {
  heroId = id; saves.data.heroId = id; saves.persist();
  for (const button of document.querySelectorAll<HTMLButtonElement>('.hero-button')) button.setAttribute('aria-pressed', String(button.dataset.hero === id));
  $<HTMLInputElement>('#hero-name').value = heroName();
}
HEROES.forEach((h, i) => {
  const button = document.createElement('button'); button.className = 'hero-button'; button.dataset.hero = h.id;
  button.setAttribute('aria-label', `Выбрать ${h.defaultName}`); button.setAttribute('aria-pressed', String(h.id === heroId));
  button.innerHTML = `<span class="hero-portrait" style="--hero-accent:${h.accent}"><img src="${base}${h.headSrc}" alt="${h.description}"/></span><span class="hero-number">0${i + 1}</span>`;
  button.addEventListener('click', () => selectHero(h.id)); $('#hero-list').append(button);
});
$<HTMLInputElement>('#hero-name').value = heroName();
$('#hero-name').addEventListener('change', () => { saves.data.names[heroId] = cleanName($<HTMLInputElement>('#hero-name').value) || hero().defaultName; saves.persist(); $<HTMLInputElement>('#hero-name').value = heroName(); });
function drawPortfolio() {
  const list = $('#asset-list'); list.replaceChildren();
  ASSETS.forEach(asset => {
    const owned = model.ownedAssets.includes(asset.id);
    const item = document.createElement('div'); item.className = `asset-slot${owned ? ' owned' : ''}`; item.title = `${asset.name}: ${owned ? 'куплен' : money(asset.purchasePrice)}`; item.setAttribute('aria-label', item.title);
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; c.setAttribute('aria-hidden', 'true');
    drawBusinessIcon(c.getContext('2d')!, asset.id, 32, 32, 38, owned ? '#173b32' : '#82958b');
    item.append(c); const label = document.createElement('span'); label.textContent = owned ? 'В ДЕЛЕ' : shortMoney(asset.purchasePrice).replace(' ₽', ''); item.append(label); list.append(item);
  });
}
function updateHud(force = false) {
  if (!force && performance.now() - lastHud < 65) return; lastHud = performance.now();
  $('#capital').textContent = shortMoney(model.netWorth); $('#capital').title = money(model.netWorth);
  $('#cash').textContent = shortMoney(model.cash); $('#income').textContent = `${shortMoney(model.incomePerSecond)}/с`;
  const left = Math.max(0, Math.ceil(GAME.duration - model.elapsed));
  $('#timer').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; $('#timer').classList.toggle('urgent', left <= 10);
  const next = STAGES[model.stage + 1]; const current = STAGES[model.stage];
  $('#stage-label').textContent = current.name;
  $('#next-stage').textContent = next ? `${shortMoney(next.threshold)} →` : 'ИМПЕРИЯ РАСТЁТ';
  $('#stage-progress').style.width = `${next ? Math.max(0, Math.min(100, (model.peakNetWorth - current.threshold) / (next.threshold - current.threshold) * 100)) : 100}%`;
  $('#gesture-hint').hidden = model.elapsed > 6;
  const assetsKey = model.ownedAssets.join(','); if (force || assetsKey !== shownAssets) { shownAssets = assetsKey; drawPortfolio(); }
}
function start(sameSeed = true) {
  if (!ready) return; if (!sameSeed) seed = freshSeed();
  audio.unlock(); model.start(seed); shownStage = 0; shownAssets = ''; result = null;
  if (cardUrl) URL.revokeObjectURL(cardUrl); cardUrl = ''; cardBlob = null;
  $('#stage-toast').classList.remove('visible'); show('game'); updateHud(true); lastTime = performance.now();
}
function pause() {
  if (model.state !== 'playing') return;
  model.pause(); $<HTMLDialogElement>('#pause-dialog').showModal();
}
function resume() { if (document.hidden) return; model.resume(); $<HTMLDialogElement>('#pause-dialog').close(); lastTime = performance.now(); canvas.focus({ preventScroll: true }); }
function toMenu() { model.menu(); show('menu'); }
function finish() {
  result = { name: heroName(), capital: model.netWorth, stage: model.stage, seed, head: heads[heroId], accent: hero().accent, assets: model.ownedAssets.length };
  saves.record({ heroId, name: result.name, capital: Math.floor(result.capital), stage: result.stage, seed, date: new Date().toISOString() });
  $('#final-capital').textContent = money(result.capital); $('#final-name').textContent = result.name;
  $('#final-status').textContent = STAGES[result.stage].name; $('#personal-best').textContent = money(saves.best(heroId));
  $('#result-line').textContent = result.stage >= 3 ? 'Деньги пришли. Созвоны остались.' : result.stage >= 1 ? 'Пассивный доход, активные нервы.' : 'Большие дела начинаются с первой попытки.';
  $('#final-assets').textContent = model.ownedAssets.length ? ASSETS.filter(a => model.ownedAssets.includes(a.id)).map(a => a.name).join(' · ') : 'Портфель пока пуст. Следующий забег — твой.';
  paintComparison($<HTMLCanvasElement>('#comparison'), result); show('results');
  const finishedResult = result;
  void makeCard(result).then(blob => {
    if (result !== finishedResult) return; cardBlob = blob; cardUrl = URL.createObjectURL(blob);
    if ($<HTMLDialogElement>('#share-dialog').open) {
      $<HTMLImageElement>('#share-preview').src = cardUrl; $('#share-preview').hidden = false;
      $<HTMLAnchorElement>('#download-card').href = cardUrl; $('#download-card').hidden = false;
      $('#share-feedback').textContent = 'PNG готов. Можно сохранить карточку.';
    }
  }).catch(() => toast('PNG не создался. Текст и ссылка доступны через «Поделиться».'));
}
function processEvents() {
  for (const event of model.drainEvents()) {
    const feedback = event.type === 'cash' ? `+${shortMoney(event.value || 0)}` : event.type === 'loss' ? `−${shortMoney(event.value || 0)}` : event.type === 'asset' ? `${event.text} — в деле!` : event.type === 'stage' ? '' : event.text;
    renderer.effect(event.type, event.lane, feedback);
    if (['cash', 'asset', 'loss', 'stage'].includes(event.type)) audio.play(event.type);
    if (event.type === 'finish') finish();
  }
  if (model.stage !== shownStage && model.state === 'playing') {
    shownStage = model.stage; $('#stage-toast').textContent = `${STAGES[model.stage].name} · новый образ`;
    $('#stage-toast').classList.add('visible'); window.setTimeout(() => $('#stage-toast').classList.remove('visible'), 2300);
  }
}
$('#start').addEventListener('click', () => start()); $('#pause').addEventListener('click', pause); $('#resume').addEventListener('click', resume);
$('#restart-paused').addEventListener('click', () => start()); $('#exit').addEventListener('click', toMenu);
$('#retry').addEventListener('click', () => start()); $('#new-seed').addEventListener('click', () => start(false)); $('#other-hero').addEventListener('click', toMenu);
document.querySelectorAll('.sound-toggle').forEach(b => b.addEventListener('click', () => { audio.enabled = !audio.enabled; saves.data.sound = audio.enabled; saves.persist(); audio.unlock(); updateSound(); })); updateSound();
document.querySelectorAll('.dialog-close').forEach(b => b.addEventListener('click', () => b.closest('dialog')!.close()));
$<HTMLDialogElement>('#pause-dialog').addEventListener('cancel', e => { e.preventDefault(); resume(); });
document.querySelectorAll('.records-open').forEach(b => b.addEventListener('click', () => {
  const list = $('#records-list'); list.replaceChildren();
  if (!saves.data.records.length) { const li = document.createElement('li'); li.textContent = 'Первая строчка ждёт тебя.'; list.append(li); }
  for (const record of saves.data.records) { const li = document.createElement('li'); const name = document.createElement('span'); name.textContent = record.name; const value = document.createElement('b'); value.textContent = shortMoney(record.capital); li.append(name, value); list.append(li); }
  $<HTMLDialogElement>('#records-dialog').showModal();
}));
$('#share').addEventListener('click', async () => {
  if (!result) return;
  const text = shareText(result);
  if (cardBlob && navigator.share && !isLocal()) {
    const file = new File([cardBlob], 'patsany-v-aktive.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Пацаны в активе', text }); return; }
      catch { /* Show the complete fallback, including when system share was cancelled. */ }
    }
  }
  $<HTMLTextAreaElement>('#share-text').value = text;
  $<HTMLImageElement>('#share-preview').src = cardUrl;
  $('#share-preview').hidden = !cardUrl; $('#download-card').hidden = !cardUrl;
  $<HTMLAnchorElement>('#download-card').href = cardUrl;
  $('#local-warning').hidden = !isLocal(); $('#share-feedback').textContent = cardUrl ? '' : 'PNG ещё готовится. Текст и ссылку уже можно скопировать.';
  $<HTMLDialogElement>('#share-dialog').showModal();
});
$('#copy-share').addEventListener('click', async () => {
  const field = $<HTMLTextAreaElement>('#share-text');
  try { if (!navigator.clipboard) throw new Error('Unavailable'); await navigator.clipboard.writeText(field.value); $('#share-feedback').textContent = 'Скопировано. Твой ход — в чат.'; }
  catch { field.focus(); field.select(); $('#share-feedback').textContent = 'Выделили текст. Скопируй его вручную через меню браузера.'; }
});
installInput(canvas, { active: () => model.state === 'playing', lane: () => model.lane, move: lane => model.moveTo(lane), pause: () => model.state === 'playing' ? pause() : model.state === 'paused' ? resume() : undefined });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('blur', () => { if (model.state === 'playing') pause(); });
new ResizeObserver(() => renderer.resize()).observe(canvas);
let lastTime = performance.now();
function frame(now: number) {
  const dt = Math.min(.05, Math.max(0, (now - lastTime) / 1000)); lastTime = now;
  if (model.state === 'playing') { model.update(dt); processEvents(); updateHud(); }
  if (model.state === 'playing' || model.state === 'paused') renderer.render(model, heroId, reducedMotion.matches);
  if (toastUntil && now > toastUntil) { $('#toast').hidden = true; toastUntil = 0; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
Promise.all(HEROES.map(h => new Promise<void>((resolve, reject) => {
  const img = new Image(); img.onload = () => { heads[h.id] = img; resolve(); }; img.onerror = reject; img.src = `${base}${h.headSrc}`;
}))).then(() => { ready = true; $<HTMLButtonElement>('#start').disabled = false; $('#start span').textContent = 'Начать с нуля'; }).catch(() => { $('#start span').textContent = 'Не загрузились герои'; toast('Обнови страницу: не удалось загрузить изображения.'); });
if (saves.unavailable) toast('Сохранения недоступны. Играем в памяти этой вкладки.');
if (new URL(location.href).searchParams.has('v') && new URL(location.href).searchParams.get('v') !== GAME.version) toast('Ссылка из другой версии. Трасса может отличаться.');

// Only present in an explicit test build or development; absent from production.
if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
  Object.assign(window, { __game: { model, start, pause, resume, toMenu, step(seconds: number) { for (let t = 0; t < seconds && model.state === 'playing'; t += 1 / 60) model.update(Math.min(1 / 60, seconds - t)); processEvents(); updateHud(true); }, render() { renderer.render(model, heroId, reducedMotion.matches); updateHud(true); }, get heroId() { return heroId; }, get cardReady() { return !!cardBlob; } } });
}
