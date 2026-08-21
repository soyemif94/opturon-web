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
import { requireAppModulePage } from "@/lib/saas/access";

const EMPTY_DATA: PortalCatalogImageWorkspaceData = {
  tenantId: "",
  pagination: { page: 1, pageSize: CATALOG_IMAGE_PAGE_SIZE, totalItems: 0, totalPages: 0 },
  summary: { totalProducts: 0, withImage: 0, withoutImage: 0 },
  products: []
};

export default async function CatalogImagesPage() {
  const ctx = await requireAppModulePage("catalog");
  const readOnly = !canManageCatalog(ctx);
  let initialData = EMPTY_DATA;

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const result = await getPortalProductImages(ctx.tenantId, {
        imageFilter: "all",
        page: 1,
        pageSize: CATALOG_IMAGE_PAGE_SIZE
      });
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
      <CatalogImagesWorkspace initialData={initialData} readOnly={readOnly} />
    </ClientPageShell>
  );
}
