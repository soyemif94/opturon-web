import { NextRequest, NextResponse } from "next/server";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalCatalogWorkspace,
  isBackendConfigured,
  type PortalCatalogImageFilter,
  type PortalCatalogStatusFilter,
  type PortalCatalogStockFilter
} from "@/lib/api";
import { getPortalInventoryReadActor, requireAppModuleApi, resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const moduleGuard = await requireAppModuleApi("catalog");
  if (moduleGuard.error) return moduleGuard.error;
  const url = new URL(request.url);
  const tenantContext = await resolveAppTenant({
    requestedTenantId: url.searchParams.get("tenantId") || undefined,
    demo: url.searchParams.get("demo") === "1"
  });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) {
    return noStore(NextResponse.json({ error: "catalog_backend_unavailable" }, { status: 503 }));
  }

  try {
    const result = await getPortalCatalogWorkspace(tenantContext.tenantId, {
      search: url.searchParams.get("search") || undefined,
      stockFilter: (url.searchParams.get("stockFilter") || "all") as PortalCatalogStockFilter,
      imageFilter: (url.searchParams.get("imageFilter") || "all") as PortalCatalogImageFilter,
      statusFilter: (url.searchParams.get("statusFilter") || "all") as PortalCatalogStatusFilter,
      categoryId: url.searchParams.get("categoryId") || undefined,
      page: Number(url.searchParams.get("page") || 1),
      pageSize: Number(url.searchParams.get("pageSize") || 50)
    }, getPortalInventoryReadActor(tenantContext.ctx));
    return noStore(NextResponse.json({ ...result.data, readOnly: tenantContext.readOnly }));
  } catch (error) {
    const body = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        body && typeof body === "object" ? body : { error: "catalog_workspace_fetch_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
