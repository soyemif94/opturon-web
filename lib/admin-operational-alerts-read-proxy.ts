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
  if (guard.error) return noStore(guard.error);

  const actorUserId = resolveOpturonAdminActorId(guard.ctx);
  const adminWorkspaceTenantId = String(guard.ctx.tenantId || "").trim();
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
