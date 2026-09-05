import { T, mat, box, cyl, mesh } from './graphics.js';
import { RoundedBoxGeometry } from '../vendor/addons/geometries/RoundedBoxGeometry.js';

function rounded(parent, material, x, y, z, width, height, depth, radius = 0.06) {
  return mesh(parent, new RoundedBoxGeometry(width, height, depth, 3, radius), material, x, y, z);
}

export function car(parent, x, z, color = '#434c4d', angle = 0, premium = false) {
  const group = new T.Group();
  parent.add(group);
  group.position.set(x, 0, z);
  group.rotation.y = angle;
  const length = premium ? 4.85 : 4.32;
  const paint = new T.MeshPhysicalMaterial({ color, metalness: 0.48, roughness: 0.29, clearcoat: 1, clearcoatRoughness: 0.11 });
  const glass = new T.MeshPhysicalMaterial({ color: '#263c47', metalness: 0.19, roughness: 0.13, clearcoat: 1 });
  const rubber = mat('#161b1d', 0.95);
  const chrome = mat('#bbc4c4', 0.25, 0.85);
  const dark = mat('#292f30', 0.62, 0.32);
  rounded(group, paint, 0, 0.63, 0, 1.80, 0.57, length, 0.19);
  rounded(group, paint, 0, 0.85, 0.99, 1.72, 0.24, length * 0.36, 0.10);
  rounded(group, paint, 0, 0.89, -1.49, 1.71, 0.22, 0.90, 0.075);
  const cabin = new T.BufferGeometry();
  cabin.setAttribute('position', new T.Float32BufferAttribute([
    -0.78,0.88,1.03, 0.78,0.88,1.03, -0.66,1.43,0.34, 0.66,1.43,0.34,
    -0.66,1.43,-0.88, 0.66,1.43,-0.88, -0.78,0.9,-1.46, 0.78,0.9,-1.46
  ], 3));
  cabin.setIndex([0,1,2,1,3,2,2,3,4,3,5,4,4,5,6,5,7,6,0,2,6,2,4,6,1,7,3,3,7,5]);
  cabin.computeVertexNormals();
  mesh(group, cabin, glass);
  rounded(group, paint, 0, 1.445, -0.28, 1.38, 0.074, 1.34, 0.06);
  for (const side of [-1, 1]) {
    box(group, paint, side * 0.739, 1.17, -0.39, 0.055, 0.54, 0.075);
    box(group, chrome, side * 0.84, 0.94, -0.15, 0.023, 0.024, 2.28);
    rounded(group, paint, side * 0.94, 1.105, 0.62, 0.20, 0.10, 0.18, 0.035);
    for (const offset of [-0.82, 0.32]) rounded(group, chrome, side * 0.895, 0.80, offset, 0.025, 0.025, 0.17, 0.008);
    for (const offset of [-length * 0.29, length * 0.30]) {
      const wheel = new T.Group();
      group.add(wheel);
      wheel.position.set(side * 0.87, 0.355, offset);
      wheel.rotation.z = Math.PI / 2;
      mesh(wheel, new T.TorusGeometry(0.252, 0.092, 12, 32), rubber).rotation.x = Math.PI / 2;
      cyl(wheel, dark, 0, 0, 0, 0.25, 0.18);
      cyl(wheel, chrome, 0, side * 0.105, 0, 0.212, 0.019);
      cyl(wheel, dark, 0, side * 0.118, 0, 0.174, 0.01);
      for (let index = 0; index < 10; index++) {
        const rotation = index / 10 * Math.PI * 2;
        const spoke = box(wheel, chrome, Math.sin(rotation) * 0.105, side * 0.13, Math.cos(rotation) * 0.105, 0.022, 0.014, 0.19);
        spoke.rotation.y = rotation;
      }
      cyl(wheel, chrome, 0, side * 0.14, 0, 0.046, 0.023);
    }
    rounded(group, mat('#e2e4da',0.22,0.28), side * 0.58, 0.744, length / 2 - 0.045, 0.48, 0.15, 0.084, 0.036);
    rounded(group, mat('#8c2b28',0.3,0.2), side * 0.58, 0.74, -length / 2 + 0.045, 0.47, 0.135, 0.06, 0.026);
    for (const offset of [-0.42,0.85]) box(group, dark, side * 0.904, 0.67, offset, 0.006, 0.37, 0.011);
  }
  rounded(group, dark, 0, 0.53, length / 2 + 0.003, 0.89, 0.25, 0.035, 0.035);
  for (let index = 0; index < 7; index++) box(group, chrome, -0.36 + index * 0.12, 0.55, length / 2 + 0.025, 0.022, 0.19, 0.011);
  rounded(group, mat('#cbd2cc',0.6), 0, 0.48, length / 2 + 0.032, 0.39, 0.102, 0.014, 0.005);
  return group;
}
