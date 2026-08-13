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
const CANARY_NAME_PREFIX = "Opturon Canary";
const INVENTORY_LOT_EXPIRING_EVENT_TYPE = "inventory.lot_expiring";
const INVENTORY_LOT_EXPIRING_EVENT_VERSION = 1;
const INVENTORY_LOT_EXPIRING_TEMPLATE_KEY = "inventory_lot_expiring_v1";
const INVENTORY_LOT_EXPIRING_TEMPLATE_LANGUAGE = "es_AR";
const INVENTORY_LOT_EXPIRING_FORMATTER_KEY = "inventory_lot_expiring";
const INVENTORY_LOT_EXPIRING_FORMATTER_VERSION = 1;

const RECIPIENT_CREATE_KEYS = new Set(["name", "phoneE164", "roleLabel", "areaKeys", "staffUserId"]);
const RECIPIENT_ACTIVE_KEYS = new Set(["active", "expectedVersion"]);
const RECIPIENT_CONSENT_KEYS = new Set(["status", "consentSource", "consentedAt", "revokedAt", "expectedVersion"]);
const EXPECTED_VERSION_KEYS = new Set(["expectedVersion"]);
const RULE_WRITE_KEYS = new Set([
  "name",
  "eventType",
  "eventVersion",
  "triggerMode",
  "conditions",
  "schedule",
  "deliveryPolicy",
  "channelId",
  "templateKey",
  "templateLanguage",
  "formatterKey",
  "formatterVersion"
]);
const RULE_PATCH_KEYS = new Set([...RULE_WRITE_KEYS, "expectedConfigVersion"]);
const RULE_RECIPIENT_KEYS = new Set(["recipientIds", "expectedConfigVersion"]);
const EXPECTED_CONFIG_VERSION_KEYS = new Set(["expectedConfigVersion"]);
const INVENTORY_CONDITION_KEYS = new Set(["daysBefore", "minimumAvailableQuantity", "quantityBasis", "repeatPolicy"]);
const INVENTORY_SCHEDULE_KEYS = new Set(["frequency", "sendAt", "timezone"]);
const DELIVERY_POLICY_KEYS = new Set(["maxAgeSeconds", "maxAttempts", "cooldownSeconds", "aggregationMode", "maxItems"]);

type WriteOperation =
  | "recipientCreate"
  | "recipientActive"
  | "recipientConsent"
  | "recipientDisable"
  | "ruleCreate"
  | "ruleUpdate"
  | "ruleRecipients"
  | "ruleEnable"
  | "ruleDisable";

type WriteRequest = {
  method: "POST" | "PATCH" | "PUT";
  path: string;
  body: Record<string, unknown>;
};

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

function isUuid(value: string | undefined) {
  return UUID_PATTERN.test(String(value || "").trim());
}

function hasNoQuery(request: NextRequest) {
  return Array.from(request.nextUrl.searchParams.keys()).length === 0;
}

function isPositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isE164(value: unknown) {
  return typeof value === "string" && /^\+[1-9][0-9]{7,14}$/.test(value.trim());
}

function hasCanaryName(value: unknown) {
  return typeof value === "string" && value.trim().startsWith(CANARY_NAME_PREFIX) && value.trim().length <= 200;
}

function isCanaryInventoryRuleConfig(value: unknown) {
  if (!isRecord(value)) return false;
  if (
    !hasCanaryName(value.name) ||
    value.eventType !== INVENTORY_LOT_EXPIRING_EVENT_TYPE ||
    value.eventVersion !== INVENTORY_LOT_EXPIRING_EVENT_VERSION ||
    value.triggerMode !== "scheduled" ||
    value.templateKey !== INVENTORY_LOT_EXPIRING_TEMPLATE_KEY ||
    value.templateLanguage !== INVENTORY_LOT_EXPIRING_TEMPLATE_LANGUAGE ||
    value.formatterKey !== INVENTORY_LOT_EXPIRING_FORMATTER_KEY ||
    value.formatterVersion !== INVENTORY_LOT_EXPIRING_FORMATTER_VERSION ||
    !isUuid(typeof value.channelId === "string" ? value.channelId : undefined)
  ) {
    return false;
  }

  const conditions = value.conditions;
  if (
    !isRecord(conditions) ||
    !hasOnlyKeys(conditions, INVENTORY_CONDITION_KEYS) ||
    !Number.isInteger(conditions.daysBefore) ||
    Number(conditions.daysBefore) < 1 ||
    Number(conditions.daysBefore) > 365 ||
    conditions.repeatPolicy !== "once_per_threshold"
  ) {
    return false;
  }

  const schedule = value.schedule;
  if (
    !isRecord(schedule) ||
    !hasOnlyKeys(schedule, INVENTORY_SCHEDULE_KEYS) ||
    schedule.frequency !== "daily" ||
    typeof schedule.sendAt !== "string" ||
    !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(schedule.sendAt) ||
    (schedule.timezone !== undefined && schedule.timezone !== "tenant")
  ) {
    return false;
  }

  const deliveryPolicy = value.deliveryPolicy;
  if (
    !isRecord(deliveryPolicy) ||
    !hasOnlyKeys(deliveryPolicy, DELIVERY_POLICY_KEYS) ||
    deliveryPolicy.maxAttempts !== 1
  ) {
    return false;
  }

  return true;
}

function hasAllKeys(payload: Record<string, unknown>, requiredKeys: ReadonlySet<string>) {
  return Array.from(requiredKeys).every((key) => Object.prototype.hasOwnProperty.call(payload, key));
}

function validatePayload(operation: WriteOperation, payload: unknown) {
  if (!isRecord(payload)) return null;

  switch (operation) {
    case "recipientCreate":
      // The backend creates every recipient inactive with pending consent. These
      // fields are intentionally absent from this Admin canary surface.
      return hasOnlyKeys(payload, RECIPIENT_CREATE_KEYS) && hasCanaryName(payload.name) && isE164(payload.phoneE164)
        ? payload
        : null;
    case "recipientActive":
      return hasOnlyKeys(payload, RECIPIENT_ACTIVE_KEYS) && typeof payload.active === "boolean" && isPositiveInteger(payload.expectedVersion)
        ? payload
        : null;
    case "recipientConsent": {
      if (!hasOnlyKeys(payload, RECIPIENT_CONSENT_KEYS) || !isPositiveInteger(payload.expectedVersion)) return null;
      if (payload.status === "granted") {
        return typeof payload.consentSource === "string" && payload.consentSource.trim() &&
          typeof payload.consentedAt === "string" && !Object.prototype.hasOwnProperty.call(payload, "revokedAt")
          ? payload
          : null;
      }
      if (payload.status === "revoked") {
        return typeof payload.revokedAt === "string" && !Object.prototype.hasOwnProperty.call(payload, "consentedAt")
          ? payload
          : null;
      }
      return null;
    }
    case "recipientDisable":
      return hasOnlyKeys(payload, EXPECTED_VERSION_KEYS) && isPositiveInteger(payload.expectedVersion) ? payload : null;
    case "ruleCreate":
      return hasOnlyKeys(payload, RULE_WRITE_KEYS) && hasAllKeys(payload, RULE_WRITE_KEYS) && isCanaryInventoryRuleConfig(payload)
        ? payload
        : null;
    case "ruleUpdate":
      return hasOnlyKeys(payload, RULE_PATCH_KEYS) && hasAllKeys(payload, RULE_PATCH_KEYS) &&
        isPositiveInteger(payload.expectedConfigVersion) && isCanaryInventoryRuleConfig(payload)
        ? payload
        : null;
    case "ruleRecipients":
      if (!hasOnlyKeys(payload, RULE_RECIPIENT_KEYS)) return null;
      // This isolated canary surface deliberately permits exactly one selected
      // recipient; the backend remains the source of truth for UUID/version and
      // tenant-scope validation.
      return Array.isArray(payload.recipientIds) && payload.recipientIds.length === 1 &&
        isUuid(typeof payload.recipientIds[0] === "string" ? payload.recipientIds[0] : undefined) &&
        isPositiveInteger(payload.expectedConfigVersion)
        ? payload
        : null;
    case "ruleEnable":
    case "ruleDisable":
      return hasOnlyKeys(payload, EXPECTED_CONFIG_VERSION_KEYS) && isPositiveInteger(payload.expectedConfigVersion)
        ? payload
        : null;
  }
}

function resolveWriteRequest(
  operation: WriteOperation,
  entityId: string | undefined,
  payload: Record<string, unknown>
): WriteRequest | null {
  const safeEntityId = String(entityId || "").trim();
  const requiresRecipientId = ["recipientActive", "recipientConsent", "recipientDisable"].includes(operation);
  const requiresRuleId = ["ruleUpdate", "ruleRecipients", "ruleEnable", "ruleDisable"].includes(operation);
  if ((requiresRecipientId || requiresRuleId) && !isUuid(safeEntityId)) return null;

  switch (operation) {
    case "recipientCreate":
      return { method: "POST", path: "/recipients", body: payload };
    case "recipientActive":
      return { method: "PATCH", path: `/recipients/${encodeURIComponent(safeEntityId)}`, body: payload };
    case "recipientConsent":
      return { method: "POST", path: `/recipients/${encodeURIComponent(safeEntityId)}/consent`, body: payload };
    case "recipientDisable":
      return { method: "POST", path: `/recipients/${encodeURIComponent(safeEntityId)}/disable`, body: payload };
    case "ruleCreate":
      return { method: "POST", path: "/rules", body: payload };
    case "ruleUpdate":
      return { method: "PATCH", path: `/rules/${encodeURIComponent(safeEntityId)}`, body: payload };
    case "ruleRecipients":
      return { method: "PUT", path: `/rules/${encodeURIComponent(safeEntityId)}/recipients`, body: payload };
    case "ruleEnable":
      return { method: "POST", path: `/rules/${encodeURIComponent(safeEntityId)}/enable`, body: payload };
    case "ruleDisable":
      return { method: "POST", path: `/rules/${encodeURIComponent(safeEntityId)}/disable`, body: payload };
  }
}

export async function proxyAdminTenantOperationalAlertsCanaryWrite(
  request: NextRequest,
  tenantId: string,
  operation: WriteOperation,
  entityId?: string
) {
  const guard = await requireOpturonAdminApi();
  if (guard.error) return noStore(guard.error);

  const actorUserId = resolveOpturonAdminActorId(guard.ctx);
  const adminWorkspaceTenantId = String(guard.ctx.tenantId || "").trim();
  const targetTenantId = String(tenantId || "").trim();
  if (!TENANT_ID_PATTERN.test(targetTenantId)) {
    return errorResponse("operational_alerts_tenant_id_invalid");
  }
  if (!actorUserId || !adminWorkspaceTenantId) {
    return errorResponse("opturon_admin_alerts_context_unavailable", 403);
  }
  if (!hasNoQuery(request)) return errorResponse("operational_alerts_query_not_allowed");

  const payload = validatePayload(operation, await request.json().catch(() => null));
  if (!payload) return errorResponse("operational_alerts_admin_canary_write_payload_invalid");

  const writeRequest = resolveWriteRequest(operation, entityId, payload);
  if (!writeRequest) return errorResponse("operational_alerts_admin_canary_write_target_invalid");
  if (request.method.toUpperCase() !== writeRequest.method) {
    return errorResponse("operational_alerts_admin_canary_write_method_invalid", 405);
  }

  try {
    const result = await requestAdminTenantOperationalAlerts<{ success: boolean; data: unknown }>(
      adminWorkspaceTenantId,
      targetTenantId,
      writeRequest.path,
      { method: writeRequest.method, actorUserId, body: writeRequest.body }
    );
    return noStore(NextResponse.json(sanitizeOperationalAlertsPayload(result.data)));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "admin_operational_alerts_canary_write_failed",
          detail: error instanceof Error ? error.message : "No se pudo completar la solicitud."
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
