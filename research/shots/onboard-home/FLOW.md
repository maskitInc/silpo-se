# Onboard → ready home (visual QA)

## Usage case
Guest opens `#/`. Three-step soft-gate on home:
1. **Крок 1** — Підключення до Сільпо (без connect форма профілю locked).
2. **Крок 2** — «Хто займається?» full form → після save згортається в плашку (avatar · summary · Змінити).
3. **Крок 3** — «Обрати програму» (фільтри рівень/категорія, «для вас») → «Далі · на головну →» → ready home.

Після complete onboard дані лише змінюються («Змінити» на плашці ready-home / day → combined form+каталог).

## Ready home · identity plate
Who: connected + complete profile + chosen program on `#/`.
1. Green plate between СільпоSE header and СільпоSport: profile · kcal · program · «Змінити».
2. «Пігнали» → `#/day` (session), **not** program picker.
3. «Змінити» → `#/sport` combined: form («Зберегти профіль») + catalog («Зберегти програму · на головну»).

## Ready home · раціон collapse
Who: connected user with complete profile + chosen program on `#/`.
1. Default: «Раціон на сьогодні» collapsed — only dish photo strip.
2. Tap title / chevron → expands to full list (slot + title + photo).
3. Tap again → back to photo strip.

## Ready home · session list / done
1. Unfinished: 4–5 exercise names, current solid, next fade (cascade starts ~17.75px); no dose line; час/ккал = full session (≥15 хв, ≥100 ккал).
2. Partial: list starts at resume heuristic from `silpo.sport.sessionEvents.v1` (`stepsDone - 1`).
3. Full done today: mosaic + «готово» + «Ще раз» → `#/sport`.

## Force locked connect UI
`http://127.0.0.1:8766/?demoConnect=1#/`

## Force step 3 (program pick)
Clear `silpo.sport.programChosen.v1` (+ optional `silpo.sport.programId.v1`) with a complete profile present, reload `#/`.

## Shots
| File | Step |
|------|------|
| `gate-connected-incomplete.png` | Connected, CTA disabled, no back |
| `gate-form-ready-cta.png` | Form filled → CTA enabled |
| `step3-program-picker.png` | Крок 1 done + крок 2 plate + program list |
| `step3-list-fix.png` | Step 3: no catalog max-height / dock flush (no frosted gap) |
| `step3-confirm-ready.png` | After confirm → ready home |
| `ready-identity-plate.png` | Ready: plate between SE and Sport |
| `edit-profile-program.png` | Змінити → form + program catalog |
| `ration-collapsed.png` | Ready home, ration photos-only |
| `ration-expanded.png` | Ready home, full dish list |
| `session-15min-floors.png` | Ready home ≥15 хв / ≥100 ккал |
| `progress-recalc-66.png` | Progress days after session-burn ETA (was 87) |

## Replay
```bash
cd prototype && node server.mjs
# clear localStorage silpo.sport.profileV0.v1 for incomplete form
open 'http://127.0.0.1:8766/'
open 'http://127.0.0.1:8766/?demoConnect=1#/'
# step 3: remove silpo.sport.programChosen.v1, reload #
# done state: set silpo.sport.sessionEvents.v1 full for today, reload #
```
