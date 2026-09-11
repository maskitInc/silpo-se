#!/usr/bin/env python3
"""vo-plan-check — SSoT gate: plan file vs builder PLANs + stress coverage."""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib_plan import default_plan_path, parse_plan, plan_hash, total_window

ROOT = Path(__file__).resolve().parents[1]
BUILDERS = [
    ROOT / "shorts-vo-tts-uk.py",
    ROOT / "shorts-vo-local-styletts2.py",
]


def extract_quoted_ua(path: Path) -> list[str]:
    """Pull Ukrainian-ish quoted strings from PLAN blocks."""
    text = path.read_text(encoding="utf-8")
    # naive: strings containing Cyrillic
    found = re.findall(r'"([^"\n]*[А-Яа-яІіЇїЄєҐґ][^"\n]*)"', text)
    return [s.strip() for s in found]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--plan", type=Path, default=None)
    ap.add_argument("--min-stress", type=int, default=8, help="min + marks in whole plan (hero-only OK)")
    args = ap.parse_args()
    plan = args.plan or default_plan_path()
    beds = parse_plan(plan)
    errors: list[str] = []
    warns: list[str] = []

    if len(beds) != 8:
        errors.append(f"expected 8 beds, got {len(beds)}")
    tw = total_window(beds)
    if abs(tw - 90.0) > 0.01:
        errors.append(f"bed windows sum={tw}, expected 90")

    stress_total = sum(b.stress_marks for b in beds)
    if stress_total < args.min_stress:
        errors.append(f"stress marks={stress_total} < min {args.min_stress}")

    for b in beds:
        if b.stress_marks == 0:
            errors.append(f"[{b.tc}] no stress marks (+)")
        # Multisyllable tokens without any + (after removing punctuation)
        plain = re.sub(r"[—,:.!?]", " ", b.text_tts)
        tokens = plain.split()
        bare = [t for t in tokens if "+" not in t and len(re.sub(r"[^А-Яа-яІіЇїЄєҐґ']", "", t)) >= 5]
        if len(bare) >= 4:
            # Full list (do not truncate — buried метушні-class fails before).
            warns.append(f"[{b.tc}] unmarked long tokens ({len(bare)}): {', '.join(bare)}")
        # Ship ban: tts-uk stress on метушні unreliable → rewrite (artic-gate).
        if re.search(r"метушні", b.text_tts, flags=re.IGNORECASE):
            errors.append(
                f"[{b.tc}] ban «метушні» in ship copy — use «спокійно» / «без зайвих жестів»"
            )
        # Glue footgun: short pair should not sit mid-phrase after comma-only.
        if re.search(r"Склад поруч,", b.text_tts):
            warns.append(
                f"[{b.tc}] «Склад поруч,» mid-phrase → glue risk; prefer PLAN phrase «Склад поруч.»"
            )

    plan_src = plan.read_text(encoding="utf-8")
    for builder in BUILDERS:
        if not builder.exists():
            warns.append(f"missing builder {builder.name}")
            continue
        src = builder.read_text(encoding="utf-8")
        missing: list[str] = []
        for b in beds:
            # Allow joined beds in plan vs split phrases in builders.
            chunks = re.split(r"(?<=[.!?])\s+", b.text_tts)
            chunks = [c.strip() for c in chunks if c.strip()]
            for c in chunks:
                if c not in src:
                    missing.append(c)
        if missing:
            errors.append(
                f"{builder.name}: {len(missing)} phrase(s) not found. First: {missing[0][:70]}…"
            )
        # reverse: every Cyrillic quote in builder should appear in plan
        for q in extract_quoted_ua(builder):
            if q not in plan_src and q not in "".join(b.text_tts for b in beds):
                # allow speed/env strings without being plan lines — only long-ish
                if len(q) >= 20 and "+" in q:
                    warns.append(f"{builder.name}: extra stressed quote not in plan: {q[:50]}…")

    # say.sh should not be the stressed SSoT — warn if it still has Latin brands
    say = ROOT / "shorts-vo-say.sh"
    if say.exists():
        s = say.read_text(encoding="utf-8")
        if "Sport" in s or "Express" in s or "СільпоSE" in s:
            warns.append("shorts-vo-say.sh still has Latin/SE brands in edge beds — strip/sync later")

    # Captions must track plain ADR (no hand-stale SRT with метушні / —).
    cap = plan.parent / "captions-vo.srt"
    if cap.exists():
        cap_body = cap.read_text(encoding="utf-8")
        for tok in ("метушні", "—", "…"):
            if tok in cap_body:
                errors.append(f"captions-vo.srt contains banned {tok!r} — run vo-captions-export.py")
        for b in beds:
            for sent in re.split(r"(?<=[.!?])\s+", b.text_adr):
                sent = sent.strip()
                if len(sent) < 8:
                    continue
                if sent not in cap_body:
                    errors.append(
                        f"captions-vo.srt missing sentence from [{b.tc}]: {sent[:60]}… "
                        "(run vo-captions-export.py)"
                    )
                    break
    else:
        warns.append("missing captions-vo.srt — run vo-captions-export.py")

    print(f"plan={plan}")
    print(f"hash={plan_hash(plan)} beds={len(beds)} windows={tw}s stress_marks={stress_total}")
    for b in beds:
        print(f"  [{b.tc}] win={b.window_s:g}s +={b.stress_marks} tap={int(b.has_tap)} veil={int(b.has_veil)}")
    for w in warns:
        print(f"WARN: {w}")
    for e in errors:
        print(f"FAIL: {e}")
    if errors:
        print("vo-plan-check: FAIL")
        return 1
    print("vo-plan-check: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
