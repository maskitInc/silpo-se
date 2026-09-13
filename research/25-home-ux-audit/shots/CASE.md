# CASE — Home full screenshot for UX audit

**Date:** 2026-09-11  
**URL:** `http://127.0.0.1:8766/#/`  
**Viewport:** 430×2400 (full scroll); also 430×932 phone shell  

## Steps (replay)

1. `cd prototype && node server.mjs` (або вже :8766)
2. `B=$HOME/.cursor/skills/gstack/browse/dist/browse`
3. `$B viewport 430x2400`
4. `$B goto http://127.0.0.1:8766/#/`
5. `$B wait --networkidle` + ~1.5s
6. Optional: `$B js` — `#phone` height auto / overflow visible
7. `$B screenshot "#app" visual-shots/home-ux-audit-2026-09-11/home-full-scroll.png`

## Expected

- Brand СільпоSE + whisper + MCP chip
- Sport ritual + month pulse (metrics + chart)
- Express ritual + month pulse (metrics + chart)
- Full content height ~2300px+

## Output

Copied to `research/25-home-ux-audit/shots/` for the audit doc.
