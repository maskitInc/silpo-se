import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://127.0.0.1:8766/?v=ds440#/shop", { waitUntil: "networkidle" });
await page.waitForSelector("#shop-checklist");
const metrics = await page.evaluate(() => ({
  kicker: !!document.querySelector(".shop-flow--checkout .sport-chrome__kicker"),
  compactChrome: !!document.querySelector(".shop-chrome--compact"),
  dockMeta: !!document.querySelector(".dock-meta"),
  dockCtaOnly: !!document.querySelector(".dock--cta-only"),
  cta: document.querySelector("#print")?.textContent || "",
  recentPill: !!document.querySelector(".shop-recent-shelf"),
  recentLabel: document.querySelector(".shop-recent-shelf__label")?.textContent || "",
  chromeH: document.querySelector(".shop-chrome--express")?.offsetHeight,
  headerH: document.querySelector(".shop-checkout-header")?.offsetHeight,
  stickyTop: getComputedStyle(document.querySelector(".shop-flow--checkout")).getPropertyValue(
    "--shop-checkout-sticky-top",
  ),
  groupsAboveFold: [...document.querySelectorAll(".group--sheet")].filter(
    (g) => g.getBoundingClientRect().top < window.innerHeight * 0.62,
  ).length,
  listBeacons: document.querySelectorAll(".shop-flow--checkout .sku-beacon").length,
}));
await page.screenshot({ path: "visual-shots/ds440-shop-fold-trim.png", fullPage: false });
console.log(JSON.stringify(metrics, null, 2));
const fail =
  metrics.kicker ||
  !metrics.compactChrome ||
  metrics.dockMeta ||
  !metrics.dockCtaOnly ||
  !/Погодити/.test(metrics.cta) ||
  metrics.groupsAboveFold < 2 ||
  metrics.listBeacons > 0;
if (fail) process.exit(1);
await browser.close();
