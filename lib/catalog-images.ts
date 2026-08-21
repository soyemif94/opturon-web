import type {
  PortalCatalogImageFilter,
  PortalCatalogImageWorkspaceData,
  PortalProduct
} from "@/lib/api";

export const CATALOG_IMAGE_PAGE_SIZE = 50;
export const CATALOG_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const CATALOG_IMAGE_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type CatalogImageFileError = "invalid_type" | "too_large" | null;

export function validateCatalogImageFile(file: { type?: string; size?: number }): CatalogImageFileError {
  const type = String(file?.type || "").toLowerCase();
  if (!(CATALOG_IMAGE_ACCEPTED_TYPES as readonly string[]).includes(type)) return "invalid_type";
  if (!Number.isFinite(file?.size) || Number(file.size) <= 0) return "invalid_type";
  if (Number(file.size) > CATALOG_IMAGE_MAX_BYTES) return "too_large";
  return null;
}

export function formatCatalogImageError(code: unknown) {
  const normalized = String(code || "").trim();
  if (normalized === "invalid_type" || normalized === "invalid_product_image_type") {
    return "Formato no permitido. Usá JPG, PNG o WebP.";
  }
  if (normalized === "too_large" || normalized === "product_image_too_large") {
    return "Archivo demasiado grande. El máximo es 4 MB.";
  }
  if (normalized === "corrupt_image") {
    return "No pudimos leer la imagen. Elegí otro archivo.";
  }
  return "No se pudo subir la imagen. La imagen anterior se conserva.";
}

export function buildCatalogImagesQuery(input: {
  search: string;
  imageFilter: PortalCatalogImageFilter;
  page: number;
  pageSize?: number;
}) {
  const params = new URLSearchParams();
  const search = String(input.search || "").trim();
  if (search) params.set("search", search);
  params.set("imageFilter", input.imageFilter);
  params.set("page", String(Math.max(1, Math.trunc(input.page || 1))));
  params.set("pageSize", String(input.pageSize || CATALOG_IMAGE_PAGE_SIZE));
  return params.toString();
}

export function resolveCatalogImagesPageCorrection(page: number, totalPages: number) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const lastPage = Math.max(Number.isInteger(totalPages) ? totalPages : 0, 1);
  return safePage > lastPage ? lastPage : null;
}

export function applyPersistedProductImage(
  data: PortalCatalogImageWorkspaceData,
  productId: string,
  image: NonNullable<PortalProduct["image"]>
): PortalCatalogImageWorkspaceData {
  let gainedImage = false;
  const products = data.products.map((product) => {
    if (product.id !== productId) return product;
    gainedImage = !product.image?.url;
    return { ...product, image };
  });
  return {
    ...data,
    products,
    summary: gainedImage
      ? {
          ...data.summary,
          withImage: data.summary.withImage + 1,
          withoutImage: Math.max(0, data.summary.withoutImage - 1)
        }
      : data.summary
  };
}

export function isCatalogImageWorkspaceData(value: unknown): value is PortalCatalogImageWorkspaceData {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  const pagination = data.pagination as Record<string, unknown> | undefined;
  const summary = data.summary as Record<string, unknown> | undefined;
  if (!pagination || !summary || !Array.isArray(data.products)) return false;
  return [pagination.page, pagination.pageSize, pagination.totalItems, pagination.totalPages]
    .every((item) => Number.isInteger(item) && Number(item) >= 0)
    && [summary.totalProducts, summary.withImage, summary.withoutImage]
      .every((item) => Number.isInteger(item) && Number(item) >= 0)
    && Number(summary.withImage) + Number(summary.withoutImage) === Number(summary.totalProducts);
}
