// Paper cut-out illustration kit. All icons draw centred on (0,0) unless noted.
'use strict';

// ---------- compass ----------
function compass(ctx, x, y, r, ang, t, { face = C.cream, ring = C.ink, lift = 0.4 } = {}) {
  ctx.save(); ctx.translate(x, y);
  shadowOn(ctx, lift); ctx.fillStyle = ring; circle(ctx, 0, 0, r); ctx.fill(); shadowOff(ctx);
  ctx.fillStyle = C.yellow; circle(ctx, 0, 0, r * 0.9); ctx.fill();
  ctx.fillStyle = face; circle(ctx, 0, 0, r * 0.8); ctx.fill();
  // ticks
  ctx.strokeStyle = C.ink2; ctx.lineCap = 'round';
  for (let i = 0; i < 32; i++) {
    const a = i / 32 * TAU, big = i % 8 === 0, mid = i % 4 === 0;
    ctx.lineWidth = big ? r * 0.04 : r * 0.018;
    const r0 = r * (big ? 0.6 : mid ? 0.66 : 0.71);
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r * 0.77, Math.sin(a) * r * 0.77); ctx.stroke();
  }
  // north letter (ش = شمال)
  ctx.fillStyle = C.red; font(ctx, FD, r * 0.26, 900); ctx.textAlign = 'center'; ctx.direction = 'rtl'; ctx.fillText('ش', 0, -r * 0.38);
  // needle
  ctx.rotate(ang);
  shadowOn(ctx, 0.15, 0.3);
  ctx.fillStyle = C.red; ctx.beginPath(); ctx.moveTo(0, -r * 0.62); ctx.lineTo(r * 0.12, 0); ctx.lineTo(-r * 0.12, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.ink2; ctx.beginPath(); ctx.moveTo(0, r * 0.62); ctx.lineTo(r * 0.12, 0); ctx.lineTo(-r * 0.12, 0); ctx.closePath(); ctx.fill();
  shadowOff(ctx);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(0, -r * 0.62); ctx.lineTo(r * 0.12, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.yellow; circle(ctx, 0, 0, r * 0.07); ctx.fill(); ctx.fillStyle = C.ink; circle(ctx, 0, 0, r * 0.03); ctx.fill();
  ctx.restore();
  // glass glare
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.35, r * 0.35, r * 0.16, -0.7, 0, TAU); ctx.fill(); ctx.restore();
}

// ---------- people ----------
const PALS = [
  { body: C.teal, skin: C.skin1, hair: C.ink, pants: C.navy },
  { body: C.red, skin: C.skin2, hair: '#3A2418', pants: C.ink2 },
  { body: C.blue, skin: C.skin4, hair: '#6B3B1F', pants: C.navy },
  { body: C.orange, skin: C.skin3, hair: C.ink, pants: C.ink2 },
  { body: C.purple, skin: C.skin1, hair: '#2A1A12', pants: C.navy },
  { body: C.pink, skin: C.skin2, hair: C.ink, pants: C.ink2 },
  { body: C.green, skin: C.skin4, hair: '#4A2A16', pants: C.navy },
];
// x,y = feet centre. opts: pal, wrong, star, face, arm (0..1 raise), walk (phase), s scale, headgear
function person(ctx, x, y, s, t, o = {}) {
  const pal = o.wrong ? { body: '#8E8A84', skin: '#BDB6AC', hair: '#5B5852', pants: '#6E6A64' } : (o.pal || PALS[0]);
  const id = o.id || 1, b = boil(id + 99, t, 1.2);
  ctx.save(); ctx.translate(x + b.x, y + b.y); ctx.scale(s * (o.flip ? -1 : 1), s); ctx.rotate(b.r + (o.lean || 0));
  const sq = o.squash || 0; ctx.scale(1 + sq * 0.25, 1 - sq * 0.25);
  const walk = o.walk || 0, stoop = o.wrong ? 0.12 : 0;
  shadowOn(ctx, o.lift || 0.15, 0.25);
  // legs
  ctx.fillStyle = pal.pants;
  const lg = Math.sin(walk) * 14;
  rr(ctx, -26 + lg * 0.3, -70, 22, 72, 10); ctx.fill();
  rr(ctx, 4 - lg * 0.3, -70, 22, 72, 10); ctx.fill();
  // body
  ctx.save(); ctx.translate(0, -66); ctx.rotate(stoop);
  ctx.fillStyle = pal.body;
  ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(40, 0); ctx.lineTo(36, -92); ctx.quadraticCurveTo(0, -116, -36, -92); ctx.closePath(); ctx.fill();
  shadowOff(ctx);
  // arms
  const arm = o.arm || 0;
  ctx.strokeStyle = pal.body; ctx.lineWidth = 20; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-34, -80); ctx.lineTo(-48 - arm * 10, -36 - arm * 110 + (o.wrong ? 10 : 0)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(34, -80); ctx.lineTo(48 + arm * 10, -36 - arm * 110 + (o.wrong ? 10 : 0)); ctx.stroke();
  ctx.fillStyle = pal.skin; circle(ctx, -48 - arm * 10, -32 - arm * 112 + (o.wrong ? 10 : 0), 10); ctx.fill(); circle(ctx, 48 + arm * 10, -32 - arm * 112 + (o.wrong ? 10 : 0), 10); ctx.fill();
  // collar
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.moveTo(-14, -104); ctx.lineTo(0, -86); ctx.lineTo(14, -104); ctx.closePath(); ctx.fill();
  // star badge
  if (o.star) {
    ctx.save(); ctx.translate(18, -62); ctx.rotate(t * 1.5 + id);
    star(ctx, 0, 0, 14 + (o.starPulse || 0) * 6, 6.5, C.yellow); ctx.restore();
  }
  // head
  ctx.save(); ctx.translate(0, -132 + (o.wrong ? 10 : 0)); ctx.rotate(o.wrong ? 0.18 : Math.sin(t * 2 + id) * 0.04);
  ctx.fillStyle = pal.skin; circle(ctx, 0, 0, 34); ctx.fill();
  ctx.fillStyle = pal.hair; ctx.beginPath(); ctx.arc(0, -4, 35, Math.PI * 1.02, Math.PI * 1.98); ctx.quadraticCurveTo(10, -18, -34, -6); ctx.fill();
  if (o.hijab) { ctx.fillStyle = o.hijab; ctx.beginPath(); ctx.arc(0, 2, 40, Math.PI * 0.85, Math.PI * 2.15); ctx.lineTo(30, 44); ctx.lineTo(-30, 44); ctx.closePath(); ctx.fill(); ctx.fillStyle = pal.skin; ctx.beginPath(); ctx.ellipse(0, 6, 24, 27, 0, 0, TAU); ctx.fill(); }
  if (o.shmagh) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -2, 39, Math.PI * 0.9, Math.PI * 2.1); ctx.lineTo(36, 42); ctx.lineTo(-36, 42); ctx.closePath(); ctx.fill(); ctx.fillStyle = C.red; for (let i = -30; i <= 30; i += 12) { for (let j = -30; j <= 0; j += 12) { ctx.fillRect(i, j, 5, 5); } } ctx.fillStyle = pal.skin; ctx.beginPath(); ctx.ellipse(0, 7, 24, 27, 0, 0, TAU); ctx.fill(); ctx.fillStyle = C.ink; ctx.fillRect(-34, -20, 68, 8); }
  // face
  ctx.fillStyle = C.ink;
  const blink = (Math.floor(t * 12 + id * 5) % 37 === 0) ? 0.2 : 1;
  ctx.beginPath(); ctx.ellipse(-11, 2, 3.6, 4.6 * blink, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(11, 2, 3.6, 4.6 * blink, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath();
  if (o.wrong) { ctx.moveTo(-9, 18); ctx.quadraticCurveTo(0, 12, 9, 18); }
  else { ctx.moveTo(-10, 13); ctx.quadraticCurveTo(0, 22, 10, 13); }
  ctx.stroke();
  if (o.wrong) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-17, -7); ctx.lineTo(-6, -4); ctx.moveTo(17, -7); ctx.lineTo(6, -4); ctx.stroke(); }
  ctx.restore();
  ctx.restore();
  ctx.restore();
}
function star(ctx, x, y, R, r, fill) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = fill; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R; ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

// ---------- bus (front faces LEFT, the forward direction for RTL reading) ----------
// x,y = centre bottom of body (above wheels). L = length.
function bus(ctx, x, y, s, t, o = {}) {
  const Lb = 860, Hb = 330, door = o.door || 0, wheel = o.wheel || 0, b = boil(500, t, 1);
  ctx.save(); ctx.translate(x + b.x, y + (o.bounce || 0)); ctx.scale(s, s); ctx.rotate(o.tilt || 0);
  const X0 = -Lb / 2, Y0 = -Hb;
  // body
  shadowOn(ctx, 0.5, 0.3);
  ctx.fillStyle = o.color || C.yellow;
  ctx.beginPath(); ctx.moveTo(X0 + 60, Y0); ctx.lineTo(X0 + Lb - 30, Y0); ctx.quadraticCurveTo(X0 + Lb, Y0, X0 + Lb, Y0 + 30); ctx.lineTo(X0 + Lb, 0);
  ctx.lineTo(X0 + 10, 0); ctx.quadraticCurveTo(X0, 0, X0, -12); ctx.lineTo(X0, Y0 + 90); ctx.quadraticCurveTo(X0 + 4, Y0, X0 + 60, Y0); ctx.closePath(); ctx.fill();
  shadowOff(ctx);
  // roof sheen + bottom shade
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(X0 + 50, Y0 + 8, Lb - 80, 14);
  ctx.fillStyle = 'rgba(120,60,0,0.16)'; ctx.fillRect(X0 + 2, -64, Lb - 2, 64);
  // stripe
  ctx.fillStyle = C.ink; ctx.fillRect(X0, -96, Lb, 22);
  ctx.fillStyle = o.stripe || C.red; ctx.fillRect(X0, -74, Lb, 10);
  // windscreen (front-left)
  ctx.fillStyle = '#9FD4E6'; ctx.beginPath(); ctx.moveTo(X0 + 8, Y0 + 96); ctx.quadraticCurveTo(X0 + 14, Y0 + 22, X0 + 70, Y0 + 22); ctx.lineTo(X0 + 96, Y0 + 22); ctx.lineTo(X0 + 96, Y0 + 168); ctx.lineTo(X0 + 8, Y0 + 168); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.moveTo(X0 + 30, Y0 + 40); ctx.lineTo(X0 + 54, Y0 + 40); ctx.lineTo(X0 + 26, Y0 + 120); ctx.lineTo(X0 + 16, Y0 + 120); ctx.closePath(); ctx.fill();
  // driver
  if (o.driver !== false) { ctx.save(); ctx.beginPath(); ctx.rect(X0 + 8, Y0 + 22, 88, 146); ctx.clip(); person(ctx, X0 + 62, Y0 + 290, 0.85, t, { pal: PALS[3], id: 77, shmagh: true }); ctx.restore(); }
  // door (bi-fold) next to windscreen
  const dx = X0 + 110, dw = 96, dy = Y0 + 30, dh = Hb - 40;
  ctx.fillStyle = C.ink2; ctx.fillRect(dx, dy, dw, dh);
  if (o.inside) o.inside(ctx, dx, dy, dw, dh);
  const fold = clamp(door);
  ctx.fillStyle = '#9FD4E6';
  const pw = dw / 2 * (1 - fold * 0.82);
  ctx.fillRect(dx, dy, pw, dh); ctx.fillRect(dx + dw - pw, dy, pw, dh);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.strokeRect(dx, dy, pw, dh); ctx.strokeRect(dx + dw - pw, dy, pw, dh);
  // windows with passengers
  const wx0 = X0 + 230, ww = 120, gap = 20, wy = Y0 + 34, wh = 128;
  for (let i = 0; i < 5; i++) {
    const wx = wx0 + i * (ww + gap);
    ctx.fillStyle = '#9FD4E6'; rr(ctx, wx, wy, ww, wh, 14); ctx.fill();
    ctx.save(); rr(ctx, wx, wy, ww, wh, 14); ctx.clip();
    const p = o.seats && o.seats[i];
    if (p) {
      const pop = p.pop === undefined ? 1 : p.pop;
      if (pop > 0) person(ctx, wx + ww / 2, wy + wh + 210 - 120 * E.outBack(clamp(pop)), 0.95, t, p);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(wx + 14, wy); ctx.lineTo(wx + 40, wy); ctx.lineTo(wx + 10, wy + 60); ctx.lineTo(wx, wy + 60); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 5; rr(ctx, wx, wy, ww, wh, 14); ctx.stroke();
  }
  // destination board
  ctx.fillStyle = C.ink; rr(ctx, X0 + 120, Y0 - 52, 300, 58, 10); ctx.fill();
  if (o.sign) { text(ctx, o.sign, X0 + 270, Y0 - 10, { fam: FD, size: 40, weight: 900, color: o.signColor || C.orange }); }
  // headlight + bumper
  ctx.fillStyle = '#FFF4B8'; circle(ctx, X0 + 18, -40, 16); ctx.fill();
  if (o.lights) { const g = ctx.createRadialGradient(X0 + 10, -40, 0, X0 + 10, -40, 180); g.addColorStop(0, `rgba(255,240,160,${0.7 * o.lights})`); g.addColorStop(1, 'rgba(255,240,160,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(X0 + 10, -40); ctx.lineTo(X0 - 260, -120); ctx.lineTo(X0 - 260, 40); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = C.ink2; rr(ctx, X0 - 10, -26, 70, 26, 8); ctx.fill(); rr(ctx, X0 + Lb - 50, -26, 60, 26, 8); ctx.fill();
  ctx.fillStyle = C.red; rr(ctx, X0 + Lb - 14, Y0 + 40, 14, 40, 4); ctx.fill();
  // wheels
  for (const wxp of [X0 + 170, X0 + Lb - 170]) wheelDraw(ctx, wxp, 4, 62, wheel);
  ctx.restore();
}
function wheelDraw(ctx, x, y, r, ang) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = C.ink; circle(ctx, 0, 0, r); ctx.fill();
  ctx.fillStyle = '#CFC8BC'; circle(ctx, 0, 0, r * 0.52); ctx.fill();
  ctx.rotate(ang); ctx.fillStyle = C.ink2;
  for (let i = 0; i < 5; i++) { ctx.rotate(TAU / 5); ctx.fillRect(-4, -r * 0.48, 8, r * 0.3); }
  ctx.fillStyle = C.ink2; circle(ctx, 0, 0, r * 0.14); ctx.fill();
  ctx.restore();
}

// ---------- book (spine on the RIGHT, Arabic binding) ----------
// open: 0 closed, 1 cover fully opened (flipped to the right)
function book(ctx, x, y, w, h, t, o = {}) {
  const open = clamp(o.open || 0), th = 34;
  ctx.save(); ctx.translate(x, y);
  // page block / thickness
  shadowOn(ctx, o.lift || 0.6, 0.32);
  ctx.fillStyle = '#B9302A'; rr(ctx, -w / 2 + 10, -h / 2 + 12, w + th - 10, h, 16); ctx.fill();
  shadowOff(ctx);
  ctx.fillStyle = '#F7EEDC'; ctx.fillRect(-w / 2 + 14, h / 2 - 8, w + th - 30, 14);
  for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#E8DCC5' : '#F7EEDC'; ctx.fillRect(-w / 2 + 14, h / 2 - 6 + i * 2.2, w + th - 30, 1.2); }
  // inside page (visible when open)
  if (open > 0) {
    ctx.fillStyle = '#FBF4E6'; rr(ctx, -w / 2, -h / 2, w, h, 10); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < 12; i++) ctx.fillRect(-w / 2 + 50, -h / 2 + 90 + i * 46, w - 100 - (i % 3) * 60, 10);
    if (o.inner) o.inner(ctx, w, h);
  }
  // cover rotating around the right edge (spine)
  const sx = Math.cos(open * Math.PI); // 1 -> -1
  ctx.save(); ctx.translate(w / 2, 0); ctx.scale(sx, 1); ctx.translate(-w / 2, 0);
  if (sx > 0) {
    ctx.fillStyle = o.cover || C.red; rr(ctx, -w / 2, -h / 2, w, h, 14); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(w / 2 - 34, -h / 2, 10, h);
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(-w / 2, -h / 2, w, h * 0.1);
    if (o.front) o.front(ctx, w, h);
    if (open > 0) { ctx.fillStyle = `rgba(0,0,0,${open * 0.6})`; rr(ctx, -w / 2, -h / 2, w, h, 14); ctx.fill(); }
  } else {
    ctx.fillStyle = '#EFE3CC'; rr(ctx, -w / 2, -h / 2, w, h, 14); ctx.fill();
    ctx.fillStyle = `rgba(0,0,0,${(1 - open) * 0.5})`; rr(ctx, -w / 2, -h / 2, w, h, 14); ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

// ---------- sticky note ----------
function note(ctx, x, y, w, h, rot, color, t, o = {}) {
  withT(ctx, x, y, rot, o.s || 1, o.s || 1, () => {
    shadowOn(ctx, o.lift || 0.2, 0.3);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2, h / 2 - 26); ctx.quadraticCurveTo(w / 2 - 6, h / 2 - 4, w / 2 - 34, h / 2); ctx.lineTo(-w / 2, h / 2); ctx.closePath(); ctx.fill();
    shadowOff(ctx);
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.beginPath(); ctx.moveTo(w / 2, h / 2 - 26); ctx.quadraticCurveTo(w / 2 - 14, h / 2 - 18, w / 2 - 34, h / 2); ctx.quadraticCurveTo(w / 2 - 10, h / 2 - 10, w / 2, h / 2 - 26); ctx.fill();
    if (o.draw) o.draw();
    if (o.tape !== false) tape(ctx, 0, -h / 2 + 4, Math.min(170, w * 0.5), hs(x + y) * 0.12);
  });
}

// ---------- battery ----------
function battery(ctx, x, y, s, level, t, o = {}) {
  withT(ctx, x, y, o.rot || 0, s, s, () => {
    shadowOn(ctx, 0.2, 0.28);
    ctx.fillStyle = C.cream; rr(ctx, -70, -38, 140, 76, 16); ctx.fill(); shadowOff(ctx);
    ctx.fillStyle = C.ink; rr(ctx, 70, -16, 14, 32, 5); ctx.fill();
    ctx.lineWidth = 8; ctx.strokeStyle = C.ink; rr(ctx, -70, -38, 140, 76, 16); ctx.stroke();
    const lv = clamp(level), col = lv < 0.35 ? C.red : lv < 0.7 ? C.orange : C.green;
    ctx.fillStyle = col; rr(ctx, -60, -28, 120 * lv, 56, 9); ctx.fill();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(8, -30); ctx.lineTo(-16, 4); ctx.lineTo(0, 4); ctx.lineTo(-8, 30); ctx.lineTo(18, -6); ctx.lineTo(2, -6); ctx.closePath();
    ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1;
  });
}
function bolt(ctx, x, y, s, rot, color = C.yellow) {
  withT(ctx, x, y, rot, s, s, () => {
    shadowOn(ctx, 0.2, 0.3);
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(14, -60); ctx.lineTo(-30, 8); ctx.lineTo(-2, 8); ctx.lineTo(-14, 60); ctx.lineTo(32, -12); ctx.lineTo(4, -12); ctx.closePath(); ctx.fill();
    shadowOff(ctx); ctx.lineWidth = 5; ctx.strokeStyle = C.ink; ctx.stroke();
  });
}

// ---------- motivation props ----------
function megaphone(ctx, x, y, s, rot) {
  withT(ctx, x, y, rot, s, s, () => {
    shadowOn(ctx, 0.3); ctx.fillStyle = C.red;
    ctx.beginPath(); ctx.moveTo(-60, -22); ctx.lineTo(50, -62); ctx.lineTo(50, 62); ctx.lineTo(-60, 22); ctx.closePath(); ctx.fill(); shadowOff(ctx);
    ctx.fillStyle = C.ink; rr(ctx, -84, -26, 28, 52, 8); ctx.fill(); ctx.fillStyle = C.cream; ctx.beginPath(); ctx.ellipse(50, 0, 14, 62, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = C.ink; rr(ctx, -46, 16, 18, 46, 6); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(80, i * 34); ctx.lineTo(110, i * 50); ctx.stroke(); }
  });
}
function trophy(ctx, x, y, s, rot) {
  withT(ctx, x, y, rot, s, s, () => {
    shadowOn(ctx, 0.3); ctx.fillStyle = C.yellow;
    ctx.beginPath(); ctx.moveTo(-52, -60); ctx.lineTo(52, -60); ctx.quadraticCurveTo(50, 20, 0, 26); ctx.quadraticCurveTo(-50, 20, -52, -60); ctx.fill(); shadowOff(ctx);
    ctx.strokeStyle = C.yellow; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(-54, -30, 22, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke(); ctx.beginPath(); ctx.arc(54, -30, 22, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    ctx.fillStyle = '#E0A400'; ctx.fillRect(-10, 24, 20, 30); ctx.fillStyle = C.ink2; rr(ctx, -40, 52, 80, 22, 6); ctx.fill();
    star(ctx, 0, -22, 20, 9, '#fff');
  });
}
function carrot(ctx, x, y, s, rot) {
  withT(ctx, x, y, rot, s, s, () => {
    ctx.strokeStyle = C.gray2; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-100, -70); ctx.lineTo(30, -70); ctx.stroke();
    ctx.strokeStyle = C.ink2; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(24, -70); ctx.lineTo(24, -26); ctx.stroke();
    shadowOn(ctx, 0.3); ctx.fillStyle = C.orange; ctx.beginPath(); ctx.moveTo(4, -26); ctx.lineTo(44, -26); ctx.lineTo(24, 60); ctx.closePath(); ctx.fill(); shadowOff(ctx);
    ctx.fillStyle = C.green; ctx.beginPath(); ctx.ellipse(16, -36, 8, 16, -0.5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(32, -36, 8, 16, 0.5, 0, TAU); ctx.fill();
  });
}
function crumple(ctx, x, y, r, color, seed) {
  ctx.save(); ctx.translate(x, y); shadowOn(ctx, 0.2);
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, rr2 = r * (0.78 + hash(seed + i) * 0.35); ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
  ctx.closePath(); ctx.fill(); shadowOff(ctx);
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 2.5;
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(hs(seed + i) * r * 0.6, hs(seed + i * 2) * r * 0.6); ctx.lineTo(hs(seed + i * 3) * r * 0.7, hs(seed + i * 4) * r * 0.7); ctx.stroke(); }
  ctx.restore();
}
function docPaper(ctx, x, y, s, rot, label, color = C.cream) {
  withT(ctx, x, y, rot, s, s, () => {
    shadowOn(ctx, 0.3); ctx.fillStyle = color; ctx.fillRect(-110, -140, 220, 280); shadowOff(ctx);
    ctx.fillStyle = C.red; ctx.fillRect(-110, -140, 220, 50);
    text(ctx, label, 0, -103, { fam: FD, size: 30, weight: 900, color: C.cream });
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; for (let i = 0; i < 6; i++) ctx.fillRect(-80, -60 + i * 30, 160 - (i % 2) * 50, 9);
    star(ctx, 60, 100, 26, 11, C.yellow);
  });
}

// ---------- road sign ----------
function roadSign(ctx, x, y, s, t, o = {}) {
  withT(ctx, x, y, o.rot || 0, s, s, () => {
    ctx.fillStyle = C.gray2; ctx.fillRect(-150, 0, 18, 360); ctx.fillRect(132, 0, 18, 360);
    shadowOn(ctx, 0.4, 0.3);
    ctx.fillStyle = '#16834F'; rr(ctx, -230, -170, 460, 200, 26); ctx.fill(); shadowOff(ctx);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; rr(ctx, -216, -156, 432, 172, 18); ctx.stroke();
    text(ctx, o.label || 'الوجهة', 40, -48, { fam: FD, size: 84, weight: 900, color: '#fff' });
    // arrow pointing left
    const wob = o.arrowAng || 0;
    ctx.save(); ctx.translate(-140, -70); ctx.rotate(wob);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-50, 0); ctx.lineTo(-6, -42); ctx.lineTo(-6, -16); ctx.lineTo(48, -16); ctx.lineTo(48, 16); ctx.lineTo(-6, 16); ctx.lineTo(-6, 42); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (o.glow) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = o.glow * 0.5; ctx.fillStyle = '#FFF2B0'; rr(ctx, -250, -190, 500, 240, 34); ctx.fill(); ctx.restore(); }
  });
}

// ---------- smoke ----------
function smoke(ctx, x, y, r, t, seed, a = 1, dark = false) {
  ctx.save(); ctx.globalAlpha *= a;
  for (let i = 0; i < 7; i++) {
    const ang = hash(seed + i) * TAU, d = r * 0.45 * hash(seed + i * 3), rr2 = r * (0.45 + hash(seed + i * 5) * 0.4);
    const px = x + Math.cos(ang) * d + Math.sin(t * 1.3 + i) * r * 0.05, py = y + Math.sin(ang) * d;
    ctx.fillStyle = dark ? (i % 2 ? '#6F6A64' : '#85807A') : (i % 2 ? '#E9E3D8' : '#D9D2C6');
    circle(ctx, px, py, rr2); ctx.fill();
  }
  ctx.restore();
}

// ---------- stamp ----------
function stamp(ctx, x, y, label, t, t0, { color = C.red, size = 64, rot = -0.12, w = null } = {}) {
  const d = t - t0; if (d < 0) return;
  const p = clamp(d / 0.16);
  const s = p < 1 ? lerp(2.3, 0.94, E.inQ(p)) : 1 - 0.06 * Math.exp(-(d - 0.16) * 14) * Math.cos((d - 0.16) * 30);
  const a = clamp(p * 2.5);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.globalAlpha *= a;
  font(ctx, FD, size, 900); ctx.direction = 'rtl';
  const tw = w || ctx.measureText(label).width + size * 0.9, th = size * 1.5;
  // draw on offscreen to punch speckle holes
  const oc = stamp._c || (stamp._c = mk(900, 300)); const og = oc.getContext('2d');
  og.setTransform(1, 0, 0, 1, 0, 0); og.clearRect(0, 0, 900, 300); og.translate(450, 150);
  og.strokeStyle = color; og.lineWidth = 9; rr(og, -tw / 2, -th / 2, tw, th, 14); og.stroke();
  og.lineWidth = 3; rr(og, -tw / 2 + 12, -th / 2 + 12, tw - 24, th - 24, 8); og.stroke();
  og.fillStyle = color; font(og, FD, size, 900); og.direction = 'rtl'; og.textAlign = 'center'; og.textBaseline = 'middle'; og.fillText(label, 0, size * 0.08);
  og.setTransform(1, 0, 0, 1, 0, 0); og.globalCompositeOperation = 'destination-out'; og.drawImage(TX.speckle, 100, 20, 700, 260); og.globalCompositeOperation = 'source-over';
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(oc, -450, -150);
  ctx.restore();
}

// ---------- city backdrop (pre-rendered, flat paper silhouettes) ----------
function cityLayer(seed, color, minH, maxH, winColor) {
  const c = mk(2400, 900), g = c.getContext('2d');
  let x = 0, i = 0;
  while (x < 2400) {
    const w = 110 + hash(seed + i) * 160, h = minH + hash(seed + i * 3) * (maxH - minH);
    g.fillStyle = color; g.fillRect(x, 900 - h, w - 8, h);
    if (hash(seed + i * 7) > 0.6) { g.beginPath(); g.moveTo(x, 900 - h); g.lineTo(x + (w - 8) / 2, 900 - h - 50); g.lineTo(x + w - 8, 900 - h); g.fill(); }
    if (winColor) { g.fillStyle = winColor; for (let yy = 900 - h + 30; yy < 860; yy += 46) for (let xx = x + 18; xx < x + w - 34; xx += 38) if (hash(xx * 0.1 + yy) > 0.35) g.fillRect(xx, yy, 18, 24); g.fillStyle = color; }
    x += w; i++;
  }
  return c;
}
function cloud(ctx, x, y, s) {
  withT(ctx, x, y, 0, s, s, () => {
    shadowOn(ctx, 0.05, 0.12); ctx.fillStyle = '#FFFDF7';
    ctx.beginPath(); ctx.arc(-50, 10, 40, 0, TAU); ctx.arc(0, -10, 56, 0, TAU); ctx.arc(55, 8, 42, 0, TAU); ctx.fill();
    ctx.fillRect(-90, 10, 185, 40); shadowOff(ctx);
  });
}
