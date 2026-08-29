/**
 * Streamable HTTP MCP client. Token stays on the server.
 * Sends Mcp-Session-Id after initialize (required by many MCP HTTP servers).
 */

const MCP_URL = process.env.SILPO_MCP_URL || "https://mcp.silpo.ua/mcp";

export async function connectMcp(token) {
  const ctx = { token, sessionId: null, nextId: 1 };
  const init = await rpc(ctx, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "silpo-life-apps", version: "0.1.0" },
  });
  if (init.http === 401) {
    return { ok: false, step: "initialize", http: 401, names: [], ctx, listed: init };
  }
  await rpcNotify(ctx, "notifications/initialized");
  const listed = await rpc(ctx, "tools/list", {});
  const tools = listed.json?.result?.tools || listed.json?.tools || [];
  const names = tools.map((t) => t.name).filter(Boolean);
  return {
    ok: listed.http < 400 && names.length > 0,
    step: "tools/list",
    http: listed.http,
    names,
    tools,
    ctx,
    listed,
  };
}

/** @deprecated use connectMcp */
export async function initializeSession(token) {
  return connectMcp(token);
}

export async function callTool(ctxOrToken, name, args, id) {
  const ctx = typeof ctxOrToken === "string" ? { token: ctxOrToken, sessionId: null, nextId: id || 10 } : ctxOrToken;
  return rpc(ctx, "tools/call", { name, arguments: args || {} });
}

async function rpc(ctx, method, params) {
  const id = ctx.nextId++;
  const body = { jsonrpc: "2.0", id, method, params };
  return post(ctx, body);
}

async function rpcNotify(ctx, method, params = {}) {
  return post(ctx, { jsonrpc: "2.0", method, params });
}

async function post(ctx, body) {
  const headers = {
    Authorization: `Bearer ${ctx.token}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (ctx.sessionId) headers["Mcp-Session-Id"] = ctx.sessionId;
  const res = await fetch(MCP_URL, { method: "POST", headers, body: JSON.stringify(body) });
  const sid = res.headers.get("mcp-session-id");
  if (sid) ctx.sessionId = sid;
  const text = await res.text();
  return { http: res.status, json: parseMcpBody(text), rawHead: text.slice(0, 400), sessionId: ctx.sessionId };
}

function parseMcpBody(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return { parseError: true, text: trimmed.slice(0, 200) };
    }
  }
  const dataLines = trimmed
    .split("\n")
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5).trim());
  const last = dataLines.at(-1);
  if (!last) return { sse: true, text: trimmed.slice(0, 200) };
  try {
    return JSON.parse(last);
  } catch {
    return { sse: true, text: last.slice(0, 200) };
  }
}
