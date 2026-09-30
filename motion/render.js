// Parallel frame renderer: node render.js <outDir> [workers]
// Each worker renders a contiguous chunk in headless Chromium and pipes JPEG frames to ffmpeg.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = 60, DUR = 180, N = FPS * DUR;
(async () => {
  const outDir = process.argv[2] || 'build';
  const workers = +(process.argv[3] || 4);
  const from = +(process.env.FROM || 0), to = +(process.env.TO || N);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const chunk = Math.ceil((to - from) / workers);
  const t0 = Date.now();
  await Promise.all([...Array(workers)].map(async (_, w) => {
    const a = from + w * chunk, b = Math.min(to, a + chunk);
    if (a >= b) return;
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    page.on('pageerror', e => console.log('[error]', e.message));
    await page.goto('file://' + path.resolve(__dirname, 'index.html') + '?render=1');
    await page.waitForFunction(() => window.READY === true);
    const seg = path.join(outDir, `seg_${String(w).padStart(2, '0')}.mp4`);
    const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-g', '120', seg], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = a; f < b; f++) {
      const data = await page.evaluate(t => { renderFrame(t); return document.getElementById('c').toDataURL('image/jpeg', 0.95); }, f / FPS);
      const buf = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (w === 0 && (f - a) % 300 === 0) console.log(`w0 ${f - a}/${b - a} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }));
  await browser.close();
  console.log('done in', ((Date.now() - t0) / 1000).toFixed(0), 's');
})();
