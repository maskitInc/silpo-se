# VO prosody research — 2026-09-07 (human-like pauses/stress)

## Goal
Machine VO pauses/stress felt unnatural. Research how human UA commercial VO should breathe, then approximate within free **tts-uk mykyta**.

## Human target (from ADR booth + isolates + friend-breath policy)
1. Friend explain, not slide deck.
2. Real pause = **own PLAN phrase** → CLAUSE (~0.26s), not comma.
3. Friend breath ~**8–16 words/phrase**; ~2–3 phrases/bed when window allows.
4. Glue pairs («Склад поруч.» / «Ліміт поруч.») = own phrase.
5. Hero `+` after stressed vowel; avoid метушні-class.
6. Fill bed windows; avoid ≥1.2s dead trail / ≥3s air.
7. TAP/VEIL intentional, not mumbled markers.
8. Brands clear: Сільпо / Спорт / Експрес.
9. Machine **cannot** fix F0 melody (`f0_mean=0` → flat σ≈16 Hz) — brand ship = ADR.

## Root cause (facts)
Worst beds were **run-ons**: w58 (21+24w), w42 (single 16w), w75 p1 (21w). Comma ≠ pause in tts-uk. Stress sparse (минулий/місяць unmarked).

## What we changed
Phrase surgery + selective stress on plain + both PLAN mirrors:
- **w00** — hook / products / hero split
- **w10** — `ритуа+ли`, `зви+чку`
- **w18** — `мину+лий мі+сяць.` own phrase; shorter calm line (no «без зайвих жестів» — fill budget)
- **w42** — bang | list (CLAUSE)
- **w48** — `Ліміт поруч.` own phrase; `спокі+йно`
- **w58** — 6 friend phrases + mid TAP after «правка» (`tap_after:2`); densify balance vs atempo
- **w75** — split finish into 3 CLAUSE phrases after VEIL

## Iterate notes
1. First over-split → atempo WARN w18/w58 (>1.08).
2. Over-trim w58 → artic underfill trail 1.43s.
3. Landed: atempo ≤1.08 all beds; artic PASS; I≈−14.7 / LRA≈3.3.

## Ship state
| | |
|--|--|
| plan_hash | `4a68931f7988` |
| stem | `vo-shorts-90s-ua.wav` |
| M1 | `m1-machine-vo-90s.mp4` |
| Gates | plan/qa/artic PASS · status READY |
| listen hard #1 | still machine ceiling → ADR for brand |

## Ears checklist (human vs this draft)
- [ ] w58 breaths feel like decisions, not telegram
- [ ] w42 not rushed into TAP
- [ ] «минулий місяць» stress hears correct
- [ ] still robotic pitch? → expected; schedule ADR
