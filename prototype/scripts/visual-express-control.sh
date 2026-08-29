#!/bin/sh
# Express control jury path. Server: node server.mjs on :8766
# Shots + stills slideshow mp4 for voice-over (research/17).
set -e
B="${BROWSE:-$HOME/.cursor/skills/gstack/browse/dist/browse}"
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [ ! -x "$B" ]; then
  echo "BLOCKED: gstack browse missing" >&2
  exit 2
fi
"$B" restart >/dev/null 2>&1 || true
"$B" chain < visual-shots/chain-jury-express.json
echo "shots: $ROOT/visual-shots/21-jury-*.png"

OUT="visual-shots/21-jury-express-demo.mp4"
LIST="visual-shots/.jury-concat.txt"
rm -f "$LIST"
# Stable story order (seconds per still)
for pair in \
  "21-jury-home-pulse.png:4" \
  "21-jury-pulse-tip.png:3" \
  "21-jury-shop.png:3" \
  "21-jury-beacon.png:3" \
  "21-jury-qty.png:3" \
  "21-jury-after-receipt.png:3" \
  "21-jury-base-saved.png:3" \
  "21-jury-pogodyty.png:4"
do
  f="${pair%%:*}"
  d="${pair##*:}"
  if [ -f "visual-shots/$f" ]; then
    printf "file '%s/%s'\nduration %s\n" "$ROOT/visual-shots" "$f" "$d" >> "$LIST"
    last="$ROOT/visual-shots/$f"
  fi
done
if [ -n "${last:-}" ]; then
  printf "file '%s'\n" "$last" >> "$LIST"
fi
if [ ! -s "$LIST" ]; then
  echo "BLOCKED: no jury pngs for mp4" >&2
  exit 3
fi
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "WARN: ffmpeg missing — shots only, no $OUT" >&2
  exit 0
fi
ffmpeg -y -f concat -safe 0 -i "$LIST" \
  -vf "scale=390:844:force_original_aspect_ratio=decrease,pad=390:844:(ow-iw)/2:(oh-ih)/2,format=yuv420p" \
  -r 30 -movflags +faststart "$OUT" >/dev/null 2>&1
rm -f "$LIST"
echo "demo: $ROOT/$OUT"
ls -la "$OUT"
