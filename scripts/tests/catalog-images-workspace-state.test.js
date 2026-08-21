const assert = require("node:assert/strict");

async function main() {
  const {
    applyPersistedProductImage,
    buildCatalogImagesQuery,
    CATALOG_IMAGE_MAX_BYTES,
    formatCatalogImageError,
    isCatalogImageWorkspaceData,
    resolveCatalogImagesPageCorrection,
    validateCatalogImageFile
  } = await import("../../lib/catalog-images.ts");

  const products = Array.from({ length: 50 }, (_, index) => ({
    id: `product-${index + 1}`,
    clinicId: "tenant-safe",
    name: `Producto ${index + 1}`,
    description: null,
    stock: 0,
    price: 10,
    currency: "ARS",
    status: "active",
    sku: null,
    categoryId: null,
    categoryName: null,
    image: index === 0 ? { url: "https://example.test/current.webp" } : null
  }));
  const fixture = {
    tenantId: "tenant-safe",
    pagination: { page: 1, pageSize: 50, totalItems: 505, totalPages: 11 },
    summary: { totalProducts: 505, withImage: 17, withoutImage: 488 },
    products
  };

  assert.equal(isCatalogImageWorkspaceData(fixture), true);
  assert.match(buildCatalogImagesQuery({ search: "  SKU-50 ", imageFilter: "without_image", page: 11 }), /search=SKU-50/);
  assert.match(buildCatalogImagesQuery({ search: "", imageFilter: "without_image", page: 11 }), /pageSize=50/);
  assert.equal(resolveCatalogImagesPageCorrection(12, 11), 11);
  assert.equal(resolveCatalogImagesPageCorrection(11, 11), null);

  assert.equal(validateCatalogImageFile({ type: "image/png", size: 1024 }), null);
  assert.equal(validateCatalogImageFile({ type: "image/gif", size: 1024 }), "invalid_type");
  assert.equal(validateCatalogImageFile({ type: "image/webp", size: CATALOG_IMAGE_MAX_BYTES + 1 }), "too_large");
  assert.match(formatCatalogImageError("invalid_type"), /Formato no permitido/);
  assert.match(formatCatalogImageError("too_large"), /demasiado grande/);
  assert.match(formatCatalogImageError("corrupt_image"), /leer la imagen/);
  assert.match(formatCatalogImageError("network"), /imagen anterior se conserva/);

  const added = applyPersistedProductImage(fixture, "product-2", { url: "https://example.test/new.webp", source: "uploaded" });
  assert.equal(added.summary.withImage, 18);
  assert.equal(added.summary.withoutImage, 487);
  assert.equal(added.products[1].image.url, "https://example.test/new.webp");
  const replaced = applyPersistedProductImage(added, "product-1", { url: "https://example.test/replaced.webp", source: "uploaded" });
  assert.deepEqual(replaced.summary, added.summary);

  console.log("catalog-images-workspace-state.test.js passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
