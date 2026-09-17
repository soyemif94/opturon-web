const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const path = "app/api/app/integrations/whatsapp/register/route.ts";
const source = readFileSync(join(process.cwd(), path), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  fileName: path, reportDiagnostics: true
});
assert.equal((compiled.diagnostics || []).length, 0);

class NextResponse extends Response {
  static redirect(url, init) { return new NextResponse(null, { ...init, headers: { ...init.headers, Location: String(url) } }); }
}

function setup(overrides = {}) {
  const ctx = { accountScope: "client", globalRole: "client", tenantRole: "owner", tenantId: "tenant-a", userId: "actor-a", ...overrides.ctx };
  const calls = { auth: [], status: [], fetch: [], internal: [] };
  const data = { ok: true, tenantId: "tenant-a", clinicId: "clinic-a", channel: {
    channelId: "channel-a", phoneNumberId: "phone-id-a", provider: "whatsapp_cloud",
    displayPhoneNumber: "+5491123458810", accessToken: "status-secret", pin: "123456"
  }, ...overrides.data };
  const exports = {};
  const sandbox = {
    exports, Headers, Response, URL, URLSearchParams, AbortController, setTimeout, clearTimeout,
    require(name) {
      if (name === "next/server") return { NextResponse };
      if (name === "@/lib/saas/access") return { requireAppApi: async (options) => {
        calls.auth.push(options); return overrides.authError ? { error: new NextResponse("unauthorized", { status: 401 }) } : { ctx };
      } };
      if (name === "@/lib/api") return {
        getApiBaseUrl: () => "https://backend.example",
        isBackendConfigured: () => overrides.configured !== false,
        getPortalWhatsAppStatus: async (tenantId) => {
          calls.status.push(tenantId);
          if (overrides.statusThrows) throw Error("sensitive status error");
          return { success: true, data };
        }
      };
      if (name === "@/lib/portal-internal-auth") return { applyPortalInternalAuth: (target, headers) => {
        calls.internal.push(target);
        if (overrides.internalThrows) throw Error("sensitive internal error");
        headers.set("x-portal-key", "internal-test-secret");
      } };
      throw Error("Unexpected dependency: " + name);
    },
    fetch: async (url, init) => {
      calls.fetch.push({ url, init });
      if (overrides.fetchThrows) throw Error("sensitive fetch error");
      return new Response(JSON.stringify(overrides.response || { success: true, data: { registered: true, pin: "654321", accessToken: "remote-secret" } }), {
        status: overrides.status || 200, headers: { "Content-Type": "application/json" }
      });
    }
  };
  vm.runInNewContext(compiled.outputText, sandbox, { filename: path });
  return { ...exports, calls };
}

const origin = "https://www.opturon.com";
const route = "/api/app/integrations/whatsapp/register";
function request(method = "GET", options = {}) {
  const nextUrl = new URL(origin + route + (options.query || ""));
  return {
    nextUrl, headers: new Headers({ origin, "x-requested-with": "XMLHttpRequest", "content-type": "application/x-www-form-urlencoded", ...options.headers }),
    text: async () => options.body === undefined ? "confirm=register_current_channel" : options.body,
    method
  };
}

const tests = [];
function test(name, run) { tests.push({ name, run }); }
test("GET binds tenant and masks number without exposing credentials or making writes", async () => {
  const h = setup(); const response = await h.GET(request()); const html = await response.text();
  assert.equal(response.status, 200); assert.match(html, /•••• 8810/);
  assert.match(html, /method="post"/); assert.match(html, /Registrar este número/);
  assert.doesNotMatch(html, /549112345|status-secret|123456|channel-a|phone-id-a|actor-a/);
  assert.match(html, /X-Requested-With/);
  assert.deepEqual(h.calls.status, ["tenant-a"]); assert.equal(h.calls.fetch.length, 0);
  assert.equal(h.calls.auth[0].permission, "manage_workspace");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.match(response.headers.get("content-security-policy"), /form-action 'self'/);
});
test("GET completion navigation has no form and does not claim registeredAt evidence", async () => {
  const h = setup(); const response = await h.GET(request("GET", { query: "?result=completed" }));
  const html = await response.text(); assert.equal(response.status, 200);
  assert.match(html, /Solicitud completada/); assert.doesNotMatch(html, /<form|registeredAt|registered=true/);
  assert.equal(h.calls.fetch.length, 0);
});
for (const [name, overrides] of [
  ["unauthenticated", { authError: true }], ["admin", { ctx: { accountScope: "opturon_admin", globalRole: "superadmin" } }],
  ["partner", { ctx: { accountScope: "partner", globalRole: "partner" } }], ["member", { ctx: { tenantRole: "member" } }],
  ["missing tenant", { ctx: { tenantId: "" } }], ["missing actor", { ctx: { userId: "" } }]
]) test("GET and POST reject " + name, async () => {
  const h = setup(overrides);
  for (const method of ["GET", "POST"]) assert.ok((await h[method](request(method))).status >= 400);
  assert.equal(h.calls.status.length, 0); assert.equal(h.calls.fetch.length, 0);
});
test("manager can inspect confirmation", async () => assert.equal((await setup({ ctx: { tenantRole: "manager" } }).GET(request())).status, 200));
for (const [name, options] of [
  ["cross origin", { headers: { origin: "https://attacker.example" } }], ["missing origin", { headers: { origin: "" } }], ["missing request proof", { headers: { "x-requested-with": "" } }],
  ["query tenant override", { query: "?tenantId=other" }], ["body tenant override", { body: "confirm=register_current_channel&tenantId=other" }],
  ["body phone override", { body: "confirm=register_current_channel&phoneNumberId=other" }],
  ["duplicate confirmation", { body: "confirm=register_current_channel&confirm=register_current_channel" }],
  ["unconfirmed", { body: "" }], ["JSON payload", { headers: { "content-type": "application/json" }, body: "{}" }]
]) test("POST rejects " + name + " before backend request", async () => {
  const h = setup(); assert.ok((await h.POST(request("POST", options))).status >= 400);
  assert.equal(h.calls.status.length, 0); assert.equal(h.calls.fetch.length, 0);
});
for (const [name, overrides] of [
  ["tenant mismatch", { data: { tenantId: "other" } }], ["channel missing", { data: { channel: null } }],
  ["status failure", { statusThrows: true }], ["backend unavailable", { configured: false }]
]) test("GET and POST fail closed on " + name, async () => {
  const h = setup(overrides);
  for (const method of ["GET", "POST"]) assert.ok((await h[method](request(method))).status >= 400);
  assert.equal(h.calls.fetch.length, 0);
});
test("POST uses authenticated tenant/actor and internal auth then redirects only after registered true", async () => {
  const h = setup(); const response = await h.POST(request("POST", { headers: { "x-portal-actor-id": "attacker", "x-active-tenant-id": "other", "x-portal-key": "bad" } }));
  assert.equal(response.status, 303); assert.equal(response.headers.get("location"), origin + route + "?result=completed");
  assert.equal(h.calls.fetch.length, 1); const { url, init } = h.calls.fetch[0];
  assert.equal(url, "https://backend.example/portal/tenants/tenant-a/whatsapp/register");
  assert.equal(init.headers.get("x-portal-actor-id"), "actor-a"); assert.equal(init.headers.get("x-active-tenant-id"), "tenant-a");
  assert.equal(init.headers.get("x-portal-key"), "internal-test-secret"); assert.equal(init.body, "{}");
  assert.equal(init.method, "POST"); assert.equal(init.redirect, "error"); assert.equal(init.cache, "no-store");
  assert.ok(init.signal); assert.doesNotMatch(await response.text(), /secret|654321|registeredAt/);
});
for (const [name, overrides] of [
  ["backend error", { status: 500, response: { error: "sensitive-secret" } }],
  ["missing registration confirmation", { response: { success: true, data: { registered: false, pin: "654321" } } }],
  ["network error", { fetchThrows: true }], ["missing internal auth", { internalThrows: true }]
]) test("POST sanitizes " + name + " and never retries automatically", async () => {
  const h = setup(overrides); const response = await h.POST(request("POST")); const html = await response.text();
  assert.equal(response.status, 502); assert.equal(response.headers.get("location"), null);
  assert.match(html, /Volver a intentar/); assert.doesNotMatch(html, /sensitive|secret|654321|<script/);
  assert.ok(h.calls.fetch.length <= 1);
});
test("GET rejects tenant query override", async () => {
  const h = setup(); assert.equal((await h.GET(request("GET", { query: "?tenantId=other" }))).status, 400);
  assert.equal(h.calls.status.length, 0);
});

(async () => {
  for (const { name, run } of tests) { await run(); console.log("PASS " + name); }
  console.log(`whatsapp-client-phone-registration: ${tests.length}/${tests.length} PASS`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
