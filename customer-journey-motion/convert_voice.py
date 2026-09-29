"""Re-voice the narration in the timbre of a short reference recording.

Synthesises each line of narration.json with the Piper voice, converts it with
kNN-VC (WavLM features + HiFi-GAN) against the reference sample, and writes
voice/<id>.wav, which build.py then uses in place of the synthetic voice.

Usage: python3 convert_voice.py <reference-audio> <piper-voice-dir> <knn-vc-dir> <ffmpeg>
"""
import json, sys, subprocess, pathlib, shutil
import numpy as np, torch, torchaudio, sherpa_onnx

HERE = pathlib.Path(__file__).parent
REF, VOICE, KNN, FFMPEG = map(pathlib.Path, sys.argv[1:5])
OUT = HERE / "voice"
OUT.mkdir(exist_ok=True)

# kNN-VC loads its weights through torch.hub's cache
cache = pathlib.Path(torch.hub.get_dir()) / "checkpoints"
cache.mkdir(parents=True, exist_ok=True)
for f in ["WavLM-Large.pt", "prematch_g_02500000.pt"]:
    if not (cache / f).exists():
        shutil.copy(KNN / f, cache / f)
import wave

def _load(path, *a, **k):
    with wave.open(str(path)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        return torch.tensor(x)[None], w.getframerate()

def _save(path, x, sr, *a, **k):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((x.clamp(-1, 1).numpy()[0] * 32767).astype(np.int16).tobytes())

# recent torchaudio needs torchcodec for load/save; plain 16-bit wav is all we use
torchaudio.load, torchaudio.save = _load, _save
sys.path.insert(0, str(KNN))
from hubconf import knn_vc  # noqa: E402

tmp = OUT / "_ref16k.wav"
subprocess.run([str(FFMPEG), "-y", "-loglevel", "error", "-i", str(REF), "-af", "loudnorm", "-ac", "1", "-ar", "16000", str(tmp)], check=True)
model = knn_vc(pretrained=True, prematched=True, device="cpu")
with torch.inference_mode():
    matching = model.get_matching_set([str(tmp)], vad_trigger_level=0)
tmp.unlink()

onnx = next(VOICE.glob("*.onnx"))
tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(
    model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(
            model=str(onnx), tokens=str(VOICE / "tokens.txt"),
            data_dir=str(VOICE / "espeak-ng-data"), length_scale=0.88),
        num_threads=4)))

for s in json.loads((HERE / "narration.json").read_text()):
    a = tts.generate(s["tts"], sid=0, speed=1.0)
    x = torch.tensor(np.array(a.samples, dtype=np.float32))[None]
    x = torchaudio.functional.resample(x, a.sample_rate, 16000)
    src = OUT / "_src.wav"
    torchaudio.save(str(src), x, 16000)
    with torch.inference_mode():
        y = model.match(model.get_features(str(src)), matching, topk=4)
    src.unlink()
    torchaudio.save(str(OUT / f"{s['id']}.wav"), y[None].cpu(), 16000)
    print("converted", s["id"])
