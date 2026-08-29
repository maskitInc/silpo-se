/** Гейт: у View Model лише allow-list. Модель і MCP сюди не ходять напряму. */

const MED = /дефіцит|діагноз|мг\b|признач|лікуй|калорі[їю]/i;
const SECRET = /token|jwt|authorization|mcp_token/i;

export function gateViewModel(content, resolve, opts = {}) {
  const rawAllow = opts.categoriesAllow;
  const allow = new Set(
    Array.isArray(rawAllow) && rawAllow.length ? rawAllow : ["food", "clean"],
  );
  const debug = Boolean(opts.debug);

  const blocks = (content.blocks || []).filter((b) => {
    const t = typeof b === "string" ? b : JSON.stringify(b);
    return !MED.test(t) && !SECRET.test(t);
  });

  const lines = (resolve.lines || [])
    .filter((l) => {
      if (!allow.has(l.envelope || "food")) return false;
      if (SECRET.test(l.name)) return false;
      if (MED.test(l.name)) return false;
      if ((l.status === "found" || l.status === "replaced") && l.price != null && l.price < 0) return false;
      return true;
    })
    .map((l) => (l.status === "missing" ? { ...l, price: null } : l));

  const vm = {
    title: content.title,
    type: content.type,
    disclaimer: content.disclaimer,
    blocks,
    variants: content.variants || [],
    historyEnvelopes: content.historyEnvelopes || [],
    lines,
    branchLabel: resolve.branchLabel,
    totals: resolve.totals,
    checkout: resolve.checkout,
  };

  if (debug) {
    vm.debug = {
      note: "лише для журі; головний екран це не показує",
      queryCount: (content.shopQueries || []).length,
      droppedMedical: (content.blocks || []).length - blocks.length,
    };
  }

  return vm;
}
