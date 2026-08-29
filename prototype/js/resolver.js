import { assertResolve } from "./contracts.js";
import { destinationGroupForAdd, groupMeta } from "./groups.js";
import {
  amountLabelFromProduct,
  cartQuantity,
  isWeightedProduct,
  lineTotalPrice,
  packLabelFromName,
} from "./mcp/normalize.js";

/**
 * Фікстурний резолвер. У проді: BOOTSTRAP → find_products_batch → cart get.
 * Живий https://mcp.silpo.ua/mcp тут не викликається.
 */
function normName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function shelfHitForQuery(q, shelf) {
  const sku = shelf?.sku || {};
  const staple = String(q.staple || "").trim();
  if (staple && sku[staple]) return sku[staple];
  if (sku[q.q]) return sku[q.q];
  const n = normName(q.q);
  for (const [k, hit] of Object.entries(sku)) {
    const hn = normName(hit?.name || k);
    if (!hn) continue;
    if (hn === n || hn.includes(n) || n.includes(hn)) return hit;
    if (staple && (normName(k) === normName(staple) || hn.includes(normName(staple)))) return hit;
  }
  return null;
}

function shelfForQuery(q, name, siblingNames) {
  if (String(q.role || "").startsWith("add:") || String(q.role || "").startsWith("can:")) {
    const group = destinationGroupForAdd(name || q.q, siblingNames);
    return { group, groupTitle: groupMeta(group).title };
  }
  return { group: q.group || "", groupTitle: q.groupTitle || "" };
}

function cookFromQuery(q) {
  const c = String(q?.cook || "")
    .trim()
    .toLowerCase();
  if (c === "cook" || c === "ready") return c;
  return "";
}

export function resolveQueries(shopQueries, shelf, { confirmed = false } = {}) {
  const lines = [];
  let sum = 0;
  const siblingNames = (shopQueries || []).map((q) => q.q);
  for (const q of shopQueries) {
    const units = Math.max(1, Number(q.units) || 1);
    const hit = shelfHitForQuery(q, shelf);
    if (!hit) {
      const shelfG = shelfForQuery(q, q.q, siblingNames);
      const hasPick =
        (q.from === "sport_day" || String(q.role || "").startsWith("add:")) &&
        (q.image || q.price != null || q.productId);
      if (hasPick) {
        const displayName = q.q;
        lines.push({
          role: q.role,
          wanted: q.staple || q.role || q.q,
          name: displayName,
          status: "found",
          price: q.price != null ? Number(q.price) : null,
          envelope: q.envelope || "food",
          note: "",
          group: q.group || shelfG.group,
          groupTitle: q.groupTitle || shelfG.groupTitle,
          why: q.why || "",
          units,
          amount: packLabelFromName(displayName) || "—",
          image: q.image || "",
          sku: q.sku,
          ...(cookFromQuery(q) ? { cook: cookFromQuery(q) } : {}),
        });
        if (typeof lines.at(-1).price === "number") sum += lines.at(-1).price;
        continue;
      }
      lines.push({
        role: q.role,
        wanted: q.staple || q.role || q.q,
        name: q.q,
        status: "missing",
        price: null,
        envelope: q.envelope || "food",
        note: "",
        group: q.group || shelfG.group,
        groupTitle: q.groupTitle || shelfG.groupTitle,
        why: q.why || "",
        units,
        amount: packLabelFromName(q.q) || "—",
        image: q.image || "",
        ...(cookFromQuery(q) ? { cook: cookFromQuery(q) } : {}),
      });
    continue;
  }
  const unitPrice = hit.status === "missing" ? null : hit.price;
  const product = {
    ...hit,
    name: hit.name || q.q,
    title: hit.name || q.q,
  };
  const weighted = isWeightedProduct(product);
  const price =
    typeof unitPrice === "number" ? lineTotalPrice(unitPrice, product, units) : null;
  if (typeof price === "number") sum += price;
  const shelfG = shelfForQuery(q, hit.name || q.q, siblingNames);
  const displayName = hit.name || q.q;
  lines.push({
    role: q.role,
    wanted: q.staple || q.role || q.q,
    name: displayName,
    status: hit.status,
    price,
    unitPrice: typeof unitPrice === "number" ? unitPrice : null,
    envelope: hit.envelope || q.envelope || "food",
    note: hit.note || "",
    group: q.group || shelfG.group,
    groupTitle: q.groupTitle || shelfG.groupTitle,
    why: q.why || "",
    units,
    quantity: cartQuantity(product, units),
    weighted: weighted || undefined,
    step: weighted ? Number(product.step ?? product.addToBasketStep) || undefined : undefined,
    displayRatio: hit.displayRatio != null ? String(hit.displayRatio) : undefined,
    amount: amountLabelFromProduct(product, displayName, units),
    image: q.image || hit.image || "",
    ...(cookFromQuery(q) ? { cook: cookFromQuery(q) } : {}),
  });
  }

  return assertResolve({
    lines,
    branchLabel: shelf.branchLabel,
    totals: { min: Math.round(sum), max: Math.round(sum) },
    checkout: confirmed ? "https://silpo.ua/checkout (лінк з cart get у проді)" : null,
  });
}

/**
 * When MCP misses a line but fixture shelf has found/replaced — fill for day UX
 * (culinary staples keyed in shelf.sku but often empty in live search).
 */
export function fillMissingLinesFromFixture(mcpResolve, fixtureResolve) {
  const mcp = mcpResolve && typeof mcpResolve === "object" ? mcpResolve : { lines: [] };
  const fixLines = Array.isArray(fixtureResolve?.lines) ? fixtureResolve.lines : [];
  const byRole = new Map(fixLines.map((l) => [String(l.role || ""), l]));
  const byWanted = new Map(
    fixLines.filter((l) => l.wanted || l.staple).map((l) => [String(l.wanted || l.staple || "").toLowerCase(), l]),
  );
  const lines = (Array.isArray(mcp.lines) ? mcp.lines : []).map((line) => {
    if (line?.status === "found" || line?.status === "replaced") return line;
    const fix =
      byRole.get(String(line?.role || "")) ||
      byWanted.get(String(line?.wanted || line?.staple || "").toLowerCase());
    if (!fix || (fix.status !== "found" && fix.status !== "replaced")) return line;
    return {
      ...line,
      name: fix.name || line.name,
      status: fix.status,
      price: fix.price,
      unitPrice: fix.unitPrice,
      image: fix.image || line.image || "",
      amount: fix.amount || line.amount,
      note: fix.note || "з полиці-фікстури",
      envelope: fix.envelope || line.envelope,
    };
  });
  const sum = lines.reduce((s, l) => s + (typeof l.price === "number" ? l.price : 0), 0);
  return {
    ...mcp,
    lines,
    totals: { min: Math.round(sum), max: Math.round(sum) },
  };
}

export function clipToBudget(lines, budgetUah) {
  if (!budgetUah) return lines;
  const pinned = [];
  const rest = [];
  for (const l of lines || []) {
    if (String(l.role || "").startsWith("add:")) pinned.push(l);
    else rest.push(l);
  }
  // Keep one of each non-food envelope early so алкоголь/тютюн/мийні survive стеля.
  const ordered = diversifyEnvelopes(rest);
  const out = [];
  let acc = 0;
  for (const l of ordered) {
    if (l.status === "missing") {
      out.push(l);
      continue;
    }
    const fitted = fitLineToBudget(l, budgetUah - acc);
    if (!fitted) continue;
    acc += fitted.price || 0;
    out.push(fitted);
  }
  for (const l of pinned) {
    const p = l.price || 0;
    if (l.status !== "missing") acc += p;
    out.push(l);
  }
  return out;
}

/** After a few food staples, insert first alcohol/tobacco/clean — guest + store basket mix. */
function diversifyEnvelopes(lines) {
  const food = [];
  const special = [];
  const seen = new Set();
  const restSpecial = [];
  for (const l of lines || []) {
    const env = l.envelope || "food";
    if (env === "food") {
      food.push(l);
      continue;
    }
    if (!seen.has(env)) {
      seen.add(env);
      special.push(l);
    } else {
      restSpecial.push(l);
    }
  }
  const head = food.slice(0, 3);
  const tail = [...food.slice(3), ...restSpecial];
  return [...head, ...special, ...tail];
}

/** Prefer shrinking units over dropping the whole line (місяць / На всі гроші). */
function fitLineToBudget(line, room) {
  const price = Number(line.price) || 0;
  if (price <= 0) return { ...line };
  if (price <= room) return line;
  const units = Math.max(1, Number(line.units) || 1);
  if (units <= 1) return null;
  const unitPrice = price / units;
  if (!(unitPrice > 0)) return null;
  const maxUnits = Math.floor(room / unitPrice);
  if (maxUnits < 1) return null;
  const nextPrice = Math.round(unitPrice * maxUnits * 100) / 100;
  const step = Number(line.step);
  const weighted = Boolean(line.weighted) && Number.isFinite(step) && step > 0;
  const quantity = weighted ? Math.round(step * maxUnits * 1000) / 1000 : maxUnits;
  let amount = maxUnits > 1 ? `${maxUnits} шт` : "1 шт";
  if (weighted) {
    const kg = step * maxUnits;
    amount = kg < 1 ? `${Math.round(kg * 1000)} г` : `${kg} кг`;
  }
  return {
    ...line,
    units: maxUnits,
    unitPrice: line.unitPrice ?? unitPrice,
    price: nextPrice,
    quantity,
    amount,
  };
}
