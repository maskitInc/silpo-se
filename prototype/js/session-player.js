/** Day session player — KB lines → timed steps; honest completions only. */

const SESSION_EVENTS_KEY = "silpo.sport.sessionEvents.v1";

/**
 * Heuristic duration from UA KB strings (plank 20с × 3, 1 хв, reps × sets).
 * @param {string} label
 * @returns {number} seconds, clamped 15–180
 */
export function estimateDurationSec(label) {
  const s = String(label || "");
  const minM = s.match(/(\d+)\s*хв/i);
  if (minM) return clampSec(Number(minM[1]) * 60);
  const secSets = s.match(/(\d+)\s*с\s*[×x]\s*(\d+)/i);
  if (secSets) return clampSec(Number(secSets[1]) * Number(secSets[2]));
  const secOnly = s.match(/(\d+)\s*с\b/i);
  if (secOnly) return clampSec(Number(secOnly[1]));
  const reps = s.match(/(\d+)\s*[×x]\s*(\d+)/i);
  if (reps) return clampSec(22 * Number(reps[2]));
  const bareReps = s.match(/(\d+)\s*(раз|на ногу|на бік)/i);
  if (bareReps) return clampSec(Math.max(30, Number(bareReps[1]) * 3));
  return 40;
}

function clampSec(n) {
  const v = Number(n) || 40;
  return Math.min(180, Math.max(15, Math.round(v)));
}

/**
 * @param {string[]} blocks
 * @returns {{ id: string, label: string, durationSec: number }[]}
 */
export function parseSessionSteps(blocks) {
  const list = Array.isArray(blocks) ? blocks : [];
  return list.map((label, i) => ({
    id: `step-${i}`,
    label: String(label || `Крок ${i + 1}`),
    durationSec: estimateDurationSec(label),
  }));
}

export function formatTimer(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/** Calendar day in Europe/Kyiv (YYYY-MM-DD) — honest UA midnight. */
export function dayKeyKyiv(at = new Date()) {
  const d = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Kyiv",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/** Shift a YYYY-MM-DD calendar label by ±n days (date arithmetic, not TZ). */
export function shiftDayKey(dayIso, delta = 0) {
  const m = String(dayIso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + Number(delta), 12, 0, 0));
  if (Number.isNaN(dt.getTime())) return "";
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function loadSessionEvents(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(SESSION_EVENTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list.filter(
      (e) =>
        e &&
        typeof e.day === "string" &&
        /^\d{4}-\d{2}-\d{2}/.test(e.day) &&
        Number(e.stepsDone) > 0,
    );
  } catch {
    return [];
  }
}

/**
 * Snapshot → persistable progress (null if untouched).
 * Mid-step after Start counts as at least 1 step toward partial %.
 */
export function sessionProgressFromSnapshot(st) {
  if (!st || !st.totalSteps) return null;
  const total = Math.max(1, Number(st.totalSteps) || 1);
  if (st.done) {
    return {
      stepsDone: total,
      stepsTotal: total,
      full: true,
      weight: 1,
      durationSec: Math.max(0, Number(st.elapsedTotal) || 0),
    };
  }
  const touched = Number(st.idx) > 0 || Number(st.elapsedTotal) > 0;
  if (!touched) return null;
  const stepsDone = Math.min(total, Math.max(Number(st.idx) || 0, Number(st.elapsedTotal) > 0 ? 1 : 0));
  if (stepsDone < 1) return null;
  const weight = Math.min(1, stepsDone / total);
  return {
    stepsDone,
    stepsTotal: total,
    full: false,
    weight,
    durationSec: Math.max(0, Number(st.elapsedTotal) || 0),
  };
}

/**
 * Persist session progress for a day — keep best weight (full upgrades partial).
 * @returns {object[]}
 */
export function noteSessionProgress(
  {
    programId = "",
    stepsDone = 0,
    stepsTotal = 0,
    durationSec = 0,
    full = false,
    at = new Date(),
  } = {},
  storage = globalThis.localStorage,
) {
  const d = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(d.getTime())) return loadSessionEvents(storage);
  const day = dayKeyKyiv(d);
  if (!day) return loadSessionEvents(storage);
  const done = Math.max(0, Number(stepsDone) || 0);
  if (done < 1) return loadSessionEvents(storage);
  const total = Math.max(done, Number(stepsTotal) || done);
  const isFull = Boolean(full) || done >= total;
  const weight = isFull ? 1 : Math.min(1, done / total);
  const prevList = loadSessionEvents(storage);
  const existing = prevList.find((e) => e.day === day);
  const prevWeight = existing
    ? existing.full
      ? 1
      : Math.min(1, (Number(existing.stepsDone) || 0) / Math.max(1, Number(existing.stepsTotal) || Number(existing.stepsDone) || 1))
    : 0;
  if (existing && prevWeight > weight + 1e-9) return prevList;
  if (existing && prevWeight === weight && (Number(existing.durationSec) || 0) >= (Number(durationSec) || 0) && existing.full === isFull) {
    return prevList;
  }
  const prev = prevList.filter((e) => e.day !== day);
  const next = [
    ...prev,
    {
      day,
      programId: String(programId || ""),
      stepsDone: done,
      stepsTotal: total,
      full: isFull,
      weight,
      durationSec: Math.max(0, Number(durationSec) || 0),
      at: d.toISOString(),
    },
  ].slice(-90);
  try {
    storage?.setItem?.(SESSION_EVENTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/** Full session complete (compat). */
export function noteSessionComplete(
  { programId = "", stepsDone = 0, durationSec = 0, stepsTotal = 0, at = new Date() } = {},
  storage = globalThis.localStorage,
) {
  const done = Math.max(0, Number(stepsDone) || 0);
  const total = Math.max(done, Number(stepsTotal) || done);
  return noteSessionProgress(
    { programId, stepsDone: done, stepsTotal: total, durationSec, full: true, at },
    storage,
  );
}

export function sessionDaysInMonth(monthKey, storage = globalThis.localStorage) {
  const mk = String(monthKey || "");
  return loadSessionEvents(storage).filter((e) => e.day.startsWith(mk)).length;
}

/** Weighted session score + full/partial day counts for orientir %. */
export function sessionMonthStats(monthKey, storage = globalThis.localStorage) {
  const mk = String(monthKey || "");
  let score = 0;
  let fullDays = 0;
  let partialDays = 0;
  for (const e of loadSessionEvents(storage)) {
    if (!e.day?.startsWith(mk)) continue;
    const total = Math.max(1, Number(e.stepsTotal) || Number(e.stepsDone) || 1);
    const w = e.full ? 1 : Math.min(1, Number(e.weight) || (Number(e.stepsDone) || 0) / total);
    score += w;
    if (w >= 1 || e.full) fullDays += 1;
    else partialDays += 1;
  }
  return {
    days: fullDays + partialDays,
    score: Math.round(score * 100) / 100,
    fullDays,
    partialDays,
  };
}

export function sessionDayIsos(storage = globalThis.localStorage) {
  return loadSessionEvents(storage)
    .map((e) => e.day)
    .filter(Boolean);
}

/**
 * Week buckets as { weekStart, uah: intensity } for barbell shaft.
 * Intensity = completed session duration (min 1) that week.
 * @param {object[]} events
 * @param {{ weekStart: string }[]} weekScaffold from pulse series
 */
export function activityWeekSeriesFromEvents(events, weekScaffold) {
  const weeks = Array.isArray(weekScaffold) ? weekScaffold : [];
  const list = Array.isArray(events) ? events : [];
  return weeks.map((w) => {
    const ws = w.weekStart;
    let intensity = 0;
    for (const e of list) {
      if (!ws || !e.day) continue;
      if (dayInWeek(e.day, ws)) {
        intensity += Math.max(1, Math.round((Number(e.durationSec) || 0) / 30));
      }
    }
    return { weekStart: ws, uah: intensity };
  });
}

function dayInWeek(dayIso, weekStartIso) {
  const day = Date.parse(`${dayIso}T12:00:00.000Z`);
  const start = Date.parse(`${weekStartIso}T00:00:00.000Z`);
  if (Number.isNaN(day) || Number.isNaN(start)) return false;
  const end = start + 7 * 86400000;
  return day >= start && day < end;
}

/**
 * Live controller — ticks without full page remount.
 * @param {{
 *   steps: { id: string, label: string, durationSec: number }[],
 *   onTick?: (st: object) => void,
 *   onStep?: (st: object) => void,
 *   onDone?: (st: object) => void
 * }} opts
 */
export function createSessionController(opts) {
  const steps = Array.isArray(opts.steps) && opts.steps.length
    ? opts.steps
    : [{ id: "empty", label: "Немає вправ", durationSec: 30 }];
  let idx = 0;
  let left = steps[0].durationSec;
  let running = false;
  let done = false;
  let elapsedTotal = 0;
  /** @type {number[]} intensity samples for mini wave */
  const wave = [];
  let timer = null;

  const snapshot = () => ({
    idx,
    left,
    running,
    done,
    step: steps[idx] || null,
    steps,
    totalSteps: steps.length,
    elapsedTotal,
    wave: wave.slice(),
    progress: (idx + (steps[idx] ? 1 - left / steps[idx].durationSec : 1)) / steps.length,
  });

  const emitTick = () => opts.onTick?.(snapshot());
  const emitStep = () => opts.onStep?.(snapshot());

  const clear = () => {
    if (timer != null) {
      clearInterval(timer);
      timer = null;
    }
  };

  const advance = () => {
    wave.push(Math.max(4, Math.round((steps[idx]?.durationSec || 40) / 8)));
    if (wave.length > 28) wave.splice(0, wave.length - 28);
    idx += 1;
    if (idx >= steps.length) {
      done = true;
      running = false;
      clear();
      opts.onDone?.(snapshot());
      emitTick();
      return;
    }
    left = steps[idx].durationSec;
    emitStep();
    emitTick();
  };

  const sampleLive = () => {
    const dur = steps[idx]?.durationSec || 40;
    const frac = 1 - left / dur;
    // Rising effort within step + slight step-index pulse (honest timer intensity).
    const effort = 1.2 + frac * 3.2 + (idx % 3) * 0.35;
    wave.push(Number(effort.toFixed(2)));
    if (wave.length > 28) wave.shift();
  };

  const tickOnce = () => {
    if (!running || done) return;
    left -= 1;
    elapsedTotal += 1;
    sampleLive();
    if (left <= 0) {
      advance();
      return;
    }
    emitTick();
  };

  return {
    snapshot,
    start() {
      if (done) return snapshot();
      running = true;
      clear();
      if (wave.length === 0) sampleLive();
      timer = setInterval(tickOnce, 1000);
      emitTick();
      return snapshot();
    },
    pause() {
      running = false;
      clear();
      emitTick();
      return snapshot();
    },
    toggle() {
      return running ? this.pause() : this.start();
    },
    skip() {
      if (done) return snapshot();
      left = 0;
      advance();
      return snapshot();
    },
    destroy() {
      clear();
      running = false;
    },
  };
}
