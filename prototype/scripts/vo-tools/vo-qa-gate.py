#!/usr/bin/env python3
"""vo-qa-gate — objective gates on VO wav (duration, LUFS, peaks, silence)."""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib_plan import assets_dir


def run_out(cmd: list[str]) -> str:
    return subprocess.check_output(cmd, text=True, stderr=subprocess.STDOUT)


def duration(path: Path) -> float:
    return float(
        run_out(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=nw=1:nk=1",
                str(path),
            ]
        ).strip()
    )


def ebur128(path: Path) -> dict:
    # ffmpeg prints ebur128 summary to stderr
    p = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-i",
            str(path),
            "-af",
            "ebur128=framelog=verbose",
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
        text=True,
    )
    log = (p.stderr or "") + (p.stdout or "")
    out: dict = {"raw_tail": "\n".join(log.strip().splitlines()[-30:])}
    # Integrated loudness:
    m = re.search(r"I:\s*([-\d.]+)\s*LUFS", log)
    if m:
        out["I_LUFS"] = float(m.group(1))
    m = re.search(r"True peak:\s*([-\d.]+)\s*dBFS", log)
    if m:
        out["true_peak_dbfs"] = float(m.group(1))
    m = re.search(r"LRA:\s*([-\d.]+)\s*LU", log)
    if m:
        out["LRA"] = float(m.group(1))
    return out


def silence_spans(path: Path, noise_db: float = -40.0, min_d: float = 0.35) -> list[tuple[float, float]]:
    p = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-i",
            str(path),
            "-af",
            f"silencedetect=noise={noise_db}dB:d={min_d}",
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
        text=True,
    )
    log = p.stderr or ""
    starts = [float(x) for x in re.findall(r"silence_start:\s*([-\d.]+)", log)]
    ends = [float(x) for x in re.findall(r"silence_end:\s*([-\d.]+)", log)]
    spans = []
    for i, s in enumerate(starts):
        e = ends[i] if i < len(ends) else None
        if e is not None:
            spans.append((s, e))
    return spans


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--wav",
        type=Path,
        default=None,
        help="default: research/24-shorts-assets/vo-shorts-90s-ua.wav",
    )
    ap.add_argument("--expect-dur", type=float, default=90.0)
    ap.add_argument("--lufs-target", type=float, default=-14.0)
    ap.add_argument("--lufs-tol", type=float, default=2.5)
    ap.add_argument("--max-peak", type=float, default=-0.5)
    ap.add_argument("--json-out", type=Path, default=None)
    args = ap.parse_args()
    wav = args.wav or (assets_dir() / "vo-shorts-90s-ua.wav")
    if not wav.exists():
        print(f"FAIL: missing {wav}")
        return 1

    errors: list[str] = []
    warns: list[str] = []
    report: dict = {"wav": str(wav)}

    dur = duration(wav)
    report["duration"] = dur
    if abs(dur - args.expect_dur) > 0.05:
        errors.append(f"duration={dur} expected≈{args.expect_dur}")

    loud = ebur128(wav)
    report["ebur128"] = {k: v for k, v in loud.items() if k != "raw_tail"}
    i = loud.get("I_LUFS")
    if i is None:
        warns.append("could not parse integrated LUFS")
    elif abs(i - args.lufs_target) > args.lufs_tol:
        # Soft fail → warn: different engines land ~−14…−16 after loudnorm
        warns.append(f"I={i} LUFS outside {args.lufs_target}±{args.lufs_tol} (soft)")

    tp = loud.get("true_peak_dbfs")
    if tp is not None and tp > args.max_peak:
        errors.append(f"true_peak={tp} dBFS > {args.max_peak}")

    spans = silence_spans(wav)
    report["silence_spans_ge_0.35s"] = [{"start": s, "end": e, "dur": round(e - s, 3)} for s, e in spans]
    long = [sp for sp in spans if (sp[1] - sp[0]) >= 1.2]
    if long:
        warns.append(f"{len(long)} long silence gap(s) ≥1.2s (check bed padding)")
    very_long = [sp for sp in spans if (sp[1] - sp[0]) >= 3.0]
    if very_long:
        errors.append(f"{len(very_long)} silence gap(s) ≥3.0s — dead air fail")

    # head silence
    if spans and spans[0][0] <= 0.05 and (spans[0][1] - spans[0][0]) > 0.35:
        warns.append(f"long head silence ~{spans[0][1]-spans[0][0]:.2f}s")

    print(json.dumps(report, ensure_ascii=False, indent=2))
    for w in warns:
        print(f"WARN: {w}")
    for e in errors:
        print(f"FAIL: {e}")

    out = args.json_out or (assets_dir() / "vo-qa-report.json")
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"→ {out}")

    if errors:
        print("vo-qa-gate: FAIL")
        return 1
    print("vo-qa-gate: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
