const { chromium } = require("playwright");
const { encode } = require("next-auth/jwt");
const saasData = require("../../data/saas.json");

const baseUrl = process.env.RESPONSIVE_AUDIT_BASE_URL || "http://127.0.0.1:3100";
const secret = process.env.RESPONSIVE_AUDIT_SECRET;
if (!secret) throw new Error("RESPONSIVE_AUDIT_SECRET is required");

const staff = saasData.users.find((user) => user.globalRole === "ops_admin") || saasData.users[0];
const conversation = saasData.conversations[0];
const contact = saasData.contacts[0];

const allViewports = [
  { label: "360", width: 360, height: 800 },
  { label: "390", width: 390, height: 844 },
  { label: "430", width: 430, height: 932 },
  { label: "768", width: 768, height: 1024 },
  { label: "1024", width: 1024, height: 768 },
  { label: "desktop", width: 1366, height: 768 }
];

const allRoutes = [
  ["home", "/app"],
  ["ops", "/app/ops"],
  ["inbox-list", "/app/inbox"],
  ["inbox-chat", conversation ? `/app/inbox/${conversation.id}` : "/app/inbox"],
  ["contacts", "/app/contacts"],
  ["contact-detail", contact ? `/app/contacts/${contact.id}` : "/app/contacts"],
  ["catalog", "/app/catalog"],
  ["catalog-new", "/app/catalog/new"],
  ["catalog-images", "/app/catalog/images"],
  ["inventory", "/app/inventory"],
  ["inventory-movements", "/app/inventory/movements"],
  ["inventory-bulk", "/app/inventory/bulk-adjust"],
  ["suppliers", "/app/inventory/suppliers"],
  ["purchase-receipts", "/app/inventory/receipts"],
  ["purchase-receipt-new", "/app/inventory/receipts/new"],
  ["orders", "/app/orders"],
  ["sales", "/app/sales"],
  ["invoices", "/app/invoices"],
  ["payments", "/app/payments"],
  ["cash", "/app/cash"],
  ["loyalty", "/app/loyalty"],
  ["automations", "/app/automations"],
  ["agenda", "/app/agenda"],
  ["metrics", "/app/metrics"],
  ["settings", "/app/settings"],
  ["partners", "/partners"]
];

const selectedViewports = new Set((process.env.RESPONSIVE_AUDIT_VIEWPORTS || "").split(",").filter(Boolean));
const selectedRoutes = new Set((process.env.RESPONSIVE_AUDIT_ROUTES || "").split(",").filter(Boolean));
const viewports = selectedViewports.size ? allViewports.filter((viewport) => selectedViewports.has(viewport.label)) : allViewports;
const routes = selectedRoutes.size ? allRoutes.filter((route) => selectedRoutes.has(route[0])) : allRoutes;

async function inspect(page, module, viewport) {
  const response = await page.goto(`${baseUrl}${module[1]}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(400);
  const evaluateMetrics = () => page.evaluate(() => {
    const root = document.documentElement;
    const bodyText = document.body.innerText;
    const interactive = Array.from(document.querySelectorAll("button, a[href], input, select, textarea"))
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
      });
    const clippedInteractive = interactive
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label: (element.getAttribute("aria-label") || element.textContent || element.getAttribute("placeholder") || "").trim().slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom)
        };
      })
      .filter((rect) => rect.right > innerWidth + 1 || rect.left < -1)
      .slice(0, 12);
    const tinyTargets = interactive
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { label: (element.getAttribute("aria-label") || element.textContent || "").trim().slice(0, 60), width: rect.width, height: rect.height };
      })
      .filter((rect) => rect.width < 32 || rect.height < 32)
      .slice(0, 12);
    return {
      viewportWidth: innerWidth,
      documentWidth: root.scrollWidth,
      horizontalOverflow: Math.max(0, root.scrollWidth - innerWidth),
      clippedInteractive,
      tinyTargetCount: tinyTargets.length,
      tinyTargets,
      bodyHeight: document.body.scrollHeight,
      errorState: /Application error|Internal Server Error|This page could not be found/i.test(bodyText),
      loginRedirect: location.pathname === "/login",
      dialogCount: document.querySelectorAll('[role="dialog"]').length
    };
  });
  let metrics;
  try {
    metrics = await evaluateMetrics();
  } catch (error) {
    if (!/Execution context was destroyed|navigation/i.test(String(error))) throw error;
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => undefined);
    await page.waitForTimeout(250);
    metrics = await evaluateMetrics();
  }
  return {
    module: module[0],
    path: new URL(page.url()).pathname,
    viewport: viewport.label,
    status: response ? response.status() : null,
    ...metrics
  };
}

async function main() {
  const token = await encode({
    secret,
    token: {
      name: staff.name,
      email: staff.email,
      sub: staff.id,
      userId: staff.id,
      globalRole: staff.globalRole,
      role: staff.globalRole,
      accountScope: "opturon_admin",
      authSource: "local"
    }
  });
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.RESPONSIVE_AUDIT_BROWSER || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
  });
  const results = [];
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      await context.addCookies([{ name: "next-auth.session-token", value: token, url: baseUrl }]);
      const page = await context.newPage();
      for (const route of routes) {
        try {
          results.push(await inspect(page, route, viewport));
        } catch (error) {
          results.push({ module: route[0], path: route[1], viewport: viewport.label, fatal: String(error) });
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  const summary = results.reduce((accumulator, result) => {
    const key = result.module;
    accumulator[key] ||= { overflows: [], clipped: [], errors: [], redirects: [] };
    if (result.horizontalOverflow > 0) accumulator[key].overflows.push([result.viewport, result.horizontalOverflow]);
    if (result.clippedInteractive?.length) accumulator[key].clipped.push([result.viewport, result.clippedInteractive]);
    if (result.errorState || result.fatal) accumulator[key].errors.push([result.viewport, result.fatal || "error_state"]);
    if (result.loginRedirect) accumulator[key].redirects.push(result.viewport);
    return accumulator;
  }, {});
  console.log(JSON.stringify(process.env.RESPONSIVE_AUDIT_SUMMARY_ONLY === "1" ? { summary } : { summary, results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
