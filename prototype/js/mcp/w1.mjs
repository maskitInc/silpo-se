import {
  extractCheckout,
  extractBranchLabel,
  lineFromProduct,
  amountLabelFromProduct,
  cartQuantity,
  lineTotalPrice,
  packLabelFromName,
  productsForQuery,
  productsFromBatch,
  cartQtyByProductId,
  planCartMerge,
} from "./normalize.js";
import { bootstrapCart } from "./bootstrap.mjs";
import { callTool, connectMcp } from "./client.mjs";
import { loadCategoryTree, productsByCategoryPopularity, slugsForStaple } from "./catalog.mjs";
import {
  buildBatchQueries,
  historyNamesForStaple,
  pickMatchingProduct,
  preferredKind,
  searchKeysForStaple,
} from "../staples.js";
import { isPinnedQuery } from "../fresh.js";
import { destinationGroupForAdd, groupMeta } from "../groups.js";

function stapleOf(q) {
  return q.staple || q.role || q.q;
}

function collectRoundRobinKeys(keyLists, max) {
  const products = [];
  const seen = new Set();
  const maxDepth = Math.max(0, ...keyLists.map((k) => k.length));
  for (let depth = 0; depth < maxDepth; depth++) {
    for (const keys of keyLists) {
      const k = keys[depth];
      if (!k) continue;
      const id = String(k).toLowerCase();
      if (seen.has(id) || products.length >= max) continue;
      seen.add(id);
      products.push(k);
      if (products.length >= max) return products;
    }
  }
  return products;
}

async function mapPool(items, concurrency, fn) {
  if (!items.length) return [];
  const n = Math.max(1, Math.min(concurrency, items.length));
  const out = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

function foldName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[«»"'`™®]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pickExactName(list, name) {
  const n = foldName(name);
  if (!n) return null;
  const arr = Array.isArray(list) ? list : [];
  return arr.find((p) => foldName(p?.name || p?.title) === n) || null;
}

function pickById(list, productId) {
  if (productId == null || productId === "") return null;
  const id = String(productId);
  const arr = Array.isArray(list) ? list : [];
  return (
    arr.find((p) => String(p.productId || p.id || p.offerId || "") === id) || null
  );
}

function pickIds(product, fallbackBranch) {
  return {
    productId: product.productId || product.id || product.offerId,
    companyId: product.companyId || product.ownerId,
    branchId: product.branchId || fallbackBranch,
    slug: product.slug || "",
  };
}

export async function resolveViaMcp(shopQueries, { token, confirmed = false, historyFreq = {}, preferKind = null } = {}) {
  const trace = [];
  const boot = await connectMcp(token);
  trace.push({ step: boot.step, http: boot.http, toolCount: boot.names?.length || 0 });
  if (!boot.ok) return { ok: false, reason: "mcp_init_failed", http: boot.http, trace };

  const names = new Set(boot.names);
  if (!names.has("silpo_get_my_shopping_cart") || !names.has("silpo_find_products_batch")) {
    return { ok: false, reason: "tools_missing", names: boot.names, trace };
  }

  const { cart, byId, context } = await bootstrapCart(boot.ctx);
  trace.push({ tool: "silpo_get_my_shopping_cart", http: cart.http });
  trace.push({ tool: "silpo_get_shopping_cart_by_id", http: byId.http });

  if (!context.branchId || !context.deliveryType || !context.timeslotStart || !context.timeslotEnd) {
    return {
      ok: false,
      reason: "cart_context_incomplete",
      context: { hasBranch: Boolean(context.branchId), hasSlot: Boolean(context.timeslotStart) },
      trace,
    };
  }

  const catalogQueries = (shopQueries || []).filter((q) => !isPinnedQuery(q));
  const { products, mapRole } = buildBatchQueries(catalogQueries, historyFreq, 30);
  const batch =
    products.length === 0
      ? { http: 0, json: {} }
      : await callTool(boot.ctx, "silpo_find_products_batch", {
          branchId: context.branchId,
          deliveryType: context.deliveryType,
          timeslotStart: context.timeslotStart,
          timeslotEnd: context.timeslotEnd,
          products,
          limit: 30,
        });
  trace.push({ tool: "silpo_find_products_batch", http: batch.http, itemCount: products.length });

  let treeJson = null;
  if (names.has("silpo_get_categories_tree")) {
    const tree = await loadCategoryTree(boot.ctx, context);
    treeJson = tree.json;
    trace.push({ tool: "silpo_get_categories_tree", http: tree.http });
  }

  const siblingNames = (shopQueries || []).map((q) => q.q);
  const lines = [];
  /** @type {Array<{ q: object, staple: string, keys: string[], kind: string|null, band: object, pool: object[], swapped: boolean, histNames: string[], hint: string|null, p: object|null }>} */
  const pending = [];

  for (const q of shopQueries) {
    if (isPinnedQuery(q)) {
      let p = null;
      if (names.has("silpo_find_products_batch") && q.q) {
        const extraBatch = await callTool(boot.ctx, "silpo_find_products_batch", {
          branchId: context.branchId,
          deliveryType: context.deliveryType,
          timeslotStart: context.timeslotStart,
          timeslotEnd: context.timeslotEnd,
          products: [q.q],
          limit: 10,
        });
        const extraPool = [...productsForQuery(extraBatch.json, q.q), ...productsFromBatch(extraBatch.json)];
        p = pickById(extraPool, q.productId) || pickExactName(extraPool, q.q);
        trace.push({ tool: "silpo_find_products_batch", http: extraBatch.http, phase: "pinned_add" });
      }
      const fake = {
        title: q.q,
        name: q.q,
        price: q.price,
        image: q.image,
        productId: q.productId,
        companyId: q.sku?.companyId,
        branchId: q.sku?.branchId || context.branchId,
        slug: q.sku?.slug || q.slug,
        available: true,
      };
      const product = p || fake;
      const line = lineFromProduct(product, q, { stockSoft: true });
      line.wanted = q.q;
      line.staple = q.staple || q.q;
      const group = destinationGroupForAdd(product.name || product.title || q.q, siblingNames);
      line.group = group;
      line.groupTitle = groupMeta(group).title;
      line.why = q.why || `додано · ${line.groupTitle}`;
      line.sku = pickIds(product, context.branchId);
      lines.push(line);
      continue;
    }
    const staple = stapleOf(q);
    const keys = mapRole.filter((m) => m.q === q).map((m) => m.k);
    const kind = preferredKind(historyFreq, staple);
    const band = { priceMin: q.priceMin, priceMax: q.priceMax };
    const pool = [];
    for (const k of keys.length ? keys : [staple]) {
      pool.push(...productsForQuery(batch.json, k));
    }
    const swapped = Boolean(q.productId);
    const histNames = historyNamesForStaple(historyFreq, staple);
    const hint = q.q && q.q !== staple ? q.q : null;
    const kindPrefer =
      preferKind === "ready" || preferKind === "raw" || preferKind === "fresh"
        ? preferKind
        : context.preferKind === "ready" || context.preferKind === "raw" || context.preferKind === "fresh"
          ? context.preferKind
          : kind;
    let p = swapped
      ? pickById(pool, q.productId) || pickExactName(pool, q.q)
      : pickMatchingProduct(pool, staple, { freq: historyFreq, kind: kindPrefer, staple, hint, ...band });
    pending.push({ q, staple, keys, kind: kindPrefer, band, pool, swapped, histNames, hint, p });
  }

  // One shared history_retry batch for all misses (was N sequential MCP calls).
  if (names.has("silpo_find_products_batch")) {
    const needHist = pending.filter((row) => !row.p && !row.swapped && row.histNames.length);
    if (needHist.length) {
      const keyLists = needHist.map((row) => searchKeysForStaple(historyFreq, row.staple).slice(0, 8));
      const keySet = collectRoundRobinKeys(keyLists, 30);
      if (keySet.length) {
        const extraBatch = await callTool(boot.ctx, "silpo_find_products_batch", {
          branchId: context.branchId,
          deliveryType: context.deliveryType,
          timeslotStart: context.timeslotStart,
          timeslotEnd: context.timeslotEnd,
          products: keySet,
          limit: 30,
        });
        trace.push({
          tool: "silpo_find_products_batch",
          http: extraBatch.http,
          phase: "history_retry",
          itemCount: keySet.length,
          staples: needHist.length,
        });
        for (let i = 0; i < needHist.length; i++) {
          const row = needHist[i];
          for (const k of keyLists[i]) {
            row.pool.push(...productsForQuery(extraBatch.json, k));
          }
          row.p = pickMatchingProduct(row.pool, row.staple, {
            freq: historyFreq,
            kind: row.kind,
            staple: row.staple,
            hint: row.hint,
            ...row.band,
          });
        }
      }
    }
  }

  // Category fallback only when still missing or swap needs exact id (skip when batch already matched).
  const needCat = pending.filter(
    (row) => names.has("silpo_get_products") && (row.swapped || !row.p),
  );
  if (needCat.length) {
    await mapPool(needCat, 3, async (row) => {
      const slugs = slugsForStaple(treeJson, row.staple, row.kind, historyFreq);
      const slugList =
        row.swapped || row.staple === "пиво" || row.staple === "зелень" || row.staple === "консервація"
          ? slugs
          : slugs.slice(0, 1);
      const popular = await productsByCategoryPopularity(boot.ctx, context, slugList, 50, { concurrency: 2 });
      trace.push({
        tool: "silpo_get_products",
        staple: row.staple,
        slugs: slugList,
        itemCount: popular.length,
      });
      if (row.swapped) {
        row.p =
          pickById(row.pool, row.q.productId) ||
          pickExactName(row.pool, row.q.q) ||
          pickById(popular, row.q.productId) ||
          pickExactName(popular, row.q.q);
      } else if (row.histNames.length) {
        row.p = pickMatchingProduct([...row.pool, ...popular], row.staple, {
          freq: historyFreq,
          kind: row.kind,
          staple: row.staple,
          hint: row.hint,
          ...row.band,
        });
        if (!row.p) {
          row.p = pickMatchingProduct(popular, row.staple, {
            freq: {},
            kind: null,
            staple: row.staple,
            hint: row.hint,
            allowCatalogFallback: true,
            allowKindFallback: true,
            ...row.band,
          });
        }
      } else {
        row.p =
          pickMatchingProduct(popular, row.staple, {
            freq: {},
            kind: null,
            staple: row.staple,
            hint: row.hint,
            allowCatalogFallback: true,
            ...row.band,
          }) || row.p;
      }
    });
  }

  if (names.has("silpo_find_products_batch")) {
    const needRetry = pending.filter((row) => !row.p && !row.swapped);
    if (needRetry.length) {
      const keyLists = needRetry.map((row) => searchKeysForStaple(historyFreq, row.staple).slice(0, 6));
      const keySet = collectRoundRobinKeys(keyLists, 30);
      if (keySet.length) {
        const extraBatch = await callTool(boot.ctx, "silpo_find_products_batch", {
          branchId: context.branchId,
          deliveryType: context.deliveryType,
          timeslotStart: context.timeslotStart,
          timeslotEnd: context.timeslotEnd,
          products: keySet,
          limit: 30,
        });
        trace.push({
          tool: "silpo_find_products_batch",
          http: extraBatch.http,
          phase: "staple_retry",
          itemCount: keySet.length,
          staples: needRetry.length,
        });
        for (let i = 0; i < needRetry.length; i++) {
          const row = needRetry[i];
          const retryPool = [];
          for (const k of keyLists[i]) {
            retryPool.push(...productsForQuery(extraBatch.json, k));
          }
          row.p = pickMatchingProduct(retryPool, row.staple, {
            freq: historyFreq,
            kind: row.kind,
            staple: row.staple,
            hint: row.hint,
            allowCatalogFallback: true,
            allowKindFallback: true,
            ...row.band,
          });
        }
      }
    }
  }

  for (const row of pending) {
    const { q, staple, kind, swapped } = row;
    let { p } = row;
    if (swapped && !p && names.has("silpo_find_products_batch") && q.q) {
      const extraBatch = await callTool(boot.ctx, "silpo_find_products_batch", {
        branchId: context.branchId,
        deliveryType: context.deliveryType,
        timeslotStart: context.timeslotStart,
        timeslotEnd: context.timeslotEnd,
        products: [q.q],
        limit: 10,
      });
      const extraPool = [...productsForQuery(extraBatch.json, q.q), ...productsFromBatch(extraBatch.json)];
      p = pickById(extraPool, q.productId) || pickExactName(extraPool, q.q);
    }
    if (!p) {
      const units = Math.max(1, Number(q.units) || 1);
      lines.push({
        role: q.role,
        wanted: staple,
        staple,
        name: q.q,
        status: "missing",
        price: null,
        envelope: q.envelope || "food",
        note: kind ? `немає SKU під ваш звичний тип (${kind})` : "немає SKU з назвою як запит",
        sku: null,
        group: q.group || "",
        groupTitle: q.groupTitle || "",
        why: q.why || "",
        units,
        amount: units > 1 ? `${units} шт` : packLabelFromName(q.q) || "—",
      });
      continue;
    }
    const line = lineFromProduct(p, q, { stockSoft: true });
    line.wanted = staple;
    line.staple = staple;
    line.group = q.group || "";
    line.groupTitle = q.groupTitle || "";
    line.why = q.why || "";
    const units = Math.max(1, Number(line.units) || Number(q.units) || 1);
    line.units = units;
    // Re-sync amount/price after final units (never leave stale «N шт» on weight SKUs).
    const unitPrice =
      typeof p.price === "number"
        ? p.price
        : Number(p.price ?? p.priceValue ?? p.pricePerUnit);
    line.quantity = cartQuantity(p, units);
    line.price = Number.isFinite(unitPrice) ? lineTotalPrice(unitPrice, p, units) : line.price;
    line.amount = amountLabelFromProduct(p, line.name, units);
    line.sku = pickIds(p, context.branchId);
    const meal = ["breakfast", "lunch", "dinner"].includes(q.role) || /^(breakfast|lunch|dinner):/.test(String(q.role || ""));
    if (!meal && swapped && line.status === "found") line.status = "replaced";
    lines.push(line);
  }

  let checkout = null;
  if (confirmed && names.has("silpo_add_or_update_cart_products")) {
    const haveMap = cartQtyByProductId(byId.json);
    const desired = lines
      .filter((l) => l.status === "found" && l.sku?.productId && l.sku?.companyId && l.sku?.branchId)
      .map((l) => {
        const qty = Number(l.quantity);
        return {
          productId: l.sku.productId,
          companyId: l.sku.companyId,
          branchId: l.sku.branchId,
          quantity: Number.isFinite(qty) && qty > 0 ? qty : Math.max(1, Number(l.units) || 1),
        };
      });
    const { toAdd } = planCartMerge(desired, haveMap);
    if (toAdd.length) {
      const add = await callTool(boot.ctx, "silpo_add_or_update_cart_products", {
        shoppingCartId: context.shoppingCartId,
        products: toAdd,
      });
      trace.push({ tool: "silpo_add_or_update_cart_products", http: add.http, n: toAdd.length });
      const again = await callTool(boot.ctx, "silpo_get_shopping_cart_by_id", {
        shoppingCartId: context.shoppingCartId,
      });
      trace.push({ tool: "silpo_get_shopping_cart_by_id", http: again.http, phase: "after_write" });
      checkout = extractCheckout(again.json);
    } else {
      checkout = extractCheckout(byId.json);
      trace.push({ tool: "silpo_add_or_update_cart_products", skipped: "already_satisfied" });
    }
  }

  return {
    ok: true,
    trace,
    toolNames: boot.names,
    resolve: {
      lines,
      branchLabel: extractBranchLabel(byId.json) || "ваш магазин",
      totals: {
        min: lines.reduce((s, l) => s + (l.price || 0), 0),
        max: lines.reduce((s, l) => s + (l.price || 0), 0),
      },
      checkout,
    },
  };
}

function chunkList(arr, size) {
  const out = [];
  const n = Math.max(1, size | 0);
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/**
 * Push already-resolved SKUs into the guest Silpo cart.
 * Merge = ensure at least Express qty (delta only) — no double on re-push.
 * Returns checkout link for soft handoff (A).
 */
export async function pushCartProducts(token, products = [], { merge = true } = {}) {
  const trace = [];
  const boot = await connectMcp(token);
  trace.push({ step: boot.step, http: boot.http, toolCount: boot.names?.length || 0 });
  if (!boot.ok) {
    return { ok: false, error: "mcp_init_failed", http: boot.http, trace, added: 0, skipped: 0, already: 0 };
  }
  const names = new Set(boot.names);
  if (!names.has("silpo_add_or_update_cart_products") || !names.has("silpo_get_my_shopping_cart")) {
    return { ok: false, error: "tools_missing", trace, added: 0, skipped: 0, already: 0 };
  }

  const { cart, byId, context } = await bootstrapCart(boot.ctx);
  trace.push({ tool: "silpo_get_my_shopping_cart", http: cart.http });
  trace.push({ tool: "silpo_get_shopping_cart_by_id", http: byId.http });

  if (!context.shoppingCartId || !context.branchId) {
    return {
      ok: false,
      error: "cart_context_incomplete",
      trace,
      added: 0,
      skipped: 0,
      already: 0,
    };
  }

  const fallbackBranch = context.branchId;
  const normalized = (products || []).map((p) => ({
    productId: p.productId || p.sku?.productId || p.id,
    companyId: p.companyId || p.sku?.companyId,
    branchId: p.branchId || p.sku?.branchId || fallbackBranch,
    quantity: p.quantity,
    units: p.units,
  }));

  let toAdd;
  let already = 0;
  let skipped = 0;
  if (merge === false) {
    // Absolute replace qty for listed SKUs (still dedupe).
    const { toAdd: absRows, skippedInvalid, uniqueWanted } = planCartMerge(normalized, new Map());
    skipped = skippedInvalid;
    toAdd = absRows.map((row) => ({ ...row, addQuantity: false }));
    void uniqueWanted;
    already = 0;
  } else {
    const haveMap = cartQtyByProductId(byId.json);
    const plan = planCartMerge(normalized, haveMap);
    toAdd = plan.toAdd;
    already = plan.already;
    skipped = plan.skippedInvalid;
    trace.push({
      step: "merge_plan",
      haveSkus: haveMap.size,
      wanted: plan.uniqueWanted,
      delta: toAdd.length,
      already,
      skippedInvalid: skipped,
    });
  }

  if (!normalized.length || (skipped && !toAdd.length && !already)) {
    return {
      ok: false,
      error: "no_skus",
      message: "Немає валідних SKU для кошика (потрібен live MCP resolve)",
      trace,
      added: 0,
      skipped,
      already,
    };
  }

  if (!toAdd.length) {
    return {
      ok: true,
      checkout: extractCheckout(byId.json),
      added: 0,
      skipped,
      already,
      merge: merge !== false,
      branchLabel: extractBranchLabel(byId.json),
      trace,
      message: already ? "Усі позиції вже в кошику — нічого не додавали" : "Немає змін",
    };
  }

  for (const chunk of chunkList(toAdd, 30)) {
    const add = await callTool(boot.ctx, "silpo_add_or_update_cart_products", {
      shoppingCartId: context.shoppingCartId,
      products: chunk,
    });
    trace.push({ tool: "silpo_add_or_update_cart_products", http: add.http, n: chunk.length });
    if (add.http >= 400) {
      return {
        ok: false,
        error: "cart_write_failed",
        http: add.http,
        trace,
        added: 0,
        skipped,
        already,
      };
    }
  }

  const again = await callTool(boot.ctx, "silpo_get_shopping_cart_by_id", {
    shoppingCartId: context.shoppingCartId,
  });
  trace.push({ tool: "silpo_get_shopping_cart_by_id", http: again.http, phase: "after_write" });
  const checkout = extractCheckout(again.json);

  return {
    ok: true,
    checkout,
    added: toAdd.length,
    skipped,
    already,
    merge: merge !== false,
    branchLabel: extractBranchLabel(byId.json) || extractBranchLabel(again.json),
    trace,
  };
}
