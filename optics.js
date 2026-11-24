/*
 * optics.js – Rechenlogik für die ABCD-Matrizen-Spielwiese (ohne DOM).
 *
 * Konventionen (siehe PLAN.md, Abschnitt 2):
 *   Strahlvektor s = [x, θ]   x in mm, θ = echter Winkel in rad (paraxial)
 *   Matrix M = [A, B, C, D]   (zeilenweise)
 *   Gesamtmatrix M = M_k · … · M_1
 *   Ausbreitung in jedem Medium: [[1, d], [0, 1]]  (echte Winkel ⇒ kein d/n)
 *   f' > 0 Sammellinse; r > 0, wenn der Krümmungsmittelpunkt rechts liegt.
 *
 * Läuft im Browser (window.Optics) und in Node (module.exports).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Optics = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- 2×2-Matrizen ----------
  const I = [1, 0, 0, 1];
  const mul = (P, Q) => [
    P[0] * Q[0] + P[1] * Q[2], P[0] * Q[1] + P[1] * Q[3],
    P[2] * Q[0] + P[3] * Q[2], P[2] * Q[1] + P[3] * Q[3],
  ];
  const apply = (M, s) => [M[0] * s[0] + M[1] * s[1], M[2] * s[0] + M[3] * s[1]];
  const det = M => M[0] * M[3] - M[1] * M[2];
  const inv = M => { const d = det(M); return [M[3] / d, -M[1] / d, -M[2] / d, M[0] / d]; };

  // ---------- Atome: die elementaren Matrizen ----------
  // prop: Ausbreitung um d im Medium n; lens: dünne Linse; surf: Brechung (r = Infinity → eben)
  const prop = (d, n) => ({ kind: 'prop', d, n });
  const thin = f => ({ kind: 'lens', f });
  const surf = (r, n1, n2) => ({ kind: 'surf', r, n1, n2 });

  function atomMatrix(a) {
    switch (a.kind) {
      case 'prop': return [1, a.d, 0, 1];
      case 'lens': return [1, 0, -1 / a.f, 1];
      case 'surf':
        return isFinite(a.r)
          ? [1, 0, (a.n1 - a.n2) / (a.n2 * a.r), a.n1 / a.n2]
          : [1, 0, 0, a.n1 / a.n2];
    }
    throw new Error('unbekanntes Atom ' + a.kind);
  }

  // ---------- Komponentenregister ----------
  // params: Eingabefelder; atoms(p, nIn): Zerlegung in elementare Matrizen.
  const P_N = { step: 0.05, positive: true };
  const TYPES = {
    space: {
      label: 'Freiraum', optical: false,
      params: [{ key: 'd', sym: 'd', unit: 'mm', step: 10, min: 0 }],
      defaults: { d: 50 },
      atoms: (p, n) => [prop(p.d, n)],
    },
    lens: {
      label: 'Dünne Linse', optical: true,
      params: [{ key: 'f', sym: 'f′', unit: 'mm', step: 10, nonzero: true }],
      defaults: { f: 100 },
      atoms: p => [thin(p.f)],
    },
    flat: {
      label: 'Ebene Fläche', optical: true,
      params: [Object.assign({ key: 'n2', sym: 'n₂' }, P_N)],
      defaults: { n2: 1.5 },
      atoms: (p, n) => [surf(Infinity, n, p.n2)],
    },
    sphere: {
      label: 'Kugelfläche', optical: true,
      params: [
        { key: 'r', sym: 'r', unit: 'mm', step: 10, nonzero: true },
        Object.assign({ key: 'n2', sym: 'n₂' }, P_N),
      ],
      defaults: { r: 50, n2: 1.5 },
      atoms: (p, n) => [surf(p.r, n, p.n2)],
    },
    block: {
      label: 'Glasblock', optical: true, composite: true,
      params: [
        { key: 'd', sym: 'd', unit: 'mm', step: 5, min: 0 },
        Object.assign({ key: 'n', sym: 'n' }, P_N),
      ],
      defaults: { d: 40, n: 1.5 },
      atoms: (p, n) => [surf(Infinity, n, p.n), prop(p.d, p.n), surf(Infinity, p.n, n)],
    },
    thick: {
      label: 'Dicke Linse', optical: true, composite: true,
      params: [
        { key: 'r1', sym: 'r₁', unit: 'mm', step: 10, nonzero: true },
        { key: 'r2', sym: 'r₂', unit: 'mm', step: 10, nonzero: true },
        { key: 'd', sym: 'd', unit: 'mm', step: 2, min: 0 },
        Object.assign({ key: 'n', sym: 'n' }, P_N),
      ],
      defaults: { r1: 60, r2: -60, d: 20, n: 1.5 },
      atoms: (p, n) => [surf(p.r1, n, p.n), prop(p.d, p.n), surf(p.r2, p.n, n)],
    },
  };

  function validParam(param, v) {
    if (typeof v !== 'number' || !isFinite(v)) return false;
    if (param.min !== undefined && v < param.min) return false;
    if (param.nonzero && v === 0) return false;
    if (param.positive && v <= 0) return false;
    return true;
  }

  // ---------- System aufbauen ----------
  // elements: [{ type, p: {...} }]; Startmedium n = 1 (Objekt in Luft).
  function build(elements, nStart = 1) {
    let n = nStart, z = 0, Mcum = I;
    const steps = [];
    elements.forEach((el, index) => {
      const type = TYPES[el.type];
      const nIn = n, z0 = z;
      let M = I;
      const subs = type.atoms(el.p, n).map(atom => {
        const m = atomMatrix(atom);
        const s = { atom, M: m, z0: z, z1: z + (atom.kind === 'prop' ? atom.d : 0) };
        M = mul(m, M);
        z = s.z1;
        if (atom.kind === 'surf') n = atom.n2;
        return s;
      });
      Mcum = mul(M, Mcum);
      steps.push({ index, el, type, nIn, nOut: n, z0, z1: z, M, Mcum, subs });
    });
    // z der letzten brechenden Stelle (Linse/Fläche); null, wenn es keine gibt
    let zLast = null;
    steps.forEach(st => st.subs.forEach(s => { if (s.atom.kind !== 'prop') zLast = s.z0; }));
    return { steps, zEnd: z, nStart, nEnd: n, M: Mcum, zLast };
  }

  // ---------- Strahlverfolgung ----------
  function traceRay(sys, s0) {
    let s = s0.slice();
    const pts = [[0, s[0]]];
    const per = sys.steps.map(st => {
      const sIn = s;
      const subs = st.subs.map(sub => {
        const a = s;
        s = apply(sub.M, s);
        if (sub.z1 > sub.z0) pts.push([sub.z1, s[0]]);
        return { in: a, out: s };
      });
      return { in: sIn, out: s, subs };
    });
    return { pts, per, out: s };
  }

  // ---------- Abgeleitete Größen ----------
  const EPS = 1e-12;

  function systemInfo(M) {
    const [A, B, C, D] = M;
    const afocal = Math.abs(C) < 1e-10;
    return { A, B, C, D, det: det(M), afocal, f: afocal ? Infinity : -1 / C };
  }

  // Bild der Startebene: zusätzliche Strecke t hinter dem Systemende mit B + t·D = 0.
  function imageInfo(sys) {
    if (sys.zLast === null) return null;
    const [A, B, C, D] = sys.M;
    if (Math.abs(D) < EPS) return { atInfinity: true, zLast: sys.zLast };
    const t = -B / D;
    const zImg = sys.zEnd + t;
    return {
      atInfinity: false, t, zImg, zLast: sys.zLast,
      beta: A + t * C,
      real: zImg >= sys.zLast - 1e-9,
    };
  }

  // Letzten Freiraum so setzen, dass die Beobachtungsebene in der Bildebene liegt (B = 0).
  function focusScreen(elements) {
    const im = imageInfo(build(elements));
    if (!im || im.atInfinity) return null;
    const els = elements.map(e => Object.assign({}, e, { p: Object.assign({}, e.p) }));
    const last = els[els.length - 1];
    if (last && last.type === 'space') {
      const d = last.p.d + im.t;
      if (d < 0) return null;
      last.p.d = d;
    } else {
      if (im.t < 0) return null;
      els.push({ type: 'space', p: { d: im.t } });
    }
    return els;
  }

  return {
    I, mul, apply, det, inv, atomMatrix, TYPES, validParam,
    build, traceRay, systemInfo, imageInfo, focusScreen,
  };
});
