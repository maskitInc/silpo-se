# Sport × Express — master plan (living)

> Живий план. Після кожного кроку — новий research spike і деталізація.  
> Контракт: [`22-sport-express-sync-contract.md`](./22-sport-express-sync-contract.md).  
> Не суперечити: `DESIGN.md`, `LOCK-cards-parity-ds332`, `14e` (піднімаємо bridge з P2 → P0 **лише для handoff**, не chrome), `19d`/`21` honesty.

---

## 1. Ідея (чисто)

**Хочу тренуватись за програмою в СільпоSport (і вдома), і одразу знати що докупити в СільпоExpress під цю програму.**  
Раціон може бути від наших програм або (пізніше) від партнерів — зали / тренери / нутріціологи / дієтологи / шефи.  
Потік: **складність/програма → (опитування) → кошик раціону → Express (уточнення)**, де Express показує **що зайве купувати знову** (шафа з чеків) і **що актуально тримати під Sport**.

---

## 2. Що вже є vs чого не вистачало (дослідження)

| Шар | Є | Бракувало (виявлено) |
|-----|---|----------------------|
| Sport program + level | wheel/catalog, beginner/intermediate | survey, home/gym, week course |
| Day session + 3 plates | session player, mealMap KB | bulk basket, typed ration plan |
| Handoff | per-meal add, soft coverage LS | provenance, no-wipe contract, shop «з програми» |
| Express | checklist, qty, bases, pulse ₴, Шафа | Sport-scoped pantry, user-label «зайве» |
| Identity | device LS | shared profile / restrictions |
| Partners | KB content ports only | ContentSource adapters, legal |
| Metrics | dual-gate visits∧ration, pantry Floor 10 | ration completeness, handoff funnel |

---

## 3. Epics (великий план)

### Epic 0 — Integration contract ✅ Step 0
- Sync schemas, honesty, non-goals
- **Research after:** inventory all `go("shop")` wipe call sites
  - **Finding (2026-08-26):** no `go("shop")` in app. Shop entries: `enterShopFromPulse` (lists, keepVm), day `#toExpress` / meal-search → now `enterShopFromSport` (no wipe), hash routing. Wipe only via `go(screen)` without `keepShop`.

### Epic 1 — P0 handoff (Step 1 → …) ✅ Step 1 shipped ds402
1. Provenance on sport extras (`from:sport_day`, `programId`) ✅
2. Bulk «усі тарілки → Express» ✅
3. Shop callout «з програми X» ✅
4. Guard: sport handoff never uses wipe `go("shop")` ✅ (`enterShopFromSport`)
5. **Research spike next:** soft vs hard ration UX copy; optional hash `?from=sport`

### Epic 2 — Survey v0 ✅ ds404
- Short prefs: allergies-as-avoid chips, diet vegetarian, cook vs ready (stored)
- Writes into `SportRationPlan.source=survey_v0` when filters active
- **Spike done:** Intent kept clean; LS module `sport-survey.js`; MCP restrictions still deferred

### Epic 3 — Sport × Шафа ✅ ds403
- Filter pantry nudge by active mealMap staples
- Optional tip «під програму · глянь шафу»
- **Spike:** overlap rate staple∩beacon on fixture — see `25-spike-sport-pantry.md`
  - Finding: strength/cardio/mobility staples are mostly **P1** → P3 header overlap often **0** on ration-only lines; preferSport **falls back** to global (олія/гель). Row P1 due still shows on plates/checklist. Handoff tip uses anyBeacon overlap when available.

### Epic 4 — Loop value ✅ ds405 · **4.1 user-label «зайве» ✅ ds410**
- «Чого не вистачає» для dual-gate — day/home gap copy («у чеклисті», не купівля)
- User-label month «зайве» — LS + home SKU chip; report «Зайве (ви)» only after mark
- Handoff funnel counters (`handoffMetrics`) — enter/plate/bulk/dismiss/confirm
- **Spike:** soft overclaim — `26-spike-soft-overclaim.md` · `30-spike-epic41-user-waste-label.md`

### Epic 5 — Content depth (BATCH-A) ✅ ds406 v0 · **5.1 calendar ✅ ds413** · **5.2 stove chips ✅ ds454** · **5.3 walk target ✅ ds458** · **5.4 week-course ✅ ds459**
- Home/outdoor place filter on sport-pick (KB `place`; no fake gym SKUs)
- Walk step **target** card (presets 4k/6k/8k + LS); compose title; phone counts — no map/pedometer
- cookMode → MCP preferKind ready/raw
- 4-week calendar UI on day screen — **shipped ds413**; per-meal stove chips — **shipped ds454**; walk UI — **shipped ds458**; strength week-course **titles** — **shipped ds459** (staples fixed; soft-hop patch)
- **Spike:** `27-spike-epic5-content.md` · `32-spike-epic51-calendar.md` · `35-spike-epic52-stove-chips.md` · `36-spike-epic54-week-course.md` · CASE `prototype/research/sport-week-course-epic54/`

### Epic 6 — Partners (optional, late) — **shipped v0**
- Sync ContentSource + fixture chef overlay (`partner_fixture`); day chip «демо-шеф»; muted attribution
- No marketplace / live CMS / Mashroom clone
- **Spike:** `28-spike-epic6-partners.md`

### Epic 7 — Architecture unify — **v0 shipped**
- `sport-handoff.js`: day resolve, handoff state, pantry opts, shop banner, meal payloads
- `app.js` thin state/DOM layer; ration-plan + provenance + coverage unchanged modules
- **Spike:** `29-spike-epic7-handoff-extract.md`

---

## 4. Features user may not have listed (discovered)

1. Wipe footgun on `go("shop")`  
2. Soft ration ticks without purchase  
3. Kcal heuristic ≠ nutrition science  
4. Beacon ban on «зайве» without user label  
5. No fridge truth — only receipt cadence  
6. Chrome parity closed — don’t reopen as “unification”  
7. Bases are Express-local; Sport only reads membership  
8. ~~Walk/steps intent exists without UI~~ → **ds458** walk target card (still no pedometer/map)  
9. MCP has no programs/calories tools  
10. Partner content ≠ live marketplace  
11. Dual Intent surfaces need provenance to stay unified  
12. Pantry Floor 10 metrics pattern reusable for handoff funnel  
13. Envelope chips must not return  
14. Multi-user household out of scope  
15. Medical diagnosis forbidden  

---

## 5. Execution log

| When | Step | Result | Next research |
|------|------|--------|---------------|
| 2026-08-26 | Step 0 | Contract `22` + this plan | wipe call sites |
| 2026-08-26 | Step 1 | Provenance + bulk + shop callout (`ds402`) | soft vs hard ration copy; hash `from=sport` |
| 2026-08-26 | Spike post-1 | `24-spike-soft-hard-ration.md` | Epic 2 survey **or** Epic 3 Sport×Шафа |
| 2026-08-26 | Epic 3 | PreferSport pantry + shared staples (`ds403`) | Epic 2 survey Intent fields |
| 2026-08-26 | Epic 2 | Survey sheet + LS + query queries (`ds404`) | Epic 4 loop metrics |
| 2026-08-26 | Epic 4 | Handoff metrics + gap copy (`ds405`); spike `26` | Epic 5 content · 4.1 «зайве» |
| 2026-08-26 | Epic 5 | cookMode kind + walk + place filter (`ds406`); spike `27` | Epic 6 partners optional · Epic 7 extract |
| 2026-08-26 | Epic 6 | ContentSource + chef fixture (`ds408`); spike `28` | Epic 7 extract · 4.1 «зайве» |
| 2026-08-27 | Epic 7 | Handoff extract `sport-handoff.js` (`ds409`); spike `29` | 4.1 «зайве» · deeper app split optional |
| 2026-08-27 | Epic 4.1 | User waste labels + month report honesty (`ds410`); spike `30` | optional app split · Epic 5.1 calendar |
| 2026-08-27 | Express UI V5 | Checkout OS: assist zone + progress + dense rows (`ds411`); spike `31` | monitor · optional calendar |
| 2026-08-27 | Express UI V5 monitor | Progress strip live patch (`ds412`); browser CASE PASS dual assist + sport rail | optional calendar · Epic 5.1 |
| 2026-08-27 | Epic 5.1 | Day 4-week calendar strip + `#/day/ISO` (`ds413`); spike `32` | per-meal stove chips optional |
| 2026-08-27 | Epic 5.2 | Per-meal stove chips on plates (`ds454`); spike `35` | week-course menus · Epic 6+ optional |
| 2026-08-27 | Epic 5.3 | Walk step-target card + LS presets (`ds458`) | week-course menus · home barbell nodes optional |
| 2026-08-27 | Epic 5.4 | Strength week-course title overlay (`ds459`); spike `36` | cardio/mobility course · staples-varying menus · home barbell optional |
| 2026-08-27 | Epic 5.4b | Cardio + mobility week-course titles (`ds460`) | staples-varying menus · home barbell optional |
| 2026-08-27 | Express wow | Hero progress + photo cut-out + layout (`ds414`–`ds415`); spike `33` | V6 if owner wants more |
| 2026-08-27 | Express V6 | Flat inline progress + dense rows + sport program pin (`ds416`); spike `34` | owner sign-off |
| 2026-08-27 | Handoff resolve | Sport extras resolve by `staple` + fixture thumbs on program block (`ds417`) | owner sign-off · optional V7 mood |
| 2026-08-27 | Swap + thumbs | Pipeline swap updates `staple`; shelf fixture images for ration staples (`ds418`) | owner sign-off |
| 2026-08-27 | Express V7-lite | Dedicated ration SVGs; dedupe handoff assist when program block (`ds419`) | owner sign-off |
| 2026-08-27 | Express mood-lite | Cut-out 88px thumbs + group elev sheets; Fraunces title (`ds420`) | owner sign-off |
| 2026-08-27 | Express context | Compact row beacons + dock CTA fix + sport chips (`ds421`) | owner sign-off |
| 2026-08-27 | Chrome diet | Unified checkout header + row grid fix (`ds422`) | owner sign-off |
| 2026-08-27 | Fold trim | Compact chrome, sticky group offset, dead hero CSS removed (`ds423`) | owner sign-off |
| 2026-08-27 | Interaction CASE | Accept toggle sync progress+dock; CSS dedupe token (`ds424`) | owner sign-off |
| 2026-08-27 | Sticky sync | `syncCheckoutStickyTop()` measures header; unified signoff chain (`ds425`) | owner sign-off |
| 2026-08-27 | ds426 hygiene + fold | Jury chain scoped selectors; CSS dedupe (ds415 thumbs); header diet −19px; first-group leaf wash | owner sign-off |

---

## 6. Definition of done (north star)

Guest: обирає програму → день → **одним жестом** збирає раціон у Express → бачить «з програми» + шафу під staples → Погодити → Sport dual-gate росте.  
Партнери — контентний шар, не блокер MVP.
