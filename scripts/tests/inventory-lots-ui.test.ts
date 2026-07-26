import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const baseWorkspace = fs.readFileSync(path.join(root, "components/app/InventoryBaseWorkspace.tsx"), "utf8");
const lotsWorkspace = fs.readFileSync(path.join(root, "components/app/InventoryLotsWorkspace.tsx"), "utf8");
const page = fs.readFileSync(path.join(root, "app/app/inventory/page.tsx"), "utf8");
const route = fs.readFileSync(path.join(root, "app/api/app/inventory/lots/route.ts"), "utf8");

assert(baseWorkspace.includes("Base operativa de stock"), "inventory page must expose base inventory copy");
assert(baseWorkspace.includes("opening_balance"), "inventory workspace must support opening balance");
assert(baseWorkspace.includes("manual_increase"), "inventory workspace must support manual increases");
assert(baseWorkspace.includes("manual_decrease"), "inventory workspace must support manual decreases");
assert(baseWorkspace.includes("Stock contado"), "inventory workspace must support counted stock corrections");
assert(lotsWorkspace.includes("Inventario por lotes"), "lot workspace must remain available for future lot-based flows");
assert(page.includes("InventoryBaseWorkspace"), "inventory page must render the base inventory workspace");
assert(page.includes("InventoryLotsWorkspace"), "inventory page must keep the lots workspace accessible");
assert(page.includes('requireAppModulePage("inventory")'), "inventory page must require the inventory module");
assert(route.includes('permission: "manage_catalog"'), "lot creation must require catalog write permission");

console.log("inventory-lots-ui.test.ts passed");
