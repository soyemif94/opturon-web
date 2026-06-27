import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const manager = read("components/app/CatalogManager.tsx");
const wizard = read("components/app/CatalogImportWizard.tsx");
const analyzeRoute = read("app/api/app/catalog/imports/analyze/route.ts");
const confirmRoute = read("app/api/app/catalog/imports/[importId]/confirm/route.ts");
const errorsRoute = read("app/api/app/catalog/imports/[importId]/errors/route.ts");
const templateRoute = read("app/api/app/catalog/imports/template/route.ts");

assert.match(manager, /CatalogImportWizard/);
assert.match(wizard, /Importar productos/);
assert.match(wizard, /Todavía no se modificó el catálogo|Todavia no se modifico el catalogo/);
assert.match(wizard, /STEP_LABELS = \["Archivo", "Hoja y formato", "Mapeo", "Vista previa", "Confirmación", "Resultado"\]/);
assert.match(wizard, /Descargar plantilla/);
assert.match(wizard, /Descargar errores/);
assert.match(wizard, /Confirmar importación|Confirmar importacion/);

assert.match(analyzeRoute, /resolveAppTenant\(\{ permission: "manage_catalog", requireWrite: true \}\)/);
assert.match(analyzeRoute, /analyzePortalCatalogImport/);
assert.match(confirmRoute, /confirmPortalCatalogImport/);
assert.match(errorsRoute, /downloadPortalCatalogImportErrors/);
assert.match(templateRoute, /downloadPortalCatalogImportTemplate/);

console.log("catalog-import-ui.test.ts passed");
