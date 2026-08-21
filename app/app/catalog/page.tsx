import Link from "next/link";
import { Plus } from "lucide-react";
import { CatalogOperationsWorkspace } from "@/components/app/CatalogOperationsWorkspace";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { Button } from "@/components/ui/button";
import { canManageCatalog } from "@/lib/app-permissions";
import {
  getPortalCatalogWorkspace,
  getPortalProductCategories,
  isBackendConfigured,
  type PortalCatalogOperationsData,
  type PortalProductCategory
} from "@/lib/api";
import { CATALOG_OPERATIONS_PAGE_SIZE } from "@/lib/catalog-operations";
import { getPortalInventoryReadActor, requireAppModulePage } from "@/lib/saas/access";

const EMPTY_DATA: PortalCatalogOperationsData = {
  tenantId: "",
  pagination: { page: 1, pageSize: CATALOG_OPERATIONS_PAGE_SIZE, totalItems: 0, totalPages: 0 },
  summary: {
    totalProducts: 0,
    withStock: 0,
    withoutStock: 0,
    withImage: 0,
    withoutImage: 0,
    activeProducts: 0,
    archivedProducts: 0
  },
  products: []
};

export default async function CatalogPage() {
  const ctx = await requireAppModulePage("catalog");
  const readOnly = !canManageCatalog(ctx);
  let initialData = { ...EMPTY_DATA, tenantId: ctx.tenantId || "" };
  let categories: PortalProductCategory[] = [];
  let initialLoadFailed = false;

  if (ctx.tenantId && isBackendConfigured()) {
    const actor = getPortalInventoryReadActor(ctx);
    const [workspaceResult, categoriesResult] = await Promise.allSettled([
      getPortalCatalogWorkspace(ctx.tenantId, { page: 1, pageSize: CATALOG_OPERATIONS_PAGE_SIZE }, actor),
      getPortalProductCategories(ctx.tenantId, undefined, actor)
    ]);
    if (workspaceResult.status === "fulfilled") {
      initialData = workspaceResult.value.data;
    } else {
      initialLoadFailed = true;
    }
    if (categoriesResult.status === "fulfilled") {
      categories = Array.isArray(categoriesResult.value.data?.categories) ? categoriesResult.value.data.categories : [];
    }
  }

  return (
    <ClientPageShell
      title="Catálogo"
      description="Encontrá, revisá y administrá productos desde una vista operativa compacta."
      badge="Catálogo comercial"
      action={!readOnly ? (
        <Button asChild type="button" size="sm">
          <Link href="/app/catalog/new"><Plus className="mr-2 size-4" />Agregar producto</Link>
        </Button>
      ) : null}
    >
      <CatalogOperationsWorkspace
        initialData={initialData}
        categories={categories}
        readOnly={readOnly}
        initialLoadFailed={initialLoadFailed}
      />
    </ClientPageShell>
  );
}
