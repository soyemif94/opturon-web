import { PurchaseReceiptsWorkspace } from "@/components/app/PurchaseReceiptsWorkspace";
import { canManageInventoryReceipts } from "@/lib/app-permissions";
import {
  getPortalInventoryLocations,
  getPortalPurchaseReceipts,
  getPortalSuppliers,
  isBackendConfigured,
  type PortalInventoryLocation,
  type PortalPurchaseReceiptListItem,
  type PortalSupplier
} from "@/lib/api";
import { getPortalInventoryReadActor, requireAppModulePage } from "@/lib/saas/access";

export default async function InventoryReceiptsPage() {
  const ctx = await requireAppModulePage("inventory");
  const canCreate = canManageInventoryReceipts(ctx);
  let receipts: PortalPurchaseReceiptListItem[] = [];
  let suppliers: PortalSupplier[] = [];
  let locations: PortalInventoryLocation[] = [];
  let total = 0;

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const inventoryReadActor = getPortalInventoryReadActor(ctx);
      const [receiptsResult, suppliersResult, locationsResult] = await Promise.all([
        getPortalPurchaseReceipts(ctx.tenantId, { page: 1, pageSize: 20, sort: "receivedAt_desc" }, inventoryReadActor),
        getPortalSuppliers(ctx.tenantId, { page: 1, pageSize: 100, status: "all", sort: "name_asc" }, inventoryReadActor),
        getPortalInventoryLocations(ctx.tenantId, inventoryReadActor)
      ]);
      receipts = Array.isArray(receiptsResult.data?.items) ? receiptsResult.data.items : [];
      total = Number(receiptsResult.data?.total || 0);
      suppliers = Array.isArray(suppliersResult.data?.items) ? suppliersResult.data.items : [];
      locations = Array.isArray(locationsResult.data?.locations) ? locationsResult.data.locations : [];
    } catch {
      receipts = [];
      suppliers = [];
      locations = [];
      total = 0;
    }
  }

  return (
    <PurchaseReceiptsWorkspace
      initialReceipts={receipts}
      initialSuppliers={suppliers}
      initialLocations={locations}
      initialPage={1}
      initialPageSize={20}
      initialTotal={total}
      readOnly={!canCreate}
      canCreate={canCreate}
    />
  );
}
