# VO articulation fix plan — SilpoSE shorts 90s

**Problem:** Machine VO still robotic; defects «складпаруч» (word glue) and «безметУшні» (wrong stress).  
**SSoT text:** `vo-script-plain-ua.txt` · **Engine:** tts-uk **mykyta** (lada superseded) · **Brand ship:** human ADR (`adr-booth.md`).  
**Research:** 2026-09-05 — glue = comma≠pause; stress `+` advisory; gate presence-only.

```
P0 isolate clips ──► P1 phrase/copy surgery ──► P2 optional QC gates
                              │
                              └──► P3 human ADR → M2 (parallel / final)
```

| Phase | Weight | Status |
|-------|--------|--------|
| P0 Isolate + preview sync | 10% | **done** |
| P1 Phrase/copy + plan-check | 35% | **done** |
| P2 Acoustic/STT spot QC | 15% | **done** (vo-artic-gate text lock; audio fixtures informational) |
| P3 Human ADR → M2 | 40% | **optional** (autonomous cut = M1) |

**ЗАГАЛЬНИЙ ПРОГРЕС** = Σ (weight × phase_done). Update footer after each session.

---

## P0 — Isolate (diagnosis lock)

| | |
|--|--|
| **Мета** | Ears prove glue vs stress variants before more knobs |
| **Промпт (Cursor)** | Micro-synth same knobs as `vo-engine.txt`: (A) `Склад поруч, тож…` one phrase (B) `Склад поруч.` alone + CLAUSE (C) `без метушні+` vs `Без метушні+!` alone vs rewrite `спокійно`. Write clips under `research/24-shorts-assets/isolates/`. No third TTS. |
| **Критерій** | 3–6 WAV ≤10s each; written winner per defect |
| **gstack** | `/investigate` if unclear; skip `/qa` until full rebuild |

---

## P1 — Phrase surgery + gate (draft fix)

| | |
|--|--|
| **Мета** | No «складпаруч»; метушні heard on final **і** or line rewritten clear |
| **Промпт (Cursor)** | Edit `vo-script-plain-ua.txt` + mirror PLAN in `shorts-vo-tts-uk.py` + `shorts-vo-local-styletts2.py`: (1) own PLAN phrase `Склад поруч.` (2) break `без метушні` glue — own phrase `Без метушні+!` or replace dense hits with `спокійно` (3) `vo-plan-check.py`: reject `мет+ушні`/`мету+шні`; require `метушні+`. Sync → `vo-plan-check` → `SHORTS_VO_ENGINE=ttsuk ./scripts/vo-tools/vo-build.sh` → refresh stress-preview + guide. Minimal diff; no fake ADR. |
| **Критерій** | plan-check PASS; QA PASS; audio-only: «Склад»≠«складпаруч»; метушні not метУшні on remaining hits |
| **gstack** | After rebuild: listen; `/review` only if multi-file drift |

---

## P2 — Optional QC (deferred)

| | |
|--|--|
| **Мета** | Automated catch of glue/stress regressions |
| **Промпт (Cursor)** | Add soft gate: warn if bed atempo WARN; optional STT spot on hero words; take_score must not over-penalize micro-pause after short words. Do **not** unlock `f0_mean` without measured μ experiment doc. |
| **Критерій** | CI/local script fails or WARNs on known-bad fixtures |
| **gstack** | `/plan-eng-review` before adding STT dep |

---

## P3 — Human ADR ship (brand)

| | |
|--|--|
| **Мета** | Brand-ready VO; machine = draft/timing only |
| **Промпт (Cursor)** | Talent records from `vo-adr-cue.txt` + `adr-booth.md` + `vo-adr-guide-90s.wav`. Drop `takes/human-take.wav` → `./scripts/vo-tools/vo-adr-remux.sh …` → `m2-human-adr-90s.mp4`. Re-score `listen-card.md` hard rows manually (`--preserve`). Tick scenario §7. |
| **Критерій** | M2 exists; listen-card hard #1–3 pass; no machine ship |
| **gstack** | `/qa` on M2 picture+VO if UI timing; else audio gate only |

---

## Відкладено / не в scope

- Third TTS engine day
- Fake/TTS «human» ADR
- Remux Aug-31 katyunya (~60s) as current 90s ship
- Spinning `f0_std` while `f0_mean=0`
- Full rewrite of scenario §3 VO cells (cue is SSoT)

## gstack map (short)

| Situation | Command |
|-----------|---------|
| Root cause unclear | `/investigate` |
| Scope / product stop | `/plan-ceo-review` |
| Before STT/QC deps | `/plan-eng-review` |
| Pre-merge multi-file | `/review` |

---

## Progress log

| Date | Note | Overall |
|------|------|---------|
| 2026-09-05 | Plan created; P1 execute this session | ~15% |
| 2026-09-05 | P1 shipped phrase splits | **45%** |
| 2026-09-05 | P0 isolates on disk | **50%** |
| 2026-09-05 | P2 artic-gate + drop метушні (auto); hash `40f25ce2e67f` | **60%** |
| 2026-09-05 | Soft-gap fill; hash `b00587beb102`; artic+QA green | **62%** |
| 2026-09-05 | StyleTTS2 A/B reject (LRA 1.9&lt;3.6); `vo-takes-watch` running | **65%** |
| 2026-09-05 | Bed-fill gate + densify w18; sigma↑; hash `a5ca6a25981a` | **68%** |
| 2026-09-05 | Switch ship → **mykyta** LRA 5.1; lean-fill; `c96bea3be3a0` | **72%** |
| 2026-09-05 | w00 trim (no atempo WARN); hash `5581d664e69c`; LRA~4.9 | **80%** |
| 2026-09-05 | captions-export sync (drop метушні/—); watch --daemon | **82%** |
| 2026-09-05 | plan-check captions sync + ban метушні; scenario hash/engine | **84%** |
| 2026-09-05 | §3 VO→cue pointers; vo-status.sh; assets README mykyta | **86%** |
| 2026-09-05 | reel month=prev (серпень); VO «минулий місяць»; hash `5b2cc4912987` | **88%** |
| 2026-09-05 | pulse-fix stills + booth note month=prev | **88%** |
| 2026-09-05 | autonomous: w00 fill, gaps=0, M1=working cut, hash `12060a0f1a7f` | **90%** |
| 2026-09-06 | M0/M1 regen ds571; stress-preview in vo-build; TAP gaps kept | **91%** |
| 2026-09-06 | shop beat: f=OVER → g=under ceiling (trim); M1 remux | **92%** |
| 2026-09-06 | silent burnin over→under; chain return-safe; M0/M1 remux | **93%** |
| 2026-09-06 | research doc + clean h still (no toast); M1 remux | **94%** |
| 2026-09-06 | research: F0/LRA/LUFS; clean h; gentle LUFS lift in builder | **95%** |
| 2026-09-06e | evening research: hook silent↔VO; LUFS −15.0; h clean | **96%** |
| 2026-09-06n | soft-band floor fix; missing `run()`; clean lift I−14.7; M1 remux | **97%** |
| 2026-09-07 | phrase surgery friend-breath; hash `4a68931f7988`; 0 atempo>cap WARN | **98%** |
| _(next)_ | optional M2 if ADR appears | |

**Last updated:** 2026-09-07  
**Overall progress:** 98% (prosody closer to friend-breath; brand = ADR)
