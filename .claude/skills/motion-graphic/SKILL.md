---
name: motion-graphic
description: Produce a finished, portfolio-grade motion graphic video (MP4 with sound design) — kinetic typography, hand-drawn pencil + colorful 2D icon style, correct right-to-left Arabic, vertical 9:16 1080×1920 @ 60fps by default — rendered procedurally (canvas → Playwright → ffmpeg) with a synthesized soundtrack, delivered in a music version and an SFX-only version. Use this skill whenever the user asks for a motion graphic, موشن قرافيك / موشن جرافيك, animated explainer, promo or reel video, animated video for a hackathon/idea/product/initiative, kinetic typography, or "حوّل هذه الفكرة إلى فيديو متحرك" — even if they don't say "motion graphic" explicitly. Always starts by collecting the 7 required inputs from the user.
---

# Motion Graphic

Turns an idea into a finished animated video: storyboard → procedural animation → frame render → synthesized sound → MP4. The look that the user signed off on is **hand-drawn pencil lines + colored-pencil hatching + colorful 2D icons + bold kinetic type**, with creative transitions (ink drops, marker scribble wipes, a car pulling the next scene, an eraser, a phone zooming to full screen, a star iris).

## Step 1 — Ask for the inputs first (always)

Before designing anything, ask the user for these seven things, in their language (Arabic by default), in one message. Don't start building until you have them; if some are missing, ask once more for just those. Everything else (storyboard, pacing, transitions, sound) is your creative call.

Ask exactly this (you may translate if the user writes in English):

> لأصمّم لك الموشن قرافيك، أحتاج المعلومات الأساسية التالية:
> 1. **مدة الفيديو بالثواني** (مثال: ٣٠، ٤٥، ٦٠)
> 2. **العنوان الرئيسي للمقطع**
> 3. **وصف قصير للفكرة** (الرسالة في جملة أو جملتين)
> 4. **النقاط الأساسية** التي يجب أن يغطيها المقطع
> 5. **ما تريد من المشاهد فعله** إن وجد — مثل: «سجّل الآن»، «زر موقعنا»، «حمّل التطبيق» (اختياري)
> 6. **اسم الجهة أو المشروع**
> 7. **ألوان الهوية** (أكواد HEX أو أسماء الألوان)

Defaults unless the user says otherwise: vertical 9:16, 1080×1920, 60 fps; font **Thmanyah (خط ثمانية)** — Sans for most text, Serif Display for the hero title word(s); brand colors + white as the full palette (no off-palette colors, even for semantics like "occupied" — use a lit/unlit or light/dark variant of a brand color instead).

## Step 2 — Content rules (why: the user presents this publicly)

- **Accuracy over flair.** Use the user's wording. Fix obvious spelling slips (e.g. تغير→تغيير, اللى→إلى, التحربة→التجربة) and list every correction in the final message.
- **Don't invent facts, numbers, or claims.** Short labels that restate the brief are fine (chapter chips like «٠١ · الرسالة», card labels derived from the key points), but list any added text in the final message so the user can veto it. Use icons/bars instead of fake data inside UI mockups.
- **RTL done right.** Split Arabic only on spaces (never per-letter — it breaks shaping); lay words out right-to-left; wipes, carousels and progress bars move right→left; Arabic-Indic digits (٢٠٢٦) when the user writes them that way.
- **Legibility:** headline ≥ 90px, labels ≥ 34px at 1080 wide; keep a 70px side margin; nothing important in the top 170px (HUD) or bottom 80px (progress bar). The Thmanyah face is wide — measure long lines and shrink until they fit.
- **Call to action:** if given, it gets its own beat in the outro (big, on screen ≥ 2.5s, with a pill/button treatment). If not given, end on title + brand lockup.

## Step 3 — Storyboard on the music grid

Music is 128 BPM → 1 bar = 1.875s. Put every scene cut on a bar line so picture and sound lock together. Typical structure (scale to the requested duration; ~7 scenes for 60s, ~4–5 for 30s):

| Beat | Content |
|---|---|
| Cold open (2 bars) | pencil draws a hero icon for the topic, burst, brand name |
| Title (4 bars) | slam / drop / rise kinetic type + a small narrative animation |
| Message (4 bars) | the idea sentence + an illustrated panel drawn by the pencil |
| One scene per key point (4–7 bars each) | a diagram/illustration that *demonstrates* the point (simulate behaviour, don't just list it) + labelled cards |
| Outro (3–4 bars) | title lockup, tagline from the message, CTA, stamped brand badge + confetti, fade |

Write the storyboard (scene, time, on-screen text, visual, transition, sound) as a short table in your reply before building, then proceed without waiting — the user asked for a finished video.

## Step 4 — Build

1. Create a project folder in the repo (e.g. `motion/<slug>/`) and copy the template:
   `cp -r <skill>/assets/template/* <project>/` and the scripts `<skill>/scripts/{render.mjs,audio.py}`.
2. **Fonts.** Thmanyah files are *not* bundled (license forbids redistribution). Download them for rendering: official site https://font.thmanyah.com; if that host is blocked, `https://raw.githubusercontent.com/engdawood/thmanyah-font-web/4266a9d/fonts/thmanyah-sans/woff2/thmanyah-sans-{Medium,Bold,Black}.woff2` and `.../thmanyah-serif-display/woff2/thmanyah-serif-display-{Bold,Black}.woff2` into `<project>/fonts/`. Add `*.woff2` for that folder to `.gitignore` and tell the user why the files aren't committed. If the user names a different brand font, use it instead (check its license the same way).
3. **Edit `motion.js`.** Read `references/engine.md` first — it maps the reusable engine (pencil strokes, fills, kinetic text, ~35 icons, backgrounds, transitions, HUD, cue sheet). Keep the engine; replace the palette `C`, the fonts `F`, `DUR`, the scene times `S`, the scene functions, `SCENES`, `TRANS`, `IMPACTS`, the HUD labels, and the `cue(...)` calls. Build new icons from `shape()/pen()` when the topic needs them.
4. **Design bar** — a Dribbble-level reel, so each scene should have: layered depth (background texture + drifting doodles + main illustration + type + HUD), something *drawn* by the visible pencil, at least one element that moves continuously (cars, sweeping cones, floating icons), beat-synced pulses, camera shake on impacts, and a distinct transition into the next scene.
5. **Sound design** lives in the same file as `cue(t, type, …)` calls next to each animation, so audio never drifts from picture. Types: `pencil{d}`, `pop`, `pops{n,gap,hi}`, `swish{n,gap}`, `whoosh`, `whooshS`, `whooshUp`, `riser{d}`, `riserS{d}`, `impact{big}`, `slam`, `marker`, `scribbleS`, `erase{d}`, `vroom`, `car{d}`, `carin{soft}`, `horn{hi}`, `tick{d}`, `slash`, `beep`, `shutter`, `chime`, `click`, `ding{i}`, `sparkle`, `stamp`, `confetti`. Music arrangement: `cue(t, 'music', {name})` with `intro | full | tension | build | end` (use `tension` under a "problem" scene and `build` in the bar before the solution).

## Step 5 — QA stills before the full render (saves ~5 minutes per mistake)

```bash
ROOT=<project> node <project>/render.mjs stills <scratch>/st 1 5 9 14 ...   # one or two times per scene + mid-transition
ffmpeg -pattern_type glob -i '<scratch>/st/t*.png' -vf "scale=360:640,tile=6x2" sheet.png
```
Look at the contact sheet (and full-size frames for dense scenes). Check: text fits inside margins and cards, nothing overlaps the HUD, RTL reading order, colors strictly on-palette, icons aren't mirrored the wrong way (e.g. a barrier arm must lift *up*), transitions actually cover the frame. Fix and re-check.

## Step 6 — Render, mix, deliver

```bash
node render.mjs video <scratch>/v.mp4 4                          # 4 Chromium workers → x264 parts + cue sheet (~4–5 min for 60s)
python3 audio.py <scratch>/v.mp4.sfx.json <scratch>/music.wav            # music + SFX
python3 audio.py <scratch>/v.mp4.sfx.json <scratch>/sfx.wav --no-music   # SFX only
ffmpeg -f concat -safe 0 -i <scratch>/v.mp4.list -i <scratch>/music.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart -shortest <project>/output/<slug>.mp4
ffmpeg -i <project>/output/<slug>.mp4 -i <scratch>/sfx.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -movflags +faststart -shortest <project>/output/<slug>_sfx-only.mp4
```
Tools: needs Node + Playwright (Chromium), Python + numpy, and an ffmpeg with libx264 (`pip install imageio-ffmpeg` provides one if the system ffmpeg lacks it). Keep delivered MP4s under ~50 MB (crf 23 does that for 60s; grain is expensive, don't go lower). Run `ffmpeg -i` to confirm duration, 1080×1920, 60 fps, audio stream; render a waveform (`showwavespic`) to sanity-check the mix since you can't listen.

Deliver **both** versions (with music and SFX-only) plus a poster still, commit the project (not the fonts) and push. If a file-send tool has an upload cap (e.g. 30 MB), send a crf-30 preview copy and say the full-quality files are in the repo.

## Final message

In the user's language: what was made (duration/format/versions/where), a short scene-by-scene rundown, the list of spelling corrections and added labels, the font-license note, and offer the obvious next tweak (colors, wording, pacing, a horizontal 16:9 cut).
