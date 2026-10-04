# من جيد إلى عظيم — موظف X10 (Motion Graphic)

A 40-second vertical (1080×1920, 60 fps) kinetic-typography piece with a Vox-style look: 2D paper cut-outs, hand-drawn ink, and a narrated story about Jim Collins' *Good to Great* idea that the **people come first, then the direction**.

**Deliverable:** `out/good-to-great_mowazaf-x10_1080x1920_60fps.mp4` (H.264 + AAC, −14 LUFS)

## Story beats (timeline)

| Time | Scene | On screen |
|---|---|---|
| 0.0–5.7 | Hook | إيش الأهم في نجاح المنظمات — تحديد بوصلة الجهة **أم** اختيار الأشخاص الموهوبين؟ |
| 5.7–12.7 | The book + research | Book cover «من جيد إلى عظيم» · جيم كولنز · خمس سنوات من البحث · 1,435 dots → 11 · ×6.9 market return over 15 years |
| 12.7–15.8 | Findings board | The seven findings as sticky notes → «مَن أولًا… ثم إلى أين» |
| 15.8–20.9 | The bus | الموهوبون أهم من وجهة المنظمة — right people board, the wrong one is ejected, then the destination sign appears |
| 20.9–25.9 | Motivation | Motivation programmes crumple and get tossed → batteries charge → متحفّزون ذاتيًا |
| 26.2–33.4 | Wrong person | A wrong person boards, the sign is crystal clear, the bus still stalls → لن تصل المنظمة إلى وجهتها بأناسٍ: ضعفاء / غير متميزين / غير موهوبين |
| 33.4–40.0 | Outro | الأشخاص أولًا… ثم الوجهة → **موظف X10** brand stamp |

## Typography
- **Thmanyah Serif Display** carries the key messages: headlines, statements and the brand.
- **Thmanyah Serif Text** carries everything else: supporting lines, labels and credits.
- All Arabic is shaped by Chromium and laid out word by word **right to left**. Words are never split, so letter joining stays intact.

## Sound
There is no music. The sound is a narrated voice plus procedurally synthesised SFX tied to every on-screen action: whooshes, paper slaps, pops, marker squeaks, crumples, stamps, ticks, the bus engine, door hiss and horn, backfire, electric charge and confetti flutter, with room and city ambience underneath. The SFX duck automatically under the voice.

## Build
```bash
./build.sh          # fonts → narration → SFX mix → 2400 frames → final MP4
node render.mjs stills 3.5,10.2   # preview single frames into out/stills/
```
Needs `node` (Playwright + Chromium), `ffmpeg` and `python3` with `numpy` and `scipy`. The narration uses Google Translate's Arabic TTS endpoint.

## Files
- `timeline.json`: shared timing (VO cue points, scene windows)
- `js/core.js`: easing, springs, stop-motion "boil", RTL kinetic text, ink primitives, paper/grain/light textures
- `js/icons.js`: paper illustration kit (compass, people, bus, book, battery, props, sign, smoke, stamp)
- `js/scenes.js`: choreography for each scene and the transitions (cover swing, whip pan, colour morph, bus wipe, card flip, smoke)
- `audio/vo_gen.py`, `audio/sfx.py`: narration and the sound design and mix

## Notes
- The fonts are **not committed**, because the Thmanyah licence forbids redistribution. `fetch_fonts.sh` pulls them locally for rendering. The official source is https://font.thmanyah.com.
- The book cover is an original illustration, not the publisher's cover.
- Facts used: about 1,435 companies studied, 11 good-to-great companies, cumulative returns 6.9× the market over the 15 years after their transition points, and a five-year research project.
