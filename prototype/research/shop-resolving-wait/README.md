# Shop resolving wait (list not clickable)

## Case
Soft fixture list while live resolve runs. User must wait — no row taps.

## Replay
```bash
# delay resolve so soft list stays visible
# see one-shot script pattern in agent session, or:
node scripts/verify-ds442-premium.mjs  # baseline shop only
```

Shots: `shots/01-resolving.png` (banner + dim + dock busy), `shots/02-ready.png` (interactive).

## Expect
- `#shop-checklist.shop-checklist--resolving` + `inert`
- `.shop-list-wait` copy «Зачекайте: підвантажуємо…»
- Dock «Оновлюємо список…» disabled
- Row click does not toggle accept until resolve settles
