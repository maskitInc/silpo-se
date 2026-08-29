import { fileURLToPath } from "node:url";
import { connectMcp } from "./js/mcp/client.mjs";
import { loadAccessToken } from "./js/mcp/oauth.mjs";
import { unwrap } from "./js/mcp/unwrap.js";
import { callTool } from "./js/mcp/client.mjs";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const token = await loadAccessToken(ROOT);
const boot = await connectMcp(token);
const mine = await callTool(boot.ctx, "silpo_get_my_shopping_cart", {});
const id = unwrap(mine.json).shoppingCartId;
const byId = await callTool(boot.ctx, "silpo_get_shopping_cart_by_id", { shoppingCartId: id });
const u = unwrap(byId.json);
const cart = u.cart || {};
const timeslot = cart.timeslot || cart.timeSlot || cart.slot || {};
const branch = cart.branch || {};

const batch = await callTool(boot.ctx, "silpo_find_products_batch", {
  branchId: cart.branchId || branch.id || "",
  deliveryType: cart.deliveryType || "DeliveryHome",
  timeslotStart: timeslot.start || cart.timeslotStart || "",
  timeslotEnd: timeslot.end || cart.timeslotEnd || "",
  products: ["молоко"],
  limit: 3,
});
const b = unwrap(batch.json);
const q0 = Array.isArray(b.queries) ? b.queries[0] : null;
const q0keys = q0 && typeof q0 === "object" ? Object.keys(q0) : [];
const inner = q0?.products || q0?.items || q0?.offers || q0?.results;
const inner0 = Array.isArray(inner) ? inner[0] : null;

console.log(
  JSON.stringify({
    cartKeys: Object.keys(cart),
    branchKeys: Object.keys(branch),
    timeslotKeys: Object.keys(timeslot),
    hasBranchId: Boolean(cart.branchId || branch.id),
    deliveryType: cart.deliveryType || null,
    timeslotStartPresent: Boolean(timeslot.start || cart.timeslotStart),
    timeslotEndPresent: Boolean(timeslot.end || cart.timeslotEnd),
    batchQuery0Keys: q0keys,
    innerIsArray: Array.isArray(inner),
    innerLen: Array.isArray(inner) ? inner.length : 0,
    product0Keys: inner0 && typeof inner0 === "object" ? Object.keys(inner0) : [],
    summaryKeys: b.summary && typeof b.summary === "object" ? Object.keys(b.summary) : [],
  }),
);
