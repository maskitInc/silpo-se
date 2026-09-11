#!/usr/bin/env bash
# Optional one-phrase Azure Neural UA smoke (licensed twin of edge Polina).
# Does NOT replace the 90s ship path. Needs Azure Speech key.
#
# Usage:
#   AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=westeurope \
#     ./scripts/vo-tools/vo-azure-smoke.sh
# Optional: SMOKE_TEXT='...' SMOKE_VOICE=uk-UA-PolinaNeural
set -euo pipefail
TOOLS="$(cd "$(dirname "$0")" && pwd)"
ASSETS="$(cd "$TOOLS/../../../research/24-shorts-assets" && pwd)"
KEY="${AZURE_SPEECH_KEY:-}"
REGION="${AZURE_SPEECH_REGION:-}"
VOICE="${SMOKE_VOICE:-uk-UA-PolinaNeural}"
TEXT="${SMOKE_TEXT:-Ранок уже в русі. Хочеться одного ритму: тренування і стеля на продукти.}"
OUT="${SMOKE_OUT:-$ASSETS/vo-azure-smoke.wav}"

if [[ -z "$KEY" || -z "$REGION" ]]; then
  echo "Skip: set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION for licensed UA Neural smoke." >&2
  echo "Why optional: free cloud rarely beats local tts-uk friend-tone; Azure ≈ edge Polina you already heard." >&2
  exit 0
fi

need() { command -v "$1" >/dev/null || { echo "missing: $1" >&2; exit 1; }; }
need curl; need ffmpeg

TMP="$(mktemp -t azure-tts).mp3"
trap 'rm -f "$TMP"' EXIT

TOKEN="$(curl -sS -X POST \
  "https://${REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken" \
  -H "Ocp-Apim-Subscription-Key: ${KEY}" \
  -H "Content-Length: 0")"

SSML=$(cat <<EOF
<speak version='1.0' xml:lang='uk-UA'>
  <voice name='${VOICE}'>${TEXT}</voice>
</speak>
EOF
)

curl -sS -X POST \
  "https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/ssml+xml" \
  -H "X-Microsoft-OutputFormat: audio-24khz-48kbitrate-mono-mp3" \
  --data "$SSML" -o "$TMP"

ffmpeg -y -hide_banner -loglevel error -i "$TMP" -ar 48000 -ac 1 "$OUT"
echo "OK azure smoke voice=$VOICE → $OUT"
echo "A/B headphones vs research/24-shorts-assets/vo-shorts-90s-ua.wav (first ~10s)."
echo "If not clearly better on friend-tone → ADR (vo-adr-cue.txt), do not wire Azure into vo-build."
