import { beaconForLine, shopPantryNudge, pantryOutcomeCopy, skuVerifyBeacon } from "./beacon.js";
import { emptyIntent } from "./contracts.js";
import { $, prefersReduce, announce, withViewTransition } from "./dom.js";
import { destinationGroupForAdd, GROUPS, groupIconSvg, groupMeta, groupOfQuery, groupShortTitle, normalizeShopGroupId, slotsForGroup } from "./groups.js";
import { BROWSE_POPULAR_SLUG } from "./browse-constants.js";
import { browseHrefFromState, parseLocationHash, screenFromParsed, shopBaseHref, shopListsHref, shopReceiptHref } from "./hash.js";
import {
  baseFromChecklistLines,
  baseFromReceipt,
  baseToReceipt,
  deleteBase,
  getBase,
  loadBases,
  upsertBase,
} from "./bases.js";
import { expressMembershipForMeal } from "./express-membership.js";
import { amountLabelFromLine, amountLabelFromProduct, cartQuantity, packLabelFromName } from "./mcp/normalize.js";
import { mergeReceiptIntoShopVm } from "./merge.js";
import { runPipeline } from "./pipeline.js";
import { applyQtyDelta, applyQtyOverrides } from "./qty.js";
import { freqFromReceipts, ordersToReceipts, topLinesForThumbStrip } from "./receipts.js";
import {
  bumpHandoffMetric,
  emptyHandoffMetrics,
  handoffOutcomeCopy,
  loopGapModel,
} from "./sport-loop-metrics.js";
import {
  loadSportSurvey,
  saveSportSurvey,
  SURVEY_AVOID_CHIPS,
  SURVEY_COOK_MODES,
  SURVEY_DIET_TAGS,
  surveyIsComplete,
  surveySummaryLine,
  surveyTasteFilterCount,
  plateModeFromCookMode,
  cookModeFromPlateMode,
  emptySportSurvey,
  normalizeSurvey,
} from "./sport-survey.js";
import {
  BODY_GOALS,
  SEX_OPTIONS,
  bodyGoalLabel,
  emptySportProfile,
  estimateDailyKcalFromProfile,
  loadSportProfile,
  normalizeSportProfile,
  profileIsComplete,
  profileSummaryLine,
  programsForHome,
  rankProgramsForProfile,
  resolveMealTrainingGoal,
  saveSportProfile,
  sexLabel,
  suggestLevelFromProfile,
  trainingGoalLabel,
  TRAINING_GOAL_UA,
} from "./sport-profile.js";
import { countSportDayExtras, mealsAddableToExpress, withSportDayProvenance } from "./sport-ration-plan.js";
import {
  loadActiveContentSourceId,
  mergeKbWithContentSource,
  saveActiveContentSourceId,
} from "./content-source.js";
import {
  bulkAddToastCopy,
  coveragePayloadFromMeal,
  createSportHandoff,
  mealLineToExpressPick,
  pantryNudgeOptsForHandoff,
  partnerSnapDrift,
  resolveSportDayExtra,
  resolveSportProgramDisplay,
  shopHandoffBannerModel,
  sportRationPayloadFromMeal,
} from "./sport-handoff.js";
import { mealCookChipUa, normalizeMealCook, resolveGoalMealMap, sessionFor } from "./composer.js";
import { clampWalkSteps, loadWalkSteps, saveWalkSteps, WALK_STEP_PRESETS } from "./walk-prefs.js";
import { destroyWalkMap, mountWalkMap, refreshWalkMapSize } from "./walk-map-ui.js";
import {
  shopDockCtaHtml,
  shopAssistZoneHtml,
  shopAssistInlineHtml,
  shopProgressMetrics,
  shopProgressStripHtml,
  shopReceiptAsciiTexture,
  shopSplitBarTitle,
  shopSplitCaptionHtml,
  shopSplitMicroLegendParts,
  shopProgramBlockHtml,
  sportDayLineRoles,
} from "./shop-ui.js";
import { buildRecentBuyCandidates, shopMonthWhisper, shopRecentShelfHtml, shopWhisperWithHistoryHtml } from "./shop-recent.js";
import {
  buildMonthReportRiskyTopRows,
  copyUsesBannedWaste,
  isUserLabeledWaste,
  loadWasteLabels,
  toggleWasteLabel,
  USER_WASTE_ROW_LABEL,
  wasteToggleAria,
  wasteToggleCopy,
} from "./user-waste-labels.js";
import {
  aggregateMonthPulse,
  buildMonthWeekChartSeries,
  buildSparkPanStripFromNeighbors,
  buildSparkPanStripSeries,
  currentMonthKey,
  dayKeyISO,
  historyWeekSpendMax,
  loadMonthGoalUah,
  monthKeyFromAt,
  monthKeyFromDragDx,
  neighborMonthKeys,
  sparkLandWeekStarts,
  sparkSharedYMax,
  monthOverMonthDelta,
  monthStoryLine,
  pulseInsightLine,
  receiptPairDelta,
  resolveMonthGoalUah,
  saveMonthGoalUah,
  weekExpensivePeaks,
  weekOverWeekDelta,
  weekStartISO,
} from "./spend.js";
import {
  noteSportProgramChosen,
  noteSportRationCoverage,
  loadSportSessionGoal,
  saveSportSessionGoal,
  sportExpressCardModel,
  sportHomePulseModel,
  sportMonthKeys,
  sportMonthWeekChartSeries,
  sportOrientirModel,
  sportSparkSharedYMaxes,
  historyWeekKcalMax,
  historyWeekSessionsMax,
  rationCoverageHitsInMonth,
  SPORT_SESSION_GOAL,
} from "./sport-pulse.js";
import {
  createSessionController,
  formatTimer,
  loadSessionEvents,
  noteSessionProgress,
  parseSessionSteps,
  sessionProgressFromSnapshot,
  dayKeyKyiv,
  shiftDayKey,
} from "./session-player.js";
import {
  EXERCISE_ART_ATTRIBUTION,
  EXERCISE_ART_INTENTIONAL_NULL,
  normalizeExerciseStem,
  resolveExerciseArt,
  resolvePickerThumbArt,
} from "./exercise-art-map.js";
import { programPickerMetaLine, resolveProgramThumb } from "./program-art-map.js";
import {
  canSpeakExerciseHowTo,
  HOWTO_DISCLAIMER_SHORT,
  resolveExerciseHowTo,
  speakExerciseHowTo,
  stopExerciseHowToSpeech,
  warmSpeechVoices,
} from "./exercise-howto.js";
import { sessionLabelHtml, sessionLabelShortName, splitSessionLabel } from "./session-label.js";
import {
  mealRecipeHowtoHtml,
  mealServeNoteHtml,
  resolveMealRecipeSteps,
  resolveMealServeNote,
} from "./meal-howto.js";

const uahFmt = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  maximumFractionDigits: 2,
});

function money(n) {
  if (n == null || n === "" || !Number.isFinite(Number(n))) return "—";
  return moneyParts(Number(n))?.amount || "—";
}

/** Amount digits only (no currency symbol / грн). */
function moneyParts(n) {
  if (n == null || n === "" || !Number.isFinite(Number(n))) return null;
  const amount = uahFmt
    .formatToParts(Number(n))
    .filter((p) => p.type !== "currency")
    .map((p) => p.value)
    .join("")
    .replace(/\s+$/u, "")
    .trim();
  return { amount };
}

/** HTML amount for metrics; optional prefix like `+`. */
function moneyStackHtml(n, { prefix = "" } = {}) {
  const p = moneyParts(n);
  if (!p) return "—";
  return `${esc(prefix)}<span class="money-amt">${esc(p.amount)}</span>`;
}

/** Compact chart badge: `5 449`. */
function moneyBadge(n) {
  const v = Math.round(Number(n) || 0);
  if (!(v > 0)) return "—";
  return v.toLocaleString("uk-UA");
}

/**
 * Dual-font Silpo brand: «Сільпо» (display serif) + Sport/Express/SE (Manrope).
 * size: hero (home nav) | chrome (sport header) | card (rituals) | btn (compact CTA) | title (page h1)
 * @param {{ product?: "sport"|"express"|"sportExpress", size?: string, tag?: string, className?: string }} [opts]
 */
function brandMarkHtml(opts = {}) {
  const product = opts.product || "sport";
  const size = opts.size || "chrome";
  const tag = opts.tag || "span";
  const extra = opts.className ? ` ${opts.className}` : "";
  const parts = [`<span class="brand-mark__silpo">Сільпо</span>`];
  if (product === "sportExpress") {
    parts.push(`<span class="brand-mark__se">SE</span>`);
  } else if (product === "sport") {
    parts.push(`<span class="brand-mark__sport">Sport</span>`);
  } else if (product === "express") {
    parts.push(`<span class="brand-mark__express">Express</span>`);
  }
  const label =
    product === "express" ? "СільпоExpress" : product === "sportExpress" ? "СільпоSE" : "СільпоSport";
  return `<${tag} class="brand-mark brand-mark--${esc(size)}${extra}" aria-label="${esc(label)}">${parts.join("")}</${tag}>`;
}

function sportProfileHeroBandHtml(profile) {
  const saved = normalizeSportProfile(profile);
  const profileLine = profileSummaryLine(saved);
  const kcalBudget = estimateDailyKcalFromProfile(saved);
  const profileAvatarInitial = esc(String(sexLabel(saved.sex) || "?").slice(0, 1));
  return `<button type="button" class="sport-profile__hero-band" id="editProfile" aria-label="Змінити профіль: ${esc(profileLine)}, ≈ ${kcalBudget} ккал">
        <span class="sport-profile__hero-avatar" aria-hidden="true">${profileAvatarInitial}</span>
        <span class="sport-profile__hero-copy">
          <span class="sport-profile__hero-line">${esc(profileLine)}</span>
          <span class="sport-profile__hero-kcal">≈ ${kcalBudget} ккал · орієнтир</span>
        </span>
        <span class="sport-profile__hero-edit" aria-hidden="true">Змінити</span>
      </button>`;
}

function bindSportProfileHeroBand({ programId } = {}) {
  const btn = $("#editProfile");
  if (!btn) return;
  btn.onclick = () => {
    if (programId) destroySessionCtl(programId);
    state.profileDraft = normalizeSportProfile(loadSportProfile());
    state.sportProgramPickerOpen = false;
    state._sportProfilePolishOnce = true;
    render();
  };
}

/** Week totals for ribbon — badge sits above each week point (skip empty prior). */
function weekBadgeModels(series, geom, weekPaceUah = 0) {
  const list = Array.isArray(series) ? series : [];
  const coords = geom?.coords || [];
  const pace = Number(weekPaceUah) || 0;
  const out = [];
  for (const c of coords) {
    const s = list[c.i];
    if (!s) continue;
    const uah = Number(s.uah) || Number(c.uah) || 0;
    if (!(uah > 0)) continue;
    out.push({
      i: c.i,
      weekStart: s.weekStart || s.dayStart || "",
      uah: Math.round(uah * 100) / 100,
      peakX: c.x,
      peakY: c.y,
      prior: Boolean(s.prior),
      over: !s.prior && pace > 0 && uah > pace * 1.08,
    });
  }
  return out;
}

/** Pulse SKU freshness: reuse beacon, silence bread + tobacco (+ no last-basket nag). */
function pulseExpensiveBeacon(name, receipts) {
  const b = beaconForLine({ name }, receipts);
  const id = String(b.slotId || "");
  if (id.startsWith("brd:") || id.startsWith("tob:") || b.class === "P2") {
    return { ...b, kind: "none", copy: "", tip: "" };
  }
  if (b.kind === "due_soft") {
    const days = b.daysAgo != null ? Math.round(b.daysAgo) : null;
    return {
      ...b,
      copy: days != null ? `давно не купував · ~${days} дн.` : "давно не купував",
    };
  }
  if (b.kind === "pantry_check" || b.kind === "last_basket") {
    return {
      ...b,
      kind: "pantry_check",
      copy: "нещодавно · перевір чи є",
    };
  }
  return b;
}

function cloneAllow(list) {
  const base = Array.isArray(list) && list.length ? list : ["food", "clean"];
  return [...new Set(base)];
}

/** Envelope UI removed — keep food+clean defaults for planner/gate. */
function ensureShopAllow() {
  const allow = cloneAllow(state.intentShop.constraints.categoriesAllow);
  state.intentShop.constraints.categoriesAllow = allow;
  return allow;
}

const root = $("#app");

const state = {
  screen: "home",
  intentSport: emptyIntent("sport"),
  intentShop: (() => {
    const i = emptyIntent("shopping");
    i.constraints.categoriesAllow = ["food", "clean", "alcohol"];
    return i;
  })(),
  kb: null,
  shelf: null,
  variantId: "B",
  removed: [],
  swaps: {},
  picker: null,
  confirmed: false,
  /** Soft handoff URL after MCP cart push. */
  checkoutUrl: "",
  /** In-flight cart push from Погодити. */
  cartPushing: false,
  debug: false,
  mcpStatus: null,
  lastSource: "",
  shopVm: null,
  shopDirty: true,
  extraQueries: [],
  browse: null,
  accepted: {},
  renderSeq: 0,
  sportTab: "wheel",
  /** Sheet: program list on sport home. */
  sportProgramPickerOpen: false,
  /** Picker goal filter: "" | cardio | strength | mobility */
  sportProgramGoalFilter: "",
  navLock: false,
  toastTimer: 0,
  flashRole: "",
  pantryFocusIdx: 0,
  flashClearTimer: 0,
  /** Floor 10 session proxies (tip opens / pantry unchecks / ₴). */
  pantryMetrics: { tipOpens: 0, unchecks: 0, uahUnchecked: 0 },
  /** Epic 4 Sport→Express funnel (session). */
  handoffMetrics: emptyHandoffMetrics(),
  /** Sport → Express handoff banner (session). Cleared on shop wipe / dismiss. */
  /** @type {null | { programId: string, title: string, dayISO: string, at: number }} */
  sportHandoff: null,
  /** Recent-buy shelf chips dismissed after add (session). */
  recentShelfDismissed: new Set(),
  /** Draft while on survey screen */
  /** @type {ReturnType<typeof emptySportSurvey>|null} */
  surveyDraft: null,
  /** Draft while editing sport body profile */
  /** @type {ReturnType<typeof emptySportProfile>|null} */
  profileDraft: null,
  /** @type {{ receipts: any[], freq: Record<string, number>, loadedAt: number, source: string|null }} */
  historyCache: { receipts: [], freq: {}, loadedAt: 0, source: null },
  /** role → units override (session) */
  qtyByRole: {},
  /** @type {null | { tab: string, receiptId: string|null, baseId?: string|null, selected?: Record<string, boolean>, saveOpen?: boolean }} */
  lists: null,
  /** snapshot for undo after merge */
  undoShop: null,
  undoTimer: 0,
  /** @type {string|null} selected pulse month YYYY-MM; null → current */
  pulseMonthKey: null,
  /** @type {string|null} Sport card month YYYY-MM; independent of Express pulse */
  /** @type {string|null} Sport day screen selected ISO (YYYY-MM-DD); default today */
  dayISO: null,
  /** Day plates VM cache — fingerprint ignores dayISO (session/plates don't vary by calendar day). */
  /** @type {null | { fp: string, vm: object }} */
  _dayVmCache: null,
  /** Soft dayISO hop: session player re-sync without full paint (set by bindSessionPlayer). */
  /** @type {null | ((iso: string) => void)} */
  _sessionViewHook: null,
};

/** Load receipts once per session (API → fixture fallback). Stale after 15 min. */
async function ensureHistoryCache(force = false) {
  const TTL = 15 * 60 * 1000;
  if (!force && state.historyCache.loadedAt && Date.now() - state.historyCache.loadedAt < TTL) {
    return state.historyCache;
  }
  try {
    const ac = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ac ? setTimeout(() => ac.abort(), 7000) : null;
    const r = await fetch("/api/history", ac ? { signal: ac.signal } : undefined);
    if (timer) clearTimeout(timer);
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data.receipts) && data.receipts.length) {
        state.historyCache = {
          receipts: data.receipts,
          freq: data.freq || freqFromReceipts(data.receipts),
          loadedAt: Date.now(),
          source: data.source || "api",
        };
        return state.historyCache;
      }
    }
  } catch {
    /* fall through */
  }
  try {
    const data = await fetch("./content/fixture-orders.json").then((res) => {
      if (!res.ok) throw new Error(`fixture-orders ${res.status}`);
      return res.json();
    });
    const receipts = ordersToReceipts(data);
    state.historyCache = {
      receipts,
      freq: freqFromReceipts(receipts),
      loadedAt: Date.now(),
      source: "fixture",
    };
  } catch {
    state.historyCache = { receipts: [], freq: {}, loadedAt: Date.now(), source: "empty" };
  }
  return state.historyCache;
}

async function load() {
  const [kb, shelf] = await Promise.all([
    fetch("./content/kb.json").then((r) => r.json()),
    fetch("./content/shelf.json").then((r) => r.json()),
  ]);
  state.kb = kb;
  state.shelf = shelf;
  try {
    const partnerParam = new URLSearchParams(globalThis.location?.search || "").get("partner");
    if (partnerParam === "chef" || partnerParam === "fixture_chef_demo") {
      saveActiveContentSourceId("fixture_chef_demo");
    }
  } catch {
    /* ignore */
  }
  try {
    const statusRes = await fetch("/api/mcp/status");
    if (!statusRes.ok) throw new Error(`mcp status ${statusRes.status}`);
    state.mcpStatus = await statusRes.json();
  } catch {
    state.mcpStatus = { mode: "static_host", tokenOnServer: false };
  }
  await ensureHistoryCache();
  state.intentSport.constraints.steps = loadWalkSteps();
  bindHash();
  render();
}

let swapAbort = null;
let browseAbort = null;
let resolveAbort = null;
let searchTimer = null;
let suppressHash = false;
let hashSyncing = false;
const HASH = { home: "#/", sport: "#/sport", day: "#/day", shop: "#/shop", survey: "#/survey" };

function currentDayISO() {
  return state.dayISO || dayKeyKyiv(new Date());
}

function dayTitleUa(iso) {
  const today = dayKeyKyiv(new Date());
  if (iso === today) return "Сьогодні";
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "День";
  const months = ["січ", "лют", "бер", "квіт", "трав", "черв", "лип", "серп", "вер", "жовт", "лист", "груд"];
  return `${Number(m[3])} ${months[Number(m[2]) - 1]}.`;
}

function writeHash() {
  if (state.screen === "shop" && state.browse) {
    setShopHash(browseHrefFromState(state.browse), { push: false });
    return;
  }
  if (state.screen === "shop" && state.lists?.baseId) {
    setShopHash(shopBaseHref(state.lists.baseId), { push: false });
    return;
  }
  if (state.screen === "shop" && state.lists?.receiptId) {
    setShopHash(shopReceiptHref(state.lists.receiptId), { push: false });
    return;
  }
  if (state.screen === "shop" && state.lists) {
    setShopHash(shopListsHref(state.lists.tab), { push: false });
    return;
  }
  if (state.screen === "day") {
    const iso = currentDayISO();
    const today = dayKeyKyiv(new Date());
    setShopHash(iso === today ? "#/day" : `#/day/${iso}`, { push: false });
    return;
  }
  const next = HASH[state.screen] || "#/";
  setShopHash(next, { push: false });
}

function setShopHash(href, { push = false } = {}) {
  const next = href.startsWith("#") ? href : `#${href}`;
  if (location.hash === next) return;
  suppressHash = true;
  if (push) history.pushState(null, "", next);
  else history.replaceState(null, "", next);
  queueMicrotask(() => {
    suppressHash = false;
  });
}

function syncHashFromBrowse({ push = false } = {}) {
  if (state.screen !== "shop") return;
  setShopHash(browseHrefFromState(state.browse), { push });
}

async function applyAddFromParsed(parsed) {
  if (hashSyncing) return;
  hashSyncing = true;
  try {
    const add = parsed?.add;
    if (!add) {
      if (state.browse) {
        state.browse = null;
        await render();
      }
      return;
    }
    if (add.pick) {
      if (state.browse?.pickGroup) return;
      await openBrowse({ pickGroup: true, fromHash: true });
      return;
    }
    if (add.slug && add.group) {
      if (state.browse?.group === add.group && state.browse?.slug === add.slug && !state.browse?.search) return;
      if (state.browse?.group !== add.group || state.browse?.pickGroup) {
        await openBrowse({ group: add.group, groupTitle: groupMeta(add.group).title, fromHash: true });
      }
      await openBrowseSlug(add.slug, decodeURIComponent(add.slug), { fromHash: true });
      return;
    }
    if (add.group) {
      if (state.browse?.group === add.group && !state.browse?.slug && !state.browse?.search && !state.browse?.pickGroup) {
        return;
      }
      await openBrowse({ group: add.group, groupTitle: groupMeta(add.group).title, fromHash: true });
    }
  } finally {
    hashSyncing = false;
  }
}

async function onHashChange() {
  if (suppressHash) return;
  const parsed = parseLocationHash(location.hash);
  const next = screenFromParsed(parsed);
  /* Same-screen day ISO: soft hop when cache warm; else full render. */
  if (next === state.screen && next === "day") {
    const iso = parsed.dayISO || dayKeyKyiv(new Date());
    if (iso !== state.dayISO) {
      if (!trySoftHopDayISO(iso, { fromHash: true })) {
        state.dayISO = iso;
        render();
      }
    }
    return;
  }
  if (next === "day") {
    state.dayISO = parsed.dayISO || dayKeyKyiv(new Date());
  }
  if (next !== state.screen) {
    go(next, { fromHash: true });
    if (next === "shop" && parsed.add) await applyAddFromParsed(parsed);
    else if (next === "shop") applyListsFromParsed(parsed);
    else if (next !== "shop") writeHash();
    else if (!parsed.add) writeHash();
    return;
  }
  if (next === "shop") {
    if (parsed.add) await applyAddFromParsed(parsed);
    else applyListsFromParsed(parsed);
  }
}

function applyListsFromParsed(parsed) {
  if (parsed?.add) return;
  const lists = parsed?.lists || null;
  const cur = state.lists;
  const same =
    (!lists && !cur) ||
    (lists &&
      cur &&
      lists.tab === cur.tab &&
      String(lists.receiptId || "") === String(cur.receiptId || "") &&
      String(lists.baseId || "") === String(cur.baseId || ""));
  if (same) return;
  if (!lists) {
    state.lists = null;
    render();
    return;
  }
  state.lists = {
    tab: lists.tab || "receipts",
    receiptId: lists.receiptId || null,
    baseId: lists.baseId || null,
    selected: cur?.receiptId === lists.receiptId ? cur.selected || {} : {},
  };
  state.browse = null;
  state.picker = null;
  render();
}

function bindHash() {
  const parsed = parseLocationHash(location.hash);
  if (state.screen === "home" && parsed.screen !== "home") {
    state.screen = parsed.screen;
  }
  if (parsed.screen === "day") {
    state.dayISO = parsed.dayISO || dayKeyKyiv(new Date());
  }
  if (parsed.screen === "shop" && parsed.lists) {
    state.lists = {
      tab: parsed.lists.tab || "receipts",
      receiptId: parsed.lists.receiptId || null,
      baseId: parsed.lists.baseId || null,
      selected: {},
    };
  }
  window.addEventListener("hashchange", () => {
    void onHashChange();
  });
  if (parsed.screen === "shop" && parsed.add) {
    void applyAddFromParsed(parsed);
  }
}

/** Soft shop updates: skip rise flash + keep scroll so list does not "vanish" on tap. */
function paint(html, bind, opts = {}) {
  const y = opts.keepScroll ? window.scrollY : null;
  document.querySelectorAll(".phone > .sheet").forEach((el) => el.remove());
  root.classList.remove("screen-enter");
  root.innerHTML = html;
  if (!prefersReduce() && opts.enter !== false) {
    void root.offsetWidth;
    root.classList.add("screen-enter");
  }
  bind?.();
  /* Sheets must leave .screen-enter (transform → fixed containing block) or top chrome clips. */
  const phone = document.querySelector(".phone");
  const sheet = root.querySelector(".sheet");
  if (phone && sheet) phone.appendChild(sheet);
  if (y != null) window.scrollTo(0, y);
}

/** Bind Express pulse tips/nav. `quiet` = month swap (no card rise / no count-from-0). */
function bindHomePulseCard({ quiet = false } = {}) {
  const goalBtn = $("#edit-month-goal");
  if (goalBtn) {
    goalBtn.onclick = (ev) => {
      ev.stopPropagation();
      openMonthGoalEditor(goalBtn);
    };
  }
  root.querySelectorAll("[data-pulse-month-dir]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const dir = Number(btn.dataset.pulseMonthDir) || 0;
      const recs = state.historyCache?.receipts || [];
      const nav = resolvePulseMonthNav(recs);
      const next = dir < 0 ? nav.prevKey : nav.nextKey;
      if (!next) return;
      patchHomePulseMonth(next);
    });
  });
  root.querySelectorAll("[data-pulse-month-now]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      patchHomePulseMonth(currentMonthKey());
    });
  });
  root.querySelectorAll("[data-sport-month-dir]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const dir = Number(btn.dataset.sportMonthDir) || 0;
      const recs = state.historyCache?.receipts || [];
      const nav = resolveSportPulseMonthNav(recs);
      const next = dir < 0 ? nav.prevKey : nav.nextKey;
      if (!next) return;
      patchHomeSportPulseMonth(next);
    });
  });
  root.querySelectorAll("[data-sport-month-now]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      patchHomeSportPulseMonth(currentMonthKey());
    });
  });
  if (!quiet) runHomeSpentCountUp();
  const goalSportBtn = $("#edit-sport-session-goal");
  if (goalSportBtn) {
    goalSportBtn.onclick = (ev) => {
      ev.stopPropagation();
      openSportSessionGoalEditor(goalSportBtn);
    };
  }
  const pulseRoot = root.querySelector(".home-pulse[data-spark-peaks]");
  if (pulseRoot) {
    if (quiet) pulseRoot.classList.add("home-pulse--quiet");
    const recs = state.historyCache?.receipts || [];
    const mk = pulseRoot.dataset.monthKey || currentMonthKey();
    const pulseAgg = aggregateMonthPulse(recs, { monthKey: mk, goalUah: 1, seriesWeeks: 5 });
    const ser =
      pulseAgg.chartSeries?.length
        ? pulseAgg.chartSeries
        : pulseAgg.series.filter((s) => String(s.weekStart || "").slice(0, 7) === mk);
    const peaks = weekExpensivePeaks(recs, ser.filter((s) => !s.prior), { topN: 2, minUah: 150 }).map((p) => ({
      ...p,
      items: (p.items || []).filter((it) => isHomeTopSkuOk(it.name) && monthKeyFromAt(it.at) === mk),
    }));
    const peaksByIdx = ser.map((s) => {
      if (s.prior) return { weekStart: s.weekStart, uah: s.uah, items: [] };
      return peaks.find((p) => p.weekStart === s.weekStart) || { weekStart: s.weekStart, uah: s.uah, items: [] };
    });
    bindSparkTips(pulseRoot, peaksByIdx, mk, ser);
    bindSparkPan(pulseRoot);
    if (pulseRoot.querySelector(".home-pulse__sku")) bindSkuChartHighlight(pulseRoot);
    bindWasteLabelToggles(pulseRoot);
    bindOrientirTip(pulseRoot);
    bindInsightTip(pulseRoot);
    bindDeltaFootTip(pulseRoot);
  }
  const sportRoot = root.querySelector(".home-pulse--sport");
  if (sportRoot) {
    bindOrientirTip(sportRoot);
    bindSportDayTips(sportRoot);
    bindDeltaFootTip(sportRoot);
    bindSparkPan(sportRoot, {
      sport: true,
      resolveNav: () => resolveSportPulseMonthNav(state.historyCache?.receipts || []),
      tipSelector: ".home-pulse__tip--sport",
    });
    if (quiet) sportRoot.classList.add("home-pulse--quiet");
  }
  scheduleWeekBadgeOverlapResolve(root);
  if (quiet) return;
  const wantW = pulseChartWidth(".home-pulse--craft .home-pulse__spark-wrap");
  const gotW = Number(pulseRoot?.dataset.chartW) || 0;
  const wantSportW = pulseChartWidth(".home-pulse--sport .home-pulse__spark-wrap--sport");
  const gotSportW = Number(sportRoot?.dataset.sportChartW) || 0;
  const needRefit = Math.abs(wantW - gotW) > 2 || (sportRoot && Math.abs(wantSportW - gotSportW) > 2);
  if (needRefit && !state._pulseChartRefit) {
    state._pulseChartRefit = true;
    void render();
  } else {
    state._pulseChartRefit = false;
  }
  scheduleWeekBadgeOverlapResolve(root);
}

/** Soft card swap after pan / ‹ › — prefer named view-transition over hard cut. */
function badgeFlipKey(el) {
  const wk = el.dataset.weekStart || el.dataset.tipX || el.style.left || "";
  const kind = el.classList.contains("home-pulse__week-badge--sport")
    ? "s"
    : el.classList.contains("home-pulse__week-badge--food")
      ? "f"
      : "e";
  return `${kind}|${wk}|${el.textContent?.trim() || ""}`;
}

function capturePulseBadgeFlip(rootEl) {
  const map = new Map();
  if (!rootEl || prefersReduce()) return map;
  rootEl.querySelectorAll(".home-pulse__week-badge").forEach((el) => {
    map.set(badgeFlipKey(el), el.getBoundingClientRect());
  });
  return map;
}

function playPulseBadgeFlip(rootEl, fromMap) {
  if (!rootEl || !fromMap?.size || prefersReduce()) return;
  rootEl.querySelectorAll(".home-pulse__week-badge").forEach((el) => {
    const prev = fromMap.get(badgeFlipKey(el));
    if (!prev) return;
    const next = el.getBoundingClientRect();
    const dx = prev.left - next.left;
    const dy = prev.top - next.top;
    if (Math.hypot(dx, dy) < 1.5) return;
    el.style.transition = "none";
    el.style.setProperty("--badge-dx", `${dx}px`);
    el.style.setProperty("--badge-dy", `${dy}px`);
    void el.offsetWidth;
    el.style.transition = "";
    el.style.setProperty("--badge-dx", "0px");
    el.style.setProperty("--badge-dy", "0px");
    const clear = () => {
      el.style.removeProperty("--badge-dx");
      el.style.removeProperty("--badge-dy");
      el.removeEventListener("transitionend", onEnd);
    };
    const onEnd = (ev) => {
      if (ev.propertyName !== "transform") return;
      clear();
    };
    el.addEventListener("transitionend", onEnd);
    window.setTimeout(clear, 420);
  });
  scheduleWeekBadgeOverlapResolve(rootEl);
  window.setTimeout(() => scheduleWeekBadgeOverlapResolve(rootEl), 450);
}

/** After keep-spark land: recompute viewport edge anchors so badges ease to inset transforms. */
function refreshSparkEdgeClasses(wrap) {
  if (!wrap) return;
  const rest = Number(wrap.dataset.sparkRestX) || 0;
  const chartW = wrap.clientWidth || 1;
  const stage = wrap.querySelector(".home-pulse__spark-stage") || wrap;
  const stageW = stage.clientWidth || chartW;
  const apply = (el) => {
    const peakAttr = el.dataset.peakX ?? el.dataset.tipX;
    let peakX = peakAttr != null ? Number(peakAttr) : NaN;
    if (!Number.isFinite(peakX)) {
      const leftPct = parseFloat(el.style.left);
      if (!Number.isFinite(leftPct)) return;
      peakX = (leftPct / 100) * stageW;
    }
    const viewX = peakX - rest;
    const inView = viewX >= -24 && viewX <= chartW + 24;
    const atStart = inView && viewX < 40;
    const atEnd = inView && viewX > chartW - 40;
    el.classList.toggle("is-edge-start", atStart && !atEnd);
    el.classList.toggle("is-edge-end", atEnd && !atStart);
  };
  wrap.querySelectorAll(".home-pulse__week-badge, .home-pulse__week-tick").forEach(apply);
  scheduleWeekBadgeOverlapResolve(wrap);
}

/**
 * Push overlapping week badges apart via --badge-ox/oy (leaves FLIP --badge-dx/dy alone).
 * Food↑ / sport↓ when mixed; same-series splits on the cheaper axis.
 */
function resolveWeekBadgeOverlaps(scope) {
  const host = scope && scope.querySelectorAll ? scope : root;
  const layers = [...host.querySelectorAll(".home-pulse__week-badges")];
  const gap = 8;
  const maxIter = 16;
  for (const layer of layers) {
    const badges = [...layer.querySelectorAll(".home-pulse__week-badge")];
    if (badges.length < 2) continue;
    for (const el of badges) {
      el.style.setProperty("--badge-ox", "0px");
      el.style.setProperty("--badge-oy", "0px");
    }
    const layerRect = layer.getBoundingClientRect();
    if (!(layerRect.width > 0) || !(layerRect.height > 0)) continue;

    /* Pre-stagger same-series neighbors that start almost stacked (before iterative push). */
    {
      const ranked = [...badges].sort((a, b) => {
        const ax = a.getBoundingClientRect().left;
        const bx = b.getBoundingClientRect().left;
        return ax - bx;
      });
      for (let i = 1; i < ranked.length; i++) {
        const prev = ranked[i - 1];
        const cur = ranked[i];
        const pr = prev.getBoundingClientRect();
        const cr = cur.getBoundingClientRect();
        const oxlap = Math.min(pr.right, cr.right) - Math.max(pr.left, cr.left);
        const oylap = Math.min(pr.bottom, cr.bottom) - Math.max(pr.top, cr.top);
        if (oxlap <= gap || oylap <= gap) continue;
        const prevSport = prev.classList.contains("home-pulse__week-badge--sport");
        const curSport = cur.classList.contains("home-pulse__week-badge--sport");
        if (prevSport !== curSport) {
          const lift = (oylap + gap) / 2 + 4;
          cur.style.setProperty("--badge-oy", `${curSport ? lift : -lift}px`);
          prev.style.setProperty("--badge-oy", `${prevSport ? lift : -lift}px`);
        } else {
          const lift = i % 2 === 0 ? -(oylap + gap + 2) : oylap + gap + 2;
          cur.style.setProperty("--badge-oy", `${lift}px`);
        }
      }
    }

    for (let iter = 0; iter < maxIter; iter++) {
      let moved = false;
      const boxes = badges.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          el,
          r,
          ox: parseFloat(el.style.getPropertyValue("--badge-ox")) || 0,
          oy: parseFloat(el.style.getPropertyValue("--badge-oy")) || 0,
          sport: el.classList.contains("home-pulse__week-badge--sport"),
        };
      });
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const A = boxes[i];
          const B = boxes[j];
          const oxlap = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
          const oylap = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
          if (oxlap <= gap || oylap <= gap) continue;

          if (A.sport !== B.sport) {
            const push = (oylap + gap) / 2 + 1.5;
            const food = A.sport ? B : A;
            const sport = A.sport ? A : B;
            food.oy -= push;
            sport.oy += push;
            food.el.style.setProperty("--badge-oy", `${food.oy}px`);
            sport.el.style.setProperty("--badge-oy", `${sport.oy}px`);
            food.r = {
              left: food.r.left,
              right: food.r.right,
              top: food.r.top - push,
              bottom: food.r.bottom - push,
              width: food.r.width,
              height: food.r.height,
            };
            sport.r = {
              left: sport.r.left,
              right: sport.r.right,
              top: sport.r.top + push,
              bottom: sport.r.bottom + push,
              width: sport.r.width,
              height: sport.r.height,
            };
            moved = true;
            continue;
          }

          if (oxlap <= oylap) {
            const push = (oxlap + gap) / 2 + 0.5;
            const left = A.r.left <= B.r.left ? A : B;
            const right = left === A ? B : A;
            left.ox -= push;
            right.ox += push;
            left.el.style.setProperty("--badge-ox", `${left.ox}px`);
            right.el.style.setProperty("--badge-ox", `${right.ox}px`);
            left.r = {
              left: left.r.left - push,
              right: left.r.right - push,
              top: left.r.top,
              bottom: left.r.bottom,
              width: left.r.width,
              height: left.r.height,
            };
            right.r = {
              left: right.r.left + push,
              right: right.r.right + push,
              top: right.r.top,
              bottom: right.r.bottom,
              width: right.r.width,
              height: right.r.height,
            };
          } else {
            const push = (oylap + gap) / 2 + 0.5;
            const top = A.r.top <= B.r.top ? A : B;
            const bot = top === A ? B : A;
            top.oy -= push;
            bot.oy += push;
            top.el.style.setProperty("--badge-oy", `${top.oy}px`);
            bot.el.style.setProperty("--badge-oy", `${bot.oy}px`);
            top.r = {
              left: top.r.left,
              right: top.r.right,
              top: top.r.top - push,
              bottom: top.r.bottom - push,
              width: top.r.width,
              height: top.r.height,
            };
            bot.r = {
              left: bot.r.left,
              right: bot.r.right,
              top: bot.r.top + push,
              bottom: bot.r.bottom + push,
              width: bot.r.width,
              height: bot.r.height,
            };
          }
          moved = true;
        }
      }
      if (!moved) break;
    }

    for (const el of badges) {
      const r = el.getBoundingClientRect();
      let ox = parseFloat(el.style.getPropertyValue("--badge-ox")) || 0;
      let oy = parseFloat(el.style.getPropertyValue("--badge-oy")) || 0;
      /* X inset keeps labels inside clipped spark; Y soft so food↔sport deoverlap survives */
      const insetX = 10;
      const insetY = 2;
      if (r.left < layerRect.left + insetX) ox += layerRect.left + insetX - r.left;
      if (r.right > layerRect.right - insetX) ox -= r.right - (layerRect.right - insetX);
      if (r.top < layerRect.top + insetY) oy += layerRect.top + insetY - r.top;
      if (r.bottom > layerRect.bottom - insetY) oy -= r.bottom - (layerRect.bottom - insetY);
      el.style.setProperty("--badge-ox", `${ox}px`);
      el.style.setProperty("--badge-oy", `${oy}px`);
    }

    /* One more food↑ / sport↓ pass after edge clamp */
    {
      const boxes = badges.map((el) => ({
        el,
        r: el.getBoundingClientRect(),
        oy: parseFloat(el.style.getPropertyValue("--badge-oy")) || 0,
        sport: el.classList.contains("home-pulse__week-badge--sport"),
      }));
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const A = boxes[i];
          const B = boxes[j];
          if (A.sport === B.sport) continue;
          const oxlap = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
          const oylap = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
          if (oxlap <= gap || oylap <= gap) continue;
          const push = oylap + gap;
          const food = A.sport ? B : A;
          const sport = A.sport ? A : B;
          food.oy -= push;
          sport.oy += push;
          food.el.style.setProperty("--badge-oy", `${food.oy}px`);
          sport.el.style.setProperty("--badge-oy", `${sport.oy}px`);
        }
      }
    }
  }
}

function scheduleWeekBadgeOverlapResolve(scope) {
  const run = () => resolveWeekBadgeOverlaps(scope);
  requestAnimationFrame(() => {
    run();
    requestAnimationFrame(run);
  });
}

function swapPulseCard(prev, nextEl, vtName, after) {
  if (!prev || !nextEl) return false;
  nextEl.classList.add("home-pulse--quiet");
  const flipFrom = capturePulseBadgeFlip(prev);
  const run = () => {
    nextEl.style.viewTransitionName = vtName;
    prev.replaceWith(nextEl);
    after?.(nextEl);
    requestAnimationFrame(() => playPulseBadgeFlip(nextEl, flipFrom));
  };
  if (typeof document.startViewTransition === "function" && !prefersReduce()) {
    prev.style.viewTransitionName = vtName;
    const vt = withViewTransition(run);
    Promise.resolve(vt?.finished).finally(() => {
      const el = nextEl.isConnected ? nextEl : null;
      if (el) el.style.viewTransitionName = "";
    });
    return true;
  }
  run();
  if (nextEl.isConnected) nextEl.style.viewTransitionName = "";
  return true;
}

/** Copy status/metrics chrome from a freshly built card onto live card (keep spark). */
function applyPulseChromeFrom(prev, nextEl, { sport = false } = {}) {
  if (!prev || !nextEl) return;
  const sels = [".home-pulse__status-band", ".home-pulse__whisper", ".home-pulse__story-pad"];
  for (const sel of sels) {
    const a = prev.querySelector(sel);
    const b = nextEl.querySelector(sel);
    if (a && b) a.replaceWith(b.cloneNode(true));
  }
  prev.classList.toggle("home-pulse--over", nextEl.classList.contains("home-pulse--over"));
  prev.classList.toggle("home-pulse--archive", nextEl.classList.contains("home-pulse--archive"));
  prev.classList.toggle("is-kcal-hot", nextEl.classList.contains("is-kcal-hot"));
  if (sport) {
    prev.dataset.sportMonthKey = nextEl.dataset.sportMonthKey || prev.dataset.sportMonthKey;
    const note = prev.querySelector(".home-pulse__program-note");
    const nextNote = nextEl.querySelector(".home-pulse__program-note");
    if (note && nextNote) note.replaceWith(nextNote.cloneNode(true));
  } else {
    prev.dataset.monthKey = nextEl.dataset.monthKey || prev.dataset.monthKey;
  }
}

/** After pan land: shift restX + segment cursor; keep same SVG strip (no chart remount jump). */
function rebaseSparkWrapAfterLand(wrap, dir) {
  if (!wrap) return false;
  const pitch = Number(wrap.dataset.sparkPitch) || 0;
  const lenses = String(wrap.dataset.sparkSegLens || "")
    .split(",")
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && n >= 0);
  let segI = Number(wrap.dataset.sparkSegI);
  if (!Number.isFinite(segI)) segI = 0;
  const nextI = dir > 0 ? segI - 1 : segI + 1;
  if (nextI < 0 || nextI >= lenses.length) return false;
  // Prev: shift by older peek len. Next: shift by *current* len (align next start to old center start).
  const landLen = dir > 0 ? lenses[segI - 1] || 0 : lenses[segI] || 0;
  const landPx = Math.round(landLen * pitch);
  const rest = Math.round((Number(wrap.dataset.sparkRestX) || 0) + (dir > 0 ? -landPx : landPx));
  segI = nextI;
  wrap.dataset.sparkRestX = String(rest);
  wrap.dataset.sparkSegI = String(segI);
  wrap.dataset.sparkPeekLeft = String(rest);
  const stripW = wrap.querySelector(".home-pulse__spark-track")?.offsetWidth || 0;
  const chartW = wrap.clientWidth || 0;
  wrap.dataset.sparkPeekRight = String(Math.max(0, stripW - rest - chartW));
  wrap.dataset.sparkCommitPrev = String(Math.round((lenses[segI - 1] || 0) * pitch));
  // Next commit = current center len only when a newer segment exists; else 0 (no void pan).
  wrap.dataset.sparkCommitNext = String(
    segI < lenses.length - 1 ? Math.round((lenses[segI] || 0) * pitch) : 0,
  );
  const track = wrap.querySelector(".home-pulse__spark-track");
  if (track) {
    track.style.transition = "none";
    track.style.transform = `translate3d(${-rest}px,0,0)`;
  }
  return true;
}

/** Copy is-over (red) from rebuilt card onto live keep-spark badges by weekStart (+ food/sport kind). */
function syncPulseBadgeOverFrom(nextEl, liveRoot) {
  if (!nextEl || !liveRoot) return;
  const overKeys = new Set();
  nextEl.querySelectorAll(".home-pulse__week-badge.is-over[data-week-start]").forEach((el) => {
    const kind = el.classList.contains("home-pulse__week-badge--sport")
      ? "s"
      : el.classList.contains("home-pulse__week-badge--food")
        ? "f"
        : "e";
    overKeys.add(`${kind}|${el.dataset.weekStart}`);
  });
  liveRoot.querySelectorAll(".home-pulse__week-badge[data-week-start]").forEach((el) => {
    const kind = el.classList.contains("home-pulse__week-badge--sport")
      ? "s"
      : el.classList.contains("home-pulse__week-badge--food")
        ? "f"
        : "e";
    const key = `${kind}|${el.dataset.weekStart}`;
    el.classList.toggle("is-over", overKeys.has(key));
  });
}

/**
 * Pan commit: update chrome to neighbor month, keep translating strip (no spark remount).
 * ‹ › month buttons still use full card swap.
 */
function patchPulseMonthKeepSpark(nextKey, { sport = false, landDir = 1 } = {}) {
  if (!nextKey) return;
  if (sport) state.sportPulseMonthKey = nextKey;
  else state.pulseMonthKey = nextKey;
  const hasToken = Boolean(state.mcpStatus?.tokenOnServer);
  const tmp = document.createElement("div");
  tmp.innerHTML = (sport ? homeSportPulseHtml() : homePulseHtml(hasToken)).trim();
  const nextEl = tmp.firstElementChild;
  const prev = sport
    ? root.querySelector(".home-pulse--sport")
    : root.querySelector(".home-pulse--craft, .home-pulse--empty");
  if (!nextEl || !prev) {
    if (sport) patchHomeSportPulseMonth(nextKey);
    else patchHomePulseMonth(nextKey);
    return;
  }
  const wrap = prev.querySelector(".home-pulse__spark-wrap");
  applyPulseChromeFrom(prev, nextEl, { sport });
  const rebased = rebaseSparkWrapAfterLand(wrap, landDir);
  if (!rebased) {
    if (sport) patchHomeSportPulseMonth(nextKey);
    else patchHomePulseMonth(nextKey);
    return;
  }
  syncPulseBadgeOverFrom(nextEl, prev);
  prev.classList.add("home-pulse--quiet");
  prev.classList.remove("is-spark-panning");
  wrap?.classList.remove("is-panning");
  refreshSparkEdgeClasses(wrap);
  bindHomePulseCard({ quiet: true });
  if (sport) {
    root.querySelectorAll(".home-pulse--sport [data-go]").forEach((b) => {
      b.onclick = () => go(b.dataset.go);
    });
  }
}

/** Swap only Express pulse card — keep home chrome, skip full-screen enter flash. */
function patchHomePulseMonth(nextKey) {
  if (!nextKey) return;
  state.pulseMonthKey = nextKey;
  const hasToken = Boolean(state.mcpStatus?.tokenOnServer);
  const tmp = document.createElement("div");
  tmp.innerHTML = homePulseHtml(hasToken).trim();
  const nextEl = tmp.firstElementChild;
  const prev = root.querySelector(".home-pulse--craft, .home-pulse--empty");
  if (!nextEl || !prev) {
    void render();
    return;
  }
  swapPulseCard(prev, nextEl, "home-pulse-craft", () => bindHomePulseCard({ quiet: true }));
}

/** Swap only Sport pulse card (month ‹ › independent of Express). */
function patchHomeSportPulseMonth(nextKey) {
  if (!nextKey) return;
  state.sportPulseMonthKey = nextKey;
  const tmp = document.createElement("div");
  tmp.innerHTML = homeSportPulseHtml().trim();
  const nextEl = tmp.firstElementChild;
  const prev = root.querySelector(".home-pulse--sport");
  if (!nextEl || !prev) {
    void render();
    return;
  }
  swapPulseCard(prev, nextEl, "home-pulse-sport", () => {
    bindHomePulseCard({ quiet: true });
    root.querySelectorAll(".home-pulse--sport [data-go]").forEach((b) => {
      b.onclick = () => go(b.dataset.go);
    });
  });
}

function patchShopDock(vm) {
  const dock = root.querySelector(".dock");
  if (!dock || !vm) return;
  const n = okLines(vm).length;
  const btn = dock.querySelector("#print");
  if (btn && !state.confirmed) {
    btn.disabled = !n;
    const label = btn.querySelector(".dock-cta__label");
    const sumEl = btn.querySelector(".dock-cta__sum");
    if (label && sumEl) {
      label.textContent = `Погодити ${n || "0"}`;
      sumEl.textContent = money(okSum(vm));
    } else {
      btn.textContent = `Погодити ${n || "0"}`;
    }
  }
  const over = okSum(vm) > Number(state.intentShop.constraints.budgetUah);
  let warn = dock.querySelector(".warn");
  if (over && !warn) {
    warn = document.createElement("p");
    warn.className = "warn";
    warn.textContent = "Погоджене вище стелі — зніміть галочки або замініть.";
    btn?.before(warn);
  } else if (!over && warn) {
    warn.remove();
  }
}

/** Measure unified checkout header → CSS sticky offset for group rows. */
function syncCheckoutStickyTop() {
  const flow = root.querySelector(".shop-flow--checkout");
  const header = root.querySelector(".shop-checkout-header");
  if (!flow || !header) return;
  const apply = () => {
    const h = Math.ceil(header.getBoundingClientRect().height);
    if (h > 0) flow.style.setProperty("--shop-checkout-sticky-top", `${h + 4}px`);
  };
  apply();
  requestAnimationFrame(() => requestAnimationFrame(apply));
}

/** Build checkout progress + spend split for current VM. */
function shopProgressForVm(vm) {
  const removedSet = new Set(state.removed || []);
  const checklistTotal = (vm?.lines || []).filter(
    (l) => l.status !== "missing" && !removedSet.has(l.role),
  ).length;
  const budVal = Number(state.intentShop?.constraints?.budgetUah || 0);
  const accepted = okLines(vm);
  const mk = currentMonthKey();
  return shopProgressMetrics({
    okCount: accepted.length,
    totalCount: checklistTotal,
    sumUah: okSum(vm),
    budgetUah: budVal,
    acceptedLines: accepted,
    monthKey: mk,
    isUserWaste: isUserLabeledWaste,
  });
}

/** In-place Checkout OS progress strip — mirrors patchShopDock for scroll context. */
function patchShopProgress(vm) {
  const prog = root.querySelector(".shop-progress");
  if (!prog || !vm || prog.classList.contains("shop-progress--loading")) return;
  const progressM = shopProgressForVm(vm);
  const budVal = progressM.budget;
  const sumVal = okSum(vm);
  prog.classList.toggle("shop-progress--over", progressM.over);
  prog.classList.toggle("shop-progress--tight", !progressM.over && progressM.budgetPct >= 90);
  const composeFill = prog.querySelector(".shop-progress__compose-fill");
  const composeTrack = prog.querySelector(".shop-progress__compose-track");
  const splitTitle = shopSplitBarTitle(
    {
      baseLabel: money(progressM.baseUah),
      moodLabel: money(progressM.moodUah),
      wasteLabel: money(progressM.userWasteUah),
    },
    { moodUah: progressM.moodUah, wasteUah: progressM.userWasteUah },
  );
  if (composeTrack) composeTrack.title = splitTitle;
  if (composeFill) {
    composeFill.style.width = `${progressM.budgetPct}%`;
    const { baseUah, moodUah, userWasteUah } = progressM;
    composeFill.innerHTML = (() => {
      const splitTotal = baseUah + moodUah + userWasteUah;
      if (splitTotal <= 0) return `<span class="shop-progress__split-inner" style="width:0"></span>`;
      return `<span class="shop-progress__split-inner" style="width:100%">
      ${baseUah > 0 ? `<i class="shop-progress__split-base" style="flex:${baseUah}"></i>` : ""}
      ${moodUah > 0 ? `<i class="shop-progress__split-mood" style="flex:${moodUah}"></i>` : ""}
      ${userWasteUah > 0 ? `<i class="shop-progress__split-waste" style="flex:${userWasteUah}"></i>` : ""}
    </span>`;
    })();
  }
  prog.querySelector(".shop-progress__split-caption")?.remove();
  const legend = prog.querySelector(".shop-progress__legend--micro");
  if (legend) legend.remove();
  const remainWrap = prog.querySelector(".shop-progress__hero-remain");
  if (remainWrap) {
    const remainAbs = money(Math.abs(budVal - sumVal));
    remainWrap.classList.toggle("shop-progress__hero-remain--over", progressM.over);
    remainWrap.innerHTML = progressM.over
      ? `перевищено на <span class="num">${remainAbs}</span> / стеля <span class="num">${money(budVal)}</span>`
      : `залишилось <span class="num">${remainAbs}</span> / стеля <span class="num">${money(budVal)}</span>`;
  }
  const asciiBar = prog.querySelector(".shop-progress__ascii-bar");
  if (asciiBar) {
    const pct = progressM.over ? 100 : Math.min(97, Math.max(0, progressM.budgetPct));
    asciiBar.style.setProperty("--budget-pct", String(pct));
    asciiBar.title = progressM.over
      ? "Стелю перевищено — бар повний"
      : `Витрачено ${Math.round(progressM.budgetPct)}% стелі`;
    asciiBar.setAttribute("aria-label", asciiBar.title);
    const fill = asciiBar.querySelector(".shop-progress__ascii-fill");
    if (fill) fill.innerHTML = shopReceiptAsciiTexture(96, { withIcons: true });
    asciiBar.querySelector(".shop-progress__ascii-over")?.remove();
  }
  const meta = prog.querySelector(".shop-progress__meta");
  const acceptInline = prog.querySelector(".shop-progress__accept-inline");
  if (acceptInline) {
    acceptInline.textContent = `${progressM.ok}/${progressM.total || progressM.ok}`;
  }
  const acceptPill = prog.querySelector(".shop-progress__accept-pill");
  if (acceptPill) {
    acceptPill.textContent = `${progressM.ok}/${progressM.total || progressM.ok}`;
    acceptPill.style.setProperty("--accept-pct", String(progressM.acceptPct));
  }
  const sumEl = prog.querySelector(".shop-progress__inline-sum");
  if (sumEl) sumEl.textContent = money(sumVal);
  if (meta) {
    const nums = meta.querySelectorAll(".num");
    if (nums[0]) nums[0].textContent = `${progressM.ok}/${progressM.total || progressM.ok}`;
    if (nums[1]) nums[1].textContent = money(sumVal);
    if (nums[2]) nums[2].textContent = money(Math.abs(budVal - sumVal));
    if (nums[3]) nums[3].textContent = money(progressM.baseUah);
    if (nums[4] && progressM.moodUah > 0) nums[4].textContent = money(progressM.moodUah);
    let sportBit = meta.querySelector(".shop-progress__sport");
    const sportN = state.sportHandoff ? countSportDayExtras(state.extraQueries) : 0;
    const sportHtml = sportN > 0 ? `<span class="shop-progress__sport">з програми · ${sportN}</span>` : "";
    const hero = prog.querySelector(".shop-progress__hero");
    if (hero) {
      hero.querySelectorAll(".shop-progress__sport").forEach((el) => el.remove());
      if (sportHtml) hero.insertAdjacentHTML("beforeend", sportHtml);
    }
    if (sportN > 0) {
      if (!sportBit) {
        sportBit = document.createElement("span");
        sportBit.className = "shop-progress__sport";
        meta.appendChild(sportBit);
      }
      sportBit.textContent = `з програми · ${sportN}`;
    } else if (sportBit) {
      sportBit.remove();
    }
  }
}

function amountControlHtml(l, checked) {
  const amount = amountLabelFromLine(l) || (l.status === "missing" ? "—" : "1 шт");
  const canStep = Boolean(checked) && l.status !== "missing";
  if (!canStep) return `<p class="sku-amt">${esc(amount)}</p>`;
  return `<div class="qty-stepper" data-qty-wrap="${esc(l.role)}">
      <button type="button" class="qty-stepper__btn" data-qty-delta="-1" data-qty-role="${esc(l.role)}" aria-label="Зменшити кількість: ${esc(l.name || l.wanted || "")}">−</button>
      <span class="qty-stepper__val sku-amt" data-qty-amt="${esc(l.role)}">${esc(amount)}</span>
      <button type="button" class="qty-stepper__btn" data-qty-delta="1" data-qty-role="${esc(l.role)}" aria-label="Збільшити кількість: ${esc(l.name || l.wanted || "")}">+</button>
    </div>`;
}

function bindQtyButtons(scope = root) {
  scope.querySelectorAll("[data-qty-delta]").forEach((btn) => {
    if (btn.dataset.qtyBound) return;
    btn.dataset.qtyBound = "1";
    btn.onclick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      applyQty(btn.dataset.qtyRole, Number(btn.dataset.qtyDelta));
    };
  });
}

function patchLineAmountUi(art, line, checked) {
  const body = art.querySelector(".sku-body");
  if (!body) return;
  const prev = body.querySelector(".qty-stepper, p.sku-amt");
  const wrap = document.createElement("div");
  wrap.innerHTML = amountControlHtml(line, checked).trim();
  const node = wrap.firstElementChild;
  if (!node) return;
  if (prev) prev.replaceWith(node);
  else body.prepend(node);
  bindQtyButtons(art);
}

function applyQty(role, delta) {
  const vm = state.shopVm;
  if (!vm?.lines || !role) return;
  const idx = vm.lines.findIndex((l) => l.role === role);
  if (idx < 0) return;
  const result = applyQtyDelta(vm.lines[idx], state.qtyByRole, delta);
  if (!result.ok) {
    toast(
      result.reason === "min"
        ? "Мінімум 1 — зніміть галочку, щоб не брати"
        : "Максимум 99",
    );
    return;
  }
  state.qtyByRole = { ...state.qtyByRole, [role]: result.units };
  vm.lines[idx] = result.line;
  const art = root.querySelector(`article.sku[data-sku-role="${CSS.escape(role)}"]`);
  if (art) {
    const amt = art.querySelector(`[data-qty-amt="${CSS.escape(role)}"]`);
    if (amt) amt.textContent = result.line.amount || "";
    const priceEl = art.querySelector(".sku-price");
    if (priceEl && result.line.price != null) priceEl.textContent = money(result.line.price);
  }
  patchShopDock(vm);
  patchShopProgress(vm);
  announce(`${result.line.name || ""} · ${result.line.amount || ""}`);
}

/** Patch checklist accept UI in place — no remount. Returns false if full paint needed. */
function patchShopAcceptUi() {
  const vm = state.shopVm;
  if (!vm || state.screen !== "shop" || state.browse || state.picker) return false;
  const checklist = $("#shop-checklist");
  if (!checklist) return false;
  const removed = new Set(state.removed || []);

  for (const l of vm.lines || []) {
    if (removed.has(l.role)) continue;
    const art = checklist.querySelector(`article.sku[data-sku-role="${CSS.escape(l.role)}"]`);
    if (!art) continue;
    const canOk = l.status !== "missing";
    const checked = canOk && Boolean(state.accepted[l.role]);
    const dim = canOk && !checked;
    art.classList.toggle("sku--ok", checked);
    art.classList.toggle("sku--dim", dim);
    const input = art.querySelector("[data-ok]");
    if (input) {
      input.checked = checked;
      input.setAttribute("aria-label", `${checked ? "У чеку" : "Не в чеку"}: ${l.name || l.wanted || ""}`);
    }
    patchLineAmountUi(art, l, checked);
  }

  checklist.querySelectorAll(".group").forEach((g) => {
    const inputs = [...g.querySelectorAll("[data-ok]")];
    const okN = inputs.filter((inp) => inp.checked).length;
    const canN = inputs.length;
    const count = g.querySelector(".group-count");
    if (count) count.textContent = `${okN}/${canN || g.querySelectorAll("article.sku").length}`;
    const allBtn = g.querySelector("[data-group-accept]");
    if (allBtn && canN) {
      const allOn = okN === canN;
      allBtn.dataset.groupOn = allOn ? "0" : "1";
      allBtn.textContent = allOn ? "зняти" : "усі";
    }
  });

  patchShopDock(vm);
  patchShopProgress(vm);
  return true;
}

function shopPantryNudgeOpts() {
  return pantryNudgeOptsForHandoff({ sportHandoff: state.sportHandoff, kb: state.kb });
}

/** After program pick: survey once, then day. */
function enterSportDay({ editSurvey = false } = {}) {
  noteSportProgramChosen();
  stampSportProfileOnIntent();
  invalidateDayVmCache();
  if (editSurvey || !surveyIsComplete(loadSportSurvey())) {
    state.surveyDraft = normalizeSurvey(loadSportSurvey());
    state.screen = "survey";
  } else {
    state.surveyDraft = null;
    state.screen = "day";
    state.dayISO = dayKeyKyiv(new Date());
  }
  state.navLock = true;
  writeHash();
  render();
}

function sportDayResolveExtra() {
  const { plan, pack, resolveExtra } = resolveSportDayExtra({
    kb: state.kb,
    intentSport: state.intentSport,
    confirmed: state.confirmed,
    dayISO: currentDayISO(),
  });
  state._sportRationPlan = plan;
  state._contentSourcePack = pack;
  return resolveExtra;
}

function programsForPlace(list, place) {
  /* Home-only product: outdoor programs stay in KB but are not offered in pick/catalog. */
  void place;
  return programsForHome(list);
}

function placeFilterUa(place) {
  void place;
  return "вдома";
}

function applyAccept(role, on) {
  state.accepted = { ...state.accepted, [role]: on };
  const hadNudge = Boolean($("#shop-pantry-nudge"));
  const nextNudge = shopPantryNudge(
    state.shopVm?.lines || [],
    state.historyCache?.receipts || [],
    state.accepted,
    Date.now(),
    shopPantryNudgeOpts(),
  );
  // Pantry header derives from accepted — remount so nudge + covered row chips stay honest.
  if (hadNudge || nextNudge) {
    paintShop(state.intentShop, state.shopVm, false, { enter: false, keepScroll: true });
    return;
  }
  if (!patchShopAcceptUi()) {
    paintShop(state.intentShop, state.shopVm, false, { enter: false, keepScroll: true });
  }
}

function toast(msg) {
  announce(msg);
  const host = document.getElementById("toast-host");
  if (!host) return;
  host.innerHTML = `<div class="toast" role="status">${esc(msg)}</div>`;
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    host.innerHTML = "";
  }, 2400);
}

/**
 * Primary CTA busy feedback (spinner + label). DOM often remounts on next paint — no need to clear.
 * @param {HTMLElement | null | undefined} btn
 * @param {boolean} busy
 * @param {string} [label]
 */
function setPrimaryBusy(btn, busy, label = "Завантаження…") {
  if (!btn) return;
  if (busy) {
    if (btn.dataset.busy === "1") return;
    if (!btn.dataset.labelIdle) btn.dataset.labelIdle = (btn.textContent || "").trim();
    btn.dataset.busy = "1";
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    btn.classList.add("is-busy");
    btn.innerHTML = `<span class="btn-busy__spin" aria-hidden="true"></span><span class="btn-busy__label">${esc(label)}</span>`;
    return;
  }
  const idle = btn.dataset.labelIdle || "";
  btn.dataset.busy = "0";
  btn.disabled = false;
  btn.removeAttribute("aria-busy");
  btn.classList.remove("is-busy");
  if (idle) btn.textContent = idle;
  delete btn.dataset.labelIdle;
}

function dayResolveWaitHtml() {
  return `
    <section class="day-flow day-flow--wait day-flow--ds474" aria-busy="true" aria-live="polite">
      <header class="sport-chrome sport-chrome--inline day-flow__chrome">
        <div class="sport-chrome-top">
          <button type="button" class="back" id="back" aria-label="Назад" disabled>←</button>
          ${brandMarkHtml({ product: "sport", size: "chrome", tag: "h1", className: "sport-title sport-chrome__brand" })}
        </div>
      </header>
      <section class="day-sheet day-sheet--wait" aria-label="Завантаження">
        <div class="swap-wait" role="status">
          <div class="swap-track" aria-hidden="true"><div class="swap-fill"></div></div>
          <p>Підбираємо сесію й раціон…</p>
        </div>
        <div class="skel skel--lg" aria-hidden="true"></div>
        <div class="skel" aria-hidden="true"></div>
        <div class="skel" aria-hidden="true"></div>
      </section>
    </section>
  `;
}

/** Tip + one action (Floor 5 «Зняти з чеку»). Same host as toastUndo. */
function toastAction(msg, actionLabel, onAction, ms = 5200) {
  announce(`${msg} · ${actionLabel}`);
  const host = document.getElementById("toast-host");
  if (!host) return;
  host.innerHTML = `<button type="button" class="toast toast--undo" id="toast-action" role="status">${esc(msg)} · <u>${esc(actionLabel)}</u></button>`;
  const btn = $("#toast-action");
  if (btn) {
    btn.onclick = () => {
      host.innerHTML = "";
      clearTimeout(state.toastTimer);
      onAction?.();
    };
  }
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    host.innerHTML = "";
  }, ms);
}

function openMonthGoalEditor(anchorBtn) {
  const pulse = anchorBtn.closest(".home-pulse") || document.querySelector(".home-pulse--craft");
  const host = pulse || anchorBtn.parentElement;
  if (!host || !anchorBtn) return;
  let panel = host.querySelector(":scope > .home-pulse__goal-edit, .home-pulse__goal-edit");
  if (panel && panel.parentElement !== host) {
    panel.remove();
    panel = null;
  }
  const clearGoalEditChrome = () => {
    pulse?.classList.remove("home-pulse--goal-editing");
    pulse?.querySelector(":scope > .home-pulse__goal-scrim")?.remove();
    anchorBtn.setAttribute("aria-expanded", "false");
    if (pulse?._goalEditDocClear) {
      document.removeEventListener("pointerdown", pulse._goalEditDocClear, true);
      pulse._goalEditDocClear = null;
    }
  };
  if (panel && !panel.hidden) {
    panel.hidden = true;
    clearGoalEditChrome();
    return;
  }
  const spentHint = Number(document.querySelector(".home-pulse__spent")?.dataset?.count) || 0;
  const cur = loadMonthGoalUah(undefined, defaultMonthGoal(spentHint));
  if (!panel) {
    panel = document.createElement("div");
    panel.className = "home-pulse__goal-edit";
    panel.id = "month-goal-edit";
    host.appendChild(panel);
  } else if (panel.parentElement !== host) {
    host.appendChild(panel);
  }
  /** Scrim mutes tips/chart/SKU behind the form. */
  let scrim = pulse?.querySelector(":scope > .home-pulse__goal-scrim");
  if (pulse && !scrim) {
    scrim = document.createElement("button");
    scrim.type = "button";
    scrim.className = "home-pulse__goal-scrim";
    scrim.setAttribute("aria-label", "Закрити редагування цілі");
    pulse.insertBefore(scrim, panel);
  }
  pulse?.classList.add("home-pulse--goal-editing");
  pulse
    ?.querySelectorAll(".home-pulse__insight-tip, .home-pulse__orient-tip")
    .forEach((el) => {
      el.hidden = true;
    });
  pulse
    ?.querySelectorAll("[data-insight-panel], [data-days-pace-tip], [data-month-report-tip], [data-orientir-tip]")
    .forEach((el) => el.setAttribute("aria-expanded", "false"));
  panel.hidden = false;
  anchorBtn.setAttribute("aria-expanded", "true");
  panel.innerHTML = `
    <p class="home-pulse__goal-edit-k">М’яка ціль на місяць · не банківський ліміт</p>
    <label class="home-pulse__goal-edit-label" for="month-goal-input">Сума</label>
    <div class="home-pulse__goal-edit-row">
      <input id="month-goal-input" class="home-pulse__goal-edit-input num" type="number" inputmode="numeric" min="500" max="500000" step="100" value="${cur}" />
      <button type="button" class="home-pulse__goal-edit-save" data-goal-save>Зберегти</button>
    </div>
    <button type="button" class="home-pulse__goal-edit-cancel muted" data-goal-cancel>Скасувати</button>
  `;
  const input = panel.querySelector("#month-goal-input");
  const close = () => {
    panel.hidden = true;
    clearGoalEditChrome();
  };
  const save = () => {
    try {
      saveMonthGoalUah(input?.value);
      toast("Орієнтир збережено на пристрої");
      close();
      render();
    } catch {
      toast("Вкажіть суму від 500 до 500 000");
      input?.focus();
      input?.select();
    }
  };
  panel.querySelector("[data-goal-save]")?.addEventListener("click", (e) => {
    e.stopPropagation();
    save();
  });
  panel.querySelector("[data-goal-cancel]")?.addEventListener("click", (e) => {
    e.stopPropagation();
    close();
  });
  scrim?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    close();
  });
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  });
  const placePanel = () => {
    if (!pulse || !panel) return;
    const pr = pulse.getBoundingClientRect();
    const br = anchorBtn.getBoundingClientRect();
    const top = Math.max(8, br.bottom - pr.top + 8);
    panel.style.top = `${Math.round(top)}px`;
    panel.style.left = "12px";
    panel.style.right = "12px";
    panel.style.width = "auto";
  };
  requestAnimationFrame(() => {
    placePanel();
    input?.focus();
    input?.select();
  });
  const onDoc = (ev) => {
    if (!panel.contains(ev.target) && !anchorBtn.contains(ev.target) && !scrim?.contains(ev.target)) {
      close();
    }
  };
  if (pulse) {
    if (pulse._goalEditDocClear) document.removeEventListener("pointerdown", pulse._goalEditDocClear, true);
    pulse._goalEditDocClear = onDoc;
  }
  document.addEventListener("pointerdown", onDoc, true);
}

function go(screen, opts = {}) {
  if (screen === "day" && !opts.fromHash && !opts.forceDay) {
    state.confirmed = false;
    state.checkoutUrl = "";
    state.swaps = {};
    state.picker = null;
    state.browse = null;
    state.navLock = true;
    swapAbort?.abort();
    if (!opts.keepShop) {
      state.extraQueries = [];
      state.accepted = {};
      state.shopVm = null;
      state.shopDirty = true;
      state.qtyByRole = {};
      state.lists = null;
      state.sportHandoff = null;
      state.undoShop = null;
      state.recentShelfDismissed = new Set();
    }
    enterSportDay();
    return;
  }
  state.screen = screen;
  state.confirmed = false;
  state.checkoutUrl = "";
  state.swaps = {};
  state.picker = null;
  state.browse = null;
  state.navLock = true;
  swapAbort?.abort();
  if (screen === "sport") {
    state.sportTab = "wheel";
    if (!opts.keepSportPicker) state.sportProgramPickerOpen = false;
  }
  if (screen === "survey") state.surveyDraft = normalizeSurvey(loadSportSurvey());
  if (!opts.keepShop) {
    state.extraQueries = [];
    state.accepted = {};
    state.shopVm = null;
    state.shopDirty = true;
    state.qtyByRole = {};
    state.lists = null;
    state.sportHandoff = null;
    state.undoShop = null;
    state.recentShelfDismissed = new Set();
  }
  if (!opts.fromHash) writeHash();
  render();
}

function openLists(tab = "receipts") {
  state.lists = { tab, receiptId: null, baseId: null, selected: {} };
  state.browse = null;
  state.picker = null;
  setShopHash(shopListsHref(tab), { push: true });
  render();
}

function openReceiptDetail(id) {
  state.lists = { tab: "receipts", receiptId: String(id), baseId: null, selected: {} };
  state.browse = null;
  state.picker = null;
  setShopHash(shopReceiptHref(id), { push: true });
  render();
}

function openBaseDetail(id) {
  state.lists = { tab: "bases", receiptId: null, baseId: String(id), selected: {} };
  state.browse = null;
  state.picker = null;
  setShopHash(shopBaseHref(id), { push: true });
  render();
}

function closeLists() {
  state.lists = null;
  setShopHash("#/shop", { push: true });
  render();
}

async function enterShopFromPulse(receiptId) {
  state.screen = "shop";
  state.confirmed = false;
  state.checkoutUrl = "";
  state.browse = null;
  state.picker = null;
  state.lists = receiptId
    ? { tab: "receipts", receiptId: String(receiptId), selected: {} }
    : { tab: "receipts", receiptId: null, selected: {} };
  if (!state.shopVm) state.shopDirty = true;
  writeHash();
  await render();
}

/** Sport day → Express without go("shop") wipe. Sets handoff banner. */
function enterShopFromSport(programId, opts = {}) {
  state.sportHandoff = createSportHandoff({
    programId,
    kb: state.kb,
    intentSport: state.intentSport,
    dayISO: currentDayISO(),
  });
  state.handoffMetrics = bumpHandoffMetric(state.handoffMetrics, "enter");
  /* keep day extras — do not go("shop") wipe */
  state.screen = "shop";
  state.navLock = true;
  if (opts.browseQ) {
    return openBrowseSearch(String(opts.browseQ), { global: true });
  }
  writeHash();
  return render();
}

function sourceBadge() {
  if (!state.debug) return "";
  const st = state.mcpStatus;
  const probe = st?.probe?.http;
  const mode = state.lastSource || st?.mode || "fixture";
  return `<p class="muted">Полиця: <strong>${esc(mode)}</strong>${probe != null ? ` · MCP HTTP ${probe}` : ""} · токен на сервері: ${st?.tokenOnServer ? "так" : "ні"}</p>`;
}

function wrapSheet(inner) {
  if (!inner) return "";
  return `<div class="sheet" role="presentation"><button type="button" class="sheet-scrim" id="sheet-scrim" aria-label="Закрити"></button>${inner}</div>`;
}

const SEARCH_PH = {
  breads: "Батон, лаваш, хлібці…",
  protein: "Філе, яйця, риба…",
  veg: "Картопля, огірок…",
  extra: "Олія, соус, сметана…",
  preserve: "Мариновані огірки…",
  dairy: "Молоко, йогурт…",
  alcohol: "Пиво, Оболонь…",
};

function browsePlaceholder(group) {
  return SEARCH_PH[group] || "Назва товару…";
}

function closeBrowse() {
  state.browse = null;
  setShopHash("#/shop", { push: false });
  render();
}

function groupPath(group, groupTitle) {
  if (!group) return [{ kind: "root", id: "root", label: "Каталог" }];
  return [{ kind: "group", id: group, label: groupShortTitle(group) || groupTitle }];
}

function okLines(vm) {
  return (vm?.lines || []).filter((l) => state.accepted[l.role] && l.status !== "missing");
}

function okSum(vm) {
  return okLines(vm).reduce((s, l) => s + (Number(l.price) || 0), 0);
}

/** Map accepted lines → MCP cart product payloads (merge/top-up). */
function cartPushProductsFromVm(vm) {
  return okLines(vm)
    .map((l) => {
      const sku = l.sku || {};
      const qty = Number(l.quantity);
      return {
        productId: sku.productId || l.productId,
        companyId: sku.companyId,
        branchId: sku.branchId,
        quantity: Number.isFinite(qty) && qty > 0 ? qty : Math.max(1, Number(l.units) || 1),
        units: l.units,
        role: l.role,
        name: l.name,
      };
    })
    .filter((p) => p.productId && p.companyId);
}

/** Core + A: write accepted SKUs into live Silpo cart (merge), open checkout link. */
async function pushShopCartToSilpo() {
  if (state.cartPushing) return;
  const vm = state.shopVm;
  const lines = okLines(vm);
  if (!lines.length) {
    toast("Немає погоджених позицій");
    return;
  }

  if (state.confirmed && state.checkoutUrl) {
    window.open(state.checkoutUrl, "_blank", "noopener");
    return;
  }

  await refreshMcpStatusQuiet();
  if (!state.mcpStatus?.tokenOnServer) {
    toast("Увійдіть у Сільпо, щоб додати в кошик");
    try {
      sessionStorage.setItem("silpo.returnHash", "#/shop");
    } catch {
      /* ignore */
    }
    location.href = "/auth/start";
    return;
  }

  const products = cartPushProductsFromVm(vm);
  if (!products.length) {
    toast("Немає live SKU — оновіть список після входу в Сільпо");
    return;
  }

  state.cartPushing = true;
  paintShop(state.intentShop, state.shopVm, false, { enter: false, keepScroll: true });
  try {
    const r = await fetch("/api/cart/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products, merge: true }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401 || data.error === "login_required") {
      toast(data.message || "Увійдіть у Сільпо");
      location.href = data.login || "/auth/start";
      return;
    }
    if (!r.ok || !data.ok) {
      const why =
        data.message ||
        ({
          no_skus: "Немає валідних SKU",
          cart_context_incomplete: "Немає слота/гілки в кошику Сільпо",
          cart_write_failed: "Сільпо відхилив запис у кошик",
          mcp_init_failed: "MCP недоступний",
          tools_missing: "Немає tool запису кошика",
        }[data.error] ||
          data.error ||
          "не вдалося додати в кошик");
      toast(why);
      return;
    }

    state.confirmed = true;
    state.checkoutUrl = data.checkout || "";
    if (state.shopVm) {
      state.shopVm = { ...state.shopVm, checkout: state.checkoutUrl || state.shopVm.checkout || null };
    }
    const sportLinked =
      Boolean(state.sportHandoff) ||
      (state.extraQueries || []).some((q) => q?.from === "sport_day");
    if (sportLinked) {
      state.handoffMetrics = bumpHandoffMetric(state.handoffMetrics, "confirm_sport");
    }
    const skipped = Number(data.skipped) || 0;
    const already = Number(data.already) || 0;
    const added = Number(data.added) || 0;
    if (added === 0 && already > 0) {
      toast(data.message || `Уже в кошику · ${already} поз. без змін`);
    } else {
      const bits = [`Додано ${added}`];
      if (already) bits.push(`вже було ${already}`);
      if (skipped) bits.push(`пропущено ${skipped}`);
      toast(`${bits.join(" · ")} (долив)`);
    }
    if (state.checkoutUrl) {
      window.open(state.checkoutUrl, "_blank", "noopener");
    } else {
      toast("Кошик оновлено — відкрийте застосунок Сільпо");
    }
  } catch {
    toast("Помилка відправки в кошик Сільпо");
  } finally {
    state.cartPushing = false;
    render();
  }
}

async function refreshMcpStatusQuiet() {
  try {
    state.mcpStatus = await fetch("/api/mcp/status").then((r) => r.json());
  } catch {
    /* keep previous */
  }
}

/** Seed default-on accept for non-missing lines; never force missing on. */
function ensureAcceptedDefaults(vm) {
  const next = { ...state.accepted };
  let changed = false;
  for (const l of vm?.lines || []) {
    const role = l.role;
    if (!role) continue;
    if (l.status === "missing") {
      if (next[role]) {
        delete next[role];
        changed = true;
      }
      continue;
    }
    if (!(role in next)) {
      next[role] = true;
      changed = true;
    }
  }
  if (changed) state.accepted = next;
}

function localFacets(line) {
  const group = line.group || groupOfQuery(line.wanted || line.staple || line.name);
  return slotsForGroup(group).map((s) => ({
    kind: "slot",
    id: s.id,
    title: s.title,
    staple: s.staple,
    q: s.q,
  }));
}

function localShopVm(intent, extra = {}) {
  return runPipeline(intent, state.kb, state.shelf, { ...extra, debug: state.debug }).vm;
}

/** Stamp body profile onto sport intent so /api/resolve compose sees sex/bodyGoal (no LS on server). */
function stampSportProfileOnIntent() {
  const p = loadSportProfile();
  if (!profileIsComplete(p)) return;
  const c = state.intentSport.constraints;
  c.sex = p.sex;
  c.age = p.age;
  c.heightCm = p.heightCm;
  c.weightKg = p.weightKg;
  c.bodyGoal = p.bodyGoal;
  c.profileAt = p.completedAt || "";
}

/** Cache key for day VM — not dayISO (KB session + ration queries are day-agnostic). */
function dayVmFingerprint() {
  const c = state.intentSport?.constraints || {};
  const prefs = loadSportSurvey();
  return JSON.stringify({
    programId: c.programId || "",
    level: c.level || "beginner",
    steps: clampWalkSteps(c.steps || 6000),
    confirmed: Boolean(state.confirmed),
    partner: loadActiveContentSourceId() || "",
    avoid: prefs?.avoidIds || [],
    diet: prefs?.dietTags || [],
    cook: prefs?.cookMode || "any",
    sex: c.sex || "",
    bodyGoal: c.bodyGoal || "",
    age: c.age ?? "",
  });
}

function invalidateDayVmCache() {
  state._dayVmCache = null;
}

async function resolveVm(intent, extra = {}) {
  const { signal, ...payload } = extra;
  try {
    const timeout = typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(20000) : null;
    let fetchSignal = signal || timeout || undefined;
    if (signal && timeout && typeof AbortSignal.any === "function") {
      fetchSignal = AbortSignal.any([signal, timeout]);
    } else if (signal && timeout) {
      fetchSignal = signal;
    }
    const r = await fetch("/api/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: fetchSignal,
      body: JSON.stringify({ intent, ...payload, debug: state.debug }),
    });
    if (!r.ok) throw new Error("resolve_http");
    const data = await r.json();
    state.lastSource = data.source;
    return data.vm;
  } catch (e) {
    if (e?.name === "AbortError" && signal?.aborted) throw e;
    const { vm } = runPipeline(intent, state.kb, state.shelf, { ...payload, debug: state.debug });
    state.lastSource = "fixture_client";
    return vm;
  }
}

async function render() {
  if (!state.kb) return;
  const seq = ++state.renderSeq;
  if (state.screen === "home") {
    await ensureHistoryCache();
    const hasToken = Boolean(state.mcpStatus?.tokenOnServer);
    const staticHost = state.mcpStatus?.mode === "static_host";
    const sessionChip = hasToken
      ? `<span class="home-nav__mcp is-on" role="status"><span class="home-nav__mcp-dot" aria-hidden="true"></span>підключено</span>`
      : staticHost
        ? `<span class="home-nav__mcp is-off" role="status" title="Живий логін Сільпо — локально: node server.mjs">демо</span>`
        : `<a class="home-nav__mcp is-off" href="/auth/start">Увійти</a>`;
    paint(
      `
      <section class="home-hero home-hero--need" aria-label="СільпоSE">
        <div class="home-hero__wash" aria-hidden="true"></div>
        <header class="home-nav">
          <div class="home-nav__brand-block">
            ${brandMarkHtml({ product: "sportExpress", size: "hero", tag: "span", className: "home-nav__brand" })}
            <span class="home-nav__whisper">думаємо про ваш ритм</span>
          </div>
          ${sessionChip}
        </header>
        ${sourceBadge()}
        <div class="home-rituals home-rituals--sport" role="list">
          <button type="button" class="home-ritual" data-go="sport" role="listitem">
            <span class="home-ritual__copy">
              <strong class="home-ritual__title">${brandMarkHtml({ product: "sport", size: "card" })}</strong>
              <span class="home-ritual__desc">Заняття · раціон з чеків</span>
            </span>
            <span class="home-stat__cta">
              Пігнали
              <span class="home-stat__ico" aria-hidden="true">↗</span>
            </span>
          </button>
        </div>
        ${homeSportPulseHtml()}
        <div class="home-rituals" role="list">
          <button type="button" class="home-ritual" data-go="shop" role="listitem">
            <span class="home-ritual__copy">
              <strong class="home-ritual__title">${brandMarkHtml({ product: "express", size: "card" })}</strong>
              <span class="home-ritual__desc">Чеклист з чеків · заміни · групи</span>
            </span>
            <span class="home-stat__cta">
              Замовити
              <span class="home-stat__ico" aria-hidden="true">↗</span>
            </span>
          </button>
        </div>
        ${homePulseHtml(hasToken)}
        ${homeBaseChipHtml()}
        <details class="jury home-jury">
          <summary>для журі · ds200</summary>
          <p class="muted">Без входу — демо-чеки. Після входу токен на сервері; pulse тягне /api/history.</p>
          ${
            hasToken
              ? `<p class="home-badge home-badge--jury" title="MCP токен на сервері"><span class="home-badge__dot" aria-hidden="true"></span>токен на сервері</p>`
              : ""
          }
          <label class="muted"><input type="checkbox" id="dbg" ${state.debug ? "checked" : ""}/> показати debug</label>
        </details>
      </section>
    `,
      () => {
        root.querySelectorAll("[data-go]").forEach((b) => {
          b.onclick = () => go(b.dataset.go);
        });
        root.querySelectorAll("[data-pulse-receipt]").forEach((b) => {
          b.onclick = () => {
            void enterShopFromPulse(b.dataset.pulseReceipt);
          };
        });
        root.querySelectorAll("[data-pulse-lists]").forEach((b) => {
          b.onclick = () => {
            void enterShopFromPulse(null);
          };
        });
        root.querySelectorAll("[data-open-base]").forEach((b) => {
          b.onclick = () => {
            const id = b.dataset.openBase;
            if (id) openBaseDetail(id);
            else openLists("bases");
          };
        });
        bindHomePulseCard({ quiet: false });
        runHomeSportCountUp();
        root.querySelectorAll(".home-pulse--sport [data-go]").forEach((b) => {
          b.onclick = () => go(b.dataset.go);
        });
        const dbg = $("#dbg");
        if (dbg) {
          dbg.onchange = (e) => {
            state.debug = e.target.checked;
            render();
          };
        }
      },
    );
    return;
  }
  if (state.screen === "sport" || state.screen === "day" || state.screen === "survey") await renderSport(seq);
  if (state.screen === "shop") await renderShop(seq);
}

const MONTH_UA = {
  "01": "січень",
  "02": "лютий",
  "03": "березень",
  "04": "квітень",
  "05": "травень",
  "06": "червень",
  "07": "липень",
  "08": "серпень",
  "09": "вересень",
  "10": "жовтень",
  "11": "листопад",
  "12": "грудень",
};

const MONTH_UA_LOC = {
  "01": "січні",
  "02": "лютому",
  "03": "березні",
  "04": "квітні",
  "05": "травні",
  "06": "червні",
  "07": "липні",
  "08": "серпні",
  "09": "вересні",
  "10": "жовтні",
  "11": "листопаді",
  "12": "грудні",
};

function monthLabelUa(monthKey) {
  const m = String(monthKey || "").slice(5, 7);
  return (MONTH_UA[m] || monthKey || "").toUpperCase();
}

/** Days left in calendar month for current pulse month; null for archive. Compact copy: `ще 9 дн.` */
function daysLeftInPulseMonth(monthKey) {
  const key = String(monthKey || "");
  if (!/^\d{4}-\d{2}$/.test(key) || key !== currentMonthKey()) return null;
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7));
  if (!y || !m) return null;
  const last = new Date(y, m, 0).getDate();
  const now = new Date();
  if (now.getFullYear() !== y || now.getMonth() + 1 !== m) return null;
  return Math.max(0, last - now.getDate());
}

function monthLabelLocative(monthKey) {
  const m = String(monthKey || "").slice(5, 7);
  return MONTH_UA_LOC[m] || monthLabelUa(monthKey).toLowerCase();
}

function defaultMonthGoal(spentUah = 0) {
  const budget = Number(state.intentShop.constraints.budgetUah) || 1500;
  return resolveMonthGoalUah(undefined, { spentUah, weekBudget: budget }).goalUah;
}

function channelLabelUa(channel) {
  if (channel === "online") return "онлайн";
  if (channel === "offline") return "зал";
  return "";
}

function shortSkuName(name) {
  const s = String(name || "").trim();
  if (s.length <= 22) return s;
  return `${s.slice(0, 20)}…`;
}

/** Longer label for elev tips (CSS still clamps to 2 lines). */
function tipSkuName(name, max = 52) {
  const s = String(name || "").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function homeBaseChipHtml() {
  const bases = loadBases()
    .slice()
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  const last = bases[0];
  if (!last) return "";
  const n = (last.lines || []).length;
  return `
    <button type="button" class="home-base-chip" data-open-base="${esc(last.id)}">
      <span class="home-base-chip__kicker">БАЗА НА ПРИСТРОЇ</span>
      <strong class="home-base-chip__title">${esc(last.title)}</strong>
      <span class="home-base-chip__meta muted">${n} поз. · відкрити</span>
    </button>`;
}

function homeSportPulseHtml() {
  const receipts = state.historyCache?.receipts || [];
  const nav = resolveSportPulseMonthNav(receipts);
  const monthKey = nav.monthKey;
  const model = sportHomePulseModel({
    receipts,
    kb: state.kb,
    intentSport: state.intentSport,
    monthKey,
    levelUa: levelUa(),
  });
  const card = sportExpressCardModel({
    receipts,
    monthKey,
    ritualDays: model.ritualDays,
    sessionGoal: loadSportSessionGoal(),
    dailyBudget: estimateDailyKcalFromProfile(loadSportProfile()),
  });
  const chartW = pulseChartWidth(".home-pulse--sport .home-pulse__spark-wrap--sport");
  const xPad = 2;
  const curSeries = card.series || [];
  const { older: olderKeys, newer: newerKeys } = neighborMonthKeys(nav.keys, monthKey, 2);
  const strip = buildSparkPanStripFromNeighbors({
    older: olderKeys.map((mk) =>
      sportMonthWeekChartSeries({
        receipts,
        monthKey: mk,
        dailyBudget: card.dailyBudget,
      }),
    ),
    cur: curSeries,
    newer: newerKeys.map((mk) =>
      sportMonthWeekChartSeries({
        receipts,
        monthKey: mk,
        dailyBudget: card.dailyBudget,
      }),
    ),
  });
  const seriesStrip = strip.series;
  const curStart = strip.curStartIdx;
  const refLen = Math.max(2, curSeries.length, ...(strip.segmentLens || []));
  const pitch = (chartW - 2 * xPad) / (refLen - 1);
  const stripW =
    seriesStrip.length > 1 ? Math.round(2 * xPad + pitch * (seriesStrip.length - 1)) : chartW;
  const sparkRestX = Math.round(curStart * pitch);
  const sparkPeekLeft = sparkRestX;
  const sparkPeekRight = Math.max(0, stripW - sparkRestX - chartW);
  const sparkCommitPrev = Math.round((Number(strip.nearestOlderLen) || 0) * pitch);
  const sparkCommitNext =
    Number(strip.nearestNewerLen) > 0
      ? Math.round((Number(strip.curLen) || curSeries.length || 0) * pitch)
      : 0;
  const sparkSegLens = (strip.segmentLens || [curSeries.length]).join(",");
  const sparkSegI = Number(strip.centerSegIndex) || 0;
  // Express twin: weekPace = weekly budget (daily*7), not month/4.5 hack
  const weekPace = Math.max(1, Number(card.dailyBudget) || 0) * 7;
  const yMax = sportSparkSharedYMaxes(seriesStrip, {
    historyKcalMax: historyWeekKcalMax(receipts),
    historySessionsMax: historyWeekSessionsMax(),
    weekPace,
    sessionGoal: card.sessionGoal || SPORT_SESSION_GOAL,
  });
  const geom = sportSparkGeom(seriesStrip, stripW, 108, {
    xPad,
    maxKcal: yMax.kcal,
    maxSessions: yMax.sessions,
  });
  const orient = sportOrientirModel({
    ritualDays: model.ritualDays || card.sessionsDone,
    sessionScore: model.sessionScore,
    fullDays: model.fullDays,
    partialDays: model.partialDays,
    visits: 0,
    goalDays: card.sessionGoal,
  });
  const monthShort = monthLabelUa(monthKey).toLowerCase();
  const orientArrow = orient.over
    ? `<span class="home-pulse__dir" aria-hidden="true">↑</span>`
    : `<span class="home-pulse__dir" aria-hidden="true">↓</span>`;
  const orientBody = sportOrientirTipHtml(orient, monthKey);
  const statusPct =
    orient.unit === "empty"
      ? `<span class="home-pulse__kicker-pct-wrap">
          <button type="button" class="home-pulse__kicker-start home-pulse__phrase-btn" data-orientir-tip="1" aria-expanded="false" aria-controls="sport-orientir-tip" aria-label="Почни з дня. Пояснення орієнтира">
            <span class="home-pulse__pct-pill home-pulse__pct-pill--start" aria-hidden="true">·</span>
            <span class="home-pulse__pct-trail">почни з дня</span>
          </button>
          <div class="home-pulse__orient-tip" id="sport-orientir-tip" role="tooltip" hidden>${orientBody}</div>
        </span>`
      : `<span class="home-pulse__kicker-pct-wrap">
          <button type="button" class="home-pulse__kicker-pct home-pulse__phrase-btn" data-orientir-tip="1" aria-expanded="false" aria-controls="sport-orientir-tip" aria-label="${orient.pct}% від орієнтира. Пояснення орієнтира">
            <span class="home-pulse__pct-pill num">${orientArrow}${orient.pct}%</span>
            <span class="home-pulse__pct-trail">від орієнтира</span>
          </button>
          <div class="home-pulse__orient-tip" id="sport-orientir-tip" role="tooltip" hidden>${orientBody}</div>
        </span>`;
  const monthPrevBtn = `<button type="button" class="home-pulse__month-btn" data-sport-month-dir="-1" ${nav.canPrev ? "" : "disabled "}aria-label="Попередній місяць">‹</button>`;
  const monthNextBtn = `<button type="button" class="home-pulse__month-btn" data-sport-month-dir="1" ${nav.canNext ? "" : "disabled "}aria-label="Наступний місяць">›</button>`;
  const archiveMark = nav.isArchive
    ? `<button type="button" class="home-pulse__archive-mark" data-sport-month-now aria-label="Повернутись до поточного місяця">повернутись</button>`
    : "";
  const whisperPct = Math.min(100, Number(orient.pctBar) || 0);
  const whisperHtml = `<div class="home-pulse__whisper${orient.over ? " is-met" : ""}" aria-hidden="true"><i style="width:${whisperPct}%"></i></div>`;
  const kcalFoot =
    card.dishes > 0
      ? `<span class="home-pulse__insight home-pulse__insight--under home-pulse__insight--compact" aria-label="${formatIntUa(card.kcal)} ккал · ${card.dishes} ${uaDishes(card.dishes)}">
            <span class="home-pulse__delta-chip num is-down">${esc(String(card.dishes))}</span>
            <span class="home-pulse__insight-trail">${esc(uaDishes(card.dishes))}</span>
          </span>`
      : `<span class="home-pulse__insight home-pulse__insight--under home-pulse__insight--solo">ккал з чеків</span>`;
  const kcalTone = card.kcalHot ? "is-hot" : "is-ok";
  const pencilIco = `<span class="home-pulse__goal-line-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></span>`;
  const lastIdx = Math.max(0, curSeries.length - 1);
  const stripLastIdx = Math.max(0, geom.coords.length - 1);
  const seriesAsSpend = seriesStrip.map((s) => ({
    weekStart: s.weekStart || s.day,
    uah: Number(s.kcal) || 0,
    prior: Boolean(s.prior),
    dayNum: s.dayNum,
    sessions: s.sessions,
    kcal: s.kcal,
  }));
  const rankedWeeks = geom.coords
    .map((c) => {
      const inCur = c.i >= curStart && c.i < curStart + curSeries.length;
      if (!inCur) return null;
      const curIdx = c.i - curStart;
      if (!(c.uah > 0) || curSeries[curIdx]?.prior) return null;
      return { i: curIdx, uah: c.uah };
    })
    .filter(Boolean)
    .sort((a, b) => b.uah - a.uah);
  // Express hotIds: pace*1.15 top3, then pad via tops — Sport pads with top ranked
  const hotIds = new Set(
    rankedWeeks
      .filter((c) => weekPace > 0 && c.uah > weekPace * 1.15)
      .slice(0, 3)
      .map((c) => c.i),
  );
  for (const c of rankedWeeks) {
    if (hotIds.size >= 3) break;
    hotIds.add(c.i);
  }
  if (hotIds.size > 3) {
    const keep = rankedWeeks.filter((c) => hotIds.has(c.i)).slice(0, 3).map((c) => c.i);
    hotIds.clear();
    keep.forEach((i) => hotIds.add(i));
  }
  const chartGrid = pulseChartGridSvg(geom);
  const weekBadges = weekBadgeModels(seriesAsSpend, geom, weekPace).filter((b) => {
    const inCur = b.i >= curStart && b.i < curStart + curSeries.length;
    const curIdx = b.i - curStart;
    if (b.prior) return true;
    if (inCur) return hotIds.has(curIdx) || curIdx === lastIdx;
    return b.uah > 0;
  });
  const foodBadgesHtml = weekBadges
    .map((b) => {
      const row = seriesStrip[b.i];
      if (!row) return "";
      const inCur = b.i >= curStart && b.i < curStart + curSeries.length;
      const curIdx = b.i - curStart;
      const val = formatIntUa(b.uah);
      const viewX = Number(b.peakX) - sparkRestX;
      const atStart = b.i === 0 || viewX < 40;
      const atEnd = b.i === stripLastIdx || viewX > chartW - 40;
      const left =
        atStart && b.i === 0
          ? 0
          : atEnd && b.i === stripLastIdx
            ? 100
            : geom.w > 0
              ? (b.peakX / geom.w) * 100
              : 0;
      const top = geom.h > 0 ? (b.peakY / geom.h) * 100 : 0;
      const cls = [
        "home-pulse__week-badge",
        "home-pulse__week-badge--food",
        "num",
        b.over && inCur ? "is-over" : "",
        b.prior ? "is-prior" : "",
        atStart ? "is-edge-start" : "",
        atEnd ? "is-edge-end" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const tipAttr =
        inCur && !b.prior
          ? ` data-sport-day="${curIdx}" data-tip-x="${Number(b.peakX || 0).toFixed(1)}" data-tip-y="${Number(b.peakY || 0).toFixed(1)}" tabindex="0" role="button"`
          : "";
      const title = b.prior ? `Минулий місяць · ${val} ккал` : `Тиждень з ${row.dayNum} · ${val} ккал`;
      const weekStart = row.weekStart || row.day || "";
      return `<span class="${cls}" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%" title="${esc(title)}" data-week-start="${esc(String(weekStart))}" data-peak-x="${Number(b.peakX || 0).toFixed(1)}"${tipAttr}>${esc(val)}</span>`;
    })
    .join("");
  const sportCoords = geom.sport?.coords || geom.peer?.coords || [];
  const rankedSessions = sportCoords
    .map((c) => {
      const row = seriesStrip[c.i];
      const inCur = c.i >= curStart && c.i < curStart + curSeries.length;
      const curIdx = inCur ? c.i - curStart : -1;
      return {
        i: c.i,
        curIdx,
        inCur,
        sessions: Number(row?.sessions) || 0,
        x: c.x,
        y: c.y,
        prior: Boolean(row?.prior),
      };
    })
    .filter((r) => r.sessions > 0);
  const sportBadgeIds = new Set();
  // Express parity: prior (if real) + top peaks in cur + last week — not every strip peek
  rankedSessions
    .filter((r) => r.inCur && r.prior && r.sessions > 0)
    .forEach((r) => sportBadgeIds.add(r.i));
  rankedSessions
    .filter((r) => r.inCur && !r.prior)
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 3)
    .forEach((r) => sportBadgeIds.add(r.i));
  rankedSessions
    .filter((r) => r.inCur && r.curIdx === lastIdx && !r.prior)
    .forEach((r) => sportBadgeIds.add(r.i));
  const foodBadgeByWeek = new Map(
    weekBadges.map((b) => {
      const row = seriesStrip[b.i];
      const wk = row?.weekStart || row?.day || String(b.i);
      return [wk, b];
    }),
  );
  const sportBadgesHtml = [...sportBadgeIds]
    .map((i) => {
      const row = seriesStrip[i];
      const c = sportCoords[i];
      if (!row || !c || !(Number(row.sessions) > 0)) return "";
      const inCur = i >= curStart && i < curStart + curSeries.length;
      const curIdx = i - curStart;
      const val = String(row.sessions);
      const viewX = Number(c.x) - sparkRestX;
      const atStart = i === 0 || viewX < 40;
      const atEnd = i === stripLastIdx || viewX > chartW - 40;
      const left =
        atStart && i === 0
          ? 0
          : atEnd && i === stripLastIdx
            ? 100
            : geom.w > 0
              ? (c.x / geom.w) * 100
              : 0;
      const weekStart = row.weekStart || row.day || "";
      const foodPeer = foodBadgeByWeek.get(weekStart);
      // Prefer below food peer when same week; overlap resolver may nudge further
      let topPct = geom.h > 0 ? (c.y / geom.h) * 100 : 0;
      if (foodPeer && geom.h > 0) {
        const foodTop = (Number(foodPeer.peakY) / geom.h) * 100;
        topPct = Math.max(topPct + 12, foodTop + 16);
      } else {
        topPct += 12;
      }
      const top = Math.min(94, topPct);
      const cls = [
        "home-pulse__week-badge",
        "home-pulse__week-badge--sport",
        "num",
        row.prior ? "is-prior" : "",
        atStart ? "is-edge-start" : "",
        atEnd ? "is-edge-end" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const tipAttr =
        inCur && !row.prior
          ? ` data-sport-day="${curIdx}" data-tip-x="${c.x.toFixed(1)}" data-tip-y="${c.y.toFixed(1)}" tabindex="0" role="button"`
          : "";
      const title = row.prior ? `Минулий місяць · ${val} зан.` : `Тиждень з ${row.dayNum} · ${val} зан.`;
      return `<span class="${cls}" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%" title="${esc(title)}" data-week-start="${esc(String(weekStart))}" data-peak-x="${Number(c.x || 0).toFixed(1)}"${tipAttr}>${esc(val)}</span>`;
    })
    .join("");
  const dayBadgesHtml = `${foodBadgesHtml}${sportBadgesHtml}`;
  const marksSvg = geom.coords
    .map((c) => {
      const row = seriesStrip[c.i];
      if (!row) return "";
      const prior = Boolean(row.prior);
      const kcal = Number(row.kcal) || 0;
      const sessions = Number(row.sessions) || 0;
      const sc = sportCoords[c.i];
      const inCur = c.i >= curStart && c.i < curStart + curSeries.length;
      const curIdx = c.i - curStart;
      const tipX = `data-tip-x="${c.x.toFixed(1)}" data-tip-y="${c.y.toFixed(1)}"`;
      const dayAttr = inCur ? ` data-sport-day="${curIdx}"` : "";
      const parts = [];
      if (sc && sessions > 0) {
        const hotS = inCur && !prior && sportBadgeIds.has(c.i);
        if (prior || !inCur) {
          parts.push(
            `<circle class="home-pulse__mark home-pulse__mark--sport is-prior" data-prior="1" data-week-uah="${sessions}" cx="${sc.x.toFixed(1)}" cy="${sc.y.toFixed(1)}" r="3.5" aria-label="Минулий місяць · заняття" />`,
          );
        } else if (hotS) {
          parts.push(
            `<circle class="home-pulse__mark home-pulse__mark--sport is-hot"${dayAttr} ${tipX} data-week-uah="${sessions}" cx="${sc.x.toFixed(1)}" cy="${sc.y.toFixed(1)}" r="5.5" tabindex="0" role="button" aria-label="Заняття · тиждень з ${row.dayNum}" />`,
          );
        } else if (curIdx === lastIdx) {
          parts.push(
            `<circle class="home-pulse__mark home-pulse__mark--sport is-now"${dayAttr} ${tipX} data-week-uah="${sessions}" cx="${sc.x.toFixed(1)}" cy="${sc.y.toFixed(1)}" r="3.75" />`,
          );
        } else {
          parts.push(
            `<circle class="home-pulse__mark home-pulse__mark--sport is-soft"${dayAttr} ${tipX} data-week-uah="${sessions}" cx="${sc.x.toFixed(1)}" cy="${sc.y.toFixed(1)}" r="2.6" aria-hidden="true" />`,
          );
        }
      }
      if (!(kcal > 0) && !prior) return parts.join("");
      if (prior && !(kcal > 0)) return parts.join("");
      const hot = inCur && !prior && hotIds.has(curIdx);
      const isNow = inCur && !prior && curIdx === lastIdx;
      if (prior || !inCur) {
        parts.push(
          `<circle class="home-pulse__mark home-pulse__mark--food is-prior" data-prior="1" ${tipX} data-week-uah="${kcal}" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3.5" aria-label="Минулий місяць · раціон" />`,
        );
      } else if (hot) {
        parts.push(
          `<circle class="home-pulse__mark home-pulse__mark--food is-hot"${dayAttr} ${tipX} data-week-uah="${kcal}" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="5.5" tabindex="0" role="button" aria-label="Раціон · тиждень з ${row.dayNum}" />`,
        );
      } else if (isNow) {
        parts.push(
          `<circle class="home-pulse__mark home-pulse__mark--food is-now"${dayAttr} ${tipX} data-week-uah="${kcal}" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3.75" />`,
        );
      } else if (kcal > 0) {
        parts.push(
          `<circle class="home-pulse__mark home-pulse__mark--food is-soft"${dayAttr} ${tipX} data-week-uah="${kcal}" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="2.6" aria-hidden="true" />`,
        );
      }
      return parts.join("");
    })
    .join("");
  const weekAxis = geom.coords
    .map((c) => {
      const row = seriesStrip[c.i];
      if (!row) return "";
      const inCur = c.i >= curStart && c.i < curStart + curSeries.length;
      const curIdx = c.i - curStart;
      const viewX = Number(c.x) - sparkRestX;
      const atStart = c.i === 0 || viewX < 40;
      const atEnd = c.i === stripLastIdx || viewX > chartW - 40;
      const left =
        atStart && c.i === 0
          ? 0
          : atEnd && c.i === stripLastIdx
            ? 100
            : geom.w > 0
              ? (c.x / geom.w) * 100
              : 0;
      const cls = [
        "home-pulse__week-tick",
        "home-pulse__week-tick--day",
        row.prior || !inCur ? "is-prior" : "",
        atStart ? "is-edge-start" : "",
        atEnd ? "is-edge-end" : "",
        inCur && hotIds.has(curIdx) ? "is-hot" : "",
        inCur && !row.prior && curIdx === lastIdx ? "is-now" : "",
        (Number(row.kcal) || 0) > 0 || (Number(row.sessions) || 0) > 0 ? "is-spend" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const dayAttr = inCur ? ` data-sport-day="${curIdx}"` : "";
      return `<span class="${cls}"${dayAttr} data-peak-x="${Number(c.x || 0).toFixed(1)}" style="left:${left.toFixed(2)}%">${esc(String(row.dayNum))}</span>`;
    })
    .join("");
  const programLine = `${model.programTitle} · ${model.levelUa}${card.sessionsDone > 0 ? ` · зроблено ${card.sessionsDone}` : ""}`;
  const daysLeftSport = daysLeftInPulseMonth(monthKey);
  const softRationMonth = rationCoverageHitsInMonth(monthKey);
  const loopGapHome = loopGapModel({
    ritualDays: model.ritualDays,
    softRationHits: softRationMonth,
  });
  const daysPaceTipSport =
    daysLeftSport != null
      ? sportDaysPaceTipHtml({
          daysLeft: daysLeftSport,
          leftSessions: card.leftSessions,
          sessionsDone: card.sessionsDone,
          sessionGoal: card.sessionGoal,
          kcal: card.kcal,
          dishes: card.dishes,
          loopGap: loopGapHome,
        })
      : "";
  const reportTipSport = nav.isArchive
    ? sportMonthReportTipHtml({
        monthKey,
        sessionsDone: card.sessionsDone,
        sessionGoal: card.sessionGoal,
        kcal: card.kcal,
        dishes: card.dishes,
      })
    : "";
  const daysMetaSport =
    daysLeftSport != null
      ? `<span class="home-pulse__delta-meta home-pulse__delta-meta--pace">
            <span class="home-pulse__delta-wrap">
              <button type="button" class="home-pulse__phrase-btn" data-days-pace-tip="1" aria-expanded="false" aria-controls="sport-days-pace-tip" aria-label="На ${daysLeftSport} дн. до кінця місяця. Поради щодо занять і раціону">
                <span class="home-pulse__delta-meta-lead">на</span>
                <span class="home-pulse__delta-chip num">${daysLeftSport}</span>
                <span class="home-pulse__delta-meta-trail">дн.</span>
              </button>
              <div class="home-pulse__insight-tip" id="sport-days-pace-tip" role="tooltip" hidden>${daysPaceTipSport}</div>
            </span>
          </span>`
      : nav.isArchive
        ? `<span class="home-pulse__delta-meta home-pulse__delta-meta--report">
            <span class="home-pulse__delta-wrap">
              <button type="button" class="home-pulse__phrase-btn home-pulse__delta-chip home-pulse__delta-chip--report" data-month-report-tip="1" aria-expanded="false" aria-controls="sport-month-report-tip" aria-label="Звіт за місяць СільпоSport">звіт за міс.</button>
              <div class="home-pulse__insight-tip" id="sport-month-report-tip" role="tooltip" hidden>${reportTipSport}</div>
            </span>
          </span>`
        : "";
  return `
    <section class="home-pulse home-pulse--sport home-pulse--peer home-pulse--story home-pulse--v5e home-pulse--sport-express${card.kcalHot ? " is-kcal-hot" : ""}${nav.isArchive ? " home-pulse--archive" : ""}${card.demo ? " is-demo-series" : ""}" aria-label="СільпоSport · ${esc(programLine)}" data-sport-month-key="${esc(monthKey)}" data-sport-chart-w="${chartW}" data-sport-budget="${card.dailyBudget}">
      <div class="home-pulse__status-band">
        <div class="home-pulse__month-nav" role="group" aria-label="Місяць СільпоSport">
          ${monthPrevBtn}
          <span class="home-pulse__status-month">${esc(monthShort)}</span>
          ${monthNextBtn}
          ${archiveMark}
        </div>
        ${statusPct}
      </div>
      ${whisperHtml}
      <div class="home-pulse__story-pad">
        <div class="home-pulse__head home-pulse__head--tri">
          <div class="home-pulse__col home-pulse__col--plan">
            <span class="home-pulse__metric-k">спорт заняття</span>
            <p class="home-pulse__metric-num num is-ok" data-sport-count="${card.sessionGoal}">${esc(String(card.sessionGoal))}</p>
            <div class="home-pulse__col-foot">
              <button type="button" class="home-pulse__goal-change" id="edit-sport-session-goal" aria-expanded="false" aria-controls="sport-session-goal-edit" aria-label="Ціль ${card.sessionGoal} занять. Змінити">
                ${pencilIco}<span>змінити</span>
              </button>
            </div>
          </div>
          <div class="home-pulse__col home-pulse__col--spent">
            <span class="home-pulse__metric-k">харчовий раціон</span>
            <p class="home-pulse__metric-num home-pulse__spent home-pulse__spent--sport num ${kcalTone}" data-sport-kcal="${card.kcal}">${esc(formatIntUa(card.kcal))}</p>
            <div class="home-pulse__col-foot">${kcalFoot}</div>
          </div>
          <div class="home-pulse__col home-pulse__col--delta ${card.overSessions ? "is-over" : "is-ok"}">
            <span class="home-pulse__metric-k">${card.overSessions ? "понад" : "залишилось"}</span>
            <p class="home-pulse__metric-num home-pulse__delta-num num">${esc(String(card.overSessions ? card.sessionsDone - card.sessionGoal : card.leftSessions))}</p>
            <div class="home-pulse__col-foot">
              ${daysMetaSport}
            </div>
          </div>
        </div>
      </div>
      <div class="home-pulse__spark-wrap home-pulse__spark-wrap--sport" data-spark-rest-x="${sparkRestX}" data-spark-peek-left="${sparkPeekLeft}" data-spark-peek-right="${sparkPeekRight}" data-spark-commit-prev="${sparkCommitPrev}" data-spark-commit-next="${sparkCommitNext}" data-spark-pitch="${pitch}" data-spark-seg-lens="${sparkSegLens}" data-spark-seg-i="${sparkSegI}" data-spark-strip="1">
        <div class="home-pulse__spark-track" style="width:${stripW}px;transform:translate3d(-${sparkRestX}px,0,0)">
          <div class="home-pulse__spark-stage">
            <svg class="home-pulse__spark home-pulse__spark--ribbon home-pulse__spark--sport-dual" viewBox="0 0 ${geom.w} ${geom.h}" width="${stripW}" height="${geom.h}" preserveAspectRatio="none" role="img" aria-label="Синя лінія — заняття, помаранчева — калорії з чеків по тижнях">
              <defs>
                <linearGradient id="sportFoodRibbonFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="oklch(0.68 0.16 55)" stop-opacity="0.38" />
                  <stop offset="40%" stop-color="oklch(0.68 0.16 55)" stop-opacity="0.14" />
                  <stop offset="100%" stop-color="oklch(0.68 0.16 55)" stop-opacity="0" />
                </linearGradient>
                <linearGradient id="sportSessRibbonFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="oklch(0.55 0.14 245)" stop-opacity="0.36" />
                  <stop offset="40%" stop-color="oklch(0.55 0.14 245)" stop-opacity="0.12" />
                  <stop offset="100%" stop-color="oklch(0.55 0.14 245)" stop-opacity="0" />
                </linearGradient>
              </defs>
              ${chartGrid}
              ${(geom.sport || geom.peer)?.area ? `<path class="home-pulse__ribbon-fill home-pulse__ribbon-fill--sport" d="${(geom.sport || geom.peer).area}" fill="url(#sportSessRibbonFill)" />` : ""}
              ${geom.area ? `<path class="home-pulse__ribbon-fill home-pulse__ribbon-fill--food" d="${geom.area}" fill="url(#sportFoodRibbonFill)" />` : ""}
              ${(geom.sport || geom.peer)?.path ? `<path class="home-pulse__ribbon-glow home-pulse__ribbon-glow--sport" d="${(geom.sport || geom.peer).path}" fill="none" pathLength="1" />` : ""}
              ${geom.path ? `<path class="home-pulse__ribbon-glow home-pulse__ribbon-glow--food" d="${geom.path}" fill="none" pathLength="1" />` : ""}
              ${(geom.sport || geom.peer)?.path ? `<path class="home-pulse__ribbon-line home-pulse__ribbon-line--sport" d="${(geom.sport || geom.peer).path}" fill="none" pathLength="1" />` : ""}
              ${geom.path ? `<path class="home-pulse__ribbon-line home-pulse__ribbon-line--food" d="${geom.path}" fill="none" pathLength="1" />` : ""}
              ${marksSvg}
            </svg>
            ${dayBadgesHtml ? `<div class="home-pulse__week-badges" aria-label="Заняття і калорії по тижнях">${dayBadgesHtml}</div>` : ""}
          </div>
          ${weekAxis ? `<div class="home-pulse__week-axis" aria-hidden="true">${weekAxis}</div>` : ""}
        </div>
        <div class="home-pulse__tip home-pulse__tip--sport" hidden></div>
      </div>
      <p class="home-pulse__program-note muted">${esc(programLine)}</p>
      <div class="home-pulse__sport-legend" aria-hidden="true">
        <span class="home-pulse__sport-legend-i is-sess">заняття</span>
        <span class="home-pulse__sport-legend-i is-kcal">раціон · ккал</span>
      </div>
      <button type="button" class="home-pulse__cta home-pulse__cta--text" data-go="day">день і полиця →</button>
    </section>`;
}

function formatIntUa(n) {
  const v = Math.round(Number(n) || 0);
  return new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 }).format(v);
}

function uaDishes(n) {
  const num = Number(n) || 0;
  const mod10 = num % 10;
  const mod100 = num % 100;
  if (mod100 >= 11 && mod100 <= 14) return "страв";
  if (mod10 === 1) return "страва";
  if (mod10 >= 2 && mod10 <= 4) return "страви";
  return "страв";
}

/** Dual week ribbon: food (kcal, orange) + sport (sessions, blue). Raw sessions — no soft-bridge Y. */
function sportSparkGeom(series, w = 280, h = 108, opts = {}) {
  const rows = Array.isArray(series) ? series : [];
  const padX = Math.max(0, Number(opts.xPad) || 2);
  const maxKcal = Number(opts.maxKcal) || 0;
  const maxSess = Number(opts.maxSessions) || 0;
  const kcalSer = rows.map((r) => ({
    uah: Number(r.kcal) || 0,
    weekStart: r.weekStart || r.day,
  }));
  const sessSer = rows.map((r) => ({
    uah: Math.max(0, Number(r.sessions) || 0),
    weekStart: r.weekStart || r.day,
  }));
  const foodEdge = maxKcal > 0 ? { xPad: padX, maxUah: maxKcal } : padX;
  const sessEdge = maxSess > 0 ? { xPad: padX, maxUah: maxSess } : { xPad: padX, maxUah: 1 };
  const food = pulseRibbonGeom(kcalSer, w, h, 0, foodEdge);
  const sport = pulseRibbonGeom(sessSer, w, h, 0, sessEdge);
  return {
    food,
    sport,
    peer: sport,
    primary: food,
    coords: food.coords,
    path: food.path,
    area: food.area,
    w,
    h,
    base: food.base,
    topPad: food.topPad,
    span: food.span,
  };
}

function bindSportDayTips(rootEl) {
  const tip = rootEl.querySelector(".home-pulse__tip--sport");
  const wrap = rootEl.querySelector(".home-pulse__spark-wrap--sport");
  if (!tip || !wrap) return;
  const mk = rootEl.dataset.sportMonthKey || currentMonthKey();
  const budget = Number(rootEl.dataset.sportBudget) || 2200;
  const receipts = state.historyCache?.receipts || [];
  const model = sportHomePulseModel({
    receipts,
    kb: state.kb,
    intentSport: state.intentSport,
    monthKey: mk,
    levelUa: levelUa(),
  });
  const card = sportExpressCardModel({
    receipts,
    monthKey: mk,
    ritualDays: model.ritualDays,
    sessionGoal: loadSportSessionGoal(),
    dailyBudget: estimateDailyKcalFromProfile(loadSportProfile()),
  });
  const ser = card.series || [];
  let pinned = -1;
  const place = (idx, mark) => {
    const row = ser[idx];
    if (!row) {
      tip.hidden = true;
      return;
    }
    const dishes = row.kcal > 0 ? Math.max(1, Math.round(row.kcal / 450)) : 0;
    const sessN = Number(row.sessions) || 0;
    const sess = sessN > 0 ? (sessN === 1 ? "є заняття" : `${sessN} заняття`) : "без заняття";
    const kcalLine = row.kcal > 0 ? `${formatIntUa(row.kcal)} ккал` : "немає чеків";
    const weekBudget = budget * 7;
    const over = row.over
      ? `<p class="home-pulse__tip-kicker is-hot">понад тижневий орієнтир ${formatIntUa(weekBudget)}</p>`
      : `<p class="home-pulse__tip-kicker">${row.prior ? "Минулий місяць" : "Тиждень"} · ритм</p>`;
    tip.innerHTML = `${over}
      <div class="home-pulse__tip-hero">
        <p class="home-pulse__tip-day">з ${esc(String(row.dayNum))} · ${esc(row.weekStart || row.day || mk)}</p>
        <p class="home-pulse__tip-sku home-pulse__tip-sku--hero">${esc(sess)} · ${esc(kcalLine)}</p>
        <p class="home-pulse__tip-uah num">${dishes > 0 ? `≈ ${dishes} ${uaDishes(dishes)}` : "—"}</p>
      </div>`;
    tip.hidden = false;
    rootEl.querySelector(".home-pulse__orient-tip") && (rootEl.querySelector(".home-pulse__orient-tip").hidden = true);
    const rect = wrap.getBoundingClientRect();
    const maxW = Math.max(200, rect.width - 16);
    tip.style.maxWidth = `${Math.round(maxW)}px`;
    tip.style.left = "8px";
    tip.style.top = "8px";
    const tipW = tip.offsetWidth || Math.min(240, maxW);
    const anchor = sparkTipAnchorInParent(mark, wrap);
    const left = Math.min(Math.max(8, anchor.x - tipW / 2), Math.max(8, rect.width - tipW - 8));
    tip.style.left = `${left}px`;
  };
  const clear = () => {
    tip.hidden = true;
    pinned = -1;
    wrap.querySelectorAll(".is-open").forEach((n) => n.classList.remove("is-open"));
  };
  const openAt = (node, idx, { pin } = {}) => {
    wrap.querySelectorAll(".is-open").forEach((n) => n.classList.remove("is-open"));
    node.classList.add("is-open");
    if (pin) pinned = idx;
    place(idx, node);
  };
  const bindNode = (node) => {
    const idx = Number(node.dataset.sportDay);
    if (!Number.isFinite(idx)) return;
    node.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (pinned === idx) {
        clear();
        return;
      }
      openAt(node, idx, { pin: true });
    });
  };
  wrap.querySelectorAll("[data-sport-day]").forEach(bindNode);
  rootEl.querySelectorAll(".home-pulse__week-tick[data-sport-day]").forEach(bindNode);
  wrap.querySelectorAll(".home-pulse__week-badge[data-sport-day]").forEach(bindNode);
  const onDoc = (ev) => {
    if (pinned < 0) return;
    if (wrap.contains(ev.target) || tip.contains(ev.target)) return;
    clear();
  };
  if (rootEl._sportDayClear) document.removeEventListener("pointerdown", rootEl._sportDayClear);
  rootEl._sportDayClear = onDoc;
  document.addEventListener("pointerdown", onDoc);
}

function openSportSessionGoalEditor(anchorBtn) {
  const pulse = anchorBtn.closest(".home-pulse--sport") || document.querySelector(".home-pulse--sport");
  let panel = pulse?.querySelector(".home-pulse__goal-edit--sport");
  const close = () => {
    panel?.remove();
    pulse?.querySelector(".home-pulse__goal-scrim--sport")?.remove();
    pulse?.classList.remove("home-pulse--goal-editing");
    anchorBtn.setAttribute("aria-expanded", "false");
  };
  if (panel) {
    close();
    return;
  }
  panel = document.createElement("div");
  panel.className = "home-pulse__goal-edit home-pulse__goal-edit--sport";
  panel.id = "sport-session-goal-edit";
  const cur = loadSportSessionGoal();
  panel.innerHTML = `
    <p class="home-pulse__goal-edit-k">М’яка ціль занять на місяць</p>
    <label class="home-pulse__goal-edit-label" for="sport-session-goal-input">Занять</label>
    <div class="home-pulse__goal-edit-row">
      <input id="sport-session-goal-input" class="home-pulse__goal-edit-input num" type="number" inputmode="numeric" min="1" max="31" step="1" value="${cur}" />
      <button type="button" class="home-pulse__goal-edit-save" data-sport-goal-save>Зберегти</button>
    </div>
    <button type="button" class="home-pulse__goal-edit-cancel muted" data-sport-goal-cancel>Скасувати</button>`;
  let scrim = document.createElement("div");
  scrim.className = "home-pulse__goal-scrim home-pulse__goal-scrim--sport";
  pulse?.classList.add("home-pulse--goal-editing");
  pulse?.appendChild(scrim);
  pulse?.appendChild(panel);
  anchorBtn.setAttribute("aria-expanded", "true");
  panel.querySelector("[data-sport-goal-cancel]")?.addEventListener("click", close);
  scrim.addEventListener("click", close);
  panel.querySelector("[data-sport-goal-save]")?.addEventListener("click", () => {
    const input = panel.querySelector("#sport-session-goal-input");
    saveSportSessionGoal(input?.value);
    close();
    patchHomeSportPulseMonth(pulse?.dataset.sportMonthKey || currentMonthKey());
  });
}

function sportOrientirTipHtml(orient, monthKey) {
  const mk = monthLabelUa(monthKey).toLowerCase();
  if (orient.unit === "empty") {
    return `
    <p class="home-pulse__orient-breach home-pulse__orient-breach--ok">
      <span class="home-pulse__orient-breach-title">Старт місяця</span>
      <span class="home-pulse__orient-breach-amt is-ok">день → сесія → Express</span>
    </p>
    <p class="home-pulse__orient-status">Орієнтир ${orient.goal} занять · ${esc(mk)}. Рахуємо лише реальні сесії — повні та часткові.</p>
    <p class="home-pulse__orient-source">Раціон з Express не піднімає синю лінію занять. Спочатку «Старт» у дні, потім інгредієнти в Express.</p>
    <div class="home-pulse__orient-track" aria-hidden="true"><i style="width:0%"></i></div>
  `;
  }
  const split =
    orient.unit === "ritual" && (orient.fullDays > 0 || orient.partialDays > 0)
      ? ` · повні ${orient.fullDays} · часткові ${orient.partialDays}`
      : "";
  const unitLine =
    orient.unit === "ritual"
      ? `${orient.progress} з ${orient.goal} (зважено за сесією)${split}`
      : orient.unit === "visits"
        ? `${orient.progress} з ${orient.goal} візитів (поки без сесій)`
        : `0 з ${orient.goal} — ще без сесій і візитів`;
  const status = orient.over
    ? `<p class="home-pulse__orient-breach home-pulse__orient-breach--ok">
        <span class="home-pulse__orient-breach-title">Орієнтир досягнуто</span>
        <span class="home-pulse__orient-breach-amt is-ok">${orient.pct}%</span>
      </p>`
    : `<p class="home-pulse__orient-breach home-pulse__orient-breach--ok">
        <span class="home-pulse__orient-breach-title">До орієнтира</span>
        <span class="home-pulse__orient-breach-amt is-ok">ще ${orient.left}</span>
      </p>`;
  return `
    ${status}
    <p class="home-pulse__orient-status">${esc(unitLine)} · ${esc(mk)}</p>
    <p class="home-pulse__orient-source">Повна сесія = 100% дня · часткова = кроки/план. Раціон — у чеклисті Express (додав = зараховано, не купівля).</p>
    <div class="home-pulse__orient-track" aria-hidden="true"><i style="width:${orient.pctBar}%"></i></div>
  `;
}

function runHomeSpentCountUp() {
  if (prefersReduce()) return;
  const el = document.querySelector(".home-pulse__spent[data-count]");
  if (!el) return;
  const target = Number(el.dataset.count);
  if (!Number.isFinite(target) || target <= 0) return;
  const start = performance.now();
  const dur = 420;
  const tick = (now) => {
    const p = Math.min(1, (now - start) / dur);
    const eased = 1 - (1 - p) ** 3;
    el.innerHTML = moneyStackHtml(target * eased);
    if (p < 1) requestAnimationFrame(tick);
    else el.innerHTML = moneyStackHtml(target);
  };
  el.innerHTML = moneyStackHtml(0);
  requestAnimationFrame(tick);
}

function runHomeSportCountUp() {
  if (prefersReduce()) return;
  const el = document.querySelector(".home-pulse--sport [data-sport-count]");
  if (!el) return;
  const target = Number(el.dataset.sportCount);
  if (!Number.isFinite(target) || target <= 0) return;
  const start = performance.now();
  const dur = 380;
  const tick = (now) => {
    const p = Math.min(1, (now - start) / dur);
    const eased = 1 - (1 - p) ** 3;
    el.textContent = String(Math.round(target * eased));
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = String(target);
  };
  el.textContent = "0";
  requestAnimationFrame(tick);
}

function smoothSparkPath(coords) {
  if (!coords.length) return "";
  if (coords.length === 1) return `M${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  let d = `M${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
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
  return d;
}

/**
 * Neighbor-month chart panel for pan peek (SVG + badges + axis).
 * Non-interactive — fills vacated space while dragging; no tip node.
 * Drops weeks shared with neighbor (cur) so mid-drag seam is not a double day.
 */
function homePulseSparkPeekPanelHtml(receipts, monthKey, chartW, opts = {}) {
  if (!monthKey) return "";
  const pulse = aggregateMonthPulse(receipts || [], { monthKey, goalUah: 1, seriesWeeks: 5 });
  let series =
    pulse.chartSeries?.length
      ? pulse.chartSeries
      : (pulse.series || []).filter((s) => String(s.weekStart || "").slice(0, 7) === monthKey);
  series = seamDedupePeekSeries(series, opts.neighborSeries, opts.side || "prev");
  if (!series.length) return "";
  const monthWeeks = series.filter((s) => !s.prior);
  const weekBudget = Number(state.intentShop?.constraints?.budgetUah) || 1500;
  const resolved = resolveMonthGoalUah(undefined, { spentUah: pulse.spentUah, weekBudget });
  const weekPace =
    resolved.goalUah > 0 ? resolved.goalUah / Math.max(4, monthWeeks.length || 4) : 0;
  const w = Math.max(120, Number(chartW) || pulseChartWidth() || 280);
  const neighborMax = (Array.isArray(opts.neighborSeries) ? opts.neighborSeries : []).reduce(
    (m, s) => Math.max(m, Number(s?.uah) || 0),
    0,
  );
  const peekMax = series.reduce((m, s) => Math.max(m, Number(s?.uah) || 0), 0);
  const sharedMax = Math.max(peekMax, neighborMax, 1);
  const geom = pulseRibbonGeom(series, w, 108, 0, { xPad: 2, maxUah: sharedMax });
  const fillId = `pulseRibbonFill-peek-${String(monthKey).replace(/[^\d]/g, "")}`;
  const chartGrid = pulseChartGridSvg(geom);
  const lastIdx = Math.max(0, geom.coords.length - 1);
  const marksSvg = geom.coords
    .map((c) => {
      const row = series[c.i];
      const prior = Boolean(row?.prior);
      if (!(c.uah > 0)) return "";
      if (prior) {
        return `<circle class="home-pulse__mark is-prior" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3.5" aria-hidden="true" />`;
      }
      if (c.i === lastIdx) {
        return `<circle class="home-pulse__mark is-now" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3.75" aria-hidden="true" />`;
      }
      return `<circle class="home-pulse__mark is-soft" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="2.6" aria-hidden="true" />`;
    })
    .join("");
  const weekAxis = geom.coords
    .map((c) => {
      const row = series[c.i];
      const ws = row?.weekStart;
      if (!ws) return "";
      const d = new Date(`${ws}T12:00:00.000Z`);
      if (Number.isNaN(d.getTime())) return "";
      const lab = String(d.getUTCDate());
      const atStart = c.i === 0 || Boolean(row?.prior);
      const atEnd = !atStart && c.i === lastIdx;
      const left = atStart ? 0 : atEnd ? 100 : geom.w > 0 ? (c.x / geom.w) * 100 : 0;
      const cls = [
        "home-pulse__week-tick",
        "home-pulse__week-tick--day",
        row?.prior ? "is-prior" : "",
        atStart ? "is-edge-start" : "",
        atEnd ? "is-edge-end" : "",
        !row?.prior && c.i === lastIdx ? "is-now" : "",
        c.uah > 0 ? "is-spend" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `<span class="${cls}" style="left:${left.toFixed(2)}%">${esc(lab)}</span>`;
    })
    .join("");
  const weekBadges = weekBadgeModels(series, geom, weekPace).filter(
    (b) => b.prior || b.i === lastIdx || b.over,
  );
  const weekBadgesHtml = weekBadges.length
    ? `<div class="home-pulse__week-badges" aria-hidden="true">${weekBadges
        .map((b) => {
          const atStart = b.prior || b.i === 0;
          const atEnd = !atStart && b.i === lastIdx;
          const left = atStart ? 0 : atEnd ? 100 : geom.w > 0 ? (b.peakX / geom.w) * 100 : 0;
          const top = geom.h > 0 ? (b.peakY / geom.h) * 100 : 0;
          const cls = [
            "home-pulse__week-badge",
            "num",
            b.over ? "is-over" : "",
            b.prior ? "is-prior" : "",
            atStart ? "is-edge-start" : "",
            atEnd ? "is-edge-end" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return `<span class="${cls}" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%">${esc(moneyBadge(b.uah))}</span>`;
        })
        .join("")}</div>`
    : "";
  const label = monthLabelUa(monthKey);
  return `<div class="home-pulse__spark-panel home-pulse__spark-panel--peek" data-spark-panel="peek" data-month-key="${esc(monthKey)}" aria-hidden="true">
        <div class="home-pulse__spark-stage">
          <svg class="home-pulse__spark home-pulse__spark--ribbon" viewBox="0 0 ${geom.w} ${geom.h}" width="100%" height="${geom.h}" preserveAspectRatio="none" role="img" aria-label="${esc(label)} · витрати по тижнях">
            <defs>
              <linearGradient id="${fillId}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="oklch(0.55 0.11 155)" stop-opacity="0.34" />
                <stop offset="40%" stop-color="oklch(0.55 0.11 155)" stop-opacity="0.12" />
                <stop offset="100%" stop-color="oklch(0.55 0.11 155)" stop-opacity="0" />
              </linearGradient>
            </defs>
            ${chartGrid}
            ${geom.area ? `<path class="home-pulse__ribbon-fill" d="${geom.area}" fill="url(#${fillId})" />` : ""}
            ${geom.path ? `<path class="home-pulse__ribbon-glow" d="${geom.path}" fill="none" pathLength="1" />` : ""}
            ${geom.path ? `<path class="home-pulse__ribbon-line" d="${geom.path}" fill="none" pathLength="1" />` : ""}
            ${marksSvg}
          </svg>
          ${weekBadgesHtml}
        </div>
        ${weekAxis ? `<div class="home-pulse__week-axis" aria-hidden="true">${weekAxis}</div>` : ""}
      </div>`;
}

/** Soft-area ribbon + week coords for hot tips (research/20 A2 hybrid). */
function pulseRibbonGeom(series, w = 280, h = 92, paceUah = 0, xPad = 2) {
  const pts = (series || []).map((s) => Number(s.uah) || 0);
  const n = pts.length;
  if (!n) return { path: "", area: "", coords: [], paceY: null, w, h, last: null };
  let padX = 2;
  let forceMax = 0;
  if (xPad && typeof xPad === "object") {
    padX = Math.max(0, Number(xPad.xPad) || 0);
    forceMax = Number(xPad.maxUah) || 0;
  } else {
    padX = Math.max(0, Number(xPad) || 0);
  }
  const max = Math.max(...pts, paceUah || 0, forceMax, 1);
  const topPad = 18;
  const base = h - 10;
  const span = h - 14 - topPad;
  const innerW = Math.max(1, w - padX * 2);
  const step = n <= 1 ? 0 : innerW / (n - 1);
  const coords = pts.map((v, i) => {
    const x = n <= 1 ? w / 2 : padX + i * step;
    const y = base - (v / max) * span;
    return { x, y, uah: v, i };
  });
  const path = smoothSparkPath(coords);
  const last = coords[coords.length - 1] || null;
  const area = path && last ? `${path} L${last.x.toFixed(1)} ${h} L${coords[0].x.toFixed(1)} ${h} Z` : "";
  const paceY = paceUah > 0 ? base - (paceUah / max) * span : null;
  return { path, area, coords, paceY, w, h, last, max, base, topPad, span };
}

/** Light chart grid (vertical at points or sparse xs, horizontal guides). */
function pulseChartGridSvg(geom, { vertical = true, verticalAt = null } = {}) {
  if (!geom?.coords?.length) return "";
  const h = geom.h || 108;
  const w = geom.w || 280;
  const top = 10;
  const bottom = h - 8;
  const xs = Array.isArray(verticalAt)
    ? verticalAt.filter((x) => Number.isFinite(Number(x))).map(Number)
    : vertical
      ? geom.coords.map((c) => c.x)
      : [];
  const uniq = [...new Set(xs.map((x) => Number(x.toFixed(1))))];
  const v = uniq
    .map(
      (x) =>
        `<line class="home-pulse__grid-v" x1="${x.toFixed(1)}" y1="${top}" x2="${x.toFixed(1)}" y2="${bottom}" />`,
    )
    .join("");
  const base = geom.base ?? bottom;
  const topPad = geom.topPad ?? top;
  const span = geom.span ?? base - topPad;
  const hLines = [0.25, 0.5, 0.75]
    .map((t) => {
      const y = base - span * t;
      return `<line class="home-pulse__grid-h" x1="4" y1="${y.toFixed(1)}" x2="${Math.max(4, w - 4)}" y2="${y.toFixed(1)}" />`;
    })
    .join("");
  return `${hLines}${v}`;
}

/** Card / spark-wrap width so ribbon ink spans full card (pad cancelled by CSS bleed). */
function pulseChartWidth(preferSel) {
  if (preferSel) {
    const scoped = document.querySelector(preferSel);
    if (scoped?.clientWidth > 200) return Math.max(260, Math.round(scoped.clientWidth));
  }
  const wraps = document.querySelectorAll(".home-pulse__spark-wrap");
  for (const wrap of wraps) {
    if (wrap?.clientWidth > 200) return Math.max(260, Math.round(wrap.clientWidth));
  }
  const pulse = document.querySelector(".home-pulse--craft, .home-pulse");
  if (pulse?.clientWidth > 200) return Math.max(260, Math.round(pulse.clientWidth));
  const phone = document.querySelector(".phone");
  const pw = phone?.clientWidth || 390;
  return Math.max(260, Math.round(pw - 32));
}

/**
 * Horizontal pan on continuous spark strip (Express or Sport).
 * Rest offset from data-spark-rest-x; on commit keep strip + swap chrome (no chart remount jump).
 * @param {HTMLElement} rootEl
 * @param {{ resolveNav?: () => object, patchMonth?: (k: string) => void, tipSelector?: string, sport?: boolean }} [opts]
 */
function bindSparkPan(rootEl, opts = {}) {
  const wrap = rootEl.querySelector(".home-pulse__spark-wrap");
  if (!wrap || wrap.dataset.sparkPanBound === "1") return;
  const track = wrap.querySelector(".home-pulse__spark-track") || wrap.querySelector(".home-pulse__spark-stage");
  if (!track) return;
  wrap.dataset.sparkPanBound = "1";
  const isSport = Boolean(opts.sport) || rootEl.classList.contains("home-pulse--sport");
  const resolveNav =
    opts.resolveNav ||
    (() => resolvePulseMonthNav(state.historyCache?.receipts || []));
  const tipSelector = opts.tipSelector || ".home-pulse__tip";
  let drag = null;
  let ignoreClickUntil = 0;
  let chromeStash = null;
  let chromePreviewKey = null;

  const restX = () => Number(wrap.dataset.sparkRestX) || 0;

  const commitDistances = () => {
    const w = wrap.clientWidth || 280;
    const rawPrev = Number(wrap.dataset.sparkCommitPrev);
    const rawNext = Number(wrap.dataset.sparkCommitNext);
    // 0 = no neighbor — do NOT fall through to peekRight (void overscroll).
    const commitPrev = Number.isFinite(rawPrev)
      ? rawPrev
      : Number(wrap.dataset.sparkPeekLeft) || w * 0.55;
    const commitNext = Number.isFinite(rawNext)
      ? rawNext
      : Number(wrap.dataset.sparkPeekRight) || w * 0.55;
    return { commitPrev, commitNext, w };
  };

  /** Same gate for label/metrics preview and month commit. */
  const panThresholdPx = () => {
    const { commitPrev, commitNext } = commitDistances();
    const span = commitNext > 0 && commitPrev > 0 ? Math.min(commitPrev, commitNext) : Math.max(commitPrev, commitNext);
    return Math.max(40, span * 0.22);
  };

  const clearPanClasses = () => {
    wrap.classList.remove("is-panning");
    rootEl.classList.remove("is-spark-panning");
  };

  const stashChrome = () => {
    if (chromeStash) return;
    chromeStash = {
      status: rootEl.querySelector(".home-pulse__status-band")?.cloneNode(true),
      whisper: rootEl.querySelector(".home-pulse__whisper")?.cloneNode(true),
      pad: rootEl.querySelector(".home-pulse__story-pad")?.cloneNode(true),
      note: rootEl.querySelector(".home-pulse__program-note")?.cloneNode(true),
      over: rootEl.classList.contains("home-pulse--over"),
      archive: rootEl.classList.contains("home-pulse--archive"),
      kcalHot: rootEl.classList.contains("is-kcal-hot"),
    };
  };

  const restoreChrome = () => {
    if (!chromeStash) return;
    const pairs = [
      [".home-pulse__status-band", chromeStash.status],
      [".home-pulse__whisper", chromeStash.whisper],
      [".home-pulse__story-pad", chromeStash.pad],
      [".home-pulse__program-note", chromeStash.note],
    ];
    for (const [sel, node] of pairs) {
      const cur = rootEl.querySelector(sel);
      if (cur && node) cur.replaceWith(node.cloneNode(true));
    }
    rootEl.classList.toggle("home-pulse--over", chromeStash.over);
    rootEl.classList.toggle("home-pulse--archive", chromeStash.archive);
    rootEl.classList.toggle("is-kcal-hot", chromeStash.kcalHot);
    chromeStash = null;
    chromePreviewKey = null;
  };

  const discardChromeStash = () => {
    chromeStash = null;
    chromePreviewKey = null;
  };

  const previewChromeForKey = (key) => {
    if (!key) {
      restoreChrome();
      return;
    }
    if (chromePreviewKey === key) return;
    stashChrome();
    chromePreviewKey = key;
    const prevKey = isSport ? state.sportPulseMonthKey : state.pulseMonthKey;
    if (isSport) state.sportPulseMonthKey = key;
    else state.pulseMonthKey = key;
    const tmp = document.createElement("div");
    const hasToken = Boolean(state.mcpStatus?.tokenOnServer);
    tmp.innerHTML = (isSport ? homeSportPulseHtml() : homePulseHtml(hasToken)).trim();
    if (isSport) state.sportPulseMonthKey = prevKey;
    else state.pulseMonthKey = prevKey;
    const nextEl = tmp.firstElementChild;
    if (nextEl) applyPulseChromeFrom(rootEl, nextEl, { sport: isSport });
  };

  const syncPanPreview = (dx) => {
    const nav = resolveNav();
    const thr = panThresholdPx();
    let key = null;
    if (dx >= thr) key = nav.prevKey || null;
    else if (dx <= -thr) key = nav.nextKey || null;
    previewChromeForKey(key);
  };

  const setPanX = (dx, { animate, durationMs } = {}) => {
    const useAnim = Boolean(animate) && !prefersReduce();
    const x = -restX() + (Number(dx) || 0);
    const ms = Math.max(160, Number(durationMs) || 220);
    track.style.transition = useAnim
      ? `transform ${ms}ms var(--ease, cubic-bezier(0.22, 1, 0.36, 1))`
      : "none";
    track.style.transform = `translate3d(${x}px,0,0)`;
  };

  const clearPan = ({ animate } = {}) => {
    restoreChrome();
    clearPanClasses();
    setPanX(0, { animate, durationMs: 280 });
    if (!animate || prefersReduce()) {
      track.style.transition = "";
      return;
    }
    const onEnd = (ev) => {
      if (ev.target !== track || ev.propertyName !== "transform") return;
      track.removeEventListener("transitionend", onEnd);
      track.style.transition = "";
    };
    track.addEventListener("transitionend", onEnd);
  };

  /** Slide strip to neighbor month framing, then chrome+rebase (keep SVG). */
  const commitPan = (nextKey, dx) => {
    if (!nextKey) return;
    const dir = dx > 0 ? 1 : -1;
    if (prefersReduce()) {
      discardChromeStash();
      clearPanClasses();
      patchPulseMonthKeepSpark(nextKey, { sport: isSport, landDir: dir });
      return;
    }
    const { commitPrev, commitNext } = commitDistances();
    const land = Math.max(48, dir > 0 ? commitPrev : commitNext);
    const target = dir * land;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      track.removeEventListener("transitionend", onEnd);
      track.style.transition = "";
      discardChromeStash();
      patchPulseMonthKeepSpark(nextKey, { sport: isSport, landDir: dir });
    };
    const onEnd = (ev) => {
      if (ev.target !== track || ev.propertyName !== "transform") return;
      finish();
    };
    track.addEventListener("transitionend", onEnd);
    window.setTimeout(finish, 480);
    previewChromeForKey(nextKey);
    setPanX(target, { animate: true, durationMs: 360 });
  };

  setPanX(0, { animate: false });

  wrap.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (
      e.target.closest?.(
        "button,[data-pulse-month-dir],[data-pulse-month-now],[data-sport-month-dir],[data-sport-month-now]",
      )
    ) {
      return;
    }
    drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      dx: 0,
      moved: false,
      axis: null,
    };
    try {
      wrap.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  });

  wrap.addEventListener(
    "pointermove",
    (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const rawDx = e.clientX - drag.x;
      const rawDy = e.clientY - drag.y;
      if (!drag.axis) {
        if (Math.abs(rawDx) < 6 && Math.abs(rawDy) < 6) return;
        if (Math.abs(rawDy) > Math.abs(rawDx)) {
          drag.axis = "v";
          try {
            wrap.releasePointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
          drag = null;
          clearPanClasses();
          return;
        }
        drag.axis = "h";
        drag.moved = true;
        wrap.classList.add("is-panning");
        rootEl.classList.add("is-spark-panning");
        const tip = wrap.querySelector(tipSelector);
        if (tip) tip.hidden = true;
      }
      if (drag.axis !== "h") return;
      e.preventDefault();
      const nav = resolveNav();
      const { commitPrev, commitNext } = commitDistances();
      let dx = rawDx;
      const rubber = 28;
      let maxLeft = commitPrev > 0 ? commitPrev : rubber;
      let maxRight = commitNext > 0 ? commitNext : rubber;
      if (!nav.canPrev) maxLeft = rubber;
      if (!nav.canNext) maxRight = rubber;
      dx = Math.max(-maxRight, Math.min(maxLeft, dx));
      drag.dx = dx;
      setPanX(dx);
      syncPanPreview(dx);
    },
    { passive: false },
  );

  const endDrag = (e) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const { moved, dx, axis: lock } = drag;
    drag = null;
    if (!moved || lock !== "h") {
      clearPan({ animate: false });
      return;
    }
    ignoreClickUntil = Date.now() + 480;
    const nav = resolveNav();
    const { w } = commitDistances();
    const thr = panThresholdPx();
    const next = monthKeyFromDragDx(dx, w, nav, { minPx: thr, thresholdRatio: 0 });
    if (next) {
      // Keep dim until keep-spark patch clears classes.
      commitPan(next, dx);
      return;
    }
    clearPan({ animate: true });
  };

  wrap.addEventListener("pointerup", endDrag);
  wrap.addEventListener("pointercancel", endDrag);
  wrap.addEventListener(
    "click",
    (e) => {
      if (Date.now() >= ignoreClickUntil) return;
      e.preventDefault();
      e.stopPropagation();
    },
    true,
  );
}

function bindSparkTips(rootEl, peaks, monthKey, series) {
  const wrap = rootEl.querySelector(".home-pulse__spark-wrap");
  const panel = wrap?.querySelector(".home-pulse__spark-stage") || wrap;
  const tip = wrap?.querySelector(".home-pulse__tip") || rootEl.querySelector(".home-pulse__tip");
  if (!tip || !wrap || !panel) return;
  const mk = monthKey || rootEl.dataset.monthKey || currentMonthKey();
  const ser = Array.isArray(series) ? series : [];
  let pinned = -1;
  const place = (idx, mark) => {
    const peak = peaks[idx];
    const items = (peak?.items || [])
      .filter((it) => monthKeyFromAt(it.at) === mk)
      .slice(0, 2);
    if (items.length) {
      const it = items[0];
      tip.innerHTML = `<p class="home-pulse__tip-kicker">Дорожче за темп</p>
      <div class="home-pulse__tip-hero">
        <p class="home-pulse__tip-day">${esc(tipDayLabel(it.at))}</p>
        <p class="home-pulse__tip-sku home-pulse__tip-sku--hero">${esc(tipSkuName(it.name))}</p>
        <p class="home-pulse__tip-uah num">${moneyStackHtml(it.uah)}</p>
      </div>`;
    } else {
      const row = ser[idx];
      const weekUah = Number(row?.uah) || Number(mark?.dataset?.weekUah) || 0;
      if (!(weekUah > 0)) {
        tip.hidden = true;
        pinned = -1;
        return;
      }
      const ws = row?.weekStart || "";
      const day = ws ? tipDayLabel(`${ws}T12:00:00.000Z`) : "Тиждень";
      tip.innerHTML = `<p class="home-pulse__tip-kicker">Тиждень</p>
      <div class="home-pulse__tip-hero">
        <p class="home-pulse__tip-day">${esc(day)}</p>
        <p class="home-pulse__tip-sku home-pulse__tip-sku--hero">сума чеків</p>
        <p class="home-pulse__tip-uah num">${moneyStackHtml(weekUah)}</p>
      </div>`;
    }
    tip.hidden = false;
    const insightTip = rootEl.querySelector(".home-pulse__insight-tip");
    if (insightTip) insightTip.hidden = true;
    const orientTip = rootEl.querySelector(".home-pulse__orient-tip");
    if (orientTip) orientTip.hidden = true;
    const rect = wrap.getBoundingClientRect();
    const maxW = Math.max(200, rect.width - 16);
    tip.style.maxWidth = `${Math.round(maxW)}px`;
    tip.style.left = "8px";
    tip.style.top = "8px";
    const tipW = tip.offsetWidth || Math.min(240, maxW);
    const anchor = sparkTipAnchorInParent(mark, wrap);
    const left = Math.min(Math.max(8, anchor.x - tipW / 2), Math.max(8, rect.width - tipW - 8));
    tip.style.left = `${left}px`;
  };
  const clear = () => {
    tip.hidden = true;
    tip.style.left = "";
    tip.style.maxWidth = "";
    pinned = -1;
    wrap.querySelectorAll(".is-open").forEach((n) => n.classList.remove("is-open"));
    rootEl.querySelectorAll(".home-pulse__peak-caption[data-spark-peak]").forEach((c) => c.classList.remove("is-open"));
  };
  const openAt = (node, idx, { pin } = {}) => {
    panel.querySelectorAll(".is-open").forEach((n) => n.classList.remove("is-open"));
    rootEl.querySelectorAll(".home-pulse__peak-caption[data-spark-peak]").forEach((c) => c.classList.remove("is-open"));
    node.classList.add("is-open");
    if (pin) pinned = idx;
    const mark =
      panel.querySelector(`.home-pulse__mark[data-spark-peak="${idx}"]`) ||
      (node.matches?.(".home-pulse__mark") ? node : null);
    place(idx, mark || node);
  };
  const isMouse = (ev) => !ev.pointerType || ev.pointerType === "mouse";
  const bindPeakNode = (node) => {
    const idx = Number(node.dataset.sparkPeak);
    node.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (pinned === idx) {
        clear();
        return;
      }
      openAt(node, idx, { pin: true });
    });
    node.addEventListener("pointerenter", (ev) => {
      if (!isMouse(ev)) return;
      openAt(node, idx, { pin: false });
    });
    node.addEventListener("pointerleave", (ev) => {
      if (!isMouse(ev)) return;
      if (pinned === idx) return;
      if (pinned >= 0) {
        const pinnedNode =
          panel.querySelector(`[data-spark-peak="${pinned}"]`) ||
          rootEl.querySelector(`.home-pulse__peak-caption[data-spark-peak="${pinned}"]`);
        if (pinnedNode) openAt(pinnedNode, pinned, { pin: false });
        else clear();
        return;
      }
      tip.hidden = true;
      node.classList.remove("is-open");
    });
    node.addEventListener("focus", () => openAt(node, idx, { pin: false }));
    node.addEventListener("blur", () => {
      if (pinned === idx) return;
      if (pinned < 0) {
        tip.hidden = true;
        node.classList.remove("is-open");
      }
    });
  };
  panel.querySelectorAll("[data-spark-peak].home-pulse__mark.is-hot").forEach(bindPeakNode);
  panel.querySelectorAll(".home-pulse__week-badge[data-spark-peak]").forEach(bindPeakNode);
  rootEl.querySelectorAll(".home-pulse__peak-caption[data-spark-peak]").forEach(bindPeakNode);
  const onDoc = (ev) => {
    if (pinned < 0) return;
    if (wrap.contains(ev.target) || tip.contains(ev.target)) return;
    if (ev.target.closest?.(".home-pulse__peak-caption")) return;
    clear();
  };
  if (rootEl._sparkClear) document.removeEventListener("pointerdown", rootEl._sparkClear);
  rootEl._sparkClear = onDoc;
  document.addEventListener("pointerdown", onDoc);
}

/** Best chart series index for a receipt `at` (exact day, else nearest ≤2d). */
function nearestSeriesIndex(series, at) {
  const list = Array.isArray(series) ? series : [];
  if (!list.length || !at) return -1;
  const dk = dayKeyISO(at);
  if (dk) {
    const exact = list.findIndex((s) => (s.dayStart || s.weekStart) === dk);
    if (exact >= 0) return exact;
  }
  const ws = weekStartISO(at);
  if (ws) {
    const exactW = list.findIndex((s) => s.weekStart === ws && !s.dayStart);
    if (exactW >= 0) return exactW;
  }
  const t = Date.parse(at);
  if (!Number.isFinite(t)) return -1;
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < list.length; i++) {
    const key = list[i].dayStart || list[i].weekStart;
    const st = Date.parse(`${key}T12:00:00.000Z`);
    if (!Number.isFinite(st)) continue;
    const dist = Math.abs(st - t);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  const maxDist = list.some((s) => s.dayStart) ? 2 * 864e5 : 14 * 864e5;
  return bestDist <= maxDist ? best : -1;
}

/** Anchor of an SVG/HTML mark relative to a positioned host (wrap or stage). */
function sparkTipAnchorInParent(mark, host) {
  if (!host) return { x: 140, y: 12 };
  if (!mark?.getBoundingClientRect) {
    return { x: (host.clientWidth || 280) / 2, y: 12 };
  }
  const mr = mark.getBoundingClientRect();
  const hr = host.getBoundingClientRect();
  if (!(mr.width || mr.height)) {
    return { x: (host.clientWidth || 280) / 2, y: 12 };
  }
  return {
    x: mr.left + mr.width / 2 - hr.left,
    y: mr.top + mr.height / 2 - hr.top,
  };
}

/** Map mark → CSS px inside `.home-pulse__spark-wrap` (viewport after strip translate). */
function sparkMarkAnchor(wrap, mark) {
  return sparkTipAnchorInParent(mark, wrap);
}

/** Hover/focus «Дорого цього місяця» → tip + guide on that week’s mark (chart digits). */
function bindSkuChartHighlight(rootEl) {
  const tip = rootEl.querySelector(".home-pulse__tip");
  const wrap = rootEl.querySelector(".home-pulse__spark-wrap");
  if (!wrap) return;
  let focusX = wrap.querySelector(".home-pulse__focus-x");
  if (!focusX) {
    focusX = document.createElement("div");
    focusX.className = "home-pulse__focus-x";
    focusX.hidden = true;
    focusX.setAttribute("aria-hidden", "true");
    wrap.appendChild(focusX);
  }
  const clearLit = () => {
    rootEl.querySelectorAll(".home-pulse__mark.is-lit").forEach((m) => {
      m.classList.remove("is-lit");
      if (m.dataset.baseR) m.setAttribute("r", m.dataset.baseR);
      delete m.dataset.baseR;
    });
    rootEl.querySelectorAll(".home-pulse__week-tick.is-lit").forEach((t) => t.classList.remove("is-lit"));
    rootEl.querySelectorAll(".home-pulse__sku.is-lit").forEach((r) => r.classList.remove("is-lit"));
    rootEl.classList.remove("home-pulse--sku-lit");
    focusX.hidden = true;
    focusX.style.left = "";
    if (tip && tip.dataset.skuLit === "1") {
      tip.hidden = true;
      tip.dataset.skuLit = "";
      tip.style.left = "";
      tip.style.top = "";
    }
  };
  const light = (row, on) => {
    clearLit();
    if (!on || !row) return;
    row.classList.add("is-lit");
    rootEl.classList.add("home-pulse--sku-lit");
    const idx = row.dataset.sparkPeak;
    const ws = row.dataset.weekStart;
    const mark =
      (idx != null && idx !== ""
        ? rootEl.querySelector(`.home-pulse__mark[data-spark-peak="${idx}"]`)
        : null) ||
      (row.dataset.chartWeek
        ? rootEl.querySelector(`.home-pulse__mark[data-week-start="${row.dataset.chartWeek}"]`)
        : null) ||
      (ws ? rootEl.querySelector(`.home-pulse__mark[data-week-start="${ws}"]`) : null);
    if (!mark) return;
    mark.classList.add("is-lit");
    if (!mark.dataset.baseR) mark.dataset.baseR = mark.getAttribute("r") || "3";
    mark.setAttribute("r", "8");
    const tick =
      (idx != null && idx !== ""
        ? rootEl.querySelector(`.home-pulse__week-tick[data-spark-peak="${idx}"]`)
        : null) || null;
    tick?.classList.add("is-lit");
    const anchor = sparkMarkAnchor(wrap, mark);
    focusX.hidden = false;
    focusX.style.left = `${anchor.x}px`;
    if (!tip) return;
    const name = row.querySelector(".home-pulse__sku-name")?.textContent || "";
    const day = row.querySelector(".home-pulse__sku-day")?.textContent || "";
    const uah = row.querySelector(".home-pulse__sku-uah")?.textContent || "";
    tip.innerHTML = `<p class="home-pulse__tip-kicker">Дорого цього місяця</p>
      <div class="home-pulse__tip-hero">
        <p class="home-pulse__tip-day">${esc(day)}</p>
        <p class="home-pulse__tip-sku home-pulse__tip-sku--hero">${esc(name)}</p>
        <p class="home-pulse__tip-uah num">${esc(uah)}</p>
      </div>`;
    tip.hidden = false;
    tip.dataset.skuLit = "1";
    const rect = wrap.getBoundingClientRect();
    const maxW = Math.max(180, rect.width - 16);
    tip.style.maxWidth = `${Math.round(Math.min(260, maxW))}px`;
    tip.style.left = "8px";
    tip.style.top = "0px";
    const tipW = tip.offsetWidth || Math.min(220, maxW);
    const tipH = tip.offsetHeight || 88;
    const left = Math.min(Math.max(8, anchor.x - tipW / 2), Math.max(8, rect.width - tipW - 8));
    const top = Math.max(4, anchor.y - tipH - 10);
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  };
  rootEl.querySelectorAll(".home-pulse__sku[data-week-start], .home-pulse__sku[data-spark-peak]").forEach((row) => {
    row.addEventListener("pointerenter", () => light(row, true));
    row.addEventListener("pointerleave", () => light(row, false));
    row.addEventListener("focus", () => light(row, true));
    row.addEventListener("blur", () => light(row, false));
    row.addEventListener("click", (ev) => {
      if (ev.target.closest("a,button")) return;
      const on = !row.classList.contains("is-lit");
      light(row, on);
    });
  });
}

function bindWasteLabelToggles(rootEl) {
  if (!rootEl) return;
  rootEl.querySelectorAll("[data-waste-toggle]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const name = btn.getAttribute("data-waste-name") || "";
      const monthKey = btn.getAttribute("data-waste-month") || state.pulseMonthKey || currentMonthKey();
      if (!name.trim()) return;
      const { on } = toggleWasteLabel({ name, monthKey });
      toast(on ? "Позначено «зайве» — лише ваша мітка" : "Мітку «зайве» знято");
      if (rootEl.closest(".home-pulse--craft")) patchHomePulseMonth(monthKey);
      else if (rootEl.closest(".shop-flow--checkout")) {
        btn.classList.toggle("is-on", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.setAttribute("aria-label", wasteToggleAria(on));
        btn.textContent = wasteToggleCopy(on);
        const art = btn.closest(".sku");
        if (art) art.classList.toggle("sku--waste", on);
        if (state.shopVm) patchShopProgress(state.shopVm);
      } else void render();
    });
  });
}

function rectMid(el) {
  return Math.round((el?.clientWidth || 280) / 2);
}

function tipDayUa(at) {
  if (!at) return "";
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
}

/** Always show a date slot in tips (honest fallback when receipt.at missing). */
function tipDayLabel(at) {
  return tipDayUa(at) || "без дати";
}

/** Soft grocery target explainer (bank-style: spent / goal / left + optional MoM). */
function orientirTipModel(pulse, receipts, resolved) {
  const goal = Number(pulse.goalUah) || 0;
  const spent = Number(pulse.spentUah) || 0;
  const left = Math.max(0, Math.round((goal - spent) * 100) / 100);
  const over = spent > goal && goal > 0;
  const pct = goal > 0 ? Math.round((spent / goal) * 100) : 0;
  const pctBar = Math.min(100, pct);
  const mom = monthOverMonthDelta(receipts, pulse.monthKey);
  const story = monthStoryLine(receipts, pulse.monthKey);
  const saved = Boolean(resolved?.saved);
  return { goal, spent, left, over, pct, pctBar, mom, story, saved, monthKey: pulse.monthKey };
}

function orientirTipHtml(model) {
  const { goal, spent, left, over, pct, pctBar, mom, story, saved, monthKey } = model;
  const breach = over
    ? `<p class="home-pulse__orient-breach">
        <span class="home-pulse__orient-breach-title">Не дотримуєтесь плану</span>
        <span class="home-pulse__orient-breach-amt">${moneyStackHtml(spent - goal, { prefix: "+" })}</span>
      </p>`
    : `<p class="home-pulse__orient-breach home-pulse__orient-breach--ok">
        <span class="home-pulse__orient-breach-title">У межах орієнтира</span>
        <span class="home-pulse__orient-breach-amt is-ok">${moneyStackHtml(left)}</span>
      </p>`;
  const status = over
    ? `Вже ${esc(money(spent))} з ${esc(money(goal))} · понад орієнтир (${pct}%)`
    : `Вже ${esc(money(spent))} з ${esc(money(goal))} · лишається ~${esc(money(left))}`;
  const source = saved
    ? "Ваш орієнтир на цьому пристрої — м’яка ціль, не банківський ліміт."
    : "Підказаний орієнтир (можна змінити ✎) — м’яка ціль, не банківський ліміт.";
  let bars = "";
  if (mom && mom.prevUah > 0) {
    const maxU = Math.max(mom.curUah, mom.prevUah, goal || 0) || 1;
    const prevLabel = monthLabelUa(mom.prevMonthKey).toLowerCase().slice(0, 3);
    const curLabel = monthLabelUa(monthKey).toLowerCase().slice(0, 3);
    const wPrev = Math.max(6, Math.round((mom.prevUah / maxU) * 100));
    const wCur = Math.max(6, Math.round((mom.curUah / maxU) * 100));
    bars = `<div class="home-pulse__orient-bars" aria-hidden="true">
      <div class="home-pulse__orient-bar"><span>${esc(prevLabel)}</span><i style="width:${wPrev}%"></i><strong class="num">${moneyStackHtml(mom.prevUah)}</strong></div>
      <div class="home-pulse__orient-bar is-now"><span>${esc(curLabel)}</span><i style="width:${wCur}%"></i><strong class="num">${moneyStackHtml(mom.curUah)}</strong></div>
    </div>`;
  }
  const storyLine = story ? `<p class="home-pulse__orient-story">${esc(story)}</p>` : "";
  return `<p class="home-pulse__tip-kicker">Орієнтир місяця</p>
    <p class="home-pulse__orient-def">${esc(source)}</p>
    ${breach}
    <p class="home-pulse__orient-stat">${status}</p>
    <div class="home-pulse__orient-track" aria-hidden="true"><i style="width:${pctBar}%"></i></div>
    ${bars}
    ${storyLine}`;
}

function bindOrientirTip(rootEl) {
  const btn = rootEl.querySelector("[data-orientir-tip]");
  const tip = rootEl.querySelector(".home-pulse__orient-tip");
  if (!btn || !tip) return;
  let pinned = false;
  const isMouse = (ev) => !ev.pointerType || ev.pointerType === "mouse";
  const show = () => {
    if (rootEl.classList.contains("home-pulse--goal-editing")) return;
    tip.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    rootEl.classList.add("home-pulse--orient-open");
    const sparkTip = rootEl.querySelector(".home-pulse__tip");
    if (sparkTip) sparkTip.hidden = true;
    const insightTip = rootEl.querySelector(".home-pulse__insight-tip");
    if (insightTip) insightTip.hidden = true;
  };
  const hide = () => {
    tip.hidden = true;
    pinned = false;
    btn.setAttribute("aria-expanded", "false");
    rootEl.classList.remove("home-pulse--orient-open");
  };
  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    if (pinned && !tip.hidden) {
      hide();
      return;
    }
    pinned = true;
    show();
  });
  btn.addEventListener("pointerenter", (ev) => {
    if (!isMouse(ev)) return;
    show();
  });
  btn.addEventListener("pointerleave", (ev) => {
    if (!isMouse(ev)) return;
    if (pinned) return;
    tip.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    rootEl.classList.remove("home-pulse--orient-open");
  });
  tip.addEventListener("pointerenter", (ev) => {
    if (!isMouse(ev)) return;
    show();
  });
  tip.addEventListener("pointerleave", (ev) => {
    if (!isMouse(ev)) return;
    if (pinned) return;
    tip.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    rootEl.classList.remove("home-pulse--orient-open");
  });
  btn.addEventListener("focus", () => show());
  btn.addEventListener("blur", () => {
    if (pinned) return;
    tip.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    rootEl.classList.remove("home-pulse--orient-open");
  });
  const onDoc = (ev) => {
    if (!btn.contains(ev.target) && !tip.contains(ev.target)) hide();
  };
  if (rootEl._orientClear) document.removeEventListener("pointerdown", rootEl._orientClear);
  rootEl._orientClear = onDoc;
  document.addEventListener("pointerdown", onDoc);
}

function insightMomTipHtml(mom, monthKey) {
  const cur = money(mom.curUah);
  const prev = money(mom.prevUah);
  const sign = mom.pct > 0 ? `+${mom.pct}%` : `${mom.pct}%`;
  const heroWord =
    mom.pct > 0 ? "дорожче за минулий місяць" : mom.pct < 0 ? "дешевше за минулий місяць" : "майже як минулий місяць";
  const curLabel = monthLabelUa(monthKey).toLowerCase().slice(0, 3);
  const prevLabel = monthLabelUa(mom.prevMonthKey).toLowerCase().slice(0, 3);
  return `<p class="home-pulse__tip-kicker">Місяці</p>
    <p class="home-pulse__insight-hero"><span class="home-pulse__insight-pct num">${esc(sign)}</span> ${esc(heroWord)}</p>
    <p class="home-pulse__insight-pace">Порівняння суми чеків цього місяця з попереднім — не тиждень і не орієнтир.</p>
    <div class="home-pulse__insight-compare" aria-label="Суми місяців">
      <div class="home-pulse__insight-col">
        <span>${esc(curLabel)}</span>
        <strong class="num">${esc(cur)}</strong>
      </div>
      <div class="home-pulse__insight-col">
        <span>${esc(prevLabel)}</span>
        <strong class="num">${esc(prev)}</strong>
      </div>
    </div>`;
}

function insightWowTipHtml(wow, pair, curPeakItems, weekPace) {
  const cur = money(wow.curUah);
  const prev = money(wow.prevUah);
  const sign = wow.pct > 0 ? `+${wow.pct}%` : `${wow.pct}%`;
  const heroWord =
    wow.pct > 0 ? "дорожче за минулий тиждень" : wow.pct < 0 ? "дешевше за минулий тиждень" : "майже як минулий тиждень";
  let paceLine = "";
  if (weekPace > 0 && wow.curUah > 0) {
    const diff = Math.round(((wow.curUah - weekPace) / weekPace) * 100);
    paceLine =
      Math.abs(diff) < 8
        ? `<p class="home-pulse__insight-pace">близько до темпу · ~${esc(money(weekPace))}/тиж</p>`
        : diff > 0
          ? `<p class="home-pulse__insight-pace">вище темпу на ${diff}% · орієнтир ~${esc(money(weekPace))}/тиж</p>`
          : `<p class="home-pulse__insight-pace">нижче темпу на ${Math.abs(diff)}% · орієнтир ~${esc(money(weekPace))}/тиж</p>`;
  }
  const items = (curPeakItems || []).slice(0, 2);
  const list = items.length
    ? `<div class="home-pulse__insight-block">
        <p class="home-pulse__insight-block-label">Дорого цього тижня</p>
        <ul class="home-pulse__insight-list">${items
          .map((it) => {
            const day = tipDayLabel(it.at);
            return `<li>
              <span class="home-pulse__insight-day">${esc(day)}</span>
              <span class="home-pulse__insight-sku">${esc(shortSkuName(it.name))}</span>
              <strong class="home-pulse__insight-uah num">${moneyStackHtml(it.uah)}</strong>
            </li>`;
          })
          .join("")}</ul>
      </div>`
    : "";
  const pairLine =
    pair &&
    (pair.pct === 0
      ? `<p class="home-pulse__insight-foot">Останні два чеки майже рівні</p>`
      : `<p class="home-pulse__insight-foot">Останні чеки ${pair.pct > 0 ? `+${pair.pct}%` : `${pair.pct}%`} · ${esc(money(pair.newerUah))} vs ${esc(money(pair.olderUah))}</p>`);
  return `<p class="home-pulse__tip-kicker">Тижні</p>
    <p class="home-pulse__insight-hero"><span class="home-pulse__insight-pct num">${esc(sign)}</span> ${esc(heroWord)}</p>
    <div class="home-pulse__insight-compare" aria-label="Суми тижнів">
      <div class="home-pulse__insight-col">
        <span>цей</span>
        <strong class="num">${esc(cur)}</strong>
      </div>
      <div class="home-pulse__insight-col">
        <span>був</span>
        <strong class="num">${esc(prev)}</strong>
      </div>
    </div>
    ${paceLine}
    ${list}
    ${pairLine || ""}`;
}

function bindInsightTip(rootEl) {
  const btn = rootEl.querySelector("[data-insight-panel]");
  const tip = rootEl.querySelector(".home-pulse__insight-tip");
  if (!btn || !tip) return;
  let pinned = false;
  let leaveTimer = 0;
  const homeParent = tip.parentElement;
  const isMouse = (ev) => !ev.pointerType || ev.pointerType === "mouse";
  const placeTip = () => {
    const insight = rootEl.querySelector(".home-pulse__insight");
    if (!insight || !tip) return;
    const pr = rootEl.getBoundingClientRect();
    const ir = insight.getBoundingClientRect();
    tip.style.position = "absolute";
    tip.style.left = "12px";
    tip.style.right = "12px";
    tip.style.width = "auto";
    tip.style.top = `${Math.round(ir.bottom - pr.top + 8)}px`;
    tip.style.zIndex = "50";
  };
  const show = () => {
    if (rootEl.classList.contains("home-pulse--goal-editing")) return;
    clearTimeout(leaveTimer);
    tip.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    rootEl.classList.add("home-pulse--insight-open");
    if (tip.parentElement !== rootEl) rootEl.appendChild(tip);
    placeTip();
    const sparkTip = rootEl.querySelector(".home-pulse__tip");
    if (sparkTip) sparkTip.hidden = true;
    const orientTip = rootEl.querySelector(".home-pulse__orient-tip");
    if (orientTip) orientTip.hidden = true;
    const daysTip = rootEl.querySelector("#days-pace-tip");
    if (daysTip) daysTip.hidden = true;
    const reportTip = rootEl.querySelector("#month-report-tip");
    if (reportTip) reportTip.hidden = true;
  };
  const hide = () => {
    clearTimeout(leaveTimer);
    tip.hidden = true;
    pinned = false;
    btn.setAttribute("aria-expanded", "false");
    rootEl.classList.remove("home-pulse--insight-open");
    tip.style.top = "";
    tip.style.left = "";
    tip.style.right = "";
    tip.style.zIndex = "";
    if (homeParent && tip.parentElement !== homeParent) homeParent.appendChild(tip);
  };
  /** Leave chip→tip gap: delay full hide so spark opacity restores with tip. */
  const scheduleHide = () => {
    if (pinned) return;
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => {
      if (pinned) return;
      if (btn.matches(":hover") || tip.matches(":hover")) return;
      hide();
    }, 100);
  };
  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    if (pinned && !tip.hidden) {
      hide();
      return;
    }
    pinned = true;
    show();
  });
  btn.addEventListener("pointerenter", (ev) => {
    if (!isMouse(ev)) return;
    show();
  });
  btn.addEventListener("pointerleave", (ev) => {
    if (!isMouse(ev)) return;
    scheduleHide();
  });
  tip.addEventListener("pointerenter", (ev) => {
    if (!isMouse(ev)) return;
    show();
  });
  tip.addEventListener("pointerleave", (ev) => {
    if (!isMouse(ev)) return;
    scheduleHide();
  });
  btn.addEventListener("focus", () => show());
  btn.addEventListener("blur", () => scheduleHide());
  const onDoc = (ev) => {
    if (!btn.contains(ev.target) && !tip.contains(ev.target)) hide();
  };
  if (rootEl._insightClear) document.removeEventListener("pointerdown", rootEl._insightClear);
  rootEl._insightClear = onDoc;
  document.addEventListener("pointerdown", onDoc);
}

/** Sport pace tip — sessions left / ration window (not ₴ Express tip). */
function sportDaysPaceTipHtml({ daysLeft, leftSessions, sessionsDone, sessionGoal, kcal, dishes, loopGap }) {
  const days = Math.max(0, Number(daysLeft) || 0);
  const left = Math.max(0, Number(leftSessions) || 0);
  const done = Math.max(0, Number(sessionsDone) || 0);
  const goal = Math.max(1, Number(sessionGoal) || 5);
  const kcalN = Math.max(0, Number(kcal) || 0);
  const dishN = Math.max(0, Number(dishes) || 0);
  const perDay = days > 0 ? Math.round(kcalN / Math.max(days, 1)) : kcalN;
  const gapLine =
    loopGap && loopGap.side !== "none"
      ? `<p class="home-pulse__insight-pace"><strong>Цикл:</strong> ${esc(loopGap.copy)}</p>`
      : `<p class="home-pulse__insight-pace">Цикл: сесія ∧ раціон у чеклисті (не купівля).</p>`;
  return `<p class="home-pulse__tip-kicker">Дні до кінця місяця</p>
    <p class="home-pulse__insight-hero"><span class="home-pulse__insight-pct num">${days}</span> дн. · ще ${left} з ${goal} занять</p>
    <p class="home-pulse__insight-pace">Зроблено ${done}. Раціон за вікно: <strong class="num">${esc(formatIntUa(kcalN))}</strong> ккал${dishN ? ` · ${dishN} ${esc(uaDishes(dishN))}` : ""}${days > 0 ? ` · ≈ ${esc(formatIntUa(perDay))}/день` : ""}.</p>
    ${gapLine}
    <ul class="home-pulse__insight-list home-pulse__insight-list--pace">
      <li><span>Заняття</span><strong>${left > 0 ? "закрий ще кілька сесій до кінця місяця" : "ціль занять уже закрита"}</strong></li>
      <li><span>Раціон</span><strong>чеклист Express · орієнтир з чеків для ккал</strong></li>
    </ul>`;
}

function sportMonthReportTipHtml({ monthKey, sessionsDone, sessionGoal, kcal, dishes }) {
  const lab = monthLabelUa(monthKey).toLowerCase();
  const done = Math.max(0, Number(sessionsDone) || 0);
  const goal = Math.max(1, Number(sessionGoal) || 5);
  const met = done >= goal;
  return `<p class="home-pulse__tip-kicker">Звіт · ${esc(lab)}</p>
    <p class="home-pulse__insight-hero"><span class="home-pulse__insight-pct num">${met ? "✓" : done}</span> ${met ? `ціль ${goal} занять` : `з ${goal} занять`}</p>
    <p class="home-pulse__insight-pace">Раціон місяця в картці: <strong class="num">${esc(formatIntUa(kcal))}</strong> ккал${dishes > 0 ? ` · ${dishes} ${esc(uaDishes(dishes))}` : ""}.</p>`;
}

/** Pace tip for remaining days chip — soft shopping suggestions vs month goal. */
function daysLeftPaceTipHtml({ daysLeft, leftUah, overGoal, overUah, weekBudget, topItems }) {
  const days = Math.max(0, Number(daysLeft) || 0);
  const left = Math.max(0, Number(leftUah) || 0);
  const over = Math.max(0, Number(overUah) || 0);
  const wb = Math.max(0, Number(weekBudget) || 0);
  if (overGoal) {
    const softCap = days > 0 ? Math.max(80, Math.round((wb || 400) * 0.45)) : 0;
    return `<p class="home-pulse__tip-kicker">Дні до кінця місяця</p>
    <p class="home-pulse__insight-hero"><span class="home-pulse__insight-pct num">${days}</span> дн. · уже +${esc(money(over))} понад орієнтир</p>
    <p class="home-pulse__insight-pace">Щоб не роздувати перевищення — дрібні чеки${softCap ? ` до ~${esc(money(softCap))}` : ""}, без «дорогих» разових покупок.</p>
    <ul class="home-pulse__insight-list home-pulse__insight-list--pace">
      <li><span>Стоп</span><strong>великі категорії «для запасу»</strong></li>
      <li><span>Ок</span><strong>хліб, молоко, база під час тижня</strong></li>
    </ul>`;
  }
  const perDay = days > 0 ? left / days : left;
  const tripCap = wb > 0 ? Math.min(left, wb) : Math.min(left, Math.max(perDay * 3, 500));
  const trips = tripCap > 0 ? Math.max(1, Math.floor(left / tripCap)) : 1;
  const tops = (topItems || []).slice(0, 3);
  const avoid = tops.filter((t) => Number(t.uah) > perDay * 2.2).slice(0, 2);
  const okish = tops.filter((t) => Number(t.uah) > 0 && Number(t.uah) <= perDay * 1.35).slice(0, 1);
  const avoidLi = avoid
    .map(
      (t) =>
        `<li><span>Обережно</span><strong>${esc(tipSkuName(t.name, 28))}</strong><em class="num">${esc(money(t.uah))}</em></li>`,
    )
    .join("");
  const okLi = okish.length
    ? okish
        .map(
          (t) =>
            `<li><span>Якщо треба</span><strong>${esc(tipSkuName(t.name, 28))}</strong><em class="num">до ~${esc(money(t.uah))}</em></li>`,
        )
        .join("")
    : `<li><span>Ідея</span><strong>база / «зібрати тиждень»</strong><em class="num">до ~${esc(money(tripCap))}</em></li>`;
  return `<p class="home-pulse__tip-kicker">Дні до кінця місяця</p>
    <p class="home-pulse__insight-hero"><span class="home-pulse__insight-pct num">${days}</span> дн. · ще ≈ ${esc(money(left))}</p>
    <p class="home-pulse__insight-pace">Щоб не вийти за орієнтир: ≈ <strong class="num">${esc(money(perDay))}</strong>/день · до ${trips}&nbsp;чек${trips === 1 ? "а" : "ів"} по ~${esc(money(tripCap))}.</p>
    <ul class="home-pulse__insight-list home-pulse__insight-list--pace">
      ${okLi}
      ${avoidLi || `<li><span>Порада</span><strong>відкладіть разові «дорого»</strong><em>на наступний місяць</em></li>`}
    </ul>`;
}

/** Archive month recap — what went well vs risky/excess. */
function monthReportTipHtml({ monthKey, spentUah, goalUah, overGoal, overUah, leftUah, mom, topItems }) {
  const lab = monthLabelUa(monthKey).toLowerCase();
  const spent = Number(spentUah) || 0;
  const goal = Number(goalUah) || 0;
  const over = Math.max(0, Number(overUah) || 0);
  const left = Math.max(0, Number(leftUah) || 0);
  const hero = overGoal
    ? `<span class="home-pulse__insight-pct num">+${esc(money(over))}</span> понад орієнтир`
    : left > goal * 0.05
      ? `<span class="home-pulse__insight-pct num">✓</span> уклались · запас ≈ ${esc(money(left))}`
      : `<span class="home-pulse__insight-pct num">≈</span> майже в межах орієнтира`;
  const good = [];
  if (!overGoal && goal > 0) good.push({ k: "Добре", t: "трималися цілі витрат", e: money(goal) });
  if (mom && mom.prevUah > 0 && mom.pct < 0) {
    good.push({ k: "Добре", t: `дешевше за попередній (${mom.pct}%)`, e: money(mom.prevUah) });
  }
  if (mom && mom.prevUah > 0 && mom.pct === 0) {
    good.push({ k: "Добре", t: "темп як у попередньому місяці", e: "" });
  }
  if (!good.length && !overGoal) {
    good.push({ k: "Добре", t: "місяць закрито без різкого перевищення", e: "" });
  }
  const risky = [];
  if (overGoal) {
    risky.push({ k: "Ризик", t: "вихід за м’який орієнтир", e: `+${money(over)}` });
  }
  if (mom && mom.prevUah > 0 && mom.pct > 8) {
    risky.push({ k: "Ризик", t: `дорожче за попередній (+${mom.pct}%)`, e: money(spent) });
  }
  const tops = (topItems || []).slice(0, 3);
  for (const row of buildMonthReportRiskyTopRows({
    topItems: tops,
    goalUah: goal,
    monthKey,
    labels: loadWasteLabels(),
  })) {
    risky.push({
      k: row.k,
      t: tipSkuName(row.t, 28),
      e: money(row.uah),
    });
  }
  if (!risky.length) {
    risky.push({ k: "Ок", t: "явних «червоних» разових піків не видно", e: "" });
  }
  const wasteFoot =
    risky.some((r) => r.k === USER_WASTE_ROW_LABEL) || loadWasteLabels().some((e) => e.monthKey === monthKey)
      ? `<p class="home-pulse__insight-pace muted">«Зайве» у звіті — лише з вашої мітки на позиції нижче.</p>`
      : "";
  const markRows = (topItems || [])
    .slice(0, 3)
    .filter((t) => Number(t.uah) > 0)
    .map((t) => {
      const on = isUserLabeledWaste(t.name, monthKey);
      return `<li class="home-pulse__waste-mark">
        <button type="button" class="home-pulse__waste-toggle${on ? " is-on" : ""}" data-waste-toggle data-waste-name="${esc(t.name)}" data-waste-month="${esc(monthKey)}" aria-pressed="${on ? "true" : "false"}" aria-label="${esc(wasteToggleAria(on))}">${esc(wasteToggleCopy(on))}</button>
        <span>${esc(tipSkuName(t.name, 32))}</span>
        <em class="num">${esc(money(t.uah))}</em>
      </li>`;
    })
    .join("");
  const wasteMarks = markRows
    ? `<p class="home-pulse__tip-kicker">Ваша мітка</p>
    <ul class="home-pulse__insight-list home-pulse__insight-list--waste">${markRows}</ul>`
    : "";
  const li = (rows) =>
    rows
      .slice(0, 4)
      .map(
        (r) =>
          `<li><span>${esc(r.k)}</span><strong>${esc(r.t)}</strong>${r.e ? `<em class="num">${esc(r.e)}</em>` : "<em></em>"}</li>`,
      )
      .join("");
  return `<p class="home-pulse__tip-kicker">Звіт · ${esc(lab)}</p>
    <p class="home-pulse__insight-hero">${hero}</p>
    <p class="home-pulse__insight-pace">Підсумок місяця: витрачено <strong class="num">${esc(money(spent))}</strong>${goal > 0 ? ` з орієнтира ${esc(money(goal))}` : ""}.</p>
    <ul class="home-pulse__insight-list home-pulse__insight-list--pace">
      ${li(good)}
      ${li(risky)}
    </ul>${wasteMarks}${wasteFoot}`;
}

function bindDeltaFootTip(rootEl) {
  const btn = rootEl.querySelector("[data-days-pace-tip], [data-month-report-tip]");
  const tipId = btn?.getAttribute("aria-controls");
  const tip =
    (tipId && rootEl.querySelector(`#${CSS.escape(tipId)}`)) ||
    rootEl.querySelector("#days-pace-tip, #month-report-tip, #sport-days-pace-tip, #sport-month-report-tip");
  if (!btn || !tip) return;
  let pinned = false;
  let leaveTimer = 0;
  const homeParent = tip.parentElement;
  const openClass = btn.hasAttribute("data-month-report-tip")
    ? "home-pulse--month-report-open"
    : "home-pulse--days-pace-open";
  const isMouse = (ev) => !ev.pointerType || ev.pointerType === "mouse";
  const placeTip = () => {
    const meta =
      rootEl.querySelector(".home-pulse__delta-meta--pace, .home-pulse__delta-meta--report") || btn;
    const pr = rootEl.getBoundingClientRect();
    const ir = meta.getBoundingClientRect();
    tip.style.position = "absolute";
    tip.style.left = "12px";
    tip.style.right = "12px";
    tip.style.width = "auto";
    tip.style.top = `${Math.round(ir.bottom - pr.top + 8)}px`;
    tip.style.zIndex = "50";
  };
  const show = () => {
    if (rootEl.classList.contains("home-pulse--goal-editing")) return;
    clearTimeout(leaveTimer);
    tip.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    rootEl.classList.add(openClass);
    if (tip.parentElement !== rootEl) rootEl.appendChild(tip);
    placeTip();
    const sparkTip = rootEl.querySelector(".home-pulse__tip");
    if (sparkTip) sparkTip.hidden = true;
    const insightTip = rootEl.querySelector("#insight-tip");
    if (insightTip) insightTip.hidden = true;
    const orientTip = rootEl.querySelector(".home-pulse__orient-tip");
    if (orientTip) orientTip.hidden = true;
    if (btn.hasAttribute("data-month-report-tip")) bindWasteLabelToggles(rootEl);
  };
  const hide = () => {
    clearTimeout(leaveTimer);
    tip.hidden = true;
    pinned = false;
    btn.setAttribute("aria-expanded", "false");
    rootEl.classList.remove(openClass);
    tip.style.top = "";
    tip.style.left = "";
    tip.style.right = "";
    tip.style.zIndex = "";
    if (homeParent && tip.parentElement !== homeParent) homeParent.appendChild(tip);
  };
  const scheduleHide = () => {
    if (pinned) return;
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => {
      if (pinned) return;
      if (btn.matches(":hover") || tip.matches(":hover")) return;
      hide();
    }, 100);
  };
  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    if (pinned && !tip.hidden) {
      hide();
      return;
    }
    pinned = true;
    show();
  });
  btn.addEventListener("pointerenter", (ev) => {
    if (!isMouse(ev)) return;
    show();
  });
  btn.addEventListener("pointerleave", (ev) => {
    if (!isMouse(ev)) return;
    scheduleHide();
  });
  tip.addEventListener("pointerenter", (ev) => {
    if (!isMouse(ev)) return;
    show();
  });
  tip.addEventListener("pointerleave", (ev) => {
    if (!isMouse(ev)) return;
    scheduleHide();
  });
  btn.addEventListener("focus", () => show());
  btn.addEventListener("blur", () => scheduleHide());
  const onDoc = (ev) => {
    if (!btn.contains(ev.target) && !tip.contains(ev.target)) hide();
  };
  if (rootEl._deltaFootClear) document.removeEventListener("pointerdown", rootEl._deltaFootClear);
  rootEl._deltaFootClear = onDoc;
  document.addEventListener("pointerdown", onDoc);
}

function isHomeTopSkuOk(name) {
  const n = String(name || "");
  if (/сигар|цигар|тютюн|парламент|marlboro|winston|\bld\b|camel|philip|iqos|heated/i.test(n)) return false;
  try {
    if (envelopeOf(toStaple(n)) === "tobacco") return false;
  } catch {
    /* ignore */
  }
  return true;
}

function receiptMonthKeys(receipts) {
  const set = new Set();
  for (const r of receipts || []) {
    const mk = monthKeyFromAt(r.at);
    if (mk) set.add(mk);
  }
  const cur = currentMonthKey();
  set.add(cur);
  return [...set].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
}

/** Resolve pulse month + neighbor availability for ‹ ›. */
function resolvePulseMonthNav(receipts) {
  const keys = receiptMonthKeys(receipts);
  const cur = currentMonthKey();
  let monthKey = state.pulseMonthKey || cur;
  if (!keys.includes(monthKey)) monthKey = keys[0] || cur;
  state.pulseMonthKey = monthKey;
  const idx = keys.indexOf(monthKey);
  return {
    monthKey,
    keys,
    isArchive: monthKey !== cur,
    canPrev: idx >= 0 && idx < keys.length - 1,
    canNext: idx > 0,
    prevKey: idx >= 0 && idx < keys.length - 1 ? keys[idx + 1] : null,
    nextKey: idx > 0 ? keys[idx - 1] : null,
  };
}

/** Sport card month nav — independent of Express `pulseMonthKey`. */
function resolveSportPulseMonthNav(receipts) {
  const keys = sportMonthKeys(receipts);
  const cur = currentMonthKey();
  let monthKey = state.sportPulseMonthKey || cur;
  if (!keys.includes(monthKey)) monthKey = keys[0] || cur;
  state.sportPulseMonthKey = monthKey;
  const idx = keys.indexOf(monthKey);
  return {
    monthKey,
    keys,
    isArchive: monthKey !== cur,
    canPrev: idx >= 0 && idx < keys.length - 1,
    canNext: idx > 0,
    prevKey: idx >= 0 && idx < keys.length - 1 ? keys[idx + 1] : null,
    nextKey: idx > 0 ? keys[idx - 1] : null,
  };
}

function homePulseHtml(hasToken) {
  /** Jury: hide «Дорого цього місяця» until list UX is locked; chart tops still drive hot marks. */
  const SHOW_HOME_MONTH_EXPENSIVE = false;
  const SHOW_HOME_WEEK_CTA = false;
  const cache = state.historyCache;
  const receipts = cache?.receipts || [];
  if (!receipts.length) {
    const tip = hasToken
      ? "Чеків за період ще немає — зберіть тиждень, і тут з’явиться ваш ритм."
      : "Поки демо-тиша. Увійдіть для живих чеків — або одразу зберіть тиждень на фікстурі.";
    return `
      <section class="home-pulse home-pulse--empty" aria-label="Витрати">
        <p class="home-pulse__kicker">ВАШІ ЧЕКИ СІЛЬПО</p>
        <p class="home-pulse__empty">${esc(tip)}</p>
        <button type="button" class="home-pulse__cta" data-go="shop">Зібрати тиждень →</button>
      </section>`;
  }
  const nav = resolvePulseMonthNav(receipts);
  const monthKey = nav.monthKey;
  const draft = aggregateMonthPulse(receipts, { monthKey, goalUah: 1, topN: 8, seriesWeeks: 5 });
  const weekBudget = Number(state.intentShop.constraints.budgetUah) || 1500;
  const resolved = resolveMonthGoalUah(undefined, { spentUah: draft.spentUah, weekBudget });
  const pulse = { ...draft, goalUah: resolved.goalUah };
  const overGoal = pulse.goalUah > 0 && pulse.spentUah > pulse.goalUah;
  const fullSeries = pulse.series || [];
  const mom = monthOverMonthDelta(receipts, monthKey);
  const wow = weekOverWeekDelta(fullSeries);
  const pair = receiptPairDelta(receipts);
  /** Chart = month weeks + prior-month anchor week. */
  const chartSeries =
    pulse.chartSeries?.length
      ? pulse.chartSeries
      : fullSeries.filter((s) => String(s.weekStart || "").slice(0, 7) === monthKey);
  const seriesForChart = chartSeries.length ? chartSeries : fullSeries;
  const monthWeeks = seriesForChart.filter((s) => !s.prior);
  const weekPace =
    pulse.goalUah > 0 ? pulse.goalUah / Math.max(4, monthWeeks.length || 4) : 0;
  const chartW = pulseChartWidth();
  const xPad = 2;
  const { older: olderKeys, newer: newerKeys } = neighborMonthKeys(nav.keys, monthKey, 2);
  const strip = buildSparkPanStripFromNeighbors({
    older: olderKeys.map((mk) => buildMonthWeekChartSeries(receipts, mk)),
    cur: seriesForChart,
    newer: newerKeys.map((mk) => buildMonthWeekChartSeries(receipts, mk)),
  });
  const seriesStrip = strip.series;
  const curStart = strip.curStartIdx;
  const refLen = Math.max(2, seriesForChart.length, ...(strip.segmentLens || []));
  const pitch = (chartW - 2 * xPad) / (refLen - 1);
  const stripW =
    seriesStrip.length > 1 ? Math.round(2 * xPad + pitch * (seriesStrip.length - 1)) : chartW;
  const sharedMax = sparkSharedYMax(seriesStrip, {
    historyMax: historyWeekSpendMax(receipts),
    weekPace,
  });
  const geom = pulseRibbonGeom(seriesStrip, stripW, 108, 0, { xPad, maxUah: sharedMax });
  const sparkRestX = Math.round(curStart * pitch);
  const sparkPeekLeft = sparkRestX;
  const sparkPeekRight = Math.max(0, stripW - sparkRestX - chartW);
  const sparkCommitPrev = Math.round((Number(strip.nearestOlderLen) || 0) * pitch);
  const sparkCommitNext =
    Number(strip.nearestNewerLen) > 0
      ? Math.round((Number(strip.curLen) || seriesForChart.length || 0) * pitch)
      : 0;
  const sparkSegLens = (strip.segmentLens || [seriesForChart.length]).join(",");
  const sparkSegI = Number(strip.centerSegIndex) || 0;
  const peaksRaw = weekExpensivePeaks(receipts, monthWeeks, { topN: 2, minUah: 150 }).map((p) => ({
    ...p,
    items: (p.items || []).filter(
      (it) => isHomeTopSkuOk(it.name) && monthKeyFromAt(it.at) === monthKey,
    ),
  }));
  const peaks = seriesForChart.map((s) => {
    if (s.prior) return { weekStart: s.weekStart, uah: s.uah, items: [] };
    return (
      peaksRaw.find((p) => p.weekStart === s.weekStart) || {
        weekStart: s.weekStart,
        uah: s.uah,
        items: [],
      }
    );
  });
  let curWeekIdx = Math.max(0, seriesForChart.length - 1);
  for (let i = seriesForChart.length - 1; i >= 0; i--) {
    if (!seriesForChart[i]?.prior) {
      curWeekIdx = i;
      break;
    }
  }
  const curPeakItems = (peaks[curWeekIdx]?.items || []).filter(
    (it) => monthKeyFromAt(it.at) === monthKey,
  );
  let insightUnderSpent = "";
  const dirArrow = (up) =>
    `<span class="home-pulse__dir" aria-hidden="true">${up ? "↑" : "↓"}</span>`;
  if (mom && mom.prevUah > 0) {
    const sign = mom.pct > 0 ? `+${mom.pct}%` : mom.pct < 0 ? `${mom.pct}%` : "0%";
    const tipBody = insightMomTipHtml(mom, monthKey);
    const prevShort = monthLabelUa(mom.prevMonthKey).toLowerCase().slice(0, 3);
    const trail = mom.pct === 0 ? `як ${prevShort}` : `vs ${prevShort}`;
    const arrow = mom.pct === 0 ? "" : dirArrow(mom.pct > 0);
    const tone = mom.pct > 0 ? "is-up" : mom.pct < 0 ? "is-down" : "";
    insightUnderSpent = `<span class="home-pulse__delta-wrap">
      <button type="button" class="home-pulse__phrase-btn home-pulse__insight home-pulse__insight--under home-pulse__insight--compact" data-insight-panel="1" aria-expanded="false" aria-controls="insight-tip" aria-label="Порівняння з минулим місяцем ${esc(sign)}. Пояснення">
        <span class="home-pulse__delta-chip num ${tone}">${arrow}${esc(sign)}</span>
        <span class="home-pulse__insight-trail">${esc(trail)}</span>
      </button>
      <div class="home-pulse__insight-tip" id="insight-tip" role="tooltip" hidden>${tipBody}</div>
    </span>`;
  } else if (wow) {
    const sign = wow.pct > 0 ? `+${wow.pct}%` : wow.pct < 0 ? `${wow.pct}%` : "0%";
    const tipBody = insightWowTipHtml(wow, pair, curPeakItems, weekPace);
    const trail =
      wow.pct === 0
        ? "як минулий тиждень"
        : wow.pct > 0
          ? "дорожче за минулий"
          : "дешевше за минулий";
    const arrow = wow.pct === 0 ? "" : dirArrow(wow.pct > 0);
    const tone = wow.pct > 0 ? "is-up" : wow.pct < 0 ? "is-down" : "";
    insightUnderSpent = `<span class="home-pulse__delta-wrap">
      <button type="button" class="home-pulse__phrase-btn home-pulse__insight home-pulse__insight--under" data-insight-panel="1" aria-expanded="false" aria-controls="insight-tip" aria-label="Порівняння з минулим тижнем ${esc(sign)}. Деталі">
        <span class="home-pulse__delta-chip num ${tone}">${arrow}${esc(sign)}</span>
        <span class="home-pulse__insight-trail">${esc(trail)}</span>
      </button>
      <div class="home-pulse__insight-tip" id="insight-tip" role="tooltip" hidden>${tipBody}</div>
    </span>`;
  } else {
    const insight = pulseInsightLine(pulse, receipts);
    if (insight) {
      insightUnderSpent = `<div class="home-pulse__insight home-pulse__insight--under home-pulse__insight--solo">${esc(insight)}</div>`;
    }
  }
  const coverageNote =
    pulse.coverage.totalLines > 0 && pulse.coverage.pricedLines < pulse.coverage.totalLines
      ? `<p class="home-pulse__note">сума з рядків із ціною · неповні дані (${pulse.coverage.pricedLines}/${pulse.coverage.totalLines})</p>`
      : "";
  const monthTops = (pulse.topExpensive || [])
    .filter((t) => isHomeTopSkuOk(t.name))
    .slice(0, 4);
  const monthWeekKeys = new Set(monthWeeks.map((s) => s.weekStart).filter(Boolean));
  const rankedWeeks = seriesForChart
    .map((s, i) => ({
      i,
      uah: Number(s.uah) || 0,
      weekStart: s.weekStart,
      prior: Boolean(s.prior),
    }))
    .filter((c) => c.uah > 0 && !c.prior)
    .sort((a, b) => b.uah - a.uah);
  const hotIds = new Set(
    rankedWeeks
      .filter((c) => {
        const ws = c.weekStart;
        return ws && monthWeekKeys.has(ws) && weekPace > 0 && c.uah > weekPace * 1.15;
      })
      .slice(0, 3)
      .map((c) => c.i),
  );
  for (const t of monthTops) {
    const idx = nearestSeriesIndex(seriesForChart, t.at);
    if (
      idx >= 0 &&
      !seriesForChart[idx]?.prior &&
      (peaks[idx]?.items?.length || (seriesForChart[idx]?.uah || 0) > 0)
    ) {
      hotIds.add(idx);
    }
  }
  if (hotIds.size > 3) {
    const keep = rankedWeeks
      .filter((c) => hotIds.has(c.i) && monthWeekKeys.has(c.weekStart))
      .slice(0, 3)
      .map((c) => c.i);
    hotIds.clear();
    keep.forEach((i) => hotIds.add(i));
  }
  const curLastIdx = Math.max(0, seriesForChart.length - 1);
  const stripLastIdx = Math.max(0, geom.coords.length - 1);
  const marksSvg = geom.coords
    .map((c) => {
      const row = seriesStrip?.[c.i];
      const prior = Boolean(row?.prior);
      if (!(c.uah > 0) && !prior) return "";
      if (prior && !(c.uah > 0)) return "";
      const inCur = c.i >= curStart && c.i < curStart + seriesForChart.length;
      const curIdx = c.i - curStart;
      const peak = inCur ? peaks[curIdx] : null;
      const hot = inCur && !prior && hotIds.has(curIdx);
      const tipOk = hot && peak?.items?.length;
      const isNow = inCur && !prior && curIdx === curLastIdx;
      const ws = row?.weekStart || "";
      const tipX = `data-tip-x="${c.x.toFixed(1)}" data-tip-y="${c.y.toFixed(1)}" data-week-uah="${c.uah}"`;
      const peakAttr = inCur ? ` data-spark-peak="${curIdx}"` : "";
      if (prior) {
        return `<circle class="home-pulse__mark is-prior"${peakAttr} data-week-start="${esc(ws)}" data-prior="1" ${tipX} cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3.5" aria-hidden="true" />`;
      }
      if (tipOk) {
        return `<circle class="home-pulse__mark is-hot"${peakAttr} data-week-start="${esc(ws)}" ${tipX} cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="5.5" tabindex="0" role="button" aria-label="Дорогий тиждень" />`;
      }
      if (isNow) {
        return `<circle class="home-pulse__mark is-now"${peakAttr} data-week-start="${esc(ws)}" ${tipX} cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3.75" />`;
      }
      return `<circle class="home-pulse__mark is-soft"${peakAttr} data-week-start="${esc(ws)}" ${tipX} cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="2.6" aria-hidden="true" />`;
    })
    .join("");
  const weekAxis = geom.coords
    .map((c) => {
      const row = seriesStrip?.[c.i];
      const ws = row?.weekStart;
      if (!ws) return "";
      const d = new Date(`${ws}T12:00:00.000Z`);
      if (Number.isNaN(d.getTime())) return "";
      const lab = String(d.getUTCDate());
      const inCur = c.i >= curStart && c.i < curStart + seriesForChart.length;
      const curIdx = c.i - curStart;
      const atStart = c.i === 0;
      const atEnd = c.i === stripLastIdx;
      const left = atStart ? 0 : atEnd ? 100 : geom.w > 0 ? (c.x / geom.w) * 100 : 0;
      const cls = [
        "home-pulse__week-tick",
        "home-pulse__week-tick--day",
        row?.prior ? "is-prior" : "",
        atStart ? "is-edge-start" : "",
        atEnd ? "is-edge-end" : "",
        inCur && hotIds.has(curIdx) ? "is-hot" : "",
        inCur && !row?.prior && curIdx === curLastIdx ? "is-now" : "",
        c.uah > 0 ? "is-spend" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const peakAttr = inCur ? ` data-spark-peak="${curIdx}"` : "";
      return `<span class="${cls}"${peakAttr} data-peak-x="${Number(c.x || 0).toFixed(1)}" style="left:${left.toFixed(2)}%">${esc(lab)}</span>`;
    })
    .join("");
  let hotDateCaption = "";
  const byId = Object.fromEntries(receipts.map((x) => [x.id, x]));
  const hasHotTips = [...hotIds].some((i) => peaks[i]?.items?.length);
  const pulseReceipts = receipts || [];
  const tops = monthTops
    .map((t) => {
      const day = tipDayLabel(t.at);
      const letter = thumbLetter(t.name);
      const ws = weekStartISO(t.at) || "";
      let chartIdx = nearestSeriesIndex(seriesForChart, t.at);
      if (chartIdx >= 0 && seriesForChart[chartIdx]?.prior) {
        chartIdx = seriesForChart.findIndex((s, i) => i > chartIdx && !s.prior);
      }
      const peakAttr = chartIdx >= 0 ? ` data-spark-peak="${chartIdx}"` : "";
      const weekAttr = ws ? ` data-week-start="${esc(ws)}"` : "";
      const chartWs = chartIdx >= 0 ? seriesForChart[chartIdx]?.weekStart || ws : ws;
      const chartWeekAttr = chartWs ? ` data-chart-week="${esc(chartWs)}"` : "";
      const weekUah = chartIdx >= 0 ? Number(seriesForChart[chartIdx]?.uah) || 0 : 0;
      const weekUahAttr = weekUah > 0 ? ` data-week-uah="${weekUah}"` : "";
      const beacon = pulseExpensiveBeacon(t.name, pulseReceipts);
      const statusHtml =
        beacon.kind !== "none" && beacon.copy
          ? `<span class="home-pulse__sku-status home-pulse__sku-status--${esc(beacon.kind)}" title="${esc(beacon.tip || beacon.copy)}">${esc(beacon.copy)}</span>`
          : "";
      const wasteOn = isUserLabeledWaste(t.name, monthKey);
      const wasteBtn = `<button type="button" class="home-pulse__waste-toggle${wasteOn ? " is-on" : ""}" data-waste-toggle data-waste-name="${esc(t.name)}" data-waste-month="${esc(monthKey)}" aria-pressed="${wasteOn ? "true" : "false"}" aria-label="${esc(wasteToggleAria(wasteOn))}">${esc(wasteToggleCopy(wasteOn))}</button>`;
      const ariaExtra = beacon.copy ? ` · ${beacon.copy}` : "";
      return `<div class="home-pulse__sku"${peakAttr}${weekAttr}${chartWeekAttr}${weekUahAttr} aria-label="${esc(t.name)} · ${esc(day)} · ${esc(money(t.uah))}${esc(ariaExtra)}"${chartIdx >= 0 ? ' tabindex="0"' : ""}>
        <span class="home-pulse__sku-thumb" aria-hidden="true">${esc(letter)}</span>
        <span class="home-pulse__sku-meta">
          <span class="home-pulse__sku-name">${esc(tipSkuName(t.name, 36))}</span>
          <span class="home-pulse__sku-day">${esc(day)}</span>
          ${statusHtml}
        </span>
        <span class="home-pulse__sku-side">
          ${wasteBtn}
          <strong class="home-pulse__sku-uah num">${moneyStackHtml(t.uah)}</strong>
        </span>
      </div>`;
    })
    .join("");
  const topsBlock =
    SHOW_HOME_MONTH_EXPENSIVE && tops
      ? `<div class="home-pulse__skus" aria-label="Найдорожчі цього місяця">
        <p class="home-pulse__skus-label">Дорого цього місяця</p>
        ${tops}
      </div>`
      : "";
  const hotIdx = [...hotIds][0];
  if (SHOW_HOME_MONTH_EXPENSIVE && !monthTops.length && hotIdx != null && peaks[hotIdx]?.items?.[0]) {
    const it = peaks[hotIdx].items[0];
    const day = tipDayLabel(it.at);
    const sku = shortSkuName(it.name);
    const sum = money(it.uah);
    hotDateCaption = `<button type="button" class="home-pulse__peak-caption" data-spark-peak="${hotIdx}" aria-label="Пік: ${esc(day)} · ${esc(sku)}"><strong>${esc(day)}</strong> · ${esc(sku)} · ${esc(sum)}</button>`;
  }
  const chartGrid = pulseChartGridSvg(geom);
  const weekBadges = weekBadgeModels(seriesStrip, geom, weekPace).filter((b) => {
    const inCur = b.i >= curStart && b.i < curStart + seriesForChart.length;
    const curIdx = b.i - curStart;
    if (b.prior) return true;
    if (inCur) return hotIds.has(curIdx) || curIdx === curLastIdx;
    return b.uah > 0;
  });
  const weekBadgesHtml = weekBadges.length
    ? `<div class="home-pulse__week-badges" aria-label="Суми по тижнях">${weekBadges
        .map((b) => {
          const inCur = b.i >= curStart && b.i < curStart + seriesForChart.length;
          const curIdx = b.i - curStart;
          const viewX = Number(b.peakX) - sparkRestX;
          const atStart = b.i === 0 || viewX < 40;
          const atEnd = b.i === stripLastIdx || viewX > chartW - 40;
          const left = atStart && b.i === 0 ? 0 : atEnd && b.i === stripLastIdx ? 100 : geom.w > 0 ? (b.peakX / geom.w) * 100 : 0;
          const top = geom.h > 0 ? (b.peakY / geom.h) * 100 : 0;
          const cls = [
            "home-pulse__week-badge",
            "num",
            b.over && inCur ? "is-over" : "",
            b.prior ? "is-prior" : "",
            atStart ? "is-edge-start" : "",
            atEnd ? "is-edge-end" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const title = b.prior
            ? `Минулий місяць · ${money(b.uah)}`
            : `Тиждень з ${tipDayLabel(`${b.weekStart}T12:00:00.000Z`)} · ${money(b.uah)}`;
          const interactive = inCur && !b.prior;
          const peakAttr = interactive ? ` data-spark-peak="${curIdx}"` : "";
          const tipAttr = interactive
            ? ` data-tip-x="${Number(b.peakX || 0).toFixed(1)}" data-tip-y="${Number(b.peakY || 0).toFixed(1)}" data-week-uah="${b.uah}"`
            : "";
          const roleAttr = interactive ? ` tabindex="0" role="button"` : "";
          return `<span class="${cls}" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%" title="${esc(title)}" data-week-start="${esc(b.weekStart)}" data-peak-x="${Number(b.peakX || 0).toFixed(1)}"${peakAttr}${tipAttr}${roleAttr}>${esc(moneyBadge(b.uah))}</span>`;
        })
        .join("")}</div>`
    : "";
  const ribbonFillId = `pulseRibbonFill-${String(monthKey).replace(/[^\d]/g, "")}`;
  const pills =
    hasHotTips || monthTops.length
      ? ""
      : (pulse.recentReceiptIds || [])
          .slice(0, 2)
          .map((id) => {
            const rec = byId[id];
            if (!rec) return "";
            const d = rec.at ? new Date(rec.at) : null;
            const label =
              d && !Number.isNaN(d.getTime())
                ? d.toLocaleDateString("uk-UA", { day: "numeric", month: "short" })
                : "чек";
            const ch = channelLabelUa(rec.channel);
            const sum = rec.totalUah != null ? money(rec.totalUah) : "—";
            return `<button type="button" class="home-pulse__pill" data-pulse-receipt="${esc(id)}"><span>${esc(label)}${ch ? ` · ${esc(ch)}` : ""}</span><strong class="num">${esc(sum)}</strong></button>`;
          })
          .join("");
  const orientModel = pulse.goalUah > 0 ? orientirTipModel(pulse, receipts, resolved) : null;
  const orientBody = orientModel ? orientirTipHtml(orientModel) : "";
  const monthShort = monthLabelUa(pulse.monthKey).toLowerCase();
  const planBare = Number.isFinite(pulse.goalUah)
    ? Math.round(pulse.goalUah).toLocaleString("uk-UA")
    : "—";
  const pencilIco = `<span class="home-pulse__goal-line-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></span>`;
  const orientArrow = orientModel
    ? Number(orientModel.pct) >= 100 || overGoal
      ? `<span class="home-pulse__dir" aria-hidden="true">↑</span>`
      : `<span class="home-pulse__dir" aria-hidden="true">↓</span>`
    : "";
  const statusPct = orientModel
    ? `<span class="home-pulse__kicker-pct-wrap">
          <button type="button" class="home-pulse__kicker-pct home-pulse__phrase-btn" data-orientir-tip="1" aria-expanded="false" aria-controls="orientir-tip" aria-label="${orientModel.pct}% від орієнтира. Пояснення орієнтира">
            <span class="home-pulse__pct-pill num">${orientArrow}${orientModel.pct}%</span>
            <span class="home-pulse__pct-trail">від орієнтира</span>
          </button>
          <div class="home-pulse__orient-tip" id="orientir-tip" role="tooltip" hidden>${orientBody}</div>
        </span>`
    : "";
  const monthPrevBtn = `<button type="button" class="home-pulse__month-btn" data-pulse-month-dir="-1" ${nav.canPrev ? "" : "disabled "}aria-label="Попередній місяць">‹</button>`;
  const monthNextBtn = `<button type="button" class="home-pulse__month-btn" data-pulse-month-dir="1" ${nav.canNext ? "" : "disabled "}aria-label="Наступний місяць">›</button>`;
  const whisperPct = orientModel ? Math.min(100, Number(orientModel.pctBar) || 0) : 0;
  const whisperHtml = orientModel
    ? `<div class="home-pulse__whisper${overGoal ? " is-over" : ""}" aria-hidden="true"><i style="width:${whisperPct}%"></i></div>`
    : "";
  const leftUah = pulse.goalUah > 0 ? Math.max(0, pulse.goalUah - pulse.spentUah) : 0;
  const overUah = overGoal ? pulse.spentUah - pulse.goalUah : 0;
  const daysLeft = daysLeftInPulseMonth(monthKey);
  const daysPaceTipBody =
    daysLeft != null
      ? daysLeftPaceTipHtml({
          daysLeft,
          leftUah,
          overGoal,
          overUah,
          weekBudget,
          topItems: monthTops,
        })
      : "";
  const reportTipBody = nav.isArchive
    ? monthReportTipHtml({
        monthKey,
        spentUah: pulse.spentUah,
        goalUah: pulse.goalUah,
        overGoal,
        overUah,
        leftUah,
        mom,
        topItems: monthTops,
      })
    : "";
  const daysMeta =
    daysLeft != null
      ? `<span class="home-pulse__delta-meta home-pulse__delta-meta--pace">
            <span class="home-pulse__delta-wrap">
              <button type="button" class="home-pulse__phrase-btn" data-days-pace-tip="1" aria-expanded="false" aria-controls="days-pace-tip" aria-label="На ${daysLeft} дн. до кінця місяця. Поради щодо ліміту">
                <span class="home-pulse__delta-meta-lead">на</span>
                <span class="home-pulse__delta-chip num">${daysLeft}</span>
                <span class="home-pulse__delta-meta-trail">дн.</span>
              </button>
              <div class="home-pulse__insight-tip" id="days-pace-tip" role="tooltip" hidden>${daysPaceTipBody}</div>
            </span>
          </span>`
      : nav.isArchive
        ? `<span class="home-pulse__delta-meta home-pulse__delta-meta--report">
            <span class="home-pulse__delta-wrap">
              <button type="button" class="home-pulse__phrase-btn home-pulse__delta-chip home-pulse__delta-chip--report" data-month-report-tip="1" aria-expanded="false" aria-controls="month-report-tip" aria-label="Звіт за місяць. Що було добре і що ризиковано">звіт за міс.</button>
              <div class="home-pulse__insight-tip" id="month-report-tip" role="tooltip" hidden>${reportTipBody}</div>
            </span>
          </span>`
        : "";
  const goalCol =
    Number.isFinite(pulse.goalUah) && pulse.goalUah > 0
      ? `<div class="home-pulse__col home-pulse__col--plan">
            <span class="home-pulse__metric-k">ціль витрат</span>
            <p class="home-pulse__metric-num num ${overGoal ? "is-over" : "is-ok"}">${moneyStackHtml(pulse.goalUah)}</p>
            <div class="home-pulse__col-foot">
              <button type="button" class="home-pulse__goal-change" id="edit-month-goal" aria-expanded="false" aria-controls="month-goal-edit" aria-label="${overGoal ? `План перевищено. Ціль ${planBare}. Змінити` : `Ціль ${planBare}. Змінити орієнтир місяця`}">
                ${pencilIco}<span>змінити</span>
              </button>
            </div>
          </div>`
      : "";
  const spentFoot = insightUnderSpent
    ? `<div class="home-pulse__col-foot">${insightUnderSpent}</div>`
    : `<div class="home-pulse__col-foot" aria-hidden="true"></div>`;
  const deltaCol =
    Number.isFinite(pulse.goalUah) && pulse.goalUah > 0
      ? overGoal
        ? `<div class="home-pulse__col home-pulse__col--delta is-over">
            <span class="home-pulse__metric-k">понад</span>
            <p class="home-pulse__metric-num home-pulse__delta-num num">${moneyStackHtml(overUah)}</p>
            <div class="home-pulse__col-foot">${daysMeta}</div>
          </div>`
        : `<div class="home-pulse__col home-pulse__col--delta is-ok">
            <span class="home-pulse__metric-k">залишилось</span>
            <p class="home-pulse__metric-num home-pulse__delta-num num">${moneyStackHtml(leftUah)}</p>
            <div class="home-pulse__col-foot">${daysMeta}</div>
          </div>`
      : "";
  const archiveMark = nav.isArchive
    ? `<button type="button" class="home-pulse__archive-mark" data-pulse-month-now aria-label="Повернутись до поточного місяця">повернутись</button>`
    : "";
  const headClass =
    goalCol && deltaCol ? "home-pulse__head home-pulse__head--tri" : "home-pulse__head home-pulse__head--fused";
  return `
    <section class="home-pulse home-pulse--craft home-pulse--story home-pulse--v5e${overGoal ? " home-pulse--over" : ""}${nav.isArchive ? " home-pulse--archive" : ""}" aria-label="Витрати за місяць" data-spark-peaks="1" data-month-key="${esc(monthKey)}" data-chart-w="${chartW}">
      <div class="home-pulse__status-band${overGoal ? " is-over" : ""}">
        <div class="home-pulse__month-nav" role="group" aria-label="Місяць">
          ${monthPrevBtn}
          <span class="home-pulse__status-month">${esc(monthShort)}</span>
          ${monthNextBtn}
          ${archiveMark}
        </div>
        ${statusPct || ""}
      </div>
      ${whisperHtml}
      <div class="home-pulse__story-pad">
        <div class="${headClass}">
          ${goalCol}
          <div class="home-pulse__col home-pulse__col--spent">
            <span class="home-pulse__metric-k">витрачено</span>
            <p class="home-pulse__metric-num home-pulse__spent num ${overGoal ? "is-over" : "is-ok"}" data-count="${pulse.spentUah}">${moneyStackHtml(pulse.spentUah)}</p>
            ${spentFoot}
          </div>
          ${deltaCol}
        </div>
        ${coverageNote}
      </div>
      <div class="home-pulse__spark-wrap" data-spark-rest-x="${sparkRestX}" data-spark-peek-left="${sparkPeekLeft}" data-spark-peek-right="${sparkPeekRight}" data-spark-commit-prev="${sparkCommitPrev}" data-spark-commit-next="${sparkCommitNext}" data-spark-pitch="${pitch}" data-spark-seg-lens="${sparkSegLens}" data-spark-seg-i="${sparkSegI}" data-spark-strip="1">
        <div class="home-pulse__spark-track" style="width:${stripW}px;transform:translate3d(-${sparkRestX}px,0,0)">
          <div class="home-pulse__spark-stage">
            <svg class="home-pulse__spark home-pulse__spark--ribbon" viewBox="0 0 ${geom.w} ${geom.h}" width="${stripW}" height="${geom.h}" preserveAspectRatio="none" role="img" aria-label="Витрати по тижнях">
              <defs>
                <linearGradient id="${ribbonFillId}" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="oklch(0.55 0.11 155)" stop-opacity="0.34" />
                  <stop offset="40%" stop-color="oklch(0.55 0.11 155)" stop-opacity="0.12" />
                  <stop offset="100%" stop-color="oklch(0.55 0.11 155)" stop-opacity="0" />
                </linearGradient>
              </defs>
              ${chartGrid}
              ${geom.area ? `<path class="home-pulse__ribbon-fill" d="${geom.area}" fill="url(#${ribbonFillId})" />` : ""}
              ${geom.path ? `<path class="home-pulse__ribbon-glow" d="${geom.path}" fill="none" pathLength="1" />` : ""}
              ${geom.path ? `<path class="home-pulse__ribbon-line" d="${geom.path}" fill="none" pathLength="1" />` : ""}
              ${marksSvg}
            </svg>
            ${weekBadgesHtml}
          </div>
          ${weekAxis ? `<div class="home-pulse__week-axis" aria-hidden="true">${weekAxis}</div>` : ""}
        </div>
        <div class="home-pulse__tip" hidden></div>
      </div>
      ${
        (hotDateCaption || topsBlock || pills || SHOW_HOME_WEEK_CTA)
          ? `<div class="home-pulse__story-pad home-pulse__story-pad--foot">
        ${hotDateCaption}
        ${topsBlock}
        ${pills ? `<div class="home-pulse__pills" role="list">${pills}</div>` : ""}
        ${SHOW_HOME_WEEK_CTA ? `<button type="button" class="home-pulse__cta" data-go="shop">Зібрати тиждень →</button>` : ""}
      </div>`
          : ""
      }
    </section>`;
}

function headerBar(left, right) {
  return `
    <div class="chrome">
      <button type="button" class="back" id="back" aria-label="Назад">←</button>
      <div class="bar"><span>${left}</span><span class="right" id="plan-title">${right} <span class="chev" aria-hidden="true">▾</span></span></div>
    </div>`;
}

function levelUa() {
  return state.intentSport.constraints.level === "beginner" ? "початковий" : "середній";
}

function closeOverlays() {
  swapAbort?.abort();
  state.picker = null;
  state.browse = null;
  state.saveBasePrompt = null;
  render();
}


function flushSessionProgress(programId) {
  const ctl = state._sessionCtl;
  if (!ctl) return;
  const prog = sessionProgressFromSnapshot(ctl.snapshot());
  if (!prog) return;
  noteSessionProgress({
    programId: programId || state.intentSport?.constraints?.programId || "",
    stepsDone: prog.stepsDone,
    stepsTotal: prog.stepsTotal,
    durationSec: prog.durationSec,
    full: prog.full,
  });
}

function destroySessionCtl(programId, { flush = true } = {}) {
  stopExerciseHowToSpeech();
  if (flush) flushSessionProgress(programId);
  state._sessionCtl?.destroy();
  state._sessionCtl = null;
  state._sessionViewHook = null;
}

function expressCountForDayMeals(meals) {
  return (meals || []).filter((l) =>
    expressMembershipForMeal(l, {
      extraQueries: state.extraQueries,
      shopLines: state.shopVm?.lines,
      bases: loadBases(),
    }).inExpress,
  ).length;
}

function bindDayPlatesMealActions(meals, programId) {
  root.querySelectorAll("[data-meal-add]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const i = Number(btn.dataset.mealAdd);
      const line = meals[i];
      if (!line) return;
      const mem = expressMembershipForMeal(line, {
        extraQueries: state.extraQueries,
        shopLines: state.shopVm?.lines,
        bases: loadBases(),
      });
      if (mem.inChecklist) {
        noteSportRationCoverage(coveragePayloadFromMeal(line));
        toast("Вже в чеклисті Express");
        patchDayPlatesExpressUi();
        return;
      }
      btn.disabled = true;
      await addExtraProduct(mealLineToExpressPick(line), {
        stayOnDay: true,
        sportRation: sportRationPayloadFromMeal(line, programId),
      });
    });
  });
  root.querySelectorAll("[data-meal-search]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const i = Number(btn.dataset.mealSearch);
      const line = meals[i];
      const q = String(line?.wanted || line?.name || "").trim();
      if (!q) return;
      destroySessionCtl(programId);
      await enterShopFromSport(programId, { browseQ: q });
    });
  });
  const addAll = root.querySelector("#addAllPlates");
  if (addAll) {
    addAll.onclick = async () => {
      addAll.disabled = true;
      try {
        await addAllDayMealsToExpress(meals, programId);
      } finally {
        addAll.disabled = false;
        patchDayPlatesExpressUi();
      }
    };
  }
  root.querySelectorAll(".day-sheet--plates [data-beacon-tip]").forEach((el) => {
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const tip = el.getAttribute("data-beacon-tip");
      if (tip) toast(tip);
    });
  });
}

async function addAllDayMealsToExpress(meals, programId) {
  const membershipFn = (line) =>
    expressMembershipForMeal(line, {
      extraQueries: state.extraQueries,
      shopLines: state.shopVm?.lines,
      bases: loadBases(),
    });
  const addable = mealsAddableToExpress(meals, membershipFn);
  if (!addable.length) {
    for (const line of meals || []) {
      if (membershipFn(line).inChecklist) {
        noteSportRationCoverage(coveragePayloadFromMeal(line));
      }
    }
    toast("Усе вже в Express або треба Знайти");
    return;
  }
  let n = 0;
  for (const line of addable) {
    await addExtraProduct(mealLineToExpressPick(line), {
      stayOnDay: true,
      quiet: true,
      sportRation: sportRationPayloadFromMeal(line, programId),
    });
    n += 1;
  }
  toast(bulkAddToastCopy(n));
  state.handoffMetrics = bumpHandoffMetric(state.handoffMetrics, "bulk_add", n);
}

function dayPlatesFilterBtnHtml(prefs) {
  const count = surveyTasteFilterCount(prefs);
  const aria = count > 0 ? `Фільтри смаків, обрано ${count}` : "Фільтри смаків";
  const badge =
    count > 0 ? `<span class="day-plates__filter-badge" aria-hidden="true">${count}</span>` : "";
  return `<button type="button" class="day-plates__filter-btn" id="editSurvey" aria-label="${esc(aria)}">
    <svg class="day-plates__filter-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
    ${badge}
  </button>`;
}

function patchDayPlatesFilterBtn(section, prefs = loadSportSurvey()) {
  const btn = section?.querySelector("#editSurvey");
  if (!btn || !btn.classList.contains("day-plates__filter-btn")) return false;
  const count = surveyTasteFilterCount(prefs);
  let badge = btn.querySelector(".day-plates__filter-badge");
  if (count > 0) {
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "day-plates__filter-badge";
      badge.setAttribute("aria-hidden", "true");
      btn.appendChild(badge);
    }
    badge.textContent = String(count);
    btn.setAttribute("aria-label", `Фільтри смаків, обрано ${count}`);
  } else {
    badge?.remove();
    btn.setAttribute("aria-label", "Фільтри смаків");
  }
  return true;
}

function patchDayPlatesModeChrome() {
  const section = root.querySelector(".day-sheet--plates");
  if (!section) return false;
  const surveyPrefs = loadSportSurvey();
  const plateMode = plateModeFromCookMode(surveyPrefs.cookMode);
  section.querySelectorAll("[data-plate-mode]").forEach((btn) => {
    const on = btn.dataset.plateMode === plateMode;
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-checked", on ? "true" : "false");
  });
  patchDayPlatesFilterBtn(section, surveyPrefs);
  return true;
}

async function applyDayPlateMode(plateModeId) {
  const nextMode = cookModeFromPlateMode(plateModeId);
  const cur = loadSportSurvey();
  if (cur.cookMode === nextMode) return;
  saveSportSurvey({ ...cur, cookMode: nextMode });
  patchDayPlatesModeChrome();
  patchDayPlatesForViewDay(currentDayISO());

  const section = root.querySelector(".day-sheet--plates");
  const chips = section ? [...section.querySelectorAll("[data-plate-mode]")] : [];
  const filterBtn = section?.querySelector("#editSurvey");
  section?.classList.add("is-updating");
  chips.forEach((btn) => {
    btn.disabled = true;
  });
  if (filterBtn) filterBtn.disabled = true;

  invalidateDayVmCache();
  try {
    const vm = await resolveVm(state.intentSport, sportDayResolveExtra());
    state._dayVmCache = { fp: dayVmFingerprint(), vm };
    state._dayMeals = vm.lines;
    state._dayBranchLabel = vm.branchLabel;
    patchDayPlatesExpressUi();
    patchDayPlatesModeChrome();
    patchDayLoopGapChip(currentDayISO());
  } catch {
    saveSportSurvey(cur);
    patchDayPlatesModeChrome();
  } finally {
    section?.classList.remove("is-updating");
    chips.forEach((btn) => {
      btn.disabled = false;
    });
    if (filterBtn) filterBtn.disabled = false;
  }
}

function patchDayPlatesExpressUi() {
  const meals = state._dayMeals;
  const branchLabel = state._dayBranchLabel;
  if (!Array.isArray(meals) || !branchLabel) return false;
  const section = root.querySelector(".day-sheet--plates");
  if (!section) return false;
  const expressOnDay = expressCountForDayMeals(meals);
  const btn = section.querySelector("#toExpress");
  if (btn) {
    btn.textContent =
      expressOnDay > 0 ? `${expressOnDay} в Express · переглянути →` : "До СільпоExpress →";
    btn.classList.toggle("day-plates__express--has", expressOnDay > 0);
  }
  const addAll = section.querySelector("#addAllPlates");
  if (addAll) {
    const addable = mealsAddableToExpress(meals, (l) =>
      expressMembershipForMeal(l, {
        extraQueries: state.extraQueries,
        shopLines: state.shopVm?.lines,
        bases: loadBases(),
      }),
    );
    if (!addable.length) {
      addAll.hidden = true;
    } else {
      addAll.hidden = false;
      addAll.textContent =
        addable.length === 1 ? "Додати в Express" : `Додати всі (${addable.length}) в Express`;
    }
  }
  const list = section.querySelector("#dayPlatesList");
  if (list) {
    list.innerHTML = dayMealsHtml(meals).html;
    bindDayPlatesMealActions(meals, state.intentSport?.constraints?.programId || "");
  }
  patchDayLoopGapChip(currentDayISO());
  return true;
}


function sessionStreakDays() {
  const days = new Set(loadSessionEvents().map((e) => e.day).filter(Boolean));
  let streak = 0;
  let cursor = dayKeyKyiv(new Date());
  for (let i = 0; i < 60; i++) {
    if (!cursor || !days.has(cursor)) break;
    streak += 1;
    cursor = shiftDayKey(cursor, -1);
  }
  return streak;
}

/**
 * Warm calendar hop: patch chrome + session past/status; skip full paint/resolve.
 * Requires day DOM + `_dayVmCache` + `_sessionViewHook`.
 * @param {string} iso
 * @param {{ fromHash?: boolean }} [opts]
 */
function trySoftHopDayISO(iso, { fromHash = false } = {}) {
  if (state.screen !== "day") return false;
  if (!iso || iso === currentDayISO()) return false;
  if (!root.querySelector(".day-flow") || !root.querySelector(".session-player")) return false;
  if (!root.querySelector(".day-calendar")) return false;
  if (typeof state._sessionViewHook !== "function") return false;
  const fp = dayVmFingerprint();
  if (!state._dayVmCache || state._dayVmCache.fp !== fp) return false;

  state.dayISO = iso;
  if (!fromHash) {
    state.navLock = true;
    writeHash();
  }
  /* Keep ration plan dayISO stamp in sync (no resolve). */
  sportDayResolveExtra();

  root.querySelectorAll(".day-calendar__dot[data-day-iso]").forEach((btn) => {
    const on = btn.dataset.dayIso === iso;
    btn.classList.toggle("day-calendar__dot--sel", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });

  patchDayLoopGapChip(iso);
  patchDayPlatesForViewDay(iso);
  state._sessionViewHook(iso);
  return true;
}

function bindDayCalendarNav() {
  root.querySelectorAll("[data-day-iso]").forEach((btn) => {
    btn.onclick = () => {
      const iso = btn.dataset.dayIso;
      if (!iso || btn.disabled || iso === currentDayISO()) return;
      if (trySoftHopDayISO(iso)) return;
      state.dayISO = iso;
      state.navLock = true;
      writeHash();
      render();
    };
  });
}

function sessionStatusForDay(dayIso) {
  const ev = loadSessionEvents().find((e) => e.day === dayIso);
  if (ev?.full) return { done: true, partial: false, ev };
  if (ev) return { done: false, partial: true, ev };
  return { done: false, partial: false, ev: null };
}

/** Guide-list rows under live strip (Epic UX-06) — title/dose/est + status badge. */
function sessionGuideListHtml(steps) {
  const list = Array.isArray(steps) ? steps : [];
  return list
    .map((st, i) => {
      const { name, dose } = splitSessionLabel(st.label);
      const art = resolveExerciseArt(st.label);
      const est = formatTimer(st.durationSec || 0);
      const thumb = art
        ? `<img class="session-guide__thumb-img" src="${esc(art.url)}" alt="" width="64" height="64" decoding="async" />`
        : `<span class="session-guide__thumb-fallback" aria-hidden="true">${i + 1}</span>`;
      return `<li class="session-guide__row" data-i="${i}" data-state="upcoming">
        <div class="session-guide__thumb">${thumb}</div>
        <div class="session-guide__body">
          <p class="session-guide__title">${i + 1}. ${esc(name)}</p>
          ${dose ? `<p class="session-guide__dose">${esc(dose)}</p>` : ""}
          <p class="session-guide__est muted">≈ ${esc(est)}</p>
        </div>
        <div class="session-guide__status">
          <span class="session-guide__badge">далі</span>
          <span class="session-guide__side muted" data-role="side">≈ ${esc(est)}</span>
        </div>
      </li>`;
    })
    .join("");
}

/** Done-state mosaic — thumbs of completed steps (celebration, not empty void). */
function sessionDoneMosaicHtml(steps) {
  const list = (Array.isArray(steps) ? steps : []).slice(0, 6);
  return list
    .map((st, i) => {
      const art = resolveExerciseArt(st.label);
      const name = sessionLabelShortName(st.label || "");
      const stem = normalizeExerciseStem(st.label || "");
      const breathLike = EXERCISE_ART_INTENTIONAL_NULL.some((k) => stem === k || stem.startsWith(k));
      if (art) {
        return `<span class="session-done__tile" title="${esc(name)}" style="--i:${i}"><img src="${esc(art.url)}" alt="" width="96" height="96" decoding="async" /></span>`;
      }
      if (breathLike) {
        return `<span class="session-done__tile session-done__tile--breath" title="${esc(name)}" style="--i:${i}" aria-hidden="true"><span class="session-done__breath-orb"></span></span>`;
      }
      return `<span class="session-done__tile session-done__tile--empty" title="${esc(name)}" style="--i:${i}" aria-hidden="true">${i + 1}</span>`;
    })
    .join("");
}

function sessionDoneCopyHtml({ minutes = 1, steps = 0, durationSec = 0 } = {}) {
  const min = Math.max(1, Number(minutes) || 1);
  const n = Math.max(0, Number(steps) || 0);
  const actualMin =
    Number(durationSec) > 0 ? Math.max(1, Math.round(Number(durationSec) / 60)) : min;
  return `
    <p class="session-done__badge"><span class="session-done__check" aria-hidden="true"></span>готово</p>
    <p class="session-done__meta">≈ ${actualMin} хв · ${n} кроків</p>
    <p class="session-done__hint muted">можна повторити · далі — раціон ↓</p>
  `;
}

/** Soft-hop: refresh dish titles/stove from week-course for view-day (lines stay cached). */
function patchDayPlatesForViewDay(iso = currentDayISO()) {
  const meals = state._dayMeals;
  if (!Array.isArray(meals) || !meals.length) return;
  const list = root.querySelector("#dayPlatesList");
  if (!list) return;
  list.innerHTML = dayMealsHtml(meals, { dayISO: iso }).html;
  bindDayPlatesMealActions(meals, state.intentSport?.constraints?.programId || "");
}

/** Soft-hop / Express: refresh dual-gate chip for view-day (plate *lines* stay day-agnostic; titles via course). */
function patchDayLoopGapChip(iso = currentDayISO()) {
  const tipEl = root.querySelector("#loopGapTip");
  if (!tipEl) return false;
  const meals = state._dayMeals || [];
  const daySt = sessionStatusForDay(iso);
  const expressOnDay = expressCountForDayMeals(meals);
  const uncoveredPlates = Math.max(0, meals.length - expressOnDay);
  const gap = loopGapModel({
    ritualDays: daySt.done || daySt.partial ? 1 : 0,
    softRationHits: expressOnDay > 0 ? expressOnDay : 0,
    uncoveredPlates,
  });
  tipEl.textContent = gap.copy;
  tipEl.setAttribute("data-beacon-tip", gap.tip);
  tipEl.classList.toggle("day-loop-gap--ok", gap.side === "none");
  return true;
}

function bindDayRitualNav(scope = root) {
  scope.querySelector("#toSession")?.addEventListener("click", () => {
    scope.querySelector(".session-player")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  scope.querySelector("#toPlates")?.addEventListener("click", () => {
    scope.querySelector(".day-sheet--plates")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function dayRitualStatusChipHtml({ done = false, partial = false, live = false } = {}) {
  if (done) {
    return `<span class="day-ritual__chip day-ritual__chip--done" aria-label="Сесію завершено">сесія ✓</span>`;
  }
  if (live) {
    return `<span class="day-ritual__chip day-ritual__chip--live" aria-label="Сесія триває">сесія · live</span>`;
  }
  if (partial) {
    return `<span class="day-ritual__chip day-ritual__chip--live" aria-label="Сесія частково">сесія · частково</span>`;
  }
  return "";
}

function patchDayRitualUi() {
  const strip = root.querySelector(".day-ritual--strip");
  if (!strip) return false;
  const todayIso = dayKeyKyiv(new Date());
  const todayEv = loadSessionEvents().find((e) => e.day === todayIso);
  const sessionDoneToday = Boolean(todayEv?.full);
  const sessionPartialToday = Boolean(todayEv && !todayEv.full);
  const live = Boolean(root.querySelector(".session-player.is-live"));
  const streak = sessionStreakDays();
  const streakLine =
    streak >= 2
      ? `${streak} дні підряд з сесією`
      : streak === 1
        ? "сьогодні вже є крок сесії"
        : "перша сесія стартує ритм";
  const lineEl = strip.querySelector(".day-ritual__strip-line");
  if (lineEl) lineEl.innerHTML = `<strong>Ритуал</strong> · ${esc(streakLine)}`;
  const actions = strip.querySelector(".day-ritual__actions");
  if (!actions) return true;
  const chipHtml = dayRitualStatusChipHtml({
    done: sessionDoneToday,
    partial: sessionPartialToday,
    live,
  });
  /* Soft jump to plates — player no longer carries «До тарілок» after complete. */
  const platesChip = `<button type="button" class="ghost ghost--sheet day-ritual__chip" id="toPlates">раціон ↓</button>`;
  actions.innerHTML = `${chipHtml}${platesChip}`;
  bindDayRitualNav(strip);
  return true;
}

async function renderSport(seq) {
  const programsAll = state.kb.programs;
  let programs = programsForHome(programsAll);
  if (!programs.length) programs = programsAll;
  const ranked = rankProgramsForProfile(programs, loadSportProfile());
  if (ranked.length) programs = ranked;
  let idx = Math.max(
    0,
    programs.findIndex((p) => p.id === state.intentSport.constraints.programId),
  );
  if (idx < 0 || !programs[idx]) {
    idx = 0;
    if (programs[0]) state.intentSport.constraints.programId = programs[0].id;
  }

  function paintSessionWave(svgEl, samples) {
    if (!svgEl) return;
    const pts = Array.isArray(samples) ? samples : [];
    if (!pts.length) {
      svgEl.innerHTML = "";
      svgEl.classList.add("is-empty");
      return;
    }
    svgEl.classList.remove("is-empty");
    const w = 280;
    const h = 24;
    const max = Math.max(...pts, 1);
    const step = pts.length <= 1 ? 0 : w / (pts.length - 1);
    const coords = pts.map((v, i) => {
      const x = pts.length <= 1 ? w / 2 : i * step;
      const y = h - 3 - (v / max) * (h - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const line = coords.join(" ");
    const firstX = pts.length <= 1 ? w / 2 : 0;
    const lastX = pts.length <= 1 ? w / 2 : (pts.length - 1) * step;
    const area = `${firstX.toFixed(1)},${h} ${line} ${lastX.toFixed(1)},${h}`;
    svgEl.innerHTML = `<polygon class="session-player__wave-area" points="${area}" /><polyline class="session-player__wave-line" points="${line}" />`;
  }

  function bindSessionPlayer(steps, { programId, viewDayISO = dayKeyKyiv(new Date()) } = {}) {
    void viewDayISO; /* boot day; syncUi always reads currentDayISO() for soft hops */
    const sheetEl = root.querySelector(".session-player");
    const timerEl = $("#session-timer");
    const labelEl = $("#session-label");
    const artFig = $("#session-art");
    const artImg = /** @type {HTMLImageElement | null} */ ($("#session-art-img"));
    const statusEl = $("#session-status");
    const nextEl = $("#session-next");
    const toggleBtn = $("#session-toggle");
    const skipBtn = $("#session-skip");
    const dots = root.querySelectorAll(".session-player__dot");
    const waveEl = $("#session-wave");
    const guideRows = () => root.querySelectorAll("#session-guide .session-guide__row");
    if (!timerEl || !toggleBtn) return;
    let restTimer = null;
    let restInterval = null;
    let restLeftSec = 0;
    /** True for whole rest interstitial (incl. before interval armed) — avoids sync flicker. */
    let restArmed = false;
    /** @type {"rest"|"prep"|"pause"|null} */
    let restKind = null;
    /** Mutable countdown for rest/prep/pause — bumped by +30 с. */
    let interstitialLeft = 0;
    /** Total duration for ring progress (grows with +30). */
    let interstitialTotalSec = 0;
    let artFrameTimer = null;
    let artFrame = 1;
    let artSlug = "";
    let lastIdx = -1;
    const restSecParam = new URLSearchParams(globalThis.location?.search || "").get("sessionRest");
    const REST_SEC = restSecParam === "0" ? 0 : 25;
    /** Get-ready buffer after Старт / Ще раз (independent of sessionRest). */
    const PREP_SEC = 10;
    /** Mid-exercise Пауза opens pause mode with this buffer; +30 extends. */
    const PAUSE_SEC = 30;
    const ADD_PAUSE_SEC = 30;

    const isRestingUi = () => restArmed || Boolean(restTimer || restInterval);
    const isPrepUi = () => restKind === "prep" && isRestingUi();
    const isPauseUi = () => restKind === "pause" && isRestingUi();

    const stopArtCycle = () => {
      clearInterval(artFrameTimer);
      artFrameTimer = null;
      artFrame = 1;
    };

    if (artImg) {
      artImg.onerror = () => {
        stopArtCycle();
        artSlug = "";
        if (artFig) artFig.hidden = true;
        artImg.removeAttribute("src");
      };
    }

    const paintArtTitle = (rawLabel) => {
      const el = artFig?.querySelector("#session-art-title");
      if (!el) return;
      const t = sessionLabelShortName(rawLabel || "").trim();
      el.textContent = t;
      el.hidden = !t;
    };

    const interstitialWellEl = () => artFig?.querySelector("#session-prep-well");
    const interstitialTimerEl = () => artFig?.querySelector("#session-prep-timer");
    const interstitialCaptionEl = () => artFig?.querySelector("#session-prep-caption");
    const interstitialBadgeEl = () => artFig?.querySelector("#session-prep-badge");

    const interstitialRingEl = () => artFig?.querySelector(".session-player__prep-ring");

    const paintInterstitialWell = (kind, label, leftSec) => {
      const well = interstitialWellEl();
      const pt = interstitialTimerEl();
      const cap = interstitialCaptionEl();
      const badge = interstitialBadgeEl();
      const ring = interstitialRingEl();
      if (!well || !pt || !cap) return;
      const short = sessionLabelShortName(label || "");
      const fallbackTotal =
        kind === "prep" ? PREP_SEC : kind === "pause" ? PAUSE_SEC : REST_SEC;
      const total = interstitialTotalSec > 0 ? interstitialTotalSec : fallbackTotal;
      well.hidden = false;
      well.removeAttribute("aria-hidden");
      artFig?.classList.add("has-interstitial-well");
      const sec = leftSec == null ? 0 : Math.max(0, leftSec);
      pt.textContent = formatTimer(sec);
      const progress = total > 0 ? ((total - sec) / total) * 100 : 100;
      const progressPct = `${Math.min(100, Math.max(0, progress))}%`;
      if (ring) ring.style.setProperty("--prep-progress", progressPct);
      if (badge) {
        badge.textContent = kind === "prep" ? "підготуйся до вправи" : "Перерва";
        badge.classList.toggle("session-player__prep-badge--plain", kind === "prep");
        badge.classList.toggle("session-player__prep-badge--chip", kind !== "prep");
      }
      cap.textContent =
        kind === "prep"
          ? short
            ? `${short} — перша вправа`
            : "перша вправа"
          : short
            ? `${short} — наступна вправа`
            : "наступна вправа";
      cap.hidden = false;
    };

    const clearInterstitialWell = () => {
      const well = interstitialWellEl();
      const cap = interstitialCaptionEl();
      const ring = interstitialRingEl();
      if (well) {
        well.hidden = true;
        well.setAttribute("aria-hidden", "true");
      }
      ring?.style.removeProperty("--prep-progress");
      if (cap) cap.hidden = true;
      artFig?.classList.remove("has-interstitial-well");
    };

    let howtoSpeaking = false;
    const howtoRoot = () => root.querySelector("#session-howto");
    const howtoTextEl = () => root.querySelector("#session-howto-text");
    const howtoListenBtn = () => root.querySelector("#session-howto-listen");

    const setHowtoListenUi = (speaking) => {
      howtoSpeaking = Boolean(speaking);
      const btn = howtoListenBtn();
      if (!btn) return;
      const label = btn.querySelector(".session-howto__listen-label");
      if (label) label.textContent = howtoSpeaking ? "Зупинити" : "Слухати";
      else btn.textContent = howtoSpeaking ? "Зупинити" : "Слухати";
      btn.setAttribute("aria-pressed", howtoSpeaking ? "true" : "false");
      btn.classList.toggle("is-speaking", howtoSpeaking);
    };

    const setHowtoOpen = (open) => {
      const box = howtoRoot();
      if (box && box.tagName === "DETAILS") box.open = Boolean(open);
    };

    const paintHowTo = (rawLabel) => {
      const box = howtoRoot();
      const textEl = howtoTextEl();
      const btn = howtoListenBtn();
      if (!box || !textEl) return;
      const hit = resolveExerciseHowTo(rawLabel);
      if (!hit?.text) {
        stopExerciseHowToSpeech();
        setHowtoListenUi(false);
        box.hidden = true;
        box.classList.remove("is-fallback");
        delete box.dataset.howtoLabel;
        setHowtoOpen(false);
        textEl.textContent = "";
        if (btn) btn.hidden = true;
        return;
      }
      const prevSpeak = btn?.dataset.speak || "";
      const prevLabel = box.dataset.howtoLabel || "";
      const stepChanged = prevLabel !== (rawLabel || "");
      box.dataset.howtoLabel = rawLabel || "";
      textEl.textContent = hit.text;
      box.hidden = false;
      if (stepChanged) {
        setHowtoOpen(false);
        if (howtoSpeaking) {
          stopExerciseHowToSpeech();
          setHowtoListenUi(false);
        }
      }
      box.classList.toggle("is-fallback", Boolean(hit.fallback));
      if (btn) {
        const canSpeak = canSpeakExerciseHowTo();
        btn.hidden = !canSpeak;
        btn.disabled = !canSpeak;
        btn.dataset.speak = hit.speakText;
        btn.setAttribute(
          "aria-label",
          howtoSpeaking ? "Зупинити озвучення вправи" : `Слухати, як робити: ${hit.name}`,
        );
        /* New step cue while speaking → stop so voice matches on-screen text. */
        if (howtoSpeaking && prevSpeak && prevSpeak !== hit.speakText) {
          stopExerciseHowToSpeech();
          setHowtoListenUi(false);
        } else if (!howtoSpeaking) {
          setHowtoListenUi(false);
        }
      }
    };

    const bindHowToListen = () => {
      const box = howtoRoot();
      if (box && box.tagName === "DETAILS" && box.dataset.toggleBound !== "1") {
        box.dataset.toggleBound = "1";
        box.addEventListener("toggle", () => {
          if (!box.open && howtoSpeaking) {
            stopExerciseHowToSpeech();
            setHowtoListenUi(false);
          }
        });
      }
      const btn = howtoListenBtn();
      if (!btn || btn.dataset.bound === "1") return;
      btn.dataset.bound = "1";
      let speakGen = 0;
      warmSpeechVoices();
      btn.onclick = () => {
        if (howtoSpeaking) {
          speakGen += 1;
          stopExerciseHowToSpeech();
          setHowtoListenUi(false);
          return;
        }
        const line = btn.dataset.speak || howtoTextEl()?.textContent || "";
        const gen = (speakGen += 1);
        warmSpeechVoices().then(() => {
          if (gen !== speakGen) return;
          const r = speakExerciseHowTo(line, {
            onend: () => {
              if (gen === speakGen) setHowtoListenUi(false);
            },
            onerror: () => {
              if (gen === speakGen) setHowtoListenUi(false);
            },
          });
          if (gen !== speakGen) return;
          if (r.ok) setHowtoListenUi(true);
          else {
            setHowtoListenUi(false);
            toast("Голос недоступний на цьому пристрої");
          }
        });
      };
    };

    const paintDonePanel = (st, { complete = false } = {}) => {
      const doneEl = $("#session-done");
      const mosaicEl = $("#session-done-mosaic");
      const copyEl = $("#session-done-copy");
      if (!doneEl) return;
      const show = Boolean(complete);
      doneEl.hidden = !show;
      if (!show) return;
      if (mosaicEl && !mosaicEl.dataset.ready) {
        mosaicEl.innerHTML = sessionDoneMosaicHtml(steps);
        mosaicEl.dataset.ready = "1";
      }
      if (copyEl) {
        const daySt = sessionStatusForDay(currentDayISO());
        const durationSec = Number(st?.elapsedTotal) || Number(daySt.ev?.durationSec) || 0;
        const minutes = Math.max(
          1,
          Math.round(steps.reduce((s, x) => s + (Number(x.durationSec) || 0), 0) / 60),
        );
        copyEl.innerHTML = sessionDoneCopyHtml({
          minutes,
          steps: steps.length,
          durationSec,
        });
      }
    };

    const paintBreathArt = () => {
      if (!artFig) return;
      stopArtCycle();
      artSlug = "__breath__";
      artFig.hidden = false;
      artFig.classList.add("is-breath");
      if (artImg) {
        artImg.hidden = true;
        artImg.removeAttribute("src");
        artImg.alt = "Дихання";
      }
      const breath = artFig.querySelector("#session-breath");
      if (breath) breath.hidden = false;
    };

    const clearBreathArt = () => {
      artFig?.classList.remove("is-breath");
      const breath = artFig?.querySelector("#session-breath");
      if (breath) breath.hidden = true;
      if (artImg) artImg.hidden = false;
    };

    const paintExerciseArt = (st) => {
      if (!artFig || !artImg) return;
      const label = st?.step?.label || steps[0]?.label || "";
      clearBreathArt();
      const hit = resolveExerciseArt(label, { frame: 1 });
      if (!hit) {
        stopArtCycle();
        artSlug = "";
        artFig.hidden = true;
        artImg.removeAttribute("src");
        artImg.alt = "";
        paintArtTitle("");
        paintHowTo(label);
        return;
      }
      if (artSlug !== hit.slug) {
        stopArtCycle();
        artSlug = hit.slug;
        artImg.src = hit.url;
        artImg.alt = hit.name;
        stopExerciseHowToSpeech();
        setHowtoListenUi(false);
      }
      artFig.hidden = false;
      paintArtTitle(label);
      paintHowTo(label);
      /* Done / idle / prep / pause: keep still frame. Live: cycle CDN frames. */
      const canCycle = Boolean(st?.running) && !st?.done && !isRestingUi() && !prefersReduce();
      if (canCycle && !artFrameTimer) {
        artFrame = 1;
        artFrameTimer = setInterval(() => {
          artFrame = artFrame === 3 ? 1 : artFrame + 1;
          const next = resolveExerciseArt(label, { frame: /** @type {1|2|3} */ (artFrame) });
          if (next && artImg) artImg.src = next.url;
        }, 700);
      } else if (!canCycle && artFrameTimer) {
        stopArtCycle();
        artImg.src = hit.url;
      }
    };

    const paintGuideRows = (st, { resting = false, past = false, allDone = false } = {}) => {
      const rows = guideRows();
      if (!rows.length) return;
      const clockTxt = timerEl?.textContent || "";
      rows.forEach((row, i) => {
        const step = steps[i];
        const est = formatTimer(step?.durationSec || 0);
        let state = "upcoming";
        if (allDone || st?.done) {
          state = "done";
        } else if (past) {
          state = i === 0 ? "now" : "upcoming";
        } else if (st && i < st.idx) {
          state = "done";
        } else if (st && i === st.idx) {
          state = resting ? "rest" : "now";
        }
        row.dataset.state = state;
        row.classList.toggle("is-done", state === "done");
        row.classList.toggle("is-now", state === "now" || state === "rest");
        row.classList.toggle("is-rest", state === "rest");
        const badge = row.querySelector(".session-guide__badge");
        const side = row.querySelector("[data-role=side]");
        if (!badge || !side) return;
        if (state === "done") {
          badge.textContent = "Виконано";
          side.textContent = "";
          side.hidden = true;
        } else if (state === "now") {
          badge.textContent = "зараз";
          side.textContent = clockTxt;
          side.hidden = false;
          side.classList.remove("muted");
        } else if (state === "rest") {
          badge.textContent = restKind === "prep" ? "підг." : restKind === "rest" ? "пер." : "пауза";
          side.textContent = clockTxt;
          side.hidden = false;
          side.classList.remove("muted");
        } else {
          badge.textContent = "далі";
          side.textContent = `≈ ${est}`;
          side.hidden = false;
          side.classList.add("muted");
        }
      });
    };

    const paintStripLabel = (label, { done = false, rest = false, prep = false, pause = false } = {}) => {
      if (!labelEl) return;
      if (done) {
        labelEl.innerHTML = sessionLabelHtml("", { done: true, esc });
        return;
      }
      if (prep) {
        /* Countdown + badge live inside art well — keep title row empty. */
        labelEl.innerHTML = "";
        return;
      }
      if (pause) {
        const short = sessionLabelShortName(label || "—");
        labelEl.innerHTML = `<span class="session-player__move-name">${esc(short)}</span>`;
        return;
      }
      if (rest) {
        /* Corridor lives in art well — keep title row empty. */
        labelEl.innerHTML = "";
        return;
      }
      const short = sessionLabelShortName(label || "—");
      labelEl.innerHTML = `<span class="session-player__move-name">${esc(short)}</span>`;
    };

    const clearRestCue = ({ resume = false } = {}) => {
      const wasPrep = restKind === "prep";
      restArmed = false;
      restKind = null;
      clearTimeout(restTimer);
      clearInterval(restInterval);
      restTimer = null;
      restInterval = null;
      restLeftSec = 0;
      interstitialLeft = 0;
      interstitialTotalSec = 0;
      nextEl?.classList.remove("is-rest");
      sheetEl?.classList.remove("is-resting");
      const addBtn = $("#session-add-time");
      if (addBtn) addBtn.hidden = true;
      clearInterstitialWell();
      /* Prep→live: stop howto voice so timer focus wins; mid-pause resume keeps quiet too. */
      stopExerciseHowToSpeech();
      setHowtoListenUi(false);
      if (resume) {
        state._sessionCtl?.start();
        if (wasPrep) announce("Сесію розпочато");
      }
    };

    const paintRestGuide = (upcomingLabel, leftSec, kind = "rest") => {
      if (!nextEl) return;
      nextEl.classList.add("is-rest");
      if (kind === "prep" || kind === "rest" || kind === "pause") {
        /* Caption / phrase lives in art well or pause chip — no footer dup. */
        nextEl.textContent = "";
        return;
      }
      const short = sessionLabelShortName(upcomingLabel || "");
      if (prefersReduce() || leftSec == null) {
        nextEl.textContent = short
          ? `перерва · далі «${short}»`
          : "перерва · далі коли готовий";
        return;
      }
      nextEl.textContent = short
        ? `перерва ${leftSec} с · +30 · далі «${short}»`
        : `перерва ${leftSec} с · +30 · або «До вправи»`;
    };

    const paintNextUp = (st) => {
      if (!nextEl) return;
      if (nextEl.classList.contains("is-rest") && isRestingUi()) return;
      if (!st) return;
      if (st.done) {
        nextEl.textContent = "далі · Спортивний раціон ↓";
        return;
      }
      const nxt = st.steps?.[st.idx + 1];
      if (nxt) nextEl.textContent = `далі · ${nxt.label}`;
      else nextEl.textContent = "";
    };

    const paintInterstitialNow = (upcomingLabel, kind) => {
      const prep = kind === "prep";
      const pause = kind === "pause";
      restLeftSec = interstitialLeft;
      const left = Math.max(0, interstitialLeft);
      if (timerEl) timerEl.textContent = formatTimer(left);
      if (prep || kind === "rest") {
        paintInterstitialWell(kind, upcomingLabel, prefersReduce() ? null : left);
      } else {
        clearInterstitialWell();
      }
      paintStripLabel(upcomingLabel, { rest: !prep && !pause, prep, pause });
      paintRestGuide(upcomingLabel, prefersReduce() ? null : interstitialLeft, kind);
      paintGuideRows(state._sessionCtl?.snapshot(), { resting: true });
    };

    const addInterstitialTime = (sec = ADD_PAUSE_SEC) => {
      if (!isRestingUi()) return;
      interstitialLeft = Math.max(0, interstitialLeft) + Math.max(0, sec);
      interstitialTotalSec = Math.max(interstitialTotalSec, interstitialLeft);
      restLeftSec = interstitialLeft;
      const snap = state._sessionCtl?.snapshot();
      const upcomingLabel = snap?.step?.label || steps[0]?.label || "";
      paintInterstitialNow(upcomingLabel, restKind || "rest");
      announce(`+${sec} с`);
    };

    const armInterstitial = (kind, sec, upcomingLabel) => {
      clearTimeout(restTimer);
      clearInterval(restInterval);
      restTimer = null;
      restInterval = null;
      restKind = kind;
      restArmed = true;
      sheetEl?.classList.add("is-resting");
      interstitialLeft = sec;
      interstitialTotalSec = sec;
      restLeftSec = sec;
      const prep = kind === "prep";
      const pause = kind === "pause";
      paintRestGuide(upcomingLabel, prefersReduce() ? null : sec, kind);
      announce(prep ? "Підготовка" : pause ? "Пауза" : "Пауза між кроками");
      if (!prep) state._sessionCtl?.pause();
      const addBtn = $("#session-add-time");
      /* +30 only for rest / mid-pause — not prep get-ready. */
      if (addBtn) addBtn.hidden = prep || Boolean(prefersReduce());
      if (prefersReduce()) {
        interstitialLeft = 0;
        restLeftSec = 0;
        if (timerEl) timerEl.textContent = formatTimer(0);
        if (prep) paintInterstitialWell("prep", upcomingLabel, null);
        else clearInterstitialWell();
        paintStripLabel(upcomingLabel, { rest: !prep && !pause, prep, pause });
        paintRestGuide(upcomingLabel, null, kind);
        restTimer = setTimeout(() => {
          clearRestCue({ resume: true });
          paintNextUp(state._sessionCtl?.snapshot());
        }, 1800);
        return;
      }
      const tick = () => {
        if (!nextEl) return;
        paintInterstitialNow(upcomingLabel, kind);
        if (interstitialLeft <= 0) {
          clearRestCue({ resume: true });
          paintNextUp(state._sessionCtl?.snapshot());
          return;
        }
        interstitialLeft -= 1;
      };
      tick();
      restInterval = setInterval(tick, 1000);
    };

    const showRestCue = () => {
      if (!nextEl) return;
      if (REST_SEC <= 0) {
        paintNextUp(state._sessionCtl?.snapshot());
        return;
      }
      const snap = state._sessionCtl?.snapshot();
      const upcomingLabel = snap?.step?.label || "";
      armInterstitial("rest", REST_SEC, upcomingLabel);
    };

    /** Mid-exercise Пауза → full hold (no countdown, no +30). */
    const showWorkPause = () => {
      clearTimeout(restTimer);
      clearInterval(restInterval);
      restTimer = null;
      restInterval = null;
      restKind = "pause";
      restArmed = true;
      interstitialLeft = 0;
      restLeftSec = 0;
      sheetEl?.classList.add("is-resting");
      state._sessionCtl?.pause();
      const snap = state._sessionCtl?.snapshot();
      const currentLabel = snap?.step?.label || steps[0]?.label || "";
      if (nextEl) nextEl.classList.add("is-rest");
      paintRestGuide(currentLabel, null, "pause");
      paintStripLabel(currentLabel, { pause: true });
      paintGuideRows(snap, { resting: true });
      const addBtn = $("#session-add-time");
      if (addBtn) addBtn.hidden = true;
      syncUi(snap || { running: false, done: false, idx: 0, left: steps[0]?.durationSec || 0, totalSteps: steps.length, step: steps[0], steps, wave: [] });
      announce("На паузі");
    };

    /** 10s get-ready before first exercise clock — Старт / Ще раз only. */
    const showPrepCue = () => {
      if (!nextEl) return;
      const snap = state._sessionCtl?.snapshot();
      const upcomingLabel = snap?.step?.label || steps[0]?.label || "";
      sheetEl?.classList.remove("is-complete", "is-live");
      armInterstitial("prep", PREP_SEC, upcomingLabel);
      syncUi(state._sessionCtl?.snapshot() || { running: false, done: false, idx: 0, left: steps[0]?.durationSec || 0, totalSteps: steps.length, step: steps[0], steps, wave: [] });
    };

    const beginSessionWithPrep = () => {
      focusGuideOnStart();
      showPrepCue();
    };

    const syncUi = (st) => {
      const viewDay = currentDayISO();
      const isViewToday = viewDay === dayKeyKyiv(new Date());
      sheetEl?.classList.toggle("is-past", !isViewToday);

      /* Past day: history status + idle step-0 chrome (match full paint); keep ctl paused in memory. */
      if (!isViewToday) {
        sheetEl?.classList.remove("is-live", "is-resting");
        const daySt = sessionStatusForDay(viewDay);
        sheetEl?.classList.toggle("is-complete", Boolean(daySt.done));
        const bootStep = steps[0] || null;
        if (timerEl) timerEl.textContent = formatTimer(bootStep?.durationSec || 0);
        paintStripLabel(bootStep?.label || "—");
        paintExerciseArt({ step: bootStep, running: false, done: false, idx: 0 });
        if (statusEl) {
          if (daySt.done) statusEl.textContent = "";
          else if (daySt.partial)
            statusEl.textContent = `частково · ${daySt.ev.stepsDone}/${daySt.ev.stepsTotal || "?"} кроків`;
          else statusEl.textContent = "без сесії в цей день";
        }
        if (nextEl) {
          nextEl.classList.remove("is-rest");
          if (daySt.done) nextEl.textContent = "";
          else if (steps[1]) nextEl.textContent = `далі · ${steps[1].label}`;
          else nextEl.textContent = "один крок · потім раціон";
        }
        dots.forEach((d, i) => {
          d.classList.toggle("is-done", Boolean(daySt.done) || false);
          d.classList.toggle("is-now", !daySt.done && i === 0 && Boolean(bootStep));
        });
        paintGuideRows({ idx: 0, done: false, totalSteps: steps.length }, { past: true, allDone: Boolean(daySt.done) });
        paintSessionWave(waveEl, []);
        paintDonePanel({ elapsedTotal: daySt.ev?.durationSec || 0 }, { complete: Boolean(daySt.done) });
        if (toggleBtn) {
          toggleBtn.textContent = daySt.done ? "Ще раз" : "Старт";
          toggleBtn.disabled = true;
          toggleBtn.hidden = false;
        }
        if (skipBtn) {
          skipBtn.disabled = true;
          skipBtn.hidden = Boolean(daySt.done);
          skipBtn.textContent = "Далі →";
        }
        const addBtnPast = $("#session-add-time");
        if (addBtnPast) addBtnPast.hidden = true;
        patchDayRitualUi();
        return;
      }

      const resting = isRestingUi();
      const dayStLive = sessionStatusForDay(viewDay);
      const sessionComplete = Boolean(st.done || (!st.running && !resting && dayStLive.done));
      sheetEl?.classList.toggle("is-live", Boolean(st.running) && !resting);
      sheetEl?.classList.toggle("is-resting", resting);
      sheetEl?.classList.toggle("is-work-pause", resting && restKind === "pause");
      sheetEl?.classList.toggle("is-step-rest", resting && restKind === "rest");
      sheetEl?.classList.toggle("is-prep", resting && restKind === "prep");
      sheetEl?.classList.toggle("is-complete", sessionComplete);
      const bootStep = steps[0] || null;
      /* After complete: keep first-step strip as replay preview (art + clock + name). */
      if (sessionComplete && !st.running && !resting) {
        if (timerEl) timerEl.textContent = formatTimer(bootStep?.durationSec || 0);
        paintStripLabel(bootStep?.label || "—");
        paintExerciseArt({ step: bootStep, running: false, done: false, idx: 0 });
      } else {
        if (timerEl) {
          if (resting && restKind === "pause") {
            timerEl.textContent = "";
            timerEl.hidden = true;
          } else {
            timerEl.hidden = false;
            timerEl.textContent = resting
              ? formatTimer(Math.max(0, restLeftSec))
              : formatTimer(st.done ? 0 : st.left);
          }
        }
        paintStripLabel(st.done ? "" : st.step?.label || "—", {
          done: Boolean(st.done),
          rest: resting && !st.done && restKind === "rest",
          prep: resting && restKind === "prep",
          pause: resting && restKind === "pause",
        });
        if (resting && (restKind === "prep" || restKind === "rest")) {
          paintInterstitialWell(
            restKind,
            st.step?.label || steps[0]?.label || "",
            prefersReduce() ? null : restLeftSec,
          );
        } else if (!resting) {
          clearInterstitialWell();
        }
        paintExerciseArt(st);
      }
      if (statusEl) {
        if (st.done || (!st.running && !resting && dayStLive.done)) {
          /* Done copy lives in #session-done — avoid duplicate tiny «готово». */
          statusEl.textContent = "";
        } else if (resting && restKind === "prep") {
          statusEl.textContent = "";
        } else if (resting && restKind === "pause") {
          statusEl.textContent = "";
        } else if (resting && restKind === "rest") {
          statusEl.textContent = "";
        } else if (resting) {
        } else if (st.running) {
          statusEl.textContent = `крок ${st.idx + 1} / ${st.totalSteps}`;
        } else if (dayStLive.partial) {
          statusEl.textContent = `сьогодні частково · ${dayStLive.ev.stepsDone}/${dayStLive.ev.stepsTotal || "?"} кроків`;
        } else {
          statusEl.textContent = "";
        }
      }
      const stepped = lastIdx >= 0 && st.idx > lastIdx && !st.done;
      lastIdx = st.idx;
      if (stepped) showRestCue();
      else if (!resting) {
        if (sessionComplete) {
          if (nextEl) {
            nextEl.classList.remove("is-rest");
            nextEl.textContent = "";
          }
        } else {
          paintNextUp(st);
        }
      }
      dots.forEach((d, i) => {
        d.classList.toggle("is-done", sessionComplete || i < st.idx || st.done);
        d.classList.toggle("is-now", !sessionComplete && !st.done && i === st.idx);
      });
      paintGuideRows(st, { resting, allDone: sessionComplete });
      /* Hide effort wave during rest — frozen polyline reads as a glitch. */
      paintSessionWave(waveEl, resting || sessionComplete ? [] : st.wave);
      if (toggleBtn) {
        if (resting) toggleBtn.textContent = "Продовжити";
        else if (st.running) toggleBtn.textContent = "Пауза";
        else if (sessionComplete) toggleBtn.textContent = "Ще раз";
        else toggleBtn.textContent = "Старт";
        toggleBtn.disabled = false;
        /* P2: one forward CTA in rest — secondary synonym hidden */
        toggleBtn.hidden = resting;
      }
      if (skipBtn) {
        skipBtn.disabled = false;
        /* Done: sole session CTA is replay — plates via auto-scroll + ritual chip. */
        skipBtn.hidden = Boolean(sessionComplete) || (resting && restKind === "pause");
        if (resting && restKind === "pause") skipBtn.textContent = "Продовжити →";
        else if (resting) skipBtn.textContent = "До вправи →";
        else skipBtn.textContent = "Далі →";
      }
      const pauseResumeBtn = $("#session-pause-resume");
      if (pauseResumeBtn) {
        pauseResumeBtn.hidden = !(resting && restKind === "pause");
      }
      const addBtn = $("#session-add-time");
      if (addBtn) {
        const allowAdd = resting && restKind === "rest";
        addBtn.hidden = !allowAdd || Boolean(sessionComplete) || prefersReduce();
        addBtn.disabled = !isViewToday;
      }
      const howtoBox = howtoRoot();
      if (howtoBox && (sessionComplete || resting)) {
        stopExerciseHowToSpeech();
        setHowtoListenUi(false);
        setHowtoOpen(false);
        howtoBox.hidden = true;
      }
      paintDonePanel(st, { complete: sessionComplete && !st.running && !resting });
      patchDayRitualUi();
    };

    const attachSessionViewHook = () => {
      state._sessionViewHook = () => {
        const isViewToday = currentDayISO() === dayKeyKyiv(new Date());
        if (!isViewToday) {
          clearRestCue();
          state._sessionCtl?.pause();
          stopArtCycle();
        }
        const st = state._sessionCtl?.snapshot();
        if (st) syncUi(st);
      };
    };

    attachSessionViewHook();

    const bootCtl = () => {
      destroySessionCtl(programId, { flush: true });
      stopArtCycle();
      stopExerciseHowToSpeech();
      setHowtoListenUi(false);
      artSlug = "";
      sheetEl?.classList.remove("is-complete", "is-live");
      lastIdx = -1;
      clearRestCue();
      state._sessionCtl = createSessionController({
        steps,
        onTick: syncUi,
        onStep: (st) => {
          syncUi(st);
          const prog = sessionProgressFromSnapshot(st);
          if (prog) {
            noteSessionProgress({
              programId,
              stepsDone: prog.stepsDone,
              stepsTotal: prog.stepsTotal,
              durationSec: prog.durationSec,
              full: prog.full,
            });
          }
        },
        onDone: (st) => {
          noteSessionProgress({
            programId,
            stepsDone: st.totalSteps,
            stepsTotal: st.totalSteps,
            durationSec: st.elapsedTotal,
            full: true,
          });
          clearRestCue();
          stopExerciseHowToSpeech();
          setHowtoListenUi(false);
          const howto = howtoRoot();
          if (howto) howto.hidden = true;
          sheetEl?.classList.add("is-complete");
          toast("Сесію завершено · час тарілок");
          syncUi(st);
          patchDayRitualUi();
          announce("Сесію завершено");
          setTimeout(
            () => root.querySelector(".day-sheet--plates")?.scrollIntoView({ behavior: "smooth", block: "start" }),
            450,
          );
        },
      });
      /* destroySessionCtl cleared hook — re-attach after new ctl */
      attachSessionViewHook();
      syncUi(state._sessionCtl.snapshot());
      bindHowToListen();
    };

    bootCtl();

    const focusGuideOnStart = () => {
      const details = sheetEl?.querySelector(".session-player__list");
      if (details) details.open = false;
      sheetEl?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    toggleBtn.onclick = () => {
      const st = state._sessionCtl?.snapshot();
      if (st?.done) {
        bootCtl();
        beginSessionWithPrep();
        return;
      }
      if (isRestingUi()) {
        clearRestCue({ resume: true });
        paintNextUp(state._sessionCtl?.snapshot());
        return;
      }
      const before = state._sessionCtl?.snapshot();
      /* Idle Старт → prep buffer. */
      if (!before?.running && !before?.done) {
        beginSessionWithPrep();
        return;
      }
      /* Live Пауза → pause mode (+30 с). */
      if (before?.running) {
        showWorkPause();
        return;
      }
      state._sessionCtl?.toggle();
      const after = state._sessionCtl?.snapshot();
      if (after?.running && !before?.running) {
        focusGuideOnStart();
        announce("Сесію розпочато");
      }
    };
    skipBtn.onclick = () => {
      const st = state._sessionCtl?.snapshot();
      if (st?.done || skipBtn.hidden) return;
      /* prep / rest / pause: end cue & start/resume current step (do not skip exercise) */
      if (isRestingUi()) {
        clearRestCue({ resume: true });
        paintNextUp(state._sessionCtl?.snapshot());
        return;
      }
      state._sessionCtl?.skip();
    };
    const addTimeBtn = $("#session-add-time");
    if (addTimeBtn) {
      addTimeBtn.onclick = () => addInterstitialTime(ADD_PAUSE_SEC);
    }
    const pauseResumeBtn = $("#session-pause-resume");
    if (pauseResumeBtn) {
      pauseResumeBtn.onclick = () => {
        if (!isPauseUi()) return;
        clearRestCue({ resume: true });
        paintNextUp(state._sessionCtl?.snapshot());
      };
    }
  }

  if (state.screen === "survey") {
    const draft = state.surveyDraft || normalizeSurvey(loadSportSurvey());
    state.surveyDraft = draft;
    const program =
      state.kb?.programs?.find((p) => p.id === state.intentSport?.constraints?.programId) ||
      state.kb?.programs?.[0];
    const avoidHtml = SURVEY_AVOID_CHIPS.map((c) => {
      const on = draft.avoidIds.includes(c.id);
      return `<button type="button" class="survey-chip survey-chip--check${on ? " is-on" : ""}" data-avoid="${esc(c.id)}" role="checkbox" aria-checked="${on ? "true" : "false"}">${esc(c.label)}</button>`;
    }).join("");
    const dietHtml = SURVEY_DIET_TAGS.map((c) => {
      const on = draft.dietTags.includes(c.id);
      return `<button type="button" class="survey-chip survey-chip--check${on ? " is-on" : ""}" data-diet="${esc(c.id)}" role="checkbox" aria-checked="${on ? "true" : "false"}">${esc(c.label)}</button>`;
    }).join("");
    const cookHtml = SURVEY_COOK_MODES.map((c) => {
      const on = draft.cookMode === c.id;
      return `<button type="button" class="survey-chip survey-chip--radio${on ? " is-on" : ""}" data-cook="${esc(c.id)}" role="radio" aria-checked="${on ? "true" : "false"}">${esc(c.label)}</button>`;
    }).join("");
    paint(
      `
      <section class="day-flow survey-flow" aria-label="Смаки раціону">
        <header class="sport-chrome sport-chrome--inline">
          <div class="sport-chrome-top">
            <button type="button" class="back" id="back" aria-label="Назад">←</button>
            <h1 class="sport-title">Смаки</h1>
          </div>
          <p class="day-flow__kicker sport-chrome__kicker">фільтр полиці · не медична порада</p>
        </header>
        <p class="day-flow__lede muted">Під програму «${esc(program?.title || "Sport")}» — прибрати продукти, режим раціону й спосіб на кухні. Це ваш вибір, не діагноз.</p>
        <section class="day-sheet survey-sheet survey-sheet--multi" aria-label="Уникати">
          <div class="survey-sheet__head">
            <strong class="day-sheet__label">Уникати</strong>
            <span class="survey-sheet__mode">чеки · можна кілька</span>
          </div>
          <div class="survey-chips" role="group" aria-label="Уникати продукти, можна кілька">${avoidHtml}</div>
        </section>
        <section class="day-sheet survey-sheet survey-sheet--multi" aria-label="Раціон">
          <div class="survey-sheet__head">
            <strong class="day-sheet__label">Раціон</strong>
            <span class="survey-sheet__mode">чек · режим харчування</span>
          </div>
          <p class="survey-section-hint muted">Окремо від «уникати»: ширший режим (напр. без мʼяса / риби).</p>
          <div class="survey-chips" role="group" aria-label="Режим раціону, можна увімкнути">${dietHtml}</div>
        </section>
        <section class="day-sheet survey-sheet survey-sheet--single" aria-label="На кухні">
          <div class="survey-sheet__head">
            <strong class="day-sheet__label">На кухні</strong>
            <span class="survey-sheet__mode">вибір · лише один</span>
          </div>
          <div class="survey-chips survey-chips--radio" role="radiogroup" aria-label="Спосіб на кухні, один варіант">${cookHtml}</div>
          <p class="muted survey-hint">«Готувати самому» тягне сирі SKU; «готове з полиці» — готові. Не плутати з міткою «плита» на страві дня.</p>
        </section>
        <button type="button" class="primary" id="surveyNext">Далі · день і полиця →</button>
        <button type="button" class="ghost ghost--sheet survey-skip" id="surveySkip">Пропустити без фільтрів</button>
      </section>
    `,
      () => {
        $("#back").onclick = () => go("sport");
        root.querySelectorAll("[data-avoid]").forEach((btn) => {
          btn.onclick = () => {
            const id = btn.dataset.avoid;
            const set = new Set(state.surveyDraft.avoidIds);
            if (set.has(id)) set.delete(id);
            else set.add(id);
            state.surveyDraft = { ...state.surveyDraft, avoidIds: [...set] };
            render();
          };
        });
        root.querySelectorAll("[data-diet]").forEach((btn) => {
          btn.onclick = () => {
            const id = btn.dataset.diet;
            const set = new Set(state.surveyDraft.dietTags);
            if (set.has(id)) set.delete(id);
            else set.add(id);
            state.surveyDraft = { ...state.surveyDraft, dietTags: [...set] };
            render();
          };
        });
        root.querySelectorAll("[data-cook]").forEach((btn) => {
          btn.onclick = () => {
            state.surveyDraft = { ...state.surveyDraft, cookMode: btn.dataset.cook };
            render();
          };
        });
        $("#surveyNext").onclick = () => {
          const btn = $("#surveyNext");
          if (btn?.dataset.busy === "1") return;
          setPrimaryBusy(btn, true, "Збираємо день…");
          saveSportSurvey(state.surveyDraft);
          state.surveyDraft = null;
          state.screen = "day";
          state.navLock = true;
          invalidateDayVmCache();
          writeHash();
          render();
        };
        $("#surveySkip").onclick = () => {
          saveSportSurvey({ ...emptySportSurvey(), completedAt: new Date().toISOString() });
          state.surveyDraft = null;
          state.screen = "day";
          state.navLock = true;
          invalidateDayVmCache();
          writeHash();
          render();
        };
      },
    );
    return;
  }

  if (state.screen === "day") {
    stampSportProfileOnIntent();
    const partnerSnap = loadActiveContentSourceId();
    const resolveExtra = sportDayResolveExtra();
    const fp = dayVmFingerprint();
    let vm = state._dayVmCache?.fp === fp ? state._dayVmCache.vm : null;
    if (!vm) {
      /* Keep busy CTA on pick/survey if already spinning; otherwise show day wait shell. */
      const hasBusyCta = Boolean(root.querySelector(".primary.is-busy"));
      if (!hasBusyCta) {
        paint(dayResolveWaitHtml(), () => {
          $("#back")?.addEventListener("click", (ev) => ev.preventDefault());
        }, { enter: false });
      }
      vm = await resolveVm(state.intentSport, resolveExtra);
      if (seq !== state.renderSeq) return;
      if (partnerSnapDrift(partnerSnap, loadActiveContentSourceId)) {
        invalidateDayVmCache();
        void render();
        return;
      }
      state._dayVmCache = { fp, vm };
    }
    /* History: don't block dayISO hops when cache already warm */
    if (!state.historyCache?.loadedAt) {
      await ensureHistoryCache();
      if (seq !== state.renderSeq) return;
      if (partnerSnapDrift(partnerSnap, loadActiveContentSourceId)) {
        invalidateDayVmCache();
        void render();
        return;
      }
    } else {
      void ensureHistoryCache();
    }
    const meals = vm.lines;
    state._dayMeals = meals;
    state._dayBranchLabel = vm.branchLabel;
    const plates = dayMealsHtml(meals);
    const programId = state.intentSport?.constraints?.programId || "";
    if (state._sessionCtl) {
      destroySessionCtl(programId, { flush: true });
    }
    const viewDayIso = currentDayISO();
    const todayIso = dayKeyKyiv(new Date());
    const isViewToday = viewDayIso === todayIso;
    const sessionSteps = parseSessionSteps(vm.blocks || []);
    const daySession = sessionStatusForDay(viewDayIso);
    const sessionDoneToday = daySession.done;
    const sessionPartialToday = daySession.partial;
    const todayEv = daySession.ev;
    const dotsHtml = sessionSteps
      .map(
        (st, i) =>
          `<span class="session-player__dot" data-i="${i}" title="${esc(st.label)}" aria-hidden="true"></span>`,
      )
      .join("");
    const sessionStatusBoot = sessionDoneToday
      ? ""
      : sessionPartialToday
        ? isViewToday
          ? `сьогодні частково · ${todayEv?.stepsDone}/${todayEv?.stepsTotal || "?"} кроків`
          : `частково · ${todayEv?.stepsDone}/${todayEv?.stepsTotal || "?"} кроків`
        : isViewToday
          ? ""
          : "без сесії в цей день";
    const sessionMin = Math.max(
      1,
      Math.round(sessionSteps.reduce((s, st) => s + (Number(st.durationSec) || 0), 0) / 60),
    );
    const nextBoot = sessionDoneToday
      ? ""
      : sessionSteps[1]
        ? `далі · ${sessionSteps[1].label}`
        : "один крок · потім раціон";
    const expressOnDay = meals.filter((l) =>
      expressMembershipForMeal(l, {
        extraQueries: state.extraQueries,
        shopLines: state.shopVm?.lines,
        bases: loadBases(),
      }).inExpress,
    ).length;
    const expressCta =
      expressOnDay > 0 ? `${expressOnDay} в Express · переглянути →` : "До СільпоExpress →";
    const addableN = mealsAddableToExpress(meals, (l) =>
      expressMembershipForMeal(l, {
        extraQueries: state.extraQueries,
        shopLines: state.shopVm?.lines,
        bases: loadBases(),
      }),
    ).length;
    const addAllCta =
      addableN === 0
        ? ""
        : `<button type="button" class="ghost ghost--sheet day-plates__add-all" id="addAllPlates">${
            addableN === 1 ? "Додати в Express" : `Додати всі (${addableN}) в Express`
          }</button>`;
    const surveyPrefs = loadSportSurvey();
    const plateMode = plateModeFromCookMode(surveyPrefs.cookMode);
    const plateModeBits = [
      { id: "ready", label: "готові страви" },
      { id: "ingredients", label: "інгредієнти" },
    ]
      .map(
        (m) =>
          `<button type="button" class="day-plates__mode-chip${plateMode === m.id ? " is-on" : ""}" data-plate-mode="${m.id}" role="radio" aria-checked="${plateMode === m.id ? "true" : "false"}">${esc(m.label)}</button>`,
      )
      .join("");
    const filterBtnHtml = dayPlatesFilterBtnHtml(surveyPrefs);
    const walkSteps = clampWalkSteps(state.intentSport?.constraints?.steps || loadWalkSteps());
    state.intentSport.constraints.steps = walkSteps;
    const walkVar = (vm.variants || []).find((v) => v.id === "walk");
    const walkTitle = walkVar?.title || `Ціль ≈ ${walkSteps} кроків`;
    const walkText = walkVar?.text || "Прогулянка до найближчого Сільпо з продуктами дня. Кроки рахує телефон.";
    const walkPresets = WALK_STEP_PRESETS.map((n) => {
      const on = n === walkSteps;
      return `<button type="button" class="day-walk__chip${on ? " is-on" : ""}" data-walk-steps="${n}" aria-pressed="${on ? "true" : "false"}">${n / 1000}k</button>`;
    }).join("");
    const walkProducts = (meals || [])
      .map((l) => String(l.wanted || l.staple || l.name || "").trim())
      .filter(Boolean)
      .filter((q, i, arr) => arr.findIndex((x) => x.toLowerCase() === q.toLowerCase()) === i)
      .slice(0, 8);
    const walkCard = `
      <section class="day-sheet day-sheet--walk" aria-label="Ціль кроків">
        <div class="day-walk__head">
          <div class="day-walk__head-copy">
            <strong class="day-sheet__label">Прогулянка</strong>
            <p class="day-walk__title" id="walkTitle">${esc(walkTitle)}</p>
          </div>
          <div class="day-walk__presets" role="group" aria-label="Ціль кроків">${walkPresets}</div>
        </div>
        <p class="day-walk__lede muted">${esc(walkText)}</p>
        <details class="day-walk__route" id="walkRoute">
          <summary class="day-walk__route-sum">Карта до Сільпо</summary>
          <div class="day-walk__map-wrap">
            <div class="day-walk__map" id="walkMap" role="img" aria-label="Карта до Сільпо"></div>
            <p class="day-walk__map-status muted" id="walkMapStatus">карта зʼявиться після відкриття</p>
          </div>
        </details>
      </section>`;
    const savedProfile = loadSportProfile();
    paint(
      `
      <section class="day-flow day-flow--ds474" aria-label="День і полиця">
      <header class="sport-chrome sport-chrome--inline day-flow__chrome">
        <div class="sport-chrome-top">
          <button type="button" class="back" id="back" aria-label="Назад">←</button>
          ${brandMarkHtml({ product: "sport", size: "chrome", tag: "h1", className: "sport-title sport-chrome__brand" })}
        </div>
      </header>
      ${sportProfileHeroBandHtml(savedProfile)}
      ${sourceBadge()}
      <section class="day-sheet session-player session-player--guide session-player--hero${sessionDoneToday ? " is-complete" : ""}" aria-label="Сесія">
        <div class="session-player__top session-player__top--hero">
          <span class="session-player__meta-line muted">Сесія · ≈ ${sessionMin} хв · ${sessionSteps.length} кр.</span>
          <button type="button" class="day-flow__program day-flow__program--meta" id="toWheel" aria-label="Змінити програму: ${esc(vm.title)}">
            <span class="day-flow__program-hint">змінити програму</span>
          </button>
        </div>
        <p class="session-player__status muted" id="session-status">${sessionStatusBoot}</p>
        <div class="session-done" id="session-done"${sessionDoneToday ? "" : " hidden"}>
          <div class="session-done__mosaic" id="session-done-mosaic" aria-hidden="true">${sessionDoneMosaicHtml(sessionSteps)}</div>
          <div class="session-done__copy" id="session-done-copy">${sessionDoneCopyHtml({
            minutes: sessionMin,
            steps: sessionSteps.length,
            durationSec: todayEv?.durationSec || 0,
          })}</div>
        </div>
        <div class="session-player__head">
          <p class="session-player__move session-player__move--hero" id="session-label">${esc(sessionLabelShortName(sessionSteps[0]?.label || "—"))}</p>
          <p class="session-player__clock num" id="session-timer" aria-live="polite">${formatTimer(sessionSteps[0]?.durationSec || 0)}</p>
        </div>
        <div class="session-player__strip session-player__strip--hero">
          ${(() => {
            const bootArt = resolveExerciseArt(sessionSteps[0]?.label || "");
            const bootName = esc(sessionLabelShortName(sessionSteps[0]?.label || ""));
            const artTitle = `<figcaption class="session-player__art-title" id="session-art-title"${bootName ? "" : " hidden"}>${bootName || ""}</figcaption>`;
            const prepWell = `<div class="session-player__prep-well" id="session-prep-well" hidden aria-hidden="true"><span class="session-player__prep-badge session-player__prep-badge--plain" id="session-prep-badge">підготуйся до вправи</span><div class="session-player__prep-ring" aria-hidden="true"><p class="session-player__prep-clock num" id="session-prep-timer"></p></div></div>`;
            const prepCaption = `<p class="session-player__prep-caption" id="session-prep-caption" hidden></p>`;
            const breath = `<div class="session-breath" id="session-breath" hidden aria-hidden="true"><span class="session-breath__orb"></span><span class="session-breath__orb session-breath__orb--mid"></span><span class="session-breath__orb session-breath__orb--outer"></span></div>`;
            if (!bootArt) {
              return `<figure class="session-player__art session-player__art--strip" id="session-art" hidden>${prepWell}<img id="session-art-img" class="session-player__art-img" alt="" width="512" height="512" decoding="async" />${prepCaption}${breath}${artTitle}</figure>`;
            }
            return `<figure class="session-player__art session-player__art--strip" id="session-art">${prepWell}<img id="session-art-img" class="session-player__art-img" src="${esc(bootArt.url)}" alt="${esc(bootArt.name)}" width="512" height="512" decoding="async" />${prepCaption}${breath}${artTitle}</figure>`;
          })()}
        </div>
        <details class="session-howto" id="session-howto" hidden>
          <summary class="session-howto__toggle">Як робити</summary>
          <div class="session-howto__body">
            <p class="session-howto__kicker muted">${esc(HOWTO_DISCLAIMER_SHORT)}</p>
            <p class="session-howto__text" id="session-howto-text"></p>
            <button type="button" class="session-howto__listen" id="session-howto-listen" hidden aria-pressed="false">
              <span class="session-howto__listen-ico" aria-hidden="true"></span>
              <span class="session-howto__listen-label">Слухати</span>
            </button>
          </div>
        </details>
        <p class="session-player__next muted" id="session-next">${esc(nextBoot)}</p>
        <div class="session-player__actions">
          <button type="button" class="session-player__add-time" id="session-add-time" hidden aria-label="Додати 30 секунд паузи">+30 с</button>
          <button type="button" class="session-player__toggle" id="session-toggle"${isViewToday ? "" : " disabled"}>${sessionDoneToday ? "Ще раз" : "Старт"}</button>
          <button type="button" class="session-player__skip" id="session-skip"${sessionDoneToday ? " hidden" : ""}${isViewToday ? "" : " disabled"}>Далі →</button>
          <button type="button" class="session-player__pause-resume session-player__pause-badge--row" id="session-pause-resume" hidden aria-label="Продовжити вправу">
            <span class="session-player__pause-ico" aria-hidden="true"></span>
            <span class="session-player__pause-copy">
              <strong class="session-player__pause-title">Зупинено</strong>
              <span class="session-player__pause-hint">продовжити коли готовий</span>
            </span>
          </button>
        </div>
        <div class="session-player__dots" id="session-dots" role="list" aria-label="Кроки сесії">${dotsHtml}</div>
        <svg class="session-player__wave" id="session-wave" viewBox="0 0 280 24" width="100%" height="24" aria-hidden="true" preserveAspectRatio="none"></svg>
        <details class="session-player__list">
          <summary>Усі вправи (${sessionSteps.length})</summary>
          <ol class="session-guide" id="session-guide">${sessionGuideListHtml(sessionSteps)}</ol>
        </details>
        <span class="sr-only">${esc(EXERCISE_ART_ATTRIBUTION)}</span>
      </section>
      ${walkCard}
      <section class="day-sheet day-sheet--plates" aria-label="Спортивний раціон">
        <strong class="day-sheet__label">Спортивний раціон</strong>
        <div class="day-plates__prefs" aria-label="Режим раціону">
          <div class="day-plates__mode-row">
            <div class="day-plates__mode" role="radiogroup" aria-label="Готові страви або інгредієнти">${plateModeBits}</div>
            ${filterBtnHtml}
          </div>
        </div>
        <div class="day-plates-list" id="dayPlatesList">${plates.html}</div>
        <div class="day-plates__actions">
          ${addAllCta}
          <button type="button" class="primary day-plates__express${expressOnDay > 0 ? " day-plates__express--has" : ""}" id="toExpress">${esc(expressCta)}</button>
        </div>
      </section>
      ${debugHtml(vm)}
      </section>
    `,
      () => {
        $("#back").onclick = () => {
          destroySessionCtl(programId);
          go("home");
        };
        $("#toWheel").onclick = () => {
          destroySessionCtl(programId);
          state.screen = "sport";
          state.sportTab = "wheel";
          state.sportProgramPickerOpen = false;
          state.navLock = true;
          writeHash();
          render();
        };
        $("#editSurvey").onclick = () => {
          destroySessionCtl(programId);
          enterSportDay({ editSurvey: true });
        };
        root.querySelectorAll("[data-plate-mode]").forEach((btn) => {
          btn.onclick = () => {
            void applyDayPlateMode(btn.dataset.plateMode);
          };
        });
        /* Partner fixture: ?partner=chef only (not day prefs — «інгредієнти» = cookMode). */
        $("#toExpress").onclick = () => {
          destroySessionCtl(programId);
          enterShopFromSport(programId);
        };
        bindSportProfileHeroBand({ programId });
        root.querySelectorAll("[data-walk-steps]").forEach((btn) => {
          btn.onclick = () => {
            const n = clampWalkSteps(btn.dataset.walkSteps);
            if (n === clampWalkSteps(state.intentSport?.constraints?.steps)) return;
            state.intentSport.constraints.steps = saveWalkSteps(n);
            const fp = dayVmFingerprint();
            if (state._dayVmCache?.vm) {
              const vm = state._dayVmCache.vm;
              const walk = (vm.variants || []).find((v) => v.id === "walk");
              if (walk) walk.title = `Ціль ≈ ${n} кроків`;
              state._dayVmCache = { fp, vm };
            } else {
              invalidateDayVmCache();
            }
            void render();
          };
        });
        bindSessionPlayer(sessionSteps, { programId, viewDayISO: viewDayIso });
        bindDayPlatesMealActions(meals, programId);
        const walkRoute = root.querySelector("#walkRoute");
        let walkMounted = false;
        const ensureWalkMap = () => {
          if (walkMounted) {
            setTimeout(() => refreshWalkMapSize(), 80);
            return;
          }
          walkMounted = true;
          void mountWalkMap(root, { products: walkProducts }).then(() => {
            setTimeout(() => refreshWalkMapSize(), 80);
          });
        };
        walkRoute?.addEventListener("toggle", () => {
          if (walkRoute.open) ensureWalkMap();
        });
        if (walkRoute?.open) ensureWalkMap();
      },
    );
    return;
  }

  const savedProfile = loadSportProfile();
  /* Polish: each full page load starts on profile form once; save clears the gate. */
  if (state._sportProfilePolishOnce == null) state._sportProfilePolishOnce = true;
  const needProfile =
    state._sportProfilePolishOnce || !profileIsComplete(savedProfile) || Boolean(state.profileDraft);
  if (needProfile) {
    const draft = normalizeSportProfile(state.profileDraft || savedProfile);
    state.profileDraft = draft;
    const sexBits = SEX_OPTIONS.map(
      (s) =>
        `<button type="button" class="day-walk__chip sport-profile__chip-opt${draft.sex === s.id ? " is-on" : ""}" data-sex="${s.id}" aria-pressed="${draft.sex === s.id ? "true" : "false"}">${esc(s.label)}</button>`,
    ).join("");
    const goalBits = BODY_GOALS.map(
      (g) =>
        `<button type="button" class="day-walk__chip sport-profile__chip-opt${draft.bodyGoal === g.id ? " is-on" : ""}" data-body-goal="${g.id}" aria-pressed="${draft.bodyGoal === g.id ? "true" : "false"}">${esc(g.label)}</button>`,
    ).join("");
    const kcalHint = profileIsComplete({ ...draft, completedAt: draft.completedAt || "x" })
      ? estimateDailyKcalFromProfile({ ...draft, completedAt: draft.completedAt || new Date().toISOString() })
      : null;
    paint(
      `
      <section class="day-flow sport-pick sport-pick--profile" aria-label="Профіль СільпоSport">
        <header class="sport-chrome sport-chrome--inline">
          <div class="sport-chrome-top">
            <button type="button" class="back" id="back" aria-label="Назад">←</button>
            ${brandMarkHtml({ product: "sport", size: "chrome", tag: "p", className: "sport-chrome__brand" })}
          </div>
          <p class="day-flow__kicker sport-chrome__kicker">профіль · не медична порада</p>
        </header>
        <h1 class="day-flow__title sport-pick__hero">Хто займається?</h1>
        <p class="day-flow__lede muted">Підберемо навантаження й орієнтир калорій. Далі — програми вдома.</p>
        <section class="day-sheet sport-profile__card" aria-label="Параметри">
          <p class="day-sheet__label sport-pick__section-label">Стать</p>
          <div class="day-walk__presets sport-profile__sex" role="group" aria-label="Стать">${sexBits}</div>
          <p class="day-sheet__label sport-pick__section-label">Параметри</p>
          <div class="sport-profile__metrics" role="group" aria-label="Параметри тіла">
            <label class="sport-profile__metric"><span>Вік · р.</span><input id="profileAge" type="number" inputmode="numeric" min="14" max="90" value="${draft.age ?? ""}" placeholder="—" aria-label="Вік у роках" /></label>
            <label class="sport-profile__metric"><span>Зріст · см</span><input id="profileHeight" type="number" inputmode="numeric" min="120" max="230" value="${draft.heightCm ?? ""}" placeholder="—" aria-label="Зріст у сантиметрах" /></label>
            <label class="sport-profile__metric"><span>Вага · кг</span><input id="profileWeight" type="number" inputmode="numeric" min="35" max="200" value="${draft.weightKg ?? ""}" placeholder="—" aria-label="Вага в кілограмах" /></label>
          </div>
          <p class="day-sheet__label sport-pick__section-label">Ціль</p>
          <div class="day-walk__presets sport-profile__goals" role="group" aria-label="Ціль">${goalBits}</div>
          ${kcalHint ? `<p class="muted sport-profile__kcal">≈ ${kcalHint} ккал/день · орієнтир</p>` : ""}
        </section>
        <div class="dock dock--sport">
          <button type="button" class="primary" id="saveProfile">Далі · програми для мене →</button>
        </div>
      </section>
    `,
      () => {
        $("#back").onclick = () => {
          state.profileDraft = null;
          state._sportProfilePolishOnce = false;
          go("home");
        };
        const syncDraft = () => {
          state.profileDraft = normalizeSportProfile({
            ...state.profileDraft,
            age: $("#profileAge")?.value,
            heightCm: $("#profileHeight")?.value,
            weightKg: $("#profileWeight")?.value,
          });
        };
        root.querySelectorAll("[data-sex]").forEach((btn) => {
          btn.onclick = () => {
            syncDraft();
            state.profileDraft.sex = btn.dataset.sex;
            render();
          };
        });
        root.querySelectorAll("[data-body-goal]").forEach((btn) => {
          btn.onclick = () => {
            syncDraft();
            state.profileDraft.bodyGoal = btn.dataset.bodyGoal;
            render();
          };
        });
        ["profileAge", "profileHeight", "profileWeight"].forEach((id) => {
          const el = $(`#${id}`);
          if (!el) return;
          el.oninput = syncDraft;
          el.onchange = () => {
            syncDraft();
            render();
          };
        });
        $("#saveProfile").onclick = () => {
          syncDraft();
          const next = normalizeSportProfile(state.profileDraft);
          if (!next.sex || next.age == null || next.heightCm == null || next.weightKg == null || !next.bodyGoal) {
            toast("Заповніть стать, вік, зріст, вагу і ціль");
            return;
          }
          const saved = saveSportProfile(next);
          state.profileDraft = null;
          state._sportProfilePolishOnce = false;
          state.intentSport.constraints.level = suggestLevelFromProfile(saved);
          const rankedNow = rankProgramsForProfile(programsForHome(state.kb.programs), saved);
          if (rankedNow[0]) state.intentSport.constraints.programId = rankedNow[0].id;
          state.sportTab = "wheel";
          state.sportProgramPickerOpen = false;
          toast("Профіль збережено");
          render();
        };
      },
    );
    return;
  }

  const current = programs[idx] || programs[0];
  const suggestedIds = new Set(programs.slice(0, 3).map((p) => p.id));
  const levelForArt = state.intentSport?.constraints?.level || "beginner";
  const goalFilter = state.sportProgramGoalFilter || "";
  const listed = goalFilter ? programs.filter((p) => p.goal === goalFilter) : programs;

  const catOptions = [{ id: "", label: "усі" }, ...Object.entries(TRAINING_GOAL_UA).map(([id, label]) => ({ id, label }))];
  const catSelectHtml = catOptions
    .map(
      (c) =>
        `<option value="${esc(c.id)}"${goalFilter === c.id ? " selected" : ""}>${esc(c.label)}</option>`,
    )
    .join("");

  const programListHtml = listed.length
    ? listed
        .map((p) => {
          const on = p.id === current?.id;
          const suggested = suggestedIds.has(p.id);
          const steps = sessionFor(state.kb, p.id, levelForArt, { sex: savedProfile.sex }) || [];
          const thumbArt = resolveProgramThumb(p.id, steps);
          const thumb = thumbArt
            ? `<span class="sport-rec__thumb sport-rec__thumb--photo"><img src="${esc(thumbArt.url)}" alt="" width="64" height="64" loading="lazy" decoding="async" /></span>`
            : `<span class="sport-rec__thumb sport-rec__thumb--letter" aria-hidden="true">${esc(String(p.title || "?").slice(0, 1))}</span>`;
          const badges = suggested ? `<span class="sport-rec__badge">для вас</span>` : "";
          const meta = programPickerMetaLine(p, savedProfile, on);
          const radio = on
            ? `<span class="sport-rec__radio sport-rec__radio--on" aria-hidden="true"><span class="sport-rec__radio-check">✓</span></span>`
            : `<span class="sport-rec__radio" aria-hidden="true"></span>`;
          return `<button type="button" class="sport-rec${suggested ? " is-suggested" : ""}${on ? " is-on" : ""}" data-program-id="${esc(p.id)}" role="option" aria-selected="${on ? "true" : "false"}">
        ${thumb}
        <span class="sport-rec__body">
          <span class="sport-rec__title-row"><strong class="sport-rec__title">${esc(p.title)}</strong>${badges}</span>
          <span class="muted sport-rec__meta">${esc(meta)}</span>
        </span>
        ${radio}
      </button>`;
        })
        .join("")
    : `<p class="muted sport-program-picker__empty">Немає програм у цій категорії</p>`;

  function bindSportPickerForward() {
    const goalFilterEl = $("#goalFilter");
    if (goalFilterEl) {
      goalFilterEl.onchange = () => {
        state.sportProgramGoalFilter = goalFilterEl.value || "";
        render();
      };
    }
    root.querySelectorAll("[data-program-id]").forEach((btn) => {
      btn.onclick = () => {
        state.intentSport.constraints.programId = btn.dataset.programId;
        render();
      };
    });
    const catalog = root.querySelector(".sport-pick__catalog");
    if (catalog) {
      catalog.onwheel = (e) => {
        if (catalog.scrollHeight <= catalog.clientHeight) return;
        if (!e.target.closest(".sport-rec")) return;
        catalog.scrollTop += e.deltaY;
        e.preventDefault();
      };
    }
  }

  paint(
    `
    <section class="day-flow sport-pick sport-pick--collapsed sport-pick--picker-forward sport-pick--header-band" aria-label="Обрати програму">
      <header class="sport-chrome sport-chrome--inline">
        <div class="sport-chrome-top">
          <button type="button" class="back" id="back" aria-label="Назад">←</button>
          ${brandMarkHtml({ product: "sport", size: "chrome", tag: "p", className: "sport-chrome__brand" })}
        </div>
      </header>
      ${sportProfileHeroBandHtml(savedProfile)}
      <div class="sport-pick__programs">
        <div class="sport-pick__programs-head">
          <strong class="sport-pick__programs-title">Обрати програму</strong>
        </div>
        <div class="sport-pick__toolbar">
          <button type="button" class="sport-pick__filter-pill sport-pick__level-pill" id="level" aria-label="Рівень: ${levelUa()}">
            <span class="sport-pick__filter-pill-label">Рівень</span>
            <span class="sport-pick__filter-pill-value">${levelUa()} <span class="chev" aria-hidden="true">▾</span></span>
          </button>
          <label class="sport-pick__filter-pill sport-pick__category-pill">
            <span class="sport-pick__filter-pill-label">Категорія</span>
            <span class="sport-pick__filter-pill-field">
              <select id="goalFilter" aria-label="Категорія програм">${catSelectHtml}</select>
              <span class="chev" aria-hidden="true">▾</span>
            </span>
          </label>
        </div>
        <div class="sport-pick__catalog" id="sport-picker-panel" role="listbox" aria-label="Програми вдома">
          <div class="sport-rec-list">${programListHtml}</div>
        </div>
      </div>
      <div class="dock dock--sport">
        <button type="button" class="primary" id="next">Далі · день і полиця →</button>
      </div>
    </section>
  `,
    () => {
      $("#back").onclick = () => go("home");
      bindSportProfileHeroBand();
      $("#level").onclick = () => {
        state.intentSport.constraints.level =
          state.intentSport.constraints.level === "beginner" ? "intermediate" : "beginner";
        render();
      };
      $("#next").onclick = () => {
        const btn = $("#next");
        if (btn?.dataset.busy === "1") return;
        setPrimaryBusy(btn, true, "Збираємо день…");
        state.sportProgramPickerOpen = false;
        enterSportDay();
      };
      bindSportPickerForward();
    },
  );
}

function skuArticleHtml(l, g) {
  const payload = encodeURIComponent(
    JSON.stringify({
      role: l.role,
      wanted: l.wanted || l.role,
      name: l.name,
      price: l.price,
      sku: l.sku || null,
      group: l.group || g.id,
      staple: l.wanted || l.role,
    }),
  );
  const img = thumbHtml(l.image, l.wanted || l.name, 64);
  const canOk = l.status !== "missing";
  const checked = canOk && Boolean(state.accepted[l.role]);
  const miss = l.status === "missing";
  const dim = canOk && !checked;
  const showStatus = l.status && l.status !== "found";
  const amountBlock = amountControlHtml(l, checked);
  const verifyBeacon = canOk ? skuVerifyBeacon(l, state.historyCache?.receipts || []) : null;
  const verifyBeaconHtml =
    verifyBeacon && verifyBeacon.kind !== "none" && verifyBeacon.copy
      ? `<button type="button" class="sku-beacon sku-beacon--${esc(verifyBeacon.kind)}" data-beacon-tip="${esc(verifyBeacon.tip || verifyBeacon.copy)}" aria-label="${esc(verifyBeacon.tip || verifyBeacon.copy)}"><span class="sku-beacon__mark" aria-hidden="true"></span><span class="sku-why">${esc(verifyBeacon.copy)}</span></button>`
      : "";
  return `
            <article class="sku${checked ? " sku--ok" : ""}${dim ? " sku--dim" : ""}${miss ? " sku--miss" : ""}${l.image ? " sku--shot" : " sku--letter"}${state.flashRole === l.role ? " sku--flash" : ""}" data-sku-role="${esc(l.role)}"${canOk ? ` data-sku-toggle="1"` : ""}>
              <div class="sku-check-slot">
                ${
                  canOk
                    ? `<label class="sku-check">
                  <input type="checkbox" data-ok="${esc(l.role)}" ${checked ? "checked" : ""} aria-label="${checked ? "У чеку" : "Не в чеку"}: ${esc(l.name)}" />
                  <span class="sku-check__box" aria-hidden="true"><span class="sku-check__tick"></span></span>
                </label>`
                    : `<span class="sku-check__box" aria-hidden="true" style="opacity:.35"></span>`
                }
              </div>
              <div class="sku-panel">
                <div class="sku-media">
                  <div class="sku-stage" aria-hidden="${l.image ? "true" : "false"}">${img}</div>
                </div>
                <div class="sku-body">
                  ${amountBlock}
                  <h3 class="sku-name">${esc(l.name)}</h3>
                  ${verifyBeaconHtml}
                  ${
                    showStatus
                      ? `<div class="sku-meta"><span class="status ${l.status}">${statusUa(l.status)}</span></div>`
                      : ""
                  }
                </div>
                <div class="sku-side">
                  ${
                    miss
                      ? `<button type="button" class="sku-btn sku-btn--leaf sku-btn--compact" data-swap-line="${payload}">заміна</button>`
                      : `<span class="sku-price num">${l.price != null ? money(l.price) : "—"}</span>`
                  }
                  <details class="sku-more">
                    <summary aria-label="Дії для ${esc(l.name)}">⋯</summary>
                    <div class="sku-menu" role="menu">
                      ${
                        miss
                          ? ""
                          : `<button type="button" role="menuitem" data-swap-line="${payload}">заміна</button>`
                      }
                      <button type="button" role="menuitem" class="danger" data-rm="${esc(l.role)}" aria-label="Прибрати з списку ${esc(l.name)}">прибрати</button>
                    </div>
                  </details>
                </div>
              </div>
            </article>`;
}

function productCardHtml(i, vm, loading, pantryRoles = []) {
  if (loading) {
    return `
        <div class="card card--wait" aria-busy="true">
          <div class="skel skel--lg" aria-hidden="true"></div>
          <div class="skel" aria-hidden="true"></div>
          <div class="skel" aria-hidden="true"></div>
          <div class="swap-wait" role="status" aria-live="polite">
            <div class="swap-track" aria-hidden="true"><div class="swap-fill"></div></div>
            <p>Оновлюємо список…</p>
          </div>
        </div>`;
  }
  const sportRoleSet = state.sportHandoff ? sportDayLineRoles(state.extraQueries) : new Set();
  const removed = new Set(state.removed || []);
  const lines = (vm?.lines || []).filter((l) => !removed.has(l.role));
  const names = lines.map((l) => l.name || l.wanted);
  const shelfOf = (l) => {
    const role = String(l.role || "");
    const n = l.name || l.wanted;
    let gid;
    if (role.startsWith("add:") || role.startsWith("can:")) gid = destinationGroupForAdd(n, names);
    else gid = l.group || destinationGroupForAdd(n, names);
    return normalizeShopGroupId(gid);
  };
  const groups = [];
  const seenG = new Set();
  for (const l of lines) {
    const gid = shelfOf(l);
    if (seenG.has(gid)) continue;
    seenG.add(gid);
    groups.push({
      id: gid,
      title: groupMeta(gid).title,
      lines: lines.filter((x) => shelfOf(x) === gid),
    });
  }
  const sportOnly = state.sportHandoff ? (l) => sportRoleSet.has(l.role) : () => false;
  const sportLines = state.sportHandoff ? lines.filter(sportOnly) : [];
  const programDisplay = state.sportHandoff
    ? resolveSportProgramDisplay({
        kb: state.kb,
        sportHandoff: state.sportHandoff,
        intentSport: state.intentSport,
        extraQueries: state.extraQueries,
      })
    : null;
  const programBlock =
    sportLines.length > 0
      ? shopProgramBlockHtml({
          title: programDisplay?.title || state.sportHandoff?.title || "програма",
          count: sportLines.length,
          rowsHtml: sportLines
            .map((l) => skuArticleHtml(l, { id: shelfOf(l), title: groupMeta(shelfOf(l)).title }))
            .join(""),
        })
      : "";
  return `
        <div class="shop-checklist" id="shop-checklist">
          ${programBlock}
          ${
            groups.length
              ? groups
            .map(
              (g) => {
                const groupLines = g.lines.filter((l) => !sportOnly(l));
                if (!groupLines.length) return "";
                const canRoles = groupLines.filter((l) => l.status !== "missing");
                const okN = canRoles.filter((l) => state.accepted[l.role]).length;
                const canN = canRoles.length;
                const allOn = canN > 0 && okN === canN;
                return `
            <section class="group group--sheet" data-group-id="${esc(g.id)}">
              <div class="group-h-row">
                <div class="group-h">
                  <span class="group-h__icon">${groupIconSvg(g.id)}</span>
                  <span class="group-h__label">${esc(g.title)}</span>
                </div>
                <div class="group-h-meta">
                  <span class="group-count num" title="у чеку / доступні">${okN}/${canN || groupLines.length}</span>
                  ${
                    canN
                      ? `<button type="button" class="group-all" data-group-accept="${esc(g.id)}" data-group-on="${allOn ? "0" : "1"}">${allOn ? "зняти" : "усі"}</button>`
                      : ""
                  }
                  <button type="button" class="add-in" data-add-group="${esc(g.id)}" data-add-title="${esc(g.title)}">+ додати</button>
                </div>
              </div>
              ${groupLines.map((l) => skuArticleHtml(l, g)).join("")}
            </section>`;
              },
            )
            .join("")
              : programBlock
                ? ""
                : `<div class="empty"><strong>Немає рядків</strong>Додайте в групу або підніміть стелю.</div>`
          }
          <button class="ghost ghost--sheet" id="add-cat">додати в іншу категорію</button>
        </div>`;
}

function sortedReceipts() {
  return [...(state.historyCache?.receipts || [])].sort((a, b) => {
    const ta = a.at ? new Date(a.at).getTime() : 0;
    const tb = b.at ? new Date(b.at).getTime() : 0;
    return tb - ta;
  });
}

function receiptById(id) {
  return (state.historyCache?.receipts || []).find((r) => r.id === id) || null;
}

function formatReceiptDate(at) {
  if (!at) return "дата невідома";
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "дата невідома";
  return d.toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
}

function channelUa(ch) {
  if (ch === "online") return "онлайн";
  if (ch === "offline") return "зал";
  return ch || "чек";
}

/** Soft match receipt line name → shelf fixture image (offline demo). */
function shelfImageForName(name) {
  const skuMap = state.shelf?.sku;
  if (!skuMap || !name) return "";
  const needle = String(name).toLowerCase().trim();
  if (!needle) return "";
  let best = "";
  let bestLen = 0;
  for (const sku of Object.values(skuMap)) {
    const img = typeof sku?.image === "string" ? sku.image.trim() : "";
    const sn = String(sku?.name || "")
      .toLowerCase()
      .trim();
    if (!img || !sn) continue;
    if (needle === sn) return img;
    if (needle.includes(sn) || sn.includes(needle)) {
      if (sn.length > bestLen) {
        best = img;
        bestLen = sn.length;
      }
    }
  }
  return best;
}

function receiptLineThumbUrl(line) {
  if (!line) return "";
  if (typeof line.image === "string" && line.image.trim()) return line.image.trim();
  return shelfImageForName(line.name);
}

function receiptThumbStripHtml(lines) {
  const { shown, overflow } = topLinesForThumbStrip(lines, 5);
  if (!shown.length) return "";
  const tiles = shown
    .map((l) => `<span class="lists-receipt__thumb">${thumbHtml(receiptLineThumbUrl(l), l.name, 40)}</span>`)
    .join("");
  const more =
    overflow > 0
      ? `<span class="lists-receipt__more" aria-label="ще ${overflow} позицій">+${overflow}</span>`
      : "";
  return `<span class="lists-receipt__thumbs" aria-hidden="true">${tiles}${more}</span>`;
}

function listsHubHtml(tab) {
  const receipts = sortedReceipts();
  const receiptsPane =
    receipts.length === 0
      ? `<div class="empty"><strong>Немає чеків</strong>Увійдіть або зачекайте фікстуру історії.</div>`
      : `<ul class="lists-receipts">
        ${receipts
          .map((r) => {
            const n = (r.lines || []).length;
            const sum = r.totalUah != null ? money(r.totalUah) : "—";
            return `<li>
              <button type="button" class="lists-receipt lists-receipt--sheet" data-open-receipt="${esc(r.id)}">
                <span class="lists-receipt__top">
                  <strong>${esc(formatReceiptDate(r.at))}</strong>
                  <span class="muted">${esc(channelUa(r.channel))}</span>
                </span>
                <span class="lists-receipt__meta muted">${esc(r.branchLabel || "")}</span>
                <span class="lists-receipt__sum"><span class="num">${esc(sum)}</span> · ${n} поз.</span>
                ${receiptThumbStripHtml(r.lines)}
              </button>
            </li>`;
          })
          .join("")}
      </ul>`;
  const bases = loadBases();
  const basesPane =
    bases.length === 0
      ? `<div class="empty"><strong>Поки немає баз</strong>Збережені бази з’являться тут. Вони лишаються на цьому пристрої.</div>`
      : `<ul class="lists-receipts">
        ${bases
          .map((b) => {
            const n = (b.lines || []).length;
            const d = b.updatedAt ? formatReceiptDate(b.updatedAt) : "";
            return `<li>
              <button type="button" class="lists-receipt lists-receipt--sheet" data-open-base="${esc(b.id)}">
                <span class="lists-receipt__top">
                  <strong>${esc(b.title)}</strong>
                  <span class="muted">${esc(d)}</span>
                </span>
                <span class="lists-receipt__sum">${n} поз. · ${esc(b.source === "receipt" ? "з чека" : b.source === "checklist" ? "з списку" : "своя")}</span>
              </button>
            </li>`;
          })
          .join("")}
      </ul>`;
  return `
    <section class="shop-flow lists-flow" aria-label="Історія покупок">
    <header class="sport-chrome sport-chrome--inline shop-chrome">
      <div class="sport-chrome-top">
        <button type="button" class="back" id="lists-back" aria-label="Назад до списку">←</button>
        <h1 class="sport-title">Історія покупок</h1>
      </div>
      <p class="day-flow__kicker sport-chrome__kicker">${tab === "bases" ? "збережені бази на пристрої" : "чеки з Сільпо"}</p>
    </header>
    <div class="lists-tabs shop-sheet" role="tablist">
      <button type="button" role="tab" class="lists-tab${tab === "receipts" ? " is-on" : ""}" data-lists-tab="receipts" aria-selected="${tab === "receipts"}">Чеки</button>
      <button type="button" role="tab" class="lists-tab${tab === "bases" ? " is-on" : ""}" data-lists-tab="bases" aria-selected="${tab === "bases"}">Бази</button>
    </div>
    <div class="lists-body">
      ${tab === "bases" ? basesPane : receiptsPane}
    </div>
    </section>`;
}

function listsChromeHtml(title, kicker, backId) {
  return `
    <header class="sport-chrome sport-chrome--inline shop-chrome">
      <div class="sport-chrome-top">
        <button type="button" class="back" id="${esc(backId)}" aria-label="Назад">←</button>
        <h1 class="sport-title">${esc(title)}</h1>
      </div>
      <p class="day-flow__kicker sport-chrome__kicker">${esc(kicker)}</p>
    </header>`;
}

function receiptDetailHtml(id) {
  const rec = receiptById(id);
  if (!rec) {
    return `
      <section class="shop-flow lists-flow">
      ${listsChromeHtml("Чек", "не знайдено", "lists-back")}
      <div class="empty"><strong>Чек не знайдено</strong></div>
      </section>`;
  }
  const selected = state.lists?.selected || {};
  const lines = rec.lines || [];
  const selectedN = lines.filter((l) => selected[l.name]).length;
  return `
    <section class="shop-flow lists-flow" aria-label="Чек">
    ${listsChromeHtml(formatReceiptDate(rec.at), "чек Сільпо", "receipt-back")}
    <p class="lists-detail__meta muted">${esc(channelUa(rec.channel))}${rec.branchLabel ? ` · ${esc(rec.branchLabel)}` : ""} · ${rec.totalUah != null ? money(rec.totalUah) : "—"}</p>
    <ul class="lists-lines lists-lines--sheet">
      ${lines
        .map((l) => {
          const on = Boolean(selected[l.name]);
          const thumb = thumbHtml(receiptLineThumbUrl(l), l.name, 44);
          return `<li>
            <label class="lists-line">
              <input type="checkbox" data-receipt-line="${esc(l.name)}" ${on ? "checked" : ""} />
              <span class="lists-line__thumb" aria-hidden="true">${thumb}</span>
              <span class="lists-line__body">
                <strong>${esc(l.name)}</strong>
                <span class="muted">${l.qty != null ? esc(String(l.qty)) : "—"} · ${l.price != null ? money(l.price) : "без ціни"}</span>
              </span>
            </label>
          </li>`;
        })
        .join("")}
    </ul>
    <div class="lists-actions lists-actions--sheet">
      <button type="button" class="ghost ghost--sheet" id="receipt-add-selected" ${selectedN ? "" : "disabled"}>У список${selectedN ? ` · ${selectedN}` : ""}</button>
      <button type="button" class="primary" id="receipt-add-all">Весь чек у список</button>
    </div>
    </section>`;
}

function baseDetailHtml(id) {
  const base = getBase(id);
  if (!base) {
    return `
      <section class="shop-flow lists-flow">
      ${listsChromeHtml("База", "не знайдено", "lists-back")}
      <div class="empty"><strong>Базу не знайдено</strong></div>
      </section>`;
  }
  return `
    <section class="shop-flow lists-flow" aria-label="База">
    ${listsChromeHtml("База", base.title || "на пристрої", "base-back")}
    <label class="base-title-edit shop-sheet">
      <span class="sr-only">Назва бази</span>
      <input id="base-title" type="text" maxlength="40" value="${esc(base.title)}" />
    </label>
    <ul class="lists-lines lists-lines--sheet">
      ${(base.lines || [])
        .map(
          (l) => `<li class="lists-line lists-line--static">
            <span class="lists-line__body">
              <strong>${esc(l.nameHint)}</strong>
              <span class="muted">${l.units} · ${esc(l.envelope)}${l.staple ? ` · ${esc(l.staple)}` : ""}</span>
            </span>
            <button type="button" class="ghost danger" data-del-base-line="${esc(l.id)}" aria-label="Прибрати ${esc(l.nameHint)}">×</button>
          </li>`,
        )
        .join("")}
    </ul>
    <div class="lists-actions lists-actions--sheet">
      <button type="button" class="primary" id="base-apply">У список</button>
      <button type="button" class="ghost ghost--sheet" id="base-apply-replace">Замінити весь список</button>
      <button type="button" class="ghost danger ghost--sheet" id="base-delete">Видалити базу</button>
    </div>
    </section>`;
}

function saveBaseSheetHtml(defaultTitle) {
  return `
    <div class="sheet-panel sheet-panel--save" role="dialog" aria-modal="true" aria-label="Зберегти базу">
      <div class="sheet-handle" aria-hidden="true"></div>
      <p class="sheet-panel__kicker">база на пристрої</p>
      <h2 class="sheet-title">Зберегти як базу</h2>
      <p class="sheet-panel__lede muted">Лишається лише на цьому телефоні · не в акаунті Сільпо</p>
      <label class="base-title-edit shop-sheet sheet-panel__field">
        <span class="muted">Назва</span>
        <input id="save-base-title" type="text" maxlength="40" value="${esc(defaultTitle)}" />
      </label>
      <div class="lists-actions lists-actions--sheet">
        <button type="button" class="primary" id="save-base-confirm">Зберегти</button>
        <button type="button" class="ghost ghost--sheet" id="save-base-cancel">Скасувати</button>
      </div>
    </div>`;
}

function saveBaseSheetMaybe() {
  if (!state.saveBasePrompt) return "";
  return wrapSheet(saveBaseSheetHtml(state.saveBasePrompt.title));
}

function openSaveBasePrompt(opts = {}) {
  state.saveBasePrompt = {
    title: opts.title || `База · ${new Date().toLocaleDateString("uk-UA")}`,
    source: opts.source || "checklist",
    receiptId: opts.receiptId,
    selectedNames: opts.selectedNames,
  };
  render();
}

function closeSaveBasePrompt() {
  state.saveBasePrompt = null;
  render();
}

function confirmSaveBase() {
  const prompt = state.saveBasePrompt;
  if (!prompt) return;
  const titleEl = $("#save-base-title");
  const title = String(titleEl?.value || prompt.title).trim() || prompt.title;
  let base;
  try {
    if (prompt.source === "receipt") {
      const rec = receiptById(prompt.receiptId);
      if (!rec) {
        toast("Чек не знайдено");
        return;
      }
      base = baseFromReceipt(rec, { title, selectedNames: prompt.selectedNames });
    } else {
      const lines = (state.shopVm?.lines || []).filter((l) => !(state.removed || []).includes(l.role));
      const acceptedN = Object.values(state.accepted || {}).filter(Boolean).length;
      base = baseFromChecklistLines(lines, {
        title,
        accepted: state.accepted,
        onlyAccepted: acceptedN > 0,
      });
    }
    if (!base.lines.length) {
      toast("Немає рядків для бази");
      return;
    }
    upsertBase(base);
    state.saveBasePrompt = null;
    toast(`Збережено · ${base.lines.length} поз.`);
    render();
  } catch (e) {
    toast(e?.message === "bases_cap" ? "Ліміт 20 баз — видаліть стару" : "Не вдалося зберегти");
  }
}

function bindListsScreen() {
  const back = $("#lists-back");
  if (back) back.onclick = () => closeLists();
  const receiptBack = $("#receipt-back");
  if (receiptBack) {
    receiptBack.onclick = () => openLists("receipts");
  }
  const baseBack = $("#base-back");
  if (baseBack) baseBack.onclick = () => openLists("bases");
  root.querySelectorAll("[data-lists-tab]").forEach((b) => {
    b.onclick = () => openLists(b.dataset.listsTab || "receipts");
  });
  root.querySelectorAll("[data-open-receipt]").forEach((b) => {
    b.onclick = () => openReceiptDetail(b.dataset.openReceipt);
  });
  root.querySelectorAll("[data-open-base]").forEach((b) => {
    b.onclick = () => openBaseDetail(b.dataset.openBase);
  });
  root.querySelectorAll("[data-receipt-line]").forEach((inp) => {
    inp.onchange = () => {
      if (!state.lists) return;
      state.lists = {
        ...state.lists,
        selected: { ...(state.lists.selected || {}), [inp.dataset.receiptLine]: inp.checked },
      };
      const n = Object.values(state.lists.selected).filter(Boolean).length;
      const btn = $("#receipt-add-selected");
      if (btn) {
        btn.disabled = !n;
        btn.textContent = n ? `У список · ${n}` : "У список";
      }
    };
  });
  const addSel = $("#receipt-add-selected");
  if (addSel) {
    addSel.onclick = () => {
      const names = Object.entries(state.lists?.selected || {})
        .filter(([, on]) => on)
        .map(([name]) => name);
      void applyReceiptMerge("lines", names);
    };
  }
  const addAll = $("#receipt-add-all");
  if (addAll) {
    addAll.onclick = () => {
      void applyReceiptMerge("whole");
    };
  }
  const baseTitle = $("#base-title");
  if (baseTitle) {
    baseTitle.onchange = () => {
      const id = state.lists?.baseId;
      const cur = getBase(id);
      if (!cur) return;
      upsertBase({ ...cur, title: baseTitle.value.trim() || cur.title });
      toast("Назву збережено");
    };
  }
  root.querySelectorAll("[data-del-base-line]").forEach((b) => {
    b.onclick = () => {
      const id = state.lists?.baseId;
      const cur = getBase(id);
      if (!cur) return;
      const lines = (cur.lines || []).filter((l) => l.id !== b.dataset.delBaseLine);
      upsertBase({ ...cur, lines });
      render();
    };
  });
  const baseApply = $("#base-apply");
  if (baseApply) baseApply.onclick = () => void applyBaseMerge("merge");
  const baseReplace = $("#base-apply-replace");
  if (baseReplace) {
    baseReplace.onclick = () => {
      if (!window.confirm("Замінити весь поточний список цією базою?")) return;
      void applyBaseMerge("replace_all");
    };
  }
  const baseDelete = $("#base-delete");
  if (baseDelete) {
    baseDelete.onclick = () => {
      const id = state.lists?.baseId;
      if (!id) return;
      if (!window.confirm("Видалити цю базу з пристрою?")) return;
      deleteBase(id);
      toast("Базу видалено");
      openLists("bases");
    };
  }
  bindSaveBaseSheet();
  const scrim = $("#sheet-scrim");
  if (scrim) scrim.onclick = () => closeSaveBasePrompt();
  document.onkeydown = (e) => {
    if (e.key === "Escape") {
      if (state.saveBasePrompt) closeSaveBasePrompt();
      else if (state.lists?.baseId) openLists("bases");
      else if (state.lists?.receiptId) openLists("receipts");
      else closeLists();
    }
  };
}

function bindSaveBaseSheet() {
  const cancel = $("#save-base-cancel");
  if (cancel) cancel.onclick = () => closeSaveBasePrompt();
  const ok = $("#save-base-confirm");
  if (ok) ok.onclick = () => confirmSaveBase();
  bindModalFocus(".sheet-panel--save", { initial: "#save-base-title" });
}

/** Tab cycle inside a modal panel; focus initial field. */
function bindModalFocus(rootSel, { initial } = {}) {
  const root = typeof rootSel === "string" ? document.querySelector(rootSel) : rootSel;
  if (!root) return;
  const focusables = () =>
    [...root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
      (el) => !el.disabled && el.getAttribute("aria-hidden") !== "true",
    );
  const kick = () => {
    const el = (initial && root.querySelector(initial)) || focusables()[0];
    el?.focus?.({ preventScroll: true });
  };
  requestAnimationFrame(kick);
  const onKey = (e) => {
    if (e.key !== "Tab") return;
    const list = focusables();
    if (list.length < 2) return;
    const i = list.indexOf(document.activeElement);
    if (e.shiftKey) {
      if (i <= 0) {
        e.preventDefault();
        list[list.length - 1].focus();
      }
    } else if (i === list.length - 1 || i < 0) {
      e.preventDefault();
      list[0].focus();
    }
  };
  if (root._modalFocusKey) root.removeEventListener("keydown", root._modalFocusKey);
  root._modalFocusKey = onKey;
  root.addEventListener("keydown", onKey);
}

async function applyBaseMerge(mode = "merge") {
  const id = state.lists?.baseId;
  const base = getBase(id);
  if (!base) {
    toast("Базу не знайдено");
    return;
  }
  if (!state.shopVm && state.kb && state.shelf) {
    try {
      const vm = localShopVm(state.intentShop, {
        variantId: state.variantId,
        removedRoles: state.removed,
        swaps: state.swaps,
        extraQueries: state.extraQueries,
      });
      state.shopVm = vm;
      ensureAcceptedDefaults(vm);
    } catch {
      /* empty */
    }
  }
  let shopVm = state.shopVm || { lines: [], totals: { min: 0, max: 0 }, branchLabel: "" };
  let accepted = { ...state.accepted };
  let qtyByRole = { ...state.qtyByRole };
  if (mode === "replace_all") {
    shopVm = { ...shopVm, lines: [] };
    accepted = {};
    qtyByRole = {};
    state.removed = [];
    state.extraQueries = [];
  }
  const snapshot = {
    vm: state.shopVm ? { ...state.shopVm, lines: (state.shopVm.lines || []).map((l) => ({ ...l })) } : null,
    accepted: { ...state.accepted },
    qtyByRole: { ...state.qtyByRole },
    removed: [...(state.removed || [])],
  };
  const result = mergeReceiptIntoShopVm({
    mode: "whole",
    receipt: baseToReceipt(base),
    shopVm,
    accepted,
    qtyByRole,
    categoriesAllow: state.intentShop.constraints.categoriesAllow,
    shelf: state.shelf,
  });
  state.undoShop = snapshot;
  clearTimeout(state.undoTimer);
  state.undoTimer = setTimeout(() => {
    state.undoShop = null;
  }, 5000);
  state.shopVm = result.vm;
  state.accepted = result.accepted;
  state.qtyByRole = result.qtyByRole;
  state.flashRole = result.flashRoles[0] || "";
  state.lists = null;
  state.shopDirty = false;
  setShopHash("#/shop", { push: true });
  toastUndo(
    result.addedN || result.bumpedN
      ? `база «${base.title}» · +${result.addedN + result.bumpedN}`
      : "Без змін",
  );
  await render();
  if (result.flashRoles[0]) revealAddedRow(result.flashRoles[0]);
}

async function applyReceiptMerge(mode, selectedNames = []) {
  const id = state.lists?.receiptId;
  const rec = receiptById(id);
  if (!rec) {
    toast("Чек не знайдено");
    return;
  }
  const lineCount = (rec.lines || []).length;
  if (mode === "whole" && lineCount > 40) {
    const ok = window.confirm(`Додати ${lineCount} позицій у список?`);
    if (!ok) return;
  }
  if (!state.shopVm && state.kb && state.shelf) {
    try {
      const vm = localShopVm(state.intentShop, {
        variantId: state.variantId,
        removedRoles: state.removed,
        swaps: state.swaps,
        extraQueries: state.extraQueries,
      });
      state.shopVm = vm;
      ensureAcceptedDefaults(vm);
    } catch {
      /* merge onto empty */
    }
  }
  const snapshot = {
    vm: state.shopVm ? { ...state.shopVm, lines: (state.shopVm.lines || []).map((l) => ({ ...l })) } : null,
    accepted: { ...state.accepted },
    qtyByRole: { ...state.qtyByRole },
    removed: [...(state.removed || [])],
  };
  const result = mergeReceiptIntoShopVm({
    mode,
    receipt: rec,
    selectedNames,
    shopVm: state.shopVm || { lines: [], totals: { min: 0, max: 0 }, branchLabel: "" },
    accepted: state.accepted,
    qtyByRole: state.qtyByRole,
    categoriesAllow: state.intentShop.constraints.categoriesAllow,
    shelf: state.shelf,
  });
  state.undoShop = snapshot;
  clearTimeout(state.undoTimer);
  state.undoTimer = setTimeout(() => {
    state.undoShop = null;
  }, 5000);
  state.shopVm = result.vm;
  state.accepted = result.accepted;
  state.qtyByRole = result.qtyByRole;
  state.flashRole = result.flashRoles[0] || "";
  state.lists = null;
  state.shopDirty = false;
  setShopHash("#/shop", { push: true });
  const parts = [];
  if (result.addedN) parts.push(`додано ${result.addedN}`);
  if (result.bumpedN) parts.push(`+к-сть ${result.bumpedN}`);
  if (result.missingN) parts.push(`${result.missingN} немає`);
  if (result.skipped.length) parts.push(`пропущено ${result.skipped.length}`);
  toastUndo(parts.length ? parts.join(" · ") : "Без змін");
  await render();
  if (result.flashRoles[0]) revealAddedRow(result.flashRoles[0]);
}

function toastUndo(msg) {
  announce(msg);
  const host = document.getElementById("toast-host");
  if (!host) return;
  host.innerHTML = `<button type="button" class="toast toast--undo" id="toast-undo" role="status">${esc(msg)} · <u>скасувати</u></button>`;
  const btn = $("#toast-undo");
  if (btn) {
    btn.onclick = () => {
      if (!state.undoShop) return;
      state.shopVm = state.undoShop.vm;
      state.accepted = state.undoShop.accepted;
      state.qtyByRole = state.undoShop.qtyByRole;
      state.removed = state.undoShop.removed;
      state.undoShop = null;
      host.innerHTML = "";
      toast("Скасовано");
      render();
    };
  }
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    host.innerHTML = "";
  }, 5000);
}

function paintShop(i, vm, loading, opts = {}) {
  if (state.browse && !state.picker) {
    paint(addStepHtml(), () => bindShopScreen(), opts);
    return;
  }
  if (state.lists?.baseId) {
    paint(baseDetailHtml(state.lists.baseId) + saveBaseSheetMaybe(), () => bindListsScreen(), opts);
    return;
  }
  if (state.lists?.receiptId) {
    paint(receiptDetailHtml(state.lists.receiptId) + saveBaseSheetMaybe(), () => bindListsScreen(), opts);
    return;
  }
  if (state.lists) {
    paint(listsHubHtml(state.lists.tab || "receipts") + saveBaseSheetMaybe(), () => bindListsScreen(), opts);
    return;
  }
  ensureShopAllow();
  if (state.sportHandoff) {
    const disp = resolveSportProgramDisplay({
      kb: state.kb,
      sportHandoff: state.sportHandoff,
      intentSport: state.intentSport,
      extraQueries: state.extraQueries,
    });
    state.sportHandoff = { ...state.sportHandoff, programId: disp.programId, title: disp.title };
  }
  const hz = i.horizon === "day" || i.horizon === "month" ? i.horizon : "week";
  const budVal = Number(i.constraints.budgetUah) || 1500;
  const pantryOpts = shopPantryNudgeOpts();
  const pantryNudge =
    !loading && !state.picker && !state.browse
      ? shopPantryNudge(
          vm?.lines || [],
          state.historyCache?.receipts || [],
          state.accepted,
          Date.now(),
          pantryOpts,
        )
      : null;
  const pantryRoles = pantryNudge?.roles || [];
  const pantryAria = pantryNudge
    ? `Показати в списку · ${pantryNudge.tip || pantryNudge.copy}`
    : "";
  const pantryLead = pantryNudge?.sportScoped ? "ПЕРЕВІРТЕ · програма" : "ПЕРЕВІРТЕ";
  const pantryNudgeHtml = pantryNudge
    ? `<button type="button" class="shop-pantry-nudge shop-pantry-nudge--${esc(pantryNudge.kind)}${pantryNudge.sportScoped ? " shop-pantry-nudge--sport" : ""} shop-pantry-nudge--receipt-stamp" id="shop-pantry-nudge" data-beacon-tip="${esc(pantryNudge.tip)}" data-pantry-roles="${esc(pantryRoles.join(","))}" title="${esc(pantryNudge.tip || pantryNudge.copy)}" aria-label="${esc(pantryAria)}"><span class="shop-pantry-nudge__mark" aria-hidden="true"></span><span class="shop-pantry-nudge__lead">${esc(pantryLead)}</span><span class="shop-pantry-nudge__dashes" aria-hidden="true">- - - - - - - - - -</span></button>`
    : "";
  const sportExtraN = state.sportHandoff ? countSportDayExtras(state.extraQueries) : 0;
  const programBlockActive = sportExtraN > 0;
  const handoffCopy = shopHandoffBannerModel({
    sportHandoff: state.sportHandoff,
    extraQueries: state.extraQueries,
    vmLines: vm?.lines,
    pantryNudge,
    pantryOpts,
    receipts: state.historyCache?.receipts || [],
    loading,
    picker: state.picker,
    browse: state.browse,
  });
  const sportHandoffHtml =
    handoffCopy && !programBlockActive
      ? `<div class="shop-sport-handoff" role="group" aria-label="${esc(`${handoffCopy.lead}. ${handoffCopy.copy}`)}"><button type="button" class="shop-sport-handoff__main" id="shop-sport-handoff" data-beacon-tip="${esc(handoffCopy.tip)}"><span class="shop-sport-handoff__lead">${esc(handoffCopy.lead)}</span><span class="shop-sport-handoff__copy">${esc(handoffCopy.copy)}</span></button><button type="button" class="shop-sport-handoff__x" id="shop-sport-handoff-dismiss" aria-label="Сховати підказку з програми">×</button></div>`
      : "";
  const progressM = shopProgressForVm(vm);
  const receipts = state.historyCache?.receipts || [];
  const showShopExtras = !loading && !state.picker && !state.browse && vm;
  const whisper = showShopExtras ? shopMonthWhisper(receipts, { goalUah: budVal }) : null;
  const allowCats = i.constraints?.categoriesAllow || ["food", "clean"];
  const recentCandidates = showShopExtras
    ? buildRecentBuyCandidates(receipts, vm, state.recentShelfDismissed, { categoriesAllow: allowCats })
    : [];
  const recentHtml = shopRecentShelfHtml(recentCandidates);
  const assistInlineHtml = shopAssistInlineHtml({
    handoffHtml: sportHandoffHtml,
    pantryHtml: pantryNudgeHtml,
  });
  const whisperBlock = showShopExtras
    ? shopWhisperWithHistoryHtml(whisper, esc, { receipt: true })
    : "";
  const orangeClusterHtml =
    whisperBlock || assistInlineHtml
      ? `<div class="shop-progress__meta-orange shop-progress__meta-orange--cluster" aria-label="Перевірка, місяць, історія">${assistInlineHtml}${whisperBlock}</div>`
      : "";
  const controlsHtml = `<div class="shop-controls shop-controls--compact shop-controls--wallet shop-controls--receipt-stamps" role="group" aria-label="Горизонт і стеля">
        <label class="shop-controls__hz shop-controls__hz--pick shop-controls__stamp">
          <span class="sr-only">Горизонт</span>
          <span class="shop-controls__bracket" aria-hidden="true">[</span>
          <select id="hz" class="shop-controls__pick" aria-label="Горизонт списку">
            <option value="day"${hz === "day" ? " selected" : ""}>день</option>
            <option value="week"${hz === "week" ? " selected" : ""}>тиждень</option>
            <option value="month"${hz === "month" ? " selected" : ""}>місяць</option>
          </select>
          <span class="shop-controls__bracket" aria-hidden="true">]</span>
        </label>
        <label class="shop-controls__bud shop-controls__bud--suffix shop-controls__stamp">
          <span class="sr-only">Стеля бюджету</span>
          <span class="shop-controls__bracket" aria-hidden="true">[</span>
          <span class="shop-controls__bud-field">
            <input id="bud" type="number" inputmode="numeric" min="300" max="8000" step="50" value="${budVal}" aria-label="Стеля бюджету, гривні" />
            <span class="shop-controls__bud-suffix" aria-hidden="true">grn</span>
          </span>
          <span class="shop-controls__bracket" aria-hidden="true">]</span>
        </label>
      </div>`;
  const progressHtml = shopProgressStripHtml({
    loading,
    okCount: progressM.ok,
    totalCount: progressM.total,
    sumLabel: money(okSum(vm)),
    budgetLabel: money(budVal),
    acceptPct: progressM.acceptPct,
    budgetPct: progressM.budgetPct,
    over: progressM.over,
    remainLabel: money(Math.abs(budVal - okSum(vm))),
    remainOver: progressM.over,
    sportExtraN,
    baseLabel: money(progressM.baseUah),
    moodLabel: money(progressM.moodUah),
    wasteLabel: money(progressM.userWasteUah),
    baseUah: progressM.baseUah,
    moodUah: progressM.moodUah,
    userWasteUah: progressM.userWasteUah,
    whisperHtml: "",
    innerFooterHtml: `${orangeClusterHtml}${controlsHtml}`,
  });
  const checkoutHeaderHtml = `
    <div class="shop-checkout-header shop-checkout-header--wallet-unified shop-sheet" aria-label="Прогрес і керування списком">
      ${progressHtml}
    </div>`;
  paint(
    `
    <section class="shop-flow shop-flow--checkout" aria-label="СільпоExpress">
    <header class="sport-chrome sport-chrome--inline shop-chrome shop-chrome--express shop-chrome--compact">
      <div class="sport-chrome-top">
        <button type="button" class="back" id="back" aria-label="Назад">←</button>
        <div class="shop-chrome__titles">
          <h1 class="sport-title">${brandMarkHtml({ product: "express", size: "title" })}</h1>
        </div>
      </div>
    </header>
    ${checkoutHeaderHtml}
    ${recentHtml}
    <div class="shop-stage">
      <div class="shop-stage__base">
        ${productCardHtml(i, vm, loading, pantryRoles)}
      </div>
    </div>
    ${wrapSheet(pickerHtml())}${state.saveBasePrompt && !state.picker ? saveBaseSheetMaybe() : ""}
    ${
      state.picker || state.browse
        ? ""
        : `<div class="dock dock--shop dock--cta-only">
      ${
        !loading && okSum(vm) > Number(i.constraints.budgetUah)
          ? `<p class="warn">Погоджене вище стелі — зніміть галочки або замініть.</p>`
          : ""
      }
      ${shopDockCtaHtml({
        okCount: okLines(vm).length,
        sumLabel: money(okSum(vm)),
        loading,
        confirmed: state.confirmed,
        pushing: state.cartPushing,
      })}
      ${
        state.confirmed && (state.checkoutUrl || vm?.checkout)
          ? `<p class="muted shop-dock-checkout">Додано в кошик Сільпо (долив). <a href="${esc(state.checkoutUrl || vm.checkout)}" target="_blank" rel="noopener">Відкрити оформлення</a></p>`
          : ""
      }
    </div>`
    }
    ${debugHtml(vm)}
    </section>
  `,
    () => bindShopScreen(),
    opts,
  );
}

async function renderShop(seq) {
  // Soft paint first; history + resolve run in parallel (server memos history across both APIs).
  const histP = ensureHistoryCache();
  const i = state.intentShop;
  let vm = state.shopVm;
  const hadVm = Boolean(vm);
  const soft = { enter: false, keepScroll: true };
  const needResolve = !state.picker && !state.browse && (!vm || state.shopDirty);
  if (state.lists && vm && !state.shopDirty) {
    await histP;
    if (seq !== state.renderSeq) return;
    paintShop(i, vm, false, soft);
    return;
  }
  if (needResolve) {
    const resolveOpts = {
      variantId: state.variantId,
      removedRoles: state.removed,
      swaps: state.swaps,
      extraQueries: state.extraQueries,
      confirmed: state.confirmed,
    };
    // Instant local plan so горизонт/стеля update before MCP returns.
    // Avoids stale list + «0 погоджено» while accepted was cleared.
    if (state.kb && state.shelf && i.surface === "shopping") {
      try {
        vm = localShopVm(i, resolveOpts);
        state.shopVm = vm;
        ensureAcceptedDefaults(vm);
        paintShop(i, vm, false, hadVm ? soft : {});
      } catch {
        paintShop(i, vm, !vm, hadVm ? soft : {});
      }
    } else {
      paintShop(i, vm, !vm, hadVm ? soft : {});
    }
    resolveAbort?.abort();
    resolveAbort = new AbortController();
    const resolveP = resolveVm(i, { ...resolveOpts, signal: resolveAbort.signal });
    try {
      const [, live] = await Promise.all([histP, resolveP]);
      vm = live;
    } catch (e) {
      if (e?.name === "AbortError") return;
      throw e;
    }
    if (seq !== state.renderSeq) return;
    if (vm?.lines) vm = { ...vm, lines: applyQtyOverrides(vm.lines, state.qtyByRole) };
    state.shopVm = vm;
    state.shopDirty = false;
    ensureAcceptedDefaults(vm);
  } else if (vm) {
    await histP;
    if (seq !== state.renderSeq) return;
    if (vm.lines) vm = { ...vm, lines: applyQtyOverrides(vm.lines, state.qtyByRole) };
    state.shopVm = vm;
    ensureAcceptedDefaults(vm);
  } else {
    await histP;
  }
  if (seq !== state.renderSeq) return;
  paintShop(i, vm, false, hadVm ? soft : {});
}

function bindAddStep() {
  const b = state.browse;
  if (!b) return;
  if (!b.loading) {
    const n = (b.products || []).length;
    announce(n ? `${n} товарів` : b.pickGroup ? "оберіть полицю" : b.error || "полиця порожня");
  }
  const addExit = $("#add-exit");
  if (addExit) addExit.onclick = () => closeBrowse();
  root.querySelectorAll("[data-add-exit]").forEach((el) => {
    el.onclick = () => closeBrowse();
  });
  const addClose = $("#add-close");
  if (addClose) addClose.onclick = () => closeBrowse();
  root.querySelectorAll("[data-open-group]").forEach((el) => {
    el.onclick = () => openBrowse({ group: el.dataset.openGroup, groupTitle: el.dataset.openTitle });
  });
  root.querySelectorAll("[data-crumb]").forEach((el) => {
    el.onclick = () => {
      const i = Number(el.dataset.crumb);
      const path = state.browse?.path || [];
      const step = path[i];
      if (!step) return closeBrowse();
      if (step.kind === "group") openBrowse({ group: step.id, groupTitle: groupMeta(step.id).title });
      else if (step.kind === "slug") openBrowseSlug(step.slug || step.id, step.label);
      else if (step.kind === "pick") openBrowse({ pickGroup: true });
    };
  });
  const browseEscape = $("#browse-escape");
  if (browseEscape) {
    browseEscape.onclick = () => openBrowseSearch(state.browse?.search || browseEscape.dataset.q || "", { global: true });
  }
  const browseBack = $("#browse-back");
  if (browseBack) {
    browseBack.onclick = () => {
      const hash = String(location.hash || "");
      const stack = [...(state.browse?.stack || [])];
      // Deep link to group has no push history — history.back() would leave the app.
      if (hash.startsWith("#/shop/add") && stack.length > 0) {
        history.back();
        return;
      }
      if (hash.startsWith("#/shop/add/") && !state.browse?.pickGroup) {
        void openBrowse({ pickGroup: true, push: false });
        return;
      }
      if (hash === "#/shop/add" || state.browse?.pickGroup) {
        closeBrowse();
        return;
      }
      const prev = stack.pop();
      if (!prev) {
        closeBrowse();
        return;
      }
      state.browse = { ...prev, stack, loading: false };
      syncHashFromBrowse({ push: false });
      render();
    };
  }
  const browseSearch = $("#browse-search");
  if (browseSearch) {
    browseSearch.onsubmit = (e) => {
      e.preventDefault();
      clearTimeout(searchTimer);
      openBrowseSearch(browseSearch.q?.value || "", { soft: false, keepFocus: false });
    };
    const qInput = browseSearch.q;
    if (qInput) {
      qInput.oninput = () => {
        const raw = qInput.value || "";
        state.browseCaret = qInput.selectionStart ?? raw.length;
        clearTimeout(searchTimer);
        const t = raw.trim();
        if (t.length < 2) {
          if (!t && state.browse?.search && state.browse?.group) {
            searchTimer = setTimeout(() => {
              void openBrowse({ group: state.browse.group, groupTitle: state.browse.groupTitle, push: false });
            }, 280);
          }
          return;
        }
        searchTimer = setTimeout(() => {
          void openBrowseSearch(raw, { soft: true, keepFocus: true });
        }, 280);
      };
    }
    if (state.browseKeepFocus && qInput) {
      state.browseKeepFocus = false;
      const pos = state.browseCaret ?? qInput.value.length;
      queueMicrotask(() => {
        qInput.focus();
        try {
          qInput.setSelectionRange(pos, pos);
        } catch {
          /* ignore */
        }
      });
    }
  }
  bindBrowseStepDelegation();
  root.querySelectorAll("[data-cat]").forEach((el) => {
    el.onclick = () => {
      if (el.dataset.browseFilter) return;
      if (el.dataset.search) {
        openBrowseSearch(el.dataset.search);
        return;
      }
      const slug = el.dataset.cat || "";
      if (slug.startsWith("search:")) {
        openBrowseSearch(slug.slice(7));
        return;
      }
      openBrowseSlug(slug, el.dataset.title || slug);
    };
  });
  document.onkeydown = (e) => {
    if (e.key === "Escape") closeBrowse();
  };
}

/** Full receipt only at page top; compact sticky while scrolled. */
function bindReceiptFoldCollapse() {
  const header = root.querySelector(".shop-checkout-header--wallet-unified");
  const fold = root.querySelector(".shop-progress__receipt-fold");
  if (!header || !fold) return;
  if (header._receiptFoldAbort) header._receiptFoldAbort.abort();
  const ac = new AbortController();
  header._receiptFoldAbort = ac;
  let ticking = false;
  const TOP_Y = 8;
  const apply = () => {
    const y = window.scrollY;
    const active = document.activeElement;
    const editingFold =
      active &&
      (active.id === "bud" ||
        active.id === "hz" ||
        active.closest?.(".shop-progress__receipt-fold"));
    // Keep expanded while editing fold controls (even if slightly scrolled).
    const wantCollapsed = y > TOP_Y && !editingFold;
    const isCollapsed = header.classList.contains("is-receipt-collapsed");
    if (wantCollapsed === isCollapsed) return;
    header.classList.toggle("is-receipt-collapsed", wantCollapsed);
    syncCheckoutStickyTop();
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      apply();
    });
  };
  apply();
  window.addEventListener("scroll", onScroll, { passive: true, signal: ac.signal });
}

function bindShopScreen() {
  if (state.browse && !state.picker) {
    bindAddStep();
    return;
  }
  if (state.lists) {
    bindListsScreen();
    return;
  }
  const i = state.intentShop;
  const back = $("#back");
  if (back) back.onclick = () => go("home");
  const sportHandoffBtn = $("#shop-sport-handoff");
  if (sportHandoffBtn) {
    sportHandoffBtn.onclick = () => {
      const tip = sportHandoffBtn.getAttribute("data-beacon-tip");
      if (tip) toast(tip);
    };
  }
  const sportHandoffDismiss = $("#shop-sport-handoff-dismiss");
  if (sportHandoffDismiss) {
    sportHandoffDismiss.onclick = () => {
      state.handoffMetrics = bumpHandoffMetric(state.handoffMetrics, "dismiss");
      state.sportHandoff = null;
      paintShop(state.intentShop, state.shopVm, false, { enter: false, keepScroll: true });
    };
  }
  const openListsBtn = $("#open-lists");
  if (openListsBtn) openListsBtn.onclick = () => openLists("receipts");
  bindSaveBaseSheet();
  const scrim = $("#sheet-scrim");
  if (scrim) scrim.onclick = () => closeOverlays();
  const hzEl = $("#hz");
  if (hzEl) {
    hzEl.onchange = () => {
      const h = hzEl.value;
      if (!h || h === i.horizon) return;
      i.horizon = h;
      state.removed = [];
      state.swaps = {};
      state.accepted = {};
      state.qtyByRole = {};
      state.confirmed = false;
      state.checkoutUrl = "";
      state.picker = null;
      state.shopDirty = true;
      swapAbort?.abort();
      resolveAbort?.abort();
      toast("Кількість скинуто під новий горизонт");
      render();
    };
  }
  const bud = $("#bud");
  if (bud) {
    const commitBudget = () => {
      let n = Number(bud.value);
      if (!Number.isFinite(n)) n = Number(i.constraints.budgetUah) || 1500;
      n = Math.min(8000, Math.max(300, Math.round(n / 50) * 50));
      if (n === Number(i.constraints.budgetUah)) {
        bud.value = String(n);
        return;
      }
      i.constraints.budgetUah = n;
      bud.value = String(n);
      state.qtyByRole = {};
      state.shopDirty = true;
      toast("Кількість скинуто під нову стелю");
      render();
    };
    bud.onchange = commitBudget;
    bud.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        bud.blur();
      }
    };
  }
  root.querySelectorAll("[data-ok]").forEach((el) => {
    el.onchange = () => {
      applyAccept(el.dataset.ok, el.checked);
    };
  });
  const pantryBtn = $("#shop-pantry-nudge");
  if (pantryBtn) {
    pantryBtn.onclick = (ev) => {
      ev.stopPropagation();
      state.pantryMetrics = {
        ...state.pantryMetrics,
        tipOpens: (Number(state.pantryMetrics?.tipOpens) || 0) + 1,
      };
      const tip = pantryBtn.getAttribute("data-beacon-tip") || "Перевір, чи ще є вдома, перед погодженням.";
      const roles = String(pantryBtn.getAttribute("data-pantry-roles") || "")
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
      if (!roles.length) {
        toast(tip);
        return;
      }
      const idx = (Number(state.pantryFocusIdx) || 0) % roles.length;
      state.pantryFocusIdx = idx + 1;
      const role = roles[idx];
      state.flashRole = role;
      const safe = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(role) : String(role);
      root.querySelectorAll("article.sku.sku--flash").forEach((el) => el.classList.remove("sku--flash"));
      const row = root.querySelector(`[data-sku-role="${safe}"]`);
      if (row) row.classList.add("sku--flash");
      revealAddedRow(role);
      clearTimeout(state.flashClearTimer);
      state.flashClearTimer = setTimeout(() => {
        if (state.flashRole === role) state.flashRole = "";
        row?.classList.remove("sku--flash");
      }, 1400);
      const canUncheck = Boolean(state.accepted[role]);
      if (canUncheck) {
        toastAction(tip, "Зняти з чеку", () => {
          const line = (state.shopVm?.lines || []).find((l) => l.role === role);
          const uah = Number(line?.price);
          state.pantryMetrics = {
            tipOpens: Number(state.pantryMetrics?.tipOpens) || 0,
            unchecks: (Number(state.pantryMetrics?.unchecks) || 0) + 1,
            uahUnchecked:
              (Number(state.pantryMetrics?.uahUnchecked) || 0) +
              (Number.isFinite(uah) && uah > 0 ? uah : 0),
          };
          applyAccept(role, false);
          toast(pantryOutcomeCopy(state.pantryMetrics));
        });
      } else {
        toast(tip);
      }
    };
  }
  root.querySelectorAll("[data-beacon-tip]:not(#shop-pantry-nudge)").forEach((el) => {
    el.onclick = (ev) => {
      ev.stopPropagation();
      const tip = el.getAttribute("data-beacon-tip");
      if (tip) toast(tip);
    };
  });
  root.querySelectorAll("article.sku[data-sku-toggle]").forEach((art) => {
    art.onclick = (ev) => {
      if (ev.target.closest("a, button, label, input, summary, details, .sku-more, .sku-menu, .qty-stepper, .sku-beacon")) return;
      const role = art.dataset.skuRole;
      const input = art.querySelector("[data-ok]");
      if (!role || !input) return;
      applyAccept(role, !input.checked);
    };
  });
  bindQtyButtons(root);
  root.querySelectorAll("[data-group-accept]").forEach((b) => {
    b.onclick = (ev) => {
      ev.stopPropagation();
      const turnOn = b.dataset.groupOn === "1";
      const wrap = b.closest(".group");
      if (!wrap) return;
      const next = { ...state.accepted };
      wrap.querySelectorAll("[data-ok]").forEach((inp) => {
        next[inp.dataset.ok] = turnOn;
      });
      state.accepted = next;
      if (!patchShopAcceptUi()) {
        paintShop(state.intentShop, state.shopVm, false, { enter: false, keepScroll: true });
      }
    };
  });
  root.querySelectorAll("[data-add-group]").forEach((b) => {
    b.onclick = () => openBrowse({ group: b.dataset.addGroup, groupTitle: b.dataset.addTitle });
  });
  root.querySelectorAll("[data-rm]").forEach((b) => {
    b.onclick = (ev) => {
      ev.stopPropagation();
      state.removed = [...new Set([...state.removed, b.dataset.rm])];
      const next = { ...state.accepted };
      delete next[b.dataset.rm];
      state.accepted = next;
      state.shopDirty = true;
      render();
    };
  });
  root.querySelectorAll("[data-swap-line]").forEach((b) => {
    b.onclick = (ev) => {
      ev.stopPropagation();
      let line = {};
      try {
        line = JSON.parse(decodeURIComponent(b.dataset.swapLine));
      } catch {
        return;
      }
      openSwap(line);
    };
  });
  root.querySelectorAll("details.sku-more").forEach((d) => {
    d.addEventListener("toggle", () => {
      if (!d.open) return;
      root.querySelectorAll("details.sku-more[open]").forEach((other) => {
        if (other !== d) other.open = false;
      });
    });
  });
  const cancel = $("#picker-cancel");
  if (cancel) {
    cancel.onclick = () => {
      swapAbort?.abort();
      state.picker = null;
      render();
    };
  }
  if (state.picker) {
    bindModalFocus(".picker--cover", { initial: "#picker-search input, #picker-search [name=q]" });
  }
  const searchForm = $("#picker-search");
  if (searchForm && state.picker) {
    searchForm.onsubmit = (e) => {
      e.preventDefault();
      const q = searchForm.q?.value || "";
      openSwap({
        role: state.picker.role,
        wanted: state.picker.wanted,
        name: state.picker.name,
        price: state.picker.price,
        sku: state.picker.sku,
        group: state.picker.group,
        staple: state.picker.staple,
        search: q,
      });
    };
  }
  const addCat = $("#add-cat");
  if (addCat) addCat.onclick = () => openBrowse({ pickGroup: true });
  root.querySelectorAll("[data-facet]").forEach((b) => {
    b.onclick = () => {
      let f = {};
      try {
        f = JSON.parse(decodeURIComponent(b.dataset.facet));
      } catch {
        return;
      }
      openSwap({
        role: state.picker.role,
        wanted: state.picker.wanted,
        name: state.picker.name,
        price: state.picker.price,
        sku: state.picker.sku,
        group: state.picker.group,
        staple: state.picker.staple,
        facetId: f.id,
        facetStaple: f.staple || f.q,
        slug: f.slug || "",
        search: "",
      });
    };
  });
  root.querySelectorAll("[data-alt]").forEach((b) => {
    b.onclick = () => {
      const role = state.picker?.role;
      if (!role) return;
      let pick = {};
      try {
        pick = JSON.parse(decodeURIComponent(b.dataset.alt));
      } catch {
        pick = { name: decodeURIComponent(b.dataset.alt || "") };
      }
      if (!pick.name) return;
      applySwap(role, pick);
    };
  });
  const print = $("#print");
  if (print) {
    print.onclick = () => {
      void pushShopCartToSilpo();
    };
  }
  document.onkeydown = (e) => {
    if (e.key !== "Escape") return;
    if (state.picker) {
      swapAbort?.abort();
      state.picker = null;
      render();
    } else if (state.browse) {
      closeBrowse();
    }
  };
  syncCheckoutStickyTop();
  bindReceiptFoldCollapse();
  bindWasteLabelToggles(root);
  root.querySelector(".shop-recent-shelf")?.addEventListener("toggle", () => {
    syncCheckoutStickyTop();
  });
  if (!root.dataset.recentAddDelegated) {
    root.dataset.recentAddDelegated = "1";
    root.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-recent-add]");
      if (!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      addRecentFromReceipt({
        key: btn.dataset.recentKey || "",
        name: btn.dataset.recentName || "",
        receiptId: btn.dataset.recentReceipt || "",
      });
    });
  }
}

function applySwap(role, pick) {
  state.swaps = { ...state.swaps, [role]: pick };
  state.picker = null;
  if (state.shopVm?.lines) {
    const lines = state.shopVm.lines.map((l) => {
      if (l.role !== role) return l;
      const units = Math.max(1, Number(l.units) || 1);
      const pseudo = {
        weighted: pick.weighted,
        step: pick.step,
        displayRatio: pick.displayRatio,
        name: pick.name,
        title: pick.name,
      };
      const nextPrice = pick.price != null ? pick.price : l.price;
      return {
        ...l,
        name: pick.name,
        price: nextPrice,
        status: "replaced",
        note: "заміна, ще раз позначте",
        amount: amountLabelFromProduct(pseudo, pick.name, units) || l.amount,
        quantity: cartQuantity(pseudo, units),
        weighted: Boolean(pick.weighted),
        step: pick.step != null ? Number(pick.step) : l.step,
        displayRatio: pick.displayRatio != null ? String(pick.displayRatio) : l.displayRatio,
        sku: {
          productId: pick.productId,
          slug: pick.slug,
          companyId: pick.companyId,
          branchId: pick.branchId,
        },
      };
    });
    const sum = lines.reduce((s, l) => s + (Number(l.price) || 0), 0);
    state.shopVm = { ...state.shopVm, lines, totals: { min: sum, max: sum } };
  }
  const nextOk = { ...state.accepted };
  delete nextOk[role];
  state.accepted = nextOk;
  state.shopDirty = false;
  render();
  resolveVm(state.intentShop, {
    variantId: state.variantId,
    removedRoles: state.removed,
    swaps: state.swaps,
    extraQueries: state.extraQueries,
    confirmed: state.confirmed,
  }).then((vm) => {
    if (state.picker || state.screen !== "shop") return;
    state.shopVm = vm;
    state.shopDirty = false;
    render();
  });
}

async function openSwap(line) {
  swapAbort?.abort();
  swapAbort = new AbortController();
  const wanted = line.wanted || line.role;
  const search = String(line.search || "").trim();
  const group = line.group || groupOfQuery(wanted);
  const staple = line.staple || wanted;
  const facetId = line.facetId || "";
  const facetStaple = line.facetStaple || "";
  const slug = String(line.slug || "").trim();
  state.picker = {
    role: line.role,
    wanted,
    name: line.name || wanted,
    price: line.price,
    sku: line.sku || null,
    group,
    staple,
    facetId,
    facetStaple,
    slug,
    loading: true,
    options: [],
    facets: localFacets({ group, wanted, staple, name: line.name }),
    error: "",
    search,
  };
  await render();
  try {
    const r = await fetch("/api/replacements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.any
        ? AbortSignal.any([swapAbort.signal, AbortSignal.timeout(20000)])
        : swapAbort.signal,
      body: JSON.stringify({
        productId: line.sku?.productId,
        companyId: line.sku?.companyId,
        branchId: line.sku?.branchId,
        slug: slug || undefined,
        query: wanted,
        staple,
        group,
        facetStaple: facetStaple || undefined,
        productSlug: line.sku?.slug,
        search,
      }),
    });
    const data = await r.json();
    const options = data.options || [];
    state.picker = {
      ...state.picker,
      loading: false,
      options,
      facets: data.facets?.length ? data.facets : state.picker.facets,
      error: options.length ? "" : data.error || "немає пропозицій від MCP",
    };
  } catch (err) {
    if (err?.name === "AbortError") return;
    state.picker = {
      ...state.picker,
      loading: false,
      options: [],
      error: "заміни не завантажились",
    };
  }
  await render();
}

const ADD_GROUPS = ["breads", "protein", "veg", "dairy", "extra", "alcohol"];

async function openBrowse(opts = {}) {
  const fromHash = Boolean(opts.fromHash);
  if (opts.pickGroup || !opts.group) {
    state.browse = {
      loading: false,
      pickGroup: true,
      categories: [],
      products: [],
      slug: "",
      title: "Полиця",
      stack: [],
      search: "",
      group: "",
      groupTitle: "",
      path: [{ kind: "pick", id: "pick", label: "Полиця" }],
      scope: "branch",
    };
    if (!fromHash) syncHashFromBrowse({ push: opts.push !== false });
    await render();
    return;
  }
  const group = opts.group;
  const groupTitle = opts.groupTitle || (group ? groupMeta(group).title : "");
  state.browse = {
    loading: true,
    categories: [],
    products: [],
    slug: "",
    title: groupTitle,
    stack: [],
    search: "",
    group,
    groupTitle,
    path: groupPath(group, groupTitle),
    scope: "branch",
  };
  if (!fromHash) syncHashFromBrowse({ push: opts.push !== false });
  await render();
  try {
    const r = await fetch("/api/browse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(group ? { group, groupTitle } : {}),
    });
    const data = await r.json();
    state.browse = {
      loading: false,
      categories: data.categories || [],
      tier1: data.tier1 || [],
      tier2: data.tier2 || [],
      filterSlug: data.filterSlug || BROWSE_POPULAR_SLUG,
      tier1Slug: data.tier1Slug || data.filterSlug || BROWSE_POPULAR_SLUG,
      products: data.products || [],
      slug: "",
      title: data.title || groupTitle,
      search: "",
      stack: [],
      group,
      groupTitle,
      path: groupPath(group, groupTitle),
      scope: "branch",
      error: data.error || "",
    };
  } catch {
    state.browse = {
      loading: false,
      categories: [],
      products: [],
      error: "категорії не завантажились",
      stack: [],
      group,
      groupTitle,
      path: groupPath(group, groupTitle),
      scope: "branch",
    };
  }
  await render();
}

async function openBrowseSlug(slug, title, opts = {}) {
  const fromHash = Boolean(opts.fromHash);
  const prev = state.browse || {};
  const tier1 = prev.tier1 || [];
  if (prev.group && tier1.length && !opts.fromCrumb) {
    return openBrowseFilter(slug, title, opts);
  }
  const snapshot = {
    categories: prev.categories || [],
    products: prev.products || [],
    slug: prev.slug || "",
    title: prev.title || "",
    search: prev.search || "",
  };
  const stack = [...(prev.stack || []), snapshot];
  const basePath = (prev.path || []).filter((p) => p.kind !== "search" && p.kind !== "slug");
  const path = [...basePath, { kind: "slug", id: slug, slug, label: title }].slice(-2);
  state.browse = { ...prev, loading: true, slug, title, products: [], search: "", stack, path };
  if (!fromHash) syncHashFromBrowse({ push: true });
  await render();
  try {
    const r = await fetch("/api/browse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        title,
        group: prev.group || "",
        groupTitle: prev.groupTitle || "",
      }),
    });
    const data = await r.json();
    state.browse = {
      ...(state.browse || {}),
      loading: false,
      categories: data.categories || [],
      tier1: data.tier1?.length ? data.tier1 : prev.tier1 || [],
      tier2: data.tier2 || [],
      filterSlug: data.filterSlug || slug,
      tier1Slug: data.tier1Slug || slug,
      products: data.products || [],
      title: data.title || title,
      error: data.products?.length || data.categories?.length ? "" : data.error || "порожньо в слоті доставки",
    };
  } catch {
    state.browse = { ...(state.browse || {}), loading: false, error: "товари не завантажились" };
  }
  await render();
}

async function openBrowseFilter(slug, title, opts = {}) {
  const prev = state.browse || {};
  const tier1 = prev.tier1 || [];
  const isTier1 = slug === BROWSE_POPULAR_SLUG || tier1.some((c) => c.slug === slug);
  const tier1Slug = isTier1 ? slug : prev.tier1Slug || slug;
  const seq = (state.browseFilterSeq || 0) + 1;
  state.browseFilterSeq = seq;
  state.browse = {
    ...prev,
    loading: false,
    listLoading: true,
    searching: false,
    search: "",
    filterSlug: slug,
    tier1Slug,
    slug: slug === BROWSE_POPULAR_SLUG ? "" : slug,
    title: title || prev.title,
    products: prev.products || [],
    path: prev.path || groupPath(prev.group, prev.groupTitle),
    stack: [],
    error: "",
  };
  syncHashFromBrowse({ push: false });
  if (!patchBrowseStepUi()) await render();
  try {
    const r = await fetch("/api/browse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: slug === BROWSE_POPULAR_SLUG ? BROWSE_POPULAR_SLUG : slug,
        title,
        group: prev.group || "",
        groupTitle: prev.groupTitle || "",
        tier1Slug: tier1Slug === BROWSE_POPULAR_SLUG ? "" : tier1Slug,
      }),
    });
    if (seq !== state.browseFilterSeq) return;
    const data = await r.json();
    if (seq !== state.browseFilterSeq) return;
    const products = data.products || [];
    const filterSlug = data.filterSlug || slug;
    state.browse = {
      ...(state.browse || {}),
      loading: false,
      listLoading: false,
      searching: false,
      tier1: data.tier1?.length ? data.tier1 : prev.tier1 || [],
      tier2: data.tier2 || [],
      filterSlug,
      tier1Slug: data.tier1Slug || tier1Slug,
      products,
      categories: data.categories || [],
      slug: filterSlug === BROWSE_POPULAR_SLUG ? "" : filterSlug,
      error: products.length ? "" : data.error || "порожньо в слоті доставки",
    };
  } catch {
    if (seq !== state.browseFilterSeq) return;
    state.browse = {
      ...(state.browse || {}),
      loading: false,
      listLoading: false,
      searching: false,
      error: "товари не завантажились",
    };
  }
  if (!patchBrowseStepUi()) await render();
}

async function openBrowseSearch(q, opts = {}) {
  const query = String(q || "").trim();
  if (!query) return;
  const prev = state.browse || {};
  const global = Boolean(opts.global);
  const soft = Boolean(opts.soft);
  const groupSeg = (prev.path || []).find((p) => p.kind === "group") || (prev.group ? groupPath(prev.group, prev.groupTitle)[0] : null);
  const path = groupSeg
    ? [groupSeg, { kind: "search", id: "q", label: query }]
    : [{ kind: "search", id: "q", label: query }];
  const seq = (state.browseSearchSeq || 0) + 1;
  state.browseSearchSeq = seq;
  state.browse = {
    ...prev,
    loading: false,
    listLoading: !soft,
    searching: soft,
    search: query,
    slug: "",
    title: soft ? prev.title || query : query,
    path,
    scope: global ? "global" : "branch",
    products: soft ? prev.products || [] : [],
    error: "",
  };
  if (opts.keepFocus) state.browseKeepFocus = true;
  syncHashFromBrowse({ push: false });
  if (!patchBrowseStepUi()) await render();
  browseAbort?.abort();
  browseAbort = new AbortController();
  try {
    const r = await fetch("/api/browse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: browseAbort.signal,
      body: JSON.stringify(
        global || !prev.group
          ? { search: query, scope: "global" }
          : { search: query, group: prev.group, groupTitle: prev.groupTitle, scope: "branch" },
      ),
    });
    if (seq !== state.browseSearchSeq) return;
    const data = await r.json();
    if (seq !== state.browseSearchSeq) return;
    const keepCats = prev.categories || [];
    const keepTier2 = prev.tier2 || [];
    const products = data.products || [];
    state.browse = {
      ...(state.browse || {}),
      loading: false,
      listLoading: false,
      searching: false,
      tier1: data.tier1?.length ? data.tier1 : prev.tier1 || [],
      tier2: data.tier2 || keepTier2,
      categories: data.categories?.length ? data.categories : keepCats,
      products,
      error: products.length ? "" : keepTier2.length || keepCats.length ? "" : data.error || "нічого не знайшли",
    };
    if (opts.keepFocus) state.browseKeepFocus = true;
  } catch (err) {
    if (err?.name === "AbortError") return;
    if (seq !== state.browseSearchSeq) return;
    state.browse = {
      ...(state.browse || {}),
      loading: false,
      listLoading: false,
      searching: false,
      error: "пошук не завантажився",
    };
    if (opts.keepFocus) state.browseKeepFocus = true;
  }
  if (!patchBrowseStepUi()) await render();
}

async function addExtraProduct(pick, opts = {}) {
  const productId = pick.productId;
  if (productId && state.extraQueries.some((q) => String(q.productId) === String(productId))) {
    toast("Вже в чеклисті");
    if (!opts.stayOnDay) closeBrowse();
    else if (!patchDayPlatesExpressUi()) await render();
    return;
  }
  const id = String(productId || Date.now()).slice(-8);
  const siblings = [
    ...state.extraQueries.map((q) => q.q),
    ...(state.shopVm?.lines || []).map((l) => l.name || l.wanted),
    pick.name,
  ];
  const group = destinationGroupForAdd(pick.name, siblings);
  const groupTitle = groupMeta(group).title;
  const origin = state.browse?.group;
  const staple = String(opts.sportRation?.staple || pick.staple || "").trim() || pick.name;
  let extra = {
    q: pick.name,
    role: `add:${id}`.slice(0, 24),
    staple,
    envelope: "food",
    group,
    groupTitle,
    productId,
    price: pick.price,
    image: pick.image || "",
    sku: {
      productId,
      slug: pick.slug,
      companyId: pick.companyId,
      branchId: pick.branchId,
    },
    why: `додано · ${groupTitle}`,
  };
  if (opts.sportRation) {
    extra = withSportDayProvenance(extra, {
      programId: opts.sportRation.programId || state.intentSport?.constraints?.programId || "",
      role: opts.sportRation.role,
      staple: opts.sportRation.staple,
    });
  }
  state.extraQueries = [...state.extraQueries, extra].map((q) => {
    const names = [...state.extraQueries.map((x) => x.q), extra.q];
    const g = destinationGroupForAdd(q.q, names);
    const gt = groupMeta(g).title;
    const why =
      q.from === "sport_day"
        ? `з програми · ${gt}`
        : `додано · ${gt}`;
    return { ...q, group: g, groupTitle: gt, why };
  });
  state.accepted = { ...state.accepted, [extra.role]: true };
  state.flashRole = extra.role;
  if (opts.sportRation) {
    noteSportRationCoverage({
      role: opts.sportRation.role,
      staple: opts.sportRation.staple || pick.name,
      productId: opts.sportRation.productId || productId,
    });
    state.handoffMetrics = bumpHandoffMetric(state.handoffMetrics, "plate_add");
  }
  if (state.shopVm?.lines) {
    const pseudo = {
      weighted: pick.weighted,
      step: pick.step,
      displayRatio: pick.displayRatio,
      name: pick.name,
      title: pick.name,
    };
    const line = {
      role: extra.role,
      wanted: staple,
      name: extra.q,
      status: "found",
      price: extra.price != null ? extra.price : null,
      envelope: "food",
      note: "",
      image: extra.image,
      sku: extra.sku,
      group,
      groupTitle,
      why: extra.why,
      units: 1,
      quantity: cartQuantity(pseudo, 1),
      weighted: Boolean(pick.weighted),
      step: pick.step != null ? Number(pick.step) : null,
      displayRatio: pick.displayRatio != null ? String(pick.displayRatio) : "",
      amount: amountLabelFromProduct(pseudo, extra.q, 1) || packLabelFromName(extra.q) || "1 шт",
    };
    const lines = [...state.shopVm.lines, line];
    const sum = lines.reduce((s, l) => s + (Number(l.price) || 0), 0);
    state.shopVm = { ...state.shopVm, lines, totals: { min: sum, max: sum } };
  }
  if (opts.stayOnDay) {
    if (!opts.quiet) toast("Додано в СільпоExpress");
    if (!patchDayPlatesExpressUi()) await render();
    return;
  }
  state.browse = null;
  setShopHash("#/shop", { push: false });
  if (origin && group !== origin) toast(`Додано в «${groupTitle}»`);
  else toast("Додано");
  await render();
  revealAddedRow(extra.role);
}

function addRecentFromReceipt({ key, name, receiptId }) {
  const receipt = (state.historyCache?.receipts || []).find((r) => String(r.id) === String(receiptId));
  if (!receipt || !state.shopVm || !name?.trim()) return false;
  if (!state.recentShelfDismissed) state.recentShelfDismissed = new Set();
  const result = mergeReceiptIntoShopVm({
    mode: "lines",
    receipt,
    selectedNames: [name],
    shopVm: state.shopVm,
    accepted: state.accepted,
    qtyByRole: state.qtyByRole,
    categoriesAllow: state.intentShop?.constraints?.categoriesAllow || ["food", "clean"],
    shelf: state.shelf,
  });
  if (result.addedN === 0 && result.bumpedN === 0) {
    toast("Не вдалося додати");
    return false;
  }
  state.shopVm = result.vm;
  state.accepted = result.accepted;
  state.qtyByRole = result.qtyByRole;
  state.recentShelfDismissed.add(key);
  const role = result.flashRoles[0];
  if (role) state.flashRole = role;
  toast(result.bumpedN > 0 ? "Вже в чеку — оновлено" : "Додано · з останнього чеку");
  patchShopDock(state.shopVm);
  patchShopProgress(state.shopVm);
  paintShop(state.intentShop, state.shopVm, false, { enter: false, keepScroll: true });
  if (role) revealAddedRow(role);
  return true;
}

function revealAddedRow(role) {
  const run = () => {
    const safe = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(role) : String(role);
    const row = root.querySelector(`[data-sku-role="${safe}"]`);
    if (!row) return false;
    const reduce = prefersReduce();
    const behavior = reduce ? "auto" : "smooth";
    const rect = row.getBoundingClientRect();
    const y = window.scrollY + rect.top - window.innerHeight / 2 + rect.height / 2;
    window.scrollTo({ top: Math.max(0, y), behavior });
    row.scrollIntoView({ block: "center", inline: "nearest", behavior });
    return true;
  };
  if (!run()) requestAnimationFrame(() => requestAnimationFrame(run));
}

function addStepHeaderHtml(crumbsHtml) {
  return `<header class="add-nav add-nav--crumbs">
      <nav class="crumbs" aria-label="Навігація">${crumbsHtml}</nav>
      <button type="button" class="add-x" id="add-close" aria-label="закрити">✕</button>
    </header>`;
}

function browseTier1On(b, chip) {
  const filterSlug = b.filterSlug || BROWSE_POPULAR_SLUG;
  const tier1Slug = b.tier1Slug || filterSlug;
  if (chip.slug === BROWSE_POPULAR_SLUG) return filterSlug === BROWSE_POPULAR_SLUG;
  return tier1Slug === chip.slug;
}

function browseTier1ChipsHtml(b) {
  const tier1 = b.tier1 || [];
  return tier1
    .map(
      (c) =>
        `<button type="button" class="chip-browse chip-browse--tier1${browseTier1On(b, c) ? " on" : ""}" data-browse-filter="${esc(c.slug)}" data-title="${esc(c.title)}">${esc(c.title)}</button>`,
    )
    .join("");
}

function browseTier2ChipsHtml(b) {
  const tier2 = b.tier2 || [];
  const filterSlug = b.filterSlug || BROWSE_POPULAR_SLUG;
  return tier2
    .map(
      (c) =>
        `<button type="button" class="chip-browse chip-browse--tier2${filterSlug === c.slug ? " on" : ""}" data-browse-filter="${esc(c.slug)}" data-title="${esc(c.title)}">${esc(c.title)}</button>`,
    )
    .join("");
}

function browseProductRowHtml(o) {
  const payload = encodeURIComponent(
    JSON.stringify({
      name: o.name,
      price: o.price,
      weighted: o.weighted,
      step: o.step,
      displayRatio: o.displayRatio,
      productId: o.sku?.productId,
      slug: o.sku?.slug,
      companyId: o.sku?.companyId,
      branchId: o.sku?.branchId,
      image: o.image || "",
    }),
  );
  return `<button type="button" data-add-prod="${payload}" class="alt add-row">
    ${thumbHtml(o.image, o.name, 56)}
    <span class="add-row__body"><span class="add-row__name">${esc(o.name)}</span>${o.price != null ? `<span class="add-row__price num">${money(o.price)}</span>` : ""}</span>
    <span class="choose">додати</span>
  </button>`;
}

function browseListInnerHtml(b) {
  if (b.listLoading) {
    return `<p class="muted browse-list__wait" aria-live="polite">Завантажуємо…</p>`;
  }
  const slotCats = (b.categories || []).filter((c) => c.search || String(c.slug || "").startsWith("search:"));
  const tier2 = b.tier2 || [];
  const mcpCats = (b.categories || []).filter((c) => {
    if (c.search || String(c.slug || "").startsWith("search:")) return false;
    return !mcpChipDupesSlot(c, slotChipKeys(slotCats));
  });
  const prods = (b.products || []).map((o) => browseProductRowHtml(o)).join("");
  const hasProds = (b.products || []).length > 0;
  const empty =
    !hasProds && !b.searching
      ? b.search
        ? `<p class="muted">Немає «${esc(b.search)}» у цій групі.${tier2.length || slotCats.length || mcpCats.length ? " Спробуйте чіпи нижче." : ""}</p>${
            b.scope !== "global"
              ? `<button type="button" class="ghost" id="browse-escape" data-q="${esc(b.search)}">Шукати в усьому Сільпо</button>`
              : ""
          }`
        : !mcpCats.length && !tier2.length
          ? `<p class="muted">${esc(b.error || "У цій полиці порожньо.")}</p>`
          : b.error
            ? `<p class="muted">${esc(b.error)}</p>`
            : ""
      : "";
  return `${prods}${empty}`;
}

/** In-place browse refresh: list + chip selection; header/search stay mounted. */
function patchBrowseStepUi() {
  const b = state.browse;
  if (!b || b.pickGroup || b.loading) return false;
  const step = root.querySelector(".add-step:not(#add-pick)");
  if (!step) return false;
  const body = step.querySelector(".add-step__body");
  const list = step.querySelector(".browse-list--step");
  if (!body || !list) return false;

  const scrollTop = body.scrollTop;
  const filterSlug = b.filterSlug || BROWSE_POPULAR_SLUG;
  const tier1Slug = b.tier1Slug || filterSlug;

  step.querySelectorAll(".chips--browse-tier1 .chip-browse").forEach((el) => {
    const slug = el.dataset.browseFilter || "";
    const on = slug === BROWSE_POPULAR_SLUG ? filterSlug === BROWSE_POPULAR_SLUG : tier1Slug === slug;
    el.classList.toggle("on", on);
  });

  const tier2Html = browseTier2ChipsHtml(b);
  let tier2Row = step.querySelector(".chips--browse-tier2");
  if (tier2Html) {
    if (!tier2Row) {
      tier2Row = document.createElement("div");
      tier2Row.className = "chips chips--browse-tier chips--browse-tier2";
      step.querySelector(".chips--browse-tier1")?.after(tier2Row);
    }
    tier2Row.innerHTML = tier2Html;
    tier2Row.hidden = false;
  } else if (tier2Row) {
    tier2Row.remove();
  }

  let statusEl = step.querySelector("#browse-status");
  if (b.searching) {
    if (!statusEl) {
      statusEl = document.createElement("p");
      statusEl.id = "browse-status";
      statusEl.className = "muted";
      statusEl.setAttribute("aria-live", "polite");
      list.before(statusEl);
    }
    statusEl.hidden = false;
    statusEl.textContent = "Шукаємо…";
  } else if (statusEl) {
    statusEl.hidden = true;
    statusEl.textContent = "";
  }

  let banner = step.querySelector("#browse-global-banner");
  if (b.scope === "global") {
    if (!banner) {
      banner = document.createElement("p");
      banner.id = "browse-global-banner";
      banner.className = "banner";
      banner.textContent = "Результати з усього магазину";
      step.querySelector("#browse-search")?.after(banner);
    }
  } else if (banner) {
    banner.remove();
  }

  list.classList.toggle("is-loading", Boolean(b.listLoading));
  list.innerHTML = browseListInnerHtml(b);

  const escape = step.querySelector("#browse-escape");
  if (escape) {
    escape.onclick = () => openBrowseSearch(state.browse?.search || escape.dataset.q || "", { global: true });
  }

  body.scrollTop = scrollTop;
  if (!b.listLoading && !b.searching) {
    const n = (b.products || []).length;
    announce(n ? `${n} товарів` : b.error || "нічого не знайшли");
  }
  return true;
}

function onBrowseStepClick(e) {
  const filter = e.target.closest("[data-browse-filter]");
  if (filter) {
    e.preventDefault();
    void openBrowseFilter(filter.dataset.browseFilter, filter.dataset.title || "");
    return;
  }
  const prod = e.target.closest("[data-add-prod]");
  if (prod) {
    e.preventDefault();
    let pick = {};
    try {
      pick = JSON.parse(decodeURIComponent(prod.dataset.addProd));
    } catch {
      return;
    }
    void addExtraProduct(pick);
  }
}

function bindBrowseStepDelegation() {
  const body = root.querySelector(".add-step:not(#add-pick) .add-step__body");
  if (!body || body.dataset.browseDelegate) return;
  body.dataset.browseDelegate = "1";
  body.addEventListener("click", onBrowseStepClick);
}
function addStepHtml() {
  const b = state.browse;
  if (!b) return "";
  if (b.pickGroup) {
    const btns = GROUPS.filter((g) => ADD_GROUPS.includes(g.id))
      .map(
        (g) =>
          `<button type="button" class="chip-mcp" data-open-group="${esc(g.id)}" data-open-title="${esc(g.title)}">${esc(groupShortTitle(g.id))}</button>`,
      )
      .join("");
    return `
    <section class="add-step" id="add-pick" aria-label="Обрати полицю">
      ${addStepHeaderHtml(`<button type="button" class="crumb" data-add-exit>Чеклист</button><span class="crumb-sep" aria-hidden="true">/</span><span class="crumb crumb--now">Полиця</span>`)}
      <div class="add-step__body">
        <p class="muted">Оберіть відділ чеклиста — не весь магазин.</p>
        <div class="chips chips--mcp">${btns}</div>
      </div>
    </section>`;
  }
  const title = b.path?.length ? b.path[b.path.length - 1].label : groupShortTitle(b.group) || "Додати";
  const path = b.path || groupPath(b.group, b.groupTitle);
  const crumbs = [
    `<button type="button" class="crumb" data-add-exit>Чеклист</button>`,
    ...path.map(
      (p, i) =>
        i === path.length - 1
          ? `<span class="crumb crumb--now">${esc(p.label)}</span>`
          : `<button type="button" class="crumb" data-crumb="${i}">${esc(p.label)}</button>`,
    ),
  ].join(`<span class="crumb-sep" aria-hidden="true">/</span>`);
  const ph = browsePlaceholder(b.group);
  if (b.loading) {
    return `
    <section class="add-step" aria-label="Додати до ${esc(title)}">
      ${addStepHeaderHtml(crumbs)}
      <div class="add-step__body">
        <div class="skel skel--lg" aria-hidden="true"></div>
        <div class="skel" aria-hidden="true"></div>
        <p class="muted">${b.slug || b.search ? "Завантажуємо товари…" : "Завантажуємо полицю…"}</p>
      </div>
    </section>`;
  }
  const slotCats = (b.categories || []).filter((c) => c.search || String(c.slug || "").startsWith("search:"));
  const tier1 = b.tier1 || [];
  const tier1Html = browseTier1ChipsHtml(b);
  const tier2Html = browseTier2ChipsHtml(b);
  const slotKeys = slotChipKeys(slotCats);
  const mcpCats = (b.categories || []).filter((c) => {
    if (c.search || String(c.slug || "").startsWith("search:")) return false;
    return !mcpChipDupesSlot(c, slotKeys);
  });
  const qn = String(b.search || "")
    .trim()
    .toLowerCase();
  const chipHint = (c) => {
    if (!qn) return false;
    const hay = `${c.search || ""} ${c.title || ""}`.toLowerCase();
    return hay.includes(qn) || qn.includes(String(c.search || c.title || "").toLowerCase());
  };
  const chips = slotCats
    .map(
      (c) =>
        `<button type="button" class="chip-slot${b.search === c.search ? " on" : ""}${chipHint(c) ? " chip-hint" : ""}" data-cat="${esc(c.slug)}" data-search="${esc(c.search || "")}" data-title="${esc(c.title)}">${esc(c.title)}</button>`,
    )
    .join("");
  const cats = mcpCats
    .map((c) => {
      const hint = chipHint(c) ? " chip-hint" : "";
      return `<button type="button" class="chip-mcp${hint}" data-cat="${esc(c.slug)}" data-search="" data-title="${esc(c.title)}">${esc(c.title)}</button>`;
    })
    .join("");
  const prods = (b.products || []).map((o) => browseProductRowHtml(o)).join("");
  const hasProds = (b.products || []).length > 0;
  const tier2 = b.tier2 || [];
  const empty =
    !hasProds && !b.searching && !b.listLoading
      ? b.search
        ? `<p class="muted">Немає «${esc(b.search)}» у цій групі.${tier2.length || slotCats.length || mcpCats.length ? " Спробуйте чіпи нижче." : ""}</p>${
            b.scope !== "global"
              ? `<button type="button" class="ghost" id="browse-escape" data-q="${esc(b.search)}">Шукати в усьому Сільпо</button>`
              : ""
          }`
        : !cats
          ? `<p class="muted">У цій полиці порожньо.</p>`
          : ""
      : "";
  const back =
    !b.pickGroup && (b.group || b.slug || b.search)
      ? `<button class="ghost" id="browse-back">назад</button>`
      : "";
  return `
    <section class="add-step" aria-label="Додати до ${esc(title)}">
      ${addStepHeaderHtml(crumbs)}
      <div class="add-step__body">
        <form id="browse-search" class="search-row">
          <input name="q" type="search" autocomplete="off" placeholder="${esc(ph)}" aria-label="Пошук товару" value="${esc(b.search || "")}" />
          <button type="submit">знайти</button>
        </form>
        ${b.scope === "global" ? `<p class="banner" id="browse-global-banner">Результати з усього магазину</p>` : ""}
        ${b.searching ? `<p class="muted" id="browse-status" aria-live="polite">Шукаємо…</p>` : ""}
        ${tier1Html ? `<div class="chips chips--browse-tier chips--browse-tier1">${tier1Html}</div>` : chips ? `<div class="chips chips--slots">${chips}</div>` : ""}
        ${tier2Html ? `<div class="chips chips--browse-tier chips--browse-tier2">${tier2Html}</div>` : cats ? `<div class="chips chips--mcp">${cats}</div>` : ""}
        ${b.error && !hasProds && !b.searching && !b.search && !b.listLoading ? `<p class="muted">${esc(b.error)}</p>` : ""}
        <div class="browse-list browse-list--step${b.listLoading ? " is-loading" : ""}">${b.listLoading ? `<p class="muted browse-list__wait" aria-live="polite">Завантажуємо…</p>` : `${prods}${empty}`}</div>
        ${back}
      </div>
    </section>`;
}

function pickerHtml() {
  const p = state.picker;
  if (!p) return "";
  const title = `Замість «${esc(p.wanted || p.role)}»`;
  const current = `
    <div class="swap-current">
      <div class="muted">зараз у чеку</div>
      <div>${esc(p.name || p.wanted)}</div>
      <div class="muted">${p.price != null ? money(p.price) : "ціна з полиці"} · запит: ${esc(p.wanted || p.role)}</div>
    </div>`;
  const wait = `
    <div class="swap-wait" role="status" aria-live="polite" aria-busy="true">
      <div class="swap-track" aria-hidden="true"><div class="swap-fill"></div></div>
      <p>Підбираємо з тієї ж полиці…</p>
    </div>`;
  const alts = p.options.length
    ? p.options
        .map(
          (o) => `
        <button data-alt="${encodeURIComponent(
          JSON.stringify({
            name: o.name,
            price: o.price,
            weighted: o.weighted,
            step: o.step,
            displayRatio: o.displayRatio,
            productId: o.sku?.productId,
            slug: o.sku?.slug,
            companyId: o.sku?.companyId,
            branchId: o.sku?.branchId,
            image: o.image || "",
          }),
        )}" class="alt">
          ${thumbHtml(o.image, o.name, 40)}
          <span class="add-row__body"><span class="add-row__name">${esc(o.name)}</span>${o.price != null ? `<span class="add-row__price num">${money(o.price)}</span>` : ""}</span>
          <span class="choose">обрати</span>
        </button>`,
        )
        .join("")
    : `<p class="muted">${esc(p.error || "порожньо")}</p>`;
  const facets = (p.facets || [])
    .map((f) => {
      const payload = encodeURIComponent(JSON.stringify(f));
      const on = p.facetId === f.id || p.facetStaple === f.staple || p.slug === f.slug;
      return `<button type="button" class="${on ? "on" : ""}" data-facet="${payload}">${esc(f.title)}</button>`;
    })
    .join("");
  return `
    <div class="picker picker--cover" role="dialog" aria-modal="true" aria-labelledby="picker-title">
      <div class="sheet-handle" aria-hidden="true"></div>
      <strong id="picker-title">${title}</strong>
      ${current}
      ${facets ? `<p class="muted">підкатегорії</p><div class="chips chips--sheet">${facets}</div>` : ""}
      <form id="picker-search" class="search-row">
        <input name="q" type="search" autocomplete="off" placeholder="Назва заміни…" aria-label="Пошук заміни" value="${esc(p.search || "")}" />
        <button type="submit">знайти</button>
      </form>
      <p class="muted">${p.loading ? "" : "рекомендації з полиці"}</p>
      ${p.loading ? wait : `<div class="browse-list">${alts}</div>`}
      <button type="button" class="ghost ghost--sheet" id="picker-cancel">Скасувати</button>
    </div>`;
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function thumbLetter(name) {
  return esc((String(name || "?").trim().slice(0, 1) || "?").toUpperCase());
}

/** Photo cut-out, or first-letter tile when image missing / broken. */
function thumbHtml(url, name, size = 72) {
  const letter = thumbLetter(name);
  if (!url) return emptyThumbHtml(letter);
  return `<img class="thumb" src="${esc(url)}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async" data-letter="${letter}" onerror="window.__skuThumbFallback&&window.__skuThumbFallback(this)" />`;
}

function emptyThumbHtml(letter) {
  return `<span class="thumb thumb--empty" aria-hidden="true">${esc(letter)}</span>`;
}

window.__skuThumbFallback = (img) => {
  if (!img || img.dataset.fell) return;
  img.dataset.fell = "1";
  const art = img.closest(".sku");
  if (art) {
    art.classList.add("sku--letter");
    art.classList.remove("sku--shot");
  }
  const meal = img.closest(".meal");
  if (meal) {
    meal.classList.add("meal--letter");
    meal.classList.remove("meal--shot");
  }
  const wrap = document.createElement("div");
  wrap.innerHTML = emptyThumbHtml(img.dataset.letter || "?");
  const node = wrap.firstChild;
  if (node) img.replaceWith(node);
};

function slotChipKeys(slotCats) {
  const keys = new Set();
  for (const c of slotCats || []) {
    const raw = String(c.search || c.title || "")
      .toLowerCase()
      .trim();
    if (!raw) continue;
    keys.add(raw);
    const first = raw.split(/[\s,/]+/)[0];
    if (first) keys.add(first);
  }
  return keys;
}

function mcpChipDupesSlot(c, keys) {
  const t = String(c.title || "")
    .toLowerCase()
    .trim();
  if (!t || !keys?.size) return false;
  if (keys.has(t)) return true;
  const first = t.split(/[\s,/]+/)[0];
  return Boolean(first && keys.has(first));
}

function workoutsUa(n) {
  const num = Number(n) || 0;
  const mod10 = num % 10;
  const mod100 = num % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${num} тренувань`;
  if (mod10 === 1) return `${num} тренування`;
  if (mod10 >= 2 && mod10 <= 4) return `${num} тренування`;
  return `${num} тренувань`;
}

function roleUa(r) {
  return { breakfast: "Сніданок", lunch: "Обід", dinner: "Вечеря" }[r] || r;
}
function statusUa(s) {
  return { found: "є", missing: "немає", replaced: "заміна" }[s] || s;
}

function mealSlotOf(line) {
  const g = String(line?.group || "").trim();
  if (["breakfast", "lunch", "dinner"].includes(g)) return g;
  const role = String(line?.role || "");
  const m = role.match(/^(breakfast|lunch|dinner)(?::|$)/);
  return m ? m[1] : "";
}

/** Active goal mealMap for view-day — course → byBodyGoal → byCookMode.ready. */
function activeMealMapForDay(dayISO = currentDayISO()) {
  const programId = state.intentSport?.constraints?.programId;
  const program = state.kb?.programs?.find((p) => p.id === programId);
  const profile = loadSportProfile();
  const cookMode = loadSportSurvey()?.cookMode;
  const kb = state._contentSourcePack
    ? mergeKbWithContentSource(state.kb, state._contentSourcePack)
    : state.kb;
  return resolveGoalMealMap(kb, program?.goal || "mobility", profile, { dayISO, cookMode });
}

function cookForDishSlot(slot, lineCook, dayISO = currentDayISO()) {
  return normalizeMealCook(lineCook) || normalizeMealCook(activeMealMapForDay(dayISO)?.[slot]?.cook);
}

function dayMealsHtml(meals, { dayISO = currentDayISO() } = {}) {
  if (!meals.length) {
    return {
      html: `<div class="empty"><strong>Полиця порожня</strong>Немає рядків з resolve — перевірте зʼєднання або змініть програму.</div>`,
      allSoft: false,
    };
  }
  const softFlags = meals.map((l) => /залишок/i.test(String(l.note || "").trim()));
  const softCount = softFlags.filter(Boolean).length;
  const allSoft = softCount > 0 && softCount === meals.length;
  const firstSoft = softFlags.indexOf(true);

  function ingredientRow(l, i) {
    const mem = expressMembershipForMeal(l, {
      extraQueries: state.extraQueries,
      shopLines: state.shopVm?.lines,
      bases: loadBases(),
    });
    const ok = l.status === "found" || l.status === "replaced";
    const miss = l.status === "missing" || (!ok && !mem.inExpress);
    const showMiss = l.status && l.status !== "found";
    const title = l.name || l.wanted || "—";
    const stapleHint = String(l.wanted || l.staple || "").trim();
    const img = thumbHtml(l.image, title, 44);
    let side = "";
    if (mem.inExpress) {
      side = `<div class="status status--in-express">${esc(mem.label)}</div>
            <div class="meal__price num">${l.price != null ? money(l.price) : "—"}</div>`;
    } else if (ok) {
      side = `${showMiss ? `<div class="status ${esc(l.status)}">${statusUa(l.status)}</div>` : ""}
            <div class="meal__price num">${l.price != null ? money(l.price) : "—"}</div>
            <button type="button" class="meal__add" data-meal-add="${i}" aria-label="В Express">＋</button>`;
    } else {
      side = `${showMiss ? `<div class="status ${esc(l.status)}">${statusUa(l.status)}</div>` : `<div class="status missing">немає</div>`}
            <div class="meal__price num">—</div>
            <button type="button" class="meal__add meal__add--search" data-meal-search="${i}">Знайти</button>`;
    }
    const softNote = String(l.note || "").trim();
    const softStock = softFlags[i];
    const showRowNote = softNote && (!softStock || (!allSoft && i === firstSoft));
    const noteHtml = showRowNote
      ? `<div class="meal__note muted">${esc(softStock ? "залишок у слоті?" : softNote)}</div>`
      : "";
    const beacon = ok
      ? beaconForLine(l, state.historyCache?.receipts || [])
      : { kind: "none", copy: "", tip: "" };
    const beaconHtml =
      beacon.kind !== "none" && beacon.copy
        ? `<button type="button" class="meal__beacon meal__beacon--${esc(beacon.kind)}" data-beacon-tip="${esc(beacon.tip || beacon.copy)}" aria-label="${esc(beacon.tip || beacon.copy)}"><span class="meal__beacon-dot" aria-hidden="true"></span>${esc(beacon.copy)}</button>`
        : "";
    const cls = [
      "meal",
      "meal--compact",
      "meal--ingredient",
      mem.inExpress ? "is-in-express" : "",
      miss ? "meal--miss" : "",
      softStock ? "meal--soft" : "",
      l.image ? "meal--shot" : "meal--letter",
    ]
      .filter(Boolean)
      .join(" ");
    return `
        <div class="${cls}" data-meal-i="${i}">
          <div class="meal__media" aria-hidden="${l.image ? "true" : "false"}">${img}</div>
          <div class="meal__main">
            ${stapleHint ? `<div class="meal__role">${esc(stapleHint)}</div>` : ""}
            <div class="meal__name">${esc(title)}</div>
            ${l.amount && String(l.amount).trim() !== "—" ? `<div class="meal__amt muted">${esc(l.amount)}</div>` : ""}
            ${beaconHtml}
            ${noteHtml}
          </div>
          <div class="meal__side">
            ${side}
          </div>
        </div>`;
  }

  const order = ["breakfast", "lunch", "dinner"];
  const bySlot = new Map(order.map((s) => [s, []]));
  const orphan = [];
  meals.forEach((l, i) => {
    const slot = mealSlotOf(l);
    if (bySlot.has(slot)) bySlot.get(slot).push({ l, i });
    else orphan.push({ l, i });
  });

  const blocks = [];
  const mealMap = activeMealMapForDay(dayISO);
  const plateMode = plateModeFromCookMode(loadSportSurvey()?.cookMode);
  for (const slot of order) {
    const rows = bySlot.get(slot) || [];
    if (!rows.length) continue;
    const mapTitle = mealMap?.[slot] && typeof mealMap[slot] === "object" ? mealMap[slot].title : mealMap?.[slot];
    const slotEntry = mealMap?.[slot] && typeof mealMap[slot] === "object" ? mealMap[slot] : null;
    const dishTitle = String(mapTitle || rows[0].l.groupTitle || roleUa(slot)).trim();
    const cook = cookForDishSlot(slot, rows[0].l.cook, dayISO);
    const cookUa = mealCookChipUa(cook);
    const stoveChip = cookUa
      ? `<span class="meal-dish__stove" data-cook="${esc(cook)}" title="Спосіб страви · не фільтр полиці">${esc(cookUa)}</span>`
      : "";
    const recipeSteps =
      plateMode === "ingredients" && cook === "cook" ? resolveMealRecipeSteps(dishTitle, slotEntry) : null;
    let recipeHtml = recipeSteps ? mealRecipeHowtoHtml(recipeSteps, esc) : "";
    if (!recipeHtml && plateMode === "ingredients" && cook === "ready") {
      const serveNote = resolveMealServeNote(dishTitle, slotEntry);
      recipeHtml = mealServeNoteHtml(serveNote, esc);
    }
    blocks.push(`
      <article class="meal-dish" data-meal-slot="${esc(slot)}">
        <header class="meal-dish__head">
          <div class="meal-dish__slot-row">
            <div class="meal-dish__slot">${roleUa(slot)}</div>
            ${stoveChip}
          </div>
          <h3 class="meal-dish__title">${esc(dishTitle)}</h3>
          ${recipeHtml}
        </header>
        <div class="meal-dish__ings">
          ${rows.map(({ l, i }) => ingredientRow(l, i)).join("")}
        </div>
      </article>`);
  }
  for (const { l, i } of orphan) blocks.push(ingredientRow(l, i));

  return { html: blocks.join(""), allSoft };
}
function debugHtml(vm) {
  if (!state.debug) return "";
  const badge = sourceBadge();
  const dump = vm?.debug ? `<pre class="debug">${JSON.stringify(vm.debug, null, 2)}</pre>` : "";
  if (!badge && !dump) return "";
  return `${badge}${dump}`;
}

load().catch((err) => {
  root.textContent = String(err);
});
