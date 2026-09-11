# Case: stats in dark status-band (experiment)

## Status
**Reverted** — `PULSE_STATS_IN_BAND = false` (metrics back in white story-pad below whisper).

## Structure (when flag true)
1. Month row (`‹ місяць ›` + % / повернутись)
2. Hairline divider
3. 3-col metrics (dark-adapted)
4. Whisper progress bar (sibling under band)

## Revert
In `prototype/js/app.js`:
```js
const PULSE_STATS_IN_BAND = false;
```
Baseline before experiment: git `1edb71f` on `main`.

## Shots
- `01`–`05` — experiment on
- `06-reverted.png` — after restore
