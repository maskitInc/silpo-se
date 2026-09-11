#!/usr/bin/env python3
"""vo-stress-preview — dump per-bed stress marks (+ optional StyleTTS2 IPA)."""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib_plan import assets_dir, default_plan_path, parse_plan, plan_hash


def try_ipa(text: str) -> str | None:
    """Use StyleTTS2 frontend if .venv-tts available."""
    venv = assets_dir() / ".venv-tts" / "bin" / "python"
    local = Path(__file__).resolve().parents[1] / "shorts-vo-styletts2-local.py"
    if not venv.exists() or not local.exists():
        return None
    import subprocess

    r = subprocess.run(
        [str(venv), str(local), "--debug-stress", "--out", "/tmp/vo-stress-dummy.wav", "--text", text],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if r.returncode != 0:
        return None
    lines = [ln for ln in (r.stdout or "").splitlines() if ln.startswith("IPA")]
    return "\n".join(lines) if lines else (r.stdout or "").strip() or None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--plan", type=Path, default=None)
    ap.add_argument("--ipa", action="store_true", help="also run StyleTTS2 IPA dump (slow)")
    ap.add_argument("--out", type=Path, default=None)
    args = ap.parse_args()
    plan = args.plan or default_plan_path()
    beds = parse_plan(plan)
    out_lines = [
        f"# Stress preview — hash={plan_hash(plan)}",
        "",
        "Rule: `+` AFTER stressed vowel (Space / StyleTTS2).",
        "",
    ]
    for b in beds:
        out_lines.append(f"## [{b.tc}] window={b.window_s:g}s marks={b.stress_marks}")
        out_lines.append(f"- TTS: {b.text_tts}")
        out_lines.append(f"- ADR: {b.text_adr}")
        if args.ipa:
            print(f"IPA [{b.tc}]…", flush=True)
            ipa = try_ipa(b.text_tts)
            out_lines.append(f"- IPA: {ipa or '(unavailable)'}")
        out_lines.append("")
    text = "\n".join(out_lines)
    out = args.out or (assets_dir() / "stress-preview.md")
    out.write_text(text, encoding="utf-8")
    print(text)
    print(f"→ {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
