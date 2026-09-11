#!/usr/bin/env bash
# vo-adr-guide — 90s booth timing bed: bed-start beeps + optional ducked machine.
# NOT human ADR. Does not write M2 / ADR stem.
#
# Usage (from prototype/):
#   ./scripts/vo-tools/vo-adr-guide.sh
#
# Env:
#   VO_GUIDE_NO_MACHINE=1   beeps only (no machine under)
#   VO_GUIDE_MUX=1          also mux onto m0 → m0-guide-practice-90s.mp4
set -euo pipefail

TOOLS="$(cd "$(dirname "$0")" && pwd)"
PROTO="$(cd "$TOOLS/../.." && pwd)"
ASSETS="$(cd "$PROTO/../research/24-shorts-assets" && pwd)"
SHOTS="$PROTO/visual-shots/shorts-90s"
M0="$SHOTS/m0-silent-90s.mp4"
OUT_WAV="$ASSETS/vo-adr-guide-90s.wav"
OUT_MP4="$SHOTS/m0-guide-practice-90s.mp4"
MACHINE="$ASSETS/vo-shorts-90s-ua.wav"

need() { command -v "$1" >/dev/null || { echo "missing: $1" >&2; exit 1; }; }
need ffmpeg

# BED_WINDOWS starts (ms) — must match lib_plan.py
STARTS_MS=(0 10000 18000 28000 42000 48000 58000 75000)
BEEP_S=0.08
BEEP_HZ=1000
DUR_S=90
N=${#STARTS_MS[@]}

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# One short beep → N delayed copies → mix onto silence
FILTER="[1]asplit=${N}"
for i in $(seq 0 $((N - 1))); do
  FILTER+="[s${i}]"
done
FILTER+=";"
for i in $(seq 0 $((N - 1))); do
  ms="${STARTS_MS[$i]}"
  FILTER+="[s${i}]adelay=${ms}|${ms},volume=0.9[b${i}];"
done
MIX_IN="[0]"
for i in $(seq 0 $((N - 1))); do
  MIX_IN+="[b${i}]"
done
FILTER+="${MIX_IN}amix=inputs=$((N + 1)):duration=first:dropout_transition=0:normalize=0[beeps]"

ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "anullsrc=r=48000:cl=mono:d=${DUR_S}" \
  -f lavfi -i "sine=f=${BEEP_HZ}:d=${BEEP_S}" \
  -filter_complex "$FILTER" \
  -map "[beeps]" -t "$DUR_S" -ar 48000 -ac 1 \
  "$TMP/beeps.wav"

if [[ "${VO_GUIDE_NO_MACHINE:-0}" == "1" ]] || [[ ! -f "$MACHINE" ]]; then
  cp "$TMP/beeps.wav" "$OUT_WAV"
  if [[ ! -f "$MACHINE" ]]; then
    echo "note: no machine stem; beeps-only guide → $OUT_WAV"
  else
    echo "beeps-only guide → $OUT_WAV"
  fi
else
  # Machine very low — timing only; talent must not shadow TTS wording
  ffmpeg -y -hide_banner -loglevel error \
    -i "$TMP/beeps.wav" \
    -i "$MACHINE" \
    -filter_complex \
      "[1]atrim=0:${DUR_S},asetpts=PTS-STARTPTS,volume=0.10[m];\
       [0][m]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[out]" \
    -map "[out]" -t "$DUR_S" -ar 48000 -ac 1 \
    "$OUT_WAV"
  echo "guide (beeps + ducked machine) → $OUT_WAV"
fi

if [[ "${VO_GUIDE_MUX:-0}" == "1" ]]; then
  [[ -f "$M0" ]] || { echo "FAIL: missing $M0" >&2; exit 1; }
  ffmpeg -y -hide_banner -loglevel error \
    -i "$M0" -i "$OUT_WAV" \
    -c:v copy -c:a aac -t "$DUR_S" \
    "$OUT_MP4"
  echo "practice picture → $OUT_MP4"
fi
