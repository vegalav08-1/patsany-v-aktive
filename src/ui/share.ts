import { drawBackdrop, drawCharacter } from '../game/renderer';
import { GAME, STAGES } from '../config/game';
import { money, challengeURL } from './format';

export type CardResult = { name: string; capital: number; stage: number; seed: string; head: HTMLImageElement; accent: string; assets: number };
export function paintComparison(canvas: HTMLCanvasElement, result: CardResult) {
  canvas.width = 800; canvas.height = 360;
  const ctx = canvas.getContext('2d')!;
  for (const [index, stage] of [0, result.stage].entries()) {
    ctx.save(); ctx.beginPath(); ctx.rect(index * 400, 0, 400, 360); ctx.clip(); ctx.translate(index * 400, 0);
    drawBackdrop(ctx, 400, 360, stage, 0);
    ctx.fillStyle = '#142f28'; ctx.globalAlpha = .18; ctx.fillRect(0, 0, 400, 360); ctx.globalAlpha = 1;
    drawCharacter(ctx, result.head, stage, 200, 316, 2.1, 0, result.accent);
    ctx.fillStyle = '#fff8e8'; ctx.beginPath(); ctx.roundRect(22, 18, 110, 38, 19); ctx.fill();
    ctx.fillStyle = '#173b32'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.fillText(index ? 'СТАЛО' : 'БЫЛО', 77, 44);
    ctx.restore();
  }
  ctx.fillStyle = '#fff8e8'; ctx.fillRect(397, 0, 6, 360);
}

export async function makeCard(result: CardResult): Promise<Blob> {
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f4f0e4'; ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = '#173b32'; ctx.font = '900 82px Arial'; ctx.fillText('ПАЦАНЫ', 70, 135); ctx.fillText('В АКТИВЕ', 70, 223);
  ctx.save(); ctx.translate(899, 150); ctx.rotate(-.13); ctx.fillStyle = '#f56938'; ctx.beginPath(); ctx.roundRect(-92, -55, 184, 110, 20); ctx.fill();
  ctx.fillStyle = '#fff9ea'; ctx.textAlign = 'center'; ctx.font = 'bold 34px Arial'; ctx.fillText('90 СЕК.', 0, 12); ctx.restore();
  ctx.fillStyle = '#56736a'; ctx.font = '30px Arial'; ctx.fillText('В кармане — ноль. В голове — план.', 72, 283);
  const comparison = document.createElement('canvas'); paintComparison(comparison, result);
  ctx.save(); ctx.beginPath(); ctx.roundRect(60, 333, 960, 432, 28); ctx.clip(); ctx.drawImage(comparison, 60, 333, 960, 432); ctx.restore();
  ctx.fillStyle = '#173b32'; ctx.font = 'bold 39px Arial'; ctx.fillText(result.name, 72, 840);
  ctx.font = '900 84px Arial';
  let size = 84;
  while (ctx.measureText(money(result.capital)).width > 936) ctx.font = `900 ${--size}px Arial`;
  ctx.fillText(money(result.capital), 72, 954);
  ctx.fillStyle = '#56736a'; ctx.font = '30px Arial'; ctx.fillText('КАПИТАЛ НА ФИНИШЕ', 75, 1005);
  ctx.fillStyle = '#173b32'; ctx.font = 'bold 34px Arial'; ctx.fillText(STAGES[result.stage].name, 72, 1090);
  ctx.font = '28px Arial'; ctx.fillText(`Бизнесов в портфеле: ${result.assets} из 5`, 72, 1138);
  ctx.fillStyle = '#ef602d'; ctx.fillRect(60, 1192, 960, 4);
  ctx.fillStyle = '#173b32'; ctx.font = 'bold 34px Arial'; ctx.fillText('Начинал с нуля. Теперь твой ход.', 72, 1259);
  ctx.fillStyle = '#56736a'; ctx.font = '20px Arial'; ctx.fillText(`Трасса ${result.seed.slice(0, 45)} · версия ${GAME.version}`, 72, 1300);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Не удалось создать PNG')), 'image/png'));
}
export function shareText(result: CardResult) {
  return `Я собрал ${money(result.capital)} за 90 секунд в “Пацаны в активе”. Твой ход: ${challengeURL(result.seed)}`;
}
