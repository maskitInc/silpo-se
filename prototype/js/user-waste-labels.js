/**
 * User-labeled «зайве» (Epic 4.1) — system never guilt-copies without explicit user mark.
 * research/19d · research/26 · research/22
 */

export const WASTE_LABELS_KEY = "silpo.express.wasteLabels.v1";

/** Shown in month report only when user marked the SKU. */
export const USER_WASTE_ROW_LABEL = "Зайве (ви)";

/** System may say «дорого» / «ризик» — never «зайве» without user label. */
export const SYSTEM_HEAVY_ROW_LABEL = "Дорого";

/**
 * @typedef {{ key: string, name: string, monthKey?: string, at?: string|null, labeledAt: string }} WasteLabelEntry
 */

export function normalizeWasteKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * @param {import('node:fs').PathLike} [storage]
 * @returns {WasteLabelEntry[]}
 */
export function loadWasteLabels(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(WASTE_LABELS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveWasteLabels(list, storage = globalThis.localStorage) {
  try {
    storage?.setItem?.(WASTE_LABELS_KEY, JSON.stringify((list || []).slice(-120)));
  } catch {
    /* ignore */
  }
}

/**
 * @param {{ name: string, monthKey?: string, at?: string|null, now?: Date }} opts
 * @returns {{ labels: WasteLabelEntry[], on: boolean }}
 */
export function toggleWasteLabel(opts, storage = globalThis.localStorage) {
  const key = normalizeWasteKey(opts.name);
  if (!key) return { labels: loadWasteLabels(storage), on: false };
  const monthKey = String(opts.monthKey || "").trim();
  const prev = loadWasteLabels(storage);
  const idx = prev.findIndex((e) => e.key === key && (monthKey ? e.monthKey === monthKey : !e.monthKey));
  if (idx >= 0) {
    const next = prev.filter((_, i) => i !== idx);
    saveWasteLabels(next, storage);
    return { labels: next, on: false };
  }
  const entry = {
    key,
    name: String(opts.name || "").trim().slice(0, 120),
    ...(monthKey ? { monthKey } : {}),
    ...(opts.at ? { at: String(opts.at) } : {}),
    labeledAt: (opts.now || new Date()).toISOString(),
  };
  const next = [...prev, entry];
  saveWasteLabels(next, storage);
  return { labels: next, on: true };
}

export function isUserLabeledWaste(name, monthKey, storage = globalThis.localStorage) {
  const key = normalizeWasteKey(name);
  if (!key) return false;
  const mk = String(monthKey || "").trim();
  return loadWasteLabels(storage).some(
    (e) => e.key === key && (!mk || !e.monthKey || e.monthKey === mk),
  );
}

/**
 * Row label for month archive report top spenders.
 * @param {{ name: string, uah: number, goalUah?: number, monthKey?: string, labels?: WasteLabelEntry[] }}
 */
export function monthReportTopRowLabel({ name, uah, goalUah = 0, monthKey = "", labels }) {
  const goal = Number(goalUah) || 0;
  const heavy = goal > 0 ? Number(uah) > goal * 0.06 : Number(uah) > 400;
  const userWaste = isUserLabeledWasteFromList(name, monthKey, labels);
  return {
    k: userWaste ? USER_WASTE_ROW_LABEL : heavy ? SYSTEM_HEAVY_ROW_LABEL : SYSTEM_HEAVY_ROW_LABEL,
    userWaste,
    heavy,
  };
}

function isUserLabeledWasteFromList(name, monthKey, labels) {
  const key = normalizeWasteKey(name);
  if (!key) return false;
  const mk = String(monthKey || "").trim();
  return (labels || []).some((e) => e.key === key && (!mk || !e.monthKey || e.monthKey === mk));
}

/**
 * Build risky rows for archive month report (no system «Зайве?»).
 * @param {{ topItems?: Array<{ name?: string, uah?: number }>, goalUah?: number, monthKey?: string, labels?: WasteLabelEntry[] }}
 */
export function buildMonthReportRiskyTopRows({ topItems = [], goalUah = 0, monthKey = "", labels }) {
  const ls = labels ?? loadWasteLabels();
  const rows = [];
  for (const t of (topItems || []).slice(0, 3)) {
    const u = Number(t.uah) || 0;
    if (!(u > 0)) continue;
    const { k } = monthReportTopRowLabel({
      name: t.name,
      uah: u,
      goalUah,
      monthKey,
      labels: ls,
    });
    rows.push({ k, t: String(t.name || "").trim(), uah: u });
  }
  return rows;
}

/** True when copy would violate honesty ban (system «зайве» without user marker). */
export function copyUsesBannedWaste(text) {
  const s = String(text || "").toLocaleLowerCase("uk");
  if (!s.includes("зайв")) return false;
  if (s.includes("зайве (ви)")) return false;
  if (s.includes("ваша мітка") || s.includes("ви познач")) return false;
  return true;
}

export function wasteToggleAria(on) {
  return on ? "Зняти вашу мітку «зайве»" : "Позначити позицію як «зайве» — лише ваша мітка";
}

export function wasteToggleCopy(on) {
  return on ? "зайве ✓" : "+ зайве";
}
