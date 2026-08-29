/** Month spend aggregates from Receipt[] — pure, no DOM / MCP. */

export const MONTH_GOAL_KEY = "silpo.express.monthGoal.v1";

/** UTC YYYY-MM from receipt `at` (or null). */
export function monthKeyFromAt(at) {
  if (!at) return null;
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) {
    const m = String(at).match(/^(\d{4})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}` : null;
  }
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${mo}`;
}

/** ISO date (UTC) YYYY-MM-DD for the calendar day of `at`. */
export function dayKeyISO(at) {
  if (!at) return null;
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) {
    const m = String(at).match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  }
  return d.toISOString().slice(0, 10);
}

/** ISO date (UTC) of Monday for the week containing `at`. */
export function weekStartISO(at) {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return null;
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function currentMonthKey(now = new Date()) {
  const y = now.getUTCFullYear();
  const mo = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${mo}`;
}

export function loadMonthGoalUah(storage = globalThis.localStorage, fallback = 6000) {
  try {
    const raw = storage?.getItem?.(MONTH_GOAL_KEY);
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 500 && n <= 500000) return Math.round(n);
  } catch {
    /* ignore */
  }
  const fb = Number(fallback);
  return Number.isFinite(fb) && fb > 0 ? Math.round(fb) : 6000;
}

/** Soft default: max(4× week budget, spent×1.15 rounded to 500). Used when no saved goal. */
export function suggestMonthGoalUah(spentUah, weekBudget = 1500) {
  const base = Math.max(Number(weekBudget) * 4 || 0, 1000);
  const spent = Number(spentUah) || 0;
  if (!(spent > 0)) return Math.round(base);
  const soft = Math.ceil((spent * 1.15) / 500) * 500;
  return Math.min(500000, Math.max(base, soft, 1000));
}

/** Saved goal wins; else suggest from spend + week budget. */
export function resolveMonthGoalUah(storage = globalThis.localStorage, opts = {}) {
  try {
    const raw = storage?.getItem?.(MONTH_GOAL_KEY);
    if (raw != null && String(raw).trim() !== "") {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 500 && n <= 500000) return { goalUah: Math.round(n), saved: true };
    }
  } catch {
    /* ignore */
  }
  const goalUah = suggestMonthGoalUah(opts.spentUah, opts.weekBudget);
  return { goalUah, saved: false };
}

export function saveMonthGoalUah(uah, storage = globalThis.localStorage) {
  const n = Math.round(Number(uah));
  if (!Number.isFinite(n) || n < 500 || n > 500000) throw new Error("goal_range");
  storage?.setItem?.(MONTH_GOAL_KEY, String(n));
  return n;
}

/**
 * Week-over-week delta from pulse.series (last two weeks with spend, else last two buckets).
 * @returns {{ pct: number, curUah: number, prevUah: number } | null}
 */
export function weekOverWeekDelta(series) {
  const list = Array.isArray(series) ? series : [];
  if (list.length < 2) return null;
  let cur = list[list.length - 1];
  let prev = list[list.length - 2];
  const withSpend = list.filter((s) => Number(s.uah) > 0);
  if (withSpend.length >= 2) {
    cur = withSpend[withSpend.length - 1];
    prev = withSpend[withSpend.length - 2];
  }
  const curUah = Number(cur?.uah) || 0;
  const prevUah = Number(prev?.uah) || 0;
  if (prevUah <= 0) return null;
  const pct = Math.round(((curUah - prevUah) / prevUah) * 100);
  return { pct, curUah, prevUah };
}

/**
 * Compare two newest receipts by totalUah.
 * @returns {{ pct: number, newerUah: number, olderUah: number } | null}
 */
export function receiptPairDelta(receipts) {
  const dated = (Array.isArray(receipts) ? receipts : [])
    .filter((r) => r?.at && typeof r.totalUah === "number" && Number.isFinite(r.totalUah) && r.totalUah > 0)
    .slice()
    .sort((a, b) => new Date(b.at) - new Date(a.at));
  if (dated.length < 2) return null;
  const newerUah = dated[0].totalUah;
  const olderUah = dated[1].totalUah;
  if (!(olderUah > 0)) return null;
  const pct = Math.round(((newerUah - olderUah) / olderUah) * 100);
  return { pct, newerUah, olderUah };
}

/** Month-over-month spend delta for narrative kicker. */
export function monthOverMonthDelta(receipts, monthKey = currentMonthKey()) {
  const list = Array.isArray(receipts) ? receipts : [];
  const [y, m] = String(monthKey).split("-").map(Number);
  if (!y || !m) return null;
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const sumMonth = (key) => {
    let s = 0;
    for (const r of list) {
      if (monthKeyFromAt(r.at) !== key) continue;
      for (const line of r.lines || []) {
        if (typeof line.price === "number" && Number.isFinite(line.price)) s += line.price;
      }
    }
    return Math.round(s * 100) / 100;
  };
  const cur = sumMonth(monthKey);
  const older = sumMonth(prev);
  if (!(older > 0) || !(cur >= 0)) return null;
  const pct = Math.round(((cur - older) / older) * 100);
  return { pct, curUah: cur, prevUah: older, prevMonthKey: prev };
}

/** UA story line for chart context (not MCP jargon). */
export function monthStoryLine(receipts, monthKey = currentMonthKey()) {
  const mom = monthOverMonthDelta(receipts, monthKey);
  if (!mom) return null;
  if (mom.pct > 8) return `Минулий місяць був спокійніший — зараз темп вищий на ${mom.pct}%`;
  if (mom.pct < -8) return `Цей місяць уже легший за попередній на ${Math.abs(mom.pct)}%`;
  return `Ритм близький до минулого місяця`;
}

/**
 * Per-week expensive lines for spark/bar tips.
 * @returns {Array<{ weekStart: string, uah: number, items: Array<{name:string,uah:number,at:string|null}> }>}
 */
export function weekExpensivePeaks(receipts, series, opts = {}) {
  const topN = Math.max(1, Number(opts.topN) || 2);
  const minUah = Number(opts.minUah) || 120;
  const list = Array.isArray(receipts) ? receipts : [];
  const weeks = Array.isArray(series) ? series : [];
  return weeks.map((w) => {
    /** @type {Record<string, { uah: number, at: string|null, peakLine: number }>} */
    const byName = {};
    for (const r of list) {
      if (weekStartISO(r.at) !== w.weekStart) continue;
      const rat = r.at || null;
      for (const line of r.lines || []) {
        if (typeof line.price !== "number" || !Number.isFinite(line.price) || line.price < minUah) continue;
        const name = String(line.name || "").trim() || "—";
        const prev = byName[name];
        if (!prev) {
          byName[name] = { uah: line.price, at: rat, peakLine: line.price };
          continue;
        }
        let at = prev.at;
        if (line.price > prev.peakLine) at = rat;
        else if (line.price === prev.peakLine && rat) {
          const prevT = at ? Date.parse(at) : 0;
          const curT = Date.parse(rat) || 0;
          if (curT >= prevT) at = rat;
        }
        byName[name] = {
          uah: prev.uah + line.price,
          at,
          peakLine: Math.max(prev.peakLine, line.price),
        };
      }
    }
    const items = Object.entries(byName)
      .map(([name, v]) => ({
        name,
        uah: Math.round(v.uah * 100) / 100,
        at: v.at,
      }))
      .sort((a, b) => b.uah - a.uah)
      .slice(0, topN);
    return { weekStart: w.weekStart, uah: Number(w.uah) || 0, items };
  });
}

/**
 * Per-day expensive lines for daily spark tips.
 * @returns {Array<{ weekStart: string, dayStart: string, uah: number, items: Array<{name:string,uah:number,at:string|null}> }>}
 */
export function dayExpensivePeaks(receipts, series, opts = {}) {
  const topN = Math.max(1, Number(opts.topN) || 2);
  const minUah = Number(opts.minUah) || 120;
  const list = Array.isArray(receipts) ? receipts : [];
  const days = Array.isArray(series) ? series : [];
  return days.map((w) => {
    const day = w.dayStart || w.weekStart;
    /** @type {Record<string, { uah: number, at: string|null, peakLine: number }>} */
    const byName = {};
    for (const r of list) {
      if (dayKeyISO(r.at) !== day) continue;
      const rat = r.at || null;
      for (const line of r.lines || []) {
        if (typeof line.price !== "number" || !Number.isFinite(line.price) || line.price < minUah) continue;
        const name = String(line.name || "").trim() || "—";
        const prev = byName[name];
        if (!prev) {
          byName[name] = { uah: line.price, at: rat, peakLine: line.price };
          continue;
        }
        let at = prev.at;
        if (line.price > prev.peakLine) at = rat;
        else if (line.price === prev.peakLine && rat) {
          const prevT = at ? Date.parse(at) : 0;
          const curT = Date.parse(rat) || 0;
          if (curT >= prevT) at = rat;
        }
        byName[name] = {
          uah: prev.uah + line.price,
          at,
          peakLine: Math.max(prev.peakLine, line.price),
        };
      }
    }
    const items = Object.entries(byName)
      .map(([name, v]) => ({
        name,
        uah: Math.round(v.uah * 100) / 100,
        at: v.at,
      }))
      .sort((a, b) => b.uah - a.uah)
      .slice(0, topN);
    return { weekStart: day, dayStart: day, uah: Number(w.uah) || 0, items };
  });
}

/** UA insight line for home pulse. Prefer WoW, else remaining goal, else receipt pair. */
export function pulseInsightLine(pulse, receipts) {
  const wow = weekOverWeekDelta(pulse?.series);
  if (wow) {
    if (wow.pct > 0) return `Цей тиждень на ${wow.pct}% дорожчий за минулий тиждень`;
    if (wow.pct < 0) return `Цей тиждень на ${Math.abs(wow.pct)}% дешевший за минулий тиждень`;
    return "Цей тиждень майже як минулий тиждень";
  }
  const goal = Number(pulse?.goalUah) || 0;
  const spent = Number(pulse?.spentUah) || 0;
  if (goal > 0) {
    const left = Math.round((goal - spent) * 100) / 100;
    if (left > 0) return `Ще ≈ ${left.toLocaleString("uk-UA", { maximumFractionDigits: 0 })} ₴ до орієнтира місяця`;
    if (left < 0) return `Орієнтир перевищено на ${Math.abs(left).toLocaleString("uk-UA", { maximumFractionDigits: 0 })} ₴`;
  }
  const pair = receiptPairDelta(receipts);
  if (pair) {
    if (pair.pct > 0) return `Останній чек на ${pair.pct}% більший за попередній`;
    if (pair.pct < 0) return `Останній чек на ${Math.abs(pair.pct)}% менший за попередній`;
    return "Останні два чеки майже рівні";
  }
  return null;
}

/** Collapse near-duplicate SKU titles (quotes / brand order) for month top list. */
export function mergeTopExpensiveLines(items, topN = 5) {
  const list = (Array.isArray(items) ? items : [])
    .slice()
    .sort((a, b) => (Number(b.uah) || 0) - (Number(a.uah) || 0));
  /** @type {Array<{ name: string, uah: number, at: string|null, key: string }>} */
  const out = [];
  for (const it of list) {
    const key = topSkuMergeKey(it.name);
    const day = tipDayKey(it.at);
    const uah = Math.round((Number(it.uah) || 0) * 100) / 100;
    const twin = out.find((b) => {
      if (b.key === key) return true;
      if (!(day && tipDayKey(b.at) === day && Math.abs(b.uah - uah) < 0.05)) return false;
      if (topSkuOverlap(b.key, key)) return true;
      const headA = String(b.key || "").split(" ")[0];
      const headB = String(key || "").split(" ")[0];
      return Boolean(headA && headA === headB && headA.length >= 4);
    });
    if (!twin) {
      out.push({ name: it.name, uah, at: it.at || null, key });
      continue;
    }
    const sameDaySamePrice =
      day && tipDayKey(twin.at) === day && Math.abs(twin.uah - uah) < 0.05;
    if (!sameDaySamePrice) {
      twin.uah = Math.round((twin.uah + uah) * 100) / 100;
    }
    if ((it.name || "").length > (twin.name || "").length) twin.name = it.name;
    const tNew = it.at ? Date.parse(it.at) : 0;
    const tOld = twin.at ? Date.parse(twin.at) : 0;
    if (tNew >= tOld) twin.at = it.at || twin.at;
  }
  return out
    .sort((a, b) => b.uah - a.uah)
    .slice(0, topN)
    .map(({ name, uah, at }) => ({ name, uah, at }));
}

function tipDayKey(at) {
  if (!at) return "";
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function topSkuMergeKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[«»"'`„“]/g, "")
    .replace(/[^a-zа-яіїєґ0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((t) => t.length >= 3)
    .slice(0, 3)
    .join(" ");
}

function topSkuOverlap(a, b) {
  const ta = new Set(String(a || "").split(" ").filter(Boolean));
  const tb = String(b || "").split(" ").filter(Boolean);
  if (!ta.size || !tb.length) return false;
  let hits = 0;
  for (const t of tb) if (ta.has(t)) hits += 1;
  return hits >= Math.min(2, tb.length);
}

/**
 * Week buckets for the month chart: every Monday covering the month so far,
 * plus a prior-week anchor (last week before the month with spend, else immediate prev).
 * @returns {Array<{ weekStart: string, uah: number, receiptCount: number, prior?: boolean }>}
 */
export function buildMonthWeekChartSeries(receipts, monthKey, opts = {}) {
  const list = Array.isArray(receipts) ? receipts : [];
  const mk = monthKey || currentMonthKey();
  const [y, m] = String(mk).split("-").map(Number);
  if (!y || !m) return [];
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  let lastActiveDay = 0;
  for (const r of list) {
    if (monthKeyFromAt(r.at) !== mk) continue;
    const dk = dayKeyISO(r.at);
    if (!dk) continue;
    const dayN = Number(dk.slice(8, 10));
    if (dayN > lastActiveDay) lastActiveDay = dayN;
  }
  const now = new Date();
  if (currentMonthKey(now) === mk) {
    lastActiveDay = Math.max(lastActiveDay, now.getUTCDate());
  }
  if (!lastActiveDay) lastActiveDay = Math.min(daysInMonth, Number(opts.minDays) || 7);
  lastActiveDay = Math.min(Math.max(lastActiveDay, 1), daysInMonth);

  const monthStart = `${mk}-01`;
  const monthEnd = `${mk}-${String(lastActiveDay).padStart(2, "0")}`;
  const firstWeek = weekStartISO(`${monthStart}T12:00:00.000Z`);
  const lastWeek = weekStartISO(`${monthEnd}T12:00:00.000Z`);
  if (!firstWeek || !lastWeek) return [];

  const weekKeys = [];
  let cursor = firstWeek;
  while (cursor && cursor <= lastWeek) {
    weekKeys.push(cursor);
    const d = new Date(`${cursor}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + 7);
    cursor = weekStartISO(d.toISOString());
    if (!cursor || weekKeys.length > 6) break;
  }

  const sumWeek = (ws) => {
    let uah = 0;
    let receiptCount = 0;
    for (const r of list) {
      if (weekStartISO(r.at) !== ws) continue;
      receiptCount += 1;
      for (const line of r.lines || []) {
        if (typeof line.price === "number" && Number.isFinite(line.price)) uah += line.price;
      }
    }
    return { uah: Math.round(uah * 100) / 100, receiptCount };
  };

  /** Walk back from the week before month-start until we find spend (up to 6 weeks). */
  let priorKey = null;
  let priorStats = { uah: 0, receiptCount: 0 };
  {
    const d = new Date(`${firstWeek}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - 7);
    let key = weekStartISO(d.toISOString());
    for (let i = 0; i < 6 && key; i++) {
      const st = sumWeek(key);
      if (st.uah > 0 || i === 0) {
        priorKey = key;
        priorStats = st;
        if (st.uah > 0) break;
      }
      const back = new Date(`${key}T00:00:00.000Z`);
      back.setUTCDate(back.getUTCDate() - 7);
      key = weekStartISO(back.toISOString());
    }
  }

  const out = [];
  if (priorKey) {
    out.push({
      weekStart: priorKey,
      uah: priorStats.uah,
      receiptCount: priorStats.receiptCount,
      prior: true,
    });
  }
  for (const weekStart of weekKeys) {
    if (priorKey && weekStart === priorKey) continue;
    const st = sumWeek(weekStart);
    out.push({
      weekStart,
      uah: st.uah,
      receiptCount: st.receiptCount,
      prior: false,
    });
  }
  return out;
}

/**
 * Drop peek chart weeks that already appear on the neighbor (cur) panel.
 * Prevents mid-drag double day/badge at the panel seam (shared prior week).
 * @param {Array<{ weekStart?: string }>} peekSeries
 * @param {Array<{ weekStart?: string }>} neighborSeries
 * @param {"prev"|"next"} [side]
 */
export function seamDedupePeekSeries(peekSeries, neighborSeries, side = "prev") {
  const list = Array.isArray(peekSeries) ? peekSeries.slice() : [];
  const exclude = new Set(
    (Array.isArray(neighborSeries) ? neighborSeries : [])
      .map((s) => s?.weekStart)
      .filter(Boolean),
  );
  if (!list.length || !exclude.size) return list;
  const filtered = list.filter((s) => s?.weekStart && !exclude.has(s.weekStart));
  if (filtered.length >= 2) return filtered;
  if (side === "next") {
    while (list.length > 2 && exclude.has(list[0]?.weekStart)) list.shift();
    if (list.length > 1 && exclude.has(list[0]?.weekStart)) list.shift();
    return list;
  }
  while (list.length > 2 && exclude.has(list[list.length - 1]?.weekStart)) list.pop();
  if (list.length > 1 && exclude.has(list[list.length - 1]?.weekStart)) list.pop();
  return list;
}

/**
 * Continuous pan strip: prev (deduped) + cur + next (deduped).
 * @returns {{ series: Array, curStartIdx: number, curLen: number }}
 */
export function buildSparkPanStripSeries(prevSeries, curSeries, nextSeries) {
  return buildSparkPanStripFromNeighbors({
    older: [prevSeries],
    cur: curSeries,
    newer: [nextSeries],
  });
}

/**
 * Wider strip: older peeks (nearest-first) + cur + newer peeks (nearest-first), seam-deduped.
 * @returns {{
 *   series: Array,
 *   curStartIdx: number,
 *   curLen: number,
 *   nearestOlderLen: number,
 *   nearestNewerLen: number,
 *   segmentLens: number[],
 *   centerSegIndex: number,
 * }}
 */
export function buildSparkPanStripFromNeighbors({ older = [], cur = [], newer = [] } = {}) {
  const center = Array.isArray(cur) ? cur.slice() : [];
  let series = center.slice();
  let curStartIdx = 0;
  let nearestOlderLen = 0;
  let nearestNewerLen = 0;
  const olderList = (Array.isArray(older) ? older : []).filter((s) => Array.isArray(s) && s.length);
  const newerList = (Array.isArray(newer) ? newer : []).filter((s) => Array.isArray(s) && s.length);
  const olderLensNearestFirst = [];
  const newerLensNearestFirst = [];
  let firstOlder = true;
  for (const peek of olderList) {
    const deduped = seamDedupePeekSeries(peek, series, "prev");
    if (firstOlder) {
      nearestOlderLen = deduped.length;
      firstOlder = false;
    }
    olderLensNearestFirst.push(deduped.length);
    curStartIdx += deduped.length;
    series = deduped.concat(series);
  }
  let firstNewer = true;
  for (const peek of newerList) {
    const deduped = seamDedupePeekSeries(peek, series, "next");
    if (firstNewer) {
      nearestNewerLen = deduped.length;
      firstNewer = false;
    }
    newerLensNearestFirst.push(deduped.length);
    series = series.concat(deduped);
  }
  const segmentLens = [...olderLensNearestFirst].reverse().concat([center.length], newerLensNearestFirst);
  const centerSegIndex = olderLensNearestFirst.length;
  return {
    series,
    curStartIdx,
    curLen: center.length,
    nearestOlderLen,
    nearestNewerLen,
    segmentLens,
    centerSegIndex,
  };
}

/**
 * Week-starts visible after landing on nearest older/newer peek (same pitch/rest math as UI).
 * Used to assert land frame ≡ next month rest viewport when peeks share pitch.
 */
export function sparkLandWeekStarts(strip, side = "prev") {
  const series = Array.isArray(strip?.series) ? strip.series : [];
  const curStart = Number(strip?.curStartIdx) || 0;
  const curLen = Number(strip?.curLen) || 0;
  if (side === "next") {
    const n = Number(strip?.nearestNewerLen) || 0;
    return series.slice(curStart + curLen, curStart + curLen + n).map((s) => s?.weekStart).filter(Boolean);
  }
  const n = Number(strip?.nearestOlderLen) || 0;
  return series.slice(curStart - n, curStart).map((s) => s?.weekStart).filter(Boolean);
}

/**
 * Nav keys are newest-first. older = prev months (nearest first), newer = next months.
 * @param {string[]} monthKeys
 * @param {string} monthKey
 * @param {number} [depth]
 */
export function neighborMonthKeys(monthKeys, monthKey, depth = 2) {
  const keys = Array.isArray(monthKeys) ? monthKeys : [];
  const idx = keys.indexOf(monthKey);
  const older = [];
  const newer = [];
  if (idx < 0) return { older, newer, idx };
  const dMax = Math.max(1, Math.round(Number(depth) || 2));
  for (let d = 1; d <= dMax; d++) {
    if (keys[idx + d]) older.push(keys[idx + d]);
    if (keys[idx - d]) newer.push(keys[idx - d]);
  }
  return { older, newer, idx };
}

/** Max week spend across all receipts — stable Y domain when month strip max jumps. */
export function historyWeekSpendMax(receipts) {
  const list = Array.isArray(receipts) ? receipts : [];
  const byWeek = new Map();
  for (const r of list) {
    const ws = weekStartISO(r.at);
    if (!ws) continue;
    let sum = byWeek.get(ws) || 0;
    for (const line of r.lines || []) {
      if (typeof line.price === "number" && Number.isFinite(line.price)) sum += line.price;
    }
    byWeek.set(ws, sum);
  }
  let max = 0;
  for (const v of byWeek.values()) {
    if (v > max) max = v;
  }
  return Math.round(max * 100) / 100;
}

/**
 * Y-domain for craft spark: one scale for every month view / pan strip.
 * @param {Array<{ uah?: number }>} seriesStrip
 * @param {{ historyMax?: number, weekPace?: number, floor?: number }} [opts]
 */
export function sparkSharedYMax(seriesStrip, opts = {}) {
  const stripMax = Math.max(
    0,
    ...(Array.isArray(seriesStrip) ? seriesStrip : []).map((s) => Number(s?.uah) || 0),
  );
  const hist = Number(opts.historyMax) || 0;
  const pace = Number(opts.weekPace) || 0;
  const floor = Number(opts.floor) || 1;
  return Math.max(floor, stripMax, hist, pace > 0 ? pace * 1.2 : 0);
}

/**
 * @param {Array<{ id: string, at: string|null, lines: Array<{ name: string, price: number|null }> }>} receipts
 * @param {{ goalUah?: number, monthKey?: string, recentN?: number, topN?: number, seriesWeeks?: number }} [opts]
 */
export function aggregateMonthPulse(receipts, opts = {}) {
  const monthKey = opts.monthKey || currentMonthKey();
  const goalUah = Number(opts.goalUah);
  const goal = Number.isFinite(goalUah) && goalUah > 0 ? goalUah : 0;
  const recentN = Math.max(1, Number(opts.recentN) || 3);
  const topN = Math.max(1, Number(opts.topN) || 3);
  const seriesWeeks = Math.max(1, Number(opts.seriesWeeks) || 8);
  const list = Array.isArray(receipts) ? receipts : [];

  const inMonth = list.filter((r) => monthKeyFromAt(r.at) === monthKey);

  let pricedLines = 0;
  let totalLines = 0;
  let spentUah = 0;
  /** @type {Record<string, { uah: number, at: string|null, peakLine: number }>} */
  const byName = {};

  for (const r of inMonth) {
    const rat = r.at || null;
    for (const line of r.lines || []) {
      totalLines += 1;
      if (typeof line.price === "number" && Number.isFinite(line.price)) {
        pricedLines += 1;
        spentUah += line.price;
        const name = String(line.name || "").trim() || "—";
        const prev = byName[name];
        if (!prev) {
          byName[name] = { uah: line.price, at: rat, peakLine: line.price };
          continue;
        }
        let at = prev.at;
        if (line.price > prev.peakLine) at = rat;
        else if (line.price === prev.peakLine && rat) {
          const prevT = at ? Date.parse(at) : 0;
          const curT = Date.parse(rat) || 0;
          if (curT >= prevT) at = rat;
        }
        byName[name] = {
          uah: prev.uah + line.price,
          at,
          peakLine: Math.max(prev.peakLine, line.price),
        };
      }
    }
  }
  spentUah = Math.round(spentUah * 100) / 100;

  const topExpensive = mergeTopExpensiveLines(
    Object.entries(byName).map(([name, v]) => ({
      name,
      uah: Math.round(v.uah * 100) / 100,
      at: v.at,
    })),
    topN,
  );

  const dated = list
    .filter((r) => r.at && !Number.isNaN(new Date(r.at).getTime()))
    .slice()
    .sort((a, b) => new Date(b.at) - new Date(a.at));

  const recentReceiptIds = dated.slice(0, recentN).map((r) => r.id);

  const anchor = dated[0]?.at ? new Date(dated[0].at) : new Date(`${monthKey}-15T12:00:00.000Z`);
  const weekKeys = [];
  for (let i = seriesWeeks - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setUTCDate(d.getUTCDate() - i * 7);
    const ws = weekStartISO(d.toISOString());
    if (ws && !weekKeys.includes(ws)) weekKeys.push(ws);
  }
  while (weekKeys.length < seriesWeeks) {
    const first = weekKeys[0] ? new Date(`${weekKeys[0]}T00:00:00.000Z`) : anchor;
    first.setUTCDate(first.getUTCDate() - 7);
    const ws = weekStartISO(first.toISOString());
    if (!ws) break;
    weekKeys.unshift(ws);
  }
  const keys = weekKeys.slice(-seriesWeeks);

  const bucket = Object.fromEntries(keys.map((k) => [k, { uah: 0, receiptCount: 0 }]));
  for (const r of list) {
    const ws = weekStartISO(r.at);
    if (!ws || !bucket[ws]) continue;
    bucket[ws].receiptCount += 1;
    for (const line of r.lines || []) {
      if (typeof line.price === "number" && Number.isFinite(line.price)) {
        bucket[ws].uah += line.price;
      }
    }
  }

  const series = keys.map((weekStart) => ({
    weekStart,
    uah: Math.round(bucket[weekStart].uah * 100) / 100,
    receiptCount: bucket[weekStart].receiptCount,
  }));

  /** Daily series for month chart: every calendar day from 1 → last activity (or today). */
  const [yy, mm] = String(monthKey).split("-").map(Number);
  const daysInMonth =
    Number.isFinite(yy) && Number.isFinite(mm) ? new Date(Date.UTC(yy, mm, 0)).getUTCDate() : 31;
  let lastActiveDay = 0;
  for (const r of inMonth) {
    const dk = dayKeyISO(r.at);
    if (!dk) continue;
    const dayN = Number(dk.slice(8, 10));
    if (dayN > lastActiveDay) lastActiveDay = dayN;
  }
  const now = new Date();
  if (currentMonthKey(now) === monthKey) {
    lastActiveDay = Math.max(lastActiveDay, now.getUTCDate());
  }
  if (!lastActiveDay) lastActiveDay = Math.min(daysInMonth, 1);
  lastActiveDay = Math.min(Math.max(lastActiveDay, 1), daysInMonth);
  const dayKeys = [];
  for (let d = 1; d <= lastActiveDay; d++) {
    dayKeys.push(`${monthKey}-${String(d).padStart(2, "0")}`);
  }
  const dayBucket = Object.fromEntries(dayKeys.map((k) => [k, { uah: 0, receiptCount: 0 }]));
  for (const r of list) {
    const dk = dayKeyISO(r.at);
    if (!dk || !dayBucket[dk]) continue;
    dayBucket[dk].receiptCount += 1;
    for (const line of r.lines || []) {
      if (typeof line.price === "number" && Number.isFinite(line.price)) {
        dayBucket[dk].uah += line.price;
      }
    }
  }
  const daySeries = dayKeys.map((dayStart) => ({
    dayStart,
    weekStart: dayStart,
    uah: Math.round(dayBucket[dayStart].uah * 100) / 100,
    receiptCount: dayBucket[dayStart].receiptCount,
  }));

  const chartSeries = buildMonthWeekChartSeries(list, monthKey);

  return {
    monthKey,
    spentUah,
    goalUah: goal,
    coverage: { pricedLines, totalLines },
    series,
    daySeries,
    chartSeries,
    topExpensive,
    recentReceiptIds,
  };
}

/**
 * Map horizontal chart pan to neighbor month key.
 * Drag right (positive dx) → older `prevKey`; left → newer `nextKey`.
 * Below threshold → null (snap back). Pure; no DOM.
 */
export function monthKeyFromDragDx(dx, width, nav = {}, opts = {}) {
  const w = Math.max(1, Number(width) || 1);
  const ratio = Number(opts.thresholdRatio);
  const minPx = Number(opts.minPx);
  const thr = Math.max(Number.isFinite(minPx) ? minPx : 44, w * (Number.isFinite(ratio) ? ratio : 0.2));
  const x = Number(dx) || 0;
  if (x >= thr) return nav.prevKey || null;
  if (x <= -thr) return nav.nextKey || null;
  return null;
}
