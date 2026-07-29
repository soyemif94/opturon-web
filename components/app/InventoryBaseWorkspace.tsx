"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PortalInventoryMovement, PortalInventoryProduct } from "@/lib/api";

type MovementMode = "opening_balance" | "manual_increase" | "manual_decrease" | "correction";
type InventoryActionPanel = "history" | "movement" | null;

const EMPTY_HISTORY: PortalInventoryMovement[] = [];

export function InventoryBaseWorkspace({
  initialProducts,
  tenantId = null,
  readOnly = false,
  summarySectionId,
  movementsSectionId
}: {
  initialProducts: PortalInventoryProduct[];
  tenantId?: string | null;
  readOnly?: boolean;
  summarySectionId?: string;
  movementsSectionId?: string;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "with_stock" | "without_stock">("all");
  const [loading, setLoading] = useState(false);
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

  function buildInventoryUrl(path: string, params?: Record<string, string>) {
    const search = new URLSearchParams(params);
    if (tenantId) search.set("tenantId", tenantId);
    const suffix = search.toString() ? `?${search.toString()}` : "";
    return `${path}${suffix}`;
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

  async function refreshProducts(nextSearch = search, nextFilter = stockFilter) {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: "1",
        pageSize: "100"
      };
      if (nextSearch.trim()) params.search = nextSearch.trim();
      if (nextFilter !== "all") params.stockFilter = nextFilter;
      const response = await fetch(buildInventoryUrl("/api/app/inventory/products", params), { cache: "no-store" });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || "No se pudo cargar inventario.");
      setProducts(Array.isArray(json?.products) ? json.products : []);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo cargar inventario.");
    } finally {
      setLoading(false);
    }
  }

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

  const summary = useMemo(() => {
    const withStock = products.filter((product) => resolveStock(product) > 0).length;
    const withoutStock = products.length - withStock;
    return { total: products.length, withStock, withoutStock };
  }, [products]);

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
      await refreshProducts();
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
    >
      <div id={summarySectionId} className="grid scroll-mt-28 gap-4 md:grid-cols-3">
        <SummaryCard label="Productos" value={String(summary.total)} helper="Catalogo visible en inventario" />
        <SummaryCard label="Con stock" value={String(summary.withStock)} helper="Disponibilidad positiva" />
        <SummaryCard label="Sin stock" value={String(summary.withoutStock)} helper="Requieren reposicion o correccion" />
      </div>

      <Card id={movementsSectionId} className="mt-6 scroll-mt-28">
        <CardHeader>
          <CardTitle>Stock actual</CardTitle>
          <CardDescription>Ubicacion principal unica por tenant. Lotes y vencimientos quedan fuera del flujo base de esta fase.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, codigo interno, SKU o barras"
              />
            </label>
            <select
              className="h-10 rounded-xl border border-[color:var(--border)] bg-background px-3 text-sm"
              value={stockFilter}
              onChange={(event) => setStockFilter(event.target.value as "all" | "with_stock" | "without_stock")}
            >
              <option value="all">Todos</option>
              <option value="with_stock">Con stock</option>
              <option value="without_stock">Sin stock</option>
            </select>
            <Button type="button" variant="secondary" onClick={() => refreshProducts()} disabled={loading}>
              {loading ? "Actualizando..." : "Actualizar"}
            </Button>
          </div>

          {feedback ? <div className="rounded-xl border border-[color:var(--border)] bg-muted/40 px-4 py-3 text-sm">{feedback}</div> : null}

          <div className="overflow-x-auto rounded-2xl border border-[color:var(--border)]">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Codigo</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Ubicacion</th>
                  <th className="px-4 py-3">Ultimo movimiento</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t border-[color:var(--border)]">
                    <td className="px-4 py-4 font-mono text-xs">{product.internalCode || "-"}</td>
                    <td className="px-4 py-4">
                      <p className="font-medium">{product.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{product.sku || "Sin SKU"}</p>
                    </td>
                    <td className="px-4 py-4">{product.categoryName || "-"}</td>
                    <td className="px-4 py-4 font-semibold">{resolveStock(product)}</td>
                    <td className="px-4 py-4">{product.locationName || "Principal"}</td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">{humanizeMovement(product.lastMovementType, product.lastMovementAt)}</td>
                    <td className="px-4 py-4">
                      <Badge variant={badgeVariant(product.stockState || "without_stock")}>{badgeLabel(product.stockState || "without_stock")}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="secondary" onClick={() => openPanel(product, "history")}>
                          Historial
                        </Button>
                        <Button type="button" size="sm" onClick={() => openPanel(product, "movement")} disabled={readOnly}>
                          Registrar movimiento
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!products.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No hay productos para este filtro.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
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

function badgeVariant(state: string) {
  if (state === "with_stock") return "success";
  if (state === "low_stock") return "warning";
  return "muted";
}

function badgeLabel(state: string) {
  if (state === "with_stock") return "Con stock";
  if (state === "low_stock") return "Bajo";
  return "Sin stock";
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

function SummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{helper}</CardContent>
    </Card>
  );
}
