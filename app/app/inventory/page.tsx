import { InventoryBaseWorkspace } from "@/components/app/InventoryBaseWorkspace";
import { InventoryLotsWorkspace } from "@/components/app/InventoryLotsWorkspace";
import { canManageCatalog } from "@/lib/app-permissions";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalInventoryLots,
  getPortalInventoryProducts,
  isBackendConfigured,
  type PortalInventoryLot,
  type PortalInventoryProduct
} from "@/lib/api";
import { requireAppModulePage } from "@/lib/saas/access";

export default async function InventoryPage() {
  const ctx = await requireAppModulePage("inventory");
  const readOnly = !canManageCatalog(ctx);
  const backendReady = Boolean(ctx.tenantId) && isBackendConfigured();
  let products: PortalInventoryProduct[] = [];
  let lots: PortalInventoryLot[] = [];
  let inventoryState: "ready" | "access_restricted" | "error" = "ready";
  let inventoryMessage: string | null = null;

  if (ctx.tenantId && backendReady) {
    try {
      const [productsResult, lotsResult] = await Promise.all([
        getPortalInventoryProducts(ctx.tenantId, { page: 1, pageSize: 100 }),
        getPortalInventoryLots(ctx.tenantId, { pageSize: 100 })
      ]);
      if (!Array.isArray(productsResult.data?.products) || !Array.isArray(lotsResult.data?.lots)) {
        inventoryState = "error";
        inventoryMessage = "No se pudo interpretar la respuesta de inventario.";
      } else {
        products = productsResult.data.products;
        lots = lotsResult.data.lots;
      }
    } catch (error) {
      const status = getBackendErrorStatus(error);
      const body = getBackendErrorBody(error);
      if (status === 403) {
        inventoryState = "access_restricted";
        inventoryMessage =
          typeof body === "object" && body && "error" in body
            ? "Inventario no esta habilitado para este tenant."
            : "No tenes acceso a Inventario en este tenant.";
      } else {
        inventoryState = "error";
        inventoryMessage = "No se pudo cargar Inventario. Reintenta en unos minutos.";
      }
    }
  } else if (!backendReady) {
    inventoryState = "error";
    inventoryMessage = "Inventario no esta disponible en este entorno.";
  }

  if (inventoryState !== "ready") {
    return (
      <section className="space-y-4 rounded-3xl border border-[color:var(--border)] bg-card/80 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Inventario</p>
          <h1 className="mt-2 text-2xl font-semibold">
            {inventoryState === "access_restricted" ? "Acceso restringido" : "Error al cargar inventario"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{inventoryMessage}</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <InventoryBaseWorkspace initialProducts={products} tenantId={ctx.tenantId || null} readOnly={!ctx.tenantId || readOnly} />
      <InventoryLotsWorkspace initialLots={lots} readOnly={!ctx.tenantId || readOnly} />
    </>
  );
}
