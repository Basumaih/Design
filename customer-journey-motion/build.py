"""Build the motion graphic: timeline -> index.html, then sound effects -> sfx.mp3.

Each line in script.json is a beat of the story. Its on-screen time comes from
its length at a comfortable reading pace; cues (phrase positions inside a line)
time the elements that belong to that beat. The timeline is injected into
template.html -> index.html. sfx.py then reads the event list the page derives
from the same timeline and renders the sound-effects track.

Usage: python3 build.py
"""
import json, pathlib

HERE = pathlib.Path(__file__).parent
CPS = 25            # brisk reading pace, characters per second
LEAD, GAP, TAIL = 0.5, 0.25, 0.5
MIN_SEG = {"c": 4.2, "a": 3.6}          # challenge vignettes and app screens need room to play
MIN_SCENE = {"s1": 5.2, "s2": 4.6, "s5": 10.0, "s6": 10.0, "s9": 4.0}
SCENE_ORDER = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9"]

segs = json.loads((HERE / "script.json").read_text())
for s in segs:
    s["dur"] = max(2.4, MIN_SEG.get(s["id"][0], 0), len(s["text"]) / CPS)

t, scenes = 0.0, {}
for sc in SCENE_ORDER:
    start, cur = t, t + LEAD
    for s in [s for s in segs if s["scene"] == sc]:
        s["s"], s["e"] = cur, cur + s["dur"]
        cur = s["e"] + GAP
    end = max(cur - GAP + TAIL, start + MIN_SCENE.get(sc, 0))
    scenes[sc] = {"s": round(start, 3), "e": round(end, 3)}
    t = end

cues = {}
for s in segs:
    cues[s["id"]] = round(s["s"], 3)
    for name, phrase in s.get("cues", {}).items():
        pos = s["text"].find(phrase)
        assert pos >= 0, (s["id"], phrase)
        cues[name] = round(s["s"] + s["dur"] * pos / len(s["text"]), 3)

timeline = {"dur": round(t, 3), "scenes": scenes, "cues": cues,
            "segs": {s["id"]: {"s": round(s["s"], 3), "e": round(s["e"], 3)} for s in segs}}
tpl = (HERE / "template.html").read_text()
(HERE / "index.html").write_text(tpl.replace("/*__TIMELINE__*/null", json.dumps(timeline, ensure_ascii=False)))
print(f"duration {t:.1f}s")
for k, v in scenes.items():
    print(k, v)
