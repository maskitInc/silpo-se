/**
 * Walk loop step *target* (goal), not a pedometer.
 * Phone counts steps; app only stores the user's target.
 */

export const WALK_STEPS_KEY = "silpo.sport.walkSteps.v1";
export const WALK_STEP_PRESETS = [4000, 6000, 8000];

export function clampWalkSteps(n) {
  const x = Math.round(Number(n) || 6000);
  return Math.max(1000, Math.min(20000, x));
}

export function loadWalkSteps(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(WALK_STEPS_KEY);
    if (!raw) return 6000;
    const parsed = JSON.parse(raw);
    return clampWalkSteps(parsed?.steps);
  } catch {
    return 6000;
  }
}

export function saveWalkSteps(n, storage = globalThis.localStorage) {
  const steps = clampWalkSteps(n);
  try {
    storage?.setItem?.(WALK_STEPS_KEY, JSON.stringify({ steps }));
  } catch {
    /* ignore quota */
  }
  return steps;
}
