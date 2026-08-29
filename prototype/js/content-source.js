/**
 * ContentSource port (Epic 6) — sync only, no live partner/CMS APIs.
 * research/22 · research/28
 */

import chefFixture from "../content/partner-fixture-chef.json" with { type: "json" };

export const CONTENT_SOURCE_KEY = "silpo.sport.contentSource.v1";

/**
 * @typedef {{
 *   id: string,
 *   kind: "chef" | "trainer" | "nutritionist" | "gym" | "dietitian" | string,
 *   title?: string,
 *   attribution: string,
 *   mealMaps?: Record<string, object>,
 *   mealMapNotes?: Record<string, string>,
 *   sessions?: Record<string, object>
 * }} ContentSourcePack
 */

/** @type {Record<string, ContentSourcePack>} */
const FIXTURES = {
  [chefFixture.id]: chefFixture,
};

export function listContentSourceIds() {
  return Object.keys(FIXTURES);
}

export function getContentSourcePack(id) {
  if (!id) return null;
  return FIXTURES[String(id)] || null;
}

export function loadActiveContentSourceId(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(CONTENT_SOURCE_KEY);
    if (!raw) return null;
    const id = String(raw).trim();
    return getContentSourcePack(id) ? id : null;
  } catch {
    return null;
  }
}

export function saveActiveContentSourceId(id, storage = globalThis.localStorage) {
  try {
    if (!id || !getContentSourcePack(id)) {
      storage?.removeItem?.(CONTENT_SOURCE_KEY);
      return null;
    }
    storage?.setItem?.(CONTENT_SOURCE_KEY, String(id));
    return String(id);
  } catch {
    return null;
  }
}

/**
 * Deep-merge mealMaps / notes / sessions from pack onto kb (immutable).
 * @param {object} kb
 * @param {ContentSourcePack|null} pack
 */
export function mergeKbWithContentSource(kb, pack) {
  if (!kb || !pack) return kb;
  const mealMaps = { ...(kb.mealMaps || {}) };
  for (const [goal, map] of Object.entries(pack.mealMaps || {})) {
    mealMaps[goal] = { ...(mealMaps[goal] || {}), ...map };
  }
  const mealMapNotes = { ...(kb.mealMapNotes || {}), ...(pack.mealMapNotes || {}) };
  const sessions = { ...(kb.sessions || {}) };
  for (const [pid, levels] of Object.entries(pack.sessions || {})) {
    sessions[pid] = { ...(sessions[pid] || {}), ...levels };
  }
  return { ...kb, mealMaps, mealMapNotes, sessions };
}

/**
 * @returns {{ id: string|null, pack: ContentSourcePack|null, attribution: string }}
 */
export function resolveActiveContentSource(storage = globalThis.localStorage) {
  const id = loadActiveContentSourceId(storage);
  const pack = getContentSourcePack(id);
  return {
    id: pack ? id : null,
    pack,
    attribution: pack?.attribution || "",
  };
}
