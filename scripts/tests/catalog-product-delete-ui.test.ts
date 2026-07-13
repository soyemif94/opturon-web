import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const managerSource = read("components/app/CatalogManager.tsx");
const routeSource = read("app/api/app/catalog/[id]/route.ts");
const apiSource = read("lib/api.ts");

assert.match(managerSource, /function formatProductDeleteError/);
assert.match(managerSource, /product_delete_blocked/);
assert.match(managerSource, /No se puede eliminar porque tiene ventas, pedidos o movimientos de stock asociados/);
assert.match(managerSource, /portal_product_delete_failed/);
assert.match(managerSource, /fetch\(`\/api\/app\/catalog\/\$\{productId\}\$\{force \? "\?force=true" : ""\}`/);
assert.match(managerSource, /blocked: json\?\.error === "product_delete_blocked"/);
assert.match(managerSource, /message: formatProductDeleteError\(json\?\.error, json\?\.message\)/);
assert.match(managerSource, /toast\.error\("Error al eliminar producto", message\)/);
assert.doesNotMatch(managerSource, /message: json\?\.error \|\| "No se pudo eliminar el producto\."/);
assert.match(managerSource, /Este producto tiene historial asociado/);
assert.match(managerSource, /se eliminará del catálogo operativo, pero se conservará el historial/);
assert.match(managerSource, /Entiendo que este producto está asociado a historial/);
assert.match(managerSource, /disabled=\{forceDeleting \|\| !forceDeleteAcknowledged\}/);
assert.match(managerSource, /Eliminar de todos modos/);
assert.match(managerSource, /Mantener archivado/);
assert.match(managerSource, /Producto eliminado del catálogo\. El historial asociado se conserva\./);
assert.match(managerSource, /JSON\.stringify\(\{ confirmForceDelete: true, acknowledgedReferences: true \}\)/);

assert.match(routeSource, /deletePortalProduct\(tenantContext\.tenantId, id, \{/);
assert.match(routeSource, /body\?\.confirmForceDelete === true/);
assert.match(routeSource, /body\?\.acknowledgedReferences === true/);
assert.match(routeSource, /getBackendErrorBody/);
assert.match(routeSource, /message: backendBody\?\.message \|\| null/);
assert.match(routeSource, /details: backendBody\?\.details \|\| null/);

assert.match(apiSource, /export async function deletePortalProduct/);
assert.match(apiSource, /\$\{options\?\.force \? "\?force=true" : ""\}/);
assert.match(apiSource, /confirmForceDelete: options\.confirmForceDelete === true/);
assert.match(apiSource, /return backendPortalFetch/);

console.log("catalog-product-delete-ui.test.ts passed");
