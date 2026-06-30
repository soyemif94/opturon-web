import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const wizard = read("components/app/CatalogImportWizard.tsx");

assert.match(wizard, /PreviewValueIfPresent label="Lote" value=\{row\.values\?\.lotNumber\}/);
assert.match(wizard, /PreviewValueIfPresent label="Cantidad del lote" value=\{row\.values\?\.lotQuantity\}/);
assert.match(wizard, /PreviewValueIfPresent label="Vencimiento" value=\{row\.values\?\.expiresAt\}/);
assert.match(wizard, /PreviewValueIfPresent label="Estado vencimiento" value=\{row\.values\?\.lotExpirationStatus\}/);
assert.match(wizard, /lotId/);

console.log("catalog-import-lot-preview.test.ts passed");
