import { GAME } from '../config/game';
const full = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
export function money(value: number) { return `${full.format(Math.floor(value))} ₽`; }
export function shortMoney(value: number) {
  const v = Math.floor(value);
  if (v >= 1e9) return `${(v / 1e9).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} млрд ₽`;
  if (v >= 1e6) return `${(v / 1e6).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млн ₽`;
  if (v >= 1e3) return `${(v / 1e3).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} тыс. ₽`;
  return money(v);
}
export function freshSeed() {
  const bytes = new Uint32Array(2);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, n => n.toString(36)).join('-');
}
export function challengeURL(seed: string) {
  const url = new URL(location.href);
  url.search = ''; url.hash = '';
  url.searchParams.set('seed', seed); url.searchParams.set('v', GAME.version);
  return url.href;
}
export const isLocal = () => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
