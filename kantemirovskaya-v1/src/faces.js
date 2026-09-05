import { T } from './graphics.js';
import { HEROES } from './model.js';
export const faceTextures = new Map();
export async function loadFaces() {
  await Promise.all(HEROES.map(async h => {
    const image = new Image(); image.src = new URL(`../assets/head-${h.id}.webp`, import.meta.url).href;
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Не удалось загрузить лицо: ' + h.id)); });
    const t = new T.Texture(image); t.colorSpace = T.SRGBColorSpace; t.needsUpdate = true; t.anisotropy = 4; faceTextures.set(h.id, t);
  }));
}
function faceGeometry() {
  const positions = [], uvs = [], indices = [], cols = 24, rows = 28;
  for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
    const u = c / cols, v = r / rows, x = u * 2 - 1, y = v * 2 - 1;
    positions.push(x * .168, y * .218, .03 + .143 * Math.sqrt(Math.max(.03, 1 - .91 * x * x - .2 * y * y))); uvs.push(u, v);
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const a = r * (cols + 1) + c, b = a + cols + 1; indices.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); g.setIndex(indices); g.computeVertexNormals(); return g;
}
export const faceGeo = faceGeometry();
