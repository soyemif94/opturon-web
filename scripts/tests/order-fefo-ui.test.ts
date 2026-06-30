import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const editor = read("components/app/OrderCreateEditor.tsx");
const api = read("lib/api.ts");

assert.match(editor, /inventoryTrackingMode\?: "legacy" \| "lot_based"/);
assert.match(editor, /Stock disponible:/);
assert.match(editor, /FEFO automatico/);
assert.match(editor, /Se descontara automaticamente de los lotes que vencen primero/);
assert.match(editor, /inventory_insufficient_lot_stock/);
assert.match(editor, /Solicitado: \$\{details\.requested\}, disponible: \$\{details\.available\}, faltante: \$\{details\.missing\}/);
assert.match(api, /PortalOrderLotAllocation/);

console.log("order-fefo-ui.test.ts passed");
