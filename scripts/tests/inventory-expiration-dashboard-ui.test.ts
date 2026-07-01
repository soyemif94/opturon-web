import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workspace = fs.readFileSync(path.join(root, "components/app/InventoryLotsWorkspace.tsx"), "utf8");
const shell = fs.readFileSync(path.join(root, "components/layout/app-shell.tsx"), "utf8");
const home = fs.readFileSync(path.join(root, "components/app/app-dashboard.tsx"), "utf8");

for (const copy of ["Vencimientos", "Vencidos", "Vencen hoy", "Stock comprometido", "Mas filtros"]) {
  assert(workspace.includes(copy), `dashboard must include ${copy}`);
}
assert(shell.includes("inventoryAlertCount"), "navigation must include inventory badge count");
assert(home.includes("Vencimientos proximos"), "home must include compact expiration card");

console.log("inventory-expiration-dashboard-ui.test.ts passed");
