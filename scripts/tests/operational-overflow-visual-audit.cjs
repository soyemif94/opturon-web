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
  { label: "440", width: 440, height: 956 },
  { label: "768", width: 768, height: 1024 },
  { label: "1024", width: 1024, height: 768 },
  { label: "1366", width: 1366, height: 768 }
];

const routes = [
  ["orders-list", "/app/orders"],
  ["orders-new", "/app/orders/new"],
  ["inventory", "/app/inventory"],
  ["movements", "/app/inventory/movements"],
  ["suppliers", "/app/inventory/suppliers"],
  ["receipts", "/app/inventory/receipts"],
  ["receipt-new", "/app/inventory/receipts/new"],
  ["bulk-stock", "/app/inventory/bulk-adjust"]
];

async function metrics(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const workspace = document.querySelector("[data-operational-workspace]");
    const viewport = root.clientWidth;
    const intentionallyContained = (element) => {
      let current = element.parentElement;
      while (current && current !== document.body) {
        const style = getComputedStyle(current);
        const rect = current.getBoundingClientRect();
        if ((style.overflowX === "auto" || style.overflowX === "scroll") && rect.left >= -1 && rect.right <= viewport + 1) return true;
        current = current.parentElement;
      }
      return false;
    };
    const offenders = Array.from(document.querySelectorAll("body *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          element,
          selector: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}.${String(element.className || "").trim().split(/\s+/).slice(0, 3).join(".")}`,
          text: String(element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          viewport
        };
      })
      .filter((item) => item.width > 0 && (item.left < -1 || item.right > viewport + 1) && !intentionallyContained(item.element))
      .slice(0, 20)
      .map(({ element: _element, ...item }) => item);
    return {
      documentClientWidth: root.clientWidth,
      documentScrollWidth: root.scrollWidth,
      workspaceClientWidth: workspace?.clientWidth || null,
      workspaceScrollWidth: workspace?.scrollWidth || null,
      offenders,
      errorState: /Application error|Internal Server Error/i.test(document.body.innerText),
      loginRedirect: location.pathname === "/login"
    };
  });
}

async function main() {
  const token = await encode({
    secret,
    token: {
      name: "QA Phase1D",
      email: "qa@opturon.test",
      sub: "qa-phase1d",
      userId: "qa-phase1d",
      globalRole: "client",
      role: "client",
      tenantId,
      tenantRole: "owner",
      accountScope: "tenant",
      authSource: "backend"
    }
  });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.OPERATIONAL_AUDIT_BROWSER || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
  const results = [];
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      await context.addCookies([{ name: "next-auth.session-token", value: token, url: baseUrl }]);
      const page = await context.newPage();
      for (const [name, path] of routes) {
        try {
          const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle", timeout: 60_000 });
          if (name === "orders-new") {
            await page.getByRole("button", { name: /Agregar$/ }).last().click().catch(() => undefined);
            await page.waitForTimeout(100);
          }
          results.push({ viewport: viewport.label, route: name, path, status: response?.status() || null, ...(await metrics(page)) });
        } catch (error) {
          results.push({ viewport: viewport.label, route: name, path, fatal: String(error) });
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  const failures = results.filter((result) => result.fatal || result.errorState || result.loginRedirect || result.documentScrollWidth > result.documentClientWidth + 1 || result.workspaceScrollWidth > result.workspaceClientWidth + 1 || result.offenders?.length);
  const payload = process.env.OPERATIONAL_AUDIT_SUMMARY_ONLY === "1"
    ? {
        pass: failures.length === 0,
        failures,
        checked: results.length,
        viewports: viewports.map((viewport) => viewport.label),
        routes: routes.map(([route]) => route)
      }
    : { pass: failures.length === 0, failures, results };
  console.log(JSON.stringify(payload, null, 2));
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
