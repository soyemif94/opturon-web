import { SuppliersWorkspace } from "@/components/app/SuppliersWorkspace";
import { canManageInventoryReceipts } from "@/lib/app-permissions";
import { getPortalSuppliers, isBackendConfigured, type PortalSupplier } from "@/lib/api";
import { requireAppModulePage } from "@/lib/saas/access";

export default async function InventorySuppliersPage() {
  const ctx = await requireAppModulePage("inventory");
  const readOnly = !canManageInventoryReceipts(ctx);
  let suppliers: PortalSupplier[] = [];

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const result = await getPortalSuppliers(ctx.tenantId, {
        status: "all",
        page: 1,
        pageSize: 100,
        sort: "name_asc"
      });
      suppliers = Array.isArray(result.data?.items) ? result.data.items : [];
    } catch {
      suppliers = [];
    }
  }

  return <SuppliersWorkspace initialSuppliers={suppliers} readOnly={readOnly} />;
}
