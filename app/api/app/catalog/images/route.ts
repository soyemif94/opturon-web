import { NextRequest, NextResponse } from "next/server";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalProductImages,
  isBackendConfigured,
  type PortalCatalogImageFilter
} from "@/lib/api";
import { requireAppModuleApi, resolveAppTenant } from "@/lib/saas/access";

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
    const imageFilter = String(url.searchParams.get("imageFilter") || "all") as PortalCatalogImageFilter;
    const result = await getPortalProductImages(tenantContext.tenantId, {
      search: url.searchParams.get("search") || undefined,
      imageFilter,
      page: Number(url.searchParams.get("page") || 1),
      pageSize: Number(url.searchParams.get("pageSize") || 50)
    });
    return noStore(NextResponse.json({ ...result.data, readOnly: tenantContext.readOnly }));
  } catch (error) {
    const body = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        body && typeof body === "object" ? body : { error: "catalog_images_fetch_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
