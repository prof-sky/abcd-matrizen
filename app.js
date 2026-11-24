/* app.js – Zustand, Darstellung (SVG + MathML) und Interaktion */
(function () {
  'use strict';
  const O = window.Optics;
  const TYPES = O.TYPES;
  const $ = s => document.querySelector(s);
  const clone = o => JSON.parse(JSON.stringify(o));

  // =====================================================================
  // Formatierung
  // =====================================================================
  const SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  function fmt(v, p = 4) {
    if (v === undefined || v === null || Number.isNaN(v)) return '–';
    if (!isFinite(v)) return v > 0 ? '∞' : '−∞';
    const a = Math.abs(v);
    if (a < 1e-10) return '0';
    let s;
    if (a >= 1e6 || a < 1e-4) {
      const [m, e] = v.toExponential(Math.max(p - 2, 1)).split('e');
      s = String(Number(m)) + '·10' + String(Number(e)).split('').map(c => SUP[c]).join('');
    } else {
      s = String(Number(v.toPrecision(p)));
    }
    return s.replace('-', '−').replace('.', ',');
  }
  const fmtP = v => (v < 0 ? `(${fmt(v)})` : fmt(v));
  const deg = t => fmt(t * 180 / Math.PI, 3);
  const inputVal = v => String(Number(Number(v).toPrecision(6)));

  // =====================================================================
  // MathML-Bausteine
  // =====================================================================
  const mi = s => `<mi>${s}</mi>`;
  const mn = s => `<mn>${s}</mn>`;
  const mo = s => `<mo>${s}</mo>`;
  const row = (...a) => `<mrow>${a.join('')}</mrow>`;
  const frac = (a, b) => `<mfrac>${a}${b}</mfrac>`;
  const sub = (a, b) => `<msub>${a}${b}</msub>`;
  const math = x => `<math>${x}</math>`;
  const num = v => (v < 0 ? row(mo('−'), mn(fmt(-v))) : mn(fmt(v)));
  const numP = v => (v < 0 ? row(mo('('), num(v), mo(')')) : num(v));
  const mat = e => row(
    '<mo fence="true">(</mo>',
    `<mtable><mtr><mtd>${e[0]}</mtd><mtd>${e[1]}</mtd></mtr><mtr><mtd>${e[2]}</mtd><mtd>${e[3]}</mtd></mtr></mtable>`,
    '<mo fence="true">)</mo>');
  const matN = M => mat(M.map(num));
  const ONE = mn('1'), ZERO = mn('0');
  const SYM = {
    d: mi('d'), r: mi('r'), n: mi('n'),
    f: `<msup><mi>f</mi><mo>′</mo></msup>`,
    n1: sub(mi('n'), mn('1')), n2: sub(mi('n'), mn('2')),
  };
  const Msub = k => sub(mi('M'), mn(k));

  // Matrixeinträge eines Atoms – symbolisch oder mit eingesetzten Zahlen
  function atomEntries(a, numeric) {
    const V = k => (numeric ? numP(a[k]) : SYM[k]);
    switch (a.kind) {
      case 'prop': return [ONE, V('d'), ZERO, ONE];
      case 'lens': return [ONE, ZERO, row(mo('−'), frac(ONE, V('f'))), ONE];
      default:
        return isFinite(a.r)
          ? [ONE, ZERO, frac(row(V('n1'), mo('−'), V('n2')), row(V('n2'), mo('·'), V('r'))), frac(V('n1'), V('n2'))]
          : [ONE, ZERO, ZERO, frac(V('n1'), V('n2'))];
    }
  }
  // Matrixeinträge eines Elements; null, wenn es keine kompakte Formel gibt
  function elementEntries(st, numeric) {
    if (st.subs.length === 1) return atomEntries(st.subs[0].atom, numeric);
    if (st.el.type === 'block') {
      const p = st.el.p;
      const d = numeric ? numP(p.d) : SYM.d, n = numeric ? numP(p.n) : SYM.n;
      const B = st.nIn === 1 ? frac(d, n) : frac(row(numeric ? numP(st.nIn) : SYM.n1, mo('·'), d), n);
      return [ONE, B, ZERO, ONE];
    }
    return null;
  }
  function prodSym(k, from = 1) {
    const n = k - from + 1;
    if (n <= 0) return mi('I');
    if (n <= 5) {
      const parts = [];
      for (let j = k; j >= from; j--) parts.push(Msub(j));
      return row(parts.join(mo('·')));
    }
    return row(Msub(k), mo('·'), Msub(k - 1), mo('·'), mo('…'), mo('·'), Msub(from));
  }
  function atomLabel(a) {
    if (a.kind === 'prop') return `Strecke d = ${fmt(a.d)} mm im Medium n = ${fmt(a.n)}`;
    if (a.kind === 'lens') return `Dünne Linse f′ = ${fmt(a.f)} mm`;
    return isFinite(a.r)
      ? `Kugelfläche r = ${fmt(a.r)} mm, n ${fmt(a.n1)} → ${fmt(a.n2)}`
      : `Ebene Fläche, n ${fmt(a.n1)} → ${fmt(a.n2)}`;
  }
  const paramSummary = st => st.type.params
    .map(p => `${p.sym} = ${fmt(st.el.p[p.key])}${p.unit ? ' ' + p.unit : ''}`).join(', ');

  // x_k = A·x_{k−1} + B·θ_{k−1},  θ_k = C·x_{k−1} + D·θ_{k−1}
  function eqMath(E, k, kIn) {
    const x = i => sub(mi('x'), mn(i)), t = i => sub(mi('θ'), mn(i));
    return `<div class="eq">${math(row(x(k), mo('='), E[0], mo('·'), x(kIn), mo('+'), E[1], mo('·'), t(kIn)))}</div>` +
      `<div class="eq">${math(row(t(k), mo('='), E[2], mo('·'), x(kIn), mo('+'), E[3], mo('·'), t(kIn)))}</div>`;
  }
  function rayLines(M, ins, outs, k, kIn) {
    return shownRays().map(r => {
      const [x, t] = ins[r], [xo, to] = outs[r];
      return `<div class="rayline r${r}"><b>Strahl ${r + 1}:</b> ` +
        `x<sub>${k}</sub> = ${fmt(M[0])}·${fmtP(x)} + ${fmt(M[1])}·${fmtP(t)} = <b>${fmt(xo)} mm</b><br>` +
        `<span style="visibility:hidden"><b>Strahl ${r + 1}:</b> </span>` +
        `θ<sub>${k}</sub> = ${fmt(M[2])}·${fmtP(x)} + ${fmt(M[3])}·${fmtP(t)} = <b>${fmt(to)} rad</b> ` +
        `<span class="muted">(${deg(to)}°)</span></div>`;
    }).join('');
  }

  // =====================================================================
  // Zustand
  // =====================================================================
  // Modus 'object': Strahl 1 achsparallel und Strahl 2 unter θ, beide vom Objektpunkt (h);
  //                 Strahl 3 vom Achsenpunkt unter u (Randstrahl).
  // Modus 'free':   drei frei wählbare Startvektoren.
  const NRAYS = 3;
  const DEFAULT_RAYS = {
    mode: 'object', h: 10, theta: -0.05, u: 0.1,
    free: [{ x: 5, t: 0 }, { x: 0, t: 0.05 }, { x: -5, t: 0 }],
    on: [true, true, true],
  };
  // ältere Zustände (zwei Strahlen, Modi point/marginal) übernehmen
  function normRays(r) {
    const out = Object.assign(clone(DEFAULT_RAYS), r || {});
    if (out.mode !== 'free') out.mode = 'object';
    const free = Array.isArray(out.free) ? out.free.slice(0, NRAYS) : [];
    while (free.length < NRAYS) free.push(clone(DEFAULT_RAYS.free[free.length]));
    out.free = free;
    const on = Array.isArray(out.on) ? out.on.slice(0, NRAYS) : [];
    while (on.length < NRAYS) on.push(true);
    out.on = on;
    return out;
  }
  const shownRays = () => [0, 1, 2].filter(k => state.rays.on[k]);
  const DEFAULT_VIEW = { showImage: true, formulas: false };
  const ui = { cum: false, inv: false };
  let state;

  function firstOptical(elements) {
    const i = elements.findIndex(e => e.type !== 'space');
    return i < 0 ? (elements.length ? 0 : null) : i;
  }
  function fromPreset(p) {
    const s = {
      elements: clone(p.elements),
      rays: normRays(clone(p.rays || {})),
      view: Object.assign({}, DEFAULT_VIEW, p.view || {}),
      sel: null,
    };
    if (p.autoScreen) { const f = O.focusScreen(s.elements); if (f) s.elements = f; }
    s.sel = firstOptical(s.elements);
    return s;
  }
  function loadHash() {
    try {
      if (location.hash.length < 3) return null;
      // Kurzform  #p=3  (Beispiel 3), optional &f=1 (Formeln im Bild) und &s=2 (Element 2 ausgewählt)
      const short = /^#p=(\d+)(.*)$/.exec(location.hash);
      if (short && PRESETS[+short[1]]) {
        const s = fromPreset(PRESETS[+short[1]]);
        const q = new URLSearchParams(short[2].replace(/^&/, ''));
        if (q.get('f') === '1') s.view.formulas = true;
        if (q.has('s')) s.sel = Math.min(+q.get('s') - 1, s.elements.length - 1);
        s.preset = +short[1];
        return s;
      }
      const o = JSON.parse(decodeURIComponent(location.hash.slice(1)));
      const elements = (o.e || []).filter(x => TYPES[x.t])
        .map(x => ({ type: x.t, p: Object.assign(clone(TYPES[x.t].defaults), x.p) }));
      const rays = normRays(o.r);
      return { elements, rays, view: Object.assign({}, DEFAULT_VIEW, o.v || {}), sel: firstOptical(elements) };
    } catch (e) {
      return null;
    }
  }
  let hashTimer = null;
  function saveHash() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(() => {
      const s = JSON.stringify({ e: state.elements.map(x => ({ t: x.type, p: x.p })), r: state.rays, v: state.view });
      const h = '#' + encodeURIComponent(s);
      try { history.replaceState(null, '', h); } catch (e) { location.replace(h); }
    }, 300);
  }

  function rayStarts() {
    const r = state.rays;
    if (r.mode === 'free') return r.free.map(f => [f.x, f.t]);
    return [[r.h, 0], [r.h, r.theta], [0, r.u]];
  }
  // Winkelgriffe: welcher Strahl, welcher Parameter (nur sichtbare Strahlen)
  function angleTargets() {
    const list = state.rays.mode === 'free'
      ? [0, 1, 2].map(k => ({ ray: k, path: `free.${k}.t` }))
      : [{ ray: 1, path: 'theta' }, { ray: 2, path: 'u' }];
    return list.filter(t => state.rays.on[t.ray]);
  }
  const getPath = (o, p) => p.split('.').reduce((a, k) => a[k], o);
  function setPath(o, p, v) {
    const ks = p.split('.'), last = ks.pop();
    ks.reduce((a, k) => a[k], o)[last] = v;
  }

  // =====================================================================
  // Rendern
  // =====================================================================
  function render() {
    const sys = O.build(state.elements);
    const starts = rayStarts();
    const traces = starts.map(s => O.traceRay(sys, s));
    const im = O.imageInfo(sys);
    if (state.sel !== null && state.sel >= sys.steps.length) state.sel = sys.steps.length ? sys.steps.length - 1 : null;
    renderSvg(sys, traces, im, starts);
    renderCards(sys);
    renderDetails(sys, traces);
    renderSystem(sys, im);
    renderControls();
    saveHash();
  }

  // ---------------------------------------------------------------------
  // SVG
  // ---------------------------------------------------------------------
  const W = 1000, H = 440, PL = 62, PR = 28, AXY = 210, HALF = 150;
  const YT = AXY - HALF, YB = AXY + HALF, LH = HALF * 0.9;
  let lastView = null, frozenView = null;

  const f1 = v => (Math.round(v * 10) / 10).toString();
  const ln = (x1, y1, x2, y2, cls = '', extra = '') =>
    `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}"${cls ? ` class="${cls}"` : ''} ${extra}/>`;
  const tx = (x, y, s, cls = '', extra = '') =>
    `<text x="${f1(x)}" y="${f1(y)}"${cls ? ` class="${cls}"` : ''} ${extra}>${s}</text>`;
  function nice(x) {
    const p = Math.pow(10, Math.floor(Math.log10(x)));
    const m = x / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }
  const sagPx = r => Math.sign(r) * Math.min(26, 2600 / Math.abs(r));
  function arrowV(x, y0, y1, cls) {
    const dir = Math.sign(y1 - y0) || -1, a = 9;
    const tip = `${f1(x)},${f1(y1)}`;
    return `<g class="arrow ${cls}">${ln(x, y0, x, y1 - dir * a * 0.6)}` +
      `<polygon points="${f1(x - 5)},${f1(y1 - dir * a)} ${tip} ${f1(x + 5)},${f1(y1 - dir * a)}"/></g>`;
  }

  function renderSvg(sys, traces, im, starts) {
    const r = state.rays, free = r.mode === 'free';
    const objH = free ? null : r.h;
    const span = Math.max(sys.zEnd, 1);

    // Bild sichtbar?
    let imgVis = null, imgNote = '';
    if (state.view.showImage && im) {
      if (im.atInfinity) imgNote = 'Bild im Unendlichen (D = 0)';
      else if (im.zImg > -1.5 * span && im.zImg < 2.5 * span) imgVis = im;
      else imgNote = `Bild außerhalb der Ansicht (z = ${fmt(im.zImg)} mm)`;
    }
    // Verlängerungen der Strahlen bis zum Bild (gestrichelt)
    const shown = shownRays();
    const exts = traces.map((tr, k) => {
      if (!imgVis || !r.on[k]) return null;
      const s = tr.out, xAt = z => s[0] + s[1] * (z - sys.zEnd);
      let a, b;
      if (imgVis.real) {
        if (imgVis.zImg <= sys.zEnd + 1e-9) return null;
        a = sys.zEnd; b = imgVis.zImg;
      } else {
        a = imgVis.zImg; b = imgVis.zLast;
      }
      return [[a, xAt(a)], [b, xAt(b)]];
    });

    // Maßstab
    let v = frozenView;
    if (!v) {
      let z0 = 0, z1 = Math.max(sys.zEnd, 0);
      if (imgVis) { z0 = Math.min(z0, imgVis.zImg); z1 = Math.max(z1, imgVis.zImg); }
      if (z1 - z0 < 1e-6) z1 = z0 + 100;
      const pad = (z1 - z0) * 0.03;
      z0 -= pad; z1 += pad;
      let xm = 0;
      shown.forEach(k => traces[k].pts.forEach(p => { xm = Math.max(xm, Math.abs(p[1])); }));
      exts.forEach(e => e && e.forEach(p => { xm = Math.max(xm, Math.abs(p[1])); }));
      if (objH !== null) {
        xm = Math.max(xm, Math.abs(objH));
        if (imgVis) xm = Math.max(xm, Math.abs(imgVis.beta * objH));
      }
      xm = xm > 1e-9 ? xm * 1.12 : 1;
      v = { z0, z1, xm, zs: (W - PL - PR) / (z1 - z0), xs: HALF / xm };
    }
    lastView = v;
    const X = z => PL + (z - v.z0) * v.zs;
    const Y = x => AXY - x * v.xs;
    const sel = state.sel;
    const out = [];

    out.push(`<defs><clipPath id="clipPlot"><rect x="0" y="${YT - 8}" width="${W}" height="${2 * HALF + 16}"/></clipPath></defs>`);

    // Medien (n ≠ 1) und Klickflächen der Freiräume
    sys.steps.forEach((st, i) => {
      if (st.el.type !== 'space') return;
      const x0 = X(st.z0), x1 = X(st.z1);
      if (st.nIn !== 1) {
        out.push(`<rect class="medium" x="${f1(x0)}" y="${YT}" width="${f1(Math.max(x1 - x0, 0))}" height="${2 * HALF}" ` +
          `style="fill-opacity:${Math.min(0.4, Math.abs(st.nIn - 1) * 0.4).toFixed(2)}"/>`);
        if (x1 - x0 > 40) out.push(tx(x0 + 4, YT + 12, `n = ${fmt(st.nIn)}`, 'medlabel'));
      }
      out.push(`<rect class="hit" data-sel="${i}" x="${f1(x0)}" y="${YT}" width="${f1(Math.max(x1 - x0, 2))}" height="${2 * HALF + 34}"/>`);
    });

    // Achsen und Skalen
    out.push(ln(X(v.z0), AXY, X(v.z1) + 10, AXY, 'axis'), tx(X(v.z1) + 12, AXY + 4, 'z', 'ticklabel'));
    const zt = nice((v.z1 - v.z0) / 9);
    out.push(ln(X(v.z0), H - 24, X(v.z1), H - 24, 'tick'));
    for (let k = Math.ceil(v.z0 / zt); k * zt <= v.z1 + 1e-9; k++) {
      const x = X(k * zt);
      out.push(ln(x, H - 24, x, H - 19, 'tick'), tx(x, H - 8, fmt(k * zt), 'ticklabel', 'text-anchor="middle"'));
    }
    out.push(tx(X(v.z1), H - 28, 'z in mm', 'ticklabel', 'text-anchor="end"'));
    const xt = nice(v.xm / 2.5), xr = PL - 30;
    out.push(ln(xr, Y(v.xm), xr, Y(-v.xm), 'tick'), tx(xr, Y(v.xm) - 6, 'x in mm', 'ticklabel', 'text-anchor="middle"'));
    for (let k = -Math.floor(v.xm / xt); k * xt <= v.xm + 1e-9; k++) {
      out.push(ln(xr - 3, Y(k * xt), xr + 3, Y(k * xt), 'tick'), tx(xr - 6, Y(k * xt) + 3.5, fmt(k * xt), 'ticklabel', 'text-anchor="end"'));
    }

    // Maßlinien der Freiräume
    const yd = YB + 20;
    sys.steps.forEach((st, i) => {
      if (st.el.type !== 'space') return;
      const x0 = X(st.z0), x1 = X(st.z1);
      out.push(`<g class="dim${i === sel ? ' sel' : ''}" data-sel="${i}">` +
        ln(x0, yd - 5, x0, yd + 5) + ln(x1, yd - 5, x1, yd + 5) + ln(x0, yd, x1, yd) +
        (x1 - x0 > 28 ? tx((x0 + x1) / 2, yd - 5, fmt(st.el.p.d), '', 'text-anchor="middle"') : '') + '</g>');
    });

    // Auswahl-Hilfslinien
    const sst = sys.steps[sel];
    if (sst) {
      out.push(ln(X(sst.z0), YT, X(sst.z0), YB, 'guide'));
      if (sst.z1 > sst.z0) out.push(ln(X(sst.z1), YT, X(sst.z1), YB, 'guide'));
    }

    // Optische Elemente
    const focalUsed = [];
    const focalY = x => {
      let y = AXY + 14;
      while (focalUsed.some(p => Math.abs(p[0] - x) < 14 && p[1] === y)) y += 11;
      focalUsed.push([x, y]);
      return y;
    };
    sys.steps.forEach((st, i) => {
      const t = st.el.type;
      if (t === 'space') return;
      const x0 = X(st.z0), x1 = X(st.z1), p = st.el.p;
      let g = '';
      if (t === 'lens') {
        const y0 = AXY - LH, y1 = AXY + LH, a = 7, s = p.f > 0 ? 1 : -1;
        g += ln(x0, y0, x0, y1);
        g += `<polyline points="${f1(x0 - a)},${f1(y0 + s * a)} ${f1(x0)},${f1(y0)} ${f1(x0 + a)},${f1(y0 + s * a)}"/>`;
        g += `<polyline points="${f1(x0 - a)},${f1(y1 - s * a)} ${f1(x0)},${f1(y1)} ${f1(x0 + a)},${f1(y1 - s * a)}"/>`;
        [[st.z0 - p.f, 'F'], [st.z0 + p.f, 'F′']].forEach(([z, lab]) => {
          if (z < v.z0 || z > v.z1) return;
          g += `<circle class="focal" cx="${f1(X(z))}" cy="${AXY}" r="2.8"/>` +
            tx(X(z), focalY(X(z)), lab, 'focallabel', 'text-anchor="middle"');
        });
      } else if (t === 'flat') {
        g += ln(x0, YT, x0, YB);
      } else if (t === 'sphere') {
        const s = sagPx(p.r);
        g += `<path d="M${f1(x0 + s)},${f1(AXY - LH)} Q${f1(x0 - s)},${AXY} ${f1(x0 + s)},${f1(AXY + LH)}"/>`;
      } else if (t === 'block') {
        g += `<rect class="glass" x="${f1(x0)}" y="${f1(AXY - LH)}" width="${f1(Math.max(x1 - x0, 1))}" height="${f1(2 * LH)}"/>`;
      } else if (t === 'thick') {
        let s1 = sagPx(p.r1), s2 = sagPx(p.r2);
        const room = x1 - x0 - 2, need = s1 - s2;
        if (need > 0 && need > room) { const k = Math.max(room, 0) / need; s1 *= k; s2 *= k; }
        g += `<path class="glass" d="M${f1(x0 + s1)},${f1(AXY - LH)} Q${f1(x0 - s1)},${AXY} ${f1(x0 + s1)},${f1(AXY + LH)} ` +
          `L${f1(x1 + s2)},${f1(AXY + LH)} Q${f1(x1 - s2)},${AXY} ${f1(x1 + s2)},${f1(AXY - LH)} Z"/>`;
      }
      const hx = Math.min(x0, x1) - 9, hw = Math.abs(x1 - x0) + 18;
      out.push(`<g class="el ${t}${i === sel ? ' sel' : ''}" data-sel="${i}" data-drag="el" data-i="${i}">${g}` +
        `<rect class="hit" x="${f1(hx)}" y="${f1(AXY - LH - 4)}" width="${f1(hw)}" height="${f1(2 * LH + 8)}"/></g>`);
    });

    // Objekt und Bild
    if (objH !== null && state.view.showImage) {
      out.push(arrowV(X(0), AXY, Y(objH), 'obj'));
      out.push(tx(X(0) - 10, Y(objH) + (objH >= 0 ? -10 : 18), 'Objekt', 'ticklabel', 'text-anchor="end"'));
    }
    if (imgVis) {
      const xi = X(imgVis.zImg);
      const lab = imgVis.real ? 'Bild' : 'virtuelles Bild';
      if (objH !== null) {
        const yi = Y(imgVis.beta * objH);
        out.push(arrowV(xi, AXY, yi, 'img' + (imgVis.real ? '' : ' virtual')));
        out.push(tx(xi + 8, yi + (yi < AXY ? 2 : 10), lab, 'imglabel'));
      } else {
        out.push(ln(xi, YT, xi, YB, 'imgplane'), tx(xi + 5, YB - 4, 'Bildebene', 'imglabel'));
      }
    }

    // Strahlen
    out.push('<g clip-path="url(#clipPlot)">');
    shown.forEach(k => {
      const tr = traces[k];
      out.push(`<polyline class="ray r${k}" points="${tr.pts.map(p => `${f1(X(p[0]))},${f1(Y(p[1]))}`).join(' ')}"/>`);
      const e = exts[k];
      if (e) out.push(`<polyline class="ray r${k} ext" points="${e.map(p => `${f1(X(p[0]))},${f1(Y(p[1]))}`).join(' ')}"/>`);
    });
    if (sst) {
      shown.forEach(k => {
        const p = traces[k].per[sel];
        out.push(`<circle class="dot r${k}" cx="${f1(X(sst.z0))}" cy="${f1(Y(p.in[0]))}" r="4"/>`);
        out.push(`<circle class="dot r${k}" cx="${f1(X(sst.z1))}" cy="${f1(Y(p.out[0]))}" r="4"/>`);
      });
    }
    out.push('</g>');

    // Griffe
    if (!free) {
      out.push(`<circle class="handle" data-drag="h" cx="${f1(X(0))}" cy="${f1(Y(r.h))}" r="7"><title>Objekthöhe h ziehen</title></circle>`);
    } else {
      r.free.forEach((f, k) => r.on[k] && out.push(`<circle class="handle r${k}" data-drag="x0" data-ray="${k}" ` +
        `cx="${f1(X(0))}" cy="${f1(Y(f.x))}" r="6"><title>Startpunkt Strahl ${k + 1}</title></circle>`));
    }
    const zh = handleZ(sys, v);
    angleTargets().forEach(({ ray }, j) => {
      const s = starts[ray], z = zh * (1 - 0.18 * j), x = X(z), y = Y(s[0] + s[1] * z);
      out.push(`<path class="handle r${ray}" data-drag="ang" data-ray="${ray}" data-j="${j}" ` +
        `d="M${f1(x)},${f1(y - 7)} L${f1(x + 7)},${f1(y)} L${f1(x)},${f1(y + 7)} L${f1(x - 7)},${f1(y)} Z">` +
        `<title>Winkel Strahl ${ray + 1}</title></path>`);
    });

    // Marker und Formeln im Bild
    let prevX = -1e9;
    sys.steps.forEach((st, i) => {
      const xc = X((st.z0 + st.z1) / 2);
      const x = Math.max(xc, prevX + 23);
      prevX = x;
      const isSel = i === sel ? ' sel' : '';
      if (st.el.type !== 'space') out.push(ln(x, 27, xc, AXY - LH - 6, 'leader'));
      out.push(`<g class="marker${isSel}" data-sel="${i}"><circle cx="${f1(x)}" cy="16" r="10"/>` +
        tx(x, 20, String(i + 1), '', 'text-anchor="middle"') + '</g>');
      if (state.view.formulas) out.push(formulaBox(x, st.el.type === 'space' ? YB + 2 - boxH(shownRays().length) : 32, st, traces, i, isSel));
    });

    // Hinweise
    const k = v.xs / v.zs;
    out.push(tx(W - PR, YT - 6, `x-Achse ${k >= 1 ? fmt(k, 3) + '-fach überhöht' : 'gestaucht (×' + fmt(k, 3) + ')'}`,
      'note', 'text-anchor="end"'));
    if (imgNote) out.push(tx(W - PR, YT + 8, imgNote, 'note', 'text-anchor="end"'));

    $('#svg').innerHTML = out.join('');
  }

  // z-Position der Winkelgriffe: vor dem ersten optischen Element, mind. ~45 px vom Objekt entfernt
  function handleZ(sys, v) {
    const st = sys.steps.find(s => s.type.optical);
    const z = st && st.z0 > 0 ? st.z0 : (sys.zEnd || 100);
    return Math.max(z * 0.55, Math.min(z * 0.85, 45 / v.zs));
  }

  function formulaBox(x, y, st, traces, i, isSel) {
    const M = st.M.map(v => fmt(v, 3));
    const cw = 6.1;
    const c0 = Math.max(M[0].length, M[2].length) * cw, c1 = Math.max(M[1].length, M[3].length) * cw;
    const shown = shownRays();
    const vecs = shown.map(k => `(${fmt(traces[k].per[i].out[0], 3)}; ${fmt(traces[k].per[i].out[1], 3)})`);
    const mw = c0 + c1 + 26;
    const w = Math.max(mw, ...vecs.map(s => s.length * cw)) + 10;
    const bx = x - w / 2, mx = x - mw / 2;
    let g = `<g class="fbox${isSel}" data-sel="${i}"><rect x="${f1(bx)}" y="${f1(y)}" width="${f1(w)}" height="${f1(boxH(vecs.length))}" rx="4"/>`;
    g += `<path d="M${f1(mx + 6)},${f1(y + 4)} q-5,13 0,27"/><path d="M${f1(mx + mw - 6)},${f1(y + 4)} q5,13 0,27"/>`;
    [[M[0], M[1]], [M[2], M[3]]].forEach(([a, b], rI) => {
      const yy = y + 15 + rI * 12;
      g += tx(mx + 10 + c0, yy, a, '', 'text-anchor="end"') + tx(mx + 18 + c0 + c1, yy, b, '', 'text-anchor="end"');
    });
    // Kopfzeile: die Vektoren darunter sind der Zustand NACH diesem Element
    const k = i + 1;
    g += tx(x, y + 45, `s${subNum(k)} = M${subNum(k)}·s${subNum(k - 1)}`, 'fcap', 'text-anchor="middle"');
    vecs.forEach((s, j) => { g += tx(x, y + 58 + j * 11, s, `r${shown[j]}`, 'text-anchor="middle"'); });
    return g + '</g>';
  }
  const boxH = n => 49 + 11 * n;
  const SUBS = '₀₁₂₃₄₅₆₇₈₉';
  const subNum = n => String(n).split('').map(c => SUBS[+c]).join('');

  // ---------------------------------------------------------------------
  // Karten (Kette)
  // ---------------------------------------------------------------------
  let cardSig = null;
  function cardHtml(st, i) {
    const T = st.type, el = st.el;
    return `<div class="card" data-i="${i}">` +
      `<div class="card-head" draggable="true" title="Ziehen zum Umsortieren"><span class="num">${i + 1}</span>` +
      `<span class="name">${T.label}</span>` +
      `<button data-act="left" title="nach links">‹</button><button data-act="right" title="nach rechts">›</button>` +
      `<button data-act="del" title="entfernen">×</button></div>` +
      `<div class="params">${T.params.map(p =>
        `<label><span class="sym">${p.sym}</span><input type="number" step="${p.step}" data-key="${p.key}" value="${inputVal(el.p[p.key])}">` +
        `${p.unit ? `<span class="muted">${p.unit}</span>` : ''}</label>`).join('')}</div>` +
      `<div class="dyn"></div>` +
      (T.composite ? `<button class="link" data-act="open">Teilmatrizen ${el.open ? '▾' : '▸'}</button><div class="subsbox"></div>` : '') +
      `</div>`;
  }
  function cardDyn(st) {
    let h = '';
    const t = st.el.type;
    if (t === 'flat' || t === 'sphere') h += `<div class="nin">n₁ = ${fmt(st.nIn)} <span class="muted">(Medium davor)</span></div>`;
    else if (t === 'block' || t === 'thick') h += `<div class="nin">n₁ = ${fmt(st.nIn)} <span class="muted">(Umgebung)</span></div>`;
    else if (st.nIn !== 1) h += `<div class="nin">im Medium n = ${fmt(st.nIn)}</div>`;
    h += `<div class="cm">${math(row(Msub(st.index + 1), mo('='), matN(st.M)))}</div>`;
    return h;
  }
  function cardSubs(st) {
    if (!st.type.composite || !st.el.open) return '';
    return `<div class="subs">${st.subs.map(s =>
      `<div><span class="muted">${atomLabel(s.atom)}</span><br>${math(matN(s.M))}</div>`).join('')}</div>`;
  }
  function renderCards(sys) {
    const chain = $('#chain');
    const sig = state.elements.map(e => e.type + (e.open ? '+' : '')).join(',');
    if (sig !== cardSig) {
      chain.innerHTML = sys.steps.length
        ? sys.steps.map(cardHtml).join('')
        : '<p class="muted">Leere Kette – Komponenten über die Leiste oben hinzufügen.</p>';
      cardSig = sig;
    }
    chain.querySelectorAll('.card').forEach((c, i) => {
      const st = sys.steps[i];
      c.classList.toggle('sel', i === state.sel);
      c.querySelector('.dyn').innerHTML = cardDyn(st);
      const sb = c.querySelector('.subsbox');
      if (sb) sb.innerHTML = cardSubs(st);
      c.querySelectorAll('input[data-key]').forEach(inp => {
        if (inp !== document.activeElement) { inp.value = inputVal(st.el.p[inp.dataset.key]); inp.classList.remove('bad'); }
      });
    });
  }

  // ---------------------------------------------------------------------
  // Panel: ausgewählter Übergang
  // ---------------------------------------------------------------------
  function renderDetails(sys, traces) {
    const box = $('#details');
    const i = state.sel, st = sys.steps[i];
    if (!st) {
      box.innerHTML = '<h2>Übergang</h2><p class="muted">Element in der Grafik oder in der Kette anklicken.</p>';
      return;
    }
    const k = i + 1;
    const E = elementEntries(st, false), EN = elementEntries(st, true);
    const ins = traces.map(t => t.per[i].in), outs = traces.map(t => t.per[i].out);
    let h = `<h2><span class="num">${k}</span> ${st.type.label} <small>${paramSummary(st)}</small></h2>`;
    if (st.nIn !== 1 || st.nOut !== 1) h += `<p class="muted">Medium davor n = ${fmt(st.nIn)}, danach n = ${fmt(st.nOut)}</p>`;

    h += '<h3>Matrix</h3>';
    if (E) {
      h += `<div class="eq">${math(row(Msub(k), mo('='), mat(E), mo('='), mat(EN), mo('='), matN(st.M)))}</div>`;
    }
    if (st.subs.length > 1) {
      const prod = st.subs.slice().reverse().map(s => mat(atomEntries(s.atom, true))).join(mo('·'));
      h += `<div class="eq">${math(row(E ? mo('=') : row(Msub(k), mo('=')), prod, mo('='), matN(st.M)))}</div>`;
    }

    h += `<h3>Übergang s<sub>${k - 1}</sub> → s<sub>${k}</sub></h3>`;
    h += eqMath(E || st.M.map(num), k, k - 1);
    h += rayLines(st.M, ins, outs, k, k - 1);

    if (st.subs.length > 1) {
      h += '<h3>Teilschritte</h3>';
      const lbl = j => (j < 0 ? String(k - 1) : j >= st.subs.length - 1 ? String(k) : `${k}${'abc'[j]}`);
      st.subs.forEach((s, j) => {
        const si = traces.map(t => t.per[i].subs[j].in), so = traces.map(t => t.per[i].subs[j].out);
        h += `<div class="substep"><b>${atomLabel(s.atom)}</b>` +
          `<div class="eq">${math(row(mat(atomEntries(s.atom, false)), mo('='), mat(atomEntries(s.atom, true)), mo('='), matN(s.M)))}</div>` +
          rayLines(s.M, si, so, lbl(j), lbl(j - 1)) + '</div>';
      });
    }

    h += '<h3>Kumuliert bis hier</h3>';
    h += `<div class="eq">${math(row(prodSym(k), mo('='), matN(st.Mcum)))}</div>`;
    box.innerHTML = h;
  }

  // ---------------------------------------------------------------------
  // Panel: Gesamtsystem
  // ---------------------------------------------------------------------
  function renderSystem(sys, im) {
    const box = $('#system');
    const N = sys.steps.length, M = sys.M, info = O.systemInfo(M);
    let h = '<h2>Gesamtsystem</h2>';
    h += `<div class="eq">${math(row(mi('M'), mo('='), prodSym(N), mo('='), matN(M)))}</div>`;
    h += '<dl class="kv">';
    h += `<dt>A, B, C, D</dt><dd>${[info.A, info.B, info.C, info.D].map(v => fmt(v)).join(' &nbsp;|&nbsp; ')}</dd>`;
    h += `<dt>det M</dt><dd>${fmt(info.det)} <span class="muted">(= n<sub>Start</sub>/n<sub>Ende</sub> = ${fmt(sys.nStart)}/${fmt(sys.nEnd)})</span></dd>`;
    if (!sys.steps.some(s => s.type.optical)) {
      h += '<dt>Abbildung</dt><dd class="muted">kein brechendes Element</dd>';
    } else {
      h += info.afocal
        ? `<dt>Brennweite</dt><dd>C = 0 → <b>afokal</b>, Winkelvergrößerung Γ = D = ${fmt(info.D)}</dd>`
        : `<dt>Brennweite</dt><dd>f′ = −1/C = <b>${fmt(info.f)} mm</b></dd>`;
      h += '<dt>Bild</dt><dd>';
      if (!im || im.atInfinity) {
        h += 'D = 0 → Bild im Unendlichen <span class="muted">(Startebene in der vorderen Brennebene)</span>';
      } else {
        const atScreen = Math.abs(im.t) < 1e-6 * Math.max(1, sys.zEnd);
        h += atScreen
          ? `B = 0 → die Beobachtungsebene ist die Bildebene, β = A = <b>${fmt(im.beta)}</b>`
          : `t = −B/D = ${fmt(im.t)} mm hinter der Beobachtungsebene → z = ${fmt(im.zImg)} mm, β = A + t·C = <b>${fmt(im.beta)}</b>`;
        h += `<br>${im.real ? 'reell' : 'virtuell'}, ${Math.abs(im.beta) >= 1 ? 'vergrößert' : 'verkleinert'}, ` +
          `${im.beta < 0 ? 'umgekehrt' : 'aufrecht'}`;
        if (state.rays.mode === 'free') h += ' <span class="muted">(Bild der Startebene)</span>';
      }
      h += '</dd>';
    }
    h += '</dl>';
    const can = !!O.focusScreen(state.elements);
    h += `<div class="actions"><button id="focus" ${can ? '' : 'disabled'}>Schirm ins Bild</button>` +
      `<span class="muted">setzt den letzten Freiraum so, dass B = 0</span></div>`;

    h += `<details data-k="cum"${ui.cum ? ' open' : ''}><summary>Zwischenprodukte</summary><table class="cum">` +
      sys.steps.map((st, i) => `<tr><td>${math(prodSym(i + 1))}</td><td>${math(row(mo('='), matN(st.Mcum)))}</td></tr>`).join('') +
      '</table></details>';
    h += `<details data-k="inv"${ui.inv ? ' open' : ''}><summary>Inverse (Strahlumkehr)</summary>` +
      `<div class="eq">${math(row(`<msup><mi>M</mi><mrow><mo>−</mo><mn>1</mn></mrow></msup>`, mo('='),
        frac(ONE, row(mi('det'), mo('⁡'), mi('M'))), mo('·'), mat([mi('D'), row(mo('−'), mi('B')), row(mo('−'), mi('C')), mi('A')]),
        mo('='), matN(O.inv(M))))}</div></details>`;
    box.innerHTML = h;
  }

  // ---------------------------------------------------------------------
  // Kopfzeile
  // ---------------------------------------------------------------------
  let rayMode = null;
  function rayCtlHtml(mode) {
    const inp = (rk, step, unit) => `<input type="number" step="${step}" data-rk="${rk}">${unit ? `<span class="muted">${unit}</span>` : ''}`;
    const on = (k, text) => `<label class="r${k} rayon" title="Strahl ${k + 1} ein-/ausblenden">` +
      `<input type="checkbox" data-on="${k}"><span class="sw"></span><span class="rlab">${text}</span></label>`;
    if (mode !== 'free') {
      return `<span class="grp"><label>Objekthöhe h ${inp('h', 1, 'mm')}</label></span>` +
        `<span class="grp">${on(0, 'Strahl 1')}<span class="muted">vom Objektpunkt, achsparallel</span></span>` +
        `<span class="grp">${on(1, 'Strahl 2')}<span class="muted">vom Objektpunkt,</span><label>θ ${inp('theta', 0.01, 'rad')}</label></span>` +
        `<span class="grp">${on(2, 'Strahl 3')}<span class="muted">vom Achsenpunkt,</span><label>u ${inp('u', 0.01, 'rad')}</label></span>`;
    }
    return [0, 1, 2].map(k => `<span class="grp">${on(k, `Strahl ${k + 1}`)}` +
      `<label>x ${inp(`free.${k}.x`, 1, 'mm')}</label><label>θ ${inp(`free.${k}.t`, 0.01, 'rad')}</label></span>`).join('');
  }
  function renderControls() {
    const r = state.rays, box = $('#rayparams');
    if (rayMode !== r.mode) { box.innerHTML = rayCtlHtml(r.mode); rayMode = r.mode; }
    box.querySelectorAll('input[data-rk]').forEach(inp => {
      if (inp !== document.activeElement) { inp.value = inputVal(getPath(r, inp.dataset.rk)); inp.classList.remove('bad'); }
    });
    box.querySelectorAll('input[data-on]').forEach(cb => { cb.checked = !!r.on[+cb.dataset.on]; });
    document.querySelectorAll('input[name=mode]').forEach(x => { x.checked = x.value === r.mode; });
    $('#showImage').checked = state.view.showImage;
    $('#showFormulas').checked = state.view.formulas;
  }

  // =====================================================================
  // Bearbeiten der Kette
  // =====================================================================
  function addElement(type) {
    const el = { type, p: clone(TYPES[type].defaults) };
    const els = state.elements;
    const at = state.sel === null ? els.length : state.sel + 1;
    const ins = [el];
    if (type !== 'space') {
      if (els[at - 1] && els[at - 1].type !== 'space') ins.unshift({ type: 'space', p: { d: 50 } });
      if (!els[at] || els[at].type !== 'space') ins.push({ type: 'space', p: { d: 50 } });
    }
    els.splice(at, 0, ...ins);
    state.sel = at + ins.indexOf(el);
  }
  function moveElement(from, to) {
    const els = state.elements;
    if (to < 0 || to >= els.length || from === to) return;
    const [el] = els.splice(from, 1);
    els.splice(to, 0, el);
    state.sel = to;
  }
  function removeElement(i) {
    state.elements.splice(i, 1);
    if (!state.elements.length) state.sel = null;
    else state.sel = Math.min(i, state.elements.length - 1);
  }

  // =====================================================================
  // Ereignisse
  // =====================================================================
  function initEvents() {
    // Beispiele
    const ps = $('#preset');
    ps.innerHTML = '<option value="">– eigener Aufbau –</option>' +
      PRESETS.map((p, i) => `<option value="${i}">${p.name}</option>`).join('');
    ps.addEventListener('change', () => {
      if (ps.value === '') return;
      state = fromPreset(PRESETS[+ps.value]);
      frozenView = null;
      render();
    });

    // Strahlen
    document.querySelectorAll('input[name=mode]').forEach(x => x.addEventListener('change', () => {
      state.rays.mode = x.value; render();
    }));
    $('#rayparams').addEventListener('input', e => {
      const inp = e.target.closest('input[data-rk]');
      if (!inp) return;
      const v = parseFloat(inp.value);
      const ok = isFinite(v);
      inp.classList.toggle('bad', !ok);
      if (ok) { setPath(state.rays, inp.dataset.rk, v); render(); }
    });
    $('#rayparams').addEventListener('change', e => {
      const cb = e.target.closest('input[data-on]');
      if (cb) { state.rays.on[+cb.dataset.on] = cb.checked; render(); }
    });
    $('#showImage').addEventListener('change', e => { state.view.showImage = e.target.checked; render(); });
    $('#showFormulas').addEventListener('change', e => { state.view.formulas = e.target.checked; render(); });

    // Palette
    $('#palette').addEventListener('click', e => {
      const b = e.target.closest('button[data-add]');
      if (b) { addElement(b.dataset.add); render(); }
    });
    $('#clear').addEventListener('click', () => {
      if (!state.elements.length || confirm('Alle Elemente entfernen?')) { state.elements = []; state.sel = null; render(); }
    });

    // Karten
    const chain = $('#chain');
    chain.addEventListener('input', e => {
      const inp = e.target.closest('input[data-key]');
      if (!inp) return;
      const i = +inp.closest('.card').dataset.i, el = state.elements[i];
      const param = TYPES[el.type].params.find(q => q.key === inp.dataset.key);
      const v = parseFloat(inp.value);
      const ok = O.validParam(param, v);
      inp.classList.toggle('bad', !ok);
      if (ok) { el.p[param.key] = v; state.sel = i; render(); }
    });
    chain.addEventListener('click', e => {
      const card = e.target.closest('.card');
      if (!card) return;
      const i = +card.dataset.i;
      const b = e.target.closest('button[data-act]');
      if (b) {
        const a = b.dataset.act;
        if (a === 'del') removeElement(i);
        else if (a === 'left') moveElement(i, i - 1);
        else if (a === 'right') moveElement(i, i + 1);
        else if (a === 'open') { state.elements[i].open = !state.elements[i].open; state.sel = i; }
      } else {
        state.sel = i;
      }
      render();
    });
    let dragFrom = null;
    chain.addEventListener('dragstart', e => {
      const c = e.target.closest('.card');
      if (!c) return;
      dragFrom = +c.dataset.i;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(dragFrom));
    });
    chain.addEventListener('dragover', e => {
      const c = e.target.closest('.card');
      if (dragFrom === null || !c) return;
      e.preventDefault();
      chain.querySelectorAll('.card.over').forEach(x => x !== c && x.classList.remove('over'));
      c.classList.add('over');
    });
    chain.addEventListener('drop', e => {
      const c = e.target.closest('.card');
      if (dragFrom === null || !c) return;
      e.preventDefault();
      moveElement(dragFrom, +c.dataset.i);
      dragFrom = null;
      render();
    });
    chain.addEventListener('dragend', () => {
      dragFrom = null;
      chain.querySelectorAll('.card.over').forEach(x => x.classList.remove('over'));
    });

    // Panels
    $('#system').addEventListener('click', e => {
      if (e.target.id !== 'focus') return;
      const f = O.focusScreen(state.elements);
      if (f) { f.forEach((x, i) => { if (state.elements[i]) x.open = state.elements[i].open; }); state.elements = f; render(); }
    });
    $('#system').addEventListener('toggle', e => {
      const k = e.target.dataset && e.target.dataset.k;
      if (k) ui[k] = e.target.open;
    }, true);

    // Tastatur
    document.addEventListener('keydown', e => {
      if (e.target.closest && e.target.closest('input, select, textarea, button')) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.sel !== null) {
        removeElement(state.sel); render(); e.preventDefault();
      } else if (e.key === 'ArrowLeft' && state.sel > 0) { state.sel--; render(); }
      else if (e.key === 'ArrowRight' && state.sel !== null && state.sel < state.elements.length - 1) { state.sel++; render(); }
    });

    initSvgEvents();
  }

  function initSvgEvents() {
    const svg = $('#svg');
    let drag = null;
    const pt = e => {
      const p = svg.createSVGPoint();
      p.x = e.clientX; p.y = e.clientY;
      return p.matrixTransform(svg.getScreenCTM().inverse());
    };
    const round = (v, s) => Math.round(v / s) * s;

    svg.addEventListener('pointerdown', e => {
      const t = e.target.closest('[data-drag],[data-sel]');
      if (!t) return;
      if (t.dataset.sel !== undefined) {
        state.sel = +t.dataset.sel;
        const card = document.querySelector(`.card[data-i="${state.sel}"]`);
        if (card) card.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
      const kind = t.dataset.drag;
      if (kind) {
        const sys = O.build(state.elements);
        drag = {
          kind, i: +t.dataset.i, ray: +t.dataset.ray, j: +t.dataset.j || 0,
          p0: pt(e), snap: clone(state.elements), view: lastView,
          total: sys.zEnd, zh: handleZ(sys, lastView), starts: rayStarts(),
        };
        frozenView = lastView;
        try { svg.setPointerCapture(e.pointerId); } catch (err) { /* z. B. synthetische Events */ }
        e.preventDefault();
      }
      render();
    });
    svg.addEventListener('pointermove', e => {
      if (!drag) return;
      const p = pt(e), v = drag.view;
      const xmm = (AXY - p.y) / v.xs;
      const xStep = nice(v.xm / 200);
      if (drag.kind === 'el') {
        const dz = (p.x - drag.p0.x) / v.zs, i = drag.i, s = drag.snap, els = state.elements;
        const step = drag.total < 200 ? 0.1 : 1;
        const prev = s[i - 1] && s[i - 1].type === 'space' ? s[i - 1].p.d : null;
        const next = s[i + 1] && s[i + 1].type === 'space' ? s[i + 1].p.d : null;
        if (prev !== null && next !== null) {
          const d = Math.min(Math.max(round(prev + dz, step), 0), prev + next);
          els[i - 1].p.d = d;
          els[i + 1].p.d = Math.round((prev + next - d) * 1e6) / 1e6;
        } else if (prev !== null) {
          els[i - 1].p.d = Math.max(round(prev + dz, step), 0);
        } else return;
      } else if (drag.kind === 'h') {
        state.rays.h = round(xmm, xStep);
      } else if (drag.kind === 'x0') {
        state.rays.free[drag.ray].x = round(xmm, xStep);
      } else if (drag.kind === 'ang') {
        const z = drag.zh * (1 - 0.18 * drag.j);
        const target = angleTargets()[drag.j];
        const x0 = drag.starts[drag.ray][0];
        setPath(state.rays, target.path, Math.round(((xmm - x0) / z) * 1e4) / 1e4);
      }
      render();
    });
    const end = () => { if (drag) { drag = null; frozenView = null; render(); } };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);

    svg.addEventListener('wheel', e => {
      const g = e.target.closest('.el.lens');
      if (!g) return;
      e.preventDefault();
      const el = state.elements[+g.dataset.i];
      const f = el.p.f * (e.deltaY < 0 ? 1 / 1.05 : 1.05);
      el.p.f = Number(f.toPrecision(3));
      state.sel = +g.dataset.i;
      render();
    }, { passive: false });
  }

  // =====================================================================
  // Start
  // =====================================================================
  state = loadHash();
  initEvents();
  if (!state) state = Object.assign(fromPreset(PRESETS[0]), { preset: 0 });
  if (state.preset !== undefined) $('#preset').value = String(state.preset);
  render();
})();
