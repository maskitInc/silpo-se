/**
 * Shop recent-buy shelf + month stats whisper (ds428).
 * No pulse chart in header — research/21 boundary.
 */

import { isBagLine } from "./merge.js";
import { envelopeOf, toStaple } from "./staples.js";
import { normalizeWasteKey } from "./user-waste-labels.js";
import {
  aggregateMonthPulse,
  currentMonthKey,
  pulseInsightLine,
  weekOverWeekDelta,
} from "./spend.js";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function candidateKey(name, staple) {
  const s = staple || toStaple(name);
  return s || normalizeWasteKey(name);
}

function lineOnChecklist(vm, name, staple) {
  const n = normalizeWasteKey(name);
  return (vm?.lines || []).some((l) => {
    if (staple && (l.staple === staple || l.wanted === staple)) return true;
    return normalizeWasteKey(l.name) === n || normalizeWasteKey(l.wanted) === n;
  });
}

/**
 * SKUs from last receipts not yet on checklist / dismissed.
 * @param {object[]} receipts
 * @param {object|null} vm
 * @param {Set<string>|string[]} dismissed
 * @param {{ categoriesAllow?: string[], cap?: number, receiptCount?: number }} opts
 */
export function buildRecentBuyCandidates(receipts, vm, dismissed, opts = {}) {
  const allow = new Set(opts.categoriesAllow || ["food", "clean"]);
  const cap = opts.cap ?? 6;
  const receiptCount = opts.receiptCount ?? 2;
  const dismissedSet = dismissed instanceof Set ? dismissed : new Set(dismissed || []);

  const sorted = [...(receipts || [])]
    .filter((r) => r?.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, receiptCount);

  const seen = new Set();
  /** @type {Array<{ key: string, name: string, staple: string|null, price: number|null, at: string, receiptId: string, daysAgo: number|null }>} */
  const out = [];

  for (const receipt of sorted) {
    for (const line of receipt.lines || []) {
      const name = String(line?.name || "").trim();
      if (!name || isBagLine(name)) continue;
      const staple = toStaple(name) || null;
      const envelope = staple ? envelopeOf(staple) : "food";
      if (!allow.has(envelope)) continue;
      const key = candidateKey(name, staple);
      if (!key || seen.has(key) || dismissedSet.has(key)) continue;
      if (lineOnChecklist(vm, name, staple)) continue;
      seen.add(key);
      let daysAgo = null;
      if (receipt.at) {
        const d = Math.floor((Date.now() - Date.parse(receipt.at)) / 86400000);
        if (Number.isFinite(d) && d >= 0) daysAgo = d;
      }
      out.push({
        key,
        name,
        staple,
        price: typeof line.price === "number" ? line.price : null,
        at: receipt.at,
        receiptId: receipt.id,
        daysAgo,
      });
      if (out.length >= cap) return out;
    }
  }
  return out;
}

/** One-line month spend + WoW trail (no spark/goal ring). */
export function shopMonthWhisper(receipts, opts = {}) {
  const monthKey = opts.monthKey || currentMonthKey();
  const pulse = aggregateMonthPulse(receipts, { monthKey, goalUah: opts.goalUah });
  const spent = Number(pulse.spentUah) || 0;
  if (!(spent > 0)) return null;
  const [y, m] = monthKey.split("-").map(Number);
  const monthLabel =
    y && m
      ? new Date(y, m - 1, 1).toLocaleDateString("uk-UA", { month: "long" })
      : monthKey;
  const spentFmt = spent.toLocaleString("uk-UA", { maximumFractionDigits: 0 });
  const spentCompact = String(Math.round(spent));
  const wow = weekOverWeekDelta(pulse.series);
  let trail = "";
  if (wow) {
    if (wow.pct > 0) trail = `+${wow.pct}% vs минулий тиждень`;
    else if (wow.pct < 0) trail = `${wow.pct}% vs минулий тиждень`;
    else trail = "як минулий тиждень";
  }
  const fullLine = trail ? `${monthLabel} · ${spentFmt} ₴ · ${trail}` : `${monthLabel} · ${spentFmt} ₴`;
  let receiptLine = `${monthLabel} ${spentFmt}`;
  if (wow) {
    if (wow.pct > 0) receiptLine = `${monthLabel} ${spentFmt} +${wow.pct}%`;
    else if (wow.pct < 0) receiptLine = `${monthLabel} ${spentFmt} ${wow.pct}%`;
  }
  const tip = pulseInsightLine(pulse, receipts) || fullLine;
  const trailDir = wow ? (wow.pct > 0 ? "up" : wow.pct < 0 ? "down" : "flat") : "";
  return {
    line: fullLine,
    receiptLine,
    shortLine: trail || `${monthLabel} · ${spentFmt} ₴`,
    trail,
    trailDir,
    tip,
  };
}

/** Whisper line with optional WoW color (ds439). */
export function shopWhisperLineHtml(whisper, esc = (s) => s, { receipt = false } = {}) {
  if (!whisper) return "";
  const raw = receipt && whisper.receiptLine ? whisper.receiptLine : whisper.line;
  if (!raw) return "";
  let inner = esc(raw);
  if (!receipt && whisper.trail && whisper.trailDir === "up") {
    inner = inner.replace(
      esc(whisper.trail),
      `<span class="shop-progress__whisper-wow shop-progress__whisper-wow--up">${esc(whisper.trail)}</span>`,
    );
  } else if (!receipt && whisper.trail && whisper.trailDir === "down") {
    inner = inner.replace(
      esc(whisper.trail),
      `<span class="shop-progress__whisper-wow shop-progress__whisper-wow--down">${esc(whisper.trail)}</span>`,
    );
  }
  return `<p class="shop-progress__whisper-line"${whisper.tip ? ` title="${esc(whisper.tip)}"` : ""}>${inner}</p>`;
}

/** Link to receipt history — lives next to month stats whisper. */
export function shopHistoryLinkHtml() {
  return `<button type="button" class="shop-history-link" id="open-lists" aria-label="Відкрити історію покупок">Історія покупок</button>`;
}

/** Month whisper + history entry in one row inside wallet card. */
export function shopWhisperWithHistoryHtml(whisper, esc = (s) => s, { receipt = false } = {}) {
  const line = shopWhisperLineHtml(whisper, esc, { receipt });
  const solo = !line;
  return `<div class="shop-progress__whisper-row${solo ? " shop-progress__whisper-row--solo" : ""}">${line}${shopHistoryLinkHtml()}</div>`;
}

/**
 * @param {ReturnType<typeof buildRecentBuyCandidates>} candidates
 */
export function shopRecentShelfHtml(candidates = []) {
  if (!candidates.length) return "";
  const chips = candidates
    .map((c) => {
      const day = c.daysAgo != null && c.daysAgo <= 21 ? `~${c.daysAgo} дн.` : "";
      const price =
        c.price != null
          ? `${c.price.toLocaleString("uk-UA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₴`
          : "";
      const meta = [day, price].filter(Boolean).join(" · ");
      return `<button type="button" class="shop-recent-chip" data-recent-add data-recent-key="${esc(c.key)}" data-recent-name="${esc(c.name)}" data-recent-receipt="${esc(c.receiptId)}" aria-label="Додати ${esc(c.name)} у чеклист">
      <span class="shop-recent-chip__name">${esc(c.name)}</span>
      ${meta ? `<span class="shop-recent-chip__meta">${esc(meta)}</span>` : ""}
      <span class="shop-recent-chip__add" aria-hidden="true">+</span>
    </button>`;
    })
    .join("");
  return `<details class="shop-recent-shelf">
    <summary class="shop-recent-shelf__summary"><span class="shop-recent-shelf__label">Нещодавно купували</span><span class="shop-recent-shelf__n">${candidates.length}</span></summary>
    <div class="shop-recent-shelf__body">
      <div class="shop-recent-shelf__row">${chips}</div>
    </div>
  </details>`;
}
