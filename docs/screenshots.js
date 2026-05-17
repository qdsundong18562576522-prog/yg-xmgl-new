const { chromium } = require("playwright");
const http = require("http");

const BASE = "http://localhost:12404";
const OUT = "C:\\Users\\Administrator\\Desktop\\xmwd\\yg-xmgl-new\\docs\\screenshots";
const fs = require("fs");

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

function apiLogin() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ username: "admin", password: "admin123" });
    const url = new URL("/api/v1/auth/login", BASE);
    const req = http.request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
    }, (res) => {
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        try {
          const d = JSON.parse(body);
          resolve(d.data?.access_token);
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function shot(page, name, url, opts = {}) {
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 10000 });
    await page.waitForTimeout(800);
    const path = OUT + "\\" + name + ".png";
    await page.screenshot({ path, fullPage: opts.fullPage !== false });
    console.log("  [OK] " + name + ".png");
  } catch (e) {
    console.log("  [ERR] " + name + ": " + (e.message || "").slice(0, 60));
  }
}

(async () => {
  console.log("=== Login ===");
  const token = await apiLogin();
  if (!token) { console.error("Login failed"); process.exit(1); }
  console.log("  Token OK");

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Set auth in localStorage
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate((t) => {
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify({ id: 1, username: "admin", displayName: "系统管理员", role: "admin" }));
  }, token);

  console.log("=== Screenshots ===");

  await shot(page, "01_数据看板", BASE);
  await shot(page, "02_项目列表", BASE + "/projects");
  await shot(page, "03_项目台账列表", BASE + "/projects/ledger");
  await shot(page, "04_采购申请列表", BASE + "/purchases/requests");
  await shot(page, "05_采购询价列表", BASE + "/purchases/inquiries");
  await shot(page, "06_采购确认列表", BASE + "/purchases/confirms");
  await shot(page, "07_供货通知列表", BASE + "/purchases/delivery");
  await shot(page, "08_公司库存", BASE + "/inventory/company");
  await shot(page, "09_项目库存", BASE + "/inventory/project");
  await shot(page, "10_材料领用", BASE + "/inventory/requisitions");
  await shot(page, "11_转库记录", BASE + "/inventory/stock-out");
  await shot(page, "12_费用申请", BASE + "/expenses/requests");
  await shot(page, "13_费用报销", BASE + "/expenses/reimbursements");
  await shot(page, "14_劳务合同", BASE + "/labor/contracts");
  await shot(page, "15_劳务签证", BASE + "/labor/visas");
  await shot(page, "16_付款申请", BASE + "/finance/payment-requests");
  await shot(page, "17_项目回款", BASE + "/finance/receivables");
  await shot(page, "18_系统设置", BASE + "/settings");

  // Mobile screenshots
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mob = await mobileCtx.newPage();
  await mob.goto(BASE, { waitUntil: "domcontentloaded" });
  await mob.evaluate((t) => {
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify({ id: 1, username: "admin", displayName: "系统管理员", role: "admin" }));
  }, token);

  await shot(mob, "19_移动端工作台", BASE + "/m/dashboard", { fullPage: false });
  await shot(mob, "20_移动端审批", BASE + "/m/approvals", { fullPage: false });
  await shot(mob, "21_移动端消息", BASE + "/m/notifications", { fullPage: false });
  await shot(mob, "22_移动端我的", BASE + "/m/profile", { fullPage: false });

  await browser.close();
  console.log("=== All screenshots done ===");
})();
