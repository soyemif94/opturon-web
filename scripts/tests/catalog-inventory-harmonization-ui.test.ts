import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");
const catalog = read("components/app/CatalogOperationsWorkspace.tsx");
const inventoryPage = read("app/app/inventory/page.tsx");
const inventory = read("components/app/InventoryBaseWorkspace.tsx");
const bulk = read("components/app/InventoryBulkStockWorkspace.tsx");
const movements = read("components/app/InventoryMovementsWorkspace.tsx");
const nav = read("components/app/InventorySectionNav.tsx");
const shared = read("components/app/operations-workspace-ui.tsx");
const bff = read("app/api/app/inventory/products/route.ts");
const api = read("lib/api.ts");

for (const source of [catalog, inventory, bulk, movements]) assert.match(source, /OperationsStablePaginator/);
for (const source of [catalog, inventory]) {
  assert.match(source, /OperationsMetricFilter/);
  assert.match(source, /OperationsProductThumbnail/);
  assert.match(source, /OperationsStockBadge/);
  assert.match(source, /OperationsLoadingOverlay/);
  assert.match(source, /md:hidden/);
  assert.match(source, /md:block/);
}
for (const contract of ["object-contain", 'loading="lazy"', 'aria-label="Sin imagen"', "grid-cols-[7rem_minmax(16rem,1fr)_7rem]", "tabular-nums"]) assert(shared.includes(contract));

assert.match(catalog, /inventoryTrackingMode === "lot_based"[\s\S]*?\/app\/inventory\/movements\?productId=/);
assert.match(catalog, /: `\/app\/inventory\?productId=/);
assert.match(inventoryPage, /parseInventoryOperationsParams\(params\)/);
assert.match(inventoryPage, /initialFilters=\{initialFilters\}/);
assert.match(inventory, /Producto enfocado/);
assert.match(inventory, /Ver todo el Inventario/);
assert.match(inventory, /window\.addEventListener\("popstate"/);
assert.match(inventory, /window\.history\[mode === "push" \? "pushState" : "replaceState"\]/);
assert.match(inventory, /}, 300\)/);
assert.match(inventory, /href=\{`\/app\/catalog\/\$\{encodeURIComponent\(product\.id\)\}`\}>Abrir en Catálogo/);
assert.match(inventory, /No hay productos con estos filtros/);
assert.match(inventory, /Todavia no hay productos en Inventario Base/);
assert.match(inventory, /No se pudo cargar el Inventario/);
assert.match(inventory, /Reintentar/);
assert.match(inventory, /Archivado/);
assert.match(inventory, /\{!readOnly \? <Button type="button" size="sm" onClick=\{onMovement\}>Registrar<\/Button> : null\}/);

assert.match(movements, /Movimientos enfocados/);
assert.match(movements, /Abrir en Catálogo/);
assert.match(movements, /window\.history\.replaceState/);
assert.match(bff, /productId: url\.searchParams\.get\("productId"\) \|\| undefined/);
assert.match(api, /if \(options\?\.productId\) params\.set\("productId", options\.productId\)/);

assert.match(bulk, /Vista aplicada:/);
assert.match(bulk, /Sólo modificados/);
assert.match(bulk, /clearAppliedFilters/);
assert.match(nav, /canBulkAdjust/);
assert.match(nav, /Carga masiva/);

console.log("catalog-inventory-harmonization-ui.test.ts passed");
