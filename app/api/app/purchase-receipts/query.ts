const RECEIPT_SORTS = new Set(["receivedAt_desc", "receivedAt_asc"]);

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

export function parsePurchaseReceiptsListQuery(searchParams: URLSearchParams) {
  const page = parsePositiveInteger(searchParams.get("page"), 1, "page");
  if (!page.ok) return page;

  const pageSize = parsePositiveInteger(searchParams.get("pageSize"), 20, "page_size");
  if (!pageSize.ok) return pageSize;
  if (pageSize.value > 100) return { ok: false as const, error: "invalid_page_size" };

  const sort = String(searchParams.get("sort") || "receivedAt_desc").trim();
  if (!RECEIPT_SORTS.has(sort)) {
    return { ok: false as const, error: "invalid_sort" };
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
      sort: sort as "receivedAt_desc" | "receivedAt_asc",
      supplierId: String(searchParams.get("supplierId") || "").trim() || undefined,
      locationId: String(searchParams.get("locationId") || "").trim() || undefined,
      dateFrom: dateFrom.value,
      dateTo: dateTo.value
    }
  };
}
