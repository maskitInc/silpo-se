import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { connectMcp } from "./js/mcp/client.mjs";
import { loadAccessToken } from "./js/mcp/oauth.mjs";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const WANT = [
  "silpo_find_products_batch",
  "silpo_get_shopping_cart_by_id",
  "silpo_add_or_update_cart_products",
  "silpo_get_my_offline_orders",
  "silpo_get_my_online_orders",
  "silpo_get_time_slots",
];

const token = await loadAccessToken(ROOT);
if (!token) {
  console.error("no token");
  process.exit(1);
}

const boot = await connectMcp(token);
const schemas = {};
for (const t of boot.tools || []) {
  if (WANT.includes(t.name) || true) {
    schemas[t.name] = t.inputSchema || t.input_schema || null;
  }
}
const slim = {};
for (const name of Object.keys(schemas).sort()) {
  slim[name] = schemas[name];
}
await writeFile(
  join(ROOT, "content/tools-schemas.public.json"),
  JSON.stringify({ fetchedAt: new Date().toISOString(), count: boot.names?.length || 0, schemas: slim }, null, 2),
);
console.log(
  JSON.stringify({
    ok: boot.ok,
    http: boot.http,
    toolCount: boot.names?.length,
    wanted: Object.fromEntries(WANT.map((n) => [n, slim[n] || null])),
  }),
);
