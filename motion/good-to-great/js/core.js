// Core helpers: math, easing, RTL text layout, paper + ink primitives, textures.
'use strict';

const W = 1080, H = 1920;
const FD = '"Thmanyah Serif Display"';
const FT = '"Thmanyah Serif Text"';

const C = {
  paper: '#F3EADA', paper2: '#E9DCC4', cream: '#FFF7E8', ink: '#16151A', ink2: '#2B2A33',
  yellow: '#FFC627', yellow2: '#FFD95C', red: '#F2483A', red2: '#C7302A', teal: '#14A396',
  teal2: '#0E7F75', blue: '#2C57E8', blue2: '#1D3DB0', navy: '#1B2550', pink: '#FF8FA3',
  green: '#25B062', orange: '#FF8A1F', gray: '#A39E95', gray2: '#77736B', sky: '#BFE3EE',
  purple: '#6A4CF5', skin1: '#E9B48A', skin2: '#C68A5E', skin3: '#8D5A3B', skin4: '#F3CBA5'
};

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const TAU = Math.PI * 2;
const E = {
  lin: x => x,
  inQ: x => x * x,
  outQ: x => 1 - (1 - x) * (1 - x),
  inC: x => x * x * x,
  outC: x => 1 - Math.pow(1 - x, 3),
  ioC: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  outQuint: x => 1 - Math.pow(1 - x, 5),
  inExpo: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  ioExpo: x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
  outBack: (x, s = 1.9) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
  inBack: (x, s = 1.7) => (s + 1) * x * x * x - s * x * x,
  outElastic: x => x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - .75) * TAU / 3) + 1,
};
// damped spring 0 -> 1 (t in seconds since start)
function spring(t, f = 2.4, z = 0.32) {
  if (t <= 0) return 0;
  const wd = TAU * f * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * TAU * f * t) * (Math.cos(wd * t) + (z / Math.sqrt(1 - z * z)) * Math.sin(wd * t));
}
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); }
function hs(n) { return hash(n) * 2 - 1; }
// stop-motion "boil": changes 12 times a second
function boil(id, t, amt = 1) {
  const k = Math.floor(t * 12);
  return { x: hs(id * 13.13 + k * 1.31) * amt, y: hs(id * 7.77 + k * 3.17) * amt, r: hs(id * 3.31 + k * 1.71) * 0.006 * amt };
}
// decaying shake impulse
function shakeAt(t, t0, amp = 18, dur = 0.45, freq = 28) {
  const d = t - t0; if (d < 0 || d > dur) return { x: 0, y: 0, r: 0 };
  const k = Math.pow(1 - d / dur, 2.2);
  return { x: Math.sin(d * freq * 1.3 + t0) * amp * k, y: Math.cos(d * freq + t0 * 3) * amp * k, r: Math.sin(d * freq * 0.7) * 0.012 * k * amp / 18 };
}
// punch-in zoom impulse
function punchAt(t, t0, amt = 0.06, dur = 0.5) {
  const d = t - t0; if (d < 0 || d > dur) return 0;
  return amt * Math.exp(-d * 9) * Math.cos(d * 18);
}

// ---------- canvas helpers ----------
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function shadowOn(ctx, lift = 0, a = 0.26) {
  ctx.shadowColor = `rgba(60,35,10,${a})`; ctx.shadowBlur = 10 + lift * 26;
  ctx.shadowOffsetX = 4 + lift * 10; ctx.shadowOffsetY = 8 + lift * 22;
}
function shadowOff(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
function withT(ctx, x, y, rot, sx, sy, fn) {
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (sx !== 1 || sy !== 1) ctx.scale(sx, sy === undefined ? sx : sy); fn(); ctx.restore();
}

// paper card with cut-paper look (fill + soft shadow + subtle top highlight)
function card(ctx, x, y, w, h, fill, { r = 22, lift = 0, shadow = true, edge = null } = {}) {
  ctx.save();
  if (shadow) shadowOn(ctx, lift);
  ctx.fillStyle = fill; rr(ctx, x, y, w, h, r); ctx.fill();
  shadowOff(ctx);
  if (edge) { ctx.lineWidth = 6; ctx.strokeStyle = edge; rr(ctx, x + 3, y + 3, w - 6, h - 6, r - 2); ctx.stroke(); }
  // light from top: faint sheen
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0.16)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.06)');
  ctx.fillStyle = g; rr(ctx, x, y, w, h, r); ctx.fill();
  ctx.restore();
}
// translucent tape strip
function tape(ctx, x, y, w, rot) {
  withT(ctx, x, y, rot, 1, 1, () => {
    ctx.fillStyle = 'rgba(255,248,225,0.78)'; ctx.fillRect(-w / 2, -17, w, 34);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-w / 2, -17, w, 8);
    ctx.strokeStyle = 'rgba(120,100,60,0.18)'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let i = 0; i <= 6; i++) { const yy = -17 + i * 34 / 6; ctx.lineTo(-w / 2 + (i % 2 ? 4 : 0), yy); } ctx.stroke();
    ctx.beginPath(); for (let i = 0; i <= 6; i++) { const yy = -17 + i * 34 / 6; ctx.lineTo(w / 2 - (i % 2 ? 4 : 0), yy); } ctx.stroke();
  });
}

// ---------- RTL text ----------
function font(ctx, fam, size, weight) { ctx.font = `${weight} ${size}px ${fam}`; }
function text(ctx, s, x, y, { fam = FT, size = 48, weight = 400, color = C.ink, align = 'center', alpha = 1 } = {}) {
  ctx.save(); font(ctx, fam, size, weight); ctx.direction = 'rtl'; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.fillText(s, x, y); ctx.restore();
}
// Word layout, right-to-left. '|' forces a line break.
function layout(ctx, str, { fam = FD, size = 100, weight = 900, maxW = 920, lh = 1.22, x = 540, y = 0, align = 'center' } = {}) {
  font(ctx, fam, size, weight); ctx.direction = 'rtl';
  const sp = ctx.measureText(' ').width * 1.05;
  const lines = [[]]; let lw = 0;
  for (const w of str.split(/\s+/)) {
    if (w === '|') { lines.push([]); lw = 0; continue; }
    const ww = ctx.measureText(w).width;
    let cur = lines[lines.length - 1];
    if (cur.length && lw + sp + ww > maxW) { lines.push([]); lw = 0; cur = lines[lines.length - 1]; }
    cur.push({ w, ww }); lw += (cur.length > 1 ? sp : 0) + ww;
  }
  const items = []; let i = 0;
  lines.forEach((ln, li) => {
    const total = ln.reduce((a, b) => a + b.ww, 0) + sp * (ln.length - 1);
    let right = align === 'center' ? x + total / 2 : align === 'right' ? x : x + total;
    for (const it of ln) { items.push({ w: it.w, cx: right - it.ww / 2, y: y + li * size * lh, ww: it.ww, line: li, i: i++, lineW: total }); right -= it.ww + sp; }
  });
  return { items, n: lines.length, size, fam, weight, lh };
}
// Kinetic per-word draw. Styles: pop | rise | drop | slam
function words(ctx, L, t, t0, { color = C.ink, stagger = 0.07, dur = 0.55, style = 'pop', seed = 1, times = null, out = null, outStagger = 0.03, outDur = 0.35, stroke = null, strokeW = 0, shadow = false } = {}) {
  ctx.save(); font(ctx, L.fam, L.size, L.weight); ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  for (const it of L.items) {
    const st = times ? (times[it.i] !== undefined ? times[it.i] : times[times.length - 1]) : t0 + it.i * stagger;
    const p = (t - st) / dur; if (p <= 0) continue;
    const q = clamp(p);
    let dx = 0, dy = 0, s = 1, rot = 0, a = 1;
    if (style === 'pop') { s = Math.max(0, spring(t - st, 2.6, 0.38)); dy = (1 - E.outC(q)) * L.size * 0.5; rot = (1 - E.outC(q)) * hs(seed + it.i * 3.1) * 0.35; a = clamp(p * 4); }
    else if (style === 'rise') { dy = (1 - E.outExpo(q)) * L.size * 1.15; a = clamp(p * 3); rot = (1 - E.outExpo(q)) * 0.06; }
    else if (style === 'drop') { dy = -(1 - E.outBack(q, 2.4)) * L.size * 0.9; a = clamp(p * 4); }
    else if (style === 'slam') { s = 1 + (1 - E.outExpo(q)) * 1.6; a = clamp(p * 5); rot = (1 - E.outExpo(q)) * hs(seed + it.i) * 0.2; }
    if (out !== null) {
      const po = clamp((t - (out + it.i * outStagger)) / outDur);
      if (po >= 1) continue;
      dy -= E.inBack(po) * L.size * 1.2; a *= 1 - E.inQ(po);
    }
    const b = boil(seed * 31 + it.i, t, 0.8);
    ctx.save();
    if (style === 'rise') { // mask to the line box
      ctx.beginPath(); ctx.rect(it.cx - it.ww / 2 - 40, it.y - L.size * 1.15, it.ww + 80, L.size * 1.55); ctx.clip();
    }
    ctx.translate(it.cx + b.x, it.y + dy + b.y); ctx.rotate(rot + b.r); ctx.scale(s, s);
    ctx.globalAlpha *= a;
    if (shadow) { ctx.shadowColor = 'rgba(40,20,5,0.28)'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 7; }
    if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = strokeW; ctx.strokeStyle = stroke; ctx.strokeText(it.w, 0, 0); }
    ctx.fillStyle = color; ctx.fillText(it.w, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}
// bounding box of a line in a layout
function lineBox(L, li) {
  const its = L.items.filter(i => i.line === li); if (!its.length) return null;
  const right = Math.max(...its.map(i => i.cx + i.ww / 2)), left = Math.min(...its.map(i => i.cx - i.ww / 2));
  return { left, right, y: its[0].y, w: right - left };
}
function wordsBox(L, from, to) {
  const its = L.items.filter(i => i.i >= from && i.i <= to);
  const right = Math.max(...its.map(i => i.cx + i.ww / 2)), left = Math.min(...its.map(i => i.cx - i.ww / 2));
  return { left, right, y: its[0].y, w: right - left };
}

// ---------- ink / marker ----------
// highlighter swipe that grows right-to-left
function highlight(ctx, left, right, y, h, p, color = C.yellow, seed = 1, t = 0) {
  if (p <= 0) return;
  const pad = 18, x1 = right + pad, x0 = lerp(x1, left - pad, E.outC(clamp(p)));
  ctx.save(); ctx.fillStyle = color; ctx.globalAlpha *= 0.92;
  const b = boil(seed, t, 1.5);
  ctx.beginPath();
  ctx.moveTo(x1, y - h * 0.5 + hs(seed) * 4 + b.y);
  const n = 8;
  for (let i = 1; i <= n; i++) ctx.lineTo(lerp(x1, x0, i / n), y - h * 0.5 + hs(seed + i) * 5 + b.y);
  for (let i = n; i >= 0; i--) ctx.lineTo(lerp(x1, x0, i / n) + (i === n ? -6 : 0), y + h * 0.5 + hs(seed + i * 7) * 5 - b.y);
  ctx.closePath(); ctx.fill(); ctx.restore();
}
// generic progressive polyline stroke
function strokePath(ctx, pts, p, { color = C.ink, w = 10, cap = 'round' } = {}) {
  if (p <= 0 || pts.length < 2) return;
  let total = 0; const L = [0];
  for (let i = 1; i < pts.length; i++) { total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(total); }
  const target = total * clamp(p);
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = cap; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    if (L[i] <= target) ctx.lineTo(pts[i][0], pts[i][1]);
    else { const f = (target - L[i - 1]) / (L[i] - L[i - 1]); ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)); break; }
  }
  ctx.stroke(); ctx.restore();
  return { total, target };
}
// wobbly hand-drawn line points between a and b
function wobble(x0, y0, x1, y1, seed, t, amp = 5, n = 14) {
  const pts = []; const b = Math.floor(t * 12);
  for (let i = 0; i <= n; i++) {
    const f = i / n, k = Math.sin(f * Math.PI);
    pts.push([lerp(x0, x1, f) + hs(seed + i * 1.7 + b * 0.1) * amp * 0.4 * k, lerp(y0, y1, f) + hs(seed * 3 + i * 2.3 + b * 0.13) * amp * k]);
  }
  return pts;
}
// marker underline (right -> left)
function underline(ctx, left, right, y, p, seed, t, color = C.red, w = 12) {
  const pts = wobble(right + 10, y, left - 10, y + 6, seed, t, 6);
  strokePath(ctx, pts, E.outC(p), { color, w });
}
// marker loop around a box
function scribbleCircle(ctx, cx, cy, rx, ry, p, seed, t, color = C.red, w = 9) {
  const pts = []; const b = Math.floor(t * 12); const n = 60;
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI * 0.35 - (i / n) * TAU * 1.12; // counter-clockwise, overshoot
    const r = 1 + hs(seed + i * 0.37 + b * 0.05) * 0.035 + (i / n) * 0.06;
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  strokePath(ctx, pts, E.ioC(p), { color, w });
}
// hand drawn arrow
function arrow(ctx, pts, p, { color = C.ink, w = 9, head = 30 } = {}) {
  const r = strokePath(ctx, pts, p, { color, w }); if (!r || p < 0.98) return;
  const a = pts[pts.length - 1], b = pts[pts.length - 2];
  const ang = Math.atan2(a[1] - b[1], a[0] - b[0]);
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(a[0] - Math.cos(ang - 0.5) * head, a[1] - Math.sin(ang - 0.5) * head); ctx.lineTo(a[0], a[1]);
  ctx.lineTo(a[0] - Math.cos(ang + 0.5) * head, a[1] - Math.sin(ang + 0.5) * head); ctx.stroke(); ctx.restore();
}
// ink check / cross marks
function checkMark(ctx, x, y, s, p, color = C.green, w = 12) {
  strokePath(ctx, [[x - s * 0.5, y], [x - s * 0.12, y + s * 0.38], [x + s * 0.55, y - s * 0.45]], E.outC(p), { color, w });
}
function crossMark(ctx, x, y, s, p, color = C.red, w = 12) {
  strokePath(ctx, [[x - s / 2, y - s / 2], [x + s / 2, y + s / 2]], E.outC(clamp(p * 2)), { color, w });
  strokePath(ctx, [[x + s / 2, y - s / 2], [x - s / 2, y + s / 2]], E.outC(clamp(p * 2 - 1)), { color, w });
}

// ---------- textures ----------
const TX = {};
function buildTextures() {
  // paper fibre multiply layer
  const p = mk(W, H), g = p.getContext('2d');
  const id = g.createImageData(W, H), d = id.data;
  let s = 1234567;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < W * H; i++) { const v = 236 + rnd() * 19; d[i * 4] = v; d[i * 4 + 1] = v - 2; d[i * 4 + 2] = v - 6; d[i * 4 + 3] = 255; }
  g.putImageData(id, 0, 0);
  // blotches
  for (let i = 0; i < 70; i++) {
    const x = rnd() * W, y = rnd() * H, r = 60 + rnd() * 260;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(150,120,80,${0.035 + rnd() * 0.04})`); gr.addColorStop(1, 'rgba(150,120,80,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // fibres
  g.strokeStyle = 'rgba(120,95,60,0.07)'; g.lineWidth = 1;
  for (let i = 0; i < 900; i++) {
    const x = rnd() * W, y = rnd() * H, a = rnd() * TAU, l = 8 + rnd() * 30;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.5) * l * 0.6, y + Math.sin(a + 0.5) * l * 0.6, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  TX.paper = p;
  // grain tiles (overlay)
  TX.grain = [];
  for (let k = 0; k < 6; k++) {
    const c = mk(540, 960), cg = c.getContext('2d'); const im = cg.createImageData(540, 960), dd = im.data;
    for (let i = 0; i < 540 * 960; i++) { const v = rnd() * 255; dd[i * 4] = v; dd[i * 4 + 1] = v; dd[i * 4 + 2] = v; dd[i * 4 + 3] = 255; }
    cg.putImageData(im, 0, 0); TX.grain.push(c);
  }
  // vignette
  const v = mk(W, H), vg = v.getContext('2d');
  const gr = vg.createRadialGradient(W / 2, H * 0.46, H * 0.28, W / 2, H * 0.5, H * 0.78);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(30,15,0,0.42)');
  vg.fillStyle = gr; vg.fillRect(0, 0, W, H); TX.vig = v;
  // halftone dot tile
  const h = mk(24, 24), hg = h.getContext('2d'); hg.fillStyle = 'rgba(0,0,0,0.13)'; circle(hg, 6, 6, 3.2); hg.fill(); circle(hg, 18, 18, 3.2); hg.fill();
  TX.halftone = h;
  // stamp speckle (holes)
  const sp = mk(700, 260), sg = sp.getContext('2d');
  for (let i = 0; i < 900; i++) { sg.fillStyle = `rgba(0,0,0,${0.4 + rnd() * 0.6})`; circle(sg, rnd() * 700, rnd() * 260, rnd() * 3.2); sg.fill(); }
  for (let i = 0; i < 14; i++) { sg.fillStyle = 'rgba(0,0,0,0.5)'; sg.fillRect(rnd() * 700, rnd() * 260, 20 + rnd() * 120, 1.5 + rnd() * 3); }
  TX.speckle = sp;
}
function halftoneFill(ctx, pathFn, alpha = 1) {
  ctx.save(); pathFn(); ctx.clip(); ctx.globalAlpha *= alpha; ctx.fillStyle = ctx.createPattern(TX.halftone, 'repeat'); ctx.fillRect(-W, -H, W * 3, H * 3); ctx.restore();
}
function finishFrame(ctx, t) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(TX.paper, 0, 0);
  // moving soft light (key light sweeping) — screen
  ctx.globalCompositeOperation = 'soft-light';
  const lx = W * (0.25 + 0.5 * Math.sin(t * 0.21)), ly = H * (0.25 + 0.1 * Math.cos(t * 0.17));
  const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, H * 0.75);
  lg.addColorStop(0, 'rgba(255,240,210,0.55)'); lg.addColorStop(1, 'rgba(0,0,0,0.0)');
  ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(TX.vig, 0, 0);
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.085;
  const gi = Math.floor(t * 24) % TX.grain.length;
  ctx.drawImage(TX.grain[gi], 0, 0, W, H);
  ctx.restore();
}
