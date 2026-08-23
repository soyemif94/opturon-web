import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Node's strip-types runner requires the explicit extension for this standalone test.
// @ts-ignore -- production code imports the same module through the configured alias.
import { applyPortalInternalAuth, isPortalTenantBackendPath } from "../../lib/portal-internal-auth.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

function testPortalPathClassification() {
  assert.equal(isPortalTenantBackendPath("/portal/tenants/tenant-1/context"), true);
  assert.equal(isPortalTenantBackendPath("/portal/tenants/tenant-1/conversations?q=a"), true);
  assert.equal(isPortalTenantBackendPath("/portal/tenant/tenant-1/context"), false);
  assert.equal(isPortalTenantBackendPath("/health/portal/tenants/tenant-1"), false);
}

function testPortalAuthInjectionAndFailClosed() {
  const originalPortalKey = process.env.PORTAL_INTERNAL_KEY;
  try {
    process.env.PORTAL_INTERNAL_KEY = "server-only-test-secret";
    const portalHeaders = applyPortalInternalAuth("/portal/tenants/tenant-1/context", new Headers());
    assert.equal(portalHeaders.get("x-portal-key"), "server-only-test-secret");

    const publicHeaders = applyPortalInternalAuth("/health", new Headers());
    assert.equal(publicHeaders.has("x-portal-key"), false);

    delete process.env.PORTAL_INTERNAL_KEY;
    assert.throws(
      () => applyPortalInternalAuth("/portal/tenants/tenant-1/conversations", new Headers()),
      /PORTAL_INTERNAL_KEY is not configured/
    );
  } finally {
    if (originalPortalKey === undefined) delete process.env.PORTAL_INTERNAL_KEY;
    else process.env.PORTAL_INTERNAL_KEY = originalPortalKey;
  }
}

function testSharedBackendBoundaryAndBffTenantGuards() {
  const api = read("lib/api.ts");
  const access = read("lib/saas/access.ts");
  const inbox = read("app/api/app/inbox/route.ts");

  assert.match(api, /applyPortalInternalAuth\(path, headers\)/);
  assert.match(api, /getPortalTenantContext[\s\S]*backendFetch/);
  assert.match(api, /getPortalConversations[\s\S]*backendFetch/);
  assert.match(api, /getPortalContacts[\s\S]*backendFetch/);
  assert.match(api, /getPortalAgendaItems[\s\S]*backendPortalFetch/);
  assert.match(api, /getPortalSalesOpportunities[\s\S]*backendFetch/);

  assert.match(access, /getServerSession\(authOptions\)/);
  assert.match(inbox, /resolveAppTenant\(/);
  assert.match(inbox, /getPortalTenantContext\(tenantContext\.tenantId\)/);
  assert.match(inbox, /getPortalConversations\(tenantContext\.tenantId/);
  assert.doesNotMatch(inbox, /PORTAL_INTERNAL_KEY/);
}

function testRawPortalFetchesRemainServerAuthenticated() {
  const apiAppRoot = path.join(root, "app", "api", "app");
  const routeFiles: string[] = [];
  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.name === "route.ts") routeFiles.push(absolute);
    }
  };
  visit(apiAppRoot);

  const directPortalRoutes = routeFiles.filter((file) => /fetch\([\s\S]{0,300}\/portal\/tenants\//.test(fs.readFileSync(file, "utf8")));
  assert.ok(directPortalRoutes.length > 0, "expected direct binary/upload portal proxy routes");
  for (const file of directPortalRoutes) {
    const source = fs.readFileSync(file, "utf8");
    assert.match(source, /x-portal-key|applyPortalInternalAuth/, `${path.relative(root, file)} must authenticate its direct backend fetch`);
    assert.match(source, /resolveAppTenant\(/, `${path.relative(root, file)} must resolve tenant from the server session`);
  }
}

testPortalPathClassification();
testPortalAuthInjectionAndFailClosed();
testSharedBackendBoundaryAndBffTenantGuards();
testRawPortalFetchesRemainServerAuthenticated();
console.log("portal-internal-auth-bff-regression.test.ts: ok");
