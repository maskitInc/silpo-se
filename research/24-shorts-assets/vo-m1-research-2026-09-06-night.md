# M1 VO research — 2026-09-06 night (clean loudness)

## Intake
Continue machine VO polish. Subagent found stem was **chained manual gain** (I≈−15.0 / LRA≈3.6), not clean builder `gentle_lufs_lift`. Soft-band floor `−15.5` skipped further lift toward −14.

## Facts
| Artifact | I LUFS | LRA |
|----------|-------:|----:|
| `bak-pre-ln14` (single-pass loudnorm) | −17.6 | 4.9 |
| chained evening stem (pre-fix) | −15.0 | 3.6 |
| **clean lift ×2 → ship stem** | **−14.7** | **3.4** |

Pass notes: `+3.60dB` from −17.6 → −15.4 / 3.8; then `+1.40dB` → −14.7 / 3.4.

Also found: `shorts-vo-tts-uk.py` called `run()` but **helper missing** (StyleTTS2 had it) — full rebuild would NameError.

## Changes
1. `gentle_lufs_lift`: skip only when `I >= target−0.5` (was floor −15.5 soft-band).
2. Builder: restore missing `run()`; allow max 2 gentle lifts after loudnorm.
3. Ops: restore `bak-pre-ln14` → lift×2 → remux M1; provenance in `vo-engine.txt`.
4. Chained stem saved as `vo-shorts-90s-ua.bak-pre-clean-lift.wav`.

## Gates
- vo-qa-gate PASS (I−14.7)
- vo-artic-gate PASS
- vo-status READY · plan_hash `12060a0f1a7f`
- listen hard #1 still machine ceiling (ADR only)

## Trade-off
Hitting −14±0.5 costs LRA (4.9→3.4). Still above dual-pass crush (~2.2). Further free-engine F0 polish = no; brand ship = human ADR → M2.
