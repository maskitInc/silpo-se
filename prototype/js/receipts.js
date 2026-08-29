/** Receipt normalize — browser-safe, no MCP client. */

/**
 * Stable id from channel + at + index (FNV-1a 32-bit hex).
 * @param {string} channel
 * @param {string | null} at
 * @param {number} index
 */
export function receiptId(channel, at, index) {
  const raw = `${channel || "unknown"}|${at || ""}|${index}`;
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `r${(h >>> 0).toString(16)}`;
}

function coercePrice(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function coerceQty(v) {
  if (v == null || v === "") return 1;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function pickAt(order) {
  return (
    order?.at ||
    order?.date ||
    order?.createdAt ||
    order?.created ||
    order?.orderDate ||
    order?.completedAt ||
    order?.dateTime ||
    order?.deliveryDate ||
    order?.orderedAt ||
    order?.updatedAt ||
    null
  );
}

function pickLineImage(line) {
  if (!line || typeof line !== "object") return "";
  const pick = (v) => {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (v && typeof v === "object") {
      const nested = v.url || v.src || v.href || v.imageUrl || v.image;
      if (typeof nested === "string" && nested.trim()) return nested.trim();
    }
    return "";
  };
  for (const key of ["image", "imageUrl", "img", "mainImage", "picture", "photo"]) {
    const hit = pick(line[key]);
    if (hit) return hit;
  }
  const media = line.media || line.images || line.photos;
  if (Array.isArray(media) && media.length) {
    const hit = pick(media[0]);
    if (hit) return hit;
  }
  return "";
}

function pickLines(order) {
  const raw = order?.lines || order?.products || order?.items || [];
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const line of raw) {
    const name = line?.title || line?.name || line?.productName || line?.offerName;
    if (!name) continue;
    const image = pickLineImage(line);
    const row = {
      name: String(name),
      qty: coerceQty(line.quantity ?? line.qty ?? line.count ?? line.amount),
      price: coercePrice(line.price ?? line.sum ?? line.total ?? line.priceValue),
    };
    if (image) row.image = image;
    out.push(row);
  }
  return out;
}

/**
 * Top line items for receipt-card thumb strip (most expensive first).
 * @param {Array<{name?:string,price?:number|null,image?:string}>|null|undefined} lines
 * @param {number} [limit=5]
 * @returns {{ shown: typeof lines, overflow: number, total: number }}
 */
export function topLinesForThumbStrip(lines, limit = 5) {
  const all = Array.isArray(lines) ? lines : [];
  const cap = Math.max(0, Number(limit) || 0);
  const ranked = all
    .map((l, i) => ({ l, i }))
    .sort((a, b) => {
      const pa = typeof a.l?.price === "number" && Number.isFinite(a.l.price) ? a.l.price : Number.NEGATIVE_INFINITY;
      const pb = typeof b.l?.price === "number" && Number.isFinite(b.l.price) ? b.l.price : Number.NEGATIVE_INFINITY;
      if (pb !== pa) return pb - pa;
      return a.i - b.i;
    })
    .slice(0, cap)
    .map((x) => x.l);
  const overflow = Math.max(0, all.length - ranked.length);
  return { shown: ranked, overflow, total: all.length };
}

function sumPriced(lines) {
  let s = 0;
  let any = false;
  for (const l of lines) {
    if (typeof l.price === "number" && Number.isFinite(l.price)) {
      s += l.price;
      any = true;
    }
  }
  return any ? Math.round(s * 100) / 100 : null;
}

/**
 * @param {unknown} raw — array of orders, or { orders|receipts: [] }
 * @param {{ channel?: string }} [defaults]
 * @returns {Array<{ id: string, channel: string, at: string|null, totalUah: number|null, branchLabel: string|null, lines: Array<{name:string,qty:number,price:number|null,image?:string}> }>}
 */
export function ordersToReceipts(raw, defaults = {}) {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.orders)
      ? raw.orders
      : Array.isArray(raw?.receipts)
        ? raw.receipts
        : [];
  return list.map((order, index) => {
    const channel = String(order?.channel || defaults.channel || "unknown");
    const at = pickAt(order);
    const atStr = at == null ? null : String(at);
    const lines = pickLines(order);
    const id = order?.id ? String(order.id) : receiptId(channel, atStr, index);
    const branch =
      order?.branchLabel || order?.branchName || order?.branch?.name || null;
    return {
      id,
      channel,
      at: atStr,
      totalUah: sumPriced(lines),
      branchLabel: branch ? String(branch) : null,
      lines,
    };
  });
}

/** Full SKU name → purchase count (line occurrences). */
export function freqFromReceipts(receipts) {
  const freq = {};
  for (const r of receipts || []) {
    for (const line of r.lines || []) {
      const n = line?.name;
      if (!n) continue;
      freq[n] = (freq[n] || 0) + 1;
    }
  }
  return freq;
}
