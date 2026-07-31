const MOVEMENT_TYPES = new Set([
  "initial_stock",
  "opening_balance",
  "purchase_receipt",
  "manual_increase",
  "manual_decrease",
  "correction",
  "return_in",
  "return_out",
  "manual_adjustment_in",
  "manual_adjustment_out",
  "expired_writeoff",
  "cancellation",
  "sale"
]);

type InventoryMovementFilterType =
  | "initial_stock"
  | "opening_balance"
  | "purchase_receipt"
  | "manual_increase"
  | "manual_decrease"
  | "correction"
  | "return_in"
  | "return_out"
  | "manual_adjustment_in"
  | "manual_adjustment_out"
  | "expired_writeoff"
  | "cancellation"
  | "sale";

function parsePositiveInteger(raw: string | null, fallback: number, field: string) {
  if (raw === null || String(raw).trim() === "") {
    return { ok: true as const, value: fallback };
  }

  const value = Number.parseInt(String(raw), 10);
  if (!Number.isInteger(value) || value <= 0) {
    return { ok: false as const, error: `invalid_${field}` };
  }

  return { ok: true as const, value };
}

function parseDateOnly(raw: string | null, field: string) {
  const normalized = String(raw || "").trim();
  if (!normalized) return { ok: true as const, value: undefined };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return { ok: false as const, error: `invalid_${field}` };
  }
  return { ok: true as const, value: normalized };
}

export function parseInventoryMovementsQuery(searchParams: URLSearchParams) {
  const page = parsePositiveInteger(searchParams.get("page"), 1, "page");
  if (!page.ok) return page;

  const pageSize = parsePositiveInteger(searchParams.get("pageSize"), 25, "page_size");
  if (!pageSize.ok) return pageSize;
  if (pageSize.value > 100) return { ok: false as const, error: "invalid_page_size" };

  const movementType = String(searchParams.get("movementType") || "").trim();
  if (movementType && !MOVEMENT_TYPES.has(movementType)) {
    return { ok: false as const, error: "invalid_movement_type" };
  }

  const dateFrom = parseDateOnly(searchParams.get("dateFrom"), "date_from");
  if (!dateFrom.ok) return dateFrom;
  const dateTo = parseDateOnly(searchParams.get("dateTo"), "date_to");
  if (!dateTo.ok) return dateTo;

  if (dateFrom.value && dateTo.value && dateFrom.value > dateTo.value) {
    return { ok: false as const, error: "invalid_date_range" };
  }

  return {
    ok: true as const,
    options: {
      page: page.value,
      pageSize: pageSize.value,
      search: String(searchParams.get("search") || "").trim() || undefined,
      movementType: (movementType || undefined) as InventoryMovementFilterType | undefined,
      locationId: String(searchParams.get("locationId") || "").trim() || undefined,
      productId: String(searchParams.get("productId") || "").trim() || undefined,
      lotNumber: String(searchParams.get("lotNumber") || "").trim() || undefined,
      dateFrom: dateFrom.value,
      dateTo: dateTo.value
    }
  };
}
