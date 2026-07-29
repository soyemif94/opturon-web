import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const permissions = fs.readFileSync(path.join(root, "lib/app-permissions.ts"), "utf8");
const workspace = fs.readFileSync(path.join(root, "components/app/InventoryLotsWorkspace.tsx"), "utf8");
const panel = fs.readFileSync(path.join(root, "components/app/ProductInventoryLotsPanel.tsx"), "utf8");
const blockRoute = fs.readFileSync(path.join(root, "app/api/app/inventory/lots/[lotId]/block/route.ts"), "utf8");
const unblockRoute = fs.readFileSync(path.join(root, "app/api/app/inventory/lots/[lotId]/unblock/route.ts"), "utf8");
const expirationRoute = fs.readFileSync(path.join(root, "app/api/app/inventory/lots/[lotId]/expiration/route.ts"), "utf8");
const adjustRoute = fs.readFileSync(path.join(root, "app/api/app/inventory/lots/[lotId]/adjust/route.ts"), "utf8");
const locationsRoute = fs.readFileSync(path.join(root, "app/api/app/inventory/locations/route.ts"), "utf8");

assert(permissions.includes('"manage_inventory_receipts"'), "permissions must include manage_inventory_receipts");
assert(permissions.includes('"manage_inventory_sensitive"'), "permissions must include manage_inventory_sensitive");
assert(permissions.includes("seller") && permissions.includes("manage_inventory_receipts: true"), "seller must be allowed to receive lots");
assert(permissions.includes("manage_inventory_sensitive: false"), "seller must not get sensitive inventory actions");

assert(workspace.includes("canManageSensitive"), "workspace must receive sensitive capability");
assert(panel.includes("canManageReceipts"), "panel must receive receipt capability");
assert(panel.includes("canManageSensitive"), "panel must receive sensitive capability");

for (const routeSource of [blockRoute, unblockRoute, expirationRoute, adjustRoute, locationsRoute]) {
  assert(routeSource.includes('permission: "manage_inventory_sensitive"'), "sensitive routes must require sensitive permission");
  assert(routeSource.includes("portalActorId") || routeSource.includes("tenantContext.ctx?.userId"), "sensitive routes must forward actor identity");
}

console.log("inventory-permissions-ui.test.ts passed");
