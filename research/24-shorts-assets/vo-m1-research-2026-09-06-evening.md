# M1 research evening — 2026-09-06

Follow-up to `vo-m1-research-2026-09-06.md`. Artifacts: `/tmp/shorts-research-2026-09-06e/`.

## Method
- Re-run `vo-status` / plan-check / qa-gate on current stem + M1
- F0 / RMS re-measure (post gentle LUFS lift)
- Frame grabs at 2 / 22 / 45 / 52 / 62 / 80 / 88 s
- Diff vs morning research actions

## Snapshot (before evening fixes)

| Metric | Value | Read |
|--------|------:|------|
| plan_hash | `12060a0f1a7f` | stable |
| I_LUFS | −15.5 | in soft band; still quiet vs −14 |
| LRA | 3.9 | below ideal 4–9 (after prior gain) |
| F0 σ | ~16.3 Hz | unchanged free-TTS ceiling |
| RMS p90/p10 | ~8.0 | slightly flatter than morning ~9.6 |
| artic | PASS | OK |
| gaps ≥1 s | none | OK |
| h toast | cleared | morning P0 done |

## Findings

### F1 — Silent hook ≠ VO (P0)
- Burn-in @0–10s: **«Один ритм дня»**
- VO: **«Ранок уже в русі!…»**
- First 2–3 s decide Reels hold; mismatch burns trust.

**Fix:** silent → `Ранок уже в русі` + remux M0/M1.

### F2 — LUFS still soft (P1)
- −15.5 → target −14; peak headroom existed (~−0.7 dBFS sample peak parse).
- **Fix:** +1.0 dB + soft limiter (not dual-pass). Landed **I≈−15.0**, LRA≈**3.6**.

### F3 — End frames OK after morning fix (closed)
- t80/t88: under ceiling, no beacon toast; captions «Погодити» / «Оплата в Сільпо» aspirational (no live cart — by design).

### F4 — Finger overlays still missing (P2 deferred)
- Scenario «палець» has no PNG/SVG asset in repo → skip fake finger.

### F5 — Pitch expression (P3 deferred)
- Free engine ceiling; no third TTS; ADR optional.

## Scores (evening)

| Layer | Morning | Evening | Delta |
|-------|--------:|--------:|------|
| Loudness | 8 | **8.5** | +0.5 after +1 dB |
| Pitch | 4 | 4 | — |
| Artic | 9 | 9 | — |
| Picture↔VO | 8 | **9** | hook caption sync |
| Brand feel | 3 | 3 | — |

## Actions this pass
1. Silent hook sync + M0/M1 remux
2. +1 dB LUFS lift (backup `.bak-pre-eve-lift.wav`)
3. listen-card `--preserve` provenance refresh
4. This document

## Next (only if ears/eyes find defect)
- Optional rebuild through `gentle_lufs_lift` in builder for cleaner I≈−14 without chained manual gains
- Finger asset pass
- Human ADR → M2
