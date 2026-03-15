import Link from "next/link";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canManageCatalog } from "@/lib/app-permissions";
import { getPortalProductDetail, isBackendConfigured } from "@/lib/api";
import { formatMoney, formatDateTimeLabel, titleCaseLabel } from "@/lib/billing";
import { requireAppPage } from "@/lib/saas/access";

export default async function CatalogProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAppPage();
  const { id } = await params;
  const readOnly = !canManageCatalog(ctx);
  let product = null;

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const result = await getPortalProductDetail(ctx.tenantId, id);
      product = result.data;
    } catch {
      product = null;
    }
  }

  if (!product) {
    return (
      <ClientPageShell
        title="Detalle del producto"
        description="Consulta la informacion principal del producto y vuelve al catalogo para seguir operando."
        badge="Catalogo"
      >
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-sm text-muted">Producto no encontrado.</div>
      </ClientPageShell>
    );
  }

  return (
    <ClientPageShell
      title={product.name}
      description="Vista simple del producto para validar datos clave antes de usarlo en pedidos o futuras automatizaciones."
      badge="Detalle del producto"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader
            action={
              <div className="flex items-center gap-2">
                <Badge variant={product.status === "active" ? "success" : "muted"}>{titleCaseLabel(product.status)}</Badge>
                {!readOnly ? (
                  <Button asChild variant="secondary" size="sm" className="rounded-2xl">
                    <Link href={`/app/catalog/${product.id}/edit`}>Editar producto</Link>
                  </Button>
                ) : null}
              </div>
            }
          >
            <div>
              <CardTitle className="text-xl">{product.name}</CardTitle>
              <CardDescription>{product.sku || "Sin codigo"} - {formatMoney(product.price, product.currency)}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 pt-0 md:grid-cols-2 xl:grid-cols-3">
            <DetailTile label="Codigo / SKU" value={product.sku || "-"} />
            <DetailTile label="Precio" value={formatMoney(product.price, product.currency)} />
            <DetailTile label="IVA" value={`${Number(product.vatRate ?? product.taxRate ?? 0)}%`} />
            <DetailTile label="Moneda" value={product.currency || "ARS"} />
            <DetailTile label="Stock" value={String(product.stock ?? 0)} />
            <DetailTile label="Estado" value={titleCaseLabel(product.status)} />
            <DetailTile label="Creado" value={formatDateTimeLabel(product.createdAt)} />
            <DetailTile label="Actualizado" value={formatDateTimeLabel(product.updatedAt)} />
            <DetailTile label="Descripcion" value={product.description || "Sin descripcion cargada."} className="md:col-span-2 xl:col-span-3" />
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader>
            <div>
              <CardTitle className="text-xl">Uso operativo</CardTitle>
              <CardDescription>Resumen corto para validar si el producto esta listo para operar.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <MetricTile label="Precio actual" value={formatMoney(product.price, product.currency)} />
            <MetricTile label="Stock disponible" value={String(product.stock ?? 0)} />
            <MetricTile label="Carga fiscal" value={`${Number(product.vatRate ?? product.taxRate ?? 0)}%`} />
            <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4 text-sm text-muted">
              {product.status === "active"
                ? "El producto esta activo y listo para usarse en catalogo, pedidos y futuras automatizaciones."
                : "El producto esta archivado. Puedes reactivarlo o ajustar su informacion antes de volver a usarlo."}
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientPageShell>
  );
}

function DetailTile({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4 ${className}`}>
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-3 text-sm text-muted">{value}</p>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-3 text-lg font-semibold">{value}</p>
    </div>
  );
}
