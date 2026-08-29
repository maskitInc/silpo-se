/** Shop Add + Lists / Receipts hash helpers (option B). No npm. */

const ADD_GROUP_IDS = new Set(["breads", "protein", "veg", "dairy", "extra", "alcohol", "preserve", "clean", "tobacco"]);

/**
 * @param {string} [hash]
 * @returns {{ screen: string, add: null | { pick: boolean, group: string, slug: string }, lists: null | { tab: string, receiptId: string|null } }}
 */
export function parseLocationHash(hash = "") {
  const raw = String(hash || "#/")
    .replace(/^#\/?/, "")
    .replace(/\/+$/, "");
  const parts = raw ? raw.split("/").filter(Boolean) : [];
  if (parts[0] === "sport") return { screen: "sport", add: null, lists: null };
  if (parts[0] === "day") {
    const dayISO = parts[1] && /^\d{4}-\d{2}-\d{2}$/.test(parts[1]) ? parts[1] : null;
    return { screen: "day", dayISO, add: null, lists: null };
  }
  if (parts[0] === "survey") return { screen: "survey", add: null, lists: null };
  if (parts[0] === "shop") {
    if (parts[1] === "add") {
      const group = parts[2] || "";
      const slug = parts[3] || "";
      if (!group) return { screen: "shop", add: { pick: true, group: "", slug: "" }, lists: null };
      if (!ADD_GROUP_IDS.has(group)) return { screen: "shop", add: { pick: true, group: "", slug: "" }, lists: null };
      return { screen: "shop", add: { pick: false, group, slug }, lists: null };
    }
    if (parts[1] === "lists") {
      const tab = parts[2] === "bases" ? "bases" : "receipts";
      return { screen: "shop", add: null, lists: { tab, receiptId: null, baseId: null } };
    }
    if (parts[1] === "receipts") {
      const receiptId = parts[2] ? decodeURIComponent(parts[2]) : null;
      return { screen: "shop", add: null, lists: { tab: "receipts", receiptId, baseId: null } };
    }
    if (parts[1] === "bases") {
      const baseId = parts[2] ? decodeURIComponent(parts[2]) : null;
      return { screen: "shop", add: null, lists: { tab: "bases", receiptId: null, baseId } };
    }
    return { screen: "shop", add: null, lists: null };
  }
  return { screen: "home", add: null, lists: null };
}

/**
 * @param {{ pick?: boolean, group?: string, slug?: string }} opts
 */
export function shopAddHref(opts = {}) {
  if (opts.pick || !opts.group) return "#/shop/add";
  const group = String(opts.group);
  if (!ADD_GROUP_IDS.has(group)) return "#/shop/add";
  const slug = String(opts.slug || "").trim();
  if (slug) return `#/shop/add/${group}/${encodeURIComponent(slug)}`;
  return `#/shop/add/${group}`;
}

export function shopListsHref(tab = "receipts") {
  return tab === "bases" ? "#/shop/lists/bases" : "#/shop/lists";
}

export function shopReceiptHref(id) {
  return `#/shop/receipts/${encodeURIComponent(String(id || ""))}`;
}

export function shopBaseHref(id) {
  return `#/shop/bases/${encodeURIComponent(String(id || ""))}`;
}

/** Map browse state → href. Search ignored in URL (v1). */
export function browseHrefFromState(browse) {
  if (!browse) return "#/shop";
  if (browse.pickGroup) return shopAddHref({ pick: true });
  const group = browse.group || "";
  if (!group) return shopAddHref({ pick: true });
  const slug = browse.search ? "" : browse.slug || "";
  return shopAddHref({ group, slug });
}

export function screenFromParsed(parsed) {
  return parsed?.screen || "home";
}
