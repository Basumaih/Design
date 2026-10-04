// Deterministic frame renderer.
//   node render.mjs stills 0.5,3.2,...      -> out/stills/t_XX.png
//   node render.mjs video [workers]         -> out/video_noaudio.mp4
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const TL = JSON.parse(fs.readFileSync(path.join(ROOT, 'timeline.json'), 'utf8'));
const FPS = TL.fps, TOTAL = Math.round(TL.duration * FPS);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(rsp);
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.evaluate(() => window.ready);
  return page;
}
const launch = () => chromium.launch({ args: ['--disable-gpu', '--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'] });

async function grab(page, t) {
  await page.evaluate(tt => window.renderFrame(tt), t);
  return page.locator('#c').screenshot({ type: 'png' });
}

async function stills(times) {
  const srv = await serve(); const browser = await launch(); const page = await openPage(browser, srv.address().port);
  fs.mkdirSync(path.join(ROOT, 'out/stills'), { recursive: true });
  for (const t of times) {
    const buf = await grab(page, t);
    const f = path.join(ROOT, `out/stills/t_${t.toFixed(2).padStart(5, '0')}.png`);
    fs.writeFileSync(f, buf); console.log(f);
  }
  await browser.close(); srv.close();
}

async function renderRange(browser, port, a, b, outFile) {
  const page = await openPage(browser, port);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(FPS), outFile], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = a; f < b; f++) {
    const buf = await grab(page, f / FPS);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - a) % 120 === 0) console.log(`[${path.basename(outFile)}] frame ${f}/${b} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await page.close();
}

async function video(workers = 4) {
  const srv = await serve(); const port = srv.address().port;
  const dir = path.join(ROOT, 'out/parts'); fs.mkdirSync(dir, { recursive: true });
  const per = Math.ceil(TOTAL / workers), parts = [];
  await Promise.all(Array.from({ length: workers }, async (_, i) => {
    const a = i * per, b = Math.min(TOTAL, a + per); if (a >= b) return;
    const browser = await launch(); const f = path.join(dir, `part${i}.mp4`); parts[i] = f;
    await renderRange(browser, port, a, b, f); await browser.close();
  }));
  fs.writeFileSync(path.join(dir, 'list.txt'), parts.filter(Boolean).map(p => `file '${p}'`).join('\n'));
  await new Promise(r => spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'), '-c', 'copy', path.join(ROOT, 'out/video_noaudio.mp4')], { stdio: 'inherit' }).on('close', r));
  srv.close(); console.log('done: out/video_noaudio.mp4');
}

const [mode, arg] = process.argv.slice(2);
if (mode === 'stills') await stills(arg.split(',').map(Number));
else if (mode === 'video') await video(Number(arg) || 4);
else console.log('usage: node render.mjs stills 1,2,3 | video [workers]');
