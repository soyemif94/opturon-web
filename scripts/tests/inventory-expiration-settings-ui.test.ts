import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const root = path.join(__dirname, "../..");
const workspace = fs.readFileSync(path.join(root, "components/app/InventoryLotsWorkspace.tsx"), "utf8");

for (const copy of ["Configuracion de alertas", "Avisarme cuando falten", "Critico", "Urgente", "Preventivo", "Proximo vencimiento"]) {
  assert(workspace.includes(copy), `settings UI must include ${copy}`);
}
assert(workspace.includes("validateThresholds"), "settings UI must validate threshold order");
assert(workspace.includes("/api/app/inventory/expiration-settings"), "settings UI must persist settings");

console.log("inventory-expiration-settings-ui.test.ts passed");
