const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const { encode } = require("next-auth/jwt");

const baseUrl = process.env.INBOX_STABILITY_BASE_URL || "http://127.0.0.1:3101";
const secret = process.env.INBOX_STABILITY_SECRET;
const dataDir = process.env.INBOX_STABILITY_DATA_DIR;
if (!secret) throw new Error("INBOX_STABILITY_SECRET is required");
if (!dataDir) throw new Error("INBOX_STABILITY_DATA_DIR is required");

const data = JSON.parse(fs.readFileSync(path.join(dataDir, "saas.json"), "utf8"));
const memberUserIds = new Set(data.memberships.map((membership) => membership.userId));
const staff = data.users.find((user) => ["ops_admin", "superadmin"].includes(user.globalRole) && !memberUserIds.has(user.id));
const tenantId = data.conversations[0]?.tenantId;
if (!staff || !tenantId) throw new Error("Responsive inbox fixture is incomplete");

const mobileViewports = [
  { label: "360", width: 360, height: 800 },
  { label: "390", width: 390, height: 844 },
  { label: "430", width: 430, height: 932 },
  { label: "440", width: 440, height: 956 }
];
const targets = [
  { id: "qa_conversation_1", name: "Contacto QA 01", kind: "historial_largo" },
  { id: "qa_conversation_2", name: "Contacto QA 02", kind: "historial_corto" },
  { id: "qa_conversation_28", name: "Contacto QA 28", kind: "antigua" },
  { id: "qa_conversation_3", name: "Contacto QA 03", kind: "reciente" }
];

async function createAuthenticatedContext(browser, token, viewport) {
  const context = await browser.newContext({ viewport });
  await context.addCookies([{ name: "next-auth.session-token", value: token, url: baseUrl }]);
  return context;
}

function isDesktopEmptyVisible(page) {
  return page.getByText("Selecciona una conversacion", { exact: true }).isVisible().catch(() => false);
}

async function auditMobile(browser, token, viewport) {
  const context = await createAuthenticatedContext(browser, token, viewport);
  const page = await context.newPage();
  const network = [];
  let injectError = true;

  page.on("response", (response) => {
    const url = new URL(response.url());
    if (!url.pathname.startsWith("/api/app/inbox")) return;
    network.push({ endpoint: url.pathname, status: response.status(), method: response.request().method(), cancelled: false });
  });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    if (!url.pathname.startsWith("/api/app/inbox")) return;
    network.push({ endpoint: url.pathname, status: null, method: request.method(), cancelled: true, error: request.failure()?.errorText || null });
  });

  await page.route("**/api/app/inbox/qa_conversation_1**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    await route.continue();
  });
  await page.route("**/api/app/inbox/qa_conversation_2**", async (route) => {
    if (injectError) {
      injectError = false;
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "qa_forced_detail_failure" }) });
      return;
    }
    await route.continue();
  });

  const inboxUrl = `${baseUrl}/app/inbox?demo=1&tenantId=${encodeURIComponent(tenantId)}`;
  const response = await page.goto(inboxUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  assert.equal(response?.status(), 200);
  const visibleList = page.locator('[aria-label="Lista de conversaciones"]:visible').first();
  await visibleList.waitFor({ state: "visible", timeout: 15_000 });
  const listProbe = await page.evaluate(async (activeTenantId) => {
    const response = await fetch(`/api/app/inbox?filter=all&visibility=active&channel=whatsapp&demo=1&tenantId=${encodeURIComponent(activeTenantId)}`);
    const body = await response.json().catch(() => null);
    return { status: response.status, body, ids: (body?.conversations || []).map((item) => item.id), names: (body?.conversations || []).map((item) => item.contact?.name) };
  }, tenantId);
  assert.equal(listProbe.status, 200);
  assert.ok(listProbe.ids.includes("qa_conversation_1"), JSON.stringify(listProbe));

  const results = [];
  for (const target of targets) {
    const row = page.locator('article button[type="button"]').filter({ hasText: target.name, visible: true }).first();
    await row.waitFor({ state: "visible", timeout: 10_000 });
    await row.click();
    await page.getByRole("button", { name: "Volver a conversaciones" }).waitFor({ state: "visible", timeout: 5_000 });

    const loading = await page.locator(".animate-pulse").count();
    const invalidEmptyDuringLoad = await isDesktopEmptyVisible(page);
    assert.equal(invalidEmptyDuringLoad, false, `${viewport.label}/${target.id} showed desktop empty state during loading`);

    if (target.id === "qa_conversation_2") {
      await page.getByText("No pudimos cargar esta conversación.", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
      assert.equal(await isDesktopEmptyVisible(page), false);
      await page.getByRole("button", { name: "Reintentar" }).click();
    }

    await page.getByText(new RegExp(`Mensaje QA \\d+ de la conversación ${Number(target.id.split("_").pop())}`)).filter({ visible: true }).first().waitFor({ state: "visible", timeout: 15_000 });
    assert.equal(await isDesktopEmptyVisible(page), false, `${viewport.label}/${target.id} degraded to desktop empty state`);

    const scroll = await page.evaluate(() => {
      const messages = document.querySelector('[aria-label="Mensajes de la conversación"]');
      const composer = document.querySelector('[aria-label="Escribe un mensaje"]') || document.querySelector("textarea");
      return {
        messagesScrollable: Boolean(messages && messages.scrollHeight >= messages.clientHeight),
        messagesOverflowY: messages ? getComputedStyle(messages).overflowY : null,
        composerVisible: Boolean(composer && composer.getBoundingClientRect().bottom <= innerHeight + 1)
      };
    });
    assert.equal(scroll.messagesOverflowY, "auto");
    assert.equal(scroll.composerVisible, true);

    results.push({
      id: target.id,
      kind: target.kind,
      selectedConversationId: target.id,
      loadingObserved: loading > 0,
      ready: true,
      invalidEmpty: false,
      scroll
    });

    if (target.id === "qa_conversation_28") {
      await page.goBack();
    } else {
      await page.getByRole("button", { name: "Volver a conversaciones" }).click();
    }
    await visibleList.waitFor({ state: "visible", timeout: 5_000 });
  }

  // Reopen the last payload unchanged: this is the exact pre-hotfix snapshot regression.
  await page.locator('article button[type="button"]').filter({ hasText: "Contacto QA 03", visible: true }).first().click();
  await page.getByText(/Mensaje QA \d+ de la conversación 3/).filter({ visible: true }).first().waitFor({ state: "visible", timeout: 15_000 });
  assert.equal(await isDesktopEmptyVisible(page), false, `${viewport.label}/reopen regressed to desktop empty state`);

  await context.close();
  return { viewport: viewport.label, status: response?.status() || null, results, network };
}

async function auditWide(browser, token, viewport) {
  const context = await createAuthenticatedContext(browser, token, viewport);
  const page = await context.newPage();
  const response = await page.goto(`${baseUrl}/app/inbox?demo=1&tenantId=${encodeURIComponent(tenantId)}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  await page.locator('[aria-label="Lista de conversaciones"]:visible').first().waitFor({ state: "visible", timeout: 15_000 });
  const result = await page.evaluate(() => ({
    width: innerWidth,
    listVisible: Boolean(document.querySelector('[aria-label="Lista de conversaciones"]')),
    messagesVisible: Boolean(document.querySelector('[aria-label="Mensajes de la conversación"]')),
    horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    invalidDetailEmpty: document.body.innerText.includes("Abre una fila de la izquierda") && innerWidth < 1280
  }));
  assert.equal(response?.status(), 200);
  assert.equal(result.listVisible, true);
  assert.equal(result.horizontalOverflow, 0);
  assert.equal(result.invalidDetailEmpty, false);
  await context.close();
  return { viewport: `${viewport.width}x${viewport.height}`, status: response?.status() || null, ...result };
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
    executablePath: process.env.INBOX_STABILITY_BROWSER || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
  });
  try {
    const mobile = [];
    for (const viewport of mobileViewports) mobile.push(await auditMobile(browser, token, viewport));
    const tablet = await auditWide(browser, token, { width: 1024, height: 768 });
    const desktop = await auditWide(browser, token, { width: 1366, height: 768 });
    console.log(JSON.stringify({ mobile, tablet, desktop }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
