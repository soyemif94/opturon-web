"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Boxes, CalendarClock, PackageCheck, Search, Settings2, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type PortalInventoryExpirationSummary, type PortalInventoryExpirationThresholds, type PortalInventoryLot } from "@/lib/api";
import { cn } from "@/lib/cn";

const DEFAULT_THRESHOLDS: PortalInventoryExpirationThresholds = {
  criticalDays: 3,
  urgentDays: 7,
  warningDays: 15,
  upcomingDays: 30
};

const WRITE_OFF_REASONS = ["Producto vencido", "Producto danado", "Merma", "Ajuste de inventario", "Otro"];

export function InventoryLotsWorkspace({
  initialLots,
  readOnly = false
}: {
  initialLots: PortalInventoryLot[];
  readOnly?: boolean;
}) {
  const [lots, setLots] = useState(initialLots);
  const [summary, setSummary] = useState<PortalInventoryExpirationSummary | null>(null);
  const [thresholds, setThresholds] = useState<PortalInventoryExpirationThresholds>(DEFAULT_THRESHOLDS);
  const [draftThresholds, setDraftThresholds] = useState<PortalInventoryExpirationThresholds>(DEFAULT_THRESHOLDS);
  const [search, setSearch] = useState("");
  const [expirationStatus, setExpirationStatus] = useState("all");
  const [stockFilter, setStockFilter] = useState("with_stock");
  const [warehouse, setWarehouse] = useState("");
  const [location, setLocation] = useState("");
  const [supplier, setSupplier] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [selectedLot, setSelectedLot] = useState<PortalInventoryLot | null>(null);
  const [selectedLotIds, setSelectedLotIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function refreshData(nextStatus = expirationStatus) {
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      params.set("pageSize", "250");
      if (nextStatus !== "all") params.set("expirationStatus", nextStatus);
      if (search.trim()) params.set("search", search.trim());
      if (stockFilter === "with_stock") params.set("hasStock", "true");
      if (stockFilter === "without_stock") params.set("hasStock", "false");
      if (warehouse.trim()) params.set("warehouse", warehouse.trim());
      if (location.trim()) params.set("location", location.trim());
      if (supplier.trim()) params.set("supplier", supplier.trim());
      if (dateFrom) params.set("expiresAfter", dateFrom);
      if (dateTo) params.set("expiresBefore", dateTo);

      const [lotsResponse, summaryResponse, settingsResponse] = await Promise.all([
        fetch(`/api/app/inventory/lots?${params.toString()}`, { cache: "no-store" }),
        fetch("/api/app/inventory/expiration-summary", { cache: "no-store" }),
        fetch("/api/app/inventory/expiration-settings", { cache: "no-store" })
      ]);
      const lotsJson = await lotsResponse.json().catch(() => null);
      const summaryJson = await summaryResponse.json().catch(() => null);
      const settingsJson = await settingsResponse.json().catch(() => null);
      if (lotsResponse.ok && Array.isArray(lotsJson?.lots)) setLots(lotsJson.lots);
      if (summaryResponse.ok && summaryJson?.summary) setSummary(summaryJson.summary);
      if (settingsResponse.ok && settingsJson?.thresholds) {
        setThresholds(settingsJson.thresholds);
        setDraftThresholds(settingsJson.thresholds);
      }
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void refreshData("all");
  }, []);

  const visibleLots = useMemo(() => {
    const query = search.trim().toLowerCase();
    return lots.filter((lot) => {
      if (!query) return true;
      return [lot.productName, lot.productSku, lot.lotNumber, lot.supplierName, lot.warehouseName, lot.locationName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [lots, search]);

  const localSummary = useMemo(() => buildSummary(lots), [lots]);
  const activeSummary = summary || localSummary;
  const selectedLots = visibleLots.filter((lot) => selectedLotIds.includes(lot.id));
  const bulkEligible = selectedLots.length > 0 && selectedLots.every((lot) => lot.expirationStatus === "expired" && Number(lot.availableQuantity || 0) > 0);

  function applyCard(status: string) {
    setExpirationStatus(status);
    setFeedback(null);
    void refreshData(status);
  }

  async function writeOffLot(lot: PortalInventoryLot) {
    const available = Number(lot.availableQuantity || 0);
    if (available <= 0) return;
    const quantity = Number(window.prompt(`Cantidad a dar de baja. Disponible: ${formatQuantity(available)}`, String(available)));
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > available) return;
    const reason = window.prompt(`Motivo (${WRITE_OFF_REASONS.join(", ")})`, lot.expirationStatus === "expired" ? "Producto vencido" : "Ajuste de inventario") || "Producto vencido";
    const notes = window.prompt("Notas opcionales", "") || "";
    if (!window.confirm(`Confirmar baja de ${formatQuantity(quantity)} unidades del lote ${lot.lotNumber || "sin numero"}. Esta accion crea trazabilidad y no borra el lote.`)) return;

    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/app/inventory/lots/${lot.id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movementType: "expired_writeoff",
          quantity,
          reason,
          metadata: { notes, source: "inventory_expiration_ui" }
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || "No se pudo registrar la baja.");
      setFeedback("Baja registrada con movimiento expired_writeoff.");
      setSelectedLot(json?.lot || null);
      await refreshData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo registrar la baja.");
    } finally {
      setSaving(false);
    }
  }

  async function adjustLot(lot: PortalInventoryLot) {
    const available = Number(lot.availableQuantity || 0);
    const quantity = Number(window.prompt(`Cantidad a descontar. Disponible: ${formatQuantity(available)}`, ""));
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > available) return;
    if (!window.confirm(`Confirmar ajuste manual de ${formatQuantity(quantity)} unidades del lote ${lot.lotNumber || "sin numero"}.`)) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/app/inventory/lots/${lot.id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movementType: "manual_adjustment_out", quantity, reason: "Ajuste de inventario" })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || "No se pudo ajustar el lote.");
      setFeedback("Ajuste registrado.");
      await refreshData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo ajustar el lote.");
    } finally {
      setSaving(false);
    }
  }

  async function bulkWriteOff() {
    if (!bulkEligible) {
      setFeedback("La baja masiva solo permite lotes vencidos completos con stock disponible.");
      return;
    }
    const total = selectedLots.reduce((sum, lot) => sum + Number(lot.availableQuantity || 0), 0);
    if (!window.confirm(`Dar de baja completamente ${selectedLots.length} lotes vencidos (${formatQuantity(total)} unidades). No se borran lotes. Confirmar?`)) return;
    setSaving(true);
    try {
      const response = await fetch("/api/app/inventory/lots/bulk-writeoff-expired", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lotIds: selectedLots.map((lot) => lot.id), reason: "Producto vencido" })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || "No se pudo completar la baja masiva.");
      setSelectedLotIds([]);
      setFeedback(`Baja masiva registrada: ${json?.writtenOff?.length || selectedLots.length} lotes.`);
      await refreshData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo completar la baja masiva.");
    } finally {
      setSaving(false);
    }
  }

  async function saveThresholds() {
    const error = validateThresholds(draftThresholds);
    if (error) {
      setFeedback(error);
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/app/inventory/expiration-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expirationAlertThresholds: draftThresholds })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || "No se pudo guardar la configuracion.");
      setThresholds(json?.thresholds || draftThresholds);
      setFeedback("Configuracion de alertas actualizada.");
      await refreshData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo guardar la configuracion.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ClientPageShell
      title="Inventario por lotes"
      description="Alertas internas de vencimiento, stock comprometido y acciones trazables sobre mercaderia perecedera."
      badge="Inventario"
    >
      <section className="space-y-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Alertas</p>
          <h2 className="text-2xl font-semibold tracking-tight">Vencimientos</h2>
          <p className="text-sm text-muted">Primero vemos lo que requiere accion: vencidos, hoy y proximos {thresholds.urgentDays} dias.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          <ExpirationCard icon={TriangleAlert} label="Vencidos" value={activeSummary.expiredLots} helper={`${formatQuantity(activeSummary.unitsExpired)} unidades vencidas`} tone="danger" onClick={() => applyCard("expired")} />
          <ExpirationCard icon={CalendarClock} label="Vencen hoy" value={activeSummary.expiringTodayLots} helper="Revisar ahora" tone="warning" onClick={() => applyCard("today")} />
          <ExpirationCard icon={PackageCheck} label={`Vencen en ${thresholds.urgentDays} dias`} value={activeSummary.criticalLots + activeSummary.urgentLots} helper="Critico + urgente" tone="warning" onClick={() => applyCard("urgent")} />
          <ExpirationCard icon={Boxes} label={`Vencen en ${thresholds.upcomingDays} dias`} value={activeSummary.warningLots + activeSummary.upcomingLots} helper="Preventivo + proximo" onClick={() => applyCard("upcoming")} />
          <ExpirationCard icon={PackageCheck} label="Stock comprometido" value={formatQuantity(activeSummary.unitsAtRisk7Days)} helper={`${formatQuantity(activeSummary.unitsAtRisk7Days)} unidades vencidas o <= ${thresholds.urgentDays} dias`} tone="danger" onClick={() => applyCard("all")} />
        </div>
      </section>

      <Card className="mt-6 overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(8,18,28,0.96),rgba(7,13,21,0.96))]">
        <CardHeader
          action={
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="rounded-2xl" onClick={() => refreshData()} disabled={refreshing}>
                {refreshing ? "Actualizando..." : "Actualizar"}
              </Button>
              <Button type="button" className="rounded-2xl" onClick={bulkWriteOff} disabled={readOnly || saving || !bulkEligible}>
                Baja masiva vencidos
              </Button>
            </div>
          }
        >
          <div>
            <CardTitle>Lotes que requieren atencion</CardTitle>
            <CardDescription>Ordenado por vencidos, hoy, menor plazo, mayor stock y fecha de ingreso mas antigua.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-0">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto, SKU, lote, proveedor..." />
            </label>
            <select className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm" value={expirationStatus} onChange={(event) => applyCard(event.target.value)}>
              <option value="all">Todos los vencimientos</option>
              <option value="expired">Vencidos</option>
              <option value="today">Vencen hoy</option>
              <option value="critical">Criticos</option>
              <option value="urgent">Urgentes</option>
              <option value="warning">Preventivos</option>
              <option value="upcoming">Proximos</option>
              <option value="normal">Normal</option>
              <option value="no_expiration">Sin fecha</option>
            </select>
            <select className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}>
              <option value="with_stock">Con stock</option>
              <option value="without_stock">Sin stock</option>
              <option value="all">Todo stock</option>
            </select>
            <Button type="button" variant="secondary" className="rounded-2xl" onClick={() => setShowMoreFilters((current) => !current)}>
              <SlidersHorizontal className="mr-2 size-4" />
              Mas filtros
            </Button>
          </div>

          {showMoreFilters ? (
            <div className="grid gap-3 rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4 md:grid-cols-5">
              <Input value={warehouse} onChange={(event) => setWarehouse(event.target.value)} placeholder="Deposito" />
              <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Ubicacion" />
              <Input value={supplier} onChange={(event) => setSupplier(event.target.value)} placeholder="Proveedor" />
              <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
              <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </div>
          ) : null}

          {feedback ? <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-3 text-sm text-muted">{feedback}</div> : null}

          <div className="overflow-x-auto rounded-2xl border border-[color:var(--border)]">
            <table className="min-w-[1080px] w-full text-left text-sm">
              <thead className="bg-surface/70 text-xs uppercase tracking-[0.14em] text-muted">
                <tr>
                  <th className="px-4 py-3">Sel</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Lote</th>
                  <th className="px-4 py-3">Stock disponible</th>
                  <th className="px-4 py-3">Vencimiento</th>
                  <th className="px-4 py-3">Dias restantes</th>
                  <th className="px-4 py-3">Deposito</th>
                  <th className="px-4 py-3">Ubicacion</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleLots.length ? (
                  visibleLots.map((lot) => (
                    <tr key={lot.id} className="border-t border-[color:var(--border)]">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedLotIds.includes(lot.id)}
                          onChange={(event) =>
                            setSelectedLotIds((current) => (event.target.checked ? [...current, lot.id] : current.filter((id) => id !== lot.id)))
                          }
                          disabled={lot.expirationStatus !== "expired" || Number(lot.availableQuantity || 0) <= 0}
                          aria-label={`Seleccionar lote ${lot.lotNumber || lot.id}`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <Link href={`/app/catalog/${lot.productId}`} className="font-medium text-foreground hover:underline">
                          {lot.productName || "Producto"}
                        </Link>
                        <p className="mt-1 text-xs text-muted">{lot.productSku || "Sin SKU"}</p>
                      </td>
                      <td className="px-4 py-4">{lot.lotNumber || "Sin numero"}</td>
                      <td className="px-4 py-4 font-semibold">{formatQuantity(lot.availableQuantity)}</td>
                      <td className="px-4 py-4">{formatDate(lot.expiresAt)}</td>
                      <td className="px-4 py-4">{remainingDaysLabel(lot)}</td>
                      <td className="px-4 py-4 text-muted">{lot.warehouseName || "-"}</td>
                      <td className="px-4 py-4 text-muted">{lot.locationName || "-"}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={lot.status === "active" ? "success" : lot.status === "expired" ? "danger" : "muted"}>{statusLabel(lot.status)}</Badge>
                          <Badge variant={expirationVariant(lot.expirationStatus)}>{expirationDisplayLabel(lot)}</Badge>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="secondary" className="rounded-2xl" onClick={() => setSelectedLot(lot)}>
                            Ver lote
                          </Button>
                          <Button type="button" size="sm" variant="secondary" className="rounded-2xl" onClick={() => writeOffLot(lot)} disabled={readOnly || saving || Number(lot.availableQuantity || 0) <= 0}>
                            Dar de baja
                          </Button>
                          <Button type="button" size="sm" variant="secondary" className="rounded-2xl" onClick={() => adjustLot(lot)} disabled={readOnly || saving || Number(lot.availableQuantity || 0) <= 0}>
                            Ajustar stock
                          </Button>
                          <Link className="inline-flex items-center gap-1 rounded-2xl border border-[color:var(--border)] px-3 py-2 text-xs font-medium text-muted hover:text-text" href={`/app/catalog/${lot.productId}`}>
                            Ver producto <ArrowRight className="size-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted">
                      {readOnly ? "No hay lotes para consultar." : "No encontramos lotes con estos filtros. Proba limpiar la busqueda o revisar productos con inventario por lotes."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {selectedLot ? <LotDetailCard lot={selectedLot} onWriteOff={() => writeOffLot(selectedLot)} readOnly={readOnly || saving} /> : null}
        </CardContent>
      </Card>

      <Card className="mt-6 border-white/8 bg-card/90">
        <CardHeader action={<Settings2 className="size-5 text-muted" />}>
          <div>
            <CardTitle>Configuracion de alertas</CardTitle>
            <CardDescription>Avisarme cuando falten dias para el vencimiento. No se guardan estados temporales en la base.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid gap-3 md:grid-cols-4">
            <ThresholdInput label="Critico" value={draftThresholds.criticalDays} onChange={(value) => setDraftThresholds((current) => ({ ...current, criticalDays: value }))} />
            <ThresholdInput label="Urgente" value={draftThresholds.urgentDays} onChange={(value) => setDraftThresholds((current) => ({ ...current, urgentDays: value }))} />
            <ThresholdInput label="Preventivo" value={draftThresholds.warningDays} onChange={(value) => setDraftThresholds((current) => ({ ...current, warningDays: value }))} />
            <ThresholdInput label="Proximo vencimiento" value={draftThresholds.upcomingDays} onChange={(value) => setDraftThresholds((current) => ({ ...current, upcomingDays: value }))} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Actual: {thresholds.criticalDays} dias critico, {thresholds.urgentDays} urgente, {thresholds.warningDays} preventivo, {thresholds.upcomingDays} proximo.
            </p>
            <Button type="button" className="rounded-2xl" onClick={saveThresholds} disabled={readOnly || saving}>
              Guardar configuracion
            </Button>
          </div>
        </CardContent>
      </Card>
    </ClientPageShell>
  );
}

function ExpirationCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = "default",
  onClick
}: {
  icon: typeof Boxes;
  label: string;
  value: string | number;
  helper: string;
  tone?: "default" | "warning" | "danger";
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card className={cn("h-full border-white/8 bg-card/90 transition hover:-translate-y-0.5", tone === "warning" && "border-amber-400/25", tone === "danger" && "border-rose-400/25")}>
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
    </button>
  );
}

function LotDetailCard({ lot, onWriteOff, readOnly }: { lot: PortalInventoryLot; onWriteOff: () => void; readOnly: boolean }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Estado del vencimiento</p>
          <h3 className="mt-1 text-xl font-semibold">{stateTitle(lot.expirationStatus)}</h3>
          <p className="mt-1 text-sm text-muted">
            Lote {lot.lotNumber || "sin numero"} | {expirationDisplayLabel(lot)} | Disponible {formatQuantity(lot.availableQuantity)}
          </p>
        </div>
        <Button type="button" className="rounded-2xl" onClick={onWriteOff} disabled={readOnly || Number(lot.availableQuantity || 0) <= 0}>
          Dar de baja stock vencido
        </Button>
      </div>
    </div>
  );
}

function ThresholdInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
      <span className="text-xs uppercase tracking-[0.16em] text-muted">Avisarme cuando falten</span>
      <Input className="mt-2" type="number" min="0" max="365" step="1" value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <span className="mt-2 block text-sm text-muted">{label}</span>
    </label>
  );
}

function buildSummary(lots: PortalInventoryLot[]): PortalInventoryExpirationSummary {
  const stockLots = lots.filter((lot) => Number(lot.availableQuantity || 0) > 0 && !["cancelled", "depleted", "quarantined"].includes(lot.status));
  return {
    expiredLots: lots.filter((lot) => lot.expirationStatus === "expired").length,
    expiringTodayLots: lots.filter((lot) => lot.expirationStatus === "today").length,
    criticalLots: lots.filter((lot) => lot.expirationStatus === "critical").length,
    urgentLots: lots.filter((lot) => lot.expirationStatus === "urgent").length,
    warningLots: lots.filter((lot) => lot.expirationStatus === "warning").length,
    upcomingLots: lots.filter((lot) => lot.expirationStatus === "upcoming").length,
    unitsAtRisk7Days: stockLots.filter((lot) => ["expired", "today", "critical", "urgent"].includes(lot.expirationStatus)).reduce((sum, lot) => sum + Number(lot.availableQuantity || 0), 0),
    unitsExpired: stockLots.filter((lot) => lot.expirationStatus === "expired").reduce((sum, lot) => sum + Number(lot.availableQuantity || 0), 0),
    unitsAtRisk30Days: stockLots.filter((lot) => ["expired", "today", "critical", "urgent", "warning", "upcoming"].includes(lot.expirationStatus)).reduce((sum, lot) => sum + Number(lot.availableQuantity || 0), 0)
  };
}

function validateThresholds(value: PortalInventoryExpirationThresholds) {
  const values = [value.criticalDays, value.urgentDays, value.warningDays, value.upcomingDays];
  if (values.some((item) => !Number.isInteger(item) || item < 0 || item > 365)) return "Usa numeros enteros entre 0 y 365.";
  if (!(value.criticalDays <= value.urgentDays && value.urgentDays <= value.warningDays && value.warningDays <= value.upcomingDays)) {
    return "El orden debe ser critico <= urgente <= preventivo <= proximo.";
  }
  return null;
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 3 }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  return value ? value.slice(0, 10) : "Sin fecha";
}

function remainingDaysLabel(lot: PortalInventoryLot) {
  if (lot.daysUntilExpiration === null || lot.daysUntilExpiration === undefined) return "Sin fecha";
  if (lot.daysUntilExpiration === 0) return "0";
  return String(lot.daysUntilExpiration);
}

function expirationVariant(status: PortalInventoryLot["expirationStatus"]) {
  if (status === "expired") return "danger";
  if (["today", "critical", "urgent", "warning"].includes(status)) return "warning";
  if (status === "normal") return "success";
  return "outline";
}

function expirationDisplayLabel(lot: PortalInventoryLot) {
  if (lot.expirationLabel) return lot.expirationLabel;
  if (lot.expirationStatus === "no_expiration") return "Sin fecha de vencimiento";
  if (lot.daysUntilExpiration === 0) return "Vence hoy";
  if (lot.daysUntilExpiration === 1) return "Vence manana";
  if (typeof lot.daysUntilExpiration === "number" && lot.daysUntilExpiration > 1) return `Vence en ${lot.daysUntilExpiration} dias`;
  if (lot.daysUntilExpiration === -1) return "Vencido hace 1 dia";
  if (typeof lot.daysUntilExpiration === "number" && lot.daysUntilExpiration < -1) return `Vencido hace ${Math.abs(lot.daysUntilExpiration)} dias`;
  return stateTitle(lot.expirationStatus);
}

function stateTitle(status: PortalInventoryLot["expirationStatus"]) {
  const labels: Record<PortalInventoryLot["expirationStatus"], string> = {
    expired: "Vencido",
    today: "Hoy",
    critical: "Critico",
    urgent: "Urgente",
    warning: "Preventivo",
    upcoming: "Proximo",
    normal: "Normal",
    no_expiration: "Sin fecha"
  };
  return labels[status] || status;
}

function statusLabel(status: PortalInventoryLot["status"]) {
  const labels = {
    active: "Activo",
    depleted: "Agotado",
    expired: "Vencido",
    quarantined: "Cuarentena",
    cancelled: "Cancelado"
  };
  return labels[status] || status;
}
