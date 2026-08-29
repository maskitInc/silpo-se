import { createHash, randomBytes } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { compose } from "./js/composer.js";
import { assertIntent } from "./js/contracts.js";
import { gateViewModel } from "./js/gate.js";
import { clipToBudget, fillMissingLinesFromFixture, resolveQueries } from "./js/resolver.js";
import { initializeSession } from "./js/mcp/client.mjs";
import { loadHistoryViaMcp, clearHistoryMcpCache } from "./js/mcp/history.mjs";
import { browseViaMcp } from "./js/mcp/browse.mjs";
import { replacementsViaMcp } from "./js/mcp/replacements.mjs";
import { resolveViaMcp, pushCartProducts } from "./js/mcp/w1.mjs";
import { walkMapViaMcp } from "./js/mcp/walk-map.mjs";
import { freqFromReceipts, ordersToReceipts } from "./js/receipts.js";
import {
  authorizeUrl,
  exchangeCode,
  loadAccessToken,
  persistTokens,
  pkcePair,
  registerClient,
} from "./js/mcp/oauth.mjs";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT) || 8766;
const MCP_URL = process.env.SILPO_MCP_URL || "https://mcp.silpo.ua/mcp";
const ENV_TOKEN = process.env.SILPO_MCP_TOKEN || "";
const pendingAuth = new Map();

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
};

function redirectUri() {
  return `http://127.0.0.1:${PORT}/auth/callback`;
}

async function token() {
  return (await loadAccessToken(ROOT)) || ENV_TOKEN;
}

async function probeMcp() {
  try {
    const res = await fetch(MCP_URL, { headers: { Accept: "application/json" } });
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

function send(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

function sendHtml(res, code, html) {
  res.writeHead(code, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

async function snapshotTools(access) {
  const listed = await initializeSession(access);
  const names = listed.names || [];
  await writeFile(
    join(ROOT, "content/tools-list.public.json"),
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
  return { ok: listed.ok, count: names.length, names };
}

async function handleResolve(body) {
  const kb = JSON.parse(await readFile(join(ROOT, "content/kb.json"), "utf8"));
  const shelf = JSON.parse(await readFile(join(ROOT, "content/shelf.json"), "utf8"));
  const intent = assertIntent(body.intent);
  const access = await token();

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
      return { ...q, staple, q: sw.name || sw.q, productId: sw.productId || sw.sku?.productId, slug: sw.slug || sw.sku?.slug };
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
      if (resolve.lines.some((l, i) => l !== live.resolve?.lines?.[i] && (l.status === "found" || l.status === "replaced"))) {
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
      trace: [...historyTrace, ...trace].map((t) => ({ step: t.step || t.tool, http: t.http, skipped: t.skipped })),
      mcpError,
    };
  }
  return { source, vm, contentTitle: content.title };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

    if (req.method === "GET" && url.pathname === "/api/mcp/status") {
      const access = await token();
      const [probe, oauth] = await Promise.all([probeMcp(), oauthMeta()]);
      return send(res, 200, {
        mcpUrl: MCP_URL,
        mode: access ? "guest_token_present" : "fixture",
        tokenOnServer: Boolean(access),
        login: `http://127.0.0.1:${PORT}/auth/start`,
        probe,
        oauth: {
          issuer: oauth.issuer,
          authorization_endpoint: oauth.authorization_endpoint,
          token_endpoint: oauth.token_endpoint,
          registration_endpoint: oauth.registration_endpoint,
          pkce: oauth.code_challenge_methods_supported,
        },
      });
    }

    if (req.method === "GET" && url.pathname === "/api/tools") {
      const access = await token();
      if (!access) return send(res, 401, { error: "login_required", login: "/auth/start" });
      const snap = await snapshotTools(access);
      return send(res, snap.ok ? 200 : 502, snap);
    }

    if (req.method === "GET" && url.pathname === "/api/history") {
      const access = await token();
      const fixturePath = join(ROOT, "content/fixture-orders.json");
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
            return send(res, 200, {
              source: "mcp",
              receipts: live.receipts,
              freq: live.freq || freqFromReceipts(live.receipts),
              rawCount: live.rawCount || 0,
              tokenOnServer: true,
              trace: live.trace || [],
            });
          }
          const fallback = await loadFixture("fixture_fallback");
          fallback.mcpOk = Boolean(live.ok);
          fallback.trace = live.trace || [];
          return send(res, 200, fallback);
        } catch (e) {
          const fallback = await loadFixture("fixture_error");
          fallback.error = e.message;
          return send(res, 200, fallback);
        }
      }
      return send(res, 200, await loadFixture("fixture"));
    }

    if (req.method === "GET" && url.pathname === "/auth/start") {
      const client = await registerClient(redirectUri());
      const { verifier, challenge } = pkcePair();
      const state = createHash("sha256").update(randomBytes(16)).digest("hex").slice(0, 24);
      pendingAuth.set(state, { verifier, clientId: client.client_id });
      const loc = authorizeUrl({
        clientId: client.client_id,
        redirectUri: redirectUri(),
        challenge,
        state,
      });
      res.writeHead(302, { Location: loc });
      return res.end();
    }

    if (req.method === "GET" && url.pathname === "/auth/callback") {
      const err = url.searchParams.get("error");
      if (err) {
        return sendHtml(res, 400, `<p>OAuth error: ${err}</p><p><a href="/">Назад</a></p>`);
      }
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const pending = pendingAuth.get(state);
      pendingAuth.delete(state);
      if (!code || !pending) {
        return sendHtml(res, 400, `<p>Немає code/state. Почніть з <a href="/auth/start">/auth/start</a>.</p>`);
      }
      try {
        const tok = await exchangeCode({
          clientId: pending.clientId,
          redirectUri: redirectUri(),
          code,
          verifier: pending.verifier,
        });
        await persistTokens(ROOT, pending.clientId, tok);
        clearHistoryMcpCache();
        let toolsLine = "tools/list ще не зняли";
        try {
          const snap = await snapshotTools(tok.access_token);
          toolsLine = snap.ok ? `tools/list: ${snap.count} tools` : `tools/list http ${snap.http}`;
        } catch (e) {
          toolsLine = `tools/list: ${e.message}`;
        }
        return sendHtml(
          res,
          200,
          `<p>Вхід успішний. Токен на диску (.token.json, не в git).</p><p>${toolsLine}</p><p><a href="/#/shop">До Express</a> · <a href="/">На старт</a></p>
<script>
try {
  var h = sessionStorage.getItem("silpo.returnHash") || "#/";
  sessionStorage.removeItem("silpo.returnHash");
  if (h.charAt(0) === "#") location.replace("/" + h);
} catch (e) {}
</script>`,
        );
      } catch (e) {
        return sendHtml(res, 400, `<p>Обмін коду не вдався: ${e.message}</p><p><a href="/auth/start">Ще раз</a></p>`);
      }
    }

    if (req.method === "POST" && url.pathname === "/api/browse") {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      const access = await token();
      if (!access) return send(res, 401, { error: "login_required", categories: [], products: [] });
      try {
        const out = await browseViaMcp(access, body);
        return send(res, out.ok ? 200 : 502, out);
      } catch (e) {
        return send(res, 500, { error: e.message, categories: [], products: [] });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/replacements") {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      const access = await token();
      if (!access) return send(res, 401, { error: "login_required", options: [] });
      try {
        const out = await replacementsViaMcp(access, body);
        return send(res, out.ok ? 200 : 502, out);
      } catch (e) {
        return send(res, 500, { error: e.message, options: [] });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/cart/push") {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      const access = await token();
      if (!access) {
        return send(res, 401, {
          ok: false,
          error: "login_required",
          login: "/auth/start",
          message: "Увійдіть у Сільпо, щоб додати товари в кошик",
        });
      }
      try {
        const products = Array.isArray(body.products) ? body.products : [];
        const out = await pushCartProducts(access, products, {
          merge: body.merge !== false,
        });
        return send(res, out.ok ? 200 : 502, out);
      } catch (e) {
        return send(res, 500, { ok: false, error: e.message, added: 0, skipped: 0 });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/resolve") {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      try {
        const out = await handleResolve(body);
        return send(res, 200, out);
      } catch (e) {
        return send(res, 500, { error: e.message });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/walk-map") {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      const access = await token();
      if (!access) return send(res, 401, { ok: false, error: "login_required", login: "/auth/start" });
      try {
        const out = await walkMapViaMcp(access, body);
        return send(res, out.ok ? 200 : 502, out);
      } catch (e) {
        return send(res, 500, { ok: false, error: e.message });
      }
    }

    if (req.method !== "GET") {
      res.writeHead(405);
      return res.end();
    }
    let rel = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
    rel = normalize(rel).replace(/^(\.\.(\/|\\|$))+/, "");
    const file = join(ROOT, rel);
    if (!file.startsWith(ROOT) || !existsSync(file)) {
      res.writeHead(404);
      return res.end("not found");
    }
    res.writeHead(200, {
      "Content-Type": TYPES[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      Pragma: "no-cache",
    });
    const stream = createReadStream(file);
    stream.on("error", () => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
    stream.pipe(res);
  } catch (e) {
    if (!res.headersSent) send(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`life-apps http://127.0.0.1:${PORT}/`);
  console.log(`login     http://127.0.0.1:${PORT}/auth/start`);
});
