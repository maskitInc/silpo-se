/**
 * Sport meal «tasty ration» agent — deterministic (jury-offline).
 * Expands thin KB packs into believable Silpo staple lists.
 * Not medical advice; titles must stay honest with ingredients.
 */

const VEG_CONCRETE = new Set([
  "помідор",
  "томат",
  "огірок",
  "цибуля",
  "морква",
  "перець",
  "кабачок",
  "броколі",
  "горох",
  "кукурудза",
  "шпинат",
  "зелень",
  "кріп",
  "петрушка",
  "салат",
  "рукола",
  "редиска",
  "авокадо",
  "часник",
]);

/** Macro staples → concrete Silpo-searchable ingredients. */
export const STAPLE_MACROS = {
  овочі: ["помідор", "огірок", "цибуля", "олія"],
};

/**
 * Expand macros and pad veg dishes so «рис з овочами» is never rice + one cucumber.
 * @param {string} title
 * @param {string[]} staples
 * @returns {string[]}
 */
export function expandMealStaples(title, staples) {
  const seen = new Set();
  const out = [];
  const push = (raw) => {
    const s = String(raw || "")
      .trim()
      .toLowerCase();
    if (!s || seen.has(s)) return;
    seen.add(s);
    out.push(s);
  };

  for (const raw of Array.isArray(staples) ? staples : []) {
    const key = String(raw || "")
      .trim()
      .toLowerCase();
    if (!key) continue;
    const exp = STAPLE_MACROS[key];
    if (exp) {
      for (const e of exp) push(e);
    } else {
      push(key);
    }
  }

  const t = String(title || "");
  if (/овоч/i.test(t)) {
    let vegN = out.filter((s) => VEG_CONCRETE.has(s)).length;
    for (const e of ["помідор", "огірок", "цибуля"]) {
      if (vegN >= 2) break;
      if (seen.has(e)) continue;
      push(e);
      vegN += 1;
    }
    if (!out.some((s) => s === "олія" || s === "масло" || s === "оливкова олія")) {
      push("олія");
    }
  }

  if (/салат/i.test(t) && !/кулінар/i.test(t)) {
    let vegN = out.filter((s) => VEG_CONCRETE.has(s)).length;
    for (const e of ["огірок", "зелень", "олія"]) {
      if (vegN >= 2 && out.includes("олія")) break;
      push(e);
      if (VEG_CONCRETE.has(e)) vegN += 1;
    }
  }

  return out;
}

/**
 * Soft quality check for a meal slot (title + staples after expand).
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function assertTastyMealPack(title, staples) {
  const reasons = [];
  const t = String(title || "").trim();
  const list = expandMealStaples(t, staples);
  if (list.length < 2) reasons.push("too_few_staples");
  if (/овоч/i.test(t)) {
    const vegN = list.filter((s) => VEG_CONCRETE.has(s)).length;
    if (vegN < 2) reasons.push("veg_title_needs_2plus_veg");
    if (!list.some((s) => s !== "рис" && s !== "гречка" && s !== "булгур" && s !== "кіноа" && !VEG_CONCRETE.has(s) && s !== "олія" && s !== "масло")) {
      /* grain+veg+oil is ok — no extra protein required */
    }
    if (list.length < 3) reasons.push("veg_dish_needs_3plus_lines");
  }
  return { ok: reasons.length === 0, reasons, staples: list };
}
