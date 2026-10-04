// Scene choreography. Every scene draws a full frame for global time t.
'use strict';

const LT = {};          // cached text layouts
const PRE = {};         // pre-rendered layers
const S = {};

function cam(ctx, s, fx, fy, rot = 0, ox = 0, oy = 0) {
  ctx.translate(W / 2 + ox, H / 2 + oy); if (rot) ctx.rotate(rot); ctx.scale(s, s); ctx.translate(-fx, -fy);
}
function shakeSum(t, hits) { let x = 0, y = 0, r = 0; for (const [t0, a, d] of hits) { const s = shakeAt(t, t0, a, d || 0.42); x += s.x; y += s.y; r += s.r; } return { x, y, r }; }
function punchSum(t, hits) { let p = 0; for (const [t0, a] of hits) p += punchAt(t, t0, a); return p; }
function drift(t, k = 1) { return { x: Math.sin(t * 0.7) * 6 * k, y: Math.cos(t * 0.53) * 8 * k, r: Math.sin(t * 0.37) * 0.004 * k }; }
function chip(ctx, x, y, label, t, t0, { fill = C.cream, color = C.ink, size = 50, fam = FD, weight = 700, rot = 0, out = null, pad = 44, h = 96 } = {}) {
  const p = t - t0; if (p <= 0) return;
  let s = spring(p, 2.6, 0.4), a = clamp(p * 6);
  if (out !== null && t > out) { const q = clamp((t - out) / 0.3); s *= 1 - E.inBack(q) * 0.9; a *= 1 - q; if (q >= 1) return; }
  font(ctx, fam, size, weight); const w = ctx.measureText(label).width + pad * 2;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot + (1 - clamp(p * 3)) * 0.2); ctx.scale(s, s); ctx.globalAlpha *= a;
  card(ctx, -w / 2, -h / 2, w, h, fill, { r: h / 2, lift: 0.25 });
  text(ctx, label, 0, size * 0.36, { fam, size, weight, color });
  ctx.restore();
}

function prepare(ctx) {
  // ---- title
  LT.t1 = layout(ctx, 'إيش الأهم', { size: 186, weight: 900, y: 470 });
  LT.t2 = layout(ctx, 'في نجاح المنظمات', { size: 108, weight: 700, y: 620 });
  // ---- book
  LT.b1 = layout(ctx, 'من جيد | إلى عظيم', { size: 96, weight: 900, y: -205, x: 0 });
  LT.count = { label: 'شركة تحت المجهر' };
  // ---- findings
  LT.f1 = layout(ctx, 'ماذا وجد كولنز؟', { size: 96, weight: 900, y: 300 });
  LT.f2 = layout(ctx, 'أبرز نتائج «من جيد إلى عظيم»', { fam: FT, size: 44, weight: 400, y: 380 });
  // ---- bus
  LT.bus1 = layout(ctx, 'الموهوبون أهم | من وجهة المنظمة', { size: 104, weight: 900, y: 330 });
  // ---- motivation
  LT.m1 = layout(ctx, 'صعود الموهوبين إلى الحافلة', { fam: FT, size: 58, weight: 500, y: 290 });
  LT.m2 = layout(ctx, 'تتلاشى معه الحاجة إلى', { fam: FT, size: 58, weight: 500, y: 375 });
  LT.m3 = layout(ctx, 'برامج التحفيز', { size: 136, weight: 900, y: 540 });
  LT.m4 = layout(ctx, 'متحفّزون | ذاتيًا', { size: 176, weight: 900, y: 420, lh: 1.08 });
  // ---- wrong person
  LT.w1 = layout(ctx, 'إذا صعد شخص خطأ للحافلة…', { fam: FT, size: 60, weight: 500, y: 270 });
  LT.w2 = layout(ctx, 'لن يهم | وضوح الاتجاه', { size: 116, weight: 900, y: 1200, lh: 1.15 });
  LT.w3 = layout(ctx, 'لن تصل المنظمة | إلى وجهتها', { size: 100, weight: 900, y: 590, lh: 1.18 });
  LT.w4 = layout(ctx, 'بأناسٍ:', { fam: FT, size: 70, weight: 700, y: 820 });
  // ---- outro
  LT.o1 = layout(ctx, 'الأشخاص أولًا', { size: 170, weight: 900, y: 820 });
  LT.o2 = layout(ctx, 'ثم الوجهة', { size: 120, weight: 700, y: 985, x: 600 });

  // backdrop layers
  const far = cityLayer(11, '#A9C4CF', 220, 520, null), mid = cityLayer(23, '#7E9FB0', 140, 380, '#A8C5D2');
  const farB = mk(2400, 900); const fg = farB.getContext('2d'); fg.filter = 'blur(5px)'; fg.drawImage(far, 0, 0); PRE.far = farB;
  const midB = mk(2400, 900); const mg = midB.getContext('2d'); mg.filter = 'blur(1.5px)'; mg.drawImage(mid, 0, 0); PRE.mid = midB;
  PRE.winCity = cityLayer(41, '#7E9FB0', 120, 300, null);

  // dots grid 35 x 41 = 1435
  PRE.dots = [];
  const cols = 35, rows = 41, sp = 24.4, gx0 = 540 - (cols - 1) * sp / 2, gy0 = 650;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c, x = gx0 + c * sp, y = gy0 + r * sp;
    const d = Math.hypot(x - 540, y - 820);
    PRE.dots.push({ x, y, d, h: hash(i * 1.37), h2: hash(i * 2.91), h3: hash(i * 4.7) });
  }
  // eleven great ones (spread out)
  const picks = [[3, 5], [10, 30], [16, 12], [22, 25], [29, 7], [6, 20], [33, 33], [13, 36], [25, 17], [19, 3], [8, 38]];
  PRE.great = picks.map(([c, r]) => r * cols + c);
  PRE.greatSet = new Set(PRE.great);
  // chart points for the eleven
  PRE.chart = PRE.great.map((_, k) => { const f = k / 10; return [200 + k * 68, 1420 - 640 * Math.pow(f, 1.7)]; });

  // confetti
  PRE.conf = [];
  const cc = [C.red, C.teal, C.blue, C.cream, C.pink, C.green, C.orange, C.purple];
  for (let i = 0; i < 70; i++) PRE.conf.push({ a: hash(i * 3.1) * TAU, v: 900 + hash(i * 7.3) * 1500, c: cc[i % cc.length], w: 14 + hash(i) * 18, h: 8 + hash(i * 9) * 10, sp: hs(i * 2.2) * 14 });
  // smoke puffs
  PRE.smoke = [];
  for (let i = 0; i < 22; i++) PRE.smoke.push({ x: hash(i * 5.1) * W, y: 200 + hash(i * 8.3) * (H - 200), r: 330 + hash(i * 1.9) * 260, d: hash(i * 3.3) * 0.25, dark: i % 3 === 0 });
}

// ======================================================================
// 1. TITLE — "What matters more?"
// ======================================================================
S.title = function (ctx, t) {
  ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
  const sh = shakeSum(t, [[3.42, 12], [4.0, 16], [4.5, 12], [0.52, 10]]);
  const dr = drift(t);
  const zs = 1 + t * 0.01 + punchSum(t, [[0.52, 0.05], [4.0, 0.04], [4.95, 0.03]]);
  ctx.save(); cam(ctx, zs, 540, 960, dr.r + sh.r, dr.x + sh.x, dr.y + sh.y);

  // giant background question mark
  const qa = spring(t - 0.2, 1.1, 0.45);
  ctx.save(); ctx.translate(560, 1080); ctx.rotate(-0.14 + Math.sin(t * 0.8) * 0.05); ctx.scale(qa, qa);
  text(ctx, '؟', 0, 470, { fam: FD, size: 1300, weight: 900, color: '#FFD966' }); ctx.restore();
  // halftone dots band
  halftoneFill(ctx, () => { ctx.beginPath(); ctx.rect(0, 1600, W, 320); }, 0.7);

  // headline
  words(ctx, LT.t1, t, 0, { times: [0.5, 0.84], style: 'pop', shadow: true, seed: 3 });
  const hb = wordsBox(LT.t2, 1, 2);
  highlight(ctx, hb.left, hb.right, hb.y - 34, 74, seg(t, 2.25, 2.7), C.yellow, 7, t);
  words(ctx, LT.t2, t, 0, { times: [1.35, 1.58, 1.98], style: 'rise', seed: 4 });

  // card A — compass
  const pA = E.outExpo(seg(t, 3.0, 3.45));
  if (pA > 0) {
    ctx.save(); ctx.translate(540 + (1 - pA) * 1200, 870); ctx.rotate(-0.03 + (1 - pA) * 0.25);
    card(ctx, -460, -145, 920, 290, C.teal, { lift: 0.55 });
    halftoneFill(ctx, () => rr(ctx, -460, -145, 920, 290, 22), 0.5);
    const na = (1 - spring(t - 3.05, 1.3, 0.25)) * 9 + Math.sin(t * 2.4) * 0.18 - 0.6;
    compass(ctx, 318, 0, 112, na, t);
    text(ctx, 'تحديد بوصلة الجهة', -118, 26, { fam: FD, size: 76, weight: 900, color: C.cream });
    ctx.restore();
  }
  // card B — people
  const pB = E.outExpo(seg(t, 4.1, 4.55));
  if (pB > 0) {
    ctx.save(); ctx.translate(540 - (1 - pB) * 1200, 1395); ctx.rotate(0.025 - (1 - pB) * 0.25);
    card(ctx, -460, -160, 920, 320, C.blue, { lift: 0.55 });
    halftoneFill(ctx, () => rr(ctx, -460, -160, 920, 320, 22), 0.5);
    const peeps = [[408, PALS[0], { shmagh: true }], [318, PALS[5], { hijab: C.purple }], [228, PALS[3], {}]];
    peeps.forEach(([px, pal, ex], i) => {
      const pp = spring(t - 4.4 - i * 0.09, 2.4, 0.4);
      if (pp <= 0) return;
      person(ctx, px, 140, 0.62 * pp, t, Object.assign({ pal, id: 10 + i, star: t > 4.75 + i * 0.08, starPulse: Math.max(0, 1 - (t - 4.75 - i * 0.08) * 3) }, ex));
    });
    text(ctx, 'اختيار الأشخاص', -120, -16, { fam: FD, size: 74, weight: 900, color: C.cream });
    text(ctx, 'الموهوبين؟', -120, 74, { fam: FD, size: 74, weight: 900, color: C.yellow });
    ctx.restore();
  }
  // "أم" badge
  const pO = spring(t - 3.96, 2.2, 0.32);
  if (t > 3.96) {
    ctx.save(); ctx.translate(540, 1132); ctx.rotate(Math.sin(t * 3) * 0.06); ctx.scale(pO, pO);
    shadowOn(ctx, 0.5); ctx.fillStyle = C.red; circle(ctx, 0, 0, 96); ctx.fill(); shadowOff(ctx);
    ctx.lineWidth = 6; ctx.strokeStyle = C.cream; circle(ctx, 0, 0, 82); ctx.stroke();
    text(ctx, 'أم', 0, 30, { fam: FD, size: 96, weight: 900, color: C.cream });
    ctx.restore();
  }
  // vs lightning sparks around badge
  if (t > 4.0 && t < 4.6) {
    const k = seg(t, 4.0, 4.6);
    ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.globalAlpha = 1 - k;
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2, r0 = 120 + k * 60, r1 = 160 + k * 110; ctx.beginPath(); ctx.moveTo(540 + Math.cos(a) * r0, 1132 + Math.sin(a) * r0); ctx.lineTo(540 + Math.cos(a) * r1, 1132 + Math.sin(a) * r1); ctx.stroke(); }
    ctx.restore();
  }
  ctx.restore();

  // opener curtains
  if (t < 0.6) {
    const panels = [[C.red, 0.19], [C.yellow, 0.12], [C.ink, 0.04]];
    for (const [col, d] of panels) {
      const p = E.ioExpo(seg(t, d, d + 0.36));
      const y = -p * (H + 400);
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, y - 10); ctx.lineTo(W, y - 10); ctx.lineTo(W, y + H + 140); ctx.lineTo(0, y + H + 360); ctx.closePath(); ctx.fill();
    }
  }
};
// cover swinging shut over the title (5.35 → 5.75)
function coverSwing(ctx, t) {
  const p = E.inC(seg(t, 5.35, 5.75)); if (p <= 0) return;
  const w = W * p;
  const g = ctx.createLinearGradient(W - w - 260, 0, W - w, 0); g.addColorStop(0, 'rgba(40,10,0,0)'); g.addColorStop(1, `rgba(40,10,0,${0.45 * p})`);
  ctx.fillStyle = g; ctx.fillRect(W - w - 260, 0, 260, H);
  ctx.fillStyle = C.red; ctx.fillRect(W - w, 0, w + 2, H);
  ctx.fillStyle = `rgba(0,0,0,${(1 - p) * 0.45})`; ctx.fillRect(W - w, 0, w + 2, H);
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(W - w, 0, 10, H);
}

// ======================================================================
// 2. BOOK + RESEARCH — 1435 → 11
// ======================================================================
S.book = function (ctx, t) {
  ctx.fillStyle = '#D4E9E3'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(14,110,100,0.12)'; ctx.lineWidth = 2;
  for (let x = 30; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  const k = E.outExpo(seg(t, 5.75, 6.5));
  const sh = shakeSum(t, [[7.3, 8], [9.9, 10], [11.75, 12]]);
  const dr = drift(t, 0.8);
  const zs = lerp(2.48, 1, k) * (1 + seg(t, 6.5, 12.5) * 0.035) + punchSum(t, [[9.88, 0.03], [11.72, 0.04]]);
  ctx.save(); cam(ctx, zs, 540, lerp(820, 960, k), dr.r + sh.r, dr.x + sh.x, dr.y + sh.y);

  // ---- book
  const drop = E.inBack(seg(t, 7.85, 8.45));
  if (drop < 1) {
    const open = E.ioC(seg(t, 7.2, 7.62));
    ctx.save(); ctx.translate(0, drop * 1500); ctx.rotate(drop * 0.4);
    book(ctx, 540, 820, 560, 780, t, {
      open, lift: 0.7,
      front: (c, w, h) => {
        const a = seg(t, 5.92, 6.3);
        c.save(); c.globalAlpha *= a;
        words(c, LT.b1, t, 0, { color: C.cream, times: [5.95, 6.0, 6.08, 6.13], style: 'pop', dur: 0.4 });
        c.fillStyle = C.cream; c.fillRect(-170, 255, 340, 4);
        text(c, 'جيم كولنز', 0, 325, { fam: FT, size: 46, weight: 500, color: C.cream });
        // good → great emblem (RTL: small on the right grows to big on the left)
        c.fillStyle = C.yellow; circle(c, 160, 70, 22); c.fill(); circle(c, -110, 40, 70 + Math.sin(t * 3) * 3); c.fill();
        c.setLineDash([14, 12]); c.strokeStyle = C.cream; c.lineWidth = 6; c.beginPath(); c.moveTo(130, 72); c.quadraticCurveTo(40, 150, -30, 70); c.stroke(); c.setLineDash([]);
        c.restore();
      },
      inner: (c, w, h) => {
        for (let i = 0; i < 3; i++) {
          const pp = E.ioC(seg(t, 7.45 + i * 0.09, 7.8 + i * 0.09)); if (pp <= 0 || pp >= 1) continue;
          const sx = Math.cos(pp * Math.PI);
          c.save(); c.translate(w / 2, 0); c.scale(sx, 1); c.translate(-w / 2, 0);
          c.fillStyle = sx > 0 ? '#FFF9EE' : '#EADFC8'; c.fillRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16);
          c.fillStyle = 'rgba(0,0,0,0.1)'; for (let j = 0; j < 8; j++) c.fillRect(-w / 2 + 50, -h / 2 + 100 + j * 60, w - 140, 9);
          c.restore();
        }
      }
    });
    ctx.restore();
  }
  // ---- chips
  chip(ctx, 540, 1338, 'جيم كولنز', t, 6.12, { fill: C.yellow, size: 64, weight: 900, rot: -0.03, out: 7.1, h: 112 });
  chip(ctx, 540, 1470, 'خمس سنوات من البحث', t, 6.55, { fam: FT, weight: 500, size: 48, rot: 0.02, out: 7.15 });

  // ---- dots
  const fallStart = 9.95;
  const greatGlow = spring(t - 9.88, 2, 0.35);
  const toChart = E.ioC(seg(t, 10.85, 11.4));
  for (let i = 0; i < PRE.dots.length; i++) {
    const d = PRE.dots[i];
    const st = 7.55 + d.d / 1250 * 0.8 + d.h * 0.12;
    const p = seg(t, st, st + 0.42); if (p <= 0) continue;
    const e = E.outC(p);
    let x = lerp(540, d.x, e), y = lerp(820, d.y, e) - Math.sin(p * Math.PI) * 140;
    const isG = PRE.greatSet.has(i);
    let r = 8.6, col = C.ink2, a = 1;
    if (!isG) {
      const tf = fallStart + d.h2 * 0.65; const dt = t - tf;
      if (dt > 0) { y += 0.5 * 5200 * dt * dt - 300 * dt; x += hs(i * 1.9) * 220 * dt; a = clamp(1 - dt * 1.1); if (y > 2100 || a <= 0) continue; }
    } else {
      const gi = PRE.great.indexOf(i);
      r = lerp(8.6, 22, greatGlow); col = t > 9.88 ? C.yellow : C.ink2;
      if (toChart > 0) { const [cx, cy] = PRE.chart[gi]; x = lerp(x, cx, toChart); y = lerp(y, cy, toChart) - Math.sin(toChart * Math.PI) * 160; r = lerp(r, 18, toChart); }
      if (t > 9.88) { ctx.fillStyle = 'rgba(255,198,39,0.28)'; circle(ctx, x, y, r * 1.9); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; circle(ctx, x, y, r); ctx.stroke(); }
    }
    ctx.globalAlpha = a; ctx.fillStyle = col; circle(ctx, x, y, r); ctx.fill(); ctx.globalAlpha = 1;
  }
  // magnifier sweep 8.55 → 9.75
  const mg = seg(t, 8.5, 9.8);
  if (mg > 0 && mg < 1) {
    const mi = E.outBack(seg(t, 8.5, 8.75)) * (1 - E.inBack(seg(t, 9.55, 9.8)));
    const lx = lerp(260, 800, E.ioC(mg)), ly = 1100 + Math.sin(mg * TAU) * 230, R = 150 * mi;
    if (R > 1) {
      ctx.save(); circle(ctx, lx, ly, R); ctx.clip(); ctx.fillStyle = '#EAF6F2'; ctx.fillRect(lx - R, ly - R, R * 2, R * 2);
      ctx.translate(lx, ly); ctx.scale(1.8, 1.8); ctx.translate(-lx, -ly); ctx.fillStyle = C.ink2;
      for (const d of PRE.dots) { if (Math.abs(d.x - lx) < R && Math.abs(d.y - ly) < R) { circle(ctx, d.x, d.y, 8.6); ctx.fill(); } }
      ctx.restore();
      ctx.save(); shadowOn(ctx, 0.6, 0.3); ctx.strokeStyle = C.ink; ctx.lineWidth = 20; circle(ctx, lx, ly, R); ctx.stroke();
      ctx.lineCap = 'round'; ctx.lineWidth = 34; ctx.strokeStyle = C.red; ctx.beginPath(); ctx.moveTo(lx + R * 0.74, ly + R * 0.74); ctx.lineTo(lx + R * 1.45, ly + R * 1.45); ctx.stroke(); shadowOff(ctx);
      ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(lx - R * 0.35, ly - R * 0.4, R * 0.38, R * 0.16, -0.7, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  // ---- chart
  const ax = seg(t, 10.75, 11.1);
  if (ax > 0) {
    strokePath(ctx, [[150, 680], [150, 1470], [960, 1470]], E.outC(ax), { color: C.ink, w: 8 });
    // market line
    const mk2 = seg(t, 11.2, 11.75);
    ctx.save(); ctx.setLineDash([18, 14]); strokePath(ctx, [[200, 1420], [500, 1385], [920, 1330]], mk2, { color: C.gray2, w: 7 }); ctx.restore();
    if (mk2 > 0.9) text(ctx, 'السوق', 960, 1310, { fam: FT, size: 38, weight: 500, color: C.gray2, align: 'right', alpha: seg(t, 11.65, 11.85) });
    const lp = seg(t, 11.3, 11.85);
    const shoot = E.inExpo(seg(t, 12.2, 12.5));
    const pts = PRE.chart.slice(); pts.push([925, lerp(730, -400, shoot)]);
    arrow(ctx, pts, lp, { color: C.red, w: 13, head: 38 });
  }
  // ---- counter / labels (fixed to screen space via camera-independent coords)
  ctx.restore();
  ctx.save();
  const cIn = seg(t, 7.95, 8.15);
  if (cIn > 0) {
    const n = Math.round(1435 * E.outC(seg(t, 7.95, 9.35)));
    const roll = E.ioC(seg(t, 9.9, 10.25));
    ctx.save(); ctx.beginPath(); ctx.rect(0, 210, W, 270); ctx.clip();
    const s1 = n.toLocaleString('en-US');
    text(ctx, s1, 540, 430 - roll * 300 + (1 - E.outBack(cIn)) * 200, { fam: FD, size: 210, weight: 900, color: C.ink });
    if (roll > 0) text(ctx, '11', 540, 430 + (1 - roll) * 300, { fam: FD, size: 230, weight: 900, color: C.red });
    ctx.restore();
    const l1 = seg(t, 8.05, 8.3) * (1 - seg(t, 9.85, 10.0));
    if (l1 > 0) text(ctx, 'شركة تحت المجهر', 540, 525, { fam: FT, size: 58, weight: 500, alpha: l1 });
    const l2 = seg(t, 10.15, 10.35) * (1 - seg(t, 11.05, 11.2));
    if (l2 > 0) chip(ctx, 540, 515, 'شركة فقط!', t, 10.15, { fill: C.yellow, size: 56, weight: 900, h: 100 });
    if (t > 11.2) chip(ctx, 540, 515, 'قفزت من جيد إلى عظيم', t, 11.2, { fill: C.ink, color: C.yellow, size: 52, weight: 900, h: 100 });
  }
  // 6.9x label
  const lb = t - 11.72;
  if (lb > 0) {
    const s = spring(lb, 2.3, 0.35);
    ctx.save(); ctx.translate(345, 905); ctx.rotate(-0.05); ctx.scale(s, s);
    text(ctx, '6.9', 0, 0, { fam: FD, size: 190, weight: 900, color: C.red });
    // drawn multiplication mark
    ctx.strokeStyle = C.red; ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-205, -110); ctx.lineTo(-150, -55); ctx.moveTo(-150, -110); ctx.lineTo(-205, -55); ctx.stroke();
    ctx.restore();
    text(ctx, 'أضعاف عائد السوق', 345, 985, { fam: FD, size: 52, weight: 700, alpha: seg(t, 11.85, 12.0) });
    text(ctx, 'خلال 15 عامًا', 345, 1045, { fam: FT, size: 44, weight: 500, color: C.ink2, alpha: seg(t, 11.95, 12.1) });
  }
  ctx.restore();
};

// ======================================================================
// 3. FINDINGS — sticky notes, "First who"
// ======================================================================
const NOTES = [
  ['قيادة المستوى الخامس', '#FFB3C1', 770, 640, -0.05],
  ['مواجهة الحقائق القاسية', '#9EE0D6', 310, 650, 0.04],
  ['مفهوم القنفذ', '#FFC48A', 760, 905, 0.035],
  ['ثقافة الانضباط', '#B8E39B', 320, 915, -0.04],
  ['مسرّعات التقنية', '#A9C9FF', 770, 1170, -0.02],
  ['دولاب الزخم', '#E3B5FF', 310, 1180, 0.05],
];
S.findings = function (ctx, t) {
  ctx.fillStyle = C.navy; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 54) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 54) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  const zoom = E.inExpo(seg(t, 15.22, 15.75));
  const sh = shakeSum(t, [[13.5, 8]]); const dr = drift(t, 0.7);
  ctx.save(); cam(ctx, 1 + zoom * 13, 540, lerp(960, 1030, E.outC(seg(t, 15.1, 15.4))), dr.r + sh.r, dr.x * (1 - zoom) + sh.x, dr.y * (1 - zoom) + sh.y);

  const fade = 1 - seg(t, 15.05, 15.3);
  ctx.save(); ctx.globalAlpha = fade;
  words(ctx, LT.f1, t, 12.72, { color: C.cream, style: 'rise', stagger: 0.08, seed: 8 });
  words(ctx, LT.f2, t, 12.95, { color: 'rgba(255,247,232,0.7)', style: 'rise', stagger: 0.04, seed: 9 });
  const dim = E.outC(seg(t, 13.56, 13.95));
  NOTES.forEach(([label, col, x, y, rot], i) => {
    const st = 12.8 + i * 0.09, p = seg(t, st, st + 0.24); if (p <= 0) return;
    const s = lerp(1.55, 1, E.outBack(p, 1.4)) * (1 - dim * 0.06);
    ctx.save(); ctx.globalAlpha *= clamp(p * 4);
    note(ctx, x, y, 420, 210, rot + (1 - p) * 0.35, col, t, { s, lift: (1 - p) * 0.8 + 0.15, draw: () => {
      const L = LT['n' + i] || (LT['n' + i] = layout(ctx, label, { size: 50, weight: 700, maxW: 340, x: 0, y: 0, lh: 1.2 }));
      ctx.save(); ctx.translate(0, -(L.n - 1) * L.size * L.lh / 2 + 18); words(ctx, L, t, 0, { times: [0], dur: 0.01, seed: i }); ctx.restore();
    } });
    ctx.restore();
  });
  if (dim > 0) { ctx.fillStyle = `rgba(16,22,52,${dim * 0.62})`; ctx.fillRect(-W, -H, W * 3, H * 3); }
  ctx.restore();

  // the key note
  const st = 13.36, p = seg(t, st, st + 0.24);
  if (p > 0) {
    const lift = E.ioC(seg(t, 13.56, 14.02));
    const x = 540, y = lerp(1470, 1030, lift), s = lerp(1, 1.5, lift) * lerp(1.55, 1, E.outBack(p, 1.4));
    const rot = lerp(-0.04, 0, lift) + (1 - p) * 0.35;
    note(ctx, x, y, 560, 230, rot, C.yellow, t, { s, lift: 0.2 + lift * 0.9, tape: zoom < 0.02, draw: () => {
      const out = 14.98;
      const L1 = LT.k1 || (LT.k1 = layout(ctx, 'مَن أولًا…', { size: 84, weight: 900, x: 0, y: 0 }));
      const L2 = LT.k2 || (LT.k2 = layout(ctx, 'ثم إلى أين', { size: 58, weight: 700, x: 0, y: 0 }));
      ctx.save(); ctx.translate(0, t < 14.45 ? 28 : lerp(28, -6, E.outC(seg(t, 14.45, 14.7))));
      words(ctx, L1, t, 0, { times: [0], dur: 0.01, out, seed: 21 }); ctx.restore();
      if (t > 14.45) {
        ctx.save(); ctx.translate(0, 74);
        const b = lineBox(L2, 0); underline(ctx, b.left, b.right, 18, seg(t, 14.75, 15.0) * (1 - seg(t, 15.12, 15.2)), 33, t, C.red, 9);
        words(ctx, L2, t, 0, { times: [14.47, 14.62, 14.8], style: 'pop', out, seed: 22 }); ctx.restore();
      }
    } });
    const sc = seg(t, 13.95, 14.4) * (1 - seg(t, 15.0, 15.15));
    if (sc > 0) scribbleCircle(ctx, x, y + 6, 470, 215, sc, 41, t, C.red, 10);
  }
  ctx.restore();
};

// ======================================================================
// 4. BUS — first who, then where
// ======================================================================
const HOPS = [16.4, 16.76, 17.12, 17.48, 18.4];
const HOP_PALS = [
  [PALS[0], { shmagh: true }], [PALS[5], { hijab: C.teal }], [PALS[2], {}], [PALS[6], { hijab: C.navy }], [PALS[4], { shmagh: true }],
];
function busBackdrop(ctx, t, scroll = 0) {
  ctx.fillStyle = '#CFE6EC'; ctx.fillRect(0, 0, W, H);
  // sun
  ctx.fillStyle = '#FFE08A'; circle(ctx, 860, 860, 120); ctx.fill();
  cloud(ctx, ((200 - t * 30 - scroll * 0.1) % 1400 + 1400) % 1400 - 200, 780, 1.1);
  cloud(ctx, ((900 - t * 22 - scroll * 0.1) % 1400 + 1400) % 1400 - 200, 690, 0.8);
  const fx = -((scroll * 0.25) % 1200), mx = -((scroll * 0.55) % 1200);
  ctx.drawImage(PRE.far, fx - 300, 1250 - 900); ctx.drawImage(PRE.far, fx + 2100, 1250 - 900);
  ctx.drawImage(PRE.mid, mx - 600, 1250 - 900 + 30); ctx.drawImage(PRE.mid, mx + 1800, 1250 - 900 + 30);
  // road + sidewalk
  ctx.fillStyle = '#4B4A52'; ctx.fillRect(0, 1250, W, 175);
  ctx.fillStyle = '#F4D35E'; for (let x = -((scroll) % 160); x < W; x += 160) ctx.fillRect(x, 1290, 80, 10);
  ctx.fillStyle = '#C9BBA2'; ctx.fillRect(0, 1420, W, 26);
  ctx.fillStyle = '#E4D8C2'; ctx.fillRect(0, 1446, W, H - 1446);
  ctx.strokeStyle = 'rgba(120,100,70,0.18)'; ctx.lineWidth = 3;
  for (let x = -((scroll) % 180); x < W + 180; x += 180) { ctx.beginPath(); ctx.moveTo(x, 1446); ctx.lineTo(x - 120, H); ctx.stroke(); }
  for (let y = 1560; y < H; y += 150) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}
S.bus = function (ctx, t) {
  const depart = E.inC(seg(t, 19.95, 20.8));
  busBackdrop(ctx, t, 0);
  const sh = shakeSum(t, [[16.12, 10], [18.32, 12], [19.6, 6, 0.6]]);
  const dr = drift(t, 0.6);
  ctx.save(); cam(ctx, 1 + seg(t, 16, 20.5) * 0.03 + punchSum(t, [[16.12, 0.03]]), 540, 960, dr.r + sh.r, dr.x + sh.x, dr.y + sh.y);

  // headline
  const hb = wordsBox(LT.bus1, 0, 0);
  highlight(ctx, hb.left, hb.right, hb.y - 36, 86, seg(t, 16.75, 17.1), C.yellow, 12, t);
  words(ctx, LT.bus1, t, 16.2, { style: 'pop', stagger: 0.085, shadow: false, seed: 14 });
  chip(ctx, 770, 655, 'أولًا: مَن؟', t, 16.38, { fill: C.cream, size: 52, weight: 900, rot: -0.03 });
  chip(ctx, 300, 655, 'ثانيًا: إلى أين؟', t, 19.07, { fill: C.ink, color: C.yellow, size: 52, weight: 900, rot: 0.03 });

  // destination sign rising behind the bus
  const sp = spring(t - 19.07, 2.0, 0.35);
  if (t > 19.07) roadSign(ctx, 250, 930 + (1 - sp) * 420, 0.6, t, { glow: 0.5 + 0.5 * Math.sin(t * 6), rot: Math.sin(t * 2) * 0.01 });

  // bus
  const bx = 540 - depart * 1600;
  const seats = [];
  for (let i = 0; i < 4; i++) { const [pal, ex] = HOP_PALS[i]; seats.push(Object.assign({ pal, id: 30 + i, pop: seg(t, HOPS[i] + 0.4, HOPS[i] + 0.62), star: true, arm: depart > 0 ? 0.5 + 0.5 * Math.sin(t * 14 + i) : 0 }, ex)); }
  const ejected = t > 17.85;
  if (!ejected) seats.push({ wrong: true, id: 60, pop: 1 });
  else { const [pal, ex] = HOP_PALS[4]; seats.push(Object.assign({ pal, id: 34, pop: seg(t, HOPS[4] + 0.4, HOPS[4] + 0.62), star: true, arm: depart > 0 ? 0.5 + 0.5 * Math.sin(t * 14 + 4) : 0 }, ex)); }
  const vib = t > 19.6 ? Math.sin(t * 70) * 2.2 : 0;
  const morph = E.outExpo(seg(t, 15.75, 16.12));
  if (t >= 16.0) {
    const pop = spring(t - 16.0, 3, 0.45);
    bus(ctx, bx, 1352 + vib, 0.96 + 0.04 * pop, t, { door: t > 16.3 && t < 18.95 ? 1 : 0, wheel: -depart * 1600 / 62, sign: t > 19.1 ? 'الوجهة' : '؟', seats, tilt: depart > 0 ? -0.012 * Math.sin(Math.min(1, depart * 3) * Math.PI) : 0, lights: t > 19.6 ? 1 : 0 });
  }
  // exhaust
  if (t > 19.6) {
    for (let i = 0; i < 14; i++) {
      const tb = 19.6 + i * 0.09, d = t - tb; if (d < 0 || d > 0.9) continue;
      smoke(ctx, bx + 450 + d * 260, 1325 - d * 120 + vib, 20 + d * 70, t, 70 + i, (1 - d / 0.9) * 0.9);
    }
  }
  // morph rectangle (yellow note → bus body)
  if (morph < 1 || t < 16.15) {
    const a = 1 - seg(t, 16.02, 16.16);
    if (a > 0) {
      const x = lerp(-20, 110, morph), y = lerp(-20, 1022, morph), w = lerp(W + 40, 860, morph), h = lerp(H + 40, 330, morph);
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = C.yellow; rr(ctx, x, y, w, h, lerp(0, 40, morph)); ctx.fill(); ctx.restore();
    }
  }
  // queue + hops
  const slots = [330, 470, 610, 750, 890];
  for (let i = 0; i < 5; i++) {
    const [pal, ex] = HOP_PALS[i];
    const hs0 = HOPS[i], hp = seg(t, hs0, hs0 + 0.42);
    if (hp >= 1) continue;
    let done = 0, lastHop = 0; for (let j = 0; j < i; j++) if (t > HOPS[j] + 0.2) { done++; lastHop = HOPS[j] + 0.2; }
    const rankNow = i - done, rankPrev = done > 0 ? rankNow + 1 : rankNow;
    const mv = done > 0 ? E.outC(seg(t, lastHop, lastHop + 0.35)) : 1;
    const qx = lerp(slots[rankPrev], slots[rankNow], mv);
    const appear = spring(t - 16.25 - i * 0.06, 2.6, 0.4);
    if (appear <= 0) continue;
    let x = qx, y = 1690, s = appear, lean = 0, sq = 0;
    if (hp > 0) {
      const e = E.ioC(hp);
      x = lerp(qx, 268, e); y = lerp(1690, 1345, e) - Math.sin(hp * Math.PI) * 260; s = lerp(1, 0.72, e); lean = -0.25 * Math.sin(hp * Math.PI);
    } else {
      const pre = seg(t, hs0 - 0.12, hs0); sq = Math.sin(pre * Math.PI) * 0.6;
    }
    ctx.save(); ctx.globalAlpha *= 1 - seg(hp, 0.82, 1);
    person(ctx, x, y, s, t, Object.assign({ pal, id: 30 + i, walk: mv < 1 && done > 0 ? t * 18 : 0, lean, squash: sq, arm: hp > 0 ? 0.7 : 0, lift: hp > 0 ? 0.8 : 0.15 }, ex));
    ctx.restore();
    if (hp === 0 && i === done && t > 16.3) checkMark(ctx, x + 6, y - 235, 40, seg(t, 16.3 + i * 0.05, 16.55 + i * 0.05), C.green, 9);
  }
  // wrong one ejected from the rear window
  if (ejected) {
    const ep = seg(t, 17.85, 18.32);
    const x = lerp(960, 880, ep), y = lerp(1180, 1690, E.inQ(ep)) - Math.sin(ep * Math.PI) * 320;
    const land = t - 18.32;
    const sq = land > 0 ? Math.exp(-land * 8) * Math.sin(land * 30) * 0.5 : 0;
    person(ctx, x, y, 1, t, { wrong: true, id: 60, lean: ep < 1 ? ep * TAU * 1.0 : 0, squash: sq, flip: true });
    if (land > 0) { chip(ctx, 880, 1415, 'غير مناسب', t, 18.35, { fill: C.red, color: C.cream, size: 44, weight: 900, rot: 0.05, h: 86 }); }
  }
  ctx.restore();
};
// giant bus side wiping across (bus → motivation)
function busWipe(ctx, A, B, t) {
  const p = E.ioC(seg(t, 20.45, 20.95)); const PW = 1500, xL = lerp(W + 30, -PW - 30, p);
  ctx.drawImage(A, 0, 0);
  ctx.save(); ctx.beginPath(); ctx.rect(xL + PW - 2, 0, W, H); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore();
  for (let k = 3; k >= 0; k--) {
    ctx.save(); ctx.globalAlpha = k === 0 ? 1 : 0.18; ctx.translate(xL + k * 40, 0);
    ctx.fillStyle = C.yellow; rr(ctx, 0, -50, PW, H + 100, 90); ctx.fill();
    if (k === 0) {
      ctx.fillStyle = C.ink; ctx.fillRect(0, 1320, PW, 70); ctx.fillStyle = C.red; ctx.fillRect(0, 1390, PW, 30);
      for (let i = 0; i < 3; i++) { ctx.fillStyle = '#9FD4E6'; rr(ctx, 120 + i * 470, 420, 380, 640, 46); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 16; ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, 300, PW, 26);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 12; i++) { circle(ctx, 60 + i * 120, 1260, 9); ctx.fill(); }
    }
    ctx.restore();
  }
  // speed lines
  ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.globalAlpha = Math.sin(p * Math.PI) * 0.6;
  for (let i = 0; i < 9; i++) { const y = 200 + i * 190, x = xL + PW + 60 + hash(i) * 200; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 180 + hash(i * 3) * 220, y); ctx.stroke(); }
  ctx.restore();
}

// ======================================================================
// 5. MOTIVATION — no need for programmes, self-motivated
// ======================================================================
const MOT = [
  [205, PALS[1], { shmagh: true }], [540, PALS[2], { hijab: C.red }], [875, PALS[6], {}],
];
S.motiv = function (ctx, t) {
  ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
  // rotating sunburst
  ctx.save(); ctx.translate(540, 620); ctx.rotate(t * 0.12); ctx.fillStyle = 'rgba(255,198,39,0.22)';
  for (let i = 0; i < 18; i++) { ctx.rotate(TAU / 18); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-90, -1600); ctx.lineTo(90, -1600); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  const sh = shakeSum(t, [[22.62, 14], [23.92, 12], [24.7, 8]]); const dr = drift(t, 0.7);
  ctx.save(); cam(ctx, 1 + seg(t, 20.9, 25.9) * 0.05 + punchSum(t, [[22.62, 0.04], [23.92, 0.05]]), 540, 960, dr.r + sh.r, dr.x + sh.x, dr.y + sh.y);

  // bus interior wall
  ctx.save(); shadowOn(ctx, 0.6, 0.3); ctx.fillStyle = C.yellow; ctx.fillRect(-60, 990, W + 120, H); shadowOff(ctx); ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-60, 1000, W + 120, 16);
  ctx.fillStyle = C.ink; ctx.fillRect(-60, 1560, W + 120, 40); ctx.fillStyle = C.red; ctx.fillRect(-60, 1600, W + 120, 16);
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; for (let i = 0; i < 18; i++) { circle(ctx, 30 + i * 60, 1030, 6); ctx.fill(); }
  // windows with moving city + passengers
  const charged = MOT.map((_, i) => seg(t, 24.05 + i * 0.12, 24.65 + i * 0.12));
  MOT.forEach(([cx, pal, ex], i) => {
    const wx = cx - 150, wy = 1060, ww = 300, wh = 400;
    ctx.save(); rr(ctx, wx, wy, ww, wh, 34); ctx.clip();
    ctx.fillStyle = '#BFE3EE'; ctx.fillRect(wx, wy, ww, wh);
    const off = (t * 900 + i * 300) % 1200;
    ctx.drawImage(PRE.winCity, -off + wx, wy + wh - 930, 2400, 900);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 4;
    for (let k = 0; k < 4; k++) { const y = wy + 60 + k * 70, x = wx + ((k * 170 + t * 1400) % 500) - 100; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 90, y); ctx.stroke(); }
    const bounce = Math.abs(Math.sin(t * 9 + i)) * 4;
    person(ctx, cx, wy + wh + 105 - bounce, 1.3, t, Object.assign({ pal, id: 80 + i, star: true, starPulse: charged[i] >= 1 ? Math.max(0, 1 - (t - 24.65 - i * 0.12) * 2) : 0, arm: spring(t - 24.6 - i * 0.1, 2, 0.35) }, ex));
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.moveTo(wx + 40, wy); ctx.lineTo(wx + 110, wy); ctx.lineTo(wx + 20, wy + 180); ctx.lineTo(wx, wy + 180); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 14; rr(ctx, wx, wy, ww, wh, 34); ctx.stroke();
  });

  // text block 1
  const out1 = 23.72;
  words(ctx, LT.m1, t, 20.98, { style: 'rise', stagger: 0.07, out: out1, seed: 50 });
  words(ctx, LT.m2, t, 21.45, { style: 'rise', stagger: 0.07, out: out1, seed: 51 });
  words(ctx, LT.m3, t, 22.55, { style: 'slam', stagger: 0.14, dur: 0.35, out: out1, seed: 52, shadow: true });
  if (t > 23.12 && t < out1 + 0.3) {
    const b = lineBox(LT.m3, 0);
    ctx.save(); ctx.globalAlpha = 1 - seg(t, out1, out1 + 0.25);
    strokePath(ctx, wobble(b.right + 30, b.y - 42, b.left - 30, b.y - 30, 61, t, 5), E.outC(seg(t, 23.12, 23.4)), { color: C.red, w: 18 });
    ctx.restore();
  }
  // props: arrive, crumple, get tossed
  const props = [[170, 800, 'mega'], [400, 770, 'doc'], [660, 790, 'trophy'], [900, 800, 'carrot']];
  props.forEach(([px, py, kind], i) => {
    const ia = 21.15 + i * 0.2, pi = seg(t, ia, ia + 0.4); if (pi <= 0) return;
    const ci = 23.12 + i * 0.07, cp = seg(t, ci, ci + 0.16), tossT = t - (ci + 0.18);
    const e = E.outBack(pi, 1.6);
    let x = lerp(px + 500, px, e), y = lerp(py - 700, py, e) + Math.sin(t * 3 + i) * 10, rot = (1 - e) * 2 + Math.sin(t * 2 + i) * 0.08;
    if (tossT > 0) { const dir = i < 2 ? -1 : 1; x += dir * 1500 * tossT; y += -900 * tossT + 0.5 * 4200 * tossT * tossT; rot += tossT * 12 * dir; if (y > 2100 || x < -300 || x > 1400) return; }
    if (cp < 0.5) {
      const s = 1.12 * (1 - E.inQ(cp * 2) * 0.55);
      if (kind === 'mega') megaphone(ctx, x, y, s, rot - 0.2);
      else if (kind === 'doc') docPaper(ctx, x, y, s * 0.72, rot, 'برنامج تحفيز');
      else if (kind === 'trophy') trophy(ctx, x, y, s, rot);
      else carrot(ctx, x, y, s, rot);
    } else {
      const col = kind === 'mega' ? C.red : kind === 'trophy' ? C.yellow : kind === 'carrot' ? C.orange : C.cream;
      withT(ctx, x, y, rot, 1, 1, () => crumple(ctx, 0, 0, 66, col, i * 9));
    }
  });

  // batteries + text block 2
  MOT.forEach(([cx], i) => {
    const ap = spring(t - 23.95 - i * 0.1, 2.6, 0.4); if (t < 23.95 + i * 0.1) return;
    const lvl = lerp(0.12, 1, E.ioC(charged[i]));
    battery(ctx, cx, 905, 0.95 * ap, lvl, t, { rot: Math.sin(t * 3 + i) * 0.05 });
    if (charged[i] >= 1) {
      const k = seg(t, 24.65 + i * 0.12, 25.05 + i * 0.12);
      ctx.save(); ctx.strokeStyle = C.orange; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.globalAlpha = 1 - k;
      for (let j = 0; j < 8; j++) { const a = j / 8 * TAU, r0 = 90 + k * 40, r1 = 120 + k * 90; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, 905 + Math.sin(a) * r0 * 0.7); ctx.lineTo(cx + Math.cos(a) * r1, 905 + Math.sin(a) * r1 * 0.7); ctx.stroke(); }
      ctx.restore();
    }
  });
  const hb = lineBox(LT.m4, 1);
  highlight(ctx, hb.left, hb.right, hb.y - 58, 120, seg(t, 24.4, 24.75), C.yellow, 66, t);
  words(ctx, LT.m4, t, 0, { times: [23.92, 24.28], style: 'slam', dur: 0.32, seed: 54, shadow: true });
  if (t > 24.3) { bolt(ctx, 120, 330, spring(t - 24.3, 2.4, 0.35) * 0.9, -0.3); bolt(ctx, 975, 560, spring(t - 24.42, 2.4, 0.35) * 0.8, 0.25); }
  ctx.restore();
};

// ======================================================================
// 6. THE WRONG PERSON — clarity doesn't help
// ======================================================================
S.wrong = function (ctx, t) {
  ctx.fillStyle = '#EFE6D6'; ctx.fillRect(0, 0, W, H);
  // red diagonal hatch for tension
  ctx.save(); ctx.globalAlpha = 0.07 + 0.05 * seg(t, 28, 29); ctx.strokeStyle = C.red; ctx.lineWidth = 18;
  for (let i = -20; i < 40; i++) { ctx.beginPath(); ctx.moveTo(i * 70, 0); ctx.lineTo(i * 70 - 900, H); ctx.stroke(); }
  ctx.restore();
  const bangs = [28.3, 28.9, 29.5];
  const sh = shakeSum(t, [[28.3, 8], [28.9, 10], [29.5, 22, 0.6], [31.55, 14], [31.95, 14], [32.35, 18]]);
  const dr = drift(t, 0.7);
  ctx.save(); cam(ctx, 1 + seg(t, 26, 33.4) * 0.04 + punchSum(t, [[29.5, 0.04], [31.55, 0.03], [31.95, 0.03], [32.35, 0.04]]), 540, 960, dr.r + sh.r, dr.x + sh.x, dr.y + sh.y);

  // road
  ctx.fillStyle = '#4B4A52'; ctx.fillRect(0, 1560, W, 140); ctx.fillStyle = '#C9BBA2'; ctx.fillRect(0, 1700, W, 20); ctx.fillStyle = '#E4D8C2'; ctx.fillRect(0, 1720, W, 200);

  words(ctx, LT.w1, t, 26.1, { style: 'rise', stagger: 0.07, out: 30.2, seed: 70 });

  // sign: big & clear, then shrinks to the corner
  const sp = spring(t - 26.2, 2.0, 0.38);
  if (t > 26.2) {
    const k = E.outExpo(seg(t, 30.25, 30.7));
    const wob = Math.sin((t - 29.5) * 20) * Math.exp(-(t - 29.5) * 5) * (t > 29.5 ? 0.08 : 0);
    roadSign(ctx, lerp(540, 860, k), lerp(640, 330, k) + (1 - sp) * 700, lerp(0.95, 0.42, k), t, { glow: 0.6 + 0.4 * Math.sin(t * 5), rot: wob });
  }
  // "direction is clear" chip
  if (t > 26.9) {
    const out = 30.2;
    chip(ctx, 540, 1045, 'الاتجاه واضح', t, 26.95, { fill: '#16834F', color: '#fff', size: 50, weight: 900, out, h: 96, pad: 70 });
    if (t < out + 0.3) { ctx.save(); ctx.globalAlpha = 1 - seg(t, out, out + 0.2); checkMark(ctx, 722, 1043, 50, seg(t, 27.25, 27.5), '#fff', 9); ctx.restore(); }
  }
  // big statement
  words(ctx, LT.w2, t, 0, { times: [28.0, 28.3, 28.75], style: 'pop', out: 30.15, shadow: true, seed: 72 });
  if (t > 28.95 && t < 30.4) { const b = lineBox(LT.w2, 1); ctx.save(); ctx.globalAlpha = 1 - seg(t, 30.15, 30.35); underline(ctx, b.left, b.right, b.y + 26, seg(t, 28.95, 29.3), 74, t, C.red, 14); ctx.restore(); }
  // conclusion + stamps
  words(ctx, LT.w3, t, 0, { times: [30.32, 30.5, 30.66, 30.88, 31.02], style: 'rise', seed: 75 });
  words(ctx, LT.w4, t, 0, { times: [31.25], style: 'pop', seed: 76 });
  stamp(ctx, 770, 975, 'ضعفاء', t, 31.55, { size: 76, rot: -0.1 });
  stamp(ctx, 380, 1110, 'غير متميزين', t, 31.95, { size: 72, rot: 0.06 });
  stamp(ctx, 660, 1265, 'غير موهوبين', t, 32.35, { size: 76, rot: -0.05 });

  // bus that can't go
  let jolt = 0; for (const b of bangs) { const d = t - b; if (d > 0 && d < 0.5) jolt += Math.sin(d * 25) * Math.exp(-d * 8) * (b === 29.5 ? 40 : 20); }
  const seats = [];
  for (let i = 0; i < 4; i++) { const [pal, ex] = HOP_PALS[i]; seats.push(Object.assign({ pal, id: 90 + i, star: true }, ex)); }
  seats.push({ wrong: true, id: 99, pop: seg(t, 27.45, 27.7) });
  bus(ctx, 600 - jolt, 1650, 0.62, t, { door: t > 26.6 && t < 27.5 ? 1 : 0, seats, sign: 'الوجهة', tilt: jolt * 0.0008, wheel: jolt / 40 });
  // sputter smoke
  for (const b of bangs) {
    for (let i = 0; i < 4; i++) {
      const d = t - b - i * 0.05; if (d < 0 || d > 1.3) continue;
      smoke(ctx, 880 + d * 150, 1625 - d * 160, (b === 29.5 ? 50 : 30) + d * 110, t, b * 10 + i, (1 - d / 1.3), true);
    }
  }
  // heavy smoke build-up before the transition
  for (let i = 0; i < 10; i++) {
    const d = t - 32.4 - i * 0.07; if (d < 0) continue;
    smoke(ctx, 900 + d * 120 - i * 30, 1600 - d * 250 - i * 20, 40 + d * 260, t, 500 + i, 1, i % 2 === 0);
  }
  // wrong person walks in and hops on
  if (t < 27.5) {
    const wp = seg(t, 26.2, 26.85), hp = seg(t, 26.95, 27.4);
    let x = lerp(1180, 520, E.outQ(wp)), y = 1790, s = 0.66;
    if (hp > 0) { const e = E.ioC(hp); x = lerp(520, 432, e); y = lerp(1790, 1640, e) - Math.sin(hp * Math.PI) * 150; s = lerp(0.66, 0.5, e); }
    ctx.save(); ctx.globalAlpha *= 1 - seg(hp, 0.8, 1);
    person(ctx, x, y, s, t, { wrong: true, id: 99, walk: wp < 1 ? t * 16 : 0, flip: false });
    ctx.restore();
    if (wp > 0.2 && hp < 0.5) { ctx.save(); ctx.globalAlpha = 1 - seg(hp, 0.1, 0.5); text(ctx, '؟', x + 6, y - 150, { fam: FD, size: 90, weight: 900, color: C.red }); ctx.restore(); }
  }
  ctx.restore();
};
// paper card flip (motivation → wrong)
function flip(ctx, A, B, t) {
  const p = seg(t, 25.85, 26.25), e = E.ioC(p);
  ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
  const first = e < 0.5, sx = Math.abs(Math.cos(e * Math.PI)), img = first ? A : B;
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(Math.max(0.001, sx), 1 + 0.08 * Math.sin(e * Math.PI));
  ctx.drawImage(img, -W / 2, -H / 2);
  ctx.fillStyle = `rgba(0,0,0,${(1 - sx) * 0.55})`; ctx.fillRect(-W / 2, -H / 2, W, H);
  ctx.restore();
}

// ======================================================================
// 7. OUTRO — people first, then direction + brand
// ======================================================================
S.outro = function (ctx, t) {
  ctx.fillStyle = C.yellow; ctx.fillRect(0, 0, W, H);
  halftoneFill(ctx, () => { ctx.beginPath(); ctx.rect(0, 0, W, 260); ctx.rect(0, 1700, W, 220); }, 0.8);
  const sh = shakeSum(t, [[36.42, 26, 0.6], [36.66, 10]]); const dr = drift(t, 0.8);
  ctx.save(); cam(ctx, 1.02 - seg(t, 33.4, 40) * 0.02 + punchSum(t, [[36.42, 0.06], [33.62, 0.02]]), 540, 960, dr.r + sh.r, dr.x + sh.x, dr.y + sh.y);

  // group: people first, then direction (shrinks to header after 36.0)
  const k = E.ioC(seg(t, 35.95, 36.4));
  ctx.save(); ctx.translate(540, 760); ctx.scale(lerp(1, 0.66, k), lerp(1, 0.66, k)); ctx.translate(-540, -760 + lerp(0, -470, k));
  const peeps = [[400, PALS[0], { shmagh: true }], [540, PALS[5], { hijab: C.teal }], [680, PALS[3], {}]];
  peeps.forEach(([px, pal, ex], i) => {
    const pp = spring(t - 33.62 - i * 0.08, 2.4, 0.4); if (t < 33.62 + i * 0.08) return;
    person(ctx, px, 630, 0.95 * pp, t, Object.assign({ pal, id: 120 + i, star: true, arm: i === 1 ? 0.8 + Math.sin(t * 6) * 0.15 : 0 }, ex));
  });
  const b = lineBox(LT.o1, 0);
  words(ctx, LT.o1, t, 0, { times: [33.6, 33.95], style: 'rise', seed: 90, shadow: false });
  underline(ctx, b.left, b.right, b.y + 32, seg(t, 34.25, 34.65), 92, t, C.red, 16);
  words(ctx, LT.o2, t, 0, { times: [34.93, 35.15], style: 'pop', seed: 91 });
  const ob = lineBox(LT.o2, 0);
  if (t > 34.95) compass(ctx, ob.left - 90, 945, 66 * spring(t - 34.95, 2.4, 0.4), (1 - spring(t - 35.0, 1.4, 0.3)) * 10 - 0.8, t, { lift: 0.3 });
  ctx.restore();

  // brand badge
  const d = t - 36.4;
  if (d > 0) {
    const p = clamp(d / 0.16), s = p < 1 ? lerp(2.6, 0.95, E.inQ(p)) : 1 - 0.05 * Math.exp(-(d - 0.16) * 10) * Math.cos((d - 0.16) * 26);
    // ink splats
    if (p >= 1) {
      ctx.save(); ctx.fillStyle = C.ink;
      for (let i = 0; i < 16; i++) { const a = hash(i * 4.4) * TAU, r = 430 + hash(i * 2.2) * 120, sz = 6 + hash(i * 7.7) * 16; const g = E.outExpo(clamp((d - 0.16) * 5)); circle(ctx, 540 + Math.cos(a) * r * (0.7 + 0.3 * g), 1020 + Math.sin(a) * r * 0.42 * (0.7 + 0.3 * g), sz * g); ctx.fill(); }
      ctx.restore();
    }
    ctx.save(); ctx.translate(540, 1020); ctx.rotate(-0.02 + (1 - p) * 0.1); ctx.scale(s, s); ctx.globalAlpha = clamp(p * 3);
    shadowOn(ctx, 0.9, 0.35); ctx.fillStyle = C.ink; rr(ctx, -410, -150, 820, 300, 60); ctx.fill(); shadowOff(ctx);
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,247,232,0.35)'; rr(ctx, -392, -132, 784, 264, 46); ctx.stroke();
    text(ctx, 'موظف', 110, 62, { fam: FD, size: 196, weight: 900, color: C.cream });
    ctx.restore();
    // X10 sticker
    const d2 = t - 36.62;
    if (d2 > 0) {
      const s2 = spring(d2, 2.4, 0.35), rot = -0.14 + (1 - E.outExpo(clamp(d2 * 3))) * -1.6;
      ctx.save(); ctx.translate(540 - 255 * s, 1020); ctx.rotate(rot); ctx.scale(s2, s2);
      shadowOn(ctx, 0.5, 0.35); ctx.fillStyle = C.red; circle(ctx, 0, 0, 124); ctx.fill(); shadowOff(ctx);
      ctx.strokeStyle = C.cream; ctx.lineWidth = 6; ctx.setLineDash([16, 10]); circle(ctx, 0, 0, 104); ctx.stroke(); ctx.setLineDash([]);
      ctx.save(); font(ctx, FD, 112, 900); ctx.direction = 'ltr'; ctx.textAlign = 'center'; ctx.fillStyle = C.cream; ctx.fillText('X10', 0, 38); ctx.restore();
      ctx.restore();
    }
  }
  // confetti
  const cd = t - 36.45;
  if (cd > 0) {
    for (const c of PRE.conf) {
      const x = 540 + Math.cos(c.a) * c.v * cd * 0.8, y = 1020 + Math.sin(c.a) * c.v * cd * 0.8 - 500 * cd + 0.5 * 1900 * cd * cd;
      if (y > 2000) continue;
      ctx.save(); ctx.translate(x + Math.sin(cd * 6 + c.sp) * 20, y); ctx.rotate(cd * c.sp); ctx.scale(1, Math.cos(cd * 9 + c.sp));
      ctx.fillStyle = c.c; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); ctx.restore();
    }
  }
  // credit line
  const cl = seg(t, 37.1, 37.5);
  if (cl > 0) {
    ctx.save(); ctx.globalAlpha = cl; ctx.translate(0, (1 - E.outC(cl)) * 30);
    text(ctx, 'مستوحى من كتاب «من جيد إلى عظيم» لجيم كولنز', 540, 1300, { fam: FT, size: 42, weight: 500, color: C.ink });
    ctx.restore();
  }
  ctx.restore();
};

// global smoke cover (wrong → outro)
function smokeCover(ctx, t) {
  if (t < 32.75 || t > 34.2) return;
  const inn = seg(t, 32.75, 33.4), outp = seg(t, 33.5, 34.15);
  for (const s of PRE.smoke) {
    const g = E.outC(seg(inn, s.d, s.d + 0.75)); if (g <= 0) continue;
    const r = s.r * g * (1 + outp * 0.8), a = 1 - E.inQ(outp);
    if (a <= 0) continue;
    smoke(ctx, s.x + (s.x - 540) * outp * 0.6, s.y + (s.y - 960) * outp * 0.5, r, t, s.x, a, s.dark);
  }
  const full = clamp((inn - 0.85) * 7) * (1 - clamp(outp * 3));
  if (full > 0) { ctx.fillStyle = `rgba(222,214,201,${full})`; ctx.fillRect(0, 0, W, H); }
}
