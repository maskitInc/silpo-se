/**
 * Dedicated program picker thumbs (variant #6 picker-forward).
 * Falls back to exercise CDN art when a program thumb is missing.
 */
import { resolvePickerThumbArt } from "./exercise-art-map.js";
import { bodyGoalLabel, trainingGoalLabel } from "./sport-profile.js";

/** Static meta lines for non-selected catalog rows. */
export const PROGRAM_PICKER_META = {
  "chair-yoga": "мобільність · сидячи · без коврика",
  "tai-chi": "мобільність · повільний ритм",
  afrobeat: "кардіо · ритм вдома",
  military: "сила · витривалість · без обладнання",
  calisthenics: "сила · власна вага",
  stretch: "мобільність · м'яке пробудження",
  "core-mobility": "мобільність · кор і спина",
};

/** Home program thumbs served from /content/programs/. */
export const PROGRAM_THUMBS = {
  "chair-yoga": "./content/programs/chair-yoga-thumb.png",
  "tai-chi": "./content/programs/tai-chi-thumb.png",
  afrobeat: "./content/programs/afrobeat-thumb.png",
  military: "./content/programs/military-thumb.png",
  calisthenics: "./content/programs/calisthenics-thumb.png",
  stretch: "./content/programs/stretch-thumb.png",
  "core-mobility": "./content/programs/core-mobility-thumb.png",
};

/**
 * @param {{ id?: string, goal?: string }} program
 * @param {{ bodyGoal?: string } | null} profile
 * @param {boolean} selected
 * @returns {string}
 */
export function programPickerMetaLine(program, profile, selected) {
  if (!program?.id) return "";
  if (selected && profile?.bodyGoal) {
    return `${trainingGoalLabel(program.goal)} · під «${bodyGoalLabel(profile.bodyGoal)}»`;
  }
  return PROGRAM_PICKER_META[program.id] || trainingGoalLabel(program.goal);
}

/**
 * @param {string} programId
 * @param {Iterable<string|{label?: string}>} sessionSteps
 * @returns {{ url: string, source: "program" | "exercise" } | null}
 */
export function resolveProgramThumb(programId, sessionSteps) {
  const programUrl = PROGRAM_THUMBS[programId];
  if (programUrl) return { url: programUrl, source: "program" };
  const cdn = resolvePickerThumbArt(sessionSteps);
  if (cdn) return { url: cdn.url, source: "exercise" };
  return null;
}

/** @param {string} programId @returns {boolean} */
export function hasProgramThumb(programId) {
  return Boolean(PROGRAM_THUMBS[programId]);
}
