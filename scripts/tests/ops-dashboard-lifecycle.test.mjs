import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dashboard = readFileSync(join(root, "components/app/ops/OpsDashboard.tsx"), "utf8");
const teamView = readFileSync(join(root, "components/app/ops/OpsSellerLoad.tsx"), "utf8");
const appShell = readFileSync(join(root, "components/layout/app-shell.tsx"), "utf8");
const reportRoute = readFileSync(join(root, "app/api/app/ops/reports/[report]/route.ts"), "utf8");

assert.doesNotMatch(dashboard, /salesRequested|sellerReportRequested/, "report requests are not gated by state that cancels their own effect");
assert.match(dashboard, /const controller = new AbortController\(\)/);
assert.match(dashboard, /salesReportUrl, salesRetryCount/);
assert.match(dashboard, /sellerReportUrl, sellerReportRetryCount/);
assert.match(dashboard, /finally\(\(\) => \{\s*window\.clearTimeout\(requestTimeout\);\s*if \(!controller\.signal\.aborted\) setSellerReportLoading\(false\)/);
assert.match(dashboard, /Reintentar/);
assert.match(teamView, /No hay vendedores para los filtros seleccionados\./);
assert.match(dashboard, /label: "Equipo", count: teamRows\.length/);
assert.match(dashboard, /<OpsSellerLoad items=\{teamRows\} \/>/);
assert.match(dashboard, /No pudimos actualizar todas las métricas; mostramos los datos OPS disponibles\./);
assert.match(dashboard, /new AbortController\(\)/, "Team retry creates a fresh request controller");
assert.match(reportRoute, /getPortalUsers\(tenantContext\.tenantId\)/);
assert.match(reportRoute, /isOperationalPortalAssigneeUser\(user\)/);
assert.match(reportRoute, /summarizeSellerRows\(filteredLeads, filteredSales, generatedAt, sellerDirectory\)/);
assert.match(reportRoute, /hasOpsAccessCookie\(cookieStore\)/);
assert.match(reportRoute, /requireAppModuleApi\(requiredModule, \{ permission: "manage_workspace" \}\)/);
assert.match(reportRoute, /resolveAppTenant\(\{ permission: "manage_workspace" \}\)/);
assert.match(appShell, /document\.addEventListener\("visibilitychange", handleVisibilityChange\)/,
  "OPS still auto-locks when hidden if no report export is active");
assert.match(appShell, /if \(hasActiveOpsReportExports\(\)\) \{\s*lockWhenQueueSettles = true;/,
  "backgrounding OPS defers locking while a report export queue is active");
assert.match(appShell, /subscribeToOpsReportQueue\(\(\) => \{\s*if \(!lockWhenQueueSettles \|\| document\.visibilityState !== "hidden" \|\| hasActiveOpsReportExports\(\)\) return;\s*lockWhenQueueSettles = false;\s*sendOpsLockRequest\(\);/,
  "a deferred hidden-tab lock runs as soon as the report queue drains");
assert.match(appShell, /unsubscribeFromQueue\(\)/,
  "the deferred lock subscription is cleaned up with AppShell");
assert.match(appShell, /window\.addEventListener\("beforeunload", handleBeforeUnload\)/,
  "closing/reloading the document still locks OPS");
assert.match(appShell, /if \(!previousPathname\.startsWith\("\/app\/ops"\) \|\| pathname\.startsWith\("\/app\/ops"\)\)/,
  "navigating away from OPS still sends its explicit lock request");

console.log("ops-dashboard-lifecycle.test.mjs passed");
