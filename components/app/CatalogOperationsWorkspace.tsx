"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Archive,
  History,
  ImageIcon,
  Images,
  MoreHorizontal,
  PencilLine,
  Search,
  Trash2,
  Warehouse
} from "lucide-react";
import { CatalogImportWizard } from "@/components/app/CatalogImportWizard";
import {
  OperationsFilterChip,
  OperationsLoadingOverlay,
  OperationsMetricFilter,
  OperationsProductThumbnail,
  OperationsStablePaginator,
  OperationsStockBadge
} from "@/components/app/operations-workspace-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  buildCatalogOperationsQuery,
  catalogImageSearchValue,
  countCatalogOperationsFilters,
  EMPTY_CATALOG_OPERATIONS_FILTERS,
  isCatalogOperationsData,
  resolveCatalogOperationsPageCorrection,
  type CatalogOperationsFilters
} from "@/lib/catalog-operations";
import { getDiscountedPrice } from "@/lib/product-pricing";
import type { PortalCatalogOperationsData, PortalProduct, PortalProductCategory } from "@/lib/api";
import { cn } from "@/lib/ui/cn";

type RecentImport = {
  importId: string;
  status: string;
  file?: { name?: string | null } | null;
  result?: { summary?: { created?: number; updated?: number; errors?: number } | null } | null;
};

export function CatalogOperationsWorkspace({
  initialData,
  categories,
  readOnly,
  initialLoadFailed = false
}: {
  initialData: PortalCatalogOperationsData;
  categories: PortalProductCategory[];
  readOnly: boolean;
  initialLoadFailed?: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<CatalogOperationsFilters>(EMPTY_CATALOG_OPERATIONS_FILTERS);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(initialLoadFailed ? "No se pudo cargar el Catálogo." : null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PortalProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [recentImports, setRecentImports] = useState<RecentImport[]>([]);
  const requestSequence = useRef(0);

  const loadProducts = useCallback(async (
    page: number,
    nextFilters: CatalogOperationsFilters,
    allowCorrection = true
  ) => {
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    setLoading(true);
    setLoadError(null);
    try {
      const query = buildCatalogOperationsQuery(nextFilters, page);
      const response = await fetch(`/api/app/catalog/workspace?${query}`, { cache: "no-store" });
      const json = await response.json().catch(() => null);
      if (!response.ok || !isCatalogOperationsData(json)) throw new Error("catalog_workspace_invalid_response");
      if (sequence !== requestSequence.current) return;
      const correction = resolveCatalogOperationsPageCorrection(page, json.pagination.totalPages);
      if (allowCorrection && correction !== null) {
        await loadProducts(correction, nextFilters, false);
        return;
      }
      setData(json);
    } catch {
      if (sequence === requestSequence.current) setLoadError("No se pudo cargar el Catálogo. Reintentá en unos segundos.");
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const search = searchInput.trim();
      if (search === filters.search) return;
      const nextFilters = { ...filters, search };
      setFilters(nextFilters);
      void loadProducts(1, nextFilters);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [filters, loadProducts, searchInput]);

  const applyFilters = (patch: Partial<CatalogOperationsFilters>) => {
    const nextFilters = { ...filters, ...patch };
    setFilters(nextFilters);
    if (patch.search !== undefined) setSearchInput(patch.search);
    void loadProducts(1, nextFilters);
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilters(EMPTY_CATALOG_OPERATIONS_FILTERS);
    void loadProducts(1, EMPTY_CATALOG_OPERATIONS_FILTERS);
  };

  const toggleStatus = async (product: PortalProduct) => {
    if (readOnly || statusUpdatingId) return;
    setStatusUpdatingId(product.id);
    setRowError(null);
    try {
      const nextStatus = product.status === "active" ? "archived" : "active";
      const response = await fetch(`/api/app/catalog/${encodeURIComponent(product.id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.product) throw new Error("status_update_failed");
      await loadProducts(data.pagination.page, filters);
    } catch {
      setRowError("No se pudo cambiar el estado del producto. No se guardaron cambios visibles.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const deleteProduct = async () => {
    if (!deleteTarget || readOnly || deleting) return;
    setDeleting(true);
    setRowError(null);
    try {
      const response = await fetch(`/api/app/catalog/${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        const reason = response.status === 409
          ? "El producto tiene referencias y no puede eliminarse desde esta vista."
          : String(json?.error || "delete_failed");
        throw new Error(reason);
      }
      setDeleteTarget(null);
      await loadProducts(data.pagination.page, filters);
    } catch (error) {
      setRowError(error instanceof Error && error.message !== "delete_failed"
        ? error.message
        : "No se pudo eliminar el producto.");
    } finally {
      setDeleting(false);
    }
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch("/api/app/catalog/imports?limit=6", { cache: "no-store" });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error("history_failed");
      setRecentImports(Array.isArray(json?.imports) ? json.imports : []);
    } catch {
      setHistoryError("No se pudo cargar el historial de importaciones.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const activeFilterCount = countCatalogOperationsFilters(filters);
  const pageStart = data.pagination.totalItems > 0
    ? (data.pagination.page - 1) * data.pagination.pageSize + 1
    : 0;
  const pageEnd = data.pagination.totalItems > 0
    ? Math.min(data.pagination.totalItems, pageStart + data.products.length - 1)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <CatalogImportWizard onImported={() => loadProducts(1, filters)} disabled={readOnly} />
        <Button asChild type="button" variant="secondary" size="sm">
          <Link href="/app/catalog/images"><Images className="mr-2 size-4" />Imágenes</Link>
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => void openHistory()}>
          <History className="mr-2 size-4" />Historial de cargas
        </Button>
      </div>

      <section className="flex flex-wrap gap-2" aria-label="Indicadores y filtros rápidos de Catálogo">
        <OperationsMetricFilter label="productos" value={data.summary.totalProducts} active={filters.stockFilter === "all" && filters.imageFilter === "all"} onClick={() => applyFilters({ stockFilter: "all", imageFilter: "all" })} />
        <OperationsMetricFilter label="con stock" value={data.summary.withStock} active={filters.stockFilter === "with_stock"} onClick={() => applyFilters({ stockFilter: "with_stock" })} tone="success" />
        <OperationsMetricFilter label="sin stock" value={data.summary.withoutStock} active={filters.stockFilter === "without_stock"} onClick={() => applyFilters({ stockFilter: "without_stock" })} tone="warning" />
        <OperationsMetricFilter label="con imagen" value={data.summary.withImage} active={filters.imageFilter === "with_image"} onClick={() => applyFilters({ imageFilter: "with_image" })} />
        <OperationsMetricFilter label="sin imagen" value={data.summary.withoutImage} active={filters.imageFilter === "without_image"} onClick={() => applyFilters({ imageFilter: "without_image" })} tone="warning" />
      </section>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Productos</CardTitle>
            <CardDescription>Vista operativa compacta con precio, stock, estado y accesos frecuentes.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_180px_210px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                className="pl-9"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Buscar por nombre, SKU o código interno"
                aria-label="Buscar productos"
              />
            </label>
            <select className="h-10 rounded-xl border border-[color:var(--border)] bg-background px-3 text-sm" value={filters.statusFilter} onChange={(event) => applyFilters({ statusFilter: event.target.value as CatalogOperationsFilters["statusFilter"] })}>
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="archived">Archivados</option>
            </select>
            <select className="h-10 rounded-xl border border-[color:var(--border)] bg-background px-3 text-sm" value={filters.stockFilter} onChange={(event) => applyFilters({ stockFilter: event.target.value as CatalogOperationsFilters["stockFilter"] })}>
              <option value="all">Todo el stock</option>
              <option value="with_stock">Con stock</option>
              <option value="without_stock">Sin stock</option>
            </select>
            <select className="h-10 rounded-xl border border-[color:var(--border)] bg-background px-3 text-sm" value={filters.categoryId} onChange={(event) => applyFilters({ categoryId: event.target.value })}>
              <option value="">Todas las categorías</option>
              {categories.filter((category) => category.isActive).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>

          {activeFilterCount > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[color:var(--border)] bg-muted/25 px-3 py-2 text-sm">
              <span className="text-muted">Filtros activos:</span>
              {filters.search ? <OperationsFilterChip label={`Búsqueda: ${filters.search}`} onClear={() => applyFilters({ search: "" })} /> : null}
              {filters.stockFilter !== "all" ? <OperationsFilterChip label={filters.stockFilter === "with_stock" ? "Con stock" : "Sin stock"} onClear={() => applyFilters({ stockFilter: "all" })} /> : null}
              {filters.imageFilter !== "all" ? <OperationsFilterChip label={filters.imageFilter === "with_image" ? "Con imagen" : "Sin imagen"} onClear={() => applyFilters({ imageFilter: "all" })} /> : null}
              {filters.statusFilter !== "all" ? <OperationsFilterChip label={filters.statusFilter === "active" ? "Activos" : "Archivados"} onClear={() => applyFilters({ statusFilter: "all" })} /> : null}
              {filters.categoryId ? <OperationsFilterChip label={categories.find((category) => category.id === filters.categoryId)?.name || "Categoría"} onClear={() => applyFilters({ categoryId: "" })} /> : null}
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>Limpiar filtros</Button>
            </div>
          ) : null}

          {readOnly ? <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">Tu rol puede consultar el Catálogo, pero no modificar productos.</p> : null}
          {rowError ? <p className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-100">{rowError}</p> : null}
          {loadError ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              <span>{loadError}</span>
              <Button type="button" variant="secondary" size="sm" onClick={() => void loadProducts(data.pagination.page || 1, filters)}>Reintentar</Button>
            </div>
          ) : null}

          <div className="relative">
            {loading ? <OperationsLoadingOverlay /> : null}
            <div className={cn("hidden overflow-x-auto rounded-2xl border border-[color:var(--border)] md:block", loading && "opacity-55")}>
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-[0.12em] text-muted">
                  <tr>
                    <th className="w-16 px-3 py-2.5">Imagen</th>
                    <th className="w-36 px-3 py-2.5">Código / SKU</th>
                    <th className="px-3 py-2.5">Producto</th>
                    <th className="w-40 px-3 py-2.5">Categoría</th>
                    <th className="w-36 px-3 py-2.5 text-right">Precio</th>
                    <th className="w-28 px-3 py-2.5 text-right">Stock</th>
                    <th className="w-28 px-3 py-2.5">Estado</th>
                    <th className="w-64 px-3 py-2.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>{data.products.map((product) => <CatalogProductRow key={product.id} product={product} readOnly={readOnly} statusUpdating={statusUpdatingId === product.id} onToggleStatus={() => void toggleStatus(product)} onDelete={() => setDeleteTarget(product)} />)}</tbody>
              </table>
            </div>
            <div className={cn("space-y-2 md:hidden", loading && "opacity-55")}>
              {data.products.map((product) => <CatalogProductMobileRow key={product.id} product={product} readOnly={readOnly} statusUpdating={statusUpdatingId === product.id} onToggleStatus={() => void toggleStatus(product)} onDelete={() => setDeleteTarget(product)} />)}
            </div>
          </div>

          {!loading && data.products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--border)] px-5 py-10 text-center">
              <p className="font-medium">{activeFilterCount > 0 ? "No encontramos productos para estos criterios" : "Todavía no hay productos"}</p>
              <p className="mt-1 text-sm text-muted">{activeFilterCount > 0 ? "Limpiá filtros o probá otra búsqueda." : "Agregá el primer producto para comenzar a operar el Catálogo."}</p>
              {activeFilterCount > 0 ? (
                <Button type="button" size="sm" className="mt-4" onClick={clearFilters}>Limpiar filtros</Button>
              ) : !readOnly ? (
                <Button asChild type="button" size="sm" className="mt-4"><Link href="/app/catalog/new">Agregar producto</Link></Button>
              ) : null}
            </div>
          ) : null}

          <OperationsStablePaginator ariaLabel="Paginación del Catálogo" page={data.pagination.page} totalPages={data.pagination.totalPages} pageStart={pageStart} pageEnd={pageEnd} totalItems={data.pagination.totalItems} disabled={loading} onPage={(page) => void loadProducts(page, filters)} />
        </CardContent>
      </Card>

      {historyOpen ? (
        <Card>
          <CardHeader>
            <div><CardTitle>Historial de cargas</CardTitle><CardDescription>Últimas importaciones del Catálogo.</CardDescription></div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setHistoryOpen(false)}>Cerrar</Button>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {historyLoading ? <p className="text-sm text-muted">Cargando historial...</p> : null}
            {historyError ? <p className="text-sm text-red-300">{historyError}</p> : null}
            {!historyLoading && !historyError && recentImports.length === 0 ? <p className="text-sm text-muted">No hay cargas recientes.</p> : null}
            {recentImports.map((item) => <div key={item.importId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm"><div><p className="font-medium">{item.file?.name || "Carga sin nombre"}</p><p className="text-xs text-muted">Creados {item.result?.summary?.created || 0} · Actualizados {item.result?.summary?.updated || 0} · Errores {item.result?.summary?.errors || 0}</p></div><Badge variant="muted">{item.status}</Badge></div>)}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar producto</DialogTitle><DialogDescription>Esta acción es sensible. Si el producto tiene referencias, el backend bloqueará la eliminación.</DialogDescription></DialogHeader>
          <p className="text-sm">{deleteTarget?.name}</p>
          <DialogFooter><Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button><Button type="button" variant="destructive" onClick={() => void deleteProduct()} disabled={deleting}>{deleting ? "Eliminando..." : "Eliminar producto"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CatalogProductRow({ product, readOnly, statusUpdating, onToggleStatus, onDelete }: RowProps) {
  return (
    <tr className="border-t border-[color:var(--border)] hover:bg-muted/15">
      <td className="px-3 py-2"><OperationsProductThumbnail product={product} /></td>
      <td className="px-3 py-2"><p className="font-mono text-xs">{product.internalCode || "—"}</p><p className="mt-1 text-xs text-muted">{product.sku || "Sin SKU"}</p></td>
      <td className="px-3 py-2"><Link href={`/app/catalog/${product.id}`} className="font-medium hover:text-brandBright">{product.name}</Link>{product.inventoryTrackingMode === "lot_based" ? <p className="mt-1 text-xs text-muted">Stock administrado por lotes</p> : null}</td>
      <td className="px-3 py-2 text-muted">{product.categoryName || "Sin categoría"}</td>
      <td className="px-3 py-2 text-right tabular-nums"><ProductPrice product={product} /></td>
      <td className="px-3 py-2 text-right"><StockValue product={product} /></td>
      <td className="px-3 py-2"><Badge variant={product.status === "active" ? "success" : "muted"}>{product.status === "active" ? "Activo" : "Archivado"}</Badge></td>
      <td className="px-3 py-2"><ProductActions product={product} readOnly={readOnly} statusUpdating={statusUpdating} onToggleStatus={onToggleStatus} onDelete={onDelete} /></td>
    </tr>
  );
}

function CatalogProductMobileRow(props: RowProps) {
  const { product } = props;
  return <article className="rounded-2xl border border-[color:var(--border)] bg-card/80 p-3"><div className="flex gap-3"><OperationsProductThumbnail product={product} /><div className="min-w-0 flex-1"><Link href={`/app/catalog/${product.id}`} className="line-clamp-2 font-medium">{product.name}</Link><p className="mt-1 truncate font-mono text-xs text-muted">{product.internalCode || product.sku || "Sin código"}</p><div className="mt-2 flex flex-wrap items-center gap-2"><ProductPrice product={product} /><StockValue product={product} /><Badge variant={product.status === "active" ? "success" : "muted"}>{product.status === "active" ? "Activo" : "Archivado"}</Badge></div></div></div><div className="mt-3"><ProductActions {...props} /></div></article>;
}

type RowProps = { product: PortalProduct; readOnly: boolean; statusUpdating: boolean; onToggleStatus: () => void; onDelete: () => void };

function ProductActions({ product, readOnly, statusUpdating, onToggleStatus, onDelete }: RowProps) {
  const imageSearch = encodeURIComponent(catalogImageSearchValue(product));
  const inventoryHref = product.inventoryTrackingMode === "lot_based"
    ? `/app/inventory/movements?productId=${encodeURIComponent(product.id)}`
    : `/app/inventory?productId=${encodeURIComponent(product.id)}`;
  return <div className="flex items-center justify-end gap-1.5">{!readOnly ? <Button asChild type="button" variant="secondary" size="sm"><Link href={`/app/catalog/${product.id}/edit`}><PencilLine className="mr-1 size-3.5" />Editar</Link></Button> : null}<Button asChild type="button" variant="ghost" size="sm"><Link href={`/app/catalog/images?search=${imageSearch}`}><ImageIcon className="mr-1 size-3.5" />Imagen</Link></Button><Button asChild type="button" variant="ghost" size="sm"><Link href={inventoryHref}><Warehouse className="mr-1 size-3.5" />Inventario</Link></Button><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="sm" aria-label={`Más acciones para ${product.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link href={`/app/catalog/${product.id}`}>Ver detalle</Link></DropdownMenuItem>{!readOnly ? <><DropdownMenuItem disabled={statusUpdating} onSelect={onToggleStatus}><Archive className="mr-2 size-4" />{statusUpdating ? "Actualizando..." : product.status === "active" ? "Archivar" : "Activar"}</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-red-300 focus:bg-red-500/10" onSelect={onDelete}><Trash2 className="mr-2 size-4" />Eliminar</DropdownMenuItem></> : null}</DropdownMenuContent></DropdownMenu></div>;
}

function ProductPrice({ product }: { product: PortalProduct }) {
  const pricing = getDiscountedPrice(product.price, product.discountPercentage);
  return <span className="whitespace-nowrap font-medium">{formatCurrency(pricing.finalPrice, product.currency)}</span>;
}

function StockValue({ product }: { product: PortalProduct }) {
  return <div><OperationsStockBadge stock={product.stock} />{product.inventoryTrackingMode === "lot_based" ? <p className="mt-1 text-[10px] text-muted">Por lotes</p> : null}</div>;
}

function formatCurrency(value: number, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: currency || "ARS", maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
}
