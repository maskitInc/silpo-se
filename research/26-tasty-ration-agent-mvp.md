# Tasty ration agent (MVP)

Deterministic Sport compose helper — **not** a live LLM (jury offline / no token).

## Why
KB dishes like «Рис з овочами» shipped `["рис","овочі"]` → one Silpo SKU for `овочі` (cucumber). Believable meal needs multi-veg + fat.

## What shipped
- `js/meal-ration-agent.js` — `expandMealStaples`, `assertTastyMealPack`
- Wired in `sportShopQueriesFromMealMap` (`composer.js`)
- Cardio lunch packs enriched; shelf adds `помідор` / `огірок` / `олія`

## Agent story (pitch)
Composer = meal planner agent; Resolver+MCP = Silpo picker. Expansion rules keep titles honest offline.

## Follow-ups
- Offline LLM → draft packs into `kb.json` (not hot path)
- Multi-pick still 1 SKU per staple (by design)
