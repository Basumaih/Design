"""Procedural sound design (no music) + narration mix, synced to timeline.json.
Writes audio/mix.wav (48 kHz stereo)."""
import json, os, wave
import numpy as np
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, '..', 'timeline.json')))
SR = 48000
DUR = TL['duration']
N = int(SR * DUR)
rng = np.random.default_rng(7)

def tt(d): return np.arange(int(SR * d)) / SR
def noise(d): return rng.standard_normal(int(SR * d))
def sos_bp(lo, hi, o=2): return signal.butter(o, [lo, hi], 'bandpass', fs=SR, output='sos')
def bp(x, lo, hi, o=2): return signal.sosfilt(sos_bp(lo, hi, o), x)
def lp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'lowpass', fs=SR, output='sos'), x)
def hp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'highpass', fs=SR, output='sos'), x)
def norm(x, peak=1.0):
    m = np.max(np.abs(x)) + 1e-9
    return x / m * peak
def adsr(n, a=0.005, r=0.1, shape=3.0):
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(r, 1e-4) * shape / 3)
    return e
def svf_sweep(x, f0, f1, q=2.0, curve=1.0):
    """state-variable band-pass with a per-sample cutoff sweep"""
    n = len(x); f = f0 * (f1 / f0) ** (np.linspace(0, 1, n) ** curve)
    g = np.tan(np.pi * f / SR); k = 1 / q
    a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2
    ic1 = ic2 = 0.0; out = np.empty(n)
    for i in range(n):
        v3 = x[i] - ic2; v1 = a1[i] * ic1 + a2[i] * v3; v2 = ic2 + a2[i] * ic1 + a3[i] * v3
        ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2; out[i] = v1
    return out
def sine_sweep(d, f0, f1, curve=1.0):
    t = tt(d); f = f0 * (f1 / f0) ** ((t / d) ** curve); return np.sin(2 * np.pi * np.cumsum(f) / SR)

# ---------------- sound builders ----------------
def whoosh(d=0.5, f0=300, f1=3000, peak=0.6, q=1.4):
    x = svf_sweep(noise(d), f0, f1, q); n = len(x); t = np.linspace(0, 1, n)
    env = np.sin(np.pi * t ** 0.6) ** 2; return norm(x * env, peak)
def riser(d=0.6, f0=200, f1=5000, peak=0.5):
    x = svf_sweep(noise(d), f0, f1, 2.5, 1.3); t = np.linspace(0, 1, len(x)); env = t ** 2.2 * (1 - np.clip((t - 0.95) / 0.05, 0, 1))
    return norm(x * env, peak)
def pop(f0=900, f1=180, d=0.09, peak=0.6):
    x = sine_sweep(d, f0, f1, 0.4) * adsr(int(SR * d), 0.001, d * 0.5)
    c = hp(noise(0.004), 2000) * 0.5; x[:len(c)] += c
    return norm(x, peak)
def boing(f0=180, d=0.45, peak=0.5, up=True):
    t = tt(d); f = f0 * (1 + (0.9 if up else -0.4) * (t / d) ** 0.5) * (1 + 0.12 * np.sin(2 * np.pi * 14 * t) * np.exp(-t * 6))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    return norm(x, peak)
def thud(f0=95, d=0.35, peak=0.9, click=0.4):
    t = tt(d); x = np.sin(2 * np.pi * np.cumsum(f0 * (0.55 + 0.45 * np.exp(-t * 18))) / SR) * np.exp(-t * 11)
    n = lp(noise(0.03), 1800) * np.exp(-tt(0.03) * 120) * click; x[:len(n)] += n
    return norm(x, peak)
def slap(peak=0.6, bright=3500, body=0.5):
    d = 0.12; x = bp(noise(d), 600, bright) * np.exp(-tt(d) * 55)
    x += thud(140, d, 1, 0)[:len(x)] * body * 0.4
    return norm(x, peak)
def tick(peak=0.35, f=4000):
    d = 0.012; return norm(bp(noise(d), f * 0.6, min(f * 1.6, 20000)) * np.exp(-tt(d) * 500), peak)
def scribble(d=0.45, peak=0.35, rate=26):
    t = tt(d); am = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * rate * t + 3 * np.sin(2 * np.pi * 3 * t)))
    am = lp(am, 120); x = bp(noise(d), 1800, 6500) * am
    x += 0.25 * np.sin(2 * np.pi * (2400 + 300 * np.sin(2 * np.pi * 5 * t)) * t) * am * 0.3
    env = np.minimum(1, t / 0.02) * np.minimum(1, (d - t) / 0.05)
    return norm(x * env, peak)
def crumple(d=0.28, peak=0.5, density=180):
    x = np.zeros(int(SR * d))
    for _ in range(int(density * d)):
        p = rng.integers(0, len(x) - 400); L = rng.integers(60, 380)
        x[p:p + L] += bp(rng.standard_normal(L), 900, 7000) * np.exp(-np.arange(L) / (L / 4)) * rng.uniform(0.2, 1)
    x *= np.minimum(1, tt(d) / 0.01) * np.exp(-tt(d) * 3)
    return norm(x, peak)
def rattle(d=1.0, peak=0.4, density=120, decay=False):
    x = np.zeros(int(SR * d)); t = np.linspace(0, 1, len(x))
    for _ in range(int(density * d)):
        p = rng.integers(0, len(x) - 600); f = rng.uniform(2500, 6500)
        L = 500; s = np.sin(2 * np.pi * f * np.arange(L) / SR) * np.exp(-np.arange(L) / 60)
        x[p:p + L] += s * rng.uniform(0.2, 1)
    env = (1 - t) ** 1.5 if decay else np.sin(np.pi * t) ** 0.5
    return norm(x * env, peak)
def ding(f=1800, d=0.9, peak=0.35):
    t = tt(d); x = np.zeros_like(t)
    for m, a, k in [(1, 1, 4), (2.76, 0.5, 6), (5.4, 0.25, 9), (8.9, 0.1, 12)]: x += a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k)
    x[:50] *= np.linspace(0, 1, 50); return norm(x, peak)
def sparkle(d=0.6, peak=0.25):
    x = np.zeros(int(SR * d))
    for i in range(9):
        p = int(SR * d * i / 11 * rng.uniform(0.8, 1.1)); s = ding(rng.uniform(3000, 6000), 0.25, rng.uniform(0.3, 1))
        e = min(len(x), p + len(s)); x[p:e] += s[:e - p]
    return norm(x, peak)
def hiss(d=0.55, peak=0.4):
    t = tt(d); x = hp(noise(d), 2500) * np.exp(-t * 5) * np.minimum(1, t / 0.01)
    return norm(x, peak)
def engine(d, f_curve, peak=0.5, rough=0.3):
    t = tt(d); f = f_curve(t); ph = 2 * np.pi * np.cumsum(f) / SR
    x = signal.sawtooth(ph) * 0.6 + np.sin(ph * 0.5) * 0.5 + signal.square(ph * 2) * 0.15
    am = 1 + rough * np.sin(ph * 0.25)
    x = lp(x * am, 700) + lp(noise(d), 300) * 0.4
    return norm(x, peak)
def horn(peak=0.4):
    d = 0.16; t = tt(d); x = signal.square(2 * np.pi * 370 * t) + signal.square(2 * np.pi * 465 * t)
    x = lp(x, 2200) * np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.02); gap = np.zeros(int(SR * 0.07))
    return norm(np.concatenate([x, gap, x]), peak)
def backfire(peak=0.9):
    x = thud(70, 0.5, 1, 1); n = bp(noise(0.25), 150, 2500) * np.exp(-tt(0.25) * 18); x[:len(n)] += n * 0.9
    return norm(x, peak)
def cough(peak=0.6):
    d = 0.3; t = tt(d); x = engine(d, lambda t: 40 + 20 * t, 1, 0.8) * (np.abs(np.sin(2 * np.pi * 9 * t)) ** 3) * np.exp(-t * 6)
    n = lp(noise(0.12), 900) * np.exp(-tt(0.12) * 25); x[:len(n)] += n
    return norm(x, peak)
def charge(d=0.75, peak=0.35):
    t = tt(d); f = 90 * (5 ** (t / d) ** 1.4); x = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR) * 0.6
    x += bp(noise(d), 3000, 9000) * (rng.random(len(t)) > 0.985) * 3
    return norm(lp(x, 5000) * np.minimum(1, t / 0.05), peak)
def zap(peak=0.45):
    d = 0.22; x = sine_sweep(d, 2400, 120, 0.5) * np.exp(-tt(d) * 14) + bp(noise(d), 2000, 9000) * np.exp(-tt(d) * 25) * 0.6
    return norm(x, peak)
def steps(n=5, gap=0.13, peak=0.35):
    out = np.zeros(int(SR * (n * gap + 0.2)))
    for i in range(n):
        s = thud(120, 0.12, 1, 0.8) * 0.6 + np.pad(bp(noise(0.06), 500, 3000) * np.exp(-tt(0.06) * 60), (0, int(SR * 0.06))) * 0.4
        p = int(SR * i * gap); out[p:p + len(s)] += s[:len(out) - p]
    return norm(out, peak)
def billow(d=1.2, peak=0.5):
    t = np.linspace(0, 1, int(SR * d)); x = lp(noise(d), 500) + bp(noise(d), 300, 1500) * 0.3
    return norm(x * np.sin(np.pi * t ** 0.5) ** 2, peak)
def flutter(d=0.9, peak=0.3):
    t = tt(d); am = (0.5 + 0.5 * np.sin(2 * np.pi * 17 * t + 4 * np.sin(2 * np.pi * 2 * t))) ** 2
    return norm(bp(noise(d), 1200, 7000) * am * np.exp(-t * 2.5) * np.minimum(1, t / 0.02), peak)
def stamp_hit(peak=1.0):
    x = thud(60, 0.6, 1, 1.0); s = slap(1, 5000, 0.8); x[:len(s)] += s * 0.7
    return norm(x, peak)
def creak(d=0.4, peak=0.3):
    t = tt(d); f = 180 + 60 * np.sin(2 * np.pi * 3 * t); pulses = (np.sin(2 * np.pi * np.cumsum(f) / SR) > 0.97).astype(float)
    return norm(bp(pulses, 300, 3000) * np.sin(np.pi * t / d), peak)

# ---------------- timeline ----------------
L = np.zeros((2, N))
def put(x, t, g=1.0, pan=0.0):
    x = np.asarray(x) * g; i = int(t * SR)
    if i >= N: return
    if i < 0: x = x[-i:]; i = 0
    e = min(N, i + len(x)); seg_ = x[:e - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    L[0, i:e] += seg_ * l * 1.41; L[1, i:e] += seg_ * r * 1.41
def pan_sweep(x, t, g, p0, p1):
    n = len(x); p = np.linspace(p0, p1, n); i = int(t * SR); e = min(N, i + n)
    l, r = np.cos((p + 1) * np.pi / 4), np.sin((p + 1) * np.pi / 4)
    L[0, i:e] += (x * g * l * 1.41)[:e - i]; L[1, i:e] += (x * g * r * 1.41)[:e - i]

# ===== TITLE
pan_sweep(whoosh(0.6, 150, 2500, 0.9), 0.0, 0.9, 0, 0)
put(slap(0.5), 0.14, 0.6, -0.3); put(slap(0.5), 0.23, 0.6, 0.3)
put(thud(80, 0.4, 0.8), 0.48, 0.9); put(pop(1100, 220), 0.5, 0.8, 0.2); put(pop(950, 200), 0.84, 0.8, -0.2)
for i, tm in enumerate([1.35, 1.58, 1.98]): put(whoosh(0.18, 800, 4000, 0.4), tm - 0.05, 0.5, 0.2 - i * 0.2)
put(scribble(0.42, 0.5, 32), 2.25, 0.55, 0.1)
pan_sweep(whoosh(0.45, 300, 3500, 0.9), 2.98, 0.9, 0.9, -0.1); put(slap(0.8), 3.42, 0.8, 0.1)
for k in range(22):  # compass needle spinning down
    put(tick(0.4, 5000), 3.08 + 0.7 * (k / 22) ** 1.8, 0.45 * (1 - k / 30), 0.35)
put(boing(220, 0.5, 0.7), 3.96, 0.85); put(pop(700, 160), 3.96, 0.6); put(zap(), 4.0, 0.5)
pan_sweep(whoosh(0.45, 300, 3500, 0.9), 4.08, 0.9, -0.9, 0.1); put(slap(0.8), 4.5, 0.8, -0.1)
for i in range(3): put(pop(1300 - i * 120, 300), 4.4 + i * 0.09, 0.6, 0.5 - i * 0.1)
put(sparkle(0.6, 0.4), 4.75, 0.5, 0.4)
put(creak(0.4, 0.4), 5.3, 0.5, 0.6); pan_sweep(whoosh(0.4, 200, 1500, 0.8), 5.35, 0.8, 0.8, 0)
put(thud(55, 0.7, 1, 1), 5.73, 1.1); put(slap(1, 2500, 1), 5.73, 0.6)
# ===== BOOK
put(whoosh(0.6, 2500, 200, 0.6), 5.78, 0.6)
put(pop(1000, 240), 6.12, 0.6, 0.1); put(pop(900, 240), 6.55, 0.55, -0.1)
put(whoosh(0.25, 3000, 600, 0.4), 7.1, 0.4)
put(creak(0.35, 0.4), 7.18, 0.5, 0.2)
for i in range(3): put(flutter(0.25, 0.6), 7.45 + i * 0.09, 0.55, 0.3 - i * 0.2)
put(rattle(1.1, 0.5, 260), 7.55, 0.55)
cnt_t = np.linspace(7.95, 9.35, 400); cnt = np.round(1435 * (1 - (1 - (cnt_t - 7.95) / 1.4) ** 3))
last = -1; lastT = 0
for tm, c in zip(cnt_t, cnt):
    if c // 45 != last and tm - lastT > 0.035: put(tick(0.5, 3500), tm, 0.42, 0); last = c // 45; lastT = tm
put(whoosh(0.4, 400, 2200, 0.6), 8.45, 0.45, -0.4); put(whoosh(0.35, 2200, 400, 0.6), 9.55, 0.45, 0.4)
put(ding(1500, 1.2, 0.6), 9.88, 0.55); put(sparkle(0.8, 0.5), 9.9, 0.45)
put(rattle(1.2, 0.6, 320, decay=True), 9.98, 0.6)
put(whoosh(0.25, 600, 3000, 0.5), 9.95, 0.5); put(tick(0.6, 2000), 10.25, 0.5)
put(pop(1000, 250), 10.15, 0.6)
put(scribble(0.35, 0.4, 20), 10.75, 0.45, -0.2)
for i in range(11): put(pop(700 + i * 60, 300, 0.06, 0.5), 10.95 + i * 0.04, 0.35, -0.6 + i * 0.12)
put(scribble(0.55, 0.5, 30), 11.3, 0.55, 0.2); put(scribble(0.4, 0.25, 16), 11.2, 0.25, 0.5)
put(pop(1000, 250), 11.2, 0.55); put(thud(90, 0.4, 0.9), 11.72, 0.8); put(pop(800, 160, 0.12), 11.72, 0.7)
put(riser(0.4, 400, 6000, 0.7), 12.1, 0.6); put(whoosh(0.4, 3000, 150, 0.9), 12.43, 0.9)
# ===== FINDINGS
put(whoosh(0.3, 500, 2500, 0.4), 12.72, 0.4)
for i in range(6): put(slap(0.8, 4000), 12.86 + i * 0.09, 0.65, [0.4, -0.4][i % 2])
put(slap(1, 4000, 1), 13.42, 0.9); put(thud(90, 0.3, 0.6), 13.42, 0.5)
put(whoosh(0.45, 300, 1500, 0.5), 13.56, 0.45)
put(scribble(0.45, 0.6, 28), 13.95, 0.6)
put(pop(1100, 260), 14.47, 0.55); put(scribble(0.25, 0.5, 30), 14.75, 0.5)
put(whoosh(0.3, 2000, 6000, 0.4), 14.98, 0.4)
put(riser(0.55, 200, 3000, 0.8), 15.2, 0.7)
# ===== BUS
put(whoosh(0.35, 3000, 300, 0.7), 15.75, 0.6); put(thud(70, 0.5, 1), 16.08, 0.9); put(slap(0.7, 3000), 16.1, 0.5)
for i in range(6): put(pop(900 + i * 50, 240, 0.07, 0.4), 16.2 + i * 0.085, 0.35)
put(pop(1000, 250), 16.38, 0.5, 0.3); put(hiss(0.6, 0.5), 16.3, 0.55, -0.5); put(scribble(0.35, 0.4, 30), 16.75, 0.4)
for i, h in enumerate([16.4, 16.76, 17.12, 17.48, 18.4]):
    put(boing(260 + i * 20, 0.35, 0.5), h, 0.55, -0.3); put(thud(110, 0.2, 0.5), h + 0.42, 0.5, -0.4); put(pop(1400, 400, 0.06, 0.4), h + 0.5, 0.4, 0.1 * i)
put(boing(300, 0.5, 0.7, up=True), 17.85, 0.7, 0.6); put(whoosh(0.4, 500, 2500, 0.6), 17.85, 0.6, 0.6)
put(thud(80, 0.4, 1), 18.32, 0.9, 0.5); put(boing(200, 0.6, 0.5, up=False), 18.36, 0.45, 0.5); put(pop(800, 200), 18.35, 0.5, 0.5)
put(hiss(0.5, 0.5), 18.95, 0.5, -0.4)
put(whoosh(0.4, 300, 1800, 0.6), 19.0, 0.55, -0.5); put(pop(900, 220), 19.07, 0.55, -0.3); put(tick(0.5, 2500), 19.1, 0.5)
put(engine(0.4, lambda t: 18 + 10 * np.sin(2 * np.pi * 6 * t), 0.5, 0.9), 19.5, 0.6)
put(engine(1.5, lambda t: 38 + 40 * np.clip((t - 0.45) / 0.9, 0, 1) ** 1.5, 0.7, 0.3) * np.linspace(1, 0.3, int(SR * 1.5)), 19.85, 0.75)
put(horn(0.45), 19.72, 0.5, -0.3)
pan_sweep(whoosh(0.6, 120, 1600, 1.0), 20.42, 1.0, 0.9, -0.9)
# ===== MOTIVATION
for i in range(3): put(whoosh(0.18, 800, 4000, 0.35), 20.98 + i * 0.25, 0.4)
for i in range(4): put(whoosh(0.35, 400, 3000, 0.5), 21.12 + i * 0.2, 0.5, -0.5 + i * 0.33); put(pop(900, 250, 0.08, 0.4), 21.45 + i * 0.2, 0.4, -0.5 + i * 0.33)
put(stamp_hit(0.9), 22.55, 0.8); put(thud(70, 0.4, 0.7), 22.69, 0.6)
put(scribble(0.3, 0.7, 34), 23.12, 0.65)
for i in range(4): put(crumple(0.25, 0.7), 23.12 + i * 0.07, 0.6, -0.5 + i * 0.33); put(whoosh(0.3, 500, 3500, 0.5), 23.3 + i * 0.07, 0.45, [-0.9, -0.9, 0.9, 0.9][i])
put(whoosh(0.25, 3000, 800, 0.4), 23.72, 0.4)
put(stamp_hit(0.9), 23.92, 0.8); put(stamp_hit(0.8), 24.28, 0.7)
for i in range(3):
    put(pop(1000, 300), 23.95 + i * 0.1, 0.5, -0.6 + i * 0.6); put(charge(0.62, 0.45), 24.05 + i * 0.12, 0.45, -0.6 + i * 0.6)
    put(ding(2200 + i * 200, 0.6, 0.35), 24.65 + i * 0.12, 0.4, -0.6 + i * 0.6); put(zap(0.3), 24.65 + i * 0.12, 0.35, -0.6 + i * 0.6)
put(zap(0.5), 24.3, 0.5, -0.6); put(zap(0.5), 24.42, 0.5, 0.6)
put(whoosh(0.4, 200, 3000, 0.8), 25.83, 0.8); put(slap(0.9, 3000, 1), 26.05, 0.7)
# ===== WRONG PERSON
put(whoosh(0.25, 800, 3500, 0.35), 26.1, 0.4)
put(boing(150, 0.5, 0.6), 26.2, 0.55, 0)
put(steps(5, 0.13, 0.5), 26.25, 0.6, 0.6)
put(boing(180, 0.35, 0.5), 26.95, 0.5, -0.1); put(thud(60, 0.5, 1), 27.36, 0.9, -0.2)
put(pop(900, 220), 26.95, 0.5); put(tick(0.5, 3000), 27.28, 0.5)
put(stamp_hit(0.8), 28.0, 0.75); put(pop(900, 200), 28.3, 0.5); put(pop(800, 180), 28.75, 0.5)
put(cough(0.6), 28.3, 0.7, 0.3); put(cough(0.6), 28.9, 0.75, 0.3); put(backfire(1.0), 29.5, 0.95, 0.3)
put(scribble(0.35, 0.5, 30), 28.95, 0.5)
put(whoosh(0.35, 3000, 500, 0.5), 30.15, 0.5); put(whoosh(0.4, 500, 2500, 0.4), 30.25, 0.4, 0.5)
for i, tm in enumerate([30.32, 30.5, 30.66, 30.88, 31.02]): put(whoosh(0.15, 1000, 4000, 0.3), tm - 0.04, 0.35)
put(pop(900, 220), 31.25, 0.5)
for tm, p in [(31.55, 0.4), (31.95, -0.4), (32.35, 0.2)]: put(stamp_hit(1.0), tm, 0.95, p)
put(billow(1.3, 0.7), 32.45, 0.7, 0.3); put(cough(0.6), 32.4, 0.5, 0.4)
# ===== OUTRO
put(whoosh(0.7, 200, 1200, 0.6), 33.45, 0.6); put(hiss(0.6, 0.3), 33.5, 0.3)
put(whoosh(0.25, 600, 3000, 0.4), 33.56, 0.45)
for i in range(3): put(pop(1100 + i * 100, 260), 33.62 + i * 0.08, 0.5, -0.3 + i * 0.3)
put(scribble(0.4, 0.6, 30), 34.25, 0.6)
put(pop(900, 220), 34.93, 0.55); put(pop(1000, 240), 35.15, 0.5)
for k in range(18): put(tick(0.4, 5000), 35.0 + 0.6 * (k / 18) ** 1.8, 0.4 * (1 - k / 24), -0.4)
put(whoosh(0.45, 400, 2500, 0.6), 35.95, 0.6)
put(riser(0.35, 300, 5000, 0.6), 36.05, 0.55)
put(stamp_hit(1.0), 36.4, 1.2); put(thud(45, 1.0, 1, 1), 36.4, 1.0)
put(pop(500, 120, 0.15), 36.45, 0.7); put(flutter(1.6, 0.6), 36.47, 0.6, 0.3); put(flutter(1.4, 0.5), 36.52, 0.5, -0.3)
put(slap(1, 4000, 1), 36.62, 0.8, -0.4); put(whoosh(0.3, 2000, 600, 0.5), 36.62, 0.5, -0.4)
put(sparkle(0.8, 0.4), 36.9, 0.4)
put(whoosh(0.4, 800, 3000, 0.3), 37.1, 0.3)

# ===== AMBIENCES
amb = np.zeros(N)
room = lp(noise(DUR), 2500) * 0.012 + lp(noise(DUR), 200) * 0.02; amb += room[:N]
def amb_seg(x, a, b, fade=0.3):
    i = int(a * SR); n = min(int((b - a) * SR), len(x)); j = i + n; x = x[:n]; f = int(fade * SR)
    e = np.ones(n); e[:f] = np.linspace(0, 1, f); e[-f:] = np.linspace(1, 0, f); amb[i:j] += x * e
city = lp(noise(5.3), 350) * 0.05 + bp(noise(5.3), 400, 2000) * 0.01
amb_seg(city, 15.75, 21.0)
bus_in = engine(5.0, lambda t: 34 + 2 * np.sin(2 * np.pi * 0.4 * t), 0.06, 0.3) + lp(noise(5.0), 150) * 0.03
amb_seg(bus_in, 20.9, 25.9)
amb_seg(city * 0.8, 26.2, 31.5)
L += amb * 0.9

# ===== reverb (small room) on SFX
ir_n = int(SR * 0.6); ir = rng.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / SR * 9); ir = lp(ir, 5000); ir /= np.sum(np.abs(ir))
for c in range(2): L[c] += signal.fftconvolve(L[c], ir * 4.5)[:N] * 0.16

# ===== narration
def read_wav(p):
    w = wave.open(p); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768; return a
vo = np.zeros(N); vo_env = np.zeros(N)
for k, t0 in TL['vo'].items():
    a = read_wav(os.path.join(HERE, 'vo', f'{k}.wav')); a = norm(a, 0.9); i = int(t0 * SR); e = min(N, i + len(a))
    vo[i:e] += a[:e - i]; vo_env[i:e] = 1
# smooth ducking envelope
vo_env = signal.sosfiltfilt(signal.butter(1, 4, 'lowpass', fs=SR, output='sos'), vo_env)
duck = 1 - 0.38 * np.clip(vo_env, 0, 1)
L *= duck
vo_room = signal.fftconvolve(vo, ir * 2.0)[:N] * 0.1
mixL = L[0] * 1.1 + (vo + vo_room) * 0.95
mixR = L[1] * 1.1 + (vo + vo_room) * 0.95
# tail fade
f = int(SR * 0.5); mixL[-f:] *= np.linspace(1, 0, f); mixR[-f:] *= np.linspace(1, 0, f)
st = np.stack([mixL, mixR], 1); st = st / max(1e-9, np.max(np.abs(st))) * 0.95
out = os.path.join(HERE, 'mix_raw.wav')
w = wave.open(out, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes()); w.close()
print('wrote', out)
# balance report
act = vo_env > 0.5
r = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
print(f'VO rms (active) {r(vo[act]*0.95):.1f} dB | SFX rms during VO {r(L[0][act]*1.1):.1f} dB | SFX rms gaps {r(L[0][~act]*1.1):.1f} dB')
