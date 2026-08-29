import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://127.0.0.1:8766/?v=ds439#/shop", { waitUntil: "networkidle" });
await page.waitForSelector("#shop-checklist");
const metrics = await page.evaluate(() => {
  const walletCard = document.querySelector(".shop-progress__wallet-card");
  const pantry = document.querySelector("#shop-pantry-nudge");
  const controls = document.querySelector(".shop-controls--wallet");
  const dockNum = document.querySelector(".dock-meta .num");
  const wow = document.querySelector(".shop-progress__whisper-wow");
  return {
    unified: !!document.querySelector(".shop-checkout-header--wallet-unified"),
    walletShell: !!document.querySelector(".shop-progress__wallet-card--shell"),
    pantryInCard: Boolean(walletCard && pantry && walletCard.contains(pantry)),
    controlsInCard: Boolean(walletCard && controls && walletCard.contains(controls)),
    assistInline: !!document.querySelector(".shop-assist-zone--wallet-inline"),
    wowUp: !!document.querySelector(".shop-progress__whisper-wow--up"),
    wowTxt: wow?.textContent || "",
    dockHasSum: !!dockNum,
    dockMeta: document.querySelector(".dock-meta")?.innerText || "",
    headerH: document.querySelector(".shop-checkout-header")?.offsetHeight,
    groupsAboveFold: [...document.querySelectorAll(".group--sheet")].filter(
      (g) => g.getBoundingClientRect().top < window.innerHeight * 0.62,
    ).length,
    listBeacons: document.querySelectorAll(".shop-flow--checkout .sku-beacon").length,
  };
});
await page.screenshot({ path: "visual-shots/ds439-shop-wallet-unified.png", fullPage: false });
console.log(JSON.stringify(metrics, null, 2));
const fail =
  !metrics.unified ||
  !metrics.walletShell ||
  !metrics.pantryInCard ||
  !metrics.controlsInCard ||
  !metrics.wowUp ||
  metrics.dockHasSum ||
  metrics.groupsAboveFold < 2 ||
  metrics.headerH > 195 ||
  metrics.listBeacons > 0;
if (fail) process.exit(1);
await browser.close();
