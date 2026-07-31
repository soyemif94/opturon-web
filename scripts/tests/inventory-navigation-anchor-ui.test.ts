import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const nav = read("components/app/InventorySectionNav.tsx");
const page = read("app/app/inventory/page.tsx");
const workspace = read("components/app/InventoryBaseWorkspace.tsx");
const movementsPage = read("app/app/inventory/movements/page.tsx");
const movementsWorkspace = read("components/app/InventoryMovementsWorkspace.tsx");
const movementsRoute = read("app/api/app/inventory/movements/route.ts");
const movementsQuery = read("app/api/app/inventory/movements/query.ts");

assert.match(nav, /href: "\/app\/inventory\/movements", label: "Movimientos"/);
assert.match(nav, /href: "\/app\/inventory#lotes", label: "Lotes"/);
assert.match(nav, /href: "\/app\/inventory\/receipts", label: "Recepciones"/);
assert.match(nav, /href: "\/app\/inventory\/receipts\/new", label: "Ingresar mercaderia"/);
assert.doesNotMatch(nav, /#movimientos/);

assert.match(page, /id="lotes"/);
assert.doesNotMatch(page, /movementsSectionId/);
assert.doesNotMatch(page, /summarySectionId/);
assert.doesNotMatch(page, /id="movimientos"/);

assert.match(workspace, /href=\{`\/app\/inventory\/movements\?productId=\$\{encodeURIComponent\(product\.id\)\}`\}/);
assert.match(workspace, /CardTitle>Stock actual</);

assert.match(movementsPage, /requireAppModulePage\("inventory"\)/);
assert.match(movementsPage, /InventoryMovementsWorkspace/);
assert.match(movementsPage, /getPortalInventoryMovements/);

assert.match(movementsWorkspace, /title="Movimientos"/);
assert.match(movementsWorkspace, /InventorySectionNav/);
assert.match(movementsWorkspace, /Todavia no hay movimientos registrados\./);
assert.match(movementsWorkspace, /md:hidden/);
assert.match(movementsWorkspace, /md:block/);
assert.doesNotMatch(movementsWorkspace, /#movimientos/);

assert.match(movementsRoute, /requireAppModuleApi\("inventory"\)/);
assert.match(movementsRoute, /getPortalInventoryMovements/);
assert.match(movementsRoute, /parseInventoryMovementsQuery/);
assert.match(movementsRoute, /getBackendErrorStatus\(error\) \|\| 502/);

assert.match(movementsQuery, /invalid_page_size/);
assert.match(movementsQuery, /invalid_movement_type/);
assert.match(movementsQuery, /invalid_date_range/);

console.log("inventory-navigation-anchor-ui.test.ts passed");
