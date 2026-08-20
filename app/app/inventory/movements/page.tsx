import { InventoryMovementsWorkspace } from "@/components/app/InventoryMovementsWorkspace";
import {
  getPortalInventoryLocations,
  getPortalInventoryMovements,
  getPortalInventoryProducts,
  isBackendConfigured,
  type PortalInventoryLocation,
  type PortalInventoryMovement,
  type PortalInventoryMovementListItem,
  type PortalInventoryProduct
} from "@/lib/api";
import { getPortalInventoryReadActor, requireAppModulePage } from "@/lib/saas/access";

function parsePositiveInteger(raw: string | string[] | undefined, fallback: number) {
  const value = Number.parseInt(Array.isArray(raw) ? raw[0] || "" : raw || "", 10);
  if (!Number.isInteger(value) || value <= 0) return fallback;
  return value;
}

function parseDateOnly(raw: string | string[] | undefined) {
  const value = String(Array.isArray(raw) ? raw[0] || "" : raw || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return value;
}

export default async function InventoryMovementsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireAppModulePage("inventory");
  const params = (await searchParams) || {};

  const initialFilters = {
    search: String(params.search || "").trim() || undefined,
    movementType: (String(params.movementType || "").trim() || undefined) as PortalInventoryMovement["movementType"] | undefined,
    locationId: String(params.locationId || "").trim() || undefined,
    productId: String(params.productId || "").trim() || undefined,
    lotNumber: String(params.lotNumber || "").trim() || undefined,
    dateFrom: parseDateOnly(params.dateFrom),
    dateTo: parseDateOnly(params.dateTo)
  };

  const initialPage = parsePositiveInteger(params.page, 1);
  const initialPageSize = Math.min(parsePositiveInteger(params.pageSize, 25), 100);

  let items: PortalInventoryMovementListItem[] = [];
  let products: PortalInventoryProduct[] = [];
  let locations: PortalInventoryLocation[] = [];
  let total = 0;

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const inventoryReadActor = getPortalInventoryReadActor(ctx);
      const [movementsResult, productsResult, locationsResult] = await Promise.all([
        getPortalInventoryMovements(ctx.tenantId, {
          ...initialFilters,
          page: initialPage,
          pageSize: initialPageSize
        }, inventoryReadActor),
        getPortalInventoryProducts(ctx.tenantId, { page: 1, pageSize: 100 }, inventoryReadActor),
        getPortalInventoryLocations(ctx.tenantId, inventoryReadActor)
      ]);
      items = Array.isArray(movementsResult.data?.items) ? movementsResult.data.items : [];
      total = Number(movementsResult.data?.total || 0);
      products = Array.isArray(productsResult.data?.products) ? productsResult.data.products : [];
      locations = Array.isArray(locationsResult.data?.locations) ? locationsResult.data.locations : [];
    } catch {
      items = [];
      products = [];
      locations = [];
      total = 0;
    }
  }

  return (
    <InventoryMovementsWorkspace
      initialItems={items}
      initialProducts={products}
      initialLocations={locations}
      initialPage={initialPage}
      initialPageSize={initialPageSize}
      initialTotal={total}
      initialFilters={initialFilters}
    />
  );
}
