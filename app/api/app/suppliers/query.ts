const SUPPLIER_STATUSES = new Set(["active", "inactive", "all"]);
const SUPPLIER_SORTS = new Set(["name_asc", "name_desc", "updated_asc", "updated_desc"]);

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

export function parseSuppliersListQuery(searchParams: URLSearchParams) {
  const page = parsePositiveInteger(searchParams.get("page"), 1, "page");
  if (!page.ok) return page;

  const pageSize = parsePositiveInteger(searchParams.get("pageSize"), 20, "page_size");
  if (!pageSize.ok) return pageSize;

  const rawStatus = String(searchParams.get("status") || "").trim().toLowerCase();
  if (rawStatus && !SUPPLIER_STATUSES.has(rawStatus)) {
    return { ok: false as const, error: "invalid_status" };
  }

  const rawSort = String(searchParams.get("sort") || "").trim().toLowerCase();
  if (rawSort && !SUPPLIER_SORTS.has(rawSort)) {
    return { ok: false as const, error: "invalid_sort" };
  }

  return {
    ok: true as const,
    options: {
      search: searchParams.get("search") || undefined,
      status: (rawStatus as "active" | "inactive" | "all" | "") || undefined,
      page: page.value,
      pageSize: pageSize.value,
      sort: (rawSort as "name_asc" | "name_desc" | "updated_asc" | "updated_desc" | "") || undefined
    }
  };
}
