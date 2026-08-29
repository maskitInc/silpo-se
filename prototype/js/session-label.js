/**
 * Split KB session labels into display name + dose for Quiet ritual clock typography.
 * "Планка 20 с × 3" → { name: "Планка", dose: "20 с × 3" }
 * No trailing dose → dose "".
 */

/**
 * @param {string} label
 * @returns {{ name: string, dose: string }}
 */
export function splitSessionLabel(label) {
  const s = String(label || "").trim();
  if (!s) return { name: "—", dose: "" };
  const m = s.match(/^(.+?)\s+(\d.*)$/u);
  if (!m) return { name: s, dose: "" };
  return { name: m[1].trim(), dose: m[2].trim() };
}

/**
 * @param {string} label
 * @param {{ done?: boolean, upcoming?: boolean, esc: (s: string) => string }} opts
 * @returns {string} HTML
 */
export function sessionLabelHtml(label, { done = false, upcoming = false, esc }) {
  if (done) return esc("Сесію завершено");
  const { name, dose } = splitSessionLabel(label);
  const prefix = upcoming ? `<span class="session-player__upcoming">далі</span> ` : "";
  if (!dose) return `${prefix}<span class="session-player__move-name">${esc(name)}</span>`;
  return `${prefix}<span class="session-player__move-name">${esc(name)}</span> <span class="session-player__dose">${esc(dose)}</span>`;
}

/** Short name for rest guide (no dose). */
export function sessionLabelShortName(label) {
  return splitSessionLabel(label).name;
}
