#!/usr/bin/env bash
# Thmanyah fonts are not redistributed in this repo (license). This pulls them locally for rendering.
# Official source: https://font.thmanyah.com
set -euo pipefail
cd "$(dirname "$0")"; mkdir -p fonts
for fam in serif-display serif-text; do for w in Light Regular Medium Bold Black; do
  f=thmanyah-$fam-$w.woff2
  [ -f fonts/$f ] || curl -fsSL -o fonts/$f "https://raw.githubusercontent.com/engdawood/thmanyah-font-web/4266a9d/fonts/thmanyah-$fam/woff2/$f"
done; done
echo "fonts ready"
