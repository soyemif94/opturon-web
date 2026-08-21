import type {
  PortalCatalogImageFilter,
  PortalCatalogOperationsData,
  PortalCatalogStatusFilter,
  PortalCatalogStockFilter
} from "@/lib/api";

export const CATALOG_OPERATIONS_PAGE_SIZE = 50;

export type CatalogOperationsFilters = {
  search: string;
  stockFilter: PortalCatalogStockFilter;
  imageFilter: PortalCatalogImageFilter;
  statusFilter: PortalCatalogStatusFilter;
  categoryId: string;
};

export const EMPTY_CATALOG_OPERATIONS_FILTERS: CatalogOperationsFilters = {
  search: "",
  stockFilter: "all",
  imageFilter: "all",
  statusFilter: "all",
  categoryId: ""
};

export function buildCatalogOperationsQuery(
  filters: CatalogOperationsFilters,
  page: number,
  pageSize = CATALOG_OPERATIONS_PAGE_SIZE
) {
  const params = new URLSearchParams();
  const search = String(filters.search || "").trim();
  if (search) params.set("search", search);
  if (filters.stockFilter !== "all") params.set("stockFilter", filters.stockFilter);
  if (filters.imageFilter !== "all") params.set("imageFilter", filters.imageFilter);
  if (filters.statusFilter !== "all") params.set("statusFilter", filters.statusFilter);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  params.set("page", String(Math.max(1, Math.trunc(page || 1))));
  params.set("pageSize", String(pageSize));
  return params.toString();
}

export function countCatalogOperationsFilters(filters: CatalogOperationsFilters) {
  return [
    filters.search,
    filters.stockFilter !== "all",
    filters.imageFilter !== "all",
    filters.statusFilter !== "all",
    filters.categoryId
  ].filter(Boolean).length;
}

export function isCatalogOperationsData(value: unknown): value is PortalCatalogOperationsData {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  const pagination = data.pagination as Record<string, unknown> | undefined;
  const summary = data.summary as Record<string, unknown> | undefined;
  if (!pagination || !summary || !Array.isArray(data.products)) return false;
  return [pagination.page, pagination.pageSize, pagination.totalItems, pagination.totalPages]
    .every((item) => Number.isInteger(item) && Number(item) >= 0)
    && [
      summary.totalProducts,
      summary.withStock,
      summary.withoutStock,
      summary.withImage,
      summary.withoutImage,
      summary.activeProducts,
      summary.archivedProducts
    ].every((item) => Number.isInteger(item) && Number(item) >= 0)
    && Number(summary.withStock) + Number(summary.withoutStock) === Number(summary.totalProducts)
    && Number(summary.withImage) + Number(summary.withoutImage) === Number(summary.totalProducts);
}

export function resolveCatalogOperationsPageCorrection(page: number, totalPages: number) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const lastPage = Math.max(Number.isInteger(totalPages) ? totalPages : 0, 1);
  return safePage > lastPage ? lastPage : null;
}

export function catalogImageSearchValue(product: { internalCode?: string | null; sku?: string | null; name: string }) {
  return String(product.internalCode || product.sku || product.name).trim();
}
