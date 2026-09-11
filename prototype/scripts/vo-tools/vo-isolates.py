#!/usr/bin/env python3
"""vo-isolates — short A/B clips for glue/stress ear lock (articulation P0).

Uses same knobs as shorts-vo-tts-uk.py (env overrides OK).
Does NOT rebuild full 90s stem / M1 / M2.

Usage (from prototype/):
  research/24-shorts-assets/.venv-tts-uk/bin/python scripts/vo-tools/vo-isolates.py
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
SCRIPTS = TOOLS.parent
ASSETS = (SCRIPTS / "../../research/24-shorts-assets").resolve()
OUT = ASSETS / "isolates"


def load_ttsuk():
    path = SCRIPTS / "shorts-vo-tts-uk.py"
    spec = importlib.util.spec_from_file_location("shorts_vo_tts_uk", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


CLIPS: list[tuple[str, str, str]] = [
    # id, label, text
    ("A-glue-comma", "BAD baseline: comma mid-phrase", "Склад поруч, тож зрозуміло."),
    ("B-glue-alone", "GOOD candidate: own phrase", "Склад поруч."),
    ("C-stress-glued", "BAD baseline: без+метушні mid-run", "І тримаєш його без метушні+!"),
    ("D-stress-alone", "GOOD candidate: isolated hero", "Без метушні+!"),
    ("E-stress-rewrite", "alt: avoid hero word", "Тримаєш спокійно."),
    ("F-stress-adj", "ANTI ship: adj stack (must FAIL gate)", "Без зайвої метушні+."),
]


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    mod = load_ttsuk()
    voice = __import__("os").environ.get("SHORTS_VO_TTSUK_VOICE", "lada")
    print(f"isolates → {OUT} voice={voice!r} takes={mod._TAKES} dur={mod._BASE_DUR}", flush=True)
    from tts_uk.inference import synthesis as _warm  # noqa: F401

    for cid, label, text in CLIPS:
        wav = OUT / f"{cid}.wav"
        print(f"\n== {cid}: {label}\n   {text}", flush=True)
        mod.synth_phrase(text, wav, voice)
    readme = OUT / "README.md"
    if not readme.exists():
        readme.write_text(
            "# VO isolates (P0 ear lock)\n\n"
            "Knobs = `shorts-vo-tts-uk.py` / `vo-engine.txt`.\n"
            "Rebuild: `../.venv-tts-uk/bin/python ../../prototype/scripts/vo-tools/vo-isolates.py` "
            "from this dir, or see script docstring.\n\n"
            "Score in `WINNERS.md` — do not ship isolates as brand VO.\n",
            encoding="utf-8",
        )
    winners = OUT / "WINNERS.md"
    if not winners.exists():
        winners.write_text(
            "# Isolate winners (ears)\n\n"
            f"Plan hash gate: see `../vo-engine.txt`.\n\n"
            "| Defect | Winner clip | Notes |\n"
            "|--------|-------------|-------|\n"
            "| glue «складпаруч» | ☐ A / ☐ B | |\n"
            "| stress «метУшні» | ☐ C / ☐ D / ☐ E / ☐ F | |\n\n"
            "Compare to full stem regions in `../vo-shorts-90s-ua.wav` (w18/w28/w48).\n",
            encoding="utf-8",
        )
    print(f"\nOK → {OUT} ({len(CLIPS)} clips). Fill WINNERS.md after headphones listen.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
