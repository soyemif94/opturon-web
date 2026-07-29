import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus, getPortalInventoryLotHistory, isBackendConfigured } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ lotId: string }> }) {
  const tenantContext = await resolveAppTenant();
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return noStore(NextResponse.json({ error: "inventory_backend_unavailable" }, { status: 503 }));

  const { lotId } = await params;
  const url = new URL(request.url);
  try {
    const result = await getPortalInventoryLotHistory(tenantContext.tenantId, lotId, {
      pageSize: Number(url.searchParams.get("pageSize") || 25),
      offset: Number(url.searchParams.get("offset") || 0)
    });
    return noStore(NextResponse.json({ history: result.data.history || [] }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(backendBody && typeof backendBody === "object" ? backendBody : { error: "backend_fetch_failed" }, { status: getBackendErrorStatus(error) || 502 })
    );
  }
}
