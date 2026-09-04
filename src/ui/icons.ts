const paths: Record<string, string> = {
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  sound: '<path d="m11 5-5 4H3v6h3l5 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 5-5 4H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6"/>',
  cup: '<path d="M8 3h8v5c0 5-8 5-8 0V3Zm0 1H4v3c0 3 4 3 4 3m8-6h4v3c0 3-4 3-4 3m-4 3v5m-4 2h8"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  share: '<path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7"/>',
  restart: '<path d="M4 9a8 8 0 1 1 0 7m0-7V3m0 6h6"/>',
  cash: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M7 3h12M12 10v5m-1-5h2m-2 5h2"/>',
  business: '<path d="M3 9h18l-2-6H5L3 9Zm2 0v11h14V9M9 20v-6h6v6"/>',
  loss: '<path d="m12 3 10 18H2L12 3Zm0 6v5m0 3v1"/>',
};
export function icon(name: string, size = 22) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.arrow}</svg>`; }
