#!/usr/bin/env bash
# vo-adr-remux — human ADR take → loudnorm (optional) → qa-gate → m2-human-adr-90s.mp4
# Never overwrites m1-machine-vo-90s.mp4.
#
# Usage:
#   ./scripts/vo-tools/vo-adr-remux.sh /path/to/human-take.wav
#   ./scripts/vo-tools/vo-adr-remux.sh          # uses research/.../vo-shorts-90s-ua-adr.wav
#
# Env:
#   VO_ADR_PROMOTE=1   also copy ADR stem → vo-shorts-90s-ua.wav (backup .bak first)
#   VO_FORCE_REMUX=1   remux even if qa-gate fails
#   VO_SKIP_LOUDNORM=1 skip loudnorm (input already −14 LUFS)
set -euo pipefail

TOOLS="$(cd "$(dirname "$0")" && pwd)"
PROTO="$(cd "$TOOLS/../.." && pwd)"
ASSETS="$(cd "$PROTO/../research/24-shorts-assets" && pwd)"
SHOTS="$PROTO/visual-shots/shorts-90s"
M0="$SHOTS/m0-silent-90s.mp4"
M2="$SHOTS/m2-human-adr-90s.mp4"
ADR_STEM="$ASSETS/vo-shorts-90s-ua-adr.wav"
MACHINE_STEM="$ASSETS/vo-shorts-90s-ua.wav"

need() { command -v "$1" >/dev/null || { echo "missing: $1" >&2; exit 1; }; }
need ffmpeg; need ffprobe; need python3

SRC="${1:-}"
if [[ -n "$SRC" ]]; then
  [[ -f "$SRC" ]] || { echo "FAIL: take not found: $SRC" >&2; exit 1; }
elif [[ -f "$ADR_STEM" ]]; then
  SRC="$ADR_STEM"
  echo "Using existing ADR stem: $ADR_STEM"
else
  cat >&2 <<EOF
FAIL: no human ADR take.

  Drop a recording, then:
    $0 /path/to/human-take.wav

  Or place loudnormed stem at:
    $ADR_STEM

  Booth script: $ASSETS/vo-adr-cue.txt
  Checklist:    $ASSETS/adr-booth.md
EOF
  exit 1
fi

[[ -f "$M0" ]] || { echo "FAIL: missing picture bed $M0" >&2; exit 1; }

mkdir -p "$SHOTS"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/vo-adr-XXXXXX")"
trap 'rm -rf "$TMP"' EXIT

echo "== loudnorm / prepare ADR stem =="
if [[ "${VO_SKIP_LOUDNORM:-0}" == "1" ]] && [[ "$SRC" == "$ADR_STEM" ]]; then
  echo "skip loudnorm (VO_SKIP_LOUDNORM=1, src=stem)"
else
  if [[ "${VO_SKIP_LOUDNORM:-0}" == "1" ]]; then
    ffmpeg -y -hide_banner -loglevel error -i "$SRC" -ar 48000 -ac 1 "$ADR_STEM"
  else
    ffmpeg -y -hide_banner -loglevel error -i "$SRC" \
      -af "loudnorm=I=-14:TP=-1.5:LRA=11" -ar 48000 -ac 1 "$ADR_STEM"
  fi
fi

DUR="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$ADR_STEM")"
echo "ADR stem duration=${DUR}s → $ADR_STEM"

echo "== vo-qa-gate =="
if ! python3 "$TOOLS/vo-qa-gate.py" --wav "$ADR_STEM"; then
  if [[ "${VO_FORCE_REMUX:-0}" == "1" ]]; then
    echo "WARN: QA FAIL but VO_FORCE_REMUX=1 — remuxing M2 anyway" >&2
  else
    echo "QA FAIL — not remuxing M2. Fix take or VO_FORCE_REMUX=1" >&2
    exit 1
  fi
fi

echo "== remux M2 (M1 untouched) =="
ffmpeg -y -hide_banner -loglevel error \
  -i "$M0" -i "$ADR_STEM" \
  -c:v copy -c:a aac -b:a 192k -t 90 -movflags +faststart \
  "$M2"

if [[ "${VO_ADR_PROMOTE:-0}" == "1" ]]; then
  echo "== promote ADR → vo-shorts-90s-ua.wav (backup .bak) =="
  if [[ -f "$MACHINE_STEM" ]]; then
    cp -f "$MACHINE_STEM" "${MACHINE_STEM}.bak"
  fi
  cp -f "$ADR_STEM" "$MACHINE_STEM"
fi

cat <<EOF
OK vo-adr-remux → $M2
  stem: $ADR_STEM
  M1 draft kept: $SHOTS/m1-machine-vo-90s.mp4
Next: re-score $ASSETS/listen-card.md on human take; tick scenario §7 ADR.
EOF
