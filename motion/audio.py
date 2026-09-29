"""Synthesises the soundtrack (music + SFX) for the motion piece.
Usage: python3 audio.py sfx.json out.wav
The cue sheet comes from motion.js (window.SFX) so picture and sound share one timeline."""
import json, sys, wave
import numpy as np

SR = 48000
DUR = 60.0
BPM = 128
BEAT = 60 / BPM
BAR = BEAT * 4
N = int(SR * (DUR + 0.5))
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)


def t_(d): return np.arange(int(d * SR)) / SR


def add(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N: return
    sig = sig[: N - i]
    L[i:i + len(sig)] += sig * gain * np.sqrt(0.5 * (1 - pan))
    R[i:i + len(sig)] += sig * gain * np.sqrt(0.5 * (1 + pan))


def env(n, a=0.005, d=0.2, curve=1.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d * curve)
    return e


def lp(x, fc):
    """one-pole low-pass; fc may be scalar or array"""
    fc = np.broadcast_to(np.asarray(fc, float), x.shape)
    a = 1 - np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc); y[i] = acc
    return y


def lp_fast(x, fc):
    from numpy.fft import rfft, irfft, rfftfreq
    X = rfft(x); f = rfftfreq(len(x), 1 / SR)
    return irfft(X / np.sqrt(1 + (f / fc) ** 4), len(x))


def hp_fast(x, fc):
    from numpy.fft import rfft, irfft, rfftfreq
    X = rfft(x); f = rfftfreq(len(x), 1 / SR)
    return irfft(X * (1 / np.sqrt(1 + (fc / np.maximum(f, 1)) ** 4)), len(x))


def bp_fast(x, lo, hi): return hp_fast(lp_fast(x, hi), lo)


def noise(d): return rng.standard_normal(int(d * SR))


def midi(m): return 440 * 2 ** ((m - 69) / 12)


def saw(f, d, detune=(0,)):
    t = t_(d); out = np.zeros_like(t)
    for dt in detune:
        ph = (f * (1 + dt) * t + rng.random()) % 1
        out += 2 * ph - 1
    return out / len(detune)


# ---------------- drums ----------------
def kick(big=False):
    d = 0.5 if not big else 1.1
    t = t_(d)
    f = 45 + 140 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * (7 if not big else 3.2))
    s[:200] += noise(200 / SR) * np.linspace(0.6, 0, 200)
    return np.tanh(s * 1.6)


def clap():
    n = noise(0.25); e = np.zeros_like(n)
    for k, o in enumerate([0, 0.011, 0.022]):
        i = int(o * SR); e[i:] += np.exp(-np.arange(len(e) - i) / SR * (60 if k < 2 else 18))
    return bp_fast(n * e, 900, 5000) * 0.9


def hat(open_=False):
    d = 0.25 if open_ else 0.06
    n = noise(d)
    return hp_fast(n, 7000) * env(len(n), 0.001, 0.08 if open_ else 0.018) * 0.6


def snare():
    n = noise(0.22); t = t_(0.22)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)
    return (bp_fast(n, 1500, 8000) * np.exp(-t * 22) * 0.7 + body * 0.5)


# ---------------- tonal ----------------
PROG = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [52, 55, 60]), (55, [55, 59, 62])]  # Am F C G


def pluck(m, d=0.35):
    f = midi(m); s = saw(f, d, (-0.004, 0.004))
    t = t_(d)
    return lp_fast(s * np.exp(-t * 9), 3200) * env(len(t), 0.002, 0.25)


def bass(m, d):
    f = midi(m - 24); t = t_(d)
    s = np.sin(2 * np.pi * f * t) * 0.8 + saw(f, d) * 0.25
    return lp_fast(s, 420) * env(len(t), 0.004, d * 0.6) * np.minimum(1, (d - t) * 60)


def pad(notes, d):
    t = t_(d); s = np.zeros_like(t)
    for m in notes:
        s += saw(midi(m), d, (-0.006, 0, 0.006))
    s = lp_fast(s / len(notes), 1400)
    a = np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.4)
    return s * a


# ---------------- sfx ----------------
def whoosh(d=0.6, up=True, lo=300, hi=6000):
    n = noise(d); t = t_(d)
    shape = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    y = bp_fast(n, lo, hi) * shape
    return y * 0.8


def riser(d):
    n = noise(d); t = t_(d)
    y = np.zeros_like(n)
    chunks = 24
    for k in range(chunks):
        a, b = int(k * len(n) / chunks), int((k + 1) * len(n) / chunks)
        fc = 300 + 7000 * (k / chunks) ** 2
        seg = bp_fast(n[a:b].copy(), fc * 0.6, fc * 1.4)
        y[a:b] = seg
    tone = np.sin(2 * np.pi * np.cumsum(200 + 900 * (t / d) ** 2) / SR) * 0.15
    return (y + tone) * (t / d) ** 2


def impact(big=False):
    k = kick(True) * 1.2
    n = noise(1.4); t = t_(1.4)
    boom = lp_fast(n, 180) * np.exp(-t * 2.5) * 2.2
    crash = hp_fast(noise(1.4), 3000) * np.exp(-t * 3.2) * (0.35 if big else 0.18)
    out = boom + crash
    out[:len(k)] += k
    return out


def pop(hi=False):
    d = 0.09; t = t_(d)
    f0 = (900 if hi else 520) * (1 + rng.random() * 0.25)
    f = f0 * (1 + 1.4 * np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.001, 0.03)


def swish():
    return whoosh(0.18, lo=1500, hi=9000) * 0.6


def pencil(d):
    n = noise(d); t = t_(d)
    grain = bp_fast(n, 2500, 9000)
    strokes = 0.55 + 0.45 * np.abs(np.sin(2 * np.pi * 5.5 * t + np.sin(t * 13)))
    flutter = 1 + 0.4 * rng.standard_normal(len(t)).clip(-2, 2) * 0.3
    fade = np.minimum(1, t / 0.03) * np.minimum(1, (d - t) / 0.05)
    return grain * strokes * flutter * fade * 0.35


def marker():
    d = 0.45; n = noise(d); t = t_(d)
    return bp_fast(n, 900, 4500) * np.sin(np.pi * t / d) * 0.5


def car(d, soft=False):
    t = t_(d)
    f = 70 + 35 * np.sin(np.pi * t / d)
    eng = saw(1, d) * 0
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sign(np.sin(3 * ph)) * 0.3)
    s = lp_fast(s, 900) * np.sin(np.pi * t / d) ** 1.5
    return s * (0.25 if soft else 0.5)


def vroom():
    d = 0.9; t = t_(d)
    f = 80 + 160 * np.sin(np.pi * t / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = lp_fast(np.sign(np.sin(ph)) * 0.5 + np.sin(2 * ph), 1500) * np.sin(np.pi * t / d) ** 2
    return s * 0.55 + whoosh(d, lo=200, hi=3000) * 0.5


def horn(hi=False):
    d = 0.32; t = t_(d); f = 410 if hi else 350
    s = np.sign(np.sin(2 * np.pi * f * t)) * 0.5 + np.sign(np.sin(2 * np.pi * f * 1.26 * t)) * 0.5
    return lp_fast(s, 2500) * env(len(t), 0.01, 0.5) * np.minimum(1, (d - t) * 40) * 0.35


def tick(d):
    out = np.zeros(int(d * SR))
    for k in range(int(d / 0.125)):
        i = int(k * 0.125 * SR); c = hp_fast(noise(0.02), 3000) * env(int(0.02 * SR), 0.0005, 0.004)
        out[i:i + len(c)] += c * (0.8 if k % 2 == 0 else 0.5)
    return out


def slash(): return whoosh(0.22, lo=800, hi=7000) * 1.2


def beep():
    out = np.zeros(int(0.5 * SR))
    for k in range(2):
        t = t_(0.09); s = np.sin(2 * np.pi * 1760 * t) * env(len(t), 0.002, 0.08)
        i = int(k * 0.14 * SR); out[i:i + len(s)] += s
    d = 0.5; t = t_(d)
    motor = lp_fast(saw(95, d), 600) * np.sin(np.pi * t / d) * 0.3
    return out * 0.4 + motor


def shutter():
    a = hp_fast(noise(0.03), 2000) * env(int(0.03 * SR), 0.0005, 0.006)
    out = np.zeros(int(0.2 * SR)); out[:len(a)] += a; i = int(0.07 * SR); out[i:i + len(a)] += a * 0.8
    return out * 1.2


def chime(notes=(76, 81, 88)):
    out = np.zeros(int(1.2 * SR))
    for k, m in enumerate(notes):
        t = t_(1.0); s = (np.sin(2 * np.pi * midi(m) * t) + 0.3 * np.sin(4 * np.pi * midi(m) * t)) * np.exp(-t * 4)
        i = int(k * 0.08 * SR); out[i:i + len(s)] += s * 0.3
    return out


def click():
    t = t_(0.03); return np.sin(2 * np.pi * 2400 * t) * env(len(t), 0.0005, 0.006) * 0.8


def ding(i):
    m = [72, 74, 76, 79, 84][i % 5]; t = t_(0.8)
    return (np.sin(2 * np.pi * midi(m) * t) + 0.4 * np.sin(2 * np.pi * midi(m + 12) * t)) * np.exp(-t * 5) * 0.32


def sparkle():
    out = np.zeros(int(1.0 * SR))
    for k in range(7):
        t = t_(0.4); m = 84 + [0, 3, 7, 10, 12, 15, 19][k]
        s = np.sin(2 * np.pi * midi(m) * t) * np.exp(-t * 9) * 0.15
        i = int(k * 0.06 * SR); out[i:i + len(s)] += s
    return out


def erase(d):
    n = noise(d); t = t_(d)
    rub = 0.5 + 0.5 * np.sin(2 * np.pi * 7 * t) ** 2
    return bp_fast(n, 400, 2500) * rub * np.sin(np.pi * t / d) * 0.5


def stamp():
    k = kick(True); out = impact(True); out[:len(k)] += k * 0.5
    thud = lp_fast(noise(0.2), 600) * env(int(0.2 * SR), 0.001, 0.05) * 1.5
    out[:len(thud)] += thud
    return out


def confetti():
    out = np.zeros(int(2.0 * SR))
    for k in range(40):
        c = hp_fast(noise(0.015), 5000) * env(int(0.015 * SR), 0.0005, 0.004) * (0.2 + rng.random() * 0.3)
        i = int((rng.random() ** 1.8) * 1.8 * SR); out[i:i + len(c)] += c
    return out


# ---------------- music ----------------
def section(t):
    if t < 3.75: return 'intro'
    if 18.75 <= t < 26.25: return 'tension'
    if 26.25 <= t < 28.125: return 'build'
    if t >= 59.0: return 'end'
    return 'full'


drums = np.zeros(N); music = np.zeros(N); bassb = np.zeros(N)


def put(buf, sig, at, g=1.0):
    i = int(at * SR)
    if i >= N: return
    sig = sig[: N - i]; buf[i:i + len(sig)] += sig * g


nbeats = int(DUR / BEAT)
for b in range(nbeats):
    t = b * BEAT; sec = section(t + 0.001)
    bar = int(t / BAR); root, chord = PROG[bar % 4]
    if sec == 'full':
        put(drums, kick(), t, 0.95)
        if b % 4 in (1, 3): put(drums, clap(), t, 0.5)
        put(drums, hat(), t + BEAT / 2, 0.35); put(drums, hat(), t + BEAT / 4, 0.12); put(drums, hat(), t + 3 * BEAT / 4, 0.12)
        put(bassb, bass(root, BEAT / 2 * 0.95), t + BEAT / 2, 0.55)
        for k in range(4):
            m = chord[[0, 1, 2, 1][k]] + (12 if (b + k) % 3 == 0 else 0)
            put(music, pluck(m + 12, 0.3), t + k * BEAT / 4, 0.16)
    elif sec == 'tension':
        if b % 2 == 0: put(drums, kick(), t, 0.8)
        if b % 4 == 3: put(drums, clap(), t, 0.25)
        put(drums, hat(), t + BEAT / 2, 0.18)
        put(bassb, bass(45 if bar % 2 == 0 else 46, BEAT * 0.9), t, 0.5)
    elif sec == 'build':
        put(drums, kick(), t, 0.8)
        steps = 4 if b % 4 < 2 else 8
        for k in range(steps):
            put(drums, snare(), t + k * BEAT / steps, 0.12 + 0.3 * ((t - 26.25) / 1.875))
    elif sec == 'intro':
        if b % 2 == 1: put(music, pluck(chord[b % 3] + 12, 0.4), t, 0.08)
# pads per bar
for bar in range(int(DUR / BAR)):
    t = bar * BAR; sec = section(t + 0.001)
    root, chord = PROG[bar % 4]
    if sec == 'tension': chord = [57, 60, 63] if bar % 2 == 0 else [58, 62, 65]
    if sec == 'end': continue
    put(music, pad(chord, BAR), t, 0.07 if sec != 'intro' else 0.09)
# final chord + sub hit at the end
put(music, pad([45, 57, 60, 64, 69], 3.0) * np.exp(-t_(3.0) * 1.2), 59.0, 0.14)
put(drums, impact(True), 59.0, 0.6)

# sidechain pump on music & bass from kicks in 'full'
pump = np.ones(N)
for b in range(nbeats):
    t = b * BEAT
    if section(t + 0.001) == 'full':
        i = int(t * SR); n = int(BEAT * SR); x = np.arange(n) / n
        pump[i:i + n] = np.minimum(pump[i:i + n], 0.35 + 0.65 * np.minimum(1, x / 0.45))
music *= pump; bassb *= pump

intro_filter = np.ones(N)
music_f = lp_fast(music, 9000)
add(music_f, 0, 1.0); add(bassb, 0, 1.0); add(drums, 0, 1.0)

# ---------------- cue sheet ----------------
cues = json.load(open(sys.argv[1]))
pan_rng = np.random.default_rng(3)
for c in cues:
    t = c['t']; ty = c['type']; pan = float(pan_rng.uniform(-0.5, 0.5))
    if ty == 'pencil': add(pencil(c['d']), t, 0.9, pan * 0.4)
    elif ty == 'pop': add(pop(), t, 0.45, pan)
    elif ty == 'pops':
        for k in range(c['n']): add(pop(c.get('hi', 0)), t + k * c['gap'], 0.38, float(pan_rng.uniform(-0.6, 0.6)))
    elif ty == 'swish':
        for k in range(c['n']): add(swish(), t + k * c['gap'], 0.35, float(pan_rng.uniform(-0.5, 0.5)))
    elif ty == 'riser': add(riser(c['d']), t, 0.45)
    elif ty == 'riserS': add(riser(c['d']), t, 0.3)
    elif ty == 'impact': add(impact(c.get('big', 0)), t, 0.75 if c.get('big') else 0.55)
    elif ty == 'slam': add(whoosh(0.25, lo=200, hi=3000), t - 0.05, 0.6); add(kick(True), t + 0.18, 0.5)
    elif ty == 'car': add(car(c['d']), t, 0.5, -0.3)
    elif ty == 'carin': add(car(0.9, c.get('soft', 0)), t, 0.45 if not c.get('soft') else 0.25, pan)
    elif ty == 'marker': add(marker(), t, 0.6)
    elif ty == 'sparkle': add(sparkle(), t, 0.8)
    elif ty == 'horn': add(horn(c.get('hi', 0)), t, 0.6, pan)
    elif ty == 'tick': add(tick(c['d']), t, 0.45, 0.4)
    elif ty == 'slash': add(slash(), t, 0.6)
    elif ty == 'beep': add(beep(), t, 0.7, 0.5)
    elif ty == 'shutter': add(shutter(), t, 0.7, 0.3)
    elif ty == 'chime': add(chime(), t, 0.7)
    elif ty == 'click': add(click(), t, 0.7)
    elif ty == 'ding': add(ding(c['i']), t, 0.8, -0.4 + c['i'] * 0.2)
    elif ty == 'whoosh': add(whoosh(0.7), t, 0.8)
    elif ty == 'whooshS': add(whoosh(0.35, lo=600, hi=8000), t, 0.45)
    elif ty == 'whooshUp': add(riser(0.6) * 1.2, t, 0.6)
    elif ty == 'scribbleS': add(marker(), t, 0.7); add(marker(), t + 0.35, 0.7); add(whoosh(0.8), t, 0.5)
    elif ty == 'vroom': add(vroom(), t, 0.9)
    elif ty == 'erase': add(erase(c['d']), t, 0.9)
    elif ty == 'stamp': add(stamp(), t, 0.9)
    elif ty == 'confetti': add(confetti(), t, 0.9)

# ---------------- simple stereo reverb + master ----------------
def reverb(x, seed):
    r = np.random.default_rng(seed); d = 1.6; t = t_(d)
    ir = r.standard_normal(len(t)) * np.exp(-t * 3.5); ir = lp_fast(ir, 5000); ir /= np.sqrt(np.sum(ir ** 2))
    from numpy.fft import rfft, irfft
    n = len(x) + len(ir); nf = 1 << (n - 1).bit_length()
    return irfft(rfft(x, nf) * rfft(ir, nf), nf)[:len(x)]


Lw = L + 0.18 * reverb(L, 1); Rw = R + 0.18 * reverb(R, 2)
out = np.stack([Lw, Rw], 1)
fade_out = np.ones(N); fs = int(59.2 * SR); fe = int(60.0 * SR)
fade_out[fs:fe] = np.linspace(1, 0, fe - fs) ** 1.5; fade_out[fe:] = 0
out *= fade_out[:, None]
out = np.tanh(out / np.max(np.abs(out)) * 1.6) / np.tanh(1.6) * 0.93
out = out[: int(DUR * SR)]
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype('<i2').tobytes())
print('wrote', sys.argv[2], out.shape)
