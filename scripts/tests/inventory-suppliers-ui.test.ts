import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const nav = read("components/app/InventorySectionNav.tsx");
const page = read("app/app/inventory/suppliers/page.tsx");
const workspace = read("components/app/SuppliersWorkspace.tsx");
const listRoute = read("app/api/app/suppliers/route.ts");
const detailRoute = read("app/api/app/suppliers/[supplierId]/route.ts");
const statusRoute = read("app/api/app/suppliers/[supplierId]/status/route.ts");

assert.match(nav, /Resumen/);
assert.match(nav, /Movimientos/);
assert.match(nav, /Lotes/);
assert.match(nav, /Proveedores/);

assert.match(page, /SuppliersWorkspace/);
assert.match(page, /getPortalSuppliers/);

assert.match(workspace, /title="Proveedores"/);
assert.match(workspace, /Nuevo proveedor/);
assert.match(workspace, /Activos/);
assert.match(workspace, /Inactivos/);
assert.match(workspace, /Desactivar/);
assert.match(workspace, /Reactivar/);
assert.doesNotMatch(workspace, /Eliminar proveedor/);
assert.match(workspace, /Los productos existentes conservarán la referencia/);
assert.match(workspace, /Productos vinculados/);

assert.match(listRoute, /resolveAppTenant/);
assert.match(listRoute, /manage_inventory_receipts/);
assert.doesNotMatch(listRoute, /x-portal-key/);
assert.match(detailRoute, /getPortalSupplierDetail/);
assert.match(statusRoute, /patchPortalSupplierStatus/);

console.log("inventory-suppliers-ui.test.ts passed");
