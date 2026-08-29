import { compose } from "./composer.js";
import { resolveQueries, clipToBudget } from "./resolver.js";
import { gateViewModel } from "./gate.js";
import { assertIntent } from "./contracts.js";

export function runPipeline(intentRaw, kb, shelf, extra = {}) {
  const intent = assertIntent(intentRaw);
  const content = compose(intent, { ...kb, history: shelf.history });
  let queries = extra.queriesOverride || content.shopQueries;

  if (intent.surface === "shopping" && extra.variantId) {
    const v = content.variants.find((x) => x.id === extra.variantId);
    if (v?.queries) queries = v.queries;
  }

  if (extra.removedRoles?.length) {
    const drop = new Set(extra.removedRoles);
    queries = queries.filter((q) => !drop.has(q.role) && !drop.has(q.q));
  }

  if (extra.swaps && typeof extra.swaps === "object") {
    queries = queries.map((q) => {
      const sw = extra.swaps[q.role];
      if (!sw) return { ...q, staple: q.staple || q.q };
      const name = typeof sw === "string" ? sw : sw.name || sw.q;
      const nextStaple = typeof sw === "string" ? sw : sw.staple || name;
      return name ? { ...q, staple: nextStaple, q: name } : { ...q, staple: q.staple || q.q };
    });
  }

  if (Array.isArray(extra.extraQueries) && extra.extraQueries.length) {
    queries = [...queries, ...extra.extraQueries];
  }

  const resolve = resolveQueries(queries, shelf, { confirmed: extra.confirmed });
  if (intent.surface === "shopping") {
    resolve.lines = clipToBudget(resolve.lines, intent.constraints.budgetUah);
    resolve.totals.min = resolve.lines.reduce((s, l) => s + (l.price || 0), 0);
    resolve.totals.max = resolve.totals.min;
  }

  const vm = gateViewModel(content, resolve, {
    categoriesAllow: intent.constraints.categoriesAllow,
    debug: extra.debug,
  });
  return { intent, content, vm };
}
