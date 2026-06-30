import { NextRequest, NextResponse } from "next/server";
import { adjustPortalInventoryLot, getBackendErrorBody, getBackendErrorStatus, isBackendConfigured } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ lotId: string }> }) {
  const tenantContext = await resolveAppTenant({ permission: "manage_catalog", requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) {
    return noStore(NextResponse.json({ error: "inventory_backend_unavailable" }, { status: 503 }));
  }

  const { lotId } = await params;
  try {
    const body = await request.json().catch(() => null);
    const result = await adjustPortalInventoryLot(tenantContext.tenantId, lotId, {
      movementType: body?.movementType || "manual_adjustment_out",
      quantity: Number(body?.quantity || 0),
      reason: body?.reason || null,
      referenceType: body?.referenceType || null,
      referenceId: body?.referenceId || null,
      metadata: body?.metadata && typeof body.metadata === "object" ? body.metadata : {}
    });
    return noStore(NextResponse.json({ ok: true, lot: result.data.lot, movement: result.data.movement }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object" ? backendBody : { error: error instanceof Error ? error.message : "backend_adjust_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
