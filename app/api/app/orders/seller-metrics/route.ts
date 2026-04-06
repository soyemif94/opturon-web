import { NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus, getPortalSellerMetrics, isBackendConfigured } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(NextResponse.json({ error: "orders_backend_unavailable" }, { status: 503 }));
}

export async function GET() {
  const tenantContext = await resolveAppTenant();
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const result = await getPortalSellerMetrics(tenantContext.tenantId);
    return noStore(NextResponse.json(result.data));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : {
              error: error instanceof Error ? error.message : "backend_fetch_failed"
            },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
