/**
 * Sport survey v0 — guest prefs for ration filter (not medical advice).
 * Epic 2 · research/22–23
 */

import { emptySportRationPlan, mealMapStaples } from "./sport-ration-plan.js";
import { sportShopQueriesFromMealMap, resolveGoalMealMap } from "./composer.js";
import { loadSportProfile, resolveMealTrainingGoal } from "./sport-profile.js";

export const SURVEY_KEY = "silpo.sport.surveyV0.v1";

/** Closed avoid chips → staple tokens that appear in kb mealMaps. */
export const SURVEY_AVOID_CHIPS = [
  { id: "milk", label: "без молока", staples: ["молоко"] },
  { id: "eggs", label: "без яєць", staples: ["яйця"] },
  { id: "fish", label: "без риби", staples: ["риба"] },
  { id: "chicken", label: "без курки", staples: ["курка"] },
  { id: "yogurt", label: "без йогурту", staples: ["йогурт"] },
];

export const SURVEY_DIET_TAGS = [{ id: "vegetarian", label: "без мʼяса / риби", drop: ["курка", "риба"] }];

export const SURVEY_COOK_MODES = [
  { id: "any", label: "як зручно" },
  /** Prefer raw / cook-at-home SKUs on shelf (`kindFromCookMode` → raw). */
  { id: "cook", label: "готувати самому" },
  /** Prefer ready-made SKUs (`kindFromCookMode` → ready). */
  { id: "ready", label: "готове з полиці" },
];

/**
 * @typedef {{
 *   version: "survey_v0",
 *   avoidIds: string[],
 *   dietTags: string[],
 *   cookMode: "any" | "cook" | "ready",
 *   completedAt: string | null
 * }} SportSurveyPrefs
 */

/** @returns {SportSurveyPrefs} */
export function emptySportSurvey() {
  return {
    version: "survey_v0",
    avoidIds: [],
    dietTags: [],
    cookMode: "any",
    completedAt: null,
  };
}

export function loadSportSurvey(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(SURVEY_KEY);
    if (!raw) return emptySportSurvey();
    const parsed = JSON.parse(raw);
    return normalizeSurvey(parsed);
  } catch {
    return emptySportSurvey();
  }
}

export function saveSportSurvey(prefs, storage = globalThis.localStorage) {
  const next = normalizeSurvey({
    ...prefs,
    completedAt: prefs?.completedAt || new Date().toISOString(),
  });
  try {
    storage?.setItem?.(SURVEY_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return next;
}

export function surveyIsComplete(prefs) {
  return Boolean(prefs?.completedAt);
}

/** @param {unknown} raw */
export function normalizeSurvey(raw) {
  const base = emptySportSurvey();
  if (!raw || typeof raw !== "object") return base;
  const avoidIds = Array.isArray(raw.avoidIds)
    ? raw.avoidIds.map(String).filter((id) => SURVEY_AVOID_CHIPS.some((c) => c.id === id))
    : [];
  const dietTags = Array.isArray(raw.dietTags)
    ? raw.dietTags.map(String).filter((id) => SURVEY_DIET_TAGS.some((c) => c.id === id))
    : [];
  const cookMode = SURVEY_COOK_MODES.some((m) => m.id === raw.cookMode) ? raw.cookMode : "any";
  const completedAt =
    typeof raw.completedAt === "string" && raw.completedAt.trim() ? String(raw.completedAt) : null;
  return { version: "survey_v0", avoidIds, dietTags, cookMode, completedAt };
}

/** Flatten avoid + diet drops to lowercased staple tokens. */
export function surveyDropStaples(prefs) {
  const p = normalizeSurvey(prefs);
  const drop = new Set();
  for (const id of p.avoidIds) {
    const chip = SURVEY_AVOID_CHIPS.find((c) => c.id === id);
    for (const s of chip?.staples || []) drop.add(String(s).toLowerCase());
  }
  for (const id of p.dietTags) {
    const tag = SURVEY_DIET_TAGS.find((t) => t.id === id);
    for (const s of tag?.drop || []) drop.add(String(s).toLowerCase());
  }
  return [...drop];
}

/**
 * Filter sport shopQueries by survey prefs.
 * @param {Array<{ q?: string, staple?: string, role?: string }>} queries
 * @param {SportSurveyPrefs|object} prefs
 */
export function filterQueriesBySurvey(queries, prefs) {
  const drop = new Set(surveyDropStaples(prefs));
  if (!drop.size) return Array.isArray(queries) ? [...queries] : [];
  return (queries || []).filter((q) => {
    const staple = String(q?.staple || q?.q || "")
      .trim()
      .toLowerCase();
    if (!staple) return true;
    return !drop.has(staple) && ![...drop].some((d) => staple.includes(d) || d.includes(staple));
  });
}

/**
 * mealMap staples minus survey drops (Шафа preferSport alignment).
 */
export function mealMapStaplesWithSurvey(kb, programId, prefs) {
  const base = mealMapStaples(kb, programId, { cookMode: prefs?.cookMode });
  const drop = new Set(surveyDropStaples(prefs));
  if (!drop.size) return base;
  return base.filter((s) => !drop.has(s) && ![...drop].some((d) => s.includes(d) || d.includes(s)));
}

export function surveyHasActiveFilters(prefs) {
  const p = normalizeSurvey(prefs);
  return p.avoidIds.length > 0 || p.dietTags.length > 0 || (p.cookMode && p.cookMode !== "any");
}

/**
 * Build SportRationPlan for day (source kb / survey_v0 / partner_fixture).
 * @param {{ kb: object, programId?: string, level?: string, dayISO?: string, prefs?: object, partnerId?: string|null, contentPack?: object|null }} opts
 */
export function buildSportRationPlan({
  kb,
  programId,
  level,
  dayISO,
  prefs,
  partnerId = null,
  contentPack = null,
  profile = null,
}) {
  const programs = kb?.programs || [];
  const program = programs.find((p) => p.id === programId) || programs[0];
  const programGoal = program?.goal || "";
  const profileResolved = profile ?? loadSportProfile();
  const goal = resolveMealTrainingGoal(programGoal, profileResolved);
  const meals = resolveGoalMealMap(kb, programGoal, profileResolved, {
    dayISO,
    cookMode: prefs?.cookMode,
  });
  const base = sportShopQueriesFromMealMap(meals);
  const filtered = filterQueriesBySurvey(base, prefs);
  const surveyActive = surveyHasActiveFilters(prefs);
  const pid = partnerId || contentPack?.id || null;
  let source = "kb";
  if (pid && contentPack) source = "partner_fixture";
  else if (surveyActive) source = "survey_v0";
  return emptySportRationPlan({
    programId: program?.id || String(programId || ""),
    goal,
    level: level || "beginner",
    dayISO: dayISO || "",
    queries: filtered,
    source,
    partnerId: pid,
  });
}

export function cookModeLabel(mode) {
  return SURVEY_COOK_MODES.find((m) => m.id === mode)?.label || "як зручно";
}

/**
 * Map survey cookMode → staples.foodKind prefer for resolve scoring.
 * @returns {"ready"|"raw"|null}
 */
export function kindFromCookMode(mode) {
  if (mode === "ready") return "ready";
  if (mode === "cook") return "raw";
  return null;
}

export function surveySummaryLine(prefs) {
  const p = normalizeSurvey(prefs);
  const bits = [];
  for (const id of p.avoidIds) {
    const c = SURVEY_AVOID_CHIPS.find((x) => x.id === id);
    if (c) bits.push(c.label);
  }
  for (const id of p.dietTags) {
    const t = SURVEY_DIET_TAGS.find((x) => x.id === id);
    if (t) bits.push(t.label);
  }
  if (p.cookMode && p.cookMode !== "any") bits.push(cookModeLabel(p.cookMode));
  if (!bits.length) return surveyIsComplete(p) ? "смаки · без фільтрів" : "";
  return bits.slice(0, 3).join(" · ");
}

/** Day prefs: avoid/diet only — cookMode shown as plate-mode radiogroup. */
export function surveyTasteLine(prefs) {
  const p = normalizeSurvey(prefs);
  const bits = [];
  for (const id of p.avoidIds) {
    const c = SURVEY_AVOID_CHIPS.find((x) => x.id === id);
    if (c) bits.push(c.label);
  }
  for (const id of p.dietTags) {
    const t = SURVEY_DIET_TAGS.find((x) => x.id === id);
    if (t) bits.push(t.label);
  }
  if (!bits.length) return surveyIsComplete(p) ? "смаки · без фільтрів" : "смаки";
  return bits.slice(0, 3).join(" · ");
}

/** Active taste filters (avoid + diet) — badge on day filter icon. */
export function surveyTasteFilterCount(prefs) {
  const p = normalizeSurvey(prefs);
  return p.avoidIds.length + p.dietTags.length;
}

/** Day plate mode: ready culinary vs grocery ingredients (maps to cookMode). */
export function plateModeFromCookMode(mode) {
  return mode === "ready" ? "ready" : "ingredients";
}

export function cookModeFromPlateMode(plateMode) {
  return plateMode === "ready" ? "ready" : "cook";
}
