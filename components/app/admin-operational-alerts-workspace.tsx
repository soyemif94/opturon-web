"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Eye,
  Loader2,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  UsersRound,
  XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import {
  canActivateCanary,
  canEnableAfterSwitch,
  canaryGateLabel,
  getCanaryActivationBlockers,
  isActiveCanaryConfirmed,
  isControlledCanaryRule,
  type AdminCanaryPreflight,
  type AdminCanaryRule
} from "@/lib/admin-operational-alerts-canary-ui";
import {
  operationalAlertEventLabel,
  operationalAlertStatusLabel,
  type OperationalAlertHistoryDetail,
  type OperationalAlertHistoryItem,
  type OperationalAlertRecipient,
  type OperationalAlertRule
} from "@/lib/operational-alerts";

export type AdminOperationalAlertsTenant = {
  tenantId: string;
  label: string;
  source: "admin_workspace" | "client";
};

type Settings = {
  operationalAlertsEnabled: boolean;
  changed?: boolean;
};

type Observability = {
  worker?: {
    workerId?: string | null;
    health?: string | null;
    lastError?: string | null;
    lastPollStartedAt?: string | null;
    lastPollCompletedAt?: string | null;
    lastSuccessfulPollAt?: string | null;
  };
  backlog?: {
    pending?: number;
    processing?: number;
    retryable?: number;
    unknownDelivery?: number;
  };
};

type CandidatePreview = {
  ruleId: string;
  evaluable: boolean;
  reason: string | null;
  candidateCount: number;
  candidateLotIds: string[];
  expectedEventCount: number;
  expectedDigestCount: number;
  digestItemCount: number;
  truncated: boolean;
  localDate: string | null;
};

type CanaryPreflight = AdminCanaryPreflight & {
  tenantId?: string;
  ruleId?: string;
  canarySafe?: boolean;
  reasons?: Array<{ code?: string; detail?: string } | string>;
  candidatePreview?: CandidatePreview & { rule?: Partial<AdminCanaryRule> };
};

type Snapshot = {
  tenantId: string;
  settings: Settings;
  observability: Observability;
  rules: OperationalAlertRule[];
  recipients: OperationalAlertRecipient[];
  history: OperationalAlertHistoryItem[];
  historyTotal: number;
  selectedRuleId: string | null;
  candidatePreview: CandidatePreview | null;
  preflight: CanaryPreflight | null;
};

type ConsentAction = {
  recipient: OperationalAlertRecipient;
  status: "granted" | "revoked";
};

class AdminOperationalAlertsError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function numberOrZero(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function asItems<T>(value: unknown): T[] {
  return isRecord(value) && Array.isArray(value.items) ? value.items as T[] : [];
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin datos";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Sin datos";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "medium" }).format(date);
}

function ruleDaysBefore(rule: OperationalAlertRule) {
  return numberOrZero(rule.conditions?.daysBefore);
}

function ruleMaxAttempts(rule: OperationalAlertRule) {
  return numberOrZero(rule.deliveryPolicy?.maxAttempts);
}

function toCanaryRule(rule: OperationalAlertRule): AdminCanaryRule {
  return {
    id: rule.id,
    name: rule.name,
    eventType: rule.eventType,
    eventVersion: rule.eventVersion,
    enabled: rule.enabled,
    configVersion: rule.configVersion,
    deliveryPolicy: rule.deliveryPolicy
  };
}

function stateTone(value: boolean | null | undefined): "success" | "danger" | "warning" {
  if (value === true) return "success";
  if (value === false) return "danger";
  return "warning";
}

function consentTone(status: string): "success" | "warning" | "danger" {
  if (status === "granted") return "success";
  if (status === "revoked") return "danger";
  return "warning";
}

function consentLabel(status: string) {
  if (status === "granted") return "Consentimiento otorgado";
  if (status === "revoked") return "Consentimiento revocado";
  return "Consentimiento pendiente";
}

function friendlyError(error: unknown) {
  if (error instanceof AdminOperationalAlertsError) {
    if (error.status === 403) return "La sesión no tiene acceso Admin Opturon para esta operación.";
    if (error.status === 409) return "El estado cambió en otra sesión. Actualizá y revisá el canario antes de continuar.";
    if (error.status === 404) return "El recurso ya no está disponible para este tenant.";
    if (error.status === 400) return "La solicitud no pasó las validaciones de seguridad.";
  }
  return "No pudimos completar la operación. El canario no se reintenta automáticamente.";
}

async function adminAlertsRequest<T>(tenantId: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(
    `/api/app/admin/clients/${encodeURIComponent(tenantId)}/operational-alerts${path}`,
    {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      headers: init?.body ? { "Content-Type": "application/json", ...(init.headers || {}) } : init?.headers
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AdminOperationalAlertsError(response.status, String(payload?.error || "admin_operational_alerts_request_failed"));
  }
  return payload as T;
}

async function loadSnapshot(tenantId: string, preferredRuleId: string | null): Promise<Snapshot> {
  const [settings, observability, rulesResult, recipientsResult, historyResult] = await Promise.all([
    adminAlertsRequest<Settings>(tenantId, "/settings"),
    adminAlertsRequest<Observability>(tenantId, "/observability"),
    adminAlertsRequest<{ items: OperationalAlertRule[] }>(tenantId, "/rules?limit=100&includeArchived=false"),
    adminAlertsRequest<{ items: OperationalAlertRecipient[] }>(tenantId, "/recipients?limit=200"),
    adminAlertsRequest<{ items: OperationalAlertHistoryItem[]; pagination?: { total?: number } }>(tenantId, "/history?page=1&pageSize=25")
  ]);
  const rules = asItems<OperationalAlertRule>(rulesResult);
  const recipients = asItems<OperationalAlertRecipient>(recipientsResult);
  const history = asItems<OperationalAlertHistoryItem>(historyResult);
  const selectedRuleId = rules.some((rule) => rule.id === preferredRuleId)
    ? preferredRuleId
    : rules[0]?.id || null;
  const [candidatePreview, preflight] = selectedRuleId
    ? await Promise.all([
      adminAlertsRequest<CandidatePreview>(tenantId, `/rules/${encodeURIComponent(selectedRuleId)}/candidate-preview`).catch(() => null),
      adminAlertsRequest<CanaryPreflight>(tenantId, `/rules/${encodeURIComponent(selectedRuleId)}/canary-preflight`).catch(() => null)
    ])
    : [null, null];

  return {
    tenantId,
    settings,
    observability,
    rules,
    recipients,
    history,
    historyTotal: numberOrZero(isRecord(historyResult) && isRecord(historyResult.pagination) ? historyResult.pagination.total : 0),
    selectedRuleId,
    candidatePreview,
    preflight
  };
}

function Metric({ label, value, tone = "muted" }: { label: string; value: string | number; tone?: "success" | "warning" | "danger" | "muted" }) {
  const color = tone === "success" ? "text-emerald-200" : tone === "warning" ? "text-amber-200" : tone === "danger" ? "text-red-200" : "text-white";
  return (
    <div className="rounded-xl border border-white/8 bg-black/15 p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function Gate({ label, pass }: { label: string; pass: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/15 px-3 py-2 text-sm">
      <span>{label}</span>
      <Badge variant={pass ? "success" : "danger"}>{pass ? "PASS" : "Blocker"}</Badge>
    </div>
  );
}

export function AdminOperationalAlertsWorkspace({ tenants, initialLoadError = null }: {
  tenants: AdminOperationalAlertsTenant[];
  initialLoadError?: string | null;
}) {
  const [selectedTenantId, setSelectedTenantId] = useState(tenants[0]?.tenantId || "");
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [observability, setObservability] = useState<Observability | null>(null);
  const [rules, setRules] = useState<OperationalAlertRule[]>([]);
  const [recipients, setRecipients] = useState<OperationalAlertRecipient[]>([]);
  const [history, setHistory] = useState<OperationalAlertHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [candidatePreview, setCandidatePreview] = useState<CandidatePreview | null>(null);
  const [preflight, setPreflight] = useState<CanaryPreflight | null>(null);
  const [pageError, setPageError] = useState<string | null>(initialLoadError);
  const [busy, setBusy] = useState<string | null>(null);
  const [activationDialogOpen, setActivationDialogOpen] = useState(false);
  const [activationAcknowledged, setActivationAcknowledged] = useState(false);
  const [associationRecipientId, setAssociationRecipientId] = useState("");
  const [associationDialogOpen, setAssociationDialogOpen] = useState(false);
  const [consentAction, setConsentAction] = useState<ConsentAction | null>(null);
  const [historyDetail, setHistoryDetail] = useState<OperationalAlertHistoryDetail | null>(null);
  const [activeCanaryScope, setActiveCanaryScope] = useState<{ tenantId: string; ruleId: string } | null>(null);

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.tenantId === selectedTenantId) || null,
    [selectedTenantId, tenants]
  );
  const selectedRule = useMemo(
    () => rules.find((rule) => rule.id === selectedRuleId) || null,
    [rules, selectedRuleId]
  );
  const canaryRule = useMemo<AdminCanaryRule | null>(
    () => selectedRule ? toCanaryRule(selectedRule) : null,
    [selectedRule]
  );
  const activationBlockers = useMemo(
    () => getCanaryActivationBlockers(preflight, canaryRule),
    [preflight, canaryRule]
  );
  const activationAllowed = canActivateCanary(preflight, canaryRule);
  const selectedRecipient = recipients.find((recipient) => recipient.id === associationRecipientId) || null;
  const workerHealthy = observability?.worker?.health === "healthy";
  const backlog = observability?.backlog || {};
  const backlogClear = [backlog.pending, backlog.processing, backlog.retryable, backlog.unknownDelivery].every((value) => numberOrZero(value) === 0);

  const applySnapshot = useCallback((snapshot: Snapshot) => {
    setSettings(snapshot.settings);
    setObservability(snapshot.observability);
    setRules(snapshot.rules);
    setRecipients(snapshot.recipients);
    setHistory(snapshot.history);
    setHistoryTotal(snapshot.historyTotal);
    setCandidatePreview(snapshot.candidatePreview);
    setPreflight(snapshot.preflight);
    setSelectedRuleId(snapshot.selectedRuleId);
    setActiveCanaryScope((current) => {
      const activeRules = snapshot.rules.filter((rule) => rule.enabled && isControlledCanaryRule(toCanaryRule(rule)));
      if (snapshot.settings.operationalAlertsEnabled === true && activeRules.length === 1) {
        return { tenantId: snapshot.tenantId, ruleId: activeRules[0].id };
      }
      if (current && current.tenantId === snapshot.tenantId) {
        const pinnedRule = snapshot.rules.find((rule) => rule.id === current.ruleId);
        if (snapshot.settings.operationalAlertsEnabled === false && pinnedRule?.enabled === false) return null;
      }
      return current;
    });
  }, []);

  const refreshSelectedTenant = useCallback(async (options?: { quiet?: boolean }) => {
    if (!selectedTenantId) return null;
    setBusy(options?.quiet ? "load" : "refresh");
    setPageError(null);
    try {
      const snapshot = await loadSnapshot(selectedTenantId, selectedRuleId);
      applySnapshot(snapshot);
      if (!options?.quiet) toast.success("Estado actualizado", "No se ejecutó ninguna acción de canario.");
      return snapshot;
    } catch (error) {
      const message = friendlyError(error);
      setPageError(message);
      if (!options?.quiet) toast.error("No pudimos actualizar", message);
      return null;
    } finally {
      setBusy(null);
    }
  }, [applySnapshot, selectedRuleId, selectedTenantId]);

  // This effect performs GETs only. It never mutates the switch, a rule, a
  // recipient, Meta, or WhatsApp when the page mounts or the tenant changes.
  useEffect(() => {
    void refreshSelectedTenant({ quiet: true });
  }, [refreshSelectedTenant]);

  async function updateSwitchForTenant(tenantId: string, enabled: boolean) {
    return adminAlertsRequest<Settings>(tenantId, "/settings", {
      method: "PATCH",
      body: JSON.stringify({ operationalAlertsEnabled: enabled })
    });
  }

  async function loadCurrentRule(tenantId: string, ruleId: string) {
    const result = await adminAlertsRequest<{ items: OperationalAlertRule[] }>(
      tenantId,
      "/rules?limit=100&includeArchived=true"
    );
    return asItems<OperationalAlertRule>(result).find((rule) => rule.id === ruleId) || null;
  }

  async function disableFreshRule(tenantId: string, ruleId: string) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const currentRule = await loadCurrentRule(tenantId, ruleId);
      if (!currentRule) throw new Error("canary_rule_not_found_during_stop");
      if (!currentRule.enabled) return currentRule;
      try {
        await adminAlertsRequest<OperationalAlertRule>(tenantId, `/rules/${encodeURIComponent(currentRule.id)}/disable`, {
          method: "POST",
          body: JSON.stringify({ expectedConfigVersion: currentRule.configVersion })
        });
        return currentRule;
      } catch (error) {
        if (error instanceof AdminOperationalAlertsError && error.status === 409 && attempt === 0) continue;
        throw error;
      }
    }
    throw new Error("canary_rule_disable_version_conflict");
  }

  /**
   * A failed write response is ambiguous: the backend may already have applied
   * it. Containment always re-reads the pinned rule, attempts rule OFF first,
   * then turns the tenant switch OFF, and confirms both persisted states.
   */
  async function containCanary(tenantId: string, ruleId: string | null) {
    const errors: string[] = [];
    if (ruleId) {
      try {
        await disableFreshRule(tenantId, ruleId);
      } catch {
        errors.push("rule_off_unconfirmed");
      }
    }
    try {
      await updateSwitchForTenant(tenantId, false);
    } catch {
      errors.push("switch_off_unconfirmed");
    }

    const [ruleResult, settingsResult] = await Promise.allSettled([
      ruleId ? loadCurrentRule(tenantId, ruleId) : Promise.resolve(null),
      adminAlertsRequest<Settings>(tenantId, "/settings")
    ]);
    const finalRule = ruleResult.status === "fulfilled" ? ruleResult.value : null;
    const finalSettings = settingsResult.status === "fulfilled" ? settingsResult.value : null;
    return {
      confirmed: (!ruleId || finalRule?.enabled === false) && finalSettings?.operationalAlertsEnabled === false,
      finalRule,
      finalSettings,
      errors
    };
  }

  async function activateCanary() {
    if (!selectedTenantId || !selectedRule || !activationAllowed) return;
    const scope = { tenantId: selectedTenantId, ruleId: selectedRule.id };
    setBusy("activate-canary");
    setPageError(null);
    let switchPossiblyTouched = false;
    try {
      const baseline = await loadSnapshot(scope.tenantId, scope.ruleId);
      applySnapshot(baseline);
      const baselineRule = baseline.rules.find((rule) => rule.id === scope.ruleId) || null;
      if (!canActivateCanary(baseline.preflight, baselineRule ? toCanaryRule(baselineRule) : null)) {
        throw new Error("canary_baseline_changed");
      }

      // Mark before awaiting: a timeout may follow a persisted PATCH.
      switchPossiblyTouched = true;
      await updateSwitchForTenant(scope.tenantId, true);
      const afterSwitch = await loadSnapshot(scope.tenantId, scope.ruleId);
      applySnapshot(afterSwitch);
      const afterSwitchRule = afterSwitch.rules.find((rule) => rule.id === scope.ruleId) || null;
      if (!canEnableAfterSwitch(afterSwitch.preflight, afterSwitchRule ? toCanaryRule(afterSwitchRule) : null)) {
        throw new Error("canary_post_switch_preflight_failed");
      }

      await adminAlertsRequest<OperationalAlertRule>(scope.tenantId, `/rules/${encodeURIComponent(scope.ruleId)}/enable`, {
        method: "POST",
        body: JSON.stringify({ expectedConfigVersion: afterSwitchRule!.configVersion })
      });
      const activeSnapshot = await loadSnapshot(scope.tenantId, scope.ruleId);
      const activeRule = activeSnapshot.rules.find((rule) => rule.id === scope.ruleId) || null;
      if (!isActiveCanaryConfirmed(activeSnapshot.preflight, activeRule ? toCanaryRule(activeRule) : null)) {
        throw new Error("canary_post_enable_verification_failed");
      }
      applySnapshot(activeSnapshot);
      setActiveCanaryScope(scope);
      setActivationDialogOpen(false);
      setActivationAcknowledged(false);
      toast.success("Canario activo", "La regla quedó habilitada. Observá el historial y usá DETENER CANARIO al primer resultado o ante cualquier anomalía.");
    } catch (error) {
      const containment = switchPossiblyTouched ? await containCanary(scope.tenantId, scope.ruleId) : null;
      const finalSnapshot = await loadSnapshot(scope.tenantId, scope.ruleId).catch(() => null);
      if (finalSnapshot) applySnapshot(finalSnapshot);
      const message = containment && !containment.confirmed
        ? "No pudimos confirmar rule OFF y switch OFF. Revisá y usá DETENER CANARIO inmediatamente."
        : friendlyError(error);
      setPageError(message);
      toast.error("Canario detenido antes de habilitar la regla", message);
    } finally {
      setBusy(null);
    }
  }

  async function stopCanary() {
    const fallbackScope = selectedTenantId && selectedRule &&
      isControlledCanaryRule(toCanaryRule(selectedRule)) &&
      (settings?.operationalAlertsEnabled === true || selectedRule.enabled === true)
      ? { tenantId: selectedTenantId, ruleId: selectedRule.id }
      : null;
    const scope = activeCanaryScope || fallbackScope;
    if (!scope) return;
    setBusy("stop-canary");
    setPageError(null);
    const containment = await containCanary(scope.tenantId, scope.ruleId);
    const snapshot = await loadSnapshot(scope.tenantId, scope.ruleId).catch(() => null);
    if (snapshot) applySnapshot(snapshot);
    setBusy(null);

    if (!containment.confirmed) {
      const message = "No pudimos confirmar rule OFF y switch OFF. Revisá el estado y reintentá detener inmediatamente.";
      setPageError(message);
      toast.error("Detención requiere revisión", message);
      return;
    }
    setActiveCanaryScope(null);
    toast.success("Canario detenido", "La rule quedó OFF antes de apagar el switch del tenant.");
  }

  async function associateRecipient() {
    if (!selectedTenantId || !selectedRule || !selectedRecipient || selectedRule.enabled || activeCanaryScope) return;
    setBusy("associate-recipient");
    try {
      await adminAlertsRequest<OperationalAlertRule>(selectedTenantId, `/rules/${encodeURIComponent(selectedRule.id)}/recipients`, {
        method: "PUT",
        body: JSON.stringify({ recipientIds: [selectedRecipient.id], expectedConfigVersion: selectedRule.configVersion })
      });
      await refreshSelectedTenant({ quiet: true });
      toast.success("Recipient asociado", "La regla sigue deshabilitada y requiere preflight actualizado.");
    } catch (error) {
      toast.error("No pudimos asociar el recipient", friendlyError(error));
    } finally {
      setAssociationDialogOpen(false);
      setBusy(null);
    }
  }

  async function updateConsent() {
    if (!selectedTenantId || !consentAction || activeCanaryScope) return;
    const { recipient, status } = consentAction;
    setBusy(`consent-${recipient.id}`);
    try {
      const now = new Date().toISOString();
      const payload = status === "granted"
        ? {
          status,
          consentSource: "opturon_admin_manual_confirmation",
          consentedAt: now,
          expectedVersion: recipient.version
        }
        : {
          status,
          revokedAt: now,
          expectedVersion: recipient.version
        };
      await adminAlertsRequest<OperationalAlertRecipient>(selectedTenantId, `/recipients/${encodeURIComponent(recipient.id)}/consent`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      await refreshSelectedTenant({ quiet: true });
      toast.success(status === "granted" ? "Consentimiento registrado" : "Consentimiento revocado");
    } catch (error) {
      toast.error("No pudimos actualizar el consentimiento", friendlyError(error));
    } finally {
      setConsentAction(null);
      setBusy(null);
    }
  }

  async function openHistoryDetail(instanceId: string) {
    if (!selectedTenantId) return;
    setBusy(`history-${instanceId}`);
    try {
      const detail = await adminAlertsRequest<OperationalAlertHistoryDetail>(
        selectedTenantId,
        `/history/${encodeURIComponent(instanceId)}`
      );
      setHistoryDetail(detail);
    } catch (error) {
      toast.error("No pudimos cargar el detalle", friendlyError(error));
    } finally {
      setBusy(null);
    }
  }

  const selectedRuleRecipientIds = new Set(selectedRule?.recipientIds || []);
  const canaryWindowOpen = activeCanaryScope !== null || settings?.operationalAlertsEnabled === true || selectedRule?.enabled === true;
  const canaryScopeLocked = activeCanaryScope !== null || busy === "activate-canary" || busy === "stop-canary";

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <label htmlFor="admin-alerts-tenant" className="text-sm font-medium">Tenant a operar</label>
            <select
              id="admin-alerts-tenant"
              className="mt-2 h-10 w-full rounded-xl border border-[color:var(--field-border)] bg-[color:var(--field-bg)] px-3 text-sm"
              value={selectedTenantId}
              disabled={canaryScopeLocked || busy !== null || tenants.length === 0}
              onChange={(event) => {
                setSelectedRuleId(null);
                setAssociationRecipientId("");
                setSelectedTenantId(event.target.value);
              }}
            >
              {tenants.map((tenant) => (
                <option key={tenant.tenantId} value={tenant.tenantId}>
                  {tenant.label}{tenant.source === "admin_workspace" ? " (workspace Admin)" : ""}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-muted">El selector sólo contiene tenants resueltos por el servidor. El navegador no envía actor, portal key ni headers de scope.</p>
          </div>
          <Button type="button" variant="secondary" disabled={!selectedTenantId || busy !== null} onClick={() => void refreshSelectedTenant()}>
            {busy === "refresh" || busy === "load" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualizar
          </Button>
        </CardContent>
      </Card>

      {pageError ? <div role="alert" className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-100">{pageError}</div> : null}
      {!selectedTenant ? <EmptyState title="No hay tenant disponible" detail="No pudimos resolver un tenant válido desde la sesión Admin." /> : null}

      {selectedTenant ? <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Switch operativo" value={settings?.operationalAlertsEnabled ? "ACTIVO" : "OFF"} tone={settings ? stateTone(settings.operationalAlertsEnabled) : "warning"} />
          <Metric label="Worker" value={observability?.worker?.health || "Sin datos"} tone={workerHealthy ? "success" : observability ? "danger" : "warning"} />
          <Metric label="Canal WhatsApp" value={preflight?.channel?.ready ? "Conectado / listo" : "No listo"} tone={preflight?.channel?.ready ? "success" : preflight ? "danger" : "warning"} />
          <Metric label="Template de regla" value={preflight?.template?.ready ? "PASS" : "Pendiente"} tone={preflight?.template?.ready ? "success" : preflight ? "danger" : "warning"} />
        </section>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Backlog pending" value={numberOrZero(backlog.pending)} tone={numberOrZero(backlog.pending) === 0 ? "success" : "danger"} />
          <Metric label="Backlog processing" value={numberOrZero(backlog.processing)} tone={numberOrZero(backlog.processing) === 0 ? "success" : "danger"} />
          <Metric label="Backlog retryable" value={numberOrZero(backlog.retryable)} tone={numberOrZero(backlog.retryable) === 0 ? "success" : "danger"} />
          <Metric label="Backlog unknown delivery" value={numberOrZero(backlog.unknownDelivery)} tone={numberOrZero(backlog.unknownDelivery) === 0 ? "success" : "danger"} />
          <Metric label="Error worker" value={observability?.worker?.lastError || "Sin error"} tone={observability?.worker?.lastError ? "danger" : "success"} />
        </section>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-brandBright" />Canario controlado</CardTitle>
              <p className="mt-1 text-sm text-muted">La activación nunca se programa ni reintenta. Sólo habilita una ventana manual guiada y puede enviar 1 WhatsApp real.</p>
            </div>
            {canaryWindowOpen ? <Badge variant="warning">Canario activo / en detención</Badge> : <Badge variant="muted">Canario apagado</Badge>}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-2">
              <Gate label="Worker saludable" pass={workerHealthy} />
              <Gate label="Backlog vacío" pass={backlogClear} />
              <Gate label="Template PASS" pass={preflight?.template?.ready === true} />
              <Gate label="Canal PASS" pass={preflight?.channel?.ready === true} />
              <Gate label="Un recipient listo" pass={preflight?.recipients?.count === 1 && preflight?.recipients?.ready === true} />
              <Gate label="Un candidato / digest" pass={preflight?.candidatePreview?.candidateCount === 1 && preflight?.candidatePreview?.expectedDigestCount === 1 && preflight?.candidatePreview?.digestItemCount === 1 && preflight?.candidatePreview?.truncated !== true} />
              <Gate label="maxAttempts = 1" pass={preflight?.deliveryPolicy?.maxAttempts === 1} />
              <Gate label="Switch y regla OFF" pass={settings?.operationalAlertsEnabled === false && selectedRule?.enabled === false} />
            </div>
            {activationBlockers.length ? <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
              <p className="text-sm font-medium text-amber-100">Bloqueos antes de activar</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-100/85">
                {activationBlockers.map((code) => <li key={code}>• {canaryGateLabel(code)}</li>)}
              </ul>
            </div> : <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">Todos los gates de activación están en PASS. Falta confirmación humana.</div>}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" disabled={!activationAllowed || activeCanaryScope !== null || busy !== null} onClick={() => {
                setActivationAcknowledged(false);
                setActivationDialogOpen(true);
              }}>
                <PlayCircle className="mr-2 h-4 w-4" />Activar canario
              </Button>
              <Button type="button" variant="destructive" disabled={(!activeCanaryScope && !(selectedRule && isControlledCanaryRule(toCanaryRule(selectedRule)) && (settings?.operationalAlertsEnabled === true || selectedRule.enabled === true))) || busy !== null} onClick={() => void stopCanary()}>
                <XCircle className="mr-2 h-4 w-4" />DETENER CANARIO
              </Button>
              <Button type="button" variant="secondary" disabled={!selectedRule || busy !== null} onClick={() => void refreshSelectedTenant()}>
                <ShieldCheck className="mr-2 h-4 w-4" />Revalidar preflight
              </Button>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Rules</CardTitle>
                <p className="mt-1 text-sm text-muted">Seleccioná una rule para ver candidatos, preflight y su recipient asociado.</p>
              </div>
              <Badge variant={rules.length ? "outline" : "warning"}>{rules.length} rule(s)</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {rules.length ? rules.map((rule) => {
                const selected = selectedRule?.id === rule.id;
                const recipientCount = rule.recipientIds?.length || 0;
                return <button
                  key={rule.id}
                  type="button"
                  className={`w-full rounded-2xl border p-4 text-left transition ${selected ? "border-brand/50 bg-brand/10" : "border-white/8 bg-black/10 hover:border-white/20"}`}
                  onClick={() => setSelectedRuleId(rule.id)}
                  disabled={canaryScopeLocked || busy !== null}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><p className="font-medium text-white">{rule.name || "Rule sin nombre"}</p><p className="mt-1 text-xs text-muted">{operationalAlertEventLabel(rule.eventType)} · v{rule.eventVersion}</p></div>
                    <Badge variant={rule.enabled ? "success" : "muted"}>{rule.enabled ? "Enabled" : "Disabled"}</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-4">
                    <span>config v{rule.configVersion}</span><span>{ruleDaysBefore(rule)} días antes</span><span>maxAttempts {ruleMaxAttempts(rule)}</span><span>{recipientCount} recipient(s)</span>
                  </div>
                </button>;
              }) : <EmptyState title="No hay rules" detail="Esta vista no crea rules automáticamente." />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><div><CardTitle>Candidate preview</CardTitle><p className="mt-1 text-sm text-muted">Lectura real del evaluator; no crea eventos ni envíos.</p></div><Eye className="h-5 w-5 text-brandBright" /></CardHeader>
            <CardContent className="space-y-3">
              {selectedRule ? <>
                <Metric label="Candidate count" value={candidatePreview?.candidateCount ?? "Sin datos"} tone={candidatePreview?.candidateCount === 1 ? "success" : candidatePreview ? "danger" : "warning"} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Metric label="Eventos esperados" value={candidatePreview?.expectedEventCount ?? "—"} tone={candidatePreview?.expectedEventCount === 1 ? "success" : "warning"} />
                  <Metric label="Digest esperado" value={candidatePreview?.expectedDigestCount ?? "—"} tone={candidatePreview?.expectedDigestCount === 1 ? "success" : "warning"} />
                </div>
                <div className="rounded-xl border border-white/8 bg-black/15 p-3 text-sm"><p className="text-xs uppercase tracking-[0.14em] text-muted">Lot IDs</p>{candidatePreview?.candidateLotIds?.length ? <ul className="mt-2 space-y-1 font-mono text-xs text-white">{candidatePreview.candidateLotIds.map((lotId) => <li key={lotId}>{lotId}</li>)}</ul> : <p className="mt-2 text-muted">Sin candidatos.</p>}</div>
                <div className="grid gap-2 text-sm sm:grid-cols-2"><span>Evaluable: <strong>{candidatePreview?.evaluable ? "Sí" : "No"}</strong></span><span>Razón: <strong>{candidatePreview?.reason || "Sin blocker"}</strong></span></div>
              </> : <EmptyState title="Seleccioná una rule" detail="El preview usa sólo GET y no activa la rule." />}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader><div><CardTitle>Canary preflight</CardTitle><p className="mt-1 text-sm text-muted">Todos los gates que el backend evalúa para este tenant y rule.</p></div><Badge variant={preflight?.canarySafe ? "success" : "warning"}>{preflight?.canarySafe ? "SAFE" : "No habilitado"}</Badge></CardHeader>
            <CardContent className="space-y-3">
              {selectedRule && preflight ? <>
                <div className="grid gap-2 sm:grid-cols-2"><Metric label="Enabled rules" value={preflight.enabledRules?.count ?? "—"} /><Metric label="Recipient count" value={preflight.recipients?.count ?? "—"} /></div>
                <div className="rounded-xl border border-white/8 bg-black/15 p-3 text-sm"><p className="font-medium text-white">Reasons</p>{preflight.reasons?.length ? <ul className="mt-2 space-y-1 text-muted">{preflight.reasons.map((reason, index) => { const code = typeof reason === "string" ? reason : reason.code || "unknown"; const detail = typeof reason === "string" ? null : reason.detail; return <li key={`${code}-${index}`}>• {code}{detail ? ` — ${detail}` : ""}</li>; })}</ul> : <p className="mt-2 text-emerald-200">Sin blockers.</p>}</div>
                <p className="text-xs text-muted">Evaluado: {formatDate((preflight as { evaluatedAt?: string }).evaluatedAt)}</p>
              </> : <EmptyState title="Preflight pendiente" detail="Actualizá o seleccioná una rule. No se habilita nada automáticamente." />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><div><CardTitle>Asociar recipient</CardTitle><p className="mt-1 text-sm text-muted">La asociación reemplaza el vínculo de la rule por exactamente un recipient y requiere que esté disabled.</p></div><UsersRound className="h-5 w-5 text-brandBright" /></CardHeader>
            <CardContent className="space-y-3">
              <select
                aria-label="Recipient para asociar"
                className="h-10 w-full rounded-xl border border-[color:var(--field-border)] bg-[color:var(--field-bg)] px-3 text-sm"
                value={associationRecipientId}
                disabled={!selectedRule || selectedRule.enabled || canaryScopeLocked || busy !== null}
                onChange={(event) => setAssociationRecipientId(event.target.value)}
              >
                <option value="">Seleccioná un recipient</option>
                {recipients.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.name || "Sin nombre"} · {recipient.phoneMasked || "teléfono protegido"}</option>)}
              </select>
              <Button type="button" variant="secondary" disabled={!selectedRule || selectedRule.enabled || canaryScopeLocked || !selectedRecipient || busy !== null} onClick={() => setAssociationDialogOpen(true)}>Asociar a rule seleccionada</Button>
              {selectedRule?.enabled ? <p className="text-sm text-amber-200">Detené la rule antes de cambiar su recipient.</p> : null}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader><div><CardTitle>Recipients</CardTitle><p className="mt-1 text-sm text-muted">Números enmascarados; el consentimiento requiere una confirmación humana y no activa recipients.</p></div><Badge variant="outline">{recipients.length}</Badge></CardHeader>
          <CardContent className="space-y-3">
            {recipients.length ? recipients.map((recipient) => {
              const consent = String(recipient.consent?.status || "pending");
              const associated = selectedRuleRecipientIds.has(recipient.id);
              return <div key={recipient.id} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-medium text-white">{recipient.name || "Recipient sin nombre"}</p><p className="mt-1 text-sm text-muted">{recipient.phoneMasked || "Teléfono protegido"}</p><div className="mt-2 flex flex-wrap gap-2"><Badge variant={recipient.active ? "success" : "warning"}>{recipient.active ? "Activo" : "Inactivo"}</Badge><Badge variant={consentTone(consent)}>{consentLabel(consent)}</Badge>{associated ? <Badge variant="outline">Asociado a la rule</Badge> : null}</div></div><div className="flex flex-wrap gap-2">{consent !== "granted" ? <Button type="button" size="sm" variant="secondary" disabled={canaryScopeLocked || busy !== null} onClick={() => setConsentAction({ recipient, status: "granted" })}>Registrar consentimiento</Button> : <Button type="button" size="sm" variant="destructive" disabled={canaryScopeLocked || busy !== null} onClick={() => setConsentAction({ recipient, status: "revoked" })}>Revocar consentimiento</Button>}</div></div>
              </div>;
            }) : <EmptyState title="No hay recipients" detail="Esta pantalla no crea recipients automáticamente." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Historial operativo</CardTitle><p className="mt-1 text-sm text-muted">Eventos, instances y delivery status. El detalle muestra intentos, timestamps y condición de error sanitizada.</p></div><Badge variant="outline">{historyTotal} total</Badge></CardHeader>
          <CardContent className="space-y-3">
            {history.length ? history.map((item) => <div key={item.instanceId} className="rounded-2xl border border-white/8 bg-black/10 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-medium text-white">{operationalAlertEventLabel(item.eventType)}</p><p className="mt-1 font-mono text-xs text-muted">Instance {item.instanceId}</p><p className="mt-1 text-xs text-muted">{formatDate(item.occurredAt)}</p></div><div className="flex flex-wrap items-center gap-2"><Badge variant={item.status.includes("error") || item.status.includes("failed") ? "danger" : "success"}>{operationalAlertStatusLabel(item.status)}</Badge><Button type="button" size="sm" variant="secondary" disabled={busy !== null} onClick={() => void openHistoryDetail(item.instanceId)}>Ver detalle</Button></div></div><div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-4"><span>Delivery: {item.deliverySummary.total}</span><span>Sent: {item.deliverySummary.sent}</span><span>Delivered: {item.deliverySummary.delivered}</span><span>Errores: {item.deliverySummary.failed + item.deliverySummary.unknown}</span></div></div>) : <EmptyState title="Sin actividad" detail="No hay eventos ni deliveries para este tenant. La página no reintenta ni crea envíos." />}
          </CardContent>
        </Card>
      </> : null}

      <Dialog open={activationDialogOpen} onOpenChange={(open) => { setActivationDialogOpen(open); if (!open) setActivationAcknowledged(false); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar activación manual</DialogTitle><DialogDescription>Esta acción puede enviar 1 WhatsApp real. Primero activa el switch, revalida y luego habilita exclusivamente la rule seleccionada.</DialogDescription></DialogHeader>
          <label className="mt-5 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-100"><input type="checkbox" className="mt-1" checked={activationAcknowledged} onChange={(event) => setActivationAcknowledged(event.target.checked)} /><span>Confirmo que revisé los gates y que esta ventana manual puede enviar un único WhatsApp real. No habrá reintento ni reenvío automático.</span></label>
          <DialogFooter><Button type="button" variant="secondary" onClick={() => setActivationDialogOpen(false)}>Cancelar</Button><Button type="button" disabled={!activationAcknowledged || !activationAllowed || busy !== null} onClick={() => void activateCanary()}>{busy === "activate-canary" ? "Activando..." : "Confirmar y activar canario"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={associationDialogOpen}
        onOpenChange={setAssociationDialogOpen}
        title="Confirmar asociación"
        description={`Se asociará exactamente un recipient a ${selectedRule?.name || "la rule seleccionada"}. La rule permanece deshabilitada y deberá pasar preflight de nuevo.`}
        confirmText="Asociar recipient"
        onConfirm={associateRecipient}
      />
      <ConfirmDialog
        open={Boolean(consentAction)}
        onOpenChange={(open) => { if (!open) setConsentAction(null); }}
        title={consentAction?.status === "granted" ? "Registrar consentimiento" : "Revocar consentimiento"}
        description={consentAction?.status === "granted" ? "Confirmá que existe consentimiento explícito y verificable. Se registrará una fuente de confirmación manual Admin." : "La revocación bloquea futuros deliveries para este recipient."}
        confirmText={consentAction?.status === "granted" ? "Confirmar consentimiento" : "Confirmar revocación"}
        variant={consentAction?.status === "revoked" ? "destructive" : "default"}
        onConfirm={updateConsent}
      />

      <Dialog open={Boolean(historyDetail)} onOpenChange={(open) => { if (!open) setHistoryDetail(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>Detalle de delivery</DialogTitle><DialogDescription>Datos operativos sanitizados; no se exponen secretos, teléfonos completos ni errores raw del proveedor.</DialogDescription></DialogHeader>
          {historyDetail ? <div className="mt-5 space-y-4"><div className="grid gap-2 text-sm sm:grid-cols-2"><Metric label="Event" value={historyDetail.event.id} /><Metric label="Instance" value={historyDetail.instanceId} /><Metric label="Estado" value={operationalAlertStatusLabel(historyDetail.status)} /><Metric label="Ocurrió" value={formatDate(historyDetail.event.occurredAt)} /></div><div className="space-y-2">{historyDetail.deliveries.map((delivery) => <div key={delivery.id} className="rounded-xl border border-white/8 bg-black/15 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-mono text-xs text-muted">Delivery {delivery.id}</p><p className="mt-1 text-sm font-medium text-white">{operationalAlertStatusLabel(delivery.status)}</p></div><Badge variant={delivery.hasError ? "danger" : delivery.status === "delivered" || delivery.status === "read" ? "success" : "warning"}>{delivery.hasError ? "Error sanitizado" : "Sin error"}</Badge></div><div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-4"><span>Attempts: {delivery.attemptCount}</span><span>Sent: {formatDate(delivery.sentAt)}</span><span>Delivered: {formatDate(delivery.deliveredAt)}</span><span>Error: {delivery.hasError ? "Sí" : "No"}</span></div></div>)}</div><DialogFooter><Button type="button" variant="secondary" onClick={() => setHistoryDetail(null)}>Cerrar</Button></DialogFooter></div> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-2xl border border-dashed border-white/15 bg-black/10 p-6 text-center"><AlertTriangle className="mx-auto h-5 w-5 text-amber-200" /><p className="mt-2 font-medium text-white">{title}</p><p className="mt-1 text-sm text-muted">{detail}</p></div>;
}
