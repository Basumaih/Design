"""Synthesised, beat-synced soundtrack for the eDialogue showreel (30 s, 120 BPM from 3.6 s)."""
import numpy as np, wave, sys

SR = 44100
DUR = 30.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)
BEAT, T0 = 0.5, 3.6          # drop at 3.6 s, one beat = 0.5 s
DROP_OUT, LOGO = 25.1, 26.1  # kick drops out for the riser, logo hit


def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N: return
    sig = sig[: N - i]
    L[i:i + len(sig)] += sig * gain * (1 - max(0, pan))
    R[i:i + len(sig)] += sig * gain * (1 + min(0, pan))


def env(n, a=0.005, d=0.3):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)


def lowpass(x, cut):
    a = np.exp(-2 * np.pi * cut / SR); y = np.zeros_like(x); s = 0.0
    for i in range(len(x)):
        s = (1 - a) * x[i] + a * s; y[i] = s
    return y


def kick(dur=0.45, f0=150, f1=42, gain=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7) * gain + rng.normal(0, 1, n) * np.exp(-t * 300) * 0.15


def noise_hit(dur, decay, cut=None):
    n = int(dur * SR); x = rng.normal(0, 1, n)
    if cut: x = x - lowpass(x, cut)  # highpass
    return x * env(n, 0.001, decay)


def clap():
    n = int(0.3 * SR); x = rng.normal(0, 1, n); x = x - lowpass(x, 900)
    e = np.zeros(n)
    for k, o in enumerate([0, 0.01, 0.02]):
        i = int(o * SR); e[i:] += np.exp(-np.arange(n - i) / SR / (0.012 if k < 2 else 0.11))
    return x * e * 0.5


def whoosh(dur=0.5, rev=False):
    n = int(dur * SR); x = rng.normal(0, 1, n)
    t = np.linspace(0, 1, n); shape = np.sin(np.pi * t) ** 2
    y = lowpass(x, 2500) * shape
    return (y[::-1] if rev else y) * 0.9


def impact(gain=1.0, sub=45, dur=2.0):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * np.cumsum(sub + 60 * np.exp(-t * 12)) / SR) * np.exp(-t * 2.2)
    return (s + noise_hit(dur, 0.25) * 0.35 + lowpass(rng.normal(0, 1, n), 400) * np.exp(-t * 3) * 0.6) * gain


def tone(freq, dur, kind='saw', a=0.01, d=None):
    n = int(dur * SR); t = np.arange(n) / SR
    if kind == 'sine': x = np.sin(2 * np.pi * freq * t)
    else: x = 2 * ((freq * t) % 1) - 1
    e = np.minimum(1, t / a) * (np.exp(-t / d) if d else np.minimum(1, (dur - t) / 0.05).clip(0, 1))
    return x * e


def mtof(m): return 440 * 2 ** ((m - 69) / 12)

# chord progression per bar (4 beats): Am  F  C  G  (roots, midi)
PROG = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [55, 60, 64]), (55, [55, 59, 62])]

# ---------- intro 0-3.6: drone, question hits, ticking ----------
drone = sum(tone(mtof(m), 3.7, 'saw', a=1.5) for m in [45, 52, 57]) * 0.05
add(lowpass(drone, 700), 0.0, 1.0)
for tq in [0.15, 1.35, 2.4]:
    add(kick(0.6, 110, 38, 0.9), tq, 0.9)
    add(noise_hit(0.6, 0.08, 3000), tq, 0.25)
for tq in np.arange(0.15, 3.6, 0.25):
    add(noise_hit(0.03, 0.006, 6000), tq, 0.18, pan=0.3 if int(tq * 4) % 2 else -0.3)
for tw in [1.15, 2.25, 3.35]:
    add(whoosh(0.35), tw, 0.35)
add(whoosh(1.2, rev=True), 2.4, 0.5)  # suck-in to the drop

# ---------- main groove 3.6 -> 25.1 ----------
nbeats = int((DROP_OUT - T0) / BEAT)
for b in range(nbeats):
    t = T0 + b * BEAT
    add(kick(), t, 0.95)
    if b % 2 == 1: add(clap(), t, 0.55)
    add(noise_hit(0.06, 0.02, 7000), t + BEAT / 2, 0.22, pan=0.2)
    add(noise_hit(0.03, 0.01, 8000), t + BEAT * 0.75, 0.10, pan=-0.2)
    root, chord = PROG[(b // 4) % 4]
    # offbeat bass pluck + sub
    bs = lowpass(tone(mtof(root - 12), 0.24, 'saw', a=0.003, d=0.12), 900)
    add(bs, t + BEAT / 2, 0.35)
    add(tone(mtof(root - 24), 0.45, 'sine', a=0.01, d=0.3), t, 0.35)
# pads per bar
for bar in range(nbeats // 4 + 1):
    t = T0 + bar * 4 * BEAT
    if t >= DROP_OUT: break
    root, chord = PROG[bar % 4]
    pad = sum(tone(mtof(m) * (1 + dt), 2.0, 'saw', a=0.3) for m in chord for dt in (-0.004, 0.004))
    add(lowpass(pad, 1400) * 0.035, t, 1.0, pan=0.0)
    # arp on 1/8ths for energy
    for k in range(8):
        m = chord[k % 3] + 12 * (1 + (k // 3) % 2)
        add(lowpass(tone(mtof(m), 0.2, 'saw', a=0.002, d=0.07), 3000), t + k * BEAT / 2, 0.06, pan=(-0.5 if k % 2 else 0.5))

# ---------- transition FX ----------
for tt in [3.6]: add(impact(0.9), tt)
add(whoosh(0.45), 5.25, 0.45); add(impact(0.35, 60, 0.8), 5.6)
for tt in [6.6]: add(noise_hit(0.05, 0.01, 5000), tt, 0.4)                 # mouse click
for tt in [7.1, 7.6, 8.85, 10.1, 10.6]:                                        # chat pops
    add(tone(mtof(84 if tt in (7.6, 10.1) else 79), 0.12, 'sine', a=0.002, d=0.04), tt, 0.25)
add(whoosh(0.5), 12.2, 0.6); add(impact(0.4, 55, 0.8), 12.6)
for k in range(17):                                                            # counter ticks
    tk = 12.8 + 1.3 * (1 - 2 ** (-10 * k / 16)) if k else 12.8
    add(tone(mtof(88), 0.05, 'sine', a=0.001, d=0.015), tk, 0.12)
add(tone(mtof(93), 0.6, 'sine', a=0.002, d=0.25), 14.1, 0.25)
add(whoosh(0.5), 17.15, 0.6)
for tt in [17.6, 18.6, 19.6, 20.6]:
    add(impact(0.55, 50, 0.9), tt); add(whoosh(0.3), tt - 0.15, 0.35)
add(whoosh(0.6), 21.2, 0.5)
# bubble swishes
for k in range(14):
    add(whoosh(0.25), 21.6 + k * 0.27, 0.12, pan=(k % 3 - 1) * 0.6)

# ---------- riser 24.1 -> 26.1 ----------
n = int(2.0 * SR); tr = np.arange(n) / SR
rise = rng.normal(0, 1, n); rise = rise - lowpass(rise, 400)
rise *= (tr / 2.0) ** 2
sweep = np.sin(2 * np.pi * np.cumsum(200 + 1400 * (tr / 2.0) ** 2) / SR) * (tr / 2.0) ** 2 * 0.3
add(rise * 0.35 + sweep, LOGO - 2.0, 0.7)
for k in range(16):  # snare roll accelerating
    tk = DROP_OUT + 1.0 * (1 - (1 - k / 16) ** 1.6)
    add(clap(), tk, 0.15 + 0.35 * k / 16)

# ---------- logo hit 26.1 ----------
add(impact(1.3, 40, 3.5), LOGO)
add(kick(0.8, 180, 36, 1.2), LOGO, 1.0)
final = sum(tone(mtof(m) * (1 + dt), 3.9, 'saw', a=0.05) for m in [57, 64, 69, 72, 76] for dt in (-0.005, 0.005))
fe = np.exp(-np.arange(len(final)) / SR / 1.8)
add(lowpass(final * fe, 2200) * 0.09, LOGO)
for k, m in enumerate([81, 84, 88]):   # "dialogue dots" chime
    add(tone(mtof(m), 1.2, 'sine', a=0.002, d=0.4), 26.55 + k * 0.08, 0.18, pan=(k - 1) * 0.4)
add(tone(mtof(93), 1.6, 'sine', a=0.002, d=0.6), 28.1, 0.12)

# ---------- master ----------
mix = np.stack([L, R], 1)
fade_in = np.minimum(1, np.arange(N) / (0.05 * SR)); fade_out = np.minimum(1, (N - np.arange(N)) / (0.8 * SR))
mix *= (fade_in * fade_out)[:, None]
mix = np.tanh(mix * 1.1)  # soft clip / glue
mix /= np.max(np.abs(mix)) / 0.89
out = sys.argv[1] if len(sys.argv) > 1 else 'soundtrack.wav'
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', out)
