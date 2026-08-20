import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus, isBackendConfigured, setPortalProductInventoryMode } from "@/lib/api";
import { canPerformTenantInventorySensitiveAction } from "@/lib/app-permissions";
import { requireAppModuleApi, resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const moduleGuard = await requireAppModuleApi("inventory", { permission: "manage_inventory_sensitive" });
  if (moduleGuard.error) return moduleGuard.error;
  if (!moduleGuard.ctx || !canPerformTenantInventorySensitiveAction(moduleGuard.ctx)) {
    return noStore(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  }
  const tenantContext = await resolveAppTenant({ permission: "manage_inventory_sensitive", requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) {
    return noStore(NextResponse.json({ error: "inventory_backend_unavailable" }, { status: 503 }));
  }

  const { productId } = await params;
  try {
    const body = await request.json().catch(() => null);
    const mode = body?.mode === "lot_based" ? "lot_based" : "legacy";
    const result = await setPortalProductInventoryMode(
      tenantContext.tenantId,
      productId,
      mode,
      body?.initialLot && typeof body.initialLot === "object" ? body.initialLot : undefined,
      {
        id: tenantContext.ctx?.portalActorId || tenantContext.ctx?.userId || null,
        name: tenantContext.ctx?.session?.user?.name || null
      }
    );
    return noStore(NextResponse.json({ ok: true, product: result.data }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object" ? backendBody : { error: error instanceof Error ? error.message : "backend_update_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
