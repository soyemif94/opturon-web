import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { join } from "node:path";

const root = process.cwd();
const source = readFileSync(join(root, "lib/ops/reporting.ts"), "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source, { mode: "transform" })).toString("base64")}`;
const { buildCsv, escapeCsvCell, filterBySeller, isWithinReportDateRange, summarizeSellerRows } = await import(moduleUrl);

assert.equal(isWithinReportDateRange("2026-10-09T10:15:00.000Z", { dateFrom: "2026-10-09", dateTo: "2026-10-10" }), true);
assert.equal(isWithinReportDateRange("2026-10-08T23:59:00.000Z", { dateFrom: "2026-10-09" }), false);
assert.equal(isWithinReportDateRange(null, { dateFrom: "2026-10-09" }), false);
assert.equal(filterBySeller([{ sellerUserId: "a" }, { sellerUserId: "b" }], "b").length, 1);
assert.equal(escapeCsvCell('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"', "CSV formula injection is neutralized and quotes are escaped");
assert.match(buildCsv(["name"], [["A, B"]]), /"A, B"/);

const now = new Date("2026-10-10T12:00:00.000Z");
const sellers = summarizeSellerRows([
  { assignedSellerUserId: "seller-a", assignedSellerName: "Ana", leadStatus: "NEW", nextActionAt: null, lastCommercialActivityAt: "2026-10-06T10:00:00.000Z", lastMessageAt: "2026-10-06T10:00:00.000Z", unreadCount: 0 },
  { assignedSellerUserId: "seller-a", assignedSellerName: "Ana", leadStatus: "FOLLOW_UP", nextActionAt: "2026-10-11T12:00:00.000Z", lastCommercialActivityAt: "2026-10-06T10:00:00.000Z", unreadCount: 0 },
  { assignedSellerUserId: "seller-b", assignedSellerName: "Luis", leadStatus: "IN_CONVERSATION", nextActionAt: null, recoveryStartedAt: "2026-10-10T10:00:00.000Z", lastCommercialActivityAt: "2026-10-10T10:00:00.000Z", unreadCount: 0 }
], [
  { sellerUserId: "seller-a", sellerNameSnapshot: "Ana", total: 1200, currency: "ARS", paymentStatus: "paid", orderStatus: "open" },
  { sellerUserId: "seller-a", sellerNameSnapshot: "Ana", total: 500, currency: "ARS", paymentStatus: "pending", orderStatus: "open" },
  { sellerUserId: "seller-b", sellerNameSnapshot: "Luis", total: 900, currency: "ARS", paymentStatus: "paid", orderStatus: "open" }
], now);
assert.equal(sellers.find((item) => item.sellerUserId === "seller-a").activeLeads, 2);
assert.equal(sellers.find((item) => item.sellerUserId === "seller-a").newLeads, 1);
assert.equal(sellers.find((item) => item.sellerUserId === "seller-a").followUps, 1);
assert.equal(sellers.find((item) => item.sellerUserId === "seller-a").coldLeads, 1, "a future follow-up excludes that lead from cold counts");
assert.equal(sellers.find((item) => item.sellerUserId === "seller-a").revenue, 1200, "only paid orders count toward collected revenue");
assert.equal(sellers.find((item) => item.sellerUserId === "seller-b").recoveryStarted72h, 1);

const directoryOnlySeller = summarizeSellerRows([], [], now, [{ id: "seller-c", name: "Cora" }]);
assert.equal(directoryOnlySeller.length, 1, "an operational seller remains visible with zero current leads or sales");
assert.deepEqual(directoryOnlySeller[0], {
  sellerUserId: "seller-c",
  sellerName: "Cora",
  activeLeads: 0,
  newLeads: 0,
  followUps: 0,
  overdueFollowUps: 0,
  recoveryStarted72h: 0,
  coldLeads: 0,
  salesCount: 0,
  paidSalesCount: 0,
  revenue: 0,
  currency: "ARS"
});
assert.equal(summarizeSellerRows([], [], now, []).length, 0, "an empty operational directory yields the team empty state");

const inboxRoute = readFileSync(join(root, "app/api/app/inbox/route.ts"), "utf8");
const exportRoute = readFileSync(join(root, "app/api/app/ops/reports/[report]/route.ts"), "utf8");
assert.match(inboxRoute, /sellerId: z\.string\(\)\.optional\(\)/);
assert.match(inboxRoute, /dateFrom: z\.string\(\)/);
assert.match(inboxRoute, /operationalState/);
assert.match(exportRoute, /hasOpsAccessCookie\(cookieStore\)/);
assert.match(exportRoute, /requireAppModuleApi\(requiredModule, \{ permission: "manage_workspace" \}\)/);
assert.match(exportRoute, /resolveAppTenant\(\{ permission: "manage_workspace" \}\)/);
assert.doesNotMatch(exportRoute, /requestedTenantId/);
assert.match(exportRoute, /getPortalOrders\(tenantContext\.tenantId\)/);
assert.match(exportRoute, /getPortalConversations\(tenantContext\.tenantId/);

console.log("ops-reporting.test.mjs passed");
