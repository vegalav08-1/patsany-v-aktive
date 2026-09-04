import { mkdirSync, writeFileSync } from 'node:fs';
import { ASSETS, GAME, STAGES } from '../src/config/game';
import { GameModel, seededRandom } from '../src/game/model';

type Policy = 'strong' | 'ordinary' | 'cash-only' | 'stationary';
interface Outcome {
  seed: string;
  policy: Policy;
  elapsed: number;
  cash: number;
  netWorth: number;
  peakNetWorth: number;
  stage: number;
  assets: string[];
  firstPurchase: number | null;
  losses: number;
  collected: number;
  stageTimes: { stage: number; time: number }[];
}

/** Scripted policies inspect visible objects, never read the safe route metadata. */
function simulate(seed: string, policy: Policy): Outcome {
  const model = new GameModel();
  const policyRandom = seededRandom(`controller:${seed}:${policy}`);
  model.start(seed);
  let decidedAt = -1;
  let firstPurchase: number | null = null;
  let losses = 0;
  let collected = 0;
  const stageTimes: Outcome['stageTimes'] = [];
  while (model.state === 'playing') {
    const upcoming = model.objects.filter(object => !object.processed).sort((a, b) => a.hitAt - b.hitAt);
    const first = upcoming[0];
    if (first && first.hitAt !== decidedAt && first.hitAt - model.elapsed <= 0.65 && policy !== 'stationary') {
      decidedAt = first.hitAt;
      const row = upcoming.filter(object => object.hitAt === first.hitAt);
      const affordableAsset = policy !== 'cash-only' && row.find(object => object.type === 'asset'
        && object.value <= model.cash + model.incomePerSecond * (object.hitAt - model.elapsed));
      const cash = row.filter(object => object.type === 'cash').sort((a, b) => b.value - a.value)[0];
      const recommended = affordableAsset || cash || row.find(object => object.type !== 'loss');
      const accuracy = policy === 'ordinary' ? 0.72 : policy === 'cash-only' ? 1 : 0.97;
      if (recommended && policyRandom() < accuracy) model.moveTo(recommended.lane);
      else if (policyRandom() < 0.3) model.moveTo(Math.floor(policyRandom() * 3));
    }
    model.update(1 / 60);
    for (const event of model.drainEvents()) {
      if (event.type === 'asset' && firstPurchase === null) firstPurchase = model.elapsed;
      if (event.type === 'loss') losses++;
      if (event.type === 'cash') collected++;
      if (event.type === 'stage') stageTimes.push({ stage: model.stage, time: Number(model.elapsed.toFixed(3)) });
    }
  }
  return {
    seed, policy, elapsed: model.elapsed, cash: Math.round(model.cash), netWorth: Math.round(model.netWorth),
    peakNetWorth: Math.round(model.peakNetWorth), stage: model.stage, assets: [...model.ownedAssets],
    firstPurchase: firstPurchase === null ? null : Number(firstPurchase.toFixed(3)), losses, collected, stageTimes,
  };
}

function summary(values: number[]) {
  if (!values.length) return { min: null, median: null, max: null };
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return { min: sorted[0]!, median: sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2, max: sorted.at(-1)! };
}

const outcomes: Outcome[] = [];
const policies: Policy[] = ['strong', 'ordinary', 'cash-only', 'stationary'];
for (const policy of policies) for (let index = 0; index < 40; index++) outcomes.push(simulate(`balance-${index.toString().padStart(2, '0')}`, policy));
const aggregates = policies.map(policy => {
  const results = outcomes.filter(outcome => outcome.policy === policy);
  return {
    policy, runs: results.length,
    capital: summary(results.map(result => result.netWorth)),
    stageCounts: STAGES.map((_, stage) => results.filter(result => result.stage === stage).length),
    firstPurchase: summary(results.flatMap(result => result.firstPurchase === null ? [] : [result.firstPurchase])),
    averageLosses: results.reduce((sum, result) => sum + result.losses, 0) / results.length,
    averageAssets: results.reduce((sum, result) => sum + result.assets.length, 0) / results.length,
  };
});
const rubles = (value: number | null) => value === null ? '—' : `${Math.round(value).toLocaleString('ru-RU')} ₽`;
const labels: Record<Policy, string> = {
  strong: 'Сильный (97% верных решений)', ordinary: 'Обычный (72% верных решений)',
  'cash-only': 'Только выручка (100%, без покупок)', stationary: 'Без управления (средняя дорожка)',
};
const ordinary = outcomes.filter(outcome => outcome.policy === 'ordinary');
const strong = outcomes.filter(outcome => outcome.policy === 'strong');
const stationary = outcomes.filter(outcome => outcome.policy === 'stationary');
const report = `# Проверка игрового баланса

Команда: \`node --import tsx scripts/balance.ts\`. Версия маршрута: ${GAME.version}.

Выполнены ${outcomes.length} полных автоматических забегов по ${GAME.duration} секунд активного времени, по 40 одинаковых seed (\`balance-00\`…\`balance-39\`) на каждый контроллер. Шаг симуляции — 1/60 секунды. Это проверка модели и алгоритмических политик, не тестирование реальными игроками, смартфонами или измерение FPS.

Контроллер принимает одно решение за 0,65 секунды до пересечения видимого ряда. Он выбирает доступный бизнес, иначе выручку; при ошибке чаще сохраняет дорожку, иногда выбирает случайную. Прогноз доступности учитывает только текущий доход до столкновения. Контроллер не читает гарантированную безопасную дорожку из метаданных. «Только выручка» всегда избегает покупок; «без управления» остаётся в центре. Вероятность верного решения описывает политику, а не измеренный навык человека.

| Политика | Минимум капитала | Медиана | Максимум | Распределение по этапам 0 / 1 / 2 / 3 / 4 | Среднее число активов |
| --- | ---: | ---: | ---: | --- | ---: |
${aggregates.map(entry => `| ${labels[entry.policy]} | ${rubles(entry.capital.min)} | ${rubles(entry.capital.median)} | ${rubles(entry.capital.max)} | ${entry.stageCounts.join(' / ')} | ${entry.averageAssets.toFixed(2)} |`).join('\n')}

| Политика | Первая покупка: мин / медиана / макс, с | Среднее число столкновений с убытками |
| --- | --- | ---: |
${aggregates.map(entry => `| ${labels[entry.policy]} | ${[entry.firstPurchase.min, entry.firstPurchase.median, entry.firstPurchase.max].map(value => value === null ? '—' : value.toFixed(2)).join(' / ')} | ${entry.averageLosses.toFixed(2)} |`).join('\n')}

Начальный ряд доступен заранее; семь предложений выручки по 5 000 ₽ предшествуют первой кофейне ровно на 12-й секунде. Для её покупки требуется собрать хотя бы пять и сохранить 25 000 ₽. Если пропустить предложение, дешёвый непроданный бизнес повторяется каждые пять рядов. Первые два ряда не содержат убытков.

Гарантированная безопасная дорожка меняется максимум на одну дорожку между рядами. Минимальный интервал рядов 0,88 с больше 0,35 с реакции плюс 0,286 с на переход через всё поле. Центр каждого объекта пересекает верхнюю границу игрового Canvas более чем за 2 с до столкновения даже в конце забега; создание за пределами экрана не считается видимостью. Это дополнительно проверено автоматическим тестом на 100 seed.

Капитал при покупке не увеличивается: наличные переходят в стоимость актива. Каждый бизнес сохраняет покупную стоимость в капитале, а после покупки начисляет доход. Окупаемость по денежному потоку: ${ASSETS.map(asset => `${asset.name} — ${(asset.purchasePrice / asset.incomePerSecond).toFixed(1)} с`).join('; ')}. При малом остатке времени наличная выручка на альтернативной дорожке может быть выгоднее покупки; более ранние приобретения увеличивают доступный бюджет и итог.

Полные фактические результаты каждого забега находятся в \`reports/balance.json\`. Номиналы и пороги сохранены из исходной гипотезы; настройка темпа и гарантированных предложений сосредоточена в \`src/config/game.ts\`.

По этому набору seed минимальный этап обычного контроллера — ${Math.min(...ordinary.map(outcome => outcome.stage))}. Сильный контроллер достиг этапа 4 в ${strong.filter(outcome => outcome.stage === 4).length} из ${strong.length} забегов. Без управления максимальный этап — ${Math.max(...stationary.map(outcome => outcome.stage))}. Последняя стадия достижима, а действия существенно влияют на результат. Медиана сильной политики с покупками выше медианы идеального сбора одной выручки. Это подтверждает целевые свойства модели в данном наборе, но не заменяет дальнейшее наблюдение за реальными игроками.
`;
mkdirSync('reports', { recursive: true });
writeFileSync('reports/balance.json', `${JSON.stringify({ version: GAME.version, duration: GAME.duration, hz: 60, aggregates, outcomes }, null, 2)}\n`);
writeFileSync('reports/balance.md', report);
console.table(aggregates.map(entry => ({ policy: entry.policy, min: entry.capital.min, median: entry.capital.median, max: entry.capital.max,
  stages: entry.stageCounts.join('/'), firstPurchaseMedian: entry.firstPurchase.median, losses: entry.averageLosses, assets: entry.averageAssets })));
if (outcomes.some(outcome => outcome.elapsed !== 90 || outcome.cash < 0)) throw new Error('Нарушен инвариант полного забега.');
if (ordinary.some(outcome => outcome.stage < 2)) throw new Error('Обычная политика не получила две смены образа на одном из seed.');
if (!strong.some(outcome => outcome.stage === 4)) throw new Error('Сильная политика не достигла последнего статуса.');
if (stationary.every(outcome => outcome.stage === 4)) throw new Error('Последний статус гарантирован без управления.');
if (aggregates[0]!.capital.median! <= aggregates[2]!.capital.median!) throw new Error('Приобретения не дают преимущества перед идеальным сбором выручки.');
