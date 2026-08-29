/** Checklist qty overrides — pure helpers. No MCP write. */

import {
  amountLabelFromProduct,
  cartQuantity,
  lineTotalPrice,
} from "./mcp/normalize.js";

export const QTY_MAX = 99;

export function effectiveUnits(qtyByRole, line) {
  const role = line?.role;
  if (role && qtyByRole && Object.prototype.hasOwnProperty.call(qtyByRole, role)) {
    const n = Number(qtyByRole[role]);
    if (Number.isFinite(n)) return Math.max(1, Math.min(QTY_MAX, Math.round(n)));
  }
  return Math.max(1, Number(line?.units) || 1);
}

/** Shelf unit price: ₴/шт or ₴/кг. Derive from line total if missing. */
export function ensureUnitPrice(line) {
  if (typeof line?.unitPrice === "number" && Number.isFinite(line.unitPrice) && line.unitPrice >= 0) {
    return line.unitPrice;
  }
  const price = Number(line?.price);
  if (!Number.isFinite(price)) return null;
  const units = Math.max(1, Number(line?.units) || 1);
  const qty = Number(line?.quantity);
  if (line?.weighted && Number.isFinite(qty) && qty > 0) {
    return Math.round((price / qty) * 1000) / 1000;
  }
  return Math.round((price / units) * 100) / 100;
}

export function lineAsProduct(line) {
  return {
    weighted: Boolean(line?.weighted),
    step: line?.step,
    displayRatio: line?.displayRatio,
    stock: line?.stock,
    name: line?.name,
    title: line?.name,
  };
}

export function repriceLine(line, units) {
  const u = Math.max(1, Math.min(QTY_MAX, Math.round(Number(units) || 1)));
  const unitPrice = ensureUnitPrice(line);
  const product = lineAsProduct(line);
  const quantity = cartQuantity(product, u);
  const price =
    typeof unitPrice === "number" ? lineTotalPrice(unitPrice, product, u) : null;
  return {
    ...line,
    units: u,
    unitPrice: unitPrice ?? line.unitPrice,
    quantity,
    price,
    amount: amountLabelFromProduct(product, line.name, u),
  };
}

/**
 * @returns {{ ok: true, units: number, line: object } | { ok: false, reason: "min"|"max", units: number, line: object }}
 */
export function applyQtyDelta(line, qtyByRole, delta) {
  const cur = effectiveUnits(qtyByRole, line);
  const next = cur + Number(delta || 0);
  if (next < 1) return { ok: false, reason: "min", units: cur, line };
  if (next > QTY_MAX) return { ok: false, reason: "max", units: cur, line };
  return { ok: true, units: next, line: repriceLine(line, next) };
}

/** Apply session qtyByRole onto resolve VM lines. */
export function applyQtyOverrides(lines, qtyByRole) {
  if (!Array.isArray(lines) || !qtyByRole || !Object.keys(qtyByRole).length) return lines;
  return lines.map((l) => {
    if (!l?.role || !Object.prototype.hasOwnProperty.call(qtyByRole, l.role)) return l;
    return repriceLine(l, qtyByRole[l.role]);
  });
}
