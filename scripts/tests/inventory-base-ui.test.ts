import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const page = read("app/app/inventory/page.tsx");
const workspace = read("components/app/InventoryBaseWorkspace.tsx");
const appShell = read("components/layout/app-shell.tsx");
const productsRoute = read("app/api/app/inventory/products/route.ts");
const movementsRoute = read("app/api/app/inventory/products/[productId]/movements/route.ts");
const catalogManager = read("components/app/CatalogManager.tsx");
const editor = read("components/app/ProductEditor.tsx");

assert.match(page, /requireAppModulePage\("inventory"\)/);
assert.match(page, /InventoryBaseWorkspace/);
assert.match(page, /InventoryLotsWorkspace/);
assert.match(page, /getPortalInventoryProducts/);
assert.match(page, /getPortalInventoryLots/);
assert.match(page, /access_restricted/);
assert.match(page, /Error al cargar inventario/);
assert.match(page, /Inventario no esta habilitado para este tenant/);

assert.match(workspace, /type InventoryActionPanel = "history" \| "movement" \| null/);
assert.match(workspace, /openPanel\(product, "history"\)/);
assert.match(workspace, /openPanel\(product, "movement"\)/);
assert.match(workspace, /setActivePanel\(null\)/);
assert.match(workspace, /Cerrar panel/);
assert.match(workspace, /scrollIntoView/);
assert.match(workspace, /requestAnimationFrame/);
assert.match(workspace, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
assert.match(workspace, /tabIndex=\{-1\}/);
assert.match(workspace, /activePanel === "movement"/);
assert.match(workspace, /activePanel === "history"/);
assert.doesNotMatch(workspace, /inventory-actions-preview/);

assert.match(appShell, /"flex-1 min-h-0"/);
assert.match(appShell, /overflow-x-visible overflow-y-auto/);

assert.match(productsRoute, /requireAppModuleApi\("inventory"\)/);
assert.match(productsRoute, /getPortalInventoryProducts/);

assert.match(movementsRoute, /requireAppModuleApi\("inventory"\)/);
assert.match(movementsRoute, /createPortalInventoryMovement/);

assert.match(catalogManager, /product\.internalCode/);
assert.match(catalogManager, /El stock se gestiona desde Inventario con movimientos auditables/);
assert.match(editor, /El stock se administra desde Inventario/);
assert.match(editor, /readOnly disabled/);

assert.equal(existsSync(join(process.cwd(), "app/dev/inventory-actions-preview/page.tsx")), false);

console.log("inventory-base-ui.test.ts passed");
