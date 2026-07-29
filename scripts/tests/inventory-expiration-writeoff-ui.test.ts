import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workspace = fs.readFileSync(path.join(root, "components/app/InventoryLotsWorkspace.tsx"), "utf8");
const productPanel = fs.readFileSync(path.join(root, "components/app/ProductInventoryLotsPanel.tsx"), "utf8");
const helpers = fs.readFileSync(path.join(root, "lib/inventory-lot-ui.ts"), "utf8");

for (const copy of ["Dar de baja", "Ajustar stock", "Ver lote", "Ver producto", "Baja masiva vencidos"]) {
  assert(workspace.includes(copy), `writeoff UI must include ${copy}`);
}
assert(workspace.includes("expired_writeoff"), "workspace must create expired writeoff movements");
assert(productPanel.includes("Dar de baja lote"), "product lot detail must expose manual writeoff dialog");
assert(helpers.includes("inventory_manual_writeoff"), "manual writeoff must use dedicated reference type");
assert(helpers.includes('movementType: "manual_decrease"'), "manual writeoff must use general manual decrease movement");
assert(!productPanel.includes('const defaultReason = movementType === "expired_writeoff" ? "Producto vencido" : "Ajuste de inventario";'), "manual writeoff must not hardcode expired reason in product detail");
assert(helpers.includes("manual_writeoff"), "lot helpers must expose manual writeoff history label");

console.log("inventory-expiration-writeoff-ui.test.ts passed");
