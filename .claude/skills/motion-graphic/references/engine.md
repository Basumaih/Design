# Engine reference — `assets/template/motion.js`

The template is a complete, working 60s piece (gas-station customer journey, هاكاثون الطاقة ٢٠٢٦م). The top half is a reusable engine; the bottom half (from `SCENES`) is example content to replace. Read the example scenes: they show the patterns for staging, timing and cues.

Everything is a pure function of time: `render(t)` draws frame `t` (seconds). No state carries between frames, so any frame can be rendered in any order by any worker. Keep it that way (derive motion from `t`, use `hash()`/`mulberry(seed)` for randomness, never `Math.random()`).

## Globals to set per project
| Name | What |
|---|---|
| `W, H, FPS, DUR` | 1080, 1920, 60, duration in seconds (`window.DUR` is read by the renderer) |
| `BPM, BEAT, BAR` | 128 BPM; put scene starts on multiples of `BAR` (1.875s) |
| `C` | palette. Keys are legacy names used by icons (`orange` = main accent, `yellow` = highlight, `ink` = line/text color, `cream` = white, `paper` = light bg, `red` = "problem" accent, `pale`/`paleG` = card tints). Remap values to the brand; keep keys. |
| `F` | `{ disp, serif, body }` font families (loaded in `fonts/fonts.css`, preloaded in `window.ready`) |
| `INKC` | current line/text color; set at the start of each scene (dark scenes use `C.cream`) |

## Math & timing
`clamp, lerp, seg(t, start, dur) → 0..1`, easings `E.outCubic/inCubic/inOutCubic/outBack(x,s)/outExpo/inExpo/outQuint/inOutSine/outElastic`, `hash(n)`, `vnoise(x)`, `mulberry(seed)`, `beatPulse(t)` (1 on each beat, decays).
Pattern: `const lt = t - S.sX; const k = seg(lt, 1.2, .5);` then drive everything from `k`.

## Pencil drawing
- `pen(pts, p, {color, w, closed, seed, amp, passes, dash, alpha})` — wobbly double-pass graphite line drawn to progress `p`; returns the tip `[x,y]` (feed it to `drawPencil(x, y)` to show the pencil drawing it). Lines "boil" at 12 fps.
- `fillPts(pts, color, p, {off:[dx,dy], hatch, gap, ha, alpha})` — marker fill with graphite hatching; `off` gives the misregistered print look.
- `shape(pts, fill, p, o)` — fill + outline with staggered progress (the standard way to draw any icon part).
- Point builders: `rrPts` (rounded rect), `ellPts` (ellipse/arc; `grow` for hand-drawn overshoot), `starPts`, `dropPts`, `spline` (Catmull-Rom), `roundCorners`, `unionOutline(circles)` (clouds/blobs), `densify`.
- Paths: `pathInfo(pts)` + `posOn(pi, s)` → `{x, y, ang}` for moving things along roads/lanes (ang is ready for `withT(..., ang, ...)` with icons that face up).

## Type (Arabic-safe)
- `txt(s, x, y, size, {fam, weight, color, align, shadow, sx, sy, outline, ow, alpha})` — RTL, middle baseline; `shadow` = hard offset sticker shadow; `outline` = sketchy double stroke.
- `kLine(str, x, y, size, t, t0, {type, stagger, dur, colors[], color, align, tOut, pulse, ...txt opts})` — per-word animation laid out right-to-left. Types: `pop`, `drop`, `slam`, `rise` (masked), `slide`. Returns `{info:[{cx,w}], total}` so you can circle/underline a specific word.
- `measure(s, size, fam, weight)`, `highlighter(xRight, y, w, h, p, color)` (swipes RTL), `pill(x, y, text, size, fill, color, p, {rot})`.

## Icons (≈100-unit boxes, centred; call inside `withT(x, y, scale, rot, () => ico...(p, color))`)
Transport/fuel: `icoPump, icoCarTop, icoCarSide(p,col,wheelSpin), icoBarrier(p,lift), icoDrop, icoGauge, icoJam`.
Smart/digital: `icoCamera, icoLamp(p,on,col), icoPhone, icoChip, icoWifi, icoGear(p,col,rot), icoCloud, icoPin`.
Services/feelings: `icoBasket, icoCup (animated steam), icoIce, icoStar(p,col,fillK), icoHeart, icoSmile, icoClock(p,speed), icoWarn, icoArrowsX, icoCompass, icoWrench`.
`popScale(k)` gives the overshoot pop-in. New icons: compose `shape()`/`pen()` calls in the same 100-unit box.

## Backgrounds & FX
`bg(color)`, `dotGrid(color, alpha, drift)`, `sunburst(cx, cy, n, rot, color, alpha)`, `doodles(t, seed, colors, count, alpha)` (drifting sparkles/squiggles for depth), `lightLeak(t, color, a)`, `glow(x, y, r, color, a)`, `chevronArrow`, `arrowHead`. Grain + vignette are added in `render()`.

## Scenes, transitions, HUD
- `SCENES = [[startTime, fn], ...]`; each `fn(t)` draws a full frame (it must paint its own background). A scene may be called slightly before its start during a transition — use `seg()` so it just shows its first state.
- `TRANS = [{at, pre, post, type}]` — types: `drop` (teardrop iris from the cold-open drop), `scribble` (marker zig-zag wipe + pencil), `road` (car drives across pulling the next scene), `eraser` (vertical zig-zag erase), `phone` (phone rises then zooms to full screen), `star` (rotating star iris). Scene B is rendered to an offscreen buffer and masked (`transMask`), decorations drawn by `transDeco`. Add a type by extending both.
- `IMPACTS = [[t, strength]]` — camera shake.
- `hud(t)` — brand name top-left, chapter pill top-right (edit `chips`), progress bar with a tiny car at the bottom. Adjust the `dark` test to match which scenes have dark backgrounds.
- Hard-coded end timings to update when `DUR ≠ 60`: `hud` visibility (`t < 59.5`), progress fade (`59.3`), end fade in the outro scene (`seg(t, 59.45, .55)`).

## Sound cue sheet
`cue(t, type, extra)` pushes to `window.SFX`; `render.mjs` exports `{dur, cues}` → `audio.py`. Place cues right next to the animation they belong to, using the same time expressions (e.g. `cue(S.s2 + .75, 'swish', {n: 2, gap: .12})` for a 2-word `rise` with stagger .12). Music sections: `cue(t, 'music', {name})`.
