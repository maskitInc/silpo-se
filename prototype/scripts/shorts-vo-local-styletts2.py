#!/usr/bin/env python3
"""Build full 90s SilpoSE VO with local free StyleTTS2 UA (no ZeroGPU)."""
from __future__ import annotations

import json
import os
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent
ASSETS = (ROOT / "../../research/24-shorts-assets").resolve()
BATCH = ROOT / "shorts-vo-styletts2-batch.py"
TARGET_S = 90.0
SR = 22050

TAP = 0.28
VEIL = 0.42
CLAUSE = 0.26
# Keep PLAN in sync with shorts-vo-tts-uk.py (expression !/? + friend-breath).
_BASE = float(os.environ.get("SHORTS_VO_STT2_SPEED", "0.90"))
PLAN = [
    (
        "w00",
        10.0,
        _BASE,
        [
            "Ранок уже в русі! Хочеться одного ритму, правда?",
            "Тренування і стеля на продукти.",
            "Дода+ток житт+я, щоб день збира+вся сам. Під руко+ю.",
        ],
        None,
    ),
    (
        "w10",
        8.0,
        _BASE,
        [
            "Сі+льпо ес і! Два ритуа+ли, Спорт і Експре+с.",
            "Кожен має зви+чку, а один дім тримає обидва ритми.",
        ],
        "tap",
    ),
    (
        "w18",
        10.0,
        _BASE,
        [
            "Спорт показує мину+лий мі+сяць.",
            "Раціо+н, що зробив і що взяти з полиці.",
            "Бачиш ритм на екрані? Тримаєш спокі+йно.",
        ],
        "tap",
    ),
    (
        "w28",
        14.0,
        _BASE,
        [
            "Пігна+ли! Сьогодні сесія, а страви з полиці вже під програ+му.",
            "Бери те, що пасує під ритм!",
            "Склад поруч.",
            "Тож зрозуміло. Збираєш день спокі+йно, а вечеря під програ+му.",
        ],
        "tap",
    ),
    (
        "w42",
        6.0,
        min(_BASE + 0.02, 1.0),
        [
            "Одни+м жестом у Експре+с!",
            "Список іде далі з того, що вже обрав, і зручно.",
        ],
        "tap",
    ),
    (
        "w48",
        10.0,
        _BASE,
        [
            "Експре+с тримає витрати поруч із лімітом. Видно удар по чеку!",
            "Підкру+чуєш саме це, а решту лишаєш спокі+йно.",
            "Ліміт поруч.",
        ],
        "tap",
    ),
    (
        "w58",
        17.0,
        _BASE,
        [
            "Підкру+ти кі+лькість!",
            "Ти вирі+шуєш. Нічого само не летить у ко+шик.",
            "Глянь ще раз, це твоя правка.",
            "Поки правиш, ко+шик Сі+льпо чекає поруч.",
            "Доллємо+ лише коли скажеш.",
            "Контро+ль твій до кінця+! Рішення лишається твої+м.",
        ],
        "tap_after:2",
    ),
    (
        "w75",
        15.0,
        _BASE,
        [
            "Погоди+ти! Список стає живим. До цього все лишається з тобою, без сюрпризів.",
            "Оформлення уже в Сі+льпо.",
            "Зібрали під твій день, далі як завжди в магазині.",
            "Знайомий фініш, і саме так закриваєш день!",
        ],
        "veil_after:0",
    ),
]



def parse_mid_mark(mark: str | None, n: int) -> tuple[str | None, int | None]:
    if not mark or mark in ("tap",):
        return None, None
    if mark == "tap_mid":
        return "tap", max(0, n - 2)
    if mark == "veil_mid":
        return "veil", max(0, n - 2)
    if mark.startswith("tap_after:"):
        return "tap", int(mark.split(":", 1)[1])
    if mark.startswith("veil_after:"):
        return "veil", int(mark.split(":", 1)[1])
    return None, None


def run(cmd: list[str]) -> None:
    subprocess.check_call(cmd)


def silence(path: Path, sec: float, sr: int = SR) -> None:
    n = max(1, int(sec * sr))
    sf.write(str(path), np.zeros(n, dtype=np.float32), sr)


def resample_to(path_in: Path, path_out: Path, sr: int = SR) -> None:
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(path_in),
            "-ar",
            str(sr),
            "-ac",
            "1",
            str(path_out),
        ]
    )


def fit_soft(path_in: Path, path_out: Path, window: float, tmp: Path) -> None:
    """Pad bed to exact window. Prefer speech near bed start (small lead); short beds should be dense."""
    info = sf.info(str(path_in))
    d = float(info.duration)
    rest = max(0.0, window - d)
    lead = min(0.12, rest * 0.12) if rest > 0.15 else min(0.04, rest)
    tail = max(0.0, rest - lead)
    lead_p = tmp / "lead.wav"
    tail_p = tmp / "tail.wav"
    silence(lead_p, max(0.01, lead) if lead > 0 else 0.01)
    silence(tail_p, max(0.01, tail) if tail > 0 else 0.01)
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(lead_p),
            "-i",
            str(path_in),
            "-i",
            str(tail_p),
            "-filter_complex",
            f"[0][1][2]concat=n=3:v=0:a=1,apad=whole_dur={window},atrim=0:{window},asetpts=PTS-STARTPTS[a]",
            "-map",
            "[a]",
            "-ar",
            str(SR),
            "-ac",
            "1",
            str(path_out),
        ]
    )


def concat_list(files: list[Path], out: Path, tmp: Path) -> None:
    lst = tmp / "concat.txt"
    lst.write_text("".join(f"file '{f}'\n" for f in files), encoding="utf-8")
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(lst),
            "-c",
            "copy",
            str(out),
        ]
    )


def main() -> None:
    py = os.environ.get("SHORTS_VO_PY") or str(ASSETS / ".venv-tts/bin/python")
    device = os.environ.get("SHORTS_VO_DEVICE", "cpu")
    with tempfile.TemporaryDirectory(prefix="shorts-vo-local-") as td:
        tmp = Path(td)
        jobs = []
        for bed_id, _secs, speed, phrases, _mark in PLAN:
            for i, ph in enumerate(phrases):
                raw = tmp / f"{bed_id}_{i}_raw.wav"
                jobs.append({"out": str(raw), "text": ph, "speed": speed})

        jobs_path = tmp / "jobs.json"
        jobs_path.write_text(json.dumps(jobs, ensure_ascii=False), encoding="utf-8")
        run(
            [
                py,
                str(BATCH),
                "--jobs",
                str(jobs_path),
                "--device",
                device,
                "--hf-path",
                os.environ.get(
                    "SHORTS_VO_STT2_HF",
                    "patriotyk/styletts2_ukrainian_multispeaker",
                ),
                "--voice",
                os.environ.get("SHORTS_VO_STT2_VOICE", "Вероніка Дорош"),
            ]
        )

        silence(tmp / "tap.wav", TAP)
        silence(tmp / "veil.wav", VEIL)
        silence(tmp / "clause.wav", CLAUSE)
        windows: list[Path] = []
        for bed_id, secs, _speed, phrases, mark in PLAN:
            parts: list[Path] = []
            n = len(phrases)
            kind, after_i = parse_mid_mark(mark, n)
            for i in range(n):
                raw24 = tmp / f"{bed_id}_{i}_raw.wav"
                rs = tmp / f"{bed_id}_{i}.wav"
                resample_to(raw24, rs)
                parts.append(rs)
                if i < n - 1:
                    if kind and after_i == i:
                        parts.append(tmp / ("tap.wav" if kind == "tap" else "veil.wav"))
                    else:
                        parts.append(tmp / "clause.wav")
            if len(parts) == 1:
                merged = parts[0]
            else:
                merged = tmp / f"{bed_id}_m.wav"
                concat_list(parts, merged, tmp)
            if mark == "tap":
                with_tap = tmp / f"{bed_id}_tap.wav"
                concat_list([merged, tmp / "tap.wav"], with_tap, tmp)
                merged = with_tap
            fitted = tmp / f"{bed_id}.wav"
            fit_soft(merged, fitted, secs, tmp)
            windows.append(fitted)

        raw90 = tmp / "raw.wav"
        concat_list(windows, raw90, tmp)
        warm = tmp / "warm.wav"
        stem = os.environ.get("SHORTS_VO_OUT_STEM", "vo-shorts-90s-ua")
        out_wav = ASSETS / f"{stem}.wav"
        out_mp3 = ASSETS / f"{stem}.mp3"
        run(
            [
                "ffmpeg",
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                str(raw90),
                "-af",
                # Light polish only — compressor+aecho made TTS more robotic.
                "loudnorm=I=-14:TP=-1.5:LRA=11",
                "-ar",
                "48000",
                "-ac",
                "1",
                str(warm),
            ]
        )
        run(
            [
                "ffmpeg",
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                str(warm),
                "-af",
                f"apad=whole_dur={TARGET_S},atrim=0:{TARGET_S},asetpts=PTS-STARTPTS",
                "-ar",
                "48000",
                "-ac",
                "1",
                str(out_wav),
            ]
        )
        run(
            [
                "ffmpeg",
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                str(out_wav),
                "-codec:a",
                "libmp3lame",
                "-q:a",
                "2",
                str(out_mp3),
            ]
        )
        d = subprocess.check_output(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=nw=1:nk=1",
                str(out_wav),
            ],
            text=True,
        ).strip()
        voice = os.environ.get("SHORTS_VO_STT2_VOICE", "Вероніка Дорош")
        prov = ASSETS / f"{stem}-engine.txt"
        if stem == "vo-shorts-90s-ua":
            prov = ASSETS / "vo-engine.txt"
        prov.write_text(
            f"engine=local-styletts2-multi\n"
            f"hf=patriotyk/styletts2_ukrainian_multispeaker\n"
            f"voice={voice}\n"
            f"frontend=ipa_uk+hand-stress+sentence-split\n"
            f"postfx=loudnorm-only\n"
            f"speed={_BASE}\n"
            f"duration={d}\n"
            f"stem={stem}\n",
            encoding="utf-8",
        )
        print(f"OK local StyleTTS2 multi voice={voice!r} duration={d}s → {out_wav}")


if __name__ == "__main__":
    main()
