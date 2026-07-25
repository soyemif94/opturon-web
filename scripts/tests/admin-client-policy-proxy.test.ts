import assert from "node:assert/strict";
import { getAdminTenantPolicy, patchAdminTenantPolicy } from "../../lib/admin-client-policy.ts";

async function testAdminTenantPolicyCallsInjectServerActor() {
  const originalFetch = global.fetch;
  const originalApiBase = process.env.API_BASE_URL;
  const originalBackendBase = process.env.BACKEND_BASE_URL;
  const originalPortalKey = process.env.PORTAL_INTERNAL_KEY;

  process.env.API_BASE_URL = "https://backend.opturon.test";
  process.env.BACKEND_BASE_URL = "";
  process.env.PORTAL_INTERNAL_KEY = "internal-secret";

  const calls: Array<{ input: string; headers: Headers; method: string; body: string }> = [];

  try {
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers || {});
      calls.push({
        input: String(input),
        headers,
        method: String(init?.method || "GET"),
        body: String(init?.body || "")
      });
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            ok: true,
            tenantId: "tenant-1",
            clinic: { id: "clinic-1", name: "Tenant 1", externalTenantId: "tenant-1", primaryEmail: "owner@test.com" },
            primaryEmail: "owner@test.com",
            policy: {
              policyVersion: 1,
              planCode: "basic",
              limits: { maxPortalUsers: 5, maxAutomations: 20, maxContacts: 1000 },
              capabilities: [],
              enabledModules: {},
              source: "test"
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    await getAdminTenantPolicy("tenant-1", { actorUserId: "admin-actor-1" });
    await patchAdminTenantPolicy("tenant-1", { displayName: "Tenant Uno" }, { actorUserId: "admin-actor-1" });

    assert.equal(calls.length, 2);
    assert.equal(calls[0]?.input, "https://backend.opturon.test/api/admin/tenants/tenant-1/policy");
    assert.equal(calls[0]?.headers.get("x-portal-key"), "internal-secret");
    assert.equal(calls[0]?.headers.get("x-portal-actor-id"), "admin-actor-1");
    assert.equal(calls[1]?.method, "PATCH");
    assert.equal(calls[1]?.headers.get("x-portal-actor-id"), "admin-actor-1");
    assert.match(calls[1]?.body || "", /Tenant Uno/);
  } finally {
    global.fetch = originalFetch;
    process.env.API_BASE_URL = originalApiBase;
    process.env.BACKEND_BASE_URL = originalBackendBase;
    process.env.PORTAL_INTERNAL_KEY = originalPortalKey;
  }
}

async function run() {
  await testAdminTenantPolicyCallsInjectServerActor();
  console.log("admin-client-policy-proxy.test.ts: ok");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
