export type OperationalAlertAvailability = {
  status: string;
  configurable: boolean;
  readyForProduction: boolean;
};

export type OperationalAlertEventType = {
  eventType: string;
  eventVersion: number;
  displayName: string;
  displayKey: string;
  triggerModesAllowed: string[];
  templateContract: {
    family?: string;
    templateKey: string;
    language: string;
    category: string;
  } | null;
  formatterKey: string;
  formatterVersion: number;
  availability: OperationalAlertAvailability;
  producer: { status: string; active: boolean };
};

export type OperationalAlertSettings = {
  operationalAlertsEnabled: boolean;
  mutable: false;
};

export type OperationalAlertRecipient = {
  id: string;
  name: string;
  phoneMasked: string | null;
  roleLabel: string | null;
  areaKeys: string[];
  active: boolean;
  consent: {
    status: "pending" | "granted" | "revoked" | string;
    source: string | null;
    consentedAt: string | null;
    revokedAt: string | null;
  };
  version: number;
  disabledAt: string | null;
  staff: { id: string; displayName: string | null; active: boolean } | null;
  createdAt: string;
  updatedAt: string;
};

export type OperationalAlertRule = {
  id: string;
  name: string;
  eventType: string;
  eventVersion: number;
  triggerMode: string;
  configVersion: number;
  enabled: boolean;
  enabledAt: string | null;
  archivedAt: string | null;
  conditions: Record<string, unknown>;
  schedule: Record<string, unknown>;
  deliveryPolicy: Record<string, unknown>;
  channelId: string | null;
  template: { key: string | null; language: string | null };
  formatter: { key: string; version: number };
  nextEvaluationAt: string | null;
  lastEvaluatedAt: string | null;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
  recipientIds?: string[];
};

export type OperationalAlertBlocker = {
  code: string;
  detail: string | null;
  objectId: string | null;
};

export type OperationalAlertReadiness = {
  ruleId: string;
  configVersion: number;
  ready: boolean;
  blockers: OperationalAlertBlocker[];
  warnings: Array<{ code?: string; detail?: string } | string>;
  checks: {
    featureEnabled: boolean;
    ruleNotArchived: boolean;
    configurationValid: boolean;
    producerAvailable: boolean;
    recipientCount: number;
    recipientsReady: boolean;
    channelReady: boolean;
    templateReady: boolean;
    formatterRegistered: boolean;
  };
};

export type OperationalAlertHistoryItem = {
  instanceId: string;
  rule: { id: string; name: string | null; version: number };
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  createdAt: string;
  completedAt: string | null;
  status: string;
  deliverySummary: {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    skipped: number;
    unknown: number;
  };
};

export type OperationalAlertHistoryDetail = {
  instanceId: string;
  rule: { id: string; name: string | null; version: number };
  event: {
    id: string;
    eventType: string;
    eventVersion: number;
    entityType: string;
    entityId: string;
    occurredAt: string;
  };
  occurrence: { key: string; evaluationWindowKey: string | null };
  snapshotVersion: number;
  snapshot: Record<string, unknown>;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  deliveries: Array<{
    id: string;
    recipient: {
      id: string;
      name: string | null;
      roleLabel: string | null;
      phoneMasked: string | null;
      version: number;
    };
    channelId: string | null;
    status: string;
    template: { key: string | null; language: string | null; version: number | null };
    formatter: { key: string; version: number };
    attemptCount: number;
    resultCode: string | null;
    hasError: boolean;
    sentAt: string | null;
    deliveredAt: string | null;
    readAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type OperationalAlertPreview = {
  ruleId: string;
  matched: boolean;
  conditionEvaluation: { outcome: string; reason: string };
  selectedRecipients: Array<{
    id: string;
    position: number;
    name: string | null;
    phoneMasked: string | null;
    active: boolean;
    consentStatus: string | null;
  }>;
  formatter: { key: string; version: number };
  template: { key: string | null; language: string | null };
  renderedPreview: { auditText: string; components: unknown[] } | null;
  blockers: OperationalAlertBlocker[];
  warnings: Array<{ code?: string; detail?: string } | string>;
};

export type OperationalAlertsInitialData = {
  settings: OperationalAlertSettings | null;
  eventTypes: OperationalAlertEventType[];
  recipients: OperationalAlertRecipient[];
  rules: OperationalAlertRule[];
  readinessByRule: Record<string, OperationalAlertReadiness>;
  history: OperationalAlertHistoryItem[];
  historyPagination: { page: number; pageSize: number; total: number };
  tenantTimezone: string | null;
  channels: Array<{
    id: string;
    label: string;
    status: string | null;
    active: boolean;
  }>;
  staffUsers: Array<{
    id: string;
    name: string;
    role: string;
    active: boolean;
  }>;
  loadError: string | null;
};

const SENSITIVE_KEYS = new Set([
  "accesstoken",
  "refreshtoken",
  "token",
  "password",
  "secret",
  "clientsecret",
  "webhooksecret",
  "apikey",
  "authorization",
  "credential",
  "credentials",
  "portalkey",
  "internalkey",
  "graphresponse",
  "rawpayload",
  "errormetadata"
]);

function normalizedKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function maskOperationalAlertPhone(value: unknown) {
  const phone = String(value || "").trim();
  if (phone.length < 6) return null;
  const prefixLength = Math.min(3, phone.length - 2);
  return `${phone.slice(0, prefixLength)}${"*".repeat(Math.max(3, phone.length - prefixLength - 2))}${phone.slice(-2)}`;
}

export function sanitizeOperationalAlertsPayload(value: unknown, depth = 0): unknown {
  if (depth > 7 || value === null || value === undefined) return value ?? null;
  if (typeof value === "string") return value.slice(0, 1000);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 250).map((item) => sanitizeOperationalAlertsPayload(item, depth + 1));
  if (typeof value !== "object") return null;

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const safeKey = normalizedKey(key);
    if (SENSITIVE_KEYS.has(safeKey)) continue;
    if (["phonee164", "recipientphone", "recipientphonee164", "phonenumber"].includes(safeKey)) {
      result.phoneMasked = maskOperationalAlertPhone(item);
      continue;
    }
    result[key] = sanitizeOperationalAlertsPayload(item, depth + 1);
  }
  return result;
}

export function operationalAlertEventLabel(eventType: string) {
  if (eventType === "inventory.lot_expiring") return "Próximos vencimientos de inventario";
  if (eventType === "cash.session_closed") return "Cierre de caja";
  return "Alerta operativa";
}

export function operationalAlertStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pendiente",
    sending: "Enviando",
    sent: "Enviado",
    delivered: "Entregado",
    read: "Leído",
    completed: "Completada",
    completed_with_errors: "Completada con errores",
    failed: "Fallida",
    failed_retryable: "Reintentando",
    failed_permanent: "Fallida",
    skipped: "Omitida",
    unknown_delivery: "Entrega sin confirmar"
  };
  return labels[status] || "Estado no disponible";
}

export function readinessBlockerLabel(blocker: OperationalAlertBlocker) {
  const labels: Record<string, string> = {
    FEATURE_DISABLED: "Las alertas operativas están desactivadas para esta cuenta.",
    RULE_ARCHIVED: "La regla está archivada.",
    INVALID_CONFIGURATION: "La configuración de la regla necesita revisión.",
    PRODUCER_NOT_AVAILABLE: "Este tipo de alerta todavía no está disponible.",
    FORMATTER_MISSING: "El formato de mensaje todavía no está disponible.",
    NO_RECIPIENTS: "Seleccioná al menos un responsable.",
    RECIPIENT_CHANGED: "Uno de los responsables cambió o ya no existe.",
    RECIPIENT_INACTIVE: "Todos los responsables seleccionados deben estar activos.",
    RECIPIENT_CONSENT_MISSING: "Todos los responsables necesitan consentimiento otorgado.",
    CHANNEL_MISSING: "Seleccioná un canal de WhatsApp activo.",
    CHANNEL_WRONG_TENANT: "El canal seleccionado no pertenece a esta cuenta.",
    CHANNEL_INACTIVE: "El canal de WhatsApp está inactivo o incompleto.",
    TEMPLATE_MISSING: "Todavía falta configurar el template de WhatsApp.",
    TEMPLATE_NOT_APPROVED: "El template de WhatsApp todavía no está aprobado.",
    TEMPLATE_CONTRACT_MISMATCH: "El template configurado no es compatible con esta alerta."
  };
  return labels[blocker.code] || "Hay una configuración pendiente antes de activar esta alerta.";
}

export function operationalAlertsErrorMessage(error: unknown, status?: number) {
  const code = typeof error === "string" ? error : "";
  if (status === 409 && code.includes("recipient")) {
    return "Este responsable fue modificado en otra sesión. Actualizá los datos y volvé a intentarlo.";
  }
  if (status === 409 && code.includes("rule")) {
    return "Esta regla fue modificada en otra sesión. Actualizá los datos y volvé a intentarlo.";
  }
  if (status === 403) return "No tenés permisos para administrar alertas operativas.";
  if (status === 404) return "El elemento solicitado ya no está disponible.";
  if (status === 400) return "Revisá los datos ingresados antes de continuar.";
  return "No pudimos completar la operación. Volvé a intentarlo.";
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function buildInventoryPreviewPayload(rule: OperationalAlertRule) {
  const daysBefore = Number(rule.conditions.daysBefore || 7);
  const repeatPolicy = String(rule.conditions.repeatPolicy || "once_per_threshold");
  const minimumAvailableQuantity = Number(rule.conditions.minimumAvailableQuantity ?? 1);
  const quantityBasis = String(rule.conditions.quantityBasis || "physical");
  const now = new Date();
  const localDate = isoDate(now);
  const expiry = new Date(`${localDate}T12:00:00.000Z`);
  expiry.setUTCDate(expiry.getUTCDate() + daysBefore);

  return {
    evaluatedAt: now.toISOString(),
    localDate,
    daysBefore,
    quantityBasis,
    minimumAvailableQuantity,
    repeatPolicy,
    configVersion: rule.configVersion,
    thresholdIdentity: `${daysBefore}:${repeatPolicy}:${quantityBasis}:${minimumAvailableQuantity}`,
    evaluationWindowKey: localDate,
    totalLots: 1,
    totalProducts: 1,
    items: [{
      lotId: "11111111-1111-4111-8111-111111111111",
      productId: "22222222-2222-4222-8222-222222222222",
      productName: "Producto de ejemplo",
      sku: "SKU-EJEMPLO",
      lotCode: "LOTE-01",
      expiresAt: isoDate(expiry),
      daysRemaining: daysBefore,
      relevantQuantity: Math.max(1, minimumAvailableQuantity),
      supplierName: "Proveedor de ejemplo",
      locationName: "Depósito principal"
    }],
    truncation: { itemLimit: 250, omittedLots: 0 }
  };
}
