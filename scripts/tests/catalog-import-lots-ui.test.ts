import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const wizard = read("components/app/CatalogImportWizard.tsx");
const apiTypes = read("lib/api.ts");

assert.match(wizard, /\{ value: "lotNumber", label: "Numero de lote" \}/);
assert.match(wizard, /\{ value: "lotQuantity", label: "Cantidad del lote" \}/);
assert.match(wizard, /\{ value: "expiresAt", label: "Fecha de vencimiento" \}/);
assert.match(wizard, /catalog-import-template\.xlsx/);
assert.match(wizard, /Lotes: \{stats\?\.lotRows \|\| 0\}/);
assert.match(wizard, /ResultCard label="Lotes creados"/);
assert.match(apiTypes, /lotRows\?: number/);
assert.match(apiTypes, /lotsCreated\?: number/);

console.log("catalog-import-lots-ui.test.ts passed");
