/** Photo crops are source pixels (1280 × 960); outlines live in scripts/prepare-assets.py.
 * Head offsets use body-local coordinates: feet y=0, chin y=-44.
 * All heroes have identical gameplay. Names may be edited locally in the menu.
 */
export interface HeroConfig {
  id: string;
  defaultName: string;
  description: string;
  accent: string;
  headSrc: string;
  crop: { x: number; y: number; width: number; height: number };
  head: { width: number; height: number; offsetX: number; offsetY: number };
}

export const HEROES: HeroConfig[] = [
  {
    id: 'left', defaultName: 'Партнёр 1', description: 'Человек слева',
    accent: '#b6ef78', headSrc: 'assets/head-left.webp',
    crop: { x: 25, y: 145, width: 293, height: 405 },
    head: { width: 57.88, height: 80, offsetX: 0, offsetY: -84 },
  },
  {
    id: 'back', defaultName: 'Партнёр 2', description: 'Человек сзади',
    accent: '#7dc9f5', headSrc: 'assets/head-back.webp',
    crop: { x: 327, y: 267, width: 175, height: 213 },
    head: { width: 62, height: 75.46, offsetX: 0, offsetY: -81.73 },
  },
  {
    id: 'center', defaultName: 'Партнёр 3', description: 'Человек по центру на переднем плане',
    accent: '#f5c963', headSrc: 'assets/head-center.webp',
    crop: { x: 519, y: 270, width: 282, height: 411 },
    head: { width: 54.89, height: 80, offsetX: 0, offsetY: -84 },
  },
  {
    id: 'right', defaultName: 'Партнёр 4', description: 'Человек справа',
    accent: '#c4aff6', headSrc: 'assets/head-right.webp',
    crop: { x: 918, y: 254, width: 284, height: 342 },
    head: { width: 62, height: 74.66, offsetX: 0, offsetY: -81.33 },
  },
];
