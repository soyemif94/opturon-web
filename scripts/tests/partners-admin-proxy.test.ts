import assert from "node:assert/strict";
import { callAdminPartnersBackend } from "../../lib/partners-admin-api";
import {
  createAdminPartnersProxyPlan,
  resolveAdminPartnersBackendPath
} from "../../lib/partners-admin-proxy";
import { hasOpturonAdminApiAccess, resolveOpturonAdminActorId } from "../../lib/saas/access";

function makeAdminContext(overrides?: Partial<Parameters<typeof hasOpturonAdminApiAccess>[0]>) {
  return {
    session: {
      user: {
        id: "admin-1",
        portalActorId: "a22893ae-a579-4152-8e08-63eade48568a",
        accountScope: "opturon_admin"
      }
    },
    userId: "admin-1",
    portalActorId: "a22893ae-a579-4152-8e08-63eade48568a",
    globalRole: "superadmin",
    accountScope: "opturon_admin",
    ...overrides
  };
}

function testOpturonAdminGuardRequiresOpturonScope() {
  assert.equal(hasOpturonAdminApiAccess(makeAdminContext()), true);
  assert.equal(
    hasOpturonAdminApiAccess(
      makeAdminContext({
        accountScope: "tenant",
        session: { user: { id: "admin-1", portalActorId: "a22893ae-a579-4152-8e08-63eade48568a", accountScope: "tenant" } }
      })
    ),
    false
  );
  assert.equal(
    hasOpturonAdminApiAccess(makeAdminContext({ globalRole: "partner" })),
    false
  );
  assert.equal(
    resolveOpturonAdminActorId(makeAdminContext()),
    "a22893ae-a579-4152-8e08-63eade48568a"
  );
  assert.equal(resolveOpturonAdminActorId(makeAdminContext({ userId: "", portalActorId: "" })), null);
}

function testRouteResolutionWhitelistsOnlyKnownBackendEndpoints() {
  assert.equal(resolveAdminPartnersBackendPath("GET", []), "/api/admin/partners");
  assert.equal(
    resolveAdminPartnersBackendPath("POST", ["commission-plans", "gold-plan", "versions"]),
    "/api/admin/partners/commission-plans/gold-plan/versions"
  );
  assert.equal(
    resolveAdminPartnersBackendPath("POST", ["partner-1", "rank", "evaluate"]),
    "/api/admin/partners/partner-1/rank/evaluate"
  );
  assert.throws(() => resolveAdminPartnersBackendPath("DELETE", []), /unsupported_admin_partners_route/);
  assert.throws(
    () => resolveAdminPartnersBackendPath("POST", ["partner-1", "status"]),
    /unsupported_admin_partners_route/
  );
}

async function testProxyPlanPreservesAllowedBodyAndSearchOnly() {
  const request = new Request(
    "https://www.opturon.com/api/app/admin/partners/commission-plans?tenantId=t-1",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-portal-key": "spoofed-key",
        "x-portal-actor-id": "spoofed-actor"
      },
      body: JSON.stringify({ name: "Plan A", actorUserId: "spoofed-body" })
    }
  );

  const plan = await createAdminPartnersProxyPlan(request, ["commission-plans"]);
  assert.equal(plan.path, "/api/admin/partners/commission-plans?tenantId=t-1");
  assert.equal(plan.init.method, "POST");
  assert.equal(plan.init.headers instanceof Headers, true);
  assert.equal((plan.init.headers as Headers).get("Content-Type"), "application/json");
  assert.equal((plan.init.headers as Headers).get("x-portal-key"), null);
  assert.equal((plan.init.headers as Headers).get("x-portal-actor-id"), null);
  assert.match(String(plan.init.body), /spoofed-body/);
}

async function testBackendCallInjectsServerActorAndPortalKey() {
  const originalFetch = global.fetch;
  const originalApiBase = process.env.API_BASE_URL;
  const originalBackendBase = process.env.BACKEND_BASE_URL;
  const originalPortalKey = process.env.PORTAL_INTERNAL_KEY;

  process.env.API_BASE_URL = "https://backend.opturon.test";
  process.env.BACKEND_BASE_URL = "";
  process.env.PORTAL_INTERNAL_KEY = "internal-secret";

  try {
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      assert.equal(String(input), "https://backend.opturon.test/api/admin/partners");
      const headers = new Headers(init?.headers || {});
      assert.equal(headers.get("x-portal-key"), "internal-secret");
      assert.equal(headers.get("x-portal-actor-id"), "a22893ae-a579-4152-8e08-63eade48568a");
      assert.equal(headers.get("x-portal-actor-role"), null);
      assert.equal(headers.get("x-partner-id"), null);
      return new Response(JSON.stringify({ success: true, data: { ok: true } }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }) as typeof fetch;

    const response = await callAdminPartnersBackend<{ success: boolean; data: { ok: boolean } }>(
      makeAdminContext(),
      "/api/admin/partners",
      {
        method: "GET",
        headers: {
          "x-portal-key": "spoofed-key",
          "x-portal-actor-id": "spoofed-actor",
          "x-portal-actor-role": "spoofed-role",
          "x-partner-id": "spoofed-partner"
        }
      }
    );

    assert.equal(response.success, true);
    assert.equal(response.data.ok, true);
  } finally {
    global.fetch = originalFetch;
    process.env.API_BASE_URL = originalApiBase;
    process.env.BACKEND_BASE_URL = originalBackendBase;
    process.env.PORTAL_INTERNAL_KEY = originalPortalKey;
  }
}

async function testBackendCallRejectsMissingOrInvalidAdminContext() {
  const originalApiBase = process.env.API_BASE_URL;
  const originalBackendBase = process.env.BACKEND_BASE_URL;
  const originalPortalKey = process.env.PORTAL_INTERNAL_KEY;

  process.env.API_BASE_URL = "https://backend.opturon.test";
  process.env.BACKEND_BASE_URL = "";
  process.env.PORTAL_INTERNAL_KEY = "internal-secret";

  try {
    await assert.rejects(
      callAdminPartnersBackend(makeAdminContext({ globalRole: "partner" }), "/api/admin/partners", { method: "GET" }),
      /opturon_admin_actor_unavailable/
    );
    await assert.rejects(
      callAdminPartnersBackend(makeAdminContext({ session: null }), "/api/admin/partners", { method: "GET" }),
      /opturon_admin_actor_unavailable/
    );
  } finally {
    process.env.API_BASE_URL = originalApiBase;
    process.env.BACKEND_BASE_URL = originalBackendBase;
    process.env.PORTAL_INTERNAL_KEY = originalPortalKey;
  }
}

async function run() {
  testOpturonAdminGuardRequiresOpturonScope();
  testRouteResolutionWhitelistsOnlyKnownBackendEndpoints();
  await testProxyPlanPreservesAllowedBodyAndSearchOnly();
  await testBackendCallInjectsServerActorAndPortalKey();
  await testBackendCallRejectsMissingOrInvalidAdminContext();
  console.log("partners-admin-proxy.test.ts: ok");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
