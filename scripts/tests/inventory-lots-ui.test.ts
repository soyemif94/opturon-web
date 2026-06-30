import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const workspace = fs.readFileSync(path.join(root, "components/app/InventoryLotsWorkspace.tsx"), "utf8");
const page = fs.readFileSync(path.join(root, "app/app/inventory/page.tsx"), "utf8");
const route = fs.readFileSync(path.join(root, "app/api/app/inventory/lots/route.ts"), "utf8");

assert(workspace.includes("Inventario por lotes"), "inventory page must expose lot-based copy");
assert(workspace.includes("expiresAt"), "inventory workspace must show expiration data");
assert(page.includes("getPortalInventoryLots"), "inventory page must fetch lots from backend");
assert(route.includes('permission: "manage_catalog"'), "lot creation must require catalog write permission");

console.log("inventory-lots-ui.test.ts passed");
