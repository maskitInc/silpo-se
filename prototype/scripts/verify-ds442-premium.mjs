import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://127.0.0.1:8766/?v=ds442#/shop", { waitUntil: "networkidle" });
await page.waitForSelector("#shop-checklist");
const metrics = await page.evaluate(() => {
  const sum = document.querySelector(".shop-progress__inline-sum");
  const remain = document.querySelector(".shop-progress__hero-remain .num");
  const sumStyle = sum ? getComputedStyle(sum) : null;
  const remainStyle = remain ? getComputedStyle(remain) : null;
  return {
    premium: !!document.querySelector(".shop-progress--premium"),
    moneyZone: !!document.querySelector(".shop-progress__money-zone"),
    sumSize: sumStyle?.fontSize || "",
    sumFamily: sumStyle?.fontFamily || "",
    remainColor: remainStyle?.color || "",
    groupsAboveFold: [...document.querySelectorAll(".group--sheet")].filter(
      (g) => g.getBoundingClientRect().top < window.innerHeight * 0.62,
    ).length,
    headerH: document.querySelector(".shop-checkout-header")?.offsetHeight,
  };
});
await page.screenshot({ path: "visual-shots/ds442-shop-premium.png", fullPage: false });
console.log(JSON.stringify(metrics, null, 2));
const sumPx = parseFloat(metrics.sumSize) || 0;
const fail =
  !metrics.premium ||
  !metrics.moneyZone ||
  sumPx < 30 ||
  !/Fraunces|Cormorant/i.test(metrics.sumFamily) ||
  metrics.groupsAboveFold < 2 ||
  metrics.headerH > 200;
if (fail) process.exit(1);
await browser.close();
