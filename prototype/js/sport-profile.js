/**
 * Sport body profile (v0) — sex / age / height / weight / body goal.
 * Separate from taste survey (sport-survey.js). Not medical advice.
 * Sex feeds soft kcal target (Mifflin-St Jeor × activity) + program ranking;
 * female CDN exercise art is still unavailable (exercise-art-map.js).
 */

export const SPORT_PROFILE_KEY = "silpo.sport.profileV0.v1";

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

/** @param {Partial<SportProfile>|null|undefined} raw */
export function normalizeSportProfile(raw) {
  const base = emptySportProfile();
  if (!raw || typeof raw !== "object") return base;
  const sex = raw.sex === "female" || raw.sex === "male" ? raw.sex : "";
  const bodyGoal =
    raw.bodyGoal === "lose" || raw.bodyGoal === "gain" || raw.bodyGoal === "maintain" ? raw.bodyGoal : "";
  return {
    version: "profile_v0",
    sex,
    age: numOrNull(raw.age, 14, 90),
    heightCm: numOrNull(raw.heightCm, 120, 230),
    weightKg: numOrNull(raw.weightKg, 35, 200),
    bodyGoal,
    completedAt: typeof raw.completedAt === "string" ? raw.completedAt : null,
  };
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
