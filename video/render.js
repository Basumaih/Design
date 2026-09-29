// Renders index.html frame-by-frame with headless Chromium and encodes an MP4.
// Usage: node render.js [out.mp4]   (env: FPS=30 SUB=2 for 2-sample motion blur)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { spawn, execSync } = require('child_process');
const FF = process.env.FFMPEG || execSync('python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"').toString().trim();
const FPS = +(process.env.FPS || 30), SUB = +(process.env.SUB || 2), OUT = process.argv[2] || 'edialogue-showreel.mp4';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + __dirname + '/index.html'); await p.evaluate(() => document.fonts.ready);
  const dur = await p.evaluate(() => DURATION), frames = Math.round(dur * FPS * SUB);
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-c:v', 'mjpeg', '-i', '-', '-i', 'soundtrack.wav',
    '-vf', (SUB > 1 ? `tmix=frames=${SUB}:weights=${'1 '.repeat(SUB).trim()},fps=${FPS},` : '') + 'format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '256k', '-shortest', OUT];
  const ff = spawn(FF, args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    const t = i / (FPS * SUB);
    await p.evaluate(([t, f]) => render(t, f), [t, Math.floor(i / SUB)]);
    const buf = await p.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 120 === 0) console.log(`frame ${i}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
  console.log('done', OUT, ((Date.now() - t0) / 1000).toFixed(0) + 's');
})();
