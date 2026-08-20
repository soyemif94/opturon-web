import { NextRequest, NextResponse } from "next/server";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalInventoryMovements,
  isBackendConfigured
} from "@/lib/api";
import { getPortalInventoryReadActor, requireAppModuleApi, resolveAppTenant } from "@/lib/saas/access";
import { parseInventoryMovementsQuery } from "./query";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(NextResponse.json({ error: "inventory_backend_unavailable" }, { status: 503 }));
}

export async function GET(request: NextRequest) {
  const moduleGuard = await requireAppModuleApi("inventory");
  if (moduleGuard.error) return moduleGuard.error;
  const url = new URL(request.url);
  const parsedQuery = parseInventoryMovementsQuery(url.searchParams);
  if (!parsedQuery.ok) {
    return noStore(NextResponse.json({ error: parsedQuery.error }, { status: 400 }));
  }
  const tenantContext = await resolveAppTenant({
    requestedTenantId: url.searchParams.get("tenantId") || undefined,
    demo: url.searchParams.get("demo") === "1"
  });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const result = await getPortalInventoryMovements(tenantContext.tenantId, parsedQuery.options, getPortalInventoryReadActor(tenantContext.ctx || {}));
    return noStore(
      NextResponse.json({
        readOnly: tenantContext.readOnly,
        tenantId: tenantContext.tenantId,
        items: Array.isArray(result.data?.items) ? result.data.items : [],
        page: result.data?.page || parsedQuery.options.page,
        pageSize: result.data?.pageSize || parsedQuery.options.pageSize,
        total: result.data?.total || 0
      })
    );
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : { error: error instanceof Error ? error.message : "backend_fetch_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
