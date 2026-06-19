import assert from "node:assert/strict";
import { resolveOpturonAdminActorId, hasOpturonAdminApiAccess } from "../../lib/saas/access";

function testValidAdminUsesPortalActorId() {
  const ctx = {
    session: { user: { id: "usr_local_admin", portalActorId: "a22893ae-a579-4152-8e08-63eade48568a", accountScope: "opturon_admin" } },
    userId: "usr_local_admin",
    portalActorId: "a22893ae-a579-4152-8e08-63eade48568a",
    globalRole: "superadmin",
    accountScope: "opturon_admin"
  };

  assert.equal(hasOpturonAdminApiAccess(ctx), true);
  assert.equal(resolveOpturonAdminActorId(ctx), "a22893ae-a579-4152-8e08-63eade48568a");
}

function testBootstrapIdAloneIsNotEnough() {
  const ctx = {
    session: { user: { id: "usr_local_admin", accountScope: "opturon_admin" } },
    userId: "usr_local_admin",
    globalRole: "superadmin",
    accountScope: "opturon_admin"
  };

  assert.equal(hasOpturonAdminApiAccess(ctx), false);
  assert.equal(resolveOpturonAdminActorId(ctx), null);
}

function testPartnerAndClientStayRejected() {
  assert.equal(
    hasOpturonAdminApiAccess({
      session: { user: { id: "p1", portalActorId: "fake", accountScope: "partner" } },
      userId: "p1",
      portalActorId: "fake",
      globalRole: "partner",
      accountScope: "partner"
    }),
    false
  );
  assert.equal(
    hasOpturonAdminApiAccess({
      session: { user: { id: "c1", portalActorId: "fake", accountScope: "client" } },
      userId: "c1",
      portalActorId: "fake",
      globalRole: "client",
      accountScope: "client"
    }),
    false
  );
}

async function run() {
  testValidAdminUsesPortalActorId();
  testBootstrapIdAloneIsNotEnough();
  testPartnerAndClientStayRejected();
  console.log("partners-admin-actor-resolution.test.ts: ok");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
