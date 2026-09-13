/**
 * Prepared-dish thumbs for home ration card (not ingredient SKUs).
 * Keys: normalized UA mealMap titles → /content/dishes/*.png
 */

/** @type {Record<string, string>} */
export const DISH_THUMBS = {
  "тост з яйцем": "/content/dishes/toast-egg.png",
  "яєчня з тостом": "/content/dishes/toast-egg.png",
  "яєчня": "/content/dishes/omelette.png",
  "яєчня з огірком": "/content/dishes/omelette.png",
  "омлет": "/content/dishes/omelette.png",
  "омлет на маслі": "/content/dishes/omelette.png",
  "скрамбл": "/content/dishes/omelette.png",
  "індичка з овочами": "/content/dishes/turkey-veg.png",
  "індичка з гречкою": "/content/dishes/turkey-veg.png",
  "індичка з салатом": "/content/dishes/turkey-veg.png",
  "рис з овочами": "/content/dishes/rice-veg.png",
  "тунець з рисом": "/content/dishes/rice-veg.png",
  "йогурт на ранок": "/content/dishes/yogurt-berries.png",
  "йогурт з ягодами": "/content/dishes/yogurt-berries.png",
  "йогурт": "/content/dishes/yogurt-berries.png",
  "йогурт на вечір": "/content/dishes/yogurt-berries.png",
  "йогурт з кулінарії": "/content/dishes/yogurt-berries.png",
  "грецький йогурт · кулінарія": "/content/dishes/yogurt-berries.png",
  "йогурт питний · кулінарія": "/content/dishes/yogurt-berries.png",
  "овочі на пару": "/content/dishes/steamed-veg.png",
  "овочі з цибулею": "/content/dishes/steamed-veg.png",
  "зелений салат": "/content/dishes/steamed-veg.png",
  "легкий салат": "/content/dishes/steamed-veg.png",
  "салат овочевий · кулінарія": "/content/dishes/steamed-veg.png",
  "салат зі зеленню": "/content/dishes/steamed-veg.png",
  "скумбрія з салатом": "/content/dishes/mackerel-salad.png",
  "риба з салатом": "/content/dishes/mackerel-salad.png",
  "риба · кулінарія": "/content/dishes/mackerel-salad.png",
  "риба з овочами": "/content/dishes/mackerel-salad.png",
  "хек з овочами": "/content/dishes/mackerel-salad.png",
  "хек на вечір": "/content/dishes/mackerel-salad.png",
  "хек на пару": "/content/dishes/mackerel-salad.png",
  "курка з гречкою": "/content/dishes/chicken-buckwheat.png",
  "курка з гречкою й овочами": "/content/dishes/chicken-buckwheat.png",
  "гречка з куркою": "/content/dishes/chicken-buckwheat.png",
  "курка з овочами": "/content/dishes/chicken-buckwheat.png",
  "курка з рисом і овочами": "/content/dishes/chicken-buckwheat.png",
  "курка з салатом": "/content/dishes/chicken-buckwheat.png",
  "курка гриль · кулінарія": "/content/dishes/chicken-buckwheat.png",
  "яловичина з овочами": "/content/dishes/chicken-buckwheat.png",
  "вівсянка з бананом": "/content/dishes/oatmeal-banana.png",
  "вівсянка на молоці": "/content/dishes/oatmeal-banana.png",
  "лосось з салатом": "/content/dishes/salmon-salad.png",
  "салат з лососем": "/content/dishes/salmon-salad.png",
  "лосось на вечір": "/content/dishes/salmon-salad.png",
  "тунець з салатом": "/content/dishes/salmon-salad.png",
  "зелений салат з тунцем": "/content/dishes/salmon-salad.png",
  "творог із зеленню": "/content/dishes/yogurt-berries.png",
  "кефір на вечір": "/content/dishes/yogurt-berries.png",
};

function normalizeDishTitle(title) {
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Prefer prepared-dish art; fall back to null (caller may use SKU image).
 * @param {string} title
 * @returns {{ url: string, title: string } | null}
 */
export function resolveDishArt(title) {
  const key = normalizeDishTitle(title);
  if (!key) return null;
  const exact = DISH_THUMBS[key];
  if (exact) return { url: exact, title: String(title || "").trim() };
  /* Fuzzy: longest key contained in title or title contained in key */
  let best = null;
  let bestLen = 0;
  for (const [k, url] of Object.entries(DISH_THUMBS)) {
    if (key.includes(k) || k.includes(key)) {
      if (k.length > bestLen) {
        bestLen = k.length;
        best = url;
      }
    }
  }
  return best ? { url: best, title: String(title || "").trim() } : null;
}
