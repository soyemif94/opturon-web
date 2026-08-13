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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; ruleId: string }> }
) {
  const guard = await requireOpturonAdminApi();
  if (guard.error) return guard.error;

  const actorUserId = resolveOpturonAdminActorId(guard.ctx);
  const adminWorkspaceTenantId = String(guard.ctx.tenantId || "").trim();
  const { tenantId, ruleId } = await params;
  const targetTenantId = String(tenantId || "").trim();
  const safeRuleId = String(ruleId || "").trim();
  if (!actorUserId || !adminWorkspaceTenantId || !targetTenantId) {
    return noStore(NextResponse.json({ error: "opturon_admin_alerts_context_unavailable" }, { status: 403 }));
  }
  if (!UUID_PATTERN.test(safeRuleId)) {
    return noStore(NextResponse.json({ error: "operational_alert_rule_id_invalid" }, { status: 400 }));
  }

  try {
    const result = await requestAdminTenantOperationalAlerts<{ success: boolean; data: unknown }>(
      adminWorkspaceTenantId,
      targetTenantId,
      `/rules/${encodeURIComponent(safeRuleId)}/canary-preflight`,
      { actorUserId }
    );
    return noStore(NextResponse.json(result.data));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "admin_operational_alert_canary_preflight_failed",
          detail: error instanceof Error ? error.message : "No se pudo cargar el preflight."
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
