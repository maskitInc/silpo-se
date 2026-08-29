/** Purchase-freshness beacons (research/19–20). Not LINE_STATUS / stock. */

import { classifySlot, slotStats } from "./groups.js";

/** @typedef {'P1'|'P2'|'P3'|'P4'} FreshnessClass */
/** @typedef {'none'|'pantry_check'|'due_soft'|'last_basket'} BeaconKind */

/** Explicit slot → class. Unlisted: envelope/cadence heuristic. */
const FRESHNESS_BY_SLOT = {
  "brd:loaf": "P1",
  "brd:dark": "P1",
  "brd:lavash": "P1",
  "brd:crisp": "P3",
  "pro:chicken": "P1",
  "pro:pork": "P1",
  "pro:beef": "P1",
  "pro:fish": "P1",
  "pro:sea": "P1",
  "pro:plant": "P3",
  "pro:eggs": "P1",
  "veg:pot": "P1",
  "veg:oni": "P1",
  "veg:gar": "P3",
  "veg:car": "P1",
  "veg:cuc": "P1",
  "veg:tom": "P1",
  "veg:let": "P1",
  "veg:gre": "P1",
  "can:tom": "P3",
  "can:cuc": "P3",
  "can:other": "P3",
  "ext:oil": "P3",
  "ext:mayo": "P3",
  "ext:sauce": "P3",
  "ext:smet": "P1",
  "dry:milk": "P1",
  "dry:yog": "P1",
  "cln:gel": "P3",
  "alc:beer": "P2",
  "tob:cig": "P2",
};

/**
 * @param {{ id?: string, envelope?: string, cadenceDays?: number }|string|null} slotOrId
 * @returns {FreshnessClass|null}
 */
export function freshnessClassOf(slotOrId) {
  if (!slotOrId) return null;
  const id = typeof slotOrId === "string" ? slotOrId : slotOrId.id;
  if (id && FRESHNESS_BY_SLOT[id]) return FRESHNESS_BY_SLOT[id];
  const env = typeof slotOrId === "object" ? slotOrId.envelope : null;
  const cadence = typeof slotOrId === "object" ? Number(slotOrId.cadenceDays) || 0 : 0;
  if (env === "tobacco" || env === "alcohol") return "P2";
  if (env === "clean" || cadence >= 30) return "P3";
  if (env === "food") return cadence >= 21 ? "P3" : "P1";
  return null;
}

/** Adapt historyCache receipts → slotStats history shape. */
export function receiptsAsHistory(receipts) {
  return [
    {
      orders: (receipts || []).map((r) => ({
        at: r.at || null,
        lines: r.lines || [],
      })),
    },
  ];
}

function lastDatedReceipt(receipts) {
  const list = (receipts || [])
    .filter((r) => r?.at && !Number.isNaN(Date.parse(r.at)))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return list[0] || null;
}

function slotInReceipt(slotId, receipt) {
  if (!slotId || !receipt) return false;
  return (receipt.lines || []).some((l) => classifySlot(l.name)?.id === slotId);
}

/**
 * Mid-check defaults (owner «продовжуй»): P1 recent silence · P2 mute day-nag · Express beacons.
 * @param {{ name?: string, wanted?: string, role?: string }} line
 * @param {Array<{ at?: string|null, lines?: Array<{ name?: string }> }>} receipts
 * @param {number} [now]
 */
export function beaconForLine(line, receipts, now = Date.now()) {
  const name = String(line?.name || line?.wanted || line?.role || "").trim();
  if (!name) return { kind: "none", class: null, copy: "", tip: "", daysAgo: null, slotId: null };
  const slot = classifySlot(name);
  if (!slot) return { kind: "none", class: null, copy: "", tip: "", daysAgo: null, slotId: null };
  const cls = freshnessClassOf(slot);
  const stats = slotStats(receiptsAsHistory(receipts), now);
  const st = stats.byId[slot.id];
  // Honesty: never fire day-based beacons from inferred 7d-spaced times
  const days =
    st?.daysAgoDated != null && Number.isFinite(st.daysAgoDated) ? st.daysAgoDated : null;
  const half = slot.cadenceDays * 0.5;
  const dueCut = slot.cadenceDays * 0.65;

  if (cls === "P2") {
    const last = lastDatedReceipt(receipts);
    if (last && slotInReceipt(slot.id, last)) {
      return {
        kind: "last_basket",
        class: cls,
        copy: "було в останньому кошику",
        tip: "Якщо ще є вдома — зніми з чеку. Дні тут слабкий сигнал · орієнтир з чеків.",
        daysAgo: days,
        slotId: slot.id,
      };
    }
    return { kind: "none", class: cls, copy: "", tip: "", daysAgo: days, slotId: slot.id };
  }

  if (cls === "P1") {
    if (days == null) {
      return { kind: "none", class: cls, copy: "", tip: "", daysAgo: null, slotId: slot.id };
    }
    // Recent → silence (likely eaten/spoiled) — no fridge nag
    if (days < Math.min(3, half)) {
      return { kind: "none", class: cls, copy: "", tip: "", daysAgo: days, slotId: slot.id };
    }
    if (days >= dueCut) {
      return {
        kind: "due_soft",
        class: cls,
        copy: `давно купував (~${Math.round(days)} дн.)`,
        tip: "Схоже, час брати знову — орієнтир з чеків, не інвентар.",
        daysAgo: days,
        slotId: slot.id,
      };
    }
    return { kind: "none", class: cls, copy: "", tip: "", daysAgo: days, slotId: slot.id };
  }

  if (cls === "P3") {
    const pantryTip =
      "Перевір, чи ще є вдома — зніми з чеку, якщо так. Орієнтир з чеків, не інвентар.";
    if (days != null && days < half) {
      const n = Math.round(days);
      return {
        kind: "pantry_check",
        class: cls,
        copy: n > 0 ? `~${n} дн. · перевір чи є` : "нещодавно · перевір чи є",
        tip: pantryTip,
        daysAgo: days,
        slotId: slot.id,
      };
    }
    if (st.count === 0) {
      return {
        kind: "due_soft",
        class: cls,
        copy: "давно не купував · перевір чи є",
        tip: pantryTip,
        daysAgo: null,
        slotId: slot.id,
      };
    }
    if (days != null && days >= dueCut) {
      return {
        kind: "due_soft",
        class: cls,
        copy: `давно (~${Math.round(days)} дн.) · перевір чи є`,
        tip: pantryTip,
        daysAgo: days,
        slotId: slot.id,
      };
    }
    // Seen only via inferred dates → silence
    if (days == null) {
      return { kind: "none", class: cls, copy: "", tip: "", daysAgo: null, slotId: slot.id };
    }
  }

  return { kind: "none", class: cls, copy: "", tip: "", daysAgo: days, slotId: slot.id };
}

/**
 * One-line shop header summary of pantry / due-soft beacons on the checklist.
 * Prefer accepted lines when any are checked; else all lines with a name.
 * @param {Array<{ name?: string, wanted?: string, role?: string, staple?: string }>} lines
 * @param {Array<{ at?: string|null, lines?: Array<{ name?: string }> }>} receipts
 * @param {Record<string, boolean>|null} [accepted]
 * @param {number} [now]
 * @param {{ stapleAllowlist?: string[], preferSport?: boolean }} [opts]
 *   When preferSport + allowlist: rank staple-overlapping P3 hits first for header names;
 *   if none overlap, fall back to full nudge (avoids empty Шафа after Sport handoff).
 * @returns {{ count: number, names: string[], roles: string[], copy: string, tip: string, kind: BeaconKind, sportScoped?: boolean }|null}
 */
export function shopPantryNudge(lines, receipts, accepted = null, now = Date.now(), opts = {}) {
  const list = Array.isArray(lines) ? lines : [];
  const hasAccepted = accepted && typeof accepted === "object";
  const anyOk = hasAccepted && list.some((l) => l?.role && accepted[l.role] === true);
  const scoped = list.filter((l) => {
    const name = String(l?.name || l?.wanted || "").trim();
    if (!name) return false;
    if (anyOk) return Boolean(l?.role && accepted[l.role] === true);
    return true;
  });

  const staples = (opts.stapleAllowlist || [])
    .map((s) => String(s || "").trim().toLowerCase())
    .filter(Boolean);
  const preferSport = Boolean(opts.preferSport && staples.length);
  const lineIsSport = (l) => {
    if (!staples.length) return false;
    const hay = `${l?.staple || ""} ${l?.wanted || ""} ${l?.name || ""}`.toLowerCase();
    return staples.some((s) => hay.includes(s));
  };

  const rank = { pantry_check: 0, due_soft: 1 };
  const hits = [];
  for (const l of scoped) {
    const b = beaconForLine(l, receipts, now);
    // Header = «перевірте» only (P3 pantry / P3 due). P1 due_soft stays on row.
    if (!b || b.kind === "none") continue;
    if (b.kind === "pantry_check") {
      /* ok */
    } else if (b.kind === "due_soft" && b.class === "P3") {
      /* ok */
    } else {
      continue;
    }
    const label = String(l.staple || l.wanted || l.name || "")
      .replace(/\s+/g, " ")
      .trim();
    hits.push({
      kind: b.kind,
      tip: b.tip || "",
      role: l.role ? String(l.role) : "",
      daysAgo: b.daysAgo,
      label: label.length > 28 ? `${label.slice(0, 27)}…` : label,
      rank: rank[b.kind] ?? 9,
      sportMatch: lineIsSport(l),
    });
  }
  if (!hits.length) return null;

  let used = hits;
  let sportScoped = false;
  if (preferSport) {
    const preferred = hits.filter((h) => h.sportMatch);
    if (preferred.length) {
      used = preferred;
      sportScoped = true;
    }
  }

  used = [...used].sort((a, b) => {
    if (preferSport && !sportScoped) {
      const d = Number(b.sportMatch) - Number(a.sportMatch);
      if (d) return d;
    }
    return a.rank - b.rank || a.label.localeCompare(b.label, "uk");
  });

  const names = [];
  const roles = [];
  const seen = new Set();
  const seenRole = new Set();
  for (const h of used) {
    const key = h.label.toLowerCase();
    if (h.label && !seen.has(key)) {
      seen.add(key);
      names.push(h.label);
    }
    if (h.role && !seenRole.has(h.role)) {
      seenRole.add(h.role);
      roles.push(h.role);
    }
  }
  const namesShow = names.slice(0, 3);
  const count = used.length;
  const nameBit = namesShow.slice(0, 2).join(", ");
  const more = count > 2 || namesShow.length > 2 ? "…" : "";
  const days0 = used[0]?.daysAgo;
  const daysBit =
    days0 != null && Number.isFinite(days0) ? ` · ~${Math.round(days0)} дн.` : "";
  let copy;
  if (count === 1) {
    copy = `${namesShow[0] || "позиція"}${daysBit}`;
  } else {
    copy = `${count} позиції${daysBit} · ${nameBit}${more}`;
  }
  if (sportScoped) {
    copy = `під програму · ${copy}`;
  }
  let tip =
    used[0]?.tip ||
    "Перевір, чи ще є вдома — зніми з чеку, якщо так. Орієнтир з чеків, не інвентар.";
  if (sportScoped) {
    tip =
      "Під staples програми · перевір, чи ще є вдома. Орієнтир з чеків, не інвентар.";
  }
  return { count, names: namesShow, roles, copy, tip, kind: used[0].kind, sportScoped };
}

/** Short chip on shop SKU rows — same action, less noise than beaconForLine copy. */
export const SKU_VERIFY_BADGE = "може ще є вдома";

/**
 * Pantry verify beacon for checkout rows (P3 pantry_check + P3 due_soft only).
 * @param {{ name?: string, wanted?: string, role?: string }} line
 * @param {Array<{ at?: string|null, lines?: Array<{ name?: string }> }>} receipts
 * @param {number} [now]
 */
export function skuVerifyBeacon(line, receipts, now = Date.now()) {
  const b = beaconForLine(line, receipts, now);
  if (b.kind === "pantry_check") {
    return {
      kind: "pantry_check",
      class: b.class,
      copy: SKU_VERIFY_BADGE,
      tip: b.tip || "",
      daysAgo: b.daysAgo,
      slotId: b.slotId,
    };
  }
  if (b.kind === "due_soft" && b.class === "P3") {
    return {
      kind: "pantry_check",
      class: b.class,
      copy: SKU_VERIFY_BADGE,
      tip: b.tip || "",
      daysAgo: b.daysAgo,
      slotId: b.slotId,
    };
  }
  return { kind: "none", class: null, copy: "", tip: "", daysAgo: null, slotId: null };
}

/**
 * Floor 10 soft outcome after pantry uncheck (session metrics).
 * @param {{ unchecks?: number, uahUnchecked?: number }} metrics
 */
export function pantryOutcomeCopy(metrics = {}) {
  const n = Math.max(0, Number(metrics.unchecks) || 0);
  const uah = Number(metrics.uahUnchecked);
  if (n <= 0) return "знято з чеку · ще може бути вдома";
  const base = n === 1 ? "знято 1 · менше дублю" : `знято ${n} · менше дублю`;
  if (Number.isFinite(uah) && uah > 0) {
    const rounded = Math.round(uah);
    return `${base} · ~${rounded} ₴`;
  }
  return base;
}

/** True when cadence-due should not boost compose score (P2). */
export function isMoodDiscretionarySlot(slot) {
  return freshnessClassOf(slot) === "P2";
}
