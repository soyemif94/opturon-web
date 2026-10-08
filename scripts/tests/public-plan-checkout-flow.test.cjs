const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

function loadTypeScript(relativePath) {
  const filename = path.join(root, relativePath);
  const source = read(relativePath);
  const output = require("typescript").transpile(source, {
    module: require("typescript").ModuleKind.CommonJS,
    target: require("typescript").ScriptTarget.ES2022
  });
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(output, filename);
  return loaded.exports;
}

test("public plan checkout uses the canonical catalog and safe account handoff", async (t) => {
  const catalogRoute = read("app/api/public/plans/route.ts");
  const publicPlanPricing = read("components/sections/PublicPlanPricing.tsx");
  const saasHome = read("components/sections/SaasHome.tsx");
  const checkoutStartPage = read("app/checkout/start/page.tsx");
  const loginForm = read("components/login-form.tsx");
  const registerForm = read("components/auth/RegisterForm.tsx");
  const checkoutRoute = read("app/api/billing/checkout/route.ts");
  const apiHelpers = read("lib/api.ts");
  const returnPage = read("app/checkout/return/page.tsx");
  const returnClient = read("components/billing/CheckoutReturnStatus.tsx");

  await t.test("Home renders live canonical plans without financial price copies", () => {
    assert.match(catalogRoute, /\/api\/public\/plans/);
    assert.match(catalogRoute, /allowedPlanKeys\.has\(value\.key\)/);
    assert.match(catalogRoute, /plans\.length !== allowedPlanKeys\.size/);
    assert.match(catalogRoute, /status: 503/);
    assert.match(catalogRoute, /getApiBaseUrl\(\)/);
    assert.match(saasHome, /<PublicPlanPricing\s*\/>/);
    assert.match(saasHome, /href="#planes"/);
    assert.match(publicPlanPricing, /fetch\("\/api\/public\/plans"/);
    assert.match(publicPlanPricing, /plan\.recommended/);
    assert.match(publicPlanPricing, /formatBillingCadence\(plan\.billingCadence\)/);
    assert.match(publicPlanPricing, /plan\.key === "enterprise"/);
    assert.match(publicPlanPricing, /checkout\/start\?planKey=/);
    assert.match(publicPlanPricing, /currencyDisplay: "code"/);
    assert.doesNotMatch(publicPlanPricing, /\b(?:49900|69900|89900)\b/);
    assert.doesNotMatch(publicPlanPricing, /\/ mes/);
    assert.match(publicPlanPricing, /Elegí el plan ideal para tu negocio y activá Opturon en minutos\./);
    assert.match(publicPlanPricing, /Más elegido/);
    assert.match(publicPlanPricing, /Comenzar con Core/);
    assert.match(publicPlanPricing, /Elegir Growth/);
    assert.match(publicPlanPricing, /Elegir Distribución/);
    assert.match(publicPlanPricing, /Hablar con Opturon/);
    assert.match(publicPlanPricing, /WhatsApp e Inbox —/);
    assert.match(publicPlanPricing, /Bot IA Standard/);
    assert.match(publicPlanPricing, /Bot IA Avanzado/);
    assert.match(publicPlanPricing, /state === "error"/);
    assert.match(saasHome, /opturon-inbox-client-portal\.png/);
    assert.match(saasHome, /opturon-orders-create-order\.png/);
    assert.match(saasHome, /opturon-catalog-client-portal\.png/);
    assert.match(saasHome, /opturon-metrics-client-portal\.png/);
    assert.match(saasHome, /Vendé, organizá y controlá tu operación desde un solo lugar\./);
  });

  await t.test("fixed plan selection survives login and registration without sending terms", () => {
    assert.match(checkoutStartPage, /login\?callbackUrl=/);
    assert.match(checkoutStartPage, /callbackUrl = `\/checkout\/start\?planKey=/);
    assert.match(loginForm, /normalizeSafeInternalCallback/);
    assert.match(loginForm, /register\?callbackUrl=/);
    assert.match(registerForm, /safeCheckoutCallback/);
    assert.match(registerForm, /signIn\("credentials"/);
    assert.match(registerForm, /callbackUrl\s*\n/);
    assert.match(registerForm, /JSON\.stringify\(\{ name, businessName, email, password \}\)/);
    assert.doesNotMatch(registerForm, /JSON\.stringify\([^)]*planKey/);
  });

  await t.test("callback sanitizer rejects external URLs and noncanonical checkout state", () => {
    const { normalizeSafeInternalCallback, safeCheckoutCallback } = loadTypeScript("lib/safe-internal-callback.ts");
    const origin = "https://opturon.example";
    assert.equal(normalizeSafeInternalCallback("/app/sales?view=kanban", "/app", origin), "/app/sales?view=kanban");
    assert.equal(normalizeSafeInternalCallback("https://attacker.example/", "/app", origin), "/app");
    assert.equal(normalizeSafeInternalCallback("//attacker.example/", "/app", origin), "/app");
    assert.equal(normalizeSafeInternalCallback("/\\attacker.example", "/app", origin), "/app");
    assert.equal(safeCheckoutCallback("/checkout/start?planKey=growth", origin), "/checkout/start?planKey=growth");
    assert.equal(safeCheckoutCallback("/checkout/start?planKey=enterprise", origin), "/app");
    assert.equal(safeCheckoutCallback("/checkout/start?planKey=growth&amount=1", origin), "/app");
    assert.equal(safeCheckoutCallback("https://attacker.example/checkout/start?planKey=growth", origin), "/app");
  });

  await t.test("checkout mutation is same-origin authenticated POST with only a plan key", () => {
    assert.match(checkoutRoute, /export async function POST/);
    assert.doesNotMatch(checkoutRoute, /export async function GET/);
    assert.match(checkoutRoute, /isSameOriginJsonRequest\(request\)/);
    assert.match(checkoutRoute, /resolvePortalBillingSession\(\)/);
    assert.match(checkoutRoute, /Object\.keys\(body\)\.length !== 1/);
    assert.match(checkoutRoute, /fixedPlanKeys\.has\(planKey\)/);
    assert.match(checkoutRoute, /createPortalSaasCheckout\(actor\.tenantId, actor\.actorUserId, planKey/);
    const checkoutHelper = apiHelpers.slice(apiHelpers.indexOf("export async function createPortalSaasCheckout"), apiHelpers.indexOf("export async function getPortalSaasCheckoutStatus"));
    assert.match(checkoutHelper, /body: JSON\.stringify\(\{ planKey \}\)/);
    const serializedBody = checkoutHelper.match(/body: JSON\.stringify\((\{[^}]+\})\)/)?.[1];
    assert.equal(serializedBody, "{ planKey }");
  });

  await t.test("Enterprise routes to contact and never the fixed checkout", () => {
    assert.match(publicPlanPricing, /href=\{contact \? "\/contacto"/);
    assert.match(publicPlanPricing, /presentation\.cta/);
    assert.match(checkoutStartPage, /requested === "enterprise"\) redirect\("\/contacto"\)/);
    assert.ok(checkoutStartPage.indexOf('requested === "enterprise"') < checkoutStartPage.indexOf('<CheckoutStartClient'));
  });

  await t.test("return page trusts bounded authenticated server status only", () => {
    assert.match(returnPage, /getServerSession\(authOptions\)/);
    assert.doesNotMatch(returnPage, /searchParams/);
    assert.match(returnClient, /fetch\("\/api\/billing\/status"/);
    assert.match(returnClient, /checks < 5/);
    assert.match(returnClient, /setTimeout\(\(\) => void poll\(\), 5000\)/);
    assert.doesNotMatch(returnClient, /activatePlan|setTenantPlan|enableModules/);
  });
});
