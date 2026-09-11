# M1 research — SilpoSE shorts 90s (2026-09-06)

Autonomous audit of working cut `m1-machine-vo-90s.mp4` + stem `vo-shorts-90s-ua.wav`  
`plan_hash=12060a0f1a7f` · voice=mykyta · picture=`?month=prev` (серпень)

Artifacts: `/tmp/shorts-research-2026-09-06/` (metrics + M1 frame grabs)

---

## 1) Verdict

| Layer | Score | Notes |
|-------|------:|-------|
| Loudness / IG fit | **8/10** | LRA **4.9** in Reels band 4–9; loudnorm −14 target aligned with industry |
| Pitch expression | **4/10** | F0 σ≈**16.5 Hz**, range≈94 Hz — still “narrow” male TTS; free ceiling |
| Artic / glue locks | **9/10** | artic-gate PASS; no метушні; «Склад поруч.» phrase split |
| Picture ↔ VO story | **8/10** | серпень + over→under shop arc; end frame cluttered by beacon toast |
| Brand human feel | **3/10** | Stop rule: machine ≠ brand; M1 = autonomous demo cut |

**Ship posture:** keep **M1** as autonomous working cut. Do **not** open third TTS. Optional M2 if human ADR appears.

---

## 2) Audio (objective)

| Metric | Value | Target / read |
|--------|------:|---------------|
| Duration | 90.000 s | OK |
| LRA | 4.9 LU | Reels speech often 4–9 LU |
| F0 mean | ~124 Hz | mykyta baritone-ish |
| F0 σ | ~16.5 Hz | Low → “robot contour”; sigma knobs already high |
| F0 range | ~94 Hz | Limited melody |
| RMS p90/p10 | ~9.6 | Energy contrast OK |
| Gaps ≥1.0 s | none | OK |
| Gaps ~0.45–0.5 s | 41.6 / 57.6 / 81.0 | TAP/VEIL padding — keep |

Per-bed RMS: densest energy on **w58** (control copy); calmer on w18/w42.

**Industry note (Reels 2025–26):** upload near **−14 LUFS**, true peak ≤ **−1 dBTP**, mono VO fine, AAC 256k in MP4. Our pipeline already loudnorm −14; LRA in band. Pushing louder gains nothing after IG normalize.

**Expression ceiling:** `f0_std` NO-OP while `f0_mean=0`. Unlock needs measured μ experiment (deferred). Alternate voice already tried (lada/tetiana/StyleTTS2) — mykyta wins on LRA.

---

## 3) Picture QA (M1 frames)

| TC | Expect | Observed |
|----|--------|----------|
| ~22 s | Sport tip, серпень | OK — tip + August |
| ~52 s | Удар по стелі / OVER | OK — ПЕРЕВИЩЕНО + silent burn-in |
| ~62 s | Під стелею / control | OK — ЗАЛИШИЛОСЬ ~108 |
| ~80 s | Погодити clean | **Fixed evening** — toast cleared (see evening doc) |

Shop story lock (chain trim): **f OVER → g/h under** verified in stills + frames.

---

## 4) Risks / deferred

1. End toast clutter (fix this session)
2. Free TTS pitch flatness — human ADR or paid neural only
3. No finger overlay on stills (scenario “палець”) — needs asset pass
4. `return` in browse JS fragile — prefer last-expression style (partially done)

---

## 5) Actions from this research

| Prio | Action | Status |
|------|--------|--------|
| P0 | Clear toast / tips on final `h` still; remux M0/M1 | next |
| P1 | Doc this research next to assets | this file |
| P2 | Optional hero stress on `минулий` / `місяць` | only if ears need |
| P3 | Human ADR → M2 | optional |

---

## 6) References

- Reels loudness ~−14 LUFS / TP −1 dBTP / LRA 4–9 (industry writeups 2025–26)
- Internal: `vo-articulation-fix-plan.md`, `ab-engine-decision.md`, `vo-status.sh`


## 7) Follow-up 2026-09-06 night
- End still `h`: toast cleared (beacon tip no longer covers Погодити).
- **LUFS:** single-pass loudnorm left I≈−17.6 (soft WARN). Dual-pass crushed LRA 4.9→2.2 — **rejected**.
- **Kept:** restore + gentle `volume=+3.4dB` + soft limiter → aim I≈−14 while preserving LRA≈4–5.
- Backup pre-fix: `vo-shorts-90s-ua.bak-pre-ln14.wav`.
- Builder follow-up: replace single-pass loudnorm with measure→gentle gain (keep LRA).


> Evening re-audit: `vo-m1-research-2026-09-06-evening.md` (hook caption sync + LUFS nudge).
