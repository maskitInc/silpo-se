import { createReadStream, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { handleApiRequest, isApiOrAuthPath, publicBaseUrl } from "./js/mcp/http-app.mjs";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT) || 8766;

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

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
    if (isApiOrAuthPath(url.pathname)) {
      const handled = await handleApiRequest({ root: ROOT, req, res, pathname: url.pathname });
      if (handled) return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
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
    if (req.method === "HEAD") return res.end();
    const stream = createReadStream(file);
    stream.on("error", () => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
    stream.pipe(res);
  } catch (e) {
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: e.message }));
    }
  }
});

server.listen(PORT, () => {
  const base = publicBaseUrl({ headers: { host: `127.0.0.1:${PORT}` } });
  console.log(`life-apps ${base}/`);
  console.log(`login     ${base}/auth/start`);
});
