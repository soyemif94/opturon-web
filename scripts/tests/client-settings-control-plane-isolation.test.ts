import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const settings = read("app/app/settings/page.tsx");
const modulesPage = read("app/app/settings/modules/page.tsx");
const policyRoute = read("app/api/app/settings/operating-profile/route.ts");
const policyClient = read("lib/api.ts");
const profileSettings = read("components/app/TenantOperatingProfileSettings.tsx");
const tenantProvisioningRoute = read("app/api/ops/tenants/route.ts");
const tenantOpsRoute = read("app/api/ops/tenants/[tenantId]/route.ts");
const access = read("lib/saas/access.ts");
const businessRoute = read("app/api/app/business/route.ts");
const botRoute = read("app/api/app/settings/bot-config/route.ts");
const transferRoute = read("app/api/app/settings/transfer-config/route.ts");
const usersRoute = read("app/api/app/users/route.ts");
const businessForm = read("components/app/BusinessSettingsForm.tsx");
const botForm = read("components/app/BotConfigForm.tsx");
const transferForm = read("components/app/TransferConfigForm.tsx");
const usersManager = read("components/app/TenantUsersManager.tsx");
const alertsPage = read("app/app/settings/operational-alerts/page.tsx");

function internalCardIsGuarded(title: string) {
  const titleIndex = settings.indexOf(title);
  assert.notEqual(titleIndex, -1, `${title} must remain available to platform staff`);
  const prefix = settings.slice(Math.max(0, titleIndex - 900), titleIndex);
  assert.match(prefix, /\{isOpturonAdmin \? \([\s\S]*$/, `${title} must be inside the platform guard`);
}

test("CLIENT_SETTINGS_ALLOWED_CARDS_TEST", () => {
  for (const title of [
    "Cuenta y negocio",
    "Usuarios del espacio",
    "Alertas operativas",
    "Bot de WhatsApp",
    "Cobro por transferencia"
  ]) {
    assert.match(settings, new RegExp(`title=\\"${title}\\"`));
  }
  for (const [title, href] of [
    ["Cuenta y negocio", "/app/business"],
    ["Usuarios del espacio", "/app/users"],
    ["Alertas operativas", "/app/settings/operational-alerts"],
    ["Bot de WhatsApp", "/app/settings/bot"],
    ["Cobro por transferencia", "/app/settings/transfer"]
  ]) {
    assert.ok(settings.includes(href), `${title} link remains available`);
  }
});

test("allowed tenant settings retain their authenticated operations", () => {
  assert.match(businessRoute, /requireAppApi\(\{ permission: "manage_workspace" \}\)/);
  assert.match(botRoute, /requireAppApi\(\{ permission: "manage_workspace" \}\)/);
  assert.match(transferRoute, /requireAppApi\(\{ permission: "manage_workspace" \}\)/);
  assert.match(usersRoute, /requireAppApi\(\{ permission: "manage_users" \}\)/);
  assert.match(alertsPage, /requireAppModulePage\("settings", \{ permission: "manage_workspace" \}\)/);
  for (const key of ["businessProfilePreset", "commercialObjective", "salesMode", "businessInstructions"]) {
    assert.match(botRoute, new RegExp(key));
  }
});

test("CLIENT_SETTINGS_INTERNAL_CARDS_HIDDEN_TEST", () => {
  assert.match(
    settings,
    /const isOpturonAdmin = isOpturonAdminWorkspaceContext\(ctx\) && hasOpturonAdminApiAccess\(ctx\)/
  );
  internalCardIsGuarded("title=\"Modulos y operacion\"");
  internalCardIsGuarded("Mejora continua del espacio");
  assert.match(settings, /Mejora continua del espacio[\s\S]*Ver recomendaciones[\s\S]*Estado del centro/);
});

test("CLIENT_DIRECT_MODULE_ROUTE_TEST", () => {
  assert.match(modulesPage, /requireOpturonAdminPage\("\/app\/settings\/modules"\)/);
  assert.doesNotMatch(modulesPage, /requireAppModulePage|manage_workspace/);
});

test("TENANT_ADMIN_INTERNAL_CONTROLS_DENIED_TEST", () => {
  assert.match(access, /const OPTURON_ADMIN_ROLES = new Set\(\["superadmin", "ops_admin"\]\)/);
  assert.match(access, /normalizeScope\(ctx\.accountScope \|\| ctx\.session\?\.user\?\.accountScope\) === "opturon_admin"/);
  assert.match(policyRoute, /requireOpturonAdminApi\(\)/g);
  assert.doesNotMatch(policyRoute, /requireAppApi|manage_workspace/);
});

test("PLATFORM_STAFF_INTERNAL_CONTROLS_VISIBLE_TEST", () => {
  assert.match(access, /if \(!ctx\.globalRole \|\| !OPTURON_ADMIN_ROLES\.has\(String\(ctx\.globalRole\)\)\) return false/);
  assert.match(access, /if \(!ctx\.portalActorId && !String\(ctx\.session\?\.user\?\.portalActorId/);
  assert.match(policyRoute, /resolveOpturonAdminActorId\(auth\.ctx\)/g);
  assert.match(policyClient, /getPortalTenantPolicy[\s\S]*x-portal-actor-id/);
});

test("raw policy errors are mapped to safe client copy", () => {
  assert.doesNotMatch(policyRoute, /getBackendErrorBody|getBackendErrorStatus|detail:/);
  assert.doesNotMatch(profileSettings, /json\?\.error|error instanceof Error|error\.message/);
  assert.match(profileSettings, /No pudimos guardar los cambios\. Intentá nuevamente\./);
  for (const route of [businessRoute, botRoute, transferRoute]) {
    assert.doesNotMatch(route, /getBackendErrorBody|error instanceof Error \? error\.message/);
  }
  assert.doesNotMatch(usersRoute, /return NextResponse\.json\(body, \{ status \}\)|storagePath:/);
  assert.match(usersRoute, /return NextResponse\.json\(\{ error: "portal_user_request_failed" \}, \{ status \}\)/);
  for (const form of [businessForm, botForm, transferForm, usersManager]) {
    assert.doesNotMatch(form, /json\?\.detail \|\| json\?\.error/);
  }
});

test("internal tenant provisioning also requires a verified platform actor", () => {
  assert.match(tenantProvisioningRoute, /export async function POST[\s\S]*requireOpturonAdminApi\(\)/);
  assert.match(tenantProvisioningRoute, /resolveOpturonAdminActorId\(guard\.ctx\)/);
  assert.match(tenantProvisioningRoute, /provisionPortalTenant\([\s\S]*\{ actorUserId \}/);
  assert.match(policyClient, /provisionPortalTenant[\s\S]*x-portal-actor-id/);
  assert.match(usersRoute, /includesControlPlaneFields && !hasOpturonAdminApiAccess\(guard\.ctx \|\| \{\}\)/);
  assert.match(tenantProvisioningRoute, /export async function GET[\s\S]*requireOpturonAdminApi\(\)/);
  assert.match(tenantOpsRoute, /export async function GET[\s\S]*requireOpturonAdminApi\(\)/);
  assert.match(tenantOpsRoute, /export async function PATCH[\s\S]*requireOpturonAdminApi\(\)/);
});
