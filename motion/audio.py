"""Procedural soundtrack + SFX for the motion piece.
Usage: node -e "console.log(JSON.stringify(require('./cues.js').CUES))" > cues.json && python3 audio.py cues.json out.wav
Music: 124 BPM upbeat pop groove (Am–F–C–G), arranged around the scene structure.
SFX: whooshes, paper, pops, impacts, dings, ticks, risers — timed from cues.js.
"""
import json, sys, wave
import numpy as np

SR = 48000
DUR = 180.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

cues = json.load(open(sys.argv[1]))
out_path = sys.argv[2]

L = np.zeros(N); R = np.zeros(N)

def place(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i + len(sig) <= 0:
        return
    j = min(N, i + len(sig))
    s = sig[: j - i] * gain
    L[i:j] += s * np.sqrt(0.5 * (1 - pan)) * 1.414
    R[i:j] += s * np.sqrt(0.5 * (1 + pan)) * 1.414

def env(n, a, d):
    e = np.ones(n)
    na = max(1, int(a * SR)); na = min(na, n)
    e[:na] = np.linspace(0, 1, na)
    e *= np.exp(-np.arange(n) / (d * SR))
    return e

def lowpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y

def onepole_lp_fast(x, fc):
    # vectorised-ish one-pole via scipy-free filtering using cumulative approach in blocks
    a = np.exp(-2 * np.pi * fc / SR)
    from itertools import accumulate
    return np.fromiter(accumulate(x * (1 - a), lambda acc, v: acc * a + v), float, len(x))

def noise(n):
    return rng.standard_normal(n)

# ------------------------------------------------------------ instruments
def kick():
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 7.5)
    s += 0.25 * noise(n) * np.exp(-t * 180)
    return np.tanh(s * 1.6)

def clap():
    n = int(0.3 * SR); t = np.arange(n) / SR
    nz = noise(n)
    nz = nz - onepole_lp_fast(nz, 900)
    e = np.exp(-t * 22)
    for d in (0.0, 0.011, 0.022):
        e += np.where(t > d, np.exp(-(t - d) * 120), 0) * 0.6
    return nz * e * 0.5

def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR); t = np.arange(n) / SR
    nz = noise(n); nz = nz - onepole_lp_fast(nz, 6000)
    return nz * np.exp(-t * (14 if open_ else 70)) * 0.35

def note_freq(m):
    return 440.0 * 2 ** ((m - 69) / 12)

def saw(f, n, detune=0.0):
    t = np.arange(n) / SR
    s = 2 * ((t * f) % 1) - 1
    if detune:
        s = 0.5 * s + 0.5 * (2 * ((t * f * (1 + detune)) % 1) - 1)
    return s

def bass_note(m, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    f = note_freq(m)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sign(np.sin(2 * np.pi * f * t)) * 0.5
    s = onepole_lp_fast(s, 500)
    return s * env(n, 0.004, dur * 0.7) * 0.9

def pluck(m, dur=0.22):
    n = int(dur * SR)
    s = saw(note_freq(m), n, 0.004)
    s = onepole_lp_fast(s, 2600)
    return s * env(n, 0.002, 0.09) * 0.35

def pad(ms, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.zeros(n)
    for m in ms:
        s += saw(note_freq(m), n, 0.006)
    s = onepole_lp_fast(s, 1200) / len(ms)
    e = np.minimum(1, t / 0.25) * np.minimum(1, (dur - t) / 0.3).clip(0)
    return s * e * 0.28

# ------------------------------------------------------------ arrangement
BPM = 124; BEAT = 60 / BPM; BAR = BEAT * 4
CH = [(57, [69, 72, 76]), (53, [65, 69, 72]), (48, [67, 72, 76]), (55, [67, 71, 74])]  # Am F C G

def section(t):
    """intensity flags per time."""
    if t < 2.0: return dict(k=0, h=0, b=0, c=0, p=1, pl=0.6)
    if t < 9: return dict(k=1, h=0.5, b=1, c=0, p=1, pl=0.8)
    if t < 24: return dict(k=1, h=1, b=1, c=1, p=1, pl=1)
    if t < 46: return dict(k=1, h=0.6, b=1, c=1, p=1, pl=0.8)
    if t < 64: return dict(k=1, h=1, b=1, c=1, p=1, pl=1)
    if t < 78: return dict(k=0, h=0.4, b=0.6, c=0, p=1, pl=0.9)
    if t < 172.6: return dict(k=1, h=1, b=1, c=1, p=1, pl=1)
    if t < 177.6: return dict(k=1, h=0.7, b=1, c=1, p=1, pl=0.8)
    return dict(k=0, h=0, b=0, c=0, p=0, pl=0)

K = kick(); C = clap(); HC = hat(); HO = hat(True)
music_L = np.zeros(N); music_R = np.zeros(N)
def mplace(sig, t, g=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N: return
    j = min(N, i + len(sig)); s = sig[: j - i] * g
    music_L[i:j] += s * (1 - max(0, pan)); music_R[i:j] += s * (1 + min(0, pan))

nbars = int(DUR / BAR) + 1
pad_cache = {}
for b in range(nbars):
    t0 = b * BAR
    root, tri = CH[b % 4]
    sec = section(t0)
    if sec['p']:
        key = b % 4
        if key not in pad_cache: pad_cache[key] = pad(tri, BAR)
        mplace(pad_cache[key], t0, 0.9)
    for beat in range(4):
        tb = t0 + beat * BEAT
        s = section(tb)
        if s['k']: mplace(K, tb, 0.95)
        if s['c'] and beat in (1, 3): mplace(C, tb, 0.7, 0.1)
        if s['h']:
            mplace(HC, tb + BEAT / 2, 0.8 * s['h'], 0.35)
            mplace(HC, tb + BEAT / 4 * 3, 0.35 * s['h'], -0.35)
            if beat == 3: mplace(HO, tb + BEAT / 2, 0.5 * s['h'], 0.3)
        if s['b']:
            for e8 in range(2):
                m = root - 12 + (12 if (beat * 2 + e8) % 4 == 3 else 0)
                mplace(bass_note(m, BEAT / 2 * 0.9), tb + e8 * BEAT / 2, 0.55 * s['b'])
        if s['pl']:
            arp = [tri[0], tri[1], tri[2], tri[1] + 12 if beat % 2 else tri[2] + 12]
            for k16 in range(4):
                mplace(pluck(arp[k16] + (0 if b % 8 < 4 else 12 if k16 == 3 else 0)), tb + k16 * BEAT / 4, 0.5 * s['pl'], -0.4 + 0.25 * k16)

# fade tail
fade = np.ones(N); ft = np.arange(N) / SR
fade *= np.clip((DUR - 0.2 - ft) / 2.2, 0, 1)
fade *= np.clip(ft / 0.4, 0, 1)
music_L *= fade; music_R *= fade

# ------------------------------------------------------------ SFX
def whoosh(g=1):
    n = int(0.55 * SR); t = np.arange(n) / SR
    nz = noise(n)
    # sweep: blend low- & high-passed content over time
    lo = onepole_lp_fast(nz, 700); hi = nz - onepole_lp_fast(nz, 2500)
    x = t / t[-1]
    s = lo * (1 - x) + hi * x
    e = np.sin(np.pi * np.clip(x * 1.15, 0, 1)) ** 2
    return s * e * 0.45 * g

def impact():
    n = int(0.9 * SR); t = np.arange(n) / SR
    f = 40 + 90 * np.exp(-t * 16)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4.5)
    nz = onepole_lp_fast(noise(n), 1800) * np.exp(-t * 18) * 0.8
    return np.tanh((s + nz) * 1.4) * 0.8

def popsfx():
    n = int(0.09 * SR); t = np.arange(n) / SR
    f = 1100 * np.exp(-t * 30) + 280
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 45) * 0.35

def paper():
    n = int(0.35 * SR); t = np.arange(n) / SR
    nz = noise(n); nz = nz - onepole_lp_fast(nz, 1500)
    crackle = (rng.random(n) < 0.02) * rng.standard_normal(n) * 3
    e = np.exp(-t * 9) * (1 - np.exp(-t * 200))
    return (nz * 0.35 + crackle) * e * 0.35

def ding():
    n = int(1.2 * SR); t = np.arange(n) / SR
    s = np.zeros(n)
    for f, a, d in ((1318.5, 1, 2.2), (2637, 0.4, 3.5), (1975.5, 0.3, 2.8), (3951, 0.12, 5)):
        s += a * np.sin(2 * np.pi * f * t) * np.exp(-t * d)
    return s * 0.18 * (1 - np.exp(-t * 400))

def tick():
    n = int(0.05 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 2400 * t) + 0.5 * noise(n)) * np.exp(-t * 120) * 0.25

def scratch():
    n = int(0.3 * SR); t = np.arange(n) / SR
    nz = noise(n); nz = nz - onepole_lp_fast(nz, 3000)
    am = 0.5 + 0.5 * np.sin(2 * np.pi * 38 * t)
    return nz * am * np.sin(np.pi * t / t[-1]) * 0.3

def riser(dur):
    n = int(dur * SR); t = np.arange(n) / SR; x = t / dur
    f = 200 + 1400 * x ** 2
    s = saw(1, 1)  # placeholder
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3
    nz = noise(n); nz = nz - onepole_lp_fast(nz, 800 + 6000 * x.mean())
    return (tone + nz * 0.4) * x ** 2 * 0.5

W_ = whoosh(); IMPc = impact(); PAP = paper(); DING = ding(); TICK = tick(); SCR = scratch()
for t, a in cues['whoosh']: place(whoosh(a), t, 0.9, rng.uniform(-0.3, 0.3))
for t, a in cues['impact']: place(IMPc, t, 0.75 * a)
for t, a in cues['pop']:
    p = popsfx() if rng.random() < 0.5 else popsfx()[::1]
    place(p * (0.9 + rng.random() * 0.3), t, 0.8 * a, rng.uniform(-0.5, 0.5))
for t, a in cues['paper']: place(PAP, t, 0.9 * a, rng.uniform(-0.4, 0.4))
for t, a in cues['ding']: place(DING, t, a, 0.1)
for t, a in cues['tick']: place(TICK, t, a, -0.2)
for t, a in cues['scratch']: place(SCR, t, a, 0.2)
for t, d in cues['riser']: place(riser(d), t, 0.8)

mixL = music_L * 0.42 + L; mixR = music_R * 0.42 + R
mix = np.stack([mixL, mixR], 1)
mix = np.tanh(mix * 1.1)
mix /= np.max(np.abs(mix)) / 0.89
pcm = (mix * 32767).astype('<i2')
with wave.open(out_path, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('wrote', out_path)
