/** Контракти Intent / ContentObject / ResolveResult / ViewModel. Без npm. */

export const SURFACES = ["sport", "shopping", "home", "city"];
export const HORIZONS = ["day", "week", "month"];
export const ENVELOPES = ["food", "alcohol", "tobacco", "clean"];
export const LINE_STATUS = ["found", "missing", "replaced"];

export function emptyIntent(surface) {
  return {
    surface,
    goal: "",
    horizon: "week",
    constraints: {
      budgetUah: 1500,
      categoriesAllow: ["food", "clean"],
      level: "beginner",
      programId: "military",
      steps: 6000,
      sex: "",
      age: null,
      heightCm: null,
      weightKg: null,
      bodyGoal: "",
      profileAt: "",
    },
  };
}

export function assertIntent(raw) {
  if (!raw || !SURFACES.includes(raw.surface)) throw new Error("bad_intent_surface");
  const c = raw.constraints || {};
  const sex = c.sex === "female" || c.sex === "male" ? c.sex : "";
  const bodyGoal =
    c.bodyGoal === "lose" || c.bodyGoal === "gain" || c.bodyGoal === "maintain" ? c.bodyGoal : "";
  const ageN = Number(c.age);
  const heightN = Number(c.heightCm);
  const weightN = Number(c.weightKg);
  return {
    surface: raw.surface,
    goal: String(raw.goal || ""),
    horizon: HORIZONS.includes(raw.horizon) ? raw.horizon : "week",
    constraints: {
      budgetUah: Number(c.budgetUah) || 0,
      categoriesAllow: (() => {
        const a = (c.categoriesAllow || []).filter((x) => ENVELOPES.includes(x));
        return a.length ? a : ["food", "clean"];
      })(),
      level: c.level === "intermediate" ? "intermediate" : "beginner",
      programId: String(c.programId || ""),
      steps: Math.max(0, Number(c.steps) || 0),
      sex,
      age: Number.isFinite(ageN) ? Math.round(ageN) : null,
      heightCm: Number.isFinite(heightN) ? Math.round(heightN) : null,
      weightKg: Number.isFinite(weightN) ? Math.round(weightN) : null,
      bodyGoal,
      profileAt: typeof c.profileAt === "string" ? c.profileAt : "",
    },
  };
}

export function assertContent(raw) {
  const types = ["workout_program", "day_meals", "cart_variants", "walk_loop", "catalog"];
  if (!raw || !types.includes(raw.type)) throw new Error("bad_content_type");
  return {
    type: raw.type,
    title: String(raw.title || "").slice(0, 80),
    blocks: Array.isArray(raw.blocks) ? raw.blocks.slice(0, 20) : [],
    shopQueries: Array.isArray(raw.shopQueries)
      ? raw.shopQueries.slice(0, 40).map((q) => ({
          q: String(q.q || "").slice(0, 80),
          role: String(q.role || "item").slice(0, 24),
          envelope: ENVELOPES.includes(q.envelope) ? q.envelope : "food",
          staple: q.staple ? String(q.staple).slice(0, 40) : undefined,
          group: q.group ? String(q.group).slice(0, 24) : undefined,
          groupTitle: q.groupTitle ? String(q.groupTitle).slice(0, 80) : undefined,
          why: q.why ? String(q.why).slice(0, 120) : undefined,
          units: Math.max(1, Number(q.units) || 1),
          priceMin: typeof q.priceMin === "number" ? q.priceMin : undefined,
          priceMax: typeof q.priceMax === "number" ? q.priceMax : undefined,
        }))
      : [],
    disclaimer: "не медична порада",
    variants: Array.isArray(raw.variants)
      ? raw.variants.slice(0, 3).map((v) => ({
          ...v,
          queries: Array.isArray(v.queries)
            ? v.queries.slice(0, 40).map((q) => ({
                q: String(q.q || "").slice(0, 80),
                role: String(q.role || "item").slice(0, 24),
                envelope: ENVELOPES.includes(q.envelope) ? q.envelope : "food",
                staple: q.staple ? String(q.staple).slice(0, 40) : undefined,
                group: q.group ? String(q.group).slice(0, 24) : undefined,
                groupTitle: q.groupTitle ? String(q.groupTitle).slice(0, 80) : undefined,
                why: q.why ? String(q.why).slice(0, 120) : undefined,
                units: Math.max(1, Number(q.units) || 1),
                priceMin: typeof q.priceMin === "number" ? q.priceMin : undefined,
                priceMax: typeof q.priceMax === "number" ? q.priceMax : undefined,
              }))
            : [],
        }))
      : [],
    historyEnvelopes: Array.isArray(raw.historyEnvelopes)
      ? raw.historyEnvelopes.filter((x) => ENVELOPES.includes(x))
      : [],
  };
}

export function assertResolve(raw) {
  return {
    lines: (raw?.lines || []).map((l) => ({
      role: String(l.role || ""),
      wanted: l.wanted ? String(l.wanted) : "",
      name: String(l.name || ""),
      status: LINE_STATUS.includes(l.status) ? l.status : "missing",
      price: typeof l.price === "number" ? l.price : null,
      unitPrice: typeof l.unitPrice === "number" ? l.unitPrice : undefined,
      envelope: ENVELOPES.includes(l.envelope) ? l.envelope : "food",
      note: l.note ? String(l.note).slice(0, 80) : "",
      sku: l.sku && typeof l.sku === "object" ? l.sku : null,
      image: l.image ? String(l.image) : "",
      group: l.group ? String(l.group) : "",
      groupTitle: l.groupTitle ? String(l.groupTitle) : "",
      why: l.why ? String(l.why).slice(0, 120) : "",
      units: typeof l.units === "number" ? Math.max(1, l.units) : 1,
      quantity: typeof l.quantity === "number" && l.quantity > 0 ? l.quantity : undefined,
      weighted: Boolean(l.weighted) || undefined,
      step: typeof l.step === "number" && l.step > 0 ? l.step : undefined,
      displayRatio: l.displayRatio ? String(l.displayRatio).slice(0, 16) : undefined,
      stock: typeof l.stock === "number" ? l.stock : undefined,
      amount: l.amount ? String(l.amount).slice(0, 24) : "",
      ...(l.cook === "cook" || l.cook === "ready" ? { cook: l.cook } : {}),
    })),
    branchLabel: String(raw?.branchLabel || ""),
    totals: {
      min: Number(raw?.totals?.min) || 0,
      max: Number(raw?.totals?.max) || 0,
    },
    checkout: raw?.checkout ? String(raw.checkout) : null,
  };
}
