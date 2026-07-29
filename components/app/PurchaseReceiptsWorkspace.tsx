"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { InventorySectionNav } from "@/components/app/InventorySectionNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PortalInventoryLocation, PortalPurchaseReceiptListItem, PortalSupplier } from "@/lib/api";

export function PurchaseReceiptsWorkspace({
  initialReceipts,
  initialSuppliers,
  initialLocations,
  initialPage = 1,
  initialPageSize = 20,
  initialTotal = 0,
  readOnly = false,
  canCreate = false
}: {
  initialReceipts: PortalPurchaseReceiptListItem[];
  initialSuppliers: PortalSupplier[];
  initialLocations: PortalInventoryLocation[];
  initialPage?: number;
  initialPageSize?: number;
  initialTotal?: number;
  readOnly?: boolean;
  canCreate?: boolean;
}) {
  const [receipts, setReceipts] = useState(Array.isArray(initialReceipts) ? initialReceipts : []);
  const [page, setPage] = useState(initialPage);
  const [pageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(initialTotal);
  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suppliers = useMemo(
    () => initialSuppliers.filter((supplier) => supplier.status === "active"),
    [initialSuppliers]
  );
  const locations = useMemo(
    () => initialLocations.filter((location) => location.active),
    [initialLocations]
  );

  const summary = useMemo(() => {
    const totalLines = receipts.reduce((sum, receipt) => sum + Number(receipt.itemCount || 0), 0);
    const knownCosts = receipts.filter((receipt) => receipt.totalCost !== null).length;
    return {
      receipts: total,
      lines: totalLines,
      knownCosts
    };
  }, [receipts, total]);

  async function loadReceipts(nextPage = page) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(pageSize),
        sort: "receivedAt_desc"
      });
      if (supplierId) params.set("supplierId", supplierId);
      if (locationId) params.set("locationId", locationId);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const response = await fetch(`/api/app/purchase-receipts?${params.toString()}`, { cache: "no-store" });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(json?.error || "purchase_receipts_load_failed"));
      setReceipts(Array.isArray(json?.items) ? json.items : []);
      setPage(Number(json?.page || nextPage));
      setTotal(Number(json?.total || 0));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "purchase_receipts_load_failed");
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setSupplierId("");
    setLocationId("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
    setError(null);
    void (async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/app/purchase-receipts?page=1&pageSize=${pageSize}&sort=receivedAt_desc`, { cache: "no-store" });
        const json = await response.json().catch(() => null);
        if (!response.ok) throw new Error(String(json?.error || "purchase_receipts_load_failed"));
        setReceipts(Array.isArray(json?.items) ? json.items : []);
        setPage(Number(json?.page || 1));
        setTotal(Number(json?.total || 0));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "purchase_receipts_load_failed");
      } finally {
        setLoading(false);
      }
    })();
  }

  const hasPrevPage = page > 1;
  const hasNextPage = page * pageSize < total;

  return (
    <ClientPageShell
      title="Recepciones"
      description="Registro operativo de ingresos confirmados. Cada recepcion ya impacto stock, movimientos, balances y lotes segun el modo real de inventario."
      badge="Inventario"
      backHref="/app/inventory"
      backLabel="Volver a Inventario"
      action={
        canCreate && !readOnly ? (
          <Button asChild className="rounded-2xl">
            <Link href="/app/inventory/receipts/new">Ingresar mercaderia</Link>
          </Button>
        ) : null
      }
    >
      <div className="space-y-6">
        <InventorySectionNav />

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Recepciones" value={String(summary.receipts)} helper="Total historico segun los filtros activos." />
          <MetricCard label="Lineas visibles" value={String(summary.lines)} helper="Suma de lineas en la pagina actual." />
          <MetricCard label="Costos informados" value={String(summary.knownCosts)} helper="Recepciones de esta pagina con costo total visible." />
        </section>

        <Card className="border-white/8 bg-card/90">
          <CardHeader>
            <div>
              <CardTitle className="text-xl">Filtros</CardTitle>
              <CardDescription>Usa los filtros soportados por el backend para revisar ingresos recientes.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0 md:grid-cols-5">
            <select className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
              <option value="">Todos los proveedores</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.displayName}
                </option>
              ))}
            </select>
            <select className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm" value={locationId} onChange={(event) => setLocationId(event.target.value)}>
              <option value="">Todas las ubicaciones</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            <div className="flex gap-2">
              <Button type="button" className="flex-1" onClick={() => void loadReceipts(1)} disabled={loading}>
                {loading ? "Cargando..." : "Aplicar"}
              </Button>
              <Button type="button" variant="ghost" onClick={resetFilters} disabled={loading}>
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/8 bg-card/90">
          <CardHeader>
            <div>
              <CardTitle className="text-xl">Listado</CardTitle>
              <CardDescription>Ordenado por recepcion mas reciente primero.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {error ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div>
            ) : null}

            {!loading && receipts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[color:var(--border)] bg-surface/35 p-8 text-center">
                <p className="text-lg font-medium">Todavia no hay recepciones registradas.</p>
                <p className="mt-2 text-sm text-muted">Cuando confirmes un ingreso, aparecera aca con su detalle operativo.</p>
                {canCreate && !readOnly ? (
                  <Button asChild className="mt-4">
                    <Link href="/app/inventory/receipts/new">Ingresar mercaderia</Link>
                  </Button>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-3">
              {receipts.map((receipt) => (
                <article key={receipt.id} className="rounded-3xl border border-[color:var(--border)] bg-surface/45 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold">{receipt.supplier?.displayName || "Proveedor sin nombre"}</p>
                        <Badge variant="outline">{receipt.location?.name || "Ubicacion"}</Badge>
                        <Badge variant="muted">{formatReceiptDate(receipt.receivedAt)}</Badge>
                      </div>
                      <p className="text-sm text-muted">
                        Documento: {receipt.documentNumber || "Sin documento"} | {receipt.itemCount} linea{receipt.itemCount === 1 ? "" : "s"} | Cantidad total {receipt.totalQuantity}
                      </p>
                      <p className="text-sm text-muted">
                        {receipt.totalCost !== null ? `Costo total ${receipt.totalCost}` : "Costo total no informado"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="secondary" size="sm" className="rounded-2xl">
                        <Link href={`/app/inventory/receipts/${receipt.id}`}>Ver detalle</Link>
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {total > 0 ? (
              <div className="flex flex-col gap-3 border-t border-[color:var(--border)] pt-4 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-muted">
                  Pagina {page} · {Math.min(total, page * pageSize)} de {total} recepciones
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => void loadReceipts(page - 1)} disabled={!hasPrevPage || loading}>
                    Anterior
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => void loadReceipts(page + 1)} disabled={!hasNextPage || loading}>
                    Siguiente
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </ClientPageShell>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card className="border-white/8 bg-card/90">
      <CardContent className="space-y-2 p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
        <p className="text-3xl font-semibold">{value}</p>
        <p className="text-sm text-muted">{helper}</p>
      </CardContent>
    </Card>
  );
}

function formatReceiptDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
