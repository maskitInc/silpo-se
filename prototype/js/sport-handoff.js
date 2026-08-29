/**
 * Sport × Express handoff domain (Epic 7 extract).
 * Pure helpers — no DOM. Schemas: research/22 · sport-ration-plan.js
 */

import { beaconForLine } from "./beacon.js";
import {
  countSportDayExtras,
  lineMatchesStapleAllowlist,
  mealsAddableToExpress,
  sportHandoffCalloutCopy,
} from "./sport-ration-plan.js";
import { mergeKbWithContentSource, resolveActiveContentSource } from "./content-source.js";
import {
  buildSportRationPlan,
  kindFromCookMode,
  loadSportSurvey,
  mealMapStaplesWithSurvey,
} from "./sport-survey.js";

/**
 * @typedef {{
 *   programId: string,
 *   title: string,
 *   dayISO: string,
 *   at: number
 * }} SportHandoffState
 */

/**
 * Build resolveVm extra payload + ration plan for Sport day screen.
 * @param {{
 *   kb: object,
 *   intentSport: object,
 *   confirmed?: boolean,
 *   dayISO: string,
 *   prefs?: object,
 *   loadContentSource?: typeof resolveActiveContentSource
 * }} ctx
 */
export function resolveSportDayExtra(ctx) {
  const prefs = ctx.prefs ?? loadSportSurvey();
  const loadCs = ctx.loadContentSource || resolveActiveContentSource;
  const { id: partnerId, pack } = loadCs();
  const kbMerged = mergeKbWithContentSource(ctx.kb, pack);
  const plan = buildSportRationPlan({
    kb: kbMerged,
    programId: ctx.intentSport?.constraints?.programId || "",
    level: ctx.intentSport?.constraints?.level || "beginner",
    dayISO: ctx.dayISO || "",
    prefs,
    partnerId,
    contentPack: pack,
  });
  const preferKind = kindFromCookMode(prefs.cookMode);
  return {
    plan,
    pack,
    resolveExtra: {
      confirmed: Boolean(ctx.confirmed),
      queriesOverride: plan.queries,
      ...(preferKind ? { preferKind } : {}),
    },
  };
}

/** True when partner LS changed during async day resolve — caller should re-render. */
export function partnerSnapDrift(partnerSnap, loadActiveId = () => resolveActiveContentSource().id) {
  return loadActiveId() !== partnerSnap;
}

/**
 * @param {{ programId?: string, kb?: object, intentSport?: object, dayISO: string, now?: number }}
 * @returns {SportHandoffState}
 */
export function createSportHandoff({ programId, kb, intentSport, dayISO, now = Date.now() }) {
  const pid = String(programId || intentSport?.constraints?.programId || "");
  const title =
    kb?.programs?.find((p) => p.id === pid)?.title ||
    intentSport?.constraints?.programTitle ||
    "програма";
  return {
    programId: pid,
    title: String(title),
    dayISO: String(dayISO || ""),
    at: Number(now) || Date.now(),
  };
}

/**
 * Live program label for Express «З програми» block — prefers sport_day extraQueries programId.
 * @param {{ kb?: object, sportHandoff?: object|null, intentSport?: object, extraQueries?: object[] }}
 */
export function resolveSportProgramDisplay({ kb, sportHandoff, intentSport, extraQueries = [] }) {
  const sportExtras = (extraQueries || []).filter((q) => q?.from === "sport_day");
  const pidCounts = new Map();
  for (const q of sportExtras) {
    const pid = String(q.programId || "").trim();
    if (pid) pidCounts.set(pid, (pidCounts.get(pid) || 0) + 1);
  }
  const topFromExtras = [...pidCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  const programId =
    topFromExtras ||
    String(sportHandoff?.programId || "").trim() ||
    String(intentSport?.constraints?.programId || "").trim();
  const title =
    kb?.programs?.find((p) => p.id === programId)?.title ||
    String(sportHandoff?.title || "").trim() ||
    String(intentSport?.constraints?.programTitle || "").trim() ||
    "програма";
  return { programId, title: String(title) };
}

/**
 * Shop pantry nudge opts when guest arrived from Sport handoff.
 * @param {{ sportHandoff: SportHandoffState|null, kb: object, prefs?: object }}
 */
export function pantryNudgeOptsForHandoff({ sportHandoff, kb, prefs }) {
  if (!sportHandoff) return {};
  const p = prefs ?? loadSportSurvey();
  const staples = mealMapStaplesWithSurvey(kb, sportHandoff.programId, p);
  if (!staples.length) return {};
  return { stapleAllowlist: staples, preferSport: true };
}

/**
 * Pantry beacon overlap count for handoff callout (Epic 3).
 */
export function handoffPantryOverlap({ vmLines = [], pantryNudge, pantryOpts = {}, receipts = [] }) {
  if (pantryNudge?.sportScoped) return Number(pantryNudge.count) || 0;
  const allow = pantryOpts.stapleAllowlist;
  if (!allow?.length) return 0;
  return (vmLines || []).filter((l) => {
    if (!lineMatchesStapleAllowlist(l, allow)) return false;
    const b = beaconForLine(l, receipts);
    return b && b.kind !== "none";
  }).length;
}

/**
 * Shop banner model when sport handoff active.
 */
export function shopHandoffBannerModel({
  sportHandoff,
  extraQueries = [],
  vmLines = [],
  pantryNudge,
  pantryOpts = {},
  receipts = [],
  loading = false,
  picker = null,
  browse = null,
}) {
  if (!sportHandoff || loading || picker || browse) return null;
  const sportExtraN = countSportDayExtras(extraQueries);
  const pantryOverlap = handoffPantryOverlap({ vmLines, pantryNudge, pantryOpts, receipts });
  return sportHandoffCalloutCopy({
    title: sportHandoff.title,
    programId: sportHandoff.programId,
    sportExtraCount: sportExtraN,
    pantryOverlap,
  });
}

/** Map day meal line → addExtraProduct pick shape. */
export function mealLineToExpressPick(line) {
  return {
    productId: line.sku?.productId,
    name: line.name || line.wanted,
    staple: line.wanted || line.staple || "",
    price: line.price,
    image: line.image || "",
    slug: line.sku?.slug,
    companyId: line.sku?.companyId,
    branchId: line.sku?.branchId,
    weighted: line.weighted,
    step: line.step,
    displayRatio: line.displayRatio,
  };
}

/** Provenance payload for addExtraProduct from day plate. */
export function sportRationPayloadFromMeal(line, programId) {
  return {
    role: line.role || line.wanted,
    staple: line.wanted || line.name,
    productId: line.sku?.productId || line.productId,
    programId,
  };
}

/** Coverage note payload when plate already in checklist. */
export function coveragePayloadFromMeal(line) {
  return {
    role: line.role || line.wanted,
    staple: line.wanted || line.name,
    productId: line.sku?.productId || line.productId,
  };
}

export function bulkAddToastCopy(n) {
  if (n === 1) return "1 позицію додано в Express";
  return `${n} позицій додано в Express`;
}

export function dayPlanSourceSuffix(source) {
  if (source === "partner_fixture") return " · інгредієнти";
  if (source === "survey_v0") return " · фільтр смаків";
  return "";
}

export { mealsAddableToExpress };
