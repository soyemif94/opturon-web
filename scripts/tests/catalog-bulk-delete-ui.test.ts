import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const manager = read("components/app/CatalogManager.tsx");
const api = read("lib/api.ts");
const importsRoute = read("app/api/app/catalog/imports/route.ts");
const bulkPreviewRoute = read("app/api/app/catalog/bulk-delete/preview/route.ts");
const bulkExecuteRoute = read("app/api/app/catalog/bulk-delete/execute/route.ts");
const rollbackPreviewRoute = read("app/api/app/catalog/imports/[importId]/rollback/preview/route.ts");
const rollbackRoute = read("app/api/app/catalog/imports/[importId]/rollback/route.ts");

assert.match(manager, /selectAllFiltered/);
assert.match(manager, /Seleccionar los \{visibleProducts\.length\} resultados/);
assert.match(manager, /Cargas recientes/);
assert.match(manager, /Deshacer carga/);
assert.match(manager, /Preview obligatorio antes de confirmar/);
assert.match(manager, /ELIMINAR \${bulkDeletePreview\.summary\.totalSelected} PRODUCTOS/);
assert.match(manager, /openBulkDeletePreview/);
assert.match(manager, /confirmBulkDelete/);

assert.match(api, /export type PortalCatalogBulkDeletePreview/);
assert.match(api, /export async function previewPortalCatalogBulkDelete/);
assert.match(api, /export async function executePortalCatalogBulkDelete/);
assert.match(api, /export async function listPortalCatalogImports/);
assert.match(api, /export async function previewPortalCatalogImportRollback/);
assert.match(api, /export async function executePortalCatalogImportRollback/);

assert.match(importsRoute, /listPortalCatalogImports/);
assert.match(bulkPreviewRoute, /previewPortalCatalogBulkDelete/);
assert.match(bulkExecuteRoute, /executePortalCatalogBulkDelete/);
assert.match(rollbackPreviewRoute, /previewPortalCatalogImportRollback/);
assert.match(rollbackRoute, /executePortalCatalogImportRollback/);

console.log("catalog-bulk-delete-ui.test.ts passed");
