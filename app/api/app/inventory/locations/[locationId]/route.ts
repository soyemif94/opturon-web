import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus, isBackendConfigured, updatePortalInventoryLocation } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ locationId: string }> }) {
  const tenantContext = await resolveAppTenant({ permission: "manage_inventory_sensitive", requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return noStore(NextResponse.json({ error: "inventory_backend_unavailable" }, { status: 503 }));

  const { locationId } = await params;
  try {
    const body = await request.json().catch(() => null);
    const actor = {
      id: tenantContext.ctx?.portalActorId || tenantContext.ctx?.userId || null,
      name: tenantContext.ctx?.session?.user?.name || null
    };
    const result = await updatePortalInventoryLocation(tenantContext.tenantId, locationId, {
      code: body?.code || null,
      name: body?.name || null,
      type: body?.type || undefined,
      active: typeof body?.active === "boolean" ? body.active : undefined
    }, actor);
    return noStore(NextResponse.json({ ok: true, location: result.data.location }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(backendBody && typeof backendBody === "object" ? backendBody : { error: "backend_update_failed" }, { status: getBackendErrorStatus(error) || 502 })
    );
  }
}
