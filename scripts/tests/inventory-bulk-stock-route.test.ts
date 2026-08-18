import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const route = read("app/api/app/inventory/bulk-adjust/route.ts");
const api = read("lib/api.ts");

assert.match(route, /requireAppModuleApi\("inventory", \{ permission: "manage_inventory_sensitive" \}\)/);
assert.match(route, /canPerformTenantInventorySensitiveAction\(moduleGuard\.ctx\)/);
assert.match(route, /NextResponse\.json\(\{ error: "Forbidden" \}, \{ status: 403 \}\)/);
assert.match(route, /resolveAppTenant\(\{ permission: "manage_inventory_sensitive", requireWrite: true \}\)/);
assert.match(route, /portalActorId \|\| tenantContext\.ctx\?\.userId/);
assert.match(route, /tenantContext\.ctx\?\.session\?\.user\?\.name/);
assert.match(route, /createPortalInventoryBulkAdjustment/);
assert.match(route, /idempotencyKey: String\(body\?\.idempotencyKey/);
assert.match(route, /targetQuantity: item\?\.targetQuantity/);
assert.match(route, /expectedCurrentQuantity: item\?\.expectedCurrentQuantity/);
assert.match(route, /result\.data\.idempotent \? 200 : 201/);
assert.match(route, /getBackendErrorStatus\(error\) \|\| 502/);
assert.doesNotMatch(route, /Promise\.all\s*\(\s*body\?\.items/);
assert.doesNotMatch(route, /items\.map\s*\([^)]*fetch/);

const helperStart = api.indexOf("export async function createPortalInventoryBulkAdjustment");
const helperEnd = api.indexOf("export async function previewPortalCatalogBulkDelete", helperStart);
assert.notEqual(helperStart, -1);
assert.notEqual(helperEnd, -1);
const helper = api.slice(helperStart, helperEnd);
assert.match(helper, /\/portal\/tenants\/\$\{tenantId\}\/inventory\/bulk-adjust/);
assert.match(helper, /method: "POST"/);
assert.match(helper, /x-portal-actor-id/);
assert.match(helper, /x-portal-actor-name/);
assert.match(helper, /PORTAL_INVENTORY_BULK_ADJUST_TIMEOUT_MS/);
assert.match(api, /const PORTAL_INVENTORY_BULK_ADJUST_TIMEOUT_MS = 120_000/);
assert.match(api, /submittedItems: number/);
assert.match(api, /changedItems: number/);
assert.match(api, /status: "updated" \| "unchanged" \| "idempotent"/);

console.log("inventory-bulk-stock-route.test.ts passed");
