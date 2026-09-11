#!/usr/bin/env bash
# vo-build — gated VO rebuild: plan-check → synth → qa-gate → listen-card → adr-export
set -euo pipefail
TOOLS="$(cd "$(dirname "$0")" && pwd)"
PROTO="$(cd "$TOOLS/../.." && pwd)"   # …/prototype
ASSETS="$(cd "$PROTO/../research/24-shorts-assets" && pwd)"
ENGINE="${SHORTS_VO_ENGINE:-auto}"

need() { command -v "$1" >/dev/null || { echo "missing: $1" >&2; exit 1; }; }
need python3; need ffmpeg; need ffprobe

echo "== vo-plan-check =="
python3 "$TOOLS/vo-plan-check.py"

echo "== build engine=$ENGINE =="
cd "$PROTO"
SHORTS_VO_ENGINE="$ENGINE" ./scripts/shorts-vo-say.sh

# enrich provenance
HASH="$(python3 - <<PY
import sys
sys.path.insert(0, "$TOOLS")
from lib_plan import plan_hash
print(plan_hash())
PY
)"
{
  echo "plan_hash=$HASH"
  echo "built_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "builder=vo-build"
} >> "$ASSETS/vo-engine.txt"

echo "== vo-qa-gate =="
if ! python3 "$TOOLS/vo-qa-gate.py"; then
  if [ "${VO_FORCE_REMUX:-0}" = "1" ]; then
    echo "WARN: QA FAIL but VO_FORCE_REMUX=1 — remuxing anyway" >&2
  else
    echo "QA FAIL — not remuxing. Fix VO or use ADR. (VO_FORCE_REMUX=1 to override)" >&2
    exit 1
  fi
fi

echo "== vo-artic-gate (isolates) =="
TTSUK_PY="${SHORTS_VO_VENV_TTSUK:-$ASSETS/.venv-tts-uk}/bin/python"
if [[ -x "$TTSUK_PY" ]]; then
  # Default WARN-only in build (VO_ARTIC_STRICT=1 to hard-fail). Isolates must exist.
  if [[ ! -f "$ASSETS/isolates/D-stress-alone.wav" ]]; then
    echo "note: regenerating isolates for artic-gate"
    SHORTS_VO_TTSUK_TAKES="${SHORTS_VO_TTSUK_TAKES:-4}" "$TTSUK_PY" "$TOOLS/vo-isolates.py"
  fi
  if ! VO_ARTIC_STRICT="${VO_ARTIC_STRICT:-0}" "$TTSUK_PY" "$TOOLS/vo-artic-gate.py"; then
    echo "ARTIC FAIL — ship text/glue/метушні lock (see vo-artic-report.json)" >&2
    exit 1
  fi
else
  # Text-only artic gate still runs on system python3
  if ! python3 "$TOOLS/vo-artic-gate.py"; then
    echo "ARTIC FAIL — ship text lock" >&2
    exit 1
  fi
fi

echo "== listen-card + adr-export =="
# Preserve scored listen-card (ADR decision) — do not clobber.
python3 "$TOOLS/vo-listen-card.py" --preserve >/dev/null
python3 "$TOOLS/vo-adr-export.py" >/dev/null
python3 "$TOOLS/vo-captions-export.py"
python3 "$TOOLS/vo-stress-preview.py" >/dev/null

if [ "${VO_REMUX:-1}" = "1" ]; then
  echo "== remux M1 =="
  ffmpeg -y -hide_banner -loglevel error \
    -i "$PROTO/visual-shots/shorts-90s/m0-silent-90s.mp4" \
    -i "$ASSETS/vo-shorts-90s-ua.wav" \
    -c:v copy -c:a aac -b:a 192k -t 90 -movflags +faststart \
    "$PROTO/visual-shots/shorts-90s/m1-machine-vo-90s.mp4"
fi

echo "OK vo-build → $ASSETS/vo-shorts-90s-ua.wav"
echo "Next: fill $ASSETS/listen-card.md (audio-only). Hard fail → ADR ($ASSETS/adr-booth.md)"
echo "ADR remux: $TOOLS/vo-adr-remux.sh /path/to/human-take.wav → m2-human-adr-90s.mp4"
