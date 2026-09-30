// Shared timeline cues: used by motion.js (camera shake) and audio.py (sound design).
(function (root) {
  const c = { impact: [], whoosh: [], pop: [], paper: [], ding: [], riser: [], tick: [], scratch: [] };
  const add = (k, t, a = 1) => c[k].push([+t.toFixed(3), a]);

  // Scene boundaries (seconds)
  const SCENES = [0, 9, 24, 29, 46, 64, 78, 91, 104, 117, 130, 143, 156, 169, 180];
  SCENES.slice(1, -1).forEach(t => add('whoosh', t - 0.3, 1));

  // ---- Intro 0–9
  add('paper', 0.15); add('impact', 0.7, 0.5);
  for (let i = 0; i < 6; i++) add('pop', 0.55 + i * 0.12, 0.8);
  add('scratch', 2.0);
  add('impact', 2.72, 1); add('ding', 2.75, 0.8);
  add('whoosh', 3.2, 0.6); add('pop', 4.1);
  for (let i = 0; i < 7; i++) add('pop', 5.0 + i * 0.15, 0.6);
  add('riser', 7.2, 1.8);

  // ---- Team 9–24
  for (let i = 0; i < 5; i++) add('pop', 9.5 + i * 0.12, 0.6);
  [10.4, 11.6, 12.8, 13.8].forEach(t => add('tick', t, 1));
  add('impact', 14.5, 1); add('ding', 14.55, 0.7);
  add('pop', 14.8); add('pop', 16.0);
  add('whoosh', 18.8, 0.6);
  for (let i = 0; i < 5; i++) add('pop', 19.3 + i * 0.15, 0.7);
  add('impact', 20.6, 1.2); add('ding', 20.65, 1);
  [21.2, 21.6, 22.0, 22.4].forEach(t => add('pop', t, 0.8));

  // ---- Portrait 24–29
  add('paper', 24.2); add('impact', 24.6, 0.4);
  [24.7, 25.1, 25.5, 25.9].forEach(t => add('pop', t, 0.8));

  // ---- Map 29–46 (stops)
  for (let k = 0; k < 6; k++) {
    const a = 29 + 0.6 + 2.7 * k;
    if (k > 0) add('whoosh', a - 1.1, 0.7);
    add('impact', a, 0.35); add('pop', a + 0.1, 0.8);
  }
  for (let j = 0; j < 16; j++) add('pop', 29 + 0.6 + 2.7 * 4 + 0.05 + j * 0.05, 0.35);

  // ---- Book 46–64
  for (let i = 0; i < 12; i++) add('paper', 46.3 + i * 0.17 + 0.3, 0.5);
  add('whoosh', 49.2, 0.7); add('pop', 49.6); add('pop', 50.1); add('pop', 50.6, 0.7);
  add('whoosh', 51.9, 1); add('impact', 52.9, 1); add('paper', 52.5);
  add('impact', 53.35, 0.9); add('ding', 53.4, 0.8);
  add('pop', 53.9); add('pop', 54.4);
  add('whoosh', 57.4, 0.8); add('paper', 57.6);
  [58.6, 60.0, 61.4].forEach(t => { add('whoosh', t - 0.1, 0.5); add('pop', t + 0.2); });

  // ---- Framework 64–78
  [64.9, 65.3, 65.7].forEach(t => add('pop', t));
  [68.7, 68.95, 69.2].forEach(t => add('pop', t));
  add('ding', 69.9, 0.8);
  [72.4, 72.7, 73.0].forEach(t => add('impact', t, 0.35));
  [73.0, 74.0, 75.0].forEach(t => add('pop', t, 0.5));
  add('pop', 75.6); add('pop', 76.2);
  add('riser', 76.0, 2.0);

  // ---- Habits 78 + 13i
  for (let i = 0; i < 7; i++) {
    const T = 78 + 13 * i;
    add('impact', T + 0.55, 1);
    add('pop', T + 0.75, 0.7); add('pop', T + 0.95, 0.9);
    add('paper', T + 1.7, 0.8);
    add('paper', T + 5.3, 0.7); add('paper', T + 8.8, 0.7);
    for (let j = 0; j < 3; j++) add('pop', T + 8.8 + 0.35 + j * 0.5, 0.7);
    if (i === 1) { add('whoosh', T + 1.8, 0.5); add('impact', T + 2.2, 0.8); }
    if (i === 2) { add('ding', T + 2.2, 0.6); for (let k = 0; k < 8; k++) add('tick', T + 1.2 + k * 0.5, 0.35); }
    if (i === 3) add('ding', T + 2.6, 0.7);
    if (i === 5) { add('impact', T + 2.3, 0.8); add('ding', T + 2.35, 0.9); }
    if (i === 6) for (let k = 0; k < 6; k++) add('scratch', T + 1.1 + k * 0.5, 0.5);
    add('ding', T + 1.0, 0.35);
  }

  // ---- Outro 169–180
  for (let i = 0; i < 7; i++) add('pop', 169.3 + i * 0.2, 0.8);
  add('pop', 170.8); add('pop', 171.3);
  add('riser', 171.6, 1.0);
  add('impact', 172.6, 1.3);
  add('pop', 172.8); add('pop', 173.1);
  add('impact', 174.8, 1.2); add('ding', 174.85, 1);
  add('pop', 175.8); add('pop', 176.4, 0.6);

  // ================= motion-reactive SFX layer (no music) =================
  // duration cues: [t, dur, gain]
  const D = (k, t, d, a = 1) => { (c[k] = c[k] || []).push([+t.toFixed(3), d, a]); };
  ['sparkle', 'swish', 'flip', 'boing', 'thud', 'suck', 'whirl'].forEach(k => c[k] = c[k] || []);
  ['draw', 'rip', 'plane', 'swell', 'rise', 'counter', 'ratchet', 'waves'].forEach(k => c[k] = c[k] || []);

  // transitions by type
  [24, 64, 91, 130].forEach(t => D('rip', t - 0.05, 0.7, 1));              // paper tear wipes
  [9, 46, 117].forEach(t => [0.45, 0.33, 0.21].forEach((o, i) => add('swish', t - o, 0.8 - i * 0.15))); // stripes
  [29, 104, 143, 169].forEach(t => D('swell', t - 0.1, 0.8, 0.9));        // iris
  // intro
  add('swish', 0.15, 0.9); add('sparkle', 0.2, 0.9);
  D('draw', 1.95, 0.6, 1); D('draw', 4.5, 0.5, 0.7);
  // team
  D('draw', 9.85, 0.45, 0.6);
  D('ratchet', 9.5, 5.0, 0); D('ratchet', 14.5, 4.3, 1);                 // stuck gears / spinning gears
  add('sparkle', 14.5, 0.8); add('swish', 18.8, 0.9);
  D('draw', 19.0, 0.4, 0.6);
  for (let i = 0; i < 5; i++) add('thud', 19.45 + i * 0.15, 0.7 + i * 0.08);
  D('draw', 19.9, 0.6, 0.8); D('rise', 19.9, 0.7, 0.6);
  [21.2, 21.6, 22.0].forEach(t => add('swish', t, 0.5));
  // portrait
  add('swish', 24.2, 0.8); add('sparkle', 24.6, 0.7);
  // map
  add('pop', 29.3, 0.8);
  for (let k = 1; k < 6; k++) {
    const a = 29 + 0.6 + 2.7 * k;
    add('swish', a - 1.1, 0.6);                                            // card leaves
    if (k === 4) D('swell', a - 1.1, 1.1, 0.8);                            // zoom out to the world
    else if (k === 5) { D('swell', a - 1.1, 0.7, 0.6); D('plane', a - 0.4, 0.5, 0.7); }
    else D('plane', a - 1.1, 1.1, 1);
  }
  for (let k = 0; k < 6; k++) { const a = 29 + 0.6 + 2.7 * k; if (k !== 4) add('thud', a - 0.02, 0.6); add('swish', a + 0.05, 0.55); }
  // book
  D('counter', 46.4, 2.2, 1); D('draw', 46.5, 0.4, 0.6);
  D('rise', 49.5, 1.0, 0.6); add('sparkle', 53.4, 0.8);
  [53.9, 54.4].forEach(t => add('swish', t, 0.6));
  D('rip', 57.3, 0.5, 0.7);
  // framework
  [65.8, 66.1, 66.4].forEach(t => D('draw', t, 0.5, 0.6));
  add('pop', 66.6, 0.9); add('swish', 68.2, 0.8); add('swish', 68.7, 0.6);
  add('swish', 71.6, 0.8); D('draw', 72.2, 0.4, 0.6);
  add('boing', 72.8, 0.6); add('boing', 73.55, 1); add('boing', 74.55, 1);
  add('whirl', 75.6, 0.9);
  // habits
  for (let i = 0; i < 7; i++) {
    const T0 = 78 + 13 * i;
    add('sparkle', T0 + 0.8, 0.6); add('swish', T0 + 1.6, 0.8);
    add('flip', T0 + 5.14, 1); add('flip', T0 + 8.64, 1);
    add('swish', T0 + 12.5, 0.8);
    if (i === 0) D('rise', T0 + 3, 5, 0.3);
    if (i === 2) add('sparkle', T0 + 2.0, 0.8);
    if (i === 3) D('rise', T0 + 2.5, 0.8, 0.6);
    if (i === 4) D('waves', T0 + 1.0, 11.4, 0.5);
    if (i === 5) { add('swish', T0 + 1.3, 0.8); add('swish', T0 + 1.35, 0.7); for (let k = 0; k < 5; k++) add('pop', T0 + 2.5 + k * 0.12, 0.6); }
    if (i === 6) for (let k = 0; k < 4; k++) add('pop', T0 + 2.3 + k * 0.2, 0.6);
  }
  // outro
  add('suck', 172.0, 1); add('sparkle', 172.6, 1); add('swish', 174.5, 0.8);

  c.SCENES = SCENES;
  root.CUES = c;
})(typeof window !== 'undefined' ? window : module.exports);
