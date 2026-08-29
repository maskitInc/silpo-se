#!/bin/sh
# Tri-plates replay (ds362–ds363). Prereq: node server.mjs on :8766
set -e
B="${BROWSE:-$HOME/.cursor/skills/gstack/browse/dist/browse}"
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [ ! -x "$B" ]; then
  echo "BLOCKED: gstack browse missing at $B" >&2
  exit 2
fi
run_chain() {
  if [ "${BROWSE_RESTART:-0}" = "1" ]; then
    "$B" restart >/dev/null 2>&1 || true
    sleep 1
  fi
  "$B" chain < "$1"
}
run_chain visual-shots/chain-tri-plates-ds362.json
run_chain visual-shots/chain-tri-plates-ds363.json
echo "shots: $ROOT/visual-shots/research/tri-plates-express/45-47"
