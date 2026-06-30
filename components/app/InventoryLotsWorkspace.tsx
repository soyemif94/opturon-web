"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Boxes, CalendarClock, PackageCheck, Search, TriangleAlert } from "lucide-react";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type PortalInventoryLot } from "@/lib/api";
import { cn } from "@/lib/cn";

export function InventoryLotsWorkspace({
  initialLots,
  readOnly = false
}: {
  initialLots: PortalInventoryLot[];
  readOnly?: boolean;
}) {
  const [lots, setLots] = useState(initialLots);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const filteredLots = useMemo(() => {
    const query = search.trim().toLowerCase();
    return lots.filter((lot) => {
      if (status !== "all" && lot.status !== status && lot.expirationStatus !== status) return false;
      if (!query) return true;
      return [lot.productName, lot.productSku, lot.lotNumber, lot.supplierName, lot.warehouseName, lot.locationName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [lots, search, status]);

  const metrics = useMemo(() => {
    const active = lots.filter((lot) => lot.status === "active");
    const available = active.reduce((sum, lot) => sum + Number(lot.availableQuantity || 0), 0);
    const expired = lots.filter((lot) => lot.expirationStatus === "expired" || lot.status === "expired").length;
    const critical = lots.filter((lot) => ["critical", "urgent", "warning"].includes(lot.expirationStatus)).length;
    return { lots: lots.length, active: active.length, available, expired, critical };
  }, [lots]);

  async function refreshLots() {
    setRefreshing(true);
    try {
      const response = await fetch("/api/app/inventory/lots?pageSize=250", { cache: "no-store" });
      const json = await response.json().catch(() => null);
      if (response.ok && Array.isArray(json?.lots)) setLots(json.lots);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <ClientPageShell
      title="Inventario por lotes"
      description="Control operativo de ingresos, disponibilidad, vencimientos y trazabilidad sin mezclar maestro de producto con stock real."
      badge="Inventario"
    >
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={Boxes} label="Lotes" value={String(metrics.lots)} helper={`${metrics.active} activos`} />
        <MetricCard icon={PackageCheck} label="Disponible" value={formatQuantity(metrics.available)} helper="Suma de lotes activos" />
        <MetricCard icon={CalendarClock} label="Alertas" value={String(metrics.critical)} helper="Vence pronto" tone="warning" />
        <MetricCard icon={TriangleAlert} label="Vencidos" value={String(metrics.expired)} helper="Revisar baja" tone="danger" />
      </div>

      <Card className="mt-6 overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(8,18,28,0.96),rgba(7,13,21,0.96))]">
        <CardHeader
          action={
            <Button type="button" variant="secondary" className="rounded-2xl" onClick={refreshLots} disabled={refreshing}>
              {refreshing ? "Actualizando..." : "Actualizar"}
            </Button>
          }
        >
          <div>
            <CardTitle>Lotes registrados</CardTitle>
            <CardDescription>Filtra por producto, lote, proveedor o ubicacion. Los ingresos se cargan desde el detalle del producto.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-0">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto, SKU, lote, proveedor..." />
            </label>
            <select
              className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="depleted">Agotados</option>
              <option value="expired">Vencidos</option>
              <option value="critical">Criticos</option>
              <option value="urgent">Urgentes</option>
              <option value="warning">Advertencia</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[color:var(--border)]">
            <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-[color:var(--border)] bg-surface/60 px-4 py-3 text-xs uppercase tracking-[0.14em] text-muted">
              <span>Producto / lote</span>
              <span>Disponible</span>
              <span>Vencimiento</span>
              <span>Ubicacion</span>
              <span>Estado</span>
            </div>
            {filteredLots.length ? (
              filteredLots.map((lot) => (
                <div key={lot.id} className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-[color:var(--border)] px-4 py-4 text-sm last:border-b-0">
                  <div>
                    <Link href={`/app/catalog/${lot.productId}`} className="font-medium text-foreground hover:underline">
                      {lot.productName || "Producto"}
                    </Link>
                    <p className="mt-1 text-xs text-muted">{lot.productSku || "Sin SKU"} | Lote {lot.lotNumber || "sin numero"}</p>
                  </div>
                  <span className="font-semibold">{formatQuantity(lot.availableQuantity)}</span>
                  <span>{formatDate(lot.expiresAt)}</span>
                  <span className="text-muted">{[lot.warehouseName, lot.locationName].filter(Boolean).join(" / ") || "-"}</span>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={lot.status === "active" ? "success" : lot.status === "expired" ? "danger" : "muted"}>{lot.status}</Badge>
                    <Badge variant={expirationVariant(lot.expirationStatus)}>{expirationLabel(lot)}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-muted">
                {readOnly ? "No hay lotes para consultar." : "Todavia no hay lotes. Entra al detalle de un producto y usa Agregar ingreso."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </ClientPageShell>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = "default"
}: {
  icon: typeof Boxes;
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <Card className={cn("border-white/8 bg-card/90", tone === "warning" && "border-amber-400/20", tone === "danger" && "border-rose-400/20")}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-2xl bg-white/8 p-3">
          <Icon className="size-5 text-muted" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          <p className="mt-1 text-xs text-muted">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 3 }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return "Sin vencimiento";
  return value.slice(0, 10);
}

function expirationVariant(status: PortalInventoryLot["expirationStatus"]) {
  if (status === "expired") return "danger";
  if (["critical", "urgent", "warning"].includes(status)) return "warning";
  return "outline";
}

function expirationLabel(lot: PortalInventoryLot) {
  if (lot.expirationStatus === "no_expiration") return "Sin vencimiento";
  if (lot.expirationStatus === "expired") return "Vencido";
  if (lot.daysUntilExpiration === 0) return "Vence hoy";
  if (typeof lot.daysUntilExpiration === "number" && lot.daysUntilExpiration > 0) return `${lot.daysUntilExpiration} dias`;
  return lot.expirationStatus;
}
