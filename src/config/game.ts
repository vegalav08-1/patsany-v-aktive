/** Условная аркадная экономика. Суммы — в рублях, время — в секундах. */
export const ASSETS = [
  { id: 'coffee', name: 'Кофейня', purchasePrice: 25_000, incomePerSecond: 2_000, icon: 'coffee' },
  { id: 'shop', name: 'Интернет-магазин', purchasePrice: 250_000, incomePerSecond: 20_000, icon: 'shop' },
  { id: 'logistics', name: 'Склад и логистика', purchasePrice: 2_500_000, incomePerSecond: 200_000, icon: 'logistics' },
  { id: 'ai', name: 'AI-компания', purchasePrice: 25_000_000, incomePerSecond: 2_000_000, icon: 'ai' },
  { id: 'tower', name: 'Бизнес-центр', purchasePrice: 50_000_000, incomePerSecond: 4_000_000, icon: 'tower' },
] as const;

export const STAGES = [
  { threshold: 0, name: 'На старте', tagline: 'В кармане — ноль. В голове — план', accent: '#9da8a7', background: '#172629' },
  { threshold: 100_000, name: 'Первые деньги', tagline: 'Первые серьёзные деньги', accent: '#92e1bd', background: '#123732' },
  { threshold: 1_000_000, name: 'Предприниматель', tagline: 'Теперь работает капитал', accent: '#79c4ef', background: '#163344' },
  { threshold: 10_000_000, name: 'Владелец бизнеса', tagline: 'Созвон уже из своего офиса', accent: '#d0b4f7', background: '#242942' },
  { threshold: 100_000_000, name: 'Владелец империи', tagline: 'Большие планы стали панорамой', accent: '#f4d88a', background: '#222a38' },
] as const;

export const GAME = {
  version: '1',
  duration: 90,
  lanes: 3,
  impactY: 0.82,
  spawnY: -0.12,
  maxDelta: 0.1,
  moveSpeed: 7, // дорожек в секунду; два перестроения занимают 0,286 с
  collisionTolerance: 0.36,
  minimumReactionSeconds: 0.35,
  initialSpeed: 0.24, // нормализованная высота поля в секунду
  finalSpeed: 0.40,
  firstRowTime: 3.6,
  initialRowInterval: 1.2,
  finalRowInterval: 0.88,
  firstAssetRow: 7, // первое предложение ровно на 12-й секунде
  assetEveryRows: 5,
  harmlessOpeningRows: 2,
  singleHazardChance: 0.68,
  cashValues: [5_000, 50_000, 500_000, 5_000_000, 10_000_000],
  lossFractions: [0.12, 0.16, 0.20, 0.24],
  lossProtectionSeconds: 0.8,
  labels: ['Выручка', 'Оплаченный заказ', 'Оплата клиента'],
  lossLabels: ['Возврат', 'Срыв поставки', 'Неоплаченный счёт', 'Плохая сделка'],
} as const;

export type AssetId = typeof ASSETS[number]['id'];
