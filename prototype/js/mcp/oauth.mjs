import { createHash, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const AS = "https://mcp.silpo.ua";
const RESOURCE = "https://mcp.silpo.ua/mcp";

export function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function pkcePair() {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export async function registerClient(redirectUri) {
  const res = await fetch(`${AS}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_name: "silpo-se",
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      application_type: "web",
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`register ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

export function authorizeUrl({ clientId, redirectUri, challenge, state }) {
  const u = new URL(`${AS}/authorize`);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("code_challenge", challenge);
  u.searchParams.set("code_challenge_method", "S256");
  u.searchParams.set("state", state);
  u.searchParams.set("resource", RESOURCE);
  return u.toString();
}

export async function exchangeCode({ clientId, redirectUri, code, verifier }) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: verifier,
    resource: RESOURCE,
  });
  const res = await fetch(`${AS}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`token ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

export async function refreshAccessToken({ clientId, refreshToken }) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    resource: RESOURCE,
  });
  const res = await fetch(`${AS}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`refresh ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

export function persistTokens(root, clientId, tokenJson) {
  const expiresAt = Date.now() + (Number(tokenJson.expires_in) || 3600) * 1000;
  return writeFile(
    join(root, ".token.json"),
    JSON.stringify(
      {
        access_token: tokenJson.access_token,
        refresh_token: tokenJson.refresh_token || null,
        token_type: tokenJson.token_type || "Bearer",
        expires_at: expiresAt,
        client_id: clientId,
      },
      null,
      2,
    ),
    "utf8",
  );
}

export async function loadAccessToken(root) {
  if (process.env.SILPO_MCP_TOKEN) return process.env.SILPO_MCP_TOKEN;
  const p = join(root, ".token.json");
  if (!existsSync(p)) return "";
  const j = JSON.parse(await readFile(p, "utf8"));
  if (j.expires_at && Date.now() > j.expires_at - 30_000 && j.refresh_token && j.client_id) {
    try {
      const fresh = await refreshAccessToken({ clientId: j.client_id, refreshToken: j.refresh_token });
      await persistTokens(root, j.client_id, {
        ...fresh,
        refresh_token: fresh.refresh_token || j.refresh_token,
      });
      return fresh.access_token;
    } catch {
      return j.access_token || "";
    }
  }
  return j.access_token || "";
}
