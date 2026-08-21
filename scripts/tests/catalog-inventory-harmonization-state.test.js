import assert from "node:assert/strict";
import {
  buildInventoryOperationsQuery,
  normalizeInventoryOperationsFilters,
  parseInventoryOperationsParams
} from "../../lib/inventory-operations.ts";

const productId = "00000000-0000-4000-8000-000000000505";

const normalized = normalizeInventoryOperationsFilters({
  search: "  Producto  ",
  stockFilter: "with_stock",
  productId
});
assert.deepEqual(normalized, { search: "Producto", stockFilter: "with_stock", productId });

const query = buildInventoryOperationsQuery(11, normalized);
assert.equal(query, `productId=${productId}&search=Producto&stockFilter=with_stock&page=11`);

const parsed = parseInventoryOperationsParams(new URLSearchParams(query));
assert.equal(parsed.page, 11);
assert.deepEqual(parsed.filters, normalized);

const cleared = parseInventoryOperationsParams(new URLSearchParams());
assert.deepEqual(cleared, { page: 1, filters: { search: "", stockFilter: "all", productId: "" } });

const invalid = parseInventoryOperationsParams(new URLSearchParams("page=-2&stockFilter=unknown&productId=other-tenant-guess"));
assert.equal(invalid.page, 1);
assert.deepEqual(invalid.filters, { search: "", stockFilter: "all", productId: "" });

const restoredFromBack = parseInventoryOperationsParams(new URLSearchParams(query));
assert.deepEqual(restoredFromBack, parsed, "Back/Forward URL parsing must restore the same focused state");

console.log("catalog-inventory-harmonization-state.test.js passed");
