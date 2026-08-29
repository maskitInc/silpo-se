# Sport × Express — sync contract (Epic 0 / Step 0)

**SSoT for handoff.** Does not reopen chrome parity (`LOCK-cards-parity-ds332`). Does not invent partners/CMS. Does not invent fridge IoT.

## Product thesis (формулювання ідеї)

**СільпоSport × СільпоExpress** — один життєвий контур, не два окремі додатки з однаковою зеленню.

1. Гість обирає **програму руху** (складність / ціль) у Sport — навіть вдома.
2. Під програму з’являється **раціон** (KB meal map + survey v0 «Смаки» → `source=survey_v0`; далі колаборації контенту).
3. Раціон збирається в **кошик палива** → handoff у Express для уточнення (qty, заміна, стеля, шафа).
4. Express чесно підказує з **чеків**: що ще може бути вдома (Шафа) і що варто мати під **активну програму Sport** — без «ми знаємо холодильник» і без «треба купити».

«Своя програма» може пізніше тягнути контент від залів / тренерів / нутріціологів / дієтологів / шефів — як **ContentSource у KB**, не як фейковий маркетплейс у прототипі.

## Current bridge (facts)

| Path | Behavior |
|------|----------|
| Day → Express CTA | `state.screen="shop"` without `go("shop")` wipe (`app.js`) |
| Per-meal add | `addExtraProduct` + `noteSportRationCoverage` |
| Membership | `express-membership.js` pure |
| Shared history | `/api/history` → Sport kcal + Express pulse + beacons |
| Dual Intent | `intentSport` + `intentShop` |
| Survey v0 | LS `silpo.sport.surveyV0.v1` → `queriesOverride` on day; Intent stays clean |
| ContentSource v0 | LS `silpo.sport.contentSource.v1` + fixture `fixture_chef_demo`; merge mealMaps; `partnerId` on plan |
| Handoff domain | `sport-handoff.js` — day resolve, handoff state, shop banner model, meal payloads (`ds409`) |
| User waste label | LS `silpo.express.wasteLabels.v1`; month report «Зайве (ви)» only after SKU mark (`ds410`) |

## Schemas (v0)

### SportRationPlan
```js
{
  programId: string,
  goal: string,          // strength | cardio | mobility | …
  level: "beginner" | "intermediate",
  dayISO: string,        // Kyiv day key
  queries: Array<{ role, q, staple?, group? }>,
  source: "kb" | "survey_v0" | "partner_fixture",
  partnerId: null | string  // ContentSource pack id when active (Epic 6)
}
```

### ExpressLineProvenance
```js
{
  from: "sport_day" | "receipt_merge" | "base" | "browse" | "composer",
  programId?: string,
  rationRole?: string
}
```
Attached to `extraQueries[]` and optionally surfaced in `why` / shop callout.

### Honesty (locked)
- Reuse `research/19d`, pantry `21`: cue from receipts, never fridge qty / «закінчилось» / guilt «зайве» unless user-labeled.
- Kcal on Sport pulse = heuristic, not medical advice (`sport-pulse.js`).

## Non-goals (this contract)
- Partner marketplace UI / live CMS
- Fridge sensors / inventory truth
- Reopening Sport↔Express **chrome** 1:1 debates
- Wipe extras via `go("shop")` for sport handoff
- Pulse money chart inside Sport day plates

## Acceptance (Step 0 done when)
- [x] This file + master plan `23` exist
- [x] Step 1: provenance on sport adds + bulk plates + shop callout (`ds402`)

## Progressive deepen protocol
Кожен виконаний Epic відкриває **Research spike** наступного: що ще бракує в коді/юридиці/контенті → оновити `23` §Changelog.
