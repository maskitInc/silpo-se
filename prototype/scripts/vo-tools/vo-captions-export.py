#!/usr/bin/env python3
"""vo-captions-export — captions-vo.srt from plain SSoT (ADR text, no + / markers)."""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib_plan import assets_dir, default_plan_path, parse_plan, plan_hash

SENT_SPLIT = re.compile(r"(?<=[.!?])\s+")


def tc_to_s(tc: str) -> float:
    a, b = tc.split(":")
    return int(a) * 60 + int(b)


def s_to_srt(t: float) -> str:
    if t < 0:
        t = 0.0
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = t % 60
    whole = int(s)
    ms = int(round((s - whole) * 1000))
    if ms == 1000:
        whole += 1
        ms = 0
    return f"{h:02d}:{m:02d}:{whole:02d},{ms:03d}"


def split_sentences(text: str) -> list[str]:
    parts = [p.strip() for p in SENT_SPLIT.split(text) if p.strip()]
    return parts or [text]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--plan", type=Path, default=None)
    ap.add_argument("--out", type=Path, default=None)
    ap.add_argument(
        "--tail-gap",
        type=float,
        default=0.2,
        help="seconds left empty at end of each bed window",
    )
    args = ap.parse_args()
    plan = args.plan or default_plan_path()
    beds = parse_plan(plan)
    out = args.out or (assets_dir() / "captions-vo.srt")

    cues: list[tuple[float, float, str]] = []
    for b in beds:
        start = tc_to_s(b.tc)
        usable = max(0.5, b.window_s - args.tail_gap)
        sents = split_sentences(b.text_adr)
        weights = [max(1, len(s)) for s in sents]
        total_w = sum(weights)
        t = start
        for s, w in zip(sents, weights):
            dur = usable * (w / total_w)
            end = t + dur
            cues.append((t, end, s))
            t = end

    # Soft lock: never ship banned tokens / TTS-poison punctuation in captions.
    banned = ("метушні", "—", "…", ";", ":")
    joined = "\n".join(c[2] for c in cues)
    for tok in banned:
        if tok in joined:
            print(f"FAIL captions banned token {tok!r}", file=sys.stderr)
            return 1

    blocks_out: list[str] = []
    for i, (a, b, text) in enumerate(cues, 1):
        blocks_out.append(str(i))
        blocks_out.append(f"{s_to_srt(a)} --> {s_to_srt(b)}")
        blocks_out.append(text)
        blocks_out.append("")
    out.write_text("\n".join(blocks_out), encoding="utf-8")
    print(f"OK captions {len(cues)} cues hash={plan_hash(plan)} → {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
