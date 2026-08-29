import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://127.0.0.1:8766/?v=ds437#/shop", { waitUntil: "networkidle" });
await page.waitForSelector("#shop-checklist");
const metrics = await page.evaluate(() => ({
  wallet: !!document.querySelector(".shop-progress--wallet"),
  walletCard: !!document.querySelector(".shop-progress__wallet-card"),
  microLegend: !!document.querySelector(".shop-progress__legend--micro"),
  whisperLine: !!document.querySelector(".shop-progress__whisper-line"),
  whisperTxt: document.querySelector(".shop-progress__whisper-line")?.textContent || "",
  caption: !!document.querySelector(".shop-progress__split-caption"),
  captionTxt: document.querySelector(".shop-progress__split-caption")?.textContent || "",
  heroSum: document.querySelector(".shop-progress__inline-sum")?.textContent || "",
  remainTxt: document.querySelector(".shop-progress__hero-remain")?.textContent || "",
  acceptInline: document.querySelector(".shop-progress__accept-inline")?.textContent || "",
  headerH: document.querySelector(".shop-checkout-header")?.offsetHeight,
  groupsAboveFold: [...document.querySelectorAll(".group--sheet")].filter(
    (g) => g.getBoundingClientRect().top < window.innerHeight * 0.62,
  ).length,
  listBeacons: document.querySelectorAll(".shop-flow--checkout .sku-beacon").length,
}));
await page.screenshot({ path: "visual-shots/ds437-shop-wallet.png", fullPage: false });
console.log(JSON.stringify(metrics, null, 2));
const fail =
  !metrics.wallet ||
  !metrics.walletCard ||
  metrics.microLegend ||
  !metrics.whisperLine ||
  !metrics.caption ||
  metrics.groupsAboveFold < 2 ||
  metrics.headerH > 175 ||
  metrics.listBeacons > 0;
if (fail) process.exit(1);
await browser.close();
