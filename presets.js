// Beispielaufbauten (Längen in mm, Winkel in rad)
//
// Strahlen im Modus "Vom Objekt":
//   Strahl 1: vom Objektpunkt (Höhe h) achsparallel
//   Strahl 2: vom Objektpunkt unter θ (hier meist durch die Mitte der ersten Linse)
//   Strahl 3: vom Achsenpunkt unter u (Randstrahl)
const PRESETS = (function () {
  const S = d => ({ type: 'space', p: { d } });
  const L = f => ({ type: 'lens', p: { f } });
  // Strahl 2 zielt auf die Mitte des ersten Elements bei z = g
  const obj = (h, g, u, on) => ({ mode: 'object', h, theta: -h / g, u, on: on || [true, true, true] });
  const free = (rays, on) => ({ mode: 'free', free: rays.map(([x, t]) => ({ x, t })), on: on || [true, true, true] });

  return [
    {
      name: 'Einzellinse – reelle Abbildung',
      elements: [S(150), L(100), S(300)],
      rays: obj(10, 150, 0.05),
    },
    {
      name: '2f–2f-Abbildung (β = −1)',
      elements: [S(100), L(50), S(100)],
      rays: obj(10, 100, 0.08),
    },
    {
      name: 'Lupe – virtuelles Bild',
      elements: [S(60), L(100), S(100)],
      rays: obj(10, 60, 0.1),
    },
    {
      name: 'Glasblock',
      elements: [S(50), { type: 'block', p: { d: 40, n: 1.5 } }, S(50)],
      rays: free([[0, 0.2], [-8, 0.2], [8, 0]], [true, true, false]),
      view: { showImage: false },
    },
    {
      name: 'Brechung an ebener Fläche',
      elements: [S(60), { type: 'flat', p: { n2: 1.5 } }, S(80)],
      rays: free([[0, 0.2], [6, -0.1], [-6, 0.1]], [true, true, false]),
      view: { showImage: false },
    },
    {
      name: 'Kugelfläche – Glasstab',
      elements: [S(200), { type: 'sphere', p: { r: 50, n2: 1.5 } }, S(200)],
      rays: obj(5, 200, 0.03),
      autoScreen: true,
    },
    {
      name: 'Dicke Linse',
      elements: [S(150), { type: 'thick', p: { r1: 60, r2: -60, d: 20, n: 1.5 } }, S(200)],
      rays: obj(10, 160, 0.05),
      autoScreen: true,
    },
    {
      name: 'Kepler-Teleskop',
      elements: [S(50), L(100), S(150), L(50), S(80)],
      rays: free([[8, 0], [0, 0.05], [-8, 0]]),
      view: { showImage: false },
    },
    {
      name: 'Galilei-Teleskop',
      elements: [S(50), L(100), S(50), L(-50), S(80)],
      rays: free([[8, 0], [0, 0.05], [-8, 0]]),
      view: { showImage: false },
    },
    {
      name: 'Mikroskop, unendlich korrigiert',
      elements: [S(10), L(10), S(100), L(160), S(160)],
      rays: obj(1, 10, 0.2),
    },
  ];
})();
