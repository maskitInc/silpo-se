/**
 * Shared API/auth routes for local `server.mjs` and Vercel `api/gateway`.
 * Static files stay on CDN (Vercel) or in server.mjs (local).
 */
import { createHash, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { compose } from "../composer.js";
import { assertIntent } from "../contracts.js";
import { gateViewModel } from "../gate.js";
import { clipToBudget, fillMissingLinesFromFixture, resolveQueries } from "../resolver.js";
import { initializeSession } from "./client.mjs";
import { loadHistoryViaMcp, clearHistoryMcpCache } from "./history.mjs";
import { browseViaMcp } from "./browse.mjs";
import { replacementsViaMcp } from "./replacements.mjs";
import { resolveViaMcp, pushCartProducts } from "./w1.mjs";
import { walkMapViaMcp } from "./walk-map.mjs";
import { freqFromReceipts, ordersToReceipts } from "../receipts.js";
import {
  authorizeUrl,
  exchangeCode,
  loadAccessToken,
  persistTokens,
  pkcePair,
  refreshAccessToken,
  registerClient,
} from "./oauth.mjs";
import {
  clearPendingAuthCookie,
  clearTokenCookie,
  readPendingAuth,
  readTokenBlob,
  setPendingAuthCookie,
  setTokenCookie,
  tokenBlobFromOAuth,
} from "./session-cookies.mjs";

const MCP_URL = () => process.env.SILPO_MCP_URL || "https://mcp.silpo.ua/mcp";
const ENV_TOKEN = () => process.env.SILPO_MCP_TOKEN || "";

/** In-memory pending auth for long-lived local server only. */
const localPending = new Map();

export function publicBaseUrl(req) {
  const explicit = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`;
  const host = req?.headers?.["x-forwarded-host"] || req?.headers?.host;
  const proto = req?.headers?.["x-forwarded-proto"] || "http";
  if (host) return `${proto}://${host}`;
  const port = Number(process.env.PORT) || 8766;
  return `http://127.0.0.1:${port}`;
}

export function redirectUri(req) {
  return `${publicBaseUrl(req)}/auth/callback`;
}

function sendJson(res, code, obj, extraHeaders = {}) {
  const headers = { "Content-Type": "application/json; charset=utf-8", ...extraHeaders };
  if (typeof res.status === "function" && typeof res.json === "function") {
    // Vercel-style
    Object.entries(headers).forEach(([k, v]) => {
      if (k.toLowerCase() === "set-cookie") {
        const prev = res.getHeader?.("Set-Cookie");
        if (prev) res.setHeader("Set-Cookie", [].concat(prev, v));
        else res.setHeader("Set-Cookie", v);
      } else res.setHeader(k, v);
    });
    return res.status(code).json(obj);
  }
  res.writeHead(code, headers);
  res.end(JSON.stringify(obj));
}

function sendHtml(res, code, html, extraHeaders = {}) {
  const headers = { "Content-Type": "text/html; charset=utf-8", ...extraHeaders };
  if (typeof res.status === "function" && typeof res.send === "function") {
    Object.entries(headers).forEach(([k, v]) => {
      if (k.toLowerCase() === "set-cookie") {
        const prev = res.getHeader?.("Set-Cookie");
        if (prev) res.setHeader("Set-Cookie", [].concat(prev, v));
        else res.setHeader("Set-Cookie", v);
      } else res.setHeader(k, v);
    });
    return res.status(code).send(html);
  }
  res.writeHead(code, headers);
  res.end(html);
}

function setCookies(res, cookies) {
  if (!cookies?.length) return;
  if (typeof res.setHeader === "function") {
    const prev = res.getHeader?.("Set-Cookie");
    const all = [].concat(prev || [], cookies);
    res.setHeader("Set-Cookie", all.length === 1 ? all[0] : all);
  }
}

function redirect(res, location, cookies = []) {
  setCookies(res, cookies);
  if (typeof res.redirect === "function") {
    return res.redirect(302, location);
  }
  const headers = { Location: location };
  if (cookies.length) headers["Set-Cookie"] = cookies.length === 1 ? cookies[0] : cookies;
  res.writeHead(302, headers);
  res.end();
}

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      return {};
    }
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function resolveAccessToken(root, req, res) {
  // 1) Per-visitor cookie (Vercel / multi-instance)
  const blob = readTokenBlob(req.headers?.cookie || "");
  if (blob?.access_token) {
    if (blob.expires_at && Date.now() > blob.expires_at - 30_000 && blob.refresh_token && blob.client_id) {
      try {
        const fresh = await refreshAccessToken({
          clientId: blob.client_id,
          refreshToken: blob.refresh_token,
        });
        const next = tokenBlobFromOAuth(blob.client_id, {
          ...fresh,
          refresh_token: fresh.refresh_token || blob.refresh_token,
        });
        setCookies(res, [setTokenCookie(next)]);
        return next.access_token;
      } catch {
        return blob.access_token;
      }
    }
    return blob.access_token;
  }

  // 2) Explicit shared env (optional demo) — only if no cookie
  if (ENV_TOKEN()) return ENV_TOKEN();

  // 3) Local disk (.token.json)
  return (await loadAccessToken(root)) || "";
}

async function probeMcp() {
  try {
    const res = await fetch(MCP_URL(), { headers: { Accept: "application/json" } });
    return {
      reachable: true,
      http: res.status,
      wwwAuthenticate: res.headers.get("www-authenticate") || "",
    };
  } catch (e) {
    return { reachable: false, error: e.message };
  }
}

async function oauthMeta() {
  const res = await fetch("https://mcp.silpo.ua/.well-known/oauth-authorization-server");
  return res.json();
}

async function snapshotTools(root, access) {
  const listed = await initializeSession(access);
  const names = listed.names || [];
  try {
    await writeFile(
      join(root, "content/tools-list.public.json"),
      JSON.stringify(
        {
          fetchedAt: new Date().toISOString(),
          count: names.length,
          names,
          ok: Boolean(listed.ok),
          http: listed.http,
        },
        null,
        2,
      ),
      "utf8",
    );
  } catch {
    /* read-only FS on Vercel — ignore */
  }
  return { ok: listed.ok, count: names.length, names };
}

async function handleResolve(root, access, body) {
  const kb = JSON.parse(await readFile(join(root, "content/kb.json"), "utf8"));
  const shelf = JSON.parse(await readFile(join(root, "content/shelf.json"), "utf8"));
  const intent = assertIntent(body.intent);

  let history = shelf.history;
  let historyNote = "Історія з фікстур чеків. Модель лише групує частоти.";
  let historyTrace = [];
  let historyFreq = {};
  if (intent.surface === "shopping" || intent.surface === "sport") {
    if (access) {
      const liveHist = await loadHistoryViaMcp(access);
      historyTrace = liveHist.trace || [];
      historyFreq = liveHist.freq || {};
      if (intent.surface === "shopping" && liveHist.ok && liveHist.history[0]?.lines?.length) {
        history = liveHist.history;
        historyNote = `Історія з MCP (${liveHist.rawCount} рядків чеків). Модель лише групує назви.`;
      }
    }
  }

  const content = compose(intent, { ...kb, history, historyNote });
  let queries = body.queriesOverride || content.shopQueries;
  if (intent.surface === "shopping" && body.variantId) {
    const v = content.variants.find((x) => x.id === body.variantId);
    if (v?.queries) queries = v.queries;
  }
  if (body.removedRoles?.length) {
    const drop = new Set(body.removedRoles);
    queries = queries.filter((q) => !drop.has(q.role) && !drop.has(q.q));
  }
  if (body.swaps && typeof body.swaps === "object") {
    queries = queries.map((q) => {
      const staple = q.staple || q.q;
      const sw = body.swaps[q.role];
      if (!sw) return { ...q, staple };
      if (typeof sw === "string") return { ...q, staple, q: sw };
      return {
        ...q,
        staple,
        q: sw.name || sw.q,
        productId: sw.productId || sw.sku?.productId,
        slug: sw.slug || sw.sku?.slug,
      };
    });
  } else {
    queries = queries.map((q) => ({ ...q, staple: q.staple || q.q }));
  }
  if (Array.isArray(body.extraQueries) && body.extraQueries.length) {
    queries = [
      ...queries,
      ...body.extraQueries.map((q, i) => ({
        q: String(q.q || q.name || ""),
        role: String(q.role || `add:${i}`).slice(0, 24),
        staple: q.staple || q.q || q.name,
        envelope: q.envelope || "food",
        group: q.group || "extra",
        groupTitle: q.groupTitle || "додано зараз",
        productId: q.productId || q.sku?.productId,
        price: typeof q.price === "number" ? q.price : undefined,
        image: q.image || "",
        sku: q.sku || undefined,
        why: "додано з категорії",
      })),
    ];
  }

  let source = "fixture";
  let resolve = resolveQueries(queries, shelf, { confirmed: Boolean(body.confirmed) });
  const fixtureResolve = resolve;
  let trace = [{ step: "fixture_shelf", note: "no guest token or MCP failed" }];
  let mcpError = null;

  if (access) {
    const live = await resolveViaMcp(queries, {
      token: access,
      confirmed: Boolean(body.confirmed) && body.allowWrite === true,
      historyFreq,
      preferKind: body.preferKind || null,
    });
    trace = live.trace || [];
    if (live.ok) {
      source = "mcp";
      resolve = fillMissingLinesFromFixture(live.resolve, fixtureResolve);
      if (
        resolve.lines.some(
          (l, i) => l !== live.resolve?.lines?.[i] && (l.status === "found" || l.status === "replaced"),
        )
      ) {
        trace = [...trace, { step: "fixture_fill_missing", note: "shelf.sku for MCP misses" }];
      }
    } else {
      mcpError = { reason: live.reason, http: live.http };
      source = "fixture_fallback";
      resolve = fixtureResolve;
    }
  }

  if (intent.surface === "shopping") {
    resolve.lines = clipToBudget(resolve.lines, intent.constraints.budgetUah);
    resolve.totals.min = resolve.lines.reduce((s, l) => s + (l.price || 0), 0);
    resolve.totals.max = resolve.totals.min;
  }

  const vm = gateViewModel(content, resolve, {
    categoriesAllow: intent.constraints.categoriesAllow,
    debug: Boolean(body.debug),
  });
  if (body.debug) {
    vm.debug = {
      ...(vm.debug || {}),
      source,
      trace: [...historyTrace, ...trace].map((t) => ({
        step: t.step || t.tool,
        http: t.http,
        skipped: t.skipped,
      })),
      mcpError,
    };
  }
  return { source, vm, contentTitle: content.title };
}

/**
 * @param {{ root: string, req: import('http').IncomingMessage, res: import('http').ServerResponse, pathname?: string }} opts
 * @returns {Promise<boolean>} true if handled
 */
export async function handleApiRequest({ root, req, res, pathname: pathnameOverride }) {
  const base = publicBaseUrl(req);
  const url = new URL(req.url || "/", base);
  const pathname = pathnameOverride || url.pathname;
  const method = req.method === "HEAD" ? "GET" : req.method;

  if (method === "GET" && pathname === "/api/mcp/status") {
    const access = await resolveAccessToken(root, req, res);
    const [probe, oauth] = await Promise.all([probeMcp(), oauthMeta()]);
    sendJson(res, 200, {
      mcpUrl: MCP_URL(),
      mode: access ? "guest_token_present" : "fixture",
      tokenOnServer: Boolean(access),
      login: `${base}/auth/start`,
      host: base,
      probe,
      oauth: {
        issuer: oauth.issuer,
        authorization_endpoint: oauth.authorization_endpoint,
        token_endpoint: oauth.token_endpoint,
        registration_endpoint: oauth.registration_endpoint,
        pkce: oauth.code_challenge_methods_supported,
      },
    });
    return true;
  }

  if (method === "GET" && pathname === "/api/tools") {
    const access = await resolveAccessToken(root, req, res);
    if (!access) {
      sendJson(res, 401, { error: "login_required", login: "/auth/start" });
      return true;
    }
    const snap = await snapshotTools(root, access);
    sendJson(res, snap.ok ? 200 : 502, snap);
    return true;
  }

  if (method === "GET" && pathname === "/api/history") {
    const access = await resolveAccessToken(root, req, res);
    const fixturePath = join(root, "content/fixture-orders.json");
    const loadFixture = async (source) => {
      const data = JSON.parse(await readFile(fixturePath, "utf8"));
      const receipts = ordersToReceipts(data);
      return {
        source,
        receipts,
        freq: freqFromReceipts(receipts),
        tokenOnServer: Boolean(access),
        rawCount: receipts.reduce((n, r) => n + (r.lines?.length || 0), 0),
      };
    };
    if (access) {
      try {
        const live = await loadHistoryViaMcp(access);
        if (live.ok && Array.isArray(live.receipts) && live.receipts.length) {
          sendJson(res, 200, {
            source: "mcp",
            receipts: live.receipts,
            freq: live.freq || freqFromReceipts(live.receipts),
            rawCount: live.rawCount || 0,
            tokenOnServer: true,
            trace: live.trace || [],
          });
          return true;
        }
        const fallback = await loadFixture("fixture_fallback");
        fallback.mcpOk = Boolean(live.ok);
        fallback.trace = live.trace || [];
        sendJson(res, 200, fallback);
        return true;
      } catch (e) {
        const fallback = await loadFixture("fixture_error");
        fallback.error = e.message;
        sendJson(res, 200, fallback);
        return true;
      }
    }
    sendJson(res, 200, await loadFixture("fixture"));
    return true;
  }

  if (method === "GET" && pathname === "/auth/start") {
    const redir = redirectUri(req);
    const client = await registerClient(redir);
    const { verifier, challenge } = pkcePair();
    const state = createHash("sha256").update(randomBytes(16)).digest("hex").slice(0, 24);
    const pending = { state, verifier, clientId: client.client_id };
    localPending.set(state, pending);
    const cookies = [];
    try {
      cookies.push(setPendingAuthCookie(pending));
    } catch (e) {
      if (process.env.VERCEL) {
        sendHtml(res, 500, `<p>Auth cookie secret missing: ${e.message}</p>`);
        return true;
      }
    }
    const loc = authorizeUrl({
      clientId: client.client_id,
      redirectUri: redir,
      challenge,
      state,
    });
    redirect(res, loc, cookies);
    return true;
  }

  if (method === "GET" && pathname === "/auth/callback") {
    const err = url.searchParams.get("error");
    if (err) {
      sendHtml(res, 400, `<p>OAuth error: ${err}</p><p><a href="/">Назад</a></p>`);
      return true;
    }
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    let pending = localPending.get(state);
    localPending.delete(state);
    if (!pending) {
      const fromCookie = readPendingAuth(req.headers?.cookie || "");
      if (fromCookie?.state === state) pending = fromCookie;
    }
    if (!code || !pending) {
      sendHtml(
        res,
        400,
        `<p>Немає code/state. Почніть з <a href="/auth/start">/auth/start</a>.</p>`,
      );
      return true;
    }
    try {
      const redir = redirectUri(req);
      const tok = await exchangeCode({
        clientId: pending.clientId,
        redirectUri: redir,
        code,
        verifier: pending.verifier,
      });
      const blob = tokenBlobFromOAuth(pending.clientId, tok);
      const cookies = [clearPendingAuthCookie()];
      try {
        cookies.push(setTokenCookie(blob));
      } catch {
        /* local without cookie secret — disk only */
      }
      try {
        await persistTokens(root, pending.clientId, tok);
      } catch {
        /* Vercel read-only — cookie is enough */
      }
      clearHistoryMcpCache();
      let toolsLine = "tools/list ще не зняли";
      try {
        const snap = await snapshotTools(root, tok.access_token);
        toolsLine = snap.ok ? `tools/list: ${snap.count} tools` : `tools/list http ${snap.http}`;
      } catch (e) {
        toolsLine = `tools/list: ${e.message}`;
      }
      setCookies(res, cookies);
      sendHtml(
        res,
        200,
        `<p>Вхід успішний.</p><p>${toolsLine}</p><p><a href="/#/shop">До Express</a> · <a href="/">На старт</a></p>
<script>
try {
  var h = sessionStorage.getItem("silpo.returnHash") || "#/";
  sessionStorage.removeItem("silpo.returnHash");
  if (h.charAt(0) === "#") location.replace("/" + h);
} catch (e) {}
</script>`,
      );
      return true;
    } catch (e) {
      sendHtml(res, 400, `<p>Обмін коду не вдався: ${e.message}</p><p><a href="/auth/start">Ще раз</a></p>`);
      return true;
    }
  }

  if (method === "POST" && pathname === "/api/browse") {
    const body = await readBody(req);
    const access = await resolveAccessToken(root, req, res);
    if (!access) {
      sendJson(res, 401, { error: "login_required", categories: [], products: [] });
      return true;
    }
    try {
      const out = await browseViaMcp(access, body);
      sendJson(res, out.ok ? 200 : 502, out);
    } catch (e) {
      sendJson(res, 500, { error: e.message, categories: [], products: [] });
    }
    return true;
  }

  if (method === "POST" && pathname === "/api/replacements") {
    const body = await readBody(req);
    const access = await resolveAccessToken(root, req, res);
    if (!access) {
      sendJson(res, 401, { error: "login_required", options: [] });
      return true;
    }
    try {
      const out = await replacementsViaMcp(access, body);
      sendJson(res, out.ok ? 200 : 502, out);
    } catch (e) {
      sendJson(res, 500, { error: e.message, options: [] });
    }
    return true;
  }

  if (method === "POST" && pathname === "/api/cart/push") {
    const body = await readBody(req);
    const access = await resolveAccessToken(root, req, res);
    if (!access) {
      sendJson(res, 401, {
        ok: false,
        error: "login_required",
        login: "/auth/start",
        message: "Увійдіть у Сільпо, щоб додати товари в кошик",
      });
      return true;
    }
    try {
      const products = Array.isArray(body.products) ? body.products : [];
      const out = await pushCartProducts(access, products, { merge: body.merge !== false });
      sendJson(res, out.ok ? 200 : 502, out);
    } catch (e) {
      sendJson(res, 500, { ok: false, error: e.message, added: 0, skipped: 0 });
    }
    return true;
  }

  if (method === "POST" && pathname === "/api/resolve") {
    const body = await readBody(req);
    try {
      const access = await resolveAccessToken(root, req, res);
      const out = await handleResolve(root, access, body);
      sendJson(res, 200, out);
    } catch (e) {
      sendJson(res, 500, { error: e.message });
    }
    return true;
  }

  if (method === "POST" && pathname === "/api/walk-map") {
    const body = await readBody(req);
    const access = await resolveAccessToken(root, req, res);
    if (!access) {
      sendJson(res, 401, { ok: false, error: "login_required", login: "/auth/start" });
      return true;
    }
    try {
      const out = await walkMapViaMcp(access, body);
      sendJson(res, out.ok ? 200 : 502, out);
    } catch (e) {
      sendJson(res, 500, { ok: false, error: e.message });
    }
    return true;
  }

  if (method === "POST" && pathname === "/api/auth/logout") {
    setCookies(res, [clearTokenCookie(), clearPendingAuthCookie()]);
    sendJson(res, 200, { ok: true });
    return true;
  }

  return false;
}

export function isApiOrAuthPath(pathname) {
  return pathname.startsWith("/api/") || pathname.startsWith("/auth/");
}
