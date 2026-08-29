/** Merge receipt lines into Express shopVm — no MCP write. */

import { destinationGroupForAdd, groupMeta } from "./groups.js";
import {
  amountLabelFromProduct,
  cartQuantity,
  isWeightedProduct,
  lineTotalPrice,
} from "./mcp/normalize.js";
import { repriceLine } from "./qty.js";
import { envelopeOf, toStaple } from "./staples.js";

function normName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isBagLine(name) {
  const s = String(name || "");
  return /пакет/i.test(s) && /сільпо|пакет/i.test(s);
}

function inferredUnits(src) {
  const q = Number(src?.qty);
  if (!Number.isFinite(q) || q <= 0) return 1;
  if (q >= 1 && Number.isInteger(q)) return Math.min(99, q);
  return 1;
}

function resolveShelfHit(name, staple, shelf) {
  const sku = shelf?.sku || {};
  if (staple && sku[staple]) return { stapleKey: staple, hit: sku[staple] };
  const n = normName(name);
  for (const [k, hit] of Object.entries(sku)) {
    const hn = normName(hit?.name || k);
    if (!hn) continue;
    if (hn === n || hn.includes(n) || n.includes(hn)) return { stapleKey: k, hit };
  }
  return { stapleKey: staple || null, hit: null };
}

function findExisting(lines, name, staple) {
  const n = normName(name);
  return (lines || []).find((l) => {
    if (staple && (l.wanted === staple || l.staple === staple)) return true;
    return normName(l.name) === n || normName(l.wanted) === n;
  });
}

function lineFromShelfHit({ role, name, staple, envelope, group, groupTitle, hit, units, histPrice }) {
  const displayName = hit?.name || name;
  const product = {
    ...hit,
    name: displayName,
    title: displayName,
  };
  if (!hit || hit.status === "missing") {
    return {
      role,
      wanted: staple || name,
      staple: staple || undefined,
      name: displayName,
      status: "missing",
      price: null,
      unitPrice: null,
      envelope,
      note: typeof histPrice === "number" ? `було ${histPrice} ₴` : "з чека",
      image: hit?.image || "",
      group,
      groupTitle,
      why: "з чека",
      units: Math.max(1, units),
      amount: "—",
    };
  }
  const unitPrice = typeof hit.price === "number" ? hit.price : null;
  const weighted = isWeightedProduct(product);
  const u = Math.max(1, units);
  const price = typeof unitPrice === "number" ? lineTotalPrice(unitPrice, product, u) : null;
  return {
    role,
    wanted: staple || name,
    staple: staple || undefined,
    name: displayName,
    status: hit.status === "replaced" ? "replaced" : "found",
    price,
    unitPrice,
    envelope: hit.envelope || envelope,
    note: typeof histPrice === "number" ? `було ${histPrice} ₴` : "",
    image: hit.image || "",
    group,
    groupTitle,
    why: "з чека",
    units: u,
    quantity: cartQuantity(product, u),
    weighted: weighted || undefined,
    step: weighted ? Number(product.step ?? product.addToBasketStep) || undefined : undefined,
    displayRatio: hit.displayRatio != null ? String(hit.displayRatio) : undefined,
    amount: amountLabelFromProduct(product, displayName, u),
  };
}

/**
 * @param {object} opts
 * @returns {{ vm, accepted, qtyByRole, flashRoles, skipped, missingN, addedN, bumpedN }}
 */
export function mergeReceiptIntoShopVm(opts = {}) {
  const mode = opts.mode === "lines" ? "lines" : "whole";
  const receipt = opts.receipt || {};
  const allow = new Set(
    Array.isArray(opts.categoriesAllow) && opts.categoriesAllow.length
      ? opts.categoriesAllow
      : ["food", "clean"],
  );
  const shelf = opts.shelf || { sku: {} };
  const selected = new Set((opts.selectedNames || []).map(normName).filter(Boolean));

  let source = Array.isArray(receipt.lines) ? receipt.lines : [];
  if (mode === "lines") {
    source = source.filter((l) => selected.has(normName(l.name)));
  }

  const lines = [...(opts.shopVm?.lines || [])];
  const nextAccepted = { ...(opts.accepted || {}) };
  const nextQty = { ...(opts.qtyByRole || {}) };
  const flashRoles = [];
  const skipped = [];
  let missingN = 0;
  let addedN = 0;
  let bumpedN = 0;
  const siblingNames = lines.map((l) => l.name || l.wanted);

  source.forEach((src, i) => {
    const name = String(src?.name || "").trim();
    if (!name) return;
    if (isBagLine(name)) {
      skipped.push({ name, reason: "bag" });
      return;
    }
    const staple = toStaple(name);
    const envelope = staple ? envelopeOf(staple) : "food";
    if (!allow.has(envelope)) {
      skipped.push({ name, reason: "envelope" });
      return;
    }

    const unitsAdd = inferredUnits(src);
    const existing = findExisting(lines, name, staple);
    if (existing) {
      const cur = Math.max(1, Number(existing.units) || 1);
      const repriced = repriceLine(existing, cur + unitsAdd);
      const idx = lines.findIndex((l) => l.role === existing.role);
      if (idx >= 0) lines[idx] = repriced;
      nextQty[existing.role] = repriced.units;
      nextAccepted[existing.role] = true;
      flashRoles.push(existing.role);
      bumpedN += 1;
      return;
    }

    const { hit } = resolveShelfHit(name, staple, shelf);
    const group = destinationGroupForAdd(hit?.name || name, siblingNames);
    siblingNames.push(hit?.name || name);
    const rid = String(receipt.id || "r").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
    const role = `hist:${rid}:${i}`.slice(0, 24);
    const line = lineFromShelfHit({
      role,
      name,
      staple,
      envelope,
      group,
      groupTitle: groupMeta(group).title,
      hit,
      units: unitsAdd,
      histPrice: typeof src.price === "number" ? src.price : null,
    });
    lines.push(line);
    if (line.status === "missing") missingN += 1;
    else nextAccepted[role] = true;
    nextQty[role] = line.units;
    flashRoles.push(role);
    addedN += 1;
  });

  const sum = lines.reduce((s, l) => s + (Number(l.price) || 0), 0);
  return {
    vm: {
      ...(opts.shopVm || {}),
      lines,
      totals: { min: Math.round(sum), max: Math.round(sum) },
      branchLabel: opts.shopVm?.branchLabel || shelf.branchLabel || "",
    },
    accepted: nextAccepted,
    qtyByRole: nextQty,
    flashRoles,
    skipped,
    missingN,
    addedN,
    bumpedN,
  };
}
