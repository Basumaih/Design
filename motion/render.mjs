// Usage: node render.mjs stills <out_dir> t1 t2 ...   |   node render.mjs video <out.mp4> [workers]
import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('/opt/node22/lib/node_modules/playwright');
import http from 'http'; import fs from 'fs'; import path from 'path'; import { spawn } from 'child_process';
const ROOT = path.dirname(new URL(import.meta.url).pathname);
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
await new Promise(r => server.listen(0, r));
const url = `http://127.0.0.1:${server.address().port}/index.html?render=1`;
const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });
async function newPage() {
  const p = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.error('PAGE ERROR', e.message));
  await p.goto(url); await p.evaluate(() => window.ready); return p;
}
const grab = (p, t, fmt) => p.evaluate(([t, fmt]) => { render(t); return document.getElementById('c').toDataURL(fmt, 0.96).split(',')[1]; }, [t, fmt]);
const [mode, out, ...rest] = process.argv.slice(2);
if (mode === 'stills') {
  fs.mkdirSync(out, { recursive: true }); const p = await newPage();
  for (const t of rest) fs.writeFileSync(path.join(out, `t${(+t).toFixed(2).padStart(6, '0')}.png`), Buffer.from(await grab(p, +t, 'image/png'), 'base64'));
  fs.writeFileSync(path.join(out, 'sfx.json'), JSON.stringify(await p.evaluate(() => window.SFX), null, 1));
} else {
  const FPS = 60, N = 60 * FPS, workers = +(rest[0] || 4), per = Math.ceil(N / workers), t0 = Date.now();
  let done = 0;
  const parts = await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const p = await newPage(), a = w * per, b = Math.min(N, a + per), part = `${out}.part${w}.mp4`;
    const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-r', String(FPS), part], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = a; f < b; f++) {
      const buf = Buffer.from(await grab(p, f / FPS, 'image/jpeg'), 'base64');
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (++done % 120 === 0) console.log(`${done}/${N} frames · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r)); return part;
  }));
  fs.writeFileSync(`${out}.list`, parts.map(p => `file '${path.resolve(p)}'`).join('\n'));
  fs.writeFileSync(`${out}.sfx.json`, JSON.stringify(await (await newPage()).evaluate(() => window.SFX)));
}
await browser.close(); server.close();
