#!/usr/bin/env bash
# vo-takes-watch — when a human take appears in takes/, remux M2 automatically.
# Run in background; safe to leave overnight. Does not invent ADR.
#
# Usage (from prototype/):
#   ./scripts/vo-tools/vo-takes-watch.sh           # foreground
#   ./scripts/vo-tools/vo-takes-watch.sh --daemon  # detach (macOS/agent-safe)
#   ./scripts/vo-tools/vo-takes-watch.sh --once    # scan once and exit
set -euo pipefail
TOOLS="$(cd "$(dirname "$0")" && pwd)"
PROTO="$(cd "$TOOLS/../.." && pwd)"
ASSETS="$(cd "$PROTO/../research/24-shorts-assets" && pwd)"
TAKES="$ASSETS/takes"
M2="$PROTO/visual-shots/shorts-90s/m2-human-adr-90s.mp4"
STAMP="$TAKES/.last-remuxed"
PIDFILE="$TAKES/watch.pid"
LOG="$TAKES/watch.log"

if [[ "${1:-}" == "--daemon" ]]; then
  # Plain nohup often dies with agent parent shells; start_new_session survives.
  python3 - "$TOOLS" "$PIDFILE" "$LOG" <<'PY'
import subprocess, sys
from pathlib import Path
tools, pidfile, logpath = map(Path, sys.argv[1:4])
script = tools / "vo-takes-watch.sh"
log = open(logpath, "a", buffering=1)
# stop previous
old = pidfile.read_text().strip() if pidfile.exists() else ""
if old.isdigit():
    subprocess.run(["kill", old], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
p = subprocess.Popen(
    [str(script)],
    cwd=str(tools.parent.parent),
    stdout=log,
    stderr=log,
    stdin=subprocess.DEVNULL,
    start_new_session=True,
)
pidfile.write_text(str(p.pid) + "\n")
print(f"daemon pid={p.pid} log={logpath}")
PY
  exit 0
fi

ONCE=0
[[ "${1:-}" == "--once" ]] && ONCE=1

pick_take() {
  # Newest audio in takes/ (ignore README / PUT / stamp)
  find "$TAKES" -maxdepth 1 -type f \( \
      -iname '*.wav' -o -iname '*.mp3' -o -iname '*.m4a' -o -iname '*.aiff' -o -iname '*.caf' \
    \) ! -name '.*' 2>/dev/null | while read -r f; do
    echo "$(stat -f '%m' "$f" 2>/dev/null || stat -c '%Y' "$f")|$f"
  done | sort -nr | head -1 | cut -d'|' -f2-
}

echo "watching $TAKES (Ctrl+C stop). drop human-take.wav → remux M2"
while true; do
  take="$(pick_take || true)"
  if [[ -n "${take:-}" && -f "$take" ]]; then
    prev=""
    [[ -f "$STAMP" ]] && prev="$(cat "$STAMP")"
    key="$(stat -f '%m %z' "$take" 2>/dev/null || stat -c '%Y %s' "$take") $take"
    if [[ "$key" != "$prev" ]]; then
      echo "== remux $(date -u +%H:%M:%SZ) ← $take"
      if "$TOOLS/vo-adr-remux.sh" "$take"; then
        echo "$key" > "$STAMP"
        echo "OK M2 → $M2"
      else
        echo "FAIL remux (will retry on next change)" >&2
      fi
    fi
  fi
  [[ "$ONCE" == "1" ]] && exit 0
  sleep 5
done
