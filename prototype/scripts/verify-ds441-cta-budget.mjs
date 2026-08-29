import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://127.0.0.1:8766/?v=ds441#/shop", { waitUntil: "networkidle" });
await page.waitForSelector("#shop-checklist");
const metrics = await page.evaluate(() => ({
  dockCta: !!document.querySelector(".dock-cta"),
  dockSum: document.querySelector(".dock-cta__sum")?.textContent || "",
  dockLabel: document.querySelector(".dock-cta__label")?.textContent || "",
  tight: document.querySelector(".shop-progress--tight")?.classList.contains("shop-progress--tight"),
  budgetPct: (() => {
    const fill = document.querySelector(".shop-progress__compose-fill");
    return fill?.style.width || "";
  })(),
  whiteControls: (() => {
    const sel = document.querySelector(".shop-controls--wallet select");
    return sel ? getComputedStyle(sel).backgroundColor : "";
  })(),
  groupsAboveFold: [...document.querySelectorAll(".group--sheet")].filter(
    (g) => g.getBoundingClientRect().top < window.innerHeight * 0.62,
  ).length,
  headerH: document.querySelector(".shop-checkout-header")?.offsetHeight,
}));
await page.screenshot({ path: "visual-shots/ds441-shop-cta-budget.png", fullPage: false });
console.log(JSON.stringify(metrics, null, 2));
const fail =
  !metrics.dockCta ||
  !metrics.dockSum.includes("455") ||
  !/Погодити/.test(metrics.dockLabel) ||
  !metrics.tight ||
  metrics.groupsAboveFold < 2;
if (fail) process.exit(1);
await browser.close();
