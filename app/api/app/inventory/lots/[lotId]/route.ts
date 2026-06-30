import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus, getPortalInventoryLotDetail, isBackendConfigured } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ lotId: string }> }) {
  const url = new URL(request.url);
  const tenantContext = await resolveAppTenant({
    requestedTenantId: url.searchParams.get("tenantId") || undefined,
    demo: url.searchParams.get("demo") === "1"
  });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) {
    return noStore(NextResponse.json({ error: "inventory_backend_unavailable" }, { status: 503 }));
  }

  const { lotId } = await params;
  try {
    const result = await getPortalInventoryLotDetail(tenantContext.tenantId, lotId);
    return noStore(NextResponse.json({ lot: result.data.lot, movements: result.data.movements || [] }));
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
