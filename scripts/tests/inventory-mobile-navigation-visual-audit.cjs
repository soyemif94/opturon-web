const { chromium } = require("playwright");
const { encode } = require("next-auth/jwt");
const saasData = require("../../data/saas.json");

const baseUrl = process.env.OPERATIONAL_AUDIT_BASE_URL || "http://127.0.0.1:3100";
const secret = process.env.OPERATIONAL_AUDIT_SECRET;
if (!secret) throw new Error("OPERATIONAL_AUDIT_SECRET is required");
const tenantId = process.env.OPERATIONAL_AUDIT_TENANT_ID || saasData.tenants[0]?.id;
if (!tenantId) throw new Error("OPERATIONAL_AUDIT_TENANT_ID is required");

const viewports = [
  { label: "360", width: 360, height: 800 },
  { label: "390", width: 390, height: 844 },
  { label: "430", width: 430, height: 932 },
  { label: "440", width: 440, height: 956 }
];

async function pageGeometry(page) {
  return page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    selectorWidth: Math.round(document.querySelector("[data-inventory-mobile-navigation]")?.getBoundingClientRect().width || 0),
    activeDesktopCount: document.querySelectorAll('[data-horizontal-rail="inventory-sections"] [aria-current="page"]').length,
    loginRedirect: location.pathname === "/login",
    errorState: /Application error|Internal Server Error/i.test(document.body.innerText)
  }));
}

async function main() {
  const token = await encode({
    secret,
    token: {
      name: "QA Inventory Navigation",
      email: "qa@opturon.test",
      sub: "qa-responsive-user",
      userId: "qa_responsive_user",
      globalRole: "client",
      role: "client",
      tenantId,
      tenantRole: "owner",
      accountScope: "tenant",
      authSource: "backend"
    }
  });
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.OPERATIONAL_AUDIT_BROWSER || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
  });
  const results = [];
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      await context.addCookies([{ name: "next-auth.session-token", value: token, url: baseUrl }]);
      const page = await context.newPage();
      await page.goto(`${baseUrl}/app/inventory`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      const selector = page.locator("[data-inventory-mobile-navigation]:visible").first();
      await selector.waitFor({ state: "visible" });
      const options = await selector.locator("option").evaluateAll((nodes) => nodes.map((node) => ({ label: node.textContent?.trim(), value: node.value })));

      for (const option of options) {
        await page.locator("[data-inventory-mobile-navigation]:visible").first().selectOption(option.value);
        await page.waitForFunction(
          (href) => `${location.pathname}${location.hash}` === href,
          option.value,
          { timeout: 15_000 }
        );
        await page.waitForTimeout(200);
        const selectedValue = await page.locator("[data-inventory-mobile-navigation]:visible").first().inputValue();
        results.push({ viewport: viewport.label, option, selectedValue, url: new URL(page.url()).pathname + new URL(page.url()).hash, ...(await pageGeometry(page)) });
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const failures = results.filter((result) =>
    result.loginRedirect || result.errorState || result.scrollWidth > result.clientWidth + 1 || result.selectorWidth > result.clientWidth || result.selectedValue !== result.option.value || result.url !== result.option.value
  );
  console.log(JSON.stringify({
    pass: failures.length === 0,
    checked: results.length,
    viewports: viewports.map((viewport) => viewport.label),
    labels: [...new Set(results.map((result) => result.option.label))],
    maxDocumentOverflow: Math.max(...results.map((result) => result.scrollWidth - result.clientWidth)),
    failures
  }, null, 2));
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
