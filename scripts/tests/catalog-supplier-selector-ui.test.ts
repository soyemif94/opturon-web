import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const selector = read("components/app/ProductSupplierSelect.tsx");
const editor = read("components/app/ProductEditor.tsx");
const manager = read("components/app/CatalogManager.tsx");
const detail = read("app/app/catalog/[id]/page.tsx");
const apiTypes = read("lib/api.ts");
const createRoute = read("app/api/app/catalog/route.ts");
const patchRoute = read("app/api/app/catalog/[id]/route.ts");

assert.match(selector, /Sin proveedor habitual/);
assert.match(selector, /defaultSupplierLegacyName|legacySupplierLabel/);
assert.match(selector, /Inactivo/);

assert.match(editor, /ProductSupplierSelect/);
assert.match(editor, /defaultSupplierId/);
assert.doesNotMatch(editor, /draft\.defaultSupplier\b/);

assert.match(manager, /ProductSupplierSelect/);
assert.match(manager, /defaultSupplierId/);
assert.doesNotMatch(manager, /draft\.defaultSupplier\b/);

assert.match(detail, /Proveedor habitual/);
assert.match(apiTypes, /defaultSupplierId\?: string \| null/);
assert.match(apiTypes, /defaultSupplierLegacyName\?: string \| null/);
assert.match(apiTypes, /defaultSupplierStatus\?: "active" \| "inactive" \| null/);
assert.match(createRoute, /defaultSupplierId/);
assert.match(patchRoute, /defaultSupplierId/);

console.log("catalog-supplier-selector-ui.test.ts passed");
