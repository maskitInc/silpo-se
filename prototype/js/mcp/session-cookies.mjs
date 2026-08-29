import { createHmac, timingSafeEqual } from "node:crypto";

const PENDING_COOKIE = "silpo_pkce";
const TOKEN_COOKIE = "silpo_tok";

function secret() {
  return process.env.SILPO_COOKIE_SECRET || process.env.COOKIE_SECRET || "";
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function b64urlJson(obj) {
  return b64url(Buffer.from(JSON.stringify(obj), "utf8"));
}

function sign(payloadB64) {
  const s = secret();
  if (!s) throw new Error("SILPO_COOKIE_SECRET missing");
  return b64url(createHmac("sha256", s).update(payloadB64).digest());
}

function pack(obj) {
  const payload = b64urlJson(obj);
  return `${payload}.${sign(payload)}`;
}

function fromB64url(s) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function unpack(raw) {
  if (!raw || typeof raw !== "string" || !secret()) return null;
  const i = raw.lastIndexOf(".");
  if (i <= 0) return null;
  const payload = raw.slice(0, i);
  const mac = raw.slice(i + 1);
  const expect = sign(payload);
  const a = Buffer.from(mac);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(fromB64url(payload).toString("utf8"));
  } catch {
    return null;
  }
}

export function parseCookieHeader(header) {
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function cookieAttrs({ maxAge, httpOnly = true } = {}) {
  const parts = ["Path=/", "SameSite=Lax"];
  if (httpOnly) parts.push("HttpOnly");
  if (process.env.VERCEL || process.env.NODE_ENV === "production") parts.push("Secure");
  if (typeof maxAge === "number") parts.push(`Max-Age=${maxAge}`);
  return parts.join("; ");
}

export function readPendingAuth(cookieHeader) {
  const cookies = parseCookieHeader(cookieHeader);
  return unpack(cookies[PENDING_COOKIE]);
}

export function readTokenBlob(cookieHeader) {
  const cookies = parseCookieHeader(cookieHeader);
  return unpack(cookies[TOKEN_COOKIE]);
}

export function setPendingAuthCookie(pending, maxAgeSec = 600) {
  return `${PENDING_COOKIE}=${encodeURIComponent(pack(pending))}; ${cookieAttrs({ maxAge: maxAgeSec })}`;
}

export function clearPendingAuthCookie() {
  return `${PENDING_COOKIE}=; ${cookieAttrs({ maxAge: 0 })}`;
}

export function setTokenCookie(blob, maxAgeSec = 60 * 60 * 24 * 30) {
  return `${TOKEN_COOKIE}=${encodeURIComponent(pack(blob))}; ${cookieAttrs({ maxAge: maxAgeSec })}`;
}

export function clearTokenCookie() {
  return `${TOKEN_COOKIE}=; ${cookieAttrs({ maxAge: 0 })}`;
}

export function tokenBlobFromOAuth(clientId, tokenJson) {
  return {
    access_token: tokenJson.access_token,
    refresh_token: tokenJson.refresh_token || null,
    token_type: tokenJson.token_type || "Bearer",
    expires_at: Date.now() + (Number(tokenJson.expires_in) || 3600) * 1000,
    client_id: clientId,
  };
}
