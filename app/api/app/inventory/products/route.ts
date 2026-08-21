import { NextRequest, NextResponse } from "next/server";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalInventoryProducts,
  isBackendConfigured
} from "@/lib/api";
import { getPortalInventoryReadActor, requireAppModuleApi, resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const moduleGuard = await requireAppModuleApi("inventory");
  if (moduleGuard.error) return moduleGuard.error;
  const url = new URL(request.url);
  const tenantContext = await resolveAppTenant({
    requestedTenantId: url.searchParams.get("tenantId") || undefined,
    demo: url.searchParams.get("demo") === "1"
  });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) {
    return noStore(NextResponse.json({ error: "inventory_backend_unavailable" }, { status: 503 }));
  }

  try {
    const result = await getPortalInventoryProducts(tenantContext.tenantId, {
      search: url.searchParams.get("search") || undefined,
      stockFilter: (url.searchParams.get("stockFilter") as "all" | "with_stock" | "without_stock" | null) || undefined,
      productId: url.searchParams.get("productId") || undefined,
      page: Number(url.searchParams.get("page") || 1),
      pageSize: Number(url.searchParams.get("pageSize") || 50)
    }, getPortalInventoryReadActor(tenantContext.ctx || {}));
    return noStore(
      NextResponse.json({
        readOnly: tenantContext.readOnly,
        ...result.data
      })
    );
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object" ? backendBody : { error: error instanceof Error ? error.message : "backend_fetch_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
