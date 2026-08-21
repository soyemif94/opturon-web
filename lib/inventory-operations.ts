export const INVENTORY_OPERATIONS_PAGE_SIZE = 50;

export type InventoryOperationsFilters = {
  search: string;
  stockFilter: "all" | "with_stock" | "without_stock";
  productId: string;
};

export const EMPTY_INVENTORY_OPERATIONS_FILTERS: InventoryOperationsFilters = {
  search: "",
  stockFilter: "all",
  productId: ""
};

function scalar(value: string | string[] | null | undefined) {
  return String(Array.isArray(value) ? value[0] || "" : value || "").trim();
}

function validProductId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function normalizeInventoryOperationsFilters(filters: Partial<InventoryOperationsFilters>): InventoryOperationsFilters {
  const rawStockFilter = scalar(filters.stockFilter);
  const productId = scalar(filters.productId);
  return {
    search: scalar(filters.search).slice(0, 200),
    stockFilter: rawStockFilter === "with_stock" || rawStockFilter === "without_stock" ? rawStockFilter : "all",
    productId: validProductId(productId) ? productId : ""
  };
}

export function parseInventoryOperationsParams(params: URLSearchParams | Record<string, string | string[] | undefined>) {
  const read = (key: string) => params instanceof URLSearchParams ? params.get(key) : params[key];
  const rawPage = Number.parseInt(scalar(read("page")), 10);
  return {
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    filters: normalizeInventoryOperationsFilters({
      search: scalar(read("search")),
      stockFilter: scalar(read("stockFilter")) as InventoryOperationsFilters["stockFilter"],
      productId: scalar(read("productId"))
    })
  };
}

export function buildInventoryOperationsQuery(page: number, filters: InventoryOperationsFilters) {
  const normalized = normalizeInventoryOperationsFilters(filters);
  const params = new URLSearchParams();
  if (normalized.productId) params.set("productId", normalized.productId);
  if (normalized.search) params.set("search", normalized.search);
  if (normalized.stockFilter !== "all") params.set("stockFilter", normalized.stockFilter);
  if (page > 1) params.set("page", String(Math.trunc(page)));
  return params.toString();
}
