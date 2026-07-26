import { InventoryBaseWorkspace } from "@/components/app/InventoryBaseWorkspace";
import { InventoryLotsWorkspace } from "@/components/app/InventoryLotsWorkspace";
import { canManageCatalog } from "@/lib/app-permissions";
import { getPortalInventoryLots, getPortalInventoryProducts, isBackendConfigured, type PortalInventoryLot, type PortalInventoryProduct } from "@/lib/api";
import { requireAppModulePage } from "@/lib/saas/access";

export default async function InventoryPage() {
  const ctx = await requireAppModulePage("inventory");
  const readOnly = !canManageCatalog(ctx);
  const backendReady = Boolean(ctx.tenantId) && isBackendConfigured();
  let products: PortalInventoryProduct[] = [];
  let lots: PortalInventoryLot[] = [];

  if (ctx.tenantId && backendReady) {
    try {
      const [productsResult, lotsResult] = await Promise.all([
        getPortalInventoryProducts(ctx.tenantId, { page: 1, pageSize: 100 }),
        getPortalInventoryLots(ctx.tenantId, { pageSize: 100 })
      ]);
      products = Array.isArray(productsResult.data?.products) ? productsResult.data.products : [];
      lots = Array.isArray(lotsResult.data?.lots) ? lotsResult.data.lots : [];
    } catch {
      products = [];
      lots = [];
    }
  }

  return (
    <>
      <InventoryBaseWorkspace initialProducts={products} readOnly={!ctx.tenantId || readOnly} />
      <InventoryLotsWorkspace initialLots={lots} readOnly={!ctx.tenantId || readOnly} />
    </>
  );
}
