import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildLotWriteoffPayload, getLotHistoryLabel } from "../../lib/inventory-lot-ui.ts";
import type { PortalInventoryLotHistoryEntry } from "../../lib/api.ts";

const root = process.cwd();
const panel = readFileSync(join(root, "components/app/ProductInventoryLotsPanel.tsx"), "utf8");
const helpers = readFileSync(join(root, "lib/inventory-lot-ui.ts"), "utf8");

assert.deepEqual(buildLotWriteoffPayload("lot-1", 3, "Cierre QA D3", "intent-4"), {
  movementType: "manual_decrease",
  quantity: 3,
  reason: "Cierre QA D3",
  referenceType: "inventory_manual_writeoff",
  idempotencyKey: "lot-adjust:lot-1:manual_decrease:intent-4"
});

const manualWriteoffEntry: PortalInventoryLotHistoryEntry = {
  id: "h-1",
  kind: "movement",
  type: "manual_writeoff",
  reason: "Cierre QA D3",
  createdAt: "2026-07-29T00:00:00.000Z"
};
const expiredWriteoffEntry: PortalInventoryLotHistoryEntry = {
  id: "h-2",
  kind: "movement",
  type: "expired_writeoff",
  reason: "Producto vencido",
  createdAt: "2026-07-29T00:00:00.000Z"
};

assert.equal(getLotHistoryLabel(manualWriteoffEntry), "Baja manual");
assert.equal(getLotHistoryLabel(expiredWriteoffEntry), "Baja por vencimiento");

assert.match(panel, /buildLotWriteoffPayload/);
assert.match(panel, /Confirmar baja manual/);
assert.match(panel, /Baja manual registrada\./);
assert.match(panel, /getLotHistoryLabel/);
assert.match(panel, /El motivo es obligatorio\./);
assert.match(panel, /await Promise\.all\(\[refreshLots\(\), refreshLotHistory\(writeoffDialog\.lot\.id\)\]\)/);
assert.match(helpers, /inventory_manual_writeoff/);
assert.match(helpers, /movementType: "manual_decrease"/);
assert.doesNotMatch(panel, /adjustLot\(lot, "expired_writeoff"\)/);

console.log("inventory-lot-writeoff-ui.test.ts passed");
