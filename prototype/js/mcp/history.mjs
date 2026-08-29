import { callTool, connectMcp } from "./client.mjs";
import { unwrap } from "./unwrap.js";
import { bootstrapCart } from "./bootstrap.mjs";
import { freqFromReceipts, ordersToReceipts } from "../receipts.js";
import { productImage } from "./normalize.js";

function pick(names, ...cands) {
  const set = new Set(names);
  return cands.find((n) => set.has(n));
}

async function pagedOrderNames(ctx, tool, args, { pageSize, pages }) {
  const names = [];
  const records = [];
  const trace = [];
  for (let i = 0; i < pages; i++) {
    const off = await callTool(ctx, tool, { ...args, limit: pageSize, offset: i * pageSize });
    trace.push({ tool, http: off.http, offset: i * pageSize });
    const parsed = parseOrders(off.json);
    names.push(...parsed.names);
    records.push(...parsed.orders);
    if (parsed.orderCount < pageSize) break;
  }
  return { names, records, trace };
}

function coercePrice(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseOrders(payload) {
  const o = unwrap(payload);
  const raw = o.orders || o.items || o.data || [];
  const list = Array.isArray(raw) ? raw : [];
  const names = [];
  const orders = [];
  for (const order of list) {
    const linesIn = order.products || order.items || order.lines || [];
    const recs = [];
    for (const line of Array.isArray(linesIn) ? linesIn : []) {
      const n = line.title || line.name || line.productName || line.offerName;
      if (!n) continue;
      const qtyRaw = Number(line.quantity ?? line.qty ?? line.count ?? line.amount);
      const image = productImage(line);
      const row = {
        name: String(n),
        qty: Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1,
        price: coercePrice(line.price ?? line.sum ?? line.total ?? line.priceValue),
      };
      if (image) row.image = image;
      recs.push(row);
    }
    const at =
      order.date ||
      order.createdAt ||
      order.created ||
      order.orderDate ||
      order.completedAt ||
      order.dateTime ||
      order.deliveryDate ||
      order.orderedAt ||
      order.updatedAt ||
      null;
    orders.push({ at, lines: recs });
    names.push(...recs.map((r) => r.name));
  }
  return { names, orders, orderCount: list.length };
}

/** Align with client ensureHistoryCache TTL (15 min). */
const HISTORY_TTL_MS = 15 * 60 * 1000;

/** @type {null | { token: string, at: number, result: object }} */
let historyMemo = null;
/** @type {null | { token: string, promise: Promise<object> }} */
let historyInflight = null;

export function clearHistoryMcpCache() {
  historyMemo = null;
  historyInflight = null;
}

async function fetchHistoryViaMcp(token) {
  const boot = await connectMcp(token);
  const trace = [{ step: boot.step, http: boot.http, toolCount: boot.names?.length || 0 }];
  if (!boot.ok) return { ok: false, trace, history: [], freq: {}, receipts: [] };

  const { context } = await bootstrapCart(boot.ctx);
  const tOff = pick(boot.names, "silpo_get_my_offline_orders");
  const tOn = pick(boot.names, "silpo_get_my_online_orders");
  const names = [];
  const orderRecs = [];
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const until = new Date().toISOString();
  if (tOff && context.branchId && context.deliveryType && context.timeslotStart && context.timeslotEnd) {
    const pages = await pagedOrderNames(boot.ctx, tOff, {
      branchId: context.branchId,
      deliveryType: context.deliveryType,
      timeslotStart: context.timeslotStart,
      timeslotEnd: context.timeslotEnd,
      dateStart: since,
      dateEnd: until,
    }, { pageSize: 10, pages: 9 });
    trace.push(...pages.trace);
    names.push(...pages.names);
    orderRecs.push(...pages.records.map((o) => ({ ...o, channel: "offline" })));
  } else if (tOff) {
    trace.push({ tool: tOff, skipped: "cart_context_incomplete" });
  }
  if (tOn) {
    const pages = await pagedOrderNames(boot.ctx, tOn, {}, { pageSize: 100, pages: 3 });
    trace.push(...pages.trace);
    names.push(...pages.names);
    orderRecs.push(...pages.records.map((o) => ({ ...o, channel: "online" })));
  }

  const receipts = ordersToReceipts(orderRecs);
  let freq = freqFromReceipts(receipts);
  if (!Object.keys(freq).length) {
    freq = {};
    for (const n of names) freq[n] = (freq[n] || 0) + 1;
  }
  const history = [{ when: "mcp", lines: names, weights: freq, orders: orderRecs }];
  return { ok: true, trace, history, freq, receipts, rawCount: names.length };
}

/**
 * READ only: online + offline receipts.
 * freq = full SKU name → purchase count (not unique-only).
 * receipts = normalized Receipt[] (channel tagged).
 * Memo + singleflight: /api/history and /api/resolve share one MCP history load per TTL.
 */
export async function loadHistoryViaMcp(token, { force = false } = {}) {
  if (!token) return { ok: false, trace: [], history: [], freq: {}, receipts: [] };
  if (
    !force &&
    historyMemo &&
    historyMemo.token === token &&
    Date.now() - historyMemo.at < HISTORY_TTL_MS
  ) {
    const cached = historyMemo.result;
    return {
      ...cached,
      trace: [...(cached.trace || []), { step: "history_cache", skipped: "ttl_hit" }],
    };
  }
  if (!force && historyInflight && historyInflight.token === token) {
    return historyInflight.promise;
  }
  const promise = fetchHistoryViaMcp(token)
    .then((result) => {
      // Ignore superseded inflight (force refresh started a newer fetch).
      if (historyInflight?.promise === promise) {
        if (result.ok) historyMemo = { token, at: Date.now(), result };
        historyInflight = null;
      }
      return result;
    })
    .catch((err) => {
      if (historyInflight?.promise === promise) historyInflight = null;
      throw err;
    });
  historyInflight = { token, promise };
  return promise;
}
