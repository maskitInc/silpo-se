/** Express checklist / base membership for Sport day meals — pure. */

/**
 * @param {object} line resolve meal line
 * @param {{ extraQueries?: object[], shopLines?: object[], bases?: object[] }} [opts]
 */
export function expressMembershipForMeal(line, opts = {}) {
  const extraQueries = opts.extraQueries ?? [];
  const shopLines = opts.shopLines ?? [];
  const bases = opts.bases ?? [];
  const productId = line?.sku?.productId != null ? String(line.sku.productId) : "";
  const name = String(line?.name || line?.wanted || "").trim().toLowerCase();
  const wanted = String(line?.wanted || "").trim().toLowerCase();
  const inExtra = extraQueries.some((q) => {
    if (productId && q.productId != null && String(q.productId) === productId) return true;
    const qn = String(q.q || q.staple || "").trim().toLowerCase();
    return Boolean(qn && (qn === name || qn === wanted));
  });
  const inShop = shopLines.some((l) => {
    if (productId && l.sku?.productId != null && String(l.sku.productId) === productId) return true;
    const ln = String(l.name || l.wanted || "").trim().toLowerCase();
    return Boolean(ln && (ln === name || ln === wanted));
  });
  let inBase = false;
  let baseTitle = "";
  for (const b of bases) {
    for (const bl of b.lines || []) {
      const hitId = productId && bl.preferredSku && String(bl.preferredSku) === productId;
      const hint = String(bl.nameHint || "").trim().toLowerCase();
      const staple = String(bl.staple || "").trim().toLowerCase();
      if (
        hitId ||
        (hint && (hint === name || hint === wanted)) ||
        (staple && (staple === wanted || name.includes(staple)))
      ) {
        inBase = true;
        baseTitle = b.title || "База";
        break;
      }
    }
    if (inBase) break;
  }
  const inChecklist = inExtra || inShop;
  let label = "";
  if (inChecklist && inBase) label = "в Express · у базі";
  else if (inChecklist) label = "вже в Express";
  else if (inBase) label = `у базі · ${baseTitle}`;
  return { inChecklist, inBase, inExpress: inChecklist || inBase, label, baseTitle };
}
