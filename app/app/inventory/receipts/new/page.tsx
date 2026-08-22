import { PurchaseReceiptForm } from "@/components/app/PurchaseReceiptForm";
import { canManageInventoryReceipts, canPerformTenantInventorySensitiveAction } from "@/lib/app-permissions";
import {
  getPortalInventoryLocations,
  getPortalProducts,
  getPortalSuppliers,
  isBackendConfigured,
  type PortalInventoryLocation,
  type PortalProduct,
  type PortalSupplier
} from "@/lib/api";
import { getPortalInventoryReadActor, requireAppModulePage } from "@/lib/saas/access";

export default async function InventoryReceiptNewPage() {
  const ctx = await requireAppModulePage("inventory");
  const canCreate = canManageInventoryReceipts(ctx);
  let suppliers: PortalSupplier[] = [];
  let locations: PortalInventoryLocation[] = [];
  let products: PortalProduct[] = [];

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const inventoryReadActor = getPortalInventoryReadActor(ctx);
      const [suppliersResult, locationsResult, productsResult] = await Promise.all([
        getPortalSuppliers(ctx.tenantId, { page: 1, pageSize: 100, status: "active", sort: "name_asc" }, inventoryReadActor),
        getPortalInventoryLocations(ctx.tenantId, inventoryReadActor),
        getPortalProducts(ctx.tenantId, inventoryReadActor)
      ]);
      suppliers = Array.isArray(suppliersResult.data?.items) ? suppliersResult.data.items : [];
      locations = Array.isArray(locationsResult.data?.locations) ? locationsResult.data.locations : [];
      products = Array.isArray(productsResult.data?.products) ? productsResult.data.products.filter((product) => product.status === "active") : [];
    } catch {
      suppliers = [];
      locations = [];
      products = [];
    }
  }

  return (
    <PurchaseReceiptForm
      initialSuppliers={suppliers}
      initialLocations={locations}
      initialProducts={products}
      canCreate={canCreate}
      readOnly={!canCreate}
      canBulkAdjust={canPerformTenantInventorySensitiveAction(ctx)}
    />
  );
}
