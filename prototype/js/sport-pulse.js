/** Home SilpoSport pulse — honest metrics only (no fake workout streaks). */

import { buildMonthWeekChartSeries, currentMonthKey, sparkSharedYMax, weekStartISO } from "./spend.js";
import { loadSessionEvents, sessionDayIsos, sessionDaysInMonth, sessionMonthStats, dayKeyKyiv, shiftDayKey } from "./session-player.js";
import { mealMapStaples } from "./sport-ration-plan.js";

const SPORT_DAYS_KEY = "silpo.sport.dayConfirms.v1";
const PROGRAM_CHOSEN_KEY = "silpo.sport.programChosen.v1";
const RATION_COVERAGE_KEY = "silpo.sport.rationCoverage.v1";

function monthKeyFromAt(at) {
  if (!at) return "";
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function loadSportDayConfirms(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(SPORT_DAYS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x) => typeof x === "string" && /^\d{4}-\d{2}-\d{2}/.test(x)) : [];
  } catch {
    return [];
  }
}

/** Persist ISO date when user confirms Sport day (legacy; prefer session events). */
export function noteSportDayConfirm(at = new Date(), storage = globalThis.localStorage) {
  const d = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(d.getTime())) return loadSportDayConfirms(storage);
  const day = dayKeyKyiv(d);
  if (!day) return loadSportDayConfirms(storage);
  const prev = loadSportDayConfirms(storage);
  if (prev.includes(day)) return prev;
  const next = [...prev, day].slice(-120);
  try {
    storage?.setItem?.(SPORT_DAYS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function loadSportRationCoverage(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(RATION_COVERAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list.filter((e) => e && typeof e.day === "string" && /^\d{4}-\d{2}-\d{2}/.test(e.day));
  } catch {
    return [];
  }
}

/**
 * Soft ration: meal role/staple added to Express for sport day (buy later still counts).
 * @returns {object[]}
 */
export function noteSportRationCoverage(
  { role = "", staple = "", productId = "", at = new Date() } = {},
  storage = globalThis.localStorage,
) {
  const d = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(d.getTime())) return loadSportRationCoverage(storage);
  const day = dayKeyKyiv(d);
  if (!day) return loadSportRationCoverage(storage);
  const key = String(role || staple || productId || "").trim().toLowerCase();
  if (!key) return loadSportRationCoverage(storage);
  const prev = loadSportRationCoverage(storage);
  const same = prev.find(
    (e) =>
      e.day === day &&
      (String(e.role || "").toLowerCase() === key ||
        String(e.staple || "").toLowerCase() === key ||
        (productId && String(e.productId || "") === String(productId))),
  );
  if (same) return prev;
  const next = [
    ...prev,
    {
      day,
      role: String(role || "").slice(0, 48),
      staple: String(staple || "").slice(0, 80),
      productId: productId ? String(productId) : "",
      at: d.toISOString(),
    },
  ].slice(-200);
  try {
    storage?.setItem?.(RATION_COVERAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/** Unique covered meal roles (or days) in month from Express soft coverage. */
export function rationCoverageHitsInMonth(monthKey, storage = globalThis.localStorage) {
  const mk = String(monthKey || "");
  const keys = new Set();
  for (const e of loadSportRationCoverage(storage)) {
    if (!e.day?.startsWith(mk)) continue;
    keys.add(`${e.day}:${String(e.role || e.staple || e.productId || "").toLowerCase()}`);
  }
  return keys.size;
}

/** Program identity: pick once; change via day header «змінити програму» → wheel. */
export function hasChosenSportProgram(storage = globalThis.localStorage) {
  try {
    return storage?.getItem?.(PROGRAM_CHOSEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function noteSportProgramChosen(storage = globalThis.localStorage) {
  try {
    storage?.setItem?.(PROGRAM_CHOSEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

/**
 * Home strip CTA — never expose wheel UI jargon.
 * @returns {{ go: "day" | "sport", label: string }}
 */
export function sportHomeStripCta(model, storage = globalThis.localStorage) {
  const owned = hasChosenSportProgram(storage) || model?.mode === "ritual" || model?.mode === "visits";
  if (owned) return { go: "day", label: "день і полиця" };
  return { go: "sport", label: "обрати програму" };
}

export function sportDaysInMonth(monthKey, storage = globalThis.localStorage) {
  const fromSession = sessionDaysInMonth(monthKey, storage);
  if (fromSession > 0) return fromSession;
  return loadSportDayConfirms(storage).filter((iso) => iso.startsWith(String(monthKey))).length;
}

/** Activity days for charts: session events ∪ legacy confirms. */
function sportActivityDaySet(storage = globalThis.localStorage) {
  return new Set([...sessionDayIsos(storage), ...loadSportDayConfirms(storage)]);
}

/** Max week kcal from receipts — stable Sport food Y across months. */
export function historyWeekKcalMax(receipts) {
  const list = Array.isArray(receipts) ? receipts : [];
  const byWeek = new Map();
  for (const r of list) {
    const ws = weekStartISO(r.at);
    if (!ws) continue;
    let sum = byWeek.get(ws) || 0;
    for (const line of r.lines || []) sum += estimateLineKcal(line);
    byWeek.set(ws, sum);
  }
  let max = 0;
  for (const v of byWeek.values()) {
    if (v > max) max = v;
  }
  return Math.round(max);
}

/** Max week session count from activity days — stable Sport blue Y. */
export function historyWeekSessionsMax(storage = globalThis.localStorage) {
  const byWeek = new Map();
  for (const iso of sportActivityDaySet(storage)) {
    const ws = weekStartISO(`${iso}T12:00:00.000Z`);
    if (!ws) continue;
    byWeek.set(ws, (byWeek.get(ws) || 0) + 1);
  }
  let max = 0;
  for (const v of byWeek.values()) {
    if (v > max) max = v;
  }
  return max;
}

/**
 * Dual Y domains for Sport strip (kcal vs sessions stay independent).
 * Session floor uses sessionGoal so sparse activity doesn't crown the chart.
 * @param {Array<{ kcal?: number, sessions?: number }>} seriesStrip
 */
export function sportSparkSharedYMaxes(seriesStrip, opts = {}) {
  const rows = Array.isArray(seriesStrip) ? seriesStrip : [];
  const kcalMax = sparkSharedYMax(
    rows.map((r) => ({ uah: Number(r?.kcal) || 0 })),
    {
      historyMax: Number(opts.historyKcalMax) || 0,
      weekPace: Number(opts.weekPace) || 0,
      floor: 1,
    },
  );
  const goalFloor = Math.max(1, Number(opts.sessionGoal) || 0);
  const sessMax = sparkSharedYMax(
    rows.map((r) => ({ uah: Number(r?.sessions) || 0 })),
    {
      historyMax: Math.max(Number(opts.historySessionsMax) || 0, goalFloor),
      weekPace: 0,
      floor: goalFloor,
    },
  );
  return { kcal: kcalMax, sessions: Math.max(goalFloor, sessMax) };
}

export function visitsInMonth(receipts, monthKey) {
  const list = Array.isArray(receipts) ? receipts : [];
  return list.filter((r) => monthKeyFromAt(r.at) === monthKey).length;
}

/** Week buckets as { weekStart, uah: receiptCount } for soft ribbon (reuse Money geom). */
export function visitWeekSeriesFromPulse(series) {
  return (Array.isArray(series) ? series : []).map((s) => ({
    weekStart: s.weekStart,
    uah: Number(s.receiptCount) || 0,
  }));
}

/** Count receipt lines whose name contains a mealMap staple (proxy «раціон»). */
export function rationHitsInMonth(receipts, monthKey, staples) {
  if (!staples?.length) return 0;
  const list = Array.isArray(receipts) ? receipts : [];
  let hits = 0;
  for (const r of list) {
    if (monthKeyFromAt(r.at) !== monthKey) continue;
    for (const line of r.lines || []) {
      const name = String(line.name || "").toLowerCase();
      if (!name) continue;
      if (staples.some((s) => name.includes(s))) hits += 1;
    }
  }
  return hits;
}

/**
 * @returns {{
 *   monthKey: string,
 *   programTitle: string,
 *   levelUa: string,
 *   heroValue: number,
 *   heroUnit: string,
 *   insight: string,
 *   mode: 'ritual'|'visits'|'plates',
 *   rationHits: number
 * }}
 */
function uaDaysRitual(n) {
  const num = Number(n) || 0;
  const mod10 = num % 10;
  const mod100 = num % 100;
  if (mod100 >= 11 && mod100 <= 14) return "днів з ритуалом";
  if (mod10 === 1) return "день з ритуалом";
  if (mod10 >= 2 && mod10 <= 4) return "дні з ритуалом";
  return "днів з ритуалом";
}

/** Exported for V1 demo hero parity (board-6 editorial lock). */
export function sportRitualHeroUnit(n) {
  return uaDaysRitual(n);
}

function uaVisits(n) {
  const num = Number(n) || 0;
  const mod10 = num % 10;
  const mod100 = num % 100;
  if (mod100 >= 11 && mod100 <= 14) return "візитів у Сільпо";
  if (mod10 === 1) return "візит у Сільпо";
  if (mod10 >= 2 && mod10 <= 4) return "візити у Сільпо";
  return "візитів у Сільпо";
}

export function sportHomePulseModel({ receipts, kb, intentSport, monthKey, levelUa, storage = globalThis.localStorage }) {
  const mk = monthKey || "";
  const programId = intentSport?.constraints?.programId || "military";
  const programs = kb?.programs || [];
  const program = programs.find((p) => p.id === programId) || programs[0];
  const programTitle = program?.title || "Програма";
  const level = levelUa || "початковий";
  const sess = sessionMonthStats(mk, storage);
  const ritualDays = sess.days > 0 ? sess.days : sportDaysInMonth(mk, storage);
  const sessionScore = sess.score > 0 ? sess.score : ritualDays;
  const visits = visitsInMonth(receipts, mk);
  const staples = mealMapStaples(kb, programId);
  const softRation = rationCoverageHitsInMonth(mk, storage);
  const hardRation = rationHitsInMonth(receipts, mk, staples);
  const rationHits = softRation > 0 ? softRation : hardRation;
  const rationNote =
    rationHits > 0
      ? softRation > 0
        ? ` · раціон Express ×${softRation}`
        : ` · раціон-позиції ×${rationHits}`
      : "";

  if (ritualDays > 0) {
    const sessNote =
      sess.fullDays || sess.partialDays
        ? ` · повні ${sess.fullDays} · часткові ${sess.partialDays}`
        : "";
    return {
      monthKey: mk,
      programTitle,
      levelUa: level,
      heroValue: ritualDays,
      heroUnit: uaDaysRitual(ritualDays),
      insight: `сесія цього дня${sessNote}${rationNote}`,
      mode: "ritual",
      ritualDays,
      sessionScore,
      fullDays: sess.fullDays,
      partialDays: sess.partialDays,
      visits,
      rationHits,
    };
  }
  if (visits > 0) {
    return {
      monthKey: mk,
      programTitle,
      levelUa: level,
      heroValue: visits,
      heroUnit: uaVisits(visits),
      insight: `візити цього місяця${rationNote}`,
      mode: "visits",
      ritualDays,
      sessionScore,
      fullDays: sess.fullDays,
      partialDays: sess.partialDays,
      visits,
      rationHits,
    };
  }
  return {
    monthKey: mk,
    programTitle,
    levelUa: level,
    heroValue: 3,
    heroUnit: "страв на день",
    insight: "обери програму раз — далі лише день",
    mode: "plates",
    ritualDays: 0,
    sessionScore: 0,
    fullDays: 0,
    partialDays: 0,
    visits: 0,
    rationHits: 0,
  };
}

/**
 * Barbell metaphor — design lock board-6 V1 (lifted) + V3 (floor).
 * Lift-off only when activity (ritual days) ∧ fuel (ration hits) — no fake kg.
 * Metrics sit UNDER plates (візити / раціон), not inside discs.
 */
export function sportBarbellModel({ ritualDays = 0, visits = 0, rationHits = 0, mode = "plates" } = {}) {
  const activity = Number(ritualDays) || 0;
  const fuel = Number(rationHits) || 0;
  const visitN = Number(visits) || 0;
  const lifted = activity >= 1 && fuel >= 1;
  const empty = mode === "plates" && activity === 0 && visitN === 0;
  let floorCaption = "";
  if (!lifted) {
    if (empty) floorCaption = "штанга на підлозі · зроби день";
    else if (activity < 1) floorCaption = "запусти сесію · підніми штангу";
    else if (fuel < 1) floorCaption = "додай раціон у Express · підніми штангу";
    else floorCaption = "сесія + раціон · підніми штангу";
  }
  const weekCaption = lifted ? "| цей тиждень · сесія + полиця |" : "";
  const ariaParts = [
    lifted ? "штанга піднята" : "штанга на підлозі",
    `візити ${visitN}`,
    `раціон ${fuel}`,
  ];
  return {
    lifted,
    empty,
    left: { label: "візити", value: visitN },
    right: { label: "раціон", value: fuel },
    floorCaption,
    weekCaption,
    ariaLabel: ariaParts.join(" · "),
  };
}

/**
 * Live shaft = honest week graph between plates (activity weeks preferred, else visits).
 * Fallback soft sine only when series empty — not fake kg.
 */
export function sportShaftWaveSvg({
  lifted = false,
  empty = false,
  series = null,
  ritualDays = 0,
  rationHits = 0,
} = {}) {
  if (empty) return "";
  const w = 320;
  const h = 72;
  const list = Array.isArray(series) ? series : [];
  const vals = list.map((s) => Number(s.uah) || 0);
  const hasData = vals.length >= 2 && vals.some((v) => v > 0);
  let coords = [];
  if (hasData) {
    const max = Math.max(...vals, 1);
    const padY = 10;
    const usable = h - padY * 2;
    const scale = lifted ? 1 : 0.72;
    coords = vals.map((v, i) => ({
      x: (i / Math.max(1, vals.length - 1)) * w,
      y: h - padY - (v / max) * usable * scale,
    }));
  } else {
    const energy = Math.min(1, (Number(ritualDays) || 0) / 4 + (Number(rationHits) || 0) / 8);
    const amp = lifted ? 10 + energy * 6 : 4 + energy * 2;
    const mid = h / 2;
    const n = 16;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      coords.push({
        x: t * w,
        y:
          mid +
          Math.sin(t * Math.PI * 2.1 + (lifted ? 0.2 : 1)) * amp +
          Math.sin(t * Math.PI * 4.8) * amp * 0.2,
      });
    }
  }
  let d = "";
  if (coords.length === 1) {
    d = `M${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  } else if (coords.length > 1) {
    d = `M${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i - 1] || coords[i];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
  }
  const last = coords[coords.length - 1] || { x: w, y: h / 2 };
  const first = coords[0] || { x: 0, y: h / 2 };
  const area = d
    ? `${d} L${last.x.toFixed(1)} ${h} L${first.x.toFixed(1)} ${h} Z`
    : "";
  const cls = `${lifted ? " is-lifted" : " is-floor"}${hasData ? " is-series" : " is-idle"}`;
  const dots = hasData
    ? coords
        .map(
          (c, i) =>
            `<circle class="home-pulse__barbell-shaft-dot" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${i === coords.length - 1 ? 3.2 : 2.2}" />`,
        )
        .join("")
    : "";
  const fillId = `sportShaftFill-${hasData ? "s" : "i"}-${lifted ? "l" : "f"}`;
  return `<span class="home-pulse__barbell-shaft-wrap${cls}" aria-hidden="true">
    <svg class="home-pulse__barbell-shaft" viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="none">
      <defs>
        <linearGradient id="${fillId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="oklch(0.62 0.14 145)" stop-opacity="0.55" />
          <stop offset="100%" stop-color="oklch(0.62 0.14 145)" stop-opacity="0" />
        </linearGradient>
      </defs>
      ${area ? `<path class="home-pulse__barbell-shaft-area" d="${area}" fill="url(#${fillId})" />` : ""}
      <path class="home-pulse__barbell-shaft-glow" d="${d}" fill="none" pathLength="1" />
      <path class="home-pulse__barbell-shaft-line" d="${d}" fill="none" pathLength="1" />
      ${dots}
    </svg>
  </span>`;
}

/**
 * Full-width barbell: WebGL host (Three.js) + photo/SVG fallback until GL mounts.
 */
export function sportBarbellMarkup(opts) {
  const lifted = Boolean(opts.lifted);
  const empty = Boolean(opts.empty);
  const left = opts.left || { label: "візити", value: 0 };
  const right = opts.right || { label: "раціон", value: 0 };
  const ritualDays = Number(opts.ritualDays) || 0;
  const rationHits = Number(opts.rationHits) || Number(right.value) || 0;
  const series = opts.series || null;
  const aria = String(opts.ariaLabel || (lifted ? "штанга піднята" : "штанга на підлозі"));
  const photo = empty ? "./content/barbell/v3-hero.png" : "./content/barbell/v1-hero.png";

  const xmlEsc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const metric = (side) => {
    const val = Number(side.value) || 0;
    const label = xmlEsc(side.label || "");
    if (empty || val <= 0) {
      if (!empty && label) {
        return `<span class="home-pulse__barbell-metric is-dash">
      <span class="home-pulse__barbell-metric-label">${label}</span>
      <span class="home-pulse__barbell-metric-dash">—</span>
    </span>`;
      }
      return `<span class="home-pulse__barbell-metric is-dash" data-side="${label || "empty"}"><span class="home-pulse__barbell-metric-dash">—</span></span>`;
    }
    return `<span class="home-pulse__barbell-metric">
      <span class="home-pulse__barbell-metric-arrow">↑</span>
      <span class="home-pulse__barbell-metric-label">${label}</span>
      <span class="home-pulse__barbell-metric-num" data-barbell-count="${val}">${val}</span>
    </span>`;
  };

  const shaft = sportShaftWaveSvg({
    lifted,
    empty,
    series,
    ritualDays,
    rationHits,
  });
  const seriesJson = xmlEsc(JSON.stringify(Array.isArray(series) ? series : []));

  return `<span class="home-pulse__barbell-stage${lifted ? " is-lifted" : " is-floor"}${empty ? " is-empty" : ""} is-bleed" role="img" aria-label="${xmlEsc(aria)}" data-barbell-lifted="${lifted ? "1" : "0"}" data-barbell-empty="${empty ? "1" : "0"}" data-barbell-ritual="${ritualDays}" data-barbell-ration="${rationHits}" data-barbell-series="${seriesJson}">
    <span class="home-pulse__barbell-bleed" aria-hidden="true">
      <span class="home-pulse__barbell-rig">
        <canvas class="home-pulse__barbell-gl" data-barbell-gl width="640" height="480" aria-hidden="true"></canvas>
        <img class="home-pulse__barbell-photo" src="${photo}" alt="" width="100%" height="auto" decoding="async" />
        ${shaft}
      </span>
    </span>
    <span class="home-pulse__barbell-metrics" aria-hidden="true">
      ${metric(left)}
      ${metric(right)}
    </span>
  </span>`;
}

/** @deprecated alias — tests / callers expecting SVG string */
export function sportBarbellSvg(opts) {
  return sportBarbellMarkup(opts);
}

/** Soft monthly ritual target (not a hard streak quota). */
export const SPORT_SOFT_GOAL_DAYS = 8;
/** Soft monthly session goal on Express-parity Sport card (owner copy: «спорт заняття · 5»). */
export const SPORT_SESSION_GOAL = 5;
const SESSION_GOAL_KEY = "silpo.sport.sessionGoal.v1";
/** Soft daily kcal budget — over → orange spark day marks. */
export const SPORT_DAILY_KCAL_BUDGET = 2200;
/** Soft kcal per ₴ from receipt spend — ties Sport orange spark to Express weeks. */
export const KCAL_PER_UAH = 1.75;
/** Rough dish size for «страв з чеків» proxy. */
const KCAL_PER_DISH = 450;

/** Category density vs baseline food (prototype — not nutrition science). */
function lineFoodDensity(name) {
  const n = String(name || "").toLowerCase();
  if (/шоколад|чипс|печив|тістеч|морозив|кола|пиво|снек|цукер/.test(n)) return 1.25;
  if (/овоч|салат|огір|помідор|зелен|капуст|брокол|яблук|ягід/.test(n)) return 0.55;
  if (/курка|філе|індич|риба|лосос|яйц|творог|йогурт|індик/.test(n)) return 0.95;
  if (/хліб|батон|булк|паста|рис|греч|картоп/.test(n)) return 1.05;
  if (/сир|ковбас|бекон|масло|сметан/.test(n)) return 1.15;
  return 1;
}

export function loadSportSessionGoal(storage = globalThis.localStorage) {
  try {
    const n = Number(storage?.getItem?.(SESSION_GOAL_KEY));
    if (Number.isFinite(n) && n >= 1 && n <= 31) return Math.round(n);
  } catch {
    /* ignore */
  }
  return SPORT_SESSION_GOAL;
}

export function saveSportSessionGoal(n, storage = globalThis.localStorage) {
  const v = Math.max(1, Math.min(31, Math.round(Number(n) || SPORT_SESSION_GOAL)));
  try {
    storage?.setItem?.(SESSION_GOAL_KEY, String(v));
  } catch {
    /* ignore */
  }
  return v;
}

/**
 * Heuristic kcal from a receipt line (prototype — not nutrition science).
 * Prefer line `price` (₴) so Sport week kcal tracks Express spend shape.
 * Fallback: qty × category unit when price missing.
 */
export function estimateLineKcal(line) {
  const name = String(line?.name || "");
  const density = lineFoodDensity(name);
  const price = Number(line?.price);
  if (Number.isFinite(price) && price > 0) {
    return Math.max(1, Math.round(price * KCAL_PER_UAH * density));
  }
  const qty = Math.min(6, Math.max(0.25, Number(line?.qty) || Number(line?.quantity) || 1));
  let unit = 95;
  if (density === 1.25) unit = 220;
  else if (density === 0.55) unit = 28;
  else if (density === 0.95) unit = 110;
  else if (density === 1.05) unit = 140;
  else if (density === 1.15) unit = 180;
  return Math.round(unit * qty);
}

/** Month ration totals from Silpo receipts (kcal + cookable dishes proxy). */
export function sportRationMonthTotals(receipts, monthKey) {
  const mk = String(monthKey || "");
  let kcal = 0;
  let lines = 0;
  for (const r of Array.isArray(receipts) ? receipts : []) {
    if (monthKeyFromAt(r.at) !== mk) continue;
    for (const line of r.lines || []) {
      kcal += estimateLineKcal(line);
      lines += 1;
    }
  }
  const dishes = kcal > 0 ? Math.max(1, Math.round(kcal / KCAL_PER_DISH)) : 0;
  return { kcal, dishes, lines };
}

function dayKeyFromAt(at) {
  if (!at) return "";
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function lastDayOfMonthKey(monthKey) {
  const [y, m] = String(monthKey || "").split("-").map(Number);
  if (!y || !m) return null;
  return new Date(Date.UTC(y, m, 0));
}

function addUtcDays(date, n) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

/**
 * Last 7 days ending today (current month) or month-end (archive),
 * plus prior-day anchor (legacy helper — card chart uses week remesh).
 */
export function sportLast7DaysSeries({
  receipts,
  monthKey,
  storage = globalThis.localStorage,
  dailyBudget = SPORT_DAILY_KCAL_BUDGET,
} = {}) {
  const mk = String(monthKey || "");
  const allConfirms = sportActivityDaySet(storage);
  const confirms = new Set([...allConfirms].filter((iso) => iso.startsWith(mk)));
  const now = new Date();
  const curMk = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  let end = mk === curMk ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) : lastDayOfMonthKey(mk);
  if (!end || Number.isNaN(end.getTime())) end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (dayKeyFromAt(end).slice(0, 7) !== mk) {
    const forced = lastDayOfMonthKey(mk);
    if (forced) end = forced;
  }
  const priorDate = addUtcDays(end, -7);
  const priorDay = priorDate.toISOString().slice(0, 10);
  const kcalByDay = new Map();
  for (const r of Array.isArray(receipts) ? receipts : []) {
    const day = dayKeyFromAt(r.at);
    if (!day || (day !== priorDay && !day.startsWith(mk))) continue;
    let sum = kcalByDay.get(day) || 0;
    for (const line of r.lines || []) sum += estimateLineKcal(line);
    kcalByDay.set(day, sum);
  }
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = addUtcDays(end, -i);
    const day = d.toISOString().slice(0, 10);
    const inMonth = day.startsWith(mk);
    const sessions = inMonth && confirms.has(day) ? 1 : 0;
    const kcal = inMonth ? Number(kcalByDay.get(day) || 0) : 0;
    out.push({
      day,
      dayNum: d.getUTCDate(),
      sessions,
      kcal,
      over: kcal > dailyBudget,
      prior: false,
    });
  }
  const hasKcal = out.some((x) => x.kcal > 0);
  const hasSessions = out.some((x) => x.sessions > 0);
  if (!hasKcal && !hasSessions) {
    const seed = [...mk].reduce((a, c) => a + c.charCodeAt(0), 0) || 7;
    for (let i = 0; i < out.length; i++) {
      const sessions = (seed + i) % 3 === 0 ? 1 : 0;
      const kcal = 1450 + ((seed * (i + 3)) % 900) + (i % 2 === 0 ? 180 : 0);
      out[i] = { ...out[i], sessions, kcal, over: kcal > dailyBudget, demo: true };
    }
  }
  /* no sessionsDemo: real kcal without sessions stays honest (blue line empty) */

  let priorSessions = allConfirms.has(priorDay) ? 1 : 0;
  let priorKcal = Number(kcalByDay.get(priorDay) || 0);
  const demoish = out.some((d) => d.demo);
  if (demoish && !priorSessions && !(priorKcal > 0)) {
    priorSessions = 1;
    priorKcal = Math.max(900, Math.round((Number(out[0]?.kcal) || 1400) * 0.55));
  }
  out.unshift({
    day: priorDay,
    dayNum: priorDate.getUTCDate(),
    sessions: priorSessions,
    kcal: priorKcal,
    over: priorKcal > dailyBudget,
    prior: true,
    demo: demoish || undefined,
  });
  return out;
}

/**
 * Week buckets for Sport spark — reuses Express `buildMonthWeekChartSeries` mesh
 * so X-axis + prior week match spend; kcal = sum of price-based `estimateLineKcal`.
 * Session-only days may extend the mesh past last receipt via a zero-line stub.
 * @returns {Array<{ day: string, weekStart: string, dayNum: number, sessions: number, kcal: number, over: boolean, prior?: boolean, demo?: boolean }>}
 */
export function sportMonthWeekChartSeries({
  receipts,
  monthKey,
  storage = globalThis.localStorage,
  dailyBudget = SPORT_DAILY_KCAL_BUDGET,
} = {}) {
  const base = Array.isArray(receipts) ? receipts : [];
  const mk = String(monthKey || currentMonthKey());
  const confirms = [...sportActivityDaySet(storage)];
  const weekBudget = Math.max(1, Number(dailyBudget) || SPORT_DAILY_KCAL_BUDGET) * 7;

  /** Extend Express mesh when ritual days exist after last receipt. */
  let list = base;
  let lastSessionDay = 0;
  for (const iso of confirms) {
    if (!String(iso).startsWith(mk)) continue;
    const dayN = Number(String(iso).slice(8, 10));
    if (dayN > lastSessionDay) lastSessionDay = dayN;
  }
  if (lastSessionDay > 0) {
    const dayIso = `${mk}-${String(lastSessionDay).padStart(2, "0")}`;
    const covered = base.some((r) => dayKeyFromAt(r.at) === dayIso);
    if (!covered) {
      list = [...base, { at: `${dayIso}T12:00:00.000Z`, lines: [] }];
    }
  }

  const spendSeries = buildMonthWeekChartSeries(list, mk);
  if (!spendSeries.length) return [];

  const sessionsInWeek = (ws) => {
    let n = 0;
    for (const iso of confirms) {
      if (weekStartISO(`${iso}T12:00:00.000Z`) === ws) n += 1;
    }
    return n;
  };

  const kcalInWeek = (ws) => {
    let kcal = 0;
    for (const r of base) {
      if (weekStartISO(r.at) !== ws) continue;
      for (const line of r.lines || []) kcal += estimateLineKcal(line);
    }
    return Math.round(kcal);
  };

  const out = spendSeries.map((row) => {
    const ws = row.weekStart;
    const kcal = kcalInWeek(ws);
    const sessions = sessionsInWeek(ws);
    const d = new Date(`${ws}T12:00:00.000Z`);
    return {
      day: ws,
      weekStart: ws,
      dayNum: d.getUTCDate(),
      sessions,
      kcal,
      over: kcal > weekBudget,
      prior: Boolean(row.prior),
    };
  });

  /* Prior walk in Express stops on first spend; if sessions exist earlier, keep Express prior. */

  const live = out.filter((x) => !x.prior);
  const hasLiveKcal = live.some((x) => (Number(x.kcal) || 0) > 0);
  const hasAnySessions = out.some((x) => (Number(x.sessions) || 0) > 0);
  if (!hasLiveKcal && !hasAnySessions) {
    const seed = [...mk].reduce((a, c) => a + c.charCodeAt(0), 0) || 7;
    for (let i = 0; i < out.length; i++) {
      if (out[i].prior) {
        const kcal = Math.max(900, 1100 + (seed % 400));
        out[i] = {
          ...out[i],
          sessions: 1,
          kcal,
          over: kcal > weekBudget,
          demo: true,
        };
        continue;
      }
      const sessions = (seed + i) % 3 === 0 ? 1 : 0;
      const kcal = 2200 + ((seed * (i + 3)) % 2800) + (i % 2 === 0 ? 400 : 0);
      out[i] = { ...out[i], sessions, kcal, over: kcal > weekBudget, demo: true };
    }
  }
  /* no sessionsDemo when kcal-only — keep blue line empty until real sessions */
  return out;
}

/** Card metrics for Express-parity Sport pulse. */
export function sportExpressCardModel({
  receipts,
  monthKey,
  ritualDays = 0,
  sessionGoal = SPORT_SESSION_GOAL,
  dailyBudget = SPORT_DAILY_KCAL_BUDGET,
  storage = globalThis.localStorage,
} = {}) {
  const ritual = Math.max(0, Number(ritualDays) || 0);
  const goal = Math.max(1, Number(sessionGoal) || SPORT_SESSION_GOAL);
  const ration = sportRationMonthTotals(receipts, monthKey);
  const series = sportMonthWeekChartSeries({ receipts, monthKey, storage, dailyBudget });
  const live = series.filter((d) => !d.prior);
  const chartKcal = live.reduce((s, d) => s + (Number(d.kcal) || 0), 0);
  const demo = series.some((d) => d.demo);
  // Col1 mirrors Express «ціль» — soft session goal (owner: спорт заняття · 5)
  const stubDone = live.reduce((s, d) => s + (d.sessions > 0 && d.demo ? 1 : 0), 0);
  const sessionsDone = ritual > 0 ? ritual : stubDone > 0 ? Math.min(goal, stubDone) : 0;
  const left = Math.max(0, goal - sessionsDone);
  const overSessions = sessionsDone > goal;
  // Middle col = month ration (Express spent = month); chart = week mesh + prior month
  const kcal = ration.kcal > 0 ? ration.kcal : chartKcal;
  const dishes =
    kcal > 0 ? Math.max(1, Math.round(kcal / KCAL_PER_DISH)) : ration.dishes > 0 ? ration.dishes : 0;
  const weekBudget = dailyBudget * 7;
  const kcalHot = live.filter((d) => d.over).length >= 2 || (kcal > 0 && kcal > weekBudget * 2);
  return {
    sessions: goal,
    sessionsDone,
    sessionGoal: goal,
    leftSessions: left,
    overSessions,
    kcal,
    dishes,
    series,
    kcalHot,
    dailyBudget,
    demo,
  };
}

/**
 * Soft «від орієнтира» for Sport home card.
 * Progress = weighted session score (full day=1, partial=stepsDone/total); else visits.
 */
export function sportOrientirModel({
  ritualDays = 0,
  sessionScore = null,
  fullDays = 0,
  partialDays = 0,
  visits = 0,
  goalDays = SPORT_SOFT_GOAL_DAYS,
} = {}) {
  const goal = Math.max(1, Number(goalDays) || SPORT_SOFT_GOAL_DAYS);
  const ritual = Math.max(0, Number(ritualDays) || 0);
  const score = sessionScore != null ? Math.max(0, Number(sessionScore) || 0) : ritual;
  const visitN = Math.max(0, Number(visits) || 0);
  const progress = score > 0 ? score : visitN;
  const unit = score > 0 ? "ritual" : visitN > 0 ? "visits" : "empty";
  const pct = Math.round((progress / goal) * 100);
  const pctBar = Math.min(100, pct);
  const over = progress >= goal;
  const left = Math.max(0, goal - progress);
  return {
    goal,
    progress,
    pct,
    pctBar,
    over,
    left,
    unit,
    ritualDays: ritual,
    sessionScore: score,
    fullDays: Math.max(0, Number(fullDays) || 0),
    partialDays: Math.max(0, Number(partialDays) || 0),
    visits: visitN,
  };
}

/** Month keys for Sport ‹ › — receipts ∪ sessions ∪ legacy confirms ∪ current. */
export function sportMonthKeys(receipts, storage = globalThis.localStorage) {
  const set = new Set();
  for (const r of receipts || []) {
    const mk = monthKeyFromAt(r.at);
    if (mk) set.add(mk);
  }
  for (const iso of sportActivityDaySet(storage)) {
    if (iso && iso.length >= 7) set.add(iso.slice(0, 7));
  }
  const now = new Date();
  const cur = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  set.add(cur);
  return [...set].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
}

/**
 * 4-week (28-day) ritual strip ending at anchorDay (inclusive).
 * Honest: session from events; ration hits from coverage LS; no demo fill.
 */
export function sportFourWeekDayStrip({
  anchorDay,
  selectedDay,
  todayISO,
  storage = globalThis.localStorage,
} = {}) {
  const anchor = String(anchorDay || dayKeyKyiv(new Date()));
  const selected = String(selectedDay || anchor);
  const today = String(todayISO || dayKeyKyiv(new Date()));
  const events = loadSessionEvents(storage);
  const coverage = loadSportRationCoverage(storage);
  const evByDay = new Map(events.map((e) => [e.day, e]));
  const rationByDay = new Map();
  for (const e of coverage) {
    if (!e.day) continue;
    rationByDay.set(e.day, (rationByDay.get(e.day) || 0) + 1);
  }
  const out = [];
  for (let i = 27; i >= 0; i--) {
    const dayISO = shiftDayKey(anchor, -i);
    if (!dayISO) continue;
    const ev = evByDay.get(dayISO);
    out.push({
      dayISO,
      dayNum: Number(dayISO.slice(8, 10)),
      weekIdx: Math.floor((27 - i) / 7),
      sessionFull: Boolean(ev?.full),
      sessionPartial: Boolean(ev && !ev.full),
      rationHits: rationByDay.get(dayISO) || 0,
      isToday: dayISO === today,
      isFuture: dayISO > today,
      selected: dayISO === selected,
    });
  }
  return out;
}

/** Compact day-screen calendar HTML (Checkout-adjacent day chrome). */
export function dayCalendarStripHtml(days = [], { label = "ритм · 4 тижні" } = {}) {
  if (!days.length) return "";
  const weeks = [0, 1, 2, 3].map((w) => days.filter((d) => d.weekIdx === w));
  const weekRows = weeks
    .map(
      (week, wi) =>
        `<div class="day-calendar__week" role="row" aria-label="Тиждень ${wi + 1}"><span class="day-calendar__wk" aria-hidden="true">${wi + 1}</span>${week
          .map((d) => {
            const cls = [
              "day-calendar__dot",
              d.selected ? "day-calendar__dot--sel" : "",
              d.isToday ? "day-calendar__dot--today" : "",
              d.sessionFull ? "day-calendar__dot--session" : "",
              d.sessionPartial ? "day-calendar__dot--partial" : "",
              d.rationHits > 0 ? "day-calendar__dot--ration" : "",
              d.isFuture ? "day-calendar__dot--future" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const bits = [
              d.dayISO,
              d.sessionFull ? "сесія ✓" : d.sessionPartial ? "сесія частково" : "",
              d.rationHits > 0 ? `раціон · ${d.rationHits}` : "",
            ].filter(Boolean);
            const title = bits.join(" · ");
            const disabled = d.isFuture ? " disabled" : "";
            return `<button type="button" class="${cls}" data-day-iso="${d.dayISO}" aria-label="${title}" aria-pressed="${d.selected ? "true" : "false"}" title="${title}"${disabled}><span class="day-calendar__num">${d.dayNum}</span></button>`;
          })
          .join("")}</div>`,
    )
    .join("");
  return `<section class="day-calendar" aria-label="${label}"><p class="day-calendar__lead muted">${label}</p><div class="day-calendar__grid">${weekRows}</div></section>`;
}
