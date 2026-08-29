#!/bin/sh
# Replay visual chains. Server: node server.mjs on :8766
# Restart browse between chains — sequential chains often kill the page context.
set -e
B="${BROWSE:-$HOME/.cursor/skills/gstack/browse/dist/browse}"
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [ ! -x "$B" ]; then
  echo "BLOCKED: gstack browse missing" >&2
  exit 2
fi
run_chain() {
  "$B" restart >/dev/null 2>&1 || true
  "$B" chain < "$1"
}
run_chain visual-shots/chain-shop-controls.json
run_chain visual-shots/chain-sku-photos.json
run_chain visual-shots/chain-pick.json
run_chain visual-shots/chain-390-shop.json
run_chain visual-shots/chain-390-pick.json
run_chain visual-shots/chain-390-scroll.json
echo "shots: $ROOT/visual-shots/"
