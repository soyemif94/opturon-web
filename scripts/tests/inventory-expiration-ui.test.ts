import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const workspace = fs.readFileSync(path.join(root, "components/app/InventoryLotsWorkspace.tsx"), "utf8");
const panel = fs.readFileSync(path.join(root, "components/app/ProductInventoryLotsPanel.tsx"), "utf8");

assert(workspace.includes("expirationStatus"), "inventory list must render expiration status");
assert(workspace.includes("Vencidos"), "inventory dashboard must show expired metric");
assert(panel.includes("Baja vencido"), "product lot panel must expose expired writeoff action");

console.log("inventory-expiration-ui.test.ts passed");
