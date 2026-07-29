"use client";

import Link from "next/link";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { InventorySectionNav } from "@/components/app/InventorySectionNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortalPurchaseReceiptDetail } from "@/lib/api";

export function PurchaseReceiptDetail({
  receipt
}: {
  receipt: PortalPurchaseReceiptDetail;
}) {
  return (
    <ClientPageShell
      title="Detalle de recepcion"
      description="Recepcion confirmada en solo lectura. Los movimientos y el stock ya quedaron aplicados desde el backend transaccional."
      badge="Inventario"
      backHref="/app/inventory/receipts"
      backLabel="Volver a Recepciones"
      action={
        <Button asChild variant="secondary" className="rounded-2xl">
          <Link href="/app/inventory/receipts/new">Nuevo ingreso</Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <InventorySectionNav />

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="border-white/8 bg-card/90">
            <CardHeader>
              <div>
                <CardTitle className="text-xl">Cabecera</CardTitle>
                <CardDescription>Datos operativos de la recepcion ya confirmada.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 pt-0 md:grid-cols-2">
              <DetailTile label="Recepcion" value={receipt.id} mono />
              <DetailTile label="Proveedor" value={receipt.supplier?.displayName || "Sin proveedor"} />
              <DetailTile label="Ubicacion" value={receipt.location?.name || "Sin ubicacion"} />
              <DetailTile label="Documento" value={receipt.documentNumber || "Sin documento"} />
              <DetailTile label="Fecha de recepcion" value={formatDateTime(receipt.receivedAt)} />
              <DetailTile label="Fecha de confirmacion" value={formatDateTime(receipt.confirmedAt)} />
              <DetailTile label="Notas" value={receipt.notes || "Sin notas"} />
              <DetailTile label="Actor" value={receipt.actor?.name || receipt.actor?.email || "Sin actor visible"} />
            </CardContent>
          </Card>

          <Card className="border-white/8 bg-card/90">
            <CardHeader>
              <div>
                <CardTitle className="text-xl">Resumen</CardTitle>
                <CardDescription>Totales devueltos por el backend.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <SummaryPill label="Lineas" value={String(receipt.summary.itemCount)} />
              <SummaryPill label="Cantidad total" value={receipt.summary.totalQuantity} />
              <SummaryPill label="Costo total" value={receipt.summary.totalCost || "Sin costo total"} />
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                Recepcion confirmada. No admite edicion, eliminacion ni reversion desde esta pantalla.
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="border-white/8 bg-card/90">
          <CardHeader>
            <div>
              <CardTitle className="text-xl">Items</CardTitle>
              <CardDescription>Cada linea muestra el modo real de inventario, referencias y datos de lote cuando aplican.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {receipt.items.map((item) => (
              <article key={item.id} className="rounded-3xl border border-[color:var(--border)] bg-surface/45 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{item.product.name || "Producto sin nombre"}</p>
                      {item.product.internalCode ? <Badge variant="outline">{item.product.internalCode}</Badge> : null}
                      <Badge variant={item.product.inventoryTrackingMode === "lot_based" ? "warning" : "muted"}>
                        {item.product.inventoryTrackingMode === "lot_based" ? "lot_based" : "legacy"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted">
                      Cantidad {item.quantity}
                      {item.unitCost ? ` | Costo ${item.unitCost}` : " | Sin costo informado"}
                    </p>
                    <p className="text-sm text-muted">
                      {item.lotNumber ? `Lote ${item.lotNumber}` : "Sin lote"} {item.expiresAt ? `| Vence ${item.expiresAt}` : ""}
                    </p>
                  </div>
                  <div className="grid gap-2 text-xs text-muted lg:min-w-[220px]">
                    <span>Lot ref: {item.inventoryLotId || "No aplica"}</span>
                    <span>Movement ref: {item.inventoryMovementId || "No visible"}</span>
                  </div>
                </div>
              </article>
            ))}
          </CardContent>
        </Card>
      </div>
    </ClientPageShell>
  );
}

function DetailTile({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface/50 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className={`mt-2 text-sm ${mono ? "break-all font-mono text-xs" : ""}`}>{value}</p>
    </div>
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

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
