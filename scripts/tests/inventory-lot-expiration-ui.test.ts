import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildLotExpirationPayload, createLotMutationAttemptKey, getLotActionAvailability } from "../../lib/inventory-lot-ui.ts";
import type { PortalInventoryLot } from "../../lib/api.ts";

const root = process.cwd();
const panel = readFileSync(join(root, "components/app/ProductInventoryLotsPanel.tsx"), "utf8");

function makeLot(overrides: Partial<PortalInventoryLot> = {}): PortalInventoryLot {
  return {
    id: "lot-1",
    tenantId: "tenant-1",
    productId: "product-1",
    receivedAt: "2026-07-29T00:00:00.000Z",
    createdAt: "2026-07-29T00:00:00.000Z",
    updatedAt: "2026-07-29T00:00:00.000Z",
    initialQuantity: 1,
    availableQuantity: 1,
    availableCommercialQuantity: 1,
    committedQuantity: 0,
    physicalQuantity: 1,
    status: "active",
    expirationStatus: "normal",
    expiresAt: "2026-12-31",
    lotNumber: "QA-001",
    ...overrides
  };
}

assert.equal(getLotActionAvailability(makeLot(), { readOnly: false, canManageSensitive: true }).canEditExpiration, true);
assert.equal(getLotActionAvailability(makeLot({ status: "blocked" }), { readOnly: false, canManageSensitive: true }).canEditExpiration, true);
assert.equal(getLotActionAvailability(makeLot({ status: "written_off" }), { readOnly: false, canManageSensitive: true }).canEditExpiration, false);
assert.equal(getLotActionAvailability(makeLot(), { readOnly: true, canManageSensitive: true }).canEditExpiration, false);
assert.equal(getLotActionAvailability(makeLot(), { readOnly: false, canManageSensitive: false }).canEditExpiration, false);

assert.deepEqual(buildLotExpirationPayload("lot-1", "2027-01-31", "Correccion operativa", "intent-3"), {
  expiresAt: "2027-01-31",
  reason: "Correccion operativa",
  idempotencyKey: "lot-expiration:lot-1:intent-3"
});
assert.equal(typeof createLotMutationAttemptKey(), "string");

assert.match(panel, /Editar vencimiento/);
assert.match(panel, /Vencimiento actual/);
assert.match(panel, /Nueva fecha de vencimiento/);
assert.match(panel, /Guardar vencimiento/);
assert.match(panel, /La nueva fecha de vencimiento es obligatoria\./);
assert.match(panel, /buildLotExpirationPayload/);
assert.match(panel, /method: lotDialog\.kind === "expiration" \? "PATCH" : "POST"/);
assert.match(panel, /await Promise\.all\(\[refreshLots\(\), refreshLotHistory\(lotDialog\.lot\.id\)\]\)/);
assert.doesNotMatch(panel, /fetch\(`\/api\/app\/catalog\/\$\{product\.id\}`/);

console.log("inventory-lot-expiration-ui.test.ts passed");
