import { NextRequest, NextResponse } from "next/server";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  isBackendConfigured,
  patchPortalSupplierStatus
} from "@/lib/api";
import { requireAppModuleApi, resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(NextResponse.json({ error: "suppliers_backend_unavailable" }, { status: 503 }));
}

function actorFromTenantContext(tenantContext: Awaited<ReturnType<typeof resolveAppTenant>>) {
  return {
    id: tenantContext.ctx?.portalActorId || tenantContext.ctx?.userId || null,
    name: tenantContext.ctx?.session?.user?.name || null
  };
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ supplierId: string }> }) {
  const moduleGuard = await requireAppModuleApi("inventory", { permission: "manage_inventory_receipts" });
  if (moduleGuard.error) return moduleGuard.error;
  const tenantContext = await resolveAppTenant({ permission: "manage_inventory_receipts", requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const body = await request.json().catch(() => null);
    const { supplierId } = await context.params;
    const result = await patchPortalSupplierStatus(
      tenantContext.tenantId,
      supplierId,
      { status: body?.status === "inactive" ? "inactive" : "active" },
      actorFromTenantContext(tenantContext)
    );
    return noStore(NextResponse.json({ ok: true, supplier: result.data }));
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
