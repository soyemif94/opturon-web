import { NextRequest, NextResponse } from "next/server";
import { blockPortalInventoryLot, getBackendErrorBody, getBackendErrorStatus, isBackendConfigured } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ lotId: string }> }) {
  const tenantContext = await resolveAppTenant({ permission: "manage_inventory_sensitive", requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return noStore(NextResponse.json({ error: "inventory_backend_unavailable" }, { status: 503 }));

  const { lotId } = await params;
  try {
    const body = await request.json().catch(() => null);
    const actor = {
      id: tenantContext.ctx?.portalActorId || tenantContext.ctx?.userId || null,
      name: tenantContext.ctx?.session?.user?.name || null
    };
    const result = await blockPortalInventoryLot(tenantContext.tenantId, lotId, {
      reason: body?.reason || "",
      idempotencyKey: body?.idempotencyKey || ""
    }, actor);
    return noStore(NextResponse.json({ ok: true, lot: result.data.lot, idempotent: result.data.idempotent === true }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(backendBody && typeof backendBody === "object" ? backendBody : { error: "backend_block_failed" }, { status: getBackendErrorStatus(error) || 502 })
    );
  }
}
