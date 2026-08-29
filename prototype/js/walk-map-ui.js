/**
 * Client: Leaflet OSM map for day «Ціль» walk card.
 * Data from POST /api/walk-map (MCP nearest Silpo + OSRM foot route + product probe).
 */

let leafletPromise = null;
let mapInstance = null;

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const cssId = "leaflet-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.crossOrigin = "";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.crossOrigin = "";
    script.onload = () => (window.L ? resolve(window.L) : reject(new Error("leaflet missing")));
    script.onerror = () => reject(new Error("leaflet load failed"));
    document.head.appendChild(script);
  });
  return leafletPromise;
}

function destroyWalkMap() {
  if (mapInstance) {
    try {
      mapInstance.remove();
    } catch {
      /* ignore */
    }
    mapInstance = null;
  }
}

/** Call when walk map becomes visible (e.g. <details> open). */
function refreshWalkMapSize() {
  try {
    mapInstance?.invalidateSize?.();
  } catch {
    /* ignore */
  }
}

function formatKm(m) {
  if (m == null) return "";
  if (m < 1000) return `${m} м`;
  return `${(m / 1000).toFixed(1)} км`;
}

function stockLine(stock) {
  if (!stock?.checked) return "наявність · ще не перевіряли";
  const hitN = stock.hits?.length || 0;
  const missN = stock.miss?.length || 0;
  if (!hitN && !missN) return "наявність · без запитів";
  if (missN === 0) return `є на полиці e-com · ${hitN} позиц.`;
  if (hitN === 0) return `слабо · 0/${hitN + missN} з запитів дня`;
  return `частково · ${hitN}/${hitN + missN} з запитів дня`;
}

async function readGeoOrNull() {
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), 3500);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(t);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        clearTimeout(t);
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 120000 },
    );
  });
}

/**
 * @param {{ products?: string[] }} opts
 */
export async function mountWalkMap(root, opts = {}) {
  const mapEl = root?.querySelector?.("#walkMap");
  const statusEl = root?.querySelector?.("#walkMapStatus");
  if (!mapEl || !statusEl) return;
  destroyWalkMap();
  statusEl.className = "day-walk__map-status muted";
  statusEl.textContent = "шукаємо найближчий Сільпо…";

  const geo = await readGeoOrNull();
  const body = {
    products: Array.isArray(opts.products) ? opts.products.slice(0, 8) : [],
  };
  if (geo) {
    body.lat = geo.lat;
    body.lng = geo.lng;
  }

  let data;
  try {
    const res = await fetch("/api/walk-map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    data = await res.json();
    if (!res.ok || !data?.ok) {
      const login = data?.login || "/auth/start";
      statusEl.classList.add("is-err");
      statusEl.innerHTML =
        data?.error === "login_required" || res.status === 401
          ? `потрібен вхід · <a href="${login}">увійти</a>`
          : `карта недоступна · ${data?.reason || data?.error || res.status}`;
      return;
    }
  } catch (e) {
    statusEl.classList.add("is-err");
    statusEl.textContent = `карта · ${e.message || "мережа"}`;
    return;
  }

  const { user, branch, stock, route } = data;
  const distanceM = route?.distanceM ?? branch.distanceM;
  statusEl.classList.add("is-ready");
  statusEl.textContent = [
    `Сільпо · ${branch.city}, ${branch.address}`,
    `≈ ${formatKm(distanceM)}`,
    route?.source === "osrm" ? "пішки по дорогах" : null,
    stockLine(stock),
    user.source === "client" ? "гео телефону" : `точка · ${user.label}`,
  ]
    .filter(Boolean)
    .join(" · ");

  try {
    const L = await loadLeaflet();
    mapInstance = L.map(mapEl, {
      zoomControl: false,
      attributionControl: true,
      dragging: true,
      scrollWheelZoom: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(mapInstance);

    const you = L.circleMarker([user.lat, user.lng], {
      radius: 8,
      color: "#1f3d32",
      weight: 2,
      fillColor: "#c8e0d4",
      fillOpacity: 0.95,
    }).addTo(mapInstance);
    you.bindPopup(user.source === "client" ? "Ви" : user.label);

    const store = L.circleMarker([branch.lat, branch.lng], {
      radius: 10,
      color: "#1f3d32",
      weight: 2,
      fillColor: "#2f6b52",
      fillOpacity: 0.95,
    }).addTo(mapInstance);
    store.bindPopup(`Сільпо · ${branch.address}`);

    const path =
      Array.isArray(route?.coordinates) && route.coordinates.length >= 2
        ? route.coordinates
        : [
            [user.lat, user.lng],
            [branch.lat, branch.lng],
          ];
    const routed = route?.source === "osrm" && path.length > 2;
    L.polyline(path, {
      color: "#2f6b52",
      weight: routed ? 3 : 2,
      opacity: routed ? 0.75 : 0.55,
      ...(routed ? {} : { dashArray: "6 6" }),
    }).addTo(mapInstance);

    mapInstance.fitBounds(L.latLngBounds(path), { padding: [28, 28], maxZoom: 15 });
    setTimeout(() => mapInstance?.invalidateSize(), 80);
  } catch (e) {
    statusEl.classList.remove("is-ready");
    statusEl.classList.add("is-err");
    statusEl.textContent = `карта · ${e.message || "Leaflet"}`;
  }
}

export { destroyWalkMap, refreshWalkMapSize };
