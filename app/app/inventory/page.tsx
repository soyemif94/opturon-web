import { InventoryBaseWorkspace } from "@/components/app/InventoryBaseWorkspace";
import { InventorySectionNav } from "@/components/app/InventorySectionNav";
import { InventoryLotsWorkspace } from "@/components/app/InventoryLotsWorkspace";
import {
  canManageInventoryReceipts,
  canManageInventorySensitive,
  canPerformTenantInventorySensitiveAction
} from "@/lib/app-permissions";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalInventoryLots,
  getPortalInventoryProducts,
  isBackendConfigured,
  type PortalInventoryLot,
  type PortalInventoryPagination,
  type PortalInventoryProduct,
  type PortalInventorySummary
} from "@/lib/api";
import { getPortalInventoryReadActor, requireAppModulePage } from "@/lib/saas/access";
import { parseInventoryOperationsParams } from "@/lib/inventory-operations";

const INVENTORY_PAGE_SIZE = 50;

export default async function InventoryPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireAppModulePage("inventory");
  const params = (await searchParams) || {};
  const { filters: initialFilters, page: initialPage } = parseInventoryOperationsParams(params);
  const canReceiveLots = canManageInventoryReceipts(ctx);
  const canManageSensitive = canManageInventorySensitive(ctx);
  const baseInventoryReadOnly = !canManageSensitive;
  const lotsReadOnly = !canReceiveLots && !canManageSensitive;
  const backendReady = Boolean(ctx.tenantId) && isBackendConfigured();
  let products: PortalInventoryProduct[] = [];
  let pagination: PortalInventoryPagination = {
    page: initialPage,
    pageSize: INVENTORY_PAGE_SIZE,
    totalItems: 0,
    totalPages: 0
  };
  let summary: PortalInventorySummary = {
    totalProducts: 0,
    withStock: 0,
    withoutStock: 0
  };
  let lots: PortalInventoryLot[] = [];
  let inventoryState: "ready" | "access_restricted" | "error" = "ready";
  let inventoryMessage: string | null = null;

  if (ctx.tenantId && backendReady) {
    try {
      const inventoryReadActor = getPortalInventoryReadActor(ctx);
      const [productsResult, lotsResult] = await Promise.all([
        getPortalInventoryProducts(ctx.tenantId, { ...initialFilters, page: initialPage, pageSize: INVENTORY_PAGE_SIZE }, inventoryReadActor),
        getPortalInventoryLots(ctx.tenantId, { pageSize: 100 }, inventoryReadActor)
      ]);
      if (
        !Array.isArray(productsResult.data?.products) ||
        !isInventoryPagination(productsResult.data?.pagination) ||
        !isInventorySummary(productsResult.data?.summary) ||
        !Array.isArray(lotsResult.data?.lots)
      ) {
        inventoryState = "error";
        inventoryMessage = "No se pudo interpretar la respuesta de inventario.";
      } else {
        products = productsResult.data.products;
        pagination = productsResult.data.pagination;
        summary = productsResult.data.summary;
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
      <section className="mb-6">
        <InventorySectionNav canBulkAdjust={canPerformTenantInventorySensitiveAction(ctx)} />
      </section>
      <InventoryBaseWorkspace
        initialProducts={products}
        initialPagination={pagination}
        initialSummary={summary}
        initialFilters={initialFilters}
        tenantId={ctx.tenantId || null}
        readOnly={!ctx.tenantId || baseInventoryReadOnly}
        canBulkAdjust={Boolean(ctx.tenantId) && canPerformTenantInventorySensitiveAction(ctx)}
      />
      <div id="lotes" className="scroll-mt-28">
        <InventoryLotsWorkspace
          initialLots={lots}
          readOnly={!ctx.tenantId || lotsReadOnly}
          canManageSensitive={canManageSensitive}
          canManageReceipts={canReceiveLots}
        />
      </div>
    </>
  );
}

function isInventoryPagination(value: unknown): value is PortalInventoryPagination {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PortalInventoryPagination>;
  return (
    isPositiveInteger(candidate.page) &&
    isPositiveInteger(candidate.pageSize) &&
    isNonNegativeInteger(candidate.totalItems) &&
    isNonNegativeInteger(candidate.totalPages)
  );
}

function isInventorySummary(value: unknown): value is PortalInventorySummary {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PortalInventorySummary>;
  return (
    isNonNegativeInteger(candidate.totalProducts) &&
    isNonNegativeInteger(candidate.withStock) &&
    isNonNegativeInteger(candidate.withoutStock) &&
    candidate.withStock + candidate.withoutStock === candidate.totalProducts
  );
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
