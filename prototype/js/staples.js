/** Чек → короткий запит полиці. Повний SKU з чека не шукаємо. */

export const PREFERRED_A = ["молоко", "хліб", "яйця", "курка", "гель для душу"];

const RULES = [
  { id: "гель для душу", re: /гель\s*для\s*душ/i, envelope: "clean" },
  { id: "засіб для підлоги", re: /засіб для підлог|для підлоги/i, envelope: "clean" },
  { id: "пиво", re: /пив/i, envelope: "alcohol" },
  { id: "вино", re: /вин[оа]\b/i, envelope: "alcohol" },
  { id: "цигарки", re: /цигар|тютюн|iqos|стіки/i, envelope: "tobacco" },
  { id: "лаваш", re: /лаваш/i, envelope: "food" },
  { id: "хлібці", re: /хлібц/i, envelope: "food" },
  { id: "сметана", re: /сметан/i, envelope: "food" },
  { id: "майонез", re: /майонез/i, envelope: "food" },
  { id: "олія", re: /олія|оливков/i, envelope: "food" },
  { id: "консервація", re: /маринов|солен[іі]|солоні|консерв|пастер/i, envelope: "food" },
  { id: "хумус", re: /хумус|фалафел/i, envelope: "food" },
  { id: "свинина", re: /свин/i, envelope: "food" },
  { id: "яловичина", re: /ялови/i, envelope: "food" },
  { id: "морепродукти", re: /кревет|міді|кальмар|морепродукт/i, envelope: "food" },
  { id: "картопля", re: /картопл/i, envelope: "food" },
  { id: "цибуля", re: /цибул/i, envelope: "food" },
  { id: "часник", re: /часник/i, envelope: "food" },
  { id: "морква", re: /моркв/i, envelope: "food" },
  { id: "огірок", re: /огір/i, envelope: "food" },
  { id: "помідор", re: /помідор|томат/i, envelope: "food" },
  { id: "зелень", re: /кріп|петрушк|кінз|зелень/i, envelope: "food" },
  { id: "яйця", re: /яйц/i, envelope: "food" },
  { id: "масло", re: /вершков\w*\s*масло|масло\s*вершков|селянськ\w*\s*масло|(^|[^а-яіїєґ])масло(?!\s*риб)(?!\s*какао)/i, envelope: "food" },
  { id: "молоко", re: /молоко/i, envelope: "food" },
  { id: "хліб", re: /хліб|(^|[^а-яіїєґ])батон(?!чик)([^а-яіїєґ]|$)/i, envelope: "food" },
  { id: "курка", re: /курк|куряч|курчат/i, envelope: "food" },
  { id: "гречка", re: /гречк|гречан/i, envelope: "food" },
  { id: "йогурт", re: /йогурт/i, envelope: "food" },
  { id: "рис", re: /рис(?!инк)|рисов/i, envelope: "food" },
  { id: "овочі", re: /огір|помідор|овоч/i, envelope: "food" },
  { id: "салат", re: /салат/i, envelope: "food" },
  /* Align with groups.js pro:fish — avoid ікра/палички via score demotions. */
  { id: "риба", re: /хек|сьомг|лосос|скумбр|оселед|тунец|тунець|форель|риб(?!н)/i, envelope: "food" },
  { id: "вівсянка", re: /вівсян|овсян|granola|м['’]?юслі|мюслі/i, envelope: "food" },
];

export function envelopeOf(q) {
  const hit = RULES.find((r) => r.id === q);
  return hit?.envelope || "food";
}

const FOOD_STAPLES = new Set(RULES.filter((r) => r.envelope === "food").map((r) => r.id));

export function toStaple(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  if (/пакет/i.test(s) && /сільпо|пакет/i.test(s)) return null;
  if (RULES.some((r) => r.id === s)) return s;
  const vegIds = new Set(["картопля", "цибуля", "часник", "морква", "огірок", "помідор", "зелень", "овочі", "салат"]);
  const vegSkip = /пряник|печив|торт|кекс|вафл|імбир|зайчик|цукер|сік|соус|паст/i;
  const hit = RULES.find((r) => {
    if (r.id === "хліб" && /квас|паличк|гріссін|тости|ігрист|cava|батончик/i.test(s)) return false;
    if (r.id === "курка" && /турка|сосиск|ковбас|плов|для котів|для собак|club 4/i.test(s)) return false;
    if (r.id === "риба" && /ікра|паличк|котлет|масло|корм|для котів|для собак/i.test(s)) return false;
    if (r.id === "масло" && /олія|рибн|какао|кокос|маргарин|спред/i.test(s)) return false;
    if (r.id === "овочі" && /ніж|приправ|вода|сік|voss/i.test(s)) return false;
    if (vegIds.has(r.id) && vegSkip.test(s)) return false;
    return r.re.test(s);
  });
  return hit ? hit.id : null;
}

export function stem(q) {
  const k = String(q).toLowerCase();
  if (k.includes("гель")) return "гель";
  if (k.length <= 6) return k;
  return k.slice(0, 4);
}

export function nameMatchesQuery(name, q) {
  const n = String(name || "");
  const k = String(q || "").trim();
  if (!n || !k) return false;
  /* Long culinary staples — not in RULES (would pollute toStaple → курка). */
  if (k === "готова курка з кулінарії") {
    return /курка\s*гриль|гриль.*курка|курка.*кулінар|готова\s*курка/i.test(n);
  }
  if (k === "овочевий салат з кулінарії") {
    return /салат\s*овоч|овоч\w*\s*салат|салат.*кулінар/i.test(n);
  }
  const rule = RULES.find((r) => r.id === k);
  if (rule) {
    if (k === "риба" && /ікра|паличк|котлет|масло\s*риб|корм|для котів|для собак/i.test(n)) return false;
    return rule.re.test(n);
  }
  const lower = n.toLowerCase();
  const qn = k.toLowerCase();
  if (lower.includes(qn)) return true;
  return lower.includes(stem(k));
}

export function searchKeys(q) {
  const extra = {
    хліб: ["цар-хліб", "кулиничі"],
    овочі: ["огірок", "помідор"],
    яйця: ["яйце", "яйця курячі", "яйця с1"],
    "гель для душу": ["гель душ"],
    молоко: ["молоко 2.5"],
    йогурт: ["йогурт питний", "йогурт натуральний", "грецький йогурт"],
    масло: ["масло вершкове", "масло селянське 73%", "масло 82%"],
    гречка: ["гречка", "крупа гречана"],
    вівсянка: ["вівсянка", "вівсяні пластівці", "каша вівсяна", "м'юслі"],
    рис: ["рис круглий", "рис довгий", "рис пропарений"],
    риба: ["філе хека", "лосось", "скумбрія", "оселедець"],
    курка: ["епікур", "філе епікур", "філе курчат"],
    "готова курка з кулінарії": ["курка гриль", "курка кулінарія", "готова курка"],
    "овочевий салат з кулінарії": ["салат овочевий", "овочевий салат", "салат кулінарія"],
    пиво: ["пиво світле", "пиво 0.5"],
    вино: ["вино сухе"],
    майонез: ["майонез торчин", "провансаль"],
    хумус: ["хумус", "фалафель"],
    зелень: ["кріп", "петрушка"],
    консервація: ["огірки мариновані", "огірки верес"],
  };
  const base = String(q || "").trim();
  const parts = base
    .split(/\s*[+&,/]\s*|\s+і\s+|\s+та\s+/)
    .map((s) => s.replace(/^з\s+/i, "").trim())
    .filter((s) => s.length >= 3);
  return [...new Set([base, ...parts, ...(extra[base] || [])])];
}

function normName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/«»"™®/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const FRESH_VEG = new Set(["овочі", "помідор", "огірок", "морква", "картопля", "цибуля", "часник", "зелень", "салат"]);
const VEG_JUNK =
  /пряник|печив|торт|кекс|вафл|імбир|зайчик|цукер|вода|сік|газован|voss|лимонад|ніж|приправ|рагу/i;
const VEG_PRESERVE = /марин|консерв|солен|солоні|пастер|в['’]?ялен|київкраут|bread\s*&\s*butter|ікра/i;

/** raw | ready | fresh | preserved | loaf | other */
export function foodKind(name, staple) {
  const n = String(name || "");
  if (staple === "готова курка з кулінарії" || staple === "овочевий салат з кулінарії") {
    if (/кулінар|гриль|салат\s*овоч|овоч\w*\s*салат/i.test(n)) return "ready";
    return "other";
  }
  if (staple === "курка") {
    if (/garde|mexican|гриль|кулінар|томлен|нагет|паштет|салат|галантин|м'ясторія/i.test(n)) return "ready";
    if (/філе|стегн|тушк|охолодж|фарш|крил|четвертин|ціла кур/i.test(n)) return "raw";
  }
  if (FRESH_VEG.has(staple) || staple === "консервація") {
    if (VEG_JUNK.test(n)) return "other";
    if (VEG_PRESERVE.test(n)) return "preserved";
    if (/огір|помідор|томат|моркв|цибул|картопл|капуст|салат|зелен|часник/i.test(n)) return "fresh";
  }
  if (staple === "хліб") {
    if (/квас|тости|гріссін|паличк/i.test(n)) return "other";
    if (/батончик|протеїн|lifebar/i.test(n)) return "other";
    if (/(^|[^а-яіїєґ])батон(?!чик)|наріз|житн|пшеничн|сільпо хліб|хліб /i.test(n) && !/ковбас|салям/i.test(n)) return "loaf";
  }
  return "other";
}

export function preferredKind(freq, staple) {
  const counts = {};
  for (const [name, n] of Object.entries(freq || {})) {
    if (toStaple(name) !== staple) continue;
    const k = foodKind(name, staple);
    if (k === "other") continue;
    counts[k] = (counts[k] || 0) + Number(n || 0);
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : null;
}

export function historyNamesForStaple(freq, staple) {
  return Object.entries(freq || {})
    .filter(([name]) => toStaple(name) === staple)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

/** Brand tokens first — full receipt titles often return empty from find_products_batch. */
export function historySearchKeys(freq, staple) {
  const names = historyNamesForStaple(freq, staple).slice(0, 5);
  const tokens = [];
  for (const name of names) {
    const d = distinctiveTokens(normName(name));
    if (d.length >= 2) tokens.push(`${d[0]} ${d[1]}`);
    else if (d[0]) tokens.push(d[0]);
  }
  return [...new Set([...tokens, ...names])].slice(0, 6);
}

/** Per-staple search strings: my SKUs/brands + always base staple (hist tokens alone miss shelf). */
export function searchKeysForStaple(freq, staple) {
  const hist = historyNamesForStaple(freq, staple);
  const base = searchKeys(staple);
  if (!hist.length) return base;
  return [...new Set([...historySearchKeys(freq, staple), ...base])].slice(0, 8);
}

/** Round-robin keys so late staples (пиво) are not dropped by batch maxItems 30. */
export function buildBatchQueries(shopQueries, historyFreq, max = 30) {
  const rows = (Array.isArray(shopQueries) ? shopQueries : [])
    .filter((q) => !String(q?.role || "").startsWith("add:"))
    .map((q) => {
    const staple = q.staple || q.role || q.q;
    return { q, keys: searchKeysForStaple(historyFreq, staple).slice(0, 4) };
  });
  const products = [];
  const mapRole = [];
  const seen = new Set();
  const maxDepth = Math.max(0, ...rows.map((r) => r.keys.length));
  for (let depth = 0; depth < maxDepth; depth++) {
    for (const row of rows) {
      const k = row.keys[depth];
      if (!k) continue;
      mapRole.push({ q: row.q, k });
      const id = String(k).toLowerCase();
      if (seen.has(id) || products.length >= max) continue;
      seen.add(id);
      products.push(k);
    }
  }
  return { products, mapRole };
}

export function scoreProduct(product, { staple, freq = {}, kind = null, priceMin = null, priceMax = null, hint = null, allowCatalogFallback = false } = {}) {
  const name = product?.name || product?.title || "";
  if (staple === "хліб" && /ковбас|салям|сосиск|балик|квас|тости|ігрист|cava|вино|батончик|протеїн|lifebar|кеш.?ю|карамел|кавою|шоколад/i.test(name)) return -1;
  if (staple === "курка" && /сосиск|ковбас|гільдія|котів|собак|ласощі|club 4|кішок|турка|корм/i.test(name)) return -1;
  if (staple === "риба" && /ікра|паличк|котлет|масло риб|корм|для котів|для собак/i.test(name)) return -1;
  if (staple === "масло" && /олія|рибн|какао|кокос|маргарин|спред/i.test(name)) return -1;
  if ((FRESH_VEG.has(staple) || staple === "овочі") && VEG_JUNK.test(name)) return -1;
  if (FRESH_VEG.has(staple) && VEG_PRESERVE.test(name)) return -1;
  /* Food staples: reject décor / candles / toys that substring-match (яйце-свічка). */
  if (
    FOOD_STAPLES.has(staple) &&
    /свічк|світил|декор|сувенір|іграшк|посуд|ароматич|великоднь|пасхальн|формі яйц/i.test(name)
  ) {
    return -1;
  }
  if (staple === "яйця" && /свічк|декор|сувенір|іграшк|посуд|великоднь|пасхальн|формі яйц|bolsius|білок яєчн/i.test(name)) {
    return -1;
  }
  if (
    staple === "йогурт" &&
    /десертн|дитяч|для дітей|від\s*\d+\s*місяц|snack|батончик|цукер|морозин|агуня|коктейль молочн/i.test(name)
  ) {
    return -1;
  }
  const matchesStaple = nameMatchesQuery(name, staple);
  if (!matchesStaple) return -1;
  const hintQ = String(hint || "").trim();
  if (hintQ && hintQ !== staple && !nameMatchesQuery(name, hintQ)) return -1;
  const n = normName(name);
  let s = 0;
  let histHit = false;
  for (const [hName, count] of Object.entries(freq)) {
    if (toStaple(hName) !== staple) continue;
    const hn = normName(hName);
    if (!hn) continue;
    const add = historyNameScore(n, hn, Number(count || 1));
    if (add > 0) {
      s += add;
      histHit = true;
    }
  }
  const histNames = historyNamesForStaple(freq, staple);
  const brandHit = histNames.some((hn) =>
    distinctiveTokens(normName(hn)).some((b) => n.includes(b)),
  );
  if (histNames.length && !histHit && !brandHit) return -1;
  const k = foodKind(name, staple);
  if (staple === "хліб" && k !== "loaf") return -1;
  if (kind && k === kind) s += 50;
  if (kind && k !== kind) s -= 40;
  if (kind === "raw" && k === "ready") s -= 80;
  if (kind === "fresh" && k === "preserved") s -= 50;
  if (!kind && staple === "курка" && k === "raw") s += 25;
  if (!kind && staple === "риба" && /філе|хек|лосос|сьомг|скумбр|оселед|тунец|тунець|форель/i.test(name)) s += 25;
  if (!kind && FRESH_VEG.has(staple) && k === "fresh") s += 25;
  if (staple === "консервація" && k !== "preserved") return -1;
  if (staple === "консервація" && k === "preserved") s += 25;
  if (staple === "йогурт" && /питн|натуральн|грецьк|без добавок|classic|класичн|білий|plain/i.test(name)) s += 28;
  /* Soft demote flavored yogurt — still fallback if pool is fruit-only. */
  if (
    staple === "йогурт" &&
    /полуниц|вишн|персик|банан|чорниц|лохина|малин|ківі|манго|маракуй|смак |з\s+добавк|наповнювач|двошаров|фруктов/i.test(
      name,
    )
  ) {
    s -= 22;
  }
  const topName = historyNamesForStaple(freq, staple)[0];
  if (topName) {
    const brands = distinctiveTokens(normName(topName));
    if (brands.some((b) => n.includes(b))) s += 200;
  }
  /* Soft stock when catalog fallback: show SKU over empty «немає» for sport/no-hist. */
  if (product?.available === false) s -= allowCatalogFallback ? 4 : 25;
  if (matchesStaple) s += 5;
  const price = typeof product?.price === "number" ? product.price : Number(product?.price);
  if (Number.isFinite(price) && priceMin && price < priceMin * 0.7) s -= 40;
  if (Number.isFinite(price) && priceMax && price > priceMax) s -= 70;
  if (Number.isFinite(price) && priceMax && price > priceMax * 1.8) return -1;
  return s;
}

const GENERIC_TOKEN =
  /^(батон|хліб|філе|куряче|курячий|курячі|огірок|огірки|звичайний|половинка|столичний|гірчичний|пшеничний|нарізаний|нарізний|охолоджене|органічн\w*|екстра|пиво|вино|світле|темне|нефільтроване|фільтроване|original|мультипак|безалкогольн\w*|безалкогольн\w*)$/i;

function distinctiveTokens(s) {
  return String(s)
    .split(/[\s,./«»"™®]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !GENERIC_TOKEN.test(t));
}

function historyNameScore(productName, histName, count) {
  if (productName === histName) return 120 * count;
  if (histName.length >= 8 && (productName.includes(histName) || histName.includes(productName))) return 100 * count;
  const filler = /нарізаний|нарізний|нарізан|малий|лоток|охолоджене|охолоджен\w*|стериліз\w*|упаковк\w*/g;
  const toks = (s) =>
    s
      .replace(filler, " ")
      .split(/[\s,./«»"™®]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 4);
  const ta = new Set(toks(productName));
  const tb = toks(histName).filter((t) => !GENERIC_TOKEN.test(t));
  if (!tb.length) return 0;
  let hits = 0;
  for (const t of tb) {
    if (ta.has(t)) hits += 1;
  }
  if (hits === 0) return 0;
  return 25 * hits * count;
}

export function rankProducts(list, ctx) {
  return (Array.isArray(list) ? list : [])
    .map((p) => ({ p, s: scoreProduct(p, ctx) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);
}

export function pickMatchingProduct(list, q, ctx = {}) {
  const staple = ctx.staple || q;
  const freq = ctx.freq || {};
  const kind = ctx.kind !== undefined ? ctx.kind : preferredKind(freq, staple);
  const hasHist = historyNamesForStaple(freq, staple).length > 0;
  const priceMin = ctx.priceMin;
  const priceMax = ctx.priceMax;
  const hint = ctx.hint || null;
  const allowCatalogFallback = Boolean(ctx.allowCatalogFallback);
  const scoreCtx = { staple, freq, kind, priceMin, priceMax, hint, allowCatalogFallback };
  const ranked = rankProducts(list, scoreCtx);
  if (ranked[0]) return ranked[0];
  if (hasHist && !allowCatalogFallback) return null;
  if (kind && ctx.allowKindFallback) {
    return rankProducts(list, { ...scoreCtx, freq: hasHist ? {} : freq, kind: null })[0] || null;
  }
  if (!hasHist) return rankProducts(list, { ...scoreCtx, kind: null })[0] || null;
  return rankProducts(list, { ...scoreCtx, freq: {}, kind: null })[0] || null;
}
