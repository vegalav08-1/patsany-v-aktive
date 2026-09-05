import { T, mat, box, cyl, sphere } from './graphics.js';
export function addOutfit(g, chest, arms, stage, p, cloth) {
  if (stage === 0) {
    const hood = new T.Mesh(new T.TorusGeometry(.087, .039, 8, 18, Math.PI * 1.6), cloth); hood.position.set(0, 1.451, -.075); hood.rotation.x = Math.PI / 2; g.add(hood);
    box(chest, '#888c80', 0, -.03, .106, .007, .39, .006); box(chest, '#646a61', 0, -.12, .108, .18, .095, .012);
    for (const s of [-1, 1]) box(chest, '#b2afa0', s * .048, .14, .103, .009, .13, .009);
    box(chest, '#797d72', -.105, -.115, .118, .047, .034, .003);
  } else {
    box(chest, p[2], 0, .135, .117, stage >= 3 ? .12 : .08, .22, .01);
    for (const s of [-1, 1]) { const collar = box(chest, stage >= 3 ? p[0] : p[2], s * .045, .19, .139, .055, .115, .012); collar.rotation.z = s * -.34; }
    for (let j = 0; j < 4; j++) sphere(chest, stage >= 3 ? '#b8b2a3' : '#667672', stage >= 3 ? .035 : 0, .13 - j * .085, .126, .009, .009, .004);
    box(chest, stage < 3 ? '#86978f' : p[0], -.116, .065, .107, .063, .055, .011);
    if (stage >= 3) {
      box(chest, stage === 4 ? '#4a5b54' : '#636e75', 0, .095, .137, .026, .17, .009);
      const brief = new T.Group(); arms[1].elbow.add(brief); brief.position.set(.022, -.37, .0);
      box(brief, stage === 4 ? '#634835' : '#3b332a', .05, -.12, 0, .1, .26, .36); box(brief, '#8d7754', .05, -.12, .187, .06, .024, .01);
      const handle = new T.Mesh(new T.TorusGeometry(.05, .008, 6, 12, Math.PI), mat('#49392b')); handle.rotation.y = Math.PI / 2; handle.position.set(.05, .0, 0); brief.add(handle);
    } else if (stage === 2) { box(arms[1].elbow, '#242c2b', 0, -.29, .045, .052, .1, .013); }
    box(g, '#342e28', 0, .968, .085, .30, .024, .014); box(g, '#aa9570', 0, .968, .1, .03, .028, .009);
  }
}
