// Compositor: picks scenes + transitions for time t and finishes the frame.
'use strict';

const cvs = document.getElementById('c');
const ctx = cvs.getContext('2d', { alpha: false });
const offA = mk(W, H), offB = mk(W, H);
const ga = offA.getContext('2d', { alpha: false }), gb = offB.getContext('2d', { alpha: false });

function draw(g, fn, t) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); fn(g, t); g.restore(); }

function renderFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (t < 5.35) draw(ctx, S.title, t);
  else if (t < 5.75) { draw(ctx, S.title, t); coverSwing(ctx, t); }
  else if (t < 12.45) draw(ctx, S.book, t);
  else if (t < 12.75) {
    // vertical whip pan: book drops away, findings drops in from above
    const p = E.ioExpo(seg(t, 12.45, 12.75));
    draw(ga, S.book, t); draw(gb, S.findings, t);
    ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
    for (let k = 0; k < 4; k++) {
      const off = k * 26 * Math.sin(p * Math.PI);
      ctx.globalAlpha = k === 0 ? 1 : 0.22;
      ctx.drawImage(offA, 0, p * H + off); ctx.drawImage(offB, 0, (p - 1) * H + off);
    }
    ctx.globalAlpha = 1;
  }
  else if (t < 15.75) draw(ctx, S.findings, t);
  else if (t < 20.45) draw(ctx, S.bus, t);
  else if (t < 20.95) { draw(ga, S.bus, t); draw(gb, S.motiv, t); busWipe(ctx, offA, offB, t); }
  else if (t < 25.85) draw(ctx, S.motiv, t);
  else if (t < 26.25) { draw(ga, S.motiv, t); draw(gb, S.wrong, t); flip(ctx, offA, offB, t); }
  else if (t < 33.45) draw(ctx, S.wrong, t);
  else draw(ctx, S.outro, t);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  smokeCover(ctx, t);
  finishFrame(ctx, t);
}

async function loadFonts() {
  const weights = { Light: 300, Regular: 400, Medium: 500, Bold: 700, Black: 900 };
  const fams = { 'serif-display': 'Thmanyah Serif Display', 'serif-text': 'Thmanyah Serif Text' };
  const jobs = [];
  for (const [slug, fam] of Object.entries(fams)) for (const [wn, wv] of Object.entries(weights)) {
    const f = new FontFace(fam, `url(fonts/thmanyah-${slug}-${wn}.woff2)`, { weight: String(wv) });
    jobs.push(f.load().then(ff => document.fonts.add(ff)));
  }
  await Promise.all(jobs);
}

window.ready = (async () => {
  await loadFonts();
  buildTextures();
  prepare(ctx);
  renderFrame(0);
  return true;
})();
window.renderFrame = renderFrame;

// preview mode: ?play  (realtime playback in a browser)
if (location.search.includes('play')) {
  window.ready.then(() => { const t0 = performance.now(); const loop = () => { renderFrame(((performance.now() - t0) / 1000) % 40); requestAnimationFrame(loop); }; loop(); });
}
