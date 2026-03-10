import { NextRequest, NextResponse } from "next/server";
import {
  createPortalOrder,
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalOrders,
  isBackendConfigured
} from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(
    NextResponse.json(
      {
        error: "orders_backend_unavailable"
      },
      { status: 503 }
    )
  );
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
    const result = await getPortalOrders(tenantContext.tenantId);
    return noStore(
      NextResponse.json({
        readOnly: tenantContext.readOnly,
        tenantId: tenantContext.tenantId,
        orders: result.data.orders || []
      })
    );
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

export async function POST(request: NextRequest) {
  const tenantContext = await resolveAppTenant({ requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const payload = await request.json().catch(() => null);
    const result = await createPortalOrder(tenantContext.tenantId, payload || {});
    return noStore(NextResponse.json({ ok: true, order: result.data }, { status: 201 }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : {
              error: error instanceof Error ? error.message : "backend_create_failed"
            },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
