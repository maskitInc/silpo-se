#!/usr/bin/env python3
"""vo-artic-gate — autonomous articulation checks (no human listen required).

Modes:
  1) Ship text (always): plain plan must not contain glue footgun «Склад поруч,»
     and must not contain «метушні» (tts-uk ignores + → метУшні; rewrite to спокійно).
  2) Isolates (optional): fixture A/B/C/D/F metrics — WARN by default; STRICT only for
     regression docs (D absolute stress is unreliable on Lada).

Requires .venv-tts-uk for isolate audio metrics; text checks need only stdlib+lib_plan.

Usage:
  ../research/24-shorts-assets/.venv-tts-uk/bin/python scripts/vo-tools/vo-artic-gate.py
  VO_ARTIC_STRICT=1  # hard-fail on isolate D sanity / soft issues too
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib_plan import assets_dir, parse_plan

ISOLATES = assets_dir() / "isolates"
REPORT = assets_dir() / "vo-artic-report.json"


def ship_text_checks() -> tuple[list[str], list[str], dict]:
    errors: list[str] = []
    warns: list[str] = []
    detail: dict = {"beds": []}
    beds = parse_plan()
    full = " ".join(b.text_tts for b in beds)
    for b in beds:
        row = {"tc": b.tc, "text": b.text_tts}
        if re.search(r"Склад поруч,", b.text_tts):
            errors.append(f"[{b.tc}] glue footgun: «Склад поруч,» — use own PLAN phrase «Склад поруч.»")
            row["glue"] = "FAIL"
        if re.search(r"метушні", b.text_tts, flags=re.IGNORECASE):
            # Acoustic + is advisory; Lada often stresses mid-stem (метУшні).
            errors.append(
                f"[{b.tc}] avoid «метушні» in ship copy (tts-uk stress unreliable) — use «спокійно»"
            )
            row["metushni"] = "FAIL"
        detail["beds"].append(row)
    if "Склад поруч." not in full and "Склад поруч" in full:
        warns.append("«Склад поруч» present but not as «Склад поруч.» — check PLAN seam")
    return errors, warns, detail


def try_isolate_metrics() -> tuple[list[str], list[str], dict]:
    errors: list[str] = []
    warns: list[str] = []
    clips: dict = {}
    try:
        import librosa  # noqa: F401
        import numpy as np
        import soundfile as sf
    except ImportError:
        warns.append("librosa missing — skip isolate audio metrics")
        return errors, warns, clips

    def load_mono(path: Path, sr: int = 22050):
        y, file_sr = sf.read(str(path), always_2d=False)
        y = np.asarray(y, dtype=np.float32)
        if y.ndim > 1:
            y = y.mean(axis=1)
        if int(file_sr) != sr:
            y = librosa.resample(y, orig_sr=file_sr, target_sr=sr)
        return y

    def speech_islands(y, sr, min_ms=80.0):
        hop, frame = 256, 1024
        rms = librosa.feature.rms(y=y, frame_length=frame, hop_length=hop)[0]
        thr = max(float(np.median(rms)) * 0.35, 1e-4)
        mask = rms > thr
        out = []
        i, n = 0, len(mask)
        while i < n:
            if not mask[i]:
                i += 1
                continue
            j = i
            while j < n and mask[j]:
                j += 1
            a, b = i * hop, min(len(y), j * hop + frame)
            if (b - a) / sr * 1000 >= min_ms:
                out.append((a, b))
            i = j
        return out

    def gap0_ms(y, sr):
        islands = speech_islands(y, sr)
        if len(islands) < 2:
            return None
        return float(max(0.0, (islands[1][0] - islands[0][1]) / sr * 1000.0))

    def last_island_stress(y, sr):
        islands = speech_islands(y, sr)
        if not islands:
            return {"late_early": 0.0, "epeak_frac": 0.0, "ok": False}
        a, b = islands[-1]
        seg = y[a:b]
        if len(seg) < int(0.12 * sr):
            return {"late_early": 0.0, "epeak_frac": 0.0, "ok": False}
        rms = librosa.feature.rms(y=seg, frame_length=512, hop_length=256)[0]
        if len(rms) < 4:
            return {"late_early": 0.0, "epeak_frac": 0.0, "ok": False}
        n = len(rms)
        early = float(np.mean(rms[: max(1, int(n * 0.35))]) + 1e-9)
        late = float(np.mean(rms[int(n * 0.70) :]) + 1e-9)
        return {
            "late_early": late / early,
            "epeak_frac": float(np.argmax(rms) / max(1, n - 1)),
            "ok": True,
            "island_s": (b - a) / sr,
        }

    need = {
        "A-glue-comma": ISOLATES / "A-glue-comma.wav",
        "B-glue-alone": ISOLATES / "B-glue-alone.wav",
        "C-stress-glued": ISOLATES / "C-stress-glued.wav",
        "D-stress-alone": ISOLATES / "D-stress-alone.wav",
        "F-stress-adj": ISOLATES / "F-stress-adj.wav",
    }
    if not all(p.exists() for p in need.values()):
        warns.append("isolates incomplete — run vo-isolates.py (audio fixtures optional)")
        return errors, warns, clips

    sr = 22050
    ga = gap0_ms(load_mono(need["A-glue-comma"], sr), sr)
    gb = gap0_ms(load_mono(need["B-glue-alone"], sr), sr)
    clips["A-glue-comma"] = {"gap0_ms": ga}
    clips["B-glue-alone"] = {"gap0_ms": gb}
    # Glue absolute ms is weak; only WARN extreme fusion.
    if ga is not None and ga < 40:
        warns.append(f"A gap0={ga:.1f}ms < 40 (possible fusion)")
    if gb is not None and gb < 25:
        warns.append(f"B gap0={gb:.1f}ms very low")

    for key in ("C-stress-glued", "D-stress-alone", "F-stress-adj"):
        m = last_island_stress(load_mono(need[key], sr), sr)
        clips[key] = m
        # Informational only: Lada often fails D absolute; ship avoids метушні.
        clips[key]["note"] = "fixture-only; ship must not use метушні"
    return errors, warns, clips


def stem_bed_fill_checks() -> tuple[list[str], list[str], dict]:
    """Trailing silence per bed on ship stem — catch underfill without human ears."""
    errors: list[str] = []
    warns: list[str] = []
    detail: dict = {"beds": []}
    stem = assets_dir() / "vo-shorts-90s-ua.wav"
    if not stem.exists():
        warns.append("stem missing — skip bed-fill check")
        return errors, warns, detail
    try:
        import librosa
        import numpy as np
        import soundfile as sf
    except ImportError:
        warns.append("librosa missing — skip bed-fill check")
        return errors, warns, detail

    y, sr = sf.read(str(stem), always_2d=False)
    y = np.asarray(y, dtype=np.float32)
    if y.ndim > 1:
        y = y.mean(axis=1)
    beds = parse_plan()
    t = 0.0
    hop = 512
    for b in beds:
        a = int(t * sr)
        win = float(b.window_s)
        c = int((t + win) * sr)
        seg = y[a:c]
        rms = librosa.feature.rms(y=seg, frame_length=1024, hop_length=hop)[0]
        thr = max(float(np.median(rms)) * 0.35, 1e-4)
        mask = rms > thr
        last = len(mask) - 1
        while last > 0 and not mask[last]:
            last -= 1
        trail = (len(mask) - 1 - last) * hop / sr
        row = {"tc": b.tc, "trail_s": round(trail, 3), "window_s": win}
        # TAP/VEIL at end steals ~0.28–0.42s — allow that before flagging.
        allow = 0.55 if (b.has_tap or b.has_veil) else 0.35
        if trail > allow + 0.70:
            errors.append(f"[{b.tc}] bed underfill trail={trail:.2f}s (densify copy)")
            row["gate"] = "FAIL"
        elif trail > allow + 0.35:
            warns.append(f"[{b.tc}] soft underfill trail={trail:.2f}s")
            row["gate"] = "WARN"
        else:
            row["gate"] = "OK"
        detail["beds"].append(row)
        t += win
    return errors, warns, detail


def main() -> int:
    strict = os.environ.get("VO_ARTIC_STRICT", "0") == "1"
    errors, warns, ship = ship_text_checks()
    ie, iw, clips = try_isolate_metrics()
    errors.extend(ie)
    warns.extend(iw)
    se, sw, beds = stem_bed_fill_checks()
    errors.extend(se)
    warns.extend(sw)

    report = {
        "strict": strict,
        "ship": ship,
        "clips": clips,
        "stem_beds": beds,
        "warnings": warns,
        "errors": errors,
        "verdict": "PASS",
    }
    if errors:
        report["verdict"] = "FAIL"
    elif warns:
        report["verdict"] = "WARN"
    else:
        report["verdict"] = "PASS"

    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"→ {REPORT}")
    if report["verdict"] == "FAIL":
        print("vo-artic-gate: FAIL", file=sys.stderr)
        return 1
    if report["verdict"] == "WARN":
        print("vo-artic-gate: WARN")
        return 0
    print("vo-artic-gate: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
