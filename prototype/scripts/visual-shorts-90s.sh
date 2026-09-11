#!/bin/sh
# Draft silent M0 (~90s stills) + mux M1 with research/24-shorts-assets VO.
# Demo path: do NOT click #print (OTP). Server: node server.mjs on :8766
set -e
B="${BROWSE:-$HOME/.cursor/skills/gstack/browse/dist/browse}"
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
LIFE="$(CDPATH= cd -- "$ROOT/.." && pwd)"
ASSETS="$LIFE/research/24-shorts-assets"
SHOTS="$ROOT/visual-shots/shorts-90s"
cd "$ROOT"

if [ ! -x "$B" ]; then
  echo "BLOCKED: gstack browse missing ($B)" >&2
  exit 2
fi
if ! curl -sf -o /dev/null "http://127.0.0.1:8766/"; then
  echo "BLOCKED: server not on :8766 — run: node server.mjs" >&2
  exit 2
fi

mkdir -p "$SHOTS"
"$B" restart >/dev/null 2>&1 || true
"$B" chain < visual-shots/chain-shorts-90s.json
echo "shots: $SHOTS/24-m0-*.png"

OUT_RAW="$SHOTS/m0-raw-90s.mp4"
OUT_SILENT="$SHOTS/m0-silent-90s.mp4"
OUT_M1="$SHOTS/m1-machine-vo-90s.mp4"
LIST="$SHOTS/.m0-concat.txt"
rm -f "$LIST"

# Durations aligned to scenario / captions-silent-burnin.srt (sum 90)
for pair in \
  "24-m0-a-home.png:10" \
  "24-m0-b-rituals.png:8" \
  "24-m0-c-sport-tip.png:10" \
  "24-m0-d-day.png:7" \
  "24-m0-d-plates.png:7" \
  "24-m0-e-handoff.png:6" \
  "24-m0-f-budget.png:10" \
  "24-m0-g-qty.png:8" \
  "24-m0-g-control.png:9" \
  "24-m0-h-pogodyty.png:15"
do
  f="${pair%%:*}"
  d="${pair##*:}"
  if [ -f "$SHOTS/$f" ]; then
    printf "file '%s/%s'\nduration %s\n" "$SHOTS" "$f" "$d" >> "$LIST"
    last="$SHOTS/$f"
  else
    echo "WARN: missing still $f" >&2
  fi
done
if [ -n "${last:-}" ]; then
  printf "file '%s'\n" "$last" >> "$LIST"
fi
if [ ! -s "$LIST" ]; then
  echo "BLOCKED: no shorts pngs for mp4" >&2
  exit 3
fi
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "WARN: ffmpeg missing — shots only" >&2
  exit 0
fi

ffmpeg -y -f concat -safe 0 -i "$LIST" \
  -vf "scale=390:844:force_original_aspect_ratio=decrease,pad=390:844:(ow-iw)/2:(oh-ih)/2,format=yuv420p,fps=30" \
  -pix_fmt yuv420p -movflags +faststart "$OUT_RAW.tmp.mp4" >/dev/null 2>&1
ffmpeg -y -i "$OUT_RAW.tmp.mp4" -t 90 -c copy -movflags +faststart "$OUT_RAW" >/dev/null 2>&1
rm -f "$OUT_RAW.tmp.mp4"

SRT="$ASSETS/captions-silent-burnin.srt"
if [ -f "$SRT" ]; then
  # Escape path for subtitles filter (colons)
  SRT_ESC=$(printf '%s' "$SRT" | sed "s/:/\\\\:/g")
  ffmpeg -y -i "$OUT_RAW" -t 90 \
    -vf "subtitles=${SRT_ESC}:force_style='FontName=Helvetica,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=48,Alignment=2'" \
    -an -movflags +faststart "$OUT_SILENT" >/dev/null 2>&1
else
  cp "$OUT_RAW" "$OUT_SILENT"
  echo "WARN: no SRT — silent without burn-in" >&2
fi

VO="$ASSETS/vo-shorts-90s-ua.wav"
if [ -f "$VO" ]; then
  ffmpeg -y -i "$OUT_SILENT" -i "$VO" \
    -c:v copy -c:a aac -b:a 192k -t 90 -movflags +faststart "$OUT_M1" >/dev/null 2>&1
  echo "m1: $OUT_M1"
else
  echo "WARN: no VO wav — skip M1 mux" >&2
fi

# Intermediate raw is only needed to produce silent; drop to avoid stale media.
rm -f "$OUT_RAW" "$OUT_RAW.tmp.mp4"
rm -f "$LIST"
echo "m0-silent: $OUT_SILENT"
ls -la "$SHOTS"/24-m0-*.png "$OUT_SILENT" "$OUT_M1" 2>/dev/null || true
ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$OUT_SILENT" 2>/dev/null || true
