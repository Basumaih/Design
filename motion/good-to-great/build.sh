#!/usr/bin/env bash
# Full build: fonts -> narration -> sound design -> frames -> final MP4
set -euo pipefail
cd "$(dirname "$0")"
./fetch_fonts.sh
python3 audio/vo_gen.py
python3 audio/sfx.py
ffmpeg -nostdin -v error -y -i audio/mix_raw.wav -af "acompressor=threshold=-16dB:ratio=2.5:attack=8:release=120,loudnorm=I=-14:TP=-1.2:LRA=9" -ar 48000 audio/mix.wav
node render.mjs video 4
ffmpeg -nostdin -v error -y -i out/video_noaudio.mp4 -i audio/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -movflags +faststart -shortest out/good-to-great_mowazaf-x10_1080x1920_60fps.mp4
echo "done -> out/good-to-great_mowazaf-x10_1080x1920_60fps.mp4"
