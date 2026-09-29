'use strict';
/* ============================================================
   تطوير رحلة عميل المحطات البترولية — motion piece
   1080×1920 · 60fps · 60s · deterministic render(t)
   ============================================================ */
const W = 1080, H = 1920, FPS = 60, DUR = 60;
const BPM = 128, BEAT = 60 / BPM, BAR = BEAT * 4;
const cv = document.getElementById('c');
const main = cv.getContext('2d');
let ctx = main;

const C = {
  paper: '#F3F8FD', ink: '#0B2A5E', cream: '#FFFFFF',
  orange: '#16A55A', orange2: '#22B868', yellow: '#5CC8F5', teal: '#2A9BE0',
  blue: '#1E4FA6', pink: '#8ADCF9', green: '#16A55A', red: '#0B2A5E',
  purple: '#1E4FA6', navy: '#0B2A5E', navy2: '#16407F', asphalt: '#DDE7F1',
  sky: '#CDEFFF', mint: '#8FE3B5', tan: '#CFEFDC', grey: '#8CA3BF',
  lime: '#6FD49A', pale: '#E6F5FD', paleG: '#E3F6EB',
};
const F = { disp: 'Thmanyah Sans', serif: 'Thmanyah Serif Display', body: 'Thmanyah Sans' };
let INKC = C.ink;

/* ---------------- math ---------------- */
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, d) => clamp((t - a) / d);
const E = {
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inCubic: x => x * x * x,
  inOutCubic: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  outBack: (x, s = 1.70158) => { const c = s + 1; return 1 + c * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); },
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  inExpo: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
  outQuint: x => 1 - Math.pow(1 - x, 5),
  inOutSine: x => -(Math.cos(Math.PI * x) - 1) / 2,
  outElastic: x => (x <= 0 || x >= 1) ? clamp(x) : Math.pow(2, -10 * x) * Math.sin((x * 10 - .75) * (2 * Math.PI) / 3) + 1,
};
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); }
function vnoise(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; }
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const beatPulse = t => Math.exp(-((t % BEAT) / BEAT) * 7);
let TIME = 0, BOIL = 0;

/* ---------------- pencil engine ---------------- */
function densify(pts, closed, step = 9) {
  const out = [], n = pts.length, segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(d / step));
    for (let j = 0; j < k; j++) out.push([lerp(a[0], b[0], j / k), lerp(a[1], b[1], j / k)]);
  }
  const last = closed ? pts[0] : pts[n - 1];
  out.push([last[0], last[1]]);
  return out;
}
function wobble(pts, seed, amp) {
  let s = 0; const out = [], b = (BOIL % 3) * 1.7;
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    out.push([pts[i][0] + amp * vnoise(s / 70 + seed * 7.31 + b), pts[i][1] + amp * vnoise(s / 70 + seed * 3.17 + 91.7 + b)]);
  }
  return out;
}
function strokePartial(pts, p) {
  if (p <= 0 || pts.length < 2) return null;
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const target = L[L.length - 1] * clamp(p);
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  let tip = pts[0];
  for (let i = 1; i < pts.length; i++) {
    if (L[i] <= target) { ctx.lineTo(pts[i][0], pts[i][1]); tip = pts[i]; }
    else {
      const f = (target - L[i - 1]) / ((L[i] - L[i - 1]) || 1);
      tip = [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)];
      ctx.lineTo(tip[0], tip[1]); break;
    }
  }
  ctx.stroke();
  return tip;
}
function pen(pts, p = 1, o = {}) {
  if (p <= 0) return null;
  const color = o.color || INKC, w = o.w ?? 5, seed = o.seed ?? 1, amp = o.amp ?? 2, passes = o.passes ?? 2;
  const d = densify(pts, !!o.closed, 8);
  const ga = ctx.globalAlpha;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color;
  if (o.dash) ctx.setLineDash(o.dash);
  let tip = null;
  for (let k = 0; k < passes; k++) {
    ctx.globalAlpha = ga * (o.alpha ?? 1) * (k === 0 ? 1 : 0.42);
    ctx.lineWidth = k === 0 ? w : w * 0.5;
    const tp = strokePartial(wobble(d, seed + k * 13.7, amp * (k === 0 ? 1 : 1.8)), p);
    if (k === 0) tip = tp;
  }
  ctx.restore();
  return tip;
}
function bounds(pts) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const q of pts) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
  return [x0, y0, x1, y1];
}
function toPath(pts) { const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.closePath(); return p; }
/* colored-pencil fill: flat marker + graphite hatching */
function fillPts(pts, color, p = 1, o = {}) {
  if (p <= 0) return;
  const path = toPath(pts), ga = ctx.globalAlpha;
  ctx.save();
  if (o.off) ctx.translate(o.off[0], o.off[1]);
  ctx.globalAlpha = ga * (o.alpha ?? 1) * clamp(p * 1.6);
  ctx.fillStyle = color; ctx.fill(path);
  if (o.hatch !== false) {
    ctx.clip(path);
    const [x0, y0, x1, y1] = bounds(pts), hh = y1 - y0 + 20, gap = o.gap || 13;
    const n = Math.ceil((x1 - x0 + hh) / gap) + 2, shown = Math.ceil(n * clamp(p * 1.3));
    ctx.globalAlpha = ga * (o.ha ?? 0.16) * clamp(p * 1.6);
    ctx.strokeStyle = o.hc || '#0B2A5E'; ctx.lineWidth = o.hw || 2.2;
    ctx.beginPath();
    for (let i = 0; i < shown; i++) {
      const sx = x0 - hh + i * gap + (hash(i * 3.1 + (o.seed || 0)) - .5) * 5;
      ctx.moveTo(sx, y1 + 10); ctx.lineTo(sx + hh, y0 - 10);
    }
    ctx.stroke();
  }
  ctx.restore();
}
function shape(pts, fill, p, o = {}) {
  const pf = clamp((p - 0.25) / 0.6), po = clamp(p / 0.7);
  if (fill && pf > 0) fillPts(pts, fill, pf, { off: o.off || [4, 4], hatch: o.hatch, seed: o.seed, gap: o.gap, ha: o.ha, alpha: o.fa });
  if (o.noLine) return null;
  return pen(pts, po, { closed: true, w: o.w ?? 4, seed: o.seed ?? 1, color: o.color, amp: o.amp ?? 1.4, passes: o.passes ?? 2 });
}
/* geometry */
function rrPts(x, y, w, h, r, n = 5) {
  r = Math.min(r, w / 2, h / 2);
  const pts = [], cs = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  for (const [cx, cy, a0] of cs) for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI / 2; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return pts;
}
function ellPts(cx, cy, rx, ry, a0 = -Math.PI / 2, sweep = Math.PI * 2, n = 56, grow = 0) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const f = i / n, a = a0 + sweep * f, g = 1 + grow * f; pts.push([cx + rx * g * Math.cos(a), cy + ry * g * Math.sin(a)]); }
  return pts;
}
function starPts(cx, cy, R, r, n = 5, rot = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, rr = i % 2 ? r : R; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
  return pts;
}
function dropPts(cx, cy, a, n = 60) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const th = i / n * Math.PI * 2; pts.push([cx + a * 0.78 * Math.sin(th) * Math.sin(th / 2), cy + a * 0.15 - a * Math.cos(th)]); }
  return pts;
}
function spline(pts, n = 14) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function roundCorners(pts, r, steps = 10) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    const d1 = Math.hypot(b[0] - a[0], b[1] - a[1]), d2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const rr = Math.min(r, d1 / 2, d2 / 2);
    const p1 = [b[0] + (a[0] - b[0]) / d1 * rr, b[1] + (a[1] - b[1]) / d1 * rr];
    const p2 = [b[0] + (c[0] - b[0]) / d2 * rr, b[1] + (c[1] - b[1]) / d2 * rr];
    for (let j = 0; j <= steps; j++) {
      const t = j / steps;
      out.push([(1 - t) * (1 - t) * p1[0] + 2 * (1 - t) * t * b[0] + t * t * p2[0], (1 - t) * (1 - t) * p1[1] + 2 * (1 - t) * t * b[1] + t * t * p2[1]]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function pathInfo(pts) {
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, L, len: L[L.length - 1] };
}
function posOn(pi, s) {
  s = clamp(s, 0, pi.len);
  let i = 1; while (i < pi.L.length - 1 && pi.L[i] < s) i++;
  const a = pi.pts[i - 1], b = pi.pts[i], f = (s - pi.L[i - 1]) / ((pi.L[i] - pi.L[i - 1]) || 1);
  return { x: lerp(a[0], b[0], f), y: lerp(a[1], b[1], f), ang: Math.atan2(b[0] - a[0], -(b[1] - a[1])) };
}

/* ---------------- text ---------------- */
function setFont(size, fam, weight = '') { ctx.font = `${weight || (fam === F.body ? '700' : '900')} ${size}px "${fam}"`; }
function txt(s, x, y, size, o = {}) {
  const fam = o.fam || F.disp;
  setFont(size, fam, o.weight || '');
  ctx.direction = 'rtl'; ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
  const ga = ctx.globalAlpha;
  ctx.globalAlpha = ga * (o.alpha ?? 1);
  if (o.shadow) { ctx.fillStyle = o.shadow; ctx.fillText(s, x + size * (o.sx ?? 0.05), y + size * (o.sy ?? 0.06)); }
  if (o.outline) {
    ctx.lineJoin = 'round'; ctx.strokeStyle = o.outline; ctx.lineWidth = o.ow || size * 0.07;
    for (let k = 0; k < 2; k++) {
      const jx = (hash(BOIL % 3 + k * 7 + x * .01) - .5) * 3, jy = (hash(BOIL % 3 + k * 3 + y * .01) - .5) * 3;
      ctx.strokeText(s, x + jx, y + jy);
    }
  }
  ctx.fillStyle = o.color || INKC; ctx.fillText(s, x, y);
  ctx.globalAlpha = ga;
}
function measure(s, size, fam = F.disp, weight = '') { setFont(size, fam, weight); ctx.direction = 'rtl'; return ctx.measureText(s).width; }
/* per-word kinetic line, laid out right-to-left */
function kLine(str, x, y, size, t, t0, o = {}) {
  const fam = o.fam || F.disp, weight = o.weight || '';
  setFont(size, fam, weight); ctx.direction = 'rtl';
  const ws = str.split(' '), wd = ws.map(w => ctx.measureText(w).width), sp = size * (o.gap ?? 0.24);
  const total = wd.reduce((a, b) => a + b, 0) + sp * (ws.length - 1);
  let right = o.align === 'right' ? x : o.align === 'left' ? x + total : x + total / 2;
  const info = [];
  ws.forEach((w, i) => {
    const cx = right - wd[i] / 2; right -= wd[i] + sp;
    info.push({ cx, w: wd[i] });
    const k = clamp((t - t0 - i * (o.stagger ?? 0.08)) / (o.dur ?? 0.55));
    if (k <= 0) return;
    let dx = 0, dy = 0, sc = 1, rot = 0, al = 1;
    ctx.save();
    switch (o.type || 'pop') {
      case 'pop': sc = E.outBack(k, 2.4); rot = (1 - E.outCubic(k)) * (i % 2 ? 0.22 : -0.22); al = clamp(k * 3); break;
      case 'drop': dy = -(1 - E.outBack(k, 1.8)) * size * 1.3; rot = (1 - E.outCubic(k)) * 0.18 * (i % 2 ? 1 : -1); al = clamp(k * 4); break;
      case 'slam': sc = lerp(2.8, 1, E.outExpo(k)); al = clamp(k * 3.5); break;
      case 'rise':
        ctx.beginPath(); ctx.rect(cx - wd[i] / 2 - size * .4, y - size * 1.25, wd[i] + size * .8, size * 2.05); ctx.clip();
        dy = (1 - E.outQuint(k)) * size * 1.4; break;
      case 'slide': dx = (1 - E.outExpo(k)) * 260; al = clamp(k * 2.5); break;
    }
    if (o.tOut != null) {
      const k2 = clamp((t - o.tOut - i * 0.04) / 0.35);
      dy -= E.inCubic(k2) * size * 1.2; al *= 1 - k2;
    }
    const pulse = o.pulse ? 1 + o.pulse * beatPulse(t) : 1;
    ctx.translate(cx + dx, y + dy); ctx.rotate(rot); ctx.scale(sc * pulse, sc * pulse);
    const col = Array.isArray(o.colors) ? o.colors[i % o.colors.length] : (o.color || INKC);
    txt(w, 0, 0, size, { ...o, color: col, alpha: al, align: 'center' });
    ctx.restore();
  });
  return { info, total };
}
/* highlighter swipe drawn right-to-left */
function highlighter(xr, y, w, h, p, color, seed = 1) {
  if (p <= 0) return;
  const x = xr - w * E.outCubic(p);
  const pts = [[xr + 8, y - h / 2 + 4], [x, y - h / 2 + (hash(seed) - .5) * 10], [x + 10, y + h / 2], [xr, y + h / 2 - 6]];
  fillPts(pts, color, 1, { hatch: false, alpha: 0.9 });
}

/* ---------------- props / icons (≈100 unit boxes) ---------------- */
function withT(x, y, s, rot, fn) { ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(s, s); const r = fn(); ctx.restore(); return r; }
function popScale(k, s = 2.2) { return k <= 0 ? 0 : E.outBack(clamp(k), s); }

function icoDrop(p, col = C.orange) { return shape(dropPts(0, 0, 50), col, p, { w: 4 }); }
function icoPump(p, col = C.red) {
  shape(rrPts(-40, 48, 76, 12, 4), C.ink, p, { w: 3 });
  shape(rrPts(-34, -56, 52, 106, 10), col, p, { w: 4, seed: 2 });
  shape(rrPts(-26, -44, 36, 26, 5), C.cream, seg(p, .3, .7), { w: 3, seed: 3 });
  shape(dropPts(-8, 12, 13), C.cream, seg(p, .4, .6), { w: 2.5, seed: 4, hatch: false });
  pen([[18, -26], [34, -24], [40, 6], [36, 34], [26, 44]], seg(p, .45, .5), { w: 5, seed: 5 });
  return shape([[16, -40], [34, -40], [40, -30], [30, -26], [16, -28]], C.ink, seg(p, .5, .5), { w: 3, seed: 6, hatch: false });
}
function icoCarTop(p, col = C.pink) {
  for (const [x, y] of [[-35, -40], [29, -40], [-35, 22], [29, 22]]) shape(rrPts(x, y, 7, 20, 3), C.ink, p, { w: 2, hatch: false, noLine: true });
  shape(rrPts(-31, -58, 62, 116, 20), col, p, { w: 4, seed: 7 });
  shape([[-23, -30], [23, -30], [19, -10], [-19, -10]], C.sky, seg(p, .3, .7), { w: 3, seed: 8, hatch: false });
  shape([[-19, 24], [19, 24], [23, 40], [-23, 40]], C.sky, seg(p, .3, .7), { w: 3, seed: 9, hatch: false });
  fillPts(ellPts(-18, -52, 6, 4), C.yellow, seg(p, .6, .4), { hatch: false });
  fillPts(ellPts(18, -52, 6, 4), C.yellow, seg(p, .6, .4), { hatch: false });
  return null;
}
function icoCarSide(p, col = C.orange, spin = 0) {
  shape([[-62, 12], [-60, -8], [-34, -14], [-18, -36], [26, -36], [44, -14], [62, -10], [64, 12]], col, p, { w: 4, seed: 11 });
  shape([[-12, -30], [2, -30], [2, -14], [-26, -14]], C.sky, seg(p, .3, .7), { w: 3, hatch: false, seed: 12 });
  shape([[8, -30], [22, -30], [36, -14], [8, -14]], C.sky, seg(p, .3, .7), { w: 3, hatch: false, seed: 13 });
  for (const wx of [-36, 38]) {
    shape(ellPts(wx, 14, 15, 15), C.ink, seg(p, .2, .6), { w: 3, hatch: false, seed: wx });
    ctx.save(); ctx.translate(wx, 14); ctx.rotate(spin);
    ctx.globalAlpha *= seg(p, .5, .5);
    ctx.fillStyle = C.cream; ctx.fillRect(-2, -9, 4, 18); ctx.fillRect(-9, -2, 18, 4);
    ctx.restore();
  }
  fillPts(ellPts(-60, -2, 5, 4), C.yellow, seg(p, .6, .4), { hatch: false });
  return null;
}
function icoCamera(p, col = C.pale, rec = true) {
  pen([[22, 14], [22, 42]], p, { w: 6 });
  shape(rrPts(10, 40, 28, 10, 3), C.ink, p, { w: 3, hatch: false });
  shape(rrPts(-44, -18, 76, 34, 8), col, p, { w: 4, seed: 21 });
  shape(rrPts(-50, -24, 60, 10, 4), C.ink, seg(p, .3, .7), { w: 3, seed: 22, hatch: false });
  shape(ellPts(-48, 0, 11, 11), C.ink, seg(p, .3, .7), { w: 3, seed: 23, hatch: false });
  fillPts(ellPts(-48, 0, 5, 5), C.sky, seg(p, .5, .5), { hatch: false });
  if (rec && Math.floor(TIME * 2.5) % 2 === 0) fillPts(ellPts(20, -2, 5, 5), C.red, seg(p, .6, .4), { hatch: false });
  return null;
}
function icoBarrier(p, lift = 0) {
  shape(rrPts(-12, -30, 24, 72, 5), C.ink, p, { w: 3, hatch: false });
  ctx.save(); ctx.translate(0, -16); ctx.rotate(lift);
  const L = 170;
  for (let i = 0; i < 6; i++) fillPts([[-i * L / 6, -8], [-(i + 1) * L / 6, -8], [-(i + 1) * L / 6, 8], [-i * L / 6, 8]], i % 2 ? C.cream : C.red, seg(p, .2, .6), { hatch: false });
  pen(rrPts(-L, -8, L, 16, 6), seg(p, .2, .6), { closed: true, w: 3.5, seed: 31 });
  ctx.restore();
  return shape(ellPts(0, -16, 9, 9), C.yellow, seg(p, .4, .6), { w: 3, hatch: false, seed: 32 });
}
function glow(x, y, r, col, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  const ga = ctx.globalAlpha; ctx.globalAlpha = ga * a; ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.globalAlpha = ga;
}
function icoLamp(p, on, col) {
  if (on > 0) glow(0, 0, 70, col, 0.55 * on * p);
  shape(ellPts(0, 0, 22, 22), col, p, { w: 4, seed: 41, hatch: false });
  fillPts(ellPts(-7, -7, 7, 5), '#ffffff', p * on, { hatch: false, alpha: .7 });
  if (on > 0.5) for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + TIME; pen([[Math.cos(a) * 32, Math.sin(a) * 32], [Math.cos(a) * 44, Math.sin(a) * 44]], p, { w: 3, color: col, passes: 1 }); }
  return null;
}
function icoPhone(p, col = C.blue) {
  shape(rrPts(-46, -86, 92, 172, 16), col, p, { w: 4, seed: 51 });
  shape(rrPts(-36, -70, 72, 138, 8), C.cream, seg(p, .3, .7), { w: 3, seed: 52, hatch: false });
  return fillPts(rrPts(-12, -80, 24, 5, 2), C.ink, seg(p, .5, .5), { hatch: false });
}
function icoPin(p, col = C.red) {
  const pts = [];
  for (let i = 0; i <= 40; i++) { const a = Math.PI * 0.75 + i / 40 * Math.PI * 1.5; pts.push([30 * Math.cos(a), -30 + 30 * Math.sin(a)]); }
  pts.push([0, 38]);
  shape(pts, col, p, { w: 4, seed: 61 });
  return shape(ellPts(0, -30, 11, 11), C.cream, seg(p, .4, .6), { w: 3, hatch: false, seed: 62 });
}
function icoBasket(p, col = C.green) {
  pen(ellPts(0, -10, 28, 30, Math.PI, Math.PI, 20), p, { w: 5, seed: 71 });
  shape([[-44, -10], [44, -10], [32, 38], [-32, 38]], col, p, { w: 4, seed: 72 });
  for (const x of [-18, 0, 18]) pen([[x, -2], [x * 0.8, 30]], seg(p, .5, .5), { w: 3, seed: x + 73 });
  fillPts(ellPts(-14, -18, 10, 10), C.red, seg(p, .6, .4), { hatch: false });
  return fillPts(ellPts(12, -20, 9, 12), C.yellow, seg(p, .6, .4), { hatch: false });
}
function icoCup(p, col = C.orange) {
  pen(ellPts(30, 8, 13, 14, -Math.PI / 2, Math.PI, 16), p, { w: 5, seed: 81 });
  shape([[-30, -18], [30, -18], [24, 38], [-24, 38]], col, p, { w: 4, seed: 82 });
  fillPts([[-28, 0], [28, 0], [26, 14], [-26, 14]], C.cream, seg(p, .4, .6), { hatch: false });
  for (let i = 0; i < 3; i++) {
    const x = -14 + i * 14, ph = TIME * 3 + i;
    const pts = []; for (let j = 0; j <= 8; j++) pts.push([x + Math.sin(ph + j * .8) * 5, -26 - j * 5]);
    pen(pts, seg(p, .6, .4), { w: 3, passes: 1, seed: 84 + i, alpha: .8 });
  }
  return null;
}
function icoIce(p) {
  const cone = [[-26, -4], [26, -4], [0, 62]];
  shape(cone, C.tan, p, { w: 4, seed: 91, gap: 9, ha: .3 });
  shape(ellPts(-14, -14, 20, 18), C.pink, seg(p, .2, .7), { w: 3.5, seed: 92 });
  shape(ellPts(14, -14, 20, 18), C.mint, seg(p, .25, .7), { w: 3.5, seed: 93 });
  shape(ellPts(0, -36, 20, 18), C.yellow, seg(p, .3, .7), { w: 3.5, seed: 94 });
  return shape(ellPts(2, -58, 7, 7), C.red, seg(p, .5, .5), { w: 3, hatch: false, seed: 95 });
}
function icoStar(p, col = C.yellow, fillK = 1) {
  const pts = starPts(0, 0, 48, 21);
  if (fillK > 0) fillPts(pts, col, p * fillK, { off: [4, 4], seed: 101 });
  return pen(pts, clamp(p / .7), { closed: true, w: 4, seed: 102 });
}
function icoClock(p, speed = 1, col = C.cream) {
  shape(ellPts(0, 0, 48, 48), col, p, { w: 5, seed: 111 });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; pen([[Math.cos(a) * 38, Math.sin(a) * 38], [Math.cos(a) * 44, Math.sin(a) * 44]], seg(p, .4, .6), { w: 3, passes: 1 }); }
  const a1 = TIME * speed * 2.2, a2 = TIME * speed * 0.35;
  pen([[0, 0], [Math.sin(a1) * 34, -Math.cos(a1) * 34]], seg(p, .5, .5), { w: 4, color: C.red, passes: 1 });
  pen([[0, 0], [Math.sin(a2) * 22, -Math.cos(a2) * 22]], seg(p, .5, .5), { w: 6, passes: 1 });
  return null;
}
function unionOutline(circles, cx, cy, n = 72) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
    let best = 0;
    for (const [x, y, r] of circles) {
      const ox = cx - x, oy = cy - y, b = ox * dx + oy * dy, c = ox * ox + oy * oy - r * r, disc = b * b - c;
      if (disc >= 0) best = Math.max(best, -b + Math.sqrt(disc));
    }
    pts.push([cx + dx * best, cy + dy * best]);
  }
  return pts;
}
function icoCloud(p, col = C.sky) {
  return shape(unionOutline([[-32, 8, 24], [0, -10, 32], [32, 6, 24], [-12, 16, 22], [14, 16, 22]], 0, 6), col, p, { w: 4, seed: 121 });
}
function icoGear(p, col = C.yellow, rot = 0) {
  const pts = [];
  for (let i = 0; i < 48; i++) { const a = rot + i / 48 * Math.PI * 2, r = (Math.floor(i / 3) % 2) ? 36 : 46; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
  shape(pts, col, p, { w: 4, seed: 131 });
  return shape(ellPts(0, 0, 13, 13), C.cream, seg(p, .4, .6), { w: 3, hatch: false, seed: 132 });
}
function icoWifi(p, col = C.blue) {
  for (let i = 0; i < 3; i++) pen(ellPts(0, 30, 22 + i * 20, 22 + i * 20, -Math.PI * .78, Math.PI * .56, 18), seg(p, i * .2, .6), { w: 6, color: col, seed: 141 + i });
  return fillPts(ellPts(0, 28, 7, 7), col, p, { hatch: false });
}
function icoCompass(p, col = C.teal) {
  shape([[-8, -50], [8, -50], [30, 40], [22, 44], [0, -24], [-22, 44], [-30, 40]], col, p, { w: 4, seed: 151 });
  shape(ellPts(0, -50, 12, 12), C.cream, seg(p, .3, .7), { w: 3.5, seed: 152, hatch: false });
  return pen(ellPts(0, -10, 58, 58, Math.PI * .15, Math.PI * .7, 24), seg(p, .5, .5), { w: 3, dash: [8, 9], passes: 1, seed: 153 });
}
function icoChip(p, col = C.blue) {
  for (let i = 0; i < 4; i++) {
    const o = -24 + i * 16;
    pen([[o, -40], [o, -52]], p, { w: 4, passes: 1 }); pen([[o, 40], [o, 52]], p, { w: 4, passes: 1 });
    pen([[-40, o], [-52, o]], p, { w: 4, passes: 1 }); pen([[40, o], [52, o]], p, { w: 4, passes: 1 });
  }
  shape(rrPts(-40, -40, 80, 80, 10), col, p, { w: 4, seed: 161 });
  return shape(rrPts(-18, -18, 36, 36, 6), C.yellow, seg(p, .4, .6), { w: 3, seed: 162, hatch: false });
}
function icoWarn(p) {
  shape([[0, -48], [50, 40], [-50, 40]], C.yellow, p, { w: 4.5, seed: 171 });
  if (p > .5) txt('!', 0, 10, 62, { fam: F.disp, color: C.ink, alpha: seg(p, .5, .5) });
  return null;
}
function icoSmile(p) {
  shape(ellPts(0, 0, 50, 50), C.yellow, p, { w: 5, seed: 181 });
  fillPts(ellPts(-17, -12, 6, 8), C.ink, seg(p, .5, .5), { hatch: false });
  fillPts(ellPts(17, -12, 6, 8), C.ink, seg(p, .5, .5), { hatch: false });
  return pen(ellPts(0, 4, 28, 24, Math.PI * .15, Math.PI * .7, 20), seg(p, .5, .5), { w: 5, seed: 183 });
}
function icoHeart(p, col = C.pink) {
  const pts = [];
  for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2, x = 16 * Math.pow(Math.sin(a), 3), y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); pts.push([x * 2.8, y * 2.8]); }
  return shape(pts, col, p, { w: 4, seed: 191 });
}
function icoGauge(p, col = C.teal) {
  shape([...ellPts(0, 10, 44, 44, Math.PI, Math.PI, 24), [44, 10], [-44, 10]], col, p, { w: 4, seed: 201 });
  const a = Math.PI + Math.PI * (0.25 + 0.5 * (0.5 + 0.5 * Math.sin(TIME * 2)));
  return pen([[0, 8], [Math.cos(a) * 32, 8 + Math.sin(a) * 32]], seg(p, .5, .5), { w: 5, color: C.ink, passes: 1 });
}
function icoWrench(p, col = C.purple) {
  ctx.save(); ctx.rotate(-0.8);
  shape(rrPts(-8, -10, 16, 56, 6), col, p, { w: 4, seed: 211 });
  shape(unionOutline([[0, -26, 20]], 0, -26, 40), col, p, { w: 4, seed: 212 });
  fillPts(rrPts(-7, -48, 14, 20, 3), C.cream, seg(p, .4, .6), { hatch: false });
  ctx.restore();
  return null;
}
function icoArrowsX(p) {
  pen([[-44, 40], [40, -40]], p, { w: 7, color: C.red });
  pen([[44, 40], [-40, -40]], seg(p, .2, .8), { w: 7, color: C.blue });
  shape([[40, -40], [20, -36], [36, -20]], C.red, seg(p, .5, .5), { w: 3, hatch: false });
  shape([[-40, -40], [-20, -36], [-36, -20]], C.blue, seg(p, .6, .4), { w: 3, hatch: false });
  return null;
}
function icoJam(p) {
  const cols = [C.pink, C.teal, C.yellow];
  for (let i = 0; i < 3; i++) withT(-38 + i * 38, (i % 2) * 12, 0.42, -0.25 + i * 0.25, () => icoCarTop(seg(p, i * .15, .7), cols[i]));
  return null;
}
function drawPencil(x, y, ang = -0.75, s = 1, a = 1) {
  if (a <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(11,42,94,0.18)';
  ctx.beginPath(); ctx.moveTo(10, 16); ctx.lineTo(60, 2 + 16); ctx.lineTo(230, 2 + 16); ctx.lineTo(230, 30 + 16); ctx.lineTo(60, 30 + 16); ctx.closePath(); ctx.fill();
  ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = C.ink;
  // wood cone
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(46, -15); ctx.lineTo(46, 15); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(15, -5); ctx.lineTo(15, 5); ctx.closePath(); ctx.fill();
  // body
  ctx.fillStyle = C.yellow; ctx.fillRect(46, -15, 150, 30); ctx.strokeRect(46, -15, 150, 30);
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(46, 5, 150, 10);
  ctx.fillStyle = C.grey; ctx.fillRect(196, -15, 22, 30); ctx.strokeRect(196, -15, 22, 30);
  ctx.fillStyle = C.pink; ctx.beginPath(); ctx.roundRect(218, -15, 30, 30, [0, 10, 10, 0]); ctx.fill(); ctx.stroke();
  ctx.restore();
}

/* ---------------- backgrounds & fx ---------------- */
let grainCv, vigCv;
function buildFX() {
  grainCv = document.createElement('canvas'); grainCv.width = W + 64; grainCv.height = H + 64;
  const g = grainCv.getContext('2d'), r = mulberry(7);
  for (let i = 0; i < 110000; i++) {
    const x = r() * (W + 64), y = r() * (H + 64), v = r(), s = r() * 2 + 0.6;
    g.fillStyle = v < .55 ? `rgba(11,42,94,${0.035 + r() * 0.06})` : `rgba(255,255,255,${0.04 + r() * 0.06})`;
    g.fillRect(x, y, s, s);
  }
  g.lineWidth = 1;
  for (let i = 0; i < 700; i++) {
    const x = r() * (W + 64), y = r() * (H + 64), a = r() * 6.28, l = 6 + r() * 16;
    g.strokeStyle = `rgba(11,42,94,${0.03 + r() * 0.04})`;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * .5 + 3, y + Math.sin(a) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  vigCv = document.createElement('canvas'); vigCv.width = W; vigCv.height = H;
  const v = vigCv.getContext('2d'), gr = v.createRadialGradient(W / 2, H * .46, H * .3, W / 2, H / 2, H * .78);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(4,19,48,0.2)');
  v.fillStyle = gr; v.fillRect(0, 0, W, H);
}
function bg(color) { ctx.fillStyle = color; ctx.fillRect(-100, -100, W + 200, H + 200); }
function dotGrid(color, alpha, drift = 0) {
  ctx.save(); ctx.fillStyle = color; ctx.globalAlpha *= alpha;
  const oy = drift % 54;
  for (let y = 27 - oy; y < H + 54; y += 54) for (let x = 27; x < W; x += 54) ctx.fillRect(x - 2, y - 2, 4, 4);
  ctx.restore();
}
function sunburst(cx, cy, n, rot, col, alpha) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = col;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a0 = rot + i / n * Math.PI * 2, a1 = a0 + Math.PI / n;
    ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0) * 2600, cy + Math.sin(a0) * 2600); ctx.lineTo(cx + Math.cos(a1) * 2600, cy + Math.sin(a1) * 2600);
  }
  ctx.fill(); ctx.restore();
}
function doodles(t, seed, colors, count, alpha = 1, drift = 18) {
  if (alpha <= 0) return;
  const r = mulberry(seed);
  ctx.save(); ctx.globalAlpha *= alpha;
  for (let i = 0; i < count; i++) {
    const x = r() * W, y = r() * H, d = 0.4 + r() * 0.9, kind = Math.floor(r() * 5), col = colors[Math.floor(r() * colors.length)], ph = r() * 6.28, s = 0.22 + r() * 0.28;
    let yy = (y - t * drift * d + Math.sin(t * .9 * d + ph) * 20) % (H + 200); if (yy < -100) yy += H + 200;
    const xx = x + Math.cos(t * .7 + ph) * 16 * d;
    withT(xx, yy, s * (0.9 + 0.12 * beatPulse(t)), t * .6 * d + ph, () => {
      if (kind === 0) shape(starPts(0, 0, 50, 14, 4), col, 1, { w: 5, hatch: false, seed: i });
      else if (kind === 1) pen(ellPts(0, 0, 36, 36, 0, Math.PI * 2.1), 1, { w: 8, color: col, seed: i });
      else if (kind === 2) { const pts = []; for (let j = 0; j <= 14; j++) pts.push([-60 + j * 9, Math.sin(j * 1.1) * 14]); pen(pts, 1, { w: 8, color: col, seed: i }); }
      else if (kind === 3) { pen([[-30, 0], [30, 0]], 1, { w: 9, color: col, seed: i }); pen([[0, -30], [0, 30]], 1, { w: 9, color: col, seed: i + 1 }); }
      else shape(dropPts(0, 0, 40), col, 1, { w: 5, hatch: false, seed: i });
    });
  }
  ctx.restore();
}
function lightLeak(t, col, a) {
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  glow(W * (0.8 + 0.25 * Math.sin(t * .31)), H * (0.2 + 0.15 * Math.cos(t * .23)), 900, col, a);
  ctx.restore();
}
function arrowHead(x, y, ang, s, col) {
  withT(x, y, s, ang, () => shape([[0, -26], [22, 8], [0, 0], [-22, 8]], col, 1, { w: 3, hatch: false }));
}
function chevronArrow(x, y, ang, s, col, p = 1) {
  withT(x, y, s * popScale(p, 2), ang, () => shape([[0, -34], [28, 0], [12, 0], [12, 30], [-12, 30], [-12, 0], [-28, 0]], col, 1, { w: 3.5, seed: x }));
}
function pill(x, y, text, size, fill, color, p, o = {}) {
  if (p <= 0) return;
  const w = measure(text, size, o.fam || F.body, o.weight || '900') + size * 1.1, h = size * 1.7;
  withT(x, y, popScale(p, 2.2), o.rot || 0, () => {
    shape(rrPts(-w / 2, -h / 2, w, h, h / 2), fill, 1, { w: o.lw ?? 3.5, color: o.line, hatch: false, off: [5, 6] });
    txt(text, 0, size * 0.04, size, { fam: o.fam || F.body, weight: o.weight || '900', color });
  });
}

/* ---------------- sound cue sheet (read by the audio builder) ---------------- */
const SFX = [];
const cue = (t, type, extra = {}) => SFX.push({ t: +t.toFixed(3), type, ...extra });
/* music arrangement: sections switch on these times (intro | full | tension | build | end) */
[[0, 'intro'], [3.75, 'full'], [18.75, 'tension'], [26.25, 'build'], [28.125, 'full']].forEach(([t, name]) => cue(t, 'music', { name }));

/* ============================================================
   SCENES
   ============================================================ */
const S = { s0: 0, s1: 3.75, s2: 11.25, s3: 18.75, s4: 28.125, s5: 41.25, s6: 52.5 };

/* ---------- S0 · cold open: the pencil draws a fuel drop ---------- */
const S0 = { cx: 540, cy: 880, a: 190 };
function s0(t) {
  INKC = C.ink;
  bg(C.paper); dotGrid(C.ink, 0.07);
  doodles(t, 11, [C.orange, C.teal, C.yellow, C.pink, C.blue], 18, seg(t, 1.4, .5));
  const { cx, cy } = S0;
  const squash = t > 3.0 ? 1 - 0.08 * Math.sin(seg(t, 3.0, .3) * Math.PI) : 1;
  const pulse = 1 + 0.035 * beatPulse(t) * seg(t, 1.5, .3);
  // burst rays
  const kb = seg(t, 1.25, .55);
  const rayCols = [C.teal, C.yellow, C.pink, C.blue, C.orange, C.green, C.purple];
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2 + 0.12 + t * 0.05, r0 = 250, r1 = 250 + (70 + hash(i) * 90) * E.outBack(kb, 2);
    pen([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]], kb, { w: 10, color: rayCols[i % 7], seed: i, passes: 1 });
  }
  // orbiting icons
  const icons = [[icoPump, C.red], [icoCarTop, C.teal], [icoPhone, C.blue], [icoStar, C.yellow], [icoCup, C.orange], [icoCamera, C.pale]];
  icons.forEach(([fn, col], i) => {
    const k = seg(t, 1.55 + i * .1, .5);
    if (k <= 0) return;
    const a = -Math.PI / 2 + i / icons.length * Math.PI * 2 + t * 0.35, R = 390;
    withT(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 1.05, 0.9 * popScale(k), Math.sin(t * 2 + i) * .15, () => fn(1, col));
  });
  // the drop
  const pd = seg(t, 0.12, 1.1), pf = seg(t, 0.95, .6);
  const dp = dropPts(0, 0, S0.a);
  let tip = null;
  withT(cx, cy, pulse, 0, () => {
    ctx.save(); ctx.scale(1 / squash, squash);
    if (pf > 0) fillPts(dp, C.orange, pf, { off: [12, 12], gap: 16, ha: .18 });
    tip = pen(dp, pd, { closed: true, w: 9, seed: 3 });
    pen(ellPts(-60, 40, 70, 90, Math.PI * 0.95, Math.PI * 0.45, 16), seg(t, 1.5, .4), { w: 12, color: C.cream, seed: 5, passes: 1, alpha: .9 });
    ctx.restore();
  });
  if (tip) drawPencil(cx + tip[0], cy + tip[1], -0.75, 1, 1 - seg(t, 1.2, .25));
  // brand
  kLine('هاكاثون الطاقة ٢٠٢٦م', 540, 1400, 90, t, 1.9, { type: 'pop', stagger: .12, color: C.ink, shadow: C.yellow });
  pen(spline([[860, 1478], [700, 1492], [520, 1470], [360, 1490], [220, 1476]]), seg(t, 2.35, .45), { w: 9, color: C.orange, seed: 9 });
}
cue(0.12, 'pencil', { d: 1.1 });
cue(1.25, 'pop'); cue(1.55, 'pops', { n: 6, gap: .1 });
cue(1.9, 'pops', { n: 3, gap: .12 });
cue(1.6, 'riser', { d: 2.15 });

/* ---------- S1 · title ---------- */
const ROAD1 = pathInfo(spline([[1180, 1310], [880, 1300], [640, 1400], [600, 1560], [420, 1660], [230, 1640]], 20));
function s1(t) {
  const lt = t - S.s1;
  INKC = C.ink;
  bg(C.orange);
  sunburst(540, 900, 18, lt * 0.08, C.orange2, 0.55);
  lightLeak(t, '#8FE3B5', 0.35);
  doodles(t, 21, [C.cream, C.yellow, C.ink], 16, seg(lt, .3, .5));
  const zoom = lerp(1.1, 1, E.outExpo(seg(lt, 0, 1.4))) + 0.03 * seg(lt, 1.4, 6);
  ctx.save(); ctx.translate(540, 960); ctx.scale(zoom, zoom); ctx.translate(-540, -960);
  // road
  const pr = E.inOutCubic(seg(lt, 0.9, 1.4));
  if (pr > 0) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = C.ink; ctx.lineWidth = 150; ctx.globalAlpha *= 0.9; strokePartial(ROAD1.pts, pr);
    ctx.restore();
    pen(ROAD1.pts, pr, { w: 7, color: C.yellow, dash: [30, 26], passes: 1, amp: 0.5 });
  }
  withT(150, 1560, popScale(seg(lt, 2.0, .5)), 0, () => icoPump(1, C.teal));
  const kc = seg(lt, 2.4, 3.0);
  if (kc > 0) {
    const pc = posOn(ROAD1, ROAD1.len * E.inOutSine(kc) * 0.93);
    withT(pc.x, pc.y, 1.05, pc.ang, () => icoCarTop(1, C.pink));
    if (kc < .97) for (let i = 1; i < 5; i++) {
      const pq = posOn(ROAD1, ROAD1.len * E.inOutSine(kc) * 0.93 - i * 34);
      ctx.save(); ctx.globalAlpha *= 0.5 - i * .1; ctx.fillStyle = C.cream; ctx.beginPath(); ctx.arc(pq.x, pq.y, 16 - i * 2, 0, 7); ctx.fill(); ctx.restore();
    }
  }
  // title
  const tt = { shadow: C.ink, outline: C.ink, sx: .045, sy: .065 };
  kLine('تطوير', 540, 520, 250, t, S.s1 + .25, { type: 'slam', ...tt, fam: F.serif, color: C.cream, dur: .45, pulse: .02 });
  const l2 = kLine('رحلة عميل', 540, 790, 200, t, S.s1 + .8, { type: 'drop', stagger: .16, ...tt, colors: [C.yellow, C.cream], pulse: .015 });
  kLine('المحطات البترولية', 540, 1040, 128, t, S.s1 + 1.3, { type: 'rise', stagger: .14, ...tt, color: C.cream });
  // scribble circle around «رحلة»
  const w0 = l2.info[0];
  pen(ellPts(w0.cx, 790, w0.w * .72, 150, -Math.PI * .6, Math.PI * 2.15, 60, .06), seg(lt, 1.9, .6), { w: 8, color: C.ink, seed: 14 });
  // wavy underline
  const wv = []; for (let i = 0; i <= 40; i++) wv.push([900 - i * 18, 1135 + Math.sin(i * .9) * 10]);
  pen(wv, seg(lt, 2.1, .6), { w: 9, color: C.yellow, seed: 15 });
  ctx.restore();
}
cue(S.s1, 'impact', { big: 1 }); cue(S.s1 + .25, 'slam');
cue(S.s1 + .8, 'pops', { n: 2, gap: .16 }); cue(S.s1 + 1.3, 'swish', { n: 2, gap: .14 });
cue(S.s1 + 0.9, 'pencil', { d: 1.3 }); cue(S.s1 + 1.9, 'pencil', { d: .6 });
cue(S.s1 + 2.0, 'pop'); cue(S.s1 + 2.4, 'car', { d: 3.0 });

/* ---------- S2 · the message ---------- */
function s2(t) {
  const lt = t - S.s2;
  INKC = C.ink;
  bg(C.paper); dotGrid(C.ink, 0.06, lt * 10);
  doodles(t, 31, [C.orange, C.teal, C.blue, C.yellow], 12, seg(lt, .4, .6));
  kLine('تغيير نموذج عمل', 540, 330, 132, t, S.s2 + .15, { type: 'pop', stagger: .11, color: C.ink, shadow: C.teal });
  const tw = measure('المحطات البترولية', 122) + 60;
  highlighter(540 + tw / 2, 505, tw, 120, seg(lt, .6, .45), C.yellow, 3);
  kLine('المحطات البترولية', 540, 500, 122, t, S.s2 + .75, { type: 'rise', stagger: .12, color: C.orange, outline: C.ink, ow: 7, shadow: C.ink });
  // blueprint panel
  const bx = 110, by = 650, bw = 860, bh = 660;
  const pb = seg(lt, 1.3, .5);
  if (pb > 0) {
    fillPts(rrPts(bx, by, bw, bh, 28), C.pale, pb, { off: [12, 14], hatch: false });
    ctx.save(); ctx.clip(toPath(rrPts(bx, by, bw, bh, 28)));
    ctx.globalAlpha *= 0.35 * pb; ctx.strokeStyle = C.blue; ctx.lineWidth = 1.5;
    ctx.beginPath(); for (let x = bx; x < bx + bw; x += 40) { ctx.moveTo(x, by); ctx.lineTo(x, by + bh); } for (let y = by; y < by + bh; y += 40) { ctx.moveTo(bx, y); ctx.lineTo(bx + bw, y); } ctx.stroke();
    ctx.restore();
    pen(rrPts(bx, by, bw, bh, 28), pb, { closed: true, w: 5, seed: 40 });
  }
  // station elevation sketch drawn by the pencil
  const ox = 540, gy = 1200;
  const steps = [
    [[[180, gy], [900, gy]], 1.5, .4],
    [[[250, 820], [830, 820], [790, 880], [290, 880]], 1.8, .6, true],
    [[[330, 880], [330, gy]], 2.3, .25],
    [[[750, 880], [750, gy]], 2.45, .25],
  ];
  let tip = null;
  for (const [pts, a, d, closed] of steps) { const r = pen(pts, seg(lt, a, d), { w: 6, closed, seed: a * 10 }); if (seg(lt, a, d) > 0 && seg(lt, a, d) < 1) tip = r; }
  fillPts([[250, 820], [830, 820], [790, 880], [290, 880]], C.orange, seg(lt, 2.2, .5), { off: [8, 8] });
  withT(ox - 60, gy - 80, 1.1 * popScale(seg(lt, 2.6, .5)), 0, () => icoPump(1, C.red));
  withT(ox + 110, gy - 80, 1.1 * popScale(seg(lt, 2.75, .5)), 0, () => icoPump(1, C.teal));
  withT(ox - 250, gy - 40, 1.25, 0, () => { if (seg(lt, 2.9, .6) > 0) icoCarSide(seg(lt, 2.9, .6), C.yellow); });
  if (tip) drawPencil(tip[0], tip[1], -0.75, 1);
  // design & digital layers
  withT(260, 740, popScale(seg(lt, 3.2, .5)), Math.sin(t * 1.4) * .1, () => icoCompass(1, C.teal));
  withT(ox, 760, popScale(seg(lt, 3.5, .5)) * 0.8, 0, () => icoWifi(1, C.blue));
  withT(830, 1000, popScale(seg(lt, 3.8, .5)), Math.sin(t * 1.7) * .08, () => icoPhone(1, C.blue));
  withT(850, 740, popScale(seg(lt, 4.1, .5)) * .8, 0, () => icoChip(1, C.blue));
  for (let i = 0; i < 5; i++) {
    const k = seg(lt, 4.2 + i * .08, .5);
    withT(200 + i * 170, 1260 + Math.sin(t * 2 + i) * 10, popScale(k) * .3, t + i, () => shape(starPts(0, 0, 50, 14, 4), [C.yellow, C.teal, C.pink, C.blue, C.orange][i], 1, { w: 5, hatch: false }));
  }
  kLine('من خلال إعادة هندستها', 540, 1450, 92, t, S.s2 + 2.3, { type: 'rise', stagger: .1, color: C.ink });
  const l4 = kLine('من ناحية تصميمية ورقمية', 540, 1610, 90, t, S.s2 + 3.0, { type: 'pop', stagger: .12, colors: [C.ink, C.ink, C.teal, C.blue], shadow: 'rgba(11,42,94,.15)' });
  const wT = l4.info[2], wR = l4.info[3];
  pen(spline([[wT.cx + wT.w / 2, 1690], [wT.cx, 1702], [wT.cx - wT.w / 2, 1688]]), seg(lt, 3.7, .35), { w: 8, color: C.teal, seed: 51 });
  pen(spline([[wR.cx + wR.w / 2, 1690], [wR.cx, 1704], [wR.cx - wR.w / 2, 1688]]), seg(lt, 3.9, .35), { w: 8, color: C.blue, seed: 52 });
}
cue(S.s2 + .15, 'pops', { n: 3, gap: .11 }); cue(S.s2 + .6, 'marker'); cue(S.s2 + .75, 'swish', { n: 2, gap: .12 });
cue(S.s2 + 1.3, 'pencil', { d: 1.5 }); cue(S.s2 + 2.3, 'swish', { n: 4, gap: .1 });
cue(S.s2 + 2.6, 'pops', { n: 2, gap: .15 }); cue(S.s2 + 3.0, 'pops', { n: 4, gap: .12 });
cue(S.s2 + 3.2, 'pops', { n: 4, gap: .3, hi: 1 }); cue(S.s2 + 4.2, 'sparkle');

/* ---------- S3 · the challenge (current model) ---------- */
const S3CARS = [
  { from: [1180, 925], to: [790, 925], ang: -Math.PI / 2, col: C.pink, t0: 1.9 },
  { from: [-120, 925], to: [300, 925], ang: Math.PI / 2, col: C.teal, t0: 2.05 },
  { from: [640, 1480], to: [640, 1045], ang: 0, col: C.yellow, t0: 2.3 },
  { from: [430, 520], to: [430, 805], ang: Math.PI, col: C.blue, t0: 2.5 },
  { from: [1180, 1165], to: [830, 1165], ang: -Math.PI / 2, col: C.purple, t0: 2.7 },
  { from: [1180, 1165], to: [975, 1165], ang: -Math.PI / 2, col: C.green, t0: 3.0 },
  { from: [-120, 1045], to: [270, 1045], ang: Math.PI / 2, col: C.orange, t0: 3.2 },
];
function s3(t) {
  const lt = t - S.s3;
  INKC = C.ink;
  bg(C.paper); dotGrid(C.ink, 0.06);
  doodles(t, 41, [C.red, C.ink, C.yellow], 8, seg(lt, .4, .6) * .7);
  kLine('تحديد التحدي', 540, 290, 136, t, S.s3 + .15, { type: 'pop', stagger: .12, color: C.ink, shadow: C.yellow });
  kLine('في النموذج الحالي', 540, 450, 108, t, S.s3 + .55, { type: 'rise', stagger: .1, color: C.teal });
  pen(spline([[800, 525], [640, 540], [460, 522], [280, 536]]), seg(lt, 1.0, .4), { w: 8, color: C.red, seed: 3 });
  // top-down current station
  const shake = seg(lt, 3.6, 3) * (1 - seg(lt, 6.4, .3));
  ctx.save(); ctx.beginPath(); ctx.rect(70, 590, 940, 790); ctx.clip();
  const pa = seg(lt, .7, .5);
  fillPts(rrPts(100, 610, 880, 740, 30), C.asphalt, pa, { hatch: true, ha: .08, off: [0, 0] });
  pen(rrPts(100, 610, 880, 740, 30), seg(lt, .7, .7), { closed: true, w: 5, seed: 7 });
  pen(rrPts(230, 740, 620, 480, 10), seg(lt, 1.1, .7), { closed: true, w: 4, dash: [18, 14], seed: 8, passes: 1 });
  [860, 985, 1105].forEach((y, i) => {
    const k = seg(lt, 1.3 + i * .15, .5);
    shape(rrPts(350, y - 22, 380, 44, 12), C.cream, k, { w: 4, seed: 20 + i });
    withT(460, y, .42 * popScale(k), 0, () => icoPump(1, C.red));
    withT(620, y, .42 * popScale(k), 0, () => icoPump(1, C.red));
  });
  S3CARS.forEach((c, i) => {
    const k = seg(lt, c.t0, 1.1);
    if (k <= 0) return;
    const e = E.outCubic(k);
    let x = lerp(c.from[0], c.to[0], e), y = lerp(c.from[1], c.to[1], e);
    x += Math.sin(t * 30 + i) * 2.5 * shake; y += Math.cos(t * 27 + i) * 2.5 * shake;
    withT(x, y, .95, c.ang + Math.sin(t * 8 + i) * .03 * shake, () => icoCarTop(1, c.col));
  });
  ctx.restore();
  // conflict arrows
  const arr = [
    [[[960, 870], [720, 870], [620, 960], [520, 1060], [300, 1110]], C.red, 3.5],
    [[[160, 870], [380, 880], [560, 990], [700, 1110], [950, 1100]], C.blue, 3.7],
    [[[640, 1360], [650, 1150], [560, 980], [420, 740]], C.red, 3.9],
  ];
  arr.forEach(([pts, col, a], i) => {
    const sp = spline(pts), k = seg(lt, a, .5);
    const tp = pen(sp, k, { w: 8, color: col, seed: 60 + i });
    if (k >= 1) { const n = sp.length; arrowHead(sp[n - 1][0], sp[n - 1][1], Math.atan2(sp[n - 1][0] - sp[n - 3][0], -(sp[n - 1][1] - sp[n - 3][1])), 1, col); }
  });
  // question marks & warnings
  [[790, 860], [300, 860], [640, 990], [830, 1100]].forEach(([x, y], i) => {
    const k = seg(lt, 4.3 + i * .15, .4);
    if (k > 0) withT(x + 30, y - 40 + Math.sin(t * 5 + i) * 6, popScale(k), Math.sin(t * 4 + i) * .2, () => txt('؟', 0, 0, 90, { color: C.red, outline: C.cream, ow: 12 }));
  });
  withT(900, 690, popScale(seg(lt, 4.6, .5)) * .95, 0, () => icoClock(1, 3));
  withT(180, 690, popScale(seg(lt, 4.8, .5)) * .8, Math.sin(t * 6) * .12, () => icoWarn(1));
  // challenge cards
  const cards = [['ازدحام', icoJam, C.paleG], ['تقاطع المسارات', icoArrowsX, C.pale], ['انتظار طويل', t2 => icoClock(t2, 3), '#EAF7FF']];
  cards.forEach(([label, fn, col], i) => {
    const k = seg(lt, 5.2 + i * .25, .6);
    if (k <= 0) return;
    const x = 855 - i * 315, y = 1610;
    withT(x, y, popScale(k, 2), (i - 1) * .04, () => {
      shape(rrPts(-145, -150, 290, 300, 26), col, 1, { w: 4.5, seed: 70 + i, off: [8, 10], hatch: false });
      withT(0, -50, 1.05, 0, () => fn(seg(lt, 5.35 + i * .25, .5)));
      txt(label, 0, 90, 37, { fam: F.body, weight: '900', color: C.ink });
    });
  });
  // the big red X
  const kx = seg(lt, 6.6, .22), kx2 = seg(lt, 6.8, .22);
  pen([[180, 650], [900, 1330]], kx, { w: 26, color: C.red, seed: 81 });
  pen([[900, 660], [180, 1320]], kx2, { w: 26, color: C.red, seed: 82 });
}
cue(S.s3 + .15, 'pops', { n: 2, gap: .12 }); cue(S.s3 + .55, 'swish', { n: 3, gap: .1 });
cue(S.s3 + .7, 'pencil', { d: 1.2 });
S3CARS.forEach(c => cue(S.s3 + c.t0, 'carin'));
cue(S.s3 + 3.5, 'swish', { n: 3, gap: .2 }); cue(S.s3 + 3.6, 'horn'); cue(S.s3 + 4.3, 'horn', { hi: 1 });
cue(S.s3 + 4.3, 'pops', { n: 4, gap: .15 }); cue(S.s3 + 4.6, 'tick', { d: 2.0 });
cue(S.s3 + 5.2, 'pops', { n: 3, gap: .25 });
cue(S.s3 + 6.6, 'slash'); cue(S.s3 + 6.8, 'slash'); cue(S.s3 + 6.82, 'impact');

/* ---------- S4 · the proposed model ---------- */
const S4G = (() => {
  const ex = 900, xx = 180, ys = [1310, 1120, 930], dy = 380;
  const d = Math.hypot(xx - ex, dy), dir = [(xx - ex) / d, -dy / d], nUp = [-dir[1], dir[0]];
  const nu = nUp[1] < 0 ? nUp : [-nUp[0], -nUp[1]];
  const bays = ys.map((y, k) => {
    const mid = [(ex + xx) / 2, y - dy / 2];
    const raw = roundCorners([[ex, 1520], [ex, y], [xx, y - dy], [xx, 380]], 80);
    const pi = pathInfo(densify(raw, false, 6));
    let best = 0, bd = 1e9;
    pi.pts.forEach((q, i) => { const dd = Math.hypot(q[0] - mid[0], q[1] - mid[1]); if (dd < bd) { bd = dd; best = pi.L[i]; } });
    return { y, mid, pi, stopS: best, island: [mid[0] + nu[0] * 86, mid[1] + nu[1] * 86] };
  });
  const ang = Math.atan2(dir[1], dir[0]);
  return { ex, xx, ys, dy, dir, nu, bays, ang: ang > Math.PI / 2 ? ang - Math.PI : ang < -Math.PI / 2 ? ang + Math.PI : ang };
})();
const S4CARS = [];
{
  const cols = [C.pink, C.blue, C.yellow, C.teal, C.purple, C.orange, C.green, C.red, C.pink, C.blue];
  const order = [0, 2, 1, 0, 2, 1, 0, 2, 1, 0];
  for (let i = 0; i < 10; i++) S4CARS.push({ bay: order[i], t0: S.s4 + 3.0 + i * 1.15, col: cols[i], v: 430, pause: 1.1 });
}
function carState(c, t) {
  const b = S4G.bays[c.bay], sS = b.stopS, L = b.pi.len, acc = 520;
  const TA = 2 * sS / c.v, lt = t - c.t0;
  if (lt < 0) return null;
  let s, phase;
  if (lt < TA) { const u = lt / TA; s = sS * (1 - (1 - u) * (1 - u)); phase = u > .7 ? 1 : 0; }
  else if (lt < TA + c.pause) { s = sS; phase = 1; }
  else { const u = lt - TA - c.pause; s = sS + 0.5 * acc * u * u; phase = u < .35 ? 1 : 2; }
  if (s >= L) return null;
  return { s, phase, p: posOn(b.pi, s) };
}
function s4(t) {
  const lt = t - S.s4, G = S4G;
  INKC = C.ink;
  bg(C.paper); dotGrid(C.ink, 0.06);
  doodles(t, 51, [C.green, C.teal, C.yellow], 8, seg(lt, .4, .6) * .7);
  const cz = 1 + 0.035 * E.inOutSine(seg(lt, 9, 4));
  ctx.save(); ctx.translate(540, 960); ctx.scale(cz, cz); ctx.translate(-540, -960);
  kLine('نقاط القوة', 540, 250, 136, t, S.s4 + .15, { type: 'pop', stagger: .12, color: C.green, outline: C.ink, ow: 7, shadow: C.ink });
  kLine('في النموذج المقترح', 540, 392, 92, t, S.s4 + .5, { type: 'rise', stagger: .1, color: C.ink });

  // ---- road network
  const pl = E.inOutCubic(seg(lt, .8, 1.2));
  ctx.save(); ctx.lineCap = 'butt'; ctx.lineJoin = 'round'; ctx.strokeStyle = C.asphalt; ctx.lineWidth = 132;
  strokePartial([[G.ex, 1420], [G.ex, 860]], pl);
  strokePartial([[G.xx, 1000], [G.xx, 500]], pl);
  ctx.lineWidth = 112; ctx.lineCap = 'round';
  G.bays.forEach(b => strokePartial([[G.ex, b.y], [G.xx, b.y - G.dy]], pl));
  ctx.restore();
  const edge = (a, b, off, seed, p) => pen([[a[0] + off[0], a[1] + off[1]], [b[0] + off[0], b[1] + off[1]]], p, { w: 4, seed, passes: 1 });
  edge([G.ex, 1420], [G.ex, 860], [66, 0], 1, pl); edge([G.ex, 1420], [G.ex, 1330], [-66, 0], 2, pl);
  edge([G.xx, 1000], [G.xx, 500], [-66, 0], 3, pl); edge([G.xx, 570], [G.xx, 500], [66, 0], 4, pl);
  G.bays.forEach((b, i) => {
    const n = G.nu;
    const A = [G.ex - 66, b.y - 66 * G.dy / 720], B = [G.xx + 66, b.y - G.dy + 66 * G.dy / 720];
    edge(A, B, [n[0] * 56, n[1] * 56], 10 + i, pl);
    edge(A, B, [-n[0] * 56, -n[1] * 56], 20 + i, pl);
    pen([A, B], pl, { w: 4, color: C.cream, dash: [24, 22], passes: 1, amp: .5 });
  });
  pen([[G.ex, 1420], [G.ex, 860]], pl, { w: 4, color: C.cream, dash: [24, 22], passes: 1, amp: .5 });
  pen([[G.xx, 1000], [G.xx, 500]], pl, { w: 4, color: C.cream, dash: [24, 22], passes: 1, amp: .5 });
  // lane arrows
  [[G.ex, 1250], [G.ex, 1050]].forEach(([x, y], i) => chevronArrow(x, y + Math.sin(t * 4 + i) * 4, 0, .8, C.green, seg(lt, 2.1 + i * .12, .4)));
  [[G.xx, 820], [G.xx, 640]].forEach(([x, y], i) => chevronArrow(x, y + Math.sin(t * 4 + i) * 4, 0, .8, C.orange, seg(lt, 2.35 + i * .12, .4)));
  const angDir = Math.atan2(G.dir[0], -G.dir[1]);
  G.bays.forEach((b, i) => chevronArrow(b.mid[0] - 200 * G.dir[0], b.mid[1] - 200 * G.dir[1], angDir, .42, C.ink, seg(lt, 2.5 + i * .1, .4)));

  // ---- cars (clipped to the diagram)
  ctx.save(); ctx.beginPath(); ctx.rect(40, 470, 1000, 960); ctx.clip();
  const occ = [0, 0, 0];
  const states = S4CARS.map(c => { const st = carState(c, t); if (st && st.phase === 1) occ[c.bay] = 1; return st; });
  S4CARS.forEach((c, i) => { const st = states[i]; if (st) withT(st.p.x, st.p.y, .92, st.p.ang, () => icoCarTop(1, c.col)); });
  ctx.restore();

  // ---- slanted booths
  G.bays.forEach((b, i) => {
    const k = seg(lt, 1.7 + i * .15, .55);
    if (k <= 0) return;
    withT(b.island[0], b.island[1], popScale(k), G.ang, () => {
      shape(rrPts(-140, -26, 280, 52, 16), C.cream, 1, { w: 4.5, seed: 30 + i, off: [6, 8] });
      withT(-55, 0, .38, -G.ang, () => icoPump(1, C.green));
      withT(55, 0, .38, -G.ang, () => icoPump(1, C.green));
    });
  });
  // booth lamps (green = vacant, red = occupied)
  const kl = seg(lt, 6.6, .5);
  G.bays.forEach((b, i) => {
    if (kl <= 0) return;
    const lx = b.island[0] + Math.cos(G.ang) * 175, ly = b.island[1] + Math.sin(G.ang) * 175;
    withT(lx, ly, popScale(seg(lt, 6.6 + i * .12, .45)) * .9, 0, () => icoLamp(1, occ[i] ? 0 : 1, occ[i] ? C.grey : C.green));
  });
  // slanted label
  const kb = seg(lt, 2.5, .5);
  if (kb > 0) {
    pill(800, 640, 'كبائن مائلة', 40, C.yellow, C.ink, kb, { rot: -.05 });
    const tb = G.bays[2].island;
    pen(spline([[720, 660], [680, 690], [tb[0] + 90, tb[1] - 10]]), seg(lt, 2.7, .35), { w: 5, seed: 91 });
  }
  pill(690, 1458, 'مسارات للدخول', 36, C.green, C.cream, seg(lt, 2.7, .5), { rot: .03 });
  pill(G.xx + 100, 480, 'مسارات للخروج', 36, C.orange, C.cream, seg(lt, 2.9, .5), { rot: -.03 });

  // ---- smart devices
  // barrier on entry lane
  const kbar = seg(lt, 4.2, .5);
  if (kbar > 0) {
    let open = 0;
    states.forEach(st => { if (st && st.p.x > 800 && st.p.y > 1180 && st.p.y < 1560) open = Math.max(open, clamp(1 - Math.abs(st.p.y - 1380) / 170)); });
    open = E.inOutSine(clamp(open * 1.6));
    withT(G.ex + 78, 1395, popScale(kbar) * .82, 0, () => icoBarrier(1, open * 1.35));
  }
  // cameras + scanning cones
  const kcam = seg(lt, 5.4, .5);
  if (kcam > 0) {
    [[1005, 900, Math.PI * 0.72, 1], [80, 560, Math.PI * 0.2, -1]].forEach(([x, y, base, sgn], i) => {
      const a = base + Math.sin(t * 1.6 + i) * 0.35;
      ctx.save(); ctx.globalAlpha *= 0.22 * kcam;
      ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.moveTo(x, y);
      ctx.arc(x, y, 420, a - 0.28, a + 0.28); ctx.closePath(); ctx.fill(); ctx.restore();
      withT(x, y, popScale(seg(lt, 5.4 + i * .15, .5)) * .8, a + Math.PI, () => icoCamera(1));
    });
  }
  // legend
  const kg = seg(lt, 7.0, .5);
  if (kg > 0) withT(300, 1290, popScale(kg, 1.8), -.03, () => {
    shape(rrPts(-170, -70, 340, 140, 22), C.cream, 1, { w: 4, seed: 95, off: [6, 7], hatch: false });
    withT(110, -30, .5, 0, () => icoLamp(1, 1, C.green)); txt('شاغرة', 60, -30, 38, { fam: F.body, weight: '900', align: 'right', color: C.ink });
    withT(110, 30, .5, 0, () => icoLamp(1, 0, C.grey)); txt('مشغولة', 60, 30, 38, { fam: F.body, weight: '900', align: 'right', color: C.ink });
  });
  ctx.restore();

  // ---- smart devices cards
  kLine('أجهزة ذكية تدير الحشود', 540, 1535, 68, t, S.s4 + 4.0, { type: 'rise', stagger: .08, color: C.ink, shadow: C.yellow, sx: .04, sy: .05 });
  const cards = [
    ['حواجز آلية', () => withT(40, 10, .62, 0, () => icoBarrier(1, 0.5 + 0.35 * Math.sin(t * 2.4))), 4.4, C.paleG],
    ['كاميرات مراقبة', () => withT(0, 0, .95, Math.sin(t * 1.5) * .25, () => icoCamera(1)), 5.6, C.pale],
    ['لمبات إرشادية', () => { withT(-34, 0, .78, 0, () => icoLamp(1, 1, C.green)); withT(34, 0, .78, 0, () => icoLamp(1, 0, C.grey)); }, 6.8, '#EAF7FF'],
  ];
  cards.forEach(([label, fn, a, col], i) => {
    const k = seg(lt, a, .55);
    if (k <= 0) return;
    withT(855 - i * 315, 1705, popScale(k, 2), (1 - i) * .03, () => {
      shape(rrPts(-145, -105, 290, 210, 24), col, 1, { w: 4.5, seed: 100 + i, off: [7, 9], hatch: false });
      withT(0, -32, 1, 0, fn);
      txt(label, 0, 58, 34, { fam: F.body, weight: '900', color: C.ink });
    });
  });
}
cue(S.s4 + .15, 'pops', { n: 2, gap: .12 }); cue(S.s4 + .5, 'swish', { n: 3, gap: .1 });
cue(S.s4 + .8, 'pencil', { d: 1.2 }); cue(S.s4 + 1.7, 'pops', { n: 3, gap: .15, hi: 1 });
cue(S.s4 + 2.1, 'pops', { n: 4, gap: .12 }); cue(S.s4 + 2.5, 'pop'); cue(S.s4 + 2.7, 'pops', { n: 2, gap: .2 });
cue(S.s4 + 4.0, 'swish', { n: 4, gap: .08 });
cue(S.s4 + 4.2, 'beep'); cue(S.s4 + 4.4, 'pop');
cue(S.s4 + 5.4, 'shutter'); cue(S.s4 + 5.6, 'pop');
cue(S.s4 + 6.6, 'chime'); cue(S.s4 + 6.8, 'pop'); cue(S.s4 + 7.0, 'pop');
S4CARS.forEach(c => cue(c.t0 + 0.2, 'carin', { soft: 1 }));

/* ---------- S5 · the app ---------- */
const PH = { cx: 540, cy: 1120, w: 440, h: 820 };
const SCR = { x: PH.cx - PH.w / 2 + 18, y: PH.cy - PH.h / 2 + 18, w: PH.w - 36, h: PH.h - 36 };
const FEAT = [2.4, 4.65, 6.9, 9.15];
const TLX = [930, 740, 540, 340, 150];
function screenF0(t, k) {
  const sw = SCR.w;
  fillPts(rrPts(0, 0, sw, 130, 0), C.teal, 1, { hatch: false });
  txt('بيانات السيارة', sw - 28, 78, 40, { fam: F.body, weight: '900', color: C.cream, align: 'right' });
  withT(sw / 2, 270, 2.2, 0, () => icoCarSide(k, C.orange, TIME * 4));
  const rows = [[icoDrop, C.orange, .72], [icoGauge, C.teal, .55], [icoWrench, C.purple, .9]];
  rows.forEach(([fn, col, v], i) => {
    const y = 430 + i * 95, kr = seg(k, .2 + i * .12, .5);
    if (kr <= 0) return;
    withT(0, y, 1, 0, () => {
      ctx.globalAlpha *= clamp(kr * 2);
      shape(rrPts(20, -38, sw - 40, 76, 18), C.pale, 1, { w: 3, hatch: false, off: [3, 4] });
      withT(sw - 64, 0, .5, 0, () => fn(1, col));
      fillPts(rrPts(44, -9, sw - 170, 18, 9), '#D3E3F2', 1, { hatch: false });
      fillPts(rrPts(44 + (sw - 170) * (1 - v * E.outCubic(kr)), -9, (sw - 170) * v * E.outCubic(kr), 18, 9), col, 1, { hatch: false });
    });
  });
  fillPts(rrPts(40, 700, sw - 80, 50, 25), C.orange, seg(k, .6, .4), { hatch: false, off: [0, 0] });
}
function screenF1(t, k) {
  const sw = SCR.w;
  fillPts(rrPts(0, 0, sw, 130, 0), C.purple, 1, { hatch: false });
  txt('المحطات القريبة', sw - 28, 78, 40, { fam: F.body, weight: '900', color: C.cream, align: 'right' });
  fillPts(rrPts(0, 130, sw, 400, 0), C.paleG, 1, { hatch: false });
  fillPts(unionOutline([[60, 200, 50], [110, 230, 40]], 80, 215), '#BFE8CF', 1, { hatch: false });
  ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 22; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-10, 330); ctx.bezierCurveTo(120, 300, 250, 420, sw + 10, 360); ctx.moveTo(210, 120); ctx.bezierCurveTo(190, 280, 280, 380, 240, 540); ctx.stroke();
  ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-10, 460); ctx.lineTo(sw + 10, 200); ctx.stroke(); ctx.restore();
  const user = [150, 460];
  pen(spline([user, [180, 400], [150, 330], [110, 270]]), E.inOutCubic(seg(k, .3, .5)), { w: 6, color: C.blue, dash: [12, 10], passes: 1 });
  const pr = (TIME * 1.2) % 1;
  ctx.save(); ctx.globalAlpha *= (1 - pr) * .6; ctx.strokeStyle = C.blue; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(user[0], user[1], 12 + pr * 40, 0, 7); ctx.stroke(); ctx.restore();
  fillPts(ellPts(user[0], user[1], 13, 13), C.blue, 1, { hatch: false });
  [[110, 250, C.green], [310, 200, C.yellow], [300, 440, C.red]].forEach(([x, y, col], i) => {
    withT(x, y + Math.sin(TIME * 3 + i) * 5, .6 * popScale(seg(k, .15 + i * .1, .4)), 0, () => icoPin(1, col));
  });
  [[C.green, .8], [C.yellow, .55], [C.red, .35]].forEach(([col, v], i) => {
    const y = 580 + i * 70, kr = seg(k, .35 + i * .1, .4);
    if (kr <= 0) return;
    ctx.save(); ctx.globalAlpha *= clamp(kr * 2);
    withT(sw - 48, y, .36, 0, () => icoPin(1, col));
    fillPts(rrPts(90, y - 22, sw - 180, 14, 7), '#D3E3F2', 1, { hatch: false });
    fillPts(rrPts(90 + (sw - 180) * (1 - v), y + 4, (sw - 180) * v, 12, 6), col, 1, { hatch: false });
    fillPts(ellPts(50, y - 4, 13, 13), col, 1, { hatch: false });
    ctx.restore();
  });
}
function screenF2(t, k) {
  const sw = SCR.w;
  fillPts(rrPts(0, 0, sw, 130, 0), C.orange, 1, { hatch: false });
  txt('الخدمات السحابية', sw - 28, 78, 40, { fam: F.body, weight: '900', color: C.cream, align: 'right' });
  withT(sw / 2, 225 + Math.sin(TIME * 2) * 8, 1.5 * popScale(seg(k, 0, .4)), 0, () => icoCloud(1, C.sky));
  const tiles = [['بقالة', icoBasket, C.green, C.paleG], ['مقهى', icoCup, C.orange, C.paleG], ['آيسكريم', icoIce, null, C.pale]];
  tiles.forEach(([label, fn, col, bgc], i) => {
    const kr = seg(k, .15 + i * .12, .4);
    if (kr <= 0) return;
    const y = 400 + i * 128;
    withT(sw / 2, y, popScale(kr, 2), 0, () => {
      shape(rrPts(-sw / 2 + 20, -56, sw - 40, 112, 22), bgc, 1, { w: 3.5, hatch: false, off: [4, 5] });
      withT(sw / 2 - 80, 4, .72, 0, () => fn(1, col));
      txt(label, sw / 2 - 146, 4, 38, { fam: F.body, weight: '900', color: C.ink, align: 'right' });
      fillPts(ellPts(-sw / 2 + 70, 0, 26, 26), col || C.pink, 1, { hatch: false });
      txt('+', -sw / 2 + 70, 2, 44, { fam: F.body, weight: '900', color: C.cream });
    });
  });
}
function screenF3(t, k) {
  const sw = SCR.w;
  fillPts(rrPts(0, 0, sw, 130, 0), C.yellow, 1, { hatch: false });
  txt('تقييم التجربة', sw - 28, 78, 40, { fam: F.body, weight: '900', color: C.ink, align: 'right' });
  withT(sw / 2, 290, 1.8 * popScale(seg(k, 0, .4)), Math.sin(TIME * 3) * .06, () => icoSmile(1));
  for (let i = 0; i < 5; i++) {
    const x = sw - 60 - i * 71, kf = seg(k, .25 + i * .09, .25);
    withT(x, 490, .62 * (1 + .25 * Math.sin(Math.PI * kf)), 0, () => icoStar(1, C.yellow, kf));
  }
  withT(sw / 2, 640, popScale(seg(k, .75, .3), 3) * .9, 0, () => icoHeart(1, C.pink));
}
const SCREENS = [screenF0, screenF1, screenF2, screenF3];
function s5(t) {
  const lt = t - S.s5;
  INKC = C.cream;
  bg(C.navy);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, C.navy); g.addColorStop(1, '#061A3E');
  ctx.fillStyle = g; ctx.fillRect(-100, -100, W + 200, H + 200);
  dotGrid(C.cream, 0.08, lt * 14);
  lightLeak(t, '#2A9BE0', 0.35);
  doodles(t, 61, [C.yellow, C.pink, C.teal, C.cream], 14, seg(lt, .3, .5));
  kLine('إدارة الرحلة', 540, 245, 136, t, S.s5 + .15, { type: 'pop', stagger: .12, color: C.yellow, outline: C.ink, ow: 8, shadow: C.ink });
  kLine('من خلال التطبيق', 540, 385, 88, t, S.s5 + .5, { type: 'rise', stagger: .1, color: C.cream });
  // journey timeline
  const ty = 540, ktl = seg(lt, .8, .9);
  pen([[TLX[0], ty], [TLX[4], ty]], E.inOutCubic(ktl), { w: 6, color: C.cream, dash: [16, 12], passes: 1 });
  const fi = FEAT.reduce((a, s, i) => lt >= s ? i : a, 0);
  const nodeMap = [0, 1, 3, 4];
  const kmove = E.inOutCubic(seg(lt, FEAT[fi], .6));
  const prevX = TLX[nodeMap[Math.max(0, fi - 1)]], curX = TLX[nodeMap[fi]];
  const mx = lt < FEAT[0] ? TLX[0] : lerp(fi === 0 ? TLX[0] : prevX, curX, kmove);
  const nodeIcons = [icoPin, icoPump, icoCarTop, icoCup, icoStar];
  const nodeCols = [C.red, C.teal, C.pink, C.orange, C.yellow];
  TLX.forEach((x, i) => {
    const k = seg(lt, .9 + i * .12, .4);
    if (k <= 0) return;
    const active = Math.abs(mx - x) < 60;
    withT(x, ty, popScale(k) * (active ? 1.15 : 1), 0, () => {
      shape(ellPts(0, 0, 46, 46), active ? C.cream : C.navy2, 1, { w: 4, hatch: false, off: [4, 5], color: C.cream });
      withT(0, 0, .5, 0, () => nodeIcons[i](1, nodeCols[i]));
    });
  });
  if (lt > FEAT[0] - .2) { ctx.save(); ctx.strokeStyle = C.yellow; ctx.lineWidth = 6; ctx.globalAlpha *= .9; ctx.beginPath(); ctx.arc(mx, ty, 60 + 4 * beatPulse(t), 0, 7); ctx.stroke(); ctx.restore(); }
  txt('من قبل الوصول للمحطة', 985, ty + 90, 36, { fam: F.body, weight: '800', color: C.cream, align: 'right', alpha: seg(lt, 1.3, .4) });
  txt('إلى تقييم التجربة', 95, ty + 90, 36, { fam: F.body, weight: '800', color: C.cream, align: 'left', alpha: seg(lt, 1.45, .4) });

  // phone
  const kp = seg(lt, 1.0, .9), fl = Math.sin(t * 1.3) * 10;
  ctx.save(); ctx.translate(0, fl);
  glow(PH.cx, PH.cy, 560, 'rgba(92,200,245,0.45)', kp);
  ctx.save(); ctx.globalAlpha *= .35 * kp; ctx.fillStyle = '#041330'; ctx.beginPath(); ctx.ellipse(PH.cx, PH.cy + PH.h / 2 + 50 - fl, 230, 26, 0, 0, 7); ctx.fill(); ctx.restore();
  const body = rrPts(PH.cx - PH.w / 2, PH.cy - PH.h / 2, PH.w, PH.h, 56);
  fillPts(body, C.ink, seg(lt, 1.3, .5), { hatch: false, off: [14, 16] });
  const scrPts = rrPts(SCR.x, SCR.y, SCR.w, SCR.h, 40);
  fillPts(scrPts, C.cream, seg(lt, 1.5, .4), { hatch: false });
  const ptip = pen(body, kp, { closed: true, w: 7, color: C.cream, seed: 4 });
  if (kp > 0 && kp < 1) drawPencil(ptip[0], ptip[1], -0.75, 1);
  // screen content
  if (lt > FEAT[0] - .1) {
    ctx.save(); ctx.clip(toPath(scrPts)); ctx.translate(SCR.x, SCR.y);
    INKC = C.ink;
    for (let i = 0; i < 4; i++) {
      const ks = seg(lt, FEAT[i], .5), next = i < 3 ? seg(lt, FEAT[i + 1], .5) : 0;
      if (ks <= 0 || next >= 1) continue;
      const off = -(1 - E.outExpo(ks)) * SCR.w + E.outExpo(next) * SCR.w;
      ctx.save(); ctx.translate(off, 0); SCREENS[i](t, seg(lt, FEAT[i] + .1, 1.4)); ctx.restore();
    }
    ctx.restore();
    INKC = C.cream;
  }
  fillPts(rrPts(PH.cx - 60, SCR.y + 10, 120, 26, 13), C.ink, seg(lt, 1.6, .3), { hatch: false });
  ctx.restore();
  // floating side icons
  withT(120, 900 + Math.sin(t * 1.8) * 16, .7 * popScale(seg(lt, 2.0, .5)), 0, () => icoGear(1, C.yellow, t));
  withT(960, 1000 + Math.sin(t * 1.5 + 1) * 16, .65 * popScale(seg(lt, 2.15, .5)), 0, () => icoWifi(1, C.teal));
  withT(110, 1380 + Math.sin(t * 1.6 + 2) * 16, .6 * popScale(seg(lt, 2.3, .5)), Math.sin(t) * .2, () => icoCloud(1, C.sky));
  withT(975, 1400 + Math.sin(t * 1.4 + 3) * 16, .55 * popScale(seg(lt, 2.45, .5)), 0, () => icoChip(1, C.pink));
  // captions
  const caps = ['ظهور بيانات السيارة', 'حالة ومعلومات المحطات القريبة', 'الخدمات المساندة السحابية', 'تقييم التجربة'];
  caps.forEach((c, i) => {
    if (lt < FEAT[i] || (i < 3 && lt > FEAT[i + 1] + .4)) return;
    kLine(c, 540, 1650, i === 1 ? 64 : 74, t, FEAT[i] + S.s5 + .15, { type: 'rise', stagger: .06, color: C.cream, shadow: C.ink, tOut: i < 3 ? FEAT[i + 1] + S.s5 - .05 : null });
    if (i === 2) kLine('بقالة · مقهى · آيسكريم', 540, 1760, 46, t, FEAT[i] + S.s5 + .5, { fam: F.body, weight: '800', type: 'rise', stagger: .07, colors: [C.mint, C.cream, C.yellow, C.cream, C.pink], tOut: FEAT[3] + S.s5 - .05 });
  });
}
cue(S.s5 + .15, 'pops', { n: 2, gap: .12 }); cue(S.s5 + .5, 'swish', { n: 3, gap: .1 });
cue(S.s5 + .9, 'pops', { n: 5, gap: .12, hi: 1 }); cue(S.s5 + 1.0, 'pencil', { d: .9 });
FEAT.forEach((f, i) => { cue(S.s5 + f, 'click'); cue(S.s5 + f + .02, 'whooshS'); cue(S.s5 + f + .15, 'swish', { n: 3, gap: .06 }); });
cue(S.s5 + FEAT[1] + .3, 'pops', { n: 3, gap: .1, hi: 1 }); cue(S.s5 + FEAT[2] + .25, 'pops', { n: 3, gap: .12 });
for (let i = 0; i < 5; i++) cue(S.s5 + FEAT[3] + .1 + (.25 + i * .09) * 1.4 + .2, 'ding', { i });
cue(S.s5 + FEAT[3] + .1 + 1.05 + .2, 'pop');

/* ---------- S6 · outro lockup ---------- */
function s6(t) {
  const lt = t - S.s6;
  INKC = C.ink;
  bg(C.orange);
  sunburst(540, 860, 22, -lt * 0.12, C.orange2, 0.7);
  lightLeak(t, '#8FE3B5', 0.4);
  doodles(t, 71, [C.cream, C.yellow, C.ink, C.pink], 18, seg(lt, .2, .5), 26);
  const orb = [[icoPump, C.teal], [icoCamera, C.pale], [icoPhone, C.blue], [icoCarTop, C.pink], [icoStar, C.yellow], [icoCup, C.cream], [icoIce, null], [icoBasket, C.green]];
  orb.forEach(([fn, col], i) => {
    const k = seg(lt, .3 + i * .08, .5);
    if (k <= 0) return;
    const a = -Math.PI / 2 + i / orb.length * Math.PI * 2 + lt * 0.3;
    withT(540 + Math.cos(a) * 470, 860 + Math.sin(a) * 600, .75 * popScale(k), Math.sin(t * 2 + i) * .15, () => fn(1, col));
  });
  const tt = { shadow: C.ink, outline: C.ink, sx: .045, sy: .065 };
  kLine('تطوير', 540, 640, 210, t, S.s6 + .3, { type: 'slam', ...tt, fam: F.serif, color: C.cream, dur: .45, pulse: .02 });
  kLine('رحلة عميل', 540, 860, 168, t, S.s6 + .7, { type: 'drop', stagger: .14, ...tt, colors: [C.yellow, C.cream], pulse: .015 });
  kLine('المحطات البترولية', 540, 1060, 116, t, S.s6 + 1.05, { type: 'rise', stagger: .12, ...tt, color: C.cream });
  const tw = measure('إعادة هندسة تصميمية ورقمية', 58, F.body, '900') + 60;
  highlighter(540 + tw / 2, 1210, tw, 92, seg(lt, 1.6, .4), C.yellow, 5);
  kLine('إعادة هندسة تصميمية ورقمية', 540, 1206, 58, t, S.s6 + 1.75, { type: 'pop', stagger: .07, fam: F.body, weight: '900', color: C.ink });
  // stamped badge
  const kb = seg(lt, 2.4, .35);
  if (kb > 0) {
    const sc = lerp(2.4, 1, E.outExpo(kb));
    withT(540, 1450, sc, -0.045, () => {
      ctx.globalAlpha *= clamp(kb * 3);
      const bw = measure('هاكاثون الطاقة ٢٠٢٦م', 96) + 110;
      shape(rrPts(-bw / 2, -95, bw, 190, 40), C.cream, 1, { w: 7, seed: 5, off: [12, 14], hatch: false });
      pen(rrPts(-bw / 2 + 16, -79, bw - 32, 158, 30), 1, { closed: true, w: 3, dash: [14, 10], passes: 1, seed: 6 });
      txt('هاكاثون الطاقة ٢٠٢٦م', 0, 6, 96, { color: C.ink, shadow: C.yellow, sx: .04, sy: .05 });
    });
  }
  // confetti burst
  if (lt > 2.45) {
    const r = mulberry(99), tc = lt - 2.45, cols = [C.cream, C.yellow, C.teal, C.pink, C.blue, C.ink];
    for (let i = 0; i < 110; i++) {
      const a = -Math.PI / 2 + (r() - .5) * 2.6, v = 600 + r() * 1100, spin = (r() - .5) * 14, s = 10 + r() * 16, col = cols[Math.floor(r() * cols.length)];
      const x = 540 + Math.cos(a) * v * tc * Math.exp(-tc * .4), y = 1450 + Math.sin(a) * v * tc * Math.exp(-tc * .4) + 520 * tc * tc;
      if (y > H + 50) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(spin * tc); ctx.scale(1, Math.cos(tc * 6 + i)); ctx.fillStyle = col; ctx.fillRect(-s / 2, -s / 4, s, s / 2); ctx.restore();
    }
  }
  // end fade
  const kf = seg(t, 59.45, .55);
  if (kf > 0) { ctx.save(); ctx.globalAlpha = E.inCubic(kf); ctx.fillStyle = C.ink; ctx.fillRect(-100, -100, W + 200, H + 200); ctx.restore(); }
}
cue(S.s6, 'impact', { big: 1 }); cue(S.s6 + .3, 'slam'); cue(S.s6 + .3, 'pops', { n: 8, gap: .08, hi: 1 });
cue(S.s6 + .7, 'pops', { n: 2, gap: .14 }); cue(S.s6 + 1.05, 'swish', { n: 2, gap: .12 });
cue(S.s6 + 1.6, 'marker'); cue(S.s6 + 1.75, 'pops', { n: 4, gap: .07 });
cue(S.s6 + 2.2, 'riserS', { d: .25 }); cue(S.s6 + 2.42, 'stamp'); cue(S.s6 + 2.45, 'confetti');

/* ============================================================
   TRANSITIONS
   ============================================================ */
const SCENES = [[0, s0], [S.s1, s1], [S.s2, s2], [S.s3, s3], [S.s4, s4], [S.s5, s5], [S.s6, s6]];
const TRANS = [
  { at: S.s1, pre: .6, post: .15, type: 'drop' },
  { at: S.s2, pre: .55, post: .35, type: 'scribble' },
  { at: S.s3, pre: .6, post: .3, type: 'road' },
  { at: S.s4, pre: .7, post: .35, type: 'eraser' },
  { at: S.s5, pre: .75, post: .4, type: 'phone' },
  { at: S.s6, pre: .6, post: .25, type: 'star' },
];
cue(S.s1 - .5, 'whoosh'); cue(S.s2 - .55, 'scribbleS', { d: .9 }); cue(S.s3 - .6, 'vroom');
cue(S.s4 - .7, 'erase', { d: 1.0 }); cue(S.s5 - .75, 'whoosh'); cue(S.s5 - .1, 'click'); cue(S.s6 - .6, 'whooshUp');
const bufB = document.createElement('canvas'); bufB.width = W; bufB.height = H;
const maskC = document.createElement('canvas'); maskC.width = W; maskC.height = H;
const bctx = bufB.getContext('2d'), mctx = maskC.getContext('2d');
function zig(pts, lw, p, c) { c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = lw; const o = ctx; ctx = c; strokePartial(densify(pts, false, 20), p); ctx = o; c.restore(); }
const ZIG1 = []; for (let i = 0; i < 11; i++) ZIG1.push([i % 2 ? -200 : 1280, -120 + i * 225]);
const ZIG2 = []; for (let i = 0; i < 10; i++) ZIG2.push([1160 - i * 150, i % 2 ? 2080 : -160]);
function sceneAt(t) { let f = SCENES[0][1]; for (const [a, fn] of SCENES) if (t >= a) f = fn; return f; }
function transMask(tr, k, m) {
  m.clearRect(0, 0, W, H); m.fillStyle = '#fff'; m.strokeStyle = '#fff';
  if (tr.type === 'drop') {
    const s = lerp(1, 18, E.inExpo(k)), pts = dropPts(S0.cx, S0.cy + 0, S0.a * s);
    m.beginPath(); pts.forEach((q, i) => i ? m.lineTo(q[0], q[1]) : m.moveTo(q[0], q[1])); m.fill();
  } else if (tr.type === 'scribble') zig(ZIG1, 340, E.inOutCubic(k), m);
  else if (tr.type === 'eraser') zig(ZIG2, 330, E.inOutCubic(k), m);
  else if (tr.type === 'road') { const ex = W + 200 - (W + 500) * E.inOutCubic(k); m.fillRect(ex, 0, W + 300, H); }
  else if (tr.type === 'phone') { const r = phoneRect(k); m.beginPath(); m.roundRect(r.x + r.bz, r.y + r.bz, r.w - 2 * r.bz, r.h - 2 * r.bz, Math.max(0, r.r - r.bz)); m.fill(); }
  else if (tr.type === 'star') { const R = 2800 * E.inExpo(k) + 1; m.beginPath(); starPts(PH.cx, PH.cy, R, R * .45, 5, -Math.PI / 2 + k * 1.4).forEach((q, i) => i ? m.lineTo(q[0], q[1]) : m.moveTo(q[0], q[1])); m.fill(); }
}
function phoneRect(k) {
  const a = E.outCubic(seg(k, 0, .4)), b = E.inOutCubic(seg(k, .4, .6));
  const w0 = 300, h0 = 560, cy0 = lerp(2400, 1250, a);
  const w = lerp(w0, W + 80, b), h = lerp(h0, H + 80, b), cy = lerp(cy0, H / 2, b);
  return { x: 540 - w / 2, y: cy - h / 2, w, h, r: lerp(46, 0, b), bz: lerp(14, 0, b), rot: (1 - a) * .3 };
}
function transDeco(tr, k, t) {
  if (tr.type === 'scribble' || tr.type === 'eraser') {
    const zz = tr.type === 'scribble' ? ZIG1 : ZIG2;
    const d = densify(zz, false, 20), L = pathInfo(d), p = E.inOutCubic(k);
    if (p > 0 && p < 1) {
      const q = posOn(L, L.len * p);
      if (tr.type === 'scribble') drawPencil(q.x, q.y, -0.75, 1.6);
      else {
        withT(q.x, q.y, 1.4, 0.5, () => { shape(rrPts(-70, -40, 140, 80, 14), C.pink, 1, { w: 5, off: [8, 8] }); fillPts(rrPts(-70, -40, 40, 80, 10), C.navy2, 1, { hatch: false }); });
        const r = mulberry(Math.floor(t * 30));
        for (let i = 0; i < 8; i++) { ctx.fillStyle = C.pink; ctx.globalAlpha = .7; ctx.fillRect(q.x + (r() - .5) * 220, q.y + (r() - .5) * 220, 6 + r() * 6, 4 + r() * 4); }
        ctx.globalAlpha = 1;
      }
    }
  } else if (tr.type === 'road') {
    const ex = W + 200 - (W + 500) * E.inOutCubic(k);
    for (let i = 0; i < 9; i++) { const y = 700 + i * 70 + Math.sin(i * 3) * 20; pen([[ex + 60 + hash(i) * 80, y], [ex + 260 + hash(i + 3) * 300, y]], 1, { w: 6, color: C.ink, passes: 1, alpha: .5, seed: i }); }
    for (let i = 0; i < 6; i++) { const r = 30 + hash(i) * 40; fillPts(ellPts(ex + 120 + hash(i + 9) * 100, 1080 + (hash(i + 5) - .5) * 60, r, r * .8), '#DDE7F1', .9, { hatch: false }); }
    withT(ex, 960, 2.6, 0, () => icoCarSide(1, C.red, -t * 25));
  } else if (tr.type === 'phone') {
    const r = phoneRect(k);
    ctx.save(); ctx.globalAlpha *= clamp(1 - seg(k, .75, .25));
    ctx.lineWidth = r.bz * 2 + 8; ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.roundRect(r.x + r.bz, r.y + r.bz, r.w - 2 * r.bz, r.h - 2 * r.bz, Math.max(0, r.r - r.bz)); ctx.stroke();
    ctx.lineWidth = 6; ctx.strokeStyle = C.cream; ctx.beginPath(); ctx.roundRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4, r.r); ctx.stroke();
    ctx.restore();
  } else if (tr.type === 'star') {
    const R = 2800 * E.inExpo(k) + 1;
    pen(starPts(PH.cx, PH.cy, R, R * .45, 5, -Math.PI / 2 + k * 1.4), 1, { closed: true, w: 16, color: C.yellow, passes: 1 });
  }
}
function drawScenes(t) {
  const tr = TRANS.find(q => t >= q.at - q.pre && t < q.at + q.post);
  if (!tr) { sceneAt(t)(t); return; }
  const k = (t - (tr.at - tr.pre)) / (tr.pre + tr.post);
  const A = sceneAt(tr.at - 0.001), B = sceneAt(tr.at);
  A(t);
  if (tr.type === 'road' || tr.type === 'eraser' || tr.type === 'scribble') { /* painted edge under B */
    if (tr.type === 'scribble') { ctx.save(); ctx.strokeStyle = C.yellow; zig(ZIG1, 380, E.inOutCubic(clamp(k + .03)), ctx); ctx.restore(); }
  }
  bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.globalAlpha = 1; bctx.globalCompositeOperation = 'source-over'; bctx.clearRect(0, 0, W, H);
  const o = ctx; ctx = bctx; B(t); ctx = o;
  transMask(tr, k, mctx);
  bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.globalCompositeOperation = 'destination-in'; bctx.drawImage(maskC, 0, 0); bctx.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bufB, 0, 0); ctx.restore();
  transDeco(tr, k, t);
}

/* ============================================================
   HUD, camera shake, main render
   ============================================================ */
const IMPACTS = [[S.s1, 26], [S.s1 + .3, 16], [S.s3 + 6.82, 22], [S.s6, 20], [S.s6 + .35, 12], [S.s6 + 2.55, 26]];
function shake(t) {
  let x = 0, y = 0;
  IMPACTS.forEach(([a, s], i) => { const d = t - a; if (d >= 0 && d < .6) { const e = s * Math.exp(-d * 8); x += e * vnoise(t * 38 + i * 10); y += e * vnoise(t * 41 + i * 20 + 5); } });
  return [x, y];
}
function hud(t) {
  const dark = (t >= S.s1 && t < S.s2 - .3) || (t >= S.s5 - .1);
  const col = dark ? C.cream : C.ink;
  const kin = seg(t, S.s1 + 1.0, .5) * (1 - seg(t, S.s6 - .3, .3));
  if (kin > 0) {
    ctx.save(); ctx.globalAlpha = kin;
    txt('هاكاثون الطاقة ٢٠٢٦م', 70, 96, 34, { fam: F.body, weight: '900', color: col, align: 'left' });
    withT(52, 96, .22, 0, () => icoDrop(1, C.yellow));
    ctx.restore();
  }
  const chips = [[S.s2, '٠١ · الرسالة', C.orange], [S.s3, '٠٢ · التحدي', C.red], [S.s4, '٠٣ · النموذج المقترح', C.green], [S.s5, '٠٤ · التطبيق', C.yellow]];
  chips.forEach(([a, label, c], i) => {
    const end = i < 3 ? chips[i + 1][0] : S.s6;
    if (t < a + .1 || t > end - .35) return;
    const k = seg(t, a + .1, .45) * (1 - seg(t, end - .6, .25));
    pill(1010 - measure(label, 30, F.body, '900') / 2 - 30, 96, label, 30, c, c === C.yellow ? C.ink : C.cream, k);
  });
  // progress road
  const x0 = 1000, x1 = 80, y = 1872, pr = t / DUR;
  ctx.save(); ctx.globalAlpha = .9 * seg(t, .5, .5) * (1 - seg(t, 59.3, .4));
  pen([[x0, y], [x1, y]], 1, { w: 3, color: col, dash: [10, 10], passes: 1, alpha: .5 });
  pen([[x0, y], [lerp(x0, x1, pr), y]], 1, { w: 6, color: dark ? C.yellow : C.orange, passes: 1 });
  withT(lerp(x0, x1, pr), y - 16, .34, 0, () => icoCarSide(1, dark ? C.yellow : C.orange, -t * 10));
  ctx.restore();
}
function render(t) {
  TIME = t; BOIL = Math.floor(t * 12);
  ctx = main;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const [sx, sy] = shake(t);
  ctx.save(); ctx.translate(sx, sy);
  drawScenes(t);
  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  if (t < 59.5) hud(t);
  const b = BOIL % 4; ctx.drawImage(grainCv, -((b * 13) % 64), -((b * 29) % 64));
  ctx.drawImage(vigCv, 0, 0);
}

/* ============================================================
   boot
   ============================================================ */
window.SFX = SFX;
window.DUR = DUR;
window.render = render;
window.ready = (async () => {
  const sample = 'هاكاثون الطاقة ٢٠٢٦م رحلة abc 0123';
  await Promise.all(['900 100px "Thmanyah Sans"', '700 40px "Thmanyah Sans"', '500 40px "Thmanyah Sans"', '900 100px "Thmanyah Serif Display"', '700 100px "Thmanyah Serif Display"'].map(f => document.fonts.load(f, sample)));
  await document.fonts.ready;
  buildFX();
  return true;
})();
const qs = new URLSearchParams(location.search);
if (qs.has('render')) document.body.classList.add('render');
else window.ready.then(() => {
  if (qs.has('t')) { render(+qs.get('t')); return; }
  const t0 = performance.now();
  const loop = () => { render(((performance.now() - t0) / 1000) % DUR); requestAnimationFrame(loop); };
  loop();
});
