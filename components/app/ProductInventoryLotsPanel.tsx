"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type PortalInventoryLot, type PortalProduct } from "@/lib/api";

type LotDraft = {
  lotNumber: string;
  supplierName: string;
  quantity: string;
  unitCost: string;
  expiresAt: string;
  warehouseName: string;
  locationName: string;
  notes: string;
};

const EMPTY_DRAFT: LotDraft = {
  lotNumber: "",
  supplierName: "",
  quantity: "",
  unitCost: "",
  expiresAt: "",
  warehouseName: "",
  locationName: "",
  notes: ""
};

export function ProductInventoryLotsPanel({
  product,
  initialLots,
  readOnly = false
}: {
  product: PortalProduct;
  initialLots: PortalInventoryLot[];
  readOnly?: boolean;
}) {
  const [lots, setLots] = useState(initialLots);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const summary = useMemo(() => {
    const activeLots = lots.filter((lot) => lot.status === "active");
    const available = activeLots.reduce((sum, lot) => sum + Number(lot.availableQuantity || 0), 0);
    const expiring = lots.filter((lot) => ["expired", "critical", "urgent", "warning"].includes(lot.expirationStatus)).length;
    return { activeLots: activeLots.length, available, expiring };
  }, [lots]);

  async function refreshLots() {
    const response = await fetch(`/api/app/inventory/lots?productId=${product.id}&pageSize=100`, { cache: "no-store" });
    const json = await response.json().catch(() => null);
    if (response.ok && Array.isArray(json?.lots)) setLots(json.lots);
  }

  async function activateLotMode() {
    const legacyStock = Number(product.stock || 0);
    if (legacyStock > 0) {
      const confirmed = window.confirm(
        `Este producto tiene ${formatQuantity(legacyStock)} unidades en stock simple. Se creara un lote INICIAL por esa cantidad para no perder stock.`
      );
      if (!confirmed) return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/app/products/${product.id}/inventory-mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "lot_based",
          initialLot:
            legacyStock > 0
              ? {
                  quantity: legacyStock,
                  lotNumber: "INICIAL",
                  receivedAt: new Date().toISOString(),
                  notes: "Lote inicial creado al activar inventario por lotes."
                }
              : undefined
        })
      });
      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(json?.error || "No se pudo activar inventario por lotes.");
      }
      setFeedback("Inventario por lotes activado. El stock visible se sincroniza desde lotes activos.");
      await refreshLots();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo activar inventario por lotes.");
    } finally {
      setSaving(false);
    }
  }

  async function createLot() {
    const quantity = Number(draft.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      setFeedback("La cantidad debe ser cero o mayor.");
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/app/inventory/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          lotNumber: draft.lotNumber || null,
          supplierName: draft.supplierName || null,
          quantity,
          unitCost: draft.unitCost ? Number(draft.unitCost) : null,
          expiresAt: draft.expiresAt || null,
          warehouseName: draft.warehouseName || null,
          locationName: draft.locationName || null,
          notes: draft.notes || null
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || "No se pudo crear el lote.");
      setDraft(EMPTY_DRAFT);
      setFeedback("Ingreso registrado con movimiento de compra.");
      await refreshLots();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo crear el lote.");
    } finally {
      setSaving(false);
    }
  }

  async function adjustLot(lot: PortalInventoryLot, movementType: "manual_adjustment_out" | "expired_writeoff") {
    const raw = window.prompt(movementType === "expired_writeoff" ? "Cantidad a dar de baja por vencimiento" : "Cantidad a descontar");
    const quantity = Number(raw);
    if (!Number.isFinite(quantity) || quantity <= 0) return;

    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/app/inventory/lots/${lot.id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movementType,
          quantity,
          reason: movementType === "expired_writeoff" ? "Baja por vencimiento" : "Ajuste manual"
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || "No se pudo ajustar el lote.");
      setFeedback("Movimiento registrado.");
      await refreshLots();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo ajustar el lote.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-white/6 bg-card/90">
      <CardHeader
        action={
          product.inventoryTrackingMode === "lot_based" ? (
            <Badge variant="success">lot_based</Badge>
          ) : (
            <Button type="button" size="sm" className="rounded-2xl" onClick={activateLotMode} disabled={readOnly || saving}>
              Activar lotes
            </Button>
          )
        }
      >
        <div>
          <CardTitle>Inventario por lotes</CardTitle>
          <CardDescription>El producto conserva su maestro comercial; la disponibilidad operativa vive en lotes y movimientos.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        <div className="grid gap-3 md:grid-cols-3">
          <SummaryPill label="Disponible activo" value={formatQuantity(summary.available)} />
          <SummaryPill label="Lotes activos" value={String(summary.activeLots)} />
          <SummaryPill label="Alertas vencimiento" value={String(summary.expiring)} />
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Agregar ingreso</p>
              <p className="text-xs text-muted">Registra un lote y su movimiento inicial sin tocar productos legacy.</p>
            </div>
            <Button type="button" size="sm" className="rounded-2xl" onClick={createLot} disabled={readOnly || saving}>
              Guardar ingreso
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <Input value={draft.lotNumber} onChange={(event) => setDraft((current) => ({ ...current, lotNumber: event.target.value }))} placeholder="Lote" disabled={readOnly || saving} />
            <Input value={draft.supplierName} onChange={(event) => setDraft((current) => ({ ...current, supplierName: event.target.value }))} placeholder="Proveedor" disabled={readOnly || saving} />
            <Input type="number" min="0" step="0.001" value={draft.quantity} onChange={(event) => setDraft((current) => ({ ...current, quantity: event.target.value }))} placeholder="Cantidad" disabled={readOnly || saving} />
            <Input type="number" min="0" step="0.01" value={draft.unitCost} onChange={(event) => setDraft((current) => ({ ...current, unitCost: event.target.value }))} placeholder="Costo unitario" disabled={readOnly || saving} />
            <Input type="date" value={draft.expiresAt} onChange={(event) => setDraft((current) => ({ ...current, expiresAt: event.target.value }))} disabled={readOnly || saving} />
            <Input value={draft.warehouseName} onChange={(event) => setDraft((current) => ({ ...current, warehouseName: event.target.value }))} placeholder="Deposito" disabled={readOnly || saving} />
            <Input value={draft.locationName} onChange={(event) => setDraft((current) => ({ ...current, locationName: event.target.value }))} placeholder="Ubicacion" disabled={readOnly || saving} />
            <Textarea className="min-h-10 md:col-span-4" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Notas" disabled={readOnly || saving} />
          </div>
        </div>

        {feedback ? <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-3 text-sm text-muted">{feedback}</div> : null}

        <div className="space-y-3">
          {lots.length ? (
            lots.map((lot) => (
              <div key={lot.id} className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">Lote {lot.lotNumber || "sin numero"}</p>
                    <p className="mt-1 text-xs text-muted">
                      {lot.supplierName || "Sin proveedor"} | {lot.warehouseName || "Sin deposito"} | vence {lot.expiresAt || "sin fecha"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={lot.status === "active" ? "success" : lot.status === "expired" ? "danger" : "muted"}>{lot.status}</Badge>
                    <Badge variant={lot.expirationStatus === "expired" ? "danger" : ["critical", "urgent", "warning"].includes(lot.expirationStatus) ? "warning" : "outline"}>{lot.expirationStatus}</Badge>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted">
                    Disponible <span className="font-semibold text-foreground">{formatQuantity(lot.availableQuantity)}</span> de {formatQuantity(lot.initialQuantity)}
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="secondary" className="rounded-2xl" onClick={() => adjustLot(lot, "manual_adjustment_out")} disabled={readOnly || saving || lot.availableQuantity <= 0}>
                      Ajustar salida
                    </Button>
                    <Button type="button" size="sm" variant="secondary" className="rounded-2xl" onClick={() => adjustLot(lot, "expired_writeoff")} disabled={readOnly || saving || lot.availableQuantity <= 0}>
                      Baja vencido
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-6 text-center text-sm text-muted">
              Todavia no hay lotes para este producto.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 3 }).format(Number(value || 0));
}
