import { NextRequest, NextResponse } from "next/server";
import {
  createPortalInventoryLocation,
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalInventoryLocations,
  isBackendConfigured
} from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET() {
  const tenantContext = await resolveAppTenant();
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return noStore(NextResponse.json({ error: "inventory_backend_unavailable" }, { status: 503 }));

  try {
    const result = await getPortalInventoryLocations(tenantContext.tenantId);
    return noStore(NextResponse.json({ locations: result.data.locations || [], readOnly: tenantContext.readOnly }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(backendBody && typeof backendBody === "object" ? backendBody : { error: "backend_fetch_failed" }, { status: getBackendErrorStatus(error) || 502 })
    );
  }
}

export async function POST(request: NextRequest) {
  const tenantContext = await resolveAppTenant({ permission: "manage_inventory_sensitive", requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return noStore(NextResponse.json({ error: "inventory_backend_unavailable" }, { status: 503 }));

  try {
    const body = await request.json().catch(() => null);
    const actor = {
      id: tenantContext.ctx?.portalActorId || tenantContext.ctx?.userId || null,
      name: tenantContext.ctx?.session?.user?.name || null
    };
    const result = await createPortalInventoryLocation(tenantContext.tenantId, {
      code: body?.code || null,
      name: body?.name || "",
      type: body?.type || "other",
      active: body?.active !== false
    }, actor);
    return noStore(NextResponse.json({ ok: true, location: result.data.location }, { status: 201 }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(backendBody && typeof backendBody === "object" ? backendBody : { error: "backend_create_failed" }, { status: getBackendErrorStatus(error) || 502 })
    );
  }
}
