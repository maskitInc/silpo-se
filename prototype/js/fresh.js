/** Fresh-produce search: category slug + demote processed SKUs. */

export const FRESH_RE = /банан|яблук|огір|помідор|картопл|цибул|моркв|груш|виноград|салат|зелен/i;

export const FRESH_SLUG = {
  банан: "banany-4792",
  яблуко: "yabluka-4805",
  яблука: "yabluka-4805",
  огірок: "ogirky-4823",
  помідор: "pomidory-4825",
  картопля: "kartoplia-i-batat-4817",
  цибуля: "tsybulia-i-chasnyk-4826",
  морква: "morkva-4818",
  зелень: "zelen-i-salaty-4829",
  кріп: "zelen-i-salaty-4829",
  петрушка: "zelen-i-salaty-4829",
  груша: "grushi-4795",
  виноград: "vynograd-4793",
};

const PROCESSED =
  /шоколад|сушен|в сироп|снек|батончик|цукат|чіпс|напій|нектар|йогурт|кільц|молочн|сирок|десерт|кекс|пюре/i;

export function slugForFreshQuery(q) {
  const n = String(q || "").toLowerCase();
  const keys = Object.keys(FRESH_SLUG).sort((a, b) => b.length - a.length);
  const hit = keys.find((k) => n.includes(k));
  return hit ? FRESH_SLUG[hit] : "";
}

export function preferFresh(list, q) {
  const query = String(q || "").trim().toLowerCase();
  if (!FRESH_RE.test(query) || !list?.length) return list;
  const start = new RegExp(`^${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return [...list].sort((a, b) => scoreFresh(b, query, start) - scoreFresh(a, query, start));
}

function scoreFresh(p, query, start) {
  const name = String(p.title || p.name || "");
  const n = name.toLowerCase();
  let s = 0;
  if (PROCESSED.test(n)) s -= 6;
  if (start.test(name)) s += 8;
  if (n.includes(query) && name.split(/\s+/).length <= 5) s += 4;
  return s;
}

export function isPinnedQuery(q) {
  const role = String(q?.role || "");
  const id = q?.productId || q?.sku?.productId;
  return Boolean(id) && role.startsWith("add:");
}
