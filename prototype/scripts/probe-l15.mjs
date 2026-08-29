/** Live tree + group browse. Prints slugs/names only. No tokens. */
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import { loadAccessToken } from "../js/mcp/oauth.mjs";
import { connectMcp } from "../js/mcp/client.mjs";
import { bootstrapCart } from "../js/mcp/bootstrap.mjs";
import { flattenCategorySlugs, loadCategoryTree, slugsForGroup } from "../js/mcp/catalog.mjs";
import { browseViaMcp } from "../js/mcp/browse.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const token = await loadAccessToken(ROOT);
if (!token) {
  console.error("no token");
  process.exit(1);
}

const boot = await connectMcp(token);
if (!boot.ok) {
  console.error("mcp fail", boot.http, boot.step);
  process.exit(1);
}
const { context } = await bootstrapCart(boot.ctx);
const tree = await loadCategoryTree(boot.ctx, context);
const slugs = flattenCategorySlugs(tree.json);

const needles = {
  курка: /kuriatyna|kurka/i,
  свинина: /svynyn/i,
  яловичина: /yalovych/i,
  риба: /^ryba-|rybni-|losos-|skumbr-|khek-|okun-/i,
  морепродукти: /moreprodukt|krevet|midii|kalmar/i,
  яйця: /yayts|iaitsia|eggs/i,
  хумус: /humus|khumus|falafel/i,
  молоко: /moloko/i,
  йогурт: /iohurt|yogurt/i,
  пиво: /pyvo/i,
  вино: /vyna|vino/i,
  олія: /oliia|oliya|olivkov/i,
  майонез: /maionez/i,
  соус: /^sousy?-|^sous-/i,
  сметана: /smetana/i,
};

const hits = {};
for (const [k, re] of Object.entries(needles)) {
  hits[k] = slugs.filter((s) => re.test(s)).slice(0, 16);
}

const groups = {};
for (const g of ["protein", "dairy", "extra", "alcohol", "breads", "veg"]) {
  const out = await browseViaMcp(token, { group: g, groupTitle: g });
  groups[g] = {
    codeSlugs: slugsForGroup(tree.json, g),
    catSlugs: (out.categories || []).map((c) => c.slug),
    catTitles: (out.categories || []).map((c) => c.title),
    productCount: (out.products || []).length,
    sample: (out.products || []).slice(0, 4).map((p) => p.name),
    wineLeak: (out.categories || []).some((c) => /vyna|frukty|syry/i.test(c.slug || "")),
  };
}

const searchBreads = await browseViaMcp(token, { search: "батон", group: "breads", scope: "branch" });
const searchGlobal = await browseViaMcp(token, { search: "батон", scope: "global" });

const report = {
  slugCount: slugs.length,
  hits,
  groups,
  searchBreads: {
    count: (searchBreads.products || []).length,
    names: (searchBreads.products || []).slice(0, 8).map((p) => p.name),
    scope: searchBreads.scope,
  },
  searchGlobal: {
    count: (searchGlobal.products || []).length,
    names: (searchGlobal.products || []).slice(0, 8).map((p) => p.name),
  },
};

const outPath = join(ROOT, "../research/add-flow/L15-probe.json");
await writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));
