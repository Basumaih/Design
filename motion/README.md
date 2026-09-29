# تطوير رحلة عميل المحطات البترولية — Motion piece

60-second vertical motion graphic (1080×1920, 60 fps, H.264 + AAC) for **هاكاثون الطاقة ٢٠٢٦م**.

- `output/gas-station-journey_1080x1920_60fps.mp4` — final video
- `output/poster.jpg` — end-card still

## Structure (128 BPM, cuts on the bar)
| Time | Scene |
|---|---|
| 0:00 | Cold open — a pencil draws a fuel drop, brand reveal |
| 0:03.75 | Title — kinetic type, a car drives the journey road to the pump |
| 0:11.25 | ٠١ الرسالة — redesign of the station, design & digital layers |
| 0:18.75 | ٠٢ التحدي — the current model: crossing paths, congestion, waiting |
| 0:28.1 | ٠٣ النموذج المقترح — slanted booths, entry/exit lanes, barriers, cameras, vacant/occupied lamps (live car simulation) |
| 0:41.25 | ٠٤ التطبيق — journey from before arrival to rating: car data, nearby stations, cloud services, rating |
| 0:52.5 | Lockup + brand stamp |

## Rebuild
Everything is procedural (canvas 2D + synthesized audio); fonts are local (Lalezar, Cairo — OFL).
```sh
node render.mjs video out/v.mp4 4          # frames → x264 parts + cue sheet (needs Playwright/Chromium, ffmpeg)
python3 audio.py out/v.mp4.sfx.json a.wav  # music + SFX from the same cue sheet (numpy)
ffmpeg -f concat -safe 0 -i out/v.mp4.list -i a.wav -map 0:v -map 1:a -c:v libx264 -crf 23 -c:a aac out.mp4
```
Open `index.html` over a local server for a real-time preview (`?t=12.5` shows a single frame).
