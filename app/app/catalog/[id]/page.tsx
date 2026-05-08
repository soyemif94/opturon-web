import Link from "next/link";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canManageCatalog } from "@/lib/app-permissions";
import { getPortalProductDetail, isBackendConfigured } from "@/lib/api";
import { formatMoney, formatDateTimeLabel, titleCaseLabel } from "@/lib/billing";
import { formatExpirationDate, getExpirationBadgePresentation } from "@/lib/product-expiration";
import { getDiscountedPrice } from "@/lib/product-pricing";
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

  const expiration = getExpirationBadgePresentation(product.expirationDate);
  const pricing = getDiscountedPrice(product.price, product.discountPercentage);

  return (
    <ClientPageShell
      title={product.name}
      description="Vista simple del producto para validar datos clave antes de usarlo en pedidos o futuras automatizaciones."
      badge="Detalle del producto"
      backHref="/app/catalog"
      backLabel="Volver al catalogo"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader
            action={
              <div className="flex items-center gap-2">
                <Badge variant={product.status === "active" ? "success" : "muted"}>{titleCaseLabel(product.status)}</Badge>
                <Badge variant={expiration.variant}>{expiration.label}</Badge>
                {pricing.hasDiscount ? <Badge variant="warning">En promocion</Badge> : null}
                {product.riskDiscountSuggestion ? <Badge variant="warning">{product.riskDiscountSuggestion.label}</Badge> : null}
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
              <CardDescription>
                {product.sku || "Sin codigo"} - {pricing.hasDiscount ? formatMoney(pricing.finalPrice, product.currency) : formatMoney(product.price, product.currency)}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 pt-0 md:grid-cols-2 xl:grid-cols-3">
            <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-surface/55 md:col-span-2 xl:col-span-3">
              <ProductImagePreview image={product.image || null} name={product.name} />
            </div>
            <DetailTile label="Codigo / SKU" value={product.sku || "-"} />
            <DetailTile label="Precio base" value={formatMoney(pricing.originalPrice, product.currency)} />
            <DetailTile label="Precio final" value={formatMoney(pricing.finalPrice, product.currency)} />
            <DetailTile label="IVA" value={`${Number(product.vatRate ?? product.taxRate ?? 0)}%`} />
            <DetailTile label="Moneda" value={product.currency || "ARS"} />
            <DetailTile label="Stock" value={String(product.stock ?? 0)} />
            <DetailTile label="Categoria" value={product.categoryName || "Sin categoria"} />
            <DetailTile label="Subcategoria" value={product.subcategory || "Sin subcategoria"} />
            <DetailTile label="Imagen principal" value={product.image?.url || "Sin imagen"} />
            <DetailTile label="Estado" value={titleCaseLabel(product.status)} />
            <DetailTile label="Vencimiento" value={formatExpirationDate(product.expirationDate)} />
            <DetailTile label="Descuento" value={product.discountPercentage != null ? `${product.discountPercentage}%` : "Sin descuento"} />
            <DetailTile label="Sugerencia automatica" value={product.riskDiscountSuggestion ? `${product.riskDiscountSuggestion.suggestedDiscountPercentage}%` : "Sin sugerencia"} />
            <DetailTile label="Atributos" value={formatProductAttributes(product.attributes)} />
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
            <MetricTile label="Precio actual" value={formatMoney(pricing.finalPrice, product.currency)} />
            <MetricTile label="Precio base" value={formatMoney(pricing.originalPrice, product.currency)} />
            <MetricTile label="Stock disponible" value={String(product.stock ?? 0)} />
            <MetricTile label="Carga fiscal" value={`${Number(product.vatRate ?? product.taxRate ?? 0)}%`} />
            <MetricTile label="Control de vencimiento" value={expiration.label} />
            {product.riskDiscountSuggestion ? (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                <p className="font-medium">{product.riskDiscountSuggestion.label}</p>
                <p className="mt-2">{product.riskDiscountSuggestion.helper}</p>
                <p className="mt-2 text-xs text-amber-200/80">
                  Sugerido {product.riskDiscountSuggestion.suggestedDiscountPercentage}%
                  {product.riskDiscountSuggestion.currentDiscountPercentage != null
                    ? ` · Actual ${product.riskDiscountSuggestion.currentDiscountPercentage}%`
                    : ""}
                </p>
              </div>
            ) : null}
            <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4 text-sm text-muted">
              {product.status === "active"
                ? "El producto esta activo y listo para usarse en catalogo, pedidos y futuras automatizaciones."
                : "El producto esta archivado. Puedes reactivarlo o ajustar su informacion antes de volver a usarlo."}
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4 text-sm text-muted">
              {expiration.helper}
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

function formatProductAttributes(attributes?: Array<{ name: string; options: string[] }>) {
  if (!Array.isArray(attributes) || attributes.length === 0) return "Sin atributos";
  return attributes
    .filter((attribute) => attribute?.name && Array.isArray(attribute.options) && attribute.options.length > 0)
    .map((attribute) => `${attribute.name}: ${attribute.options.join(", ")}`)
    .join(" | ");
}

function ProductImagePreview({
  image,
  name
}: {
  image: { url: string; alt?: string | null } | null;
  name: string;
}) {
  if (image?.url) {
    return <img src={image.url} alt={image.alt || name || "Imagen del producto"} className="aspect-[16/10] w-full object-cover" loading="lazy" />;
  }

  return (
    <div className="flex aspect-[16/10] w-full items-center justify-center bg-[linear-gradient(135deg,rgba(176,80,0,0.18),rgba(255,255,255,0.04))] text-sm font-medium text-muted">
      Sin imagen principal
    </div>
  );
}
