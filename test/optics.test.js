// Tests der Rechenlogik:  node --test test/
const test = require('node:test');
const assert = require('node:assert');
const O = require('../optics.js');

const S = d => ({ type: 'space', p: { d } });
const L = f => ({ type: 'lens', p: { f } });
const close = (a, b, tol = 1e-9, msg) =>
  assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${msg || ''} erwartet ${b}, erhalten ${a}`);
const closeM = (M, E, tol) => M.forEach((v, i) => close(v, E[i], tol, `Eintrag ${'ABCD'[i]}:`));

test('Grundmatrizen wie auf Folie 13–15 und 18', () => {
  closeM(O.atomMatrix({ kind: 'prop', d: 7, n: 1 }), [1, 7, 0, 1]);
  closeM(O.atomMatrix({ kind: 'lens', f: 50 }), [1, 0, -0.02, 1]);
  closeM(O.atomMatrix({ kind: 'surf', r: Infinity, n1: 1, n2: 1.5 }), [1, 0, 0, 1 / 1.5]);
  // Kugelfläche: C = (n − n')/(n'·r), D = n/n'
  closeM(O.atomMatrix({ kind: 'surf', r: 50, n1: 1, n2: 1.5 }), [1, 0, (1 - 1.5) / (1.5 * 50), 1 / 1.5]);
});

test('Linsengleichung: g = 150, f = 100 ⇒ b = 300, B = 0, β = −2', () => {
  const sys = O.build([S(150), L(100), S(300)]);
  close(sys.M[1], 0, 1e-9);
  close(sys.M[0], -2);
  const im = O.imageInfo(sys);
  close(im.zImg, 450); close(im.beta, -2); assert.ok(im.real);
});

test('2f–2f: β = −1', () => {
  const sys = O.build([S(100), L(50), S(100)]);
  closeM(sys.M, [-1, 0, -0.02, -1]);
});

test('Lupe: virtuelles, aufrechtes Bild', () => {
  const im = O.imageInfo(O.build([S(60), L(100), S(100)]));
  close(im.zImg, 60 - 150); close(im.beta, 2.5); assert.equal(im.real, false);
});

test('Glasblock (Folie 17): B enthält d/n, det = 1', () => {
  const sys = O.build([S(50), { type: 'block', p: { d: 40, n: 1.5 } }, S(50)]);
  closeM(sys.M, [1, 100 + 40 / 1.5, 0, 1]);
  closeM(sys.steps[1].M, [1, 40 / 1.5, 0, 1]);
  close(O.det(sys.M), 1);
});

test('det M = n_Start / n_Ende', () => {
  const sys = O.build([S(10), { type: 'flat', p: { n2: 1.5 } }, S(10)]);
  close(O.det(sys.M), 1 / 1.5);
  assert.equal(sys.nEnd, 1.5);
});

test('Teleskop (Folie 19): C = 0, A = −f2/f1, D = −f1/f2', () => {
  const f1 = 100, f2 = -50, d1 = 30, d3 = 70;
  const sys = O.build([S(d1), L(f1), S(f1 + f2), L(f2), S(d3)]);
  closeM(sys.M, [-f2 / f1, f1 + f2 - d1 * f2 / f1 - d3 * f1 / f2, 0, -f1 / f2]);
  assert.ok(O.systemInfo(sys.M).afocal);
});

test('Dicke Linse: Linsenschleiferformel', () => {
  const r1 = 60, r2 = -60, d = 20, n = 1.5;
  const sys = O.build([{ type: 'thick', p: { r1, r2, d, n } }]);
  const P = (n - 1) * (1 / r1 - 1 / r2 + (n - 1) * d / (n * r1 * r2));
  close(O.systemInfo(sys.M).f, 1 / P, 1e-9);
  close(O.det(sys.M), 1);
  // Grenzfall d → 0 ⇒ dünne Linse
  const thin = O.build([{ type: 'thick', p: { r1, r2, d: 0, n } }]);
  close(thin.M[2], -(n - 1) * (1 / r1 - 1 / r2));
});

test('Strahlverfolgung: Parallelstrahl schneidet die Achse im Brennpunkt', () => {
  const sys = O.build([S(20), L(80), S(80)]);
  const tr = O.traceRay(sys, [5, 0]);
  close(tr.out[0], 0, 1e-12);
  assert.deepStrictEqual(tr.pts.map(p => p[0]), [0, 20, 100]);
  close(tr.per[1].out[1], -5 / 80);
});

test('Inverse: M⁻¹·M = I', () => {
  const sys = O.build([S(30), L(40), S(10), { type: 'sphere', p: { r: -25, n2: 1.6 } }, S(5)]);
  closeM(O.mul(O.inv(sys.M), sys.M), [1, 0, 0, 1], 1e-12);
});

test('Schirm ins Bild setzt den letzten Freiraum', () => {
  const els = O.focusScreen([S(150), L(100), S(200)]);
  close(els[2].p.d, 300, 1e-6);
  assert.equal(O.focusScreen([S(60), L(100), S(100)]), null); // virtuell → nicht möglich
});
