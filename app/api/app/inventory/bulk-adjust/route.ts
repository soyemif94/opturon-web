import { NextRequest, NextResponse } from "next/server";
import {
  createPortalInventoryBulkAdjustment,
  getBackendErrorBody,
  getBackendErrorStatus,
  isBackendConfigured,
  type PortalInventoryBulkAdjustmentReason
} from "@/lib/api";
import { canPerformTenantInventorySensitiveAction } from "@/lib/app-permissions";
import { requireAppModuleApi, resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest) {
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

  try {
    const body = await request.json().catch(() => null);
    const actor = {
      id: tenantContext.ctx?.portalActorId || tenantContext.ctx?.userId || null,
      name: tenantContext.ctx?.session?.user?.name || null
    };
    const result = await createPortalInventoryBulkAdjustment(
      tenantContext.tenantId,
      {
        idempotencyKey: String(body?.idempotencyKey || "").trim(),
        reason: body?.reason as PortalInventoryBulkAdjustmentReason,
        note: typeof body?.note === "string" && body.note.trim() ? body.note.trim() : null,
        items: Array.isArray(body?.items)
          ? body.items.map((item: Record<string, unknown>) => ({
              productId: item?.productId,
              targetQuantity: item?.targetQuantity,
              expectedCurrentQuantity: item?.expectedCurrentQuantity
            }))
          : []
      },
      actor
    );

    return noStore(NextResponse.json(result.data, { status: result.data.idempotent ? 200 : 201 }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : { error: error instanceof Error ? error.message : "inventory_bulk_adjust_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
