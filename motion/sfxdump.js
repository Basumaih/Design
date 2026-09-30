// Dry-run every frame and collect kinetic-text onsets for the sound design: node sfxdump.js out.json [workers]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const out = process.argv[2] || 'build/words.json', workers = +(process.argv[3] || 4);
  const N = 180 * 60, chunk = Math.ceil(N / workers);
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const parts = await Promise.all([...Array(workers)].map(async (_, w) => {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    await page.goto('file://' + path.resolve(__dirname, 'index.html') + '?render=1');
    await page.waitForFunction(() => window.READY === true);
    return page.evaluate(([a, b]) => { window.SFXLOG = []; for (let f = a; f < b; f++) renderFrame(f / 60); return window.SFXLOG; }, [w * chunk, Math.min(N, (w + 1) * chunk)]);
  }));
  await browser.close();
  const all = parts.flat().sort((p, q) => p[0] - q[0]);
  fs.writeFileSync(out, JSON.stringify(all));
  console.log(all.length, 'word events');
})();
