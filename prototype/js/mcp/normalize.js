import { unwrap } from "./unwrap.js";

export function extractCartId(payload) {
  const o = unwrap(payload);
  return o?.shoppingCartId || o?.cartId || o?.id || o?.cart?.shoppingCartId || o?.cart?.id || null;
}

export function extractCheckout(payload) {
  const o = unwrap(payload);
  const cart = o?.cart || o;
  return cart?.checkoutMobileLink || cart?.checkoutWebLink || cart?.checkoutLink || null;
}

/** Map productId → quantity already in guest cart (sum across shipments). */
export function cartQtyByProductId(payload) {
  const o = unwrap(payload);
  const cart = o?.cart || o || {};
  const map = new Map();
  const ships = Array.isArray(cart.shipments) ? cart.shipments : [];
  const piles = [
    ...(Array.isArray(cart.products) ? cart.products : []),
    ...(Array.isArray(cart.items) ? cart.items : []),
    ...ships.flatMap((s) => [...(Array.isArray(s?.products) ? s.products : []), ...(Array.isArray(s?.items) ? s.items : [])]),
  ];
  for (const line of piles) {
    if (!line || typeof line !== "object") continue;
    const id = String(line.productId || line.offerId || line.id || "");
    if (!id || id === "undefined" || id === "null") continue;
    const q = Number(line.quantity ?? line.qty ?? line.count ?? 0);
    if (!Number.isFinite(q) || q <= 0) continue;
    map.set(id, (map.get(id) || 0) + q);
  }
  return map;
}

/**
 * Idempotent merge plan: dedupe desired SKUs, only request delta above cart qty.
 * Does not reduce existing cart lines.
 */
export function planCartMerge(desired = [], haveMap = new Map(), { eps = 1e-6 } = {}) {
  const wantById = new Map();
  let skippedInvalid = 0;
  for (const p of desired || []) {
    const productId = p?.productId || p?.sku?.productId || p?.id;
    const companyId = p?.companyId || p?.sku?.companyId;
    const branchId = p?.branchId || p?.sku?.branchId;
    const qtyRaw = Number(p?.quantity);
    const qty =
      Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : Math.max(1, Number(p?.units) || 1);
    if (!productId || !companyId || !branchId) {
      skippedInvalid += 1;
      continue;
    }
    const id = String(productId);
    const prev = wantById.get(id);
    if (prev) {
      prev.quantity += qty;
    } else {
      wantById.set(id, {
        productId,
        companyId,
        branchId,
        quantity: qty,
      });
    }
  }

  const toAdd = [];
  let already = 0;
  for (const row of wantById.values()) {
    const have = Number(haveMap.get(String(row.productId)) || 0);
    const want = row.quantity;
    if (have + eps >= want) {
      already += 1;
      continue;
    }
    const delta = Math.round((want - have) * 1000) / 1000;
    if (delta <= eps) {
      already += 1;
      continue;
    }
    toAdd.push({
      productId: row.productId,
      companyId: row.companyId,
      branchId: row.branchId,
      quantity: delta,
      addQuantity: true,
    });
  }
  return { toAdd, already, skippedInvalid, uniqueWanted: wantById.size };
}

export function extractBranchLabel(payload) {
  const o = unwrap(payload);
  const cart = o?.cart || o;
  const named =
    cart?.branchName ||
    cart?.branch?.name ||
    cart?.shipments?.[0]?.branchName;
  if (named) return String(named);
  const dt = cart?.deliveryType;
  const ua = {
    DeliveryHome: "доставка додому",
    SelfPickup: "самовивіз",
    NovaPoshta: "Нова пошта",
  };
  if (dt && ua[dt]) return ua[dt];
  if (dt) return String(dt);
  return "ваш магазин";
}

export function productsFromBatch(payload) {
  const o = unwrap(payload);
  if (Array.isArray(o?.queries)) {
    return o.queries.flatMap((b) => b.products || b.items || b.offers || []);
  }
  if (Array.isArray(o?.batches)) {
    return o.batches.flatMap((b) => b.products || b.items || []);
  }
  const lists = [o?.products, o?.items, o?.offers, o?.data, Array.isArray(o) ? o : null];
  for (const list of lists) {
    if (Array.isArray(list) && list.length) return list;
  }
  return [];
}

/** Best-effort product photo URL from MCP shapes. */
export function productImage(product) {
  if (!product || typeof product !== "object") return "";
  const pick = (v) => {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (v && typeof v === "object") {
      const nested = v.url || v.src || v.href || v.imageUrl || v.image;
      if (typeof nested === "string" && nested.trim()) return nested.trim();
    }
    return "";
  };
  for (const key of ["image", "imageUrl", "img", "mainImage", "picture", "photo"]) {
    const hit = pick(product[key]);
    if (hit) return hit;
  }
  const media = product.media || product.images || product.photos;
  if (Array.isArray(media) && media.length) {
    const hit = pick(media[0]);
    if (hit) return hit;
  }
  return "";
}

export function productsForQuery(payload, q) {
  const o = unwrap(payload);
  const groups = Array.isArray(o?.queries) ? o.queries : [];
  const needle = String(q).toLowerCase();
  const group =
    groups.find((g) => String(g.query || "").toLowerCase() === needle) ||
    groups.find((g) => String(g.query || "").toLowerCase().includes(needle)) ||
    groups.find((g) => needle.includes(String(g.query || "").toLowerCase()));
  const list = group?.products || group?.items || [];
  return Array.isArray(list) ? list : [];
}

/** Silpo: `displayRatio` is a pack label string like "400г", NOT basket step kg. */
export function parseDisplayRatio(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    // Rare numeric: treat <1 as kg, else grams (Silpo almost always sends strings).
    if (raw < 1) return { grams: Math.round(raw * 1000), label: `${fmtUaNum(raw * 1000)} г` };
    if (raw >= 10) return { grams: Math.round(raw), label: `${fmtUaNum(raw)} г` };
    return null;
  }
  const m = String(raw)
    .trim()
    .match(/^(\d+[.,]?\d*)\s*(кг|г|гр)$/i);
  if (!m) return null;
  const n = Number(String(m[1]).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  const u = m[2].toLowerCase();
  if (u === "кг") return { grams: Math.round(n * 1000), label: `${fmtUaNum(n)} кг` };
  return { grams: Math.round(n), label: `${fmtUaNum(n)} г` };
}

function numericBasketStep(product) {
  for (const key of ["step", "addToBasketStep", "weightStep"]) {
    const v = Number(product?.[key]);
    if (Number.isFinite(v) && v > 0) return v;
  }
  return null;
}

/** Silpo weighted SKUs: shelf `price` is ₴/kg; cart `quantity` is kg (multiples of step). */
export function isWeightedProduct(product) {
  if (!product || typeof product !== "object") return false;
  if (product.weighted || product.isWeighted || product.byWeight) return true;
  const unit = String(
    product.unit || product.measureUnit || product.priceUnit || product.unitName || "",
  ).toLowerCase();
  if (/(^|\/)(кг|kg)\b|weight|ваг/.test(unit)) return true;
  // Fractional basket step (0.1 / 0.5 / 0.6) ⇒ sold by weight even if flag missing.
  const step = numericBasketStep(product);
  if (step != null && step < 1) return true;
  // Fractional stock (15.6 kg left) is a strong Silpo signal for weight goods.
  const stock = Number(product.stock);
  if (Number.isFinite(stock) && stock > 0 && !Number.isInteger(stock)) return true;
  return false;
}

/** Default basket step in kg (e.g. 0.1 → 100 г, 0.6 → 600 г). Never parse displayRatio here. */
export function basketStepKg(product, nameHint = "") {
  const step = numericBasketStep(product);
  if (step != null) return step;
  const name = String(nameHint || product?.title || product?.name || "");
  const m = name.match(/(\d+[.,]?\d*)\s*(кг|г|гр)\b/i);
  if (!m) return 1;
  const n = Number(String(m[1]).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return 1;
  const u = m[2].toLowerCase();
  return u === "кг" ? n : n / 1000;
}

/** Cart quantity: pieces for packed SKUs, kg for weighted. */
export function cartQuantity(product, units = 1) {
  const u = Math.max(1, Number(units) || 1);
  if (isWeightedProduct(product)) {
    return Math.round(basketStepKg(product) * u * 1000) / 1000;
  }
  return u;
}

/** Line total: unitPrice × cart qty (₴/kg × kg, or ₴/шт × шт). */
export function lineTotalPrice(unitPrice, product, units = 1) {
  if (typeof unitPrice !== "number" || !Number.isFinite(unitPrice)) return null;
  return Math.round(unitPrice * cartQuantity(product, units) * 100) / 100;
}

export function amountLabelFromProduct(product, nameHint, units = 1) {
  const u = Math.max(1, Number(units) || 1);
  if (isWeightedProduct(product)) {
    const kg = basketStepKg(product, nameHint) * u;
    if (kg < 1) return `${fmtUaNum(Math.round(kg * 1000 * 1000) / 1000)} г`;
    return `${fmtUaNum(kg)} кг`;
  }
  // Packed SKU with net weight on shelf (displayRatio "400г") — show weight, not «шт».
  const pack = parseDisplayRatio(product?.displayRatio);
  if (pack) return u > 1 ? `${u}×${pack.label}` : pack.label;
  if (u > 1) return `${u} шт`;
  return packLabelFromProduct(product, nameHint);
}

/** Checklist amount: г/кг for weight + displayRatio packs (never silent «N шт» for those). */
export function amountLabelFromLine(line) {
  if (!line) return "";
  const units = Math.max(1, Number(line.units) || 1);
  const step = Number(line.step);
  const qty = Number(line.quantity);
  const pseudo = {
    weighted: line.weighted,
    step: Number.isFinite(step) && step > 0 ? step : undefined,
    displayRatio: line.displayRatio,
    stock: line.stock,
    name: line.name,
    title: line.name,
  };
  if (!pseudo.step && Number.isFinite(qty) && qty > 0 && (line.weighted || qty !== units)) {
    pseudo.step = Math.round((qty / units) * 1000) / 1000;
  }
  if (isWeightedProduct(pseudo)) {
    return amountLabelFromProduct({ ...pseudo, weighted: true }, line.name, units);
  }
  const pack = parseDisplayRatio(line.displayRatio);
  if (pack) return units > 1 ? `${units}×${pack.label}` : pack.label;
  // Stale «N шт» on a weight line (old server) — refuse if quantity looks like kg.
  if (Number.isFinite(qty) && qty > 0 && qty < units) {
    return amountLabelFromProduct({ weighted: true, step: qty / units }, line.name, units);
  }
  if (line.amount && !/^\d+\s*шт$/i.test(String(line.amount).trim())) return String(line.amount);
  if (units > 1) return `${units} шт`;
  return packLabelFromName(line.name) || "1 шт";
}

export function lineFromProduct(product, query, opts = {}) {
  const name = product?.title || product?.name || product?.displayName || product?.offerName || query.q;
  const available = product?.available !== false && product?.inStock !== false && !product?.outOfStock;
  const priceRaw =
    product?.price ??
    product?.priceValue ??
    product?.cost ??
    product?.pricePerUnit ??
    product?.salePrice;
  const price = coercePrice(priceRaw);
  const stockSoft = Boolean(opts.stockSoft) && !available;
  const units = Math.max(1, Number(query?.units) || 1);
  const unitPrice = available || stockSoft ? price : null;
  const weighted = isWeightedProduct(product);
  const quantity = cartQuantity(product, units);
  return {
    role: query.role,
    name,
    status: available || stockSoft ? "found" : "missing",
    price: lineTotalPrice(unitPrice, product, units),
    unitPrice: typeof unitPrice === "number" ? unitPrice : null,
    envelope: query.envelope || "food",
    note: available ? "" : stockSoft ? "залишок у слоті не підтверджено" : "немає в відповіді пошуку",
    image: productImage(product),
    group: query.group || "",
    groupTitle: query.groupTitle || "",
    why: query.why || "",
    units,
    quantity,
    weighted,
    step: weighted ? basketStepKg(product, name) : null,
    displayRatio: product?.displayRatio != null ? String(product.displayRatio) : "",
    stock: product?.stock,
    amount: amountLabelFromProduct(product, name, units),
  };
}

/** Pack / weight / units for checklist meta (replaces «востаннє…»). */
export function packLabelFromProduct(product, nameHint) {
  const name = String(nameHint || product?.title || product?.name || "");
  const fromName = packLabelFromName(name);
  if (fromName) return fromName;

  const pack = parseDisplayRatio(product?.displayRatio);
  if (pack) return pack.label;

  const weighted = isWeightedProduct(product);
  const step = numericBasketStep(product);
  if (weighted) {
    if (step != null) {
      if (step < 1) return `${fmtUaNum(step * 1000)} г`;
      return `${fmtUaNum(step)} кг`;
    }
    return "на вагу";
  }
  if (step != null && step > 1) return `${fmtUaNum(step)} шт`;
  return "1 шт";
}

export function packLabelFromName(name) {
  const n = String(name || "");
  const m = n.match(/(\d+[.,]?\d*)\s*(кг|г|гр|л|мл|шт\.?)/i);
  if (!m) return "";
  const num = m[1].replace(".", ",");
  let unit = m[2].toLowerCase().replace(/\.$/, "");
  if (unit === "гр") unit = "г";
  if (unit.startsWith("шт")) return `${num} шт`;
  return `${num} ${unit}`;
}

function fmtUaNum(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return String(n);
  if (Number.isInteger(x)) return String(x);
  return String(Math.round(x * 1000) / 1000).replace(".", ",");
}

function coercePrice(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object") {
    return coercePrice(v.value ?? v.amount ?? v.price ?? v.current);
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
