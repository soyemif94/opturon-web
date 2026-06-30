import { InventoryLotsWorkspace } from "@/components/app/InventoryLotsWorkspace";
import { canManageCatalog } from "@/lib/app-permissions";
import { getPortalInventoryLots, isBackendConfigured, type PortalInventoryLot } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";

export default async function InventoryPage() {
  const ctx = await requireAppPage();
  const readOnly = !canManageCatalog(ctx);
  const backendReady = Boolean(ctx.tenantId) && isBackendConfigured();
  let lots: PortalInventoryLot[] = [];

  if (ctx.tenantId && backendReady) {
    try {
      const result = await getPortalInventoryLots(ctx.tenantId, { pageSize: 250 });
      lots = Array.isArray(result.data?.lots) ? result.data.lots : [];
    } catch {
      lots = [];
    }
  }

  return <InventoryLotsWorkspace initialLots={lots} readOnly={!ctx.tenantId || readOnly} />;
}
