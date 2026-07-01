import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workspace = fs.readFileSync(path.join(root, "components/app/InventoryLotsWorkspace.tsx"), "utf8");
const productPanel = fs.readFileSync(path.join(root, "components/app/ProductInventoryLotsPanel.tsx"), "utf8");

for (const copy of ["Dar de baja", "Ajustar stock", "Ver lote", "Ver producto", "Baja masiva vencidos"]) {
  assert(workspace.includes(copy), `writeoff UI must include ${copy}`);
}
assert(workspace.includes("expired_writeoff"), "workspace must create expired writeoff movements");
assert(productPanel.includes("Dar de baja stock vencido"), "product lot detail must expose guided expired writeoff");
assert(productPanel.includes("Producto vencido"), "guided writeoff must default expired reason");

console.log("inventory-expiration-writeoff-ui.test.ts passed");
