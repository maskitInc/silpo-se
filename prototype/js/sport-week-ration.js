/**
 * Sport week ration helpers — 7-day course staples + Express/Silpo handoff.
 * Pure where possible. Not medical advice; ₴ ceiling ≠ kcal орієнтир.
 */

import { resolveGoalMealMap, weekdayIndexFromDayISO } from "./composer.js";
import { shiftDayKey } from "./session-player.js";
import { loadSportProfile, resolveMealTrainingGoal } from "./sport-profile.js";
import { buildSportRationPlan, loadSportSurvey } from "./sport-survey.js";
import { emptySportRationPlan } from "./sport-ration-plan.js";
import { tagPantryQuery } from "./pantry-staples.js";

export const WEEK_DAY_UA = ["пн", "вт", "ср", "чт", "пт", "сб", "нд"];

/** Clamp Express-style budget ₴. */
export function clampWeekBudgetUah(n) {
  const x = Math.round(Number(n) || 0);
  if (!Number.isFinite(x)) return 1500;
  return Math.max(300, Math.min(8000, Math.round(x / 50) * 50));
}

/**
 * Monday ISO of the calendar week containing dayISO (Mon–Sun).
 * @param {string} dayISO
 */
export function weekStartMondayISO(dayISO) {
  const idx = weekdayIndexFromDayISO(dayISO);
  return shiftDayKey(dayISO, -idx);
}

/**
 * 7 ISO dates Mon→Sun for the calendar week of anchorISO (course diversity / tests).
 * @param {string} [anchorISO]
 * @returns {string[]}
 */
export function calendarWeekDayISOs(anchorISO) {
  const start = weekStartMondayISO(anchorISO || "");
  if (!start) return [];
  return Array.from({ length: 7 }, (_, i) => shiftDayKey(start, i));
}

/**
 * Next 7 ISO dates starting at fromISO (today → +6). No past calendar days.
 * @param {string} [fromISO]
 * @returns {string[]}
 */
export function weekDayISOs(fromISO) {
  const m = String(fromISO || "").match(/^(\d{4}-\d{2}-\d{2})/);
  const start = m ? m[1] : "";
  if (!start) return [];
  return Array.from({ length: 7 }, (_, i) => shiftDayKey(start, i));
}

/** Stable signature of mealMap staples for a day (sorted joined). */
export function dayMealStapleSignature(kb, programGoal, profile, dayISO, cookMode) {
  const map = resolveGoalMealMap(kb, programGoal, profile, { dayISO, cookMode });
  const bits = [];
  for (const slot of ["breakfast", "lunch", "dinner"]) {
    const raw = map?.[slot];
    if (!raw) continue;
    if (typeof raw === "string") {
      bits.push(`${slot}:${raw.toLowerCase()}`);
      continue;
    }
    const staples = Array.isArray(raw.staples) ? raw.staples : [];
    bits.push(`${slot}:${staples.map((s) => String(s || "").toLowerCase()).sort().join("+")}`);
  }
  return bits.join("|");
}

/**
 * True when Mon…Sun course days produce ≥2 distinct staple signatures.
 * @param {object} kb
 * @param {string} programGoal
 * @param {object} [profile]
 * @param {string} [anchorISO]
 * @param {string} [cookMode]
 */
export function weekHasDistinctDayRations(kb, programGoal, profile, anchorISO, cookMode) {
  const days = calendarWeekDayISOs(anchorISO || "2026-08-24");
  const sigs = new Set(
    days.map((iso) => dayMealStapleSignature(kb, programGoal, profile, iso, cookMode)),
  );
  return sigs.size >= 2;
}

/**
 * Build deduped soft queries for week days (staples → Express extras).
 * @param {{ includeISOs?: string[] }} [opts]
 * @returns {{ queries: object[], dayCount: number, uniqueStaples: number }}
 */
export function buildWeekRationSoftQueries({
  kb,
  programId,
  level,
  anchorISO,
  prefs,
  profile = null,
  partnerId = null,
  contentPack = null,
  includeISOs = null,
} = {}) {
  const allDays = weekDayISOs(anchorISO);
  const allow = Array.isArray(includeISOs) && includeISOs.length ? new Set(includeISOs) : null;
  const days = allow ? allDays.filter((d) => allow.has(d)) : allDays;
  const profileResolved = profile ?? loadSportProfile();
  const survey = prefs ?? loadSportSurvey();
  const seen = new Set();
  const queries = [];
  for (const dayISO of days) {
    /* include pantry packs once for Express «перевір вдома» under week стеля */
    const plan = buildSportRationPlan({
      kb,
      programId,
      level,
      dayISO,
      prefs: { ...survey, pantryMode: "include" },
      profile: profileResolved,
      partnerId,
      contentPack,
    });
    for (const q of plan.queries || []) {
      const key = String(q.staple || q.q || "")
        .trim()
        .toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const tagged = tagPantryQuery({ ...q, dayISO, fromWeek: true });
      queries.push(tagged);
    }
  }
  return {
    queries,
    dayCount: days.length,
    uniqueStaples: seen.size,
    planStub: emptySportRationPlan({
      programId: String(programId || ""),
      goal: resolveMealTrainingGoal(
        (kb?.programs || []).find((p) => p.id === programId)?.goal,
        profileResolved,
      ),
      level: level || "beginner",
      dayISO: days[0] || "",
      queries,
      source: "kb",
    }),
  };
}

/** Animal / fish staples used to gate week protein variety (lose→cardio course). */
export const WEEK_PROTEIN_STAPLES = {
  chicken: ["курка", "готова курка з кулінарії"],
  fish: ["риба", "тунець", "лосось", "хек", "скумбрія", "готова риба з кулінарії"],
  meat: ["індичка", "яловичина", "свинина"],
};

/**
 * Soft gate: over N course days, lunch+dinner staples should hit chicken, fish, and other meat.
 * @param {object} mealMap raw training map with course[]
 * @returns {{ ok: boolean, chicken: boolean, fish: boolean, meat: boolean, hits: string[] }}
 */
export function weekCourseProteinVariety(mealMap) {
  const course = Array.isArray(mealMap?.course) ? mealMap.course : [];
  const hits = new Set();
  for (const day of course) {
    for (const slot of ["lunch", "dinner"]) {
      for (const raw of day?.[slot]?.staples || []) {
        const s = String(raw || "")
          .trim()
          .toLowerCase();
        if (!s) continue;
        hits.add(s);
      }
    }
  }
  const has = (keys) => keys.some((k) => hits.has(k));
  const chicken = has(WEEK_PROTEIN_STAPLES.chicken);
  const fish = has(WEEK_PROTEIN_STAPLES.fish);
  const meat = has(WEEK_PROTEIN_STAPLES.meat);
  return { ok: chicken && fish && meat, chicken, fish, meat, hits: [...hits] };
}

/** Breakfast staple → family id for week variety gate. */
export const BREAKFAST_FAMILIES = [
  { id: "oats", re: /вівсян/i },
  { id: "eggs", re: /яйц/i },
  { id: "yogurt", re: /йогурт|кефір|ряжанк/i },
  { id: "cottage", re: /творог/i },
  { id: "bread", re: /хліб|тост/i },
];

/**
 * Soft gate: cardio-style course breakfasts should rotate families (not oats×7).
 * @param {object} mealMap
 * @param {{ minFamilies?: number }} [opts]
 */
export function weekCourseBreakfastVariety(mealMap, opts = {}) {
  const minFamilies = opts.minFamilies ?? 3;
  const course = Array.isArray(mealMap?.course) ? mealMap.course : [];
  const families = new Set();
  const leads = [];
  for (const day of course) {
    const staples = Array.isArray(day?.breakfast?.staples) ? day.breakfast.staples : [];
    const lead = String(staples[0] || "")
      .trim()
      .toLowerCase();
    if (lead) leads.push(lead);
    const blob = staples.join(" ");
    for (const f of BREAKFAST_FAMILIES) {
      if (f.re.test(blob)) families.add(f.id);
    }
  }
  const uniqueLeads = new Set(leads);
  return {
    ok: families.size >= minFamilies && uniqueLeads.size >= Math.min(3, course.length || 0),
    families: [...families],
    uniqueLeads: [...uniqueLeads],
    minFamilies,
  };
}

/** Dry / pantry staples — fine once per week shop, weak as every-day thumb lead. */
const WEEK_THUMB_DEMOTE = new Set([
  "вівсянка",
  "молоко",
  "олія",
  "масло",
  "вода",
  "сіль",
  "цукор",
  "йогурт",
  "кефір",
  "рис",
  "гречка",
  "булгур",
  "кіноа",
]);

const WEEK_THUMB_PROTEIN = new Set([
  ...WEEK_PROTEIN_STAPLES.chicken,
  ...WEEK_PROTEIN_STAPLES.fish,
  ...WEEK_PROTEIN_STAPLES.meat,
  "яйця",
  "творог",
  "йогурт",
  "кефір",
  "сир",
]);

/**
 * Pick collapsed week thumbs: prefer day protein/grain photos; demote staples already
 * featured earlier in the week (and pantry leads) so rows do not share one oats box.
 * @param {Array<{ image?: string, name?: string, wanted?: string, staple?: string }>} meals
 * @param {{ demoteWanted?: Set<string>|string[], limit?: number }} [opts]
 * @returns {Array<{ image: string, name: string, wanted: string }>}
 */
export function pickCollapsedWeekThumbs(meals, opts = {}) {
  const limit = Math.max(1, Math.min(8, Number(opts.limit) || 4));
  const demote = new Set(
    [...(opts.demoteWanted || [])].map((s) =>
      String(s || "")
        .trim()
        .toLowerCase(),
    ),
  );
  const list = Array.isArray(meals) ? meals : [];
  const scored = list.map((m, i) => {
    const wanted = String(m?.wanted || m?.staple || "")
      .trim()
      .toLowerCase();
    const name = String(m?.name || m?.wanted || "").trim();
    const image = String(m?.image || "").trim();
    let score = list.length - i;
    if (image) score += 20;
    if (WEEK_THUMB_PROTEIN.has(wanted)) score += 40;
    if (WEEK_THUMB_DEMOTE.has(wanted)) score -= 25;
    if (wanted && demote.has(wanted)) score -= 50;
    return { image, name, wanted, score, i };
  });
  scored.sort((a, b) => b.score - a.score || a.i - b.i);
  const out = [];
  const used = new Set();
  for (const row of scored) {
    if (out.length >= limit) break;
    const key = row.wanted || row.name.toLowerCase();
    if (key && used.has(key)) continue;
    if (key) used.add(key);
    out.push({ image: row.image, name: row.name || row.wanted || "·", wanted: row.wanted });
  }
  return out;
}

/** Week accordion honesty: per-day ₴ ≠ week Express unique list + pantry under стеля. */
export function weekDayPlateUahHintCopy() {
  return "₴ на день — свіже на день · олія/крупи/йогурт-пак — у Express раз на тиждень під стелю · перевір вдома";
}

/** Copy for week ceiling strip — money ≠ kcal. Kept for docs/tests; UI no longer shows it. */
export function weekBudgetHonestyCopy() {
  return "стеля ₴ на тиждень · ккал-орієнтир — окремо в профілі · Express ≠ куплено";
}

/**
 * @param {string} dayISO
 * @param {string} selectedISO
 */
export function weekDayChipLabel(dayISO, selectedISO) {
  const idx = weekdayIndexFromDayISO(dayISO);
  const ua = WEEK_DAY_UA[idx] || "·";
  const num = String(dayISO || "").slice(8, 10);
  return { ua, num, selected: dayISO === selectedISO };
}
