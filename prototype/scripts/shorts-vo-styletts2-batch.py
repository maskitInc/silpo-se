#!/usr/bin/env python3
"""Batch local StyleTTS2 UA (Space-parity multi): keep model warm, write many wavs."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import soundfile as sf
from importlib.machinery import SourceFileLoader

mod = SourceFileLoader(
    "stt2local",
    str(Path(__file__).resolve().parent / "shorts-vo-styletts2-local.py"),
).load_module()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--jobs", required=True, help="JSON list [{out,text,speed},…]")
    ap.add_argument("--hf-path", default=mod.DEFAULT_HF)
    ap.add_argument("--voice", default=mod.DEFAULT_VOICE)
    ap.add_argument("--device", default="cpu")
    ap.add_argument("--sr", type=int, default=24000)
    args = ap.parse_args()
    jobs = json.loads(Path(args.jobs).read_text(encoding="utf-8"))
    print(
        f"local_stt2 batch multi voice={args.voice!r} ({len(jobs)} jobs)…",
        flush=True,
    )
    model, style, device = mod.load_model(args.hf_path, args.device, args.voice)
    for i, job in enumerate(jobs):
        text = job["text"]
        out = Path(job["out"])
        speed = float(job.get("speed", 1.0))
        audio = mod.synth(model, style, device, text, speed)
        out.parent.mkdir(parents=True, exist_ok=True)
        sf.write(str(out), audio, args.sr)
        print(f"[{i+1}/{len(jobs)}] {out.name} {len(audio)/args.sr:.2f}s", flush=True)
    print("local_stt2 batch done", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
