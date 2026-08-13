export type AdminCanaryRule = {
  id: string;
  name?: string | null;
  eventType?: string | null;
  eventVersion?: number | null;
  enabled: boolean;
  configVersion: number;
  deliveryPolicy?: Record<string, unknown>;
};

export type AdminCanaryPreflight = {
  canarySafe?: boolean;
  operationalAlertsEnabled?: boolean;
  enabledRules?: { count?: number };
  recipients?: { count?: number; ready?: boolean };
  template?: { ready?: boolean };
  channel?: { ready?: boolean };
  deliveryPolicy?: { maxAttempts?: number | null };
  worker?: { health?: string | null; lastError?: string | null };
  backlog?: {
    pending?: number;
    processing?: number;
    retryable?: number;
    unknownDelivery?: number;
  };
  candidatePreview?: {
    evaluable?: boolean;
    candidateCount?: number;
    expectedEventCount?: number;
    expectedDigestCount?: number;
    digestItemCount?: number;
    truncated?: boolean;
  };
  reasons?: Array<{ code?: string } | string>;
};

export const EXPECTED_PRE_ENABLE_REASON_CODES = [
  "CANARY_RULE_DISABLED",
  "ENABLED_RULE_COUNT_NOT_ONE"
] as const;

// With the tenant feature OFF, readiness correctly reports the feature gate
// as blocked. This exact set is the only acceptable baseline; an additional
// reason means an operator must stop and investigate before opening a window.
export const EXPECTED_BASELINE_REASON_CODES = [
  "OPERATIONAL_ALERTS_DISABLED",
  "ENABLED_RULE_COUNT_NOT_ONE",
  "CANARY_RULE_DISABLED",
  "RULE_NOT_READY",
  "RULE_BLOCKER_FEATURE_DISABLED"
] as const;

export const CONTROLLED_CANARY_NAME_PREFIX = "Opturon Canary";
export const CONTROLLED_CANARY_EVENT_TYPE = "inventory.lot_expiring";
export const CONTROLLED_CANARY_EVENT_VERSION = 1;

function positiveNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function reasonCode(value: { code?: string } | string) {
  return typeof value === "string" ? value : String(value?.code || "").trim();
}

function sameCodes(actual: string[], expected: readonly string[]) {
  if (actual.length !== expected.length) return false;
  const remaining = new Set(expected);
  for (const code of actual) {
    if (!remaining.delete(code)) return false;
  }
  return remaining.size === 0;
}

export function isControlledCanaryRule(rule: AdminCanaryRule | null) {
  return Boolean(
    rule &&
    String(rule.name || "").trim().startsWith(CONTROLLED_CANARY_NAME_PREFIX) &&
    rule.eventType === CONTROLLED_CANARY_EVENT_TYPE &&
    Number(rule.eventVersion) === CONTROLLED_CANARY_EVENT_VERSION &&
    positiveNumber(rule.deliveryPolicy?.maxAttempts) === 1
  );
}

function technicalBlockers(preflight: AdminCanaryPreflight | null, rule: AdminCanaryRule | null) {
  const blockers: string[] = [];
  if (!preflight) return ["PREFLIGHT_NOT_LOADED"];
  if (!rule) return ["RULE_NOT_SELECTED"];

  const backlog = preflight.backlog || {};
  const candidate = preflight.candidatePreview || {};
  if (preflight.worker?.health !== "healthy") blockers.push("WORKER_NOT_HEALTHY");
  if (preflight.template?.ready !== true) blockers.push("TEMPLATE_NOT_READY");
  if (preflight.channel?.ready !== true) blockers.push("CHANNEL_NOT_READY");
  if (preflight.recipients?.count !== 1 || preflight.recipients?.ready !== true) blockers.push("RECIPIENT_NOT_READY");
  if (
    candidate.evaluable !== true ||
    candidate.candidateCount !== 1 ||
    candidate.expectedEventCount !== 1 ||
    candidate.expectedDigestCount !== 1 ||
    candidate.digestItemCount !== 1 ||
    candidate.truncated === true
  ) {
    blockers.push("CANDIDATE_NOT_SINGLE");
  }
  if (positiveNumber(preflight.deliveryPolicy?.maxAttempts) !== 1) blockers.push("MAX_ATTEMPTS_NOT_ONE");
  if (
    positiveNumber(backlog.pending) !== 0 ||
    positiveNumber(backlog.processing) !== 0 ||
    positiveNumber(backlog.retryable) !== 0 ||
    positiveNumber(backlog.unknownDelivery) !== 0
  ) {
    blockers.push("BACKLOG_NOT_EMPTY");
  }
  return blockers;
}

/**
 * The preflight is intentionally not `canarySafe` while the switch and rule
 * are off. These are the explicit baseline gates required before the UI can
 * offer the human-confirmed activation flow.
 */
export function getCanaryActivationBlockers(preflight: AdminCanaryPreflight | null, rule: AdminCanaryRule | null) {
  const blockers = technicalBlockers(preflight, rule);
  if (!preflight || !rule) return blockers;
  if (!isControlledCanaryRule(rule)) blockers.push("RULE_NOT_CONTROLLED_CANARY");
  if (preflight.operationalAlertsEnabled !== false) blockers.push("TENANT_SWITCH_NOT_OFF");
  if (rule.enabled !== false) blockers.push("RULE_NOT_OFF");
  if (positiveNumber(preflight.enabledRules?.count) !== 0) blockers.push("OTHER_RULE_ENABLED");
  const actualReasons = (preflight.reasons || []).map(reasonCode).filter(Boolean);
  if (!sameCodes(actualReasons, EXPECTED_BASELINE_REASON_CODES)) {
    blockers.push("UNEXPECTED_PREFLIGHT_REASON");
  }
  return blockers;
}

/**
 * Immediately after setting the tenant switch, the only remaining preflight
 * blockers must be the expected disabled-rule pair. Any other reason makes
 * the caller shut the switch off before attempting to enable the rule.
 */
export function getPostSwitchActivationBlockers(preflight: AdminCanaryPreflight | null, rule: AdminCanaryRule | null) {
  const blockers = technicalBlockers(preflight, rule);
  if (!preflight || !rule) return blockers;
  if (!isControlledCanaryRule(rule)) blockers.push("RULE_NOT_CONTROLLED_CANARY");
  if (preflight.operationalAlertsEnabled !== true) blockers.push("TENANT_SWITCH_NOT_ON");
  if (rule.enabled !== false) blockers.push("RULE_STATE_CHANGED");
  if (positiveNumber(preflight.enabledRules?.count) !== 0) blockers.push("ENABLED_RULE_COUNT_CHANGED");

  const actualReasons = (preflight.reasons || []).map(reasonCode).filter(Boolean);
  if (!sameCodes(actualReasons, EXPECTED_PRE_ENABLE_REASON_CODES)) {
    blockers.push("UNEXPECTED_PREFLIGHT_REASON");
  }
  return blockers;
}

export function canActivateCanary(preflight: AdminCanaryPreflight | null, rule: AdminCanaryRule | null) {
  return getCanaryActivationBlockers(preflight, rule).length === 0;
}

export function canEnableAfterSwitch(preflight: AdminCanaryPreflight | null, rule: AdminCanaryRule | null) {
  return getPostSwitchActivationBlockers(preflight, rule).length === 0;
}

export function isActiveCanaryConfirmed(preflight: AdminCanaryPreflight | null, rule: AdminCanaryRule | null) {
  if (!preflight || !rule || !isControlledCanaryRule(rule)) return false;
  if (technicalBlockers(preflight, rule).length !== 0) return false;
  return preflight.operationalAlertsEnabled === true &&
    rule.enabled === true &&
    positiveNumber(preflight.enabledRules?.count) === 1 &&
    (preflight.reasons || []).length === 0 &&
    preflight.canarySafe === true;
}

export function canaryGateLabel(code: string) {
  const labels: Record<string, string> = {
    PREFLIGHT_NOT_LOADED: "Actualizá el preflight antes de activar.",
    RULE_NOT_SELECTED: "Seleccioná una regla canario.",
    WORKER_NOT_HEALTHY: "El worker no está saludable.",
    TEMPLATE_NOT_READY: "El template no está listo.",
    CHANNEL_NOT_READY: "El canal de WhatsApp no está listo.",
    RECIPIENT_NOT_READY: "Debe haber exactamente un recipient activo y consentido.",
    CANDIDATE_NOT_SINGLE: "El candidato real debe ser exactamente uno.",
    MAX_ATTEMPTS_NOT_ONE: "La regla debe tener maxAttempts = 1.",
    BACKLOG_NOT_EMPTY: "El backlog operativo debe estar vacío.",
    TENANT_SWITCH_NOT_OFF: "El switch del tenant debe estar apagado.",
    RULE_NOT_OFF: "La regla debe estar deshabilitada.",
    OTHER_RULE_ENABLED: "No puede haber otra regla habilitada.",
    RULE_NOT_CONTROLLED_CANARY: "La rule seleccionada no es el canario interno controlado.",
    TENANT_SWITCH_NOT_ON: "El switch no quedó habilitado para la ventana controlada.",
    RULE_STATE_CHANGED: "La regla cambió mientras se revalidaba.",
    ENABLED_RULE_COUNT_CHANGED: "Cambió la cantidad de reglas habilitadas.",
    UNEXPECTED_PREFLIGHT_REASON: "El preflight informó un blocker inesperado."
  };
  return labels[code] || "Hay un requisito de seguridad pendiente.";
}
