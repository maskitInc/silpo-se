/**
 * Sport home barbell — real WebGL (Three.js CDN), series chart on shaft.
 * Photo/SVG remain markup fallback until mount succeeds.
 */

const THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

let threeModPromise = null;

function loadThree() {
  if (!threeModPromise) threeModPromise = import(/* @vite-ignore */ THREE_CDN);
  return threeModPromise;
}

function seriesValues(series) {
  const list = Array.isArray(series) ? series : [];
  const vals = list.map((s) => Number(s?.uah) || 0);
  if (vals.length >= 2 && vals.some((v) => v > 0)) return vals;
  return null;
}

function buildIdleWave(n, energy, lifted) {
  const amp = lifted ? 0.22 + energy * 0.12 : 0.1 + energy * 0.06;
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    out.push(
      amp * Math.sin(t * Math.PI * 2.15 + (lifted ? 0.15 : 0.9)) +
        amp * 0.22 * Math.sin(t * Math.PI * 5.1),
    );
  }
  return out;
}

/**
 * @param {HTMLElement} host canvas or wrapper with canvas child
 * @param {{ lifted?: boolean, empty?: boolean, series?: Array<{uah?: number}>, ritualDays?: number, rationHits?: number }} opts
 * @returns {Promise<() => void>} dispose
 */
export async function mountSportBarbell3d(host, opts = {}) {
  if (!host || typeof host.getContext !== "function") {
    const canvas = host?.querySelector?.("canvas.home-pulse__barbell-gl");
    if (!canvas) return () => {};
    return mountSportBarbell3d(canvas, opts);
  }

  const canvas = host;
  const stage = canvas.closest(".home-pulse__barbell-stage");
  const lifted = Boolean(opts.lifted);
  const empty = Boolean(opts.empty);
  const energy = Math.min(
    1,
    (Number(opts.ritualDays) || 0) / 4 + (Number(opts.rationHits) || 0) / 8,
  );

  let THREE;
  try {
    THREE = await loadThree();
  } catch {
    return () => {};
  }

  const parent = canvas.parentElement;
  const bleed =
    canvas.closest(".home-pulse--sport") ||
    canvas.closest(".home-pulse__barbell-bleed") ||
    canvas.closest(".home-pulse__sport-stage") ||
    parent;
  const sizeHost = () => {
    const w = Math.max(2, bleed?.clientWidth || parent?.clientWidth || 320);
    const h = Math.max(2, bleed?.clientHeight || Math.round(w * 0.72));
    return { w, h };
  };
  let { w: w0, h: h0 } = sizeHost();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = w0 * dpr;
  canvas.height = h0 * dpr;
  canvas.style.width = "100%";
  canvas.style.height = "100%";

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch {
    return () => {};
  }
  if (!renderer.getContext()) {
    renderer.dispose();
    return () => {};
  }
  renderer.setPixelRatio(dpr);
  renderer.setSize(w0, h0, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, w0 / h0, 0.1, 40);
  // Pull back so plates have margin (no edge clip)
  camera.position.set(0, 1.35, 5.4);
  camera.lookAt(0, 0.7, 0);

  const key = new THREE.DirectionalLight(0xffffff, lifted ? 1.2 : 0.95);
  key.position.set(2.2, 3.4, 4.2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xa8ffc4, lifted ? 0.45 : 0.32);
  fill.position.set(-3, 1.2, 2);
  scene.add(fill);
  const rim = new THREE.PointLight(0x5dff8a, lifted ? 1.8 : 1.0, 12, 2);
  rim.position.set(0, 0.8, 2.2);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0x1a2a22, 0.45));

  // No opaque 3D floor — keep CSS sport-stage green (owner lock ds177)
  const contact = new THREE.Mesh(
    new THREE.CircleGeometry(1.35, 40),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.28,
    }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.002;
  scene.add(contact);

  const root = new THREE.Group();
  // Bigger plates; slight sink so rims kiss the floor (no float gap)
  const plateR = empty ? 0.72 : 0.92;
  root.position.y = plateR * 0.97;
  root.rotation.x = 0;
  root.rotation.y = -0.06;
  root.scale.setScalar(0.82);
  scene.add(root);

  const steel = new THREE.MeshStandardMaterial({
    color: 0xb8c0c8,
    metalness: 0.92,
    roughness: 0.28,
  });
  const steelDark = new THREE.MeshStandardMaterial({
    color: 0x6a737c,
    metalness: 0.88,
    roughness: 0.35,
  });
  const plateMat = new THREE.MeshStandardMaterial({
    color: empty ? 0x2a3a32 : 0x1f8f4a,
    emissive: empty ? 0x0a1810 : 0x0d5c2e,
    emissiveIntensity: lifted ? 0.55 : 0.28,
    metalness: 0.35,
    roughness: 0.42,
  });
  const gripMat = new THREE.MeshStandardMaterial({
    color: 0xc4a484,
    roughness: 0.78,
    metalness: 0.08,
  });

  // Compact shaft; plates dominate width
  const barLen = 1.95;
  const barR = 0.034;
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(barR, barR, barLen, 48), steel);
  bar.rotation.z = Math.PI / 2;
  root.add(bar);

  const knurl = new THREE.Mesh(
    new THREE.CylinderGeometry(barR + 0.004, barR + 0.004, 0.55, 48),
    steelDark,
  );
  knurl.rotation.z = Math.PI / 2;
  root.add(knurl);

  const sleeveL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.26, 32), steelDark);
  sleeveL.rotation.z = Math.PI / 2;
  sleeveL.position.x = -0.8;
  root.add(sleeveL);
  const sleeveR = sleeveL.clone();
  sleeveR.position.x = 0.8;
  root.add(sleeveR);

  function addPlateStack(xSign) {
    const sizes = empty ? [0.72, 0.6] : [0.92, 0.8, 0.68];
    sizes.forEach((r, i) => {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.15, 48), plateMat);
      disc.rotation.z = Math.PI / 2;
      disc.position.x = xSign * (0.95 + i * 0.17);
      root.add(disc);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r * 0.68, 0.028, 8, 48),
        new THREE.MeshStandardMaterial({ color: 0x0a3d24, metalness: 0.4, roughness: 0.45 }),
      );
      ring.rotation.y = Math.PI / 2;
      ring.position.x = xSign * (0.95 + i * 0.17);
      root.add(ring);
    });
  }
  addPlateStack(-1);
  addPlateStack(1);

  [-0.26, 0.26].forEach((x) => {
    const tape = new THREE.Mesh(
      new THREE.CylinderGeometry(barR + 0.009, barR + 0.009, 0.15, 24),
      gripMat,
    );
    tape.rotation.z = Math.PI / 2;
    tape.position.set(x, 0, 0);
    root.add(tape);
  });

  const vals = seriesValues(opts.series) || buildIdleWave(14, energy, lifted);
  const maxV = Math.max(...vals.map((v) => Math.abs(v)), 0.001);
  const points = vals.map((v, i) => {
    const t = vals.length === 1 ? 0.5 : i / (vals.length - 1);
    const x = -0.62 + t * 1.24;
    const y = (v / maxV) * (lifted ? 0.36 : 0.22);
    return new THREE.Vector3(x, y + 0.08, 0.12);
  });
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.35);
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 64, lifted ? 0.032 : 0.024, 10, false),
    new THREE.MeshStandardMaterial({
      color: 0x6dff9a,
      emissive: 0x2dff70,
      emissiveIntensity: lifted ? 1.2 : 0.65,
      metalness: 0.2,
      roughness: 0.25,
      transparent: true,
      opacity: empty ? 0.35 : 0.95,
    }),
  );
  root.add(tube);

  const glowTube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 48, lifted ? 0.055 : 0.04, 8, false),
    new THREE.MeshBasicMaterial({
      color: 0x3dff7a,
      transparent: true,
      opacity: lifted ? 0.2 : 0.1,
      depthWrite: false,
    }),
  );
  root.add(glowTube);

  const dotGeo = new THREE.SphereGeometry(0.048, 12, 10);
  const dotMat = new THREE.MeshStandardMaterial({
    color: 0xd8ffe6,
    emissive: 0x5dff8a,
    emissiveIntensity: 1.2,
  });
  points.forEach((p, i) => {
    if (i % Math.max(1, Math.floor(points.length / 6)) !== 0 && i !== points.length - 1) return;
    const d = new THREE.Mesh(dotGeo, dotMat);
    d.position.copy(p);
    d.position.z += 0.02;
    if (i === points.length - 1) d.scale.setScalar(1.35);
    root.add(d);
  });

  if (stage) {
    stage.classList.add("is-gl-ready");
    canvas.classList.add("is-live");
  }

  let disposed = false;
  let raf = 0;
  const ac = new AbortController();

  const onResize = () => {
    if (disposed) return;
    const { w, h } = sizeHost();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  window.addEventListener("resize", onResize, { signal: ac.signal });
  // One more pass after layout (flex/absolute settle)
  requestAnimationFrame(onResize);

  // Static — no hover tilt, no idle float
  const tick = () => {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    renderer.render(scene, camera);
  };
  tick();

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    ac.abort();
    if (stage) stage.classList.remove("is-gl-ready");
    renderer.dispose();
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
  };
}
