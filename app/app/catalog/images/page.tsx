import Link from "next/link";
import { CatalogImagesWorkspace } from "@/components/app/CatalogImagesWorkspace";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { Button } from "@/components/ui/button";
import { canManageCatalog } from "@/lib/app-permissions";
import {
  getPortalProductImages,
  isBackendConfigured,
  type PortalCatalogImageWorkspaceData
} from "@/lib/api";
import { CATALOG_IMAGE_PAGE_SIZE } from "@/lib/catalog-images";
import { getPortalInventoryReadActor, requireAppModulePage } from "@/lib/saas/access";

const EMPTY_DATA: PortalCatalogImageWorkspaceData = {
  tenantId: "",
  pagination: { page: 1, pageSize: CATALOG_IMAGE_PAGE_SIZE, totalItems: 0, totalPages: 0 },
  summary: { totalProducts: 0, withImage: 0, withoutImage: 0 },
  products: []
};

export default async function CatalogImagesPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const ctx = await requireAppModulePage("catalog");
  const params = await searchParams;
  const initialSearch = String(params.search || "").trim().slice(0, 200);
  const readOnly = !canManageCatalog(ctx);
  let initialData = EMPTY_DATA;

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const result = await getPortalProductImages(ctx.tenantId, {
        search: initialSearch || undefined,
        imageFilter: "all",
        page: 1,
        pageSize: CATALOG_IMAGE_PAGE_SIZE
      }, getPortalInventoryReadActor(ctx));
      initialData = result.data;
    } catch {
      initialData = { ...EMPTY_DATA, tenantId: ctx.tenantId };
    }
  }

  return (
    <ClientPageShell
      title="Imágenes de productos"
      description="Cargá o reemplazá imágenes rápidamente sin abrir el editor completo de cada producto."
      badge="Catálogo"
      backHref="/app/catalog"
      backLabel="Volver al catálogo"
      action={
        <Button asChild variant="secondary" size="sm">
          <Link href="/app/catalog">Catálogo principal</Link>
        </Button>
      }
    >
      <CatalogImagesWorkspace initialData={initialData} readOnly={readOnly} initialSearch={initialSearch} />
    </ClientPageShell>
  );
}
