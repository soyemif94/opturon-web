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

  let failNextOrdersQuery = false;
  let teamFixtureMode = "zero";
  let teamUsers = [{ id: "fixture-seller-1", name: "Vendedora Demo", role: "seller" }];
  const tenantCalls = [];
  const moduleGuardCalls = [];

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
    getPortalConversations: async (tenantId) => {
      tenantCalls.push(tenantId);
      const conversations = teamFixtureMode === "populated" ? Array.from({ length: 9 }, (_, index) => ({
        id: `fixture-conversation-${index + 1}`,
        assignedSellerUserId: "fixture-seller-1",
        assignedSellerName: "Vendedora Demo",
        leadStatus: index === 0 ? "FOLLOW_UP" : "IN_CONVERSATION",
        nextActionAt: index === 0 ? "2026-10-12T12:00:00.000Z" : null,
        lastCommercialActivityAt: "2026-10-10T10:00:00.000Z",
        lastMessageAt: "2026-10-10T10:00:00.000Z",
        unreadCount: 0,
        channelType: "whatsapp"
      })) : [];
      return { data: { conversations } };
    },
    getPortalOrders: async (tenantId) => {
      tenantCalls.push(tenantId);
      if (failNextOrdersQuery) {
        failNextOrdersQuery = false;
        const error = new Error("fixture upstream failure; sensitive fixture values must not be logged");
        error.status = 500;
        throw error;
      }
      const orders = teamFixtureMode === "populated" ? [
        { id: "fixture-order-1", sellerUserId: "fixture-seller-1", orderStatus: "open", paymentStatus: "paid", total: 30, currency: "ARS", createdAt: "2026-10-10T10:00:00.000Z" },
        { id: "fixture-order-2", sellerUserId: "fixture-seller-1", orderStatus: "open", paymentStatus: "paid", total: 60, currency: "ARS", createdAt: "2026-10-10T11:00:00.000Z" },
        { id: "fixture-order-3", sellerUserId: "fixture-seller-1", orderStatus: "open", paymentStatus: "pending", total: 100, currency: "ARS", createdAt: "2026-10-10T12:00:00.000Z" }
      ] : [];
      return { data: { orders } };
    },
    getPortalUsers: async (tenantId) => {
      tenantCalls.push(tenantId);
      return { data: { users: teamUsers } };
    },
    getPortalInventoryProducts: async () => ({ data: { products: [], total: 0 } }),
    getPortalInventoryMovements: async () => ({ data: { items: [], total: 0 } }),
    getPortalInventoryLots: async () => ({ data: { lots: [] } })
  };
  const saasAccess = {
    requireAppModuleApi: async (...args) => { moduleGuardCalls.push(args); return { ctx: {} }; },
    resolveAppTenant: async (...args) => { moduleGuardCalls.push(["resolveAppTenant", ...args]); return { tenantId: "fixture-tenant" }; },
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

  failNextOrdersQuery = true;
  const firstTeamRequestId = randomUUID();
  const firstTeamResponse = await route.GET(new NextRequest("https://www.opturon.com/api/app/ops/reports/sellers?format=json", {
    headers: { cookie: `ops_access=${accessToken}`, "x-ops-report-request-id": firstTeamRequestId }
  }), { params: Promise.resolve({ report: "sellers" }) });
  assert.equal(firstTeamResponse.status, 502, "a controlled Team data-source failure is surfaced as a safe error state");
  assert.equal(firstTeamResponse.headers.get("x-request-id"), firstTeamRequestId);
  assert.equal(firstTeamResponse.headers.get("x-ops-report-phase"), "QUERY");
  assert.deepEqual(await firstTeamResponse.json(), { error: "ops_report_generation_failed" });
  const failedTeamLog = serverLogs.find((entry) => entry.data?.requestId === firstTeamRequestId);
  assert.equal(failedTeamLog?.data.safeErrorCode, "ops_report_generation_failed");
  assert.equal(failedTeamLog?.data.tenantId, "fixture-tenant");
  assert.equal(failedTeamLog?.data.failedDataSource, "orders");
  assert.equal(failedTeamLog?.data.upstreamStatus, 500);
  assert.equal(JSON.stringify(failedTeamLog).includes("sensitive fixture values"), false, "failure logs do not include raw upstream error details");

  const retryTeamRequestId = randomUUID();
  assert.notEqual(retryTeamRequestId, firstTeamRequestId, "retry uses a fresh request ID");
  const retryTeamResponse = await route.GET(new NextRequest("https://www.opturon.com/api/app/ops/reports/sellers?format=json", {
    headers: { cookie: `ops_access=${accessToken}`, "x-ops-report-request-id": retryTeamRequestId }
  }), { params: Promise.resolve({ report: "sellers" }) });
  assert.equal(retryTeamResponse.status, 200, "the Team endpoint recovers on a fresh authorized request");
  assert.equal(retryTeamResponse.headers.get("x-request-id"), retryTeamRequestId);
  assert.equal(retryTeamResponse.headers.get("x-ops-report-phase"), "RESPONSE");
  const teamPayload = await retryTeamResponse.json();
  assert.equal(teamPayload.sellers.length, 1, "a tenant with a single commercial seller returns one row");
  assert.equal(teamPayload.sellers[0].sellerUserId, "fixture-seller-1", "the response uses the persistent seller user ID");
  assert.equal(teamPayload.sellers[0].sellerName, "Vendedora Demo");
  assert.equal(teamPayload.sellers[0].activeLeads, 0);
  assert.equal(teamPayload.sellers[0].overdueFollowUps, 0);
  assert.equal(teamPayload.sellers[0].recoveryStarted72h, 0);
  assert.equal(teamPayload.sellers[0].salesCount, 0);
  assert.equal(teamPayload.sellers[0].revenue, 0);
  assert.ok(tenantCalls.length >= 6 && tenantCalls.every((tenantId) => tenantId === "fixture-tenant"), "all Team queries stay in the server-resolved tenant scope");
  assert.ok(moduleGuardCalls.some(([module, options]) => module === "orders" && options?.permission === "manage_workspace"), "Team report requires current workspace management RBAC");
  assert.equal(access.verifyOpsAccessToken(accessToken), true, "the Team request uses the signed OPS access cookie");

  teamFixtureMode = "populated";
  const populatedTeamRequestId = randomUUID();
  const populatedTeamResponse = await route.GET(new NextRequest("https://www.opturon.com/api/app/ops/reports/sellers?format=json&sellerId=fixture-seller-1", {
    headers: { cookie: `ops_access=${accessToken}`, "x-ops-report-request-id": populatedTeamRequestId }
  }), { params: Promise.resolve({ report: "sellers" }) });
  assert.equal(populatedTeamResponse.status, 200);
  const populatedTeamPayload = await populatedTeamResponse.json();
  assert.equal(populatedTeamPayload.sellers.length, 1);
  assert.equal(populatedTeamPayload.sellers[0].sellerUserId, "fixture-seller-1");
  assert.equal(populatedTeamPayload.sellers[0].activeLeads, 9);
  assert.equal(populatedTeamPayload.sellers[0].followUps, 1);
  assert.equal(populatedTeamPayload.sellers[0].salesCount, 3);
  assert.equal(populatedTeamPayload.sellers[0].paidSalesCount, 2);
  assert.equal(populatedTeamPayload.sellers[0].revenue, 90);
  assert.equal(populatedTeamPayload.sellers[0].averageTicket, 45);

  teamFixtureMode = "zero";
  teamUsers = [{ id: "noncommercial-user", name: "Solo lectura", role: "viewer" }];
  const emptyTeamResponse = await route.GET(new NextRequest("https://www.opturon.com/api/app/ops/reports/sellers?format=json", {
    headers: { cookie: `ops_access=${accessToken}`, "x-ops-report-request-id": randomUUID() }
  }), { params: Promise.resolve({ report: "sellers" }) });
  assert.equal(emptyTeamResponse.status, 200);
  assert.deepEqual((await emptyTeamResponse.json()).sellers, [], "a tenant with no commercial sellers returns the canonical empty response");
  teamUsers = [{ id: "fixture-seller-1", name: "Vendedora Demo", role: "seller" }];

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

  const successLogs = serverLogs.filter((entry) => entry.data?.status === 200 && /spreadsheetml\.sheet/.test(entry.data?.contentType || ""));
  assert.equal(successLogs.length, 6, "each XLSX endpoint request emits one structured server diagnostic");
  const teamSuccessLog = serverLogs.find((entry) => entry.data?.requestId === retryTeamRequestId);
  assert.equal(teamSuccessLog?.data.status, 200);
  assert.equal(teamSuccessLog?.data.contentType, "application/json");
  assert.equal(teamSuccessLog?.data.phase, "RESPONSE");
  assert.equal(teamSuccessLog?.data.tenantId, "fixture-tenant");
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
