import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const apiTypes = read("lib/api.ts");
const manager = read("components/app/CatalogManager.tsx");
const editor = read("components/app/ProductEditor.tsx");
const wizard = read("components/app/CatalogImportWizard.tsx");
const detail = read("app/app/catalog/[id]/page.tsx");

for (const field of [
  "manufacturer",
  "barcode",
  "unitOfMeasure",
  "cost",
  "defaultSupplier",
  "weight",
  "weightUnit",
  "presentation",
  "subcategory"
]) {
  assert.match(apiTypes, new RegExp(`${field}\\?:`));
  assert.match(manager, new RegExp(`${field}: draft\\.${field}|${field}: product\\?\\.${field}|draft\\.${field}`));
  assert.match(editor, new RegExp(`${field}: draft\\.${field}|${field}: product\\.${field}|draft\\.${field}`));
  assert.match(wizard, new RegExp(`"${field}"`));
}

assert.match(apiTypes, /attributes\?: Record<string, string \| number \| boolean>/);
assert.match(manager, /Mas informacion comercial y operativa/);
assert.match(manager, /Proveedor habitual/);
assert.match(manager, /formatAttributesText\(product\.attributes\)/);
assert.match(editor, /Datos comerciales y operativos/);
assert.match(editor, /Costo invalido/);
assert.match(wizard, /Crear atributo personalizado/);
assert.match(wizard, /attribute:Sabor|attribute:\$\{key\}/);
assert.match(wizard, /PreviewValueIfPresent label="Atributos"/);
assert.match(detail, /DetailTile label="Fabricante"/);
assert.match(detail, /formatProductWeight/);

console.log("catalog-product-fields-ui.test.ts passed");
