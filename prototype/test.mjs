import { readFileSync } from "node:fs";
import { runPipeline } from "./js/pipeline.js";
import { emptyIntent } from "./js/contracts.js";
import {
  compose,
  mealCookChipUa,
  normalizeMealCook,
  pickMealMapForDay,
  sportShopQueriesFromMealMap,
  weekdayIndexFromDayISO,
} from "./js/composer.js";
import { gateViewModel } from "./js/gate.js";
import { buildBatchQueries, foodKind, pickMatchingProduct, scoreProduct, toStaple, nameMatchesQuery } from "./js/staples.js";
import { BROWSE_POPULAR_SLUG } from "./js/browse-constants.js";
import { buildBrowseTier1, filterSearchToGroup, findCategoryNode, humanizeSlug, slugsForGroup, slugsForStaple, topLevelCategoryCards, uniqueCategoryCards } from "./js/mcp/catalog.mjs";
import { classifySlot, destinationGroupForAdd, groupMeta, groupOfQuery, groupShortTitle, planCookList, slotsForGroup } from "./js/groups.js";
import { clipToBudget, resolveQueries } from "./js/resolver.js";
import { isPinnedQuery, preferFresh, slugForFreshQuery } from "./js/fresh.js";
import { browseHrefFromState, parseLocationHash, shopAddHref } from "./js/hash.js";
import { productImage, lineFromProduct, lineTotalPrice, cartQuantity, amountLabelFromLine } from "./js/mcp/normalize.js";
import { ordersToReceipts, receiptId, freqFromReceipts, topLinesForThumbStrip } from "./js/receipts.js";
import { aggregateMonthPulse, buildMonthWeekChartSeries, buildSparkPanStripFromNeighbors, buildSparkPanStripSeries, dayExpensivePeaks, dayKeyISO, historyWeekSpendMax, loadMonthGoalUah, MONTH_GOAL_KEY, monthKeyFromAt, monthKeyFromDragDx, neighborMonthKeys, pulseInsightLine, receiptPairDelta, resolveMonthGoalUah, saveMonthGoalUah, seamDedupePeekSeries, sparkLandWeekStarts, sparkSharedYMax, suggestMonthGoalUah, weekExpensivePeaks, weekOverWeekDelta } from "./js/spend.js";
import { applyQtyDelta, applyQtyOverrides, effectiveUnits, repriceLine } from "./js/qty.js";
import { mergeReceiptIntoShopVm, isBagLine } from "./js/merge.js";
import { expressMembershipForMeal } from "./js/express-membership.js";
import {
  countSportDayExtras,
  lineMatchesStapleAllowlist,
  mealMapStaples,
  mealsAddableToExpress,
  sportHandoffCalloutCopy,
  withSportDayProvenance,
} from "./js/sport-ration-plan.js";
import {
  bumpHandoffMetric,
  emptyHandoffMetrics,
  handoffOutcomeCopy,
  loopGapModel,
} from "./js/sport-loop-metrics.js";
import {
  buildSportRationPlan,
  cookModeLabel,
  cookModeFromPlateMode,
  filterQueriesBySurvey,
  kindFromCookMode,
  mealMapStaplesWithSurvey,
  normalizeSurvey,
  plateModeFromCookMode,
  surveyDropStaples,
  surveyTasteFilterCount,
  surveyTasteLine,
} from "./js/sport-survey.js";

const kb = JSON.parse(readFileSync(new URL("./content/kb.json", import.meta.url)));
const shelf = JSON.parse(readFileSync(new URL("./content/shelf.json", import.meta.url)));

const sport = emptyIntent("sport");
sport.constraints.programId = "military";
const s = runPipeline(sport, kb, shelf, {});
if (s.vm.lines.length < 5) throw new Error(`sport dish ingredients expected >=5 got ${s.vm.lines.length}`);
if (!s.vm.lines.some((l) => /яєчня/i.test(l.groupTitle || ""))) throw new Error("strength breakfast dish title missing");
if (s.vm.checkout) throw new Error("checkout before confirm");
const s2 = runPipeline(sport, kb, shelf, { confirmed: true });
if (!s2.vm.checkout) throw new Error("checkout after confirm missing");

const shop = emptyIntent("shopping");
shop.constraints.categoriesAllow = ["food", "clean"];
shop.constraints.budgetUah = 400;
const b = runPipeline(shop, kb, shelf, { variantId: "B" });

const leaked = gateViewModel(
  { title: "x", type: "cart_variants", blocks: ["у вас дефіцит білка"], shopQueries: [], disclaimer: "" },
  { lines: [], branchLabel: "", totals: { min: 0, max: 0 }, checkout: null },
  { categoriesAllow: ["food"] },
);
if (leaked.blocks.length) throw new Error("medical block not gated");

const swapped = runPipeline(sport, kb, shelf, { swaps: { "breakfast:яйця": "гречка" } });
if (!swapped.vm.lines.some((l) => String(l.role).startsWith("breakfast") && /греч/i.test(l.name || l.wanted || ""))) {
  throw new Error("swap breakfast failed");
}

if (toStaple("Молоко Галичина 2,5%") !== "молоко") throw new Error("staple milk");
if (toStaple("Пакет Сільпо Радісного Всього 18 кг") != null) throw new Error("bag not staple");
if (pickMatchingProduct([{ name: "Вершки 10%" }, { name: "Яйця С1 10 шт" }], "яйця")?.name !== "Яйця С1 10 шт") {
  throw new Error("pickBest must not take cream for eggs");
}
{
  const soft = pickMatchingProduct(
    [{ name: "Яйця курячі С1", available: false, price: 50 }],
    "яйця",
    { staple: "яйця", freq: {}, allowCatalogFallback: true },
  );
  if (!soft) throw new Error("catalog fallback must accept soft-unavailable eggs");
  const hard = pickMatchingProduct(
    [{ name: "Яйця курячі С1", available: false, price: 50 }],
    "яйця",
    { staple: "яйця", freq: {} },
  );
  if (hard) throw new Error("without catalog fallback unavailable eggs must lose");
  const yogurt = pickMatchingProduct(
    [
      { name: "Йогурт Агуня вишня для дітей від 8 місяців 2,7%", available: true, price: 30 },
      { name: "Йогурт питний натуральний 1.5%", available: true, price: 40 },
    ],
    "йогурт",
    { staple: "йогурт", freq: {}, allowCatalogFallback: true },
  );
  if (!yogurt || !/питний|натуральн/i.test(yogurt.name)) throw new Error(`yogurt prefer plain got ${yogurt?.name}`);
  const fruitVsPlain = pickMatchingProduct(
    [
      { name: "Йогурт Danone персик-маракуйя 1,2% стакан", available: true, price: 35 },
      { name: "Йогурт питний натуральний 1.5%", available: true, price: 40 },
    ],
    "йогурт",
    { staple: "йогурт", freq: {}, allowCatalogFallback: true },
  );
  if (!fruitVsPlain || !/питний|натуральн/i.test(fruitVsPlain.name)) {
    throw new Error(`yogurt fruit demote failed got ${fruitVsPlain?.name}`);
  }
}
if (pickMatchingProduct([{ name: "Батон Київхліб" }, { name: "Чипси" }], "хліб")?.name !== "Батон Київхліб") {
  throw new Error("хліб must match батон");
}

const chickenPool = [
  { name: "Курка Garde Manger Mexican", available: true },
  { name: "Філе куряче охолоджене", available: true },
];
const chickenHist = { "Філе куряче охолоджене": 4, "Курка гриль": 1 };
const chickenPick = pickMatchingProduct(chickenPool, "курка", { freq: chickenHist, staple: "курка" });
if (!chickenPick || !/філе/i.test(chickenPick.name) || /сосиск/i.test(chickenPick.name)) {
  throw new Error("history must prefer raw chicken over Mexican");
}
const sausageChicken = pickMatchingProduct(
  [{ name: "Сосиски Міні з курячим філе" }, { name: "Філе куряче охолоджене" }],
  "курка",
  { freq: chickenHist, staple: "курка" },
);
if (!sausageChicken || /сосиск/i.test(sausageChicken.name)) throw new Error("курка must not pick sausages");
if (pickMatchingProduct([{ name: "Корм для котів курка" }, { name: "Філе куряче охолоджене" }], "курка", { freq: chickenHist, staple: "курка" })?.name !== "Філе куряче охолоджене") {
  throw new Error("курка must not pick cat food");
}

if (toStaple("Батончик Том кеш'ю з протеїном") != null) throw new Error("protein bar must not be хліб");
if (
  pickMatchingProduct(
    [{ name: "Батончик Lifebar протеїновий" }, { name: "Батон Цар-Хліб Звичайний нарізаний" }],
    "хліб",
  )?.name !== "Батон Цар-Хліб Звичайний нарізаний"
) {
  throw new Error("хліб must not pick батончик");
}
if (toStaple("Плов із куркою Сімейна упаковка") != null) throw new Error("plov must not be курка staple");

const breadPick = pickMatchingProduct(
  [{ name: "Ковбаса Салямі Баварська до хліба" }, { name: "Батон Київхліб" }],
  "хліб",
);
if (!breadPick || !/батон/i.test(breadPick.name)) throw new Error("хліб must not pick sausage");

const onlyMex = pickMatchingProduct(
  [{ name: "Курка Garde Manger Mexican", available: true }],
  "курка",
  { freq: chickenHist, staple: "курка" },
);
if (onlyMex) throw new Error("raw history must not fall back to culinary Mexican");

const slugHit = slugsForStaple(
  { tree: [{ slug: "baton-5140", children: [{ slug: "kuriatyna-4426" }] }] },
  "хліб",
);
if (!slugHit.includes("baton-5140")) throw new Error("slugsForStaple bread");
const potatoSlugs = slugsForStaple({}, "картопля");
if (!potatoSlugs.includes("kartoplia-i-batat-4817")) throw new Error("slugsForStaple potato fallback");
const mayoSlugs = slugsForStaple({}, "майонез");
if (!mayoSlugs.includes("maionez-4951")) throw new Error("slugsForStaple mayo fallback");
const yogurtSlugs = slugsForStaple({}, "йогурт");
if (!yogurtSlugs.includes("yogurty-245")) throw new Error("slugsForStaple yogurt fallback");
const oatSlugs = slugsForStaple({}, "вівсянка");
if (!oatSlugs.includes("vivsiana-krupa-4877")) throw new Error("slugsForStaple oats fallback");
const riceSlugs = slugsForStaple({}, "рис");
if (!riceSlugs.includes("rys-4873")) throw new Error("slugsForStaple rice fallback");
if (!nameMatchesQuery("Рис круглий шліфований", "рис")) throw new Error("Cyrillic рис must match");
if (nameMatchesQuery("Ікра Norven атлантичних риб", "риба")) throw new Error("ікра must not match риба staple");
if (!nameMatchesQuery("Філе хека свіже", "риба")) throw new Error("хек must match риба");
{
  const fish = pickMatchingProduct(
    [
      { name: "Ікра Norven атлантичних риб з копченим лососем в соусі", available: true, price: 80 },
      { name: "Філе хека свіже", available: true, price: 120 },
    ],
    "риба",
    { staple: "риба", freq: {}, allowCatalogFallback: true },
  );
  if (!fish || !/хек/i.test(fish.name)) throw new Error(`fish prefer fillet got ${fish?.name}`);
}
{
  const sport = emptyIntent("sport");
  sport.constraints.programId = "asian-walk";
  const c = compose(sport, kb);
  const qs = c.shopQueries.map((q) => q.q);
  if (qs.join("|") !== "вівсянка|молоко|рис|овочі|риба|салат") throw new Error(`cardio meals ${qs}`);
  if (!c.shopQueries.every((q) => q.groupTitle)) throw new Error("dish titles required");
  sport.constraints.programId = "stretch";
  const m = compose(sport, kb).shopQueries.map((q) => q.q);
  if (m.join("|") !== "йогурт|салат|зелень|овочі|цибуля") throw new Error(`mobility meals ${m}`);
  sport.constraints.programId = "military";
  const st = compose(sport, kb);
  if (st.shopQueries.map((q) => q.q).join("|") !== "яйця|масло|курка|гречка|овочі|йогурт") {
    throw new Error(`strength meals ${st.shopQueries.map((q) => q.q)}`);
  }
  if (st.shopQueries.find((q) => q.group === "breakfast")?.groupTitle !== "Яєчня") {
    throw new Error("Яєчня title missing");
  }
}
const yogurtTree = slugsForStaple(
  {
    tree: [
      { slug: "yogurty-deserty-235" },
      { slug: "yogurty-245" },
      { slug: "yogurty-dytiachi-999" },
    ],
  },
  "йогурт",
);
if (yogurtTree[0] !== "yogurty-245") throw new Error("йогурт must prefer plain yogurty leaf");
if (yogurtTree.some((s) => /deserty|dytiach/i.test(s))) throw new Error("йогурт must drop dessert/kids leaves");
const beerSlugs = slugsForStaple(
  {
    tree: [
      {
        slug: "pyvo-4503",
        children: [{ slug: "kraftove-pyvo-4506" }, { slug: "ukrainske-pyvo-4504" }, { slug: "bezalkogolne-pyvo-4484" }],
      },
    ],
  },
  "пиво",
  null,
  { "Пиво Stella Artois з/б": 9 },
);
if (beerSlugs[0] !== "ukrainske-pyvo-4504") throw new Error("пиво category must prefer ukrainske over craft parent");
if (beerSlugs.includes("kraftove-pyvo-4506") || beerSlugs.includes("pyvo-4503")) {
  throw new Error("пиво must not rank kraft/parent category first");
}
if (
  pickMatchingProduct(
    [
      { name: "Батон Цар-Хліб Гірчичний столичний нарізаний" },
      { name: "Батон «Кулиничі» звичайний нарізний половинка в/г" },
      { name: "Батон Цар-Хліб Звичайний половинка нарізаний" },
    ],
    "хліб",
    { freq: { "Батон Цар-Хліб Звичайний половинка нарізаний": 4, "Батон Цар-Хліб Звичайний нарізаний": 2 }, staple: "хліб" },
  )?.name !== "Батон Цар-Хліб Звичайний половинка нарізаний"
) {
  throw new Error("хліб must prefer звичайний from receipts over гірчичний popularity");
}
if (
  pickMatchingProduct(
    [
      { name: "Батон Цар-Хліб Гірчичний столичний нарізаний" },
      { name: "Батон «Кулиничі» звичайний нарізний половинка в/г" },
    ],
    "хліб",
    { freq: { "Батон Цар-Хліб Звичайний половинка нарізаний": 4, "Хліб Кулиничі Домашній": 1 }, staple: "хліб" },
  )?.name !== "Батон Цар-Хліб Гірчичний столичний нарізаний"
) {
  throw new Error("when usual czar SKU missing, keep czar brand not another звичайний");
}
if (
  pickMatchingProduct(
    [
      { name: "Томати Верес мариновані с/б" },
      { name: "Огірки Верес мариновані слабокислі стерилізовані" },
    ],
    "консервація",
    { staple: "консервація", kind: "preserved", hint: "огірки мариновані", allowCatalogFallback: true },
  )?.name !== "Огірки Верес мариновані слабокислі стерилізовані"
) {
  throw new Error("консервація hint must prefer pickled cucumbers over tomatoes");
}
const liveHist = {
  history: [
    {
      lines: [
        "Молоко Галичина",
        "Хліб пшеничний",
        "Яйця С1",
        "Філе куряче",
        "Гель для душу 400 мл",
        "Пакет Сільпо 18 кг",
        "Чипси Lay's",
      ],
    },
  ],
};
const composed = compose(shop, { ...kb, ...liveHist });
const aQueries = (composed.variants.find((v) => v.id === "A")?.queries || []).map((q) => q.q);
if (!aQueries.includes("молоко") || !aQueries.includes("хліб")) throw new Error("A missing staples");
if (aQueries.some((q) => /пакет/i.test(q))) throw new Error("A contains bag");

const shopAlc = emptyIntent("shopping");
shopAlc.constraints.categoriesAllow = ["food", "clean", "alcohol"];
const aWithBeer = (
  compose(shopAlc, {
    ...kb,
    history: [{ lines: ["Молоко Галичина", "Хліб пшеничний", "Пиво Оболонь світле"] }],
  }).variants.find((v) => v.id === "A")?.queries || []
).map((q) => q.q);
if (!aWithBeer.includes("пиво")) throw new Error("A must include пиво when alcohol allowed");
const aBeerDefault = (
  compose(shopAlc, { ...kb, history: [{ lines: ["Молоко Галичина", "Хліб пшеничний"] }] }).variants.find((v) => v.id === "A")
    ?.queries || []
).map((q) => q.q);
if (!aBeerDefault.includes("пиво")) throw new Error("A must still offer пиво when alcohol on and no beer in receipts");
const cWithBeer = (
  compose(shopAlc, { ...kb, history: [{ lines: ["Молоко Галичина", "Хліб пшеничний"] }] }).variants.find((v) => v.id === "C")
    ?.queries || []
).map((q) => q.q);
if (!cWithBeer.includes("пиво")) throw new Error("C must include пиво when alcohol allowed");
const aNoBeer = (
  compose(shop, { ...kb, history: [{ lines: ["Молоко Галичина", "Пиво Оболонь"] }] }).variants.find((v) => v.id === "A")
    ?.queries || []
).map((q) => q.q);
if (aNoBeer.includes("пиво")) throw new Error("A must not include пиво when alcohol envelope off");

if (classifySlot("Лаваш тонкий")?.id !== "brd:lavash") throw new Error("lavash slot");
if (classifySlot("Хек гарячого копчення")?.id !== "pro:fish") throw new Error("fish slot");
if (!slotsForGroup("breads").some((s) => s.q === "лаваш")) throw new Error("bread facets need lavash");
if (groupOfQuery("хліб") !== "breads") throw new Error("хліб group");
if (groupShortTitle("breads") !== "Хліб") throw new Error("short title Хліб");
if (classifySlot("Соус Щедро Український")?.id !== "ext:sauce") throw new Error("sauce slot");
if (destinationGroupForAdd("Соус Щедро Український") !== "extra") throw new Error("sauce add → extra");
if (destinationGroupForAdd("Філе куряче Епікур") !== "protein") throw new Error("chicken add → protein");
if (destinationGroupForAdd("щось незрозуміле xyz") !== "extra") throw new Error("unknown add → extra");
if (classifySlot("Пряник Лавка традицій Зайчик з морквою імбир-мед")) {
  throw new Error("gingerbread must not be a veg slot");
}
if (destinationGroupForAdd("Пряник Лавка традицій Зайчик з морквою імбир-мед") !== "extra") {
  throw new Error("gingerbread add → extra");
}
if (destinationGroupForAdd("Цукати Лавка традицій Київське сухе варення з моркви") !== "extra") {
  throw new Error("candied carrot must not shelf as veg");
}
if (classifySlot("Томати Премія коктейльні мариновані пастеризовані")?.id !== "can:tom") {
  throw new Error("pickled tomato → preserve slot");
}
if (classifySlot("Помідор черрі")?.id !== "veg:tom") throw new Error("fresh tomato stays veg");
if (destinationGroupForAdd("Томати мариновані") !== "extra") throw new Error("one pickle type → extra");
if (destinationGroupForAdd("Томати мариновані", ["Огірки мариновані"]) !== "preserve") {
  throw new Error("two pickle types → консервація");
}
const onePickle = planCookList(
  [{ lines: ["Томати Премія коктейльні мариновані пастеризовані"] }],
  { allow: new Set(["food"]), variant: "B" },
);
const pickleLine = onePickle.find((q) => q.role === "can:tom");
if (!pickleLine || pickleLine.group !== "extra") throw new Error("single preserve type stays in extra");
if (onePickle.some((q) => q.role === "veg:tom")) throw new Error("pickled tomato must not fill veg tomato");
const twoPickle = planCookList(
  [{ lines: ["Томати мариновані", "Огірки мариновані"] }],
  { allow: new Set(["food"]), variant: "B" },
);
if (!twoPickle.some((q) => q.role === "can:tom" && q.group === "preserve")) throw new Error("two preserves need conserv group");
if (!twoPickle.some((q) => q.role === "can:cuc" && q.group === "preserve")) throw new Error("pickled cucumber in conserv");
if (
  pickMatchingProduct(
    [
      { name: "Пряник Зайчик з морквою імбир-мед", price: 102 },
      { name: "Морква мита", price: 18 },
    ],
    "морква",
    { staple: "морква", freq: { "Пряник Зайчик з морквою імбир-мед": 9 } },
  )?.name === "Пряник Зайчик з морквою імбир-мед"
) {
  throw new Error("carrot slot must not pick gingerbread");
}
if (
  pickMatchingProduct(
    [
      { name: "Томати Премія мариновані пастеризовані", price: 45 },
      { name: "Помідор черрі", price: 49 },
    ],
    "помідор",
    { staple: "помідор", freq: { "Томати Премія мариновані пастеризовані": 16 } },
  )?.name === "Томати Премія мариновані пастеризовані"
) {
  throw new Error("fresh tomato slot must not pick jar");
}
const twoBreads = planCookList(
  [
    {
      orders: [
        { at: "2026-08-01", lines: [{ name: "Батон Цар-Хліб" }, { name: "Лаваш тонкий" }] },
        { at: "2026-08-08", lines: [{ name: "Батон Цар-Хліб" }, { name: "Лаваш тонкий" }] },
      ],
    },
  ],
  { allow: new Set(["food"]), variant: "B" },
);
if (!twoBreads.some((q) => q.role === "brd:loaf") || !twoBreads.some((q) => q.role === "brd:lavash")) {
  throw new Error("checklist must offer loaf and lavash when they co-occur");
}
const proteinMix = planCookList(
  [{ lines: ["Філе куряче Епікур", "Хек гарячого копчення", "Хумус"] }],
  { allow: new Set(["food"]), variant: "B" },
);
if (!proteinMix.some((q) => q.staple === "курка") || !proteinMix.some((q) => q.staple === "риба")) {
  throw new Error("protein group must list chicken and fish from history");
}
const oilDue = planCookList([{ lines: ["Огірок"] }], { allow: new Set(["food"]), variant: "B" });
if (!oilDue.some((q) => q.staple === "олія")) throw new Error("B must offer oil when none in 90d window");
if (!oilDue.some((q) => q.staple === "майонез")) throw new Error("B must offer mayo with salad veg");
const oilRecent = planCookList(
  [{ orders: [{ at: new Date().toISOString(), lines: [{ name: "Олія соняшникова" }] }] }],
  { allow: new Set(["food"]), variant: "B" },
);
if (oilRecent.some((q) => q.staple === "олія")) throw new Error("B must not nag oil bought today");
if (
  pickMatchingProduct(
    [
      { name: "Помідор черрі", price: 49 },
      { name: "Помідор органічний преміум", price: 220 },
    ],
    "помідор",
    { staple: "помідор", priceMin: 30, priceMax: 80 },
  )?.name !== "Помідор черрі"
) {
  throw new Error("price band must drop expensive tomato");
}

const beerPool = [
  { name: "Пиво Brasserie de Blaugies SaisonD'epeautre світле нефільтроване", available: true, price: 999 },
  { name: "Пиво Оболонь світле 0.5л", available: true, price: 32 },
  { name: "Пиво Львівське 1715", available: true, price: 28 },
];
const beerHist = { "Пиво Оболонь світле": 5, "Пиво Львівське 1715": 1 };
if (pickMatchingProduct(beerPool, "пиво", { freq: beerHist, staple: "пиво" })?.name !== "Пиво Оболонь світле 0.5л") {
  throw new Error("пиво must pick most frequent receipt brand, not 999₴ craft");
}
if (
  pickMatchingProduct(
    [
      { name: "Пиво Brasserie de Blaugies SaisonD'epeautre світле нефільтроване", available: true },
      { name: "Пиво Львівське 1715", available: true },
    ],
    "пиво",
    { freq: beerHist, staple: "пиво" },
  )?.name !== "Пиво Львівське 1715"
) {
  throw new Error("пиво must fall back to less frequent own SKU when top is missing");
}
if (
  pickMatchingProduct(
    [{ name: "Пиво Brasserie de Blaugies SaisonD'epeautre світле нефільтроване", available: true }],
    "пиво",
    { freq: beerHist, staple: "пиво" },
  )
) {
  throw new Error("пиво must not pick catalog craft while receipts exist");
}
if (
  pickMatchingProduct(
    [
      { name: "Шоколад чорний Chocolat Stella з перцем чилі органічний", available: true, price: 269 },
      { name: "Пиво Stella Artois з/б", available: true, price: 42 },
    ],
    "пиво",
    { freq: { "Пиво Stella Artois з/б, мультипак": 19 }, staple: "пиво" },
  )?.name !== "Пиво Stella Artois з/б"
) {
  throw new Error("пиво must not pick chocolate that shares a beer brand token");
}
const beerPopular = pickMatchingProduct(beerPool, "пиво", { freq: {}, staple: "пиво" });
if (!beerPopular || !/пив/i.test(beerPopular.name)) throw new Error("пиво without history may use catalog");

const lateBeer = buildBatchQueries(
  ["молоко", "хліб", "яйця", "курка", "овочі", "йогурт", "рис", "пиво"].map((q) => ({ q, staple: q, role: q })),
  { "Пиво Оболонь світле": 3, "Молоко Галичина": 2 },
  30,
);
if (!lateBeer.products.some((k) => /оболонь|пиво/i.test(k))) {
  throw new Error("batch must still search beer when пиво is last query");
}
if (lateBeer.products.length > 30) throw new Error("batch exceeds MCP maxItems 30");

if (humanizeSlug("ovochi-4808") !== "ovochi") throw new Error("humanize slug");
const fruitTree = {
  tree: [
    { slug: "frukty-ovochi-4788", children: [{ slug: "frukty-4791", children: [{ slug: "banany-4792" }] }, { slug: "ovochi-4808" }] },
    { slug: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
  ],
};
if (topLevelCategoryCards(fruitTree).some((c) => c.slug.startsWith("aaa"))) throw new Error("opaque slugs stay out of tops");
if (findCategoryNode(fruitTree, "frukty-381")?.slug !== "frukty-4791") throw new Error("popular fruit slug maps to tree fruit node");
if (findCategoryNode(fruitTree, "ovochi-4808")?.slug !== "ovochi-4808") throw new Error("exact category node");
if (uniqueCategoryCards([{ slug: "frukty-381", title: "Фрукти" }, { slug: "frukty-4791", title: "frukty", hasChildren: true }])[0].slug !== "frukty-4791") {
  throw new Error("stem-dedupe prefers tree node with children");
}

const mayoFresh = planCookList(
  [{ orders: [{ lines: [{ name: "Огірок" }, { name: "Майонез" }] }] }],
  { allow: new Set(["food"]), variant: "B" },
);
if (mayoFresh.some((q) => q.staple === "майонез")) throw new Error("undated recent mayo must not cadence-nag");
const potHint = planCookList(
  [{ orders: [{ at: "2026-08-01", lines: [{ name: "Картопля мита 5 кг" }] }] }],
  { allow: new Set(["food"]), variant: "B" },
);
if (!potHint.find((q) => q.role === "veg:pot")?.why.includes("не на одну")) {
  throw new Error("5kg potato must hint household size");
}
const potQty = planCookList(
  [{ orders: [{ at: "2026-08-01", lines: [{ name: "Картопля біла", qty: 5 }] }] }],
  { allow: new Set(["food"]), variant: "B" },
);
if (!potQty.find((q) => q.role === "veg:pot")?.why.includes("не на одну")) {
  throw new Error("qty 5 potato must hint household size");
}
const clipped = clipToBudget(
  [
    { role: "brd:loaf", status: "found", price: 380 },
    { role: "add:99", status: "found", price: 50 },
  ],
  400,
);
if (!clipped.some((l) => l.role === "add:99")) throw new Error("explicit add must survive budget clip");
if (slugForFreshQuery("банани") !== "banany-4792") throw new Error("fresh slug must match plural банани");
if (
  preferFresh(
    [{ name: "Напій молочний банан" }, { name: "Банан" }],
    "банан",
  )[0].name !== "Банан"
) {
  throw new Error("preferFresh must rank produce first");
}
const withAdd = buildBatchQueries(
  [
    { q: "хліб", role: "brd:loaf", staple: "хліб" },
    { q: "Банан", role: "add:deadbeef", staple: "Банан", productId: "1" },
  ],
  {},
  30,
);
if (withAdd.products.some((k) => /банан/i.test(k))) throw new Error("batch must skip pinned add queries");
if (!isPinnedQuery({ role: "add:1", productId: "x" })) throw new Error("pinned detect");

const browseTree = {
  tree: [
    { slug: "baton-5140" },
    { slug: "khlib-5139" },
    { slug: "lavash-tortylia-5145" },
    { slug: "khlibtsi-5166" },
    { slug: "sushka-khlibtsi-prianyky-5137" },
    { slug: "tykhi-vyna-4459" },
    { slug: "ovochi-4808" },
    { slug: "frukty-381" },
  ],
};
const breadSlugs = slugsForGroup(browseTree, "breads");
if (!breadSlugs.includes("lavash-tortylia-5145") || !breadSlugs.includes("khlibtsi-5166")) {
  throw new Error("breads group must union lavash and khlibtsi slugs");
}
if (breadSlugs.some((s) => /vyna|frukty|prianyk/i.test(s))) {
  throw new Error("breads group must not pull wine, fruit, or gingerbread parent");
}
if (!slugsForGroup(browseTree, "veg").includes("ovochi-4808")) {
  throw new Error("veg group must use ovochi root when potato has no slug");
}
const alcoholTree = {
  tree: [
    { slug: "pyvo-4463", children: [{ slug: "bezalkogolne-pyvo-4464" }, { slug: "ukrainske-pyvo-4465" }] },
    { slug: "tykhi-vyna-4459" },
    { slug: "alkohol-123" },
  ],
};
const alcTier1 = buildBrowseTier1(alcoholTree, "alcohol", {});
if (alcTier1[0]?.slug !== BROWSE_POPULAR_SLUG || alcTier1[0]?.title !== "Популярне") {
  throw new Error("browse tier1 must start with Популярне");
}
if (!alcTier1.some((c) => c.title === "пиво" && c.slug === "pyvo-4463")) {
  throw new Error("alcohol tier1 must include пиво anchor slug");
}
if (!alcTier1.some((c) => c.title === "вино")) {
  throw new Error("alcohol tier1 must include вино slot");
}
const proteinTree = {
  tree: [
    { slug: "kuriatyna-4426" },
    { slug: "svynyna-4413" },
    { slug: "yalovychyna-ta-teliatyna-4414" },
    { slug: "ryba-4430" },
    { slug: "preservy-rybni-4444" },
    { slug: "moreprodukty-ta-moliusky-4435" },
    { slug: "kuriachi-iaitsia-4977" },
    { slug: "shokoladni-iaitsia-526" },
    { slug: "tykhi-vyna-4459" },
    { slug: "moloko-253" },
  ],
};
const proteinSlugs = slugsForGroup(proteinTree, "protein");
if (!proteinSlugs.includes("svynyna-4413") || !proteinSlugs.includes("ryba-4430") || !proteinSlugs.includes("kuriachi-iaitsia-4977")) {
  throw new Error("protein group must map pork, fish, eggs");
}
if (proteinSlugs.some((s) => /vyna|shokoladn|moloko|preservy/i.test(s))) {
  throw new Error("protein must not pull wine, chocolate eggs, milk, canned fish");
}
if (slugsForGroup(proteinTree, "extra").length) {
  throw new Error("extra stays search-only");
}
if (destinationGroupForAdd("Соус Щедро", ["Батон"]) !== "extra") {
  throw new Error("sauce added during bread session still shelves extra");
}

const batonHits = [
  { title: "Батон Київхліб" },
  { title: "Вино ігристе Gran Baron Cava Rose" },
  { title: "Батончик Том кеш'ю з протеїном" },
  { title: "Пиво Оболонь світле" },
];
const breadHits = filterSearchToGroup(batonHits, "breads");
if (breadHits.length !== 1 || breadHits[0].title !== "Батон Київхліб") {
  throw new Error("branch search breads must drop cava, protein bar, beer");
}
if (filterSearchToGroup(batonHits, "alcohol").some((p) => /Батон Київ/.test(p.title))) {
  throw new Error("branch search alcohol must not keep loaf");
}
if (!filterSearchToGroup([{ title: "Вино ігристе Gran Baron Cava Rose" }], "extra").length) {
  throw new Error("unknown names stay in extra");
}

const hPick = parseLocationHash("#/shop/add");
if (!hPick.add?.pick || hPick.screen !== "shop") throw new Error("hash pick");
const hGroup = parseLocationHash("#/shop/add/breads");
if (hGroup.add?.pick || hGroup.add?.group !== "breads" || hGroup.add?.slug) throw new Error("hash group");
const hSlug = parseLocationHash("#/shop/add/breads/baton");
if (hSlug.add?.group !== "breads" || hSlug.add?.slug !== "baton") throw new Error("hash slug");
  if (parseLocationHash("#/shop/add/nope").add?.pick !== true) throw new Error("unknown group → pick");
  if (parseLocationHash("#/survey").screen !== "survey") throw new Error("survey hash");
  const hDay = parseLocationHash("#/day/2026-08-25");
  if (hDay.screen !== "day" || hDay.dayISO !== "2026-08-25") throw new Error("day hash iso");
  if (parseLocationHash("#/day").dayISO !== null) throw new Error("day hash bare");
if (shopAddHref({ pick: true }) !== "#/shop/add") throw new Error("href pick");
if (shopAddHref({ group: "breads" }) !== "#/shop/add/breads") throw new Error("href group");
if (shopAddHref({ group: "breads", slug: "a/b" }) !== "#/shop/add/breads/a%2Fb") throw new Error("href encode");
if (browseHrefFromState({ pickGroup: true }) !== "#/shop/add") throw new Error("browse pick href");
if (browseHrefFromState({ group: "veg", slug: "ogirok", search: "x" }) !== "#/shop/add/veg") {
  throw new Error("search must not enter hash");
}
if (browseHrefFromState({ group: "veg", slug: "ogirok" }) !== "#/shop/add/veg/ogirok") {
  throw new Error("browse slug href");
}
{
  const lists = parseLocationHash("#/shop/lists");
  if (lists.lists?.tab !== "receipts" || lists.lists.receiptId) throw new Error("lists hash");
  const bases = parseLocationHash("#/shop/lists/bases");
  if (bases.lists?.tab !== "bases") throw new Error("lists bases hash");
  const rec = parseLocationHash("#/shop/receipts/rabc");
  if (rec.lists?.receiptId !== "rabc") throw new Error("receipt hash");
}
if (productImage({ image: "https://images.silpo.ua/x.png" }) !== "https://images.silpo.ua/x.png") {
  throw new Error("productImage direct");
}
if (productImage({ images: [{ url: "https://images.silpo.ua/y.png" }] }) !== "https://images.silpo.ua/y.png") {
  throw new Error("productImage media[]");
}
if (productImage({}) !== "") throw new Error("productImage empty");

{
  const titles = compose(shop, kb).variants.map((v) => v.title).join("|");
  if (titles !== "Поповнити|Як завжди|На всі гроші") {
    throw new Error(`variant titles guest-facing: ${titles}`);
  }
}

{
  const hist = shelf.history;
  const allow = new Set(["food", "clean"]);
  const dayA = planCookList(hist, { allow, variant: "A", horizon: "day" });
  const weekB = planCookList(hist, { allow, variant: "B", horizon: "week" });
  const monthC = planCookList(hist, { allow, variant: "C", horizon: "month" });
  if (!(dayA.length <= weekB.length && weekB.length <= monthC.length)) {
    throw new Error(`horizon/variant size: dayA=${dayA.length} weekB=${weekB.length} monthC=${monthC.length}`);
  }
  const sumU = (qs) => qs.reduce((s, q) => s + (Number(q.units) || 1), 0);
  if (!(sumU(dayA) <= sumU(weekB) && sumU(weekB) <= sumU(monthC))) {
    throw new Error(`units should grow Поповнити→На всі гроші / день→місяць: ${sumU(dayA)}/${sumU(weekB)}/${sumU(monthC)}`);
  }
  const foodOnly = planCookList(hist, { allow: new Set(["food"]), variant: "B", horizon: "week" });
  const withAlc = planCookList(hist, { allow: new Set(["food", "alcohol"]), variant: "B", horizon: "week" });
  if (!withAlc.some((q) => q.envelope === "alcohol")) throw new Error("alcohol envelope must surface пиво");
  if (foodOnly.some((q) => q.envelope === "alcohol")) throw new Error("food-only must not force alcohol");
  const foodFirst = withAlc[0]?.envelope;
  if (foodFirst === "alcohol" || foodFirst === "tobacco") {
    throw new Error("priority: food/clean should beat alc/tob at top");
  }
}

{
  const chicken = {
    name: "Філе куряче «Епікур» охолоджене, малий лоток",
    price: 303.45,
    weighted: true,
    step: 0.6,
    available: true,
  };
  const fish = {
    name: "Смажена шматочками риба",
    price: 539,
    weighted: true,
    step: 0.1,
    available: true,
  };
  const hummus = {
    name: "Хумус-снек Лавка Традицій Frango з курагою",
    price: 87.49,
    available: true,
  };
  const cLine = lineFromProduct(chicken, { q: "курка", role: "pro:chk", units: 1 });
  if (cLine.price !== 182.07) throw new Error(`weighted chicken line: want 182.07 got ${cLine.price}`);
  if (cLine.amount !== "600 г") throw new Error(`chicken amount: ${cLine.amount}`);
  if (cLine.quantity !== 0.6) throw new Error(`chicken qty: ${cLine.quantity}`);
  const fLine = lineFromProduct(fish, { q: "риба", role: "pro:fish", units: 1 });
  if (fLine.price !== 53.9) throw new Error(`weighted fish line: want 53.9 got ${fLine.price}`);
  if (fLine.amount !== "100 г") throw new Error(`fish amount: ${fLine.amount}`);
  const hLine = lineFromProduct(hummus, { q: "хумус", role: "pro:plant", units: 1 });
  if (hLine.price !== 87.49) throw new Error(`piece hummus must stay unit price: ${hLine.price}`);
  if (cartQuantity(chicken, 2) !== 1.2) throw new Error("2×600г → 1.2 kg cart qty");
  if (lineTotalPrice(303.45, chicken, 2) !== 364.14) throw new Error("2 trays chicken total");
  const twoChicken = lineFromProduct(chicken, { q: "курка", role: "pro:chk", units: 2 });
  if (twoChicken.amount !== "1,2 кг") throw new Error(`2 trays must show weight not шт: ${twoChicken.amount}`);
  if (twoChicken.price !== 364.14) throw new Error(`2 trays price: ${twoChicken.price}`);
  // MCP often sends step without weighted:true — still weight, never «N шт»
  const stepOnly = lineFromProduct(
    { name: "Філе куряче Епікур малий лоток", price: 303.45, step: 0.6, available: true },
    { q: "курка", role: "pro:chk", units: 2 },
  );
  if (!stepOnly.weighted) throw new Error("fractional step must imply weighted");
  if (stepOnly.amount !== "1,2 кг") throw new Error(`step-only amount: ${stepOnly.amount}`);
  if (/шт/i.test(stepOnly.amount)) throw new Error("weighted must not show шт");
  const stale = amountLabelFromLine({
    name: chicken.name,
    units: 2,
    amount: "2 шт",
    step: 0.6,
    weighted: true,
    quantity: 1.2,
  });
  if (stale !== "1,2 кг") throw new Error(`UI must rewrite шт→weight: ${stale}`);
  const carrot = lineFromProduct(
    { name: "Морква Сільпо свіжа", price: 39.99, weighted: false, step: 1, displayRatio: "75г", available: true },
    { q: "морква", role: "veg:car", units: 2 },
  );
  if (carrot.amount !== "2×75 г") throw new Error(`carrot pack weight label: ${carrot.amount}`);
  if (/шт/i.test(carrot.amount)) throw new Error("carrot must not show шт when displayRatio set");
  const banana = lineFromProduct(
    { name: "Банан", price: 65.42, weighted: true, step: 0.4, displayRatio: "100г", stock: 606.8, available: true },
    { q: "банан", role: "veg:ban", units: 2 },
  );
  if (banana.amount !== "800 г") throw new Error(`banana weight: ${banana.amount}`);
}

{
  const fixtureOrders = JSON.parse(readFileSync(new URL("./content/fixture-orders.json", import.meta.url), "utf8"));
  const receipts = ordersToReceipts(fixtureOrders);
  if (receipts.length < 4) throw new Error(`fixture receipts want ≥4 got ${receipts.length}`);
  const again = ordersToReceipts(fixtureOrders);
  if (receipts[0].id !== again[0].id) throw new Error("receipt id must be stable");
  const idA = receiptId("offline", "2026-08-18T17:42:00.000Z", 0);
  const idB = receiptId("offline", "2026-08-18T17:42:00.000Z", 0);
  if (idA !== idB) throw new Error("receiptId unstable");
  if (receipts[0].id !== idA) throw new Error(`first receipt id want ${idA} got ${receipts[0].id}`);

  const first = receipts[0];
  const strip = topLinesForThumbStrip(first.lines, 5);
  if (strip.shown.length !== 5) throw new Error(`thumb strip want 5 got ${strip.shown.length}`);
  if (strip.overflow !== first.lines.length - 5) {
    throw new Error(`thumb overflow want ${first.lines.length - 5} got ${strip.overflow}`);
  }
  if (strip.shown[0].name !== "Філе куряче «Епікур» охолоджене") {
    throw new Error(`top thumb want chicken got ${strip.shown[0].name}`);
  }
  if (!strip.shown[0].image) throw new Error("top thumb must keep fixture image");
  const short = topLinesForThumbStrip(first.lines.slice(0, 3), 5);
  if (short.shown.length !== 3 || short.overflow !== 0) {
    throw new Error(`short strip want 3/+0 got ${short.shown.length}/+${short.overflow}`);
  }
  const withNull = topLinesForThumbStrip(
    [
      { name: "a", price: null },
      { name: "b", price: 10 },
      { name: "c", price: 50 },
    ],
    2,
  );
  if (withNull.shown.map((l) => l.name).join(",") !== "c,b") {
    throw new Error(`null prices last want c,b got ${withNull.shown.map((l) => l.name)}`);
  }

  let priced = 0;
  let total = 0;
  let spent = 0;
  for (const r of receipts) {
    if (!String(r.at || "").startsWith("2026-08")) continue;
    for (const l of r.lines) {
      total += 1;
      if (typeof l.price === "number") {
        priced += 1;
        spent += l.price;
      }
    }
  }
  spent = Math.round(spent * 100) / 100;
  if (!(priced < total)) throw new Error("fixture must include null-price lines for coverage");

  const pulse = aggregateMonthPulse(receipts, { monthKey: "2026-08", goalUah: 6000 });
  if (pulse.monthKey !== "2026-08") throw new Error("pulse monthKey");
  if (pulse.spentUah !== spent) throw new Error(`pulse spent want ${spent} got ${pulse.spentUah}`);
  if (pulse.goalUah !== 6000) throw new Error("pulse goal");
  if (pulse.coverage.pricedLines !== priced || pulse.coverage.totalLines !== total) {
    throw new Error(`pulse coverage ${JSON.stringify(pulse.coverage)} vs ${priced}/${total}`);
  }
  if (pulse.coverage.pricedLines >= pulse.coverage.totalLines) {
    throw new Error("coverage must be incomplete when null prices exist");
  }
  if (!pulse.series.length) throw new Error("pulse series empty");
  if (!pulse.chartSeries?.length) throw new Error("pulse chartSeries empty");
  if (!pulse.chartSeries[0]?.prior) throw new Error("chartSeries should start with prior-month week");
  if (pulse.daySeries?.[0]?.dayStart !== "2026-08-01") throw new Error("daySeries should start at month day 1");
  if (!dayKeyISO("2026-08-08T12:00:00.000Z")?.endsWith("-08")) throw new Error("dayKeyISO");
  const chart = buildMonthWeekChartSeries(receipts, "2026-08");
  if (chart.length < 2) throw new Error("month week chart too short");
  const dayPeaks = dayExpensivePeaks(receipts, pulse.daySeries, { topN: 1, minUah: 120 });
  if (!dayPeaks.some((p) => p.items.length)) throw new Error("dayExpensivePeaks empty");
  if (pulse.recentReceiptIds.length < 1) throw new Error("recentReceiptIds");
  const newest = receipts.slice().sort((a, b) => new Date(b.at) - new Date(a.at))[0].id;
  if (pulse.recentReceiptIds[0] !== newest) {
    throw new Error("recent[0] must be newest receipt");
  }
  if (!pulse.topExpensive.length) throw new Error("topExpensive empty");
  const peaks = weekExpensivePeaks(receipts, pulse.series, { topN: 2, minUah: 120 });
  const dated = peaks.flatMap((p) => p.items).filter((it) => it.at);
  if (!dated.length) throw new Error("weekExpensivePeaks must attach receipt at");
  if (monthKeyFromAt("2026-07-14T12:00:00.000Z") !== "2026-07") throw new Error("monthKeyFromAt july");
  if (monthKeyFromAt("2026-08-21T12:00:00.000Z") !== "2026-08") throw new Error("monthKeyFromAt aug");
  {
    const nav = { prevKey: "2026-07", nextKey: "2026-09" };
    if (monthKeyFromDragDx(80, 300, nav) !== "2026-07") throw new Error("drag right → prev month");
    if (monthKeyFromDragDx(-80, 300, nav) !== "2026-09") throw new Error("drag left → next month");
    if (monthKeyFromDragDx(20, 300, nav) !== null) throw new Error("small drag snaps back");
    if (monthKeyFromDragDx(80, 300, { prevKey: null, nextKey: "2026-09" }) !== null) {
      throw new Error("edge drag without prev stays null");
    }
  }
  {
    const aug = buildMonthWeekChartSeries(receipts, "2026-08");
    const jul = buildMonthWeekChartSeries(receipts, "2026-07");
    const julPeek = seamDedupePeekSeries(jul, aug, "prev");
    const shared = new Set(aug.map((s) => s.weekStart).filter(Boolean));
    if (julPeek.some((s) => shared.has(s.weekStart))) {
      throw new Error("prev peek must not share weekStart with cur series");
    }
    if (julPeek.length < 2) throw new Error("prev peek too short after seam dedupe");
    if (!aug[0]?.prior) throw new Error("cur series must keep prior after peek dedupe helper");
    const strip = buildSparkPanStripSeries(jul, aug, []);
    if (strip.curStartIdx < 1) throw new Error("strip should prepend prev weeks");
    if (strip.series.length <= aug.length) throw new Error("strip longer than cur alone");
    const keys = strip.series.map((s) => s.weekStart);
    if (new Set(keys).size !== keys.length) throw new Error("strip weekStarts must be unique");
    const histMax = historyWeekSpendMax(receipts);
    if (!(histMax > 0)) throw new Error("historyWeekSpendMax should see fixture weeks");
    const julMax = sparkSharedYMax(buildSparkPanStripSeries([], jul, []).series, { historyMax: histMax });
    const augMax = sparkSharedYMax(strip.series, { historyMax: histMax });
    if (julMax !== augMax) throw new Error("spark Y max must match across month strips when historyMax set");
    if (julMax < histMax) throw new Error("spark Y max must include history peak");
    if (sparkSharedYMax([{ uah: 100 }], { historyMax: 500, weekPace: 200 }) !== 500) {
      throw new Error("sparkSharedYMax should prefer history over strip");
    }
    const nb = neighborMonthKeys(["2026-09", "2026-08", "2026-07", "2026-06"], "2026-08", 2);
    if (nb.older.join() !== "2026-07,2026-06" || nb.newer.join() !== "2026-09") {
      throw new Error(`neighborMonthKeys ${JSON.stringify(nb)}`);
    }
    const wide = buildSparkPanStripFromNeighbors({
      older: [jul, buildMonthWeekChartSeries(receipts, "2026-06")],
      cur: aug,
      newer: [],
    });
    if (wide.curStartIdx < strip.curStartIdx) {
      throw new Error("depth-2 strip should prepend at least as much as depth-1");
    }
    if (new Set(wide.series.map((s) => s.weekStart)).size !== wide.series.length) {
      throw new Error("wide strip weekStarts must be unique");
    }
    if (!Array.isArray(wide.segmentLens) || wide.segmentLens.length < 2) {
      throw new Error("strip must expose segmentLens");
    }
    if (wide.nearestOlderLen !== wide.segmentLens[wide.centerSegIndex - 1]) {
      throw new Error(`nearestOlderLen mismatch ${wide.nearestOlderLen} vs ${wide.segmentLens[wide.centerSegIndex - 1]}`);
    }
    const landPrev = sparkLandWeekStarts(wide, "prev");
    if (landPrev.length !== wide.nearestOlderLen) {
      throw new Error(`land prev weeks ${landPrev.length} != nearestOlderLen ${wide.nearestOlderLen}`);
    }
    // Next land distance must be center len (not newer len) so short months don't leave a void.
    const uneven = buildSparkPanStripFromNeighbors({
      older: [[{ weekStart: "2026-05-01", uah: 1 }, { weekStart: "2026-05-08", uah: 1 }, { weekStart: "2026-05-15", uah: 1 }, { weekStart: "2026-05-22", uah: 1 }, { weekStart: "2026-05-29", uah: 1 }]],
      cur: [
        { weekStart: "2026-06-05", uah: 1 },
        { weekStart: "2026-06-12", uah: 1 },
        { weekStart: "2026-06-19", uah: 1 },
        { weekStart: "2026-06-26", uah: 1 },
        { weekStart: "2026-07-03", uah: 1 },
      ],
      newer: [[{ weekStart: "2026-07-10", uah: 1 }, { weekStart: "2026-07-17", uah: 1 }]],
    });
    if (uneven.curLen === uneven.nearestNewerLen) {
      throw new Error("fixture must have unequal cur vs newer lens");
    }
    const landNext = sparkLandWeekStarts(uneven, "next");
    if (landNext.length !== uneven.nearestNewerLen) {
      throw new Error("land next week count should equal newer peek");
    }
    if (uneven.curLen <= uneven.nearestNewerLen) {
      throw new Error("expected longer center than newer for void-bug fixture");
    }
    const julAsCenter = buildSparkPanStripFromNeighbors({
      older: [buildMonthWeekChartSeries(receipts, "2026-06")],
      cur: jul,
      newer: [aug],
    });
    if (julAsCenter.curLen < 2) throw new Error("jul center too short");
  }
  const mkPulse = pulse.monthKey;
  const monthOnly = dated.filter((it) => monthKeyFromAt(it.at) === mkPulse);
  // Peak tips must be filterable to current month (UI does this; assert helper works on fixture)
  if (mkPulse && dated.some((it) => monthKeyFromAt(it.at) && monthKeyFromAt(it.at) !== mkPulse) && !monthOnly.length) {
    throw new Error("expected some peaks in pulse month when cross-month series exists");
  }
  const mem = {
    _m: Object.create(null),
    getItem(k) {
      return this._m[k] ?? null;
    },
    setItem(k, v) {
      this._m[k] = String(v);
    },
  };
  if (loadMonthGoalUah(mem, 6000) !== 6000) throw new Error("goal fallback");
  saveMonthGoalUah(7500, mem);
  if (loadMonthGoalUah(mem) !== 7500) throw new Error("goal persist");
  if (!MONTH_GOAL_KEY.includes("monthGoal")) throw new Error("goal key");
  const wow = weekOverWeekDelta(pulse.series);
  const insight = pulseInsightLine(pulse, receipts);
  if (!insight || typeof insight !== "string") throw new Error("insight missing");
  const pair = receiptPairDelta(receipts);
  if (!pair || typeof pair.pct !== "number") throw new Error("receipt pair");
  if (wow && typeof wow.pct !== "number") throw new Error("wow shape");
  const sug = suggestMonthGoalUah(12000, 1500);
  if (sug < 12000) throw new Error(`suggest goal too low ${sug}`);
  const mem2 = { _m: Object.create(null), getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); } };
  const auto = resolveMonthGoalUah(mem2, { spentUah: 12000, weekBudget: 1500 });
  if (auto.saved || auto.goalUah !== sug) throw new Error("resolve auto");
  saveMonthGoalUah(9000, mem2);
  const saved = resolveMonthGoalUah(mem2, { spentUah: 12000, weekBudget: 1500 });
  if (!saved.saved || saved.goalUah !== 9000) throw new Error("resolve saved");
  const overPct = Math.round((12000 / 9000) * 100);
  if (overPct <= 100) throw new Error("over pct fixture");
  const wowA = weekOverWeekDelta(pulse.series);
  const pulseLow = { ...pulse, goalUah: 9000 };
  const pulseHigh = { ...pulse, goalUah: 20000 };
  const wowB = weekOverWeekDelta(pulseLow.series);
  const wowC = weekOverWeekDelta(pulseHigh.series);
  if (wowA && wowB && wowA.pct !== wowB.pct) throw new Error("wow must ignore goal");
  if (wowB && wowC && wowB.pct !== wowC.pct) throw new Error("wow must ignore goal change");
  const paceLow = 9000 / Math.max(4, pulse.series.length || 4);
  const paceHigh = 20000 / Math.max(4, pulse.series.length || 4);
  if (!(paceHigh > paceLow)) throw new Error("weekPace should follow goal");
  const freq = freqFromReceipts(receipts);
  if ((freq["Молоко Галичина 2,5% 900 г"] || 0) < 2) {
    throw new Error("freq must count milk across receipts");
  }
}

{
  const bread = {
    role: "brd:1",
    name: "Хліб Цар-Хліб 400 г",
    status: "found",
    units: 2,
    unitPrice: 49.76,
    price: 99.52,
    displayRatio: "400г",
    amount: "2×400 г",
  };
  const down = applyQtyDelta(bread, {}, -1);
  if (!down.ok || down.units !== 1) throw new Error("qty bread − → 1");
  if (down.line.price !== 49.76) throw new Error(`bread price after −: ${down.line.price}`);
  if (!/400/.test(down.line.amount || "")) throw new Error(`bread amount: ${down.line.amount}`);
  const min = applyQtyDelta(down.line, { "brd:1": 1 }, -1);
  if (min.ok || min.reason !== "min") throw new Error("qty min must fail");
  const chicken = {
    role: "pro:chk",
    name: "Філе куряче",
    status: "found",
    units: 1,
    unitPrice: 303.45,
    price: 182.07,
    weighted: true,
    step: 0.6,
    quantity: 0.6,
    amount: "600 г",
  };
  const up = applyQtyDelta(chicken, {}, 1);
  if (!up.ok || up.units !== 2) throw new Error("qty chicken +");
  if (up.line.quantity !== 1.2) throw new Error(`chicken qty kg: ${up.line.quantity}`);
  if (up.line.price !== 364.14) throw new Error(`chicken price 2×: ${up.line.price}`);
  if (up.line.amount !== "1,2 кг") throw new Error(`chicken amount: ${up.line.amount}`);
  const overridden = applyQtyOverrides([chicken], { "pro:chk": 2 });
  if (effectiveUnits({ "pro:chk": 2 }, chicken) !== 2) throw new Error("effectiveUnits");
  if (overridden[0].price !== 364.14) throw new Error("applyQtyOverrides");
  const derived = repriceLine({ ...chicken, unitPrice: undefined, price: 182.07, units: 1, quantity: 0.6 }, 2);
  if (Math.abs(derived.price - 364.14) > 0.02) throw new Error(`derive unitPrice reprice: ${derived.price}`);
}

{
  if (!isBagLine("Пакет Сільпо Радісного Всього")) throw new Error("bag detect");
  const fixtureOrders = JSON.parse(readFileSync(new URL("./content/fixture-orders.json", import.meta.url), "utf8"));
  const receipts = ordersToReceipts(fixtureOrders);
  const milkReceipt = receipts.find((r) => (r.lines || []).some((l) => /молоко/i.test(l.name)));
  if (!milkReceipt) throw new Error("need milk receipt");
  const baseVm = {
    lines: [
      {
        role: "dairy:milk",
        wanted: "молоко",
        name: "Молоко 2,5%",
        status: "found",
        units: 1,
        unitPrice: 41,
        price: 41,
        envelope: "food",
        amount: "1 шт",
      },
    ],
    totals: { min: 41, max: 41 },
  };
  const merged = mergeReceiptIntoShopVm({
    mode: "whole",
    receipt: milkReceipt,
    shopVm: baseVm,
    accepted: { "dairy:milk": true },
    qtyByRole: {},
    categoriesAllow: ["food", "clean"],
    shelf,
  });
  if (!merged.bumpedN) throw new Error("duplicate milk must bump units");
  const milkLine = merged.vm.lines.find((l) => l.role === "dairy:milk");
  if (!milkLine || milkLine.units < 2) throw new Error(`milk units after bump: ${milkLine?.units}`);
  if (merged.skipped.some((s) => s.reason === "bag") !== true && milkReceipt.lines.some((l) => isBagLine(l.name))) {
    // online receipt has bag — must skip
    if (milkReceipt.lines.some((l) => isBagLine(l.name)) && !merged.skipped.some((s) => s.reason === "bag")) {
      throw new Error("bag must be skipped");
    }
  }
  const alcBlocked = mergeReceiptIntoShopVm({
    mode: "whole",
    receipt: milkReceipt,
    shopVm: { lines: [], totals: { min: 0, max: 0 } },
    accepted: {},
    categoriesAllow: ["food", "clean"],
    shelf,
  });
  if (alcBlocked.vm.lines.some((l) => l.envelope === "alcohol")) {
    throw new Error("alcohol must not merge when envelope off");
  }
  const fishRec = {
    id: "rtest",
    channel: "online",
    at: "2026-08-01T00:00:00.000Z",
    lines: [{ name: "Смажена шматочками риба", qty: 1, price: 50 }],
  };
  const miss = mergeReceiptIntoShopVm({
    mode: "whole",
    receipt: fishRec,
    shopVm: { lines: [], totals: { min: 0, max: 0 } },
    accepted: {},
    categoriesAllow: ["food", "clean"],
    shelf,
  });
  if (!miss.missingN || miss.vm.lines[0]?.status !== "missing") {
    throw new Error("fish must be missing on shelf");
  }
  if (toStaple("Пакет Сільпо") != null) throw new Error("bag not staple");
}

{
  const { loadBases, saveBases, upsertBase, deleteBase, baseFromReceipt, baseToReceipt, migrate, BASES_KEY } =
    await import("./js/bases.js");
  const mem = {
    store: {},
    getItem(k) {
      return this.store[k] ?? null;
    },
    setItem(k, v) {
      this.store[k] = String(v);
    },
  };
  saveBases([], mem);
  const fixtureOrders = JSON.parse(readFileSync(new URL("./content/fixture-orders.json", import.meta.url), "utf8"));
  const receipts = ordersToReceipts(fixtureOrders);
  const rec = receipts[0];
  const draft = baseFromReceipt(rec, { title: "Тест дім" });
  if (!draft.lines.length) throw new Error("baseFromReceipt empty");
  const saved = upsertBase(draft, mem);
  if (loadBases(mem).length !== 1) throw new Error("load after upsert");
  if (loadBases(mem)[0].title !== "Тест дім") throw new Error("persist title");
  const asRec = baseToReceipt(saved);
  if (asRec.lines.length !== saved.lines.length) throw new Error("baseToReceipt");
  const applied = mergeReceiptIntoShopVm({
    mode: "whole",
    receipt: asRec,
    shopVm: { lines: [], totals: { min: 0, max: 0 } },
    accepted: {},
    categoriesAllow: ["food", "clean", "alcohol", "tobacco"],
    shelf,
  });
  if (!applied.addedN && !applied.missingN) throw new Error("base apply empty");
  deleteBase(saved.id, mem);
  if (loadBases(mem).length !== 0) throw new Error("deleteBase");
  const migrated = migrate({ v: 1, bases: [{ id: "bx", title: "x", lines: [{ nameHint: "Хліб" }] }] });
  if (migrated.bases[0].lines[0].units !== 1) throw new Error("migrate units");
  if (!BASES_KEY.includes("bases")) throw new Error("key");
  const baseHash = parseLocationHash("#/shop/bases/bx1");
  if (baseHash.lists?.baseId !== "bx1" || baseHash.lists?.tab !== "bases") throw new Error("base hash");
}

{
  const { beaconForLine, freshnessClassOf, shopPantryNudge, pantryOutcomeCopy, skuVerifyBeacon, SKU_VERIFY_BADGE } = await import("./js/beacon.js");
  const fixtureOrders = JSON.parse(readFileSync(new URL("./content/fixture-orders.json", import.meta.url), "utf8"));
  const receipts = ordersToReceipts(fixtureOrders);
  const now = Date.parse("2026-08-21T12:00:00.000Z");
  if (freshnessClassOf({ id: "brd:loaf", envelope: "food", cadenceDays: 5 }) !== "P1") throw new Error("P1 bread");
  if (freshnessClassOf({ id: "tob:cig", envelope: "tobacco", cadenceDays: 7 }) !== "P2") throw new Error("P2 cig");
  if (freshnessClassOf({ id: "ext:oil", envelope: "food", cadenceDays: 150 }) !== "P3") throw new Error("P3 oil");
  const bread = beaconForLine({ name: "Хліб пшеничний" }, receipts, now);
  if (bread.kind !== "none") throw new Error(`P1 recent bread should silence got ${bread.kind}`);
  const oil = beaconForLine({ name: "Олія соняшникова 0,85 л" }, receipts, now);
  if (oil.kind !== "pantry_check") throw new Error(`P3 oil recent pantry got ${oil.kind}`);
  const oilSku = skuVerifyBeacon({ name: "Олія соняшникова 0,85 л" }, receipts, now);
  if (oilSku.kind !== "pantry_check" || oilSku.copy !== SKU_VERIFY_BADGE) {
    throw new Error(`skuVerifyBeacon expected verify chip got ${JSON.stringify(oilSku)}`);
  }
  const beer = beaconForLine({ name: "Пиво Оболонь світле 0.5л" }, receipts, now);
  if (beer.kind === "due_soft") throw new Error("P2 must not day-nag");
  if (beer.kind !== "none" && beer.kind !== "last_basket") throw new Error(`P2 unexpected ${beer.kind}`);
  const inferredOnly = [{ at: null, lines: [{ name: "Хліб пшеничний", qty: 1, price: 40 }] }];
  const silenced = beaconForLine({ name: "Хліб пшеничний" }, inferredOnly, now);
  if (silenced.kind !== "none") throw new Error(`inferred at must silence beacon got ${silenced.kind}`);
  const nudge = shopPantryNudge(
    [
      { role: "oil", name: "Олія соняшникова 0,85 л", staple: "олія" },
      { role: "bread", name: "Хліб пшеничний", staple: "хліб" },
    ],
    receipts,
    { oil: true, bread: true },
    now,
  );
  if (!nudge || nudge.count < 1 || !/олія/i.test(nudge.copy)) {
    throw new Error(`shopPantryNudge expected pantry summary got ${JSON.stringify(nudge)}`);
  }
  if (!nudge.roles?.includes("oil")) throw new Error(`shopPantryNudge roles missing oil got ${JSON.stringify(nudge.roles)}`);
  const sportPrefer = shopPantryNudge(
    [
      { role: "oil", name: "Олія соняшникова 0,85 л", staple: "олія" },
      { role: "gel", name: "Гель для душу 400 мл", staple: "гель" },
      { role: "bread", name: "Хліб пшеничний", staple: "хліб" },
    ],
    receipts,
    { oil: true, gel: true, bread: true },
    now,
    { stapleAllowlist: ["олія", "яйця", "курка"], preferSport: true },
  );
  if (!sportPrefer?.sportScoped || !/під програму/i.test(sportPrefer.copy)) {
    throw new Error(`sport prefer pantry expected scoped got ${JSON.stringify(sportPrefer)}`);
  }
  if (!sportPrefer.names.some((n) => /олія/i.test(n))) {
    throw new Error(`sport prefer should surface олія got ${JSON.stringify(sportPrefer.names)}`);
  }
  if (sportPrefer.roles.includes("gel")) {
    throw new Error("sport prefer must drop non-staple gel when overlap exists");
  }
  const sportFallback = shopPantryNudge(
    [{ role: "oil", name: "Олія соняшникова 0,85 л", staple: "олія" }],
    receipts,
    { oil: true },
    now,
    { stapleAllowlist: ["йогурт", "курка"], preferSport: true },
  );
  if (!sportFallback || sportFallback.sportScoped) {
    throw new Error(`sport prefer must fallback global when no overlap got ${JSON.stringify(sportFallback)}`);
  }
  if (oil.daysAgo != null && !/~\d+\s*дн/i.test(nudge.copy) && !/~\d+\s*дн/i.test(oil.copy)) {
    throw new Error(`Floor 6 days craft missing in copy nudge=${nudge.copy} oil=${oil.copy}`);
  }
  const ban = /закінчилось|порожньо|треба купити/i;
  for (const s of [oil.copy, oil.tip, nudge.copy, nudge.tip, bread.tip]) {
    if (s && ban.test(s)) throw new Error(`19d ban-word in beacon string: ${s}`);
  }
  if (!/чеків|інвентар/i.test(nudge.tip)) throw new Error(`Floor 9 trust tip missing got ${nudge.tip}`);
  const afterUncheck = shopPantryNudge(
    [
      { role: "oil", name: "Олія соняшникова 0,85 л", staple: "олія" },
      { role: "bread", name: "Хліб пшеничний", staple: "хліб" },
    ],
    receipts,
    { oil: false, bread: true },
    now,
  );
  if (afterUncheck) throw new Error("shopPantryNudge must drop when pantry role unchecked and only P1 remains");
  const nudgeEmpty = shopPantryNudge([{ role: "bread", name: "Хліб пшеничний" }], receipts, { bread: true }, now);
  if (nudgeEmpty) throw new Error("shopPantryNudge must hide when only silenced P1");
  if (pantryOutcomeCopy({ unchecks: 0 }) !== "знято з чеку · ще може бути вдома") {
    throw new Error("Floor 10 empty outcome");
  }
  const out1 = pantryOutcomeCopy({ unchecks: 1, uahUnchecked: 238 });
  if (!/знято 1 · менше дублю/i.test(out1) || !/238/.test(out1)) {
    throw new Error(`Floor 10 outcome with ₴ got ${out1}`);
  }
  if (ban.test(out1)) throw new Error(`Floor 10 ban-word in outcome ${out1}`);
}

{
  const {
    sportHomePulseModel,
    sportBarbellModel,
    sportBarbellMarkup,
    visitWeekSeriesFromPulse,
    visitsInMonth,
    noteSportDayConfirm,
    noteSportRationCoverage,
    rationCoverageHitsInMonth,
    sportDaysInMonth,
    sportHomeStripCta,
    noteSportProgramChosen,
    hasChosenSportProgram,
    sportOrientirModel,
    sportMonthKeys,
    sportShaftWaveSvg,
    sportExpressCardModel,
    sportLast7DaysSeries,
    sportMonthWeekChartSeries,
    estimateLineKcal,
    historyWeekKcalMax,
    historyWeekSessionsMax,
    sportSparkSharedYMaxes,
    sportFourWeekDayStrip,
    dayCalendarStripHtml,
    loadSportSessionGoal,
    saveSportSessionGoal,
    SPORT_SOFT_GOAL_DAYS,
    SPORT_SESSION_GOAL,
  } = await import("./js/sport-pulse.js");
  const mem = {
    store: {},
    getItem(k) {
      return this.store[k] ?? null;
    },
    setItem(k, v) {
      this.store[k] = String(v);
    },
  };
  const receipts = [
    { at: "2026-08-05T10:00:00.000Z", lines: [{ name: "Курка філе", price: 100 }] },
    { at: "2026-08-12T10:00:00.000Z", lines: [{ name: "Хліб", price: 20 }] },
    { at: "2026-07-01T10:00:00.000Z", lines: [{ name: "Курка", price: 90 }] },
  ];
  if (visitsInMonth(receipts, "2026-08") !== 2) throw new Error("visitsInMonth");
  const before = sportDaysInMonth("2026-08", mem);
  noteSportDayConfirm(new Date("2026-08-21T12:00:00.000Z"), mem);
  noteSportDayConfirm(new Date("2026-08-21T18:00:00.000Z"), mem);
  if (sportDaysInMonth("2026-08", mem) !== before + 1) throw new Error("sport day dedupe");
  noteSportRationCoverage({ role: "яйця", staple: "яйця", productId: "1", at: new Date("2026-08-21T12:00:00.000Z") }, mem);
  noteSportRationCoverage({ role: "яйця", staple: "яйця", productId: "1", at: new Date("2026-08-21T13:00:00.000Z") }, mem);
  noteSportRationCoverage({ role: "масло", staple: "масло", productId: "2", at: new Date("2026-08-21T12:00:00.000Z") }, mem);
  if (rationCoverageHitsInMonth("2026-08", mem) !== 2) throw new Error("ration coverage soft hits");
  const softModel = sportHomePulseModel({
    receipts: [],
    kb,
    intentSport: { constraints: { programId: "military", level: "beginner" } },
    monthKey: "2026-08",
    levelUa: "початковий",
    storage: mem,
  });
  if (softModel.rationHits !== 2) throw new Error(`soft ration in model ${softModel.rationHits}`);
  const model = sportHomePulseModel({
    receipts,
    kb,
    intentSport: { constraints: { programId: "military", level: "beginner" } },
    monthKey: "2026-08",
    levelUa: "початковий",
  });
  // mem not wired into model — visits path from receipts
  if (model.mode !== "visits" || model.heroValue !== 2) throw new Error(`sport visits model ${model.mode}/${model.heroValue}`);
  if (model.visits !== 2) throw new Error("model.visits field");
  const visitCta = sportHomeStripCta(model, mem);
  if (visitCta.go !== "day" || visitCta.label !== "день і полиця") throw new Error(`visit cta ${JSON.stringify(visitCta)}`);
  const ritualModel = sportHomePulseModel({
    receipts: [],
    kb,
    intentSport: { constraints: { programId: "military", level: "beginner" } },
    monthKey: "2099-01",
    levelUa: "початковий",
  });
  if (ritualModel.mode !== "plates" || ritualModel.heroValue !== 3) throw new Error(`sport plates ${ritualModel.mode}/${ritualModel.heroValue}`);
  if (ritualModel.insight.includes("колесо")) throw new Error("insight must not say колесо");
  const emptyMem = {
    store: {},
    getItem(k) {
      return this.store[k] ?? null;
    },
    setItem(k, v) {
      this.store[k] = String(v);
    },
  };
  const firstCta = sportHomeStripCta(ritualModel, emptyMem);
  if (firstCta.go !== "sport" || firstCta.label !== "обрати програму") throw new Error(`first cta ${JSON.stringify(firstCta)}`);
  noteSportProgramChosen(emptyMem);
  if (!hasChosenSportProgram(emptyMem)) throw new Error("programChosen flag");
  const ownedCta = sportHomeStripCta(ritualModel, emptyMem);
  if (ownedCta.go !== "day" || ownedCta.label !== "день і полиця") throw new Error(`owned cta ${JSON.stringify(ownedCta)}`);
  const series = visitWeekSeriesFromPulse([{ weekStart: "2026-08-04", receiptCount: 2, uah: 10 }]);
  if (series[0].uah !== 2) throw new Error("visitWeekSeries maps receiptCount");

  if (estimateLineKcal({ name: "Шоколад чорний", qty: 1 }) < 200) throw new Error("estimateLineKcal dense");
  if (estimateLineKcal({ name: "Молоко", price: 100 }) !== Math.round(100 * 1.75)) {
    throw new Error(`estimateLineKcal price sync ${estimateLineKcal({ name: "Молоко", price: 100 })}`);
  }
  {
    const syncRcpt = [
      { at: "2026-08-05T10:00:00.000Z", lines: [{ name: "Молоко", price: 500 }] },
      { at: "2026-08-12T10:00:00.000Z", lines: [{ name: "Молоко", price: 200 }] },
    ];
    const syncSpend = buildMonthWeekChartSeries(syncRcpt, "2026-08");
    const syncSport = sportMonthWeekChartSeries({
      receipts: syncRcpt,
      monthKey: "2026-08",
      storage: mem,
    });
    const liveSpend = syncSpend.filter((w) => !w.prior);
    const liveSport = syncSport.filter((w) => !w.prior);
    if (liveSpend.map((w) => w.weekStart).join() !== liveSport.map((w) => w.weekStart).join()) {
      throw new Error("sport/express week mesh must match");
    }
    const uahRank = [...liveSpend].sort((a, b) => b.uah - a.uah).map((w) => w.weekStart);
    const kcalRank = [...liveSport].sort((a, b) => b.kcal - a.kcal).map((w) => w.weekStart);
    if (uahRank[0] !== kcalRank[0]) {
      throw new Error(`kcal must peak with spend week ${uahRank[0]} vs ${kcalRank[0]}`);
    }
  }
  const daySer = sportLast7DaysSeries({
    receipts: [{ at: "2026-08-20T12:00:00.000Z", lines: [{ name: "Курка філе", qty: 2 }] }],
    monthKey: "2026-08",
    storage: mem,
  });
  if (daySer.length !== 8 || !daySer[0]?.prior) throw new Error(`sportLast7Days len/prior ${daySer.length}/${daySer[0]?.prior}`);
  const weekSer = sportMonthWeekChartSeries({
    receipts: [
      { at: "2026-07-22T10:00:00.000Z", lines: [{ name: "Курка", qty: 1 }] },
      { at: "2026-08-05T10:00:00.000Z", lines: [{ name: "Курка філе", qty: 2 }] },
    ],
    monthKey: "2026-08",
    storage: mem,
  });
  if (!weekSer[0]?.prior || !String(weekSer[0].day || "").startsWith("2026-07")) {
    throw new Error(`sport week prior month ${weekSer[0]?.day}/${weekSer[0]?.prior}`);
  }
  // prior week: no invent soft-fill — only real activity days (Express honesty)
  if (weekSer.some((w) => w.sessionsDemo)) throw new Error("sessionsDemo must stay dead");
  if (weekSer.length < 3) throw new Error(`sport week series short ${weekSer.length}`);
  {
    const yGoal = sportSparkSharedYMaxes([{ kcal: 100, sessions: 2 }], {
      historyKcalMax: 100,
      historySessionsMax: 2,
      sessionGoal: 5,
    });
    if (yGoal.sessions < 5) throw new Error("session Y floor must use sessionGoal");
  }
  {
    const jul = sportMonthWeekChartSeries({
      receipts: [
        { at: "2026-07-22T10:00:00.000Z", lines: [{ name: "Курка", qty: 1 }] },
        { at: "2026-08-05T10:00:00.000Z", lines: [{ name: "Курка філе", qty: 2 }] },
      ],
      monthKey: "2026-07",
      storage: mem,
    });
    const aug = weekSer;
    const stripJul = buildSparkPanStripSeries([], jul, aug);
    const stripAug = buildSparkPanStripSeries(jul, aug, []);
    const histK = historyWeekKcalMax([
      { at: "2026-07-22T10:00:00.000Z", lines: [{ name: "Курка", qty: 1 }] },
      { at: "2026-08-05T10:00:00.000Z", lines: [{ name: "Курка філе", qty: 2 }] },
    ]);
    const yJul = sportSparkSharedYMaxes(stripJul.series, {
      historyKcalMax: histK,
      historySessionsMax: 0,
      sessionGoal: 5,
    });
    const yAug = sportSparkSharedYMaxes(stripAug.series, {
      historyKcalMax: histK,
      historySessionsMax: 0,
      sessionGoal: 5,
    });
    if (yJul.kcal !== yAug.kcal) throw new Error("sport kcal Y max must match across month strips");
    if (!(histK > 0) || yJul.kcal < histK) throw new Error("sport kcal Y must include history");
    if (historyWeekSessionsMax(mem) < 1) throw new Error("historyWeekSessionsMax should see ritual days");
  }
  const honestMem = {
    store: {},
    getItem(k) {
      return this.store[k] ?? null;
    },
    setItem(k, v) {
      this.store[k] = String(v);
    },
  };
  const honestWeek = sportMonthWeekChartSeries({
    receipts: [
      { at: "2026-07-22T10:00:00.000Z", lines: [{ name: "Курка", qty: 1 }] },
      { at: "2026-08-05T10:00:00.000Z", lines: [{ name: "Курка філе", qty: 2 }] },
    ],
    monthKey: "2026-08",
    storage: honestMem,
  });
  if (Number(honestWeek[0]?.sessions) !== 0 || honestWeek.some((w) => (Number(w.sessions) || 0) > 0)) {
    throw new Error(`kcal-only must not invent sessions ${JSON.stringify(honestWeek.map((w) => w.sessions))}`);
  }
  const express = sportExpressCardModel({
    receipts: [
      { at: "2026-08-05T10:00:00.000Z", lines: [{ name: "Курка філе", qty: 2 }, { name: "Рис", qty: 1 }] },
      { at: "2026-08-12T10:00:00.000Z", lines: [{ name: "Шоколад", qty: 1 }] },
    ],
    monthKey: "2026-08",
    ritualDays: 3,
    storage: mem,
  });
  if (express.sessionGoal !== SPORT_SESSION_GOAL) throw new Error("session goal");
  if (express.sessions !== SPORT_SESSION_GOAL || express.sessionsDone !== 3 || express.leftSessions !== SPORT_SESSION_GOAL - 3) {
    throw new Error(`express sessions ${express.sessions}/${express.sessionsDone}/${express.leftSessions}`);
  }
  if (!(express.kcal > 0) || !(express.dishes >= 1) || !express.series[0]?.prior || !String(express.series[0].day).startsWith("2026-07")) {
    throw new Error(`express ration ${express.kcal}/${express.dishes}/prior ${express.series[0]?.day}`);
  }
  // prior week sessions only if real activity days exist (no invent soft-fill)
  if (Number(express.series[0].sessions) < 0) {
    throw new Error(`express prior sessions negative ${express.series[0].sessions}`);
  }
  if (loadSportSessionGoal(mem) !== SPORT_SESSION_GOAL) throw new Error("default session goal");
  if (saveSportSessionGoal(8, mem) !== 8 || loadSportSessionGoal(mem) !== 8) throw new Error("save session goal");

  const floorBar = sportBarbellModel({ ritualDays: 0, visits: 0, rationHits: 0, mode: "plates" });
  if (floorBar.lifted || !floorBar.empty || !floorBar.floorCaption.includes("підлозі")) {
    throw new Error(`barbell empty ${JSON.stringify(floorBar)}`);
  }
  const visitsOnly = sportBarbellModel({ ritualDays: 0, visits: 2, rationHits: 0, mode: "visits" });
  if (visitsOnly.lifted || visitsOnly.left.value !== 2) throw new Error("visits alone must not lift");
  if (!visitsOnly.floorCaption.includes("сесію")) throw new Error("need session caption when no ritual");
  const fuelOnly = sportBarbellModel({ ritualDays: 0, visits: 1, rationHits: 3, mode: "visits" });
  if (fuelOnly.lifted) throw new Error("fuel without ritual must not lift");
  if (!fuelOnly.floorCaption.includes("сесію")) throw new Error("fuel-only still needs session");
  const teachFloor = sportBarbellModel({ ritualDays: 2, visits: 8, rationHits: 0, mode: "ritual" });
  if (teachFloor.lifted || teachFloor.floorCaption !== "додай раціон у Express · підніми штангу") {
    throw new Error(`teach floor ${JSON.stringify(teachFloor)}`);
  }
  if (teachFloor.left.value !== 8 || teachFloor.right.value !== 0) throw new Error("teach metrics");
  const teachHtml = sportBarbellMarkup({
    lifted: false,
    empty: false,
    left: teachFloor.left,
    right: teachFloor.right,
    ariaLabel: teachFloor.ariaLabel,
  });
  if (!teachHtml.includes("раціон") || !teachHtml.includes("is-dash") || !teachHtml.includes("візити")) {
    throw new Error("teach markup must label dash plate");
  }
  const softFloor = sportOrientirModel({ ritualDays: 2, visits: 8 });
  if (softFloor.pct !== 25) throw new Error(`teach orientir ${softFloor.pct}`);
  const liftedBar = sportBarbellModel({ ritualDays: 1, visits: 2, rationHits: 3, mode: "ritual" });
  if (!liftedBar.lifted || liftedBar.right.value !== 3) throw new Error(`barbell lift ${JSON.stringify(liftedBar)}`);
  if (liftedBar.weekCaption !== "| цей тиждень · сесія + полиця |") throw new Error("week caption lock V1");
  const html = sportBarbellMarkup({
    lifted: true,
    empty: false,
    left: liftedBar.left,
    right: liftedBar.right,
    ariaLabel: liftedBar.ariaLabel,
    ritualDays: 1,
    rationHits: 3,
  });
  if (!html.includes("v1-hero.png") || !html.includes("home-pulse__barbell-metric-num")) {
    throw new Error("barbell V1 markup missing");
  }
  if (!html.includes("data-barbell-gl") || !html.includes("home-pulse__barbell-gl")) {
    throw new Error("barbell WebGL host missing");
  }
  if (!html.includes("home-pulse__barbell-shaft") || !html.includes("barbell-shaft-line")) {
    throw new Error("live shaft svg missing");
  }
  if (!html.includes("візити") || !html.includes("раціон")) throw new Error("barbell plate labels");
  if (sportShaftWaveSvg({ empty: true })) throw new Error("empty must skip shaft");
  if (!sportShaftWaveSvg({ lifted: true, ritualDays: 2, rationHits: 4 }).includes("path")) {
    throw new Error("shaft path");
  }
  const emptyHtml = sportBarbellMarkup({
    lifted: false,
    empty: true,
    left: { label: "візити", value: 0 },
    right: { label: "раціон", value: 0 },
  });
  if (!emptyHtml.includes("v3-hero.png") || !emptyHtml.includes("is-empty")) throw new Error("empty V3 markup");
  const soft = sportOrientirModel({ ritualDays: 2, visits: 8 });
  if (soft.goal !== SPORT_SOFT_GOAL_DAYS || soft.progress !== 2 || soft.pct !== 25 || soft.unit !== "ritual") {
    throw new Error(`sport orientir ritual ${JSON.stringify(soft)}`);
  }
  const softVisits = sportOrientirModel({ ritualDays: 0, visits: 4 });
  if (softVisits.unit !== "visits" || softVisits.pct !== 50) throw new Error(`sport orientir visits ${JSON.stringify(softVisits)}`);
  const emptyOrient = sportOrientirModel({ ritualDays: 0, visits: 0 });
  if (emptyOrient.unit !== "empty" || emptyOrient.pct !== 0) {
    throw new Error(`sport orientir empty ${JSON.stringify(emptyOrient)}`);
  }
  const keys = sportMonthKeys(receipts, mem);
  if (!keys.includes("2026-08") || !keys.includes("2026-07")) throw new Error(`sportMonthKeys ${keys.join(",")}`);
  const { noteSessionComplete, shiftDayKey } = await import("./js/session-player.js");
  const anchor = "2026-08-26";
  noteSessionComplete({ programId: "military", stepsDone: 3, stepsTotal: 3, durationSec: 60, at: new Date(`${anchor}T10:00:00.000Z`) }, mem);
  noteSportRationCoverage({ role: "lunch", staple: "курка", at: new Date(`${shiftDayKey(anchor, -2)}T12:00:00.000Z`) }, mem);
  const strip = sportFourWeekDayStrip({
    anchorDay: anchor,
    selectedDay: shiftDayKey(anchor, -2),
    todayISO: anchor,
    storage: mem,
  });
  if (strip.length !== 28) throw new Error(`four week len ${strip.length}`);
  const sel = strip.find((d) => d.selected);
  if (!sel || sel.dayISO !== shiftDayKey(anchor, -2)) throw new Error("four week selected");
  const todayDot = strip.find((d) => d.isToday);
  if (todayDot?.dayISO !== anchor) throw new Error("four week today anchor");
  if (todayDot?.selected) throw new Error("four week today not selected when other sel");
  const future = strip.filter((d) => d.isFuture);
  if (future.length) throw new Error(`four week future ${future.length}`);
  const sessDay = strip.find((d) => d.sessionFull);
  if (!sessDay || sessDay.dayISO !== anchor) throw new Error("four week session full");
  const rationDay = strip.find((d) => d.rationHits > 0);
  if (!rationDay || rationDay.rationHits < 1) throw new Error("four week ration");
  const calHtml = dayCalendarStripHtml(strip);
  if (!calHtml.includes("day-calendar") || !calHtml.includes('data-day-iso="')) throw new Error("calendar html");
}

{
  const {
    estimateDurationSec,
    parseSessionSteps,
    formatTimer,
    noteSessionComplete,
    loadSessionEvents,
    sessionDaysInMonth,
    activityWeekSeriesFromEvents,
    createSessionController,
    dayKeyKyiv,
    shiftDayKey,
  } = await import("./js/session-player.js");
  if (dayKeyKyiv(new Date("2026-08-25T22:30:00.000Z")) !== "2026-08-26") {
    throw new Error(`dayKeyKyiv Kyiv midnight ${dayKeyKyiv(new Date("2026-08-25T22:30:00.000Z"))}`);
  }
  if (shiftDayKey("2026-08-26", -1) !== "2026-08-25") throw new Error("shiftDayKey");
  if (estimateDurationSec("Планка 20 с × 3") !== 60) throw new Error("plank duration");
  if (estimateDurationSec("Дихання 1 хв") !== 60) throw new Error("min duration");
  if (formatTimer(65) !== "01:05") throw new Error("formatTimer");
  const steps = parseSessionSteps(["Присідання 10 × 3", "Віджимання з колін 6 × 3"]);
  if (steps.length !== 2 || steps[0].durationSec !== 66) throw new Error(`parse steps ${JSON.stringify(steps)}`);
  const mem = {
    store: {},
    getItem(k) {
      return this.store[k] ?? null;
    },
    setItem(k, v) {
      this.store[k] = String(v);
    },
  };
  noteSessionComplete({ programId: "military", stepsDone: 2, durationSec: 90, at: new Date("2026-08-22T12:00:00.000Z") }, mem);
  noteSessionComplete({ programId: "military", stepsDone: 2, durationSec: 40, at: new Date("2026-08-22T18:00:00.000Z") }, mem);
  if (loadSessionEvents(mem).length !== 1) throw new Error("session dedupe by day");
  if (sessionDaysInMonth("2026-08", mem) !== 1) throw new Error("sessionDaysInMonth");
  const {
    noteSessionProgress,
    sessionMonthStats,
    sessionProgressFromSnapshot,
  } = await import("./js/session-player.js");
  noteSessionProgress(
    { programId: "military", stepsDone: 1, stepsTotal: 5, durationSec: 20, full: false, at: new Date("2026-08-23T12:00:00.000Z") },
    mem,
  );
  const partialStats = sessionMonthStats("2026-08", mem);
  if (partialStats.partialDays !== 1 || partialStats.fullDays !== 1) {
    throw new Error(`sessionMonthStats ${JSON.stringify(partialStats)}`);
  }
  noteSessionProgress(
    { programId: "military", stepsDone: 5, stepsTotal: 5, durationSec: 100, full: true, at: new Date("2026-08-23T18:00:00.000Z") },
    mem,
  );
  const upgraded = sessionMonthStats("2026-08", mem);
  if (upgraded.partialDays !== 0 || upgraded.fullDays !== 2 || upgraded.score !== 2) {
    throw new Error(`upgrade partial→full ${JSON.stringify(upgraded)}`);
  }
  const snapProg = sessionProgressFromSnapshot({
    done: false,
    idx: 0,
    elapsedTotal: 12,
    totalSteps: 4,
  });
  if (!snapProg || snapProg.stepsDone !== 1 || snapProg.full) throw new Error("partial from start");
  const series = activityWeekSeriesFromEvents(loadSessionEvents(mem), [
    { weekStart: "2026-08-18" },
    { weekStart: "2026-08-25" },
  ]);
  if (!(series[0].uah > 0) || series[1].uah !== 0) throw new Error(`activity series ${JSON.stringify(series)}`);
  let done = false;
  let ticks = 0;
  const ctl = createSessionController({
    steps: [
      { id: "a", label: "A", durationSec: 3 },
      { id: "b", label: "B", durationSec: 2 },
    ],
    onTick: (st) => {
      ticks += 1;
      if (st.running && st.wave.length < 1) throw new Error("live wave empty while running");
    },
    onDone: () => {
      done = true;
    },
  });
  ctl.start();
  // Drive two seconds without waiting wall clock: use skip for done path + assert live API
  const mid = ctl.snapshot();
  if (!mid.running) throw new Error("controller should run after start");
  ctl.pause();
  ctl.skip();
  ctl.skip();
  if (!done) throw new Error("controller onDone via skip");
  ctl.destroy();
}

{
  const {
    resolveExerciseArt,
    EXERCISE_ART_ATTRIBUTION,
    WORKOUT_GUIDE_VERSION,
    EXERCISE_ART_INTENTIONAL_NULL,
  } = await import("./js/exercise-art-map.js");
  const plank = resolveExerciseArt("Планка 20 с × 3");
  if (!plank || plank.slug !== "plank") throw new Error(`art plank ${JSON.stringify(plank)}`);
  const squat = resolveExerciseArt("Присідання 10 × 3");
  if (!squat || squat.slug !== "bodyweight-squat") throw new Error(`art squat ${JSON.stringify(squat)}`);
  const knee = resolveExerciseArt("Віджимання з колін 6 × 3");
  if (!knee || knee.slug !== "knee-push-up") throw new Error(`art knee ${JSON.stringify(knee)}`);
  if (resolveExerciseArt("Дихання 1 хв")?.slug !== "arm-circles") throw new Error("art breath arm-circles");
  if (resolveExerciseArt("Дихання животом 1 хв")?.slug !== "cat-cow-stretch") {
    throw new Error("art belly breath cat-cow");
  }
  if (resolveExerciseArt("Ходьба 12 хв рівним кроком") !== null) throw new Error("art walk must be null");
  const afro = resolveExerciseArt("Крок на місці 2 хв");
  if (!afro || afro.slug !== "high-knees") throw new Error(`art afrobeat step ${JSON.stringify(afro)}`);
  if (resolveExerciseArt("Плечі 32 рахунки")?.slug !== "arm-circles") throw new Error("art afrobeat shoulders");
  if (resolveExerciseArt("Стегна 32 рахунки")?.slug !== "leg-swings-stretch") throw new Error("art afrobeat hips");
  const { resolvePickerThumbArt } = await import("./js/exercise-art-map.js");
  const thumbAfro = resolvePickerThumbArt([
    "Крок на місці 1 хв",
    "Плечі 32 рахунки",
    "Стегна 32 рахунки",
  ]);
  if (thumbAfro?.slug !== "arm-circles") throw new Error(`picker thumb prefers dense art, got ${thumbAfro?.slug}`);
  if (resolveExerciseArt("Плечі назад 10")?.slug !== "cross-body-shoulder-stretch") {
    throw new Error("art chair shoulders");
  }
  if (resolveExerciseArt("Стійка вершника 30 с")?.slug !== "bodyweight-squat") throw new Error("art tai-chi stance");
  const pinned = resolveExerciseArt("Планка 20 с × 3");
  if (!pinned?.url.includes(`@${WORKOUT_GUIDE_VERSION}`) || !pinned.url.includes("frame-1.png")) {
    throw new Error(`art CDN pin ${pinned?.url}`);
  }
  if (!/CC BY-SA 4\.0/i.test(EXERCISE_ART_ATTRIBUTION)) throw new Error("art attribution");

  /* Coverage: every kb session label maps or is intentional null */
  const gaps = [];
  for (const [prog, byLevel] of Object.entries(kb.sessions || {})) {
    for (const labels of Object.values(byLevel || {})) {
      for (const label of labels || []) {
        const hit = resolveExerciseArt(label);
        if (hit) continue;
        const { normalizeExerciseStem } = await import("./js/exercise-art-map.js");
        const stem = normalizeExerciseStem(label);
        const intentional = EXERCISE_ART_INTENTIONAL_NULL.some((k) => stem === k || stem.startsWith(k));
        if (!intentional) gaps.push(`${prog}: ${label}`);
      }
    }
  }
  if (gaps.length) throw new Error(`art coverage gaps:\n${gaps.join("\n")}`);
}

{
  const { hasProgramThumb, programPickerMetaLine, resolveProgramThumb, PROGRAM_THUMBS } = await import(
    "./js/program-art-map.js"
  );
  const { programsForHome } = await import("./js/sport-profile.js");
  const homeIds = programsForHome(kb.programs).map((p) => p.id);
  for (const id of homeIds) {
    if (!hasProgramThumb(id)) throw new Error(`program thumb missing: ${id}`);
    if (!PROGRAM_THUMBS[id]?.includes(`${id}-thumb.png`)) throw new Error(`program thumb path ${id}`);
    const hit = resolveProgramThumb(id, []);
    if (!hit || hit.source !== "program") throw new Error(`resolveProgramThumb ${id} ${JSON.stringify(hit)}`);
  }
  const afroMeta = programPickerMetaLine({ id: "afrobeat", goal: "cardio" }, { bodyGoal: "lose" }, true);
  if (!afroMeta.includes("скинути")) throw new Error(`program meta selected ${afroMeta}`);
  const milMeta = programPickerMetaLine({ id: "military", goal: "strength" }, { bodyGoal: "lose" }, false);
  if (!milMeta.includes("сила")) throw new Error(`program meta static ${milMeta}`);
}

{
  const {
    resolveExerciseHowTo,
    listExerciseHowToStems,
    pickHowToVoice,
    HOWTO_DISCLAIMER_SHORT,
  } = await import("./js/exercise-howto.js");
  const { normalizeExerciseStem } = await import("./js/exercise-art-map.js");
  const plank = resolveExerciseHowTo("Планка 20 с × 3");
  if (!plank || plank.fallback || !/пряма лінія/i.test(plank.text)) {
    throw new Error(`howto plank ${JSON.stringify(plank)}`);
  }
  if (/медичн/i.test(plank.speakText || "")) {
    throw new Error("howto speakText must not append medical disclaimer every listen");
  }
  if (!/орієнтир форми/i.test(HOWTO_DISCLAIMER_SHORT)) throw new Error("howto disclaimer constant");
  const belly = resolveExerciseHowTo("Дихання животом 1 хв");
  if (!belly || belly.stem !== "дихання животом") {
    throw new Error(`howto belly vs breath ${JSON.stringify(belly)}`);
  }
  const breath = resolveExerciseHowTo("Дихання 1 хв");
  if (!breath || breath.stem !== "дихання") throw new Error(`howto breath ${JSON.stringify(breath)}`);
  const miss = resolveExerciseHowTo("Невідома вправа 10", { allowFallback: false });
  if (miss) throw new Error("howto allowFallback false should miss");
  const fb = resolveExerciseHowTo("Невідома вправа 10");
  if (!fb?.fallback || !/комфортн/i.test(fb.text)) throw new Error(`howto fallback ${JSON.stringify(fb)}`);
  if (!pickHowToVoice([{ lang: "en-US", name: "A" }, { lang: "uk-UA", name: "UA" }])?.lang.startsWith("uk")) {
    throw new Error("pickHowToVoice prefers uk");
  }
  if (listExerciseHowToStems().length < 20) throw new Error("howto stem list thin");

  const howtoGaps = [];
  for (const [prog, byLevel] of Object.entries(kb.sessions || {})) {
    for (const labels of Object.values(byLevel || {})) {
      for (const label of labels || []) {
        const hit = resolveExerciseHowTo(label, { allowFallback: false });
        if (!hit) howtoGaps.push(`${prog}: ${label} (${normalizeExerciseStem(label)})`);
      }
    }
  }
  if (howtoGaps.length) throw new Error(`howto coverage gaps:\n${howtoGaps.join("\n")}`);
}

{
  const { splitSessionLabel, sessionLabelHtml, sessionLabelShortName } = await import("./js/session-label.js");
  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const plank = splitSessionLabel("Планка 20 с × 3");
  if (plank.name !== "Планка" || plank.dose !== "20 с × 3") throw new Error(`split plank ${JSON.stringify(plank)}`);
  const squat = splitSessionLabel("Присідання 10 × 3");
  if (squat.name !== "Присідання" || squat.dose !== "10 × 3") throw new Error(`split squat ${JSON.stringify(squat)}`);
  const breath = splitSessionLabel("Дихання 1 хв");
  if (breath.name !== "Дихання" || breath.dose !== "1 хв") throw new Error(`split breath ${JSON.stringify(breath)}`);
  const plain = splitSessionLabel("Розминка");
  if (plain.name !== "Розминка" || plain.dose !== "") throw new Error(`split plain ${JSON.stringify(plain)}`);
  const html = sessionLabelHtml("Планка 20 с × 3", { esc });
  if (!html.includes("session-player__move-name") || !html.includes("session-player__dose")) {
    throw new Error(`label html ${html}`);
  }
  const up = sessionLabelHtml("Присідання 10 × 3", { upcoming: true, esc });
  if (!up.includes("session-player__upcoming") || !up.includes("Присідання")) {
    throw new Error(`upcoming html ${up}`);
  }
  if (sessionLabelShortName("Присідання 10 × 3") !== "Присідання") throw new Error("short name");
  if (!sessionLabelHtml("", { done: true, esc }).includes("Сесію завершено")) throw new Error("done label");
  // KB edge shapes — lock current "digit-tail → dose" intent (incl. prose-in-dose)
  const walk = splitSessionLabel("Ходьба 12 хв рівним кроком");
  if (walk.name !== "Ходьба" || walk.dose !== "12 хв рівним кроком") {
    throw new Error(`split walk ${JSON.stringify(walk)}`);
  }
  const cat = splitSessionLabel("Кішка-корова 10");
  if (cat.name !== "Кішка-корова" || cat.dose !== "10") throw new Error(`split cat ${JSON.stringify(cat)}`);
  const lunge = splitSessionLabel("Випади 8 на ногу");
  if (lunge.name !== "Випади" || lunge.dose !== "8 на ногу") throw new Error(`split lunge ${JSON.stringify(lunge)}`);
  const seated = splitSessionLabel("Сидячи: підйом коліна 8");
  if (seated.name !== "Сидячи: підйом коліна" || seated.dose !== "8") {
    throw new Error(`split seated ${JSON.stringify(seated)}`);
  }
  const tai = splitSessionLabel("Пауза тайцзі 1 хв кожні 3 хв");
  if (tai.name !== "Пауза тайцзі" || !tai.dose.startsWith("1 хв")) {
    throw new Error(`split tai ${JSON.stringify(tai)}`);
  }
}

{
  const line = {
    wanted: "вівсянка",
    name: "Вівсянка Премія 500г",
    status: "found",
    sku: { productId: "111" },
    price: 42,
  };
  const empty = expressMembershipForMeal(line, { extraQueries: [], shopLines: [], bases: [] });
  if (empty.inExpress) throw new Error("membership: empty should not be in express");
  const inExtra = expressMembershipForMeal(line, {
    extraQueries: [{ productId: "111", q: "Вівсянка Премія 500г" }],
    shopLines: [],
    bases: [],
  });
  if (!inExtra.inChecklist || inExtra.label !== "вже в Express") {
    throw new Error(`membership extra: ${JSON.stringify(inExtra)}`);
  }
  const inBase = expressMembershipForMeal(line, {
    extraQueries: [],
    shopLines: [],
    bases: [{ title: "Ранок", lines: [{ preferredSku: "111", nameHint: "", staple: "" }] }],
  });
  if (!inBase.inBase || !inBase.label.includes("у базі")) {
    throw new Error(`membership base: ${JSON.stringify(inBase)}`);
  }
  const both = expressMembershipForMeal(line, {
    extraQueries: [{ productId: "111", q: "x" }],
    shopLines: [],
    bases: [{ title: "Ранок", lines: [{ preferredSku: "111" }] }],
  });
  if (both.label !== "в Express · у базі") throw new Error(`membership both: ${both.label}`);
  const byName = expressMembershipForMeal(
    { wanted: "рис", name: "Рис круглий", status: "found", sku: {} },
    { extraQueries: [{ q: "Рис круглий" }], shopLines: [], bases: [] },
  );
  if (!byName.inChecklist) throw new Error("membership by name failed");
}

{
  const tagged = withSportDayProvenance(
    { q: "Вівсянка", role: "add:1", groupTitle: "Сніданок", why: "додано · Сніданок" },
    { programId: "p-home", role: "breakfast" },
  );
  if (tagged.from !== "sport_day" || tagged.programId !== "p-home" || tagged.rationRole !== "breakfast") {
    throw new Error(`sport provenance: ${JSON.stringify(tagged)}`);
  }
  if (!String(tagged.why).startsWith("з програми")) throw new Error(`sport why: ${tagged.why}`);
  if (countSportDayExtras([tagged, { q: "x" }]) !== 1) throw new Error("countSportDayExtras");
  const copy = sportHandoffCalloutCopy({ title: "Сила вдома", sportExtraCount: 2 });
  if (copy.lead !== "З програми" || !copy.copy.includes("2")) throw new Error(`handoff copy: ${JSON.stringify(copy)}`);
  const addable = mealsAddableToExpress(
    [
      { status: "found", name: "A", sku: { productId: "1" } },
      { status: "missing", name: "B", sku: { productId: "2" } },
      { status: "found", name: "C", sku: { productId: "3" } },
    ],
    (line) => ({
      inChecklist: String(line.sku?.productId) === "1",
    }),
  );
  if (addable.length !== 1 || addable[0].name !== "C") throw new Error(`addable: ${JSON.stringify(addable)}`);
  const strength = mealMapStaples(kb, kb.programs?.find((p) => p.goal === "strength")?.id || kb.programs?.[0]?.id);
  if (!strength.includes("яйця") || !strength.includes("курка")) {
    throw new Error(`mealMapStaples strength ${JSON.stringify(strength)}`);
  }
  if (!lineMatchesStapleAllowlist({ name: "Яйце С1", staple: "яйця" }, strength)) {
    throw new Error("lineMatchesStapleAllowlist eggs");
  }
  const withPantry = sportHandoffCalloutCopy({ title: "Сила", sportExtraCount: 3, pantryOverlap: 2 });
  if (!/під програму/i.test(withPantry.copy)) throw new Error(`handoff pantry tip ${withPantry.copy}`);
}

{
  const prefs = normalizeSurvey({
    avoidIds: ["milk", "chicken"],
    dietTags: ["vegetarian"],
    cookMode: "ready",
    completedAt: "2026-08-26T00:00:00.000Z",
  });
  const drop = surveyDropStaples(prefs);
  if (!drop.includes("молоко") || !drop.includes("курка") || !drop.includes("риба")) {
    throw new Error(`survey drop ${JSON.stringify(drop)}`);
  }
  const pid = kb.programs?.find((p) => p.goal === "strength")?.id || kb.programs?.[0]?.id;
  const plan = buildSportRationPlan({
    kb,
    programId: pid,
    level: "beginner",
    dayISO: "2026-08-26",
    prefs,
  });
  if (plan.source !== "survey_v0") throw new Error(`plan source ${plan.source}`);
  if (plan.queries.some((q) => /курка|молоко|яйця/.test(String(q.staple || q.q)))) {
    /* яйця not dropped — only milk+chicken+fish from vegetarian */
  }
  if (plan.queries.some((q) => String(q.staple || q.q).includes("курка"))) {
    throw new Error(`chicken should be filtered ${JSON.stringify(plan.queries)}`);
  }
  const filtered = filterQueriesBySurvey(
    [
      { staple: "молоко", q: "молоко" },
      { staple: "вівсянка", q: "вівсянка" },
    ],
    prefs,
  );
  if (filtered.length !== 1 || filtered[0].staple !== "вівсянка") {
    throw new Error(`filterQueries ${JSON.stringify(filtered)}`);
  }
  const staplesSurvey = mealMapStaplesWithSurvey(kb, pid, prefs);
  if (staplesSurvey.includes("курка") || staplesSurvey.includes("молоко")) {
    throw new Error(`staples with survey ${JSON.stringify(staplesSurvey)}`);
  }
}

{
  const m0 = emptyHandoffMetrics();
  const m1 = bumpHandoffMetric(m0, "enter");
  const m2 = bumpHandoffMetric(m1, "plate_add", 2);
  const m3 = bumpHandoffMetric(m2, "bulk_add", 3);
  const m4 = bumpHandoffMetric(m3, "confirm_sport");
  if (m4.enters !== 1 || m4.plateAdds !== 2 || m4.bulkAdds !== 3 || m4.confirmSport !== 1) {
    throw new Error(`handoff metrics ${JSON.stringify(m4)}`);
  }
  const gapBoth = loopGapModel({ ritualDays: 0, softRationHits: 0 });
  if (gapBoth.side !== "both") {
    throw new Error(`gap both ${JSON.stringify(gapBoth)}`);
  }
  if (/\bкуплено\b/i.test(gapBoth.copy) && !/≠|не\s/.test(gapBoth.tip)) {
    throw new Error(`gap both claims purchase ${JSON.stringify(gapBoth)}`);
  }
  const gapRation = loopGapModel({ ritualDays: 2, softRationHits: 0, uncoveredPlates: 3 });
  if (gapRation.side !== "ration_checklist" || !/чеклист/i.test(gapRation.copy)) {
    throw new Error(`gap ration ${JSON.stringify(gapRation)}`);
  }
  const gapOk = loopGapModel({ ritualDays: 1, softRationHits: 2 });
  if (gapOk.side !== "none") throw new Error(`gap ok ${JSON.stringify(gapOk)}`);
  const outcome = handoffOutcomeCopy(m4);
  if (!/цикл Sport→Express/i.test(outcome) || /зайве|куплен/i.test(outcome)) {
    throw new Error(`outcome ${outcome}`);
  }
}

{
  if (kindFromCookMode("ready") !== "ready" || kindFromCookMode("cook") !== "raw" || kindFromCookMode("any") != null) {
    throw new Error("kindFromCookMode map");
  }
  if (cookModeLabel("cook") !== "готувати самому" || cookModeLabel("ready") !== "готове з полиці") {
    throw new Error(`cookModeLabel ${cookModeLabel("cook")} / ${cookModeLabel("ready")}`);
  }
  if (plateModeFromCookMode("ready") !== "ready" || plateModeFromCookMode("cook") !== "ingredients") {
    throw new Error("plateModeFromCookMode");
  }
  if (cookModeFromPlateMode("ready") !== "ready" || cookModeFromPlateMode("ingredients") !== "cook") {
    throw new Error("cookModeFromPlateMode");
  }
  if (surveyTasteLine({ cookMode: "ready", completedAt: "x" }) !== "смаки · без фільтрів") {
    throw new Error(`surveyTasteLine omit cook ${surveyTasteLine({ cookMode: "ready", completedAt: "x" })}`);
  }
  if (surveyTasteFilterCount({ avoidIds: ["fish", "chicken"], dietTags: [], cookMode: "ready" }) !== 2) {
    throw new Error("surveyTasteFilterCount");
  }
  if (surveyTasteFilterCount({ avoidIds: [], dietTags: [], cookMode: "cook" }) !== 0) {
    throw new Error("surveyTasteFilterCount empty");
  }
  if (foodKind("Філе стегна курчат охолоджене", "курка") !== "raw") throw new Error("foodKind raw chicken");
  if (foodKind("Нагетси курячі гриль", "курка") !== "ready") throw new Error("foodKind ready chicken");
  const readyScore = scoreProduct(
    { name: "Нагетси курячі гриль", price: 100 },
    { staple: "курка", kind: "ready", freq: {} },
  );
  const rawScore = scoreProduct(
    { name: "Філе стегна курчат охолоджене", price: 100 },
    { staple: "курка", kind: "ready", freq: {} },
  );
  if (!(readyScore > rawScore)) throw new Error(`cookMode ready prefer ${readyScore} vs ${rawScore}`);
  const sportIntent = emptyIntent("sport");
  sportIntent.constraints.programId = "asian-walk";
  const walkContent = compose(sportIntent, kb);
  if (!walkContent.variants?.some((v) => v.id === "walk")) throw new Error("walk variant missing");
  const outdoor = (kb.programs || []).filter((p) => p.place === "outdoor");
  if (outdoor.length < 2) throw new Error("kb outdoor programs");
  const home = (kb.programs || []).filter((p) => (p.place || "home") === "home");
  if (home.length < 5) throw new Error("kb home programs");
}

{
  /* Sport profile v0 — body prefs → recommend + kcal */
  const {
    normalizeSportProfile,
    profileIsComplete,
    saveSportProfile,
    loadSportProfile,
    rankProgramsForProfile,
    programsForHome,
    suggestLevelFromProfile,
    estimateDailyKcalFromProfile,
    BODY_GOAL_TO_TRAINING,
  } = await import("./js/sport-profile.js");
  const incomplete = normalizeSportProfile({ sex: "female", age: 30 });
  if (profileIsComplete(incomplete)) throw new Error("profile incomplete");
  const memP = {
    _m: new Map(),
    getItem(k) {
      return this._m.has(k) ? this._m.get(k) : null;
    },
    setItem(k, v) {
      this._m.set(k, String(v));
    },
  };
  const saved = saveSportProfile(
    {
      sex: "female",
      age: 32,
      heightCm: 168,
      weightKg: 62,
      bodyGoal: "lose",
    },
    memP,
  );
  if (!profileIsComplete(saved)) throw new Error("profile complete");
  if (loadSportProfile(memP).bodyGoal !== "lose") throw new Error("profile load");
  if (BODY_GOAL_TO_TRAINING.lose !== "cardio") throw new Error("goal map");
  const homeOnly = programsForHome(kb.programs);
  if (homeOnly.some((p) => p.place === "outdoor")) throw new Error("home filter");
  const ranked = rankProgramsForProfile(kb.programs, saved);
  if (ranked[0]?.goal !== "cardio") throw new Error(`rank lose→cardio got ${ranked[0]?.id}`);
  if (suggestLevelFromProfile(saved) !== "beginner") throw new Error("female level");
  const kcalF = estimateDailyKcalFromProfile(saved);
  const kcalM = estimateDailyKcalFromProfile({ ...saved, sex: "male" });
  if (!(kcalM > kcalF)) throw new Error(`sex kcal ${kcalM} vs ${kcalF}`);
  if (kcalF < 1400 || kcalF > 3500) throw new Error(`kcal bounds ${kcalF}`);
  const {
    resolveMealTrainingGoal,
    mealGoalDiffersFromProgram,
  } = await import("./js/sport-profile.js");
  if (resolveMealTrainingGoal("strength", saved) !== "cardio") throw new Error("meal goal lose→cardio");
  if (!mealGoalDiffersFromProgram("strength", saved)) throw new Error("meal goal differs");
  const { sessionFor, compose } = await import("./js/composer.js");
  const milF = sessionFor(kb, "military", "beginner", { sex: "female" });
  if (!/Планка 15 с/.test(milF[0] || "")) throw new Error(`female military ${milF[0]}`);
  const milM = sessionFor(kb, "military", "beginner", { sex: "male" });
  if (!/Планка 20 с/.test(milM[0] || "")) throw new Error(`male military ${milM[0]}`);
  const homeFemale = ["afrobeat", "stretch", "tai-chi", "chair-yoga", "core-mobility", "calisthenics"];
  for (const pid of homeFemale) {
    const f = sessionFor(kb, pid, "beginner", { sex: "female" });
    const m = sessionFor(kb, pid, "beginner", { sex: "male" });
    if (!Array.isArray(kb.sessions[pid]?.beginner_female)) throw new Error(`missing beginner_female ${pid}`);
    if (JSON.stringify(f) === JSON.stringify(m)) throw new Error(`female load same as male ${pid}`);
  }
  const afroF = sessionFor(kb, "afrobeat", "beginner", { sex: "female" });
  if (!/Крок на місці 1 хв/.test(afroF[0] || "")) throw new Error(`afrobeat female ${afroF[0]}`);
  const { buildSportRationPlan } = await import("./js/sport-survey.js");
  const planLose = buildSportRationPlan({
    kb,
    programId: "military",
    level: "beginner",
    dayISO: "2026-08-27",
    prefs: normalizeSurvey({ completedAt: "2026-08-27T00:00:00.000Z" }),
    profile: saved,
  });
  if (planLose.goal !== "cardio") throw new Error(`plan goal ${planLose.goal}`);
  if (!planLose.queries.some((q) => /вівсянка|рис|йогурт/.test(String(q.staple || q.q)))) {
    throw new Error(`plan lose staples ${JSON.stringify(planLose.queries)}`);
  }
  /* byBodyGoal: lose→cardio + yogurt; overlay after course (Mon fish → yogurt) */
  const { applyBodyGoalMealOverlay, resolveGoalMealMap } = await import("./js/composer.js");
  const loseMap = resolveGoalMealMap(kb, "strength", saved);
  if (loseMap.dinner?.title !== "Йогурт на вечір") throw new Error(`lose overlay dinner ${loseMap.dinner?.title}`);
  if (!loseMap.dinner?.staples?.includes("йогурт")) throw new Error("lose overlay yogurt staple");
  const loseMon = resolveGoalMealMap(kb, "strength", saved, { dayISO: "2026-08-24" });
  if (loseMon.dinner?.title !== "Йогурт на вечір") {
    throw new Error(`lose+course dinner should stay yogurt got ${loseMon.dinner?.title}`);
  }
  const gainSaved = { ...saved, bodyGoal: "gain", sex: "male" };
  const gainMap = resolveGoalMealMap(kb, "military", gainSaved);
  if (gainMap.dinner?.title !== "Риба з салатом") throw new Error(`gain overlay ${gainMap.dinner?.title}`);
  const plain = applyBodyGoalMealOverlay(kb.mealMaps.cardio, "");
  if (plain.dinner?.title !== "Риба з салатом") throw new Error("no overlay passthrough");
  /* byCookMode.ready — culinary mealMap wins after bodyGoal */
  const { applyCookModeMealOverlay } = await import("./js/composer.js");
  const readyMap = resolveGoalMealMap(kb, "cardio", saved, { cookMode: "ready", dayISO: "2026-08-27" });
  if (readyMap.lunch?.title !== "Курка гриль · кулінарія") {
    throw new Error(`ready lunch ${readyMap.lunch?.title}`);
  }
  if (!readyMap.lunch?.staples?.includes("готова курка з кулінарії")) {
    throw new Error(`ready lunch staples ${JSON.stringify(readyMap.lunch?.staples)}`);
  }
  if (readyMap.dinner?.title !== "Салат овочевий · кулінарія") {
    throw new Error(`ready dinner ${readyMap.dinner?.title}`);
  }
  const cookMap = resolveGoalMealMap(kb, "cardio", saved, { cookMode: "cook", dayISO: "2026-08-27" });
  if (/кулінар/i.test(String(cookMap.lunch?.title || ""))) {
    throw new Error(`cook mode should stay grocery got ${cookMap.lunch?.title}`);
  }
  const planReady = buildSportRationPlan({
    kb,
    programId: "afrobeat",
    level: "beginner",
    dayISO: "2026-08-27",
    prefs: normalizeSurvey({ completedAt: "2026-08-27T00:00:00.000Z", cookMode: "ready" }),
    profile: saved,
  });
  if (!planReady.queries.some((q) => /готова курка з кулінарії|овочевий салат з кулінарії/.test(String(q.staple || q.q)))) {
    throw new Error(`plan ready culinary ${JSON.stringify(planReady.queries)}`);
  }
  const passthroughCook = applyCookModeMealOverlay(kb.mealMaps.cardio, "cook");
  if (passthroughCook.lunch?.title !== "Рис з овочами") throw new Error("cookMode cook passthrough");
  /* Culinary staple match + fixture fill */
  const {
    nameMatchesQuery,
    searchKeys,
    foodKind,
  } = await import("./js/staples.js");
  if (!nameMatchesQuery("Курка гриль, кулінарія", "готова курка з кулінарії")) {
    throw new Error("culinary chicken name match");
  }
  if (!nameMatchesQuery("Салат овочевий, кулінарія", "овочевий салат з кулінарії")) {
    throw new Error("culinary salad name match");
  }
  const chickenKeys = searchKeys("готова курка з кулінарії");
  if (!chickenKeys.some((k) => /гриль|кулінар/i.test(k))) throw new Error(`chicken keys ${chickenKeys}`);
  if (foodKind("Курка гриль, кулінарія", "готова курка з кулінарії") !== "ready") {
    throw new Error("culinary chicken kind");
  }
  const { resolveQueries, fillMissingLinesFromFixture } = await import("./js/resolver.js");
  const { readFileSync } = await import("node:fs");
  const shelf = JSON.parse(readFileSync(new URL("./content/shelf.json", import.meta.url), "utf8"));
  const culinaryQs = [
    { q: "готова курка з кулінарії", staple: "готова курка з кулінарії", role: "lunch:готова", group: "lunch" },
    { q: "овочевий салат з кулінарії", staple: "овочевий салат з кулінарії", role: "dinner:салат", group: "dinner" },
  ];
  const fix = resolveQueries(culinaryQs, shelf);
  if (fix.lines.some((l) => l.status !== "found")) throw new Error(`fixture culinary ${JSON.stringify(fix.lines)}`);
  const mcpMiss = {
    lines: culinaryQs.map((q) => ({
      role: q.role,
      wanted: q.staple,
      staple: q.staple,
      name: q.q,
      status: "missing",
      price: null,
      note: "немає SKU з назвою як запит",
    })),
    totals: { min: 0, max: 0 },
  };
  const filled = fillMissingLinesFromFixture(mcpMiss, fix);
  if (filled.lines.some((l) => l.status !== "found")) throw new Error(`fill culinary ${JSON.stringify(filled.lines)}`);
  if (!filled.lines.every((l) => /кулінар|гриль|салат/i.test(l.name || ""))) {
    throw new Error(`fill names ${filled.lines.map((l) => l.name)}`);
  }
}

{
  /* Epic 5.3 — walk step target prefs (goal, not pedometer) */
  const { clampWalkSteps, loadWalkSteps, saveWalkSteps, WALK_STEP_PRESETS, WALK_STEPS_KEY } =
    await import("./js/walk-prefs.js");
  if (clampWalkSteps(50) !== 1000 || clampWalkSteps(99999) !== 20000) throw new Error("clampWalkSteps bounds");
  if (WALK_STEP_PRESETS.join(",") !== "4000,6000,8000") throw new Error("WALK_STEP_PRESETS");
  const mem = {
    _m: new Map(),
    getItem(k) {
      return this._m.has(k) ? this._m.get(k) : null;
    },
    setItem(k, v) {
      this._m.set(k, String(v));
    },
  };
  if (loadWalkSteps(mem) !== 6000) throw new Error("walk default");
  if (saveWalkSteps(8000, mem) !== 8000) throw new Error("walk save");
  if (loadWalkSteps(mem) !== 8000) throw new Error("walk load");
  if (!mem.getItem(WALK_STEPS_KEY)) throw new Error("walk key missing");
  const sportIntent = emptyIntent("sport");
  sportIntent.constraints.programId = "asian-walk";
  sportIntent.constraints.steps = 4000;
  const walk4k = compose(sportIntent, kb);
  const w = walk4k.variants?.find((v) => v.id === "walk");
  if (!/≈ 4000/.test(w?.title || "")) throw new Error(`walk title ${w?.title}`);
  if (!/Ціль/.test(w?.title || "")) throw new Error(`walk rename ${w?.title}`);
  if (!/телефон/i.test(w?.text || "")) throw new Error("walk honesty text");
}

{
  /* Walk map — OSRM foot geometry (fallback straight) */
  const { fetchFootRoute, haversineM } = await import("./js/mcp/walk-map.mjs");
  const a = { lat: 50.433, lng: 30.48 };
  const b = { lat: 50.44, lng: 30.49 };
  const route = await fetchFootRoute(a, b);
  if (!Array.isArray(route.coordinates) || route.coordinates.length < 2) {
    throw new Error("foot route coords");
  }
  if (!Number.isFinite(route.distanceM) || route.distanceM <= 0) throw new Error("foot route distance");
  if (route.source === "straight") {
    const expect = Math.round(haversineM(a, b));
    if (route.distanceM !== expect) throw new Error("straight distance mismatch");
  } else if (route.source !== "osrm") {
    throw new Error(`unexpected route source ${route.source}`);
  }
}

{
  /* Epic 5.2 — per-meal stove cook tags */
  if (normalizeMealCook("cook") !== "cook" || normalizeMealCook("ready") !== "ready") {
    throw new Error("normalizeMealCook");
  }
  if (mealCookChipUa("cook") !== "плита" || mealCookChipUa("ready") !== "готове") {
    throw new Error("mealCookChipUa");
  }
  if (kb.mealMaps.strength.breakfast.cook !== "cook" || kb.mealMaps.strength.dinner.cook !== "ready") {
    throw new Error("kb strength cook tags");
  }
  const qs = sportShopQueriesFromMealMap(kb.mealMaps.strength);
  const egg = qs.find((q) => q.staple === "яйця");
  const yogurt = qs.find((q) => q.staple === "йогурт");
  if (egg?.cook !== "cook") throw new Error(`query cook egg ${egg?.cook}`);
  if (yogurt?.cook !== "ready") throw new Error(`query cook yogurt ${yogurt?.cook}`);
  const { resolveQueries } = await import("./js/resolver.js");
  const resolved = resolveQueries(qs.slice(0, 2), { sku: { яйця: { name: "Яйця С0", price: 40, status: "found" } }, branchLabel: "t" });
  if (resolved.lines[0]?.cook !== "cook") throw new Error(`resolve cook ${resolved.lines[0]?.cook}`);
}

{
  /* Epic 5.5 — meal recipe howto (ingredients + плита) */
  const { mealRecipeHowtoHtml, mealServeNoteHtml, resolveMealRecipeSteps, resolveMealServeNote } =
    await import("./js/meal-howto.js");
  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const oats = resolveMealRecipeSteps("Вівсянка на молоці");
  if (!oats || oats.length < 2) throw new Error("resolveMealRecipeSteps oats");
  const egg = resolveMealRecipeSteps("Омлет");
  if (!egg?.length) throw new Error("resolveMealRecipeSteps omlet");
  if (resolveMealRecipeSteps("Йогурт")) throw new Error("yogurt must not have recipe");
  const kbSteps = resolveMealRecipeSteps("X", { recipe: { steps: ["Крок один", "Крок два"] } });
  if (kbSteps?.length !== 2) throw new Error("kb recipe steps");
  const html = mealRecipeHowtoHtml(oats, esc);
  if (!html.includes("meal-recipe-howto") || !html.includes("Як готувати")) {
    throw new Error("mealRecipeHowtoHtml markup");
  }
  if (html.includes("open")) throw new Error("recipe must be closed by default");
  if (mealRecipeHowtoHtml([], esc)) throw new Error("empty steps");
  const courseGaps = [
    "Гречка з куркою",
    "Курка й овочі",
    "Овочі з цибулею",
    "Пара овочів",
    "Салат з рибою",
  ];
  for (const title of courseGaps) {
    if (!resolveMealRecipeSteps(title)?.length) throw new Error(`recipe gap ${title}`);
  }
  const readyNote = resolveMealServeNote("Йогурт на вечір");
  if (!readyNote.includes("охолодженим")) throw new Error("yogurt serve note");
  const saladNote = resolveMealServeNote("Зелений салат");
  if (!saladNote.includes("Промити")) throw new Error("salad serve note");
  const serveHtml = mealServeNoteHtml(readyNote, esc);
  if (!serveHtml.includes("meal-recipe-ready-note")) throw new Error("serve note html");
  if (mealRecipeHowtoHtml(resolveMealRecipeSteps("Вівсянка"), esc).includes("meal-recipe-ready-note")) {
    throw new Error("cook dish must not get serve note via howto");
  }
}

{
  /* Epic 5.4 — week-course title overlay (staples unchanged; soft-hop safe) */
  if (weekdayIndexFromDayISO("2026-08-24") !== 0) throw new Error("weekday Mon");
  if (weekdayIndexFromDayISO("2026-08-25") !== 1) throw new Error("weekday Tue");
  const strengthMap = kb.mealMaps.strength;
  if (!Array.isArray(strengthMap.course) || strengthMap.course.length !== 7) {
    throw new Error(`course len ${strengthMap.course?.length}`);
  }
  const mon = pickMealMapForDay(strengthMap, "2026-08-24");
  const tue = pickMealMapForDay(strengthMap, "2026-08-25");
  if (mon.breakfast?.title !== "Яєчня") throw new Error(`mon breakfast ${mon.breakfast?.title}`);
  if (tue.breakfast?.title !== "Омлет") throw new Error(`tue breakfast ${tue.breakfast?.title}`);
  if (mon.breakfast?.title === tue.breakfast?.title) throw new Error("Mon/Tue titles must differ");
  const monStaples = JSON.stringify(mon.breakfast?.staples);
  const tueStaples = JSON.stringify(tue.breakfast?.staples);
  if (monStaples !== JSON.stringify(["яйця", "масло"])) throw new Error(`mon staples ${monStaples}`);
  if (tueStaples !== monStaples) throw new Error(`tue staples drifted ${tueStaples}`);
  if (mon.breakfast?.cook !== "cook" || tue.breakfast?.cook !== "cook") {
    throw new Error("course must keep base cook");
  }
  const noCourse = pickMealMapForDay({ breakfast: { title: "X", staples: ["a"] } }, "2026-08-25");
  if (noCourse.breakfast?.title !== "X" || noCourse.course) throw new Error("no-course passthrough");
  const strengthStaples = mealMapStaples(kb, "military");
  if (strengthStaples.includes("course")) throw new Error("mealMapStaples leaked course key");
  if (!strengthStaples.includes("яйця") || !strengthStaples.includes("курка")) {
    throw new Error(`mealMapStaples missing ${JSON.stringify(strengthStaples)}`);
  }
  const cardioMon = pickMealMapForDay(kb.mealMaps.cardio, "2026-08-24");
  const cardioTue = pickMealMapForDay(kb.mealMaps.cardio, "2026-08-25");
  if (cardioMon.breakfast?.title !== "Вівсянка на молоці") throw new Error(`cardio mon ${cardioMon.breakfast?.title}`);
  if (cardioTue.breakfast?.title !== "Вівсянка") throw new Error(`cardio tue ${cardioTue.breakfast?.title}`);
  if (JSON.stringify(cardioMon.breakfast?.staples) !== JSON.stringify(cardioTue.breakfast?.staples)) {
    throw new Error("cardio staples drifted");
  }
  const mobMon = pickMealMapForDay(kb.mealMaps.mobility, "2026-08-24");
  const mobTue = pickMealMapForDay(kb.mealMaps.mobility, "2026-08-25");
  if (mobMon.breakfast?.title !== "Йогурт") throw new Error(`mob mon ${mobMon.breakfast?.title}`);
  if (mobTue.breakfast?.title !== "Йогурт з ягодами") throw new Error(`mob tue ${mobTue.breakfast?.title}`);
  if (JSON.stringify(mobMon.lunch?.staples) !== JSON.stringify(["салат", "зелень"])) {
    throw new Error(`mob lunch staples ${JSON.stringify(mobMon.lunch?.staples)}`);
  }
  if (mealMapStaples(kb, "afrobeat").includes("course")) throw new Error("cardio staples leaked course");
  if (mealMapStaples(kb, "stretch").includes("course")) throw new Error("mobility staples leaked course");
}

{
  const {
    getContentSourcePack,
    mergeKbWithContentSource,
    saveActiveContentSourceId,
    loadActiveContentSourceId,
    resolveActiveContentSource,
  } = await import("./js/content-source.js");
  const pack = getContentSourcePack("fixture_chef_demo");
  if (!pack?.mealMaps?.strength?.lunch) throw new Error("chef fixture missing");
  const merged = mergeKbWithContentSource(kb, pack);
  if (merged.mealMaps.strength.lunch.title !== "Гречка з овочами") {
    throw new Error(`merge lunch ${merged.mealMaps.strength.lunch.title}`);
  }
  if (!/фікстура/i.test(merged.mealMapNotes.strength || "")) {
    throw new Error(`merge notes ${merged.mealMapNotes.strength}`);
  }
  const mem = {
    _m: new Map(),
    getItem(k) {
      return this._m.has(k) ? this._m.get(k) : null;
    },
    setItem(k, v) {
      this._m.set(k, String(v));
    },
    removeItem(k) {
      this._m.delete(k);
    },
  };
  saveActiveContentSourceId("fixture_chef_demo", mem);
  if (loadActiveContentSourceId(mem) !== "fixture_chef_demo") throw new Error("LS save partner");
  const active = resolveActiveContentSource(mem);
  const pid = kb.programs?.find((p) => p.goal === "strength")?.id || "military";
  const plan = buildSportRationPlan({
    kb: merged,
    programId: pid,
    level: "beginner",
    dayISO: "2026-08-26",
    prefs: normalizeSurvey({}),
    partnerId: active.id,
    contentPack: active.pack,
  });
  if (plan.source !== "partner_fixture" || plan.partnerId !== "fixture_chef_demo") {
    throw new Error(`partner plan ${JSON.stringify(plan)}`);
  }
  if (!plan.queries.some((q) => String(q.staple || q.q).includes("гречка"))) {
    throw new Error(`partner queries ${JSON.stringify(plan.queries)}`);
  }
  saveActiveContentSourceId(null, mem);
  if (loadActiveContentSourceId(mem) != null) throw new Error("LS clear partner");
}

{
  const {
    bulkAddToastCopy,
    createSportHandoff,
    dayPlanSourceSuffix,
    mealLineToExpressPick,
    pantryNudgeOptsForHandoff,
    partnerSnapDrift,
    resolveSportDayExtra,
    shopHandoffBannerModel,
    sportRationPayloadFromMeal,
  } = await import("./js/sport-handoff.js");
  const handoff = createSportHandoff({
    programId: "military",
    kb,
    intentSport: sport,
    dayISO: "2026-08-27",
    now: 1,
  });
  if (handoff.title !== "Військові тренування" || handoff.programId !== "military") {
    throw new Error(`createSportHandoff ${JSON.stringify(handoff)}`);
  }
  const { resolveSportProgramDisplay } = await import("./js/sport-handoff.js");
  const walkDisp = resolveSportProgramDisplay({
    kb,
    sportHandoff: { programId: "military", title: "stale" },
    intentSport: { constraints: { programId: "asian-walk" } },
    extraQueries: [{ from: "sport_day", programId: "asian-walk", role: "breakfast:oats" }],
  });
  if (walkDisp.programId !== "asian-walk" || walkDisp.title !== "Спокійна ходьба") {
    throw new Error(`resolveSportProgramDisplay extras ${JSON.stringify(walkDisp)}`);
  }
  const { normalizeShopGroupId } = await import("./js/groups.js");
  if (normalizeShopGroupId("clean") !== "extra") throw new Error("normalizeShopGroupId clean");
  if (groupMeta("clean").title !== "додатково / догляд") throw new Error("groupMeta clean merged");
  const opts = pantryNudgeOptsForHandoff({ sportHandoff: handoff, kb });
  if (!opts.preferSport || !opts.stapleAllowlist?.includes("яйця")) {
    throw new Error(`pantry opts ${JSON.stringify(opts)}`);
  }
  const { plan, resolveExtra } = resolveSportDayExtra({
    kb,
    intentSport: sport,
    confirmed: false,
    dayISO: "2026-08-27",
  });
  if (!resolveExtra.queriesOverride?.length || plan.programId !== "military") {
    throw new Error(`resolveSportDayExtra ${JSON.stringify({ plan, resolveExtra })}`);
  }
  if (dayPlanSourceSuffix("partner_fixture") !== " · інгредієнти") throw new Error("plan suffix partner");
  if (dayPlanSourceSuffix("survey_v0") !== " · фільтр смаків") throw new Error("plan suffix survey");
  const pick = mealLineToExpressPick({
    name: "Яйце",
    wanted: "яйця",
    price: 10,
    sku: { productId: "p1", slug: "egg" },
  });
  if (pick.name !== "Яйце" || pick.productId !== "p1") throw new Error(`meal pick ${JSON.stringify(pick)}`);
  const payload = sportRationPayloadFromMeal({ role: "breakfast:0", wanted: "яйця", sku: { productId: "p1" } }, "military");
  if (payload.programId !== "military" || payload.staple !== "яйця") {
    throw new Error(`ration payload ${JSON.stringify(payload)}`);
  }
  if (bulkAddToastCopy(2) !== "2 позицій додано в Express") throw new Error("bulk toast");
  const banner = shopHandoffBannerModel({
    sportHandoff: handoff,
    extraQueries: [{ from: "sport_day", q: "яйця", role: "add:1" }],
    vmLines: [],
    pantryNudge: null,
    pantryOpts: opts,
    receipts: [],
    loading: false,
    picker: null,
    browse: null,
  });
  if (!banner || !/З програми|Військові/.test(`${banner.lead} ${banner.copy}`)) {
    throw new Error(`banner ${JSON.stringify(banner)}`);
  }
  if (partnerSnapDrift("fixture_chef_demo", () => "fixture_chef_demo")) throw new Error("drift same");
  if (!partnerSnapDrift("fixture_chef_demo", () => null)) throw new Error("drift changed");
}

{
  const {
    buildMonthReportRiskyTopRows,
    copyUsesBannedWaste,
    toggleWasteLabel,
    isUserLabeledWaste,
    USER_WASTE_ROW_LABEL,
    SYSTEM_HEAVY_ROW_LABEL,
    loadWasteLabels,
  } = await import("./js/user-waste-labels.js");
  const mem = {
    _m: new Map(),
    getItem(k) {
      return this._m.has(k) ? this._m.get(k) : null;
    },
    setItem(k, v) {
      this._m.set(k, String(v));
    },
    removeItem(k) {
      this._m.delete(k);
    },
  };
  const heavy = { name: "Філе стегна курчат", uah: 900 };
  const rows0 = buildMonthReportRiskyTopRows({
    topItems: [heavy],
    goalUah: 5000,
    monthKey: "2026-07",
    labels: [],
  });
  if (rows0[0]?.k !== SYSTEM_HEAVY_ROW_LABEL || rows0[0]?.k.includes("Зайве")) {
    throw new Error(`unlabeled heavy ${JSON.stringify(rows0)}`);
  }
  if (!copyUsesBannedWaste("Зайве?")) throw new Error("ban should catch Зайве?");
  if (copyUsesBannedWaste(USER_WASTE_ROW_LABEL)) throw new Error("user label ok");
  toggleWasteLabel({ name: heavy.name, monthKey: "2026-07" }, mem);
  if (!isUserLabeledWaste(heavy.name, "2026-07", mem)) throw new Error("label not saved");
  const rows1 = buildMonthReportRiskyTopRows({
    topItems: [heavy],
    goalUah: 5000,
    monthKey: "2026-07",
    labels: loadWasteLabels(mem),
  });
  if (rows1[0]?.k !== USER_WASTE_ROW_LABEL) throw new Error(`labeled row ${JSON.stringify(rows1)}`);
  toggleWasteLabel({ name: heavy.name, monthKey: "2026-07" }, mem);
  if (isUserLabeledWaste(heavy.name, "2026-07", mem)) throw new Error("label should clear");
}

{
  const {
    shopDockCtaHtml,
    shopAssistZoneHtml,
    shopAssistInlineHtml,
    shopProgressMetrics,
    shopProgressStripHtml,
    shopProgramBlockHtml,
    shopSpendSplit,
    shopSplitBarTitle,
    shopSplitCaptionHtml,
    shopSplitMicroLegendParts,
    sportDayLineRoles,
  } = await import("./js/shop-ui.js");
  const zone = shopAssistZoneHtml({
    handoffHtml: '<div class="shop-sport-handoff">h</div>',
    pantryHtml: '<button class="shop-pantry-nudge" id="shop-pantry-nudge">p</button>',
  });
  if (!zone.includes("shop-assist-zone--dual") || !zone.includes("shop-pantry-nudge")) {
    throw new Error(`assist zone ${zone}`);
  }
  if (!zone.includes("shop-assist-zone--card")) throw new Error("assist card class");
  const inline = shopAssistInlineHtml({
    pantryHtml: '<button class="shop-pantry-nudge" id="shop-pantry-nudge">p</button>',
  });
  if (!inline.includes("shop-assist-zone--wallet-inline") || inline.includes("--card")) {
    throw new Error(`assist inline ${inline}`);
  }
  const shellStrip = shopProgressStripHtml({
    okCount: 1,
    totalCount: 1,
    sumLabel: "100",
    budgetLabel: "500",
    acceptPct: 100,
    budgetPct: 20,
    innerFooterHtml: '<div class="shop-controls shop-controls--wallet"></div>',
  });
  if (!/shop-progress__wallet-card--shell/.test(shellStrip)) throw new Error("wallet shell class");
  const cta = shopDockCtaHtml({ okCount: 5, sumLabel: "400" });
  if (!/dock-cta__sum/.test(cta) || !/Погодити 5/.test(cta)) throw new Error(`dock cta ${cta}`);
  const tightStrip = shopProgressStripHtml({
    okCount: 5,
    totalCount: 5,
    sumLabel: "950",
    budgetLabel: "1000",
    acceptPct: 100,
    budgetPct: 95,
    over: false,
  });
  if (!/shop-progress--tight/.test(tightStrip)) throw new Error("tight budget class");
  const m = shopProgressMetrics({ okCount: 3, totalCount: 5, sumUah: 400, budgetUah: 1000 });
  if (m.acceptPct !== 60 || m.budgetPct !== 40 || m.over) throw new Error(`progress metrics ${JSON.stringify(m)}`);
  const split = shopSpendSplit(
    [
      { envelope: "food", name: "Хліб", price: 50 },
      { envelope: "alcohol", name: "Пиво", price: 30 },
      { envelope: "food", name: "Сир", price: 20 },
    ],
    { monthKey: "2026-08", isUserWaste: (n) => n === "Сир" },
  );
  if (split.baseUah !== 50 || split.moodUah !== 30 || split.userWasteUah !== 20) {
    throw new Error(`spend split ${JSON.stringify(split)}`);
  }
  const strip = shopProgressStripHtml({
    okCount: 3,
    totalCount: 5,
    sumLabel: "400 ₴",
    budgetLabel: "1000 ₴",
    acceptPct: 60,
    budgetPct: 40,
    sportExtraN: 2,
    baseLabel: "350 ₴",
    moodLabel: "50 ₴",
    baseUah: 350,
    moodUah: 0,
    userWasteUah: 0,
  });
  if (
    !/shop-progress--inline/.test(strip) ||
    !/shop-progress--hero/.test(strip) ||
    !/shop-progress--premium/.test(strip) ||
    !/shop-progress--receipt/.test(strip) ||
    !/shop-progress__ticket-head/.test(strip) ||
    !/shop-progress__money-zone/.test(strip) ||
    !/shop-progress__wallet-card/.test(strip) ||
    !/shop-progress__accept-inline/.test(strip) ||
    !/shop-progress__bar--split/.test(strip) ||
    /shop-progress__legend--micro/.test(strip) ||
    /shop-progress__legend-item/.test(strip)
  ) {
    throw new Error(`strip ${strip}`);
  }
  const stripMood = shopProgressStripHtml({
    okCount: 5,
    totalCount: 5,
    sumLabel: "500 ₴",
    budgetLabel: "1000 ₴",
    acceptPct: 100,
    budgetPct: 50,
    baseLabel: "350 ₴",
    moodLabel: "150 ₴",
    baseUah: 350,
    moodUah: 150,
    userWasteUah: 0,
    whisperLine: "серпень · 11 797 ₴ · +18% vs минулий тиждень",
  });
  if (
    !/shop-progress__whisper-line/.test(stripMood) ||
    !/настрій/.test(stripMood) ||
    /shop-progress__split-caption/.test(stripMood) ||
    /shop-progress__legend--micro/.test(stripMood)
  ) {
    throw new Error(`strip mood ${stripMood}`);
  }
  const whisperIdx = stripMood.indexOf("shop-progress__whisper-line");
  const composeIdx = stripMood.indexOf("shop-progress__compose");
  if (whisperIdx < 0 || composeIdx < 0 || whisperIdx > composeIdx) {
    throw new Error("whisper must precede compose bar");
  }
  const barTitle = shopSplitBarTitle(
    { baseLabel: "350 ₴", moodLabel: "150 ₴" },
    { moodUah: 150, wasteUah: 0 },
  );
  if (!/потрібне 350 ₴/.test(barTitle) || !/настрій 150 ₴/.test(barTitle)) {
    throw new Error(`bar title ${barTitle}`);
  }
  if (shopSplitCaptionHtml({}, { moodUah: 0, wasteUah: 0 })) {
    throw new Error("caption should hide when mood and waste zero");
  }
  const legendParts = shopSplitMicroLegendParts(
    { baseLabel: "1 ₴", moodLabel: "2 ₴", wasteLabel: "3 ₴" },
    { baseUah: 1, moodUah: 0, wasteUah: 0 },
  );
  if (!/is-zero/.test(legendParts)) throw new Error("micro legend parts still exportable");
  const headerFixture = `<div class="shop-checkout-header">${strip}<div class="shop-assist-zone"></div></div>`;
  if (!/shop-checkout-header/.test(headerFixture)) throw new Error("checkout header fixture");
  const prog = shopProgramBlockHtml({ title: "Військові", count: 2, rowsHtml: "<article class='sku'>x</article>" });
  if (!/shop-program-block/.test(prog)) throw new Error(`program block ${prog}`);
  const roles = sportDayLineRoles([{ from: "sport_day", role: "add:1" }, { from: "browse", role: "x" }]);
  if (!roles.has("add:1") || roles.has("x")) throw new Error(`sport roles ${[...roles]}`);
}

{
  const { buildRecentBuyCandidates, shopMonthWhisper, shopRecentShelfHtml, shopWhisperLineHtml } = await import(
    "./js/shop-recent.js"
  );
  const { ordersToReceipts } = await import("./js/receipts.js");
  const fixtureOrders = JSON.parse(readFileSync(new URL("./content/fixture-orders.json", import.meta.url), "utf8"));
  const receipts = ordersToReceipts(fixtureOrders);
  const vm = {
    lines: [{ role: "x", name: "Хліб пшеничний", wanted: "хліб", staple: "хліб", status: "found", price: 28 }],
  };
  const dismissed = new Set(["молоко"]);
  const cands = buildRecentBuyCandidates(receipts, vm, dismissed, { cap: 8 });
  if (!cands.length) throw new Error("recent candidates empty");
  if (cands.some((c) => /хліб/i.test(c.name))) throw new Error("should skip checklist staple");
  if (cands.some((c) => c.key === "молоко")) throw new Error("should skip dismissed");
  const shelf = shopRecentShelfHtml(cands.slice(0, 3));
  if (!/shop-recent-shelf/.test(shelf) || !/<details/.test(shelf) || !/data-recent-add/.test(shelf)) {
    throw new Error(`shelf ${shelf.slice(0, 120)}`);
  }
  if (!/shop-recent-shelf__label/.test(shelf)) throw new Error("recent shelf label span");
  const whisper = shopMonthWhisper(receipts, { monthKey: "2026-08" });
  if (!whisper?.line || !/₴/.test(whisper.line)) throw new Error(`whisper ${JSON.stringify(whisper)}`);
  if (!whisper.trailDir) throw new Error("whisper trailDir expected for fixture");
  const wowHtml = shopWhisperLineHtml(whisper);
  if (!/shop-progress__whisper-wow--up/.test(wowHtml)) throw new Error(`wow html ${wowHtml}`);
}

{
  const shelf = JSON.parse(readFileSync(new URL("./content/shelf.json", import.meta.url), "utf8"));
  const { mealLineToExpressPick } = await import("./js/sport-handoff.js");
  const byStaple = resolveQueries(
    [
      {
        from: "sport_day",
        q: "Яйце «Ясенсвіт» С0 10 шт",
        staple: "яйця",
        role: "add:egg1",
        envelope: "food",
      },
    ],
    shelf,
  );
  if (byStaple.lines[0]?.status !== "found" || !byStaple.lines[0]?.image) {
    throw new Error(`resolve sport staple ${JSON.stringify(byStaple.lines[0])}`);
  }
  const pick = mealLineToExpressPick({ name: "Яйце", wanted: "яйця", price: 10, sku: { productId: "p1" } });
  if (pick.staple !== "яйця") throw new Error(`pick staple ${pick.staple}`);
}

console.log("pipeline ok", { sportLines: s.vm.lines.map((l) => l.status), shopSum: b.vm.totals.min, aQueries });
