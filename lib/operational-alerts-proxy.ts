import "server-only";

import type { NextRequest } from "next/server";
import { requestPortalOperationalAlerts } from "@/lib/api";
import { sanitizeOperationalAlertsPayload } from "@/lib/operational-alerts";

type OperationalAlertsSessionContext = {
  tenantId?: string;
  portalActorId?: string;
  userId?: string;
};

type RouteMatch = {
  path: string;
  queryKeys: Set<string>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMPTY_QUERY = new Set<string>();
const RECIPIENT_QUERY = new Set(["limit"]);
const RULE_QUERY = new Set(["limit", "eventType", "enabled", "includeArchived"]);
const HISTORY_QUERY = new Set(["eventType", "ruleId", "status", "dateFrom", "dateTo", "recipientId", "page", "pageSize"]);

class OperationalAlertsProxyError extends Error {
  status: number;
  body: { error: string };

  constructor(code: string, status: number) {
    super(code);
    this.name = "OperationalAlertsProxyError";
    this.status = status;
    this.body = { error: code };
  }
}

function routeFor(method: string, segments: string[]): RouteMatch | null {
  const [resource, id, action] = segments;
  if (segments.length === 1 && ["event-types", "settings"].includes(resource) && method === "GET") {
    return { path: `/${resource}`, queryKeys: EMPTY_QUERY };
  }
  if (resource === "recipients") {
    if (segments.length === 1 && ["GET", "POST"].includes(method)) {
      return { path: "/recipients", queryKeys: method === "GET" ? RECIPIENT_QUERY : EMPTY_QUERY };
    }
    if (!UUID_PATTERN.test(id || "")) return null;
    if (segments.length === 2 && ["GET", "PATCH"].includes(method)) {
      return { path: `/recipients/${id}`, queryKeys: EMPTY_QUERY };
    }
    if (segments.length === 3 && ["disable", "consent"].includes(action) && method === "POST") {
      return { path: `/recipients/${id}/${action}`, queryKeys: EMPTY_QUERY };
    }
    return null;
  }
  if (resource === "rules") {
    if (segments.length === 1 && ["GET", "POST"].includes(method)) {
      return { path: "/rules", queryKeys: method === "GET" ? RULE_QUERY : EMPTY_QUERY };
    }
    if (!UUID_PATTERN.test(id || "")) return null;
    if (segments.length === 2 && ["GET", "PATCH"].includes(method)) {
      return { path: `/rules/${id}`, queryKeys: EMPTY_QUERY };
    }
    const actionMethods: Record<string, string> = {
      recipients: "PUT",
      readiness: "GET",
      enable: "POST",
      disable: "POST",
      preview: "POST"
    };
    if (segments.length === 3 && actionMethods[action] === method) {
      return { path: `/rules/${id}/${action}`, queryKeys: EMPTY_QUERY };
    }
    return null;
  }
  if (resource === "history") {
    if (segments.length === 1 && method === "GET") return { path: "/history", queryKeys: HISTORY_QUERY };
    if (segments.length === 2 && method === "GET" && UUID_PATTERN.test(id || "")) {
      return { path: `/history/${id}`, queryKeys: EMPTY_QUERY };
    }
  }
  return null;
}

function filteredQuery(request: NextRequest, allowedKeys: Set<string>) {
  const query = new URLSearchParams();
  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    if (!allowedKeys.has(key)) throw new OperationalAlertsProxyError("operational_alerts_query_not_allowed", 400);
    query.append(key, value);
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export async function proxyOperationalAlertsRequest(
  ctx: OperationalAlertsSessionContext,
  request: NextRequest,
  segments: string[]
) {
  const tenantId = String(ctx.tenantId || "").trim();
  const actorUserId = String(ctx.portalActorId || ctx.userId || "").trim();
  if (!tenantId) throw new OperationalAlertsProxyError("missing_tenant_context", 400);
  if (!actorUserId) throw new OperationalAlertsProxyError("operational_alerts_actor_missing", 403);

  const method = request.method.toUpperCase();
  const match = routeFor(method, segments);
  if (!match) throw new OperationalAlertsProxyError("operational_alerts_route_not_allowed", 404);

  let body: unknown;
  if (method !== "GET") {
    try {
      body = await request.json();
    } catch {
      throw new OperationalAlertsProxyError("operational_alerts_payload_invalid", 400);
    }
  }

  const response = await requestPortalOperationalAlerts<{ success: boolean; data: unknown }>(
    tenantId,
    `${match.path}${filteredQuery(request, match.queryKeys)}`,
    {
      method: method as "GET" | "POST" | "PATCH" | "PUT",
      actorUserId,
      body
    }
  );
  return sanitizeOperationalAlertsPayload(response.data);
}
