# Case: Express spark fill after month ‹ ›

## Usage
1. Open `http://127.0.0.1:8766/#/`
2. Express: tap ‹ until **серпень**
3. Chart/grid last tick must sit near wrap right (no large white void)
4. Repeat with pan drag and «повернутись»

## Shots
- `01-start.png` — вересень
- `02-express-serpen.png` / `03-express-serpen-scrolled.png` — серпень fill

## Metrics gate (Playwright)
- `|live - baked chartW| ≤ 2`
- `(len-1)*pitch ≈ live − 2·xPad` (fillGap ≤ 6)
