import { NextRequest, NextResponse } from "next/server";
import { bulkWriteoffExpiredPortalInventoryLots, getBackendErrorBody, getBackendErrorStatus, isBackendConfigured } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest) {
  const tenantContext = await resolveAppTenant({ permission: "manage_catalog", requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return noStore(NextResponse.json({ error: "inventory_backend_unavailable" }, { status: 503 }));

  try {
    const body = await request.json().catch(() => null);
    const result = await bulkWriteoffExpiredPortalInventoryLots(tenantContext.tenantId, {
      lotIds: Array.isArray(body?.lotIds) ? body.lotIds : [],
      reason: body?.reason || "Producto vencido",
      notes: body?.notes || null
    });
    return noStore(NextResponse.json({ ok: true, writtenOff: result.data.writtenOff }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object" ? backendBody : { error: error instanceof Error ? error.message : "backend_writeoff_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
