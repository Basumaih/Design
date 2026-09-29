"""Build the narrated motion graphic.

Synthesises each narration line with an offline Piper voice (sherpa-onnx),
lays the lines out on one timeline, writes narration.mp3, and injects the
timeline (scene windows, cue times, subtitle chunks, lip-sync envelope) into
template.html -> index.html.

Usage: python3 build.py <piper-voice-dir> <ffmpeg-binary>
"""
import json, re, sys, wave, subprocess, pathlib
import numpy as np
import sherpa_onnx

HERE = pathlib.Path(__file__).parent
VOICE = pathlib.Path(sys.argv[1])
FFMPEG = sys.argv[2]
LENGTH_SCALE = 0.88
FPS = 30
LEAD, GAP, TAIL = 0.9, 0.45, 1.0
MIN_SCENE = {"s1": 7.0, "s2": 6.5, "s9": 7.0}
SCENE_ORDER = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9"]

onnx = next(VOICE.glob("*.onnx"))
tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(
    model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(
            model=str(onnx), tokens=str(VOICE / "tokens.txt"),
            data_dir=str(VOICE / "espeak-ng-data"), length_scale=LENGTH_SCALE),
        num_threads=4)))

def load_recording(path, sr):
    """Decode a human recording (any format ffmpeg reads) to mono float32 at sr."""
    raw = subprocess.run([FFMPEG, "-loglevel", "error", "-i", str(path), "-ac", "1", "-ar", str(sr),
                          "-f", "s16le", "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768


segs = json.loads((HERE / "narration.json").read_text())
SR = 22050
for s in segs:
    # a recorded line in voice/<id>.<ext> replaces the synthetic voice for that line
    rec = sorted((HERE / "voice").glob(f"{s['id']}.*")) if (HERE / "voice").is_dir() else []
    if rec:
        x = load_recording(rec[0], SR)
        print("recorded:", rec[0].name)
    else:
        a = tts.generate(s["tts"], sid=0, speed=1.0)
        x = np.array(a.samples, dtype=np.float32)
        if a.sample_rate != SR:
            x = np.interp(np.arange(0, len(x), a.sample_rate / SR), np.arange(len(x)), x).astype(np.float32)
    # trim silence at both ends
    win = SR // 50
    env = np.array([np.abs(x[i:i + win]).max() for i in range(0, len(x), win)])
    idx = np.where(env > 0.04 * np.abs(x).max())[0]  # relative, so quiet recordings trim too
    x = x[max(0, idx[0] - 2) * win: min(len(env), idx[-1] + 3) * win]
    s["audio"], s["dur"] = x, len(x) / SR

# lay out scenes and segments
t, scenes = 0.0, {}
for sc in SCENE_ORDER:
    start = t
    cur = start + LEAD
    for s in [s for s in segs if s["scene"] == sc]:
        s["s"], s["e"] = cur, cur + s["dur"]
        cur = s["e"] + GAP
    end = max(cur - GAP + TAIL, start + MIN_SCENE.get(sc, 0))
    scenes[sc] = {"s": round(start, 3), "e": round(end, 3)}
    t = end
DUR = t

# audio track
track = np.zeros(int(DUR * SR) + SR, dtype=np.float32)
for s in segs:
    i = int(s["s"] * SR)
    track[i:i + len(s["audio"])] += s["audio"]
track = np.clip(track / max(1e-6, np.abs(track).max()) * 0.9, -1, 1)
wav = HERE / "narration.wav"
with wave.open(str(wav), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((track * 32767).astype(np.int16).tobytes())
subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", str(wav), "-ac", "1", "-b:a", "96k",
                str(HERE / "narration.mp3")], check=True)
wav.unlink()

# lip-sync envelope, 0..35 per video frame, encoded as base-36 chars
hop = SR // FPS
rms = np.array([np.sqrt(np.mean(track[i:i + hop] ** 2)) for i in range(0, len(track), hop)])
rms = rms / (np.percentile(rms[rms > 0.01], 95) if (rms > 0.01).any() else 1)
env = "".join("0123456789abcdefghijklmnopqrstuvwxyz"[int(min(1, v) * 35)] for v in rms)

# cues (approximate: proportional position of the phrase in the line)
cues = {}
for s in segs:
    cues[s["id"]] = round(s["s"], 3)
    for name, phrase in s.get("cues", {}).items():
        pos = s["text"].find(phrase)
        assert pos >= 0, (s["id"], phrase)
        cues[name] = round(s["s"] + s["dur"] * pos / len(s["text"]), 3)

# subtitle chunks: split on punctuation, merge short pieces, time by length
subs = []
for s in segs:
    parts = [p.strip() for p in re.split(r"(?<=[،.:؟])\s+", s["text"]) if p.strip()]
    chunks = []
    for p in parts:
        if chunks and len(chunks[-1]) + len(p) < 62:
            chunks[-1] += " " + p
        else:
            chunks.append(p)
    total = sum(len(c) for c in chunks)
    cur = s["s"]
    for c in chunks:
        d = s["dur"] * len(c) / total
        subs.append({"s": round(cur, 3), "e": round(cur + d, 3), "t": c})
        cur += d

timeline = {"dur": round(DUR, 3), "fps": FPS, "scenes": scenes, "cues": cues,
            "segs": {s["id"]: {"s": round(s["s"], 3), "e": round(s["e"], 3)} for s in segs},
            "subs": subs, "env": env}
tpl = (HERE / "template.html").read_text()
out = tpl.replace("/*__TIMELINE__*/null", json.dumps(timeline, ensure_ascii=False))
(HERE / "index.html").write_text(out)
print(f"duration {DUR:.1f}s")
for k, v in scenes.items():
    print(k, v)
