import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const workspace = fs.readFileSync(path.join(root, "components/app/InventoryLotsWorkspace.tsx"), "utf8");
const panel = fs.readFileSync(path.join(root, "components/app/ProductInventoryLotsPanel.tsx"), "utf8");
const expirationRoute = fs.readFileSync(path.join(root, "app/api/app/inventory/expiration-settings/route.ts"), "utf8");
const bulkWriteoffRoute = fs.readFileSync(path.join(root, "app/api/app/inventory/lots/bulk-writeoff-expired/route.ts"), "utf8");

assert(workspace.includes("expirationStatus"), "inventory list must render expiration status");
assert(workspace.includes("Vencidos"), "inventory dashboard must show expired metric");
assert(panel.includes("Baja vencido"), "product lot panel must expose expired writeoff action");
assert(expirationRoute.includes('permission: "manage_inventory_sensitive"'), "expiration settings must require sensitive inventory permission");
assert(bulkWriteoffRoute.includes('permission: "manage_inventory_sensitive"'), "bulk writeoff must require sensitive inventory permission");

console.log("inventory-expiration-ui.test.ts passed");
