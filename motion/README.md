# موظف X10 — كيف تكون عضوًا فعّالًا في الفريق؟

A 180-second vertical motion graphic (1080×1920, 60 fps) that tells the story of Stephen R. Covey's
*The 7 Habits of Highly Effective People*. It uses kinetic Arabic typography and a 2D paper-cutout / Vox-style look.

**Final video:** [`../output/mowazaf-x10-7-habits.mp4`](../output/mowazaf-x10-7-habits.mp4)

## Structure

| Time | Scene |
|---|---|
| 0–9 s | Title card, the brand stamp, the book and author, the seven habit badges |
| 9–24 s | Why individual effectiveness matters: a team gear machine, one stuck gear, then a ×10 productivity chart |
| 24–29 s | Who was Stephen Covey: a paper polaroid portrait |
| 29–46 s | A map of his journey: Salt Lake City, Britain and Ireland, Harvard (Boston), BYU (Provo), FranklinCovey, Idaho Falls |
| 46–64 s | The book's story: 200 years of success literature, character ethic vs. personality ethic, the book as a paper cut-out, how facilitators are prepared |
| 64–78 s | The framework: See-Do-Get paradigms, habit = knowledge + skill + desire, the maturity continuum |
| 78–169 s | The 7 habits, 13 s each: the idea, a team example, and tools from the book |
| 169–180 s | Recap and brand lockup |

## Files

- `motion.js`: the whole animation. Every frame is a pure function of time, `renderFrame(t)`, drawn on a 2D canvas.
- `cues.js`: the shared timeline of impacts, whooshes, pops and so on. It drives both the camera shake and the sound design.
- `audio.py`: motion-reactive sound design with no music. Every sound is synthesised (numpy only) and placed on a cue.
- `sfxdump.js`: dry-runs the animation and logs the onset of every kinetic word, so each word gets its own sound.
- `render.js`: a parallel headless-Chromium frame renderer that pipes frames to ffmpeg/x264.
- `snap.js`: renders individual frames to JPEG for review.
- `fonts/`: Lalezar and Cairo (SIL OFL, via Fontsource).

## Preview & render

```bash
# live preview: open index.html in a browser (space = play/pause, ←/→ = seek, click = scrub, ?t=78 to start at 78s)

export NODE_PATH=$(npm root -g)          # needs playwright
node render.js build 4                   # 10800 frames -> build/seg_*.mp4
node -e "console.log(JSON.stringify(require('./cues.js').CUES))" > build/cues.json
NODE_PATH=$(npm root -g) node sfxdump.js build/words.json
python3 audio.py build/cues.json build/words.json build/audio.wav
ls build/seg_*.mp4 | sed "s/.*/file '&'/" > build/list.txt
ffmpeg -f concat -safe 0 -i build/list.txt -i build/audio.wav -c:v copy -c:a aac -b:a 192k -shortest out.mp4
```
