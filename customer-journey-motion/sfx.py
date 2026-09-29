"""Render the sound-effects track (no music, no voice) for index.html.

Reads the event list the page derives from its own timeline (window.__sfx),
synthesises each effect from noise and simple oscillators, mixes them at their
times and writes sfx.mp3 next to the page.

Usage: NODE_PATH=<global node_modules> python3 sfx.py <ffmpeg>
"""
import json, pathlib, subprocess, sys, wave
import numpy as np
from scipy.signal import butter, sosfilt

HERE = pathlib.Path(__file__).parent
FFMPEG = sys.argv[1]
SR = 44100
rng = np.random.default_rng(7)

DUMP = """
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.route(/^https?:/, r => r.abort());
  await p.goto('file://' + process.argv[1] + '#rec');
  await p.waitForFunction(() => window.__sfx);
  console.log(JSON.stringify({dur: await p.evaluate(() => window.__DUR), ev: await p.evaluate(() => window.__sfx())}));
  await b.close();
})();
"""
out = subprocess.run(["node", "-e", DUMP, str((HERE / "index.html").resolve())], check=True,
                     capture_output=True, text=True).stdout
TL = json.loads(out.strip().splitlines()[-1])

# ---- building blocks -------------------------------------------------------
def n(sec): return int(sec * SR)
def tt(sec): return np.arange(n(sec)) / SR
def noise(sec): return rng.standard_normal(n(sec))
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)
def lp(x, f, order=2): return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)
def env(sec, a, r, shape=2.0):
    t = tt(sec); e = np.minimum(1, t / max(a, 1e-4)) * np.clip(1 - (t - a) / max(r, 1e-4), 0, 1) ** shape
    return e
def sweep_noise(sec, f0, f1, q=0.6, blocks=48):
    """Noise through a band-pass whose centre glides f0 -> f1 (a whoosh)."""
    x, out = noise(sec), np.zeros(n(sec))
    edges = np.linspace(0, len(x), blocks + 1).astype(int)
    for i in range(blocks):
        f = f0 * (f1 / f0) ** (i / (blocks - 1))
        lo, hi = f * (1 - q / 2), min(f * (1 + q / 2), SR / 2 - 100)
        seg = slice(max(0, edges[i] - 2048), edges[i + 1])
        out[edges[i]:edges[i + 1]] = bp(x[seg], lo, hi)[-(edges[i + 1] - edges[i]):]
    return out
def tone(sec, f0, f1=None, wave_="sine"):
    f1 = f0 if f1 is None else f1
    f = np.linspace(f0, f1, n(sec)); ph = 2 * np.pi * np.cumsum(f) / SR
    if wave_ == "sine": return np.sin(ph)
    if wave_ == "square": return np.tanh(3 * np.sin(ph))
    return 2 * ((ph / (2 * np.pi)) % 1) - 1  # saw
def norm(x, peak=1.0): return x / (np.abs(x).max() + 1e-9) * peak

# ---- effects ---------------------------------------------------------------
def whoosh_l(d):  d = max(d, .8); return norm(sweep_noise(d, 300, 3500, .9) * env(d, d * .55, d * .45, 1.5))
def whoosh(d):    d = .45;  return norm(sweep_noise(d, 500, 2600, .8) * env(d, .2, .25, 1.5))
def swish(d):     d = .22;  return norm(sweep_noise(d, 1500, 5000, .7) * env(d, .06, .16, 2))
def air(d):       d = .9;   return norm(lp(noise(d), 900) * env(d, .35, .55, 1.5)) * .8
def thud(d):      d = .3;   return norm(tone(d, 110, 45) * env(d, .004, .28, 3) + .3 * lp(noise(d), 300) * env(d, .002, .08, 2))
def pop(d):       d = .09;  return norm(tone(d, 950, 320) * env(d, .002, .085, 2.5) + .15 * hp(noise(d), 3000) * env(d, .001, .01))
def pop_s(d):     return pop(d) * .7
def rise(d):      d = max(d, .5); return norm(sweep_noise(d, 250, 1800, .5) * env(d, d * .8, d * .2, 1)) * .8
def draw(d):
    d = max(d, .4); t = tt(d)
    scratch = bp(noise(d), 2500, 6000) * (0.55 + 0.45 * np.abs(np.sin(2 * np.pi * 7 * t + 3 * np.sin(2 * np.pi * 1.3 * t))))
    return norm(scratch * env(d, .05, .1, 1) * np.clip((d - t) / .1, 0, 1))
def marker(d):    return draw(d) * .9
def tick(d):      d = .03;  return norm(hp(noise(d), 2500) * env(d, .0005, .02, 3) + .5 * tone(d, 3200) * env(d, .001, .025, 3))
def click(d):     d = .04;  return norm(hp(noise(d), 1500) * env(d, .0005, .03, 3)) * .8
def tap(d):       d = .05;  return norm(tone(d, 1800, 1400) * env(d, .002, .045, 3))
def swipe(d):     d = .3;   return norm(sweep_noise(d, 2000, 6000, .6) * env(d, .08, .22, 2)) * .7
def alert(d):
    x = np.concatenate([tone(.09, 220, 220, "square") * env(.09, .005, .08, 1), np.zeros(n(.05)), tone(.12, 200, 200, "square") * env(.12, .005, .11, 1)])
    return norm(lp(x, 1800))
def error(d):     d = .32;  return norm(lp(tone(d, 420, 180, "square") * env(d, .005, .3, 1.5), 2200))
def confirm(d):
    a = tone(.09, 880) * env(.09, .003, .085, 2); b = tone(.16, 1320) * env(.16, .003, .15, 2)
    return norm(np.concatenate([a, np.zeros(n(.03)), b]))
def beep(d):      d = .1;   return norm(tone(d, 1000) * env(d, .004, .09, 1.5))
def data(d):
    parts = []
    for f in (1500, 2100, 1800, 2600):
        parts += [tone(.035, f) * env(.035, .002, .03, 2), np.zeros(n(.025))]
    return norm(np.concatenate(parts))
def shutter(d):
    c = hp(noise(.025), 2000) * env(.025, .0005, .02, 3)
    return norm(np.concatenate([c, np.zeros(n(.07)), c * .8, lp(noise(.06), 1500) * env(.06, .002, .05) * .3]))
def scan(d):
    d = max(d, .3); t = tt(d)
    return norm(tone(d, 1500) * (0.5 + 0.5 * np.sin(2 * np.pi * 18 * t)) * env(d, .05, .1, 1) * np.clip((d - t) / .08, 0, 1)) * .6
def motor(d):
    d = max(d, .6); t = tt(d)
    whirr = lp(tone(d, 110, 170, "saw"), 900) + .3 * bp(noise(d), 400, 1200)
    return norm(whirr * np.minimum(1, t / .08) * np.clip((d - t) / .12, 0, 1))
def engine(d, f0=45, f1=60):
    d = max(d, .5); t = tt(d)
    rumble = lp(tone(d, f0, f1, "saw"), 260) + .5 * lp(noise(d), 180)
    return norm(rumble * np.minimum(1, t / .3) * np.clip((d - t) / .4, 0, 1)) * .9
def car_pass(d):
    d = max(d, .8); t = tt(d); x = engine(d, 55, 80)
    return norm(x * np.exp(-((t - d * .55) / (d * .35)) ** 2))
def car_short(d): return car_pass(1.1) * .8
def crowd(d):
    d = max(d, 1); t = tt(d)
    return norm((lp(noise(d), 220) + .4 * lp(tone(d, 50, 52, "saw"), 200)) * np.minimum(1, t / 1.0) * np.clip((d - t) / .6, 0, 1)) * .8
def horn(d):
    d = max(d, .2); x = lp(tone(d, 405, 405, "square") + tone(d, 510, 510, "square"), 2500)
    return norm(x * env(d, .01, d, .3))
def screech(d):   d = .35; t = tt(d); return norm(bp(noise(d), 2200, 3200) * (1 + .5 * np.sin(2 * np.pi * 40 * t)) * env(d, .02, .33, 1.5)) * .7
def step(d):      d = .06; return norm(lp(noise(d), 700) * env(d, .002, .05, 3))
def pour(d):
    d = max(d, .5); t = tt(d)
    g = bp(noise(d), 700, 1600) * (0.7 + 0.3 * np.sin(2 * np.pi * 9 * t + 2 * np.sin(2 * np.pi * 2.3 * t)))
    return norm(g * np.minimum(1, t / .2) * np.clip((d - t) / .3, 0, 1)) * .7

FX = {k.replace("_", "-"): v for k, v in globals().items() if callable(v) and v.__module__ == "__main__"
      and k not in {"n", "tt", "noise", "bp", "lp", "hp", "env", "sweep_noise", "tone", "norm"}}

# ---- mix -------------------------------------------------------------------
mix = np.zeros(n(TL["dur"] + 3))
missing = set()
for e in TL["ev"]:
    f = FX.get(e["k"])
    if not f:
        missing.add(e["k"]); continue
    x = f(e["d"]) * e["g"]
    i = n(e["t"]); mix[i:i + len(x)] += x[:len(mix) - i]
assert not missing, missing
mix = np.tanh(mix * 0.9)                      # gentle limiter
mix = mix / (np.abs(mix).max() + 1e-9) * 0.89  # about -1 dBFS
wav = HERE / "sfx.wav"
with wave.open(str(wav), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", str(wav), "-b:a", "128k", str(HERE / "sfx.mp3")], check=True)
wav.unlink()
print(len(TL['ev']), 'events,', f"{TL['dur']:.1f}s")
