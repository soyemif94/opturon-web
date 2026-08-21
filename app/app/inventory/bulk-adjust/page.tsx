import { redirect } from "next/navigation";
import { InventoryBulkStockWorkspace } from "@/components/app/InventoryBulkStockWorkspace";
import { InventorySectionNav } from "@/components/app/InventorySectionNav";
import { canPerformTenantInventorySensitiveAction } from "@/lib/app-permissions";
import {
  getBackendErrorStatus,
  getPortalInventoryProducts,
  isBackendConfigured,
  type PortalInventoryPagination,
  type PortalInventoryProduct,
  type PortalInventorySummary
} from "@/lib/api";
import { getPortalInventoryReadActor, requireAppModulePage } from "@/lib/saas/access";

const INVENTORY_PAGE_SIZE = 50;

export default async function InventoryBulkAdjustPage() {
  const ctx = await requireAppModulePage("inventory", {
    permission: "manage_inventory_sensitive",
    callbackUrl: "/app/inventory/bulk-adjust"
  });
  if (!canPerformTenantInventorySensitiveAction(ctx)) redirect("/app/inventory");
  const backendReady = Boolean(ctx.tenantId) && isBackendConfigured();
  let products: PortalInventoryProduct[] = [];
  let pagination: PortalInventoryPagination = {
    page: 1,
    pageSize: INVENTORY_PAGE_SIZE,
    totalItems: 0,
    totalPages: 0
  };
  let summary: PortalInventorySummary = {
    totalProducts: 0,
    withStock: 0,
    withoutStock: 0
  };
  let errorMessage: string | null = null;

  if (!backendReady) {
    errorMessage = "La carga masiva de inventario no esta disponible en este entorno.";
  } else if (ctx.tenantId) {
    try {
      const result = await getPortalInventoryProducts(
        ctx.tenantId,
        { page: 1, pageSize: INVENTORY_PAGE_SIZE },
        getPortalInventoryReadActor(ctx)
      );
      if (
        !Array.isArray(result.data?.products) ||
        !isInventoryPagination(result.data?.pagination) ||
        !isInventorySummary(result.data?.summary)
      ) {
        errorMessage = "No se pudo interpretar la respuesta de inventario.";
      } else {
        products = result.data.products;
        pagination = result.data.pagination;
        summary = result.data.summary;
      }
    } catch (error) {
      errorMessage = getBackendErrorStatus(error) === 403
        ? "No tenes permiso para ajustar stock en este tenant."
        : "No se pudo cargar el inventario. Reintenta en unos minutos.";
    }
  }

  if (errorMessage) {
    return (
      <>
        <section className="mb-6">
          <InventorySectionNav canBulkAdjust />
        </section>
        <section className="space-y-3 rounded-3xl border border-[color:var(--border)] bg-card/80 p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Inventario</p>
          <h1 className="text-2xl font-semibold">Carga inicial / Ajuste masivo</h1>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </section>
      </>
    );
  }

  return (
    <>
      <section className="mb-6">
        <InventorySectionNav canBulkAdjust />
      </section>
      <InventoryBulkStockWorkspace
        initialProducts={products}
        initialPagination={pagination}
        initialSummary={summary}
        tenantId={ctx.tenantId || null}
      />
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
