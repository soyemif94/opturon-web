import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import ts from "typescript";

const root = process.cwd();
const nodeRequire = createRequire(import.meta.url);
const { NextResponse } = nodeRequire("next/server");

function loadTs(path, imports = {}) {
  const source = readFileSync(join(root, path), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  const module = { exports: {} };
  const requireModule = (name) => Object.hasOwn(imports, name) ? imports[name] : nodeRequire(name);
  new Function("require", "module", "exports", compiled)(requireModule, module, module.exports);
  return module.exports;
}

const cookie = loadTs("lib/ops/ops-cookie.ts");
const access = loadTs("lib/ops-access.ts", { "./ops/ops-cookie": cookie });
const cookieResponse = loadTs("lib/ops/ops-cookie-response.ts", { "./ops-cookie": cookie });
const opening = loadTs("lib/ops/ops-opening.ts");
const fixturePassword = "fixture-ops-password";
const environmentKeys = ["OPS_PASSWORD", "OPS_ACCESS_SECRET", "NODE_ENV"];
const priorEnvironment = new Map(environmentKeys.map((key) => [key, process.env[key]]));

try {
  process.env.OPS_PASSWORD = fixturePassword;
  process.env.OPS_ACCESS_SECRET = "fixture-ops-signing-secret";
  process.env.NODE_ENV = "production";

  const jar = new Map();
  const matchesPath = (cookiePath, requestPath) => requestPath === cookiePath || requestPath.startsWith(`${cookiePath}/`);
  function applyCookies(response) {
    for (const header of response.headers.getSetCookie()) {
      const path = header.match(/(?:^|; )Path=([^;]+)/)?.[1];
      const value = header.match(/^ops_access=([^;]*)/)?.[1];
      assert.ok(path && value !== undefined, "a scoped OPS cookie is serialized");
      if (/Max-Age=0(?:;|$)/.test(header)) jar.delete(path);
      else jar.set(path, value);
    }
  }
  function cookieAt(path) {
    const matching = [...jar.entries()].find(([cookiePath]) => matchesPath(cookiePath, path));
    return { get: (name) => name === cookie.OPS_ACCESS_COOKIE && matching ? { value: matching[1] } : undefined };
  }

  const auth = { requireAppApi: async () => ({ ctx: {} }), requireAppModuleApi: async (module) => {
    assert.equal(module, "ops", "verification retains OPS module RBAC");
    return { ctx: {} };
  } };
  const unlockRoute = loadTs("app/api/app/ops/unlock/route.ts", {
    "@/lib/saas/access": auth,
    "@/lib/ops-access": access,
    "@/lib/ops/ops-cookie-response": cookieResponse
  });
  const lockRoute = loadTs("app/api/app/ops/lock/route.ts", {
    "@/lib/saas/access": auth,
    "@/lib/ops/ops-cookie-response": cookieResponse
  });
  const accessRoute = loadTs("app/api/app/ops/access/route.ts", {
    "next/headers": { cookies: async () => cookieAt("/api/app/ops/access") },
    "@/lib/ops-access": access,
    "@/lib/saas/access": auth
  });

  const wrong = await unlockRoute.POST(new Request("https://www.opturon.com/api/app/ops/unlock", {
    method: "POST", body: JSON.stringify({ password: "wrong" })
  }));
  assert.equal(wrong.status, 401);
  assert.equal(wrong.headers.getSetCookie().length, 0, "wrong password sets no cookie");
  assert.equal(await accessRoute.GET().then((response) => response.status), 403, "locked access cannot verify");

  let requestCount = 0;
  async function request(url, options) {
    requestCount++;
    if (url === "/api/app/ops/unlock") {
      const response = await unlockRoute.POST(new Request(`https://www.opturon.com${url}`, options));
      applyCookies(response);
      return response;
    }
    if (url === "/api/app/ops/access") {
      assert.equal(options?.credentials, "same-origin");
      assert.equal(options?.cache, "no-store");
      return accessRoute.GET();
    }
    throw new Error(`unexpected request: ${url}`);
  }

  assert.equal(await opening.unlockAndVerifyOps("wrong", request), "invalid_password", "A: wrong password stays locked");
  assert.equal(requestCount, 1, "wrong password never enters verification/opening");

  assert.equal(await opening.unlockAndVerifyOps(fixturePassword, request), "verified", "B: unlock, scoped cookie, verify, dashboard navigation is allowed");
  assert.equal(requestCount, 3, "a valid unlock is followed by exactly one access check");
  assert.deepEqual([...jar.keys()], ["/app/ops", "/api/app/ops"], "both scoped cookies survive the response");
  assert.equal(access.hasOpsAccessCookie(cookieAt("/app/ops")), true, "page request receives a valid signed cookie");
  assert.equal(access.hasOpsAccessCookie(cookieAt("/api/app/ops/access")), true, "verification request receives a valid signed cookie");

  const issued = await unlockRoute.POST(new Request("https://www.opturon.com/api/app/ops/unlock", {
    method: "POST", body: JSON.stringify({ password: fixturePassword })
  }));
  const headers = issued.headers.getSetCookie();
  assert.equal(headers.length, 2, "NextResponse emits two separate Set-Cookie headers");
  for (const header of headers) {
    assert.match(header, /HttpOnly/);
    assert.match(header, /Secure/);
    assert.match(header, /SameSite=lax/);
    assert.doesNotMatch(header, /(?:^|; )Domain=/, "OPS cookie remains host-only");
    assert.doesNotMatch(header, /fixture-ops-password|fixture-ops-signing-secret/, "secrets never enter Set-Cookie");
  }

  jar.delete("/api/app/ops");
  assert.equal(await opening.unlockAndVerifyOps(fixturePassword, async (url, options) => {
    if (url === "/api/app/ops/unlock") return unlockRoute.POST(new Request(`https://www.opturon.com${url}`, options));
    return accessRoute.GET();
  }), "access_denied", "C: a missing verification cookie terminates in locked/error");
  assert.equal(await opening.verifyOpsOpening(async () => new Response(null, { status: 502 })), "error", "D: dashboard/access load failure terminates in recoverable error");
  assert.equal(await opening.verifyOpsOpening(async () => { throw new Error("network failure"); }), "error", "D: network failure terminates in recoverable error");
  assert.equal(await opening.verifyOpsOpening(async () => new Response("{}", { status: 200 })), "error", "invalid verification payload fails closed");

  applyCookies(issued);
  assert.equal(access.hasOpsAccessCookie(cookieAt("/app/ops")), true, "E: reload with valid cookie renders dashboard");
  const expiredToken = access.createOpsAccessToken(Date.now() - cookie.OPS_ACCESS_MAX_AGE_SECONDS * 1000 - 1);
  jar.set("/app/ops", expiredToken);
  jar.set("/api/app/ops", expiredToken);
  assert.equal(access.hasOpsAccessCookie(cookieAt("/app/ops")), false, "F: expired session returns to gate");
  assert.equal(await accessRoute.GET().then((response) => response.status), 403, "expired session cannot verify");

  const locked = await lockRoute.POST();
  assert.equal(locked.headers.getSetCookie().length, 2, "lock clears both cookie paths");
  applyCookies(locked);
  assert.equal(jar.size, 0);

  const gateSource = readFileSync(join(root, "components/app/ops/OpsAccessGate.tsx"), "utf8");
  const pageSource = readFileSync(join(root, "app/app/ops/page.tsx"), "utf8");
  const dashboardSource = readFileSync(join(root, "components/app/ops/OpsDashboard.tsx"), "utf8");
  assert.doesNotMatch(gateSource, /router\.refresh\(|setUnlocked\(true\)|Abriendo OPS/, "G: no client refresh loop or stale opening branch");
  assert.match(gateSource, /window\.location\.assign\("\/app\/ops"\)/, "verified access loads the server-owned dashboard without manual reload");
  assert.match(pageSource, /opsUnlocked \? \(/, "only a server-verified cookie supplies dashboard children");
  assert.match(dashboardSource, /No pudimos abrir OPS\. Intentá nuevamente\./, "dashboard fetch errors are recoverable");
  assert.match(dashboardSource, /setOpsLoadError\(true\)/);
  assert.match(dashboardSource, /if \(!options\?\.silent\) setLoading\(false\)/, "dashboard loading terminates on failure");
} finally {
  for (const [key, value] of priorEnvironment) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

console.log("ops-opening.test.mjs passed");
