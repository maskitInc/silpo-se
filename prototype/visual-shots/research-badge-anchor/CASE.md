# Case: spark week-badge anchor (no flying pills)

## Usage
1. Open `http://127.0.0.1:8766/#/`
2. Express + Sport: badges centered on marks (edge weeks too)
3. Tap Express ‹ — remount/FLIP — badges still on peaks (may nudge Y only)

## Gate
For visible badges: `|badgeCenterX - nearestMarkCenterX| ≤ 28px` and `|ox| ≤ 14`.

## Fix
- Always `translate(-50%, …)` on badges (no edge transform basis swap)
- `transition: none` except `.is-badge-flipping`
- Overlap Y-first; capped ox for clip inset only; overlap after FLIP

## Shots
- `01-express.png` / `02-sport.png` / `03-express-after-month.png`
