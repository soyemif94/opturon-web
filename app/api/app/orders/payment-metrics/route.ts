import { NextRequest, NextResponse } from "next/server";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalOrderPaymentMetrics,
  isBackendConfigured,
  type PortalOrderPaymentMetricsRange
} from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(NextResponse.json({ error: "orders_backend_unavailable" }, { status: 503 }));
}

function normalizeRange(value: string | null): PortalOrderPaymentMetricsRange {
  if (value === "today" || value === "last_30_days") return value;
  return "last_7_days";
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tenantContext = await resolveAppTenant({
    requestedTenantId: url.searchParams.get("tenantId") || undefined,
    demo: url.searchParams.get("demo") === "1"
  });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const result = await getPortalOrderPaymentMetrics(tenantContext.tenantId, normalizeRange(url.searchParams.get("range")));
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
