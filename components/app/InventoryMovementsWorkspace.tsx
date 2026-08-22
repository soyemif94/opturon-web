"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { InventorySectionNav } from "@/components/app/InventorySectionNav";
import { OperationsFilterChip, OperationsStablePaginator } from "@/components/app/operations-workspace-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PortalInventoryLocation, PortalInventoryMovementListItem, PortalInventoryProduct } from "@/lib/api";

const MOVEMENT_TYPE_OPTIONS = [
  "all",
  "purchase_receipt",
  "opening_balance",
  "initial_stock",
  "manual_increase",
  "manual_decrease",
  "manual_adjustment_in",
  "manual_adjustment_out",
  "correction",
  "sale",
  "return_in",
  "return_out",
  "expired_writeoff",
  "cancellation"
] as const;

export function InventoryMovementsWorkspace({
  initialItems,
  initialProducts,
  initialLocations,
  initialPage = 1,
  initialPageSize = 25,
  initialTotal = 0,
  initialFilters
}: {
  initialItems: PortalInventoryMovementListItem[];
  initialProducts: PortalInventoryProduct[];
  initialLocations: PortalInventoryLocation[];
  initialPage?: number;
  initialPageSize?: number;
  initialTotal?: number;
  initialFilters?: {
    search?: string;
    movementType?: string;
    locationId?: string;
    productId?: string;
    lotNumber?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}) {
  const [items, setItems] = useState(Array.isArray(initialItems) ? initialItems : []);
  const [page, setPage] = useState(initialPage);
  const [pageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState(initialFilters?.search || "");
  const [movementType, setMovementType] = useState(initialFilters?.movementType || "all");
  const [locationId, setLocationId] = useState(initialFilters?.locationId || "");
  const [productId, setProductId] = useState(initialFilters?.productId || "");
  const [lotNumber, setLotNumber] = useState(initialFilters?.lotNumber || "");
  const [dateFrom, setDateFrom] = useState(initialFilters?.dateFrom || "");
  const [dateTo, setDateTo] = useState(initialFilters?.dateTo || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const products = useMemo(() => initialProducts.filter((product) => product.status === "active"), [initialProducts]);
  const locations = useMemo(() => initialLocations.filter((location) => location.active), [initialLocations]);
  const focusedMovementProductName = productId
    ? products.find((product) => product.id === productId)?.name || items.find((item) => item.productId === productId)?.productName || "Producto enfocado"
    : null;

  const summary = useMemo(() => {
    const receipts = items.filter((item) => item.movementType === "purchase_receipt").length;
    const lotLinked = items.filter((item) => item.lotNumber).length;
    return {
      total,
      receipts,
      lotLinked
    };
  }, [items, total]);

  async function loadMovements(nextPage = page) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(pageSize)
      });
      if (search.trim()) params.set("search", search.trim());
      if (movementType && movementType !== "all") params.set("movementType", movementType);
      if (locationId) params.set("locationId", locationId);
      if (productId) params.set("productId", productId);
      if (lotNumber.trim()) params.set("lotNumber", lotNumber.trim());
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const response = await fetch(`/api/app/inventory/movements?${params.toString()}`, { cache: "no-store" });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(json?.error || "inventory_movements_load_failed"));
      setItems(Array.isArray(json?.items) ? json.items : []);
      setPage(Number(json?.page || nextPage));
      setTotal(Number(json?.total || 0));
      window.history.replaceState(null, "", `/app/inventory/movements?${params.toString()}`);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "inventory_movements_load_failed");
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setSearch("");
    setMovementType("all");
    setLocationId("");
    setProductId("");
    setLotNumber("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
    setError(null);
    void (async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/app/inventory/movements?page=1&pageSize=${pageSize}`, { cache: "no-store" });
        const json = await response.json().catch(() => null);
        if (!response.ok) throw new Error(String(json?.error || "inventory_movements_load_failed"));
        setItems(Array.isArray(json?.items) ? json.items : []);
        setPage(Number(json?.page || 1));
        setTotal(Number(json?.total || 0));
        window.history.replaceState(null, "", "/app/inventory/movements");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "inventory_movements_load_failed");
      } finally {
        setLoading(false);
      }
    })();
  }

  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const pageStart = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const pageEnd = total > 0 ? Math.min(total, page * pageSize) : 0;

  return (
    <ClientPageShell
      title="Movimientos"
      description="Ledger operativo de inventory_movements con ingresos, egresos, ajustes, recepciones y trazabilidad por producto, lote y ubicacion."
      badge="Inventario"
      backHref="/app/inventory"
    >
      <section className="min-w-0 max-w-full space-y-4">
        <InventorySectionNav />
      </section>

      <div className="grid min-w-0 gap-4 md:grid-cols-3">
        <SummaryCard label="Movimientos" value={String(summary.total)} helper="Total del filtro actual" />
        <SummaryCard label="Recepciones" value={String(summary.receipts)} helper="Ingresos por recepcion visibles" />
        <SummaryCard label="Con lote" value={String(summary.lotLinked)} helper="Entradas o ajustes trazados por lote" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial operativo</CardTitle>
          <CardDescription>Mas reciente primero. Usa filtros para acotar por producto, tipo, lote, ubicacion o fecha.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4 [&>label]:min-w-0 [&_select]:w-full [&_select]:min-w-0 [&_select]:max-w-full">
            <label className="grid gap-2 text-sm">
              <span>Buscar</span>
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Producto, codigo, SKU o lote" />
            </label>

            <label className="grid gap-2 text-sm">
              <span>Tipo</span>
              <select
                className="h-10 rounded-xl border border-[color:var(--border)] bg-background px-3 text-sm"
                value={movementType}
                onChange={(event) => setMovementType(event.target.value)}
              >
                {MOVEMENT_TYPE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value === "all" ? "Todos" : movementTypeLabel(value)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span>Ubicacion</span>
              <select
                className="h-10 rounded-xl border border-[color:var(--border)] bg-background px-3 text-sm"
                value={locationId}
                onChange={(event) => setLocationId(event.target.value)}
              >
                <option value="">Todas</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span>Producto</span>
              <select
                className="h-10 rounded-xl border border-[color:var(--border)] bg-background px-3 text-sm"
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
              >
                <option value="">Todos</option>
                {productId && !products.some((product) => product.id === productId) ? <option value={productId}>{focusedMovementProductName}</option> : null}
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span>Lote</span>
              <Input value={lotNumber} onChange={(event) => setLotNumber(event.target.value)} placeholder="Ej. QA-D42-001" />
            </label>

            <label className="grid gap-2 text-sm">
              <span>Fecha desde</span>
              <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>

            <label className="grid gap-2 text-sm">
              <span>Fecha hasta</span>
              <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>

            <div className="flex items-end gap-2">
              <Button type="button" className="flex-1" onClick={() => loadMovements(1)} disabled={loading}>
                {loading ? "Cargando..." : "Aplicar filtros"}
              </Button>
              <Button type="button" variant="secondary" onClick={resetFilters} disabled={loading}>
                Limpiar
              </Button>
            </div>
          </div>

          {productId ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/25 bg-brand/10 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2"><span>Movimientos enfocados:</span><OperationsFilterChip label={focusedMovementProductName || "Producto"} onClear={resetFilters} /></div>
              <Button asChild type="button" variant="secondary" size="sm"><Link href={`/app/catalog/${encodeURIComponent(productId)}`}>Abrir en Catálogo</Link></Button>
            </div>
          ) : null}

          {error ? <div className="rounded-xl border border-[color:var(--border)] bg-muted/30 px-4 py-3 text-sm">{error}</div> : null}

          {!items.length && !loading && !error ? (
            <div className="rounded-2xl border border-[color:var(--border)] bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              Todavia no hay movimientos registrados.
            </div>
          ) : null}

          {items.length ? (
            <>
              <div className="hidden w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-2xl border border-[color:var(--border)] md:block">
                <table className="min-w-[1180px] w-full text-left text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Cantidad</th>
                      <th className="px-4 py-3">Ubicacion</th>
                      <th className="px-4 py-3">Lote</th>
                      <th className="px-4 py-3">Actor</th>
                      <th className="px-4 py-3">Origen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-t border-[color:var(--border)] align-top">
                        <td className="px-4 py-4 text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</td>
                        <td className="px-4 py-4">
                          <p className="font-medium">{item.productName || "Producto"}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.internalCode || item.productSku || "Sin codigo"}</p>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={movementVariant(item.movementType)}>{movementTypeLabel(item.movementType)}</Badge>
                        </td>
                        <td className="px-4 py-4 font-semibold">{formatSignedQuantity(item.quantity)}</td>
                        <td className="px-4 py-4">{item.locationName || "Principal"}</td>
                        <td className="px-4 py-4">{item.lotNumber || "No aplica"}</td>
                        <td className="px-4 py-4">{item.actorName || item.createdBy || "-"}</td>
                        <td className="px-4 py-4">
                          <p>{referenceLabel(item.referenceType)}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.referenceId || item.reason || "-"}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 md:hidden">
                {items.map((item) => (
                  <Card key={item.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="break-words text-base">{item.productName || "Producto"}</CardTitle>
                          <CardDescription className="break-all">{item.internalCode || item.productSku || "Sin codigo"}</CardDescription>
                        </div>
                        <Badge variant={movementVariant(item.movementType)}>{movementTypeLabel(item.movementType)}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Cantidad</span>
                        <span className="font-semibold">{formatSignedQuantity(item.quantity)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Fecha</span>
                        <span>{formatDateTime(item.createdAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Ubicacion</span>
                        <span className="min-w-0 break-words text-right">{item.locationName || "Principal"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Lote</span>
                        <span className="min-w-0 break-all text-right">{item.lotNumber || "No aplica"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Actor</span>
                        <span className="min-w-0 break-words text-right">{item.actorName || item.createdBy || "-"}</span>
                      </div>
                      <div className="rounded-xl border border-[color:var(--border)] bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        <p>{referenceLabel(item.referenceType)}</p>
                        <p className="mt-1 break-all">{item.referenceId || item.reason || "-"}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : null}

          <OperationsStablePaginator ariaLabel="Paginacion de movimientos" page={page} totalPages={totalPages} pageStart={pageStart} pageEnd={pageEnd} totalItems={total} itemLabel={total === 1 ? "movimiento" : "movimientos"} disabled={loading} onPage={(nextPage) => void loadMovements(nextPage)} />
        </CardContent>
      </Card>
    </ClientPageShell>
  );
}

function movementTypeLabel(value: string) {
  const labels: Record<string, string> = {
    initial_stock: "Stock inicial",
    opening_balance: "Carga inicial",
    purchase_receipt: "Recepcion",
    manual_increase: "Ingreso manual",
    manual_decrease: "Salida manual",
    correction: "Correccion",
    return_in: "Devolucion ingreso",
    return_out: "Devolucion egreso",
    manual_adjustment_in: "Ajuste lotes +",
    manual_adjustment_out: "Ajuste lotes -",
    expired_writeoff: "Baja por vencimiento",
    cancellation: "Cancelacion",
    sale: "Venta"
  };
  return labels[value] || value;
}

function movementVariant(value: string) {
  if (["purchase_receipt", "manual_increase", "opening_balance", "initial_stock", "return_in", "manual_adjustment_in"].includes(value)) return "success";
  if (["manual_decrease", "return_out", "manual_adjustment_out", "expired_writeoff", "sale", "cancellation"].includes(value)) return "warning";
  return "outline";
}

function referenceLabel(referenceType?: string | null) {
  if (!referenceType) return "Origen no informado";
  if (referenceType === "purchase_receipt") return "Recepcion";
  if (referenceType === "order") return "Pedido";
  if (referenceType === "lot_operation") return "Operacion de lote";
  return referenceType;
}

function formatSignedQuantity(value: string) {
  const normalized = String(value || "0").trim();
  if (!normalized) return "0";
  return normalized.startsWith("-") ? normalized : normalized === "0" ? "0" : `+${normalized}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-AR");
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
