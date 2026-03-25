import { NextRequest, NextResponse } from "next/server";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  isBackendConfigured,
  patchPortalPaymentDestination
} from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(NextResponse.json({ error: "payment_destinations_backend_unavailable" }, { status: 503 }));
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const tenantContext = await resolveAppTenant({ requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const result = await patchPortalPaymentDestination(tenantContext.tenantId, id, {
      name: body?.name,
      type: body?.type,
      isActive: typeof body?.isActive === "boolean" ? body.isActive : undefined
    });

    return noStore(NextResponse.json({ ok: true, paymentDestination: result.data }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : { error: error instanceof Error ? error.message : "backend_update_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
