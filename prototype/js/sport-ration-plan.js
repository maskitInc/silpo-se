/**
 * Sport × Express ration plan helpers (Epic 0/1).
 * Pure — no DOM. Schemas: life-apps/research/22-sport-express-sync-contract.md
 */

import { loadSportProfile } from "./sport-profile.js";
import { resolveGoalMealMap } from "./composer.js";

/**
 * @typedef {{
 *   programId: string,
 *   goal: string,
 *   level: string,
 *   dayISO: string,
 *   queries: Array<{ role?: string, q: string, staple?: string, group?: string }>,
 *   source: "kb" | "survey_v0" | "partner_fixture",
 *   partnerId: null | string
 * }} SportRationPlan
 */

/**
 * @typedef {{
 *   from: "sport_day" | "receipt_merge" | "base" | "browse" | "composer",
 *   programId?: string,
 *   rationRole?: string
 * }} ExpressLineProvenance
 */

/**
 * @param {object} [opts]
 * @returns {SportRationPlan}
 */
export function emptySportRationPlan(opts = {}) {
  return {
    programId: String(opts.programId || ""),
    goal: String(opts.goal || ""),
    level: String(opts.level || "beginner"),
    dayISO: String(opts.dayISO || ""),
    queries: Array.isArray(opts.queries) ? opts.queries : [],
    source:
      opts.source === "survey_v0"
        ? "survey_v0"
        : opts.source === "partner_fixture"
          ? "partner_fixture"
          : "kb",
    partnerId: opts.partnerId ?? null,
  };
}

/**
 * Tag an extraQueries row with Sport day provenance.
 * @param {object} extra
 * @param {{ programId?: string, role?: string, staple?: string }} sportRation
 */
export function withSportDayProvenance(extra, sportRation = {}) {
  const programId = String(sportRation.programId || "").trim();
  const rationRole = String(sportRation.role || "").trim();
  /** @type {ExpressLineProvenance} */
  const provenance = {
    from: "sport_day",
    ...(programId ? { programId } : {}),
    ...(rationRole ? { rationRole } : {}),
  };
  return {
    ...extra,
    ...provenance,
    why: programId
      ? `з програми · ${String(extra.groupTitle || extra.group || "полиця")}`
      : String(extra.why || "з програми"),
  };
}

/** Count extras that came from Sport day handoff. */
export function countSportDayExtras(extraQueries = []) {
  return (extraQueries || []).filter((q) => q?.from === "sport_day").length;
}

/**
 * Flatten unique lowercased mealMap staples for a program.
 * When sport profile is complete, staples follow bodyGoal→training map (not always program.goal).
 * @param {object|null|undefined} kb
 * @param {string} [programId]
 * @param {{ profile?: object|null }} [opts]
 * @returns {string[]}
 */
export function mealMapStaples(kb, programId, opts = {}) {
  const programs = kb?.programs || [];
  const program = programs.find((p) => p.id === programId) || programs[0];
  const profile = opts.profile ?? loadSportProfile();
  const map = resolveGoalMealMap(kb, program?.goal, profile, { cookMode: opts.cookMode });
  if (!map || typeof map !== "object") return [];
  const out = [];
  for (const [key, raw] of Object.entries(map)) {
    if (key === "course" || key === "byBodyGoal" || key === "byCookMode") continue;
    if (typeof raw === "string") {
      const s = String(raw || "")
        .trim()
        .toLowerCase();
      if (s) out.push(s);
      continue;
    }
    if (raw && typeof raw === "object" && Array.isArray(raw.staples)) {
      for (const x of raw.staples) {
        const s = String(x || "")
          .trim()
          .toLowerCase();
        if (s) out.push(s);
      }
    }
  }
  return [...new Set(out)];
}

/** Substring match staple|wanted|name against mealMap staples (same policy as pulse rationHits). */
export function lineMatchesStapleAllowlist(line, staples = []) {
  const list = (staples || []).map((s) => String(s || "").trim().toLowerCase()).filter(Boolean);
  if (!list.length) return false;
  const hay = `${line?.staple || ""} ${line?.wanted || ""} ${line?.name || ""}`.toLowerCase();
  if (!hay.trim()) return false;
  return list.some((s) => hay.includes(s));
}

/**
 * Shop header copy when guest arrived from Sport day.
 * @param {{ title?: string, programId?: string, sportExtraCount?: number, pantryOverlap?: number }} handoff
 */
export function sportHandoffCalloutCopy(handoff = {}) {
  const title = String(handoff.title || "").trim() || "програми";
  const n = Number(handoff.sportExtraCount) || 0;
  const overlap = Number(handoff.pantryOverlap) || 0;
  if (n > 0) {
    return {
      lead: "З програми",
      copy:
        overlap > 0
          ? `${title} · ${n} у чеклисті · під програму · перевір вдома`
          : `${title} · ${n} у чеклисті · уточни qty / перевір`,
      tip:
        overlap > 0
          ? "Рядки з дня Sport. «Перевірте» нижче — під staples програми · орієнтир з чеків, не інвентар."
          : "Рядки з дня Sport. Не інвентар холодильника — лише кошик під програму.",
    };
  }
  return {
    lead: "З програми",
    copy: `${title} · додай страви або шукай заміну`,
    tip: "Перехід з СільпоSport. Чеклист ще порожній від раціону.",
  };
}

/**
 * Meals that can be one-tap added (found/replaced, not already in Express checklist).
 * @param {object[]} meals
 * @param {(line: object) => { inChecklist: boolean }} membershipFn
 */
export function mealsAddableToExpress(meals, membershipFn) {
  return (meals || []).filter((line) => {
    const ok = line?.status === "found" || line?.status === "replaced";
    if (!ok) return false;
    const mem = membershipFn(line);
    return !mem?.inChecklist;
  });
}
