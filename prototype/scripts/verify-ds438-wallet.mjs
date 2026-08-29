import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://127.0.0.1:8766/?v=ds438#/shop", { waitUntil: "networkidle" });
await page.waitForSelector("#shop-checklist");
const metrics = await page.evaluate(() => {
  const whisper = document.querySelector(".shop-progress__whisper-line");
  const compose = document.querySelector(".shop-progress__compose");
  const sumEl = document.querySelector(".shop-progress__inline-sum");
  const sumStyle = sumEl ? getComputedStyle(sumEl) : null;
  return {
    wallet: !!document.querySelector(".shop-progress--wallet"),
    microLegend: !!document.querySelector(".shop-progress__legend--micro"),
    caption: !!document.querySelector(".shop-progress__split-caption"),
    whisperBeforeBar: Boolean(whisper && compose && whisper.compareDocumentPosition(compose) & Node.DOCUMENT_POSITION_FOLLOWING),
    whisperTxt: whisper?.textContent || "",
    heroSum: sumEl?.textContent || "",
    sumFontFamily: sumStyle?.fontFamily || "",
    sumFontSize: sumStyle?.fontSize || "",
    barTitle: document.querySelector(".shop-progress__compose-track")?.title || "",
    acceptInline: document.querySelector(".shop-progress__accept-inline")?.textContent || "",
    headerH: document.querySelector(".shop-checkout-header")?.offsetHeight,
    groupsAboveFold: [...document.querySelectorAll(".group--sheet")].filter(
      (g) => g.getBoundingClientRect().top < window.innerHeight * 0.62,
    ).length,
    listBeacons: document.querySelectorAll(".shop-flow--checkout .sku-beacon").length,
  };
});
await page.screenshot({ path: "visual-shots/ds438-shop-wallet.png", fullPage: false });
console.log(JSON.stringify(metrics, null, 2));
const frauncesSum = /Fraunces|Cormorant/i.test(metrics.sumFontFamily);
const sumSizePx = parseFloat(metrics.sumFontSize) || 0;
const fail =
  !metrics.wallet ||
  metrics.microLegend ||
  metrics.caption ||
  !metrics.whisperBeforeBar ||
  !metrics.whisperTxt.includes("серпень") ||
  !frauncesSum ||
  sumSizePx < 26 ||
  !metrics.barTitle.includes("настрій") ||
  metrics.groupsAboveFold < 2 ||
  metrics.headerH > 175 ||
  metrics.listBeacons > 0;
if (fail) process.exit(1);
await browser.close();
