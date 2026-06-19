import assert from "node:assert/strict";
import { hasOpturonAdminApiAccess } from "../../lib/saas/access";
import {
  isStaffGlobalRole,
  normalizeAccountScope,
  normalizeGlobalRole,
  resolveAccountScopeForIdentity
} from "../../lib/auth-identity";

function testAdminLocalBootstrapIdentityGetsOpturonAdminScope() {
  const scope = resolveAccountScopeForIdentity({
    authSource: "local",
    globalRole: "superadmin",
    tenantId: "tenant-1",
    tenantRole: "owner"
  });

  assert.equal(scope, "opturon_admin");
  assert.equal(
    hasOpturonAdminApiAccess({
      session: { user: { id: "admin-1", accountScope: scope } },
      userId: "admin-1",
      globalRole: "superadmin",
      accountScope: scope
    }),
    true
  );
}

function testClientOwnerDoesNotBecomeOpturonAdmin() {
  const scope = resolveAccountScopeForIdentity({
    authSource: "local",
    globalRole: "client",
    tenantId: "tenant-1",
    tenantRole: "owner"
  });

  assert.equal(scope, "client");
  assert.equal(
    hasOpturonAdminApiAccess({
      session: { user: { id: "client-1", accountScope: scope } },
      userId: "client-1",
      globalRole: "superadmin",
      accountScope: scope
    }),
    false
  );
}

function testPartnerIdentityStaysPartner() {
  const scope = resolveAccountScopeForIdentity({
    authSource: "backend",
    globalRole: "partner",
    partnerId: "partner-1"
  });

  assert.equal(scope, "partner");
  assert.equal(
    hasOpturonAdminApiAccess({
      session: { user: { id: "partner-user", accountScope: scope } },
      userId: "partner-user",
      globalRole: "partner",
      accountScope: scope
    }),
    false
  );
}

function testExplicitClientScopeWinsOverLegacyStaffShape() {
  const scope = resolveAccountScopeForIdentity({
    accountScope: "client",
    authSource: "backend",
    globalRole: "superadmin",
    tenantId: "tenant-1",
    tenantRole: "owner"
  });

  assert.equal(scope, "client");
}

function testSpoofableGarbageDoesNotCreateAdminScope() {
  assert.equal(normalizeAccountScope("x-portal-actor-id:admin"), undefined);
  assert.equal(resolveAccountScopeForIdentity({ authSource: "browser", globalRole: "client" }), "client");
  assert.equal(isStaffGlobalRole(normalizeGlobalRole("client")), false);
}

async function run() {
  testAdminLocalBootstrapIdentityGetsOpturonAdminScope();
  testClientOwnerDoesNotBecomeOpturonAdmin();
  testPartnerIdentityStaysPartner();
  testExplicitClientScopeWinsOverLegacyStaffShape();
  testSpoofableGarbageDoesNotCreateAdminScope();
  console.log("admin-account-scope-auth.test.ts: ok");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
