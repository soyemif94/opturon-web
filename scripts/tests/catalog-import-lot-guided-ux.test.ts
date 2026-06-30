import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const wizard = read("components/app/CatalogImportWizard.tsx");

assert.match(wizard, /stats\?\.lotRows/);
assert.match(wizard, /lote\(s\) preparados/);
assert.match(wizard, /Lotes a crear/);
assert.match(wizard, /Productos nuevos con lote/);
assert.match(wizard, /Conversiones legacy/);
assert.match(wizard, /Stock legacy preservado/);

console.log("catalog-import-lot-guided-ux.test.ts passed");
