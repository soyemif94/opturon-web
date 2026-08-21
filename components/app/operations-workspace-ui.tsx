"use client";

import { ChevronLeft, ChevronRight, ImageIcon, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStockState } from "@/lib/stock-state";
import { cn } from "@/lib/ui/cn";

export function OperationsMetricFilter({
  label,
  value,
  active,
  onClick,
  tone = "neutral"
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  tone?: "neutral" | "success" | "warning";
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60",
        active
          ? "border-brand/45 bg-brand/15 text-white"
          : tone === "success"
            ? "border-emerald-400/20 bg-emerald-500/8 text-emerald-100 hover:bg-emerald-500/14"
            : tone === "warning"
              ? "border-amber-400/20 bg-amber-500/8 text-amber-100 hover:bg-amber-500/14"
              : "border-[color:var(--border)] bg-muted/20 text-muted hover:text-white"
      )}
    >
      <span className="font-semibold">{value}</span> {label}
    </button>
  );
}

export function OperationsFilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-xs text-white transition hover:bg-brand/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
      aria-label={`Quitar filtro ${label}`}
    >
      {label}<X aria-hidden="true" className="size-3" />
    </button>
  );
}

export function OperationsLoadingOverlay({ label = "Actualizando..." }: { label?: string }) {
  return (
    <div className="absolute right-3 top-3 z-20 flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-background px-3 py-1.5 text-xs text-muted" role="status">
      <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />{label}
    </div>
  );
}

export function OperationsProductThumbnail({
  product,
  className
}: {
  product: { name: string; image?: { url: string; alt?: string | null } | null };
  className?: string;
}) {
  return product.image?.url ? (
    <img
      src={product.image.url}
      alt={product.image.alt || product.name}
      className={cn("size-11 rounded-xl bg-surface/55 object-contain p-1.5", className)}
      loading="lazy"
    />
  ) : (
    <div className={cn("flex size-11 items-center justify-center rounded-xl border border-dashed border-[color:var(--border)] bg-muted/20", className)} aria-label="Sin imagen">
      <ImageIcon aria-hidden="true" className="size-4 text-muted" />
    </div>
  );
}

export function OperationsStockBadge({ stock }: { stock: number }) {
  const safeStock = Number.isFinite(Number(stock)) ? Number(stock) : 0;
  const state = getStockState(safeStock);
  return <Badge variant={state.variant}><span className="tabular-nums">{safeStock > 0 ? `${state.label} · ${safeStock}` : state.label}</span></Badge>;
}

export function OperationsStablePaginator({
  ariaLabel,
  page,
  totalPages,
  pageStart,
  pageEnd,
  totalItems,
  itemLabel,
  disabled = false,
  onPage
}: {
  ariaLabel: string;
  page: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  totalItems: number;
  itemLabel?: string;
  disabled?: boolean;
  onPage: (page: number) => void;
}) {
  const displayedPage = totalPages > 0 ? page : 0;
  const suffix = itemLabel ? ` ${itemLabel}` : "";
  return (
    <div className="overflow-x-auto">
      <nav aria-label={ariaLabel} className="grid min-h-14 min-w-[36rem] grid-cols-[7rem_minmax(16rem,1fr)_7rem] items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-muted/20 px-3 py-2">
        <div className="flex justify-start">
          <Button type="button" variant="secondary" className="w-28 shrink-0 justify-center" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>
            <ChevronLeft aria-hidden="true" className="mr-1 size-4 shrink-0" />Anterior
          </Button>
        </div>
        <p aria-live="polite" className="min-w-[16rem] whitespace-nowrap text-center text-sm tabular-nums text-muted">
          Página {displayedPage} de {totalPages} · {pageStart}-{pageEnd} de {totalItems}{suffix}
        </p>
        <div className="flex justify-end">
          <Button type="button" variant="secondary" className="w-28 shrink-0 justify-center" disabled={disabled || totalPages === 0 || page >= totalPages} onClick={() => onPage(page + 1)}>
            Siguiente<ChevronRight aria-hidden="true" className="ml-1 size-4 shrink-0" />
          </Button>
        </div>
      </nav>
    </div>
  );
}
