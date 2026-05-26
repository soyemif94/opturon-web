import { CatalogManager } from "@/components/app/CatalogManager";
import { canManageCatalog } from "@/lib/app-permissions";
import { getPortalProducts, isBackendConfigured, type PortalProduct } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";

export default async function CatalogPage() {
  const ctx = await requireAppPage();
  const readOnly = !canManageCatalog(ctx);
  const backendReady = Boolean(ctx.tenantId) && isBackendConfigured();
  let products: Array<PortalProduct & { stockQty: number; active: boolean }> = [];

  if (ctx.tenantId && backendReady) {
    try {
      const result = await getPortalProducts(ctx.tenantId);
      products = Array.isArray(result.data?.products)
        ? result.data.products.map((product) => ({
            ...product,
            stockQty: product.stock,
            active: product.status === "active"
          }))
        : [];
    } catch {
      products = [];
    }
  }

  return <CatalogManager initialProducts={products} readOnly={readOnly} />;
}
