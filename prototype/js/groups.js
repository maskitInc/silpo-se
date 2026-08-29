/** Meal-group slots from receipts. One SKU per slot, many slots per group. */

const DAY = 86400000;

export const GROUPS = [
  { id: "breads", title: "хліб / лаваш / хлібці" },
  { id: "protein", title: "курка / м'ясо / риба / білок" },
  { id: "veg", title: "овочі" },
  { id: "preserve", title: "консервація" },
  { id: "extra", title: "додатково / догляд" },
  { id: "dairy", title: "молочне" },
  { id: "alcohol", title: "алкоголь" },
  { id: "tobacco", title: "тютюн" },
];

const VEG_NOT_FRESH =
  /маринов|солен|пастер|консерв|в['’]?ялен|пряник|печив|торт|кекс|вафл|імбир|зайчик|цукер|цукат|сік|соус|томатн\w*\s*паст|чіпс|пюре|варен/i;
const PRESERVE_MARK = /маринов|солен|пастер|консерв|в['’]?ялен/i;

const SLOTS = [
  { id: "brd:loaf", group: "breads", q: "хліб", staple: "хліб", envelope: "food", cadenceDays: 5, re: /батон|хліб(?!ці)/i, skip: /лаваш|хлібц|сухар|гріссін|квас|батончик/i },
  { id: "brd:dark", group: "breads", q: "хліб житній", staple: "хліб", envelope: "food", cadenceDays: 5, re: /житн|бородин|цільнозерн|бездріж/i, skip: /квас/i },
  { id: "brd:lavash", group: "breads", q: "лаваш", staple: "лаваш", envelope: "food", cadenceDays: 10, re: /лаваш/i },
  { id: "brd:crisp", group: "breads", q: "хлібці", staple: "хлібці", envelope: "food", cadenceDays: 14, re: /хлібц/i },
  { id: "pro:chicken", group: "protein", q: "курка", staple: "курка", envelope: "food", cadenceDays: 7, re: /курк|куряч|курчат/i, skip: /сосиск|ковбас|плов|котів|собак/i },
  { id: "pro:pork", group: "protein", q: "свинина", staple: "свинина", envelope: "food", cadenceDays: 14, re: /свин|реберця|бужен/i, skip: /сосиск|ковбас/i },
  { id: "pro:beef", group: "protein", q: "яловичина", staple: "яловичина", envelope: "food", cadenceDays: 21, re: /ялови|яловичин|стейк/i, skip: /собак|котів/i },
  { id: "pro:fish", group: "protein", q: "риба", staple: "риба", envelope: "food", cadenceDays: 14, re: /хек|сьомг|лосос|скумбр|оселед|риб(?!н)/i, skip: /масло|паличк|котлет/i },
  { id: "pro:sea", group: "protein", q: "морепродукти", staple: "морепродукти", envelope: "food", cadenceDays: 21, re: /кревет|міді|кальмар|восьминіг|морепродукт/i },
  { id: "pro:plant", group: "protein", q: "хумус", staple: "хумус", envelope: "food", cadenceDays: 14, re: /хумус|фалафел|нут\b|горошок/i },
  { id: "pro:eggs", group: "protein", q: "яйця", staple: "яйця", envelope: "food", cadenceDays: 10, re: /яйц/i },
  { id: "veg:pot", group: "veg", q: "картопля", staple: "картопля", envelope: "food", cadenceDays: 10, re: /картопл/i, skip: VEG_NOT_FRESH },
  { id: "veg:oni", group: "veg", q: "цибуля", staple: "цибуля", envelope: "food", cadenceDays: 12, re: /цибул/i, skip: VEG_NOT_FRESH },
  { id: "veg:gar", group: "veg", q: "часник", staple: "часник", envelope: "food", cadenceDays: 21, re: /часник/i, skip: VEG_NOT_FRESH },
  { id: "veg:car", group: "veg", q: "морква", staple: "морква", envelope: "food", cadenceDays: 12, re: /моркв/i, skip: VEG_NOT_FRESH },
  { id: "veg:cuc", group: "veg", q: "огірок", staple: "огірок", envelope: "food", cadenceDays: 7, re: /огір/i, skip: VEG_NOT_FRESH },
  { id: "veg:tom", group: "veg", q: "помідор", staple: "помідор", envelope: "food", cadenceDays: 7, re: /помідор|томат/i, skip: VEG_NOT_FRESH },
  { id: "veg:let", group: "veg", q: "салат", staple: "салат", envelope: "food", cadenceDays: 7, re: /салат|айсберг|латук|рукол/i, skip: /олів'є|майонез/i },
  { id: "veg:gre", group: "veg", q: "зелень", staple: "зелень", envelope: "food", cadenceDays: 7, re: /кріп|петрушк|кінз|зелень|шпинат/i, skip: VEG_NOT_FRESH },
  { id: "can:tom", group: "preserve", q: "томати мариновані", staple: "консервація", envelope: "food", cadenceDays: 21, re: /томат|помідор/i, need: PRESERVE_MARK, skip: /сік|соус|томатн\w*\s*паст/i },
  { id: "can:cuc", group: "preserve", q: "огірки мариновані", staple: "консервація", envelope: "food", cadenceDays: 21, re: /огір/i, need: PRESERVE_MARK },
  { id: "can:other", group: "preserve", q: "консервація", staple: "консервація", envelope: "food", cadenceDays: 21, re: /капуст|лечо|ікра|гриб/i, need: PRESERVE_MARK },
  { id: "ext:oil", group: "extra", q: "олія", staple: "олія", envelope: "food", cadenceDays: 150, re: /олія|оливков/i, skip: /рибн/i },
  { id: "ext:mayo", group: "extra", q: "майонез", staple: "майонез", envelope: "food", cadenceDays: 45, re: /майонез/i },
  { id: "ext:sauce", group: "extra", q: "соус", staple: "соус", envelope: "food", cadenceDays: 21, re: /соус|кетчуп|гірчиц|аджик|ткемал/i, skip: /майонез/i },
  { id: "ext:smet", group: "extra", q: "сметана", staple: "сметана", envelope: "food", cadenceDays: 14, re: /сметан/i },
  { id: "dry:milk", group: "dairy", q: "молоко", staple: "молоко", envelope: "food", cadenceDays: 7, re: /молоко/i },
  { id: "dry:yog", group: "dairy", q: "йогурт", staple: "йогурт", envelope: "food", cadenceDays: 7, re: /йогурт/i },
  { id: "cln:gel", group: "extra", q: "гель для душу", staple: "гель для душу", envelope: "clean", cadenceDays: 30, re: /гель\s*для\s*душ/i },
  { id: "alc:beer", group: "alcohol", q: "пиво", staple: "пиво", envelope: "alcohol", cadenceDays: 7, re: /пив/i, skip: /оцет|сироп/i },
  { id: "alc:wine", group: "alcohol", q: "вино", staple: "вино", envelope: "alcohol", cadenceDays: 14, re: /вино/i, skip: /оцет|сirk|уксус/i },
  { id: "tob:cig", group: "tobacco", q: "цигарки", staple: "цигарки", envelope: "tobacco", cadenceDays: 7, re: /цигар|тютюн|iqos/i },
];

export function groupMeta(groupId) {
  const id = normalizeShopGroupId(groupId);
  return GROUPS.find((g) => g.id === id) || { id: id || "extra", title: id || "додатково" };
}

/** Legacy clean shelf → merged into extra in checkout UI. */
export function normalizeShopGroupId(groupId) {
  return groupId === "clean" ? "extra" : groupId;
}

const GROUP_SHORT = {
  breads: "Хліб",
  protein: "Білок",
  veg: "Овочі",
  preserve: "Консервація",
  extra: "Додатково",
  dairy: "Молочне",
  alcohol: "Алкоголь",
  tobacco: "Тютюн",
};

export function groupShortTitle(groupId) {
  return GROUP_SHORT[groupId] || groupMeta(groupId).title;
}

/** Tiny inline SVG for group headers (no emoji). */
export function groupIconSvg(groupId) {
  const id = normalizeShopGroupId(groupId);
  const stroke = "currentColor";
  const s = `stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`;
  const wrap = (body) =>
    `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  switch (id) {
    case "breads":
      return wrap(
        `<path d="M3.5 11.2c.55-3.6 3-6.2 6.5-6.2s5.95 2.6 6.5 6.2c.25 1.55-.2 4.1-1.35 5.1H4.85C3.7 15.3 3.25 12.75 3.5 11.2Z" ${s}/>` +
          `<path d="M6.8 8.4c.9-.55 1.55.45 1.25 1.35M10 7.6c.9-.55 1.55.45 1.25 1.35M13.2 8.4c.9-.55 1.55.45 1.25 1.35" ${s}/>`,
      );
    case "protein":
      return wrap(
        `<path d="M6.2 14.2c-1.1-3.8 1.2-7.2 4.1-6.7 2.4.4 4.5 2.8 4.8 5.5.25 2-.7 4-2.1 4.8H8.3c-1.4-.8-2.35-2.8-2.1-4.8Z" ${s}/>` +
          `<circle cx="13.2" cy="7.8" r="1.15" fill="${stroke}"/>`,
      );
    case "dairy":
      return wrap(
        `<path d="M6.5 4.2h7l1.2 1.8v8.8a1.8 1.8 0 0 1-1.8 1.8H7.1a1.8 1.8 0 0 1-1.8-1.8V6l1.2-1.8Z" ${s}/>` +
          `<path d="M6.5 4.2h7L11.8 2.5H8.2L6.5 4.2Z" ${s}/>` +
          `<path d="M8.2 9.5h3.6" ${s}/>`,
      );
    case "veg":
      return wrap(
        `<path d="M10 16.2V9.2" ${s}/>` +
          `<path d="M10 9.2c-2.6.25-4.5-1.4-4.8-3.5.95.25 2.6.15 3.8-.95C9.8 3.5 10.5 2.5 10.5 2.5s.55.95 1.4 1.75c1.2 1.1 2.85 1.2 3.8.95-.3 2.1-2.2 3.75-4.7 3.5Z" ${s}/>`,
      );
    case "preserve":
      return wrap(
        `<rect x="5" y="4.2" width="10" height="11.8" rx="1.8" ${s}/>` +
          `<path d="M7.2 2.8h5.6v1.4H7.2V2.8Z" ${s}/>` +
          `<path d="M7.2 8.2h5.6M7.2 10.8h5.6" ${s}/>`,
      );
    case "alcohol":
      return wrap(
        `<path d="M6.2 3.2h7.6l-1.4 5.2c.95 1.15 1.45 2.55 1.45 4.05 0 2.35-1.85 3.85-3.85 3.85S5.75 14.8 5.75 12.45c0-1.5.5-2.9 1.45-4.05L6.2 3.2Z" ${s}/>` +
          `<path d="M6.8 8.4h6.4" ${s}/>`,
      );
    case "tobacco":
      return wrap(
        `<rect x="3.2" y="7.5" width="13.6" height="5" rx="1.4" ${s}/>` +
          `<path d="M13.8 7.5v5M15.6 6.5c.75.75.75 3.35 0 4.2" ${s}/>`,
      );
    case "clean":
    case "extra":
      return wrap(
        `<path d="M8.2 3.4h3.6v2l1.6 1.6v8.2a2 2 0 0 1-2 2H8.6a2 2 0 0 1-2-2V7l1.6-1.6v-2Z" ${s}/>` +
          `<path d="M9.2 2.2h1.6" ${s}/>` +
          `<path d="M7.4 11.2h5.2M7.4 13.4h5.2" ${s}/>`,
      );
    default:
      return wrap(`<circle cx="10" cy="10" r="6.2" ${s}/><path d="M10 6.8v3.6l2.4 1.4" ${s}/>`);
  }
}

export function slotsForGroup(groupId) {
  return SLOTS.filter((s) => s.group === (groupId || "extra")).map((s) => ({
    id: s.id,
    title: s.q,
    staple: s.staple,
    q: s.q,
  }));
}

export function groupOfQuery(q) {
  const slot = classifySlot(q) || SLOTS.find((s) => s.staple === q || s.q === q);
  return slot?.group || "extra";
}

/** Shelf for a picked SKU. Browse group is search origin only. Unknown → extra. Preserve group only if 2+ preserve types. */
export function destinationGroupForAdd(name, siblingNames = []) {
  const slot = classifySlot(name);
  if (!slot) return "extra";
  if (slot.group !== "preserve") return slot.group;
  const types = new Set([slot.id]);
  for (const n of siblingNames || []) {
    const s = classifySlot(n);
    if (s?.group === "preserve") types.add(s.id);
  }
  return types.size >= 2 ? "preserve" : "extra";
}

export function classifySlot(raw) {
  const s = String(raw || "");
  if (!s) return null;
  for (const slot of SLOTS) {
    if (slot.need && !slot.need.test(s)) continue;
    if (slot.skip && slot.skip.test(s)) continue;
    if (slot.re.test(s)) return slot;
  }
  return null;
}

function historyOrders(history) {
  const orders = [];
  for (const h of history || []) {
    if (Array.isArray(h.orders) && h.orders.length) {
      for (const o of h.orders) {
        const names = (o.lines || []).map((l) => (typeof l === "string" ? l : l.name)).filter(Boolean);
        const prices = {};
        const qtys = {};
        for (const l of o.lines || []) {
          if (typeof l !== "object" || !l?.name) continue;
          if (typeof l.price === "number") prices[l.name] = l.price;
          qtys[l.name] = Number(l.qty ?? l.quantity) || 1;
        }
        orders.push({ at: o.at || null, names, prices, qtys });
      }
      continue;
    }
    const names = [];
    if (h.weights && typeof h.weights === "object") names.push(...Object.keys(h.weights));
    else names.push(...(h.lines || []));
    if (names.length) orders.push({ at: h.when || null, names, prices: {}, qtys: {} });
  }
  return orders;
}

export function parseWhen(at) {
  if (at == null || at === "") return null;
  if (typeof at === "number" && Number.isFinite(at)) {
    return at < 1e12 ? at * 1000 : at;
  }
  const s = String(at).trim();
  const ms = s.match(/\/Date\((\d+)\)\//);
  if (ms) return Number(ms[1]);
  if (/^\d{10,13}$/.test(s)) {
    const n = Number(s);
    return n < 1e12 ? n * 1000 : n;
  }
  const ua = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (ua) return Date.parse(`${ua[3]}-${ua[2].padStart(2, "0")}-${ua[1].padStart(2, "0")}`);
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

/** Newest-first undated receipts → spaced 7d back so cadence still works. */
export function inferOrderTimes(orders, now = Date.now()) {
  const STEP = 7 * DAY;
  const WINDOW = 90 * DAY;
  return (orders || [])
    .map((o, i) => {
      const t = parseWhen(o.at);
      return {
        ...o,
        t: t != null ? t : now - i * STEP,
        atInferred: t == null,
      };
    })
    .filter((o) => o.t >= now - WINDOW - STEP);
}

function kgFromLine(name, qty) {
  const n = String(name || "");
  const packed = n.match(/(\d+[.,]?\d*)\s*кг/i);
  const q = Number(qty) || 1;
  if (packed) return Number(packed[1].replace(",", ".")) * (q > 1 ? q : 1);
  if (q >= 5 && /картопл/i.test(n)) return q;
  return 0;
}

export function slotStats(history, now = Date.now()) {
  const orders = inferOrderTimes(historyOrders(history), now);
  const byId = {};
  for (const slot of SLOTS) {
    byId[slot.id] = {
      slot,
      count: 0,
      last: null,
      lastDated: null,
      prices: [],
      qtySum: 0,
      withPeer: 0,
    };
  }
  for (const order of orders) {
    const at = order.t;
    const seen = new Set();
    for (const name of order.names) {
      const slot = classifySlot(name);
      if (!slot) continue;
      const st = byId[slot.id];
      st.count += 1;
      if (at && (!st.last || at > st.last)) st.last = at;
      if (at && !order.atInferred && (!st.lastDated || at > st.lastDated)) st.lastDated = at;
      st.qtySum += kgFromLine(name, order.qtys?.[name]);
      const p = order.prices?.[name];
      if (typeof p === "number" && p > 0) st.prices.push(p);
      seen.add(slot.id);
    }
    if ([...seen].filter((id) => byId[id].slot.group === "breads").length >= 2) {
      for (const id of seen) if (byId[id].slot.group === "breads") byId[id].withPeer += 1;
    }
  }
  for (const st of Object.values(byId)) {
    st.daysAgo = st.last != null ? (now - st.last) / DAY : null;
    st.daysAgoDated = st.lastDated != null ? (now - st.lastDated) / DAY : null;
    st.due = st.count > 0 && (st.daysAgo == null || st.daysAgo >= st.slot.cadenceDays * 0.65);
  }
  return { orders, byId };
}

function whyFor(st) {
  const slot = st.slot;
  if (st.count === 0 && slot.id === "ext:oil") return "не було в чеках за ~3 міс";
  if (st.count === 0 && slot.id === "ext:mayo") return "до салату — майонез беруть рідше";
  if (st.count === 0 && slot.id === "ext:smet") return "до салату — сметана з історії";
  if (slot.id === "veg:pot" && st.qtySum >= 5) return "велика фасовка в чеках — схоже не на одну порцію";
  if (st.withPeer >= 2) return "часто в одному замовленні з іншим хлібом";
  if (st.daysAgo != null && st.daysAgo >= slot.cadenceDays) {
    return `востаннє ~${Math.round(st.daysAgo)} дн. тому`;
  }
  if (st.count >= 3) return `у чеках ${st.count} разів`;
  if (st.count > 0) return "є в історії";
  return "";
}

function median(nums) {
  const a = (nums || []).filter((n) => typeof n === "number" && n > 0).sort((x, y) => x - y);
  if (!a.length) return null;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function saladInStats(stats) {
  return ["veg:cuc", "veg:tom", "veg:let"].some((id) => stats.byId[id].count > 0);
}

/** Horizon: day = urgent few; week = usual; month = more lines + modest stock-up. */
const HORIZON_PLAN = {
  day: { dueFactor: 0.95, maxScale: 0.55, qtyMult: 1 },
  week: { dueFactor: 0.65, maxScale: 1, qtyMult: 1.2 },
  month: { dueFactor: 0.4, maxScale: 1.45, qtyMult: 1.55 },
};

/** Поповнити < Як завжди < На всі гроші — кількість росте. */
const VARIANT_PLAN = {
  A: { max: 8, qtyBoost: 1, mode: "refill" },
  B: { max: 14, qtyBoost: 1.35, mode: "usual" },
  C: { max: 22, qtyBoost: 1.85, mode: "full" },
};

function isDue(st, horizon = "week") {
  if (st.count <= 0) return false;
  const factor = HORIZON_PLAN[horizon]?.dueFactor ?? 0.65;
  return st.daysAgo != null && st.daysAgo >= st.slot.cadenceDays * factor;
}

function includeSlot(st, variant, stats, horizon = "week") {
  const id = st.slot.id;
  const due = isDue(st, horizon) || st.due;

  if (id === "ext:oil") {
    if (st.count === 0) return variant !== "A";
    return st.daysAgo != null && st.daysAgo >= (variant === "A" ? 150 : 120);
  }
  if (id === "ext:mayo") {
    if (!saladInStats(stats)) return false;
    if (st.count === 0) return variant !== "A";
    return st.daysAgo != null && st.daysAgo >= (variant === "A" ? 45 : 30);
  }
  if (id === "ext:smet") {
    if (!saladInStats(stats)) return false;
    if (st.count === 0) return variant !== "A";
    return st.daysAgo != null && st.daysAgo >= (variant === "A" ? 14 : 10);
  }
  if (id === "veg:gar") {
    if (st.count === 0) return false;
    return st.daysAgo != null && st.daysAgo >= (horizon === "day" ? 21 : 14);
  }

  if (st.count <= 0) return false;

  // Поповнити: due + базові staples з історії (навіть якщо щойно брали)
  if (variant === "A") {
    const core = new Set(["brd:loaf", "dry:milk", "pro:eggs", "pro:chicken", "cln:gel", "veg:pot", "veg:oni", "dry:yog"]);
    if (core.has(id)) return true;
    if (id === "brd:lavash" || id === "brd:crisp" || id === "brd:dark") {
      return due && (st.withPeer >= 1 || st.count >= 3);
    }
    if (st.slot.group === "protein" && id !== "pro:chicken" && id !== "pro:eggs" && id !== "pro:plant") {
      return due && st.count >= 2;
    }
    return due;
  }

  // На всі гроші: майже все з історії (+ дорожчі/рідкі слоти теж)
  if (variant === "C") return true;

  // Як завжди
  if (horizon === "day" && !due && st.count < 3) return false;
  return true;
}

/** Guest comfort + store turn: food first, clean next; alc/tob mid — visible, not crowding staples. */
function envelopeScore(env, allow) {
  const base = { food: 40, clean: 22, alcohol: 26, tobacco: 12 };
  let s = base[env] || 0;
  // Mixed basket: staples stay first; alc sits after dairy/protein scores, before low-count extras.
  if (env === "alcohol" && allow.has("food")) s -= 4;
  if (env === "tobacco" && allow.has("food")) s -= 8;
  if (env === "clean" && allow.has("food")) s += 2;
  // Focused trip (no food): elevate the selected envelope.
  if (env === "alcohol" && !allow.has("food")) s += 18;
  if (env === "tobacco" && !allow.has("food")) s += 16;
  if (env === "clean" && !allow.has("food")) s += 14;
  return s;
}

function scoreSlot(st, { variant, horizon, allow }) {
  let s = envelopeScore(st.slot.envelope, allow);
  const p2 = st.slot.envelope === "alcohol" || st.slot.envelope === "tobacco";
  // P2 mood: days-since is weak — do not treat as urgent «due»
  if ((isDue(st, horizon) || st.due) && !p2) s += 100;
  if (st.daysAgo != null && !p2) s += Math.min(50, st.daysAgo / 2);
  else if (st.daysAgo != null && p2) s += Math.min(15, st.daysAgo / 8);
  s += Math.min(35, st.count * 4);
  if (st.withPeer >= 1) s += 8;
  if (["brd:loaf", "dry:milk", "pro:chicken", "pro:eggs", "veg:pot"].includes(st.slot.id)) s += 12;
  if (variant === "A" && !(isDue(st, horizon) || st.due) && !p2) s -= 60;
  if (variant === "C") s += 15;
  if (horizon === "month") s += 8;
  if (horizon === "day" && !isDue(st, horizon) && !p2) s -= 25;
  return s;
}

function unitsFor(st, variant, horizon) {
  const h = HORIZON_PLAN[horizon] || HORIZON_PLAN.week;
  const v = VARIANT_PLAN[variant] || VARIANT_PLAN.B;
  let u = h.qtyMult * v.qtyBoost;
  if (st.count >= 4) u *= 1.15;
  if (st.slot.group === "veg" && st.qtySum >= 5) u *= 1.2;
  if (horizon === "day") u = Math.min(u, 1.2);
  u = Math.max(1, Math.round(u));
  if (variant === "A") u = Math.min(u, horizon === "month" ? 2 : 1);
  if (variant === "B") u = Math.min(u, horizon === "month" ? 3 : horizon === "week" ? 2 : 1);
  if (variant === "C") u = Math.min(u, horizon === "month" ? 4 : horizon === "week" ? 3 : 2);
  return u;
}

export function queriesFromSlots(items) {
  const rows = items.map((st) => {
    const mid = median(st.prices);
    const group = st.slot.group;
    const units = Math.max(1, Number(st.units) || 1);
    return {
      q: st.slot.q,
      role: st.slot.id,
      staple: st.slot.staple,
      envelope: st.slot.envelope,
      group,
      groupTitle: GROUPS.find((g) => g.id === group)?.title || group,
      why: whyFor(st),
      units,
      priceMin: mid ? Math.round(mid * 0.55) : undefined,
      priceMax: mid ? Math.round(mid * 1.75) : undefined,
    };
  });
  const preserveOnList = rows.filter((r) => r.group === "preserve");
  if (preserveOnList.length < 2) {
    for (const r of rows) {
      if (r.group !== "preserve") continue;
      r.group = "extra";
      r.groupTitle = GROUPS.find((g) => g.id === "extra")?.title || "додатково";
    }
  }
  return rows;
}

export function envelopesFromHistory(history) {
  const stats = slotStats(history);
  const set = new Set();
  for (const st of Object.values(stats.byId)) {
    if (st.count > 0) set.add(st.slot.envelope);
  }
  return [...set];
}

export function planCookList(history, { allow = new Set(["food", "clean"]), variant = "B", horizon = "week" } = {}) {
  const hz = HORIZON_PLAN[horizon] ? horizon : "week";
  const vr = VARIANT_PLAN[variant] ? variant : "B";
  const stats = slotStats(history);
  let picked = SLOTS.map((s) => stats.byId[s.id]).filter((st) => includeSlot(st, vr, stats, hz));
  let allowed = picked.filter((st) => allow.has(st.slot.envelope));

  if (allow.has("alcohol") && !allowed.some((st) => st.slot.envelope === "alcohol")) {
    const beer = stats.byId["alc:beer"];
    allowed.push(
      beer.count
        ? beer
        : { slot: SLOTS.find((s) => s.id === "alc:beer"), count: 0, last: null, daysAgo: null, withPeer: 0, qtySum: 0, prices: [] },
    );
  }
  if (allow.has("tobacco") && !allowed.some((st) => st.slot.envelope === "tobacco")) {
    const cig = stats.byId["tob:cig"];
    if (cig.count) allowed.push(cig);
    else {
      allowed.push({
        slot: SLOTS.find((s) => s.id === "tob:cig"),
        count: 0,
        last: null,
        daysAgo: null,
        withPeer: 0,
        qtySum: 0,
        prices: [],
      });
    }
  }

  allowed = allowed
    .map((st) => ({ ...st, units: unitsFor(st, vr, hz) }))
    .sort((a, b) => scoreSlot(b, { variant: vr, horizon: hz, allow }) - scoreSlot(a, { variant: vr, horizon: hz, allow }));

  const max = Math.max(4, Math.round((VARIANT_PLAN[vr].max || 14) * (HORIZON_PLAN[hz].maxScale || 1)));
  return queriesFromSlots(ensureEnvelopeCoverage(allowed, allow, max).slice(0, max));
}

/** Keep one alcohol/tobacco/clean in the top window so toggles change the list under стеля. */
function ensureEnvelopeCoverage(sorted, allow, max) {
  const out = [...sorted];
  const specials = ["clean", "alcohol", "tobacco"].filter((e) => allow.has(e));
  for (const env of specials) {
    const idx = out.findIndex((st) => st.slot.envelope === env);
    if (idx < 0) continue;
    if (idx < max) continue;
    const [row] = out.splice(idx, 1);
    const insertAt = Math.min(out.length, Math.max(3, Math.min(max - 1, 3)));
    out.splice(insertAt, 0, row);
  }
  return out;
}

export function groupQueries(queries) {
  const map = new Map();
  for (const q of queries || []) {
    const id = q.group || "extra";
    if (!map.has(id)) {
      map.set(id, {
        id,
        title: q.groupTitle || GROUPS.find((g) => g.id === id)?.title || id,
        queries: [],
      });
    }
    map.get(id).queries.push(q);
  }
  const order = GROUPS.map((g) => g.id);
  return [...map.values()].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}
