import { NextRequest, NextResponse } from "next/server";
import { downloadPortalCatalogImportErrors, getBackendErrorStatus, isBackendConfigured } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ importId: string }> }) {
  const tenantContext = await resolveAppTenant({ permission: "manage_catalog", requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) {
    return NextResponse.json({ error: "catalog_backend_unavailable" }, { status: 503 });
  }

  const { importId } = await params;

  try {
    const buffer = await downloadPortalCatalogImportErrors(tenantContext.tenantId, importId);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="catalog-import-errors-${importId}.csv"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "catalog_import_errors_failed"
      },
      { status: getBackendErrorStatus(error) || 502 }
    );
  }
}
