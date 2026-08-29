/** Tiny DOM helpers. No npm. */

export const $ = (sel, node = document) => node.querySelector(sel);

export const $$ = (sel, node = document) => [...node.querySelectorAll(sel)];

export function prefersReduce() {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

export function announce(text) {
  const el = document.getElementById("live");
  if (!el) return;
  el.textContent = "";
  el.textContent = text;
}

/** Screen-to-screen only. Skip list refreshes. */
export function withViewTransition(fn) {
  if (typeof document.startViewTransition === "function" && !prefersReduce()) {
    return document.startViewTransition(fn);
  }
  fn();
  return { finished: Promise.resolve() };
}
