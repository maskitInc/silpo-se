/**
 * Pantry / dry-goods staples — week pack once, not a day-plate «buy & eat today».
 * Soft Express: «перевір вдома» under week стеля. Not fridge inventory.
 */

/** Staples that resolve to bulk packs (oil 0.85L, rice 1kg, oats 500g, …). */
export const PANTRY_STAPLES = new Set([
  "олія",
  "масло",
  "оливкова олія",
  "рис",
  "вівсянка",
  "гречка",
  "булгур",
  "кіноа",
  "майонез",
  "йогурт",
  "кефір",
  "молоко",
]);

/**
 * @param {string} raw
 * @returns {boolean}
 */
export function isPantryStaple(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (!s) return false;
  if (PANTRY_STAPLES.has(s)) return true;
  /* culinary ready packs stay day/week meals, not pantry dry goods */
  if (/кулінар/i.test(s)) return false;
  return false;
}

/**
 * @param {object[]} queries
 * @param {'include'|'exclude'|'only'} mode
 */
export function filterQueriesByPantryMode(queries, mode = "include") {
  const list = Array.isArray(queries) ? queries : [];
  if (mode === "include") return list.map(tagPantryQuery);
  if (mode === "only") return list.map(tagPantryQuery).filter((q) => q.pantry);
  return list.map(tagPantryQuery).filter((q) => !q.pantry);
}

/**
 * @param {object} q
 */
export function tagPantryQuery(q) {
  const staple = String(q?.staple || q?.q || "")
    .trim()
    .toLowerCase();
  const pantry = isPantryStaple(staple);
  return pantry ? { ...q, pantry: true, pantryCheck: true } : { ...q, pantry: false };
}

/** UA copy for day plate when ingredients were stripped to Express pantry. */
export function dayPlatePantryHintCopy(staples = []) {
  const names = [...new Set((staples || []).map((s) => String(s || "").trim()).filter(Boolean))];
  const bit = names.slice(0, 3).join(", ");
  const more = names.length > 3 ? "…" : "";
  if (bit) {
    return `${bit}${more} · перевір вдома · у Express на тиждень під стелю`;
  }
  return "Сухе / олія / молочка · перевір вдома · у Express на тиждень під стелю";
}

/** Stamp pantry flags onto a resolve line from its query. */
export function pantryFieldsFromQuery(q) {
  const staple = String(q?.staple || q?.q || "")
    .trim()
    .toLowerCase();
  if (q?.pantry || q?.pantryCheck || isPantryStaple(staple)) {
    return { pantry: true, pantryCheck: true };
  }
  return {};
}
