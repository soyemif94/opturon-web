import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import ts from "typescript";
import { stripTypeScriptTypes } from "node:module";

const root = process.cwd();
const nodeRequire = createRequire(import.meta.url);
const { NextRequest, NextResponse } = nodeRequire("next/server");

function loadTs(path, imports = {}) {
  const source = readFileSync(join(root, path), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true
    }
  }).outputText;
  const module = { exports: {} };
  const requireModule = (name) => Object.hasOwn(imports, name) ? imports[name] : nodeRequire(name);
  new Function("require", "module", "exports", compiled)(requireModule, module, module.exports);
  return module.exports;
}

const priorEnvironment = new Map(["OPS_PASSWORD", "OPS_ACCESS_SECRET", "NODE_ENV"].map((key) => [key, process.env[key]]));
const priorInfo = console.info;
const priorWarn = console.warn;
const serverLogs = [];
let accessToken = null;

try {
  process.env.OPS_PASSWORD = "fixture-only-ops-password";
  process.env.OPS_ACCESS_SECRET = "fixture-only-ops-signing-secret";
  process.env.NODE_ENV = "production";
  console.info = (event, data) => serverLogs.push({ level: "info", event, data });
  console.warn = (event, data) => serverLogs.push({ level: "warn", event, data });

  const cookie = loadTs("lib/ops/ops-cookie.ts");
  const access = loadTs("lib/ops-access.ts", { "./ops/ops-cookie": cookie });
  const cookieStore = { get: (name) => name === cookie.OPS_ACCESS_COOKIE && accessToken ? { value: accessToken } : undefined };
  const reportHelpers = loadTs("lib/ops/reporting.ts");
  const commercialState = loadTs("lib/ops/commercial-state.ts");
  const portalUsers = loadTs("lib/portal-users.ts");
  const ExcelJS = nodeRequire("exceljs");
  const xlsx = loadTs("lib/ops/report-xlsx.ts", { exceljs: ExcelJS });
  const appApi = {
    isBackendConfigured: () => true,
    getPortalConversations: async () => ({ data: { conversations: [] } }),
    getPortalOrders: async () => ({ data: { orders: [] } }),
    getPortalUsers: async () => ({ data: { users: [] } }),
    getPortalInventoryProducts: async () => ({ data: { products: [], total: 0 } }),
    getPortalInventoryMovements: async () => ({ data: { items: [], total: 0 } }),
    getPortalInventoryLots: async () => ({ data: { lots: [] } })
  };
  const saasAccess = {
    requireAppModuleApi: async () => ({ ctx: {} }),
    resolveAppTenant: async () => ({ tenantId: "fixture-tenant" }),
    getPortalInventoryReadActor: () => ({ actor: "fixture" })
  };
  const route = loadTs("app/api/app/ops/reports/[report]/route.ts", {
    "next/headers": { cookies: async () => cookieStore },
    "next/server": { NextRequest, NextResponse },
    "@/lib/api": appApi,
    "@/lib/ops-access": access,
    "@/lib/ops/reporting": reportHelpers,
    "@/lib/ops/commercial-state": commercialState,
    "@/lib/portal-users": portalUsers,
    "@/lib/saas/access": saasAccess,
    "@/lib/ops/report-xlsx": xlsx
  });

  const helperSource = readFileSync(join(root, "lib/ops/report-download.ts"), "utf8");
  const helperUrl = `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(helperSource, { mode: "transform" })).toString("base64")}`;
  const queue = await import(helperUrl);
  const tokenModule = access.createOpsAccessToken();
  assert.ok(tokenModule, "the test creates a signed, fixture-only OPS cookie");

  const unauthorizedId = randomUUID();
  const unauthorized = await route.GET(new NextRequest("https://www.opturon.com/api/app/ops/reports/sales?format=xlsx", {
    headers: { "x-ops-report-request-id": unauthorizedId }
  }), { params: Promise.resolve({ report: "sales" }) });
  assert.equal(unauthorized.status, 403);
  assert.deepEqual(await unauthorized.json(), { error: "ops_access_required" });
  assert.equal(unauthorized.headers.get("x-request-id"), unauthorizedId);
  assert.equal(unauthorized.headers.get("x-ops-report-phase"), "AUTH");
  const authLog = serverLogs.find((entry) => entry.data?.requestId === unauthorizedId);
  assert.equal(authLog?.data.safeErrorCode, "ops_access_required");
  assert.equal(authLog?.data.phase, "AUTH");
  assert.equal(authLog?.data.status, 403);

  accessToken = tokenModule;
  const active = { count: 0, max: 0 };
  const started = [];
  const results = [];
  for (const report of queue.OPS_REPORT_TYPES) {
    queue.enqueueOpsReportDownload(report, "xlsx", async (setStage) => {
      active.count += 1;
      active.max = Math.max(active.max, active.count);
      started.push(report);
      const requestId = randomUUID();
      try {
        const request = new NextRequest(`https://www.opturon.com/api/app/ops/reports/${report}?format=xlsx`, {
          headers: { cookie: `ops_access=${accessToken}`, "x-ops-report-request-id": requestId }
        });
        const response = await route.GET(request, { params: Promise.resolve({ report }) });
        assert.equal(response.status, 200, `${report} returns success with the signed fixture cookie`);
        assert.match(response.headers.get("content-type") || "", /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/);
        assert.equal(response.headers.get("x-request-id"), requestId);
        assert.equal(response.headers.get("x-ops-report-phase"), "RESPONSE");
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()));
        assert.ok(workbook.getWorksheet("Datos"), `${report} endpoint returns a parseable XLSX workbook`);
        results.push({ report, requestId, status: response.status });
        setStage("downloading");
      } finally {
        active.count -= 1;
      }
    });
  }

  const deadline = Date.now() + 10_000;
  while (results.length < queue.OPS_REPORT_TYPES.length) {
    if (Date.now() >= deadline) throw new Error("Timed out waiting for six signed-session endpoint requests");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.equal(active.max, 1, "the real handler is invoked by at most one queue worker at once");
  assert.deepEqual(started, [...queue.OPS_REPORT_TYPES], "the six endpoint calls execute in queue order");
  assert.equal(results.length, 6);
  assert.equal(access.verifyOpsAccessToken(accessToken), true, "the same signed OPS session remains valid after all six requests");
  for (const report of queue.OPS_REPORT_TYPES) {
    assert.equal(queue.getOpsReportQueueSnapshot(report, "xlsx").state, "idle");
  }

  const successLogs = serverLogs.filter((entry) => entry.data?.status === 200);
  assert.equal(successLogs.length, 6, "each endpoint request emits one structured server diagnostic");
  for (const { data } of successLogs) {
    assert.match(data.requestId, /^[a-f\d-]{36}$/i);
    assert.equal(data.route, "/api/app/ops/reports/[report]");
    assert.equal(data.phase, "RESPONSE");
    assert.equal(data.safeErrorCode, null);
    assert.equal(typeof data.durationMs, "number");
    assert.match(data.contentType, /spreadsheetml\.sheet/);
    assert.deepEqual(Object.keys(data).sort(), ["contentType", "durationMs", "phase", "reportType", "requestId", "route", "safeErrorCode", "status"].sort());
  }
} finally {
  console.info = priorInfo;
  console.warn = priorWarn;
  for (const [key, value] of priorEnvironment) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

console.log("ops-report-endpoint-integration.test.mjs passed: auth failure phase, correlated diagnostics, six signed-session XLSX endpoint calls and preserved session");
