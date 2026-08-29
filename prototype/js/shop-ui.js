/**
 * SilpoExpress main screen UI helpers (Checkout OS — ds411).
 * Pure HTML builders — no DOM.
 */

/**
 * Unified assist container: handoff + pantry share one elev card when both present.
 * @param {{ handoffHtml?: string, pantryHtml?: string }}
 */
export function shopAssistZoneHtml({ handoffHtml = "", pantryHtml = "" } = {}) {
  const handoff = String(handoffHtml || "").trim();
  const pantry = String(pantryHtml || "").trim();
  if (!handoff && !pantry) return "";
  const both = Boolean(handoff && pantry);
  return `<div class="shop-assist-zone shop-assist-zone--card${both ? " shop-assist-zone--dual" : ""}" aria-label="Підказки для списку">${handoff}${pantry}</div>`;
}

/** Pantry/handoff strip inside wallet card (ds439) — no outer elev card. */
export function shopAssistInlineHtml({ handoffHtml = "", pantryHtml = "" } = {}) {
  const handoff = String(handoffHtml || "").trim();
  const pantry = String(pantryHtml || "").trim();
  if (!handoff && !pantry) return "";
  const both = Boolean(handoff && pantry);
  return `<div class="shop-assist-zone shop-assist-zone--wallet-inline${both ? " shop-assist-zone--dual" : ""}" aria-label="Підказки для списку">${handoff}${pantry}</div>`;
}

/**
 * @param {{ okCount?: number, totalCount?: number, sumUah?: number, budgetUah?: number, acceptedLines?: Array<{ envelope?: string, name?: string, price?: number }>, monthKey?: string, isUserWaste?: (name: string, monthKey: string) => boolean }}
 */
export function shopSpendSplit(
  lines = [],
  { monthKey = "", isUserWaste = () => false } = {},
) {
  const moodEnvelopes = new Set(["alcohol", "tobacco"]);
  let baseUah = 0;
  let moodUah = 0;
  let userWasteUah = 0;
  for (const l of lines || []) {
    const price = Number(l.price) || 0;
    if (price <= 0) continue;
    const name = String(l.name || l.wanted || "");
    if (isUserWaste(name, monthKey)) {
      userWasteUah += price;
      continue;
    }
    const env = l.envelope || "food";
    if (moodEnvelopes.has(env)) moodUah += price;
    else baseUah += price;
  }
  const splitTotal = baseUah + moodUah + userWasteUah;
  const pct = (part) => (splitTotal > 0 ? Math.round((part / splitTotal) * 100) : 0);
  return {
    baseUah,
    moodUah,
    userWasteUah,
    splitTotal,
    basePct: pct(baseUah),
    moodPct: pct(moodUah),
    wastePct: pct(userWasteUah),
  };
}

/**
 * @param {{ okCount?: number, totalCount?: number, sumUah?: number, budgetUah?: number, acceptedLines?: Array, monthKey?: string, isUserWaste?: Function }}
 */
export function shopProgressMetrics(opts = {}) {
  const total = Math.max(0, Number(opts.totalCount) || 0);
  const ok = Math.max(0, Math.min(Number(opts.okCount) || 0, total || Number(opts.okCount) || 0));
  const budget = Math.max(0, Number(opts.budgetUah) || 0);
  const sum = Math.max(0, Number(opts.sumUah) || 0);
  const acceptPct = total > 0 ? Math.round((ok / total) * 100) : ok > 0 ? 100 : 0;
  const over = budget > 0 && sum > budget;
  // Spent/ceiling %; under ceiling never looks 100% full (keep ≥3% ghost headroom).
  let budgetPct = 0;
  if (budget > 0) {
    if (over) budgetPct = 100;
    else if (sum > 0) budgetPct = Math.min(97, Math.max(1, Math.round((sum / budget) * 100)));
  }
  const split = shopSpendSplit(opts.acceptedLines || [], {
    monthKey: opts.monthKey || "",
    isUserWaste: opts.isUserWaste,
  });
  return {
    ok,
    total,
    sum,
    budget,
    acceptPct,
    budgetPct,
    over,
    ...split,
  };
}

export function shopProgramBlockHtml({ title = "З програми", count = 0, rowsHtml = "" } = {}) {
  const body = String(rowsHtml || "").trim();
  if (!body) return "";
  const label = String(title || "програма").trim();
  return `<section class="shop-program-block" aria-label="З програми · ${label}">
    <header class="shop-program-block__head">
      <span class="shop-program-block__mark" aria-hidden="true"></span>
      <strong class="shop-program-block__title">З програми</strong>
      <span class="shop-program-block__prog muted">${label}</span>
      <span class="shop-program-block__n num">${Number(count) || 0}</span>
    </header>
    <div class="shop-program-block__rows">${body}</div>
  </section>`;
}

function shopSplitInnerHtml(baseUah, moodUah, wasteUah, { innerWidth = "100%" } = {}) {
  const splitTotal = baseUah + moodUah + wasteUah;
  if (splitTotal <= 0) return `<span class="shop-progress__split-inner" style="width:0"></span>`;
  return `<span class="shop-progress__split-inner" style="width:${innerWidth}">
      ${baseUah > 0 ? `<i class="shop-progress__split-base" style="flex:${baseUah}"></i>` : ""}
      ${moodUah > 0 ? `<i class="shop-progress__split-mood" style="flex:${moodUah}"></i>` : ""}
      ${wasteUah > 0 ? `<i class="shop-progress__split-waste" style="flex:${wasteUah}"></i>` : ""}
    </span>`;
}

/** Plain-text split breakdown for bar tooltip (ds438). */
export function shopSplitBarTitle(opts = {}, { moodUah = 0, wasteUah = 0 } = {}) {
  const parts = [`потрібне ${opts.baseLabel || "—"}`];
  if (moodUah > 0) parts.push(`настрій ${opts.moodLabel || "—"}`);
  if (wasteUah > 0) parts.push(`ваше зайве ${opts.wasteLabel || "—"}`);
  return parts.join(" · ");
}

/** @param {{ baseUah?: number, moodUah?: number, userWasteUah?: number, budgetPct?: number, splitTitle?: string }} split */
export function shopSplitComposeHtml(split = {}) {
  const baseUah = Number(split.baseUah) || 0;
  const moodUah = Number(split.moodUah) || 0;
  const wasteUah = Number(split.userWasteUah) || 0;
  const budgetPct = Number(split.budgetPct) || 0;
  const inner = shopSplitInnerHtml(baseUah, moodUah, wasteUah);
  const title = split.splitTitle || "Склад чеку vs стеля";
  return `<div class="shop-progress__compose" aria-hidden="true">
    <div class="shop-progress__compose-track" title="${title}">
      <div class="shop-progress__bar shop-progress__bar--split shop-progress__compose-fill" style="width:${budgetPct}%">${inner}</div>
    </div>
  </div>`;
}

/** One-line split caption under bar — only when mood or waste present (ds437). */
export function shopSplitCaptionHtml(opts = {}, { moodUah = 0, wasteUah = 0 } = {}) {
  if (moodUah <= 0 && wasteUah <= 0) return "";
  const parts = [`потрібне <span class="num">${opts.baseLabel || "—"}</span>`];
  if (moodUah > 0) parts.push(`настрій <span class="num">${opts.moodLabel || "—"}</span>`);
  if (wasteUah > 0) parts.push(`ваше зайве <span class="num">${opts.wasteLabel || "—"}</span>`);
  return `<p class="shop-progress__split-caption">${parts.join(" · ")}</p>`;
}

/** @deprecated visible micro-legend — kept for tests/export; not rendered in ds437 wallet UI */
export function shopSplitMicroLegendParts(opts = {}, { baseUah = 0, moodUah = 0, wasteUah = 0 } = {}) {
  const moodZero = moodUah <= 0;
  const wasteZero = wasteUah <= 0;
  return [
    `<span class="shop-progress__legend-item shop-progress__legend-item--need"><i aria-hidden="true"></i>потрібне <span class="num">${opts.baseLabel || "—"}</span></span>`,
    `<span class="shop-progress__legend-item shop-progress__legend-item--mood${moodZero ? " is-zero" : ""}"><i aria-hidden="true"></i>настрій <span class="num">${moodZero ? "—" : opts.moodLabel || "—"}</span></span>`,
    `<span class="shop-progress__legend-item shop-progress__legend-item--waste${wasteZero ? " is-zero" : ""}"><i aria-hidden="true"></i>ваше зайве <span class="num">${wasteZero ? "—" : opts.wasteLabel || "—"}</span></span>`,
  ].join("");
}

export function shopSplitMicroLegendHtml(opts = {}, split = {}) {
  const baseUah = Number(split.baseUah) || 0;
  const moodUah = Number(split.moodUah) || 0;
  const wasteUah = Number(split.wasteUah ?? split.userWasteUah) || 0;
  return `<div class="shop-progress__legend shop-progress__legend--micro">${shopSplitMicroLegendParts(opts, { baseUah, moodUah, wasteUah })}</div>`;
}

/** Grocery marks sprinkled into receipt `=` texture (fresh shuffle each call). */
const RECEIPT_CART_ICONS = ["🛒", "🍾", "🍞", "🥛", "🥚", "🍎", "🧀", "🧃", "🥫", "🐟", "🥕", "🧺", "🧴", "🍫"];

function shuffleInPlace(arr, rand = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

/** Build `=` run with occasional cart/product icons — random set + order every time. */
export function shopReceiptAsciiTexture(cols = 96, { withIcons = true } = {}) {
  const n = Math.max(8, Math.min(160, Number(cols) || 96));
  if (!withIcons) return "=".repeat(n);
  const pool = shuffleInPlace([...RECEIPT_CART_ICONS]);
  let poolIdx = 0;
  let gap = 3 + Math.floor(Math.random() * 4);
  let out = "";
  for (let i = 0; i < n; i++) {
    gap -= 1;
    if (gap <= 0) {
      if (poolIdx >= pool.length) {
        shuffleInPlace(pool);
        poolIdx = 0;
      }
      const icon = pool[poolIdx++];
      out += `<span class="shop-progress__ascii-icon" aria-hidden="true">${icon}</span>`;
      gap = 5 + Math.floor(Math.random() * 7);
    } else {
      out += "=";
    }
  }
  return out;
}

/**
 * Receipt budget bar: fill width = spent/ceiling %.
 * Ink `=` + grocery icons in spent zone; ghost `=` = headroom; over → 100% fill.
 */
export function shopReceiptAsciiBarHtml(budgetPct = 0, { cols = 96, over = false } = {}) {
  const raw = Math.max(0, Number(budgetPct) || 0);
  const pct = over ? 100 : Math.min(97, Math.max(0, raw));
  const fillGlyphs = shopReceiptAsciiTexture(cols, { withIcons: true });
  const restGlyphs = "=".repeat(Math.max(8, Math.min(160, Number(cols) || 96)));
  const label = over
    ? "Стелю перевищено — бар повний"
    : `Витрачено ${Math.round(raw)}% стелі`;
  return `<div class="shop-progress__ascii-bar" style="--budget-pct:${over ? 100 : pct}" role="img" aria-label="${label}" title="${label}"><span class="shop-progress__ascii-fill">${fillGlyphs}</span><span class="shop-progress__ascii-rest">${restGlyphs}</span></div>`;
}

/**
 * @param {{ okCount: number, totalCount: number, sumLabel: string, budgetLabel: string, acceptPct: number, budgetPct: number, over?: boolean, sportExtraN?: number, loading?: boolean, baseLabel?: string, moodLabel?: string, wasteLabel?: string, baseUah?: number, moodUah?: number, userWasteUah?: number, remainLabel?: string, remainOver?: boolean, whisperLine?: string, whisperHtml?: string, whisperTip?: string, innerFooterHtml?: string }}
 */
export function shopProgressStripHtml(opts = {}) {
  if (opts.loading) {
    return `<div class="shop-progress shop-progress--loading" aria-hidden="true"><div class="shop-progress__compose"><div class="shop-progress__compose-track"><div class="shop-progress__compose-fill" style="width:24%"></div></div></div></div>`;
  }
  const sportBit =
    Number(opts.sportExtraN) > 0
      ? `<span class="shop-progress__sport">з програми · ${Number(opts.sportExtraN)}</span>`
      : "";
  const over = Boolean(opts.over);
  const baseUah = Number(opts.baseUah) || 0;
  const moodUah = Number(opts.moodUah) || 0;
  const wasteUah = Number(opts.userWasteUah) || 0;
  const remainOver = Boolean(opts.remainOver ?? over);
  const remainPrefix = remainOver ? "перевищено на" : "залишилось";
  const remainLabel = opts.remainLabel || "—";
  const budgetPct = Number(opts.budgetPct) || 0;
  const splitTitle = shopSplitBarTitle(opts, { moodUah, wasteUah });
  const composeHtml = shopSplitComposeHtml({
    baseUah,
    moodUah,
    userWasteUah: wasteUah,
    budgetPct,
    splitTitle,
  });
  const asciiBar = shopReceiptAsciiBarHtml(budgetPct, { over });
  const whisperHtml =
    opts.whisperHtml ||
    (opts.whisperLine
      ? `<p class="shop-progress__whisper-line"${opts.whisperTip ? ` title="${opts.whisperTip}"` : ""}>${opts.whisperLine}</p>`
      : "");
  const innerFooter = String(opts.innerFooterHtml || "");
  const shellClass = innerFooter || whisperHtml ? " shop-progress__wallet-card--shell" : "";
  const tight = !over && budgetPct >= 90;
  const totalLabel = opts.totalCount || opts.okCount;
  const sumText = String(opts.sumLabel || "—");
  const sumWithUah = /₴|грн/i.test(sumText) ? sumText : `${sumText} ₴`;
  return `<div class="shop-progress shop-progress--inline shop-progress--split shop-progress--hero shop-progress--wallet shop-progress--premium shop-progress--receipt${over ? " shop-progress--over" : ""}${tight ? " shop-progress--tight" : ""}" role="status" aria-live="polite">
    <div class="shop-progress__receipt-wrap">
      <span class="shop-progress__receipt-tape" aria-hidden="true"></span>
      <div class="shop-progress__wallet-card${shellClass}">
      <div class="shop-progress__money-zone">
        <div class="shop-progress__hero">
          <div class="shop-progress__hero-main">
            <div class="shop-progress__receipt-sum-head">
              <span class="shop-progress__ticket-head">ЧЕК · <span class="num">${opts.okCount}/${totalLabel}</span> поз.</span>
              <span class="shop-progress__inline-sum num">${sumWithUah}</span>
              <div class="shop-progress__ticket-rule shop-progress__ticket-rule--dash" aria-hidden="true">- - - - - - - - - - - -</div>
            </div>
            <span class="shop-progress__hero-remain${remainOver ? " shop-progress__hero-remain--over" : ""}">${remainPrefix} <span class="num">${remainLabel}</span> / стеля <span class="num">${opts.budgetLabel}</span></span>
          </div>
          <span class="shop-progress__accept-inline num" title="Погоджено позицій">${opts.okCount}/${totalLabel}</span>
          ${sportBit}
        </div>
        ${asciiBar}
        <div class="shop-progress__compose shop-progress__compose--sr" hidden>${composeHtml}</div>
        <div class="shop-progress__ticket-rule shop-progress__ticket-rule--dots" aria-hidden="true">........................</div>
        ${whisperHtml}
      </div>
      ${innerFooter ? `<div class="shop-progress__receipt-fold">${innerFooter}</div>` : ""}
    </div>
    </div>
    <p class="shop-progress__meta shop-progress__meta--sr">
      <span class="num">${opts.okCount}/${opts.totalCount || opts.okCount}</span> погоджено
      <span class="shop-progress__dot" aria-hidden="true">·</span>
      <span class="num">${opts.sumLabel}</span>
      <span class="shop-progress__dot" aria-hidden="true">·</span>
      ${remainPrefix} <span class="num">${remainLabel}</span>
      <span class="shop-progress__dot" aria-hidden="true">·</span>
      потрібне <span class="num">${opts.baseLabel || "—"}</span>
      ${moodUah > 0 ? ` · настрій <span class="num">${opts.moodLabel}</span>` : ""}
      ${wasteUah > 0 ? ` · ваше зайве <span class="num">${opts.wasteLabel}</span>` : ""}
      <span class="shop-progress__dot" aria-hidden="true">·</span>
      стеля <span class="num">${opts.budgetLabel}</span>
      ${sportBit}
    </p>
  </div>`;
}

/** Checkout dock CTA with inline sum (ds441). */
export function shopDockCtaHtml({ okCount = 0, sumLabel = "—", loading = false, confirmed = false, pushing = false } = {}) {
  if (pushing) {
    return `<button type="button" class="primary dock-cta" id="print" disabled aria-busy="true" aria-label="Додаємо в кошик Сільпо">
      <span class="dock-cta__label">Додаємо в кошик…</span>
      <span class="dock-cta__sum num">${sumLabel}</span>
    </button>`;
  }
  if (confirmed) {
    return `<button type="button" class="primary dock-cta" id="print" aria-label="Відкрити кошик Сільпо">
      <span class="dock-cta__label">Відкрити кошик Сільпо</span>
      <span class="dock-cta__sum num">${sumLabel}</span>
    </button>`;
  }
  const n = Math.max(0, Number(okCount) || 0);
  return `<button type="button" class="primary dock-cta" id="print" ${loading || !n ? "disabled" : ""} aria-label="Погодити ${n} позицій і додати в кошик Сільпо на суму ${sumLabel}">
    <span class="dock-cta__label">Погодити ${n || "0"}</span>
    <span class="dock-cta__sum num">${sumLabel}</span>
  </button>`;
}

/** Roles of extras tagged from Sport day (for checklist rail). */
export function sportDayLineRoles(extraQueries = []) {
  return new Set(
    (extraQueries || [])
      .filter((q) => q?.from === "sport_day" && q?.role)
      .map((q) => String(q.role)),
  );
}
