const assert = require("node:assert/strict");

async function main() {
  const {
    buildCatalogOperationsQuery,
    catalogImageSearchValue,
    countCatalogOperationsFilters,
    EMPTY_CATALOG_OPERATIONS_FILTERS,
    isCatalogOperationsData,
    resolveCatalogOperationsPageCorrection
  } = await import("../../lib/catalog-operations.ts");

  const combined = {
    search: "SKU-001",
    stockFilter: "without_stock",
    imageFilter: "without_image",
    statusFilter: "active",
    categoryId: "00000000-0000-4000-8000-000000000001"
  };
  const query = buildCatalogOperationsQuery(combined, 11);
  for (const fragment of ["search=SKU-001", "stockFilter=without_stock", "imageFilter=without_image", "statusFilter=active", "page=11", "pageSize=50"]) assert.match(query, new RegExp(fragment));
  assert.equal(countCatalogOperationsFilters(combined), 5);
  assert.equal(countCatalogOperationsFilters(EMPTY_CATALOG_OPERATIONS_FILTERS), 0);
  assert.equal(resolveCatalogOperationsPageCorrection(12, 11), 11);
  assert.equal(resolveCatalogOperationsPageCorrection(11, 11), null);
  assert.equal(catalogImageSearchValue({ name: "Producto", sku: "SKU", internalCode: "INT" }), "INT");
  assert.equal(catalogImageSearchValue({ name: "Producto", sku: "SKU" }), "SKU");

  const fixture = {
    tenantId: "tenant-safe",
    pagination: { page: 1, pageSize: 50, totalItems: 505, totalPages: 11 },
    summary: { totalProducts: 505, withStock: 7, withoutStock: 498, withImage: 17, withoutImage: 488, activeProducts: 500, archivedProducts: 5 },
    products: Array.from({ length: 50 }, (_, index) => ({ id: `p-${index}`, name: `Producto ${index}` }))
  };
  assert.equal(isCatalogOperationsData(fixture), true);
  assert.equal(isCatalogOperationsData({ ...fixture, summary: { ...fixture.summary, withoutStock: 497 } }), false);
  console.log("catalog-operations-workspace-state.test.js passed");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
