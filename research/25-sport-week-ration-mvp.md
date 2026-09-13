# Research note — Sport week ration MVP (2026-09)

## What shipped
- `kb.json` `mealMaps.*.course[7]`: per-day **staples** (not titles-only).
- `#/day` ration scope **сьогодні | тиждень**: Mon–Sun strip, ceiling ₴ (shared with Express `budgetUah` + horizon week).
- Soft: «Додати все в СільпоExpress» → deduped week staples as `from: sport_week` extras (no cart write).
- Write: «Додати одразу в кошик Сільпо» → guest `confirm` → soft-add → shop resolve → accept → `pushShopCartToSilpo` (same gate as Погодити).
- `dayVmFingerprint` includes `dayISO` so day hops re-resolve when staples change.
- Module: `prototype/js/sport-week-ration.js`.

## Honesty
- Copy: Express ≠ куплено; ккал ≠ ₴ ceiling.
- No fake live cart without login (push still requires token).

## Out of scope (unchanged)
- Partner CMS, in-app payment, home rewrite.

## Manual smoke
1. `#/day` → Спортивний раціон → **тиждень** → switch days → dishes/staples change.
2. Set стеля → **Додати все в СільпоExpress** → checklist, edit qty under ceiling.
3. (Logged in) **Додати одразу в кошик** → confirm → veil → silpo.ua; (logged out) login gate.
4. Scope **сьогодні** → day «Додати всі в Express» still works.
