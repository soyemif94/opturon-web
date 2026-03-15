import { ClientPageShell } from "@/components/app/client-page-shell";
import { ProductEditor } from "@/components/app/ProductEditor";
import { canManageCatalog } from "@/lib/app-permissions";
import { getPortalProductDetail, isBackendConfigured } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";

export default async function CatalogProductEditPage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <ClientPageShell
      title={product?.name ? `Editar ${product.name}` : "Editar producto"}
      description="Ajusta datos comerciales del producto para mantener el catalogo operativo desde el portal."
      badge="Edicion de producto"
    >
      {!product ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-sm text-muted">
          No pudimos cargar el producto solicitado.
        </div>
      ) : readOnly ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-sm text-muted">
          Este workspace esta en modo solo lectura y no puede editar productos.
        </div>
      ) : (
        <ProductEditor product={product} />
      )}
    </ClientPageShell>
  );
}
