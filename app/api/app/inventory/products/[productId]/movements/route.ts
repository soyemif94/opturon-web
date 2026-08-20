import { NextRequest, NextResponse } from "next/server";
import {
  createPortalInventoryMovement,
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalInventoryProductHistory,
  isBackendConfigured
} from "@/lib/api";
import { canPerformTenantInventorySensitiveAction } from "@/lib/app-permissions";
import { getPortalInventoryReadActor, requireAppModuleApi, resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function actorFromTenantContext(tenantContext: Awaited<ReturnType<typeof resolveAppTenant>>) {
  if (!("ctx" in tenantContext) || !tenantContext.ctx) return undefined;
  const sessionUser = tenantContext.ctx.session?.user;
  return {
    id: tenantContext.ctx.portalActorId || tenantContext.ctx.userId || null,
    name: sessionUser?.name || null
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const moduleGuard = await requireAppModuleApi("inventory");
  if (moduleGuard.error) return moduleGuard.error;
  const url = new URL(request.url);
  const tenantContext = await resolveAppTenant({
    requestedTenantId: url.searchParams.get("tenantId") || undefined,
    demo: url.searchParams.get("demo") === "1"
  });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) {
    return noStore(NextResponse.json({ error: "inventory_backend_unavailable" }, { status: 503 }));
  }

  const { productId } = await params;

  try {
    const result = await getPortalInventoryProductHistory(tenantContext.tenantId, productId, {
      page: Number(url.searchParams.get("page") || 1),
      pageSize: Number(url.searchParams.get("pageSize") || 25)
    }, getPortalInventoryReadActor(tenantContext.ctx || {}));
    return noStore(NextResponse.json(result.data));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object" ? backendBody : { error: error instanceof Error ? error.message : "backend_fetch_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
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
    const result = await createPortalInventoryMovement(
      tenantContext.tenantId,
      productId,
      {
        movementType: body?.movementType,
        quantity: body?.quantity,
        countedStock: body?.countedStock,
        reason: body?.reason || null,
        referenceType: body?.referenceType || null,
        referenceId: body?.referenceId || null,
        idempotencyKey: String(body?.idempotencyKey || "").trim(),
        metadata: body?.metadata && typeof body.metadata === "object" ? body.metadata : {}
      },
      actorFromTenantContext(tenantContext)
    );
    return noStore(NextResponse.json(result.data, { status: result.data.idempotent ? 200 : 201 }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object" ? backendBody : { error: error instanceof Error ? error.message : "backend_create_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
