import { NextRequest, NextResponse } from "next/server";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  requestAdminTenantOperationalAlerts
} from "@/lib/api";
import { requireOpturonAdminApi, resolveOpturonAdminActorId } from "@/lib/saas/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const guard = await requireOpturonAdminApi();
  if (guard.error) return guard.error;

  const actorUserId = resolveOpturonAdminActorId(guard.ctx);
  const adminWorkspaceTenantId = String(guard.ctx.tenantId || "").trim();
  const { tenantId } = await params;
  const targetTenantId = String(tenantId || "").trim();
  if (!actorUserId || !adminWorkspaceTenantId || !targetTenantId) {
    return noStore(NextResponse.json({ error: "opturon_admin_alerts_context_unavailable" }, { status: 403 }));
  }

  try {
    const result = await requestAdminTenantOperationalAlerts<{ success: boolean; data: unknown }>(
      adminWorkspaceTenantId,
      targetTenantId,
      "/observability",
      { actorUserId }
    );
    return noStore(NextResponse.json(result.data));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "admin_operational_alerts_observability_load_failed",
          detail: error instanceof Error ? error.message : "No se pudo cargar la observabilidad."
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
