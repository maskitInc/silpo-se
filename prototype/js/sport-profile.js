/**
 * Sport body profile (v0) — sex / age / height / weight / body goal / target weight.
 * Separate from taste survey (sport-survey.js). Not medical advice.
 * Sex feeds soft kcal target (Mifflin-St Jeor × activity) + program ranking;
 * female CDN exercise art is still unavailable (exercise-art-map.js).
 */

export const SPORT_PROFILE_KEY = "silpo.sport.profileV0.v1";

/** Soft default Δkg when switching to lose (−) or gain (+). */
export const TARGET_WEIGHT_DEFAULT_DELTA_KG = 7;

export const BODY_GOALS = [
  { id: "lose", label: "скинути" },
  { id: "gain", label: "набрати" },
  { id: "maintain", label: "баланс" },
];

export const SEX_OPTIONS = [
  { id: "female", label: "жінка" },
  { id: "male", label: "чоловік" },
];

/** bodyGoal → preferred kb program.goal */
export const BODY_GOAL_TO_TRAINING = {
  lose: "cardio",
  gain: "strength",
  maintain: "mobility",
};

/** UA label for program.goal codes shown in lists */
export const TRAINING_GOAL_UA = {
  cardio: "кардіо",
  strength: "сила",
  mobility: "мобільність",
};

/**
 * Soft program pace vs afrobeat reference (~3 months for 7 kg @ soft adherence).
 * Higher = faster toward target (heuristic, not MET science).
 */
export const PROGRAM_PACE = {
  afrobeat: 1.0,
  military: 1.05,
  calisthenics: 0.95,
  stretch: 0.55,
  "core-mobility": 0.6,
  "chair-yoga": 0.5,
  "tai-chi": 0.45,
};

/** Afrobeat baseline months for a 7 kg gap (product narrative). */
export const REF_MONTHS_PER_7KG = 3;

export function trainingGoalLabel(goal) {
  const g = String(goal || "");
  return TRAINING_GOAL_UA[g] || g;
}

/**
 * @typedef {{
 *   version: "profile_v0",
 *   sex: "female" | "male" | "",
 *   age: number | null,
 *   heightCm: number | null,
 *   weightKg: number | null,
 *   targetWeightKg: number | null,
 *   bodyGoal: "lose" | "gain" | "maintain" | "",
 *   completedAt: string | null
 * }} SportProfile
 */

/** @returns {SportProfile} */
export function emptySportProfile() {
  return {
    version: "profile_v0",
    sex: "",
    age: null,
    heightCm: null,
    weightKg: null,
    targetWeightKg: null,
    bodyGoal: "",
    completedAt: null,
  };
}

function numOrNull(v, min, max) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n);
  if (r < min || r > max) return null;
  return r;
}

/**
 * Default desired weight from current weight + goal.
 * @param {number|null|undefined} weightKg
 * @param {"lose"|"gain"|"maintain"|""} bodyGoal
 */
export function defaultTargetWeightKg(weightKg, bodyGoal) {
  const w = numOrNull(weightKg, 35, 200);
  if (w == null || !bodyGoal) return null;
  if (bodyGoal === "maintain") return w;
  if (bodyGoal === "lose") return Math.max(35, w - TARGET_WEIGHT_DEFAULT_DELTA_KG);
  if (bodyGoal === "gain") return Math.min(200, w + TARGET_WEIGHT_DEFAULT_DELTA_KG);
  return null;
}

/**
 * Align targetWeight with goal/weight rules (maintain mirrors; lose/gain fill ±7 when missing/invalid).
 * @param {Partial<SportProfile>} prefs
 * @param {{ forceDefault?: boolean }} [opts]
 */
export function resolveTargetWeightKg(prefs, opts = {}) {
  const bodyGoal =
    prefs?.bodyGoal === "lose" || prefs?.bodyGoal === "gain" || prefs?.bodyGoal === "maintain"
      ? prefs.bodyGoal
      : "";
  const weightKg = numOrNull(prefs?.weightKg, 35, 200);
  if (!bodyGoal || weightKg == null) return null;
  if (bodyGoal === "maintain") return weightKg;
  const force = Boolean(opts.forceDefault);
  let target = force ? null : numOrNull(prefs?.targetWeightKg, 35, 200);
  if (bodyGoal === "lose" && target != null && target >= weightKg) target = null;
  if (bodyGoal === "gain" && target != null && target <= weightKg) target = null;
  if (target == null) target = defaultTargetWeightKg(weightKg, bodyGoal);
  return target;
}

/** @param {Partial<SportProfile>|null|undefined} raw */
export function normalizeSportProfile(raw) {
  const base = emptySportProfile();
  if (!raw || typeof raw !== "object") return base;
  const sex = raw.sex === "female" || raw.sex === "male" ? raw.sex : "";
  const bodyGoal =
    raw.bodyGoal === "lose" || raw.bodyGoal === "gain" || raw.bodyGoal === "maintain" ? raw.bodyGoal : "";
  const weightKg = numOrNull(raw.weightKg, 35, 200);
  const draft = {
    version: "profile_v0",
    sex,
    age: numOrNull(raw.age, 14, 90),
    heightCm: numOrNull(raw.heightCm, 120, 230),
    weightKg,
    bodyGoal,
    targetWeightKg: numOrNull(raw.targetWeightKg, 35, 200),
    completedAt: typeof raw.completedAt === "string" ? raw.completedAt : null,
  };
  if (bodyGoal && weightKg != null) {
    draft.targetWeightKg = resolveTargetWeightKg(draft);
  }
  return draft;
}

export function profileIsComplete(prefs) {
  const p = normalizeSportProfile(prefs);
  return Boolean(
    p.sex &&
      p.age != null &&
      p.heightCm != null &&
      p.weightKg != null &&
      p.bodyGoal &&
      p.completedAt,
  );
}

export function loadSportProfile(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(SPORT_PROFILE_KEY);
    if (!raw) return emptySportProfile();
    return normalizeSportProfile(JSON.parse(raw));
  } catch {
    return emptySportProfile();
  }
}

/** @param {Partial<SportProfile>} prefs */
export function saveSportProfile(prefs, storage = globalThis.localStorage) {
  const next = normalizeSportProfile({
    ...prefs,
    completedAt: prefs.completedAt || new Date().toISOString(),
  });
  try {
    storage?.setItem?.(SPORT_PROFILE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function bodyGoalLabel(id) {
  return BODY_GOALS.find((g) => g.id === id)?.label || "";
}

export function sexLabel(id) {
  return SEX_OPTIONS.find((s) => s.id === id)?.label || "";
}

/** Home-only programs (outdoor hidden from pick/catalog). */
export function programsForHome(list) {
  return (Array.isArray(list) ? list : []).filter((p) => String(p.place || "home") === "home");
}

/**
 * Soft level hint from profile (female / older → beginner; young+gain → intermediate).
 * @param {SportProfile} prefs
 * @returns {"beginner"|"intermediate"}
 */
export function suggestLevelFromProfile(prefs) {
  const p = normalizeSportProfile(prefs);
  if (!p.age) return "beginner";
  if (p.age >= 55) return "beginner";
  if (p.bodyGoal === "gain" && p.age < 40 && p.sex === "male") return "intermediate";
  if (p.sex === "female") return "beginner";
  if (p.bodyGoal === "gain" && p.age < 35) return "intermediate";
  return "beginner";
}

/**
 * Rank home programs for profile. Prefer bodyGoal→training goal; softer list for female/55+.
 * @param {object[]} programs
 * @param {SportProfile} prefs
 */
export function rankProgramsForProfile(programs, prefs) {
  const p = normalizeSportProfile(prefs);
  const home = programsForHome(programs);
  const prefer = BODY_GOAL_TO_TRAINING[p.bodyGoal] || "mobility";
  const soft = p.sex === "female" || (p.age != null && p.age >= 55);
  const softIds = new Set(["stretch", "chair-yoga", "tai-chi", "core-mobility"]);
  return [...home]
    .map((prog, i) => {
      let score = 0;
      if (prog.goal === prefer) score += 100;
      if (soft && softIds.has(prog.id)) score += 20;
      if (soft && !softIds.has(prog.id) && prog.goal === "strength") score -= 15;
      return { prog, score, i };
    })
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.prog);
}

/**
 * Maintenance TDEE (no lose/gain multiplier). Prototype heuristic.
 * @param {SportProfile} prefs
 * @returns {number|null}
 */
export function estimateMaintenanceKcalFromProfile(prefs) {
  const p = normalizeSportProfile(prefs);
  if (!p.sex || p.age == null || p.heightCm == null || p.weightKg == null) return null;
  const w = p.weightKg;
  const h = p.heightCm;
  const a = p.age;
  const bmr =
    p.sex === "male" ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161;
  const tdee = bmr * 1.375; /* light home activity */
  return Math.max(1400, Math.min(3500, Math.round(tdee / 50) * 50));
}

/**
 * Mifflin-St Jeor × light activity, adjusted by bodyGoal.
 * Prototype heuristic — not clinical nutrition.
 * @param {SportProfile} prefs
 * @returns {number} kcal/day (clamped)
 */
export function estimateDailyKcalFromProfile(prefs) {
  const p = normalizeSportProfile(prefs);
  if (!profileIsComplete(p)) return 2200;
  const w = p.weightKg;
  const h = p.heightCm;
  const a = p.age;
  const bmr =
    p.sex === "male" ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161;
  let tdee = bmr * 1.375; /* light home activity */
  if (p.bodyGoal === "lose") tdee *= 0.85;
  if (p.bodyGoal === "gain") tdee *= 1.1;
  return Math.max(1400, Math.min(3500, Math.round(tdee / 50) * 50));
}

/**
 * Soft months-to-target for a program (afrobeat ≈ 3 mo for 7 kg). Not medical advice.
 * Optional `sessionBurnKcal` (planned complex) shortens ETA when daily training adds deficit.
 * @param {SportProfile} prefs
 * @param {string} programId
 * @param {{ sessionBurnKcal?: number, sessionsPerWeek?: number }} [opts]
 * @returns {number|null} months (1 decimal) or null when N/A
 */
export function estimateMonthsToWeightGoal(prefs, programId, opts = {}) {
  const p = normalizeSportProfile(prefs);
  if (!profileIsComplete(p) || p.bodyGoal === "maintain") return null;
  if (p.weightKg == null || p.targetWeightKg == null) return null;
  const delta = Math.abs(p.weightKg - p.targetWeightKg);
  if (delta < 1) return 0;
  if (p.bodyGoal === "lose" && p.targetWeightKg >= p.weightKg) return null;
  if (p.bodyGoal === "gain" && p.targetWeightKg <= p.weightKg) return null;

  const pace = PROGRAM_PACE[programId] || 0.7;
  const maint = estimateMaintenanceKcalFromProfile(p) || 1850;
  const goalKcal = estimateDailyKcalFromProfile(p);
  const dailyDelta = Math.max(80, Math.abs(maint - goalKcal));
  const sessionBurn = Number(opts?.sessionBurnKcal);
  const perWeek = Math.max(1, Math.min(7, Number(opts?.sessionsPerWeek) || 5));
  /* Spread planned session burn across the week so longer/harder complexes shorten calendar ETA. */
  const sessionDaily =
    Number.isFinite(sessionBurn) && sessionBurn > 0 ? (sessionBurn * perWeek) / 7 : 0;
  const effectiveDelta = Math.max(80, dailyDelta + sessionDaily);
  /* Narrative anchor: 7 kg @ afrobeat ≈ REF_MONTHS_PER_7KG; scale by Δkg, pace, deficit. */
  const months =
    (delta / TARGET_WEIGHT_DEFAULT_DELTA_KG) * (REF_MONTHS_PER_7KG / pace) * (300 / effectiveDelta);
  return Math.max(0.5, Math.min(24, Math.round(months * 10) / 10));
}

/** UA short ETA line, e.g. "≈ 3 міс · орієнтир" */
export function formatMonthsToGoalUa(months) {
  if (months == null || !Number.isFinite(months)) return "";
  if (months <= 0) return "≈ вже біля цілі";
  const n = months < 1 ? 1 : months % 1 === 0 ? String(Math.round(months)) : months.toFixed(1).replace(".", ",");
  return `≈ ${n} міс · орієнтир`;
}

export function profileSummaryLine(prefs) {
  const p = normalizeSportProfile(prefs);
  if (!profileIsComplete(p)) return "";
  const bits = [sexLabel(p.sex), `${p.age} р.`, bodyGoalLabel(p.bodyGoal)];
  return bits.filter(Boolean).join(" · ");
}

/**
 * Profile for compose/resolve: prefer intent constraints (server-safe), else LS.
 * @param {object} [intent]
 */
export function profileFromIntentOrStorage(intent) {
  const c = intent?.constraints || {};
  if (
    (c.sex === "female" || c.sex === "male") &&
    c.bodyGoal &&
    c.age != null &&
    c.heightCm != null &&
    c.weightKg != null
  ) {
    return normalizeSportProfile({
      sex: c.sex,
      age: c.age,
      heightCm: c.heightCm,
      weightKg: c.weightKg,
      targetWeightKg: c.targetWeightKg,
      bodyGoal: c.bodyGoal,
      completedAt: c.profileAt || new Date().toISOString(),
    });
  }
  return loadSportProfile();
}

/**
 * MealMap training goal: when profile complete, bodyGoal wins (reuse strength|cardio|mobility).
 * @param {string} [programGoal]
 * @param {SportProfile|null|undefined} profile
 */
export function resolveMealTrainingGoal(programGoal, profile) {
  const p = normalizeSportProfile(profile);
  if (profileIsComplete(p) && BODY_GOAL_TO_TRAINING[p.bodyGoal]) {
    return BODY_GOAL_TO_TRAINING[p.bodyGoal];
  }
  return programGoal || "mobility";
}

/** True when plates follow bodyGoal map that differs from selected program.goal. */
export function mealGoalDiffersFromProgram(programGoal, profile) {
  const p = normalizeSportProfile(profile);
  if (!profileIsComplete(p)) return false;
  const meal = resolveMealTrainingGoal(programGoal, p);
  return Boolean(programGoal && meal !== programGoal);
}
