import { connectMcp, callTool } from "./client.mjs";
import { bootstrapCart } from "./bootstrap.mjs";
import { unwrap } from "./unwrap.js";
import { isWeightedProduct, lineTotalPrice, productImage, productsFromBatch } from "./normalize.js";
import { FRESH_RE, preferFresh, slugForFreshQuery } from "../fresh.js";
import { slotsForGroup } from "../groups.js";
import { rankProducts } from "../staples.js";
import {
  cardsFromCategoryPayload,
  childCategoryCards,
  findCategoryNode,
  humanizeSlug,
  loadCategoryTree,
  productsByCategoryPopularity,
  slugsForGroup,
  topLevelCategoryCards,
  uniqueCategoryCards,
  filterSearchToGroup,
  buildBrowseTier1,
} from "./catalog.mjs";
import { BROWSE_POPULAR_SLUG } from "../browse-constants.js";
import { loadHistoryViaMcp } from "./history.mjs";

function cardFromProduct(p, fallbackBranch) {
  if (!p) return null;
  const name = p.title || p.name || "";
  const unit = typeof p.price === "number" ? p.price : Number(p.price);
  const unitPrice = Number.isFinite(unit) ? unit : null;
  return {
    name,
    // Checklist / add: line total for default basket step (₴/kg × kg for weighted).
    price: lineTotalPrice(unitPrice, p, 1),
    unitPrice,
    weighted: isWeightedProduct(p),
    step: p.step ?? p.addToBasketStep ?? p.weightStep ?? null,
    displayRatio: p.displayRatio != null ? String(p.displayRatio) : "",
    image: productImage(p),
    sku: {
      productId: p.productId || p.id || p.offerId,
      companyId: p.companyId || p.ownerId,
      branchId: p.branchId || fallbackBranch,
      slug: p.slug || "",
    },
  };
}

const TITLE_CACHE = new Map();

function uniqueCards(cards) {
  return uniqueCategoryCards(cards);
}

function productCards(list, branchId) {
  const seen = new Set();
  const out = [];
  for (const p of list || []) {
    const c = cardFromProduct(p, branchId);
    const id = c?.sku?.productId;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(c);
    if (out.length >= 24) break;
  }
  return out;
}

async function titleForSlug(ctx, cartCtx, slug, fallback) {
  if (TITLE_CACHE.has(slug)) return TITLE_CACHE.get(slug);
  const r = await callTool(ctx, "silpo_get_category", {
    branchId: cartCtx.branchId,
    deliveryType: cartCtx.deliveryType,
    categorySlug: slug,
  });
  const o = unwrap(r.json);
  const title = o?.category?.title || o?.title;
  const out = title ? String(title) : fallback || humanizeSlug(slug);
  TITLE_CACHE.set(slug, out);
  return out;
}

async function labelCards(ctx, cartCtx, cards, names) {
  if (!names.has("silpo_get_category")) return cards;
  const need = cards.filter((c) => !/[а-яіїєґ]/i.test(c.title || "")).slice(0, 16);
  await Promise.all(
    need.map(async (c) => {
      c.title = await titleForSlug(ctx, cartCtx, c.slug, c.title);
    }),
  );
  return cards;
}

async function searchProducts(ctx, cartCtx, names, q) {
  const query = String(q || "").trim();
  if (!query || !names.has("silpo_find_products_batch")) return [];
  const batch = await callTool(ctx, "silpo_find_products_batch", {
    branchId: cartCtx.branchId,
    deliveryType: cartCtx.deliveryType,
    timeslotStart: cartCtx.timeslotStart,
    timeslotEnd: cartCtx.timeslotEnd,
    products: [query],
    limit: 24,
  });
  let list = preferFresh(productsFromBatch(batch.json), query);
  if (FRESH_RE.test(query) && names.has("silpo_get_products")) {
    const slug = slugForFreshQuery(query);
    if (slug) {
      const shelf = await productsByCategoryPopularity(ctx, cartCtx, [slug], 16);
      list = preferFresh([...shelf, ...list], query);
    }
  }
  return list;
}

function rankBrowsePopular(list, groupId, freq) {
  const slots = slotsForGroup(groupId);
  const ranked = [];
  const seen = new Set();
  for (const s of slots) {
    for (const p of rankProducts(list, { staple: s.staple, freq, allowCatalogFallback: true })) {
      const id = p?.productId || p?.id || p?.offerId;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ranked.push(p);
    }
  }
  for (const p of list || []) {
    const id = p?.productId || p?.id || p?.offerId;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ranked.push(p);
  }
  return ranked;
}

function rankBrowseSlug(list, groupId, slug, tier1, freq) {
  const chip = (tier1 || []).find((c) => c.slug === slug);
  const staple = chip?.staple || "";
  if (staple) {
    return rankProducts(list, { staple, freq, allowCatalogFallback: true });
  }
  return rankBrowsePopular(list, groupId, freq);
}

async function popularProductsForGroup(ctx, context, names, tree, group, freq) {
  const slugs = slugsForGroup(tree, group);
  let list = [];
  if (slugs.length && names.has("silpo_get_products")) {
    list = await productsByCategoryPopularity(ctx, context, slugs.slice(0, 5), 40);
  }
  return rankBrowsePopular(list, group, freq);
}

export async function browseViaMcp(token, body = {}) {
  const boot = await connectMcp(token);
  if (!boot.ok) return { ok: false, reason: "mcp_init_failed", categories: [], products: [] };
  const names = new Set(boot.names);
  const { context } = await bootstrapCart(boot.ctx);
  const hist = await loadHistoryViaMcp(token);
  const freq = hist.freq || {};
  const search = String(body.search || "").trim();
  const group = String(body.group || "").trim();
  const scope = String(body.scope || "").toLowerCase() === "global" || !group ? "global" : "branch";
  const tree = names.has("silpo_get_categories_tree") ? await loadCategoryTree(boot.ctx, context) : { json: {} };

  if (search) {
    let list = await searchProducts(boot.ctx, context, names, search);
    if (scope === "branch") list = filterSearchToGroup(list, group, tree.json);
    return {
      ok: true,
      categories: [],
      tier1: group ? buildBrowseTier1(tree.json, group, freq) : [],
      tier2: [],
      filterSlug: "",
      products: productCards(list, context.branchId),
      title: search,
      scope,
    };
  }

  const slug = String(body.slug || "").trim();
  const tier1SlugBody = String(body.tier1Slug || "").trim();

  if ((!slug || slug === BROWSE_POPULAR_SLUG) && group) {
    const tier1 = buildBrowseTier1(tree.json, group, freq);
    const list = await popularProductsForGroup(boot.ctx, context, names, tree.json, group, freq);
    return {
      ok: true,
      categories: [],
      tier1,
      tier2: [],
      filterSlug: BROWSE_POPULAR_SLUG,
      tier1Slug: BROWSE_POPULAR_SLUG,
      products: productCards(list, context.branchId),
      title: body.groupTitle || group,
    };
  }

  if (slug && slug !== BROWSE_POPULAR_SLUG && names.has("silpo_get_products")) {
    let list = await productsByCategoryPopularity(boot.ctx, context, [slug], 40);
    const node = findCategoryNode(tree.json, slug);
    const tier1 = group ? buildBrowseTier1(tree.json, group, freq) : [];
    const isTier1Chip = tier1.some((c) => c.slug === slug);
    const anchor = isTier1Chip ? slug : tier1SlugBody || slug;
    const anchorNode =
      anchor && anchor !== BROWSE_POPULAR_SLUG ? findCategoryNode(tree.json, anchor) : null;
    const tier2Raw = anchorNode ? uniqueCards(childCategoryCards(anchorNode)) : [];
    if (!list.length && node?.slug && node.slug !== slug) {
      list = await productsByCategoryPopularity(boot.ctx, context, [node.slug], 40);
    }
    if (!list.length) {
      const q = String(body.title || node?.title || humanizeSlug(slug));
      list = await searchProducts(boot.ctx, context, names, q);
      if (group) list = filterSearchToGroup(list, group, tree.json);
    }
    list = rankBrowseSlug(list, group, slug, tier1, freq);
    const categories = await labelCards(boot.ctx, context, tier2Raw, names);
    return {
      ok: true,
      categories,
      tier1,
      tier2: categories,
      filterSlug: slug,
      tier1Slug: isTier1Chip ? slug : tier1SlugBody || slug,
      products: productCards(list, context.branchId),
      title: node?.title || body.title || humanizeSlug(slug),
    };
  }

  let cards = topLevelCategoryCards(tree.json);
  if (names.has("silpo_get_popular_categories")) {
    const popular = await callTool(boot.ctx, "silpo_get_popular_categories", {
      branchId: context.branchId,
      deliveryType: context.deliveryType,
    });
    const pop = cardsFromCategoryPayload(popular.json);
    cards = uniqueCards([...pop, ...cards]);
  }
  if (!cards.length && names.has("silpo_get_categories")) {
    const flat = await callTool(boot.ctx, "silpo_get_categories", {
      branchId: context.branchId,
      limit: 48,
    });
    cards = cardsFromCategoryPayload(flat.json);
  }
  cards = await labelCards(boot.ctx, context, uniqueCards(cards).slice(0, 40), names);
  return { ok: true, categories: cards, products: [] };
}
