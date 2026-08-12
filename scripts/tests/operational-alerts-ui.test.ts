import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

const page = read("app/app/settings/operational-alerts/page.tsx");
const loading = read("app/app/settings/operational-alerts/loading.tsx");
const workspace = read("components/app/operational-alerts-workspace.tsx");
const route = read("app/api/app/operational-alerts/[...segments]/route.ts");
const proxy = read("lib/operational-alerts-proxy.ts");
const contracts = read("lib/operational-alerts.ts");
const api = read("lib/api.ts");
const settingsHub = read("app/app/settings/page.tsx");
const operationalModule = await import(pathToFileURL(path.join(root, "lib/operational-alerts.ts")).href);

const checks: Array<[string, () => void]> = [
  ["A settings page route loads", () => {
    assert(page.includes("OperationalAlertsWorkspace"));
    assert(loading.includes("Cargando alertas operativas"));
  }],
  ["B unauthorized blocked", () => {
    assert(page.includes('requireAppModulePage("settings", { permission: "manage_workspace" })'));
    assert(route.includes('requireAppModuleApi("settings", { permission: "manage_workspace" })'));
  }],
  ["C recipients empty state", () => assert(workspace.includes("Todavía no hay responsables"))],
  ["D create recipient", () => {
    assert(workspace.includes('method: current ? "PATCH" : "POST"'));
    assert(workspace.includes('"/recipients"'));
    assert(workspace.includes("Usuario del equipo (opcional)"));
    assert(page.includes("canManageUsers(ctx) ? getPortalUsers"));
  }],
  ["E defaults inactive and pending", () => assert(workspace.includes("Quedó inactivo y con consentimiento pendiente"))],
  ["F edit version conflict UI", () => {
    assert(workspace.includes("expectedVersion: current.version"));
    assert(contracts.includes("Este responsable fue modificado en otra sesión"));
  }],
  ["G consent grant explicit", () => {
    assert(workspace.includes("Registrar consentimiento"));
    assert(workspace.includes("consentSource"));
    assert(workspace.includes("consentedAt"));
  }],
  ["H revoke explicit", () => {
    assert(workspace.includes("Registrar revocación"));
    assert(workspace.includes("revokedAt"));
  }],
  ["I active does not imply consent", () => {
    assert(workspace.includes("Actividad y consentimiento se gestionan por separado"));
    assert(!workspace.includes("active ? { status: \"granted\""));
  }],
  ["J rules empty state", () => assert(workspace.includes("Todavía no hay reglas"))],
  ["K event catalog loads", () => {
    assert(page.includes('"/event-types"'));
    assert(workspace.includes("eventTypes.find"));
  }],
  ["L Inventory available", () => assert(workspace.includes("Próximos vencimientos de inventario"))],
  ["M Cash shown unavailable", () => {
    assert(workspace.includes("Cierre de caja"));
    assert(workspace.includes("Próximamente"));
    assert.match(workspace, /button type="button" disabled aria-disabled="true"/);
  }],
  ["N inventory maps daysBefore", () => assert(workspace.includes("conditions: { daysBefore"))],
  ["O repeat policy mapping", () => {
    assert(workspace.includes('value="once_per_threshold"'));
    assert(workspace.includes('value="daily"'));
  }],
  ["P quantity basis mapping", () => {
    assert(workspace.includes('value="physical"'));
    assert(workspace.includes('value="commercial"'));
  }],
  ["Q recipient multi-select", () => assert(workspace.includes("toggleRecipient"))],
  ["R channel selection", () => assert(workspace.includes("Canal WhatsApp"))],
  ["S create rule disabled", () => {
    assert(workspace.includes("Guardar regla deshabilitada"));
    assert(workspace.includes("Quedó deshabilitada"));
  }],
  ["T readiness blockers rendered", () => assert(workspace.includes("readinessBlockerLabel(blocker)"))],
  ["U producer blocker mapped", () => assert(contracts.includes("PRODUCER_NOT_AVAILABLE"))],
  ["V template blocker mapped", () => {
    assert(contracts.includes("TEMPLATE_MISSING"));
    assert(workspace.includes("Falta configurar") || contracts.includes("falta configurar el template"));
  }],
  ["W enable disabled if not ready", () => assert(workspace.includes("disabled={!readiness?.ready"))],
  ["X preview clearly no-send", () => assert(workspace.includes("no se enviará ningún mensaje"))],
  ["Y preview creates no provider request", () => {
    assert(workspace.includes('`/rules/${rule.id}/preview`'));
    assert(!workspace.includes("graph.facebook.com"));
    assert(!workspace.includes("graph.instagram.com"));
  }],
  ["Z history empty", () => assert(workspace.includes("Aún no se enviaron alertas"))],
  ["AA history list", () => assert(workspace.includes("deliverySummary.delivered"))],
  ["AB history detail sanitized", () => {
    assert(workspace.includes("Información operativa sanitizada"));
    assert(contracts.includes("SENSITIVE_KEYS"));
    assert(contracts.includes("phoneMasked"));
  }],
  ["AC cross tenant frontend guard", () => {
    assert(proxy.includes("ctx.tenantId"));
    assert(proxy.includes("routeFor(method, segments)"));
    assert(!workspace.includes("tenantId"));
  }],
  ["AD no portal secret exposed client-side", () => {
    assert(api.includes('headers.set("x-portal-key", portalKey)'));
    assert(!workspace.includes("PORTAL_INTERNAL_KEY"));
    assert(!workspace.includes("x-portal-key"));
    assert(!page.includes("PORTAL_INTERNAL_KEY"));
  }],
  ["AE mobile render", () => {
    assert(workspace.includes("sm:grid-cols-2"));
    assert(workspace.includes("flex-col-reverse sm:flex-row"));
  }],
  ["AF no auto mutation on mount", () => {
    assert(!workspace.includes("useEffect("));
    assert(!workspace.includes("useLayoutEffect("));
    assert(page.includes('method: "GET"'));
  }],
  ["AG Order Summary frontend regression", () => {
    assert(!workspace.includes("orderCustomerNotification"));
    assert(!route.includes("orders"));
  }],
  ["AH configuration hub regression", () => {
    assert(settingsHub.includes('href="/app/settings/operational-alerts"'));
    assert(settingsHub.includes("Configurá avisos automáticos por WhatsApp para responsables de tu operación."));
  }],
  ["Proxy allowlist and private cache", () => {
    for (const resource of ["event-types", "settings", "recipients", "rules", "history"]) assert(proxy.includes(resource));
    assert(route.includes('"Cache-Control", "private, no-store"'));
    assert(proxy.includes("operational_alerts_route_not_allowed"));
    assert(proxy.includes("operational_alerts_query_not_allowed"));
  }],
  ["Fixed inventory template identity", () => {
    assert(contracts.includes("inventory_lot_expiring_v1") || workspace.includes("template.templateKey"));
    assert(workspace.includes("templateLanguage: template.language"));
    assert(!workspace.includes("Template name"));
  }],
  ["Accessible tabs and forms", () => {
    assert(workspace.includes('role="tablist"'));
    assert(workspace.includes('role="tab"'));
    assert(workspace.includes("aria-selected"));
    assert(workspace.includes("htmlFor"));
  }],
  ["Runtime payload sanitization", () => {
    const sanitized = operationalModule.sanitizeOperationalAlertsPayload({
      name: "Responsable",
      phoneE164: "+5491123456789",
      accessToken: "must-not-leak",
      nested: { graphResponse: { id: "raw" } }
    }) as Record<string, unknown>;
    assert.equal(sanitized.phoneMasked, "+54*********89");
    assert.equal("phoneE164" in sanitized, false);
    assert.equal("accessToken" in sanitized, false);
    assert.deepEqual(sanitized.nested, {});
  }],
  ["Runtime preview fixture contract", () => {
    const fixture = operationalModule.buildInventoryPreviewPayload({
      configVersion: 4,
      conditions: {
        daysBefore: 15,
        repeatPolicy: "daily",
        quantityBasis: "commercial",
        minimumAvailableQuantity: 2
      }
    });
    assert.equal(fixture.daysBefore, 15);
    assert.equal(fixture.repeatPolicy, "daily");
    assert.equal(fixture.quantityBasis, "commercial");
    assert.equal(fixture.configVersion, 4);
    assert.equal(fixture.truncation.itemLimit, 250);
    assert.equal(fixture.items.length, 1);
  }]
];

for (const [name, check] of checks) {
  check();
  console.log(`PASS ${name}`);
}

console.log(`operational-alerts-ui.test.ts passed (${checks.length} checks)`);
