/**
 * Sport × Express loop metrics (Epic 4).
 * Session funnel + honest dual-gate gap copy. Soft ration ≠ purchase.
 */

/**
 * @typedef {{
 *   enters: number,
 *   plateAdds: number,
 *   bulkAdds: number,
 *   dismisses: number,
 *   confirmSport: number
 * }} HandoffMetrics
 */

/** @returns {HandoffMetrics} */
export function emptyHandoffMetrics() {
  return { enters: 0, plateAdds: 0, bulkAdds: 0, dismisses: 0, confirmSport: 0 };
}

/**
 * @param {HandoffMetrics} metrics
 * @param {"enter"|"plate_add"|"bulk_add"|"dismiss"|"confirm_sport"} event
 * @param {number} [n]
 */
export function bumpHandoffMetric(metrics, event, n = 1) {
  const m = { ...(metrics || emptyHandoffMetrics()) };
  const add = Math.max(0, Number(n) || 0);
  if (event === "enter") m.enters += 1;
  else if (event === "plate_add") m.plateAdds += add || 1;
  else if (event === "bulk_add") m.bulkAdds += add || 1;
  else if (event === "dismiss") m.dismisses += 1;
  else if (event === "confirm_sport") m.confirmSport += 1;
  return m;
}

/**
 * Dual-gate gap — language: checklist / session, never «куплено» / fridge.
 * @param {{ ritualDays?: number, softRationHits?: number, uncoveredPlates?: number }} gates
 */
export function loopGapModel(gates = {}) {
  const ritualDays = Math.max(0, Number(gates.ritualDays) || 0);
  const softRationHits = Math.max(0, Number(gates.softRationHits) || 0);
  const uncovered = Math.max(0, Number(gates.uncoveredPlates) || 0);
  const hasSession = ritualDays >= 1;
  const hasRation = softRationHits >= 1;

  if (!hasSession && !hasRation) {
    return {
      side: "both",
      copy: "до dual-gate · сесія + раціон у чеклисті",
      tip: "Підйом = день з сесією ∧ раціон у чеклисті Express. «У чеклисті» ≠ куплено.",
    };
  }
  if (!hasSession) {
    return {
      side: "session",
      copy: "не вистачає сесії · Старт у дні",
      tip: "Раціон уже в чеклисті (м'яко). Щоб закрити dual-gate — пройди сесію сьогодні.",
    };
  }
  if (!hasRation) {
    return {
      side: "ration_checklist",
      copy:
        uncovered > 0
          ? `не вистачає раціону в чеклисті · ще ${uncovered} позицій`
          : "не вистачає раціону в чеклисті Express",
      tip: "М'який облік: додав у Express = у чеклисті, не купівля і не інвентар холодильника.",
    };
  }
  return {
    side: "none",
    copy: "сесія ∧ раціон у чеклисті",
    tip: "Обидва боки dual-gate є. Погодити в Express — окремий крок, ще не «куплено».",
  };
}

/**
 * Short session outcome after sport-linked Погодити (Floor 10 twin).
 * @param {HandoffMetrics} metrics
 */
export function handoffOutcomeCopy(metrics = {}) {
  const enters = Math.max(0, Number(metrics.enters) || 0);
  const plates = Math.max(0, Number(metrics.plateAdds) || 0);
  const bulk = Math.max(0, Number(metrics.bulkAdds) || 0);
  const confirms = Math.max(0, Number(metrics.confirmSport) || 0);
  if (confirms <= 0 && enters <= 0) return "";
  const bits = [];
  if (enters) bits.push(`вхід ${enters}`);
  if (plates) bits.push(`+${plates} у чеклист`);
  if (bulk) bits.push(`bulk ${bulk}`);
  if (confirms) bits.push(`погоджено ${confirms}`);
  return `цикл Sport→Express · ${bits.join(" · ")}`;
}
