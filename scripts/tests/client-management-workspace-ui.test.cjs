const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const page = read("app/app/client-management/page.tsx");
const workspace = read("components/app/AdminClientConfiguration.tsx");
const listRoute = read("app/api/app/admin/clients/route.ts");
const policyRoute = read("app/api/app/admin/clients/[tenantId]/policy/route.ts");
const policyClient = read("lib/admin-client-policy.ts");
const shell = read("components/layout/app-shell.tsx");

test("workspace header exposes search and an explicit new-client dialog", () => {
  assert.match(page, /title="Gestión de clientes"/);
  assert.match(page, /description="Administra clientes, módulos, planes e integraciones"/);
  assert.match(workspace, /data-client-search/);
  assert.match(workspace, /placeholder="Buscar por nombre, email, plan o tenant\.\.\."/);
  assert.match(workspace, /setNewClientOpen\(true\)/);
  assert.match(workspace, /<Dialog open=\{newClientOpen\} onOpenChange=\{setNewClientOpen\}>/);
  assert.match(workspace, /data-new-client-dialog/);
  assert.match(workspace, /<DialogClose asChild>/);
});

test("existing provisioning payload and backend route remain unchanged", () => {
  assert.match(workspace, /fetch\("\/api\/app\/users", \{/);
  assert.match(workspace, /role: "owner"/);
  for (const field of ["tenantName", "ownerName", "ownerEmail", "operatingProfile", "capabilities", "enabledModules"]) {
    assert.match(workspace, new RegExp(field));
  }
  assert.doesNotMatch(workspace, /externalTenantId:\s*newClientDraft|clinicId:\s*newClientDraft|accountScope:\s*newClientDraft/);
});

test("desktop is a two-column master-detail without a permanent third column", () => {
  assert.match(workspace, /xl:grid-cols-\[minmax\(280px,360px\)_minmax\(0,1fr\)\]/);
  assert.match(workspace, /data-client-list/);
  assert.match(workspace, /data-client-detail/);
  assert.doesNotMatch(workspace, /xl:grid-cols-\[1\.4fr_minmax\(320px,0\.9fr\)\]/);
  assert.doesNotMatch(workspace, /xl:grid-cols-\[1\.2fr_1fr_1fr\][\s\S]{0,300}data-client-list/);
});

test("five detail tabs relocate the existing operational surfaces", () => {
  for (const [id, label] of [
    ["summary", "Resumen"],
    ["modules", "Módulos"],
    ["integrations", "Integraciones"],
    ["subscription", "Suscripción"],
    ["diagnostics", "Diagnóstico"]
  ]) {
    assert.match(workspace, new RegExp(`id: "${id}", label: "${label}"`));
    assert.match(workspace, new RegExp(`activeTab === "${id}"`));
  }
  assert.match(workspace, /role="tablist"/);
  assert.match(workspace, /role="tab"/);
  assert.match(workspace, /aria-selected=\{activeTab === tab\.id\}/);
  assert.match(workspace, /Guardar módulos/);
  assert.match(workspace, /AdminWhatsAppCard/);
  assert.match(workspace, /Billing SaaS/);
  assert.match(workspace, /AdminMetaReadinessCard/);
});

test("technical identifiers are bounded and advanced Meta configuration is collapsible", () => {
  assert.match(workspace, /<details[\s\S]*?Configuración avanzada/);
  assert.match(workspace, /Identificadores técnicos/);
  assert.match(workspace, /break-all/);
  assert.match(workspace, /max-w-full truncate/);
  assert.match(workspace, /min-w-0 max-w-full space-y-5 overflow-x-hidden/);
  assert.match(workspace, /overflow-x-hidden/);
});

test("mobile and tablet use list-to-detail navigation without changing the global shell", () => {
  assert.match(workspace, /mobileDetailOpen \? "hidden xl:block" : "block"/);
  assert.match(workspace, /mobileDetailOpen \? "block" : "hidden xl:block"/);
  assert.match(workspace, /setMobileDetailOpen\(false\)/);
  assert.match(workspace, /Volver a clientes/);
  assert.match(workspace, /xl:hidden/);
  assert.match(shell, /expanded \? "w-\[272px\]" : "w-\[92px\]"/);
  assert.match(shell, /app-scroll-surface/);
});

test("tenant list and policy writes stay behind Opturon Admin authorization", () => {
  assert.match(page, /requireOpturonAdminPage\("\/app\/client-management"\)/);
  assert.match(listRoute, /requireOpturonAdminApi\(\)/);
  assert.match(policyRoute, /requireOpturonAdminApi\(\)/);
  assert.match(policyRoute, /resolveOpturonAdminActorId/);
  assert.match(policyRoute, /patchAdminTenantPolicy\(tenantId, payload \|\| \{\}, \{ actorUserId \}\)/);
  assert.match(policyClient, /"\/api\/admin\/tenants"/);
  assert.doesNotMatch(workspace, /deleteTenant|archiveTenant|moveTenant|changeOwnership/);
});

test("search and selection are local UI concerns and do not infer tenant ownership", () => {
  assert.match(workspace, /const filteredTenants = useMemo/);
  assert.match(workspace, /getTenantLabel\(tenant\), tenant\.primaryEmail, tenant\.tenantId, getPlanLabel/);
  assert.match(workspace, /setSelectedTenantId\(tenant\.tenantId\)/);
  assert.doesNotMatch(workspace, /source.*target|target.*source|demo.*accountScope|name.*accountScope/);
});
