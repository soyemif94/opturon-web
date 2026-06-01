import { InventoryWorkspace } from "@/components/app/inventory-workspace";
import { canManageCatalog } from "@/lib/app-permissions";
import { getPortalProducts, isBackendConfigured, type PortalProduct } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";

export default async function InventoryPage() {
  const ctx = await requireAppPage();
  const readOnly = !canManageCatalog(ctx);
  const backendReady = Boolean(ctx.tenantId) && isBackendConfigured();
  let products: PortalProduct[] = [];

  if (ctx.tenantId && backendReady) {
    try {
      const result = await getPortalProducts(ctx.tenantId);
      products = Array.isArray(result.data?.products) ? result.data.products : [];
    } catch {
      products = [];
    }
  }

  return <InventoryWorkspace initialProducts={products} readOnly={!ctx.tenantId || readOnly} />;
}
