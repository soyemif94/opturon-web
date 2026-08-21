"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Search } from "lucide-react";
import { ClientPageShell } from "@/components/app/client-page-shell";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type {
  PortalInventoryMovement,
  PortalInventoryPagination,
  PortalInventoryProduct,
  PortalInventorySummary
} from "@/lib/api";
import { resolveInventoryPageCorrection } from "@/lib/inventory-bulk-stock";
import {
  buildInventoryOperationsQuery,
  normalizeInventoryOperationsFilters,
  parseInventoryOperationsParams,
  type InventoryOperationsFilters
} from "@/lib/inventory-operations";
import { cn } from "@/lib/ui/cn";

type MovementMode = "opening_balance" | "manual_increase" | "manual_decrease" | "correction";
type InventoryActionPanel = "history" | "movement" | null;
const EMPTY_HISTORY: PortalInventoryMovement[] = [];
const INVENTORY_PAGE_SIZE = 50;

export function InventoryBaseWorkspace({
  initialProducts,
  initialPagination,
  initialSummary,
  initialFilters = { search: "", stockFilter: "all", productId: "" },
  tenantId = null,
  readOnly = false,
  canBulkAdjust = false
}: {
  initialProducts: PortalInventoryProduct[];
  initialPagination: PortalInventoryPagination;
  initialSummary: PortalInventorySummary;
  initialFilters?: InventoryOperationsFilters;
  tenantId?: string | null;
  readOnly?: boolean;
  canBulkAdjust?: boolean;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [pagination, setPagination] = useState(initialPagination);
  const [inventorySummary, setInventorySummary] = useState(initialSummary);
  const [search, setSearch] = useState(initialFilters.search);
  const [stockFilter, setStockFilter] = useState<"all" | "with_stock" | "without_stock">(initialFilters.stockFilter);
  const [appliedFilters, setAppliedFilters] = useState<InventoryOperationsFilters>(initialFilters);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<PortalInventoryProduct | null>(null);
  const [activePanel, setActivePanel] = useState<InventoryActionPanel>(null);
  const [history, setHistory] = useState<PortalInventoryMovement[]>(EMPTY_HISTORY);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mode, setMode] = useState<MovementMode>("opening_balance");
  const [quantity, setQuantity] = useState("1");
  const [countedStock, setCountedStock] = useState("");
  const [reason, setReason] = useState("");
  const [movementAttemptKey, setMovementAttemptKey] = useState("");
  const detailsSectionRef = useRef<HTMLDivElement | null>(null);
  const detailsHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const historyRequestIdRef = useRef(0);
  const productsRequestIdRef = useRef(0);

  function buildInventoryUrl(path: string, params?: Record<string, string>) {
    const search = new URLSearchParams(params);
    if (tenantId) search.set("tenantId", tenantId);
    const suffix = search.toString() ? `?${search.toString()}` : "";
    return `${path}${suffix}`;
  }

  function syncInventoryUrl(page: number, filters: InventoryOperationsFilters, mode: "push" | "replace") {
    if (typeof window === "undefined") return;
    const query = buildInventoryOperationsQuery(page, filters);
    const nextUrl = `/app/inventory${query ? `?${query}` : ""}`;
    window.history[mode === "push" ? "pushState" : "replaceState"](null, "", nextUrl);
  }

  function resetMovementDraft(product: PortalInventoryProduct) {
    const stock = resolveStock(product);
    setCountedStock(String(stock));
    setQuantity("1");
    setReason("");
    setMode(stock > 0 ? "manual_increase" : "opening_balance");
    setMovementAttemptKey(createMovementAttemptKey());
  }

  async function loadHistory(product: PortalInventoryProduct, options?: { surfaceError?: boolean }) {
    const requestId = historyRequestIdRef.current + 1;
    historyRequestIdRef.current = requestId;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch(
        buildInventoryUrl(`/api/app/inventory/products/${product.id}/movements`, {
          page: "1",
          pageSize: "25"
        }),
        { cache: "no-store" }
      );
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || "No se pudo cargar historial.");
      if (historyRequestIdRef.current !== requestId) return;
      setHistory(Array.isArray(json?.movements) ? json.movements : EMPTY_HISTORY);
    } catch (error) {
      if (historyRequestIdRef.current !== requestId) return;
      const message = error instanceof Error ? error.message : "No se pudo cargar historial.";
      setHistory(EMPTY_HISTORY);
      setHistoryError(message);
      if (options?.surfaceError) setFeedback(message);
    } finally {
      if (historyRequestIdRef.current === requestId) {
        setHistoryLoading(false);
      }
    }
  }

  async function loadProducts(
    nextPage: number,
    filters: InventoryOperationsFilters,
    allowPageCorrection = true,
    urlMode: "push" | "replace" | "none" = "none"
  ): Promise<void> {
    const requestId = productsRequestIdRef.current + 1;
    productsRequestIdRef.current = requestId;
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(nextPage),
        pageSize: String(INVENTORY_PAGE_SIZE)
      };
      const normalizedFilters = normalizeInventoryOperationsFilters(filters);
      if (normalizedFilters.search) params.search = normalizedFilters.search;
      if (normalizedFilters.stockFilter !== "all") params.stockFilter = normalizedFilters.stockFilter;
      if (normalizedFilters.productId) params.productId = normalizedFilters.productId;
      const response = await fetch(buildInventoryUrl("/api/app/inventory/products", params), { cache: "no-store" });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || "No se pudo cargar inventario.");
      if (!Array.isArray(json?.products) || !isInventoryPagination(json?.pagination) || !isInventorySummary(json?.summary)) {
        throw new Error("No se pudo interpretar la respuesta de inventario.");
      }
      if (productsRequestIdRef.current !== requestId) return;
      const correctionPage = resolveInventoryPageCorrection(nextPage, json.pagination.totalPages);
      if (correctionPage !== null) {
        if (!allowPageCorrection) throw new Error("Inventario devolvio una pagina fuera de rango.");
        await loadProducts(correctionPage, normalizedFilters, false, urlMode);
        return;
      }
      setProducts(json.products);
      setPagination(json.pagination);
      setInventorySummary(json.summary);
      setAppliedFilters(normalizedFilters);
      setLoadError(null);
      if (urlMode !== "none") syncInventoryUrl(json.pagination.page, normalizedFilters, urlMode);
    } catch (error) {
      if (productsRequestIdRef.current !== requestId) return;
      setLoadError(error instanceof Error ? error.message : "No se pudo cargar Inventario.");
    } finally {
      if (productsRequestIdRef.current === requestId) setLoading(false);
    }
  }

  function applyStockFilter(nextStockFilter: InventoryOperationsFilters["stockFilter"]) {
    setStockFilter(nextStockFilter);
    void loadProducts(1, { ...appliedFilters, search: search.trim(), stockFilter: nextStockFilter }, true, "push");
  }

  function clearProductFocus() {
    void loadProducts(1, { ...appliedFilters, productId: "" }, true, "push");
  }

  function clearFilters() {
    setSearch("");
    setStockFilter("all");
    void loadProducts(1, { search: "", stockFilter: "all", productId: "" }, true, "push");
  }

  async function refreshCurrentPage() {
    await loadProducts(pagination.page, appliedFilters);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const normalizedSearch = search.trim();
      if (normalizedSearch === appliedFilters.search) return;
      void loadProducts(1, { ...appliedFilters, search: normalizedSearch }, true, "replace");
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search, appliedFilters]);

  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseInventoryOperationsParams(new URLSearchParams(window.location.search));
      setSearch(parsed.filters.search);
      setStockFilter(parsed.filters.stockFilter);
      void loadProducts(parsed.page, parsed.filters);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function openPanel(product: PortalInventoryProduct, nextPanel: Exclude<InventoryActionPanel, null>) {
    setFeedback(null);
    setHistory(EMPTY_HISTORY);
    setHistoryError(null);
    setActivePanel(nextPanel);
    setSelectedProduct(product);
    resetMovementDraft(product);
    void loadHistory(product, { surfaceError: nextPanel === "movement" });
  }

  useEffect(() => {
    if (!selectedProduct) return;
    const refreshed = products.find((product) => product.id === selectedProduct.id) || null;
    if (refreshed) setSelectedProduct(refreshed);
  }, [products, selectedProduct]);

  useEffect(() => {
    if (!selectedProduct || !activePanel) return;
    const section = detailsSectionRef.current;
    if (!section) return;
    const prefersReducedMotion =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;
    const frame = window.requestAnimationFrame(() => {
      section.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
      detailsHeadingRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activePanel, selectedProduct?.id]);

  const currentStock = selectedProduct ? resolveStock(selectedProduct) : 0;
  const quantityNumber = Number(quantity || 0);
  const countedStockNumber = Number(countedStock || 0);
  const deltaPreview =
    mode === "correction"
      ? (Number.isFinite(countedStockNumber) ? countedStockNumber - currentStock : NaN)
      : mode === "manual_decrease"
        ? -quantityNumber
        : quantityNumber;
  const resultingStock =
    mode === "correction"
      ? countedStockNumber
      : currentStock + (Number.isFinite(deltaPreview) ? deltaPreview : 0);

  const pageStart = pagination.totalItems > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const pageEnd = pagination.totalItems > 0
    ? Math.min(pagination.totalItems, pagination.page * pagination.pageSize)
    : 0;
  const activeFilterCount = [appliedFilters.search, appliedFilters.stockFilter !== "all", appliedFilters.productId].filter(Boolean).length;
  const focusedProduct = appliedFilters.productId ? products.find((product) => product.id === appliedFilters.productId) || null : null;

  async function submitMovement() {
    if (!selectedProduct) return;
    if (mode === "correction") {
      if (!Number.isFinite(countedStockNumber) || countedStockNumber < 0) {
        setFeedback("El stock contado debe ser cero o mayor.");
        return;
      }
    } else if (!Number.isInteger(quantityNumber) || quantityNumber <= 0) {
      setFeedback("La cantidad debe ser un entero mayor a cero.");
      return;
    }

    if (mode === "manual_decrease" && quantityNumber > currentStock) {
      setFeedback(`No podes sacar mas que el stock disponible (${currentStock}).`);
      return;
    }

    if ((mode === "manual_decrease" || mode === "correction") && !reason.trim()) {
      setFeedback("El motivo es obligatorio para salidas y correcciones.");
      return;
    }

    setSaving(true);
    setFeedback(null);
    const idempotencyKey = movementAttemptKey || createMovementAttemptKey();
    if (!movementAttemptKey) setMovementAttemptKey(idempotencyKey);
    try {
      const response = await fetch(buildInventoryUrl(`/api/app/inventory/products/${selectedProduct.id}/movements`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movementType: mode,
          quantity: mode === "correction" ? undefined : quantityNumber,
          countedStock: mode === "correction" ? countedStockNumber : undefined,
          reason: reason.trim() || null,
          idempotencyKey,
          metadata: { source: "inventory_base_workspace" }
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(resolveMovementSubmitErrorMessage(json?.error));
      setFeedback("Movimiento registrado.");
      await refreshCurrentPage();
      openPanel({ ...selectedProduct, stock: Number(json?.balance?.quantity ?? resultingStock) }, "movement");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : resolveMovementSubmitErrorMessage());
    } finally {
      setSaving(false);
    }
  }

  function closeDetailsPanel() {
    historyRequestIdRef.current += 1;
    setActivePanel(null);
    setSelectedProduct(null);
    setHistory(EMPTY_HISTORY);
    setHistoryError(null);
    setHistoryLoading(false);
  }

  return (
    <ClientPageShell
      title="Inventario"
      description="Base operativa de stock con codigo interno, ubicacion principal y ledger auditable."
      badge="Inventario"
      action={canBulkAdjust ? (
        <Button asChild type="button">
          <Link href="/app/inventory/bulk-adjust">Carga inicial / Ajuste masivo</Link>
        </Button>
      ) : null}
    >
      <section className="flex flex-wrap gap-2" aria-label="Indicadores y filtros rápidos de Inventario">
        <OperationsMetricFilter label="productos" value={inventorySummary.totalProducts} active={stockFilter === "all"} onClick={() => applyStockFilter("all")} />
        <OperationsMetricFilter label="con stock" value={inventorySummary.withStock} active={stockFilter === "with_stock"} onClick={() => applyStockFilter("with_stock")} tone="success" />
        <OperationsMetricFilter label="sin stock" value={inventorySummary.withoutStock} active={stockFilter === "without_stock"} onClick={() => applyStockFilter("without_stock")} tone="warning" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Stock actual</CardTitle>
          <CardDescription>Ubicacion principal unica por tenant. Lotes y vencimientos quedan fuera del flujo base de esta fase.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <label className="relative block">
              <span className="sr-only">Buscar productos en Inventario</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, codigo interno, SKU o barras"
                aria-label="Buscar productos en Inventario"
              />
            </label>
            <select
              aria-label="Filtrar Inventario por stock"
              className="h-10 rounded-xl border border-[color:var(--border)] bg-background px-3 text-sm"
              value={stockFilter}
              onChange={(event) => applyStockFilter(event.target.value as "all" | "with_stock" | "without_stock")}
            >
              <option value="all">Todo el stock</option>
              <option value="with_stock">Con stock</option>
              <option value="without_stock">Sin stock</option>
            </select>
          </div>

          {activeFilterCount > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[color:var(--border)] bg-muted/25 px-3 py-2 text-sm">
              <span className="text-muted">Filtros activos:</span>
              {appliedFilters.productId ? <OperationsFilterChip label={focusedProduct ? `Producto: ${focusedProduct.name}` : "Producto enfocado"} onClear={clearProductFocus} /> : null}
              {appliedFilters.search ? <OperationsFilterChip label={`Búsqueda: ${appliedFilters.search}`} onClear={() => { setSearch(""); void loadProducts(1, { ...appliedFilters, search: "" }, true, "push"); }} /> : null}
              {appliedFilters.stockFilter !== "all" ? <OperationsFilterChip label={appliedFilters.stockFilter === "with_stock" ? "Con stock" : "Sin stock"} onClear={() => applyStockFilter("all")} /> : null}
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>Limpiar filtros</Button>
            </div>
          ) : null}

          {appliedFilters.productId ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/25 bg-brand/10 px-3 py-2 text-sm">
              <span>{focusedProduct ? <>Inventario enfocado en <strong>{focusedProduct.name}</strong>.</> : "No encontramos este producto en Inventario Base."}</span>
              <Button type="button" variant="secondary" size="sm" onClick={clearProductFocus}>Ver todo el Inventario</Button>
            </div>
          ) : null}

          {loadError ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-100"><span>No se pudo cargar el Inventario. {loadError}</span><Button type="button" variant="secondary" size="sm" onClick={() => void loadProducts(pagination.page, appliedFilters)}>Reintentar</Button></div> : null}
          {feedback ? <div className="rounded-xl border border-[color:var(--border)] bg-muted/40 px-4 py-3 text-sm">{feedback}</div> : null}

          <div className="relative">
            {loading ? <OperationsLoadingOverlay /> : null}
          <div className={cn("hidden overflow-x-auto rounded-2xl border border-[color:var(--border)] md:block", loading && "opacity-55")}>
            <table className="min-w-[1040px] w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="w-16 px-3 py-2.5">Imagen</th>
                  <th className="px-3 py-2.5">Codigo / SKU</th>
                  <th className="px-3 py-2.5">Producto</th>
                  <th className="px-3 py-2.5">Categoria</th>
                  <th className="px-3 py-2.5 text-right">Stock</th>
                  <th className="px-3 py-2.5">Ubicacion</th>
                  <th className="px-3 py-2.5">Ultimo movimiento</th>
                  <th className="px-3 py-2.5">Estado</th>
                  <th className="px-3 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t border-[color:var(--border)] hover:bg-muted/15">
                    <td className="px-3 py-2"><OperationsProductThumbnail product={product} /></td>
                    <td className="px-3 py-2"><p className="font-mono text-xs">{product.internalCode || "Sin codigo"}</p><p className="mt-1 text-xs text-muted">{product.sku || "Sin SKU"}</p></td>
                    <td className="px-3 py-2">
                      <p className="font-medium">{product.name}</p>
                    </td>
                    <td className="px-3 py-2 text-muted">{product.categoryName || "Sin categoria"}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{resolveStock(product)}</td>
                    <td className="px-3 py-2">{product.locationName || "Principal"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{humanizeMovement(product.lastMovementType, product.lastMovementAt)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1.5"><OperationsStockBadge stock={resolveStock(product)} />{product.status === "archived" ? <Badge variant="muted">Archivado</Badge> : null}</div>
                    </td>
                    <td className="px-3 py-2"><InventoryProductActions product={product} readOnly={readOnly} onMovement={() => openPanel(product, "movement")} /></td>
                  </tr>
                ))}
                {!products.length ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {activeFilterCount > 0 ? "No hay productos con estos filtros." : "Todavia no hay productos en Inventario Base."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className={cn("space-y-2 md:hidden", loading && "opacity-55")}>
            {products.map((product) => <InventoryProductMobileRow key={product.id} product={product} readOnly={readOnly} onMovement={() => openPanel(product, "movement")} />)}
          </div>
          </div>

          <OperationsStablePaginator ariaLabel="Paginacion de productos de Inventario" page={pagination.page} totalPages={pagination.totalPages} pageStart={pageStart} pageEnd={pageEnd} totalItems={pagination.totalItems} itemLabel="productos" disabled={loading} onPage={(page) => void loadProducts(page, appliedFilters, true, "push")} />
        </CardContent>
      </Card>

      {selectedProduct && activePanel ? (
        <div ref={detailsSectionRef} className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border)] bg-muted/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Producto seleccionado</p>
              <h2 ref={detailsHeadingRef} tabIndex={-1} className="mt-1 text-lg font-semibold focus:outline-none">
                {selectedProduct.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedProduct.internalCode || "Sin codigo"} · stock actual {currentStock}
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={closeDetailsPanel}>
              Cerrar panel
            </Button>
          </div>

          {activePanel === "movement" ? (
            <Card>
              <CardHeader>
                <CardTitle>Registrar movimiento</CardTitle>
                <CardDescription>
                  {selectedProduct.name} · {selectedProduct.internalCode || "Sin codigo"} · stock actual {currentStock}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {historyError ? (
                  <div className="rounded-xl border border-[color:var(--border)] bg-muted/30 px-4 py-3 text-sm">
                    No se pudo cargar historial. Podes registrar el movimiento igual y reintentar mas tarde.
                  </div>
                ) : null}
                <div className="grid gap-3">
                  <label className="grid gap-2 text-sm">
                    <span>Tipo</span>
                    <select
                      className="h-10 rounded-xl border border-[color:var(--border)] bg-background px-3 text-sm"
                      value={mode}
                      onChange={(event) => setMode(event.target.value as MovementMode)}
                      disabled={readOnly || saving}
                    >
                      <option value="opening_balance">Carga inicial</option>
                      <option value="manual_increase">Entrada</option>
                      <option value="manual_decrease">Salida</option>
                      <option value="correction">Ajuste por stock contado</option>
                    </select>
                  </label>

                  {mode === "correction" ? (
                    <label className="grid gap-2 text-sm">
                      <span>Stock contado</span>
                      <Input type="number" min="0" step="1" value={countedStock} onChange={(event) => setCountedStock(event.target.value)} disabled={readOnly || saving} />
                    </label>
                  ) : (
                    <label className="grid gap-2 text-sm">
                      <span>Cantidad</span>
                      <Input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} disabled={readOnly || saving} />
                    </label>
                  )}

                  <label className="grid gap-2 text-sm">
                    <span>Motivo {mode === "manual_decrease" || mode === "correction" ? "(obligatorio)" : "(opcional)"}</span>
                    <Input value={reason} onChange={(event) => setReason(event.target.value)} disabled={readOnly || saving} placeholder="Ej. conteo fisico, merma, ingreso manual" />
                  </label>
                </div>

                <div className="rounded-xl border border-[color:var(--border)] bg-muted/30 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Saldo posterior</span>
                    <span className="font-semibold">{Number.isFinite(resultingStock) ? resultingStock : "-"}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Diferencia</span>
                    <span className="font-semibold">{Number.isFinite(deltaPreview) ? signed(deltaPreview) : "-"}</span>
                  </div>
                </div>

                <Button type="button" className="w-full" onClick={submitMovement} disabled={readOnly || saving}>
                  {saving ? "Registrando..." : "Confirmar movimiento"}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {activePanel === "history" ? (
            <Card>
              <CardHeader>
                <CardTitle>Historial</CardTitle>
                <CardDescription>Ledger inmutable del producto. Las correcciones futuras deben compensar, no editar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {historyLoading ? <p className="text-sm text-muted-foreground">Cargando historial...</p> : null}
                {!historyLoading && historyError ? (
                  <div className="rounded-xl border border-[color:var(--border)] bg-muted/30 px-4 py-3 text-sm">
                    <p>{historyError}</p>
                    <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => selectedProduct && void loadHistory(selectedProduct)}>
                      Reintentar
                    </Button>
                  </div>
                ) : null}
                {!historyLoading && !historyError && !history.length ? <p className="text-sm text-muted-foreground">Todavia no hay movimientos para este producto.</p> : null}
                {history.map((movement) => (
                  <div key={movement.id} className="rounded-xl border border-[color:var(--border)] bg-muted/20 px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{movement.movementType}</Badge>
                        <span className="font-medium">{signed(resolveSignedMovement(movement))}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDateTime(movement.createdAt)}</span>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs text-muted-foreground md:grid-cols-2">
                      <span>Saldo anterior: {movement.quantityBefore ?? "-"}</span>
                      <span>Saldo posterior: {movement.quantityAfter ?? "-"}</span>
                      <span>Ubicacion: {movement.locationName || "Principal"}</span>
                      <span>Referencia: {movement.referenceType || "-"}</span>
                    </div>
                    {movement.reason ? <p className="mt-2 text-sm">{movement.reason}</p> : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </ClientPageShell>
  );
}

function resolveStock(product: PortalInventoryProduct) {
  return Number((product.stock ?? 0) || 0);
}

function humanizeMovement(type?: string | null, createdAt?: string | null) {
  if (!type && !createdAt) return "Sin movimientos";
  return `${type || "movimiento"}${createdAt ? ` · ${formatDateTime(createdAt)}` : ""}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-AR");
}

function resolveSignedMovement(movement: PortalInventoryMovement) {
  const positive = new Set(["opening_balance", "purchase_receipt", "manual_increase", "return_in", "initial_stock", "manual_adjustment_in"]);
  return positive.has(movement.movementType) ? Number(movement.quantity || 0) : Number(movement.quantity || 0) * -1;
}

function signed(value: number) {
  if (!Number.isFinite(value)) return "-";
  return value > 0 ? `+${value}` : String(value);
}

function createMovementAttemptKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `inventory-movement-${Date.now()}`;
}

function resolveMovementSubmitErrorMessage(errorCode?: string | null) {
  if (
    errorCode === "inventory_negative_stock_blocked" ||
    errorCode === "inventory_opening_balance_already_exists" ||
    errorCode === "inventory_zero_delta_not_allowed" ||
    errorCode === "invalid_inventory_movement_type" ||
    errorCode === "invalid_inventory_quantity" ||
    errorCode === "invalid_inventory_counted_stock" ||
    errorCode === "missing_inventory_idempotency_key" ||
    errorCode === "portal_inventory_movement_create_failed"
  ) {
    return "No pudimos registrar el movimiento. El stock no fue modificado. Intentá nuevamente.";
  }
  return "No pudimos registrar el movimiento. El stock no fue modificado. Intentá nuevamente.";
}

function isInventoryPagination(value: unknown): value is PortalInventoryPagination {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PortalInventoryPagination>;
  return (
    isPositiveInteger(candidate.page) &&
    isPositiveInteger(candidate.pageSize) &&
    isNonNegativeInteger(candidate.totalItems) &&
    isNonNegativeInteger(candidate.totalPages)
  );
}

function isInventorySummary(value: unknown): value is PortalInventorySummary {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PortalInventorySummary>;
  return (
    isNonNegativeInteger(candidate.totalProducts) &&
    isNonNegativeInteger(candidate.withStock) &&
    isNonNegativeInteger(candidate.withoutStock) &&
    candidate.withStock + candidate.withoutStock === candidate.totalProducts
  );
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function InventoryProductActions({
  product,
  readOnly,
  onMovement
}: {
  product: PortalInventoryProduct;
  readOnly: boolean;
  onMovement: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      {!readOnly ? <Button type="button" size="sm" onClick={onMovement}>Registrar</Button> : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="sm" aria-label={`Más acciones para ${product.name}`}><MoreHorizontal aria-hidden="true" className="size-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild><Link href={`/app/inventory/movements?productId=${encodeURIComponent(product.id)}`}>Ver movimientos</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href={`/app/catalog/${encodeURIComponent(product.id)}`}>Abrir en Catálogo</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function InventoryProductMobileRow({ product, readOnly, onMovement }: { product: PortalInventoryProduct; readOnly: boolean; onMovement: () => void }) {
  return (
    <article className="rounded-2xl border border-[color:var(--border)] bg-card/80 p-3">
      <div className="flex gap-3">
        <OperationsProductThumbnail product={product} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-medium">{product.name}</p>
          <p className="mt-1 truncate font-mono text-xs text-muted">{product.internalCode || product.sku || "Sin codigo"}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold tabular-nums">Stock {resolveStock(product)}</span>
            <OperationsStockBadge stock={resolveStock(product)} />
            {product.status === "archived" ? <Badge variant="muted">Archivado</Badge> : null}
          </div>
        </div>
      </div>
      <div className="mt-3"><InventoryProductActions product={product} readOnly={readOnly} onMovement={onMovement} /></div>
    </article>
  );
}
