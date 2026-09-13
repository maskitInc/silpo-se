# Express ceiling controls

## Case
Who: shopper on Express receipt (`#/shop`).
Start: open `http://127.0.0.1:8766/#/shop` (server: `node server.mjs`).
Expect: one row — **Вкажіть стелю** · `[1500 грн]` · `[тиждень ▾]` (amount left, period right).
Expect: **no** «ЧЕК · N/N поз.» above the ceiling row.

## Shots
- `ceiling-row.png` — receipt head after ceiling controls (`?v=ds620`)
- `no-chek-line.png` — ticket-head removed (`?v=ds621`)
