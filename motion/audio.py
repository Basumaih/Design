"""Motion-reactive sound design (no music).
Usage:
  node -e "console.log(JSON.stringify(require('./cues.js').CUES))" > build/cues.json
  node sfxdump.js build/words.json          # onset of every kinetic word, logged from the animation itself
  python3 audio.py build/cues.json build/words.json build/audio.wav

Every sound is synthesised (numpy only) and placed on a cue: transitions, paper, pops,
impacts, drawing, gears, the map flight, card flips, jumps, and every word that animates in.
"""
import json, sys, wave
from itertools import accumulate
import numpy as np

SR = 48000
DUR = 180.0
N = int(SR * DUR)
rng = np.random.default_rng(11)

cues = json.load(open(sys.argv[1]))
words = json.load(open(sys.argv[2]))
out_path = sys.argv[3]

L = np.zeros(N); R = np.zeros(N)

def place(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i + len(sig) <= 0 or gain == 0:
        return
    if i < 0:
        sig = sig[-i:]; i = 0
    j = min(N, i + len(sig))
    s = sig[: j - i] * gain
    L[i:j] += s * np.sqrt(0.5 * (1 - pan)) * 1.414
    R[i:j] += s * np.sqrt(0.5 * (1 + pan)) * 1.414

def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    return np.fromiter(accumulate(x * (1 - a), lambda acc, v: acc * a + v), float, len(x))

def hp(x, fc):
    return x - lp(x, fc)

def bp(x, lo, hi):
    return lp(hp(x, lo), hi)

def noise(n):
    return rng.standard_normal(n)

def tvec(d):
    n = max(1, int(d * SR)); return np.arange(n) / SR

def sweep_filter(x, f0, f1):
    """one-pole low-pass with a cutoff that glides from f0 to f1 (log)."""
    fc = np.exp(np.linspace(np.log(f0), np.log(f1), len(x)))
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)):
        acc = acc * a[i] + x[i] * (1 - a[i]); y[i] = acc
    return y

def chirp(f, t):
    return np.sin(2 * np.pi * np.cumsum(f) / SR)

# ------------------------------------------------------------ sound palette
def whoosh(d=0.55, up=True):
    t = tvec(d); x = t / d
    s = sweep_filter(noise(len(t)), 300 if up else 5000, 5000 if up else 300)
    e = np.sin(np.pi * np.clip(x * 1.1, 0, 1)) ** 2
    return s * e * 0.9

def swish():
    t = tvec(0.22); x = t / t[-1]
    s = hp(sweep_filter(noise(len(t)), 1500, 9000), 900)
    return s * np.sin(np.pi * x) ** 1.5 * 0.9

def impact():
    t = tvec(0.9)
    s = chirp(42 + 95 * np.exp(-t * 16), t) * np.exp(-t * 4.5)
    nz = lp(noise(len(t)), 1800) * np.exp(-t * 18) * 0.8
    return np.tanh((s + nz) * 1.5) * 0.9

def thud():
    t = tvec(0.25)
    s = chirp(70 + 120 * np.exp(-t * 40), t) * np.exp(-t * 18)
    return np.tanh(s * 1.3 + lp(noise(len(t)), 900) * np.exp(-t * 60) * 0.5) * 0.7

def slam():  # chunky word slam
    t = tvec(0.3)
    body = chirp(95 + 160 * np.exp(-t * 35), t) * np.exp(-t * 14)
    click = bp(noise(len(t)), 800, 4000) * np.exp(-t * 90) * 0.7
    return np.tanh((body + click) * 1.4) * 0.8

def bubble(f0=900):
    t = tvec(0.1)
    f = f0 * (1 + 0.9 * np.exp(-t * 60)) * (0.8 + 0.4 * t / t[-1])
    return chirp(f, t) * np.exp(-t * 40) * 0.45

def keytick():
    t = tvec(0.03)
    return (bp(noise(len(t)), 1500, 6000) * 0.8 + np.sin(2 * np.pi * 1900 * t) * 0.3) * np.exp(-t * 180) * 0.35

def paper():
    t = tvec(0.35)
    nz = hp(noise(len(t)), 1500)
    crackle = (rng.random(len(t)) < 0.02) * rng.standard_normal(len(t)) * 3
    return (nz * 0.35 + crackle) * np.exp(-t * 9) * (1 - np.exp(-t * 200)) * 0.4

def rip(d):
    t = tvec(d); x = t / d
    grains = (rng.random(len(t)) < 0.05 + 0.25 * x) * rng.standard_normal(len(t))
    s = bp(grains * 2 + noise(len(t)) * 0.3, 700, 6000)
    return s * np.sin(np.pi * np.clip(x * 1.05, 0, 1)) ** 0.7 * 0.55

def flip():
    out = np.zeros(int(0.3 * SR))
    for k, off in enumerate((0.0, 0.11)):
        t = tvec(0.12)
        s = bp(noise(len(t)), 1200, 7000) * np.exp(-t * (45 + 25 * k))
        s += chirp(np.full(len(t), 200 - 60 * k), t) * np.exp(-t * 60) * 0.4
        i = int(off * SR); out[i:i + len(s)] += s * (0.8 - 0.2 * k)
    return out * 0.7

def ding():
    t = tvec(1.2); s = np.zeros(len(t))
    for f, a, d in ((1318.5, 1, 2.2), (2637, 0.4, 3.5), (1975.5, 0.3, 2.8), (3951, 0.12, 5)):
        s += a * np.sin(2 * np.pi * f * t) * np.exp(-t * d)
    return s * 0.2 * (1 - np.exp(-t * 400))

def sparkle():
    out = np.zeros(int(0.6 * SR))
    for k in range(7):
        t = tvec(0.18); f = rng.uniform(2200, 6000)
        s = np.sin(2 * np.pi * f * t) * np.exp(-t * 30) * (1 - np.exp(-t * 800))
        i = int(rng.uniform(0, 0.4) * SR); out[i:i + len(s)] += s * rng.uniform(0.3, 0.7)
    return out * 0.25

def tick():
    t = tvec(0.05)
    return (np.sin(2 * np.pi * 2400 * t) + 0.5 * noise(len(t))) * np.exp(-t * 120) * 0.3

def clunk():
    t = tvec(0.12)
    return (chirp(np.full(len(t), 180.0), t) * 0.6 + bp(noise(len(t)), 500, 3000)) * np.exp(-t * 50) * 0.5

def scratch():
    t = tvec(0.3)
    am = 0.5 + 0.5 * np.sin(2 * np.pi * 38 * t)
    return hp(noise(len(t)), 3000) * am * np.sin(np.pi * t / t[-1]) * 0.35

def draw(d):  # marker on paper: squeaky band-limited noise, stroke-modulated
    t = tvec(d); x = t / d
    strokes = 0.55 + 0.45 * np.sin(2 * np.pi * (6 + 3 * x) * t) ** 2
    s = bp(noise(len(t)), 1800, 5500) * strokes
    s += np.sin(2 * np.pi * (1400 + 300 * np.sin(2 * np.pi * 5 * t)) * t) * 0.05
    return s * np.sin(np.pi * np.clip(x, 0, 1)) ** 0.5 * 0.4

def plane(d):  # flight: swelling air + doppler-ish tone
    t = tvec(d); x = t / d
    air = sweep_filter(noise(len(t)), 400, 2500)
    tone = chirp(220 + 180 * np.sin(np.pi * x), t) * 0.12
    return (air * 0.8 + tone) * np.sin(np.pi * x) ** 1.2 * 0.9

def swell(d):  # zoom / iris: rising air that cuts off
    t = tvec(d); x = t / d
    s = sweep_filter(noise(len(t)), 200, 6000)
    return s * x ** 2 * (1 - np.exp(-(1 - x) * 40)) * 0.8

def rise(d):  # soft rising glissando (growth)
    t = tvec(d); x = t / d
    s = chirp(300 * 2 ** (1.6 * x), t) * 0.5 + chirp(450 * 2 ** (1.6 * x), t) * 0.25
    return s * np.sin(np.pi * x) ** 0.8 * 0.22

def boing():
    t = tvec(0.35); x = t / t[-1]
    f = 260 + 380 * np.sin(np.pi * x * 0.9)
    return chirp(f, t) * np.exp(-t * 7) * (1 - np.exp(-t * 300)) * 0.3

def whirl():
    t = tvec(0.7)
    am = 0.5 + 0.5 * np.sin(2 * np.pi * (4 + 8 * t / t[-1]) * t)
    return whoosh(0.7) * am

def riser(d):
    t = tvec(d); x = t / d
    tone = chirp(200 + 1400 * x ** 2, t) * 0.25
    nz = sweep_filter(noise(len(t)), 500, 7000) * 0.5
    return (tone + nz) * x ** 2 * 0.5

def counter_ticks(t0, d, g):
    # ticks follow the eased 0→200 counter (one tick every 5 numbers)
    ts = np.arange(0, d, 1 / 600)
    x = ts / d; e = np.where(x < .5, 4 * x ** 3, 1 - (-2 * x + 2) ** 3 / 2)
    v = np.floor(e * 200 / 5)
    for k in np.nonzero(np.diff(v) > 0)[0]:
        place(TICK, t0 + ts[k + 1], g * 0.7, rng.uniform(-0.2, 0.2))
    place(DING, t0 + d, 0.5 * g)

def ratchet(t0, d, mode, g=1.0):
    if mode == 0:  # stuck gear: irregular stutter with clunks
        t = t0
        while t < t0 + d:
            place(TICK, t, 0.5 * g, -0.3); t += rng.uniform(0.22, 0.45)
            if rng.random() < 0.3: place(CLUNK, t, 0.6 * g, 0.2); t += 0.25
    else:          # spinning fast: rate ramps up then steady
        t = t0
        while t < t0 + d:
            u = (t - t0) / d
            place(TICK, t, (0.35 + 0.15 * rng.random()) * g * (1 - max(0, u - 0.85) * 5), rng.uniform(-0.4, 0.4))
            t += 1 / (5 + 13 * min(1, (t - t0) / 0.6))

def waves(t0, d, g):
    k = 0
    while k * 0.36 < d:
        place(swell(0.3) * 0.5, t0 + k * 0.36, g * 0.35, -0.3); k += 1

# ------------------------------------------------------------ place everything
TICK = tick(); CLUNK = clunk(); DING = ding(); IMP = impact(); THUD = thud(); PAP = paper(); FLIP = flip()
SLAM = slam(); KEY = keytick(); SCR = scratch()

for t, a in cues['whoosh']: place(whoosh(0.55), t, 0.8 * a, rng.uniform(-0.3, 0.3))
for t, a in cues['impact']: place(IMP, t, 0.8 * a)
for t, a in cues['pop']: place(bubble(rng.uniform(700, 1200)), t, 0.8 * a, rng.uniform(-0.5, 0.5))
for t, a in cues['paper']: place(PAP, t, a, rng.uniform(-0.4, 0.4))
for t, a in cues['ding']: place(DING, t, a, 0.1)
for t, a in cues['tick']: place(TICK, t, a, -0.2)
for t, a in cues['scratch']: place(SCR, t, a, 0.2)
for t, d in cues['riser']: place(riser(d), t, 0.7)
for t, a in cues['swish']: place(swish(), t, 0.7 * a, rng.uniform(-0.5, 0.5))
for t, a in cues['sparkle']: place(sparkle(), t, a, rng.uniform(-0.3, 0.3))
for t, a in cues['flip']: place(FLIP, t, a, 0.15)
for t, a in cues['boing']: place(boing(), t, a)
for t, a in cues['thud']: place(THUD, t, a, rng.uniform(-0.3, 0.3))
for t, a in cues['suck']: place(whoosh(0.6, up=False), t, 0.9 * a)
for t, a in cues['whirl']: place(whirl(), t, 0.7 * a)
for t, d, a in cues['draw']: place(draw(d), t, a, rng.uniform(-0.3, 0.3))
for t, d, a in cues['rip']: place(rip(d), t, a, 0.2)
for t, d, a in cues['plane']: place(plane(d), t, a, 0)
for t, d, a in cues['swell']: place(swell(d), t, a)
for t, d, a in cues['rise']: place(rise(d), t, a)
for t, d, a in cues['counter']: counter_ticks(t, d, a)
for t, d, m in cues['ratchet']: ratchet(t, d, m)
for t, d, a in cues['waves']: waves(t, d, a)

# kinetic words — each word that animates in gets its own sound
last = {}
for t, kind, size, fam in words:
    if kind == 'slam':
        place(SLAM, t + 0.05, 0.55 * min(1.2, size / 130), rng.uniform(-0.3, 0.3))
    elif kind == 'pop' or kind == 'drop':
        f = 1400 - min(size, 140) * 5
        place(bubble(f * rng.uniform(0.9, 1.1)), t + 0.03, 0.32 * min(1, size / 90), rng.uniform(-0.5, 0.5))
    elif kind == 'rise':
        if t - last.get('rise', -1) < 0.025: continue   # keep the typing texture light
        place(KEY, t, 0.45 * rng.uniform(0.7, 1.0), rng.uniform(-0.4, 0.4)); last['rise'] = t
    elif kind == 'out':
        place(whoosh(0.35, up=False), t, 0.35, rng.uniform(-0.3, 0.3))

# very quiet paper-room tone so silences never feel digitally dead
room = lp(noise(N), 400) * 0.004
L += room; R += room

mix = np.stack([L, R], 1)
mix = np.tanh(mix * 1.6) / np.tanh(1.6)
mix /= np.max(np.abs(mix)) / 0.89
fade = np.clip((DUR - np.arange(N) / SR) / 0.5, 0, 1)[:, None]
pcm = (mix * fade * 32767).astype('<i2')
with wave.open(out_path, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('wrote', out_path)
