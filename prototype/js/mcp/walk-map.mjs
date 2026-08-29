/**
 * Walk / route map: user point + nearest Silpo (MCP list_branches) with
 * optional SelfPickup product probe for day-plate queries.
 * Pedestrian geometry via OSRM foot (env OSRM_URL or public demo), haversine fallback.
 */
import { callTool, connectMcp } from "./client.mjs";
import { unwrap } from "./unwrap.js";

const EARTH_M = 6371e3;
const OSRM_BASE = String(process.env.OSRM_URL || "https://router.project-osrm.org").replace(/\/$/, "");
const OSRM_TIMEOUT_MS = 5000;

export function haversineM(a, b) {
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const dφ = ((b.lat - a.lat) * Math.PI) / 180;
  const dλ = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.sqrt(x));
}

/**
 * Foot route along roads/paths. Returns Leaflet-ready [lat,lng] coords.
 * @param {{ lat: number, lng: number }} from
 * @param {{ lat: number, lng: number }} to
 */
export async function fetchFootRoute(from, to) {
  const straight = {
    source: "straight",
    distanceM: Math.round(haversineM(from, to)),
    coordinates: [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ],
  };
  const url =
    `${OSRM_BASE}/route/v1/foot/${from.lng},${from.lat};${to.lng},${to.lat}` +
    "?overview=full&geometries=geojson";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), OSRM_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return straight;
    const data = await res.json();
    const route = data?.routes?.[0];
    const coordsLngLat = route?.geometry?.coordinates;
    if (!Array.isArray(coordsLngLat) || coordsLngLat.length < 2) return straight;
    const coordinates = coordsLngLat
      .map((c) => {
        const lng = Number(c?.[0]);
        const lat = Number(c?.[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return [lat, lng];
      })
      .filter(Boolean);
    if (coordinates.length < 2) return straight;
    const distanceM = Math.round(Number(route.distance) || haversineM(from, to));
    return { source: "osrm", distanceM, coordinates };
  } catch {
    return straight;
  } finally {
    clearTimeout(timer);
  }
}

function num(v) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeBranch(raw) {
  const lat = num(raw.latitude ?? raw.lat);
  const lng = num(raw.longitude ?? raw.lng ?? raw.lon);
  if (lat == null || lng == null) return null;
  return {
    branchId: String(raw.branchId || ""),
    city: String(raw.city || ""),
    address: String(raw.address || ""),
    hasPickup: Boolean(raw.hasPickup),
    open: raw.open !== false,
    lat,
    lng,
  };
}

async function resolveUserPoint(ctx, body) {
  const lat = num(body?.lat);
  const lng = num(body?.lng);
  if (lat != null && lng != null) {
    return { lat, lng, source: "client", label: "ваші координати" };
  }
  const addrRes = await callTool(ctx, "silpo_get_my_delivery_addresses", {});
  const addresses = unwrap(addrRes.json)?.addresses || [];
  const kyiv = addresses.find((a) => /київ/i.test(String(a.city || "")) && num(a.latitude) != null);
  const pick = kyiv || addresses.find((a) => num(a.latitude) != null);
  if (!pick) return null;
  const aLat = num(pick.latitude);
  const aLng = num(pick.longitude);
  if (aLat == null || aLng == null) return null;
  const street = [pick.street, pick.building].filter(Boolean).join(", ");
  return {
    lat: aLat,
    lng: aLng,
    source: "mcp_address",
    label: street ? `${pick.city}, ${street}` : String(pick.city || "адреса з MCP"),
  };
}

async function loadBranches(ctx) {
  const out = [];
  let offset = 0;
  const limit = 100;
  for (let page = 0; page < 4; page++) {
    const res = await callTool(ctx, "silpo_list_branches", { limit, offset, hasPickup: true });
    const u = unwrap(res.json);
    const batch = Array.isArray(u?.branches) ? u.branches : [];
    for (const raw of batch) {
      const b = normalizeBranch(raw);
      if (b?.branchId) out.push(b);
    }
    const total = Number(u?.meta?.total) || out.length;
    offset += limit;
    if (!batch.length || offset >= total) break;
  }
  return out;
}

function rankNearest(user, branches, take = 8) {
  return branches
    .map((b) => ({ ...b, distanceM: Math.round(haversineM(user, b)) }))
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, take);
}

async function probeProducts(ctx, branch, products) {
  const queries = (products || [])
    .map((q) => String(q || "").trim())
    .filter(Boolean)
    .slice(0, 8);
  if (!queries.length) {
    return { ok: true, checked: false, hits: [], miss: [], ratio: null };
  }
  const slotsRes = await callTool(ctx, "silpo_get_time_slots", {
    branchId: branch.branchId,
    deliveryTypes: ["SelfPickup"],
    limit: 5,
  });
  const slots = unwrap(slotsRes.json)?.slots || [];
  const slot = slots.find((s) => s?.available) || slots[0];
  if (!slot?.start || !slot?.end) {
    return { ok: false, checked: true, hits: [], miss: queries, ratio: 0, reason: "no_slots" };
  }
  const batch = await callTool(ctx, "silpo_find_products_batch", {
    branchId: branch.branchId,
    deliveryType: "SelfPickup",
    timeslotStart: slot.start,
    timeslotEnd: slot.end,
    products: queries,
    limit: 3,
  });
  const u = unwrap(batch.json);
  const rows = Array.isArray(u?.queries) ? u.queries : [];
  const hits = [];
  const miss = [];
  for (const q of queries) {
    const row = rows.find((r) => String(r.query || "").toLowerCase() === q.toLowerCase()) || rows.find((r) => String(r.query || "").includes(q.slice(0, 4)));
    const productsFound = Array.isArray(row?.products) ? row.products : [];
    const any = productsFound.some((p) => p?.available !== false && (p?.stock == null || Number(p.stock) > 0));
    if (any || (row && Number(row.totalFound) > 0)) hits.push(q);
    else miss.push(q);
  }
  const ratio = queries.length ? hits.length / queries.length : null;
  return { ok: true, checked: true, hits, miss, ratio };
}

/**
 * @param {string} token
 * @param {{ lat?: number, lng?: number, products?: string[] }} body
 */
export async function walkMapViaMcp(token, body = {}) {
  const boot = await connectMcp(token);
  if (!boot.ok) {
    return { ok: false, reason: "mcp_connect", http: boot.http };
  }
  const user = await resolveUserPoint(boot.ctx, body);
  if (!user) {
    return { ok: false, reason: "no_user_point" };
  }
  const branches = await loadBranches(boot.ctx);
  if (!branches.length) {
    return { ok: false, reason: "no_branches", user };
  }
  const ranked = rankNearest(user, branches, 8);
  const products = Array.isArray(body.products) ? body.products : [];
  let chosen = ranked[0];
  let stock = { ok: true, checked: false, hits: [], miss: [], ratio: null };
  let tried = 0;
  for (const cand of ranked.slice(0, 5)) {
    tried += 1;
    const probe = await probeProducts(boot.ctx, cand, products);
    if (!products.length) {
      chosen = cand;
      stock = probe;
      break;
    }
    if (probe.checked && probe.ratio != null && probe.ratio >= 0.5) {
      chosen = cand;
      stock = probe;
      break;
    }
    if (!chosen || (probe.ratio ?? 0) > (stock.ratio ?? -1)) {
      chosen = cand;
      stock = probe;
    }
  }

  const route = await fetchFootRoute(user, chosen);
  const distanceM = route.distanceM || chosen.distanceM;

  return {
    ok: true,
    source: "mcp",
    user,
    branch: {
      branchId: chosen.branchId,
      city: chosen.city,
      address: chosen.address,
      lat: chosen.lat,
      lng: chosen.lng,
      distanceM,
      open: chosen.open,
      hasPickup: chosen.hasPickup,
    },
    route: {
      source: route.source,
      distanceM,
      coordinates: route.coordinates,
    },
    stock: {
      checked: stock.checked,
      hits: stock.hits || [],
      miss: stock.miss || [],
      ratio: stock.ratio,
      triedBranches: tried,
    },
    nearby: ranked.slice(0, 3).map((b) => ({
      branchId: b.branchId,
      address: b.address,
      city: b.city,
      distanceM: b.distanceM,
      lat: b.lat,
      lng: b.lng,
    })),
  };
}
