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

type OperationalAlertsEnabledPayload = {
  operationalAlertsEnabled: boolean;
};

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function errorResponse(error: unknown, fallback: string) {
  return noStore(
    NextResponse.json(
      getBackendErrorBody(error) || {
        error: fallback,
        detail: error instanceof Error ? error.message : "No se pudo completar la solicitud."
      },
      { status: getBackendErrorStatus(error) || 502 }
    )
  );
}

function parsePayload(value: unknown): OperationalAlertsEnabledPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  if (Object.keys(payload).length !== 1 || typeof payload.operationalAlertsEnabled !== "boolean") return null;
  return { operationalAlertsEnabled: payload.operationalAlertsEnabled };
}

async function resolveRequestContext(tenantId: string) {
  const guard = await requireOpturonAdminApi();
  if (guard.error) return { error: guard.error };

  const actorUserId = resolveOpturonAdminActorId(guard.ctx);
  const adminWorkspaceTenantId = String(guard.ctx.tenantId || "").trim();
  const targetTenantId = String(tenantId || "").trim();
  if (!actorUserId || !adminWorkspaceTenantId || !targetTenantId) {
    return {
      error: noStore(NextResponse.json({ error: "opturon_admin_alerts_context_unavailable" }, { status: 403 }))
    };
  }

  return { actorUserId, adminWorkspaceTenantId, targetTenantId };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const context = await resolveRequestContext(tenantId);
  if ("error" in context) return context.error;

  try {
    const result = await requestAdminTenantOperationalAlerts<{ success: boolean; data: unknown }>(
      context.adminWorkspaceTenantId,
      context.targetTenantId,
      "/settings",
      { actorUserId: context.actorUserId }
    );
    return noStore(NextResponse.json(result.data));
  } catch (error) {
    return errorResponse(error, "admin_operational_alerts_settings_load_failed");
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const context = await resolveRequestContext(tenantId);
  if ("error" in context) return context.error;

  const payload = parsePayload(await request.json().catch(() => null));
  if (!payload) {
    return noStore(NextResponse.json({ error: "operational_alert_settings_payload_invalid" }, { status: 400 }));
  }

  try {
    const result = await requestAdminTenantOperationalAlerts<{ success: boolean; data: unknown }>(
      context.adminWorkspaceTenantId,
      context.targetTenantId,
      "/settings",
      { method: "PATCH", actorUserId: context.actorUserId, body: payload }
    );
    return noStore(NextResponse.json(result.data));
  } catch (error) {
    return errorResponse(error, "admin_operational_alerts_settings_update_failed");
  }
}
