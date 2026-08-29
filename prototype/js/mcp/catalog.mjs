import { unwrap } from "./unwrap.js";
import { callTool } from "./client.mjs";
import { productsFromBatch } from "./normalize.js";
import { classifySlot, slotsForGroup } from "../groups.js";
import { BROWSE_POPULAR_SLUG } from "../browse-constants.js";

/** Leaf slugs from live `silpo_get_categories_tree` (no titles in tree). */
export const STAPLE_CATEGORY_SLUGS = {
  хліб: ["baton-5140", "khlib-5139"],
  лаваш: ["lavash-tortylia-5145"],
  хлібці: ["khlibtsi-5166"],
  курка: ["kuriatyna-4426"],
  "готова курка з кулінарії": ["kuriatyna-4426"],
  свинина: ["svynyna-4413"],
  яловичина: ["yalovychyna-ta-teliatyna-4414"],
  риба: ["ryba-4430"],
  морепродукти: ["moreprodukty-ta-moliusky-4435"],
  яйця: ["kuriachi-iaitsia-4977"],
  йогурт: ["yogurty-245"],
  масло: ["maslo-4980"],
  гречка: ["grechka-4872"],
  вівсянка: ["vivsiana-krupa-4877", "kashi-4928"],
  рис: ["rys-4873"],
  молоко: ["moloko-253"],
  овочі: ["ogirky-4823", "ovochi-4808"],
  /** Per-veg leaves — batch search often empty; category path must fill checklist photos. */
  картопля: ["kartoplia-i-batat-4817"],
  цибуля: ["tsybulia-i-chasnyk-4826"],
  часник: ["tsybulia-i-chasnyk-4826"],
  морква: ["morkva-4818"],
  огірок: ["ogirky-4823"],
  помідор: ["pomidory-4825"],
  зелень: ["zelen-i-salaty-4829", "zelen-miks-4835"],
  салат: ["salaty-4831", "zelen-i-salaty-4829"],
  "овочевий салат з кулінарії": ["salaty-4831", "zelen-i-salaty-4829"],
  майонез: ["maionez-4951"],
  консервація: ["ovocheva-4913", "konservatsiia-4910"],
  хумус: ["zakusky-ta-namazky-4778", "pashtety-ta-namazky-4751"],
  пиво: ["pyvo-4463"],
  вино: ["tykhi-vyna-4459"],
};

/** Extra MCP parents when slot staples have no patterns (L05 veg). Never khlib-ta-vypichka (пряники). */
export const GROUP_ROOT_SLUGS = {
  veg: ["ovochi-4808"],
};

const SLUG_PATTERNS = {
  хліб: [/^baton-\d+$/i, /^khlib-\d+$/i],
  лаваш: [/^lavash-/i],
  хлібці: [/^khlibtsi-\d+$/i],
  курка: [/^kuriatyna-\d+$/i],
  "готова курка з кулінарії": [/^kuriatyna-\d+$/i],
  свинина: [/^svynyna-\d+$/i],
  яловичина: [/^yalovychyna/i],
  риба: [/^ryba-\d+$/i],
  морепродукти: [/^moreprodukty-ta-moliusky-\d+$/i],
  яйця: [/^kuriachi-iaitsia-\d+$/i, /^perepelyni-iaitsia-\d+$/i],
  йогурт: [/^yogurty-\d+$/i],
  масло: [/^maslo-\d+$/i],
  гречка: [/^grechka-\d+$/i],
  вівсянка: [/^vivsiana-krupa-\d+$/i, /^kashi-\d+$/i],
  рис: [/^rys-\d+$/i],
  молоко: [/^moloko-\d+$/i],
  овочі: [/^ogirky-\d+$/i, /^ovochi-\d+$/i],
  картопля: [/^kartoplia/i],
  цибуля: [/^tsybulia/i],
  часник: [/^tsybulia/i, /chasnyk/i],
  морква: [/^morkva/i],
  огірок: [/^ogirky-\d+$/i],
  помідор: [/^pomidory-\d+$/i],
  зелень: [/^zelen/i, /^salaty-\d+$/i],
  салат: [/^salaty-\d+$/i, /^zelen-i-salaty/i],
  "овочевий салат з кулінарії": [/^salaty-\d+$/i, /^zelen-i-salaty/i],
  майонез: [/^maionez-\d+$/i],
  консервація: [/^ovocheva-\d+$/i, /^konservatsiia-\d+$/i],
  хумус: [/namazky/i, /^zakusky-ta-namazky/i],
  пиво: [/pyvo/i],
  вино: [/^tykhi-vyna-\d+$/i, /^vyna-\d+$/i],
};

export function flattenCategorySlugs(node, acc = []) {
  if (node == null) return acc;
  if (Array.isArray(node)) {
    for (const n of node) flattenCategorySlugs(n, acc);
    return acc;
  }
  if (typeof node !== "object") return acc;
  const slug = node.slug || node.categorySlug;
  if (slug) acc.push(String(slug));
  for (const k of ["children", "categories", "items", "tree", "nodes"]) {
    if (node[k]) flattenCategorySlugs(node[k], acc);
  }
  return acc;
}

export function slugsForStaple(treePayload, staple, kind = null, freq = {}) {
  const patterns = SLUG_PATTERNS[staple];
  const fallback = STAPLE_CATEGORY_SLUGS[staple] || [];
  if (!patterns) return fallback;
  const o = treePayload && typeof treePayload === "object" ? treePayload : {};
  const slugs = flattenCategorySlugs(o.tree || o);
  const hit = slugs.filter((s) => patterns.some((re) => re.test(s)));
  let ordered = [...new Set(hit.length ? hit : fallback)];
  ordered = ordered.filter((s) => !/batonchyk|batonchik|proteinov|shokoladn/i.test(s));
  if (staple === "хлібці") {
    ordered = ordered.filter((s) => !/prianyk|sushka|grinky|sukharyk/i.test(s));
  }
  if (staple === "яйця") {
    ordered = ordered.filter((s) => !/shokoladn|molochni-produkty/i.test(s));
  }
  if (staple === "йогурт") {
    ordered = ordered.filter((s) => !/deserty|dytiach|snack|batonchyk/i.test(s));
    ordered.sort((a, b) => Number(/^yogurty-\d+$/i.test(b)) - Number(/^yogurty-\d+$/i.test(a)));
  }
  if (staple === "масло") {
    ordered = ordered.filter((s) => !/margaryn|spred|oliia|cbd/i.test(s));
  }
  if (staple === "гречка") {
    ordered = ordered.filter((s) => !/boroshno/i.test(s));
  }
  if (staple === "вівсянка") {
    ordered = ordered.filter((s) => !/dytiach|boroshno/i.test(s));
    ordered.sort((a, b) => Number(/^vivsiana-krupa-/i.test(b)) - Number(/^vivsiana-krupa-/i.test(a)));
  }
  if (staple === "рис") {
    ordered = ordered.filter((s) => !/lokshyna|grissini/i.test(s));
  }
  if (staple === "риба") {
    ordered = ordered.filter((s) => !/preservy|zakusk|pasty|sneky|stravy|napivfabrykat/i.test(s));
  }
  if (staple === "хліб") {
    ordered.sort((a, b) => Number(/^baton-/i.test(b)) - Number(/^baton-/i.test(a)));
  }
  if (staple === "овочі") {
    if (kind === "fresh") ordered = ordered.filter((s) => /^ogirky-/i.test(s));
    else ordered.sort((a, b) => Number(/^ogirky-/i.test(b)) - Number(/^ogirky-/i.test(a)));
  }
  if (staple === "пиво") {
    const kids = ordered.filter((s) => !/^pyvo-\d+$/i.test(s) && !/^kraftove-pyvo/i.test(s));
    const { na, rest } = beerNaBias(freq);
    kids.sort((a, b) => beerSlugScore(b, na, rest) - beerSlugScore(a, na, rest));
    if (kids.length) return kids.slice(0, 2);
  }
  if (staple === "консервація") {
    ordered.sort((a, b) => Number(/^ovocheva-/i.test(b)) - Number(/^ovocheva-/i.test(a)));
  }
  return ordered.slice(0, 2);
}

/** Union of slot staples + group roots. Used by browse group-path (L06). */
export function slugsForGroup(treePayload, groupId) {
  /** Extra stays search-only — mayo/hummus have resolve slugs but no group shelf dump. */
  if (groupId === "extra") return [];
  const fromSlots = slotsForGroup(groupId).flatMap((s) => slugsForStaple(treePayload, s.staple));
  const roots = GROUP_ROOT_SLUGS[groupId] || [];
  return [...new Set([...fromSlots, ...roots])];
}

/** Primary MCP slug for a staple chip (parent category when available). */
export function anchorSlugForStaple(treePayload, staple, freq = {}) {
  const fallback = STAPLE_CATEGORY_SLUGS[staple]?.[0];
  const slugs = slugsForStaple(treePayload, staple, null, freq);
  if (staple === "пиво") {
    return slugs.find((s) => /^pyvo-\d+$/i.test(s)) || fallback || slugs[0] || "";
  }
  if (staple === "вино") {
    return slugs.find((s) => /vyna/i.test(s)) || fallback || slugs[0] || "";
  }
  return slugs[0] || fallback || "";
}

/** Tier-1 browse chips: Популярне + slot staples for the checklist group. */
export function buildBrowseTier1(treePayload, groupId, freq = {}) {
  const tier1 = [{ slug: BROWSE_POPULAR_SLUG, title: "Популярне" }];
  const seen = new Set([BROWSE_POPULAR_SLUG]);
  for (const s of slotsForGroup(groupId)) {
    const slug = anchorSlugForStaple(treePayload, s.staple, freq);
    if (slug && !seen.has(slug)) {
      tier1.push({ slug, title: s.title, staple: s.staple });
      seen.add(slug);
    }
  }
  return tier1;
}

function productSearchName(p) {
  return p?.title || p?.name || "";
}

function productSearchSlug(p) {
  return String(p?.slug || p?.categorySlug || p?.sku?.slug || "");
}

/** Branch search: keep SKU if name slot ∈ group, else slug stem ∈ group, else extra-only unknowns. */
export function filterSearchToGroup(list, groupId, treePayload = {}) {
  const group = String(groupId || "").trim();
  if (!group) return list || [];
  const stems = new Set(slugsForGroup(treePayload, group).map(categoryStem));
  return (list || []).filter((p) => {
    const name = productSearchName(p);
    const slot = classifySlot(name);
    if (slot) return slot.group === group;
    const slug = productSearchSlug(p);
    if (slug && stems.has(categoryStem(slug))) return true;
    return group === "extra";
  });
}

function beerNaBias(freq) {
  let na = 0;
  let rest = 0;
  for (const [name, n] of Object.entries(freq || {})) {
    if (!/пив/i.test(name)) continue;
    if (/безалко/i.test(name)) na += Number(n || 0);
    else rest += Number(n || 0);
  }
  return { na, rest };
}

function beerSlugScore(slug, na, rest) {
  if (na >= rest && /^bezalkogolne-pyvo/i.test(slug)) return 4;
  if (rest > na && /^ukrainske-pyvo/i.test(slug)) return 4;
  if (/^ukrainske-pyvo/i.test(slug)) return 3;
  if (/^bezalkogolne-pyvo/i.test(slug)) return 2;
  if (/^importne-pyvo/i.test(slug)) return 1;
  return 0;
}

export function productsFromCatalog(payload) {
  const o = unwrap(payload);
  const lists = [o.products, o.items, o.offers, o.data];
  for (const list of lists) {
    if (Array.isArray(list) && list.length) return list;
  }
  return productsFromBatch(payload);
}

export async function loadCategoryTree(ctx, cartCtx) {
  const r = await callTool(ctx, "silpo_get_categories_tree", {
    branchId: cartCtx.branchId,
    deliveryType: cartCtx.deliveryType,
    timeslotStart: cartCtx.timeslotStart,
    timeslotEnd: cartCtx.timeslotEnd,
  });
  return { http: r.http, json: unwrap(r.json) };
}

export function categoryStem(slug) {
  return String(slug || "")
    .toLowerCase()
    .replace(/-\d+$/, "");
}

export function humanizeSlug(slug) {
  const raw = String(slug || "");
  const stem = categoryStem(raw).replace(/-/g, " ").trim();
  return stem || raw;
}

export function isOpaqueCategorySlug(slug) {
  return /^[0-9a-f]{24,}$/i.test(String(slug || ""));
}

export function walkCategoryNodes(node, acc = []) {
  if (node == null) return acc;
  if (Array.isArray(node)) {
    for (const n of node) walkCategoryNodes(n, acc);
    return acc;
  }
  if (typeof node !== "object") return acc;
  if (node.slug || node.categorySlug) acc.push(node);
  for (const k of ["children", "categories", "items", "tree", "nodes"]) {
    if (node[k]) walkCategoryNodes(node[k], acc);
  }
  return acc;
}

export function categoryCard(node) {
  const slug = String(node?.slug || node?.categorySlug || "");
  const titled = node?.title || node?.name || node?.label;
  return {
    slug,
    title: String(titled || humanizeSlug(slug) || slug),
    hasChildren: Array.isArray(node?.children) && node.children.length > 0,
  };
}

export function topLevelCategoryCards(treePayload) {
  const o = treePayload && typeof treePayload === "object" ? treePayload : {};
  const list = Array.isArray(o.tree) ? o.tree : Array.isArray(o) ? o : [];
  return list
    .map(categoryCard)
    .filter((c) => c.slug && !isOpaqueCategorySlug(c.slug));
}

export function childCategoryCards(node) {
  return (node?.children || []).map(categoryCard).filter((c) => c.slug && !isOpaqueCategorySlug(c.slug));
}

export function findCategoryNode(treePayload, slug) {
  const want = String(slug || "");
  if (!want) return null;
  const nodes = walkCategoryNodes(treePayload, []);
  const exact = nodes.find((n) => String(n.slug || n.categorySlug) === want);
  if (exact) return exact;
  const stem = categoryStem(want);
  if (!stem) return null;
  let best = null;
  let bestScore = -1;
  for (const n of nodes) {
    const s = categoryStem(n.slug || n.categorySlug);
    if (!s) continue;
    let score = -1;
    if (s === stem) score = 100;
    else if (s.startsWith(`${stem}-`) || stem.startsWith(`${s}-`)) score = 60 - Math.abs(s.length - stem.length);
    if (score > bestScore) {
      bestScore = score;
      best = n;
    }
  }
  return bestScore >= 60 ? best : null;
}

export function flattenCategoryCards(node, acc = []) {
  if (node == null) return acc;
  if (Array.isArray(node)) {
    for (const n of node) flattenCategoryCards(n, acc);
    return acc;
  }
  if (typeof node !== "object") return acc;
  const slug = node.slug || node.categorySlug;
  const title = node.title || node.name || node.label || humanizeSlug(slug) || slug;
  if (slug && !isOpaqueCategorySlug(slug)) acc.push({ slug: String(slug), title: String(title || slug) });
  for (const k of ["children", "categories", "items", "tree", "nodes"]) {
    if (node[k]) flattenCategoryCards(node[k], acc);
  }
  return acc;
}

export function cardsFromCategoryPayload(payload) {
  const o = unwrap(payload);
  const lists = [o.categories, o.items, o.data, o.popular, o.tree];
  for (const list of lists) {
    if (Array.isArray(list) && list.length) return flattenCategoryCards(list, []);
  }
  return flattenCategoryCards(o.tree || o, []);
}

export async function browseCategories(ctx, cartCtx) {
  const popular = await callTool(ctx, "silpo_get_popular_categories", {
    branchId: cartCtx.branchId,
    deliveryType: cartCtx.deliveryType,
  });
  let cards = cardsFromCategoryPayload(popular.json);
  if (cards.length) return { http: popular.http, cards: uniqueCategoryCards(cards).slice(0, 40) };
  const tree = await loadCategoryTree(ctx, cartCtx);
  cards = flattenCategoryCards(tree.json.tree || tree.json, []);
  return { http: tree.http, cards: uniqueCategoryCards(cards).slice(0, 40) };
}

export function uniqueCategoryCards(cards) {
  const bySlug = new Map();
  const byStem = new Map();
  const score = (c) =>
    (c.hasChildren ? 4 : 0) + (/[а-яіїєґ]/i.test(c.title || "") ? 2 : 0) + Math.min(String(c.slug || "").length, 8) / 8;
  for (const c of cards || []) {
    if (!c?.slug) continue;
    if (isOpaqueCategorySlug(c.slug)) continue;
    const prevSlug = bySlug.get(c.slug);
    if (!prevSlug || score(c) > score(prevSlug)) bySlug.set(c.slug, c);
  }
  for (const c of bySlug.values()) {
    const stem = categoryStem(c.slug);
    const prev = byStem.get(stem);
    if (!prev || score(c) > score(prev)) byStem.set(stem, c);
  }
  return [...byStem.values()];
}

export async function productsByCategoryPopularity(ctx, cartCtx, slugs, limit = 50, { concurrency = 3 } = {}) {
  const list = Array.isArray(slugs) ? slugs.filter(Boolean) : [];
  if (!list.length) return [];
  const out = [];
  const n = Math.max(1, Math.min(concurrency, list.length));
  let cursor = 0;
  async function worker() {
    while (cursor < list.length) {
      const category = list[cursor++];
      const r = await callTool(ctx, "silpo_get_products", {
        branchId: cartCtx.branchId,
        deliveryType: cartCtx.deliveryType,
        timeslotStart: cartCtx.timeslotStart,
        timeslotEnd: cartCtx.timeslotEnd,
        category,
        sortBy: "popularity",
        limit,
      });
      out.push(...productsFromCatalog(r.json));
    }
  }
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}
