import "server-only";

import { NextRequest, NextResponse } from "next/server";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  requestAdminTenantOperationalAlerts
} from "@/lib/api";
import { sanitizeOperationalAlertsPayload } from "@/lib/operational-alerts";
import { requireOpturonAdminApi, resolveOpturonAdminActorId } from "@/lib/saas/access";

const TENANT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ADMIN_OPERATIONAL_ALERTS_READ_QUERY_KEYS = {
  rules: new Set(["limit", "eventType", "enabled", "includeArchived"]),
  recipients: new Set(["limit"]),
  history: new Set(["eventType", "ruleId", "status", "dateFrom", "dateTo", "recipientId", "page", "pageSize"])
} as const;

type ReadResource = keyof typeof ADMIN_OPERATIONAL_ALERTS_READ_QUERY_KEYS;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function invalidRequest(error: string, status = 400) {
  return noStore(NextResponse.json({ error }, { status }));
}

function serializeAllowedQuery(request: NextRequest, allowedKeys: ReadonlySet<string>) {
  const query = new URLSearchParams();
  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    if (!allowedKeys.has(key)) return null;
    query.append(key, value);
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export async function proxyAdminTenantOperationalAlertsRead(
  request: NextRequest,
  tenantId: string,
  resource: ReadResource
) {
  const guard = await requireOpturonAdminApi();
  if (guard.error || !guard.ctx) {
    return noStore(guard.error || NextResponse.json({ error: "opturon_admin_alerts_context_unavailable" }, { status: 403 }));
  }
  const ctx = guard.ctx;

  const actorUserId = resolveOpturonAdminActorId(ctx);
  const adminWorkspaceTenantId = String(ctx.tenantId || "").trim();
  const targetTenantId = String(tenantId || "").trim();
  if (!TENANT_ID_PATTERN.test(targetTenantId)) {
    return invalidRequest("operational_alerts_tenant_id_invalid");
  }
  if (!actorUserId || !adminWorkspaceTenantId) {
    return invalidRequest("opturon_admin_alerts_context_unavailable", 403);
  }

  const query = serializeAllowedQuery(request, ADMIN_OPERATIONAL_ALERTS_READ_QUERY_KEYS[resource]);
  if (query === null) return invalidRequest("operational_alerts_query_not_allowed");

  try {
    const result = await requestAdminTenantOperationalAlerts<{ success: boolean; data: unknown }>(
      adminWorkspaceTenantId,
      targetTenantId,
      `/${resource}${query}`,
      { method: "GET", actorUserId }
    );
    return noStore(NextResponse.json(sanitizeOperationalAlertsPayload(result.data)));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: `admin_operational_alerts_${resource}_load_failed`,
          detail: error instanceof Error ? error.message : "No se pudo completar la solicitud."
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}

/**
 * The backend already has a sanitized, tenant-scoped history detail endpoint.
 * Keep the Admin wrapper narrow so the browser can only request a UUID from
 * the selected tenant and never supply an actor or internal scope header.
 */
export async function proxyAdminTenantOperationalAlertsHistoryDetail(
  request: NextRequest,
  tenantId: string,
  instanceId: string
) {
  const guard = await requireOpturonAdminApi();
  if (guard.error || !guard.ctx) {
    return noStore(guard.error || NextResponse.json({ error: "opturon_admin_alerts_context_unavailable" }, { status: 403 }));
  }
  const ctx = guard.ctx;

  const actorUserId = resolveOpturonAdminActorId(ctx);
  const adminWorkspaceTenantId = String(ctx.tenantId || "").trim();
  const targetTenantId = String(tenantId || "").trim();
  const safeInstanceId = String(instanceId || "").trim();
  if (!TENANT_ID_PATTERN.test(targetTenantId)) {
    return invalidRequest("operational_alerts_tenant_id_invalid");
  }
  if (!UUID_PATTERN.test(safeInstanceId)) {
    return invalidRequest("operational_alert_history_instance_id_invalid");
  }
  if (!actorUserId || !adminWorkspaceTenantId) {
    return invalidRequest("opturon_admin_alerts_context_unavailable", 403);
  }
  if (request.method.toUpperCase() !== "GET" || request.nextUrl.search) {
    return invalidRequest("operational_alerts_history_detail_request_invalid");
  }

  try {
    const result = await requestAdminTenantOperationalAlerts<{ success: boolean; data: unknown }>(
      adminWorkspaceTenantId,
      targetTenantId,
      `/history/${encodeURIComponent(safeInstanceId)}`,
      { method: "GET", actorUserId }
    );
    return noStore(NextResponse.json(sanitizeOperationalAlertsPayload(result.data)));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "admin_operational_alerts_history_detail_load_failed",
          detail: error instanceof Error ? error.message : "No se pudo completar la solicitud."
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
