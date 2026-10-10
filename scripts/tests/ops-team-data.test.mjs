import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { join } from "node:path";

const root = process.cwd();
const helperSource = readFileSync(join(root, "lib/ops/team-view.ts"), "utf8");
const helperUrl = `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(helperSource, { mode: "transform" })).toString("base64")}`;
const { mergeOpsTeamRows } = await import(helperUrl);

const canonical = [{
  sellerUserId: "seller-1",
  sellerName: "Vendedora Demo",
  totalActiveLeads: 2,
  newLeads: 1,
  overdueLeads: 0,
  followUpLeads: 1,
  coldLeads: 0,
  recoveryLeads: 0,
  totalOrders: 4,
  totalPaidOrders: 3,
  totalRevenue: 4500,
  averageTicket: 1500,
  currency: "ARS"
}];

const reportRow = {
  sellerUserId: "seller-1",
  sellerName: "Nombre actualizado",
  totalActiveLeads: 9,
  newLeads: 2,
  overdueLeads: 0,
  followUpLeads: 1,
  coldLeads: 0,
  recoveryLeads: 0,
  totalOrders: 3,
  totalPaidOrders: 2,
  totalRevenue: 3000,
  averageTicket: 1500,
  currency: "ARS"
};

const oneSeller = mergeOpsTeamRows(canonical, [reportRow, { ...reportRow, sellerUserId: "not-in-directory" }]);
assert.equal(oneSeller.length, 1, "one seller is valid and report data cannot add noncanonical identities");
assert.equal(oneSeller[0].sellerUserId, "seller-1", "the persistent seller ID is the only join key");
assert.equal(oneSeller[0].sellerName, "Nombre actualizado");
assert.equal(oneSeller[0].totalActiveLeads, 9);
assert.equal(oneSeller[0].followUpLeads, 1);
assert.equal(oneSeller[0].totalOrders, 3);
assert.equal(oneSeller[0].totalRevenue, 3000);

const zeroes = mergeOpsTeamRows([{
  ...canonical[0], totalActiveLeads: null, overdueLeads: null, followUpLeads: null,
  coldLeads: null, recoveryLeads: null, totalOrders: null, totalPaidOrders: null,
  totalRevenue: Number.NaN, averageTicket: null, currency: "INVALID"
}], [{
  ...reportRow, totalActiveLeads: null, overdueLeads: null, followUpLeads: null,
  coldLeads: null, recoveryLeads: null, totalOrders: null, totalPaidOrders: null,
  totalRevenue: Number.NaN, averageTicket: null, currency: "INVALID"
}]);
for (const key of ["totalActiveLeads", "overdueLeads", "followUpLeads", "coldLeads", "recoveryLeads", "totalOrders", "totalPaidOrders", "totalRevenue", "averageTicket"]) {
  assert.equal(zeroes[0][key], 0, `${key} normalizes null/non-finite values to zero`);
}
assert.equal(zeroes[0].currency, "ARS", "invalid legacy currency uses the safe configured fallback");

assert.deepEqual(mergeOpsTeamRows(canonical, null, "seller-1"), [canonical[0]], "a selected seller stays visible on report failure");
assert.deepEqual(mergeOpsTeamRows(canonical, null, "missing-seller"), [], "seller filtering can produce the canonical empty state");
const filteredFallback = mergeOpsTeamRows(canonical, null, "", false);
assert.equal(filteredFallback.length, 1);
assert.equal(filteredFallback[0].totalOrders, undefined, "filtered report failure does not display unfiltered sales as filtered metrics");
assert.deepEqual(mergeOpsTeamRows([], null), [], "no sellers yields an empty state");

const dashboard = readFileSync(join(root, "components/app/ops/OpsDashboard.tsx"), "utf8");
const teamView = readFileSync(join(root, "components/app/ops/OpsSellerLoad.tsx"), "utf8");
assert.match(dashboard, /label: "Equipo", count: teamRows\.length/);
assert.match(dashboard, /<OpsSellerLoad items=\{teamRows\} \/>/);
assert.match(dashboard, /new AbortController\(\)/);
assert.match(dashboard, /setTimeout\(\(\) => \{\s*controller\.abort\(\);[\s\S]*?setSellerReportError\(true\);\s*setSellerReportLoading\(false\);\s*\}, 15_000\)/,
  "a timed-out Team request enters ERROR and cannot leave an infinite loading state");
assert.match(dashboard, /setSellerReportRetryCount\(\(count\) => count \+ 1\)/);
assert.match(dashboard, /finally\(\(\) => \{\s*window\.clearTimeout\(requestTimeout\);\s*if \(!controller\.signal\.aborted\) setSellerReportLoading\(false\)/);
assert.match(dashboard, /requestId: knownError\?\.requestId/);
assert.match(teamView, /No hay vendedores para los filtros seleccionados\./);
assert.match(teamView, /Number\.isFinite/);

console.log("ops-team-data.test.mjs passed: canonical single seller, persistent-ID merge, zero normalization, filter and empty/error fallback contracts");
