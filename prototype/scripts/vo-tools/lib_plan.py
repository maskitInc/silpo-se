#!/usr/bin/env python3
"""Shared parser for vo-script-plain-ua.txt (SSoT for SilpoSE 90s VO)."""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from pathlib import Path

BED_WINDOWS = {
    "0:00": 10.0,
    "0:10": 8.0,
    "0:18": 10.0,
    "0:28": 14.0,
    "0:42": 6.0,
    "0:48": 10.0,
    "0:58": 17.0,
    "0:75": 15.0,
}
LINE_RE = re.compile(
    r"^\[(?P<tc>\d+:\d{2})\]\s+(?P<body>.+?)\s*$"
)


@dataclass
class Bed:
    tc: str
    window_s: float
    text_raw: str  # with + and markers
    text_tts: str  # markers stripped, + kept
    text_adr: str  # + and markers stripped
    has_tap: bool
    has_veil: bool
    stress_marks: int


def assets_dir() -> Path:
    # …/life-apps/prototype/scripts/vo-tools/lib_plan.py → life-apps/research/24-shorts-assets
    return (Path(__file__).resolve().parents[3] / "research" / "24-shorts-assets").resolve()


def default_plan_path() -> Path:
    return assets_dir() / "vo-script-plain-ua.txt"


def strip_markers(text: str) -> str:
    return re.sub(r"\s*\[(?:TAP|VEIL)\]\s*", " ", text).strip()


def normalize_spaces(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def strip_stress(text: str) -> str:
    return text.replace("+", "")


def parse_plan(path: Path | None = None) -> list[Bed]:
    path = path or default_plan_path()
    beds: list[Bed] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        m = LINE_RE.match(line)
        if not m:
            continue
        tc = m.group("tc")
        body = m.group("body")
        has_tap = "[TAP]" in body
        has_veil = "[VEIL]" in body
        tts = normalize_spaces(strip_markers(body))
        adr = normalize_spaces(strip_stress(tts))
        beds.append(
            Bed(
                tc=tc,
                window_s=BED_WINDOWS.get(tc, 0.0),
                text_raw=body,
                text_tts=tts,
                text_adr=adr,
                has_tap=has_tap,
                has_veil=has_veil,
                stress_marks=tts.count("+"),
            )
        )
    return beds


def plan_hash(path: Path | None = None) -> str:
    path = path or default_plan_path()
    data = path.read_bytes()
    return hashlib.sha256(data).hexdigest()[:12]


def total_window(beds: list[Bed]) -> float:
    return sum(b.window_s for b in beds)
