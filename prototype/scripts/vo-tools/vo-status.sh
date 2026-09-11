#!/usr/bin/env bash
# vo-status — green/red readiness for SilpoSE 90s VO kit (no synth).
set -euo pipefail
TOOLS="$(cd "$(dirname "$0")" && pwd)"
PROTO="$(cd "$TOOLS/../.." && pwd)"
ASSETS="$(cd "$PROTO/../research/24-shorts-assets" && pwd)"
SHOTS="$PROTO/visual-shots/shorts-90s"

ok() { printf 'OK   %s\n' "$1"; }
bad() { printf 'FAIL %s\n' "$1"; FAIL=1; }
warn() { printf 'WARN %s\n' "$1"; }

FAIL=0
echo "== vo-status =="
echo "assets=$ASSETS"

ENG="$ASSETS/vo-engine.txt"
HASH_ENG=""
[[ -f "$ENG" ]] && HASH_ENG="$(grep -E '^plan_hash=' "$ENG" | tail -1 | cut -d= -f2)"
HASH_PLAN="$(python3 - <<PY
import sys
sys.path.insert(0, "$TOOLS")
from lib_plan import plan_hash
print(plan_hash())
PY
)"

if [[ -n "$HASH_ENG" && "$HASH_ENG" == "$HASH_PLAN" ]]; then
  ok "plan_hash=$HASH_PLAN (engine matches plain)"
else
  bad "plan_hash drift eng=${HASH_ENG:-none} plain=$HASH_PLAN — rebuild vo-build"
fi

for f in vo-script-plain-ua.txt vo-adr-cue.txt adr-booth.md listen-card.md \
         captions-vo.srt vo-shorts-90s-ua.wav vo-adr-guide-90s.wav; do
  [[ -f "$ASSETS/$f" ]] && ok "$f" || bad "missing $f"
done

[[ -f "$SHOTS/m0-silent-90s.mp4" ]] && ok "m0-silent-90s.mp4" || bad "missing m0"
[[ -f "$SHOTS/m1-machine-vo-90s.mp4" ]] && ok "m1-machine-vo-90s.mp4" || bad "missing m1"
[[ -f "$SHOTS/m0-guide-practice-90s.mp4" ]] && ok "m0-guide-practice-90s.mp4" || warn "no guide practice mp4"
[[ -f "$SHOTS/m2-human-adr-90s.mp4" ]] && ok "m2-human-adr-90s.mp4 (brand ship)" || warn "m2 absent — autonomous cut = M1"

if grep -q "plan_hash=$HASH_PLAN" "$ASSETS/vo-adr-cue.txt" 2>/dev/null; then
  ok "cue hash matches"
else
  bad "cue hash ≠ plain — run vo-adr-export.py"
fi

if python3 "$TOOLS/vo-plan-check.py" >/tmp/vo-status-plan.txt 2>&1; then
  ok "vo-plan-check PASS"
else
  bad "vo-plan-check FAIL (see /tmp/vo-status-plan.txt)"
fi

TAKE="$(find "$ASSETS/takes" -maxdepth 1 -type f \( -iname '*.wav' -o -iname '*.mp3' -o -iname '*.m4a' \) ! -name '.*' 2>/dev/null | head -1 || true)"
if [[ -n "${TAKE:-}" ]]; then
  ok "take present: $(basename "$TAKE")"
else
  warn "no human take (OK — M1 is autonomous cut)"
fi

WPID=""
[[ -f "$ASSETS/takes/watch.pid" ]] && WPID="$(tr -d '[:space:]' < "$ASSETS/takes/watch.pid")"
if [[ -n "$WPID" ]] && kill -0 "$WPID" 2>/dev/null; then
  ok "takes-watch daemon pid=$WPID"
else
  warn "takes-watch not running — ./scripts/vo-tools/vo-takes-watch.sh --daemon"
fi

voice="$(grep -E '^voice=' "$ENG" 2>/dev/null | cut -d= -f2 || true)"
[[ "$voice" == "mykyta" ]] && ok "draft voice=mykyta" || warn "draft voice=${voice:-unknown}"

echo "== end =="
if [[ "$FAIL" -ne 0 ]]; then
  echo "vo-status: FAIL"
  exit 1
fi
echo "vo-status: READY — autonomous working cut = M1 (mykyta). M2 only if human ADR appears."
exit 0
