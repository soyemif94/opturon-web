import { NextRequest, NextResponse } from "next/server";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  isBackendConfigured,
  validatePortalOrderTransferPayment
} from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const tenantContext = await resolveAppTenant({ requireWrite: true });
  if (tenantContext.error) return tenantContext.error;

  if (!isBackendConfigured()) {
    return noStore(NextResponse.json({ error: "orders_backend_unavailable" }, { status: 503 }));
  }

  try {
    const payload = await request.json().catch(() => null);
    const result = await validatePortalOrderTransferPayment(
      tenantContext.tenantId,
      params.id,
      payload || {},
      {
        id: tenantContext.ctx?.userId || null,
        name:
          typeof tenantContext.ctx?.session?.user?.name === "string"
            ? tenantContext.ctx.session.user.name
            : null
      }
    );
    return noStore(NextResponse.json({ ok: true, order: result.data.order, notification: result.data.notification }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : {
              error: error instanceof Error ? error.message : "backend_update_failed"
            },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
