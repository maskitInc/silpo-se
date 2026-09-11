# VO listen card — SilpoSE 90s

Date: 2026-09-05  
Plan hash: `4a68931f7988`  

## Provenance
```
engine=tts-uk
voice=mykyta
prosody=token_dur=0.88;sigma_f0=1.55;sigma_e=1.5;sigma_dec=0.95;sigma_dur=1.05;takes=best-of-10;clause=0.26;phrase_fade=0.014
note=f0_std_noop_unless_f0_mean>0;expression-punct;sigma-up
frontend=hero-stress-plus;bang-question-contour
postfx=loudnorm+gentle-lufs-lift
duration=90.000000
stem=vo-shorts-90s-ua
plan_hash=4a68931f7988
built_at=2026-09-06T21:50:23Z
builder=vo-build
```

## How to listen
1. **Audio only** first (no video) — headphones.
2. Then with `m0-silent-90s.mp4` picture (muted UI sounds).
3. Score each row 0/1. Fail any **hard** row → do not ship as final.
4. Auto locks: `vo-artic-gate.py` (no `метушні`; no `Склад поруч,`) + `isolates/WINNERS.md`.

## Scorecard

| # | Check | Hard? | Pass? | Notes |
|---|--------|-------|-------|-------|
| 1 | Sounds like explaining to a friend, not slide deck | hard | ✗ | Machine ceiling — draft only |
| 2 | Brands clear: Сільпо / Спорт / Експрес | hard | ☐ | Re-check on ADR |
| 3 | Stress OK on додаток, Погодити, Одним, життя | hard | ☐ | **метушні removed from ship** (artic-gate FAIL) |
| 4 | TAP/VEIL pauses feel intentional, not dead air | soft | ☐ | |
| 5 | Pace OK (~not rushed / not drowsy) | soft | ☐ | |
| 6 | No garble / skip / double words | hard | ☐ | Glue: `Склад поруч.` own phrase (artic-gate) |

## Stop rule (manage expectations)
- After **≤2** free-engine passes (tts-uk / StyleTTS2) with hand-stress + QA gate, if any **hard** row still fails → **force human ADR**.
- **Autonomous working cut = M1** (`m1-machine-vo-90s.mp4`, mykyta) for demos / timing — no wait on talent.
- External brand cut still prefers M2 when human WAV appears.
- Do **not** start a third engine day — rewrite line or record.

## Winner / decision
- [x] Keep machine VO as **autonomous working cut (M1)**
- [ ] Promote machine VO to external brand cut (only after listen hard rows pass)
- [ ] Schedule ADR when talent available (`vo-adr-cue.txt` + `adr-booth.md`)

Listener: autonomous artic-gate + process lock  
Working file: `prototype/visual-shots/shorts-90s/m1-machine-vo-90s.mp4` · hash in provenance above  
Optional later: drop take → `takes/` → **m2-human-adr-90s.mp4**
