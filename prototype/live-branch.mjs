import { fileURLToPath } from "node:url";
import { connectMcp, callTool } from "./js/mcp/client.mjs";
import { loadAccessToken } from "./js/mcp/oauth.mjs";
import { unwrap } from "./js/mcp/unwrap.js";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const token = await loadAccessToken(ROOT);
const boot = await connectMcp(token);
const mine = await callTool(boot.ctx, "silpo_get_my_shopping_cart", {});
const id = unwrap(mine.json).shoppingCartId;
const byId = await callTool(boot.ctx, "silpo_get_shopping_cart_by_id", { shoppingCartId: id });
const cart = unwrap(byId.json).cart || {};
const ship0 = Array.isArray(cart.shipments) ? cart.shipments[0] : null;
const calc = cart.calculation && typeof cart.calculation === "object" ? cart.calculation : {};
const types = await callTool(boot.ctx, "silpo_get_available_delivery_types", {});
const tu = unwrap(types.json);

function findBranchId(obj, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 5) return null;
  if (typeof obj.branchId === "string" && obj.branchId.length > 8) return "found:branchId";
  if (typeof obj.filialId === "string" && obj.filialId.length > 8) return "found:filialId";
  for (const k of Object.keys(obj)) {
    if (["address", "street", "city", "phone", "email", "name"].includes(k)) continue;
    const hit = findBranchId(obj[k], depth + 1);
    if (hit) return `${k}.${hit}`;
  }
  return null;
}

console.log(
  JSON.stringify({
    shipment0Keys: ship0 && typeof ship0 === "object" ? Object.keys(ship0) : [],
    calculationKeys: Object.keys(calc),
    timeslotKeys: cart.timeslot ? Object.keys(cart.timeslot) : [],
    branchIdPath: findBranchId({ cart, types: tu }),
    typesTopKeys: Object.keys(tu || {}),
    typesHttp: types.http,
  }),
);
