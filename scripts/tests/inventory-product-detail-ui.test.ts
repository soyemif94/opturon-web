import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const panel = fs.readFileSync(path.join(root, "components/app/ProductInventoryLotsPanel.tsx"), "utf8");
const page = fs.readFileSync(path.join(root, "app/app/catalog/[id]/page.tsx"), "utf8");

assert(panel.includes("Agregar ingreso"), "product detail must include lot receipt form");
assert(panel.includes("Activar lotes"), "product detail must expose lot mode activation");
assert(panel.includes("expired_writeoff"), "product detail must support expired writeoff");
assert(panel.includes("Bloquear lote"), "product detail must expose lot blocking");
assert(panel.includes("Desbloquear lote"), "product detail must expose lot unblocking");
assert(panel.includes("Editar vencimiento"), "product detail must expose lot expiration editing");
assert(page.includes("ProductInventoryLotsPanel"), "product detail page must render lot inventory panel");
assert(page.includes("getPortalInventoryLots"), "product detail page must prefetch product lots");

console.log("inventory-product-detail-ui.test.ts passed");
