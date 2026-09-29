# eDialogue — 30s motion showreel

A 30-second, 1920×1080 motion graphics piece for [edialogue.org](https://edialogue.org).
The piece is built as a deterministic HTML/CSS 3D timeline (`index.html`). Headless Chromium renders it frame by frame, and it is encoded with ffmpeg alongside a synthesized, beat-synced soundtrack (`audio.py`).

**Output:** `edialogue-showreel.mp4` (H.264 + AAC, 30 fps, 2-sample motion blur)

## Storyboard (120 BPM, drop at 3.6s)

| Time | Scene | Motion |
|---|---|---|
| 0.0–3.7 | **The questions**: "What is the meaning of life?" / "Why are we here?" / "What happens after death?" | Words fly in from Z-depth and push through the camera; a mask reveal ends in a whip-pan; per-letter flips shatter into 3D |
| 3.6–5.9 | **Find your PURPOSE in life.** | 3D-extruded type, camera orbit, speed grid floor |
| 5.6–12.7 | **Product UI**: the edialogue.org hero and the live-chat widget | An iris reveal opens on a 3D browser. The cursor clicks *Start Live Chat* and the widget slides in. Messages pop in with a typing indicator, and the chat switches from EN to ES. Floating feature cards, then "Real people. Real answers. Right now." |
| 12.4–17.6 | **16+ languages** | A 3D carousel of 16 greetings, an extruded counter that ticks from 0 to 16+, and "One conversation. Any language." |
| 17.6–21.7 | **Feature slams**: 24/7 · 1:1 · 0 pressure · since 2011 | Colour-block wipes on the beat, 3D numerals, staggered type |
| 21.5–26.1 | **"Every question deserves a conversation."** | A tunnel of real visitor-style questions in several languages rushes past the camera, then converges |
| 26.1–30.0 | **Logo reveal** | Shockwave rings. The two-bubble mark flips in, its dots bounce, and the wordmark rises. Gradient underline, the tagline *Find Your Purpose in Life*, and an edialogue.org pill |

## Re-rendering

```bash
npm install                  # fonts (Inter Tight + Noto Arabic/Devanagari/KR via @fontsource)
pip install numpy imageio-ffmpeg
python3 audio.py soundtrack.wav
node render.js edialogue-showreel.mp4           # FPS=30 SUB=2 by default
node stills.js 4.8 9 15.5 27.2                  # quick preview stills → ./stills
```

To preview live, open `index.html?play` in a browser (serve the folder so the font CSS loads). To check a single frame, use `index.html?t=12.5`.

## Brand notes / assumptions

The environment's network policy blocked edialogue.org itself, so the brand research came from search results about the site and organisation. The messaging used here comes from those results: "Find Your Purpose in Life", "An eDialogue Initiative", the three questions, "operators available 24/7 to welcome your questions about Islam", live chat in 16+ languages, one-to-one private chat, the fun/friendly/non-pressuring tone, founded 2011, registered non-profit #1882 in Riyadh, and the nav pages (About Us, FAQ, Shop, Contact Us).

Three things are **stand-ins**. Swap them before public use:

- **Colours:** the teal, gold and ink tokens in `:root` of `index.html` are approximations. Replace them with the official hex values.
- **Logo:** the two-speech-bubble mark and the "eDialogue" wordmark are a reconstruction. Replace `MARK_SVG` with the official SVG.
- **Language list:** the 16 greetings are illustrative. Edit `LANGS` to match the languages the service actually offers.
