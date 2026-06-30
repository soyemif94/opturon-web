import { NextResponse } from "next/server";
import { downloadPortalCatalogImportTemplate, getBackendErrorStatus, isBackendConfigured } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

export async function GET() {
  const tenantContext = await resolveAppTenant({ permission: "manage_catalog", requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) {
    return NextResponse.json({ error: "catalog_backend_unavailable" }, { status: 503 });
  }

  try {
    const buffer = await downloadPortalCatalogImportTemplate(tenantContext.tenantId);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="catalog-import-template.xlsx"',
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "catalog_import_template_failed"
      },
      { status: getBackendErrorStatus(error) || 502 }
    );
  }
}
