import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorStatus, getPortalOrderDetail, isBackendConfigured } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const url = new URL(request.url);
  const tenantContext = await resolveAppTenant({
    requestedTenantId: url.searchParams.get("tenantId") || undefined,
    demo: url.searchParams.get("demo") === "1"
  });
  if (tenantContext.error) return tenantContext.error;

  if (!isBackendConfigured()) {
    return noStore(NextResponse.json({ error: "orders_backend_unavailable" }, { status: 503 }));
  }

  try {
    const result = await getPortalOrderDetail(tenantContext.tenantId, params.id);
    return noStore(NextResponse.json({ tenantId: tenantContext.tenantId, order: result.data }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        {
          error: error instanceof Error ? error.message : "backend_fetch_failed"
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
