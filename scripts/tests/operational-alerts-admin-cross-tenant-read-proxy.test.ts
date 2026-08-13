import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8");

function run() {
  const api = read("lib/api.ts");
  const helper = read("lib/admin-operational-alerts-read-proxy.ts");
  const rulesRoute = read("app/api/app/admin/clients/[tenantId]/operational-alerts/rules/route.ts");
  const recipientsRoute = read("app/api/app/admin/clients/[tenantId]/operational-alerts/recipients/route.ts");
  const historyRoute = read("app/api/app/admin/clients/[tenantId]/operational-alerts/history/route.ts");

  assert.match(api, /"x-active-tenant-id": safeTargetTenantId/);
  assert.match(api, /"x-portal-actor-id": safeActorUserId/);
  assert.match(helper, /requireOpturonAdminApi\(\)/);
  assert.match(helper, /resolveOpturonAdminActorId\(guard\.ctx\)/);
  assert.match(helper, /TENANT_ID_PATTERN/);
  assert.match(helper, /operational_alerts_tenant_id_invalid/);
  assert.match(helper, /operational_alerts_query_not_allowed/);
  assert.match(helper, /rules: new Set\(\["limit", "eventType", "enabled", "includeArchived"\]\)/);
  assert.match(helper, /recipients: new Set\(\["limit"\]\)/);
  assert.match(helper, /history: new Set\(\["eventType", "ruleId", "status", "dateFrom", "dateTo", "recipientId", "page", "pageSize"\]\)/);
  assert.match(helper, /requestAdminTenantOperationalAlerts/);
  assert.match(helper, /\{ method: "GET", actorUserId \}/);
  assert.match(helper, /sanitizeOperationalAlertsPayload\(result\.data\)/);
  assert.doesNotMatch(helper, /request\.json\(|POST\(|PATCH\(|PUT\(/);

  for (const [route, resource] of [[rulesRoute, "rules"], [recipientsRoute, "recipients"], [historyRoute, "history"]] as const) {
    assert.match(route, /proxyAdminTenantOperationalAlertsRead/);
    assert.match(route, new RegExp(`"${resource}"`));
    assert.match(route, /export async function GET/);
  }

  // Rules and recipients share their collection routes with the separate,
  // explicitly-scoped canary write proxy. History remains read-only.
  assert.match(rulesRoute, /proxyAdminTenantOperationalAlertsCanaryWrite/);
  assert.match(rulesRoute, /"ruleCreate"/);
  assert.match(recipientsRoute, /proxyAdminTenantOperationalAlertsCanaryWrite/);
  assert.match(recipientsRoute, /"recipientCreate"/);
  assert.doesNotMatch(rulesRoute, /export async function PATCH|export async function PUT|export async function DELETE/);
  assert.doesNotMatch(recipientsRoute, /export async function PATCH|export async function PUT|export async function DELETE/);
  assert.doesNotMatch(historyRoute, /POST\(|PATCH\(|PUT\(|DELETE\(/);

  console.log("operational-alerts-admin-cross-tenant-read-proxy.test.ts: ok");
}

run();
