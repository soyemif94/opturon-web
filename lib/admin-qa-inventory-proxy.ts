import "server-only";

import { NextRequest, NextResponse } from "next/server";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  requestAdminTenantQaInventory
} from "@/lib/api";
import { requireOpturonAdminApi, resolveOpturonAdminActorId } from "@/lib/saas/access";

const TENANT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMPTY_BODY_KEYS = new Set<string>();
const LOT_KEYS = new Set(["productId", "locationId"]);

type QaInventoryOperation = "productCreate" | "locationCreate" | "lotCreate" | "lotRollback";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function errorResponse(error: string, status = 400) {
  return noStore(NextResponse.json({ error }, { status }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(payload: Record<string, unknown>, allowedKeys: ReadonlySet<string>) {
  return Object.keys(payload).every((key) => allowedKeys.has(key));
}

function isUuid(value: unknown) {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

function hasNoQuery(request: NextRequest) {
  return Array.from(request.nextUrl.searchParams.keys()).length === 0;
}

function validatePayload(operation: QaInventoryOperation, payload: unknown) {
  if (!isRecord(payload)) return null;

  switch (operation) {
    case "productCreate":
      // The backend owns the canonical QA name, metadata, inventory mode,
      // stock, and idempotency key. The browser can request only the action.
      return hasOnlyKeys(payload, EMPTY_BODY_KEYS) ? payload : null;
    case "locationCreate":
      // Same invariant for the canonical internal-only QA location.
      return hasOnlyKeys(payload, EMPTY_BODY_KEYS) ? payload : null;
    case "lotCreate":
      return hasOnlyKeys(payload, LOT_KEYS) &&
        Object.prototype.hasOwnProperty.call(payload, "productId") &&
        Object.prototype.hasOwnProperty.call(payload, "locationId") &&
        isUuid(payload.productId) &&
        isUuid(payload.locationId)
        ? payload
        : null;
    case "lotRollback":
      // The backend fixes the one-unit manual decrease, reference, reason,
      // metadata, and idempotency key from the scoped QA lot.
      return hasOnlyKeys(payload, EMPTY_BODY_KEYS) ? payload : null;
  }
}

export async function proxyAdminTenantQaInventory(
  request: NextRequest,
  tenantId: string,
  operation: QaInventoryOperation,
  lotId?: string
) {
  const guard = await requireOpturonAdminApi();
  if (guard.error) return noStore(guard.error);

  const actorUserId = resolveOpturonAdminActorId(guard.ctx);
  const adminWorkspaceTenantId = String(guard.ctx.tenantId || "").trim();
  const targetTenantId = String(tenantId || "").trim();
  if (!TENANT_ID_PATTERN.test(targetTenantId)) {
    return errorResponse("admin_qa_inventory_tenant_id_invalid");
  }
  if (!actorUserId || !adminWorkspaceTenantId) {
    return errorResponse("admin_qa_inventory_context_unavailable", 403);
  }
  if (!hasNoQuery(request)) return errorResponse("admin_qa_inventory_query_not_allowed");
  if (request.method.toUpperCase() !== "POST") {
    return errorResponse("admin_qa_inventory_method_not_allowed", 405);
  }

  const body = validatePayload(operation, await request.json().catch(() => null));
  if (!body) return errorResponse("admin_qa_inventory_payload_invalid");
  const safeLotId = String(lotId || "").trim();
  if (operation === "lotRollback" && !isUuid(safeLotId)) {
    return errorResponse("admin_qa_inventory_target_invalid");
  }

  try {
    const result = await requestAdminTenantQaInventory<{ success: boolean; data: unknown }>(
      adminWorkspaceTenantId,
      targetTenantId,
      operation,
      { actorUserId, body, lotId: operation === "lotRollback" ? safeLotId : undefined }
    );
    return noStore(NextResponse.json(result.data));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "admin_qa_inventory_request_failed",
          detail: error instanceof Error ? error.message : "No se pudo completar la solicitud de inventario QA."
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
