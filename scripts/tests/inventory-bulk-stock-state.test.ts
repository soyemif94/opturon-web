import assert from "node:assert/strict";
import {
  MAX_BULK_STOCK_ITEMS,
  MAX_BULK_STOCK_QUANTITY,
  buildBulkStockPayloadFingerprint,
  buildBulkStockRequestItems,
  createBulkStockIdempotencyKey,
  filterBulkStockDrafts,
  isSemanticallyValidBulkStockResult,
  paginateBulkStockDrafts,
  parseBulkStockTarget,
  rebaseBulkStockConflict,
  resolveInventoryPageCorrection,
  resolveBulkStockAttempt,
  summarizeBulkStockDrafts,
  updateBulkStockDraft,
  validateBulkStockDraft,
  type BulkStockDrafts,
  type BulkStockProductSource
// @ts-expect-error Node's strip-types test runner requires the explicit .ts extension.
} from "../../lib/inventory-bulk-stock.ts";

function product(index: number, currentQuantity = 0, overrides: Partial<BulkStockProductSource> = {}): BulkStockProductSource {
  const suffix = String(index).padStart(3, "0");
  return {
    productId: `product-${suffix}`,
    name: `Producto ${suffix}`,
    internalCode: `B${suffix}`,
    sku: `SKU-${suffix}`,
    categoryName: index % 2 === 0 ? "Pares" : "Impares",
    unitOfMeasure: "unidad",
    status: "active",
    inventoryTrackingMode: "legacy",
    currentQuantity,
    ...overrides
  };
}

let drafts: BulkStockDrafts = {};
drafts = updateBulkStockDraft(drafts, product(1, 0), "24");
drafts = updateBulkStockDraft(drafts, product(51, 5), "10");
drafts = updateBulkStockDraft(drafts, product(505, 12), "0");

assert.equal(drafts["product-001"].rawTargetQuantity, "24");
assert.equal(drafts["product-051"].expectedCurrentQuantity, 5);
assert.deepEqual(buildBulkStockRequestItems(drafts), [
  { productId: "product-001", targetQuantity: 24, expectedCurrentQuantity: 0 },
  { productId: "product-051", targetQuantity: 10, expectedCurrentQuantity: 5 },
  { productId: "product-505", targetQuantity: 0, expectedCurrentQuantity: 12 }
]);

assert.deepEqual(summarizeBulkStockDrafts(drafts), {
  draftItems: 3,
  changedItems: 3,
  invalidItems: 0,
  conflictItems: 0,
  increases: 2,
  reductions: 1,
  unitsAdded: 29,
  unitsRemoved: 12
});

// A target equal to the original snapshot is not a change and removes the draft.
drafts = updateBulkStockDraft(drafts, product(51, 999), "5");
assert.equal(drafts["product-051"], undefined);
assert.equal(buildBulkStockRequestItems(drafts).length, 2);

// Empty input discards the local edit without affecting other pages.
drafts = updateBulkStockDraft(drafts, product(1, 0), "");
assert.equal(drafts["product-001"], undefined);
assert.equal(drafts["product-505"].rawTargetQuantity, "0");

let invalidDrafts: BulkStockDrafts = {};
invalidDrafts = updateBulkStockDraft(invalidDrafts, product(2, 0), "-1");
invalidDrafts = updateBulkStockDraft(invalidDrafts, product(3, 0), "1.5");
invalidDrafts = updateBulkStockDraft(invalidDrafts, product(4, 0), String(MAX_BULK_STOCK_QUANTITY + 1));
invalidDrafts = updateBulkStockDraft(invalidDrafts, product(5, 0, { inventoryTrackingMode: "lot_based" }), "10");
assert.equal(summarizeBulkStockDrafts(invalidDrafts).invalidItems, 4);
assert.deepEqual(buildBulkStockRequestItems(invalidDrafts), []);
assert.equal(validateBulkStockDraft(invalidDrafts["product-005"]).error, "lot_based");

// A 409 refreshes only the stale snapshot, preserves the operator's target and
// requires an explicit edit before the operation can be reviewed again.
const conflictSource = updateBulkStockDraft(drafts, product(7, 1), "3");
const unaffectedDraft = conflictSource["product-007"];
const conflicted = rebaseBulkStockConflict(conflictSource, { productId: "product-505", currentQuantity: 9 });
assert.equal(conflicted["product-505"].expectedCurrentQuantity, 9);
assert.equal(conflicted["product-505"].rawTargetQuantity, "0");
assert.deepEqual(conflicted["product-505"].conflict, { previousExpectedQuantity: 12, currentQuantity: 9 });
assert.equal(summarizeBulkStockDrafts(conflicted).conflictItems, 1);
assert.equal(conflicted["product-007"], unaffectedDraft, "unrelated drafts must remain untouched");
const reviewedConflict = updateBulkStockDraft(conflicted, product(505, 9), "0");
assert.equal(reviewedConflict["product-505"].conflict, null);
assert.equal(reviewedConflict["product-505"].expectedCurrentQuantity, 9);

assert.equal(parseBulkStockTarget("0"), 0);
assert.equal(parseBulkStockTarget(String(MAX_BULK_STOCK_QUANTITY)), MAX_BULK_STOCK_QUANTITY);
assert.equal(parseBulkStockTarget("-1"), null);
assert.equal(parseBulkStockTarget("1.1"), null);
assert.equal(parseBulkStockTarget(String(MAX_BULK_STOCK_QUANTITY + 1)), null);

// 505 edited products remain globally available while locally paginating by 50.
let largeDrafts: BulkStockDrafts = {};
for (let index = 1; index <= 505; index += 1) {
  largeDrafts = updateBulkStockDraft(largeDrafts, product(index, index % 2), String((index % 2) + 1));
}
const firstPage = paginateBulkStockDrafts(largeDrafts, { search: "", stockFilter: "all" }, 1, 50);
const secondPage = paginateBulkStockDrafts(largeDrafts, { search: "", stockFilter: "all" }, 2, 50);
const lastPage = paginateBulkStockDrafts(largeDrafts, { search: "", stockFilter: "all" }, 11, 50);
assert.equal(firstPage.totalItems, 505);
assert.equal(firstPage.totalPages, 11);
assert.equal(firstPage.items.length, 50);
assert.equal(secondPage.items.length, 50);
assert.equal(lastPage.items.length, 5);
assert.equal(firstPage.items[0].productId, "product-001");
assert.equal(secondPage.items[0].productId, "product-051");
assert.equal(lastPage.items[0].productId, "product-501");
assert.equal(summarizeBulkStockDrafts(largeDrafts).changedItems, 505);
assert.equal(buildBulkStockRequestItems(largeDrafts).length, 505);
assert.equal(MAX_BULK_STOCK_ITEMS, 2000);
assert.equal(1999 <= MAX_BULK_STOCK_ITEMS, true);
assert.equal(2000 <= MAX_BULK_STOCK_ITEMS, true);
assert.equal(2001 <= MAX_BULK_STOCK_ITEMS, false);

// Search and stock filters operate across all drafts, not only the server page currently visible.
assert.deepEqual(
  filterBulkStockDrafts(largeDrafts, { search: "SKU-505", stockFilter: "all" }).map((item) => item.productId),
  ["product-505"]
);
assert.equal(filterBulkStockDrafts(largeDrafts, { search: "", stockFilter: "with_stock" }).length, 253);
assert.equal(filterBulkStockDrafts(largeDrafts, { search: "", stockFilter: "without_stock" }).length, 252);

assert.equal(resolveInventoryPageCorrection(11, 2), 2, "reduced dataset corrects to last page");
assert.equal(resolveInventoryPageCorrection(11, 0), 1, "empty dataset corrects to logical page one");
assert.equal(resolveInventoryPageCorrection(2, 2), null, "valid page does not trigger another request");
assert.equal(resolveInventoryPageCorrection(1, 0), null, "empty page one does not loop");

const items = buildBulkStockRequestItems(drafts);
const fingerprint = buildBulkStockPayloadFingerprint({ reason: "physical_count", note: "  Deposito  ", items });
const firstAttempt = resolveBulkStockAttempt(null, fingerprint, () => "11111111-1111-4111-8111-111111111111");
const retryAttempt = resolveBulkStockAttempt(firstAttempt, fingerprint, () => {
  throw new Error("must not create a new key for an identical retry");
});
assert.equal(retryAttempt.idempotencyKey, firstAttempt.idempotencyKey);

const changedFingerprint = buildBulkStockPayloadFingerprint({ reason: "inventory_correction", note: "Deposito", items });
const changedAttempt = resolveBulkStockAttempt(firstAttempt, changedFingerprint, () => "22222222-2222-4222-8222-222222222222");
assert.notEqual(changedAttempt.idempotencyKey, firstAttempt.idempotencyKey);
assert.match(createBulkStockIdempotencyKey(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

const expectedResultItems = [{ productId: "product-505", targetQuantity: 0, expectedCurrentQuantity: 12 }];
const validResult = {
  operationId: "operation-1",
  idempotent: false,
  summary: { submittedItems: 1, changedItems: 1, unchangedItems: 0, increases: 0, reductions: 1, unitsAdded: 0, unitsRemoved: 12 },
  items: [{ productId: "product-505", previousQuantity: 12, targetQuantity: 0, delta: -12, status: "updated", movementId: "movement-1" }]
};
assert.equal(isSemanticallyValidBulkStockResult(validResult, expectedResultItems), true);
assert.equal(isSemanticallyValidBulkStockResult({
  ...validResult,
  idempotent: true,
  items: [{ ...validResult.items[0], status: "idempotent" }]
}, expectedResultItems), true, "a correlated 200 idempotency replay is valid");
assert.equal(isSemanticallyValidBulkStockResult({ ...validResult, operationId: "" }, expectedResultItems), false);
assert.equal(isSemanticallyValidBulkStockResult({ ...validResult, summary: { ...validResult.summary, submittedItems: 2 } }, expectedResultItems), false);
assert.equal(isSemanticallyValidBulkStockResult({ ...validResult, items: [] }, expectedResultItems), false);
assert.equal(isSemanticallyValidBulkStockResult({ ...validResult, items: [{ ...validResult.items[0], productId: "other" }] }, expectedResultItems), false);
assert.equal(isSemanticallyValidBulkStockResult({ ...validResult, items: [{ ...validResult.items[0], status: "mystery" }] }, expectedResultItems), false);
assert.equal(isSemanticallyValidBulkStockResult({ ...validResult, items: [{ ...validResult.items[0], targetQuantity: 1, delta: -11 }] }, expectedResultItems), false);

console.log("inventory-bulk-stock-state.test.ts passed");
