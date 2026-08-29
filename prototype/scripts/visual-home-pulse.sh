#!/bin/sh
# Home dual-pulse mockup audit replay (CASE ds480c). Server: node server.mjs on :8766
set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if ! curl -sf -o /dev/null "http://127.0.0.1:8766/"; then
  echo "BLOCKED: start server first — node server.mjs" >&2
  exit 2
fi
node research/home-pulse-mockup-audit/audit.mjs i5
B="${BROWSE:-$HOME/.cursor/skills/gstack/browse/dist/browse}"
if [ -x "$B" ]; then
  "$B" restart >/dev/null 2>&1 || true
  "$B" chain < visual-shots/chain-home-pulse.json
  echo "browse chain: visual-shots/chain-home-pulse.json OK"
else
  echo "WARN: gstack browse missing — audit.mjs only" >&2
fi
echo "shots: $ROOT/research/home-pulse-mockup-audit/shots/i5-*.png"
