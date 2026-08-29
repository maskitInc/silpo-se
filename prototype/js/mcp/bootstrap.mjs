import { callTool } from "./client.mjs";
import { unwrap } from "./unwrap.js";

export function extractShoppingCartId(payload) {
  const o = unwrap(payload);
  return (
    o.shoppingCartId ||
    o.cartId ||
    o.id ||
    o.cart?.shoppingCartId ||
    o.cart?.id ||
    null
  );
}

export function extractCartContext(payload) {
  const o = unwrap(payload);
  const cart = o.cart || o;
  const ts = cart.timeslot || cart.timeSlot || {};
  const ship0 = Array.isArray(cart.shipments) ? cart.shipments[0] : {};
  return {
    shoppingCartId: extractShoppingCartId(payload),
    branchId: String(
      ship0.branchId || cart.branchId || cart.branch?.id || o.branchId || "",
    ),
    companyId: String(ship0.companyId || cart.companyId || ""),
    deliveryType: String(cart.deliveryType || cart.delivery?.type || o.deliveryType || ""),
    timeslotStart: String(ts.start || ts.timeslotStart || cart.timeslotStart || o.timeslotStart || ""),
    timeslotEnd: String(ts.end || ts.timeslotEnd || cart.timeslotEnd || o.timeslotEnd || ""),
  };
}

export async function bootstrapCart(ctx) {
  const cart = await callTool(ctx, "silpo_get_my_shopping_cart", {});
  let shoppingCartId = extractShoppingCartId(cart.json);
  const byId = await callTool(ctx, "silpo_get_shopping_cart_by_id", {
    shoppingCartId: shoppingCartId || undefined,
  });
  const ctxCart = extractCartContext(byId.json);
  if (!ctxCart.shoppingCartId && shoppingCartId) ctxCart.shoppingCartId = shoppingCartId;

  if (!ctxCart.timeslotStart || !ctxCart.timeslotEnd) {
    const slots = await callTool(ctx, "silpo_get_time_slots", {
      branchId: ctxCart.branchId,
      limit: 5,
    });
    const list = unwrap(slots.json);
    const arr = list.slots || list.items || list.timeSlots || [];
    const first = Array.isArray(arr) ? arr[0] : null;
    if (first) {
      ctxCart.timeslotStart = first.start || first.timeslotStart || ctxCart.timeslotStart;
      ctxCart.timeslotEnd = first.end || first.timeslotEnd || ctxCart.timeslotEnd;
    }
  }

  return {
    cart,
    byId,
    context: ctxCart,
  };
}
