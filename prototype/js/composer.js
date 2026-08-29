import { assertContent } from "./contracts.js";
import { planCookList, groupQueries, envelopesFromHistory } from "./groups.js";
import { profileFromIntentOrStorage, resolveMealTrainingGoal } from "./sport-profile.js";

/**
 * @param {object} kb
 * @param {string} programId
 * @param {string} level
 * @param {{ sex?: string }} [opts]
 */
export function sessionFor(kb, programId, level, opts = {}) {
  const table = kb.sessions[programId] || kb.sessions.stretch;
  if (opts.sex === "female") {
    if (level === "intermediate" && Array.isArray(table.intermediate)) return table.intermediate;
    if (Array.isArray(table.beginner_female)) return table.beginner_female;
  }
  return table[level] || table.beginner || ["Крок на місці 5 хв"];
}

const MEAL_SLOTS = ["breakfast", "lunch", "dinner"];

/** Mon=0 … Sun=6 from YYYY-MM-DD (civil date, noon UTC). */
export function weekdayIndexFromDayISO(dayISO) {
  const m = String(dayISO || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return 0;
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
  if (Number.isNaN(dt.getTime())) return 0;
  return (dt.getUTCDay() + 6) % 7;
}

/**
 * Shallow-merge byBodyGoal[bodyGoal] slot overlays onto a training mealMap.
 * Reuses existing titles/staples only — skips course / unknown keys.
 * @param {object} goalMap
 * @param {string} [bodyGoal]
 */
export function applyBodyGoalMealOverlay(goalMap, bodyGoal) {
  const map = goalMap && typeof goalMap === "object" ? goalMap : {};
  const key = bodyGoal === "lose" || bodyGoal === "gain" || bodyGoal === "maintain" ? bodyGoal : "";
  const overlay = key && map.byBodyGoal && typeof map.byBodyGoal === "object" ? map.byBodyGoal[key] : null;
  if (!overlay || typeof overlay !== "object") return map;
  const out = { ...map };
  for (const slot of MEAL_SLOTS) {
    if (overlay[slot] == null) continue;
    const prev = out[slot];
    const prevObj = prev && typeof prev === "object" && !Array.isArray(prev) ? prev : {};
    const ov = overlay[slot];
    if (typeof ov === "string") {
      out[slot] = ov;
      continue;
    }
    if (ov && typeof ov === "object") out[slot] = { ...prevObj, ...ov };
  }
  return out;
}

/** When cookMode is ready — swap slots to Silpo Culinary mealMap (byCookMode.ready). */
export function applyCookModeMealOverlay(goalMap, cookMode) {
  const map = goalMap && typeof goalMap === "object" ? goalMap : {};
  if (cookMode !== "ready") return map;
  const overlay =
    map.byCookMode && typeof map.byCookMode === "object" && map.byCookMode.ready && typeof map.byCookMode.ready === "object"
      ? map.byCookMode.ready
      : null;
  if (!overlay) return map;
  const out = { ...map };
  for (const slot of MEAL_SLOTS) {
    if (overlay[slot] == null) continue;
    const prev = out[slot];
    const prevObj = prev && typeof prev === "object" && !Array.isArray(prev) ? prev : {};
    const ov = overlay[slot];
    if (typeof ov === "string") {
      out[slot] = ov;
      continue;
    }
    if (ov && typeof ov === "object") out[slot] = { ...prevObj, ...ov };
  }
  return out;
}

function profileReadyForMealOverlay(profile) {
  return Boolean(
    profile &&
      (profile.completedAt ||
        (profile.sex &&
          profile.age != null &&
          profile.heightCm != null &&
          profile.weightKg != null &&
          profile.bodyGoal)),
  );
}

/**
 * mealMaps entry after bodyGoal→training remap (keeps `course` / `byBodyGoal`).
 * @param {object} kb
 * @param {string} [programGoal]
 * @param {object} [profile]
 */
export function resolveTrainingMealMap(kb, programGoal, profile) {
  const goal = resolveMealTrainingGoal(programGoal, profile);
  return (goal && kb?.mealMaps?.[goal]) || kb?.mealMaps?.mobility || {};
}

/**
 * Training mealMap slots + byBodyGoal overlay + optional byCookMode.ready (Culinary).
 * Overlay order: course → byBodyGoal → byCookMode.ready (culinary wins when ready).
 * @param {object} kb
 * @param {string} [programGoal]
 * @param {object} [profile]
 * @param {{ dayISO?: string, cookMode?: string }} [opts]
 */
export function resolveGoalMealMap(kb, programGoal, profile, opts = {}) {
  const raw = resolveTrainingMealMap(kb, programGoal, profile);
  const dayISO = opts?.dayISO;
  const base = dayISO
    ? pickMealMapForDay(raw, dayISO)
    : Object.fromEntries(MEAL_SLOTS.filter((s) => raw[s] != null).map((s) => [s, raw[s]]));
  const bodyGoal = profileReadyForMealOverlay(profile) ? profile.bodyGoal || "" : "";
  const withBody = applyBodyGoalMealOverlay(
    { ...base, byBodyGoal: raw.byBodyGoal, byCookMode: raw.byCookMode },
    bodyGoal,
  );
  return applyCookModeMealOverlay(withBody, opts.cookMode);
}

/**
 * Resolve goal mealMap for a calendar day.
 * Optional `course[]` overlays slot fields onto static breakfast/lunch/dinner.
 * Missing course → static slots only. Skips non-slot keys (e.g. course, byBodyGoal).
 */
export function pickMealMapForDay(goalMap, dayISO) {
  const map = goalMap && typeof goalMap === "object" ? goalMap : {};
  const base = {};
  for (const slot of MEAL_SLOTS) {
    if (map[slot] != null) base[slot] = map[slot];
  }
  const course = Array.isArray(map.course) ? map.course.filter((d) => d && typeof d === "object") : [];
  if (!course.length) return base;
  const day = course[weekdayIndexFromDayISO(dayISO) % course.length] || {};
  const out = { ...base };
  for (const slot of MEAL_SLOTS) {
    const overlay = day[slot];
    if (overlay == null) continue;
    if (typeof overlay === "string") {
      out[slot] = overlay;
      continue;
    }
    const prev = out[slot];
    const prevObj = prev && typeof prev === "object" && !Array.isArray(prev) ? prev : {};
    out[slot] = { ...prevObj, ...overlay };
  }
  return out;
}

/** Optional mealMap `cook`: cook|ready → dish stove chip (Epic 5.2). */
export function normalizeMealCook(v) {
  const s = String(v || "")
    .trim()
    .toLowerCase();
  if (s === "cook" || s === "raw") return "cook";
  if (s === "ready") return "ready";
  return "";
}

/** UA chip label for meal cook tag — empty if unknown. */
export function mealCookChipUa(cook) {
  const c = normalizeMealCook(cook);
  if (c === "cook") return "плита";
  if (c === "ready") return "готове";
  return "";
}

/** Expand mealMaps entry → shopQueries (dish title on groupTitle; unique ingredient roles). */
export function sportShopQueriesFromMealMap(meals) {
  const map = meals && typeof meals === "object" ? meals : {};
  const out = [];
  for (const slot of MEAL_SLOTS) {
    const raw = map[slot];
    if (raw == null) continue;
    if (typeof raw === "string") {
      const staple = String(raw).trim();
      if (!staple) continue;
      out.push({
        q: staple,
        staple,
        role: slot,
        envelope: "food",
        group: slot,
        groupTitle: staple,
        why: staple,
      });
      continue;
    }
    const title = String(raw.title || slot).trim() || slot;
    const cook = normalizeMealCook(raw.cook);
    const staples = Array.isArray(raw.staples) ? raw.staples : [];
    for (const s of staples) {
      const staple = String(s || "").trim();
      if (!staple) continue;
      out.push({
        q: staple,
        staple,
        role: `${slot}:${staple}`.slice(0, 24),
        envelope: "food",
        group: slot,
        groupTitle: title,
        why: title,
        ...(cook ? { cook } : {}),
      });
    }
  }
  return out;
}

export function compose(intent, kb) {
  if (intent.surface === "sport") {
    const program = kb.programs.find((p) => p.id === intent.constraints.programId) || kb.programs[4];
    const profile = profileFromIntentOrStorage(intent);
    const meals = resolveGoalMealMap(kb, program.goal, profile);
    const steps = intent.constraints.steps || 6000;
    const content = {
      type: "workout_program",
      title: program.title,
      blocks: sessionFor(kb, program.id, intent.constraints.level, { sex: profile.sex }),
      shopQueries: sportShopQueriesFromMealMap(meals),
      variants: [
        {
          id: "walk",
          title: `Ціль ≈ ${steps} кроків`,
          text: "Прогулянка до найближчого Сільпо з продуктами дня. Кроки рахує телефон.",
        },
      ],
      disclaimer: "не медична порада",
    };
    return assertContent(content);
  }

  if (intent.surface === "shopping") {
    const allow = new Set(intent.constraints.categoriesAllow);
    const horizon = intent.horizon || "week";
    const a = planCookList(kb.history, { allow, variant: "A", horizon });
    const b = planCookList(kb.history, { allow, variant: "B", horizon });
    const c = planCookList(kb.history, { allow, variant: "C", horizon });
    const blurb = (qs) =>
      [...new Set((qs || []).map((q) => q.groupTitle || q.q))].slice(0, 4).join(" · ");

    const content = {
      type: "cart_variants",
      title: `Стеля ${intent.constraints.budgetUah} ₴ / ${horizonUa(horizon)}`,
      blocks: [
        kb.historyNote ||
          "Історія з чеків ≥3 міс. Групи — чеклист, не один SKU на категорію.",
      ],
      shopQueries: [...a, ...b, ...c].filter((q, i, arr) => arr.findIndex((x) => x.role === q.role) === i),
      variants: [
        { id: "A", title: "Поповнити", queries: a, groups: groupQueries(a), blurb: blurb(a) },
        { id: "B", title: "Як завжди", queries: b, groups: groupQueries(b), blurb: blurb(b) },
        { id: "C", title: "На всі гроші", queries: c, groups: groupQueries(c), blurb: blurb(c) },
      ],
      historyEnvelopes: envelopesFromHistory(kb.history),
      disclaimer: "не медична порада",
    };
    return assertContent(content);
  }

  throw new Error("unsupported_surface");
}

function horizonUa(h) {
  return { day: "день", week: "тиждень", month: "місяць" }[h] || h;
}
