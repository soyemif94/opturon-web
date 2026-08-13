import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8");

function run() {
  const api = read("lib/api.ts");
  const settingsRoute = read("app/api/app/admin/clients/[tenantId]/operational-alerts/settings/route.ts");
  const previewRoute = read("app/api/app/admin/clients/[tenantId]/operational-alerts/rules/[ruleId]/candidate-preview/route.ts");
  const observabilityRoute = read("app/api/app/admin/clients/[tenantId]/operational-alerts/observability/route.ts");
  const preflightRoute = read(
    "app/api/app/admin/clients/[tenantId]/operational-alerts/rules/[ruleId]/canary-preflight/route.ts"
  );

  assert.match(api, /requestAdminTenantOperationalAlerts/);
  assert.match(api, /adminWorkspaceTenantId/);
  assert.match(api, /targetTenantId/);
  assert.match(api, /"x-active-tenant-id": safeTargetTenantId/);
  assert.match(api, /"x-portal-actor-id": safeActorUserId/);
  assert.match(api, /backendPortalFetch<T>/);

  assert.match(settingsRoute, /requireOpturonAdminApi\(\)/);
  assert.match(settingsRoute, /resolveOpturonAdminActorId\(guard\.ctx\)/);
  assert.match(settingsRoute, /Object\.keys\(payload\)\.length !== 1/);
  assert.match(settingsRoute, /typeof payload\.operationalAlertsEnabled !== "boolean"/);
  assert.match(settingsRoute, /method: "PATCH", actorUserId: context\.actorUserId, body: payload/);
  assert.doesNotMatch(settingsRoute, /actorId/);

  assert.match(previewRoute, /requireOpturonAdminApi\(\)/);
  assert.match(previewRoute, /UUID_PATTERN/);
  assert.match(previewRoute, /\/rules\/\$\{encodeURIComponent\(safeRuleId\)\}\/candidate-preview/);
  assert.doesNotMatch(previewRoute, /POST\(/);
  assert.doesNotMatch(previewRoute, /graph\.facebook\.com|graph\.instagram\.com|whatsapp/i);

  assert.match(observabilityRoute, /requireOpturonAdminApi\(\)/);
  assert.match(observabilityRoute, /resolveOpturonAdminActorId\(guard\.ctx\)/);
  assert.match(observabilityRoute, /"\/observability"/);
  assert.doesNotMatch(observabilityRoute, /POST\(|PATCH\(/);
  assert.doesNotMatch(observabilityRoute, /graph\.facebook\.com|graph\.instagram\.com|whatsapp/i);

  assert.match(preflightRoute, /requireOpturonAdminApi\(\)/);
  assert.match(preflightRoute, /UUID_PATTERN/);
  assert.match(preflightRoute, /\/canary-preflight/);
  assert.doesNotMatch(preflightRoute, /POST\(|PATCH\(/);
  assert.doesNotMatch(preflightRoute, /graph\.facebook\.com|graph\.instagram\.com|whatsapp/i);

  console.log("operational-alerts-canary-safety-admin-proxy.test.ts: ok");
}

run();
