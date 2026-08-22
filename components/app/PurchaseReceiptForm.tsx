"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { InventorySectionNav } from "@/components/app/InventorySectionNav";
import {
  buildInitialPurchaseReceiptDraft,
  createEmptyPurchaseReceiptLine,
  ensurePurchaseReceiptAttemptKey,
  mapPurchaseReceiptError,
  normalizeActiveLocations,
  normalizeActiveSuppliers,
  normalizeReceiptProducts,
  validatePurchaseReceiptDraft,
  type PurchaseReceiptFormDraft,
  type PurchaseReceiptLineDraft
} from "@/components/app/purchase-receipt-form.helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { PortalInventoryLocation, PortalProduct, PortalSupplier } from "@/lib/api";

export function PurchaseReceiptForm({
  initialSuppliers,
  initialLocations,
  initialProducts,
  canCreate = false,
  readOnly = false
}: {
  initialSuppliers: PortalSupplier[];
  initialLocations: PortalInventoryLocation[];
  initialProducts: PortalProduct[];
  canCreate?: boolean;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const suppliers = useMemo(() => normalizeActiveSuppliers(initialSuppliers), [initialSuppliers]);
  const locations = useMemo(() => normalizeActiveLocations(initialLocations), [initialLocations]);
  const products = useMemo(() => normalizeReceiptProducts(initialProducts), [initialProducts]);
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const [draft, setDraft] = useState<PurchaseReceiptFormDraft>(() =>
    buildInitialPurchaseReceiptDraft({
      locationId: locations[0]?.id || ""
    })
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateLine(key: string, patch: Partial<PurchaseReceiptLineDraft>) {
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line) => {
        if (line.key !== key) return line;
        const nextLine = { ...line, ...patch };
        const product = productMap.get(nextLine.productId);
        if (product?.inventoryTrackingMode !== "lot_based") {
          nextLine.lotNumber = "";
          nextLine.expiresAt = "";
        }
        return nextLine;
      })
    }));
  }

  function removeLine(key: string) {
    setDraft((current) => {
      const remaining = current.lines.filter((line) => line.key !== key);
      return {
        ...current,
        lines: remaining.length > 0 ? remaining : [createEmptyPurchaseReceiptLine()]
      };
    });
  }

  function addLine() {
    setDraft((current) => ({
      ...current,
      lines: [...current.lines, createEmptyPurchaseReceiptLine()]
    }));
  }

  async function submit() {
    if (!canCreate || readOnly) return;
    const validated = validatePurchaseReceiptDraft(
      { ...draft, idempotencyKey: ensurePurchaseReceiptAttemptKey(draft.idempotencyKey) },
      { products, suppliers: initialSuppliers, locations: initialLocations, todayISO: new Date().toISOString().slice(0, 10) }
    );
    setFieldErrors(validated.fieldErrors);
    setFormError(validated.formError);
    if (!validated.payload) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/app/purchase-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated.payload)
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(mapPurchaseReceiptError(String(json?.error || "purchase_receipt_create_failed")));
      }
      const receiptId = String(json?.receipt?.id || "");
      if (!receiptId) throw new Error("La recepcion se confirmo pero no devolvio identificador.");
      toast.success(
        json?.idempotent ? "Recepcion recuperada por idempotencia" : "Recepcion confirmada",
        json?.idempotent ? "Ya existia un ingreso identico y se abrio su detalle." : "El stock ya quedo aplicado y puedes revisar el detalle."
      );
      setDraft((current) => ({ ...buildInitialPurchaseReceiptDraft({ locationId: current.locationId }), locationId: current.locationId || locations[0]?.id || "" }));
      router.push(`/app/inventory/receipts/${receiptId}`);
      router.refresh();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "No se pudo confirmar la recepcion.";
      setFormError(message);
      toast.error("No se pudo confirmar la recepcion", message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ClientPageShell
      title="Ingresar mercaderia"
      description="Crea y confirma una recepcion atomica. El backend decide stock, movimientos, balances y lotes segun el modo real de cada producto."
      badge="Inventario"
      backHref="/app/inventory/receipts"
      backLabel="Volver a Recepciones"
    >
      <div className="min-w-0 max-w-full space-y-6">
        <InventorySectionNav />

        {!canCreate || readOnly ? (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            Tu usuario puede consultar recepciones, pero no confirmar nuevos ingresos.
          </div>
        ) : null}

        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="border-white/8 bg-card/90">
            <CardHeader>
              <div>
                <CardTitle className="text-xl">Cabecera</CardTitle>
                <CardDescription>Proveedor, ubicacion, fecha y metadatos visibles de la recepcion.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid min-w-0 gap-3 pt-0 md:grid-cols-2 [&_select]:w-full [&_select]:min-w-0 [&_select]:max-w-full">
              <Field label="Proveedor" error={fieldErrors.supplierId}>
                <select className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm" value={draft.supplierId} onChange={(event) => setDraft((current) => ({ ...current, supplierId: event.target.value }))} disabled={!canCreate || readOnly || submitting}>
                  <option value="">Seleccionar proveedor</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.displayName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ubicacion" error={fieldErrors.locationId}>
                <select className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm" value={draft.locationId} onChange={(event) => setDraft((current) => ({ ...current, locationId: event.target.value }))} disabled={!canCreate || readOnly || submitting}>
                  <option value="">Seleccionar ubicacion</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Fecha de recepcion" error={fieldErrors.receivedAt}>
                <Input type="date" value={draft.receivedAt} onChange={(event) => setDraft((current) => ({ ...current, receivedAt: event.target.value }))} disabled={!canCreate || readOnly || submitting} />
              </Field>
              <Field label="Factura / remito">
                <Input value={draft.documentNumber} onChange={(event) => setDraft((current) => ({ ...current, documentNumber: event.target.value }))} disabled={!canCreate || readOnly || submitting} />
              </Field>
              <Field label="Notas">
                <Textarea className="min-h-[96px] md:col-span-2" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} disabled={!canCreate || readOnly || submitting} />
              </Field>
            </CardContent>
          </Card>

          <Card className="border-white/8 bg-card/90">
            <CardHeader>
              <div>
                <CardTitle className="text-xl">Confirmacion</CardTitle>
                <CardDescription>La misma idempotency key se conserva en retries del formulario.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Intento</p>
                <p className="mt-2 break-all font-mono text-xs">{draft.idempotencyKey}</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4 text-sm text-muted">
                No hay borrador. Al confirmar, el backend crea y aplica la recepcion en una sola transaccion.
              </div>
              <div className="flex flex-col gap-2">
                <Button type="button" onClick={() => void submit()} disabled={!canCreate || readOnly || submitting}>
                  {submitting ? "Confirmando..." : "Confirmar ingreso"}
                </Button>
                <Button asChild type="button" variant="ghost" disabled={submitting}>
                  <Link href="/app/inventory/receipts">Cancelar y volver</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="border-white/8 bg-card/90">
          <CardHeader
            action={
              canCreate && !readOnly ? (
                <Button type="button" variant="secondary" className="rounded-2xl" onClick={addLine} disabled={submitting}>
                  Agregar producto
                </Button>
              ) : null
            }
          >
            <div>
              <CardTitle className="text-xl">Lineas</CardTitle>
              <CardDescription>Legacy rechaza lote y vencimiento. Lot-based exige lote y admite cantidad decimal.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {formError ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">{formError}</div>
            ) : null}

            {draft.lines.map((line, index) => {
              const product = productMap.get(line.productId);
              const trackingMode = product?.inventoryTrackingMode === "lot_based" ? "lot_based" : "legacy";
              const supportsLots = product?.inventoryTrackingMode === "lot_based";

              return (
                <article key={line.key} className="rounded-3xl border border-[color:var(--border)] bg-surface/45 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">Linea {index + 1}</p>
                      {product ? (
                        <Badge variant={trackingMode === "lot_based" ? "warning" : "muted"}>
                          {trackingMode === "lot_based" ? "lot_based" : "legacy"}
                        </Badge>
                      ) : null}
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(line.key)} disabled={submitting || draft.lines.length === 1}>
                      Eliminar linea
                    </Button>
                  </div>

                  <div className="grid min-w-0 gap-3 md:grid-cols-6 [&_select]:w-full [&_select]:min-w-0 [&_select]:max-w-full">
                    <Field label="Producto" error={fieldErrors[`lines.${index}.productId`]} className="md:col-span-2">
                      <select className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm" value={line.productId} onChange={(event) => updateLine(line.key, { productId: event.target.value })} disabled={!canCreate || readOnly || submitting}>
                        <option value="">Seleccionar producto</option>
                        {products.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.internalCode ? `${item.internalCode} · ` : ""}{item.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Cantidad" error={fieldErrors[`lines.${index}.quantity`]}>
                      <Input type="number" min="0" step={supportsLots ? "0.001" : "1"} value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: event.target.value })} disabled={!canCreate || readOnly || submitting} />
                    </Field>
                    <Field label="Costo unitario" error={fieldErrors[`lines.${index}.unitCost`]}>
                      <Input type="number" min="0" step="0.0001" value={line.unitCost} onChange={(event) => updateLine(line.key, { unitCost: event.target.value })} disabled={!canCreate || readOnly || submitting} />
                    </Field>
                    <Field label="Lote" error={fieldErrors[`lines.${index}.lotNumber`]}>
                      <Input value={line.lotNumber} onChange={(event) => updateLine(line.key, { lotNumber: event.target.value })} disabled={!supportsLots || !canCreate || readOnly || submitting} />
                    </Field>
                    <Field label="Vencimiento" error={fieldErrors[`lines.${index}.expiresAt`]}>
                      <Input type="date" value={line.expiresAt} onChange={(event) => updateLine(line.key, { expiresAt: event.target.value })} disabled={!supportsLots || !canCreate || readOnly || submitting} />
                    </Field>
                  </div>

                  <div className="mt-3 text-xs text-muted">
                    {product ? (
                      supportsLots
                        ? "Producto por lotes: lote obligatorio, vencimiento opcional y cantidades decimales permitidas."
                        : "Producto legacy: no controla lotes y solo admite cantidades enteras."
                    ) : "Selecciona un producto para ver sus reglas de inventario."}
                  </div>
                </article>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </ClientPageShell>
  );
}

function Field({
  label,
  error,
  className,
  children
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`min-w-0 space-y-2 ${className || ""}`}>
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error ? <p className="text-xs text-rose-200">{error}</p> : null}
    </div>
  );
}
