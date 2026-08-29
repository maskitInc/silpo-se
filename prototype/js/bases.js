/** Named BaseList — localStorage only. No MCP. */

import { envelopeOf, toStaple } from "./staples.js";

export const BASES_KEY = "silpo.express.bases.v1";
export const BASES_MAX = 20;
export const BASE_LINES_MAX = 60;

function nowIso() {
  return new Date().toISOString();
}

export function newId(prefix = "b") {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function migrate(raw) {
  if (!raw || typeof raw !== "object") return { v: 1, bases: [] };
  const bases = Array.isArray(raw.bases) ? raw.bases : [];
  return { v: 1, bases: bases.map(normalizeBase).filter(Boolean) };
}

function normalizeLine(line) {
  if (!line || typeof line !== "object") return null;
  const nameHint = String(line.nameHint || line.name || "").trim().slice(0, 120);
  if (!nameHint) return null;
  const staple =
    line.staple != null && String(line.staple).trim()
      ? String(line.staple).trim().slice(0, 40)
      : toStaple(nameHint);
  const envelope = ["food", "alcohol", "tobacco", "clean"].includes(line.envelope)
    ? line.envelope
    : staple
      ? envelopeOf(staple)
      : "food";
  return {
    id: String(line.id || newId("l")).slice(0, 24),
    staple: staple || null,
    nameHint,
    preferredSku: line.preferredSku ? String(line.preferredSku).slice(0, 64) : null,
    units: Math.max(1, Math.min(99, Math.round(Number(line.units) || 1))),
    envelope,
    lockSku: Boolean(line.lockSku),
    note: line.note ? String(line.note).slice(0, 80) : "",
  };
}

function normalizeBase(b) {
  if (!b || typeof b !== "object") return null;
  const title = String(b.title || "").trim().slice(0, 40) || "База";
  const lines = (Array.isArray(b.lines) ? b.lines : []).map(normalizeLine).filter(Boolean).slice(0, BASE_LINES_MAX);
  return {
    id: String(b.id || newId("b")).slice(0, 24),
    title,
    createdAt: b.createdAt || nowIso(),
    updatedAt: b.updatedAt || nowIso(),
    source: ["checklist", "receipt", "manual"].includes(b.source) ? b.source : "manual",
    sourceReceiptId: b.sourceReceiptId ? String(b.sourceReceiptId).slice(0, 40) : undefined,
    lines,
  };
}

export function loadBases(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(BASES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return migrate(parsed).bases;
  } catch {
    return [];
  }
}

export function saveBases(bases, storage = globalThis.localStorage) {
  const list = (bases || []).map(normalizeBase).filter(Boolean).slice(0, BASES_MAX);
  const payload = { v: 1, bases: list };
  storage?.setItem?.(BASES_KEY, JSON.stringify(payload));
  return list;
}

export function getBase(id, storage = globalThis.localStorage) {
  return loadBases(storage).find((b) => b.id === id) || null;
}

export function upsertBase(base, storage = globalThis.localStorage) {
  const next = normalizeBase({ ...base, updatedAt: nowIso() });
  if (!next) throw new Error("bad_base");
  const all = loadBases(storage);
  const idx = all.findIndex((b) => b.id === next.id);
  if (idx >= 0) all[idx] = next;
  else {
    if (all.length >= BASES_MAX) throw new Error("bases_cap");
    all.unshift(next);
  }
  saveBases(all, storage);
  return next;
}

export function deleteBase(id, storage = globalThis.localStorage) {
  const all = loadBases(storage).filter((b) => b.id !== id);
  saveBases(all, storage);
  return all;
}

export function updateBaseLines(id, lines, storage = globalThis.localStorage) {
  const cur = getBase(id, storage);
  if (!cur) return null;
  return upsertBase({ ...cur, lines }, storage);
}

/** Build BaseList from shop checklist lines (accepted preferred). */
export function baseFromChecklistLines(lines, { title, accepted, onlyAccepted = true } = {}) {
  const src = (lines || []).filter((l) => {
    if (l.status === "missing") return false;
    if (onlyAccepted && accepted && !accepted[l.role]) return false;
    return true;
  });
  const baseLines = src.slice(0, BASE_LINES_MAX).map((l) =>
    normalizeLine({
      id: newId("l"),
      staple: l.wanted || l.staple || toStaple(l.name),
      nameHint: l.name || l.wanted,
      preferredSku: l.sku?.productId || null,
      units: Math.max(1, Number(l.units) || 1),
      envelope: l.envelope || "food",
      lockSku: false,
    }),
  );
  return normalizeBase({
    id: newId("b"),
    title: title || `База · ${new Date().toLocaleDateString("uk-UA")}`,
    source: "checklist",
    lines: baseLines,
  });
}

/** Build BaseList from receipt lines (optional name filter). */
export function baseFromReceipt(receipt, { title, selectedNames } = {}) {
  const set = selectedNames?.length ? new Set(selectedNames.map((n) => String(n).toLowerCase())) : null;
  const lines = (receipt?.lines || [])
    .filter((l) => {
      if (!l?.name) return false;
      if (set && !set.has(String(l.name).toLowerCase())) return false;
      return true;
    })
    .slice(0, BASE_LINES_MAX)
    .map((l) =>
      normalizeLine({
        id: newId("l"),
        staple: toStaple(l.name),
        nameHint: l.name,
        units: Math.max(1, Number.isFinite(Number(l.qty)) && Number(l.qty) >= 1 ? Math.round(Number(l.qty)) : 1),
        envelope: undefined,
        lockSku: false,
      }),
    );
  return normalizeBase({
    id: newId("b"),
    title: title || `З чека · ${new Date().toLocaleDateString("uk-UA")}`,
    source: "receipt",
    sourceReceiptId: receipt?.id,
    lines,
  });
}

/** Synthetic receipt shape for mergeReceiptIntoShopVm. */
export function baseToReceipt(base) {
  return {
    id: base.id,
    channel: "base",
    at: base.updatedAt || base.createdAt || null,
    lines: (base.lines || []).map((l) => ({
      name: l.nameHint,
      qty: l.units,
      price: null,
      lockSku: l.lockSku,
      staple: l.staple,
    })),
  };
}
