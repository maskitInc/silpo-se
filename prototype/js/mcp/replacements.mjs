import { isWeightedProduct, lineTotalPrice, productImage, productsForQuery, productsFromBatch } from "./normalize.js";
import { preferFresh } from "../fresh.js";
import { bootstrapCart } from "./bootstrap.mjs";
import { callTool, connectMcp } from "./client.mjs";
import { unwrap } from "./unwrap.js";
import { loadHistoryViaMcp } from "./history.mjs";
import {
  preferredKind,
  rankProducts,
  scoreProduct,
  searchKeysForStaple,
  toStaple,
} from "../staples.js";
import { groupOfQuery, slotsForGroup } from "../groups.js";
import { loadCategoryTree, productsByCategoryPopularity, slugsForStaple, findCategoryNode, childCategoryCards, humanizeSlug } from "./catalog.mjs";

function cardFromProduct(p, fallbackBranch) {
  if (!p) return null;
  const name = p.title || p.name || "";
  const unit = typeof p.price === "number" ? p.price : Number(p.price);
  const unitPrice = Number.isFinite(unit) ? unit : null;
  return {
    name,
    price: lineTotalPrice(unitPrice, p, 1),
    unitPrice,
    weighted: isWeightedProduct(p),
    step: p.step ?? p.addToBasketStep ?? p.weightStep ?? null,
    displayRatio: p.displayRatio != null ? String(p.displayRatio) : "",
    q: name,
    image: productImage(p),
    sku: {
      productId: p.productId || p.id || p.offerId,
      companyId: p.companyId || p.ownerId,
      branchId: p.branchId || fallbackBranch,
      slug: p.slug || "",
    },
  };
}

function facetKey(f) {
  return `${f.kind}:${f.id}`;
}

export function buildFacets(staple, group, treeJson) {
  const gid = group || groupOfQuery(staple);
  const out = [];
  const seen = new Set();
  function push(f) {
    if (!f?.id || !f.title) return;
    const k = facetKey(f);
    if (seen.has(k) || seen.has(f.title.toLowerCase())) return;
    seen.add(k);
    seen.add(f.title.toLowerCase());
    out.push(f);
  }
  for (const s of slotsForGroup(gid)) {
    push({ kind: "slot", id: s.id, title: s.title, staple: s.staple, q: s.q });
  }
  const slugs = slugsForStaple(treeJson, staple);
  for (const slug of slugs) {
    const node = findCategoryNode(treeJson, slug);
    const kids = childCategoryCards(node);
    if (kids.length) {
      for (const c of kids) {
        push({ kind: "cat", id: c.slug, title: c.title || humanizeSlug(c.slug), slug: c.slug });
      }
    } else if (node) {
      push({
        kind: "cat",
        id: node.slug || slug,
        title: node.title || humanizeSlug(node.slug || slug),
        slug: node.slug || slug,
      });
    }
  }
  return out.slice(0, 10);
}

function listFromPayload(payload) {
  const o = unwrap(payload);
  const lists = [
    o.replacements,
    o.products,
    o.items,
    o.similar,
    o.offers,
    Array.isArray(o.data) ? o.data : null,
  ];
  for (const list of lists) {
    if (Array.isArray(list) && list.length) {
      return list.flatMap((x) => (Array.isArray(x.products) ? x.products : [x]));
    }
  }
  return productsFromBatch(payload);
}

export async function replacementsViaMcp(token, body = {}) {
  const boot = await connectMcp(token);
  if (!boot.ok) return { ok: false, reason: "mcp_init_failed", options: [] };
  const names = new Set(boot.names);
  const { context } = await bootstrapCart(boot.ctx);
  const branchId = body.branchId || context.branchId;
  const companyId = body.companyId || context.companyId;
  const deliveryType = body.deliveryType || context.deliveryType;
  const query = String(body.query || "").trim();
  const hist = await loadHistoryViaMcp(token);
  const historyFreq = hist.freq || {};
  const staple = body.staple || toStaple(query) || query;
  const kind = preferredKind(historyFreq, staple);
  const seen = new Set();
  const options = [];

  function pushAll(arr) {
    const rankStaple = facetStaple || staple;
    const ranked = rankProducts(arr, { staple: rankStaple, freq: historyFreq, kind });
    const src = ranked.length ? ranked : arr;
    for (const p of src) {
      if (scoreProduct(p, { staple: rankStaple, freq: historyFreq, kind }) < 0) continue;
      const card = cardFromProduct(p, branchId);
      if (!card?.sku?.productId || seen.has(card.sku.productId)) continue;
      if (body.productId && String(card.sku.productId) === String(body.productId)) continue;
      seen.add(card.sku.productId);
      options.push(card);
    }
  }

  const typed = String(body.search || "").trim();
  const facetSlug = String(body.slug || "").trim();
  const facetStaple = body.facetStaple || (facetSlug ? "" : staple);
  const group = body.group || groupOfQuery(staple);
  let treeJson = {};
  if (names.has("silpo_get_categories_tree")) {
    const tree = await loadCategoryTree(boot.ctx, context);
    treeJson = tree.json || {};
  }
  const facets = buildFacets(staple, group, treeJson);

  if (typed && names.has("silpo_find_products_batch")) {
    const batch = await callTool(boot.ctx, "silpo_find_products_batch", {
      branchId,
      deliveryType,
      timeslotStart: context.timeslotStart,
      timeslotEnd: context.timeslotEnd,
      products: [typed],
      limit: 30,
    });
    const loose = preferFresh(
      [...productsForQuery(batch.json, typed), ...productsFromBatch(batch.json)],
      typed,
    );
    for (const p of loose) {
      const card = cardFromProduct(p, branchId);
      if (!card?.sku?.productId || seen.has(card.sku.productId)) continue;
      seen.add(card.sku.productId);
      options.push(card);
    }
  }

  if (facetSlug && names.has("silpo_get_products")) {
    const extra = await productsByCategoryPopularity(boot.ctx, context, [facetSlug], 50);
    pushAll(extra);
  }

  if (!typed && !facetSlug && staple && names.has("silpo_find_products_batch")) {
    const products = searchKeysForStaple(historyFreq, facetStaple || staple).slice(0, 8);
    const batch = await callTool(boot.ctx, "silpo_find_products_batch", {
      branchId,
      deliveryType,
      timeslotStart: context.timeslotStart,
      timeslotEnd: context.timeslotEnd,
      products,
      limit: 30,
    });
    const pool = products.flatMap((k) => productsForQuery(batch.json, k));
    pushAll(pool);
  }

  if (options.length < 3 && names.has("silpo_get_products")) {
    const slugs = facetSlug ? [facetSlug] : slugsForStaple(treeJson, facetStaple || staple, kind, historyFreq);
    if (slugs.length) {
      const extra = await productsByCategoryPopularity(boot.ctx, context, slugs, 50);
      pushAll(extra);
    }
  }

  const allowMcpAlts = staple !== "хліб";
  if (allowMcpAlts && options.length < 3 && body.productId && names.has("silpo_get_replacements") && companyId && branchId && deliveryType) {
    const r = await callTool(boot.ctx, "silpo_get_replacements", {
      branchId,
      companyId,
      productIds: [body.productId],
      deliveryType,
    });
    pushAll(listFromPayload(r.json));
  }

  if (allowMcpAlts && options.length < 3 && body.productSlug && names.has("silpo_get_similar_products") && branchId) {
    const r = await callTool(boot.ctx, "silpo_get_similar_products", {
      branchId,
      slug: body.productSlug,
      limit: 8,
      deliveryType,
    });
    pushAll(listFromPayload(r.json));
  }

  return { ok: true, options: options.slice(0, 8), facets };
}
