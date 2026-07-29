import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildLotMutationPayload, createLotMutationAttemptKey, getLotActionAvailability, getLotStatusLabel } from "../../lib/inventory-lot-ui.ts";
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
    lotNumber: "QA-001",
    ...overrides
  };
}

const activeLot = makeLot();
const blockedLot = makeLot({
  status: "blocked",
  blockReason: "QA bloqueo D3",
  blockedAt: "2026-07-29T00:00:00.000Z",
    metadata: { blockedByName: "Owner QA" }
});
const writtenOffLot = makeLot({
  status: "written_off",
  availableQuantity: 0,
  availableCommercialQuantity: 0
});

const activeActions = getLotActionAvailability(activeLot, { readOnly: false, canManageSensitive: true });
assert.equal(activeActions.canBlock, true);
assert.equal(activeActions.canUnblock, false);
assert.equal(activeActions.canAdjustOut, true);
assert.equal(activeActions.canWriteOff, true);

const blockedActions = getLotActionAvailability(blockedLot, { readOnly: false, canManageSensitive: true });
assert.equal(blockedActions.canBlock, false);
assert.equal(blockedActions.canUnblock, true);
assert.equal(blockedActions.canAdjustOut, true);

const writtenOffActions = getLotActionAvailability(writtenOffLot, { readOnly: false, canManageSensitive: true });
assert.equal(writtenOffActions.canBlock, false);
assert.equal(writtenOffActions.canUnblock, false);
assert.equal(writtenOffActions.canAdjustOut, false);
assert.equal(writtenOffActions.canWriteOff, false);

const readOnlyActions = getLotActionAvailability(activeLot, { readOnly: true, canManageSensitive: true });
assert.equal(readOnlyActions.canBlock, false);

const sellerActions = getLotActionAvailability(activeLot, { readOnly: false, canManageSensitive: false });
assert.equal(sellerActions.canBlock, false);

assert.equal(getLotStatusLabel(activeLot.status), "Activo");
assert.equal(getLotStatusLabel(blockedLot.status), "Bloqueado");
assert.equal(getLotStatusLabel(writtenOffLot.status), "Dado de baja");

assert.deepEqual(buildLotMutationPayload("block", "lot-1", "QA bloqueo D3", "intent-1"), {
  reason: "QA bloqueo D3",
  idempotencyKey: "lot-block:lot-1:intent-1"
});
assert.deepEqual(buildLotMutationPayload("unblock", "lot-1", "Liberado para uso", "intent-2"), {
  reason: "Liberado para uso",
  idempotencyKey: "lot-unblock:lot-1:intent-2"
});
assert.equal(typeof createLotMutationAttemptKey(), "string");

assert.match(panel, /El motivo es obligatorio\./);
assert.match(panel, /Confirmar bloqueo/);
assert.match(panel, /Confirmar desbloqueo/);
assert.match(panel, /buildLotMutationPayload/);
assert.match(panel, /createLotMutationAttemptKey/);
assert.match(panel, /await Promise\.all\(\[refreshLots\(\), refreshLotHistory\(lotDialog\.lot\.id\)\]\)/);
assert.match(panel, /sanitizeLotMutationError/);
assert.doesNotMatch(panel, /setLots\(\(current\)/);

console.log("inventory-lot-blocking-ui.test.ts passed");
