#!/usr/bin/env python3
"""vo-adr-export — human ADR cue sheet (stress marks stripped, markers kept)."""
from __future__ import annotations

import argparse
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib_plan import assets_dir, default_plan_path, parse_plan, plan_hash


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--plan", type=Path, default=None)
    ap.add_argument("--out", type=Path, default=None)
    args = ap.parse_args()
    plan = args.plan or default_plan_path()
    beds = parse_plan(plan)
    lines = [
        "# ADR cue — SilpoSE shorts 90s",
        f"# plan_hash={plan_hash(plan)}",
        "# Read calmly, conversational. Pause on [TAP]=0.28s and [VEIL]=0.42s.",
        "# Do NOT pronounce '+' — marks already stripped below.",
        "# For TTS: use only . , ? ! as pauses (tts-uk drops — : ; …).",
        "",
    ]
    for b in beds:
        marks = []
        if b.has_tap:
            marks.append("[TAP]")
        if b.has_veil:
            marks.append("[VEIL]")
        suffix = (" " + " ".join(marks)) if marks else ""
        # reconstruct with markers at end for beds that had mid markers — use raw ADR from script structure
        # Prefer: show ADR text and note mid markers from original
        body = b.text_adr
        if b.has_veil and "[VEIL]" in b.text_raw:
            # split at veil semantically for reader
            raw_no_plus = b.text_raw.replace("+", "")
            body = raw_no_plus  # keep [VEIL]/[TAP] placement
        elif b.has_tap and "[TAP]" in b.text_raw:
            raw_no_plus = b.text_raw.replace("+", "")
            body = raw_no_plus
        lines.append(f"[{b.tc}] {body}")
    lines.append("")
    lines.append(
        "# After recording: see adr-booth.md — loudnorm → qa-gate → m2-human-adr-90s.mp4 (keep m1 as draft)."
    )
    out = args.out or (assets_dir() / "vo-adr-cue.txt")
    text = "\n".join(lines) + "\n"
    out.write_text(text, encoding="utf-8")
    print(text)
    print(f"→ {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
