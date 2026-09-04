import type { GameModel } from './model';
import { HEROES } from '../config/heroes';

type Ctx = CanvasRenderingContext2D;
type BusinessIcon = 'coffee' | 'shop' | 'logistics' | 'ai' | 'tower' | string;

const INK = '#183b34';
const CREAM = '#fff8e9';
const GOLD = '#f4c46a';

function rounded(ctx: Ctx, x: number, y: number, w: number, h: number, radius = 6) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function box(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, radius = 5, outline?: string) {
  rounded(ctx, x, y, w, h, radius);
  ctx.fillStyle = color;
  ctx.fill();
  if (outline) { ctx.strokeStyle = outline; ctx.stroke(); }
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: string) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function line(ctx: Ctx, points: number[], color: string, width = 2) {
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function polygon(ctx: Ctx, points: number[], fill: string, stroke?: string) {
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}

function label(ctx: Ctx, text: string, x: number, y: number, size: number, color: string, weight = 800) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Arial", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function money(value: number) {
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(1))} млн ₽`;
  if (value >= 1_000) return `${Number((value / 1_000).toFixed(1))} тыс. ₽`;
  return `${Math.round(value)} ₽`;
}

/** Locally drawn business symbols; also reusable in the portfolio and PNG card. */
export function drawBusinessIcon(ctx: Ctx, id: BusinessIcon, x: number, y: number, size: number, color = INK) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 40, size / 40);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.6;
  if (id === 'coffee') {
    box(ctx, -12, -7, 22, 22, CREAM, 5, color);
    ctx.beginPath(); ctx.arc(12, 2, 6, -Math.PI / 2, Math.PI / 2); ctx.strokeStyle = color; ctx.stroke();
    line(ctx, [-16, 17, 15, 17], color, 2.6);
    line(ctx, [-6, -12, -8, -16, -5, -20], color, 1.8);
    line(ctx, [3, -12, 1, -16, 4, -20], color, 1.8);
    ellipse(ctx, -1, 3, 4, 5, '#e87943');
  } else if (id === 'shop') {
    box(ctx, -15, -3, 30, 21, CREAM, 2, color);
    box(ctx, -10, 4, 9, 10, '#a6cdc0', 1, color);
    box(ctx, 5, 5, 6, 13, color, 1);
    polygon(ctx, [-16, -4, -12, -14, 12, -14, 16, -4], '#ed784b', color);
    for (let j = -10; j <= 12; j += 9) line(ctx, [j, -13, j - 2, -4], CREAM, 4);
    box(ctx, -17, -5, 34, 6, '#ed784b', 2, color);
  } else if (id === 'logistics') {
    box(ctx, -17, -12, 23, 25, CREAM, 2, color);
    polygon(ctx, [6, -5, 13, -5, 18, 4, 18, 13, 6, 13], '#e6b565', color);
    box(ctx, 9, -1, 5, 6, '#a6cdc0', 1);
    line(ctx, [-6, -11, -6, 2], '#e6b565', 5);
    ellipse(ctx, -10, 14, 5, 5, color); ellipse(ctx, 12, 14, 5, 5, color);
    ellipse(ctx, -10, 14, 2, 2, CREAM); ellipse(ctx, 12, 14, 2, 2, CREAM);
  } else if (id === 'ai') {
    box(ctx, -12, -12, 24, 24, '#a6cdc0', 4, color);
    box(ctx, -7, -7, 14, 14, CREAM, 2, color);
    for (let j = -6; j <= 6; j += 6) {
      line(ctx, [j, -18, j, -13], color, 2.4); line(ctx, [j, 13, j, 18], color, 2.4);
      line(ctx, [-18, j, -13, j], color, 2.4); line(ctx, [13, j, 18, j], color, 2.4);
    }
    label(ctx, 'AI', 0, 1, 10, color);
  } else {
    box(ctx, -13, -18, 20, 36, '#a6cdc0', 2, color);
    box(ctx, 7, -6, 10, 24, CREAM, 1, color);
    line(ctx, [-17, 19, 20, 19], color, 2.5);
    for (let j = -11; j <= 10; j += 7) {
      box(ctx, -8, j, 3, 3, CREAM, 0); box(ctx, -1, j, 3, 3, CREAM, 0);
    }
    box(ctx, -6, 11, 6, 7, color, 1);
  }
  ctx.restore();
}

function tree(ctx: Ctx, x: number, y: number, size: number, rich = false) {
  ellipse(ctx, x + 3, y + size * .56, size * .52, size * .2, '#17372a1f');
  box(ctx, x - 2, y, 4, size * .52, '#9e8163', 1);
  ellipse(ctx, x, y - size * .1, size * .44, size * .52, rich ? '#417868' : '#72916d');
  ellipse(ctx, x - size * .12, y - size * .25, size * .31, size * .32, rich ? '#649783' : '#92a778');
}

function car(ctx: Ctx, x: number, y: number, color: string, premium = false, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ellipse(ctx, 3, 3, 15, 31, '#14292324');
  box(ctx, -14, -21, 28, 47, INK, 8);
  box(ctx, -12, -25, 24, 50, color, premium ? 10 : 6);
  box(ctx, -9, -10, 18, 22, '#334d4f', 4);
  box(ctx, -8, -9, 16, 7, '#b6d0cb', 2);
  box(ctx, -8, 6, 16, 5, '#9cb8b4', 2);
  line(ctx, [-11, -18, 11, -18], premium ? '#e6c876' : '#fbebc3', 3);
  box(ctx, -10, 19, 5, 3, '#e47359', 1); box(ctx, 5, 19, 5, 3, '#e47359', 1);
  if (premium) line(ctx, [0, -23, 0, -12], '#eed8a5', 1);
  ctx.restore();
}

function building(ctx: Ctx, x: number, y: number, width: number, height: number, stage: number, variant: number) {
  ctx.save();
  ctx.lineWidth = 1;
  box(ctx, x + 4, y + 6, width, height, '#223e3020', 3);
  if (stage === 0) {
    box(ctx, x, y, width, height, variant % 2 ? '#ccb998' : '#bfc1af', 3);
    box(ctx, x - 3, y - 4, width + 6, 15, '#8c9588', 2);
    box(ctx, x + 5, y + 18, width - 10, height - 27, variant % 2 ? '#9aab9c' : '#a5977f', 1);
    for (let k = y + 23; k < y + height - 8; k += 8) line(ctx, [x + 7, k, x + width - 7, k], '#6d786859', 1);
    box(ctx, x + width / 2 - 2, y + height - 25, 4, 8, '#5c6e5f', 1);
    if (variant % 2 === 0) {
      box(ctx, x + 5, y + 3, width - 10, 11, '#ece2cb', 1);
      label(ctx, 'ГАРАЖ', x + width / 2, y + 9, 6.5, '#647161');
    }
    line(ctx, [x + 3, y + height - 4, x + 12, y + height - 6, x + 18, y + height - 3], '#777f6e70', 1);
  } else if (stage === 1) {
    box(ctx, x, y, width, height, '#eee0bd', 3);
    box(ctx, x + 5, y + 8, width - 10, height - 35, '#88aea3', 1);
    line(ctx, [x + width / 2, y + 9, x + width / 2, y + height - 28], '#fff4d8', 3);
    line(ctx, [x + 5, y + 28, x + width - 5, y + 28], '#fff4d8', 3);
    box(ctx, x - 3, y + height - 32, width + 6, 13, variant % 2 ? '#507f72' : '#d8845e', 2);
    for (let k = x; k < x + width; k += 11) box(ctx, k, y + height - 31, 5, 11, '#fff0d2', 1);
    box(ctx, x + 8, y + height - 19, width - 16, 15, '#f5eccf', 1);
    label(ctx, variant % 2 ? 'МАРКЕТ' : 'КОФЕ', x + width / 2, y + height - 11, 7, '#476c5e');
    ellipse(ctx, x + 4, y + height + 7, 6, 4, '#b5946e');
    ellipse(ctx, x + width - 3, y + height + 7, 6, 4, '#b5946e');
  } else if (stage === 2) {
    box(ctx, x, y, width, height, variant % 2 ? '#a8bfb0' : '#e1d4b2', 2);
    box(ctx, x - 3, y - 3, width + 6, 11, '#467a6d', 2);
    if (variant % 2) {
      box(ctx, x + 6, y + 17, width - 12, height - 22, '#708f83', 1);
      for (let k = y + 22; k < y + height - 10; k += 6) line(ctx, [x + 8, k, x + width - 8, k], '#a7bbae', 1);
      for (let k = 0; k < 3; k++) {
        box(ctx, x + 2 + k * 11, y + height - 9, 10, 10, '#d1ac6e', 1, '#9e8259');
        line(ctx, [x + 7 + k * 11, y + height - 9, x + 7 + k * 11, y + height - 2], '#e8ce91', 2);
      }
      label(ctx, 'СКЛАД', x + width / 2, y + 5, 6.5, '#f5ebd3');
    } else {
      box(ctx, x + 5, y + 18, width - 10, height - 25, '#72a49c', 1);
      line(ctx, [x + width / 2, y + 20, x + width / 2, y + height - 6], '#e6e9d6', 3);
      label(ctx, 'СВОЙ', x + width / 2, y + 6, 7, '#f5ebd3');
      box(ctx, x + width - 13, y + height - 19, 5, 6, '#e9c777', 1);
    }
  } else {
    const dark = stage === 4;
    box(ctx, x, y, width, height, dark ? '#284e4c' : '#729b99', 2);
    box(ctx, x - 3, y - 4, width + 6, 12, dark ? '#1e3a37' : '#476f6b', 2);
    const step = dark ? 11 : 15;
    for (let row = 14; row < height - 13; row += step) {
      for (let col = 5; col < width - 7; col += 12) {
        const warm = (row + col + variant) % 3 === 0;
        box(ctx, x + col, y + row, 7, step - 5, dark && warm ? '#e3c77e' : dark ? '#72aaa2' : '#c6e0d9', 1);
      }
    }
    box(ctx, x + width / 2 - 7, y + height - 17, 14, 17, '#234c45', 1);
    line(ctx, [x + width / 2, y + height - 16, x + width / 2, y + height], '#aac1a8', 1);
    if (dark) {
      line(ctx, [x + width / 2, y - 3, x + width / 2, y - 19], '#bdc7a2', 2);
      ellipse(ctx, x + width / 2, y - 20, 2, 2, '#eac779');
    }
  }
  ctx.restore();
}

/** The same five environments are used by the game and the before/after result. */
export function drawBackdrop(ctx: Ctx, width: number, height: number, stage: number, scroll = 0) {
  const palettes = [
    { ground: '#dad3b9', road: '#b8bba6', edge: '#f0e5c7', marks: '#e5e3c9' },
    { ground: '#e7d9b9', road: '#9eafa5', edge: '#f6e7c8', marks: '#e7e6d1' },
    { ground: '#c3d5bb', road: '#8aa99d', edge: '#e5e7c9', marks: '#d8e2ce' },
    { ground: '#a7c3ba', road: '#78968e', edge: '#d4ddd0', marks: '#cad7c7' },
    { ground: '#73928b', road: '#5d7b74', edge: '#b5c6ab', marks: '#a7bda8' },
  ];
  const p = palettes[Math.max(0, Math.min(4, stage))];
  ctx.save();
  ctx.fillStyle = p.ground; ctx.fillRect(0, 0, width, height);
  const roadLeft = width * .11;
  const roadRight = width * .89;
  // Slow moving paving / planting adds parallax without affecting the seeded route.
  ctx.strokeStyle = stage >= 3 ? '#eff6db14' : '#677c6520';
  ctx.lineWidth = 1;
  const pavingOffset = ((scroll * .42) % 38 + 38) % 38;
  for (let y = pavingOffset - 38; y < height + 38; y += 38) {
    line(ctx, [0, y, roadLeft, y], ctx.strokeStyle as string, 1);
    line(ctx, [roadRight, y, width, y], ctx.strokeStyle as string, 1);
  }
  ctx.fillStyle = '#263d2520'; ctx.fillRect(roadLeft - 4, 0, roadRight - roadLeft + 8, height);
  ctx.fillStyle = p.road; ctx.fillRect(roadLeft, 0, roadRight - roadLeft, height);
  ctx.fillStyle = p.edge; ctx.fillRect(roadLeft, 0, 3, height); ctx.fillRect(roadRight - 3, 0, 3, height);
  const laneW = (roadRight - roadLeft) / 3;
  const stripeOffset = ((scroll % 70) + 70) % 70;
  ctx.strokeStyle = p.marks; ctx.lineWidth = 2; ctx.setLineDash([21, 49]); ctx.lineDashOffset = -stripeOffset;
  for (let lane = 1; lane < 3; lane++) {
    ctx.beginPath(); ctx.moveTo(roadLeft + laneW * lane, 0); ctx.lineTo(roadLeft + laneW * lane, height); ctx.stroke();
  }
  ctx.setLineDash([]);
  const curbOffset = ((scroll % 52) + 52) % 52;
  for (let y = curbOffset - 52; y < height; y += 52) {
    box(ctx, roadLeft - 2, y, 5, 25, stage >= 3 ? '#e2d6ab' : '#9a9b80', 0);
    box(ctx, roadRight - 3, y, 5, 25, stage >= 3 ? '#e2d6ab' : '#9a9b80', 0);
  }
  const unit = Math.max(144, Math.min(190, height * .38));
  const scenicOffset = ((scroll * .68) % unit + unit) % unit;
  const scenicCycle = Math.floor(scroll * .68 / unit);
  const bWidth = width * .088;
  for (let row = -1; row < Math.ceil(height / unit) + 1; row++) {
    const y = row * unit + scenicOffset;
    const variant = (((row - scenicCycle) % 4) + 4) % 4;
    building(ctx, -6, y + 8, bWidth + 5, stage >= 3 ? unit * .68 : unit * .48, stage, variant);
    building(ctx, width - bWidth + 1, y + unit * .34, bWidth + 5, stage >= 3 ? unit * .58 : unit * .44, stage, variant + 1);
    tree(ctx, roadLeft * .58, y + unit * .78, width * .057, stage > 1);
    if (stage > 0) tree(ctx, width - roadLeft * .57, y + unit * .16, width * .05, true);
    if (stage === 0) {
      line(ctx, [6, y + unit * .61, bWidth - 4, y + unit * .61], '#859279', 4);
      line(ctx, [10, y + unit * .6, 10, y + unit * .68], '#667e68', 2);
      line(ctx, [bWidth - 8, y + unit * .6, bWidth - 8, y + unit * .68], '#667e68', 2);
    }
    if (stage >= 2 && variant % 2 === 0) {
      car(ctx, width - width * .075, y + unit * .86, stage === 2 ? '#e0d6ae' : stage === 3 ? '#e3e6d6' : '#193c39', stage === 4, .75);
    }
    if (stage > 1) {
      box(ctx, roadLeft - 10, y + unit * .41, 2, 22, '#597369', 1);
      box(ctx, roadLeft - 13, y + unit * .39, 8, 5, stage === 4 ? '#f0ce7a' : '#e6e8cb', 2);
    }
  }
  if (stage === 4) {
    // Distant helicopter silhouette; slower layer than both roadway and facades.
    const hx = width * .77 + Math.sin(scroll * .0008) * width * .08;
    const hy = height * .13;
    ctx.globalAlpha = .38;
    ellipse(ctx, hx, hy, 11, 5, '#152f2d');
    polygon(ctx, [hx + 7, hy, hx + 24, hy - 4, hx + 25, hy - 8, hx + 27, hy - 7, hx + 27, hy + 1, hx + 9, hy + 3], '#152f2d');
    line(ctx, [hx - 19, hy - 8, hx + 18, hy - 8], '#152f2d', 2);
    line(ctx, [hx, hy - 7, hx, hy - 2], '#152f2d', 2);
    line(ctx, [hx - 8, hy + 8, hx + 9, hy + 8], '#152f2d', 2);
    ctx.globalAlpha = 1;
  }
  // Subtle lane illumination keeps the moving objects readable in all five places.
  const vignette = ctx.createLinearGradient(0, 0, 0, height);
  vignette.addColorStop(0, '#f9f1d414'); vignette.addColorStop(.5, '#f9f1d400'); vignette.addColorStop(1, '#17362b12');
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** Native character coordinates: feet at 0, chin at -44; all outfits keep the full body visible. */
export function drawCharacter(ctx: Ctx, head: HTMLImageElement, stage: number, x: number, feetY: number, scale: number, phase: number, accent = '#e46a3e') {
  ctx.save();
  ctx.translate(x, feetY);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 1.6;
  const step = Math.sin(phase) * 3.5;
  const bob = Math.cos(phase * 2) * 1.2;
  const suit = stage >= 3;
  const jacket = stage === 1;
  const pants = stage === 0 ? '#56645b' : stage === 1 ? '#324c48' : stage === 2 ? '#8b8269' : stage === 3 ? '#253d40' : '#253b37';
  ellipse(ctx, 1, 2, 24, 6, '#19383028');
  // Separate bent legs and shoes make the walk readable even at phone scale.
  polygon(ctx, [-13, -25 + bob, -1, -25 + bob, -3, -11, -6 + step * .6, -2 + Math.max(0, step), -15 + step * .6, -2 + Math.max(0, step), -14, -14], pants, INK);
  polygon(ctx, [1, -25 + bob, 13, -25 + bob, 14, -13, 15 - step * .6, -2 + Math.max(0, -step), 5 - step * .6, -2 + Math.max(0, -step), 3, -11], pants, INK);
  const shoe = stage === 0 ? '#c9c8b3' : stage < 3 ? '#fff8df' : '#18322f';
  box(ctx, -17 + step * .6, -5 + Math.max(0, step), 14, 7, shoe, 3, INK);
  box(ctx, 3 - step * .6, -5 + Math.max(0, -step), 15, 7, shoe, 3, INK);
  line(ctx, [-16 + step * .6, 1 + Math.max(0, step), -4 + step * .6, 1 + Math.max(0, step)], stage < 3 ? '#9b9d87' : '#b89c68', 1.2);
  line(ctx, [4 - step * .6, 1 + Math.max(0, -step), 16 - step * .6, 1 + Math.max(0, -step)], stage < 3 ? '#9b9d87' : '#b89c68', 1.2);
  ctx.translate(0, bob);
  const shirt = stage === 0 ? '#a8aa8c' : stage === 1 ? accent : stage === 2 ? '#fff7dd' : stage === 3 ? '#294748' : '#253f36';
  const armShift = step * .55;
  // Arms move independently of the torso. Right-hand attributes change at each upgrade.
  line(ctx, [-14, -40, -21, -29 + armShift, -22, -19 + armShift], INK, suit ? 10 : 11);
  line(ctx, [-14, -40, -21, -29 + armShift, -22, -19 + armShift], shirt, suit ? 7 : 8);
  line(ctx, [14, -40, 21, -29 - armShift, 23, -20 - armShift], INK, suit ? 10 : 11);
  line(ctx, [14, -40, 21, -29 - armShift, 23, -20 - armShift], shirt, suit ? 7 : 8);
  ellipse(ctx, -22, -18 + armShift, 4, 5, '#d3a17e');
  ellipse(ctx, 23, -19 - armShift, 4, 5, '#d3a17e');
  ctx.lineWidth = 1.6;
  polygon(ctx, stage === 4
    ? [-14, -45, 14, -45, 18, -36, 16, -15, 2, -18, 0, -24, -2, -18, -16, -15, -18, -36]
    : [-13, -44, 13, -44, 18, -36, 14, -21, -14, -21, -18, -36], shirt, INK);
  box(ctx, -6, -50, 12, 12, '#d1a27f', 4);
  if (stage === 0) {
    // Worn hoodie: hood, drawstrings, pouch, small visible patch and ribbed hem.
    ctx.beginPath(); ctx.ellipse(0, -44, 12, 7, 0, 0, Math.PI); ctx.strokeStyle = '#637568'; ctx.lineWidth = 5; ctx.stroke();
    line(ctx, [-4, -40, -5, -30], '#e0dcc0', 1.2); line(ctx, [4, -40, 5, -30], '#e0dcc0', 1.2);
    polygon(ctx, [-8, -30, 8, -30, 10, -24, -10, -24], '#8e987e', '#71836f');
    box(ctx, -15, -37, 6, 7, '#c2b698', 1);
    line(ctx, [-13, -21, 13, -21], '#71836f', 2);
  } else if (jacket) {
    polygon(ctx, [-5, -43, 5, -43, 6, -22, -6, -22], '#f8ecd5');
    line(ctx, [-7, -41, -5, -22], '#914e35', 1.4); line(ctx, [7, -41, 5, -22], '#914e35', 1.4);
    polygon(ctx, [-12, -43, -4, -42, -7, -34, -14, -39], '#edaa76', INK);
    polygon(ctx, [12, -43, 4, -42, 7, -34, 14, -39], '#edaa76', INK);
    box(ctx, 21, -33 - armShift, 8, 15, '#234541', 2, INK);
    box(ctx, 22.5, -31 - armShift, 5, 10, '#8ed6c7', 1);
    ellipse(ctx, 25, -19 - armShift, .7, .7, '#eae9cb');
  } else if (stage === 2) {
    polygon(ctx, [-10, -44, 0, -39, -5, -34], '#e2e4cd', INK);
    polygon(ctx, [10, -44, 0, -39, 5, -34], '#e2e4cd', INK);
    line(ctx, [0, -39, 0, -21], '#b4b9a5', 1);
    ellipse(ctx, 1, -31, .8, .8, INK); ellipse(ctx, 1, -25, .8, .8, INK);
    line(ctx, [-13, -21, 13, -21], '#614f35', 3);
    box(ctx, -2, -23, 4, 4, GOLD, 1);
    line(ctx, [8, -41, -10, -22], '#946b47', 4);
    box(ctx, -23, -24 + armShift, 13, 15, '#a7764b', 3, INK);
    line(ctx, [-23, -19 + armShift, -10, -19 + armShift], '#ddb97d', 1.4);
  } else {
    polygon(ctx, [-7, -45, 7, -45, 5, -24, 0, -21, -5, -24], '#fff2d6');
    polygon(ctx, [-13, -44, -7, -44, 0, -25, -10, -33, -7, -36], stage === 4 ? '#567363' : '#50706c', INK);
    polygon(ctx, [13, -44, 7, -44, 0, -25, 10, -33, 7, -36], stage === 4 ? '#567363' : '#50706c', INK);
    polygon(ctx, [-2, -41, 2, -41, 3, -29, 0, -25, -3, -29], stage === 4 ? '#d3b369' : accent);
    ellipse(ctx, 0, -23, 1.2, 1.2, stage === 4 ? GOLD : '#a9b9a2');
    line(ctx, [21, -21 - armShift, 27, -21 - armShift], '#d6b466', 4);
    ctx.strokeStyle = '#ac8650'; ctx.lineWidth = 2;
    rounded(ctx, 17, -17 - armShift, 11, 7, 2); ctx.stroke();
    box(ctx, 14, -13 - armShift, 20, 15, stage === 4 ? '#c5a45e' : '#a57549', 3, INK);
    line(ctx, [14, -8 - armShift, 34, -8 - armShift], '#e7c78b', 1.2);
    box(ctx, 22, -10 - armShift, 4, 4, '#f3d993', 1);
    if (stage === 4) {
      polygon(ctx, [8, -36, 13, -37, 13, -33, 8, -33], '#e9d3a3');
      ellipse(ctx, -9, -38, 1.7, 1.7, GOLD);
      for (const buttonX of [-5, 5]) {
        ellipse(ctx, buttonX, -26, 1, 1, GOLD);
        ellipse(ctx, buttonX, -21, 1, 1, GOLD);
      }
    }
  }
  if (stage >= 2) {
    line(ctx, [-25, -21 + armShift, -19, -21 + armShift], '#b59550', stage === 4 ? 4 : 3);
    ellipse(ctx, -22, -21 + armShift, stage === 4 ? 3.2 : 2.5, stage === 4 ? 3.2 : 2.5, '#f3d28a');
    ellipse(ctx, -22, -21 + armShift, 1.6, 1.6, '#eaf0d6');
  }
  // Hair, ears and chin come from the original local transparent photo, with no synthetic detail.
  if (head?.complete && head.naturalWidth > 0) {
    const configured = HEROES.find(hero => head.src.endsWith(hero.headSrc))?.head;
    const ratio = head.naturalWidth / head.naturalHeight;
    const h = configured?.height ?? Math.min(80, 62 / ratio);
    const w = configured?.width ?? h * ratio;
    const headX = configured?.offsetX ?? 0;
    const headY = configured?.offsetY ?? -44 - h / 2;
    ctx.save(); ctx.translate(headX, -44); ctx.rotate(Math.sin(phase) * .018);
    ctx.drawImage(head, -w / 2, headY + 44 - h / 2, w, h);
    ctx.restore();
  }
  ctx.restore();
}

interface Burst { x: number; y: number; vx: number; vy: number; life: number; duration: number; color: string; size: number; }
interface Feedback { type: string; lane: number; text: string; age: number; }

export class GameRenderer {
  private ctx: Ctx;
  private width = 360;
  private height = 560;
  private dpr = 1;
  private elapsed = 0;
  private playerX = .5;
  private particles: Burst[] = [];
  private feedback: Feedback[] = [];
  private reducedMotion = false;
  private lastStage = 0;
  private upgradeAge = 10;
  private buyAge = 10;
  private lossAge = 10;
  private seed: unknown;

  constructor(private canvas: HTMLCanvasElement, private heads: Record<string, HTMLImageElement>) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D недоступен');
    this.ctx = ctx;
    this.resize();
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, bounds.width || 360);
    this.height = Math.max(1, bounds.height || 560);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  effect(type: string, lane: number, text = '') {
    this.feedback.push({ type, lane, text, age: 0 });
    if (this.feedback.length > 5) this.feedback.shift();
    if (type === 'buy' || type === 'purchase' || type === 'asset') this.buyAge = 0;
    if (type === 'loss' || type === 'hit') this.lossAge = 0;
    if (type === 'stage' || type === 'upgrade') this.upgradeAge = 0;
    if (this.reducedMotion || type === 'insufficient') return;
    const palette = type === 'loss' || type === 'hit' ? ['#ed694b', '#f3b66d', '#fff0d2'] : [GOLD, '#fff3ca', '#8cd3ae'];
    const count = type === 'stage' || type === 'upgrade' ? 24 : 11;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= 64) this.particles.shift();
      // Effects intentionally use their own random source, never the seeded model generator.
      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 65;
      const life = .35 + Math.random() * .45;
      this.particles.push({ x: this.laneX(lane), y: this.height * .76, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 40, life, duration: life, color: palette[i % palette.length], size: 2 + Math.random() * 3 });
    }
  }

  private laneX(lane: number) { return this.width * (.11 + (.78 / 3) * (lane + .5)); }

  render(model: GameModel, heroId: string, reducedMotion: boolean) {
    const ctx = this.ctx;
    this.reducedMotion = reducedMotion;
    const fresh = model.elapsed < this.elapsed || this.seed !== model.seed;
    const dt = fresh ? 0 : Math.max(0, Math.min(.05, model.elapsed - this.elapsed));
    if (fresh) {
      this.playerX = this.laneX(model.playerLane) / this.width;
      this.particles.length = 0; this.feedback.length = 0;
      this.upgradeAge = 10; this.buyAge = 10; this.lossAge = 10;
      this.lastStage = model.stage; this.seed = model.seed;
    }
    this.elapsed = model.elapsed;
    if (model.stage > this.lastStage) this.upgradeAge = 0;
    this.lastStage = model.stage;
    this.upgradeAge += dt; this.buyAge += dt; this.lossAge += dt;
    const targetX = this.laneX(model.playerLane) / this.width;
    // The model already interpolates lane changes and uses this exact position for collision.
    this.playerX = targetX;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    const scroll = model.elapsed * (51 + Math.min(35, model.elapsed * .38));
    drawBackdrop(ctx, this.width, this.height, model.stage, scroll);
    // The current lane is signposted at foot level while the entire field remains tappable.
    ctx.save();
    ctx.globalAlpha = .28;
    const laneW = this.width * .78 / 3;
    box(ctx, this.laneX(model.playerLane) - laneW * .42, this.height * .885, laneW * .84, 4, CREAM, 2);
    ctx.restore();
    for (const object of model.objects) {
      if (object.processed || object.y < -.12 || object.y > 1.1) continue;
      const x = this.laneX(object.lane);
      const y = object.y * this.height;
      if (object.type === 'cash') this.drawCash(x, y, object.value, object.id, reducedMotion);
      else if (object.type === 'asset') this.drawAsset(x, y, object.assetId || 'coffee', object.label, object.value, model.cash >= object.value);
      else this.drawLoss(x, y, object.label, object.value);
    }
    const head = this.heads[heroId] || Object.values(this.heads)[0];
    const characterScale = Math.max(.66, Math.min(1.05, this.width / 380, this.height / 475));
    const bounce = !reducedMotion && this.buyAge < .45 ? Math.sin(this.buyAge / .45 * Math.PI) * 8 : 0;
    const shake = !reducedMotion && this.lossAge < .3 ? Math.sin(this.lossAge * 85) * (1 - this.lossAge / .3) * 4 : 0;
    if (this.upgradeAge < .7 && !reducedMotion) {
      const age = this.upgradeAge / .7;
      ctx.save(); ctx.globalAlpha = (1 - age) * .55;
      ellipse(ctx, this.playerX * this.width, this.height * .77, 36 + age * 48, 40 + age * 42, '#fff0be');
      ctx.restore();
    }
    if (head) {
      ctx.save();
      if (this.lossAge < .22) ctx.globalAlpha = .65 + Math.sin(this.lossAge * 80) * .15;
      const accent = HEROES.find(hero => hero.id === heroId)?.accent;
      drawCharacter(ctx, head, model.stage, this.playerX * this.width + shake, this.height * .87 - bounce, characterScale, reducedMotion || model.state !== 'playing' ? 0 : model.elapsed * 12, accent);
      ctx.restore();
    }
    this.drawEffects(dt);
  }

  private drawCash(x: number, y: number, value: number, id: number | string, reducedMotion: boolean) {
    const ctx = this.ctx;
    const s = Math.min(1, this.width / 380);
    const numericId = typeof id === 'number' ? id : [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const wiggle = reducedMotion ? 0 : Math.sin(this.elapsed * 4 + numericId) * 2;
    ctx.save(); ctx.translate(x, y + wiggle); ctx.scale(s, s);
    ellipse(ctx, 2, 23, 25, 6, '#254d3524');
    ctx.rotate(-.08);
    ctx.lineWidth = 1.3;
    if (numericId % 3 === 1) {
      box(ctx, -23, -19, 48, 29, '#719972', 4, '#315e47');
      box(ctx, -27, -23, 48, 29, '#bddd94', 4, '#315e47');
      box(ctx, -23, -19, 40, 21, '#d9e9a7', 2, '#83ad78');
      ellipse(ctx, -3, -8, 8, 8, '#90b77a');
      label(ctx, '₽', -3, -8, 13, '#315e47');
      line(ctx, [-18, -12, -13, -12], '#5a8555', 1.5); line(ctx, [8, -4, 13, -4], '#5a8555', 1.5);
    } else if (numericId % 3 === 2) {
      box(ctx, -20, -28, 40, 29, '#d9e9a7', 3, '#315e47');
      label(ctx, '₽', 0, -15, 15, '#315e47');
      box(ctx, -27, -17, 54, 29, '#bddd94', 4, '#315e47');
      line(ctx, [-25, -14, 0, 4, 25, -14], '#5b885c', 1.5);
      line(ctx, [-25, 9, -10, -3], '#8bac78', 1.2); line(ctx, [25, 9, 10, -3], '#8bac78', 1.2);
    } else {
      polygon(ctx, [-20, -28, 20, -28, 20, 11, 14, 8, 8, 11, 2, 8, -4, 11, -10, 8, -16, 11, -20, 9], '#e8ecc1', '#315e47');
      line(ctx, [-13, -20, 3, -20], '#92b17f', 2);
      line(ctx, [-13, -13, -1, -13], '#92b17f', 2);
      ellipse(ctx, 8, -6, 11, 11, '#4e8459');
      line(ctx, [2, -6, 6, -2, 14, -11], '#ecf2d2', 2.5);
    }
    ctx.rotate(.08);
    box(ctx, -38, 9, 76, 23, '#f7f7df', 7, '#507952');
    label(ctx, `+${money(value)}`, 0, 21, 12, '#245b3e');
    ctx.restore();
  }

  private drawAsset(x: number, y: number, id: BusinessIcon, title: string, value: number, affordable: boolean) {
    const ctx = this.ctx;
    const w = Math.min(94, this.width * .78 / 3 - 5);
    const h = 91;
    ctx.save(); ctx.translate(x, y);
    ellipse(ctx, 2, h / 2 + 4, w * .48, 6, '#253d2a2c');
    ctx.lineWidth = 1.5;
    box(ctx, -w / 2, -h / 2, w, h, '#e4a84f', 11, '#765328');
    box(ctx, -w / 2 + 3, -h / 2 + 3, w - 6, h - 6, '#fff1c7', 8);
    box(ctx, -w / 2 + 3, -h / 2 + 3, w - 6, 8, '#f7cf79', 4);
    drawBusinessIcon(ctx, id, 0, -20, 26);
    const names: Record<string, string[]> = { coffee: ['Кофейня'], shop: ['Интернет-', 'магазин'], logistics: ['Склад и', 'логистика'], ai: ['AI-компания'], tower: ['Бизнес-центр'] };
    const lines = names[id] || [title];
    lines.forEach((text, i) => label(ctx, text, 0, lines.length === 1 ? 5 : i * 12, Math.min(12, w / 7.3), '#4a452c'));
    box(ctx, -w / 2 + 5, 22, w - 10, 18, affordable ? '#2e6650' : '#a58043', 5);
    label(ctx, money(value), 0, 31, Math.min(12, w / 7), '#fff6da');
    if (affordable) {
      ellipse(ctx, w / 2 - 5, -h / 2 + 4, 7, 7, '#2e6650');
      line(ctx, [w / 2 - 8, -h / 2 + 4, w / 2 - 6, -h / 2 + 6, w / 2 - 2, -h / 2 + 1], '#f9f0c9', 1.5);
    }
    ctx.restore();
  }

  private drawLoss(x: number, y: number, title: string, value: number) {
    const ctx = this.ctx;
    const w = Math.min(92, this.width * .78 / 3 - 7);
    ctx.save(); ctx.translate(x, y);
    ellipse(ctx, 2, 31, w * .45, 6, '#572d2129');
    ctx.lineWidth = 1.5;
    polygon(ctx, [-16, -31, 16, -31, 29, -18, 29, 10, 15, 23, -15, 23, -29, 10, -29, -18], '#cf593d', '#71392b');
    polygon(ctx, [-15, -26, 15, -26, 24, -17, 24, 8, 13, 18, -13, 18, -24, 8, -24, -17], '#ed7950');
    // An unpaid receipt with a bold minus, visually separate from bills and business cards.
    polygon(ctx, [-11, -20, 11, -20, 11, 7, 7, 4, 3, 7, -1, 4, -5, 7, -9, 4, -11, 6], '#fff3d8');
    line(ctx, [-6, -11, 6, -11], '#cc573c', 3);
    line(ctx, [-6, -4, 2, -4], '#d89574', 1.5);
    box(ctx, -w / 2, 15, w, 29, '#fff3dd', 7, '#9d4d35');
    const parts = title === 'Неоплаченный счёт' ? ['Неоплаченный', 'счёт'] : title === 'Срыв поставки' ? ['Срыв', 'поставки'] : title === 'Плохая сделка' ? ['Плохая', 'сделка'] : [title || 'Возврат'];
    parts.forEach((part, i) => label(ctx, part, 0, parts.length === 1 ? 29 : 23 + i * 12, Math.min(12, w / (part.length > 10 ? 7.8 : 7)), '#933f2b'));
    if (value > 0 && value < 1) {
      ellipse(ctx, 23, -24, 11, 9, '#a33e2d');
      label(ctx, `−${Math.round(value * 100)}%`, 23, -24, 7.5, '#fff6df');
    }
    ctx.restore();
  }

  private drawEffects(dt: number) {
    const ctx = this.ctx;
    for (const p of this.particles) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 130 * dt;
      if (p.life <= 0 || this.reducedMotion) continue;
      ctx.save(); ctx.globalAlpha = Math.max(0, p.life / p.duration);
      box(ctx, p.x, p.y, p.size, p.size * .6, p.color, 1); ctx.restore();
    }
    this.particles = this.particles.filter(p => p.life > 0);
    this.feedback.forEach((f, index) => {
      f.age += dt;
      if (!f.text) return;
      const isLoss = f.type === 'loss' || f.type === 'hit';
      ctx.save();
      ctx.globalAlpha = Math.min(1, Math.max(0, (1.1 - f.age) * 3));
      const fontSize = Math.min(12, this.width / 30);
      ctx.font = `800 ${fontSize}px "Arial", sans-serif`;
      const w = Math.min(this.width - 24, ctx.measureText(f.text).width + 22);
      const x = Math.max(w / 2 + 8, Math.min(this.width - w / 2 - 8, this.laneX(f.lane)));
      const y = this.height * .61 - (this.reducedMotion ? 0 : f.age * 25) - index * 22;
      box(ctx, x - w / 2, y - 12, w, 25, isLoss ? '#a74731' : '#214e3e', 8);
      label(ctx, f.text, x, y + 1, fontSize, '#fff6d9');
      ctx.restore();
    });
    this.feedback = this.feedback.filter(f => f.age < 1.1);
  }
}
