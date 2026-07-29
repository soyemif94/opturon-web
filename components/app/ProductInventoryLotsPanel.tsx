"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type PortalInventoryLocation, type PortalInventoryLot, type PortalInventoryLotHistoryEntry, type PortalProduct } from "@/lib/api";
import { buildLotExpirationPayload, buildLotMutationPayload, buildLotWriteoffPayload, createLotMutationAttemptKey, getLotActionAvailability, getLotActorName, getLotHistoryLabel, sanitizeLotMutationError } from "@/lib/inventory-lot-ui";

type LotDraft = {
  lotNumber: string;
  supplierName: string;
  quantity: string;
  unitCost: string;
  expiresAt: string;
  warehouseName: string;
  locationName: string;
  locationId: string;
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
  locationId: "",
  notes: ""
};

export function ProductInventoryLotsPanel({
  product,
  initialLots,
  readOnly = false,
  canManageReceipts = false,
  canManageSensitive = false
}: {
  product: PortalProduct;
  initialLots: PortalInventoryLot[];
  readOnly?: boolean;
  canManageReceipts?: boolean;
  canManageSensitive?: boolean;
}) {
  const [lots, setLots] = useState(initialLots);
  const [lotHistoryById, setLotHistoryById] = useState<Record<string, PortalInventoryLotHistoryEntry[]>>({});
  const [locations, setLocations] = useState<PortalInventoryLocation[]>([]);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lotDialog, setLotDialog] = useState<
    | null
    | {
        kind: "block" | "unblock" | "expiration";
        lot: PortalInventoryLot;
        reason: string;
        expiresAt: string;
        error: string | null;
      }
  >(null);
  const [busyLotAction, setBusyLotAction] = useState<string | null>(null);
  const [writeoffDialog, setWriteoffDialog] = useState<
    | null
    | {
        lot: PortalInventoryLot;
        reason: string;
        error: string | null;
      }
  >(null);

  useEffect(() => {
    void fetchLocations();
  }, []);

  const summary = useMemo(() => {
    const activeLots = lots.filter((lot) => lot.status === "active");
    const available = activeLots.reduce((sum, lot) => sum + Number((lot.availableCommercialQuantity ?? lot.availableQuantity) || 0), 0);
    const physical = lots.reduce((sum, lot) => sum + Number((lot.physicalQuantity ?? lot.availableQuantity) || 0), 0);
    const committed = lots.reduce((sum, lot) => sum + Number(lot.committedQuantity || 0), 0);
    const expiring = lots.filter((lot) => ["expired", "critical", "urgent", "warning"].includes(lot.expirationStatus)).length;
    const datedLots = lots.filter((lot) => lot.expiresAt);
    const nextExpiration = datedLots
      .filter((lot) => typeof lot.daysUntilExpiration === "number" && lot.daysUntilExpiration >= 0)
      .sort((a, b) => Number(a.daysUntilExpiration || 0) - Number(b.daysUntilExpiration || 0))[0];
    return { activeLots: activeLots.length, available, physical, committed, expiring, nextExpiration, datedLots: datedLots.length };
  }, [lots]);

  async function fetchLocations() {
    const response = await fetch("/api/app/inventory/locations", { cache: "no-store" });
    const json = await response.json().catch(() => null);
    if (response.ok && Array.isArray(json?.locations)) {
      setLocations(json.locations);
      const primary = json.locations.find((location: PortalInventoryLocation) => location.isPrimary) || json.locations[0] || null;
      setDraft((current) => ({ ...current, locationId: current.locationId || primary?.id || "" }));
    }
  }

  async function refreshLots() {
    const response = await fetch(`/api/app/inventory/lots?productId=${product.id}&pageSize=100`, { cache: "no-store" });
    const json = await response.json().catch(() => null);
    if (response.ok && Array.isArray(json?.lots)) setLots(json.lots);
  }

  async function refreshLotHistory(lotId: string) {
    const response = await fetch(`/api/app/inventory/lots/${lotId}/history?pageSize=20&offset=0`, { cache: "no-store" });
    const json = await response.json().catch(() => null);
    if (response.ok && Array.isArray(json?.history)) {
      setLotHistoryById((current) => ({ ...current, [lotId]: json.history }));
    }
  }

  async function activateLotMode() {
    const legacyStock = Number(product.stock || 0);
    if (legacyStock > 0) {
      setFeedback("Este producto tiene stock general. Antes de activar lotes, debe distribuirse ese stock en lotes.");
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/app/products/${product.id}/inventory-mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "lot_based" })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        if (json?.error === "inventory_lot_conversion_required") {
          throw new Error("Este producto tiene stock general. Antes de activar lotes, debe distribuirse ese stock en lotes.");
        }
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

  async function createLocation() {
    const name = window.prompt("Nombre de la ubicacion", "");
    if (!name) return;
    const type = (window.prompt("Tipo: main, warehouse, shelf, other", "shelf") || "shelf") as PortalInventoryLocation["type"];
    setSaving(true);
    try {
      const response = await fetch("/api/app/inventory/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || "No se pudo crear la ubicacion.");
      setFeedback("Ubicacion creada.");
      await fetchLocations();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo crear la ubicacion.");
    } finally {
      setSaving(false);
    }
  }

  async function createLot() {
    const quantity = Number(draft.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setFeedback("La cantidad debe ser mayor a cero.");
      return;
    }
    if (!draft.locationId) {
      setFeedback("Selecciona una ubicacion real para el lote.");
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
          locationId: draft.locationId,
          lotNumber: draft.lotNumber || null,
          supplierName: draft.supplierName || null,
          quantity,
          unitCost: draft.unitCost ? Number(draft.unitCost) : null,
          expiresAt: draft.expiresAt || null,
          warehouseName: draft.warehouseName || null,
          locationName: draft.locationName || null,
          notes: draft.notes || null,
          idempotencyKey: `lot-receipt:${product.id}:${draft.locationId}:${draft.lotNumber}:${draft.expiresAt}:${quantity}`
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || "No se pudo crear el lote.");
      setDraft((current) => ({ ...EMPTY_DRAFT, locationId: current.locationId }));
      setFeedback("Ingreso registrado con movimiento de compra.");
      await refreshLots();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo crear el lote.");
    } finally {
      setSaving(false);
    }
  }

  async function adjustLot(lot: PortalInventoryLot, movementType: "manual_adjustment_out") {
    const available = Number(lot.availableQuantity || 0);
    const raw = window.prompt("Cantidad a descontar", "");
    const quantity = Number(raw);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > available) return;
    const defaultReason = "Ajuste de inventario";
    const reason = window.prompt("Motivo", defaultReason) || defaultReason;

    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/app/inventory/lots/${lot.id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movementType,
          quantity,
          reason,
          idempotencyKey: `lot-adjust:${lot.id}:${movementType}:${quantity}:${reason}`
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

  function openWriteoffDialog(lot: PortalInventoryLot) {
    setWriteoffDialog({ lot, reason: "", error: null });
  }

  function openBlockDialog(lot: PortalInventoryLot) {
    setLotDialog({ kind: "block", lot, reason: "", expiresAt: lot.expiresAt || "", error: null });
  }

  function openUnblockDialog(lot: PortalInventoryLot) {
    setLotDialog({ kind: "unblock", lot, reason: "Liberado para uso", expiresAt: lot.expiresAt || "", error: null });
  }

  function openExpirationDialog(lot: PortalInventoryLot) {
    setLotDialog({ kind: "expiration", lot, reason: "Correccion operativa", expiresAt: lot.expiresAt || "", error: null });
  }

  async function confirmLotDialogAction() {
    if (!lotDialog) return;

    const nextReason = lotDialog.reason.trim();
    const nextExpiresAt = lotDialog.expiresAt.trim();
    if ((lotDialog.kind === "block" || lotDialog.kind === "expiration") && !nextReason) {
      setLotDialog((current) => (current ? { ...current, error: "El motivo es obligatorio." } : current));
      return;
    }
    if (lotDialog.kind === "expiration" && !nextExpiresAt) {
      setLotDialog((current) => (current ? { ...current, error: "La nueva fecha de vencimiento es obligatoria." } : current));
      return;
    }

    const payload =
      lotDialog.kind === "expiration"
        ? buildLotExpirationPayload(lotDialog.lot.id, nextExpiresAt, nextReason, createLotMutationAttemptKey())
        : buildLotMutationPayload(lotDialog.kind, lotDialog.lot.id, nextReason, createLotMutationAttemptKey());
    const actionKey = `${lotDialog.kind}:${lotDialog.lot.id}`;
    setBusyLotAction(actionKey);
    setFeedback(null);
    setLotDialog((current) => (current ? { ...current, error: null } : current));

    try {
      const response = await fetch(`/api/app/inventory/lots/${lotDialog.lot.id}/${lotDialog.kind === "expiration" ? "expiration" : lotDialog.kind}`, {
        method: lotDialog.kind === "expiration" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          sanitizeLotMutationError(
            json?.error || null,
            lotDialog.kind === "block"
              ? "No se pudo bloquear el lote."
              : lotDialog.kind === "unblock"
                ? "No se pudo desbloquear el lote."
                : "No se pudo actualizar el vencimiento."
          )
        );
      }
      await Promise.all([refreshLots(), refreshLotHistory(lotDialog.lot.id)]);
      setFeedback(
        lotDialog.kind === "block"
          ? "Lote bloqueado."
          : lotDialog.kind === "unblock"
            ? "Lote desbloqueado."
            : "Vencimiento actualizado."
      );
      setLotDialog(null);
    } catch (error) {
      setLotDialog((current) => (
        current
          ? {
              ...current,
              error:
                error instanceof Error
                  ? error.message
                  : current.kind === "block"
                    ? "No se pudo bloquear el lote."
                    : current.kind === "unblock"
                      ? "No se pudo desbloquear el lote."
                      : "No se pudo actualizar el vencimiento."
            }
          : current
      ));
    } finally {
      setBusyLotAction(null);
    }
  }

  async function confirmWriteoffAction() {
    if (!writeoffDialog) return;

    const nextReason = writeoffDialog.reason.trim();
    if (!nextReason) {
      setWriteoffDialog((current) => (current ? { ...current, error: "El motivo es obligatorio." } : current));
      return;
    }

    const available = Number(writeoffDialog.lot.availableQuantity || 0);
    if (!Number.isFinite(available) || available <= 0) {
      setWriteoffDialog((current) => (current ? { ...current, error: "El lote no tiene stock disponible para dar de baja." } : current));
      return;
    }

    const payload = buildLotWriteoffPayload(writeoffDialog.lot.id, available, nextReason, createLotMutationAttemptKey());
    const actionKey = `manualWriteoff:${writeoffDialog.lot.id}`;
    setBusyLotAction(actionKey);
    setFeedback(null);
    setWriteoffDialog((current) => (current ? { ...current, error: null } : current));

    try {
      const response = await fetch(`/api/app/inventory/lots/${writeoffDialog.lot.id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(sanitizeLotMutationError(json?.error || null, "No se pudo dar de baja el lote."));
      }
      await Promise.all([refreshLots(), refreshLotHistory(writeoffDialog.lot.id)]);
      setFeedback("Baja manual registrada.");
      setWriteoffDialog(null);
    } catch (error) {
      setWriteoffDialog((current) => (
        current
          ? {
              ...current,
              error: error instanceof Error ? error.message : "No se pudo dar de baja el lote."
            }
          : current
      ));
    } finally {
      setBusyLotAction(null);
    }
  }

  return (
    <>
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
            <CardDescription>El producto conserva su maestro comercial; la disponibilidad operativa vive en lotes, ubicaciones y movimientos.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-0">
          <div className="grid gap-3 md:grid-cols-4">
            <SummaryPill label="Disponible" value={formatQuantity(summary.available)} />
            <SummaryPill label="Fisico" value={formatQuantity(summary.physical)} />
            <SummaryPill label="Comprometido" value={formatQuantity(summary.committed)} />
            <SummaryPill label="Lotes activos" value={String(summary.activeLots)} />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <SummaryPill label="Alertas vencimiento" value={String(summary.expiring)} />
            <SummaryPill label="Proximo vencimiento" value={summary.nextExpiration ? expirationDisplayLabel(summary.nextExpiration) : "Sin proximos"} />
            <SummaryPill label="Ubicaciones activas" value={String(locations.filter((location) => location.active).length)} />
          </div>

          <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">Ubicaciones</p>
                <p className="text-xs text-muted">Cada lote nuevo debe quedar en una ubicacion real del tenant.</p>
              </div>
              {canManageSensitive ? (
                <Button type="button" size="sm" variant="secondary" className="rounded-2xl" onClick={createLocation} disabled={readOnly || saving}>
                  Crear ubicacion
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {locations.length ? locations.map((location) => <Badge key={location.id} variant={location.active ? "outline" : "muted"}>{location.name}</Badge>) : <p className="text-sm text-muted">No hay ubicaciones cargadas.</p>}
            </div>
          </div>
          {canManageReceipts ? (
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
                <Input value={draft.lotNumber} onChange={(event) => setDraft((current) => ({ ...current, lotNumber: event.target.value }))} placeholder="Lote" disabled={readOnly || saving || !canManageReceipts} />
                <Input value={draft.supplierName} onChange={(event) => setDraft((current) => ({ ...current, supplierName: event.target.value }))} placeholder="Proveedor" disabled={readOnly || saving || !canManageReceipts} />
                <Input type="number" min="0" step="0.001" value={draft.quantity} onChange={(event) => setDraft((current) => ({ ...current, quantity: event.target.value }))} placeholder="Cantidad" disabled={readOnly || saving || !canManageReceipts} />
                <Input type="number" min="0" step="0.01" value={draft.unitCost} onChange={(event) => setDraft((current) => ({ ...current, unitCost: event.target.value }))} placeholder="Costo unitario" disabled={readOnly || saving || !canManageReceipts} />
                <Input type="date" value={draft.expiresAt} onChange={(event) => setDraft((current) => ({ ...current, expiresAt: event.target.value }))} disabled={readOnly || saving || !canManageReceipts} />
                <select className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm" value={draft.locationId} onChange={(event) => setDraft((current) => ({ ...current, locationId: event.target.value }))} disabled={readOnly || saving || !canManageReceipts}>
                  <option value="">Seleccionar ubicacion</option>
                  {locations.filter((location) => location.active).map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </select>
                <Input value={draft.warehouseName} onChange={(event) => setDraft((current) => ({ ...current, warehouseName: event.target.value }))} placeholder="Deposito legacy opcional" disabled={readOnly || saving || !canManageReceipts} />
                <Input value={draft.locationName} onChange={(event) => setDraft((current) => ({ ...current, locationName: event.target.value }))} placeholder="Texto legacy opcional" disabled={readOnly || saving || !canManageReceipts} />
                <Textarea className="min-h-10 md:col-span-4" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Notas" disabled={readOnly || saving || !canManageReceipts} />
              </div>
            </div>
          ) : null}

          {feedback ? <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-3 text-sm text-muted">{feedback}</div> : null}

          <div className="space-y-3">
            {lots.length ? (
              lots.map((lot) => {
                const actionState = getLotActionAvailability(lot, { readOnly, canManageSensitive });
                const lotActor = getLotActorName(lot);
                return (
                  <div key={lot.id} className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">Lote {lot.lotNumber || "sin numero"}</p>
                        <p className="mt-1 text-xs text-muted">
                          {lot.locationName || "Ubicacion historica"} | vence {lot.expiresAt || "sin fecha"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={actionState.statusVariant}>{actionState.statusLabel}</Badge>
                        <Badge variant={lot.expirationStatus === "expired" ? "danger" : ["today", "critical", "urgent", "warning"].includes(lot.expirationStatus) ? "warning" : "outline"}>{stateTitle(lot.expirationStatus)}</Badge>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-muted">
                      <p>
                        Disponible <span className="font-semibold text-foreground">{formatQuantity(Number((lot.availableCommercialQuantity ?? lot.availableQuantity) || 0))}</span>
                        {" | "}Fisico {formatQuantity(Number((lot.physicalQuantity ?? lot.availableQuantity) || 0))}
                        {" | "}Comprometido {formatQuantity(Number(lot.committedQuantity || 0))}
                      </p>
                      {lot.status === "blocked" ? (
                        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3">
                          <p className="font-medium text-foreground">Estado Bloqueado</p>
                          <p className="mt-1">Motivo: {lot.blockReason || "Sin motivo informado"}</p>
                          {lot.blockedAt ? <p className="mt-1">Fecha: {formatDateTime(lot.blockedAt)}</p> : null}
                          {lotActor ? <p className="mt-1">Actor: {lotActor}</p> : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {actionState.canBlock ? (
                        <Button type="button" size="sm" variant="secondary" className="rounded-2xl" onClick={() => openBlockDialog(lot)} disabled={readOnly || saving || busyLotAction !== null}>
                          Bloquear lote
                        </Button>
                      ) : null}
                      {actionState.canUnblock ? (
                        <Button type="button" size="sm" variant="secondary" className="rounded-2xl" onClick={() => openUnblockDialog(lot)} disabled={readOnly || saving || busyLotAction !== null}>
                          Desbloquear lote
                        </Button>
                      ) : null}
                      {actionState.canEditExpiration ? (
                        <Button type="button" size="sm" variant="secondary" className="rounded-2xl" onClick={() => openExpirationDialog(lot)} disabled={readOnly || saving || busyLotAction !== null}>
                          Editar vencimiento
                        </Button>
                      ) : null}
                      {actionState.canAdjustOut ? (
                        <Button type="button" size="sm" variant="secondary" className="rounded-2xl" onClick={() => adjustLot(lot, "manual_adjustment_out")} disabled={readOnly || saving || busyLotAction !== null || Number(lot.availableQuantity || 0) <= 0}>
                          Ajustar salida
                        </Button>
                      ) : null}
                      {actionState.canWriteOff ? (
                        <Button type="button" size="sm" variant="secondary" className="rounded-2xl" onClick={() => openWriteoffDialog(lot)} disabled={readOnly || saving || busyLotAction !== null || Number(lot.availableQuantity || 0) <= 0}>
                          Dar de baja
                          <span className="sr-only">Dar de baja manualmente el lote</span>
                        </Button>
                      ) : null}
                      <Button type="button" size="sm" variant="ghost" className="rounded-2xl" onClick={() => void refreshLotHistory(lot.id)} disabled={saving || busyLotAction !== null}>
                        Ver historial
                      </Button>
                    </div>
                    {lotHistoryById[lot.id]?.length ? (
                      <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-bg/40 p-3">
                        <p className="text-sm font-medium text-foreground">Historial reciente</p>
                        <div className="mt-2 space-y-2 text-sm text-muted">
                          {lotHistoryById[lot.id].slice(0, 3).map((entry) => (
                            <div key={entry.id} className="rounded-xl border border-[color:var(--border)] bg-surface/40 p-2">
                              <p className="font-medium text-foreground">{getLotHistoryLabel(entry)}</p>
                              <p className="mt-1">
                                {formatDateTime(entry.createdAt)}
                                {entry.createdBy ? ` | ${entry.createdBy}` : ""}
                              </p>
                              {entry.reason ? <p className="mt-1">Motivo: {entry.reason}</p> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-6 text-center text-sm text-muted">
                Todavia no hay lotes para este producto.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(lotDialog)} onOpenChange={(open) => (!open ? setLotDialog(null) : null)}>
        <DialogContent className="max-w-xl rounded-[28px] border-white/10 bg-[linear-gradient(180deg,rgba(10,18,30,0.98),rgba(8,14,23,0.98))]">
          <DialogHeader>
            <DialogTitle>
              {lotDialog?.kind === "block"
                ? "Bloquear lote"
                : lotDialog?.kind === "unblock"
                  ? "Desbloquear lote"
                  : "Editar vencimiento"}
            </DialogTitle>
            <DialogDescription>
              {lotDialog?.kind === "block"
                ? "El stock fisico se conserva, pero dejara de estar disponible para venta."
                : lotDialog?.kind === "unblock"
                  ? "El lote volvera a estar disponible si no esta vencido ni agotado."
                  : "Actualiza la fecha de vencimiento usando el contrato operativo existente de inventario por lotes."}
            </DialogDescription>
          </DialogHeader>
          {lotDialog?.kind === "block" ? (
            <label className="block space-y-2 text-sm">
              <span className="font-medium">Motivo</span>
              <Textarea
                autoFocus
                className="min-h-[120px]"
                value={lotDialog.reason}
                onChange={(event) => setLotDialog((current) => (current ? { ...current, reason: event.target.value, error: null } : current))}
                placeholder="Ej. Producto danado, control de calidad o retiro preventivo"
                disabled={busyLotAction !== null}
                aria-invalid={lotDialog.error ? true : false}
                aria-describedby={lotDialog.error ? "lot-dialog-error" : undefined}
              />
            </label>
          ) : lotDialog?.kind === "expiration" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4 text-sm text-muted">
                <p>Lote {lotDialog.lot.lotNumber || "sin numero"}</p>
                <p className="mt-1">Vencimiento actual: {lotDialog.lot.expiresAt || "Sin fecha"}</p>
              </div>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Nueva fecha de vencimiento</span>
                <Input
                  autoFocus
                  type="date"
                  value={lotDialog.expiresAt}
                  onChange={(event) => setLotDialog((current) => (current ? { ...current, expiresAt: event.target.value, error: null } : current))}
                  disabled={busyLotAction !== null}
                  aria-invalid={lotDialog.error ? true : false}
                  aria-describedby={lotDialog.error ? "lot-dialog-error" : undefined}
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Motivo</span>
                <Textarea
                  className="min-h-[120px]"
                  value={lotDialog.reason}
                  onChange={(event) => setLotDialog((current) => (current ? { ...current, reason: event.target.value, error: null } : current))}
                  placeholder="Ej. Correccion operativa, ajuste de proveedor o regularizacion interna"
                  disabled={busyLotAction !== null}
                />
              </label>
            </div>
          ) : (
            <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4 text-sm text-muted">
              <p>Lote {lotDialog?.lot.lotNumber || "sin numero"}</p>
              <p className="mt-1">Estado actual: {lotDialog?.lot.status}</p>
            </div>
          )}
          {lotDialog?.error ? (
            <div id="lot-dialog-error" className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">
              {lotDialog.error}
            </div>
          ) : null}
          <DialogFooter className="flex-col-reverse sm:flex-row sm:flex-wrap">
            <Button type="button" variant="ghost" onClick={() => setLotDialog(null)} disabled={busyLotAction !== null}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void confirmLotDialogAction()} disabled={busyLotAction !== null}>
              {busyLotAction !== null
                ? "Procesando..."
                : lotDialog?.kind === "block"
                  ? "Confirmar bloqueo"
                  : lotDialog?.kind === "unblock"
                    ? "Confirmar desbloqueo"
                    : "Guardar vencimiento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(writeoffDialog)} onOpenChange={(open) => (!open ? setWriteoffDialog(null) : null)}>
        <DialogContent className="max-w-xl rounded-[28px] border-white/10 bg-[linear-gradient(180deg,rgba(10,18,30,0.98),rgba(8,14,23,0.98))]">
          <DialogHeader>
            <DialogTitle>Dar de baja lote</DialogTitle>
            <DialogDescription>Registra una baja manual general para este lote sin marcarlo como vencido.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4 text-sm text-muted">
              <p>Lote {writeoffDialog?.lot.lotNumber || "sin numero"}</p>
              <p className="mt-1">Cantidad a dar de baja: {formatQuantity(Number(writeoffDialog?.lot.availableQuantity || 0))}</p>
              <p className="mt-1">Vencimiento actual: {writeoffDialog?.lot.expiresAt || "Sin fecha"}</p>
            </div>
            <label className="block space-y-2 text-sm">
              <span className="font-medium">Motivo</span>
              <Textarea
                autoFocus
                className="min-h-[120px]"
                value={writeoffDialog?.reason || ""}
                onChange={(event) => setWriteoffDialog((current) => (current ? { ...current, reason: event.target.value, error: null } : current))}
                placeholder="Ej. Cierre QA D3, rotura, merma o retiro preventivo"
                disabled={busyLotAction !== null}
                aria-invalid={writeoffDialog?.error ? true : false}
                aria-describedby={writeoffDialog?.error ? "lot-writeoff-error" : undefined}
              />
            </label>
          </div>
          {writeoffDialog?.error ? (
            <div id="lot-writeoff-error" className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">
              {writeoffDialog.error}
            </div>
          ) : null}
          <DialogFooter className="flex-col-reverse sm:flex-row sm:flex-wrap">
            <Button type="button" variant="ghost" onClick={() => setWriteoffDialog(null)} disabled={busyLotAction !== null}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void confirmWriteoffAction()} disabled={busyLotAction !== null}>
              {busyLotAction !== null ? "Procesando..." : "Confirmar baja manual"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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

function formatDateTime(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
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
