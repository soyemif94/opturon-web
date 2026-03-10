import { ClientPageShell } from "@/components/app/client-page-shell";
import { getPortalProductDetail, isBackendConfigured } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";

export default async function CatalogProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAppPage();
  const { id } = await params;
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
        description="Consulta la informacion principal del producto y vuelve al catalogo para seguir editando."
        badge="Catalogo"
      >
        <p className="text-sm text-muted">Producto no encontrado.</p>
      </ClientPageShell>
    );
  }

  return (
    <ClientPageShell
      title={product.name}
      description="Vista simple del producto para validar datos clave antes de usarlo en pedidos o futuras automatizaciones."
      badge="Detalle del producto"
    >
      <div className="rounded-2xl border border-[color:var(--border)] bg-card p-5">
        <h2 className="text-2xl font-semibold">{product.name}</h2>
        <p className="mt-2 text-sm text-muted">SKU: {product.sku || "-"}</p>
        <p className="text-sm text-muted">
          Precio:{" "}
          {new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: product.currency || "ARS"
          }).format(Number(product.price || 0))}
        </p>
        <p className="text-sm text-muted">Stock: {product.stock}</p>
        <p className="text-sm text-muted">Estado: {product.status === "active" ? "Activo" : "Inactivo"}</p>
        <p className="mt-3 text-sm">{product.description || "Sin descripcion"}</p>
      </div>
    </ClientPageShell>
  );
}
