/*
 * Pip's Dock: static landscape plate generator. Contract: scene-proto/STYLE.md.
 *
 *   buildPlate(phase) -> complete SVG document string (viewBox 0 0 1920 1080, width 1920, height 1080)
 *   phase: 'dawn' | 'day' | 'golden' | 'dusk' | 'night'
 *
 * Every phase draws the same geometry from fixed seeds, so the five plates line up pixel for pixel; only
 * PALETTES change. Phase-only layers (sun + glitter, stars, causeway / town lights, porch light) sit in
 * <g id="phase-..."> groups. Plates are pre-rendered to JPEG in Chromium, so filters (paper grain, haze, soft
 * reflections) and <text> (the DOCK sign) are used here and nowhere else.
 *
 * Anchors baked into the plate (scene px): horizon y 432; deck top y 466 (x 0-660, fascia 480-492);
 * piling x 640-668, top y 384, waterline y 570; mooring-rope tie on the piling at (668, 483); porch bulb (205, 365);
 * dawn sun centre (1080, 432); moon window x 1040-1136, y 150-246 kept star-free; clock quadrant x>1300, y<260
 * darkened about 15% with a soft radial.
 */
var PipsDockPlate = (function () {
  'use strict';

  // ---------------------------------------------------------------------------------------------------------------
  // Palettes. Every phase has the same keys. Gradient lists are [offset, colour] or [offset, colour, opacity].
  // Numbers next to colours are light strengths (opacities) for that phase.
  // ---------------------------------------------------------------------------------------------------------------
  const PALETTES = {
    dawn: {
      sky: [[0, '#283766'], [0.4, '#8E6C9F'], [0.78, '#F3A27C'], [1, '#FFDCA3']],
      glow: { x: 1080, rx: 760, ry: 330, c: '#FFE3B5', o: 0.6 },
      clock: '#141A3A', clockOp: 0.21, vignOp: 0.22, grainOp: 0.14,
      star: '#FFF1E6', starOp: 0.3, starMaxY: 150,
      sun: '#FFE7B8', sunCore: '#FFFBEC', sunRim: '#FFBF7E', glitter: '#FFC9A0',
      shoreFar: '#86698C', shore: '#3B3350', shoreBase: '#4D3F5F', haze: '#F7C49C', hazeOp: 0.36,
      cause: '#7B5F86', causeShade: '#664F79', causeLight: null, town: null, townOp: 0,
      marker: '#5A4C64', markerSign: '#4D6A6C',
      water: [[0, '#EDBC9E'], [0.022, '#BE92A0'], [0.09, '#8B7191'], [0.19, '#6B5F80'], [1, '#3D3757']],
      bandL: '#A0849F', bandD: '#544A6E', bandOp: 0.4,
      ripL: '#F2C2A8', ripD: '#4A4164', ripOp: 0.42,
      glint: '#FFC9A0', glintOp: 0.2, refl: '#3B3350', reflOp: 0.5,
      woodTop: '#BC9288', plankA: '#6F5B6D', plankB: '#655266', plankGap: '#382E42',
      fascia: '#56475E', fasciaHi: '#8E6F79', post: '#4F415A', postShade: '#3B3148', postLit: '#8F6D78',
      rearPost: '#342B40', under: '#272140', underOp: 0.55, postRefl: '#353050', postReflOp: 0.5,
      piling: '#5E4D62', pilingLit: '#C49484', pilingShade: '#3D3248', pilingHi: '#EAB59B',
      rope: '#BBA09A', ropeShade: '#8A7382', algae: '#3E3D4E',
      wall: '#58637B', wallShade: '#454D65', wallLine: '#3E455B', trim: '#BAA6AF', trimShade: '#8F8093',
      roof: '#7D7391', roofLit: '#CDA39A', roofShade: '#5B5571', rust: '#9C5F5E', ridge: '#DDB2A0',
      glass: '#BB8E98', glassShade: '#7D6680', glare: '#FFF1E6', door: '#8B5362', doorShade: '#6B4153',
      ring: '#CBB8BE', ringRed: '#AA515B', sign: '#C8B1AF', signEdge: '#9A8593', signText: '#6E3346',
      lampOn: false, lamp: '#B9A6A9', lampCore: '#FFFFFF', lampHalo: '#FFCF7A', lampWash: '#FFB868',
      lampWashOp: 0, lampMetal: '#3A3448',
      leafD: '#2E2E47', leafM: '#3F3D59', leafL: '#6D5B79', root: '#4A3E54', rootLit: '#8B6B79',
      frondD: '#33324D', frondM: '#494563', frondL: '#7B6381', trunk: '#5F5169', trunkShade: '#463C55'
    },
    day: {
      sky: [[0, '#3A7FC4'], [0.52, '#86C0E8'], [1, '#D8EDF6']],
      glow: { x: 960, rx: 1300, ry: 170, c: '#F4FBFD', o: 0.5 },
      clock: '#0C2A56', clockOp: 0.2, vignOp: 0.2, grainOp: 0.12,
      star: '#FFFFFF', starOp: 0, starMaxY: 0,
      sun: null, sunCore: '#FFFFFF', sunRim: '#FFFFFF', glitter: '#FFFFFF',
      shoreFar: '#92B4A8', shore: '#557F69', shoreBase: '#6C9384', haze: '#DCEFF6', hazeOp: 0.36,
      cause: '#A0BAC4', causeShade: '#83A2AF', causeLight: null, town: null, townOp: 0,
      marker: '#6A6660', markerSign: '#3E8A5C',
      water: [[0, '#A6D3DD'], [0.022, '#68B0C3'], [0.09, '#3F8EAC'], [0.19, '#2E7C9E'], [1, '#1B5876']],
      bandL: '#7FC0D2', bandD: '#236E8E', bandOp: 0.4,
      ripL: '#D9F0F6', ripD: '#1E6383', ripOp: 0.45,
      glint: '#F6FCFF', glintOp: 0.4, refl: '#3F6E66', reflOp: 0.45,
      woodTop: '#C4B39C', plankA: '#A18B75', plankB: '#96816C', plankGap: '#5A4A3F',
      fascia: '#8B7462', fasciaHi: '#AC947B', post: '#78634F', postShade: '#5B4B3E', postLit: '#9E866E',
      rearPost: '#4C4038', under: '#0F3A52', underOp: 0.55, postRefl: '#174158', postReflOp: 0.5,
      piling: '#806B58', pilingLit: '#AC947A', pilingShade: '#5D4E42', pilingHi: '#CBB597',
      rope: '#D8C69E', ropeShade: '#A99671', algae: '#4D5D44',
      wall: '#6F9D98', wallShade: '#56807D', wallLine: '#4D7472', trim: '#E8E1CD', trimShade: '#BEB6A1',
      roof: '#A0A5A3', roofLit: '#C8CBC6', roofShade: '#797F81', rust: '#AA623E', ridge: '#CDD0CB',
      glass: '#A3CCDA', glassShade: '#6E98A8', glare: '#FFFFFF', door: '#B2654A', doorShade: '#8B4C3A',
      ring: '#F2EEE3', ringRed: '#D2593D', sign: '#ECE1C6', signEdge: '#BBAB8A', signText: '#9C4B36',
      lampOn: false, lamp: '#ECE6D6', lampCore: '#FFFFFF', lampHalo: '#FFCF7A', lampWash: '#FFB868',
      lampWashOp: 0, lampMetal: '#4E5859',
      leafD: '#2E593D', leafM: '#46794A', leafL: '#709F59', root: '#6C5B4A', rootLit: '#917C66',
      frondD: '#3D6A45', frondM: '#5B8A4F', frondL: '#88B064', trunk: '#8E7D68', trunkShade: '#6B5C4C'
    },
    golden: {
      sky: [[0, '#4A6DA6'], [0.52, '#C79CB7'], [1, '#F4CBA2']],
      glow: { x: 760, rx: 1150, ry: 280, c: '#FFD8A4', o: 0.5 },
      clock: '#17234B', clockOp: 0.2, vignOp: 0.22, grainOp: 0.13,
      star: '#FFFFFF', starOp: 0, starMaxY: 0,
      sun: null, sunCore: '#FFFFFF', sunRim: '#FFFFFF', glitter: '#FFC37A',
      shoreFar: '#D4A487', shore: '#C98B56', shoreBase: '#A26C52', haze: '#F6CFA8', hazeOp: 0.28,
      cause: '#B88F96', causeShade: '#9A798B', causeLight: null, town: null, townOp: 0,
      marker: '#7A604E', markerSign: '#5E8A58',
      water: [[0, '#EEC9AF'], [0.022, '#BAA1B5'], [0.09, '#7D86A6'], [0.19, '#45698A'], [1, '#294462']],
      bandL: '#8F96B1', bandD: '#3A597A', bandOp: 0.4,
      ripL: '#F7D4B5', ripD: '#33526E', ripOp: 0.42,
      glint: '#FFC37A', glintOp: 0.8, refl: '#9E7058', reflOp: 0.45,
      woodTop: '#EBC597', plankA: '#B98B63', plankB: '#AD805B', plankGap: '#6A4A3A',
      fascia: '#956B51', fasciaHi: '#CB9A6B', post: '#7D5B47', postShade: '#5D4339', postLit: '#C19065',
      rearPost: '#4E3B35', under: '#223958', underOp: 0.55, postRefl: '#2D4460', postReflOp: 0.5,
      piling: '#8F6B53', pilingLit: '#E1AB79', pilingShade: '#5F4741', pilingHi: '#F5CA96',
      rope: '#EDCF97', ropeShade: '#C19F6F', algae: '#5B593E',
      wall: '#80A08B', wallShade: '#5F7B72', wallLine: '#56716A', trim: '#F5DEB5', trimShade: '#CAAF8D',
      roof: '#AF978A', roofLit: '#EEC395', roofShade: '#7B6973', rust: '#BD6B3F', ridge: '#F4D2A2',
      glass: '#E9BC90', glassShade: '#A67E78', glare: '#FFF4E0', door: '#C2613F', doorShade: '#934B37',
      ring: '#F9E7CD', ringRed: '#DA5F3B', sign: '#F3DBB1', signEdge: '#C5A37B', signText: '#964531',
      lampOn: false, lamp: '#ECD8B4', lampCore: '#FFFFFF', lampHalo: '#FFCF7A', lampWash: '#FFB868',
      lampWashOp: 0, lampMetal: '#4F4949',
      leafD: '#3D4D39', leafM: '#5D6F45', leafL: '#A79B57', root: '#7D5D47', rootLit: '#C18F63',
      frondD: '#45573D', frondM: '#73834F', frondL: '#C1A963', trunk: '#A57F5F', trunkShade: '#755B49'
    },
    dusk: {
      sky: [[0, '#1B2347'], [0.5, '#4A3E77'], [0.88, '#BF6F89'], [1, '#D4857F']],
      glow: { x: 820, rx: 1150, ry: 210, c: '#F09A8C', o: 0.42 },
      clock: '#090D22', clockOp: 0.2, vignOp: 0.25, grainOp: 0.13,
      star: '#FFE9D6', starOp: 0.45, starMaxY: 175,
      sun: null, sunCore: '#FFFFFF', sunRim: '#FFFFFF', glitter: '#E89CA2',
      shoreFar: '#4E3A5E', shore: '#231D35', shoreBase: '#2E2440', haze: '#B66C86', hazeOp: 0.32,
      cause: '#2A2340', causeShade: '#201B33', causeLight: '#FFCF7A', town: '#FFCF7A', townOp: 0.55,
      marker: '#2E2840', markerSign: '#2A3E44',
      water: [[0, '#C77E8B'], [0.022, '#8C5C80'], [0.09, '#4F4272'], [0.19, '#2F2A54'], [1, '#15142D']],
      bandL: '#5F4D81', bandD: '#27234A', bandOp: 0.4,
      ripL: '#CC8496', ripD: '#211D3F', ripOp: 0.42,
      glint: '#E89CA2', glintOp: 0.3, refl: '#231D35', reflOp: 0.55,
      woodTop: '#88697F', plankA: '#4D405D', plankB: '#473B57', plankGap: '#251E34',
      fascia: '#3A3048', fasciaHi: '#5F4B65', post: '#332A43', postShade: '#252034', postLit: '#5F4B67',
      rearPost: '#221C30', under: '#13102A', underOp: 0.6, postRefl: '#1D1935', postReflOp: 0.55,
      piling: '#3F3451', pilingLit: '#876579', pilingShade: '#29233A', pilingHi: '#A87B8B',
      rope: '#7F6B7D', ropeShade: '#5B4D63', algae: '#2A2A3A',
      wall: '#3D4361', wallShade: '#2F344D', wallLine: '#2A2E46', trim: '#6F6785', trimShade: '#554F6B',
      roof: '#4F4965', roofLit: '#8D6B85', roofShade: '#393551', rust: '#6B4557', ridge: '#9D7589',
      glass: '#F2B263', glassShade: '#C07F4E', glare: '#FFE9D6', door: '#5F3B4D', doorShade: '#472D3D',
      ring: '#8B8199', ringRed: '#7B4755', sign: '#7D6F85', signEdge: '#5B516B', signText: '#43263A',
      lampOn: true, lamp: '#FFE8B4', lampCore: '#FFFFFF', lampHalo: '#FFCF7A', lampWash: '#FFB868',
      lampWashOp: 0.38, lampMetal: '#2A2638',
      leafD: '#1F2036', leafM: '#2A2A45', leafL: '#473F5F', root: '#2C2841', rootLit: '#5B4761',
      frondD: '#21223A', frondM: '#2F2F4B', frondL: '#4F4567', trunk: '#3B3551', trunkShade: '#2B2741'
    },
    night: {
      sky: [[0, '#0A1330'], [0.7, '#15234A'], [1, '#21345C']],
      glow: { x: 1640, rx: 780, ry: 130, c: '#2E4874', o: 0.6 },
      clock: '#02060F', clockOp: 0.19, vignOp: 0.25, grainOp: 0.11,
      star: '#F2F4FF', starOp: 0.9, starMaxY: 360,
      sun: null, sunCore: '#FFFFFF', sunRim: '#FFFFFF', glitter: '#94AAD4',
      shoreFar: '#111C32', shore: '#07101F', shoreBase: '#0A1427', haze: '#1E3056', hazeOp: 0.35,
      cause: '#0A1222', causeShade: '#07101C', causeLight: '#FFC870', town: '#FFC870', townOp: 0.85,
      marker: '#121828', markerSign: '#162A30',
      water: [[0, '#23375F'], [0.022, '#19294D'], [0.09, '#111E3E'], [0.19, '#0C1632'], [1, '#060C1E']],
      bandL: '#1D2D54', bandD: '#0A1430', bandOp: 0.4,
      ripL: '#3C5688', ripD: '#071025', ripOp: 0.42,
      glint: '#94AAD4', glintOp: 0.16, refl: '#07101F', reflOp: 0.5,
      woodTop: '#3F4863', plankA: '#282E45', plankB: '#242A41', plankGap: '#12162A',
      fascia: '#1E2338', fasciaHi: '#333B57', post: '#1A1F33', postShade: '#13172A', postLit: '#333D5B',
      rearPost: '#11152A', under: '#050A1A', underOp: 0.6, postRefl: '#0E1430', postReflOp: 0.55,
      piling: '#22283F', pilingLit: '#46516F', pilingShade: '#161A2D', pilingHi: '#5B6789',
      rope: '#4B4F63', ropeShade: '#353949', algae: '#161C28',
      wall: '#232D45', wallShade: '#1B2337', wallLine: '#182034', trim: '#3F4963', trimShade: '#2F374F',
      roof: '#2D3551', roofLit: '#4F5B7B', roofShade: '#1F253B', rust: '#3B3145', ridge: '#5B6789',
      glass: '#F3B35D', glassShade: '#C07A3E', glare: '#F2F4FF', door: '#3B2B3B', doorShade: '#2B202F',
      ring: '#4F5569', ringRed: '#4B3141', sign: '#3F4357', signEdge: '#2D3145', signText: '#24171F',
      lampOn: true, lamp: '#FFEABA', lampCore: '#FFFFFF', lampHalo: '#FFC870', lampWash: '#FFB45E',
      lampWashOp: 0.5, lampMetal: '#1C2030',
      leafD: '#0C1424', leafM: '#121C31', leafL: '#1F2B45', root: '#121829', rootLit: '#27314B',
      frondD: '#0E1627', frondM: '#152035', frondL: '#25314D', trunk: '#1B2337', trunkShade: '#131A2D'
    }
  };

  // ---------------------------------------------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------------------------------------------
  function rng(seed) { // mulberry32: same seed, same scene, every phase
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const n = v => String(Math.round(v * 10) / 10);
  const o2 = v => String(Math.round(Math.max(0, Math.min(1, v)) * 100) / 100);
  const stopsOf = list => list.map(s =>
    `<stop offset="${s[0]}" stop-color="${s[1]}"${s.length > 2 ? ` stop-opacity="${o2(s[2])}"` : ''}/>`).join('');
  const linU = (id, x1, y1, x2, y2, list) =>
    `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stopsOf(list)}</linearGradient>`;
  const linX = (id, list) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">${stopsOf(list)}</linearGradient>`;
  const radial = (id, list) => `<radialGradient id="${id}">${stopsOf(list)}</radialGradient>`;
  const cap = (x, y, len, th, fill, op) => // a soft horizontal stroke (ripple, glint, glitter)
    `<rect x="${n(x - len / 2)}" y="${n(y - th / 2)}" width="${n(len)}" height="${n(th)}" rx="${n(th / 2)}" fill="${fill}" opacity="${o2(op)}"/>`;
  const paths = list => list.map(d => `<path d="${d}"/>`).join('');
  const pts = list => list.map(p => n(p[0]) + ' ' + n(p[1])).join(' L');

  // ---------------------------------------------------------------------------------------------------------------
  // Far shore geometry (barrier island, islet, mainland). Built once from fixed seeds.
  // ---------------------------------------------------------------------------------------------------------------
  function treeline(r, x0, x1, yb, amp, step, tl, tr) { // bumpy shrub mass sitting on the water, tapered ends
    const env = x => {
      let a = 1;
      if (tl) a = Math.min(a, (x - x0) / tl);
      if (tr) a = Math.min(a, (x1 - x) / tr);
      a = Math.max(0, Math.min(1, a));
      return a * a * (3 - 2 * a);
    };
    const lift = (x, y) => 434 - (434 - y) * env(x);
    let x = x0;
    let d = `M${n(x0)} 434 L${n(x0)} ${n(lift(x0, yb))}`;
    while (x < x1 - 0.5) {
      const nx = Math.min(x1, x + step * (0.6 + r() * 0.8));
      const mx = (x + nx) / 2;
      const top = yb - amp * (0.5 + r() * 0.9);
      d += ` Q${n(mx)} ${n(lift(mx, top))} ${n(nx)} ${n(lift(nx, yb - amp * r() * 0.3))}`;
      x = nx;
    }
    return d + ` L${n(x1)} 434 Z`;
  }

  function pine(r, x, base, h, w) { // Australian pine: wispy, drooping, column-ish
    const lv = 6, R = [], L = [];
    for (let i = 0; i < lv; i++) {
      const t = i / lv, y = base - h * t, step = h / lv;
      const prof = t < 0.2 ? 0.6 + t * 2 : Math.pow(1 - (t - 0.2) / 0.8, 0.7);
      const hw = Math.max(0.9, (w / 2) * prof * (0.8 + r() * 0.4));
      const dr = 1.2 + r() * 1.4;
      R.push([x + hw, y + dr], [x + hw * 0.5, y - step * 0.55]);
      L.push([x - hw * (0.85 + r() * 0.3), y + dr * 0.9], [x - hw * 0.45, y - step * 0.55]);
    }
    const top = [x + (r() - 0.5) * 1.6, base - h - 1];
    return 'M' + pts([[x + 1.2, base + 3]].concat(R, [top], L.reverse(), [[x - 1.2, base + 3]])) + ' Z';
  }

  function farPalm(r, x, base, h, lean) { // distant sabal: thin trunk + spiky drooping crown
    const tx = x + lean, ty = base - h;
    const trunk = `M${n(x - 1.3)} ${n(base + 3)} Q${n(x + lean * 0.2 - 1)} ${n(base - h * 0.5)} ${n(tx - 0.7)} ${n(ty)}` +
      ` L${n(tx + 0.7)} ${n(ty)} Q${n(x + lean * 0.2 + 1)} ${n(base - h * 0.5)} ${n(x + 1.3)} ${n(base + 3)} Z`;
    const k = 9, crown = [];
    for (let i = 0; i < k * 2; i++) {
      const a = Math.PI * 2 * i / (k * 2) + 0.15, c = Math.cos(a), s = Math.sin(a);
      const len = i % 2 ? 2 : (6.5 + r() * 3) * (s > 0.4 ? 0.6 : 1);
      let py = ty + s * len * 0.72;
      if (i % 2 === 0 && Math.abs(c) > 0.55) py += 2.2 * Math.abs(c);
      crown.push([tx + c * len, py]);
    }
    return [trunk, 'M' + pts(crown) + ' Z'];
  }

  let GEO = null;
  function geometry() {
    if (GEO) return GEO;
    const r = rng(432);
    // stands of Australian pines and sabal palms in clumps, shrinking toward the tapered island tips
    const stands = (list, x0, x1, base, pineH, palmH, tipX) => {
      let x = x0;
      while (x < x1) {
        const k = 1 + Math.floor(r() * 3.4);
        for (let j = 0; j < k; j++) {
          const tx = x + j * (5 + r() * 8), s = Math.max(0.35, Math.min(1, (tipX - tx) / 70 + 0.25));
          if (r() < 0.58) { const h = (pineH[0] + r() * (pineH[1] - pineH[0])) * s; list.push(pine(r, tx, base, h, h * (0.48 + r() * 0.16))); }
          else list.push.apply(list, farPalm(r, tx, base, (palmH[0] + r() * (palmH[1] - palmH[0])) * s, (r() - 0.5) * 5));
        }
        x += 24 + k * 9 + r() * 46;
      }
    };
    const back = [treeline(r, 300, 1012, 425.5, 4, 22, 0, 46)];
    stands(back, 330, 1004, 427, [11, 20], [10, 16], 1012);
    const front = [treeline(r, 150, 976, 425, 6.5, 20, 70, 60)];
    stands(front, 330, 962, 429, [19, 32], [16, 26], 976);
    const islet = [treeline(r, 1186, 1304, 429.5, 2.6, 18, 26, 18)];
    [[1214, 19, 1], [1233, 15, -1]].forEach(t => islet.push.apply(islet, farPalm(r, t[0], 430, t[1], t[2])));
    const mainland = treeline(r, 1262, 1940, 430, 2.2, 34, 40, 0);
    GEO = { back: back, front: front, islet: islet, mainland: mainland };
    return GEO;
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Defs: gradients, clips, filters (plate only)
  // ---------------------------------------------------------------------------------------------------------------
  function defs(P) {
    let d = '<defs>';
    d += linU('skyG', 0, 0, 0, 432, P.sky);
    d += linU('waterG', 0, 432, 0, 1080, P.water);
    d += radial('glowG', [[0, P.glow.c, 1], [0.38, P.glow.c, 0.45], [1, P.glow.c, 0]]);
    d += radial('clockG', [[0, P.clock, P.clockOp], [0.5, P.clock, P.clockOp * 0.75], [1, P.clock, 0]]);
    d += linU('shoreG', 0, 396, 0, 432, [[0, P.shore], [1, P.shoreBase]]);
    d += linU('hazeG', 0, 384, 0, 434, [[0, P.haze, 0], [0.6, P.haze, P.hazeOp * 0.4], [1, P.haze, P.hazeOp]]);
    d += linU('underG', 0, 488, 0, 572, [[0, P.under, P.underOp], [0.55, P.under, P.underOp * 0.55], [1, P.under, 0]]);
    d += linU('eaveG', 0, 356, 0, 382, [[0, P.wallShade, 0.95], [1, P.wallShade, 0]]);
    d += linU('roofG', 0, 328, 0, 362, [[0, P.roofLit, 0.4], [0.5, P.roof, 0], [1, P.roofShade, 0.45]]);
    d += linU('pilingG', 640, 0, 668, 0,
      [[0, P.pilingShade], [0.3, P.piling], [0.68, P.pilingLit], [0.84, P.pilingHi], [1, P.piling]]);
    d += linX('postG', [[0, P.postShade], [0.45, P.post], [0.82, P.postLit], [1, P.post]]);
    d += radial('washG', [[0, P.lampWash, 1], [0.45, P.lampWash, 0.42], [1, P.lampWash, 0]]);
    d += radial('haloG', [[0, P.lampHalo, 0.95], [0.16, P.lampHalo, 0.6], [0.5, P.lampHalo, 0.16], [1, P.lampHalo, 0]]);
    d += `<radialGradient id="vignG" cx="0.5" cy="0.3" r="0.75">${stopsOf([[0, P.clock, 0], [0.78, P.clock, 0], [1, P.clock, P.vignOp]])}</radialGradient>`;
    if (P.sun) {
      d += radial('sunG', [[0, P.sunCore], [0.62, P.sun], [1, P.sunRim]]);
      d += radial('sunHaloG', [[0, P.sunCore, 0.85], [0.3, P.sun, 0.42], [1, P.sun, 0]]);
      d += radial('glitterG', [[0, P.glitter, 0.55], [0.5, P.glitter, 0.2], [1, P.glitter, 0]]);
    }
    d += '<clipPath id="waterClip"><rect x="0" y="432" width="1920" height="648"/></clipPath>';
    d += '<clipPath id="roofClip"><polygon points="-6,332 214,330 236,358 236,362 -6,362"/></clipPath>';
    d += '<clipPath id="washClip"><rect x="-2" y="357" width="236" height="112"/><rect x="-2" y="455" width="440" height="42"/></clipPath>';
    d += '<filter id="soft"><feGaussianBlur stdDeviation="0.45"/></filter>';
    d += '<filter id="blurY"><feGaussianBlur stdDeviation="1.4 0.9"/></filter>';
    d += '<filter id="bands" filterUnits="userSpaceOnUse" x="-60" y="400" width="2040" height="700"><feGaussianBlur stdDeviation="12 1.4"/></filter>';
    d += '<filter id="worn" x="-5%" y="-20%" width="110%" height="140%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="11" result="n"/>' +
      '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 4 0 0 0 -0.8" result="m"/>' +
      '<feComposite in="SourceGraphic" in2="m" operator="in"/></filter>';
    d += '<filter id="grain" filterUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="n"/>' +
      '<feColorMatrix in="n" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 3.2 0 0 0 -1.9" result="lt"/>' +
      '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -3.2 0 0 0 1.7" result="dk"/>' +
      '<feMerge><feMergeNode in="dk"/><feMergeNode in="lt"/></feMerge></filter>';
    return d + '</defs>';
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Sky
  // ---------------------------------------------------------------------------------------------------------------
  function sky(P) {
    return `<rect x="0" y="0" width="1920" height="436" fill="url(#skyG)"/>` +
      `<g id="phase-sky-glow"><ellipse cx="${P.glow.x}" cy="432" rx="${P.glow.rx}" ry="${P.glow.ry}" fill="url(#glowG)" opacity="${o2(P.glow.o)}"/></g>`;
  }

  function stars(P) {
    if (!P.starOp) return '';
    const r = rng(1979);
    let s = '';
    for (let i = 0; i < 90; i++) {
      const x = r() * 1920, y = 10 + Math.pow(r(), 1.25) * 350, rad = 0.55 + Math.pow(r(), 3) * 1.25, b = 0.35 + r() * 0.65;
      if (y > P.starMaxY) continue;
      if (x > 1006 && x < 1170 && y > 116 && y < 280) continue; // engine moon window
      let op = b * P.starOp * (1 - 0.75 * Math.max(0, (y - 180) / 180));
      if (x > 1290 && y < 270) op *= 0.25; // keep the clock quadrant quiet
      if (op < 0.04) continue;
      if (rad > 1.35) s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(rad * 3.2)}" opacity="${o2(op * 0.16)}"/>`;
      s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(rad)}" opacity="${o2(op)}"/>`;
    }
    return `<g id="phase-stars" fill="${P.star}">${s}</g>`;
  }

  function clockShade() { // 10-18% soft darkening behind the clock quadrant (x > 1300, y < 260)
    return '<ellipse cx="1720" cy="70" rx="720" ry="400" fill="url(#clockG)"/>';
  }

  function sun(P) {
    if (!P.sun) return '';
    return '<g id="phase-sun"><ellipse cx="1080" cy="432" rx="240" ry="124" fill="url(#sunHaloG)"/>' +
      '<ellipse cx="1080" cy="432" rx="56" ry="52" fill="url(#sunG)"/></g>';
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Far shore, causeway, town
  // ---------------------------------------------------------------------------------------------------------------
  function townLights(P) {
    const r = rng(55);
    let s = '';
    for (let i = 0; i < 36; i++) {
      const x = 1304 + r() * 612, y = 427.2 + r() * 4, rad = 0.55 + r() * 0.45, a = 0.4 + r() * 0.6;
      s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(rad)}" opacity="${o2(a * P.townOp)}"/>`;
    }
    return `<g id="phase-town-lights" fill="${P.town}">${s}</g>`;
  }

  function far(P, G) {
    let s = `<path d="${G.mainland}" fill="${P.shoreFar}" opacity="0.6" filter="url(#soft)"/>`;
    s += `<g fill="${P.shoreFar}" opacity="0.75"><path d="M1786 430.5 L1787.5 430.5 L1790.6 418 L1789 418 Z M1797.6 430.5 L1799.1 430.5 L1796 418 L1794.4 418 Z"/>` +
      '<rect x="1785.6" y="410.4" width="14.8" height="8.4" rx="3.6"/><path d="M1787.6 411 L1798.4 411 L1793 406.6 Z"/></g>';
    s += `<g fill="${P.shoreFar}" filter="url(#soft)">${paths(G.back)}${paths(G.islet)}</g>`;
    s += `<g fill="url(#shoreG)" filter="url(#soft)">${paths(G.front)}</g>`;
    s += '<rect x="0" y="384" width="1920" height="50" fill="url(#hazeG)"/>';
    if (P.town) s += townLights(P);
    return s;
  }

  function causewayShapes(P) { // low bridge x 1250-1920 sitting on the horizon, y 418-436
    let piers = '';
    for (let x = 1306; x < 1920; x += 21) piers += `M${x} 424.6 h2.6 v11.6 h-2.6 Z`;
    return `<polygon points="1250,433.4 1300,420.2 1300,425 1264,433.8" fill="${P.cause}"/>` +
      `<rect x="1298" y="420" width="624" height="4.6" fill="${P.cause}"/>` +
      `<rect x="1298" y="418.3" width="624" height="1" fill="${P.cause}" opacity="0.85"/>` +
      `<rect x="1298" y="423.6" width="624" height="1.4" fill="${P.causeShade}"/>` +
      `<path d="${piers}" fill="${P.causeShade}"/>`;
  }

  function causeway(P) {
    let s = causewayShapes(P);
    if (P.causeLight) {
      let g = '', l = '';
      for (let x = 1316; x < 1920; x += 36) {
        g += `<circle cx="${x}" cy="418.6" r="4.2"/>`;
        l += `<circle cx="${x}" cy="418.6" r="1.15"/>`;
      }
      s += `<g id="phase-causeway-lights" fill="${P.causeLight}"><g opacity="0.28">${g}</g>${l}</g>`;
    }
    return s;
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Water
  // ---------------------------------------------------------------------------------------------------------------
  const BANDS = [ // cx, cy, rx, ry, light?, strength
    [520, 437, 620, 1.6, 1, 0.9], [1500, 439.5, 540, 1.5, 1, 0.8], [900, 446, 900, 3, 0, 0.7],
    [300, 455, 420, 2.4, 1, 0.6], [1420, 458, 620, 3, 1, 0.55], [800, 472, 1000, 6, 0, 0.6],
    [1660, 488, 420, 4, 1, 0.45], [1000, 503, 1100, 8, 0, 0.5], [1300, 532, 700, 9, 0, 0.45],
    [960, 610, 1300, 24, 0, 0.3], [700, 690, 900, 16, 1, 0.07], [1300, 790, 1000, 30, 0, 0.22],
    [900, 920, 1200, 40, 1, 0.05]
  ];

  function reflection(r, xc, y0, w, len, col, op, lit, litOp) { // broken vertical reflection of a post
    let s = '', y = y0;
    while (y < y0 + len) {
      const t = (y - y0) / len, h = 2.2 + r() * 3.2, off = (r() - 0.5) * 4 * (0.4 + t);
      const ww = w * (1 - 0.35 * t) * (0.8 + r() * 0.3), a = op * (1 - t) * (0.6 + r() * 0.4);
      s += `<rect x="${n(xc - ww / 2 + off)}" y="${n(y)}" width="${n(ww)}" height="${n(h)}" fill="${col}" opacity="${o2(a)}"/>`;
      if (lit) s += `<rect x="${n(xc + ww * 0.12 + off)}" y="${n(y)}" width="${n(ww * 0.22)}" height="${n(h)}" fill="${lit}" opacity="${o2(a * litOp)}"/>`;
      y += h + 0.8 + r() * 1.8;
    }
    return s;
  }

  function water(P, G) {
    let s = '<rect x="0" y="432" width="1920" height="648" fill="url(#waterG)"/>';
    s += causeway(P);
    s += `<g id="phase-water-glow" clip-path="url(#waterClip)"><ellipse cx="${P.glow.x}" cy="432" rx="${n(P.glow.rx * 0.75)}" ry="${n(P.glow.ry * 0.3)}" fill="url(#glowG)" opacity="${o2(P.glow.o * 0.55)}"/></g>`;
    s += '<g filter="url(#bands)">' + BANDS.map(b =>
      `<ellipse cx="${b[0]}" cy="${b[1]}" rx="${b[2]}" ry="${b[3]}" fill="${b[4] ? P.bandL : P.bandD}" opacity="${o2(P.bandOp * b[5])}"/>`).join('') + '</g>';
    // mirrored, squashed, softened reflections of the far shore and the causeway
    s += `<g clip-path="url(#waterClip)"><g transform="matrix(1 0 0 -0.75 0 756)" fill="${P.refl}" opacity="${o2(P.reflOp)}" filter="url(#blurY)">` +
      paths(G.back) + paths(G.islet) + paths(G.front) + '</g>';
    s += `<g transform="matrix(1 0 0 -0.8 0 784.8)" opacity="${o2(P.reflOp * 0.7)}" filter="url(#blurY)">${causewayShapes(P)}</g></g>`;
    // light ripple lines breaking the reflections near the horizon
    const r = rng(31);
    [434.8, 437.6, 440.8, 444.4, 448.4, 452.8, 457.6].forEach(y => {
      let x = r() * 80 - 40;
      while (x < 1960) {
        const len = 30 + r() * 220, gap = 24 + r() * 150;
        s += cap(x + len / 2, y, len, 0.8 + (y - 432) * 0.035, P.ripL, P.ripOp * 0.7);
        x += len + gap;
      }
    });
    if (P.causeLight) { // broken streaks under each causeway light
      const q = rng(5);
      let l = '';
      for (let x = 1316; x < 1920; x += 36) {
        let y = 438;
        for (let k = 0; k < 4; k++) {
          const h = 2 + q() * 3;
          l += `<rect x="${n(x - 0.8 + (q() - 0.5) * 1.6)}" y="${n(y)}" width="1.6" height="${n(h)}" opacity="${o2(0.75 - k * 0.17)}"/>`;
          y += h + 2 + q() * 3;
        }
      }
      s += `<g id="phase-light-reflections" fill="${P.causeLight}">${l}</g>`;
    }
    return s;
  }

  function glitter(P) { // dawn: sun path on the water below the half-risen disc
    if (!P.sun) return '';
    const r = rng(99);
    let s = '<ellipse cx="1080" cy="476" rx="150" ry="62" fill="url(#glitterG)"/>';
    [[434.6, 104, 2.2, 0.95], [437.6, 76, 2, 0.9], [441, 60, 2, 0.85], [445, 46, 2.2, 0.75], [450, 36, 2.4, 0.65],
      [456, 28, 2.4, 0.55]].forEach(b => { s += cap(1080, b[0], b[1], b[2], P.sunCore, b[3]); });
    for (let i = 0; i < 100; i++) {
      const t = Math.pow(r(), 0.85), g = (r() + r() + r() - 1.5) / 1.5, u = r(), w = r();
      s += cap(1080 + g * (22 + t * 120), 436 + t * 116, 4 + t * 26 + u * 8, 1 + t * 1.8, P.glitter, (0.95 - t * 0.85) * (0.5 + 0.5 * w));
    }
    return `<g id="phase-glitter">${s}</g>`;
  }

  function ripples(P) { // baked ripple strokes; sparse and faint below y 555
    const r = rng(42);
    let s = '';
    for (let i = 0; i < 170; i++) {
      const deep = i >= 135;
      const y = deep ? 566 + r() * 470 : 436 + Math.pow(r(), 1.35) * 116;
      const x = r() * 1920, u = r(), v = r(), w = r();
      if (!deep && x < 676 && y > 484) continue; // under the dock
      if (x > 760 && x < 900 && y > 488 && y < 532) continue; // engine bobber ripples
      if (x > 1510 && x < 1566 && y > 440 && y < 520) continue; // channel marker
      const k = Math.min(1, (y - 432) / 120);
      const len = deep ? 80 + u * 160 : 5 + k * 38 + u * 16 * (0.4 + k);
      const th = deep ? 2.4 : 0.8 + k * 1.7;
      const light = v < 0.55;
      const op = deep ? 0.05 + w * 0.05 : (0.35 + w * 0.65) * P.ripOp * (light ? 1 : 0.85);
      s += cap(x, y, len, th, light ? P.ripL : P.ripD, op);
    }
    return s;
  }

  function glints(P) { // sun / sky glints on the open water to the right
    const r = rng(77);
    let s = '';
    for (let i = 0; i < 120; i++) {
      const t = Math.pow(r(), 1.5), x = 690 + r() * 1230, u = r(), w = r(), y = 435 + t * 100;
      if (x > 760 && x < 900 && y > 488 && y < 532) continue;
      if (x > 896 && x < 1124 && y > 470) continue; // under the dinghy
      s += cap(x, y, 4 + t * 20 + u * 9, 1 + t * 1.3, P.glint, P.glintOp * (0.45 + w * 0.55) * (1 - t * 0.45));
    }
    return s + `<ellipse cx="1360" cy="441" rx="520" ry="5" fill="${P.glint}" opacity="${o2(P.glintOp * 0.3)}" filter="url(#bands)"/>`;
  }

  function marker(P) { // small green channel daymark, mid-distance right
    let s = reflection(rng(13), 1538.5, 489, 5, 26, P.marker, 0.5);
    s += `<rect x="1533" y="515" width="11" height="2.2" fill="${P.markerSign}" opacity="0.22"/>`;
    s += `<rect x="1536" y="452" width="5" height="36" fill="${P.marker}"/>`;
    s += `<rect x="1531.5" y="444" width="14" height="13" fill="${P.marker}"/><rect x="1533" y="445.5" width="11" height="10" fill="${P.markerSign}"/>`;
    return s + `<ellipse cx="1538.5" cy="488" rx="7" ry="1.3" fill="${P.ripL}" opacity="0.35"/>`;
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Near shore: mangrove clump with prop roots and one short sabal palm (far left, behind the shed)
  // ---------------------------------------------------------------------------------------------------------------
  // Canopy: one lobed silhouette (clockwise), then a top-lit mid band and light patches that follow its top edge.
  // Points are [x, y] (lobe arc into the point) or [x, y, 0] (straight edge, used off-canvas / behind the shed).
  const CANOPY_TOP = [[10, 278], [46, 262], [88, 254], [130, 260], [166, 274], [198, 290], [228, 300], [256, 316],
    [282, 332], [306, 352], [326, 370], [342, 390]];
  const CANOPY_DARK = [[-24, 470, 0], [-24, 300, 0]].concat(CANOPY_TOP, [[348, 406], [334, 416], [316, 410],
    [298, 416], [278, 410], [258, 416], [237, 417], [228, 440, 0], [226, 470, 0]]);
  const MID_DEPTH = [42, 46, 40, 44, 38, 40, 34, 32, 28, 24, 20, 14];
  const CANOPY_MID = [[-24, 300, 0]].concat(CANOPY_TOP.map(p => [p[0], p[1]]),
    CANOPY_TOP.map((p, i) => [p[0] - 4, p[1] + MID_DEPTH[i]]).reverse(), [[-24, 348, 0]]);
  const LIGHT_SPANS = [[0, 2], [3, 5], [6, 8], [9, 10]];

  function lobed(points, bulge) { // closed path; arcs bulge outward for a clockwise outline
    let d = `M${n(points[0][0])} ${n(points[0][1])}`;
    for (let i = 1; i <= points.length; i++) {
      const p = points[i % points.length], q = points[i - 1];
      const c = Math.hypot(p[0] - q[0], p[1] - q[1]);
      d += p[2] === 0 || c < 2 ? ` L${n(p[0])} ${n(p[1])}` : ` A${n(c * bulge)} ${n(c * bulge)} 0 0 1 ${n(p[0])} ${n(p[1])}`;
    }
    return d + ' Z';
  }
  const ROOTS = [[4.2, 'M234 402 C240 426 246 446 252 463'], [4.6, 'M250 398 C266 418 276 440 280 463'],
    [3.6, 'M266 403 C262 423 258 444 250 463'], [4.4, 'M286 404 C298 424 304 444 312 463'],
    [4.8, 'M300 401 C318 417 332 438 338 463'], [3.4, 'M320 407 C314 426 310 446 298 463'],
    [4.0, 'M332 410 C346 426 354 446 360 463'], [2.6, 'M280 409 C284 430 290 450 292 463'],
    [1.8, 'M244 404 C246 420 247 436 247 448'], [1.6, 'M312 406 C313 420 314 432 314 442']];
  function canopyBack(P) {
    return `<ellipse cx="292" cy="458" rx="80" ry="6" fill="${P.leafD}" opacity="0.45"/>` +
      `<path d="${lobed(CANOPY_DARK, 0.62)}" fill="${P.leafD}"/>`;
  }
  function canopyFront(P) {
    let s = `<path d="${lobed(CANOPY_MID, 0.62)}" fill="${P.leafM}"/>`;
    LIGHT_SPANS.forEach(sp => {
      const top = CANOPY_TOP.slice(sp[0], sp[1] + 1);
      const patch = top.map(p => [p[0] + 2, p[1] + 1.5]).concat(top.map((p, i) => [p[0] - 3, p[1] + 13 + (i % 2) * 4]).reverse());
      s += `<path d="${lobed(patch, 0.6)}" fill="${P.leafL}"/>`;
    });
    // a few darker leaf pockets inside the lit band, so it reads as clumps rather than a stripe
    s += `<g fill="${P.leafD}" opacity="0.55"><path d="${lobed([[60, 300], [82, 292], [100, 300], [80, 310]], 0.6)}"/>` +
      `<path d="${lobed([[150, 300], [170, 296], [184, 306], [164, 312]], 0.6)}"/>` +
      `<path d="${lobed([[252, 340], [270, 336], [282, 346], [262, 352]], 0.6)}"/></g>`;
    return s;
  }

  function roots(P) {
    let s = ROOTS.map(rt => `<path d="${rt[1]}" stroke-width="${rt[0]}"/>`).join('');
    let lit = [1, 3, 4, 6].map(i => `<path d="${ROOTS[i][1]}" transform="translate(1.4 0)"/>`).join('');
    return `<g fill="none" stroke="${P.root}" stroke-linecap="round">${s}</g>` +
      `<g fill="none" stroke="${P.rootLit}" stroke-width="1.3" stroke-linecap="round" opacity="0.6">${lit}</g>`;
  }

  function fan(cx, cy, deg, len, spreadDeg, droop) { // one sabal fan frond: stem + jagged wedge blade + fold rays
    const a0 = deg * Math.PI / 180, sp = spreadDeg * Math.PI / 180;
    const bx = cx + Math.cos(a0) * len * 0.3, by = cy + Math.sin(a0) * len * 0.3;
    const R = len * 0.7, tips = 7, tp = [];
    for (let i = 0; i <= tips * 2; i++) {
      const a = a0 - sp + 2 * sp * i / (tips * 2);
      const rr = R * (i % 2 ? 0.72 : 1) * (1 - 0.12 * Math.abs(i / tips - 1));
      tp.push([bx + Math.cos(a) * rr, by + Math.sin(a) * rr + droop * (rr / R) * (rr / R)]);
    }
    const nx = -Math.sin(a0), ny = Math.cos(a0);
    let ray = '';
    for (let i = 2; i < tips * 2; i += 2) {
      ray += `M${n(bx)} ${n(by)} L${n(bx + (tp[i][0] - bx) * 0.88)} ${n(by + (tp[i][1] - by) * 0.88)} `;
    }
    return {
      blade: `M${n(bx)} ${n(by)} L${pts(tp)} Z`,
      stem: `M${n(cx + nx * 1.8)} ${n(cy + ny * 1.8)} L${n(bx + nx)} ${n(by + ny)} L${n(bx - nx)} ${n(by - ny)} L${n(cx - nx * 1.8)} ${n(cy - ny * 1.8)} Z`,
      ray: ray.trim()
    };
  }
  const BACK_FANS = [[-152, 80, 22, 10], [-114, 76, 22, 5], [-76, 78, 22, 5], [-38, 82, 22, 9], [2, 76, 20, 13],
    [174, 74, 20, 13]];
  const FRONT_FANS = [[-133, 70, 20, 7], [-95, 68, 20, 4], [-57, 72, 20, 6], [-17, 70, 20, 10], [24, 58, 18, 12],
    [154, 60, 18, 12], [-168, 64, 18, 10]];

  function nearPalm(P) { // short sabal palm, crown centred (214, 236)
    const cx = 214, cy = 236;
    let s = '';
    [[80, 46, 9, 5], [102, 42, 9, 5]].forEach(f => { s += `<path d="${fan(cx, cy + 4, f[0], f[1], f[2], f[3]).blade}" fill="${P.trunkShade}"/>`; });
    s += `<path d="M192.5 338 C196 302 203.5 270 208 240 L220 240 C216.5 270 210.5 302 207.5 338 Z" fill="${P.trunk}"/>`;
    s += `<path d="M192.5 338 C196 302 203.5 270 208 240 L211.5 240 C207.5 270 200.5 302 198.5 338 Z" fill="${P.trunkShade}"/>`;
    let bj = '';
    for (let y = 250; y <= 330; y += 9) {
      const xc = 214 - (y - 240) / 98 * 14;
      bj += `M${n(xc - 5.5)} ${y} L${n(xc)} ${y + 4} L${n(xc + 5.5)} ${y} `;
    }
    s += `<path d="${bj.trim()}" fill="none" stroke="${P.trunkShade}" stroke-width="1.7" stroke-linecap="round" opacity="0.85"/>`;
    const back = BACK_FANS.map(f => fan(cx, cy, f[0], f[1], f[2], f[3]));
    const front = FRONT_FANS.map(f => fan(cx, cy, f[0], f[1], f[2], f[3]));
    s += `<g fill="${P.frondD}">${back.map(f => `<path d="${f.blade}"/><path d="${f.stem}"/>`).join('')}</g>`;
    s += `<ellipse cx="214" cy="240" rx="9" ry="6" fill="${P.trunkShade}"/>`;
    s += `<g fill="${P.frondM}">${front.map(f => `<path d="${f.blade}"/><path d="${f.stem}"/>`).join('')}</g>`;
    s += `<path d="${front.map(f => f.ray).join(' ')}" fill="none" stroke="${P.frondL}" stroke-width="1.1" stroke-linecap="round" opacity="0.6"/>`;
    return s;
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Dock: deck top y 466 (14 px plank ends), fascia 480-492, posts into the water to ~557 with broken reflections
  // ---------------------------------------------------------------------------------------------------------------
  const POSTS = [26, 142, 258, 374, 490, 606];

  function dock(P) {
    let s = '<rect x="0" y="486" width="672" height="86" fill="url(#underG)"/>';
    POSTS.forEach(x => {
      s += `<rect x="${x + 14.5}" y="486" width="11" height="55" fill="${P.rearPost}"/>` +
        `<ellipse cx="${x + 20}" cy="541" rx="8" ry="1.2" fill="${P.ripL}" opacity="0.14"/>`;
    });
    s += `<polygon points="149,494 149,500.5 251,549 251,542.5" fill="${P.rearPost}"/>`;
    s += `<polygon points="381,542.5 483,494 483,500.5 381,549" fill="${P.rearPost}"/>`;
    const r = rng(21);
    POSTS.forEach(x => { s += reflection(r, x, 560, 14, 42, P.postRefl, P.postReflOp); });
    POSTS.forEach(x => {
      s += `<rect x="${x - 7}" y="490" width="14" height="67.5" fill="url(#postG)"/>` +
        `<rect x="${x - 7}" y="490" width="14" height="5" fill="${P.postShade}" opacity="0.6"/>` +
        `<rect x="${x - 7}" y="547" width="14" height="10.5" fill="${P.algae}" opacity="0.5"/>` +
        `<ellipse cx="${x}" cy="557.6" rx="11.5" ry="1.9" fill="${P.ripL}" opacity="0.18"/>`; // below y 555: keep it quiet
    });
    // deck top surface, plank ends, fascia
    s += `<rect x="0" y="461" width="660" height="5.4" fill="${P.woodTop}"/>`;
    s += `<rect x="0" y="461" width="660" height="1.1" fill="${P.plankGap}" opacity="0.35"/>`;
    s += `<rect x="0" y="466" width="660" height="14" fill="${P.plankGap}"/>`;
    const rp = rng(7);
    let a = '', b = '';
    for (let x = 0; x < 659; x += 12.4) {
      const w = Math.min(11 + rp() * 0.5, 660 - x - 0.7), h = 13 + rp() * 0.9;
      const d = `M${n(x + 0.7)} 466 h${n(w)} v${n(h)} h${n(-w)} Z`;
      if (rp() < 0.5) a += d; else b += d;
    }
    s += `<path d="${a}" fill="${P.plankA}"/><path d="${b}" fill="${P.plankB}"/>`;
    s += `<rect x="0" y="466" width="660" height="1.4" fill="${P.woodTop}" opacity="0.7"/>`;
    s += `<rect x="0" y="480" width="660" height="12" fill="${P.fascia}"/>`;
    s += `<rect x="0" y="480" width="660" height="1.3" fill="${P.fasciaHi}"/>`;
    s += `<rect x="0" y="489.6" width="660" height="2.4" fill="${P.postShade}" opacity="0.7"/>`;
    s += `<g fill="${P.plankGap}">${POSTS.map(x => `<circle cx="${x - 3}" cy="486" r="1.3"/><circle cx="${x + 3}" cy="486" r="1.3"/>`).join('')}</g>`;
    s += `<rect x="656.5" y="461" width="3.5" height="31" fill="${P.woodTop}" opacity="0.35"/>`;
    // a coil of rope on the deck
    s += `<ellipse cx="318" cy="464.6" rx="22" ry="2.4" fill="${P.plankGap}" opacity="0.35"/>` +
      `<path d="M297 462 Q297 452.5 318 452.5 Q339 452.5 339 462 Q339 466 318 466 Q297 466 297 462 Z" fill="${P.ropeShade}"/>` +
      `<g fill="none" stroke="${P.rope}" stroke-linecap="round"><path d="M298.6 461.6 Q300 465 318 465 Q336 465 337.4 461.6" stroke-width="2.4"/>` +
      `<path d="M300 458.6 Q302 462 318 462 Q334 462 336 458.6" stroke-width="2.3"/><path d="M302.6 455.8 Q305 458.8 318 458.8 Q331 458.8 333.4 455.8" stroke-width="2.2"/>` +
      `<path d="M307 454 Q318 451.6 329 454" stroke-width="2"/><path d="M337 461 Q346 463 352 466" stroke-width="2.2"/></g>`;
    return s;
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Bait shed: x 0-230, y 330-470, tin roof, porch light under the eave at (205, 360), DOCK sign x 40-190, y 372-400
  // ---------------------------------------------------------------------------------------------------------------
  function shed(P) {
    let s = `<polygon points="221,361 231,364 231,468 221,468" fill="${P.wallShade}"/>`;
    s += `<rect x="-2" y="356" width="224" height="112" fill="${P.wall}"/>`;
    let boards = '';
    for (let x = 12; x < 212; x += 19) boards += `M${x} 360 h1.6 v106 h-1.6 Z`;
    s += `<path d="${boards}" fill="${P.wallLine}" opacity="0.75"/>`;
    s += `<rect x="-2" y="448" width="233" height="18" fill="${P.wallShade}" opacity="0.4"/>`;
    s += '<rect x="-2" y="356" width="233" height="26" fill="url(#eaveG)"/>';
    s += `<rect x="213" y="358" width="9" height="110" fill="${P.trim}"/><rect x="213" y="358" width="2.2" height="110" fill="${P.trimShade}"/>`;
    // window (warm-lit at dusk/night)
    s += `<rect x="16" y="406" width="58" height="44" fill="${P.wallShade}" opacity="0.7"/>`;
    s += `<rect x="18" y="408" width="54" height="40" fill="${P.trim}"/><rect x="23" y="413" width="44" height="30" fill="${P.glass}"/>`;
    s += `<path d="M23 413 L36 413 Q31 421 23 431 Z M67 413 L54 413 Q59 421 67 431 Z" fill="${P.glassShade}" opacity="0.8"/>`;
    s += `<path d="M23 413 H67 V416.5 H26.5 V443 H23 Z" fill="${P.glassShade}" opacity="0.6"/>`;
    s += `<polygon points="49,443 56,443 63,428 56,428" fill="${P.glare}" opacity="${P.lampOn ? 0 : 0.2}"/>`;
    s += `<rect x="43.8" y="413" width="2.4" height="30" fill="${P.trim}"/><rect x="23" y="426.8" width="44" height="2.4" fill="${P.trim}"/>`;
    s += `<rect x="14" y="447" width="62" height="4.5" fill="${P.trim}"/><rect x="14" y="451.5" width="62" height="2.2" fill="${P.wallShade}" opacity="0.85"/>`;
    // life ring
    s += `<path d="M104 405 V415" stroke="${P.ropeShade}" stroke-width="1.5"/>`;
    s += `<circle cx="105.6" cy="430" r="13" fill="none" stroke="${P.wallShade}" stroke-width="7" opacity="0.65"/>`;
    s += `<circle cx="104" cy="428" r="13" fill="none" stroke="${P.ring}" stroke-width="7"/>`;
    s += `<circle cx="104" cy="428" r="13" fill="none" stroke="${P.ringRed}" stroke-width="7" stroke-dasharray="10.21 10.21" transform="rotate(22 104 428)"/>`;
    s += `<circle cx="104" cy="428" r="9.7" fill="none" stroke="${P.wallShade}" stroke-width="0.9" opacity="0.55"/>`;
    // door
    s += `<rect x="144" y="406" width="54" height="62" fill="${P.trim}"/><rect x="148" y="410" width="46" height="58" fill="${P.door}"/>`;
    s += `<path d="M153 418 h16 v19 h-16 Z M173 418 h16 v19 h-16 Z M153 442 h16 v21 h-16 Z M173 442 h16 v21 h-16 Z" fill="${P.doorShade}" opacity="0.55"/>`;
    s += `<rect x="148" y="410" width="46" height="4.5" fill="${P.doorShade}"/><circle cx="189.5" cy="440" r="2" fill="${P.trimShade}"/>`;
    // DOCK sign
    s += `<rect x="43" y="375" width="150" height="28" fill="${P.wallShade}" opacity="0.6"/>`;
    s += `<rect x="40" y="372" width="150" height="28" rx="2" fill="${P.sign}"/>`;
    s += `<rect x="40" y="385.6" width="150" height="0.9" fill="${P.signEdge}" opacity="0.55"/>`;
    s += `<rect x="41" y="373" width="148" height="26" rx="1.5" fill="none" stroke="${P.signEdge}" stroke-width="1.8"/>`;
    s += `<text x="118.5" y="394.6" text-anchor="middle" font-family="Rockwell, 'Roboto Slab', Georgia, serif" font-weight="700" font-size="23" letter-spacing="7" fill="${P.signText}" filter="url(#worn)">DOCK</text>`;
    s += `<g fill="${P.signEdge}"><circle cx="45.5" cy="377" r="1.3"/><circle cx="184.5" cy="377" r="1.3"/><circle cx="45.5" cy="395" r="1.3"/><circle cx="184.5" cy="395" r="1.3"/></g>`;
    // sill board on the deck
    s += `<rect x="-2" y="463" width="234" height="6" fill="${P.trimShade}"/><rect x="-2" y="463" width="234" height="1.2" fill="${P.trim}" opacity="0.6"/>`;
    // tin roof
    s += `<polygon points="-6,332 214,330 236,358 236,362 -6,362" fill="${P.roof}"/>`;
    let ribs = '', grooves = '';
    for (let x = -4; x < 238; x += 8) {
      ribs += `M${x} 328 h2.6 v34 h-2.6 Z`;
      grooves += `M${n(x + 2.6)} 328 h1.2 v34 h-1.2 Z`;
    }
    s += `<g clip-path="url(#roofClip)"><path d="${ribs}" fill="${P.roofLit}" opacity="0.5"/><path d="${grooves}" fill="${P.roofShade}" opacity="0.45"/>`;
    // rust: a band along the eave where water sits, plus streaks running down the ribs
    s += `<g fill="${P.rust}"><path d="M-6 362 V355 Q20 352 44 355.5 Q70 351 96 354.5 Q130 352.5 160 355 Q190 351.5 236 354 V362 Z" opacity="0.38"/>` +
      '<rect x="20" y="340" width="2.6" height="16" rx="1.3" opacity="0.32"/><rect x="60" y="336" width="2.6" height="20" rx="1.3" opacity="0.4"/>' +
      '<rect x="108" y="343" width="2.6" height="13" rx="1.3" opacity="0.3"/><rect x="148" y="338" width="2.6" height="18" rx="1.3" opacity="0.36"/>' +
      '<rect x="196" y="342" width="2.6" height="14" rx="1.3" opacity="0.32"/><rect x="124" y="331" width="10" height="5" rx="2.5" opacity="0.22"/></g>';
    s += '<rect x="-6" y="328" width="244" height="34" fill="url(#roofG)"/></g>';
    s += `<rect x="-6" y="358.4" width="244" height="3.8" fill="${P.roofShade}"/><rect x="-6" y="357.5" width="244" height="1.2" fill="${P.roofLit}" opacity="0.8"/>`;
    s += `<polygon points="212,328.5 217,328.5 238.5,360.5 233.5,360.5" fill="${P.roofShade}"/>`;
    s += `<polygon points="-6,329 214,327 218,333.4 -6,335.2" fill="${P.ridge}"/>`;
    // stovepipe
    s += `<rect x="50" y="306" width="9" height="34" fill="${P.roofShade}"/><rect x="55.2" y="306" width="2.6" height="34" fill="${P.roofLit}" opacity="0.6"/>` +
      `<rect x="47.5" y="301.5" width="14" height="5" rx="1" fill="${P.roofShade}"/><ellipse cx="54.5" cy="340" rx="8" ry="2" fill="${P.roofShade}"/>`;
    // porch lamp fixture
    s += `<rect x="204" y="356" width="2" height="4" fill="${P.lampMetal}"/><polygon points="198.5,363 211.5,363 209,358.6 201,358.6" fill="${P.lampMetal}"/>` +
      `<circle cx="205" cy="365" r="3.4" fill="${P.lamp}"/>`;
    return s;
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Mooring piling: x 640-668, top y 384, waterline ~570, broken reflection below
  // ---------------------------------------------------------------------------------------------------------------
  function piling(P) {
    let s = reflection(rng(64), 654, 572, 28, 72, P.postRefl, P.postReflOp, P.pilingLit, 0.18);
    s += '<rect x="640" y="384" width="28" height="186" fill="url(#pilingG)"/>';
    s += `<rect x="640" y="384" width="28" height="4.5" fill="${P.pilingShade}" opacity="0.45"/><rect x="640" y="384" width="28" height="1.2" fill="${P.pilingHi}" opacity="0.75"/>`;
    s += `<path d="M647.2 394 L647.8 430 L646.9 470 M659.4 436 L660 482 L659.2 522 M651 498 L651.6 540" fill="none" stroke="${P.pilingShade}" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>`;
    [402, 407.5, 413].forEach(y => { // rope wrap above eye level: bands bow upward
      s += `<path d="M639 ${n(y + 2.6)} Q654 ${n(y - 2.6)} 669 ${n(y + 2.6)}" fill="none" stroke="${P.ropeShade}" stroke-width="5" stroke-linecap="round"/>` +
        `<path d="M639.4 ${n(y + 1.8)} Q654 ${n(y - 3.3)} 668.6 ${n(y + 1.8)}" fill="none" stroke="${P.rope}" stroke-width="3" stroke-linecap="round"/>`;
    });
    s += `<path d="M667.6 414 Q677 428 671.4 441" fill="none" stroke="${P.rope}" stroke-width="2.8" stroke-linecap="round"/>`;
    [480, 486].forEach(y => { // mooring tie below eye level: bands bow downward
      s += `<path d="M639 ${n(y - 2.2)} Q654 ${n(y + 3)} 669 ${n(y - 2.2)}" fill="none" stroke="${P.ropeShade}" stroke-width="5" stroke-linecap="round"/>` +
        `<path d="M639.4 ${n(y - 2.8)} Q654 ${n(y + 2.2)} 668.6 ${n(y - 2.8)}" fill="none" stroke="${P.rope}" stroke-width="3" stroke-linecap="round"/>`;
    });
    s += `<rect x="640" y="546" width="28" height="24" fill="${P.algae}" opacity="0.55"/>`;
    s += `<g fill="${P.pilingHi}" opacity="0.22"><circle cx="644" cy="553" r="1.4"/><circle cx="650" cy="560" r="1.2"/><circle cx="661" cy="556" r="1.5"/><circle cx="657" cy="565" r="1.2"/><circle cx="646" cy="566" r="1.3"/></g>`;
    return s + `<ellipse cx="654" cy="570.4" rx="19" ry="2.6" fill="${P.ripL}" opacity="0.2"/>`; // below y 555: keep it quiet
  }

  function porchLight(P) { // dusk/night: warm wash on the shed, halo round the bulb, lit window spill
    if (!P.lampOn) return '';
    return '<g id="phase-porch-light"><g clip-path="url(#washClip)">' +
      `<ellipse cx="205" cy="398" rx="215" ry="120" fill="url(#washG)" opacity="${o2(P.lampWashOp)}"/>` +
      `<ellipse cx="45" cy="430" rx="74" ry="48" fill="url(#washG)" opacity="${o2(P.lampWashOp * 0.75)}"/></g>` +
      '<circle cx="205" cy="366" r="36" fill="url(#haloG)"/>' +
      `<circle cx="205" cy="365" r="3.4" fill="${P.lamp}"/><circle cx="205" cy="365.4" r="1.7" fill="${P.lampCore}" opacity="0.9"/></g>`;
  }

  // ---------------------------------------------------------------------------------------------------------------
  function build(phase) {
    const P = PALETTES[phase];
    if (!P) throw new Error('buildPlate: unknown phase "' + phase + '" (use dawn, day, golden, dusk or night)');
    const G = geometry();
    return [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">',
      `<title>Pip's Dock plate (${phase})</title>`,
      defs(P),
      sky(P), stars(P), clockShade(), sun(P),
      far(P, G),
      water(P, G), glitter(P), ripples(P), glints(P), marker(P),
      canopyBack(P), nearPalm(P), canopyFront(P), roots(P),
      dock(P), shed(P), piling(P), porchLight(P),
      '<rect x="0" y="0" width="1920" height="1080" fill="url(#vignG)"/>',
      `<rect x="0" y="0" width="1920" height="1080" fill="${P.clock}" filter="url(#grain)" opacity="${o2(P.grainOp)}"/>`,
      '</svg>'
    ].join('\n');
  }

  return { PALETTES: PALETTES, build: build };
})();

function buildPlate(phase) {
  return PipsDockPlate.build(phase);
}
buildPlate.PALETTES = PipsDockPlate.PALETTES;
buildPlate.PHASES = ['dawn', 'day', 'golden', 'dusk', 'night'];

if (typeof module !== 'undefined') module.exports = { buildPlate: buildPlate }; else window.buildPlate = buildPlate;
