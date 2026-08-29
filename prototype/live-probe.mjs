import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { connectMcp, callTool } from "./js/mcp/client.mjs";
import { loadAccessToken } from "./js/mcp/oauth.mjs";
import { bootstrapCart } from "./js/mcp/bootstrap.mjs";
import { unwrap } from "./js/mcp/unwrap.js";
import { productsFromBatch } from "./js/mcp/normalize.js";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const token = await loadAccessToken(ROOT);
if (!token) {
  console.error("no token");
  process.exit(1);
}

const boot = await connectMcp(token);
if (!boot.ok) {
  console.log(JSON.stringify({ ok: false, http: boot.http, step: boot.step }));
  process.exit(1);
}

const { cart, byId, context } = await bootstrapCart(boot.ctx);
const cartKeys = Object.keys(unwrap(cart.json) || {});
const byIdKeys = Object.keys(unwrap(byId.json) || {});

const batch = await callTool(boot.ctx, "silpo_find_products_batch", {
  branchId: context.branchId,
  deliveryType: context.deliveryType,
  timeslotStart: context.timeslotStart,
  timeslotEnd: context.timeslotEnd,
  products: ["молоко"],
  limit: 3,
});
const u = unwrap(batch.json);
const found = productsFromBatch(batch.json);
const first = found[0] && !Array.isArray(found[0]) ? found[0] : found[0]?.[0];
const sample = {
  fetchedAt: new Date().toISOString(),
  cartHttp: cart.http,
  byIdHttp: byId.http,
  batchHttp: batch.http,
  contextReady: Boolean(context.branchId && context.deliveryType && context.timeslotStart && context.timeslotEnd),
  context: {
    hasShoppingCartId: Boolean(context.shoppingCartId),
    deliveryType: context.deliveryType,
    hasTimeslot: Boolean(context.timeslotStart && context.timeslotEnd),
    branchIdLen: context.branchId ? String(context.branchId).length : 0,
  },
  cartKeys,
  byIdKeys,
  batchTopKeys: Object.keys(u || {}),
  batchIsError: Boolean(batch.json?.result?.isError || batch.json?.error),
  productCount: found.length,
  firstProductKeys: first && typeof first === "object" ? Object.keys(first) : [],
};

await writeFile(join(ROOT, "content/batch-sample.public.json"), JSON.stringify(sample, null, 2));
console.log(JSON.stringify(sample));
