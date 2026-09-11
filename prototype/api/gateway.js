import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { handleApiRequest } from "../js/mcp/http-app.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

function pathnameFromReq(req) {
  const u = new URL(req.url || "/", "http://localhost");
  const fromQuery = u.searchParams.get("__path");
  if (fromQuery) return fromQuery;
  // After rewrite to /api/gateway, prefer original path headers when present
  const inv =
    req.headers["x-invoke-path"] ||
    req.headers["x-forwarded-uri"] ||
    req.headers["x-vercel-forwarded-path"];
  if (inv) {
    try {
      return new URL(String(inv), "http://localhost").pathname;
    } catch {
      return String(inv).split("?")[0];
    }
  }
  return u.pathname;
}

export default async function handler(req, res) {
  try {
    // Preflight (some browsers / extensions hit OPTIONS even on same-site JSON POSTs)
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Max-Age", "86400");
      res.status(204).end();
      return;
    }
    const pathname = pathnameFromReq(req);
    // Rebuild URL so callback query params stay on req.url for URL()
    if (pathname.startsWith("/auth/") || pathname.startsWith("/api/")) {
      const incoming = new URL(req.url || "/", "http://localhost");
      const rebuilt = new URL(pathname, "http://localhost");
      incoming.searchParams.forEach((v, k) => {
        if (k !== "__path") rebuilt.searchParams.set(k, v);
      });
      req.url = rebuilt.pathname + rebuilt.search;
    }
    const handled = await handleApiRequest({ root: ROOT, req, res, pathname });
    if (!handled) {
      res.status(404).json({ error: "not_found", path: pathname });
    }
  } catch (e) {
    console.error("gateway", e);
    if (!res.headersSent) res.status(500).json({ error: e.message || String(e) });
  }
}
