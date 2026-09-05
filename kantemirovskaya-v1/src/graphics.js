import * as T from '../vendor/three.module.min.js';
export { T };
const mats = new Map(), geoms = new Map();
export function mat(color, roughness = .8, metalness = 0) {
  const key = color + ':' + roughness + ':' + metalness;
  if (!mats.has(key)) mats.set(key, new T.MeshStandardMaterial({ color, roughness, metalness }));
  return mats.get(key);
}
export function mesh(g, geometry, material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new T.Mesh(geometry, typeof material === 'string' ? mat(material) : material);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
}
export function isSharedGeometry(g) { return [...geoms.values()].includes(g); }
function geo(name, make) { if (!geoms.has(name)) geoms.set(name, make()); return geoms.get(name); }
export const box = (g, m, x, y, z, w, h, d) => mesh(g, geo('box', () => new T.BoxGeometry()), m, x, y, z, w, h, d);
export const sphere = (g, m, x, y, z, w, h = w, d = w) => mesh(g, geo('sphere', () => new T.SphereGeometry(1, 16, 12)), m, x, y, z, w, h, d);
export const cyl = (g, m, x, y, z, r, h, rt = r) => mesh(g, geo('cyl' + rt / r, () => new T.CylinderGeometry(rt / r, 1, 1, 12)), m, x, y, z, r, h, r);
export function texture(canvas) { const t = new T.CanvasTexture(canvas); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; }
export function canvasTexture(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return texture(c); }
export function noiseTexture(type) {
  return canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = type === 'grass' ? '#79816a' : type === 'road' ? '#62656a' : '#b4b4aa'; c.fillRect(0, 0, w, h);
    let seed = 7919; const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 19000; i++) { const a = random() * .22; c.fillStyle = random() > .5 ? `rgba(255,255,240,${a})` : `rgba(15,24,19,${a})`; const x = random() * w, y = random() * h; c.fillRect(x, y, 1, type === 'grass' ? random() * 5 + 1 : 1); }
    if (type === 'walk') { c.strokeStyle = '#92958e'; c.lineWidth = 1; for (let y = 0; y < 256; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke(); for (let x = (y % 64 ? 32 : 0); x < 256; x += 64) c.strokeRect(x, y, 64, 32); } }
  });
}
export function label(text, bg = '#183f37', fg = '#fff7e8', w = 512, h = 128) {
  return canvasTexture(w, h, (c, width, height) => { c.fillStyle = bg; c.fillRect(0, 0, width, height); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `600 ${Math.min(height * .36, width / Math.max(3, text.length) * 1.5)}px Arial`; c.fillText(text, width / 2, height / 2, width * .91); });
}
export function sign(g, text, x, y, z, w = 3.2, h = .7, ry = 0, bg) {
  const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ map: label(text, bg), roughness: .75, side: T.DoubleSide })); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m;
}
/** Share materials within spatial cells so off-screen facades can be culled. */
export function batchStatic(root, cellSize = 0) {
  root.updateMatrixWorld(true); const invRoot = root.matrixWorld.clone().invert(); const batches = new Map(), remove = [];
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || o.userData.dynamic) return;
    const position = new T.Vector3().setFromMatrixPosition(o.matrixWorld).applyMatrix4(invRoot);
    const cell = cellSize ? ':' + Math.floor(position.x / cellSize) + ':' + Math.floor(position.z / cellSize) : '';
    const k = o.material.uuid + ':' + o.castShadow + cell;
    if (!batches.has(k)) batches.set(k, { material: o.material, shadow: o.castShadow, geometries: [] });
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(new T.Matrix4().multiplyMatrices(invRoot, o.matrixWorld)); batches.get(k).geometries.push(g); remove.push(o);
  });
  remove.forEach(o => o.removeFromParent());
  for (const b of batches.values()) {
    const g = new T.BufferGeometry();
    for (const name of ['position', 'normal', 'uv']) {
      const size = name === 'uv' ? 2 : 3;
      const total = b.geometries.reduce((n, g) => n + g.getAttribute('position').count * size, 0); const a = new Float32Array(total); let offset = 0;
      for (const s of b.geometries) { const attr = s.getAttribute(name); if (attr) a.set(attr.array, offset); offset += s.getAttribute('position').count * size; }
      g.setAttribute(name, new T.BufferAttribute(a, size));
    }
    g.computeBoundingSphere(); const m = new T.Mesh(g, b.material); m.castShadow = b.shadow; m.receiveShadow = true; root.add(m); b.geometries.forEach(g => g.dispose());
  }
}
export function car(root, x, z, color = '#5d6869', angle = 0, premium = false) {
  const g = new T.Group(); root.add(g); g.position.set(x, 0, z); g.rotation.y = angle;
  const paint = mat(color, .29, .3), glass = mat('#263b45', .18, .4), black = mat('#222629'), chrome = mat('#bec5c3', .3, .75);
  box(g, paint, 0, .62, 0, 1.85, .6, premium ? 4.8 : 4.2); box(g, paint, 0, 1.12, -.15, 1.65, .5, 2.25);
  box(g, glass, 0, 1.22, -.13, 1.68, .42, 1.96); box(g, paint, 0, 1.48, -.1, 1.65, .07, 1.95);
  for (const s of [-1, 1]) { for (const zz of [-1.35, 1.3]) { const wheel = cyl(g, black, s * .9, .4, zz, .34, .2); wheel.rotation.z = Math.PI / 2; const rim = cyl(g, chrome, s * 1.01, .4, zz, .19, .025); rim.rotation.z = Math.PI / 2; }
    box(g, paint, s * .848, 1.25, -.1, .035, .43, .11); box(g, chrome, s * .94, .86, .35, .015, .03, .22); box(g, mat('#e5e2c0', .3), s * .61, .68, premium ? 2.407 : 2.107, .48, .15, .025); box(g, '#843633', s * .61, .68, premium ? -2.407 : -2.107, .45, .16, .025);
  }
  box(g, '#20292c', 0, .57, premium ? 2.42 : 2.12, .65, .15, .02); return g;
}
