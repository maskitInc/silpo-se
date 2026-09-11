#!/usr/bin/env python3
"""Local StyleTTS2 UA — Space-parity pipeline (multi + ipa_uk + stress + voice.pt).

Matches patriotyk/styletts2-ukrainian Space (no ZeroGPU).
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path
from unicodedata import normalize

import numpy as np
import soundfile as sf
import torch
from huggingface_hub import hf_hub_download
from ipa_uk import ipa
from styletts2_inference.models import StyleTTS2
from ukrainian_word_stress import Stressifier, StressSymbol

DEFAULT_HF = "patriotyk/styletts2_ukrainian_multispeaker"
DEFAULT_VOICE = "Вероніка Дорош"
SPACE_ID = "patriotyk/styletts2-ukrainian"

# Prefer keeping manual marks; still fill unmarked words.
_stressify = Stressifier()


def load_voice_style(voice_name: str, device: torch.device) -> torch.Tensor:
    """Load precomputed style vector from Space `voices/*.pt`."""
    fname = f"voices/{voice_name}.pt"
    path = hf_hub_download(repo_id=SPACE_ID, filename=fname, repo_type="space")
    style = torch.load(path, map_location="cpu", weights_only=False)
    if isinstance(style, dict):
        style = next(iter(style.values()))
    if not isinstance(style, torch.Tensor):
        raise RuntimeError(f"unexpected voice style type {type(style)}")
    return style.to(device)


def load_model(hf_path: str, device: str, voice: str):
    dev = torch.device(device)
    model = StyleTTS2(hf_path=hf_path, device=dev)
    style = load_voice_style(voice, dev)
    return model, style, dev


def split_to_parts(text: str, group: bool = True) -> list[str]:
    """Same sentence splitter as Space app.py — shorter clauses, then concat."""
    text = re.sub(r"(\w+[^.,!:?\-])\n", r"\1. ", text)
    text = text.replace("\n", " ")
    split_symbols = ".?!:"
    parts = [""]
    index = 0
    last = len(text) - 1
    for i, s in enumerate(text):
        parts[index] += s
        if s in split_symbols and i < last and text[i + 1] == " ":
            if group and len(parts[index]) <= 20:
                continue
            index += 1
            parts.append("")
    return [p for p in parts if p.strip()]


def prepare_stressed(text: str) -> str:
    """Apply Space orthography + Stressifier; return stressed Cyrillic (debug-friendly)."""
    t = text.strip().replace('"', "")
    if not t:
        return ""
    t = t.replace("+", StressSymbol.CombiningAcuteAccent)
    t = normalize("NFKC", t)
    t = re.sub(r"[᠆‐‑‒–—―⁻₋−⸺⸻]", "-", t)
    if t[-1] not in ".?!:-":
        t += "."
    t = re.sub(r" - ", ": ", t)
    return _stressify(t)


def text_to_ipa(text: str) -> str:
    """Space-equivalent front-end: stressifier → ipa_uk."""
    stressed = prepare_stressed(text)
    if not stressed:
        return ""
    return ipa(stressed) or ""


def synth(model, style, device, text: str, speed: float = 0.9) -> np.ndarray:
    """Synth one or more Space-style sentence parts; concat with tiny breath."""
    chunks: list[np.ndarray] = []
    breath = np.zeros(int(0.06 * 24000), dtype=np.float32)
    for part in split_to_parts(text):
        part = part.strip()
        if not part:
            continue
        ps = text_to_ipa(part)
        if not ps:
            continue
        tokens = model.tokenizer.encode(ps)
        with torch.no_grad():
            wav = model(tokens, s_prev=style, speed=float(speed))
        arr = wav.detach().cpu().numpy()
        if arr.ndim > 1:
            arr = arr.squeeze()
        arr = arr.astype(np.float32)
        if chunks:
            chunks.append(breath)
        chunks.append(arr)
    if not chunks:
        raise RuntimeError(f"empty IPA/synth for text={text!r}")
    return np.concatenate(chunks)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--text", required=True)
    ap.add_argument("--speed", type=float, default=0.9)
    ap.add_argument("--hf-path", default=DEFAULT_HF)
    ap.add_argument("--voice", default=DEFAULT_VOICE)
    ap.add_argument("--device", default="cpu")
    ap.add_argument("--sr", type=int, default=24000)
    ap.add_argument("--debug-stress", action="store_true")
    args = ap.parse_args()

    if args.debug_stress:
        for p in split_to_parts(args.text):
            print("STRESS:", prepare_stressed(p))
            print("IPA   :", text_to_ipa(p))
        return 0

    model, style, device = load_model(args.hf_path, args.device, args.voice)
    audio = synth(model, style, device, args.text, args.speed)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(out), audio, args.sr)
    print(
        f"local_stt2 multi voice={args.voice!r} secs={len(audio)/args.sr:.2f} → {out}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
