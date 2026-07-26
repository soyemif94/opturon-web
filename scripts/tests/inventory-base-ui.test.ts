import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const page = read("app/app/inventory/page.tsx");
const workspace = read("components/app/InventoryBaseWorkspace.tsx");
const productsRoute = read("app/api/app/inventory/products/route.ts");
const movementsRoute = read("app/api/app/inventory/products/[productId]/movements/route.ts");
const catalogManager = read("components/app/CatalogManager.tsx");
const editor = read("components/app/ProductEditor.tsx");

assert.match(page, /requireAppModulePage\("inventory"\)/);
assert.match(page, /InventoryBaseWorkspace/);
assert.match(page, /InventoryLotsWorkspace/);
assert.match(page, /getPortalInventoryProducts/);
assert.match(page, /getPortalInventoryLots/);

assert.match(workspace, /Buscar por nombre, c[oó]digo interno, SKU o barras/);
assert.match(workspace, /<option value="with_stock">Con stock<\/option>/);
assert.match(workspace, /<option value="without_stock">Sin stock<\/option>/);
assert.match(workspace, /C[oó]digo/);
assert.match(workspace, /Ubicaci[oó]n/);
assert.match(workspace, /Registrar movimiento/);
assert.match(workspace, /Historial/);
assert.match(workspace, /opening_balance/);
assert.match(workspace, /manual_increase/);
assert.match(workspace, /manual_decrease/);
assert.match(workspace, /correction/);
assert.match(workspace, /Stock contado/);
assert.match(workspace, /crypto\.randomUUID\(\)/);
assert.match(workspace, /No pod/);

assert.match(productsRoute, /requireAppModuleApi\("inventory"\)/);
assert.match(productsRoute, /getPortalInventoryProducts/);

assert.match(movementsRoute, /requireAppModuleApi\("inventory"\)/);
assert.match(movementsRoute, /createPortalInventoryMovement/);

assert.match(catalogManager, /product\.internalCode/);
assert.match(catalogManager, /El stock se gestiona desde Inventario con movimientos auditables/);
assert.match(editor, /El stock se administra desde Inventario/);
assert.match(editor, /readOnly disabled/);

console.log("inventory-base-ui.test.ts passed");
