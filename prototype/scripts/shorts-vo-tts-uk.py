#!/usr/bin/env python3
"""Build full 90s SilpoSE VO with free tts-uk (Lada default) — F0/energy prosody.

Keeps same bed map / TAP / VEIL / hand-stress `+` rules as StyleTTS2 PLAN.
Uses isolated .venv-tts-uk (do not mix with StyleTTS2 torch stack).
Note: tts-uk drops — : ; … — use only . , ? ! for pauses in PLAN text.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent
ASSETS = (ROOT / "../../research/24-shorts-assets").resolve()
TARGET_S = 90.0
SR = 22050
SRC_SR = 44100
TAP = 0.28
VEIL = 0.42
# Breath between clause phrases (must be hearable ≥~0.12s).
CLAUSE = float(os.environ.get("SHORTS_VO_TTSUK_CLAUSE", "0.26"))
# Micro-fade at phrase seams — softens cold attacks without chewing consonants.
PHRASE_FADE = float(os.environ.get("SHORTS_VO_TTSUK_PHRASE_FADE", "0.014"))

# Expression pack: mykyta has higher LRA but slower tokens — keep DUR≤0.90 + shorter copy.
_BASE_DUR = float(os.environ.get("SHORTS_VO_TTSUK_DUR", "0.88"))
_ATEMPO_CAP = float(os.environ.get("SHORTS_VO_TTSUK_ATEMPO_CAP", "1.08"))
_F0_STD = float(os.environ.get("SHORTS_VO_TTSUK_F0_STD", "0.50"))  # dead unless f0_mean>0
_E_STD = float(os.environ.get("SHORTS_VO_TTSUK_E_STD", "0.40"))  # unused by tts_uk infer
_TAKES = int(os.environ.get("SHORTS_VO_TTSUK_TAKES", "10"))
_SIGMA_DEC = float(os.environ.get("SHORTS_VO_TTSUK_SIGMA_DEC", "0.95"))
_SIGMA_DUR = float(os.environ.get("SHORTS_VO_TTSUK_SIGMA_DUR", "1.05"))
_SIGMA_F0 = float(os.environ.get("SHORTS_VO_TTSUK_SIGMA_F0", "1.55"))
_SIGMA_E = float(os.environ.get("SHORTS_VO_TTSUK_SIGMA_E", "1.50"))
# Default voice: mykyta (higher LRA vs lada). Override: SHORTS_VO_TTSUK_VOICE=lada
# Marks: tap|veil end-of-bed; tap_after:N|veil_after:N = after phrase index N.
# Pause punct: ONLY . , ? !  Friend breath: ~2–3 phrases/bed; !/? = expression.
PLAN = [
    (
        "w00",
        10.0,
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
        [
            "Сі+льпо ес і! Два ритуа+ли, Спорт і Експре+с.",
            "Кожен має зви+чку, а один дім тримає обидва ритми.",
        ],
        "tap",
    ),
    (
        "w18",
        10.0,
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
        [
            "Одни+м жестом у Експре+с!",
            "Список іде далі з того, що вже обрав, і зручно.",
        ],
        "tap",
    ),
    (
        "w48",
        10.0,
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
        [
            "Погоди+ти! Список стає живим. До цього все лишається з тобою, без сюрпризів.",
            "Оформлення уже в Сі+льпо.",
            "Зібрали під твій день, далі як завжди в магазині.",
            "Знайомий фініш, і саме так закриваєш день!",
        ],
        "veil_after:0",
    ),
]


def run(cmd: list[str]) -> None:
    subprocess.check_call(cmd)


def integrated_lufs(path: Path) -> float | None:
    log = subprocess.run(
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
        check=False,
    ).stderr
    # Summary line: "I:         -17.6 LUFS"
    m = re.search(r"\n\s*I:\s*([-\d.]+)\s*LUFS", log)
    return float(m.group(1)) if m else None


def gentle_lufs_lift(
    src: Path,
    dst: Path,
    target: float = -14.0,
    close_enough: float = 0.5,
    max_gain: float = 4.0,
) -> str:
    """Single-pass loudnorm often lands ~−17 on sparse VO. Lift toward −14 without dual-pass LRA crush.

    Skip only when already within close_enough of target (default I >= −14.5).
    Old floor=−15.5 created a soft-band dead zone: land at −15.5 → forever skip vs −14.
    """
    i = integrated_lufs(src)
    if i is None or i >= target - close_enough:
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(src), "-c", "copy", str(dst)])
        return f"lufs_lift=skip I={i}"
    gain = min(target - i, max_gain)
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(src),
            "-af",
            f"volume={gain:.2f}dB,alimiter=limit=-1.5dB:level=false:attack=5:release=50",
            "-ar",
            "48000",
            "-ac",
            "1",
            str(dst),
        ]
    )
    return f"lufs_lift=+{gain:.2f}dB from I={i:.1f}"


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
    """Pad bed to exact window. Prefer speech near bed start; speed up slightly if overflow.

    Never inject fake lead/tail silence when rest≈0 — that forced atrim into word tails
    (heard as «обірваність»).
    """
    info = sf.info(str(path_in))
    d = float(info.duration)
    usable = max(0.5, window - 0.02)
    src = path_in
    if d > usable:
        # atempo>1 shortens; soft cap protects articulation (rush = «таратор»).
        need = d / usable
        if need > _ATEMPO_CAP:
            print(
                f"  WARN atempo {path_in.name}: need {need:.3f} > cap {_ATEMPO_CAP:.3f} "
                f"({d:.2f}s → {window:g}s) — trim risk; prefer shorter copy",
                flush=True,
            )
        factor = min(_ATEMPO_CAP, max(1.01, need))
        print(f"  atempo {path_in.name}: {d:.2f}s → window {window:g}s factor={factor:.3f}", flush=True)
        sped = tmp / f"sped_{path_in.stem}.wav"
        run(
            [
                "ffmpeg",
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                str(path_in),
                "-af",
                f"atempo={factor:.4f}",
                "-ar",
                str(SR),
                "-ac",
                "1",
                str(sped),
            ]
        )
        src = sped
        d = float(sf.info(str(src)).duration)
    rest = max(0.0, window - d)
    # Tight fit: pad/trim only — no mandatory 10ms pads that steal speech on atrim.
    if rest < 0.02:
        run(
            [
                "ffmpeg",
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                str(src),
                "-af",
                f"apad=whole_dur={window},atrim=0:{window},asetpts=PTS-STARTPTS",
                "-ar",
                str(SR),
                "-ac",
                "1",
                str(path_out),
            ]
        )
        return
    lead = min(0.10, rest * 0.10) if rest > 0.12 else min(0.03, rest)
    tail = max(0.0, rest - lead)
    lead_p = tmp / "lead.wav"
    tail_p = tmp / "tail.wav"
    silence(lead_p, max(0.001, lead))
    silence(tail_p, max(0.001, tail))
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
            str(src),
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


def afade_phrase(path_in: Path, path_out: Path, fade: float = PHRASE_FADE) -> None:
    """Short in/out fade so phrase seams don't click or feel truncated."""
    d = float(sf.info(str(path_in)).duration)
    fade = min(fade, max(0.004, d * 0.08))
    st_out = max(0.0, d - fade)
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(path_in),
            "-af",
            f"afade=t=in:st=0:d={fade:.4f},afade=t=out:st={st_out:.4f}:d={fade:.4f}",
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


def take_score(w: np.ndarray, sr: int = SRC_SR) -> float:
    """Prefer natural variety + gentle release; allow micro-pauses (not densest robot fill)."""
    w = np.asarray(w, dtype=np.float32).reshape(-1)
    frame = max(1, int(0.02 * sr))
    n = (len(w) // frame) * frame
    if n < frame * 8:
        return -1e9
    frames = w[:n].reshape(-1, frame)
    e = np.sqrt(np.mean(frames**2, axis=1) + 1e-12)
    thr = max(float(np.median(e)) * 0.25, 1e-4)
    speech = e > thr
    if int(speech.sum()) < 5:
        return -1e9
    e_s = e[speech]
    dyn = float(np.percentile(e_s, 90) - np.percentile(e_s, 10))
    var = float(np.std(e_s))
    peak = float(np.max(np.abs(w)))
    peak_pen = 0.2 if peak > 0.98 else 0.0
    # Prefer punchier dynamics (flat «під ніс» sits ~0.06–0.08).
    target = 0.13
    ratio = float(speech.sum()) / float(len(e))
    # Softer floor: micro-pauses inside takes are human, not mush.
    silence_pen = 0.6 * max(0.0, 0.70 - ratio)
    dur = len(w) / float(sr)
    tail_n = max(1, int(0.08 * sr))
    tail = np.abs(w[-tail_n:])
    early = float(np.mean(tail[: max(1, tail_n // 2)]))
    late = float(np.mean(tail[tail_n // 2 :]))
    release_bonus = 0.18 if late < early * 0.65 else 0.0
    hard_end_pen = 0.22 if late > max(thr * 2.5, early * 0.85) else 0.0
    return (
        -abs(dyn - target) * 1.6
        + var * 1.8
        + min(dur, 14.0) * 0.01
        - silence_pen
        - peak_pen
        + release_bonus
        - hard_end_pen
    )


def synth_one(text: str, voice: str):
    from tts_uk.inference import synthesis

    _mels, wave, stats = synthesis(
        text=text,
        voice=voice,
        n_takes=1,
        use_latest_take=True,
        token_dur_scaling=_BASE_DUR,
        # Keep f0_mean=0: enabling f0_std without measured μ flattens contour.
        f0_mean=0.0,
        f0_std=_F0_STD,
        energy_mean=0.0,
        energy_std=_E_STD,
        sigma_decoder=_SIGMA_DEC,
        sigma_token_duration=_SIGMA_DUR,
        sigma_f0=_SIGMA_F0,
        sigma_energy=_SIGMA_E,
    )
    w = wave.detach().cpu().numpy()
    if w.ndim > 1:
        w = np.squeeze(w)
    return w.astype(np.float32), stats


def synth_phrase(text: str, out: Path, voice: str) -> None:
    # tts_uk use_latest_take=False concatenates takes — pick best of N instead.
    best_w = None
    best_s = -1e18
    best_i = 0
    last_stats: dict = {}
    for i in range(max(1, _TAKES)):
        w, stats = synth_one(text, voice)
        s = take_score(w)
        last_stats = stats
        if s > best_s:
            best_s = s
            best_w = w
            best_i = i
    assert best_w is not None
    sf.write(str(out), best_w, SRC_SR)
    print(
        f"  ttsuk {out.name} {len(best_w)/SRC_SR:.2f}s take={best_i+1}/{_TAKES} "
        f"score={best_s:.3f} rtf={last_stats.get('rtf')}",
        flush=True,
    )


def parse_mid_mark(mark: str | None, n: int) -> tuple[str | None, int | None]:
    """Return (kind, after_index). kind is 'tap'|'veil'. after_index = phrase i after which to insert."""
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


def assemble_bed_parts(
    phrases: list[str],
    bed_id: str,
    mark: str | None,
    tmp: Path,
) -> list[Path]:
    """Phrase clips + clause gaps; mid TAP/VEIL after configured phrase index."""
    parts: list[Path] = []
    n = len(phrases)
    kind, after_i = parse_mid_mark(mark, n)
    for i in range(n):
        raw = tmp / f"{bed_id}_{i}_raw.wav"
        rs = tmp / f"{bed_id}_{i}_rs.wav"
        faded = tmp / f"{bed_id}_{i}.wav"
        resample_to(raw, rs)
        afade_phrase(rs, faded)
        parts.append(faded)
        if i < n - 1:
            if kind and after_i == i:
                parts.append(tmp / ("tap.wav" if kind == "tap" else "veil.wav"))
            else:
                parts.append(tmp / "clause.wav")
    return parts


def main() -> None:
    voice = os.environ.get("SHORTS_VO_TTSUK_VOICE", "mykyta")
    stem = os.environ.get("SHORTS_VO_OUT_STEM", "vo-shorts-90s-ua")
    with tempfile.TemporaryDirectory(prefix="shorts-vo-ttsuk-") as td:
        tmp = Path(td)
        print(f"tts-uk voice={voice!r} dur={_BASE_DUR} f0={_F0_STD} e={_E_STD} takes={_TAKES} → {ASSETS}", flush=True)
        # import once (loads model)
        from tts_uk.inference import synthesis as _warm  # noqa: F401

        jobs: list[tuple[str, str, Path]] = []
        for bed_id, _secs, phrases, _mark in PLAN:
            for i, ph in enumerate(phrases):
                raw = tmp / f"{bed_id}_{i}_raw.wav"
                jobs.append((bed_id, ph, raw))
                synth_phrase(ph, raw, voice)

        silence(tmp / "tap.wav", TAP)
        silence(tmp / "veil.wav", VEIL)
        silence(tmp / "clause.wav", CLAUSE)
        windows: list[Path] = []
        for bed_id, secs, phrases, mark in PLAN:
            parts = assemble_bed_parts(phrases, bed_id, mark, tmp)
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
        lifted = tmp / "lifted.wav"
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
                "loudnorm=I=-14:TP=-1.5:LRA=11",
                "-ar",
                "48000",
                "-ac",
                "1",
                str(warm),
            ]
        )
        lift_note = gentle_lufs_lift(warm, lifted)
        # Second pass if alimiter left I soft of target−0.5 (avoids soft-band dead zone).
        lifted2 = tmp / "lifted2.wav"
        lift_note2 = gentle_lufs_lift(lifted, lifted2)
        if "skip" not in lift_note2:
            lifted = lifted2
            lift_note = f"{lift_note}; {lift_note2}"
        print(f"  {lift_note}", flush=True)
        run(
            [
                "ffmpeg",
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                str(lifted),
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
        prov = ASSETS / ("vo-engine.txt" if stem == "vo-shorts-90s-ua" else f"{stem}-engine.txt")
        prov.write_text(
            f"engine=tts-uk\n"
            f"voice={voice}\n"
            f"prosody=token_dur={_BASE_DUR};sigma_f0={_SIGMA_F0};sigma_e={_SIGMA_E};"
            f"sigma_dec={_SIGMA_DEC};sigma_dur={_SIGMA_DUR};"
            f"takes=best-of-{_TAKES};clause={CLAUSE};phrase_fade={PHRASE_FADE}\n"
            f"note=f0_std_noop_unless_f0_mean>0;expression-punct;sigma-up\n"
            f"frontend=hero-stress-plus;bang-question-contour\n"
            f"postfx=loudnorm+gentle-lufs-lift\n"
            f"duration={d}\n"
            f"stem={stem}\n",
            encoding="utf-8",
        )
        print(f"OK tts-uk voice={voice!r} duration={d}s → {out_wav}")


if __name__ == "__main__":
    main()
