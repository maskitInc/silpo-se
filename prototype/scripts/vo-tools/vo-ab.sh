#!/usr/bin/env bash
# vo-ab — build two stems for blind listen (engine A vs B), write shuffled order
set -euo pipefail
TOOLS="$(cd "$(dirname "$0")" && pwd)"
PROTO="$(cd "$TOOLS/../.." && pwd)"   # …/prototype
ASSETS="$(cd "$PROTO/../research/24-shorts-assets" && pwd)"
SHOTS="$PROTO/visual-shots/shorts-90s"
A="${1:-ttsuk}"
B="${2:-local}"

need() { command -v "$1" >/dev/null || { echo "missing: $1" >&2; exit 1; }; }
need python3; need ffmpeg; need ffprobe

python3 "$TOOLS/vo-plan-check.py"

mux() {
  local wav="$1" mp4="$2"
  ffmpeg -y -hide_banner -loglevel error \
    -i "$SHOTS/m0-silent-90s.mp4" -i "$wav" \
    -c:v copy -c:a aac -b:a 192k -t 90 -movflags +faststart "$mp4"
}

cd "$PROTO"
echo "== A engine=$A =="
SHORTS_VO_ENGINE="$A" SHORTS_VO_OUT_STEM="vo-ab-a" ./scripts/shorts-vo-say.sh
mux "$ASSETS/vo-ab-a.wav" "$SHOTS/m1-ab-a-90s.mp4"
python3 "$TOOLS/vo-qa-gate.py" --wav "$ASSETS/vo-ab-a.wav" --json-out "$ASSETS/vo-ab-a-qa.json" || true

echo "== B engine=$B =="
SHORTS_VO_ENGINE="$B" SHORTS_VO_OUT_STEM="vo-ab-b" ./scripts/shorts-vo-say.sh
mux "$ASSETS/vo-ab-b.wav" "$SHOTS/m1-ab-b-90s.mp4"
python3 "$TOOLS/vo-qa-gate.py" --wav "$ASSETS/vo-ab-b.wav" --json-out "$ASSETS/vo-ab-b-qa.json" || true

# restore default stem from A or leave last — rebuild default recommended via vo-build
ORDER_FILE="$ASSETS/ab-listen-order.txt"
python3 - <<PY
import random
from pathlib import Path
items = [
  ("X", "visual-shots/shorts-90s/m1-ab-a-90s.mp4", "$A"),
  ("Y", "visual-shots/shorts-90s/m1-ab-b-90s.mp4", "$B"),
]
random.shuffle(items)
Path("$ORDER_FILE").write_text(
  "# Blind listen — do NOT look at engine names until scored\\n"
  + "\\n".join(f"{lab}: {path}  # reveal_later={eng}" for lab, path, eng in items)
  + "\\n",
  encoding="utf-8",
)
print(Path("$ORDER_FILE").read_text())
PY

echo "OK A/B ready. Blind order → $ORDER_FILE"
echo "After pick: SHORTS_VO_ENGINE=<winner> ./scripts/vo-tools/vo-build.sh"
