'use strict';
/* =====================================================================
   موظف X10 — "كيف تكون عضوًا فعّالًا في الفريق؟"
   Procedural 2D paper / Vox-style motion graphic. 1080×1920 @ 60fps, 180s.
   Everything is a pure function of time: renderFrame(t).
   ===================================================================== */
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const W = 1080, H = 1920, FPS = 60, DUR = 180;
let T = 0, BF = 0; // global time, "boil" frame (12fps hand-drawn wobble)

const COL = {
  paper: '#F4ECDD', paper2: '#EADFC8', ink: '#221C1A', white: '#FFFCF4', cream: '#FFF6E4',
  yellow: '#FFC83D', yellow2: '#FFB51F', orange: '#FF7F3F', red: '#EF4B55', pink: '#FF8FB1',
  teal: '#12B3A3', blue: '#3A7BFA', navy: '#1C2C66', green: '#3DAA5C', purple: '#8A5CF6',
  sky: '#8ED1FC', ocean: '#4FA9DE', skin: '#F1BE93', gray: '#9AA0A6', brown: '#9C5B34'
};
const PALETTE = [COL.red, COL.teal, COL.blue, COL.purple, COL.orange, COL.green, COL.pink, COL.yellow];

/* ------------------------------- math ------------------------------- */
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  lin: t => t,
  inQ: t => t * t,
  outQ: t => 1 - (1 - t) * (1 - t),
  inC: t => t * t * t,
  outC: t => 1 - Math.pow(1 - t, 3),
  ioC: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  outB: t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outX: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  ioX: t => t <= 0 ? 0 : t >= 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outEl: t => t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1,
};
const hash = n => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
const jit = (seed, amp) => (hash(seed * 1.37 + BF * 7.13) - 0.5) * 2 * amp;
const pop = (t, t0, d = 0.5) => E.outB(P(t, t0, t0 + d));
const bump = (t, t0, d = 0.4) => { const p = P(t, t0, t0 + d); return Math.sin(p * Math.PI) * (1 - p); };
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ----------------------------- drawing ------------------------------ */
function font(size, fam = 'C', wt) {
  if (fam === 'L') ctx.font = `400 ${size}px Lalezar`;
  else ctx.font = `${wt || 900} ${size}px Cairo`;
}
function shadowOn(off = 12, blur = 14, a = 0.28) {
  ctx.shadowColor = `rgba(40,22,6,${a})`; ctx.shadowOffsetX = off * 0.35; ctx.shadowOffsetY = off; ctx.shadowBlur = blur;
}
function shadowOff() { ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function circ(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }
function fillC(x, y, r, c) { circ(x, y, r); ctx.fillStyle = c; ctx.fill(); }

// Paper with torn edges (static per seed)
function tornPath(x, y, w, h, seed, amp = 7, step = 26) {
  ctx.beginPath(); let i = 0;
  const pt = (px, py) => { i++; ctx.lineTo(px + (hash(seed + i * 3.1) - 0.5) * amp, py + (hash(seed + i * 5.7) - 0.5) * amp); };
  ctx.moveTo(x, y);
  for (let k = step; k < w; k += step) pt(x + k, y);
  ctx.lineTo(x + w, y);
  for (let k = step; k < h; k += step) pt(x + w, y + k);
  ctx.lineTo(x + w, y + h);
  for (let k = w - step; k > 0; k -= step) pt(x + k, y + h);
  ctx.lineTo(x, y + h);
  for (let k = h - step; k > 0; k -= step) pt(x, y + k);
  ctx.closePath();
}
function paperCard(w, h, color, seed = 1, amp = 7, sh = 1) {
  if (sh) shadowOn(14 * sh, 16 * sh, 0.3);
  tornPath(-w / 2, -h / 2, w, h, seed, amp); ctx.fillStyle = color; ctx.fill();
  shadowOff();
}
function tape(x, y, w, h, rot, c = 'rgba(255,236,170,0.85)') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath();
  const n = 6;
  ctx.moveTo(-w / 2, -h / 2);
  ctx.lineTo(w / 2, -h / 2);
  for (let i = 0; i <= n; i++) ctx.lineTo(w / 2 + (i % 2 ? 6 : 0), -h / 2 + h * i / n);
  ctx.lineTo(-w / 2, h / 2);
  for (let i = n; i >= 0; i--) ctx.lineTo(-w / 2 - (i % 2 ? 6 : 0), -h / 2 + h * i / n);
  ctx.closePath(); ctx.fillStyle = c; ctx.fill();
  ctx.restore();
}
// Hand-drawn polyline with boil jitter and draw-on progress
function sketch(pts, o = {}) {
  const { prog = 1, amp = 1.6, seed = 1, lw = 6, color = COL.ink, closed = false, dash = null, alpha = 1 } = o;
  if (prog <= 0 || pts.length < 2) return;
  const q = pts.map((p, i) => [p[0] + jit(seed + i, amp), p[1] + jit(seed + i + 50, amp)]);
  if (closed) q.push(q[0]);
  let tot = 0; const segs = [];
  for (let i = 1; i < q.length; i++) { const d = Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]); segs.push(d); tot += d; }
  let lim = tot * prog;
  ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]);
  for (let i = 1; i < q.length; i++) {
    const d = segs[i - 1];
    if (lim >= d) { ctx.lineTo(q[i][0], q[i][1]); lim -= d; }
    else { const f = d ? lim / d : 0; ctx.lineTo(lerp(q[i - 1][0], q[i][0], f), lerp(q[i - 1][1], q[i][1], f)); break; }
  }
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.stroke(); ctx.restore();
}
function circlePts(cx, cy, rx, ry, n = 48, a0 = 0, turns = 1) {
  const r = []; for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI * 2 * turns; r.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return r;
}
function scribbleCircle(cx, cy, rx, ry, prog, color = COL.red, lw = 9, seed = 3) {
  const pts = []; const n = 70;
  for (let i = 0; i <= n; i++) {
    const f = i / n; const a = -Math.PI * 0.7 + f * Math.PI * 2 * 1.18;
    const k = 1 + 0.05 * Math.sin(f * 8 + seed) + f * 0.08;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  sketch(pts, { prog, color, lw, seed, amp: 1.2 });
}
function underline(x1, x2, y, prog, color = COL.red, lw = 8, seed = 5) {
  const pts = []; const n = 24;
  for (let i = 0; i <= n; i++) { const f = i / n; pts.push([lerp(x1, x2, f), y + Math.sin(f * 7 + seed) * 5]); }
  sketch(pts, { prog, color, lw, seed });
}
function starPath(cx, cy, r1, r2, n, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1; const a = rot + i * Math.PI / n; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  ctx.closePath();
}
function sunburst(cx, cy, c1, c2, rot, n = 18) {
  ctx.fillStyle = c1; ctx.fillRect(-50, -50, W + 100, H + 100);
  ctx.fillStyle = c2;
  for (let i = 0; i < n; i++) {
    const a = rot + i * 2 * Math.PI / n;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 2600, a, a + Math.PI / n); ctx.closePath(); ctx.fill();
  }
}
function halftone(x, y, w, h, color, sp, maxR, fn) {
  ctx.fillStyle = color;
  for (let yy = 0, row = 0; yy <= h; yy += sp, row++) {
    for (let xx = (row % 2) * sp / 2; xx <= w; xx += sp) {
      const r = maxR * fn(xx / w, yy / h);
      if (r < 0.6) continue;
      ctx.beginPath(); ctx.arc(x + xx, y + yy, r, 0, Math.PI * 2); ctx.fill();
    }
  }
}
function arrowHead(x, y, ang, s, color = COL.ink) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * 0.6, -s * 0.75); ctx.lineTo(-s * 0.25, 0); ctx.lineTo(-s * 0.6, s * 0.75); ctx.closePath();
  ctx.fillStyle = color; ctx.fill(); ctx.restore();
}

/* ------------------------------- text ------------------------------- */
function txt(s, x, y, size, fam = 'C', wt = 900, color = COL.ink, align = 'center', o = {}) {
  font(size, fam, wt);
  ctx.direction = o.ltr ? 'ltr' : 'rtl'; ctx.textAlign = align; ctx.textBaseline = 'middle';
  const yy = y + size * (fam === 'L' ? 0.1 : 0.06);
  if (o.drop) { ctx.fillStyle = o.drop; ctx.fillText(s, x + (o.dx ?? 5), yy + (o.dy ?? 7)); }
  if (o.stroke) { ctx.lineWidth = o.stroke; ctx.strokeStyle = o.sc || COL.ink; ctx.lineJoin = 'round'; ctx.strokeText(s, x, yy); }
  ctx.fillStyle = color; ctx.fillText(s, x, yy);
  return ctx.measureText(s).width;
}
function measure(s, size, fam = 'C', wt = 900) { font(size, fam, wt); ctx.direction = 'rtl'; return ctx.measureText(s).width; }

function layout(str, size, fam, wt, maxW) {
  font(size, fam, wt); ctx.direction = 'rtl';
  const gap = Math.max(ctx.measureText(' ').width * 1.5, size * (fam === 'L' ? 0.24 : 0.3));
  const lines = [];
  for (const para of str.split('\n')) {
    let cur = [], curW = 0;
    for (const w of para.split(' ').filter(Boolean)) {
      const ww = ctx.measureText(w).width;
      if (cur.length && curW + gap + ww > maxW) { lines.push({ words: cur, w: curW }); cur = []; curW = 0; }
      curW += (cur.length ? gap : 0) + ww; cur.push({ t: w, w: ww });
    }
    lines.push({ words: cur, w: curW });
  }
  return { lines, gap };
}
// marker highlight whose right edge is at x, sweeping leftwards (RTL)
function marker(xr, y, w, h, color, prog, seed = 0) {
  if (prog <= 0) return;
  const ww = w * prog;
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(xr + 4, y - h / 2 + jit(seed, 2));
  ctx.lineTo(xr - ww, y - h / 2 + 4 + jit(seed + 1, 2));
  ctx.lineTo(xr - ww - 5, y + h / 2 + jit(seed + 2, 2));
  ctx.lineTo(xr + 2, y + h / 2 - 3 + jit(seed + 3, 2));
  ctx.closePath(); ctx.fill();
}
// Sound-design logger: records the onset time of every kinetic word (used by sfxdump.js)
const SFXSEEN = new Set();
function sfxMark(key, t, kind, size, fam) {
  if (SFXSEEN.has(key)) return; SFXSEEN.add(key);
  window.SFXLOG.push([+t.toFixed(3), kind, size, fam]);
}
/* Kinetic text. Words animate individually (Arabic shaping stays intact per word).
   t is local time since the text started. Returns word boxes. */
function kText(str, x, y, t, o = {}) {
  const size = o.size || 80, fam = o.fam || 'L', wt = o.wt || 900;
  const lh = o.lh || size * (fam === 'L' ? 1.28 : 1.5);
  const maxW = o.maxW || W - 140, align = o.align || 'center';
  const st = o.st ?? 0.06, dur = o.dur || 0.55;
  const L = layout(str, size, fam, wt, maxW);
  const n = L.lines.length;
  let ly = o.top ? y + lh / 2 : y - (n - 1) * lh / 2;
  const boxes = [];
  let idx = 0;
  for (const ln of L.lines) {
    let right = align === 'center' ? x + ln.w / 2 : align === 'right' ? x : x + ln.w;
    for (const wd of ln.words) {
      const i = idx++;
      const cx = right - wd.w / 2; right -= wd.w + L.gap;
      boxes.push({ t: wd.t, cx, cy: ly, w: wd.w });
      if (t == null) continue;
      const lt = (t - i * st) / dur; if (lt <= 0) continue;
      if (window.SFXLOG && lt < 0.1) sfxMark(`${str}|${i}|${x | 0}|${y | 0}`, T - lt * dur, o.anim || 'pop', size, fam);
      const p = clamp(lt);
      let s = 1, dy = 0, a = 1, rot = 0;
      switch (o.anim || 'pop') {
        case 'pop': s = E.outB(p); a = clamp(p * 3); dy = (1 - E.outC(p)) * size * 0.35; break;
        case 'rise': dy = (1 - E.outX(p)) * size * 0.8; a = clamp(p * 2.2); break;
        case 'slam': s = lerp(2.3, 1, E.outC(p)); a = clamp(p * 4); rot = (1 - p) * 0.25 * (i % 2 ? 1 : -1); break;
        case 'drop': dy = -(1 - E.outB(p)) * size * 1.1; a = clamp(p * 3); break;
      }
      if (o.out != null && t > o.out) {
        if (window.SFXLOG && i === 0 && t - o.out < 0.05) sfxMark(`${str}|out|${x | 0}|${y | 0}`, T - (t - o.out), 'out', size, fam);
        const q = clamp((t - o.out - i * 0.02) / 0.32); const qe = E.inC(q);
        a *= 1 - q; dy += qe * size * 0.9; s *= 1 - qe * 0.3; rot += qe * 0.2 * (i % 2 ? 1 : -1);
      }
      if (a <= 0.002) continue;
      ctx.save(); ctx.globalAlpha *= a;
      ctx.translate(cx, ly + dy);
      ctx.rotate(rot + (o.wob ? Math.sin(i * 1.7 + T * 3) * o.wob : 0));
      ctx.scale(s, s);
      if (o.hl && o.hl.includes(wd.t)) {
        const hp = E.outC(clamp((lt - 0.55) / 0.4));
        marker(wd.w / 2 + size * 0.14, size * 0.12, wd.w + size * 0.28, size * 0.62, o.hlc || COL.yellow, hp, i);
      }
      const col = (o.colors && o.colors[wd.t]) || o.color || COL.ink;
      txt(wd.t, 0, 0, size, fam, wt, col, 'center', { drop: o.drop, dx: o.dx, dy: o.dy, stroke: o.stroke, sc: o.sc });
      ctx.restore();
    }
    ly += lh;
  }
  return boxes;
}

/* ------------------------------ icons ------------------------------- */
function person(x, y, s, col, skin = COL.skin) {
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x - s * 0.5, y);
  ctx.bezierCurveTo(x - s * 0.52, y - s * 0.74, x + s * 0.52, y - s * 0.74, x + s * 0.5, y);
  ctx.closePath(); ctx.fill();
  fillC(x, y - s * 0.8, s * 0.24, skin);
}
function gearPath(r, teeth, depth = 0.2) {
  ctx.beginPath(); const step = Math.PI * 2 / teeth; const ri = r * (1 - depth);
  for (let j = 0; j < teeth; j++) {
    const a = j * step;
    const pts = [[ri, a], [r, a + step * 0.12], [r, a + step * 0.45], [ri, a + step * 0.58]];
    for (const [rad, ang] of pts) ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
  }
  ctx.closePath();
}
function pin(x, y, s, col) {
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x - s * 0.95, y - s * 1.1, x - s * 0.8, y - s * 2.3, x, y - s * 2.3);
  ctx.bezierCurveTo(x + s * 0.8, y - s * 2.3, x + s * 0.95, y - s * 1.1, x, y);
  ctx.fill();
  fillC(x, y - s * 1.5, s * 0.36, COL.white);
}
function plane(x, y, ang, s, col = COL.white) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  shadowOn(6, 6, 0.3);
  ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s, -s * 0.7); ctx.lineTo(-s * 0.55, 0); ctx.lineTo(-s, s * 0.7); ctx.closePath();
  ctx.fillStyle = col; ctx.fill(); shadowOff();
  ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * 0.55, 0); ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}
function badge(x, y, r, color, label, o = {}) {
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); if (o.s != null) ctx.scale(o.s, o.s);
  shadowOn(8, 10, 0.3); fillC(0, 0, r, color); shadowOff();
  circ(0, 0, r * 0.84); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]);
  txt(label, 0, 0, o.size || r * 1.1, o.fam || 'L', 900, o.fg || COL.white, 'center', { ltr: true });
  ctx.restore();
}
function chip(s, x, y, size, bg, fg, o = {}) {
  const fam = o.fam || 'C', wt = o.wt || 800;
  font(size, fam, wt); ctx.direction = 'rtl';
  const tw = ctx.measureText(s).width; const extra = o.tri ? size * 0.9 : 0;
  const w = tw + size * 1.2 + extra, h = size * 1.6;
  const cx = o.anchor === 'right' ? x - w / 2 : o.anchor === 'left' ? x + w / 2 : x;
  ctx.save(); ctx.globalAlpha *= (o.alpha ?? 1);
  ctx.translate(cx, y); ctx.rotate(o.rot || 0); const sc = o.scale ?? 1; ctx.scale(sc, sc);
  if (o.shadow !== false) shadowOn(7, 9, 0.25);
  rr(-w / 2, -h / 2, w, h, o.radius ?? h / 2); ctx.fillStyle = bg; ctx.fill(); shadowOff();
  txt(s, (w / 2 - size * 0.6), 0, size, fam, wt, fg, 'right', { ltr: o.ltr });
  if (o.tri) { // little "up" triangle on the left
    const tx = -w / 2 + size * 0.85; ctx.fillStyle = o.triC || fg; ctx.beginPath();
    ctx.moveTo(tx, -size * 0.34); ctx.lineTo(tx + size * 0.34, size * 0.26); ctx.lineTo(tx - size * 0.34, size * 0.26); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  return w;
}
function brand(x, y, s = 1, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s, s);
  const w1 = measure('موظف', 80, 'L');
  const sw = 158, gap = 16, pad = 34; const W0 = w1 + sw + gap + pad * 2, H0 = 124;
  if (o.shadow !== false) shadowOn(10, 12, 0.32);
  rr(-W0 / 2, -H0 / 2, W0, H0, 28); ctx.fillStyle = COL.ink; ctx.fill(); shadowOff();
  txt('موظف', W0 / 2 - pad, 0, 80, 'L', 400, COL.white, 'right');
  ctx.save(); ctx.translate(-W0 / 2 + pad + sw / 2 - 6, 0); ctx.rotate(-0.1);
  rr(-sw / 2, -52, sw, 104, 18); ctx.fillStyle = COL.red; ctx.fill();
  txt('X10', 0, 0, 84, 'L', 400, COL.white, 'center', { ltr: true });
  ctx.restore();
  ctx.restore();
  return W0 * s;
}

/* ---------------------------- textures ------------------------------ */
const TEX = document.createElement('canvas'); TEX.width = W; TEX.height = H;
(function makeTexture() {
  const tc = TEX.getContext('2d'); const rnd = mulberry32(1234);
  const id = tc.createImageData(W, H); const d = id.data;
  for (let i = 0; i < W * H; i++) { const v = 238 + rnd() * 17; d[i * 4] = v; d[i * 4 + 1] = v - 2; d[i * 4 + 2] = v - 7; d[i * 4 + 3] = 255; }
  tc.putImageData(id, 0, 0);
  // paper fibres & blotches
  for (let i = 0; i < 900; i++) {
    const x = rnd() * W, y = rnd() * H, l = 6 + rnd() * 26, a = rnd() * Math.PI;
    tc.strokeStyle = `rgba(120,95,60,${0.05 + rnd() * 0.08})`; tc.lineWidth = 0.6 + rnd();
    tc.beginPath(); tc.moveTo(x, y); tc.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + rnd() * 4, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); tc.stroke();
  }
  for (let i = 0; i < 40; i++) {
    const x = rnd() * W, y = rnd() * H, r = 60 + rnd() * 220;
    const g = tc.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(150,120,80,0.06)'); g.addColorStop(1, 'rgba(150,120,80,0)');
    tc.fillStyle = g; tc.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const vg = tc.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  vg.addColorStop(0, 'rgba(60,40,20,0)'); vg.addColorStop(1, 'rgba(60,40,20,0.28)');
  tc.fillStyle = vg; tc.fillRect(0, 0, W, H);
})();

/* ============================== SCENES ============================== */
// ---------- Scene: Intro (0–9)
function sIntro(t) {
  sunburst(540, 880, COL.yellow, COL.yellow2, t * 0.12, 20);
  halftone(0, 1500, W, 420, 'rgba(255,255,255,0.35)', 30, 9, (u, v) => v);
  // confetti
  for (let i = 0; i < 26; i++) {
    const a = hash(i) * 6.283, t0 = 0.1 + hash(i + 3) * 0.5;
    const d = E.outX(P(t, t0, t0 + 1.2)); if (d <= 0) continue;
    const r = 380 + hash(i + 7) * 520;
    const x = 540 + Math.cos(a) * r * d, y = 880 + Math.sin(a) * r * 1.45 * d + Math.sin(t * 1.6 + i) * 14;
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * (hash(i + 9) - 0.5) * 3 + i);
    ctx.fillStyle = PALETTE[i % PALETTE.length];
    const k = i % 4, s = 16 + hash(i + 11) * 18;
    if (k === 0) ctx.fillRect(-s, -s * 0.5, s * 2, s);
    else if (k === 1) { ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s, s); ctx.lineTo(-s, s); ctx.closePath(); ctx.fill(); }
    else if (k === 2) fillC(0, 0, s * 0.7, ctx.fillStyle);
    else sketch([[-s * 1.5, 0], [-s * 0.5, -s * 0.6], [s * 0.5, s * 0.6], [s * 1.5, 0]], { color: ctx.fillStyle, lw: 7, amp: 0.5 });
    ctx.restore();
  }
  // title card
  const cp = E.outB(P(t, 0.15, 0.75));
  const cy = lerp(2500, 880, cp) + Math.sin(t * 1.2) * 6;
  ctx.save(); ctx.translate(540, cy); ctx.rotate(-0.035 + Math.sin(t * 0.9) * 0.008);
  paperCard(950, 820, COL.white, 11, 10);
  ctx.save(); ctx.globalAlpha = 0.35;
  for (let i = 0; i < 9; i++) { ctx.fillStyle = '#9CC7F0'; ctx.fillRect(-440, -300 + i * 80, 880, 2); }
  ctx.fillStyle = '#F2A0A0'; ctx.fillRect(390, -400, 3, 800);
  ctx.restore();
  tape(-330, -405, 190, 54, -0.18); tape(330, -405, 190, 54, 0.2);
  const boxes = kText('كيف تكون\nعضوًا فعّالًا\nفي الفريق؟', 0, -20, t - 0.55, { size: 158, lh: 205, st: 0.12, anim: 'slam', colors: { 'فعّالًا': COL.red } });
  const b = boxes.find(q => q.t === 'فعّالًا');
  if (b) scribbleCircle(b.cx, b.cy + 10, b.w / 2 + 50, 105, E.ioC(P(t, 1.95, 2.55)), COL.red, 10);
  ctx.restore();
  // brand stamp
  const bp = P(t, 2.45, 2.72);
  if (bp > 0) brand(540, 290, lerp(3.2, 1.05, E.outC(bp)) + bump(t, 2.72, 0.3) * 0.12, { rot: lerp(-0.5, -0.03, E.outC(bp)) });
  // ribbon
  const rp = E.outB(P(t, 3.15, 3.75));
  if (rp > 0) {
    ctx.save(); ctx.translate(lerp(1600, 540, rp), 1395); ctx.rotate(0.025);
    paperCard(990, 170, COL.navy, 31, 8);
    txt('قصة كتاب', 0, -40, 52, 'L', 400, COL.yellow);
    txt('«العادات السبع للأشخاص الأكثر فعالية»', 0, 30, 50, 'C', 900, COL.white);
    ctx.restore();
  }
  // author
  kText('ستيفن آر. كوفي', 540, 1560, t - 4.1, { size: 72, st: 0.08, color: COL.ink });
  underline(700, 380, 1610, E.outC(P(t, 4.5, 5.0)), COL.red, 7);
  // seven badges
  for (let i = 0; i < 7; i++) {
    const s = pop(t, 5.0 + i * 0.15, 0.45); if (s <= 0) continue;
    const x = 900 - i * 120, y = 1720 + Math.sin(t * 3 + i * 0.9) * 10;
    badge(x, y, 48, HABITS[i].color, String(i + 1), { s, rot: Math.sin(t * 2 + i) * 0.1, size: 58 });
  }
}

// ---------- Scene: Team (9–24)
function sTeam(t) {
  ctx.fillStyle = COL.paper; ctx.fillRect(-50, -50, W + 100, H + 100);
  halftone(0, 0, W, 520, 'rgba(255,200,61,0.45)', 28, 9, (u, v) => 1 - v);
  kText('لماذا فعاليتك مهمة؟', 540, 300, t - 0.3, { size: 112, hl: ['فعاليتك'], hlc: COL.yellow, st: 0.1 });

  // ---- gears
  const gOut = E.inC(P(t, 9.6, 10.3));
  if (gOut < 1) {
    const G = [[860, 760, COL.orange], [700, 940, COL.teal], [540, 760, COL.gray], [380, 940, COL.blue], [220, 760, COL.purple]];
    const angA = tt => 0.55 * tt - 0.22 * Math.sin(tt * 2 * Math.PI * 0.85) * (tt < 5.5 ? 1 : 0);
    let ang;
    if (t < 5.5) ang = angA(t);
    else { const dt = t - 5.5; ang = angA(5.5) + 0.55 * dt + 3.0 * (dt - 0.35 * (1 - Math.exp(-dt / 0.35))); }
    const fixed = t >= 5.5;
    ctx.save(); ctx.translate(0, -1500 * gOut);
    for (let i = 0; i < 5; i++) {
      const [x, y, c0] = G[i];
      const s = pop(t, 0.5 + i * 0.12, 0.5); if (s <= 0) continue;
      const c = (i === 2 && fixed) ? COL.yellow : c0;
      const extra = i === 2 ? 1 + bump(t, 5.5, 0.5) * 0.5 : 1;
      ctx.save(); ctx.translate(x, y); ctx.scale(s * extra, s * extra);
      if (i === 2 && fixed) { ctx.save(); ctx.rotate(t * 0.5); starPath(0, 0, 200, 150, 14); ctx.fillStyle = 'rgba(255,200,61,0.35)'; ctx.fill(); ctx.restore(); }
      ctx.save(); ctx.rotate((i % 2 ? -1 : 1) * ang + i * Math.PI / 10);
      shadowOn(12, 12, 0.3); gearPath(130, 10, 0.2); ctx.fillStyle = c; ctx.fill(); shadowOff();
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.stroke();
      ctx.restore();
      fillC(0, 0, 72, COL.cream);
      person(0, 42, 78, i === 2 && !fixed ? COL.gray : COL.ink);
      if (i === 2 && !fixed) { // sleepy gear
        for (let z = 0; z < 3; z++) {
          const zt = (t * 0.7 + z / 3) % 1;
          txt('z', 70 + zt * 60, -90 - zt * 110, 40 + z * 10, 'L', 400, COL.ink, 'center', { ltr: true });
        }
      }
      if (fixed) { // speed lines
        for (let k = 0; k < 3; k++) {
          const a0 = (i % 2 ? -1 : 1) * t * 3 + k * 2.1;
          ctx.beginPath(); ctx.arc(0, 0, 152, a0, a0 + 0.6); ctx.strokeStyle = 'rgba(34,28,26,0.45)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
        }
      }
      ctx.restore();
    }
    ctx.restore();
  }
  kText('الفريق آلة واحدة…\nوكل عضو فيها ترس', 540, 1330, t - 0.9, { size: 94, lh: 132, colors: { 'ترس': COL.red }, out: 4.2 });
  kText('ترسٌ واحد متعطّل يُبطئ الجميع', 540, 1270, t - 5.8, { fam: 'C', size: 62, out: 4.0 });
  kText('وعضوٌ فعّال يُحرّك الجميع', 540, 1390, t - 7.0, { fam: 'C', size: 62, hl: ['فعّال'], hlc: '#8FE3A6', out: 2.8 });

  // ---- chart (10–15)
  if (t > 9.9) {
    underline(940, 140, 1150, E.outC(P(t, 10.0, 10.4)), COL.ink, 7, 2);
    const hs = [130, 210, 300, 410, 540];
    for (let i = 0; i < 5; i++) {
      const p = E.outB(P(t, 10.3 + i * 0.15, 10.8 + i * 0.15)); if (p <= 0) continue;
      const x = 820 - i * 140, h = hs[i] * p;
      shadowOn(10, 10, 0.25); ctx.fillStyle = PALETTE[i]; ctx.fillRect(x - 50, 1146 - h, 100, h); shadowOff();
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x - 50, 1146 - h, 22, h);
    }
    const ap = E.ioC(P(t, 10.9, 11.5));
    const pts = hs.map((h, i) => [820 - i * 140, 1146 - h - 60]);
    sketch(pts, { prog: ap, lw: 12, color: COL.ink, seed: 9 });
    if (ap > 0.98) arrowHead(pts[4][0] - 10, pts[4][1] - 8, Math.atan2(pts[4][1] - pts[3][1], pts[4][0] - pts[3][0]), 34);
    const xp = P(t, 11.3, 11.6);
    if (xp > 0) {
      ctx.save(); ctx.translate(250, 640); ctx.rotate(-0.16 + Math.sin(t * 2) * 0.02);
      const s = lerp(3.5, 1, E.outC(xp)) + bump(t, 11.6, 0.3) * 0.15; ctx.scale(s, s);
      shadowOn(10, 12, 0.3); starPath(0, 0, 175, 140, 16, t * 0.2); ctx.fillStyle = COL.red; ctx.fill(); shadowOff();
      txt('X10', 0, 0, 150, 'L', 400, COL.white, 'center', { ltr: true, drop: COL.ink, dx: 5, dy: 7 });
      ctx.restore();
    }
    const chips = ['ثقة أعلى', 'تعاون أسرع', 'إنتاجية مضاعفة'];
    chips.forEach((c, i) => {
      const p = E.outB(P(t, 12.2 + i * 0.4, 12.7 + i * 0.4)); if (p <= 0) return;
      chip(c, lerp(1500, 540, p), 1280 + i * 115, 50, [COL.teal, COL.blue, COL.red][i], COL.white, { tri: true, rot: (i - 1) * 0.02 });
    });
    kText('فعاليتك الفردية = إنتاجية الفريق كله', 540, 1660, t - 13.4, { fam: 'C', size: 50, hl: ['إنتاجية'], hlc: COL.yellow });
  }
}

// ---------- Scene: Portrait (24–29)
function coveyFigure(s) {
  // suit
  ctx.fillStyle = COL.navy; ctx.beginPath();
  ctx.moveTo(-1.35 * s, 1.9 * s); ctx.bezierCurveTo(-1.3 * s, 0.9 * s, -0.8 * s, 0.75 * s, 0, 0.72 * s);
  ctx.bezierCurveTo(0.8 * s, 0.75 * s, 1.3 * s, 0.9 * s, 1.35 * s, 1.9 * s); ctx.closePath(); ctx.fill();
  // shirt V & tie
  ctx.fillStyle = COL.white; ctx.beginPath(); ctx.moveTo(-0.32 * s, 0.76 * s); ctx.lineTo(0.32 * s, 0.76 * s); ctx.lineTo(0, 1.4 * s); ctx.closePath(); ctx.fill();
  ctx.fillStyle = COL.red; ctx.beginPath(); ctx.moveTo(-0.09 * s, 0.8 * s); ctx.lineTo(0.09 * s, 0.8 * s); ctx.lineTo(0.13 * s, 1.35 * s); ctx.lineTo(0, 1.5 * s); ctx.lineTo(-0.13 * s, 1.35 * s); ctx.closePath(); ctx.fill();
  // neck
  ctx.fillStyle = '#E0A77C'; ctx.fillRect(-0.22 * s, 0.45 * s, 0.44 * s, 0.34 * s);
  // ears
  fillC(-0.62 * s, 0.02 * s, 0.13 * s, '#E6AF85'); fillC(0.62 * s, 0.02 * s, 0.13 * s, '#E6AF85');
  // head (bald)
  ctx.beginPath(); ctx.ellipse(0, -0.05 * s, 0.6 * s, 0.72 * s, 0, 0, Math.PI * 2); ctx.fillStyle = COL.skin; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-0.2 * s, -0.5 * s, 0.18 * s, 0.1 * s, -0.4, 0, Math.PI * 2); ctx.fill();
  // grey side hair
  ctx.fillStyle = '#C9C4BD';
  ctx.beginPath(); ctx.ellipse(-0.56 * s, -0.12 * s, 0.1 * s, 0.22 * s, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0.56 * s, -0.12 * s, 0.1 * s, 0.22 * s, -0.2, 0, Math.PI * 2); ctx.fill();
  // brows, glasses, eyes, smile
  ctx.strokeStyle = COL.ink; ctx.lineCap = 'round';
  ctx.lineWidth = 0.05 * s;
  ctx.beginPath(); ctx.moveTo(-0.42 * s, -0.22 * s); ctx.quadraticCurveTo(-0.26 * s, -0.3 * s, -0.1 * s, -0.22 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0.42 * s, -0.22 * s); ctx.quadraticCurveTo(0.26 * s, -0.3 * s, 0.1 * s, -0.22 * s); ctx.stroke();
  ctx.lineWidth = 0.045 * s;
  rr(-0.48 * s, -0.16 * s, 0.38 * s, 0.26 * s, 0.08 * s); ctx.stroke();
  rr(0.1 * s, -0.16 * s, 0.38 * s, 0.26 * s, 0.08 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-0.1 * s, -0.06 * s); ctx.lineTo(0.1 * s, -0.06 * s); ctx.stroke();
  const blink = (T % 3.1) < 0.12 ? 0.2 : 1;
  ctx.fillStyle = COL.ink;
  ctx.beginPath(); ctx.ellipse(-0.29 * s, -0.03 * s, 0.045 * s, 0.05 * s * blink, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0.29 * s, -0.03 * s, 0.045 * s, 0.05 * s * blink, 0, 0, 7); ctx.fill();
  ctx.lineWidth = 0.04 * s; ctx.beginPath(); ctx.arc(0, 0.22 * s, 0.22 * s, 0.25, Math.PI - 0.25); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 0.02 * s); ctx.quadraticCurveTo(0.06 * s, 0.16 * s, -0.02 * s, 0.18 * s); ctx.stroke();
}
function sPortrait(t) {
  sunburst(540, 820, COL.blue, '#4C88FB', -t * 0.1, 22);
  halftone(0, 0, W, 460, 'rgba(255,255,255,0.18)', 30, 10, (u, v) => 1 - v);
  halftone(0, 1500, W, 420, 'rgba(0,0,0,0.12)', 30, 10, (u, v) => v);
  kText('من هو ستيفن كوفي؟', 540, 280, t - 0.3, { size: 110, color: COL.white, drop: COL.ink, st: 0.08 });
  const p = E.outB(P(t, 0.2, 0.75));
  if (p > 0) {
    ctx.save(); ctx.translate(540, 800 + Math.sin(t * 1.3) * 5); ctx.rotate(lerp(0.5, 0.045, p)); ctx.scale(p, p);
    shadowOn(18, 20, 0.35); ctx.fillStyle = COL.white; ctx.fillRect(-300, -350, 600, 700); shadowOff();
    ctx.save(); ctx.beginPath(); ctx.rect(-260, -310, 520, 520); ctx.clip();
    ctx.fillStyle = COL.yellow; ctx.fillRect(-260, -310, 520, 520);
    ctx.save(); ctx.rotate(t * 0.2); starPath(0, 0, 500, 380, 16); ctx.fillStyle = COL.yellow2; ctx.fill(); ctx.restore();
    halftone(-260, -310, 520, 520, 'rgba(239,75,85,0.35)', 22, 8, (u, v) => Math.max(0, u - 0.4));
    ctx.translate(0, -20); coveyFigure(170);
    ctx.restore();
    txt('Stephen R. Covey', 0, 280, 40, 'C', 700, COL.ink, 'center', { ltr: true });
    tape(-230, -350, 170, 50, -0.35); tape(230, -350, 170, 50, 0.3);
    ctx.restore();
  }
  kText('ستيفن آر. كوفي', 540, 1285, t - 0.7, { size: 100, color: COL.white, drop: COL.ink, st: 0.1 });
  const c1 = E.outB(P(t, 1.1, 1.5)); if (c1 > 0) chip('1932 – 2012', 540, 1405, 50, COL.yellow, COL.ink, { scale: c1, ltr: true });
  const c2 = E.outB(P(t, 1.5, 1.9)); if (c2 > 0) chip('مؤلف • أستاذ جامعي • مستشار في القيادة', 540, 1515, 40, COL.navy, COL.white, { scale: c2 });
  const c3 = E.outB(P(t, 1.9, 2.3)); if (c3 > 0) chip('اختارته مجلة «تايم» ضمن أكثر 25 أمريكيًا تأثيرًا (1996)', 540, 1620, 34, COL.white, COL.ink, { scale: c3 });
}

// ---------- Scene: Map (29–46)
const LAND = {
  na: [[-128, 75], [-128, 55], [-125, 49], [-124, 42], [-122, 37], [-118, 34], [-117, 32.5], [-115, 29], [-112, 25], [-110, 23], [-97.5, 23], [-97.5, 26], [-97, 28], [-94, 29.7], [-90, 29.2], [-89, 30.3], [-85, 29.7], [-83, 29], [-82.5, 27], [-81, 25.2], [-80, 26.5], [-81, 31], [-79, 33.5], [-76, 35], [-76, 37], [-74, 40], [-71, 41.5], [-70, 42], [-70.5, 43.5], [-67, 44.8], [-64, 45.5], [-61, 45.5], [-60, 46.5], [-64, 48.5], [-66, 49.5], [-60, 50], [-57, 51.5], [-56, 52.5], [-60, 55], [-62, 58], [-65, 60], [-70, 62], [-78, 62], [-80, 75]],
  gl: [[-55, 75], [-52, 64], [-48, 61], [-44, 60], [-40, 64], [-30, 69], [-20, 75]],
  gb: [[-5.7, 50], [-3, 50.5], [1.4, 51.2], [1.7, 52.7], [0.3, 53.5], [-0.2, 54.5], [-1.5, 55.5], [-2, 56], [-2, 57.6], [-3, 58.6], [-5, 58.6], [-6.2, 57.5], [-5.5, 56], [-4.8, 55], [-3, 54.5], [-3.2, 53.3], [-4.6, 52.8], [-5.2, 51.7], [-4, 51.2], [-5.5, 50.1]],
  ie: [[-6, 52], [-6.2, 53.5], [-5.5, 54.3], [-6.2, 55.2], [-7.3, 55.3], [-8.5, 54.6], [-10, 54], [-9.8, 53], [-10.3, 51.9], [-8.5, 51.6], [-6.4, 52.2]],
  eu: [[16, 54.5], [14, 54], [10.5, 54.2], [8.5, 53.6], [7, 53.4], [4.5, 52], [3, 51.3], [1.6, 50.9], [1.5, 50], [-1.5, 49.7], [-2, 48.7], [-4.7, 48.5], [-4.2, 47.8], [-2.3, 47.2], [-1.2, 46], [-1.5, 43.5], [-4, 43.5], [-8, 43.7], [-9.3, 43], [-8.8, 41], [-9.5, 38.8], [-8.8, 37], [-7, 37], [-6, 36.2], [-5.5, 35.9], [-6.2, 35.6], [-9.8, 31], [-13, 27.5], [-16, 23.5], [16, 23.5]],
  sc: [[5, 58], [5.2, 61], [6, 63], [10, 66], [16, 70], [16, 56], [12.5, 56], [10.5, 57.8], [8, 58]],
};
const proj = (lon, lat) => [(lon + 130) * 24, (62 - lat) * 30];
const MCY = 800;
const STOPS = [
  { ll: [-111.9, 40.76], z: 1.5, city: 'سولت ليك سيتي', year: '1932', title: 'سولت ليك سيتي، يوتا', desc: 'وُلد ونشأ هنا، ودرس إدارة الأعمال في جامعة يوتا', c: COL.red },
  { ll: [-4.2, 53.4], z: 1.55, city: 'بريطانيا وأيرلندا', year: 'رحلة', title: 'بريطانيا وأيرلندا', desc: 'كُلّف هناك بتدريب القادة وإدارة فرق تطوعية… فاكتشف شغفه بالتعليم', c: COL.teal },
  { ll: [-71.06, 42.36], z: 1.5, city: 'بوسطن', year: '1957', title: 'جامعة هارفارد، بوسطن', desc: 'حصل على ماجستير إدارة الأعمال (MBA)', c: COL.purple },
  { ll: [-111.3, 39.3], z: 1.75, city: 'بروفو', year: '1976', title: 'جامعة بريغهام يونغ، بروفو', desc: 'أستاذ للإدارة والسلوك التنظيمي، ونال منها الدكتوراه', c: COL.orange },
  { xy: [1740, 540], z: 0.31, year: '1989', title: 'من كتاب إلى مؤسسة عالمية', desc: 'صدر كتابه عام 1989، وفي 1997 وُلدت مؤسسة «فرانكلين كوفي» لنشر عاداته حول العالم', c: COL.blue },
  { ll: [-112.03, 43.49], z: 1.65, city: 'أيداهو فولز', year: '2012', title: 'أيداهو فولز، أيداهو', desc: 'رحل عن 79 عامًا… وبقيت عاداته تُدرَّس حول العالم', c: COL.navy },
];
const GLOBAL_PINS = [[-74, 40.7], [-87.6, 41.9], [-118.2, 34], [-79.4, 43.7], [-95.4, 29.8], [-80.2, 25.8], [-122.3, 47.6], [-73.6, 45.5], [-105, 39.7], [2.35, 48.85], [-3.7, 40.4], [13.4, 52.5], [10.7, 59.9], [-9.1, 38.7], [-6.8, 34], [-0.13, 51.5]];
const stopXY = k => STOPS[k].xy || proj(...STOPS[k].ll);
const arriveT = k => 0.6 + 2.7 * k;
function mapCam(t) {
  let k = 0; while (k < 5 && t >= arriveT(k + 1) - 1.1) k++;
  const b = stopXY(k);
  if (k === 0) { const z = lerp(0.75, STOPS[0].z, E.outC(P(t, 0, 0.9))); return { x: b[0], y: b[1], z: z * (1 + 0.02 * Math.max(0, t - 0.6)) }; }
  const t0 = arriveT(k) - 1.1, p = P(t, t0, arriveT(k));
  if (p >= 1) return { x: b[0], y: b[1], z: STOPS[k].z * (1 + 0.02 * (t - arriveT(k))) };
  const a = stopXY(k - 1), za = STOPS[k - 1].z * (1 + 0.02 * (t0 - arriveT(k - 1)));
  const e = E.ioC(p);
  const zb = Math.exp(lerp(Math.log(za), Math.log(STOPS[k].z), e));
  const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const dip = clamp(dist / 2600, 0, 0.6) * (STOPS[k - 1].xy || STOPS[k].xy ? 0 : 1);
  return { x: lerp(a[0], b[0], e), y: lerp(a[1], b[1], e), z: zb * (1 - dip * Math.sin(Math.PI * e)) };
}
function sMap(t) {
  const cam = mapCam(t);
  const S = (wx, wy) => [(wx - cam.x) * cam.z + W / 2, (wy - cam.y) * cam.z + MCY];
  const SL = (lon, lat) => S(...proj(lon, lat));
  ctx.fillStyle = COL.ocean; ctx.fillRect(-50, -50, W + 100, H + 100);
  // waves
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let gy = -600; gy < 1800; gy += 150) for (let gx = -600; gx < 4200; gx += 170) {
    const [sx, sy] = S(gx + ((gy / 150) % 2) * 85 + Math.sin(T + gy) * 10, gy);
    if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
    const r = 14 * Math.max(0.5, cam.z);
    ctx.beginPath(); ctx.arc(sx - r, sy, r, Math.PI * 1.15, Math.PI * 1.85); ctx.arc(sx + r * 0.6, sy, r, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  }
  // graticule
  ctx.save(); ctx.setLineDash([6, 10]); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
  for (let lon = -130; lon <= 20; lon += 10) { const a = SL(lon, 80), b = SL(lon, 15); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); }
  for (let lat = 20; lat <= 70; lat += 10) { const a = SL(-140, lat), b = SL(25, lat); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); }
  ctx.restore();
  // lands
  Object.entries(LAND).forEach(([key, poly], li) => {
    const pts = poly.map(([lo, la]) => SL(lo, la));
    ctx.save(); shadowOn(10, 6, 0.3);
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath();
    ctx.fillStyle = key === 'na' ? '#FFF1D6' : key === 'gb' || key === 'ie' ? '#FFE3A8' : '#F9E7C4'; ctx.fill(); shadowOff(); ctx.restore();
    sketch(pts, { closed: true, lw: 4, color: 'rgba(34,28,26,0.75)', amp: 1.2, seed: li * 40 });
  });
  // land labels
  const lab = (s, lon, lat, size, col, a = 1) => { const [x, y] = SL(lon, lat); ctx.save(); ctx.globalAlpha = a; txt(s, x, y, size, 'L', 400, col); ctx.restore(); };
  const zs = clamp(cam.z, 0.35, 1.3);
  lab('الولايات المتحدة', -99, 38.5, 64 * zs, 'rgba(34,28,26,0.35)');
  lab('كندا', -100, 55, 64 * zs, 'rgba(34,28,26,0.3)');
  lab('المحيط الأطلسي', -40, 40, 60 * zs, 'rgba(255,255,255,0.7)');
  lab('أوروبا', 4, 46.5, 56 * zs, 'rgba(34,28,26,0.3)');
  // routes
  const cur = (() => { let k = 0; while (k < 5 && t >= arriveT(k + 1) - 1.1) k++; return k; })();
  const ROUTES = [[0, 1, 1], [1, 2, 2], [2, 3, 3], [3, 5, 5]];
  for (const [a, b, k] of ROUTES) {
    const t0 = arriveT(k) - 1.1; if (t < t0) continue;
    const p = E.ioC(P(t, t0, arriveT(k)));
    const A = stopXY(a), B = stopXY(b);
    const d = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const C = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - d * 0.28];
    const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push(S(lerp(lerp(A[0], C[0], u), lerp(C[0], B[0], u), u), lerp(lerp(A[1], C[1], u), lerp(C[1], B[1], u), u))); }
    if (k === 5 && t < arriveT(5) - 0.4) continue;
    const pp = k === 5 ? E.ioC(P(t, arriveT(5) - 0.4, arriveT(5))) : p;
    sketch(pts, { prog: pp, lw: 6, color: COL.ink, dash: [16, 12], amp: 0.6, seed: k * 7 });
    if (pp > 0 && pp < 1) {
      const i = Math.min(39, Math.floor(pp * 40)); const q = pts[i], q2 = pts[i + 1];
      plane(q[0], q[1], Math.atan2(q2[1] - q[1], q2[0] - q[0]), 34);
    }
  }
  // global pins (stop 4)
  if (t > arriveT(4) - 0.1) {
    const fade = 1 - P(t, arriveT(5) - 1.1, arriveT(5) - 0.5);
    GLOBAL_PINS.forEach((ll, j) => {
      const s = pop(t, arriveT(4) + 0.05 + j * 0.05, 0.4) * fade; if (s <= 0) return;
      const [x, y] = SL(...ll);
      const ring = ((t * 1.2 + j * 0.13) % 1);
      circ(x, y, 10 + ring * 40); ctx.strokeStyle = `rgba(255,255,255,${(1 - ring) * 0.8})`; ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s); pin(0, 0, 14, PALETTE[j % PALETTE.length]); ctx.restore();
    });
  }
  // stop pins
  [0, 1, 2, 3, 5].forEach(k => {
    const ta = arriveT(k); if (t < ta - 0.2) return;
    const p = E.outB(P(t, ta - 0.2, ta + 0.25));
    const [x, y] = S(...stopXY(k));
    ctx.save(); ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.ellipse(x, y, 20 * p, 7 * p, 0, 0, 7); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(x, y - (1 - p) * 160); pin(0, 0, 28, STOPS[k].c); ctx.restore();
    if (k === cur || (cur === 4 && false)) {
      const lp = E.outB(P(t, ta + 0.05, ta + 0.45));
      if (lp > 0) chip(STOPS[k].city, x + 40, y - 110, 38, COL.white, COL.ink, { anchor: 'left', scale: lp });
    }
  });
  // heading banner
  const hb = E.outB(P(t, 0.25, 0.75));
  if (hb > 0) {
    ctx.save(); ctx.translate(540, 250); ctx.rotate(-0.025); ctx.scale(hb, hb);
    paperCard(760, 140, COL.yellow, 77, 8);
    txt('رحلة كوفي على الخريطة', 0, 0, 78, 'L', 400, COL.ink);
    ctx.restore();
  }
  // info card
  for (let k = 0; k < 6; k++) {
    const tin = arriveT(k) + 0.05, tout = k < 5 ? arriveT(k + 1) - 1.1 : 99;
    if (t < tin || t > tout + 0.4) continue;
    const pin_ = E.outB(P(t, tin, tin + 0.5)), pout = E.inC(P(t, tout, tout + 0.35));
    const st = STOPS[k];
    ctx.save(); ctx.translate(540 + (1 - pin_) * 1200 - pout * 1300, 1490); ctx.rotate(0.012 * (k % 2 ? 1 : -1) - pout * 0.1);
    paperCard(960, 330, COL.white, 90 + k, 7);
    badge(370, 0, 92, st.c, st.year, { size: st.year.length > 4 ? 46 : 54, fam: 'L', rot: -0.08 });
    kText(st.title, 250, -95, t - tin - 0.1, { size: 60, align: 'right', maxW: 700, st: 0.05 });
    kText(st.desc, 250, -45, t - tin - 0.3, { fam: 'C', wt: 800, size: 36, lh: 56, align: 'right', maxW: 690, top: true, st: 0.025, anim: 'rise' });
    ctx.restore();
  }
}

// ---------- Scene: Book story (46–64)
function bookCoverArt(w, h) {
  ctx.fillStyle = '#123E7A'; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = '#0B2C5A'; ctx.fillRect(-w / 2, -h / 2, 36, h);
  ctx.save(); ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.clip();
  halftone(-w / 2, -h / 2, w, h, 'rgba(255,255,255,0.08)', 20, 6, (u, v) => v);
  ctx.restore();
  txt('7', 20, -h * 0.2, 330, 'L', 400, COL.yellow, 'center', { ltr: true, drop: 'rgba(0,0,0,0.3)', dx: 8, dy: 10 });
  txt('العادات السبع', 20, h * 0.1, 66, 'C', 900, COL.white);
  txt('للأشخاص الأكثر فعالية', 20, h * 0.1 + 72, 40, 'C', 800, COL.white);
  ctx.fillStyle = COL.yellow; ctx.fillRect(-100, h * 0.1 + 118, 240, 5);
  txt('ستيفن آر. كوفي', 20, h * 0.1 + 170, 38, 'C', 800, COL.yellow);
}
function sBook(t) {
  // ---- A: 200 years of success literature (0–6)
  if (t < 6.6) {
    ctx.fillStyle = COL.paper; ctx.fillRect(-50, -50, W + 100, H + 100);
    halftone(0, 1450, W, 470, 'rgba(18,179,163,0.3)', 28, 9, (u, v) => v);
    kText('قصة الكتاب', 540, 280, t - 0.2, { size: 116, st: 0.1 });
    underline(740, 340, 350, E.outC(P(t, 0.5, 0.9)), COL.red, 9);
    const out = E.inC(P(t, 3.0, 3.4));
    if (out < 1) {
      ctx.save(); ctx.translate(0, -out * 1600);
      const yr = Math.round(lerp(0, 200, E.ioC(P(t, 0.4, 2.6))));
      txt(String(yr), 540, 520, 190, 'L', 400, COL.ink, 'center', { ltr: true, drop: COL.yellow, dx: 8, dy: 10 });
      txt('عامًا من كتب «النجاح»', 540, 650, 56, 'L', 400, COL.red);
      for (let i = 0; i < 12; i++) {
        const t0 = 0.3 + i * 0.17;
        const p = E.outB(P(t, t0, t0 + 0.4)); if (p <= 0) continue;
        const bw = 380 + hash(i) * 130, ty = 1150 - i * 42;
        const y = lerp(-200, ty, p), x = 540 + (hash(i + 5) - 0.5) * 70;
        ctx.save(); ctx.translate(x, y); ctx.rotate((hash(i + 8) - 0.5) * 0.08);
        shadowOn(6, 6, 0.25); rr(-bw / 2, -20, bw, 40, 5); ctx.fillStyle = PALETTE[i % PALETTE.length]; ctx.fill(); shadowOff();
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(-bw / 2 + 30, -20, 10, 40); ctx.fillRect(bw / 2 - 40, -20, 10, 40);
        ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(-60, -5, 120, 10);
        ctx.restore();
      }
      kText('راجع كوفي ما نُشر عن النجاح في أمريكا منذ عام 1776', 540, 1330, t - 1.0, { fam: 'C', size: 52, maxW: 900, st: 0.04 });
      ctx.restore();
    }
    if (t > 3.3) {
      const x1 = 990, x0 = 90, split = x1 - 675;
      const pT = E.outC(P(t, 3.5, 4.1)), pP = E.outC(P(t, 4.1, 4.5));
      shadowOn(8, 8, 0.25);
      ctx.fillStyle = COL.teal; ctx.fillRect(x1 - 675 * pT, 820, 675 * pT, 90);
      ctx.fillStyle = COL.pink; ctx.fillRect(split - 225 * pP, 820, 225 * pP, 90);
      shadowOff();
      if (pT > 0.6) txt('150 عامًا', x1 - 30, 868, 50, 'L', 400, COL.white, 'right');
      if (pP > 0.6) txt('50', split - 112, 868, 50, 'L', 400, COL.white, 'center', { ltr: true });
      const ta = E.outB(P(t, 3.6, 4.0));
      if (ta > 0) {
        ctx.save(); ctx.globalAlpha = clamp(ta);
        txt('أخلاقيات الشخصية', 990, 700 + (1 - ta) * 40, 64, 'L', 400, '#0B7D72', 'right');
        txt('النزاهة • التواضع • الصبر • الشجاعة', 990, 770 + (1 - ta) * 40, 34, 'C', 800, COL.ink, 'right');
        ctx.restore();
      }
      if (pT > 0.9) { txt('1776', 990, 950, 32, 'C', 800, COL.ink, 'right', { ltr: true }); txt('1976', 90, 950, 32, 'C', 800, COL.ink, 'left', { ltr: true }); }
      const tb = E.outB(P(t, 4.1, 4.5));
      if (tb > 0) {
        ctx.save(); ctx.globalAlpha = clamp(tb);
        txt('أخلاقيات المظهر', 90, 1040 + (1 - tb) * 40, 64, 'L', 400, '#D6457A', 'left');
        txt('الانطباعات • الحِيَل • الحلول السريعة', 90, 1110 + (1 - tb) * 40, 34, 'C', 800, COL.ink, 'left');
        ctx.restore();
      }
      kText('النجاح الدائم يُبنى على الجوهر والمبادئ… لا على المظهر', 540, 1330, t - 4.6, { fam: 'C', size: 54, maxW: 900, hl: ['الجوهر'], hlc: COL.yellow, st: 0.05 });
    }
  }
  // ---- B: the book as a paper cut-out (6–11.5)
  if (t >= 5.9 && t < 12.2) {
    const r = E.ioC(P(t, 5.9, 6.5)) * 1400;
    ctx.save(); circ(540, 900, r); ctx.clip();
    sunburst(540, 860, COL.navy, '#23357A', t * 0.1, 20);
    halftone(0, 1300, W, 620, 'rgba(255,255,255,0.12)', 28, 9, (u, v) => v);
    kText('1989: وُلد الكتاب', 540, 280, t - 6.3, { size: 100, color: COL.white, drop: COL.ink, st: 0.08 });
    for (let i = 0; i < 14; i++) { // paper scraps
      const a = hash(i + 40) * 6.283, d = 380 + hash(i + 41) * 300;
      const x = 540 + Math.cos(a + t * 0.2) * d, y = 860 + Math.sin(a + t * 0.2) * d * 1.2;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t + i); ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.8)' : PALETTE[i % 8];
      ctx.fillRect(-14, -9, 28, 18); ctx.restore();
    }
    const bp = P(t, 6.3, 6.9);
    if (bp > 0) {
      ctx.save(); ctx.translate(540, 840 + Math.sin(t * 1.5) * 6);
      ctx.rotate(lerp(-0.7, -0.05, E.outB(bp)) + Math.sin(t * 1.1) * 0.01);
      const s = lerp(0.2, 1, E.outB(bp)) + bump(t, 6.9, 0.3) * 0.06; ctx.scale(s, s);
      shadowOn(24, 26, 0.45); tornPath(-310, -420, 620, 840, 55, 14, 22); ctx.fillStyle = COL.white; ctx.fill(); shadowOff();
      bookCoverArt(540, 760);
      tape(-270, -410, 170, 52, -0.5); tape(270, 410, 170, 52, -0.5);
      ctx.restore();
    }
    const sp = P(t, 7.1, 7.35);
    if (sp > 0) {
      ctx.save(); ctx.translate(830, 540); ctx.rotate(0.22); const s = lerp(3, 1, E.outC(sp)); ctx.scale(s, s);
      ctx.globalAlpha = 0.92;
      circ(0, 0, 120); ctx.fillStyle = COL.red; ctx.fill();
      circ(0, 0, 100); ctx.strokeStyle = COL.white; ctx.lineWidth = 5; ctx.setLineDash([10, 7]); ctx.stroke(); ctx.setLineDash([]);
      txt('1989', 0, -8, 72, 'L', 400, COL.white, 'center', { ltr: true });
      txt('أول إصدار', 0, 50, 28, 'C', 900, COL.white);
      ctx.restore();
    }
    const c1 = E.outB(P(t, 7.9, 8.4)); if (c1 > 0) chip('أكثر من 40 مليون نسخة', lerp(1600, 540, c1), 1390, 56, COL.yellow, COL.ink, { rot: -0.02, fam: 'L', wt: 400 });
    const c2 = E.outB(P(t, 8.4, 8.9)); if (c2 > 0) chip('تُرجم إلى عشرات اللغات', lerp(-600, 540, c2), 1510, 46, COL.white, COL.navy, { rot: 0.02 });
    ctx.restore();
  }
  // ---- C: preparing facilitators (11.5–18)
  if (t >= 11.3) {
    const cp = E.outC(P(t, 11.3, 11.8));
    const top = lerp(H + 60, -60, cp);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-50, top);
    for (let x = 0; x <= W + 60; x += 30) ctx.lineTo(x, top + (hash(x) - 0.5) * 24);
    ctx.lineTo(W + 60, H + 60); ctx.lineTo(-50, H + 60); ctx.closePath();
    ctx.fillStyle = COL.paper; ctx.fill(); ctx.clip();
    halftone(0, 0, W, 500, 'rgba(142,92,246,0.22)', 28, 9, (u, v) => 1 - v);
    ctx.translate(0, top + 60);
    kText('كيف يُعِدّ الميسّرين؟', 540, 290, t - 12.0, { size: 104, st: 0.08 });
    kText('لتصل العادات كما قصدها الكاتب', 540, 400, t - 12.3, { fam: 'C', wt: 800, size: 44, color: '#6B45D8', st: 0.05 });
    const CARDS = [
      ['علِّم لتتعلّم', 'نصح كوفي قرّاءه بأن يشرحوا ما تعلّموه لشخص آخر خلال 48 ساعة', COL.orange],
      ['اعتماد الميسّرين', 'ورش تأهيل عبر مؤسسة «فرانكلين كوفي» بأدلة وأنشطة موحّدة', COL.teal],
      ['من الداخل إلى الخارج', 'يعيش الميسّر العادات بنفسه أولًا… ثم ينقلها بالقدوة والتطبيق العملي', COL.purple],
    ];
    CARDS.forEach(([ti, de, c], i) => {
      const t0 = 12.6 + i * 1.4; const p = E.outB(P(t, t0, t0 + 0.55)); if (p <= 0) return;
      ctx.save(); ctx.translate(lerp(1500, 540, p), 650 + i * 330); ctx.rotate((i % 2 ? 0.012 : -0.012) + (1 - p) * 0.2);
      paperCard(940, 270, COL.white, 120 + i, 6);
      ctx.fillStyle = c; ctx.fillRect(455, -135, 15, 270);
      badge(360, 0, 70, c, String(i + 1), { size: 80 });
      kText(ti, 260, -58, t - t0 - 0.15, { size: 58, align: 'right', maxW: 700, st: 0.05 });
      kText(de, 260, -12, t - t0 - 0.35, { fam: 'C', wt: 800, size: 36, lh: 55, align: 'right', maxW: 700, top: true, st: 0.02, anim: 'rise' });
      ctx.restore();
    });
    ctx.restore();
  }
}

// ---------- Scene: Framework (64–78)
function glasses(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.lineWidth = 12; ctx.strokeStyle = COL.ink;
  [[-75, 0], [75, 0]].forEach(([cx]) => { circ(cx, 0, 60); ctx.fillStyle = 'rgba(142,209,252,0.7)'; ctx.fill(); ctx.stroke();
    ctx.save(); circ(cx, 0, 56); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(cx - 50, -50, 22, 100); ctx.restore(); });
  ctx.beginPath(); ctx.arc(0, 5, 22, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-135, -10); ctx.lineTo(-170, -30); ctx.moveTo(135, -10); ctx.lineTo(170, -30); ctx.stroke();
  ctx.restore();
}
function sFrame(t) {
  ctx.fillStyle = COL.paper; ctx.fillRect(-50, -50, W + 100, H + 100);
  halftone(0, 0, W, 480, 'rgba(58,123,250,0.22)', 28, 9, (u, v) => 1 - v);
  // A (0–4.5): paradigms, See-Do-Get
  kText('على أي أساس بُني الكتاب؟', 540, 290, t - 0.2, { size: 100, st: 0.07, out: 7.6, hl: ['أساس'], hlc: COL.yellow });
  if (t < 4.9) {
    const out = E.inC(P(t, 4.2, 4.6));
    ctx.save(); ctx.translate(540, 860); ctx.scale(1 - out, 1 - out); ctx.rotate(out * 0.5);
    const N = [['نرى', COL.blue, -Math.PI / 2], ['نفعل', COL.orange, Math.PI / 6], ['نحصل', COL.green, Math.PI * 5 / 6]];
    for (let i = 0; i < 3; i++) { // arrows between nodes (clockwise)
      const a0 = N[i][2] + 0.42, a1 = N[(i + 1) % 3][2] - 0.42 + (i === 2 ? Math.PI * 2 : 0);
      const p = E.ioC(P(t, 1.8 + i * 0.3, 2.3 + i * 0.3));
      const pts = []; for (let j = 0; j <= 30; j++) { const a = lerp(a0, a1, j / 30); pts.push([Math.cos(a) * 280, Math.sin(a) * 280]); }
      sketch(pts, { prog: p, lw: 9, seed: i * 10 });
      if (p > 0.97) arrowHead(Math.cos(a1) * 280, Math.sin(a1) * 280, a1 + Math.PI / 2, 26);
    }
    N.forEach(([s, c, a], i) => {
      const p = pop(t, 0.9 + i * 0.4, 0.45); if (p <= 0) return;
      ctx.save(); ctx.translate(Math.cos(a) * 280, Math.sin(a) * 280); ctx.scale(p, p);
      shadowOn(10, 10, 0.3); fillC(0, 0, 110, c); shadowOff();
      txt(s, 0, 0, 74, 'L', 400, COL.white); ctx.restore();
    });
    const gp = pop(t, 2.6, 0.5); if (gp > 0) glasses(0, 10, gp * 0.9);
    ctx.restore();
    kText('النموذج الذهني هو العدسة التي نرى بها العالم', 540, 1320, t - 2.8, { fam: 'C', size: 52, maxW: 920, out: 1.4, hl: ['العدسة'], hlc: COL.sky });
    kText('والتغيير الحقيقي يبدأ «من الداخل إلى الخارج»', 540, 1450, t - 3.2, { fam: 'C', size: 52, maxW: 920, out: 1.0, colors: { '«من': COL.red, 'الداخل': COL.red, 'إلى': COL.red, 'الخارج»': COL.red } });
  }
  // B (4.5–8): habit = knowledge + skill + desire
  if (t > 4.5 && t < 8.4) {
    const out = E.inC(P(t, 7.6, 8.0));
    const V = [[640, 790, COL.blue, 'المعرفة', 'ماذا؟ ولماذا؟', 730, 700], [440, 790, COL.red, 'المهارة', 'كيف؟', 350, 700], [540, 965, COL.yellow, 'الرغبة', 'أريد', 540, 1070]];
    V.forEach(([x, y, c, l1, l2, lx, ly], i) => {
      const p = E.outB(P(t, 4.7 + i * 0.25, 5.2 + i * 0.25)); if (p <= 0) return;
      const ox = (x - 540) * 2.5 * (1 - p), oy = (y - 860) * 2.5 * (1 - p);
      ctx.save(); ctx.globalAlpha = 1 - out; ctx.globalCompositeOperation = 'multiply';
      fillC(x + ox, y + oy - out * 300, 215, c); ctx.restore();
      ctx.save(); ctx.globalAlpha = (1 - out) * clamp(p);
      txt(l1, lx + ox, ly + oy - out * 300, 58, 'L', 400, COL.ink);
      txt(l2, lx + ox, ly + oy + 56 - out * 300, 34, 'C', 800, COL.ink);
      ctx.restore();
    });
    const sp = pop(t, 5.9, 0.5) * (1 - out);
    if (sp > 0) {
      ctx.save(); ctx.translate(540, 855); ctx.scale(sp, sp); ctx.rotate(Math.sin(t * 2) * 0.05);
      shadowOn(8, 8, 0.3); starPath(0, 0, 105, 72, 10, t * 0.5); ctx.fillStyle = COL.white; ctx.fill(); shadowOff();
      txt('عادة', 0, 0, 60, 'L', 400, COL.ink); ctx.restore();
    }
    kText('العادة = تقاطع المعرفة والمهارة والرغبة', 540, 1340, t - 6.0, { fam: 'C', size: 54, maxW: 920, out: 1.6, hl: ['تقاطع'], hlc: COL.yellow });
  }
  // C (8–14): maturity continuum staircase
  if (t > 7.9) {
    kText('سلّم النضج', 540, 290, t - 8.1, { size: 110, st: 0.1, hl: ['النضج'], hlc: COL.yellow });
    const STEPS = [[700, 960, 1180, COL.orange, 'الاعتمادية', '«أنت»'], [420, 700, 980, COL.teal, 'الاستقلالية', '«أنا»'], [140, 420, 780, COL.purple, 'الاعتماد المتبادل', '«نحن»']];
    STEPS.forEach(([x0, x1, top, c, l1, l2], i) => {
      const p = E.outB(P(t, 8.4 + i * 0.3, 8.9 + i * 0.3)); if (p <= 0) return;
      const h = (1400 - top) * p;
      shadowOn(12, 12, 0.3); ctx.fillStyle = c; ctx.fillRect(x0, 1400 - h, x1 - x0, h); shadowOff();
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(x0, 1400 - h, x1 - x0, 18);
      if (p > 0.8) {
        const cxs = (x0 + x1) / 2;
        const lines = l1.split(' ');
        if (lines.length > 1) { txt(lines[0], cxs, top + 70, 50, 'L', 400, COL.white); txt(lines[1], cxs, top + 125, 50, 'L', 400, COL.white); txt(l2, cxs, top + 185, 36, 'C', 900, COL.white); }
        else { txt(l1, cxs, top + 70, 50, 'L', 400, COL.white); txt(l2, cxs, top + 130, 36, 'C', 900, COL.white); }
      }
    });
    ctx.fillStyle = COL.ink; ctx.fillRect(100, 1400, 880 * E.outC(P(t, 8.2, 8.6)), 8);
    const c1 = E.outB(P(t, 9.2, 9.6)); if (c1 > 0) chip('النصر الخاص • العادات 1–3', 560, 900, 32, COL.ink, COL.white, { scale: c1 });
    const c2 = E.outB(P(t, 9.5, 9.9)); if (c2 > 0) chip('النصر العام • العادات 4–6', 290, 690, 32, COL.ink, COL.white, { scale: c2 });
    // hopping climber
    const hops = [[830, 1180], [560, 980], [280, 780]];
    let hx = hops[0][0], hy = hops[0][1];
    const ap = P(t, 8.8, 9.0);
    for (let k = 1; k < 3; k++) {
      const q = E.ioC(P(t, 9.0 + (k - 1) * 1.0 + 0.55, 9.0 + (k - 1) * 1.0 + 1.0));
      if (q > 0) { hx = lerp(hops[k - 1][0], hops[k][0], q); hy = lerp(hops[k - 1][1], hops[k][1], q) - Math.sin(q * Math.PI) * 120; }
    }
    if (ap > 0) { ctx.save(); ctx.globalAlpha = ap; person(hx, hy - 4, 110, COL.ink); ctx.restore(); }
    // renewal
    const rp = pop(t, 11.6, 0.5);
    if (rp > 0) {
      ctx.save(); ctx.translate(810, 640); ctx.scale(rp, rp); ctx.rotate(t * 1.5);
      ctx.beginPath(); ctx.arc(0, 0, 70, 0.3, Math.PI * 1.8); ctx.strokeStyle = COL.green; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.stroke();
      arrowHead(Math.cos(Math.PI * 1.8) * 70, Math.sin(Math.PI * 1.8) * 70, Math.PI * 1.8 + Math.PI / 2, 30, COL.green);
      ctx.restore();
      chip('التجديد • العادة 7', 810, 780, 32, COL.green, COL.white, { scale: rp });
    }
    kText('العضو الفعّال مستقل بذاته… ومتكامل مع فريقه', 540, 1540, t - 12.2, { fam: 'C', size: 50, maxW: 940, hl: ['ومتكامل'], hlc: COL.yellow, st: 0.05 });
  }
}

// ---------- Habits (78–169)
const HABITS = [
  { color: COL.orange, light: '#FFD2B8', ord: 'العادة الأولى', title: 'كن مبادرًا',
    idea: 'بين المؤثر واستجابتك مساحة… وفيها حريتك في الاختيار. المبادر يتحمّل مسؤولية أفعاله ولا يلوم الظروف.',
    ex: 'تأخّر أحد الموردين عن التسليم؟ بدل الشكوى، يقترح العضو المبادر خطة بديلة ويبدأ التنفيذ فورًا.',
    tools: ['دائرة التأثير مقابل دائرة الاهتمام', 'لغة المبادرة: «أختار» بدل «مضطر»', 'اختبار المبادرة لمدة 30 يومًا'],
    hl: [['حريتك'], ['خطة']] },
  { color: COL.teal, light: '#B5ECE5', ord: 'العادة الثانية', title: 'ابدأ والغاية في ذهنك',
    idea: 'كل شيء يُخلق مرتين: مرة في الذهن ثم مرة في الواقع. حدّد وجهتك قبل أن تبدأ السير.',
    ex: 'قبل إطلاق أي مشروع، يتفق الفريق على صورة النجاح النهائية ومعايير قياسها.',
    tools: ['كتابة رسالتك الشخصية', 'تمرين تخيّل الأثر الذي تريد أن تتركه', 'تحديد أدوارك وأهدافك'],
    hl: [['مرتين:'], ['النجاح']] },
  { color: COL.red, light: '#FFC4C8', ord: 'العادة الثالثة', title: 'ابدأ بالأهم ثم المهم',
    idea: 'حوّل رؤيتك إلى أفعال: امنح وقتك للمهم غير العاجل قبل أن يتحول إلى أزمة.',
    ex: 'بدل إطفاء الحرائق يوميًا، يخصص العضو وقتًا لتوثيق العمل وتدريب زملائه.',
    tools: ['مصفوفة إدارة الوقت (المربع الثاني)', 'التخطيط الأسبوعي حسب الأدوار', 'التفويض الفعّال وقول «لا» بلطف'],
    hl: [['العاجل'], ['وتدريب']] },
  { color: COL.green, light: '#C3EDCD', ord: 'العادة الرابعة', title: 'فكّر بعقلية المكسب للجميع',
    idea: 'بعقلية الوفرة، نجاح زميلك لا يعني خسارتك. ابحث دائمًا عن حل يكسب فيه الجميع.',
    ex: 'عند توزيع المهام، يقترح العضو تقسيمًا عادلًا يراعي قدرات الجميع، ويتقاسم الفضل في النجاح.',
    tools: ['اتفاقيات المكسب للطرفين', 'الحساب البنكي العاطفي', 'مكسب للجميع… أو لا اتفاق'],
    hl: [['الوفرة،'], ['الفضل']] },
  { color: COL.blue, light: '#C4D8FF', ord: 'العادة الخامسة', title: 'اسعَ أولًا لتَفهم ثم ليفهمك الآخرون',
    idea: 'أغلبنا يستمع ليرد لا ليفهم. الإنصات بتعاطف يفتح القلوب قبل العقول.',
    ex: 'زميل يشكو ضغط العمل؟ أنصت له، واعكس مشاعره بكلماتك، ثم اقترح الحلول.',
    tools: ['الإنصات التعاطفي', 'تجنّب الردود الذاتية كالتقييم والنصح المتسرّع', 'المصداقية ثم العاطفة ثم المنطق'],
    hl: [['بتعاطف'], ['أنصت']] },
  { color: COL.purple, light: '#DCCDFF', ord: 'العادة السادسة', title: 'التكاتف',
    idea: 'الكل أكبر من مجموع أجزائه. اختلافاتنا ليست عائقًا، بل مصدر لحلول لم تخطر لأحد.',
    ex: 'المصمم والمبرمج يختلفان في الرأي… فيبتكران معًا حلًا ثالثًا أفضل من فكرتيهما.',
    tools: ['تقدير الاختلافات واحترامها', 'البحث عن البديل الثالث', 'تحليل مجال القوى'],
    hl: [['أكبر'], ['ثالثًا']] },
  { color: COL.yellow2, light: '#FFE7A8', ord: 'العادة السابعة', title: 'اشحذ المنشار', dark: true,
    idea: 'الحطّاب الذي لا يتوقف ليشحذ منشاره يتعب أكثر وينجز أقل. جدّد طاقتك باستمرار.',
    ex: 'العضو الذي يخصص وقتًا للتعلّم والراحة يعود بطاقة وأفكار ترفع أداء فريقه كله.',
    tools: ['التجديد في 4 أبعاد: الجسدي، الذهني، الاجتماعي، الروحي', 'ساعة يوميًا لـ«النصر الخاص»', 'دوّامة النمو: تعلّم ← التزم ← افعل'],
    hl: [['جدّد'], ['للتعلّم']] },
];

const ICONS = [
  // 1. circle of influence
  (t, h) => {
    const p = pop(t, 0.8, 0.6); if (p <= 0) return;
    ctx.save(); ctx.translate(540, 860); ctx.scale(p, p);
    fillC(0, 0, 250, 'rgba(255,255,255,0.2)');
    sketch(circlePts(0, 0, 250, 250, 60), { lw: 6, color: COL.white, dash: [18, 14], seed: 3 });
    txt('دائرة الاهتمام', 0, -208, 34, 'C', 900, COL.white);
    [[-190, 60], [185, 40], [-120, 175], [130, 170]].forEach(([x, y], i) => txt('؟', x, y + Math.sin(T * 3 + i) * 8, 56, 'L', 400, 'rgba(255,255,255,0.75)'));
    const g = lerp(100, 170, E.ioC(P(t, 3, 8)));
    shadowOn(10, 12, 0.3); fillC(0, 0, g, COL.cream); shadowOff();
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; const d = g + 14 + Math.sin(T * 6) * 5; arrowHead(Math.cos(a) * d, Math.sin(a) * d, a, 16, COL.cream); }
    txt('دائرة التأثير', 0, -g + 38, 28, 'C', 900, h.color);
    person(0, 70, 95, COL.ink);
    ctx.restore();
  },
  // 2. target
  (t, h) => {
    const p = pop(t, 0.8, 0.5); if (p <= 0) return;
    ctx.save(); ctx.translate(540, 870); ctx.scale(p, p);
    const wob = Math.sin((t - 2.2) * 30) * Math.exp(-(t - 2.2) * 5) * (t > 2.2 ? 1 : 0);
    shadowOn(12, 12, 0.3); fillC(0, 0, 210, COL.white); shadowOff();
    fillC(0, 0, 165, COL.red); fillC(0, 0, 120, COL.white); fillC(0, 0, 75, COL.red); fillC(0, 0, 32, COL.yellow);
    const path = [[380, 260], [300, 60], [150, -10], [0, 0]];
    const pts = []; for (let i = 0; i <= 30; i++) { const u = i / 30; const a = lerp(lerp(path[0][0], path[1][0], u), lerp(path[1][0], path[2][0], u), u); const b = lerp(lerp(path[0][1], path[1][1], u), lerp(path[1][1], path[2][1], u), u); pts.push([lerp(a, lerp(path[2][0], 0, u), u * 0.3), lerp(b, lerp(path[2][1], 0, u), u * 0.3)]); }
    sketch(pts, { prog: E.ioC(P(t, 1.1, 1.7)), lw: 5, color: COL.white, dash: [12, 12], seed: 5 });
    const ap = E.inQ(P(t, 1.8, 2.2));
    if (ap > 0) {
      const ax = lerp(560, 0, ap), ay = lerp(420, 0, ap);
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.atan2(420, 560) + wob * 0.15);
      ctx.fillStyle = COL.ink; ctx.fillRect(0, -6, 230, 12);
      ctx.fillStyle = COL.yellow; ctx.beginPath(); ctx.moveTo(190, -6); ctx.lineTo(240, -34); ctx.lineTo(250, -6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(190, 6); ctx.lineTo(240, 34); ctx.lineTo(250, 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(8, -18); ctx.lineTo(8, 18); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    const bp = bump(t, 2.2, 0.5); if (bp > 0) { starPath(0, 0, 120 + bp * 150, 60 + bp * 80, 12); ctx.strokeStyle = COL.white; ctx.lineWidth = 6; ctx.stroke(); }
    ctx.restore();
  },
  // 3. time management matrix
  (t, h) => {
    const p = pop(t, 0.8, 0.5); if (p <= 0) return;
    ctx.save(); ctx.translate(540, 880); ctx.scale(p, p);
    const w = 520, hh = 400; const Q = [
      [1, 0, 'أزمات', 'I'], [0, 0, 'تخطيط وبناء', 'II'], [1, 1, 'مقاطعات', 'III'], [0, 1, 'مضيعات', 'IV']];
    const hot = E.outB(P(t, 2.0, 2.5));
    Q.forEach(([c, r, l, n], i) => {
      const x = c ? 5 : -w / 2, y = r ? 5 : -hh / 2; const qw = w / 2 - 5, qh = hh / 2 - 5;
      const isQ2 = i === 1;
      ctx.save(); ctx.translate(x + qw / 2, y + qh / 2);
      const s = isQ2 ? 1 + hot * 0.12 + Math.sin(T * 4) * 0.015 * hot : 1 - hot * 0.04;
      ctx.scale(s, s);
      shadowOn(isQ2 ? 14 : 6, 10, 0.3); rr(-qw / 2, -qh / 2, qw, qh, 16); ctx.fillStyle = isQ2 && hot > 0 ? COL.yellow : COL.cream; ctx.fill(); shadowOff();
      txt(n, qw / 2 - 26, -qh / 2 + 30, 30, 'L', 400, 'rgba(34,28,26,0.45)', 'center', { ltr: true });
      txt(l, 0, 10, 40, 'L', 400, isQ2 ? COL.ink : 'rgba(34,28,26,0.7)');
      if (isQ2 && hot > 0) { ctx.save(); ctx.translate(-qw / 2 + 30, -qh / 2 + 30); ctx.rotate(T); starPath(0, 0, 26, 12, 5); ctx.fillStyle = COL.red; ctx.fill(); ctx.restore(); }
      ctx.restore();
    });
    txt('عاجل', w / 4, -hh / 2 - 38, 34, 'C', 900, COL.white);
    txt('غير عاجل', -w / 4, -hh / 2 - 38, 34, 'C', 900, COL.white);
    txt('مهم', w / 2 + 22, -hh / 4, 32, 'C', 900, COL.white, 'right' === 'x' ? 'right' : 'left');
    txt('غير مهم', w / 2 + 22, hh / 4, 32, 'C', 900, COL.white, 'left');
    // clock
    ctx.save(); ctx.translate(-w / 2 - 20, -hh / 2 - 20);
    shadowOn(6, 8, 0.3); fillC(0, 0, 50, COL.white); shadowOff();
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 6; ctx.lineCap = 'round'; circ(0, 0, 50); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(T * 4) * 34, Math.sin(T * 4) * 34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(T * 0.5) * 22, Math.sin(T * 0.5) * 22); ctx.stroke();
    ctx.restore();
    ctx.restore();
  },
  // 4. growing pie between two people
  (t, h) => {
    const p = pop(t, 0.8, 0.5); if (p <= 0) return;
    ctx.save(); ctx.translate(540, 860); ctx.scale(p, p);
    const g = lerp(85, 165, E.outB(P(t, 2.5, 3.3)));
    shadowOn(10, 12, 0.3); fillC(0, -10, g, COL.yellow); shadowOff();
    ctx.save(); ctx.translate(0, -10); ctx.rotate(T * 0.4);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * g, Math.sin(a) * g); ctx.strokeStyle = COL.white; ctx.lineWidth = 6; ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, g, 0, Math.PI / 3); ctx.closePath(); ctx.fillStyle = COL.red; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, g, Math.PI, Math.PI * 4 / 3); ctx.closePath(); ctx.fillStyle = COL.blue; ctx.fill();
    ctx.restore();
    [[-300, COL.blue, 'تكسب'], [300, COL.red, 'أكسب']].forEach(([x, c, l], i) => {
      const bob = Math.sin(T * 4 + i * 2) * 6;
      person(x, 160 + bob, 150, c);
      chip(l, x, 215, 36, COL.white, COL.ink, { fam: 'L', wt: 400 });
    });
    for (let i = 0; i < 5; i++) { const q = (t * 0.8 + i / 5) % 1; const a = i * 1.3; ctx.save(); ctx.globalAlpha = 1 - q; txt('+', Math.cos(a) * (g + 30 + q * 80), -10 + Math.sin(a) * (g + 30 + q * 80), 50, 'L', 400, COL.white, 'center', { ltr: true }); ctx.restore(); }
    ctx.restore();
  },
  // 5. listening ear
  (t, h) => {
    const p = pop(t, 0.8, 0.5); if (p <= 0) return;
    ctx.save(); ctx.translate(540, 860); ctx.scale(p, p);
    // ear
    ctx.save(); ctx.translate(-190, 0);
    shadowOn(12, 12, 0.3);
    ctx.beginPath(); ctx.moveTo(40, 170);
    ctx.bezierCurveTo(-60, 170, -40, 60, -110, 0); ctx.bezierCurveTo(-170, -80, -110, -210, 10, -210);
    ctx.bezierCurveTo(120, -210, 150, -110, 120, -40); ctx.bezierCurveTo(95, 20, 60, 30, 70, 100); ctx.bezierCurveTo(78, 150, 70, 170, 40, 170); ctx.closePath();
    ctx.fillStyle = COL.skin; ctx.fill(); shadowOff();
    ctx.beginPath(); ctx.moveTo(-50, -20); ctx.bezierCurveTo(-60, -130, 60, -150, 70, -70); ctx.bezierCurveTo(75, -30, 30, -10, 20, 30);
    ctx.strokeStyle = '#D08F65'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.stroke();
    ctx.restore();
    // sound waves arriving at ear
    for (let i = 0; i < 4; i++) {
      const q = (t * 0.7 + i / 4) % 1; const r = lerp(330, 110, q);
      ctx.beginPath(); ctx.arc(-160, 0, r, -0.55, 0.55); ctx.strokeStyle = `rgba(255,255,255,${Math.sin(q * Math.PI)})`; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.stroke();
    }
    // speaker + bubble
    person(290, 200, 150, COL.navy);
    ctx.save(); ctx.translate(250, -120); ctx.rotate(Math.sin(T * 2) * 0.04);
    shadowOn(8, 10, 0.3); rr(-110, -70, 220, 140, 40); ctx.fillStyle = COL.white; ctx.fill();
    ctx.beginPath(); ctx.moveTo(20, 60); ctx.lineTo(60, 120); ctx.lineTo(60, 60); ctx.fill(); shadowOff();
    for (let i = 0; i < 3; i++) fillC(-50 + i * 50, Math.sin(T * 8 - i) * 8, 16, h.color);
    ctx.restore();
    const hp = pop(t, 3.0, 0.5); if (hp > 0) { ctx.save(); ctx.translate(-20, -210); ctx.scale(hp * (1 + Math.sin(T * 6) * 0.06), hp * (1 + Math.sin(T * 6) * 0.06)); ctx.beginPath(); ctx.moveTo(0, 20); ctx.bezierCurveTo(-60, -20, -30, -70, 0, -40); ctx.bezierCurveTo(30, -70, 60, -20, 0, 20); ctx.fillStyle = COL.red; ctx.fill(); ctx.restore(); }
    ctx.restore();
  },
  // 6. puzzle pieces join — 1 + 1 = 3
  (t, h) => {
    const p = pop(t, 0.8, 0.4); if (p <= 0) return;
    ctx.save(); ctx.translate(540, 900); ctx.scale(p, p);
    const j = E.outB(P(t, 1.3, 2.3)); const s = 190;
    const bx = lerp(-520, -s / 2, j), ax = lerp(520, s / 2, j);
    // piece A (right) with socket on its left edge
    ctx.save(); ctx.translate(ax, 0); shadowOn(12, 12, 0.3);
    ctx.save(); ctx.beginPath(); ctx.rect(-s / 2, -s / 2, s, s); ctx.clip();
    ctx.beginPath(); ctx.rect(-s / 2, -s / 2, s, s); ctx.moveTo(-s / 2 + 42, 0); ctx.arc(-s / 2, 0, 42, 0, Math.PI * 2);
    ctx.fillStyle = COL.yellow; ctx.fill('evenodd'); ctx.restore(); shadowOff(); ctx.restore();
    // piece B (left) with knob on its right edge
    ctx.save(); ctx.translate(bx, 0); shadowOn(12, 12, 0.3);
    ctx.beginPath(); ctx.rect(-s / 2, -s / 2, s, s); ctx.moveTo(s / 2 + 40, 0); ctx.arc(s / 2, 0, 40, 0, Math.PI * 2);
    ctx.fillStyle = COL.pink; ctx.fill('nonzero'); shadowOff(); ctx.restore();
    const bp = bump(t, 2.3, 0.6);
    if (t > 2.3) { ctx.save(); ctx.rotate(T * 0.6); starPath(0, 0, 150 + bp * 260, 90 + bp * 150, 14); ctx.strokeStyle = `rgba(255,255,255,${0.9 - P(t, 2.3, 3.2) * 0.6})`; ctx.lineWidth = 6; ctx.stroke(); ctx.restore(); }
    const eq = ['1', '+', '1', '=', '3'];
    eq.forEach((c, i) => {
      const q = pop(t, 2.5 + i * 0.12, 0.4); if (q <= 0) return;
      ctx.save(); ctx.translate(-200 + i * 100, -230); ctx.scale(q, q);
      txt(c, 0, 0, i === 4 ? 130 : 100, 'L', 400, i === 4 ? COL.yellow : COL.white, 'center', { ltr: true, drop: COL.ink });
      ctx.restore();
    });
    ctx.restore();
  },
  // 7. sharpen the saw + 4 dimensions
  (t, h) => {
    const p = pop(t, 0.8, 0.5); if (p <= 0) return;
    ctx.save(); ctx.translate(540, 880); ctx.scale(p, p);
    // blade
    ctx.save(); ctx.rotate(-0.06);
    shadowOn(12, 12, 0.3);
    ctx.beginPath(); ctx.moveTo(-300, -30); ctx.lineTo(170, -70);
    ctx.lineTo(170, 50);
    for (let x = 170; x > -300; x -= 24) { ctx.lineTo(x - 12, 72); ctx.lineTo(x - 24, 50); }
    ctx.closePath(); ctx.fillStyle = '#DDE4EC'; ctx.fill(); shadowOff();
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(-260, -20, 380, 10);
    // handle
    shadowOn(10, 10, 0.3); rr(160, -95, 150, 170, 50); ctx.fillStyle = COL.brown; ctx.fill(); shadowOff();
    rr(200, -55, 70, 90, 30); ctx.fillStyle = h.color; ctx.fill();
    // file + sparks
    const fx = -260 + ((Math.sin((t - 1) * 5) + 1) / 2) * 400;
    if (t > 1) {
      ctx.save(); ctx.translate(fx, 80); ctx.rotate(-0.3); ctx.fillStyle = COL.ink; ctx.fillRect(-60, -10, 120, 20); ctx.restore();
      for (let k = 0; k < 12; k++) {
        const q = (t * 3 + k / 12) % 1; const a = -Math.PI / 2 + (hash(k) - 0.5) * 2.4;
        const d = 20 + q * 120; ctx.strokeStyle = `rgba(255,255,255,${1 - q})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(fx + Math.cos(a) * d, 70 + Math.sin(a) * d); ctx.lineTo(fx + Math.cos(a) * (d + 18), 70 + Math.sin(a) * (d + 18)); ctx.stroke();
      }
    }
    ctx.restore();
    const D = [['جسدي', 330, -200], ['ذهني', -330, -200], ['اجتماعي', 330, 175], ['روحي', -330, 175]];
    D.forEach(([l, x, y], i) => {
      const q = pop(t, 2.3 + i * 0.2, 0.45); if (q <= 0) return;
      ctx.save(); ctx.translate(x, y + Math.sin(T * 3 + i) * 6); ctx.scale(q, q);
      shadowOn(8, 10, 0.3); fillC(0, 0, 62, COL.white); shadowOff();
      ctx.strokeStyle = COL.ink; ctx.fillStyle = COL.ink; ctx.lineWidth = 8; ctx.lineCap = 'round';
      if (i === 0) { ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.stroke(); ctx.fillRect(-36, -18, 12, 36); ctx.fillRect(24, -18, 12, 36); }
      if (i === 1) { ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, 22); ctx.moveTo(0, -18); ctx.quadraticCurveTo(-18, -26, -32, -18); ctx.lineTo(-32, 20); ctx.quadraticCurveTo(-18, 12, 0, 22); ctx.quadraticCurveTo(18, 12, 32, 20); ctx.lineTo(32, -18); ctx.quadraticCurveTo(18, -26, 0, -18); ctx.stroke(); }
      if (i === 2) { ctx.beginPath(); ctx.moveTo(0, 26); ctx.bezierCurveTo(-50, -6, -26, -46, 0, -20); ctx.bezierCurveTo(26, -46, 50, -6, 0, 26); ctx.fillStyle = COL.red; ctx.fill(); }
      if (i === 3) { ctx.beginPath(); ctx.moveTo(0, 28); ctx.quadraticCurveTo(-34, 0, 0, -30); ctx.quadraticCurveTo(34, 0, 0, 28); ctx.fillStyle = COL.green; ctx.fill(); ctx.beginPath(); ctx.moveTo(0, 28); ctx.lineTo(0, -14); ctx.strokeStyle = COL.white; ctx.lineWidth = 4; ctx.stroke(); }
      ctx.restore();
      txt(l, x, y + 88, 34, 'C', 900, COL.ink);
    });
    ctx.restore();
  },
];

function habitScene(i) {
  const h = HABITS[i];
  const tc = h.dark ? COL.ink : COL.white;
  return function (t) {
    ctx.fillStyle = h.color; ctx.fillRect(-50, -50, W + 100, H + 100);
    // big ghost number
    ctx.save(); ctx.globalAlpha = 0.13;
    txt(String(i + 1), 540 + Math.sin(t * 0.4) * 30 - t * 6, 980, 1400, 'L', 400, COL.ink, 'center', { ltr: true });
    ctx.restore();
    halftone(0, 1580, W, 340, 'rgba(255,255,255,0.18)', 26, 8, (u, v) => v);
    // floating paper confetti
    for (let k = 0; k < 10; k++) {
      const x = (hash(k + i * 20) * W + t * 20 * (k % 2 ? 1 : -1)) % W, y = 600 + hash(k + 5 + i * 20) * 700 + Math.sin(t * 1.5 + k) * 20;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * (k % 2 ? 1 : -1) + k); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-10, -6, 20, 12); ctx.restore();
    }
    // number badge
    const bp = P(t, 0.25, 0.55);
    if (bp > 0) {
      const s = lerp(3.4, 1, E.outC(bp)) + bump(t, 0.55, 0.3) * 0.15;
      ctx.save(); ctx.translate(540, 285); ctx.rotate(lerp(-0.8, -0.06, E.outC(bp)) + Math.sin(t * 1.4) * 0.03); ctx.scale(s, s);
      shadowOn(12, 14, 0.35); starPath(0, 0, 118, 104, 18, t * 0.3); ctx.fillStyle = COL.white; ctx.fill(); shadowOff();
      circ(0, 0, 92); ctx.strokeStyle = h.color; ctx.lineWidth = 5; ctx.setLineDash([8, 8]); ctx.stroke(); ctx.setLineDash([]);
      txt(String(i + 1), 0, 0, 150, 'L', 400, h.dark ? COL.ink : h.color, 'center', { ltr: true });
      ctx.restore();
    }
    const op = E.outB(P(t, 0.7, 1.1));
    if (op > 0) chip(h.ord, 540, 432, 38, COL.ink, COL.white, { scale: op, rot: 0.02 });
    const long = h.title.length > 22;
    kText(h.title, 540, long ? 565 : 555, t - 0.95, { size: long ? 80 : 98, lh: long ? 98 : 120, maxW: 980, color: tc, drop: h.dark ? COL.white : COL.ink, st: 0.08, anim: 'slam', out: 11.75 });
    // illustration
    const exitI = E.inC(P(t, 12.5, 12.95));
    ctx.save(); ctx.translate(0, (i === 6 ? 0 : 40) - exitI * 200); ctx.globalAlpha = 1 - exitI;
    ICONS[i](t, h);
    ctx.restore();
    habitCard(h, t);
  };
}
function habitCard(h, t) {
  const tt = [2.0, 5.3, 8.8];
  const k = t < tt[1] ? 0 : t < tt[2] ? 1 : 2;
  const tk = tt[k];
  let sx = 1, yoff = 0, rot = [-0.015, 0.012, -0.01][k];
  const inP = E.outB(P(t, 1.6, 2.2)); if (inP <= 0) return;
  yoff += (1 - inP) * 900;
  if (k > 0) sx = E.outB(P(t, tk, tk + 0.32));
  if (k < 2) { const ns = tt[k + 1]; sx *= 1 - E.inC(P(t, ns - 0.16, ns)); }
  const outP = E.inC(P(t, 12.55, 12.95)); yoff += outP * 900; rot += outP * 0.2;
  const cw = 950, ch = 470, cy = 1395;
  ctx.save(); ctx.translate(540, cy + yoff); ctx.rotate(rot); ctx.scale(Math.max(0.001, sx), 1);
  paperCard(cw, ch, COL.white, 20 + k, 6);
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = h.light; ctx.fillRect(-cw / 2 + 12, ch / 2 - 22, cw - 24, 10); ctx.restore();
  const labels = ['الفكرة', 'مثال من الفريق', 'أدوات من الكتاب'];
  chip(labels[k], cw / 2 - 40, -ch / 2 + 4, 42, h.dark ? COL.ink : h.color, COL.white, { anchor: 'right', fam: 'L', wt: 400, rot: -0.03 });
  // tiny icon beside tab
  const ix = cw / 2 - 40 - measure(labels[k], 42, 'L') - 110, iy = -ch / 2 + 4;
  ctx.save(); ctx.translate(ix, iy); ctx.rotate(Math.sin(T * 3) * 0.1);
  shadowOn(4, 6, 0.25); fillC(0, 0, 34, COL.yellow); shadowOff();
  ctx.fillStyle = COL.ink; ctx.strokeStyle = COL.ink; ctx.lineWidth = 5; ctx.lineCap = 'round';
  if (k === 0) { fillC(0, -4, 13, COL.ink); ctx.fillRect(-6, 8, 12, 9); }
  if (k === 1) { person(-9, 18, 26, COL.ink, COL.ink); person(10, 18, 26, COL.ink, COL.ink); }
  if (k === 2) { ctx.beginPath(); ctx.moveTo(-14, 14); ctx.lineTo(10, -10); ctx.stroke(); circ(12, -12, 9); ctx.stroke(); }
  ctx.restore();
  const lt = t - tk - 0.2;
  if (k < 2) {
    kText(k === 0 ? h.idea : h.ex, 0, 30, lt, { fam: 'C', wt: 800, size: 46, lh: 76, maxW: 850, st: 0.03, anim: 'rise', color: COL.ink, hl: h.hl[k], hlc: h.light });
  } else {
    h.tools.forEach((tl, j) => {
      const y = -120 + j * 132, t0 = 0.15 + j * 0.5;
      const q = pop(lt, t0, 0.4); if (q <= 0) return;
      ctx.save(); ctx.translate(390, y); ctx.scale(q, q);
      fillC(0, 0, 32, h.dark ? COL.ink : h.color);
      sketch([[-14, 0], [-4, 12], [16, -12]], { prog: E.outC(P(lt, t0 + 0.15, t0 + 0.4)), lw: 8, color: COL.white, amp: 0.5 });
      ctx.restore();
      kText(tl, 330, y, lt - t0 - 0.05, { fam: 'C', wt: 800, size: 40, lh: 56, align: 'right', maxW: 700, st: 0.03, anim: 'rise' });
    });
  }
  ctx.restore();
  // step dots
  if (outP < 1) for (let d = 0; d < 3; d++) {
    const active = d === k; const x = 540 + 60 - d * 60;
    ctx.save(); ctx.globalAlpha = inP * (1 - outP);
    rr(x - (active ? 26 : 10), 1665 + yoff * 0.2, active ? 52 : 20, 20, 10); ctx.fillStyle = active ? COL.white : 'rgba(255,255,255,0.45)'; ctx.fill();
    ctx.restore();
  }
}

// ---------- Scene: Outro (169–180)
function sOutro(t) {
  sunburst(540, 820, COL.yellow, COL.yellow2, t * 0.15, 20);
  halftone(0, 1500, W, 420, 'rgba(255,255,255,0.35)', 30, 9, (u, v) => v);
  const LBL = ['المبادرة', 'الغاية', 'الأولويات', 'المكسب للجميع', 'الإنصات', 'التكاتف', 'التجديد'];
  const conv = E.inC(P(t, 3.0, 3.6));
  if (conv < 1) {
    for (let i = 0; i < 7; i++) {
      const s = pop(t, 0.3 + i * 0.2, 0.45) * (1 - conv); if (s <= 0) continue;
      const a = -Math.PI / 2 - i * 2 * Math.PI / 7 + t * 0.15;
      const R = 330 * (1 - conv);
      const x = 540 + Math.cos(a) * R, y = 820 + Math.sin(a) * R;
      badge(x, y, 72, HABITS[i].color, String(i + 1), { s, size: 86, rot: Math.sin(T * 2 + i) * 0.1 });
      ctx.save(); ctx.globalAlpha = s; txt(LBL[i], x, y + 105, 32, 'C', 900, COL.ink); ctx.restore();
    }
    kText('7 عادات', 540, 770, t - 1.8, { size: 130, out: 1.1 });
    kText('لفريق أكثر فعالية', 540, 900, t - 2.3, { fam: 'C', size: 56, out: 0.6 });
  }
  const bp = bump(t, 3.6, 0.8);
  if (t > 3.6 && t < 4.6) { ctx.save(); ctx.translate(540, 820); ctx.rotate(t); starPath(0, 0, 200 + P(t, 3.6, 4.4) * 1400, 120 + P(t, 3.6, 4.4) * 900, 16); ctx.fillStyle = `rgba(255,255,255,${1 - P(t, 3.6, 4.6)})`; ctx.fill(); ctx.restore(); }
  kText('كن العضو الذي\nيرفع فريقه', 540, 640, t - 3.8, { size: 132, lh: 170, st: 0.12, anim: 'slam', colors: { 'يرفع': COL.red } });
  const lp = P(t, 5.5, 5.8);
  if (lp > 0) brand(540, 1010, lerp(4, 1.7, E.outC(lp)) + bump(t, 5.8, 0.3) * 0.2, { rot: lerp(-0.6, -0.04, E.outC(lp)) });
  kText('شارك الفيديو مع فريقك', 540, 1290, t - 6.8, { fam: 'C', size: 56, hl: ['فريقك'], hlc: COL.white });
  kText('مستوحى من كتاب «العادات السبع للأشخاص الأكثر فعالية» — ستيفن آر. كوفي', 540, 1450, t - 7.4, { fam: 'C', wt: 700, size: 32, maxW: 820, st: 0.02, color: 'rgba(34,28,26,0.75)', anim: 'rise' });
  void bp;
}

/* ============================ TIMELINE ============================== */
const SC = [
  { s: 0, e: 9, f: sIntro, ch: '' },
  { s: 9, e: 24, f: sTeam, tr: 'stripes', ch: 'الفريق' },
  { s: 24, e: 29, f: sPortrait, tr: 'tear', ch: 'المؤلف' },
  { s: 29, e: 46, f: sMap, tr: 'iris', ch: 'المؤلف' },
  { s: 46, e: 64, f: sBook, tr: 'stripes', ch: 'الكتاب' },
  { s: 64, e: 78, f: sFrame, tr: 'tear', ch: 'الإطار' },
];
const HTR = ['slide', 'tear', 'iris', 'stripes', 'tear', 'iris', 'slide'];
for (let i = 0; i < 7; i++) SC.push({ s: 78 + 13 * i, e: 91 + 13 * i, f: habitScene(i), tr: HTR[i], ch: `العادة ${i + 1} من 7`, hab: i });
SC.push({ s: 169, e: 180.5, f: sOutro, tr: 'iris', ch: '' });

const TR_D = 0.7;
function tearEdge(x0, seed) {
  const pts = []; for (let y = -60; y <= H + 60; y += 40) pts.push([x0 + (hash(seed + y * 0.37) - 0.5) * 60, y]); return pts;
}
function drawScene(sc, t) { ctx.save(); sc.f(t - sc.s); ctx.restore(); }
function renderScenes(t) {
  let idx = SC.findIndex(s => t >= s.s && t < s.e); if (idx < 0) idx = SC.length - 1;
  const sc = SC[idx];
  const lt = t - sc.s;
  if (idx > 0 && lt < TR_D && sc.tr && sc.tr !== 'stripes') {
    const prev = SC[idx - 1]; const p = lt / TR_D;
    if (sc.tr === 'tear') {
      const e = E.ioC(p); const x0 = lerp(W + 120, -120, e);
      drawScene(prev, t);
      const pts = tearEdge(x0, idx * 11);
      ctx.save(); ctx.beginPath(); ctx.moveTo(W + 200, -60); pts.forEach(q => ctx.lineTo(...q)); ctx.lineTo(W + 200, H + 60); ctx.closePath(); ctx.clip();
      drawScene(sc, t); ctx.restore();
      ctx.save(); shadowOn(10, 16, 0.35); sketch(pts, { lw: 22, color: COL.white, amp: 0 }); shadowOff(); ctx.restore();
    } else if (sc.tr === 'iris') {
      const e = E.ioC(p); const r = e * 1250;
      drawScene(prev, t);
      ctx.save(); circ(540, 900, r); ctx.clip(); drawScene(sc, t); ctx.restore();
      circ(540, 900, r); ctx.strokeStyle = COL.ink; ctx.lineWidth = 18 * (1 - e) + 4; ctx.stroke();
    } else if (sc.tr === 'slide') {
      const e = E.ioX(p);
      ctx.save(); ctx.translate(0, -H * e); drawScene(prev, t); ctx.restore();
      ctx.save(); ctx.translate(0, H * (1 - e)); drawScene(sc, t); ctx.restore();
      ctx.fillStyle = COL.ink; ctx.fillRect(0, H * (1 - e) - 14, W, 14);
    }
  } else drawScene(sc, t);
  // stripes cover transition, centred on scene boundary
  for (const s of SC) {
    if (s.tr !== 'stripes') continue;
    const p = P(t, s.s - 0.45, s.s + 0.45); if (p <= 0 || p >= 1) continue;
    const cols = [COL.ink, COL.red, COL.yellow];
    cols.forEach((c, k) => {
      const q = clamp(p * 1.25 - (2 - k) * 0.06 + 0.06);
      const e = E.ioC(q); const Wb = W + 1600;
      const x0 = lerp(W + 500, -Wb - 500, e);
      ctx.beginPath(); ctx.moveTo(x0 + 400, 0); ctx.lineTo(x0 + 400 + Wb, 0); ctx.lineTo(x0 + Wb, H); ctx.lineTo(x0, H); ctx.closePath();
      ctx.fillStyle = c; ctx.fill();
    });
  }
  return sc;
}

function hud(t, sc) {
  if (t < 9.3 || t > 168.7) return;
  const a = clamp(P(t, 9.3, 9.8)) * (1 - P(t, 168.3, 168.7));
  ctx.save(); ctx.globalAlpha = a;
  brand(W - 150, 118, 0.5, { shadow: false });
  if (sc.ch) chip(sc.ch, 50, 118, 30, 'rgba(34,28,26,0.85)', COL.white, { anchor: 'left', shadow: false });
  // progress
  const x0 = 90, x1 = 990, y = 1850;
  ctx.fillStyle = 'rgba(34,28,26,0.25)'; rr(x0, y - 4, x1 - x0, 8, 4); ctx.fill();
  const f = clamp((t - 9) / (169 - 9));
  ctx.fillStyle = COL.ink; rr(x1 - (x1 - x0) * f, y - 4, (x1 - x0) * f, 8, 4); ctx.fill();
  for (let i = 0; i < 7; i++) {
    const fx = x1 - (x1 - x0) * ((78 + 13 * i - 9) / 160);
    const on = t >= 78 + 13 * i;
    fillC(fx, y, on ? 11 : 8, on ? HABITS[i].color : 'rgba(34,28,26,0.4)');
  }
  ctx.restore();
}

const IMP = (window.CUES && window.CUES.impact) || [];
function shake(t) {
  let x = 0, y = 0, r = 0;
  for (const [ti, amp] of IMP) {
    const d = t - ti; if (d < 0 || d > 0.7) continue;
    const k = amp * Math.exp(-d * 8);
    x += Math.sin(d * 71) * k * 13; y += Math.cos(d * 57) * k * 17; r += Math.sin(d * 43) * k * 0.006;
  }
  return [x, y, r];
}

function renderFrame(t) {
  T = t; BF = Math.floor(t * 12);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; shadowOff();
  ctx.fillStyle = COL.ink; ctx.fillRect(0, 0, W, H);
  const [sx, sy, sr] = shake(t);
  const zs = 1 + (Math.abs(sx) + Math.abs(sy)) / 420;
  ctx.save();
  ctx.translate(W / 2 + sx, H / 2 + sy); ctx.rotate(sr); ctx.scale(zs, zs); ctx.translate(-W / 2, -H / 2);
  const sc = renderScenes(t);
  ctx.restore();
  hud(t, sc);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(TEX, 0, 0); ctx.restore();
}
window.renderFrame = renderFrame;

/* ------------------------------ player ------------------------------ */
const FONTS_READY = Promise.all([
  document.fonts.load('400 80px Lalezar', 'موظف X10'),
  ...[700, 800, 900].map(w => document.fonts.load(`${w} 40px Cairo`, 'عادة 1989')),
]).then(() => document.fonts.ready).then(() => { window.READY = true; });

if (!/render/.test(location.search)) {
  let playing = true, start = performance.now(), off = +(new URLSearchParams(location.search).get('t') || 0);
  const loop = now => {
    if (playing) { const t = (off + (now - start) / 1000) % DUR; renderFrame(t); }
    requestAnimationFrame(loop);
  };
  FONTS_READY.then(() => requestAnimationFrame(loop));
  const cur = () => off + (performance.now() - start) / 1000;
  addEventListener('keydown', e => {
    if (e.code === 'Space') { if (playing) { off = cur(); playing = false; } else { start = performance.now(); playing = true; } }
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { const d = e.code === 'ArrowRight' ? 1 : -1; off = clamp((playing ? cur() : off) + d, 0, DUR); start = performance.now(); if (!playing) renderFrame(off); }
  });
  cv.addEventListener('click', e => { const r = cv.getBoundingClientRect(); off = (e.clientX - r.left) / r.width * DUR; start = performance.now(); if (!playing) renderFrame(off); });
}
