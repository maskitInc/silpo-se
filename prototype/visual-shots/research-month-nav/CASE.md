# Case: month ‹ › vs chart pan

## Usage
1. Open `http://127.0.0.1:8766/#/`
2. Sport: tap ‹ once → month −1 only; Express month unchanged
3. Express: tap ‹ several times (rebinds), then Sport ‹ once → Sport −1 only (no skip)
4. Optional: drag chart horizontally → same neighbor month path as ‹ ›

## Shots
- `01-start.png` — both вересень
- `02-sport-prev-1.png` — Sport серпень, Express вересень
- `03-sport-prev-2.png` — Sport липень
- `04-craft-prev-1.png` — Express серпень
- `05-after-cross-sport-once.png` — after 3× Express ‹ then 1× Sport ‹ → Sport −1

## Replay
```bash
cd silpo-ai-projects/life-apps/prototype && node server.mjs
# then Playwright flow used in session (or re-click path above)
```
