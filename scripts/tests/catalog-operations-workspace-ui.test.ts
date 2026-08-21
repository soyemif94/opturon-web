import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");
const page = read("app/app/catalog/page.tsx");
const workspace = read("components/app/CatalogOperationsWorkspace.tsx");
const bff = read("app/api/app/catalog/workspace/route.ts");
const api = read("lib/api.ts");
const imagePage = read("app/app/catalog/images/page.tsx");
const imageWorkspace = read("components/app/CatalogImagesWorkspace.tsx");
const sharedOperationsUi = read("components/app/operations-workspace-ui.tsx");

assert.match(page, /requireAppModulePage\("catalog"\)/);
assert.match(page, /getPortalCatalogWorkspace/);
assert.match(page, /page: 1, pageSize: CATALOG_OPERATIONS_PAGE_SIZE/);
assert.match(page, /CatalogOperationsWorkspace/);
assert.doesNotMatch(page, /getPortalProducts/);
assert.doesNotMatch(page, /CatalogManager/);

assert.match(bff, /requireAppModuleApi\("catalog"\)/);
assert.match(bff, /resolveAppTenant/);
assert.match(bff, /stockFilter/);
assert.match(bff, /imageFilter/);
assert.match(bff, /statusFilter/);
assert.match(bff, /categoryId/);
assert.match(api, /products\/workspace/);
assert.match(api, /portalInventoryReadFetch<\{ success: boolean; data: PortalCatalogOperationsData \}>/);

for (const label of ["Imagen", "Código / SKU", "Producto", "Categoría", "Precio", "Stock", "Estado", "Acciones"]) assert.match(workspace, new RegExp(label));
assert.match(sharedOperationsUi, /object-contain/);
assert.match(sharedOperationsUi, /aria-label="Sin imagen"/);
assert.match(sharedOperationsUi, /loading="lazy"/);
assert.match(workspace, /href=\{`\/app\/catalog\/\$\{product\.id\}\/edit`\}/);
assert.match(workspace, /\{!readOnly \? <Button asChild[^\n]+Editar/);
assert.match(workspace, /\/app\/catalog\/images\?search=/);
assert.match(workspace, /\/app\/inventory\?productId=/);
assert.match(workspace, /inventoryTrackingMode === "lot_based"[\s\S]*?\/app\/inventory\/movements\?productId=/);
assert.match(workspace, /Más acciones para/);
assert.match(workspace, /Eliminar producto/);
assert.match(workspace, /Stock administrado por lotes/);
assert.match(workspace, /Por lotes/);

assert.match(workspace, /window\.setTimeout/);
assert.match(workspace, /}, 300\)/);
assert.match(workspace, /loadProducts\(1, nextFilters\)/);
assert.match(workspace, /stockFilter: "without_stock"/);
assert.match(workspace, /imageFilter: "without_image"/);
assert.match(workspace, /Limpiar filtros/);
assert.match(workspace, /No encontramos productos para estos criterios/);
assert.match(workspace, /Todavía no hay productos/);
assert.match(workspace, /: !readOnly \? \(/);
assert.match(workspace, /No se pudo cargar el Catálogo/);
assert.match(workspace, /Actualizando\.\.\./);
assert.match(workspace, /Paginación del Catálogo/);
assert.match(sharedOperationsUi, /grid-cols-\[7rem_minmax\(16rem,1fr\)_7rem\]/);
assert.match(workspace, /hidden overflow-x-auto[\s\S]*md:block/);
assert.match(workspace, /space-y-2 md:hidden/);

assert.match(imagePage, /searchParams/);
assert.match(imagePage, /search: initialSearch \|\| undefined/);
assert.match(imageWorkspace, /initialSearch/);

console.log("catalog-operations-workspace-ui.test.ts passed");
