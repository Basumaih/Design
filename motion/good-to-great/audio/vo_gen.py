# Narration: Google Translate TTS (ar), silence-trimmed, sped up 1.25x, EQ + compression.
import subprocess, urllib.parse, sys, json, os
os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)), "vo"), exist_ok=True)
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "vo"))
lines = {
 "v1": "إيش الأهم في نجاح المنظمات؟",
 "v2": "البوصلة؟ أم الموهوبون؟",
 "v3": "جيم كولنز درس أكثر من ألف وأربعمئة شركة.",
 "v4": "إحدى عشرة فقط، صارت عظيمة.",
 "v5": "والسر؟ مَن أولًا، ثم إلى أين.",
 "v6": "اصعد بالأشخاص المناسبين إلى الحافلة، ثم حدّد الوجهة.",
 "v7": "والموهوبون لا يحتاجون برامج تحفيز؛ فهم متحفّزون ذاتيًا.",
 "v8": "أما إن صعد الشخص الخطأ، فلن يهم وضوح الاتجاه.",
 "v9": "فلا وصول بأناسٍ غير موهوبين.",
 "v10": "الأشخاص أولًا، ثم الوجهة.",
 "v11": "موظّف إكس تِن.",
}
only = sys.argv[1:] or list(lines)
tempo = 1.25
af = ("silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02:stop_periods=-1:stop_duration=0.16:stop_threshold=-45dB,"
      "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06,areverse,"
      f"atempo={tempo},highpass=f=90,equalizer=f=220:t=q:w=1:g=2,equalizer=f=3800:t=q:w=1.2:g=3,"
      "acompressor=threshold=-20dB:ratio=3:attack=4:release=90:makeup=2")
out = {}
for k in only:
    q = urllib.parse.urlencode({"client":"gtx","ie":"UTF-8","tl":"ar","q":lines[k]})
    subprocess.run(["curl","-s","-m","30","-o",f"{k}.mp3",f"https://translate.googleapis.com/translate_tts?{q}"],check=True)
    subprocess.run(["ffmpeg","-nostdin","-v","error","-y","-i",f"{k}.mp3","-af",af,"-ar","48000","-ac","1",f"{k}.wav"],check=True)
    d = float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"{k}.wav"]))
    out[k] = round(d,3)
    print(k, d)
print("total", sum(out.values()))
