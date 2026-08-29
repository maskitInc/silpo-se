# Design System — Сільпо Life Apps (прототип)

Джерело правди для `life-apps/prototype`. Не брендбук холдингу. Орієнтир — grocery ritual OS (Dribbble FreshCart / Grocia: warm paper, one forest CTA, product thumbs, bottom checkout dock). Зразок компонентів: `/design.html`.

## Product Context

- **What this is:** Два ритуали в одному телефоні: програма тренувань (день + полиця) і чеклист Express з чеків MCP. Picker програм — UI, не бренд.
- **Who it's for:** Журі хакатону + гість Сільпо на iPhone.
- **Project type:** Mobile web app (430px phone shell), not marketing site.

## Aesthetic Direction

- **Direction:** Quiet grocery OS — paper, leaf, one decisive action.
- **Decoration:** Intentional (paper grain, hairline, leaf wash on swap current). Not glassmorphism soup.
- **Mood:** Calm checkout, not neon delivery marketplace.
- **SAFE:** Green CTA, product photos, sticky dock, UA copy, 48px+ thumbs.
- **RISK:** Fraunces display on a grocery app (editorial, not Inter). iOS wheel instead of a list. **Replace (swap) = sheet.** **Add from a checklist group = full-step canvas** under `#/shop/add…` (hash B). Shop chrome = horizon `<select>` + budget number only (no A/B/C tabs / envelope chips). Do not revive `document.startViewTransition` on Add.

## Type

| Role | Face | Size | Weight |
| --- | --- | --- | --- |
| Display | Fraunces opsz 9–144 | 28–36 | 680 |
| Title | Fraunces | 22–24 | 680 |
| UI | Manrope | 15–17 | 500–700 |
| Meta / kicker | Manrope | 12 | 700, 0.14em uppercase |
| Price | Manrope + `tabular-nums` | 15–22 | 700 |

Loading via Google Fonts `display=swap`. Numbers: `Intl.NumberFormat("uk-UA", { currency: "UAH" })`. Ellipsis `…`. No English chrome on UA screens except proper names.

## Color (oklch)

| Token | Role |
| --- | --- |
| `--bg` | warm paper canvas |
| `--elev` | card / sheet fill |
| `--ink` | primary text |
| `--muted` | secondary |
| `--leaf` / `--leaf-ink` | primary CTA |
| `--ok` / `--danger` / `--swap` | line status |
| `--pill` | chip / control fill |
| `--line` | hairline |
| `--scrim` | sheet dim |

No purple gradients. No 3-column icon grid.

## Space

Base 4px. Scale: 4 / 8 / 12 / 16 / 24 / 40. Radius: control 999, card 24, thumb 14, sheet top 28.

## Motion

Compositor only: `transform` + `opacity`. Ease `cubic-bezier(0.22, 1, 0.36, 1)`.

| Kind | Duration | Use |
| --- | --- | --- |
| micro | 120ms | chip press |
| short | 220ms | sheet rise, line enter |
| screen | 280ms | `document.startViewTransition` on `go()` |

Sheets rise 18px. Stagger lines `nth-child` × 30ms, cap 240ms. `prefers-reduced-motion: reduce` → 0.01ms, no view transitions.

## Layout

Phone column `min(430px, 100%)`. One primary per screen. Dock sticky. Overlay sheets: scrim + bottom panel, `overscroll-behavior: contain`, Escape closes.

## Components

Launch tile, chip, shop-controls (horizon select + budget), **shop pantry callout** (elev wash + «Шафа» lead under controls), product line, status pill, group header, dock, sheet (scrim+panel), **add-step canvas**, skeleton, empty state, toast, wheel, catalog row.

## A11y

Skip link. `:focus-visible` ring on `--leaf`. Icon buttons `aria-label`. Dialogs `aria-modal`. Live region `#live`. Search `autocomplete="off"`.

## Do / don’t

- Do: Ukrainian labels, money via `money()`, thumbs 48–76, hover+active, empty states.
- Don’t: `transition: all`, MCP/debug chrome without jury toggle, `outline: none` without `:focus-visible`, hardcoded `₴` next to prices.

## Decisions Log

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-08-19 | Paper + Fraunces + leaf | First design lock |
| 2026-08-19 | Sheets + view transitions + token layers | Second pass: production density, Dribbble grocery patterns without Inter/slop |
| 2026-08-20 | Add = full-step; Replace = sheet | Owner: «+ додати» is a next step, not a popup. VT on `go()` already caused ghost home/sport. See `research/add-flow/S36-design-lock.md`. |
| 2026-08-20 | Home premium pass (RIVR → grocery) | Take: one-viewport hero, frost badge only, corner cutout CTA, CSS enter motion. Drop: DeFi video, Helvetica CDN, React/Tailwind/lucide, glass soup on shop/add. Fold polish `?v=ds26`. |
| 2026-08-20 | SKU cut-out stage | Checklist product cards: soft pedestal stage, `object-fit: contain`, drop-shadow lift, checkbox top-right — for transparent Silpo shots. `?v=ds26`. |
| 2026-08-20 | Resolve photo coverage | Veg/mayo/preserve category slugs + hint match; `find_products_batch` often empty → category path fills images. `?v=ds27`. |
| 2026-08-20 | Checklist media language | Cut-out thumbs (104px / 88 stage, stronger stage contrast); letter tiles when no image; no pack/lock SVG. Fixture `content/fixture-thumbs/*.svg` + shelf `image`. Group header icons + wrap. `?v=ds39`. `research/13-product-list-visual.md`. |
| 2026-08-20 | Checklist tap / dock / rail | Accept toggle patches DOM (no rise remount); dock clearance 168px; drop inset leaf rail; neutral photo stages; relative fixture thumbs. `?v=ds40`. |
| 2026-08-20 | Check gutter + bare MCP shots | Checkbox hangs left of checklist card; `.sku-panel`; MCP `.sku--shot` no stage fill/border; letter/miss keep tile. `?v=ds42`. |
| 2026-08-20 | Flat cart-row checklist | Drop elevated checklist card; bare miss/letter rows (tile only); hairline rows; 96px thumbs; stronger check. `?v=ds43`. |
| 2026-08-20 | Variant tabs + per-tab envelopes | A/B/C horizontal tabs; продукти/алкоголь/тютюн/мийні editable per variant (`variantAllow`). `?v=ds45`. |
| 2026-08-21 | Compact shop chrome | One row: native horizon `<select>` + budget number; drop slider card, variant tabs, envelope chips. Defaults: variant B + food/clean. `?v=ds61`. |
| 2026-08-21 | Rename product | Guest name **СільпоExpress** (was СільпоShopping). Internal `surface: shopping` unchanged. `?v=ds62`. |
| 2026-08-21 | Qty ± hybrid (M1) | Accepted rows: compact − amount +; missing/dim = text only; VM-only until Погодити. `?v=ds65`. research/14a. |
| 2026-08-21 | Home Money pulse (M2) | Ring + sparkline + recent pills under rituals; B-03; no FAB/purple. Fixture/historyCache. `?v=ds65`. research/14d. |
| 2026-08-21 | Lists hub + receipt replay (M3) | Text «Списки» → Чеки/Бази stub; merge into checklist; undo toast 5s. `?v=ds66`. research/14b. |
| 2026-08-21 | Named bases (M4) | Hub tab Бази; База+ sheet; apply via merge; `localStorage` `silpo.express.bases.v1` (device-only). `?v=ds67`→`ds69`. research/14c. |

## Express control lock (M1–M4)

| Track | UI | Persist | Write MCP? |
| --- | --- | --- | --- |
| Qty ± | Hybrid: stepper only on accepted | VM until Погодити | No |
| Money pulse | Ring + sparkline + 3 pills | `historyCache` / fixture | No |
| Чеки | Списки → detail → merge + undo 5s | Session cache | No |
| Бази | Списки → Бази; База+ / apply | `localStorage` device-only | No |
| 2026-08-21 | Saved bases localStorage (M4) | Hub «Бази»; База+ з checklist/чека; apply merge; persist `silpo.express.bases.v1` (пристрій). `?v=ds67`. research/14c. |
| 2026-08-21 | Home need-wow (M6) | Money headline; pulse above secondary rituals; one CTA; insight Δ; goal edit; top SKU; channel pills; token badge → jury. `?v=ds68`. research/16. |
| 2026-08-21 | Home P2 + live history | Count-up; Express↑ Sport↓; warmer empty; jury sunk; base chip; `GET /api/history` (MCP→fixture). `?v=ds69`. |
| 2026-08-21 | Smart month goal | Авто-орієнтир max(4×week, spent×1.15); over-goal CTA; tobacco out of top SKU. `?v=ds70`. + recording checklist research/17. |
| 2026-08-21 | Pulse spark polish | Smooth curve + fill gradient; goal button ✎; month story; peak dots hover; pace dashed line; drop MCP/legend chrome. `?v=ds71`. |
| 2026-08-27 | Express Checkout OS UI | … first-group wash (`ds426`). spend split потрібне/настрій/ваше зайве + row waste mark (`ds427`). |
| 2026-08-27 | Shop spend split | Segmented bar + legend; user waste from ds410; no system guilt copy. `?v=ds427`. research/30-shop-spend-split/CASE.md |
| 2026-08-27 | Shop recent + stats | Month whisper + «Нещодавно купували» shelf; dismiss on add. `?v=ds428`. research/31-shop-recent-shelf/CASE.md |
| 2026-08-27 | Epic 5.2 stove chips | Per-meal «плита»/«готове» on plate dish headers from KB `cook` tags. `?v=ds454`. research/35 · sport-stove-epic52/CASE.md |
| 2026-08-27 | Premium wallet ds442 | Paper card, green remain, leaf mood bar, money zone. `?v=ds442`. research/43-shop-premium-ds442/CASE.md |
| 2026-08-27 | CTA + budget ds441 | Dock sum inline; tight/over bar; white control pills. `?v=ds441`. research/42-shop-cta-budget-ds441/CASE.md |
| 2026-08-27 | Fold trim ds440 | No kicker; dock CTA-only; recent pill; compact chrome. `?v=ds440`. research/41-shop-fold-trim-ds440/CASE.md |
| 2026-08-27 | Unified wallet ds439 | Pantry+controls inside card; WoW color; dock count-only. `?v=ds439`. research/40-shop-wallet-unified-ds439/CASE.md |
| 2026-08-27 | Wallet polish ds438 | Whisper→bar order; no caption; Fraunces clamp fix; solid accept; bar tooltip. `?v=ds438`. research/39-shop-wallet-polish-ds438/CASE.md |
| 2026-08-27 | Wallet header ds437 | Fraunces sum card; integrated bar; caption only when mood/waste; full month whisper; no micro-legend. `?v=ds437`. research/38-shop-wallet-header-ds437/CASE.md |
| 2026-08-27 | Demo mood slot ds436 | Default allow +alcohol → пиво in week list; настрій ₴ in header. `?v=ds436`. |
| 2026-08-27 | Legend zero slots ds435 | Always show потрібне/настрій/ваше зайве; muted — when zero. `?v=ds435`. |
| 2026-08-27 | Header fold ds434 | Compact controls/assist/legend; target groupsAboveFold≥2. `?v=ds434`. |
| 2026-08-27 | Micro-legend ds433 | Dot legend under compose bar; short whisper; list plain. `?v=ds433`. |
| 2026-08-27 | Plain checklist ds432 | Strip row beacons, chips, waste menu, row washes; header ds431 kept. `?v=ds432`. |
| 2026-08-27 | Header insight ds430 | Hero sum + compose split bar + chip legend; «залишилось» kicker. `?v=ds430`. research/33-shop-header-insight-ds430/CASE.md |
| 2026-08-27 | Header fold ds429 | Collapsible recent shelf; inline whisper; shelf outside sticky header. `?v=ds429`. research/32-shop-header-fold-ds429/CASE.md |
| 2026-08-27 | Express waste label 4.1 | User «зайве» mítka on month SKU; archive report «Зайве (ви)» only; ban system «Зайве?». `?v=ds410`. research/30. |
| 2026-08-27 | Sport handoff Epic 7 | Extract domain to `sport-handoff.js`; app.js wrappers only. `?v=ds409`. research/29. |
| 2026-08-26 | Sport partners Epic 6 | ContentSource sync + chef fixture; day chip + attribution; `partnerId`; day render partner-snap race fix. `?v=ds408`. research/28. |
| 2026-08-26 | Sport content Epic 5 | cookMode→preferKind; day walk line; sport-pick place filter. `?v=ds406`. research/27. |
| 2026-08-26 | Sport loop Epic 4 | `handoffMetrics` funnel; day/home gap «у чеклисті»; orient honesty; outcome toast. `?v=ds405`. research/26. |
| 2026-08-26 | Sport survey Epic 2 | Post-program «Смаки» sheet; LS `surveyV0`; filter mealMap queries → `source=survey_v0`; day chip re-edit. `?v=ds404`. |
| 2026-08-26 | Sport×Шафа Epic 3 | mealMapStaples shared; shopPantryNudge preferSport under handoff; lead «Шафа · програма»; fallback global. `?v=ds403`. research/25. |
| 2026-08-26 | Sport↔Express Step 1 handoff | Provenance `from:sport_day` on extras; bulk «Додати всі»; shop callout «З програми»; `enterShopFromSport` no wipe. `?v=ds402`. research/22–23. |
| 2026-08-26 | Shop pantry Floor 10 | Session metrics tipOpens/unchecks/uah; outcome toast «знято N · менше дублю · ~₴». No pulse chart. `?v=ds401`. |
| 2026-08-26 | Shop pantry Floors 6–9 | Shorter copy + days; tips «з чеків, не інвентар»; compact inline callout; hide matrix documented. Soft Floor 10 stub. `?v=ds400`. |
| 2026-08-26 | Shop pantry Floor 5 | Toast «Зняти з чеку» after Шафа focus; accept remounts nudge. Honesty: «ще може бути вдома». `?v=ds399`. |
| 2026-08-26 | Shop pantry Floors 2–4 | Header tap → toast + scroll/flash; `roles[]`; hide duplicate P3 row chip. `?v=ds398`. |
| 2026-08-26 | Shop pantry Floor 1 | Quiet leaf callout + chevron (less `--swap` promo). 10-floor UX plan `research/21-shop-pantry-ux-10floors.md`. `?v=ds397`. |
| 2026-08-26 | Shop pantry callout visible | Header nudge = elev wash chip (sku-beacon language) + lead «Шафа»; was too-quiet muted line. `?v=ds396`. |
| 2026-08-26 | Shop pantry header nudge | One muted strip under shop-controls summarizing P3/due beacons on accepted list («глянь шафу»); reuses `beaconForLine` / honesty copy. Not pulse money. `?v=ds395`. |
| 2026-08-21 | Pulse craft (M7) | Week bars + HTML pace caption; ring→% chip; quiet goal chip; WoW + pair (no MoM story); hot top-2 tap tip. `?v=ds75`. research/18. |
| 2026-08-21 | Pulse dates + craft (M8 start) | Peak tip `{day} · sku · ₴`; soft pace band; hot pulse; current-week bar. Beacons deferred to research/19–20. `?v=ds76`. |
| 2026-08-21 | Checklist beacons (I1/I2) | `beacon.js` P1 silence / P2 mute / P3 pantry_check; tip toast; compose score no P2 due boost. `?v=ds77`. research/19–20. |
| 2026-08-21 | Beacon honesty gate | Day beacons use `daysAgoDated` only; inferred 7d times suppressed. Pace caption shorter. `?v=ds78`. |
| 2026-08-21 | Pulse soft-area hybrid | Ribbon area+leaf stroke; hot dots keep dated tips; week bars retired. `?v=ds79`. research/20 A2. |
| 2026-08-21 | Jury demo rebuild | Chain + tip/beacon stills; `visual-express-control.sh` → ffmpeg `21-jury-express-demo.mp4`. |
| 2026-08-21 | Pulse full-bleed + chips | Chart geom = spark-wrap width (refit); WoW delta chip→pair tip; 84% «від орієнтира»; `Орієнтир:`; drop pace legend. `?v=ds81`. |
| 2026-08-22 | Chart axis 2px inset ds163 | Edge day ticks +2px from chart sides. `?v=ds163`. |
| 2026-08-22 | Chart week-badge flush ds162 | Edge badges/ticks flush to chart sides (no extra inset). `?v=ds162`. |
| 2026-08-22 | Chart week-badge edges ds161 | Prior-month badge + edge-start/end align (no clip); axis days inset. `?v=ds161`. |
| 2026-08-22 | Insight tip z-index ds137 | WoW tip above chart: story-pad no trap; `home-pulse--insight-open` elevates insight over spark. `?v=ds137`. |
| 2026-08-22 | Pulse polish ds136 | Tips z-index; chart = month weeks from left; drop end-badge; SKU hover→mark; goal-edit full-width popover. `?v=ds136`. |
| 2026-08-22 | Pulse month-scope tips ds135 | Hot marks + «Дорожче за темп» only current month (no July bleed from prior series weeks). `?v=ds135`. |
| 2026-08-22 | Pulse story polish ds134 | End-badge edge clamp; orient tip full-bleed under status-band. `?v=ds134`. |
| 2026-08-22 | Pulse story-split ds133 | Lock `v3-story-split`: terracotta status-band, spent|plan split, story breach, edge-to-edge chart, dashed pace, elev «Дорого». `?v=ds133`. |
| 2026-08-22 | Pulse polish ds132 | Dedupe month tops; elev «Дорого» sheet; chart axis = month weeks only; shorter series (5). `?v=ds132`. |
| 2026-08-22 | Chart marks ds131 | Graph: soft week dots + up to 3 hot marks (pace + month-top weeks) + week-axis dates + «темп» label. Hard-refresh `?v=ds131`. |
| 2026-08-22 | Month top spend ds130 | Always list up to 5 dated «Дорого цього місяця» from `topExpensive` (not one peak caption). `?v=ds130`. |
| 2026-08-22 | Picker elev + focus ds129 | Swap `.picker--cover` = sheet-panel elev (leaf border/wash); cancel `ghost--sheet`; `bindModalFocus` for save-base + picker. `?v=ds129`. |
| 2026-08-22 | Goal % uncapped ds128 | Orientir chip shows real % when over (not stuck 100%); bar still capped; WoW copy = «минулий тиждень» (goal-independent). `?v=ds128`. |
| 2026-08-22 | Peak caption stay ds127 | Keep `.home-pulse__peak-caption` visible while spark tip open (ds126 hide was wrong). `?v=ds127`. |
| 2026-08-22 | Spark tip ds126 | Graph tip = day/sku/uah grid + 2-line SKU; measured place; hide peak-caption while tip open (no twin). `?v=ds126`. |
| 2026-08-22 | Meal+beacon ds125 | Reject décor/candle false-food in `scoreProduct` (яйце-свічка); beacon chip contrast; tip SKU 2-line clamp. `?v=ds125`. |
| 2026-08-22 | Insight tip elev ds124 | WoW tip = elev sheet + hero % + compare cols + dated «дорого»; tips leave dark ink; ribbon full card width (−18 pad bleed). Beacons already cover freshness. `?v=ds124`. |
| 2026-08-22 | Day € ghost ds123 | Hide `found` status on plates (uppercase «є»→«Є» looked like €); price-only side; no status uppercase. `?v=ds123`. |
| 2026-08-22 | Save-base elev ds122 | «Зберегти як базу» bottom sheet = elev leaf panel + honesty lede + ghost cancel. `?v=ds122`. |
| 2026-08-22 | Lists detail ds121 | Receipt/base detail = lists chrome + elev lines sheet + leaf actions; jury mp4 refresh. `?v=ds121`. |
| 2026-08-22 | One green ds120 | Sport = Express leaf (no teal twin); `--sport` aliases `--leaf`. User: «чому різні кольори». `?v=ds120`. |
| 2026-08-22 | Group elev ds119 | Shop groups = per-category elev sheets; lists hub chrome+tabs+receipt cards elev. `?v=ds119`. |
| 2026-08-22 | Shop elev ds118 | Day kicker no title duplex; Express shop chrome+controls+checklist elev leaf sheets. `?v=ds118`. |
| 2026-08-22 | Day chrome ds117 | Day uses sport-chrome (no pill headerBar); elev ghost «Змінити програму»; kicker «день і полиця · …». `?v=ds117`. |
| 2026-08-22 | Catalog elev ds116 | Catalog = elev cards; sport pick chrome unify (no pill headerBar); kicker shows program. `?v=ds116`. |
| 2026-08-22 | Sport pick ds115 | Program picker elev sheet + teal tabs/CTA; catalog kicker; honesty lede (колесо = UI). `?v=ds115`. |
| 2026-08-22 | Day sheets ds114 | Darker `--sport`; day/полиця elev sheets + teal primary (continues home Sport). `?v=ds114`. |
| 2026-08-22 | Sport teal ds113 | Sport `--sport` teal (ribbon/CTA/wash ≠ Express leaf); chart width scoped+refit; dead dots CSS out. `?v=ds113`. |
| 2026-08-22 | Sport ribbon ds112 | Sport week stamps → visit soft-area ribbon + «цей тиждень · N» hairline; twin sheet keep. `?v=ds112`. |
| 2026-08-22 | Twin sheet Sport ds111 | Sport = same elev sheet as Express (wash+shadow+forest CTA «День і полиця →»). Lock flip: ghost Sport out. `?v=ds111`. |
| 2026-08-22 | Graphic lock ds110 | Taller ribbon 96 + denser fill/glow; hero leaf wash; bigger Fraunces brand; Express deeper shadow. Lock shot `LOCK-home-ds110`. `?v=ds110`. |
| 2026-08-22 | Editorial ds109 | Forest CTA mix; WoW mint pill; hot-mark glow; bigger spent; jury mp4 refresh. `?v=ds109`. |
| 2026-08-22 | Motion ds108 | Solid leaf CTA no shadow; ribbon draw+fill; peak hairline; Sport delayed rise. `?v=ds108`. |
| 2026-08-22 | Soft press ds107 | Express soft mint CTA (no leaf brick); Sport whole-card press + text affordance; jury chain → ds107. `?v=ds107`. |
| 2026-08-22 | Hierarchy ds106 | Express leaf wash+elev; Sport ghost outline (no twin fill); now-stamp pulse; peak caption wash. `?v=ds106`. |
| 2026-08-22 | Beauty ds105 | Paper peer Sport; equal week stamps; ribbon wash+glow; no track/nav chip; outline Sport CTA. Research: tone depth + one heavy graphic. `?v=ds105`. |
| 2026-08-22 | Premium ds104 | Leaf CTA + soft shadow; orientir track; Sport week pills (not bars); ds104 chip. Visible + lighter than ds103 ink brick. `?v=ds104`. |
| 2026-08-22 | Visible ds103 | Cache no-store; nav build chip; Express soft sheet + ink CTA; Sport teal grid glance. Hard to miss. `?v=ds103`. |
| 2026-08-23 | Sport shaft = live graph | Series-driven SVG shaft (activity→visits); area+dots; CSS 3D rig + pointer parallax. Not Spline. `?v=ds175`. |
| 2026-08-23 | Sport barbell WebGL | Three.js CDN scene (bar+plates+neon tube chart); photo/SVG fallback until `is-gl-ready`. `?v=ds176`. |
| 2026-08-23 | Sport stage green lock | Owner likes dark forest-green poster stage (`.home-pulse__sport-stage` charcoal→leaf wash). Do not flatten to pure black/cream. `?v=ds177`. |
| 2026-08-23 | Sport poster + live shaft | Dark poster stage; SVG shaft draw/glow (energy from ritual×ration). `?v=ds174`. |
| 2026-08-23 | Sport hero stage | Big composition jump: tinted stage, giant hero, teach pill, elevated CTA; drop gates chrome. `?v=ds173`. |
| 2026-08-23 | Sport wow+ | Whisper progress, dual-gate chips (сесія/раціон), ration label on dash, CTA sheen, hero scale. `?v=ds172`. |
| 2026-08-23 | Sport wow polish | Floor↔lift drama: dual hairlines, lift wash, metric count-up, `?demo=barbell-floor` teach beat. `?v=ds171`. |
| 2026-08-23 | Sport status-band | Sport card: month ‹ › + soft «N% від орієнтира» (8 днів ритуалу); CTA-only tap. `?v=ds170`. |
| 2026-08-23 | **Lock V1 editorial** | Owner chose board-6 V1. Hero ritual in demo; week caption `|…|`; muted labels / leaf nums. `?v=ds169`. |
| 2026-08-23 | Barbell photo lock 1+3 | Replace blob SVG hands with board-6 V1/V3 hero crops; live HTML metrics under. `?demo=barbell` for lifted QA. `?v=ds168`. |
| 2026-08-23 | Barbell V1 polish + demo | Hand paths closer to board-6 V1; `?demo=barbell` forces lifted metrics + dramatic shaft for jury. `?v=ds168`. |
| 2026-08-23 | Barbell lock 1+3 | Home craft follows board-6 V1 (metrics under plates, editorial hands, week caption) + V3 empty floor. `?v=ds167`. |
| 2026-08-22 | Sport barbell hands + live wave | Cropped SVG forearms on home barbell (A polish); session wave samples each timer tick. `?v=ds166`. |
| 2026-08-22 | Sport session player (C) | Day: KB lines → timed steps (Старт/Пауза/Далі); LS `sessionEvents`; complete → dayConfirm; home shaft prefers activity weeks. `?v=ds165`. research/19. |
| 2026-08-22 | Sport barbell home (D+B) | Replace visit ribbon with full-width barbell: plates=візити/раціон, shaft=visit series, lift-off only ritual∧ration. Floor caption when not lifted. Session timers (C) deferred. `?v=ds164`. research/19-silposport-barbell. |
| 2026-08-22 | Modern premium | Sans numbers+H1 (Fraunces brand only); soft leaf chip CTA; Sport text›; brighter leaf; no thick underlines. `?v=ds102`. |
| 2026-08-22 | Premium quiet | Cool near-white tokens; thinner type/ribbon; text CTAs (no pills); peak caption alone; Sport inline figure. `?v=ds101`. |
| 2026-08-22 | Light editorial home | Unbox twin elev; soft leaf outline CTA (not ink/solid); Sport ghost; peak caption; soft wash. Equal presence ≠ twin chrome. `?v=ds100`. |
| 2026-08-22 | Peer Sport + peak date | Sport elev peer (bars≠ribbon); ribbon `none`+pad; always-on peak chip; beacon copy soft; dual lede. Lock flips ds97 demotion. `?v=ds99`. |
| 2026-08-21 | Sport no «колесо» CTA | Wheel = UI only; strip → сьогодні/обрати програму; tab «Програма»; LS programChosen. `?v=ds98`. |
| 2026-08-21 | Sport strip | Sport = flat strip (not twin elev); mini visit bars; whole strip tappable; dead ritual CSS out. `?v=ds97`. |
| 2026-08-21 | Dual-pulse craft | Hero Life lede; Sport visit bars (≠ money ribbon); unit/program split; +18% underline not pill; fold peek. `?v=ds96`. |
| 2026-08-21 | Sport secondary elev | Quieter Sport card vs Express; sport-pulse unit tests; home chain asserts sport+ghost CTA. `?v=ds95`. |
| 2026-08-21 | Sport design pass | Mute kicker (no %-pill); program under hero; outline CTA fix; now-dot ribbon; home lede dual. `?v=ds94`. |
| 2026-08-21 | Sport pulse craft | Visit ribbon + program line + ration hits; solid elev like Express. `?v=ds93`. |
| 2026-08-21 | Sport pulse plaque | Remove Express/Sport ritual pills; home Sport card (visits/ritual/plates) + persist day confirm. `?v=ds92`. |
| 2026-08-21 | Goal under spent | Oriєнтир as muted `з X орієнтир` subline under sum; pill demoted. `?v=ds91`. |
| 2026-08-21 | Insight tip + goal button | +18% anchored tip (WoW/peaks/pace); goal chip button + breach red. `?v=ds89`. |
| 2026-08-21 | Orientir tip | Badge «N% від орієнтира» → tap/hover tip: soft goal + spent/left + MoM bars. `?v=ds87`. |
| 2026-08-21 | Ritual CSS restore + quieter % | Restore missing `.home-ritual*` / base-chip; one-line 84% chip; single hot mark. `?v=ds83`. |
| 2026-08-21 | Pulse calm craft | Less chrome: hot-only marks, soft pace band (no dash), quiet chips/goal/pills, no hairline, 2 receipts. `?v=ds82`. |
