import { requireAppPage } from "@/lib/saas/access";
import { readSaasData } from "@/lib/saas/store";

export default async function CatalogProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAppPage();
  const { id } = await params;
  const data = readSaasData();
  const tenantId = ctx.tenantId || data.tenants[0]?.id || "";
  const product = data.catalogProducts.find((item) => item.id === id && item.tenantId === tenantId);

  if (!product) {
    return <p className="text-sm text-muted">Producto no encontrado.</p>;
  }

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-card p-5">
      <h1 className="text-2xl font-semibold">{product.name}</h1>
      <p className="mt-2 text-sm text-muted">SKU: {product.sku || "-"}</p>
      <p className="text-sm text-muted">Precio: ${product.price}</p>
      <p className="text-sm text-muted">Stock: {product.stockQty}</p>
      <p className="mt-3 text-sm">{product.description || "Sin descripción"}</p>
    </div>
  );
}
