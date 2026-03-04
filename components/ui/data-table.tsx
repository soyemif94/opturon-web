"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SkeletonLine } from "@/components/ui/skeleton";
import { cn } from "@/lib/ui/cn";

export type DataTableColumn<T> = {
  key: keyof T | string;
  header: string;
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
};

export type DataTableFilter<T> = {
  key: keyof T | string;
  label: string;
  options: Array<{ label: string; value: string }>;
};

type SortState = { key: string; dir: "asc" | "desc" };

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  initialSort,
  filters,
  searchPlaceholder = "Buscar...",
  searchKeys,
  onRowClick,
  renderRowActions,
  loading,
  stickyHeader
}: {
  columns: Array<DataTableColumn<T>>;
  data: T[];
  rowKey: (row: T) => string;
  initialSort?: SortState;
  filters?: Array<DataTableFilter<T>>;
  searchPlaceholder?: string;
  searchKeys?: Array<keyof T | string>;
  onRowClick?: (row: T) => void;
  renderRowActions?: (row: T) => React.ReactNode;
  loading?: boolean;
  stickyHeader?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState | undefined>(initialSort);
  const [selectedId, setSelectedId] = useState<string>();
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const keysForSearch = searchKeys?.map(String) || columns.map((column) => String(column.key)).slice(0, 2);

  const filteredData = useMemo(() => {
    const term = search.toLowerCase().trim();
    let rows = [...data];

    if (term) {
      rows = rows.filter((row) =>
        keysForSearch.some((key) => {
          const raw = row[key as keyof T];
          return String(raw ?? "")
            .toLowerCase()
            .includes(term);
        })
      );
    }

    Object.entries(activeFilters).forEach(([key, value]) => {
      if (!value) return;
      rows = rows.filter((row) => String(row[key as keyof T] ?? "") === value);
    });

    if (sort) {
      rows.sort((a, b) => {
        const av = a[sort.key as keyof T];
        const bv = b[sort.key as keyof T];
        if (av === bv) return 0;
        const aVal = typeof av === "number" ? av : String(av ?? "").toLowerCase();
        const bVal = typeof bv === "number" ? bv : String(bv ?? "").toLowerCase();
        const cmp = aVal > bVal ? 1 : -1;
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }

    return rows;
  }, [activeFilters, data, keysForSearch, search, sort]);

  function toggleSort(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return undefined;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} className="w-full max-w-sm" />
        {filters?.map((filter) => (
          <select
            key={String(filter.key)}
            value={activeFilters[String(filter.key)] || ""}
            onChange={(event) =>
              setActiveFilters((prev) => ({
                ...prev,
                [String(filter.key)]: event.target.value
              }))
            }
            className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm"
          >
            <option value="">{filter.label}</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-card shadow-sm">
        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className={cn("bg-muted/40 text-xs text-muted-foreground", stickyHeader && "sticky top-0 z-10")}>
              <tr>
                {columns.map((column) => (
                  <th key={String(column.key)} className="px-4 py-3" style={{ width: column.width }}>
                    <button
                      type="button"
                      onClick={() => (column.sortable ? toggleSort(String(column.key)) : null)}
                      className={cn("inline-flex items-center gap-1", column.sortable ? "cursor-pointer" : "cursor-default")}
                    >
                      {column.header}
                      {sort?.key === String(column.key) ? (sort.dir === "asc" ? "^" : "v") : null}
                    </button>
                  </th>
                ))}
                {renderRowActions ? <th className="w-14 px-4 py-3" /> : null}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, idx) => (
                    <tr key={`row-skeleton-${idx}`} className="border-t border-[color:var(--border)]">
                      <td colSpan={columns.length + (renderRowActions ? 1 : 0)} className="px-4 py-3">
                        <SkeletonLine className="h-4 w-full" />
                      </td>
                    </tr>
                  ))
                : null}

              {!loading
                ? filteredData.map((row) => {
                    const id = rowKey(row);
                    const selected = selectedId === id;
                    return (
                      <tr
                        key={id}
                        className={cn(
                          "border-t border-[color:var(--border)] transition-colors",
                          onRowClick ? "cursor-pointer hover:bg-muted/30" : "",
                          selected ? "bg-muted/30" : ""
                        )}
                        onClick={() => {
                          setSelectedId(id);
                          onRowClick?.(row);
                        }}
                      >
                        {columns.map((column) => (
                          <td key={`${id}-${String(column.key)}`} className="px-4 py-3">
                            {column.cell ? column.cell(row) : String(row[column.key as keyof T] ?? "-")}
                          </td>
                        ))}
                        {renderRowActions ? (
                          <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                            {renderRowActions(row)}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })
                : null}
            </tbody>
          </table>
        </div>

        {!loading && filteredData.length === 0 ? (
          <div className="p-4">
            <EmptyState title="Sin resultados" description="Proba ajustar filtros o busqueda." icon="[]" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
