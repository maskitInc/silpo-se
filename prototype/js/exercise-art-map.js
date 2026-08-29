/**
 * UA session-label stems → @bryllim/workout-guide CDN PNGs (plan A).
 * No npm: pinned jsDelivr URLs. Unmapped labels return null (timer still works).
 * Assets: CC BY-SA 4.0 (Everkinetic / Bryl Lim) — ship attribution in UI.
 *
 * Gender: @bryllim/workout-guide@1.0.0 has a single figure set (no female variants
 * in manifest / assets). Male↔female switch needs a separate asset pack — not in repo.
 */

export const WORKOUT_GUIDE_VERSION = "1.0.0";
export const WORKOUT_GUIDE_CDN =
  `https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@${WORKOUT_GUIDE_VERSION}`;

/** Longest stems first so "Віджимання з колін" wins over "Віджимання". */
const STEM_TO_SLUG = [
  ["дихання животом", "cat-cow-stretch"],
  ["дихання", "arm-circles"],
  ["віджимання з колін", "knee-push-up"],
  ["мертва комаха", "dead-bug"],
  ["кішка-корова", "cat-cow-stretch"],
  ["нахил до ніг", "toe-touch"],
  ["скрутка лежачи", "russian-twist"],
  ["скрутка на стільці", "torso-twist-stretch"],
  ["зупинка розтягнути литки", "wall-calf-stretch"],
  ["сидячи: підйом коліна", "seated-knee-tuck"],
  ["крок на місці", "high-knees"],
  ["плечі назад", "cross-body-shoulder-stretch"],
  ["повільна ходьба", "walking"],
  ["стійка вершника", "bodyweight-squat"],
  ["хвиля руками", "arm-circles"],
  ["перенесення ваги", "walking"],
  ["пауза тайцзі", "cat-cow-stretch"],
  ["віджимання", "push-up"],
  ["присідання", "bodyweight-squat"],
  ["планка", "plank"],
  ["берпі", "burpee"],
  ["випади", "forward-lunge"],
  ["супермен", "superman"],
  ["дитина", "childs-pose"],
  ["плечі", "arm-circles"],
  ["стегна", "leg-swings-stretch"],
];

/** Stems intentionally without art (plain walk / no CDN neck). */
export const EXERCISE_ART_INTENTIONAL_NULL = ["ходьба", "шия повільно"];

/**
 * Strip reps/time suffixes from a KB session line → lowercase stem for lookup.
 * @param {string} label
 * @returns {string}
 */
export function normalizeExerciseStem(label) {
  let s = String(label || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  /* cut before first dose digit: "Планка 20 с × 3" → "планка" */
  const cut = s.match(/^(.+?)\s+\d/);
  if (cut) s = cut[1].trim();
  return s;
}

/**
 * @param {string} slug
 * @param {1|2|3} [frame=1]
 * @returns {string}
 */
export function exerciseArtUrl(slug, frame = 1) {
  const f = frame === 2 || frame === 3 ? frame : 1;
  return `${WORKOUT_GUIDE_CDN}/assets/${slug}/frame-${f}.png`;
}

/**
 * @param {string} label UA session step label from kb.json
 * @param {{ frame?: 1|2|3 }} [opts]
 * @returns {{ slug: string, url: string, name: string } | null}
 */
export function resolveExerciseArt(label, opts = {}) {
  const stem = normalizeExerciseStem(label);
  if (!stem) return null;
  for (const [key, slug] of STEM_TO_SLUG) {
    if (stem === key || stem.startsWith(key)) {
      const frame = opts.frame === 2 || opts.frame === 3 ? opts.frame : 1;
      return { slug, url: exerciseArtUrl(slug, frame), name: String(label || "").trim() };
    }
  }
  return null;
}

/** Thin line-art slugs wash out at 48px — skip for list thumbs when denser art exists. */
const THUMB_SPARSE_SLUGS = new Set(["high-knees", "walking"]);

/**
 * First usable CDN art for a program list thumb.
 * @param {Iterable<string|{label?: string}>} steps
 * @returns {{ slug: string, url: string, name: string } | null}
 */
export function resolvePickerThumbArt(steps) {
  let sparse = null;
  for (const step of steps || []) {
    const label = typeof step === "string" ? step : step?.label;
    const hit = resolveExerciseArt(label);
    if (!hit) continue;
    if (THUMB_SPARSE_SLUGS.has(hit.slug)) {
      if (!sparse) sparse = hit;
      continue;
    }
    return hit;
  }
  return sparse;
}

export const EXERCISE_ART_ATTRIBUTION =
  "Ілюстрації · Everkinetic / Bryl Lim · CC BY-SA 4.0";
