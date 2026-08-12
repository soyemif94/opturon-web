"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  Ban,
  BellRing,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  History,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  ShieldCheck,
  UserRoundPlus,
  UsersRound,
  XCircle
} from "lucide-react";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ConfirmDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  buildInventoryPreviewPayload,
  operationalAlertEventLabel,
  operationalAlertsErrorMessage,
  operationalAlertStatusLabel,
  readinessBlockerLabel,
  type OperationalAlertEventType,
  type OperationalAlertHistoryDetail,
  type OperationalAlertHistoryItem,
  type OperationalAlertPreview,
  type OperationalAlertReadiness,
  type OperationalAlertRecipient,
  type OperationalAlertRule,
  type OperationalAlertsInitialData
} from "@/lib/operational-alerts";

type WorkspaceTab = "recipients" | "rules" | "history";

const SELECT_CLASS = "h-10 w-full rounded-xl border border-[color:var(--field-border)] bg-[color:var(--field-bg)] px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";
const CHECKBOX_CLASS = "h-4 w-4 rounded border-white/20 bg-black/20 text-brand focus-visible:ring-2 focus-visible:ring-brand";

class AlertsUiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

async function alertsRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/app/operational-alerts${path}`, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: init?.body ? { "Content-Type": "application/json", ...(init.headers || {}) } : init?.headers
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new AlertsUiError(response.status, String(payload?.error || "operational_alerts_request_failed"));
  return payload as T;
}

function asIsoDateTime(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function formatDate(value: string | null | undefined, includeTime = true) {
  if (!value) return "Sin datos";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Sin datos";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" as const } : {})
  }).format(date);
}

function areaLabel(value: string) {
  return value.replace(/[_.-]+/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

function consentLabel(status: string) {
  if (status === "granted") return "Otorgado";
  if (status === "revoked") return "Revocado";
  return "Pendiente";
}

function consentTone(status: string): "success" | "danger" | "warning" {
  if (status === "granted") return "success";
  if (status === "revoked") return "danger";
  return "warning";
}

function ruleState(rule: OperationalAlertRule, readiness?: OperationalAlertReadiness) {
  if (rule.enabled) return { label: "Activa", tone: "success" as const };
  if (readiness?.ready) return { label: "Lista para activar", tone: "warning" as const };
  if (readiness?.blockers?.length) return { label: "Bloqueada", tone: "danger" as const };
  return { label: "Borrador / Deshabilitada", tone: "muted" as const };
}

function templateState(readiness?: OperationalAlertReadiness) {
  if (!readiness) return { label: "Sin verificar", tone: "muted" as const };
  if (readiness?.checks.templateReady) return { label: "Aprobado", tone: "success" as const };
  const codes = new Set((readiness?.blockers || []).map((item) => item.code));
  if (codes.has("TEMPLATE_NOT_APPROVED")) return { label: "Pendiente", tone: "warning" as const };
  if (codes.has("TEMPLATE_CONTRACT_MISMATCH")) return { label: "Incompatible", tone: "danger" as const };
  return { label: "No configurado", tone: "muted" as const };
}

function friendlyApiError(error: unknown) {
  if (error instanceof AlertsUiError) return operationalAlertsErrorMessage(error.code, error.status);
  return operationalAlertsErrorMessage("");
}

export function OperationalAlertsWorkspace({ initialData }: { initialData: OperationalAlertsInitialData }) {
  const [tab, setTab] = useState<WorkspaceTab>("recipients");
  const [settings, setSettings] = useState(initialData.settings);
  const [eventTypes, setEventTypes] = useState(initialData.eventTypes);
  const [recipients, setRecipients] = useState(initialData.recipients);
  const [rules, setRules] = useState(initialData.rules);
  const [readinessByRule, setReadinessByRule] = useState(initialData.readinessByRule);
  const [historyItems, setHistoryItems] = useState(initialData.history);
  const [historyPagination, setHistoryPagination] = useState(initialData.historyPagination);
  const [pageError, setPageError] = useState(initialData.loadError);
  const [busy, setBusy] = useState<string | null>(null);
  const [recipientDialog, setRecipientDialog] = useState<{ open: boolean; recipient: OperationalAlertRecipient | null }>({ open: false, recipient: null });
  const [consentRecipient, setConsentRecipient] = useState<OperationalAlertRecipient | null>(null);
  const [disableRecipient, setDisableRecipient] = useState<OperationalAlertRecipient | null>(null);
  const [ruleDialog, setRuleDialog] = useState<{ open: boolean; rule: OperationalAlertRule | null }>({ open: false, rule: null });
  const [preview, setPreview] = useState<OperationalAlertPreview | null>(null);
  const [historyDetail, setHistoryDetail] = useState<OperationalAlertHistoryDetail | null>(null);

  function replaceRecipient(next: OperationalAlertRecipient) {
    setRecipients((current) => {
      const exists = current.some((item) => item.id === next.id);
      return exists ? current.map((item) => item.id === next.id ? next : item) : [next, ...current];
    });
  }

  function replaceRule(next: OperationalAlertRule) {
    setRules((current) => {
      const exists = current.some((item) => item.id === next.id);
      return exists ? current.map((item) => item.id === next.id ? next : item) : [next, ...current];
    });
  }

  async function loadRuleState(ruleId: string) {
    const [rule, readiness] = await Promise.all([
      alertsRequest<OperationalAlertRule>(`/rules/${ruleId}`),
      alertsRequest<OperationalAlertReadiness>(`/rules/${ruleId}/readiness`)
    ]);
    replaceRule(rule);
    setReadinessByRule((current) => ({ ...current, [ruleId]: readiness }));
    return { rule, readiness };
  }

  async function refreshRulesForRecipient(recipientId: string) {
    const affectedRules = rules.filter((rule) => (rule.recipientIds || []).includes(recipientId));
    await Promise.all(affectedRules.map((rule) => loadRuleState(rule.id).catch(() => null)));
  }

  async function refreshAll() {
    setBusy("refresh");
    setPageError(null);
    try {
      const [nextSettings, typesResult, recipientsResult, rulesResult, historyResult] = await Promise.all([
        alertsRequest<OperationalAlertsInitialData["settings"]>("/settings"),
        alertsRequest<{ items: OperationalAlertEventType[] }>("/event-types"),
        alertsRequest<{ items: OperationalAlertRecipient[] }>("/recipients?limit=200"),
        alertsRequest<{ items: OperationalAlertRule[] }>("/rules?limit=100&includeArchived=false"),
        alertsRequest<{ items: OperationalAlertHistoryItem[]; pagination: OperationalAlertsInitialData["historyPagination"] }>("/history?page=1&pageSize=25")
      ]);
      const details = await Promise.all(rulesResult.items.map(async (rule) => {
        const [detail, readiness] = await Promise.all([
          alertsRequest<OperationalAlertRule>(`/rules/${rule.id}`),
          alertsRequest<OperationalAlertReadiness>(`/rules/${rule.id}/readiness`).catch(() => null)
        ]);
        return { detail, readiness };
      }));
      setSettings(nextSettings);
      setEventTypes(typesResult.items);
      setRecipients(recipientsResult.items);
      setRules(details.map((item) => item.detail));
      setReadinessByRule(Object.fromEntries(details.flatMap((item) => item.readiness ? [[item.detail.id, item.readiness]] : [])));
      setHistoryItems(historyResult.items);
      setHistoryPagination(historyResult.pagination);
      toast.success("Alertas actualizadas");
    } catch (error) {
      const message = friendlyApiError(error);
      setPageError(message);
      toast.error("No pudimos actualizar", message);
    } finally {
      setBusy(null);
    }
  }

  async function saveRecipient(payload: Record<string, unknown>, current: OperationalAlertRecipient | null) {
    const key = current ? `recipient-${current.id}` : "recipient-new";
    setBusy(key);
    try {
      const next = await alertsRequest<OperationalAlertRecipient>(current ? `/recipients/${current.id}` : "/recipients", {
        method: current ? "PATCH" : "POST",
        body: JSON.stringify(current ? { ...payload, expectedVersion: current.version } : payload)
      });
      replaceRecipient(next);
      await refreshRulesForRecipient(next.id);
      setRecipientDialog({ open: false, recipient: null });
      toast.success(current ? "Responsable actualizado" : "Responsable creado", current ? undefined : "Quedó inactivo y con consentimiento pendiente.");
    } catch (error) {
      const message = friendlyApiError(error);
      toast.error("No pudimos guardar el responsable", message);
      if (error instanceof AlertsUiError && error.status === 409 && current) {
        const fresh = await alertsRequest<OperationalAlertRecipient>(`/recipients/${current.id}`).catch(() => null);
        if (fresh) replaceRecipient(fresh);
      }
      throw error;
    } finally {
      setBusy(null);
    }
  }

  async function saveConsent(payload: Record<string, unknown>, recipient: OperationalAlertRecipient) {
    setBusy(`consent-${recipient.id}`);
    try {
      const next = await alertsRequest<OperationalAlertRecipient>(`/recipients/${recipient.id}/consent`, {
        method: "POST",
        body: JSON.stringify({ ...payload, expectedVersion: recipient.version })
      });
      replaceRecipient(next);
      await refreshRulesForRecipient(next.id);
      setConsentRecipient(null);
      toast.success(payload.status === "granted" ? "Consentimiento registrado" : "Consentimiento revocado");
    } catch (error) {
      const message = friendlyApiError(error);
      toast.error("No pudimos actualizar el consentimiento", message);
      if (error instanceof AlertsUiError && error.status === 409) {
        const fresh = await alertsRequest<OperationalAlertRecipient>(`/recipients/${recipient.id}`).catch(() => null);
        if (fresh) replaceRecipient(fresh);
      }
      throw error;
    } finally {
      setBusy(null);
    }
  }

  async function confirmDisableRecipient() {
    if (!disableRecipient) return;
    setBusy(`disable-${disableRecipient.id}`);
    try {
      const next = await alertsRequest<OperationalAlertRecipient>(`/recipients/${disableRecipient.id}/disable`, {
        method: "POST",
        body: JSON.stringify({ expectedVersion: disableRecipient.version })
      });
      replaceRecipient(next);
      await refreshRulesForRecipient(next.id);
      setDisableRecipient(null);
      toast.success("Responsable desactivado", "El consentimiento se conserva como un estado independiente.");
    } catch (error) {
      toast.error("No pudimos desactivar", friendlyApiError(error));
    } finally {
      setBusy(null);
    }
  }

  async function saveRule(payload: Record<string, unknown>, recipientIds: string[], current: OperationalAlertRule | null) {
    const key = current ? `rule-${current.id}` : "rule-new";
    setBusy(key);
    let saved: OperationalAlertRule | null = null;
    try {
      saved = await alertsRequest<OperationalAlertRule>(current ? `/rules/${current.id}` : "/rules", {
        method: current ? "PATCH" : "POST",
        body: JSON.stringify(current ? { ...payload, expectedConfigVersion: current.configVersion } : payload)
      });
      replaceRule(saved);
      saved = await alertsRequest<OperationalAlertRule>(`/rules/${saved.id}/recipients`, {
        method: "PUT",
        body: JSON.stringify({ recipientIds, expectedConfigVersion: saved.configVersion })
      });
      replaceRule(saved);
      await loadRuleState(saved.id).catch(() => null);
      setRuleDialog({ open: false, rule: null });
      toast.success(current ? "Regla actualizada" : "Regla creada", "Quedó deshabilitada hasta completar readiness y activarla explícitamente.");
    } catch (error) {
      const message = friendlyApiError(error);
      if (saved) {
        await loadRuleState(saved.id).catch(() => null);
        setRuleDialog({ open: false, rule: null });
        toast.error("La regla quedó guardada sin completar", "No pudimos actualizar sus responsables. Sigue deshabilitada y podés editarla nuevamente.");
        return;
      }
      toast.error("No pudimos guardar la regla", message);
      if (error instanceof AlertsUiError && error.status === 409 && current) await loadRuleState(current.id).catch(() => null);
      throw error;
    } finally {
      setBusy(null);
    }
  }

  async function toggleRule(rule: OperationalAlertRule) {
    const readiness = readinessByRule[rule.id];
    if (!rule.enabled && !readiness?.ready) return;
    setBusy(`toggle-${rule.id}`);
    try {
      const next = await alertsRequest<OperationalAlertRule>(`/rules/${rule.id}/${rule.enabled ? "disable" : "enable"}`, {
        method: "POST",
        body: JSON.stringify({ expectedConfigVersion: rule.configVersion })
      });
      replaceRule(next);
      await loadRuleState(next.id);
      toast.success(rule.enabled ? "Alerta desactivada" : "Alerta activada");
    } catch (error) {
      toast.error("No pudimos cambiar el estado", friendlyApiError(error));
      await loadRuleState(rule.id).catch(() => null);
    } finally {
      setBusy(null);
    }
  }

  async function openPreview(rule: OperationalAlertRule) {
    setBusy(`preview-${rule.id}`);
    try {
      const next = await alertsRequest<OperationalAlertPreview>(`/rules/${rule.id}/preview`, {
        method: "POST",
        body: JSON.stringify({ payload: buildInventoryPreviewPayload(rule) })
      });
      setPreview(next);
    } catch (error) {
      toast.error("No pudimos generar la vista previa", friendlyApiError(error));
    } finally {
      setBusy(null);
    }
  }

  async function loadHistory(filters: HistoryFilters, page = 1) {
    setBusy("history");
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: "25" });
      for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
      const result = await alertsRequest<{ items: OperationalAlertHistoryItem[]; pagination: OperationalAlertsInitialData["historyPagination"] }>(`/history?${query}`);
      setHistoryItems(result.items);
      setHistoryPagination(result.pagination);
    } catch (error) {
      toast.error("No pudimos filtrar el historial", friendlyApiError(error));
    } finally {
      setBusy(null);
    }
  }

  async function openHistoryDetail(instanceId: string) {
    setBusy(`history-${instanceId}`);
    try {
      setHistoryDetail(await alertsRequest<OperationalAlertHistoryDetail>(`/history/${instanceId}`));
    } catch (error) {
      toast.error("No pudimos abrir el detalle", friendlyApiError(error));
    } finally {
      setBusy(null);
    }
  }

  const tabs: Array<{ id: WorkspaceTab; label: string; count?: number }> = [
    { id: "recipients", label: "Responsables", count: recipients.length },
    { id: "rules", label: "Reglas", count: rules.length },
    { id: "history", label: "Historial", count: historyPagination.total }
  ];

  return (
    <ClientPageShell
      title="Alertas operativas"
      description="Definí quién recibe avisos y qué eventos querés monitorear."
      badge="Configuración"
      backHref="/app/settings"
      backLabel="Volver a Configuración"
      action={
        <Button variant="secondary" onClick={refreshAll} disabled={busy === "refresh"}>
          <RefreshCw className={`mr-2 h-4 w-4 ${busy === "refresh" ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      }
    >
      {settings?.operationalAlertsEnabled === false ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100" role="status">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Las alertas operativas están desactivadas para esta cuenta.</p>
            <p className="mt-1 text-sm text-amber-100/75">Podés preparar responsables y reglas, pero no se enviará nada mientras la configuración global siga desactivada.</p>
          </div>
        </div>
      ) : null}

      {pageError ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <p className="text-sm text-red-100">{pageError}</p>
          <Button variant="secondary" size="sm" onClick={refreshAll}>Reintentar</Button>
        </div>
      ) : null}

      <div className="rounded-[22px] border border-white/8 bg-card/85 p-1.5" role="tablist" aria-label="Secciones de alertas operativas">
        <div className="grid grid-cols-3 gap-1.5">
          {tabs.map((item, index) => (
            <button
              key={item.id}
              id={`alerts-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              aria-controls={`alerts-panel-${item.id}`}
              tabIndex={tab === item.id ? 0 : -1}
              onClick={() => setTab(item.id)}
              onKeyDown={(event) => {
                const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
                const targetIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : direction ? (index + direction + tabs.length) % tabs.length : -1;
                if (targetIndex < 0) return;
                event.preventDefault();
                const nextTab = tabs[targetIndex];
                setTab(nextTab.id);
                requestAnimationFrame(() => document.getElementById(`alerts-tab-${nextTab.id}`)?.focus());
              }}
              className={`min-h-11 rounded-2xl px-2 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${tab === item.id ? "bg-brand text-white" : "text-muted hover:bg-white/5 hover:text-white"}`}
            >
              <span>{item.label}</span>
              {item.count !== undefined ? <span className="ml-1.5 text-xs opacity-75">{item.count}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {tab === "recipients" ? (
        <section id="alerts-panel-recipients" role="tabpanel" aria-labelledby="alerts-tab-recipients">
          <RecipientsPanel
            recipients={recipients}
            busy={busy}
            onCreate={() => setRecipientDialog({ open: true, recipient: null })}
            onEdit={(recipient) => setRecipientDialog({ open: true, recipient })}
            onConsent={setConsentRecipient}
            onDisable={setDisableRecipient}
          />
        </section>
      ) : null}

      {tab === "rules" ? (
        <section id="alerts-panel-rules" role="tabpanel" aria-labelledby="alerts-tab-rules">
          <RulesPanel
            rules={rules}
            readinessByRule={readinessByRule}
            recipients={recipients}
            channels={initialData.channels}
            busy={busy}
            onCreate={() => setRuleDialog({ open: true, rule: null })}
            onEdit={(rule) => setRuleDialog({ open: true, rule })}
            onToggle={toggleRule}
            onPreview={openPreview}
            onRefreshReadiness={(rule) => loadRuleState(rule.id).catch((error) => toast.error("No pudimos actualizar readiness", friendlyApiError(error)))}
          />
        </section>
      ) : null}

      {tab === "history" ? (
        <section id="alerts-panel-history" role="tabpanel" aria-labelledby="alerts-tab-history">
          <HistoryPanel
            items={historyItems}
            rules={rules}
            busy={busy === "history"}
            pagination={historyPagination}
            onFilter={loadHistory}
            onOpen={openHistoryDetail}
          />
        </section>
      ) : null}

      <RecipientFormDialog
        open={recipientDialog.open}
        recipient={recipientDialog.recipient}
        staffUsers={initialData.staffUsers}
        busy={Boolean(busy?.startsWith("recipient-"))}
        onOpenChange={(open) => setRecipientDialog((current) => ({ ...current, open }))}
        onSave={saveRecipient}
      />
      <ConsentDialog
        recipient={consentRecipient}
        busy={Boolean(busy?.startsWith("consent-"))}
        onOpenChange={(open) => !open && setConsentRecipient(null)}
        onSave={saveConsent}
      />
      <ConfirmDialog
        open={Boolean(disableRecipient)}
        onOpenChange={(open) => !open && setDisableRecipient(null)}
        title="Desactivar responsable"
        description="No se eliminará el registro ni se modificará su consentimiento. Dejará de ser elegible para alertas."
        confirmText={busy?.startsWith("disable-") ? "Desactivando..." : "Desactivar"}
        variant="destructive"
        onConfirm={confirmDisableRecipient}
      />
      <RuleFormDialog
        open={ruleDialog.open}
        rule={ruleDialog.rule}
        eventTypes={eventTypes}
        recipients={recipients}
        channels={initialData.channels}
        timezone={initialData.tenantTimezone}
        busy={Boolean(busy?.startsWith("rule-"))}
        onOpenChange={(open) => setRuleDialog((current) => ({ ...current, open }))}
        onSave={saveRule}
      />
      <PreviewDialog preview={preview} onOpenChange={(open) => !open && setPreview(null)} />
      <HistoryDetailDialog detail={historyDetail} onOpenChange={(open) => !open && setHistoryDetail(null)} />
    </ClientPageShell>
  );
}

function PanelHeader({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-brand/20 bg-brand/10 text-brandBright">{icon}</span>
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
      </div>
      <div className="sm:shrink-0">{action}</div>
    </div>
  );
}

function RecipientsPanel({ recipients, busy, onCreate, onEdit, onConsent, onDisable }: {
  recipients: OperationalAlertRecipient[];
  busy: string | null;
  onCreate: () => void;
  onEdit: (recipient: OperationalAlertRecipient) => void;
  onConsent: (recipient: OperationalAlertRecipient) => void;
  onDisable: (recipient: OperationalAlertRecipient) => void;
}) {
  return (
    <div>
      <PanelHeader
        icon={<UsersRound className="h-5 w-5" />}
        title="Responsables"
        description="Personas autorizadas que pueden recibir alertas internas."
        action={<Button onClick={onCreate} className="w-full sm:w-auto"><UserRoundPlus className="mr-2 h-4 w-4" />Nuevo responsable</Button>}
      />
      {recipients.length === 0 ? (
        <EmptyState icon={<UsersRound className="h-7 w-7" />} title="Todavía no hay responsables" description="Creá el primer responsable. Quedará inactivo y con consentimiento pendiente hasta que completes ambos pasos." action={<Button onClick={onCreate}><Plus className="mr-2 h-4 w-4" />Nuevo responsable</Button>} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {recipients.map((recipient) => (
            <Card key={recipient.id} className="border-white/8 bg-card/90">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-white">{recipient.name}</p>
                    <p className="mt-1 text-sm text-muted">{recipient.roleLabel || "Sin rol informado"}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Badge variant={recipient.active ? "success" : "muted"}>{recipient.active ? "Activo" : "Inactivo"}</Badge>
                    <Badge variant={consentTone(recipient.consent.status)}>{consentLabel(recipient.consent.status)}</Badge>
                  </div>
                </div>
                <dl className="mt-4 grid gap-3 rounded-2xl border border-white/8 bg-black/15 p-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-muted">WhatsApp</dt><dd className="mt-1 font-medium text-white">{recipient.phoneMasked || "No disponible"}</dd></div>
                  <div><dt className="text-xs text-muted">Staff vinculado</dt><dd className="mt-1 font-medium text-white">{recipient.staff?.displayName || "Sin vínculo"}</dd></div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-1.5" aria-label={`Áreas de ${recipient.name}`}>
                  {recipient.areaKeys.length ? recipient.areaKeys.map((area) => <Badge key={area} variant="outline">{areaLabel(area)}</Badge>) : <span className="text-xs text-muted">Sin áreas informadas</span>}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Button variant="secondary" size="sm" onClick={() => onEdit(recipient)}><Pencil className="mr-2 h-3.5 w-3.5" />Editar</Button>
                  <Button variant="secondary" size="sm" onClick={() => onConsent(recipient)}><ShieldCheck className="mr-2 h-3.5 w-3.5" />Consentimiento</Button>
                  {recipient.active ? <Button variant="destructive" size="sm" disabled={busy === `disable-${recipient.id}`} onClick={() => onDisable(recipient)}><Ban className="mr-2 h-3.5 w-3.5" />Desactivar</Button> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-medium text-white">{label}</label>
      {hint ? <p id={`${htmlFor}-hint`} className="mt-1 text-xs text-muted">{hint}</p> : null}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function RecipientFormDialog({ open, recipient, staffUsers, busy, onOpenChange, onSave }: {
  open: boolean;
  recipient: OperationalAlertRecipient | null;
  staffUsers: OperationalAlertsInitialData["staffUsers"];
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: Record<string, unknown>, recipient: OperationalAlertRecipient | null) => Promise<void>;
}) {
  const key = `${recipient?.id || "new"}-${open}`;
  return <RecipientFormDialogBody key={key} {...{ open, recipient, staffUsers, busy, onOpenChange, onSave }} />;
}

function RecipientFormDialogBody({ open, recipient, staffUsers, busy, onOpenChange, onSave }: Parameters<typeof RecipientFormDialog>[0]) {
  const [name, setName] = useState(recipient?.name || "");
  const [phone, setPhone] = useState("");
  const [roleLabel, setRoleLabel] = useState(recipient?.roleLabel || "");
  const [areas, setAreas] = useState((recipient?.areaKeys || []).join(", "));
  const [active, setActive] = useState(recipient?.active || false);
  const [staffUserId, setStaffUserId] = useState(recipient?.staff?.id || "");
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);
    const areaKeys = areas.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
    if (!name.trim() || (!recipient && !/^\+[1-9][0-9]{7,14}$/.test(phone.trim())) || areaKeys.some((item) => !/^[a-z][a-z0-9_.-]*$/.test(item))) {
      setLocalError("Completá nombre, un teléfono E.164 válido y áreas con claves simples separadas por coma.");
      return;
    }
    if (recipient && phone.trim() && !/^\+[1-9][0-9]{7,14}$/.test(phone.trim())) {
      setLocalError("El nuevo teléfono debe usar formato E.164, por ejemplo +5491123456789.");
      return;
    }
    const payload: Record<string, unknown> = {
      name: name.trim(),
      roleLabel: roleLabel.trim() || null,
      areaKeys,
      ...(recipient ? { active } : { phoneE164: phone.trim(), staffUserId: staffUserId || null }),
      ...(staffUsers.length ? { staffUserId: staffUserId || null } : {})
    };
    if (recipient && phone.trim()) payload.phoneE164 = phone.trim();
    try {
      await onSave(payload, recipient);
    } catch {
      setLocalError("No se guardaron cambios. Revisá el aviso e intentá nuevamente.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{recipient ? "Editar responsable" : "Nuevo responsable"}</DialogTitle>
          <DialogDescription>El responsable debe tener consentimiento registrado antes de recibir alertas.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <Field label="Nombre" htmlFor="recipient-name"><Input id="recipient-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={200} required autoFocus /></Field>
          <Field label={recipient ? "Nuevo WhatsApp (opcional)" : "WhatsApp / teléfono E.164"} htmlFor="recipient-phone" hint={recipient ? `Actual: ${recipient.phoneMasked || "enmascarado"}. Dejalo vacío para conservarlo.` : "Ejemplo: +5491123456789"}><Input id="recipient-phone" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="+5491123456789" required={!recipient} aria-describedby="recipient-phone-hint" /></Field>
          <Field label="Rol o función" htmlFor="recipient-role"><Input id="recipient-role" value={roleLabel} onChange={(event) => setRoleLabel(event.target.value)} maxLength={200} placeholder="Ej. Encargado de inventario" /></Field>
          <Field label="Áreas" htmlFor="recipient-areas" hint="Claves separadas por coma, por ejemplo: inventario, operaciones"><Input id="recipient-areas" value={areas} onChange={(event) => setAreas(event.target.value)} aria-describedby="recipient-areas-hint" placeholder="inventario, operaciones" /></Field>
          {staffUsers.length ? (
            <Field label="Usuario del equipo (opcional)" htmlFor="recipient-staff" hint="Sólo se muestran usuarios activos de esta cuenta.">
              <select id="recipient-staff" className={SELECT_CLASS} value={staffUserId} onChange={(event) => setStaffUserId(event.target.value)} aria-describedby="recipient-staff-hint">
                <option value="">Sin vínculo</option>
                {staffUsers.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.role}</option>)}
              </select>
            </Field>
          ) : null}
          {recipient ? (
            <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-white/10 bg-black/15 px-3 py-2 text-sm text-white">
              <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className={CHECKBOX_CLASS} />
              Responsable activo
            </label>
          ) : (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 p-3 text-sm text-amber-100">Se creará inactivo y con consentimiento pendiente. Actividad y consentimiento se gestionan por separado.</div>
          )}
          {localError ? <p className="text-sm text-red-200" role="alert">{localError}</p> : null}
          <DialogFooter className="flex-col-reverse sm:flex-row">
            <DialogClose asChild><Button type="button" variant="secondary" disabled={busy}>Cancelar</Button></DialogClose>
            <Button type="submit" disabled={busy}>{busy ? "Guardando..." : "Guardar responsable"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConsentDialog({ recipient, busy, onOpenChange, onSave }: {
  recipient: OperationalAlertRecipient | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: Record<string, unknown>, recipient: OperationalAlertRecipient) => Promise<void>;
}) {
  const key = `${recipient?.id || "none"}-${Boolean(recipient)}`;
  return <ConsentDialogBody key={key} {...{ recipient, busy, onOpenChange, onSave }} />;
}

function ConsentDialogBody({ recipient, busy, onOpenChange, onSave }: Parameters<typeof ConsentDialog>[0]) {
  const [status, setStatus] = useState<"granted" | "revoked">(recipient?.consent.status === "revoked" ? "revoked" : "granted");
  const [source, setSource] = useState(recipient?.consent.source || "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [confirmed, setConfirmed] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!recipient) return;
    const iso = asIsoDateTime(date);
    if (!iso || !confirmed || (status === "granted" && !source.trim())) {
      setLocalError("Completá la evidencia requerida y confirmá que el registro es correcto.");
      return;
    }
    const payload = status === "granted"
      ? { status, consentSource: source.trim(), consentedAt: iso }
      : { status, consentSource: source.trim() || recipient.consent.source || null, revokedAt: iso };
    try {
      await onSave(payload, recipient);
    } catch {
      setLocalError("El consentimiento no se modificó. Actualizá los datos e intentá nuevamente.");
    }
  }

  return (
    <Dialog open={Boolean(recipient)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gestionar consentimiento</DialogTitle>
          <DialogDescription>Sin consentimiento otorgado, Opturon no enviará alertas a este número.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="rounded-2xl border border-white/8 bg-black/15 p-3 text-sm"><span className="text-muted">Responsable: </span><span className="font-medium text-white">{recipient?.name}</span><span className="ml-2 text-muted">{recipient?.phoneMasked}</span></div>
          <Field label="Nuevo estado" htmlFor="consent-status">
            <select id="consent-status" className={SELECT_CLASS} value={status} onChange={(event) => { setStatus(event.target.value as "granted" | "revoked"); setConfirmed(false); }}>
              <option value="granted">Otorgado</option>
              <option value="revoked">Revocado</option>
            </select>
          </Field>
          {status === "granted" ? <Field label="Fuente u origen" htmlFor="consent-source" hint="Texto libre basado en la evidencia real, por ejemplo: Autorización directa"><Input id="consent-source" value={source} onChange={(event) => setSource(event.target.value)} placeholder="Autorización directa" required aria-describedby="consent-source-hint" /></Field> : null}
          <Field label={status === "granted" ? "Fecha del consentimiento" : "Fecha de revocación"} htmlFor="consent-date"><Input id="consent-date" type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} required /></Field>
          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/15 p-3 text-sm text-white">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className={`${CHECKBOX_CLASS} mt-0.5`} />
            <span>{status === "granted" ? "Confirmo que existe una autorización verificable para enviar alertas internas a este número." : "Confirmo que la revocación fue solicitada o registrada de forma verificable."}</span>
          </label>
          {localError ? <p className="text-sm text-red-200" role="alert">{localError}</p> : null}
          <DialogFooter className="flex-col-reverse sm:flex-row">
            <DialogClose asChild><Button type="button" variant="secondary" disabled={busy}>Cancelar</Button></DialogClose>
            <Button type="submit" variant={status === "revoked" ? "destructive" : "primary"} disabled={busy || !confirmed}>{busy ? "Guardando..." : status === "granted" ? "Registrar consentimiento" : "Registrar revocación"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RulesPanel({ rules, readinessByRule, recipients, channels, busy, onCreate, onEdit, onToggle, onPreview, onRefreshReadiness }: {
  rules: OperationalAlertRule[];
  readinessByRule: Record<string, OperationalAlertReadiness>;
  recipients: OperationalAlertRecipient[];
  channels: OperationalAlertsInitialData["channels"];
  busy: string | null;
  onCreate: () => void;
  onEdit: (rule: OperationalAlertRule) => void;
  onToggle: (rule: OperationalAlertRule) => void;
  onPreview: (rule: OperationalAlertRule) => void;
  onRefreshReadiness: (rule: OperationalAlertRule) => void;
}) {
  return (
    <div>
      <PanelHeader icon={<BellRing className="h-5 w-5" />} title="Reglas" description="Definí cuándo avisar, por qué canal y a qué responsables." action={<Button onClick={onCreate} className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" />Nueva regla</Button>} />
      {rules.length === 0 ? (
        <EmptyState icon={<BellRing className="h-7 w-7" />} title="Todavía no hay reglas" description="Creá una regla de vencimientos. Se guardará deshabilitada y sólo podrá activarse cuando todos los controles estén listos." action={<Button onClick={onCreate}><Plus className="mr-2 h-4 w-4" />Nueva regla</Button>} />
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => {
            const readiness = readinessByRule[rule.id];
            const state = ruleState(rule, readiness);
            const template = templateState(readiness);
            const recipientNames = (rule.recipientIds || []).map((id) => recipients.find((item) => item.id === id)?.name).filter(Boolean);
            const channel = channels.find((item) => item.id === rule.channelId);
            return (
              <Card key={rule.id} className="overflow-hidden border-white/8 bg-card/90">
                <CardContent className="p-0">
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold text-white">{rule.name}</h3><Badge variant={state.tone}>{state.label}</Badge></div>
                        <p className="mt-1 text-sm text-muted">{operationalAlertEventLabel(rule.eventType)} · {rule.triggerMode === "scheduled" ? "Programada" : "Por evento"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => onPreview(rule)} disabled={busy === `preview-${rule.id}` || rule.eventType !== "inventory.lot_expiring"} title={rule.eventType !== "inventory.lot_expiring" ? "Este tipo de alerta todavía no está disponible" : undefined}><Eye className="mr-2 h-3.5 w-3.5" />Vista previa</Button>
                        <Button variant="secondary" size="sm" onClick={() => onEdit(rule)} disabled={rule.enabled || rule.eventType !== "inventory.lot_expiring"}><Pencil className="mr-2 h-3.5 w-3.5" />Editar</Button>
                      </div>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <RuleMetric label="Destinatarios" value={recipientNames.length ? recipientNames.join(", ") : "Sin responsables"} />
                      <RuleMetric label="Horario" value={String(rule.schedule.sendAt || "No aplica")} />
                      <RuleMetric label="Canal" value={channel?.label || "Sin canal"} />
                      <RuleMetric label="Próxima evaluación" value={rule.nextEvaluationAt ? formatDate(rule.nextEvaluationAt) : "Sin programar"} />
                    </dl>
                    <div className="mt-3 text-xs text-muted">Último disparo: {rule.lastTriggeredAt ? formatDate(rule.lastTriggeredAt) : "Aún no se disparó"}</div>
                  </div>
                  <div className="border-t border-white/8 bg-black/12 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div><p className="text-sm font-semibold text-white">Estado para activar</p><p className="mt-1 text-xs text-muted">Template: <span className={template.tone === "success" ? "text-emerald-300" : template.tone === "danger" ? "text-red-200" : "text-amber-200"}>{template.label}</span></p></div>
                      <Button variant="ghost" size="sm" onClick={() => onRefreshReadiness(rule)}><RefreshCw className="mr-2 h-3.5 w-3.5" />Actualizar controles</Button>
                    </div>
                    {readiness ? <ReadinessPanel readiness={readiness} /> : <p className="mt-3 text-sm text-muted">Readiness no disponible. Actualizá los controles.</p>}
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                      {rule.enabled ? (
                        <Button variant="destructive" onClick={() => onToggle(rule)} disabled={busy === `toggle-${rule.id}`}><Power className="mr-2 h-4 w-4" />Desactivar alerta</Button>
                      ) : (
                        <Button onClick={() => onToggle(rule)} disabled={!readiness?.ready || busy === `toggle-${rule.id}`} title={!readiness?.ready ? "Completá todos los controles de readiness antes de activar" : undefined}><Power className="mr-2 h-4 w-4" />Activar alerta</Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RuleMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/8 bg-black/15 p-3"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 line-clamp-2 font-medium text-white">{value}</dd></div>;
}

function ReadinessPanel({ readiness }: { readiness: OperationalAlertReadiness }) {
  const checks = [
    ["Productor disponible", readiness.checks.producerAvailable],
    ["Configuración válida", readiness.checks.configurationValid],
    ["Responsable seleccionado", readiness.checks.recipientCount > 0],
    ["Consentimiento vigente", readiness.checks.recipientCount > 0 && readiness.checks.recipientsReady],
    ["Canal WhatsApp", readiness.checks.channelReady],
    ["Template", readiness.checks.templateReady],
    ["Formato de mensaje", readiness.checks.formatterRegistered]
  ] as const;
  return (
    <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <ul className="grid gap-2 sm:grid-cols-2" aria-label="Controles de activación">
        {checks.map(([label, ready]) => <li key={label} className="flex items-center gap-2 text-sm text-white">{ready ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" aria-label="Listo" /> : <XCircle className="h-4 w-4 shrink-0 text-red-300" aria-label="Pendiente" />}{label}</li>)}
      </ul>
      {readiness.blockers.length ? (
        <ul className="space-y-2 rounded-2xl border border-red-500/20 bg-red-500/8 p-3" aria-label="Pendientes para activar">
          {readiness.blockers.map((blocker, index) => <li key={`${blocker.code}-${index}`} className="flex gap-2 text-sm text-red-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{readinessBlockerLabel(blocker)}</span></li>)}
        </ul>
      ) : <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-3 text-sm text-emerald-100">Todos los controles están listos. La activación sigue siendo manual.</div>}
    </div>
  );
}

function RuleFormDialog({ open, rule, eventTypes, recipients, channels, timezone, busy, onOpenChange, onSave }: {
  open: boolean;
  rule: OperationalAlertRule | null;
  eventTypes: OperationalAlertEventType[];
  recipients: OperationalAlertRecipient[];
  channels: OperationalAlertsInitialData["channels"];
  timezone: string | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: Record<string, unknown>, recipientIds: string[], rule: OperationalAlertRule | null) => Promise<void>;
}) {
  const key = `${rule?.id || "new"}-${open}`;
  return <RuleFormDialogBody key={key} {...{ open, rule, eventTypes, recipients, channels, timezone, busy, onOpenChange, onSave }} />;
}

function RuleFormDialogBody({ open, rule, eventTypes, recipients, channels, timezone, busy, onOpenChange, onSave }: Parameters<typeof RuleFormDialog>[0]) {
  const inventoryDefinition = eventTypes.find((item) => item.eventType === "inventory.lot_expiring" && item.eventVersion === 1);
  const cashDefinition = eventTypes.find((item) => item.eventType === "cash.session_closed" && item.eventVersion === 1);
  const initialDays = Number(rule?.conditions.daysBefore || 7);
  const [eventType, setEventType] = useState(rule?.eventType || "inventory.lot_expiring");
  const [name, setName] = useState(rule?.name || "Aviso de próximos vencimientos");
  const [daysPreset, setDaysPreset] = useState([3, 7, 15, 30].includes(initialDays) ? String(initialDays) : "custom");
  const [customDays, setCustomDays] = useState(String(initialDays));
  const [repeatPolicy, setRepeatPolicy] = useState(String(rule?.conditions.repeatPolicy || "once_per_threshold"));
  const [quantityBasis, setQuantityBasis] = useState(String(rule?.conditions.quantityBasis || "physical"));
  const [minimumQuantity, setMinimumQuantity] = useState(String(rule?.conditions.minimumAvailableQuantity ?? 1));
  const [sendAt, setSendAt] = useState(String(rule?.schedule.sendAt || "09:00"));
  const [recipientIds, setRecipientIds] = useState<string[]>(rule?.recipientIds || []);
  const [channelId, setChannelId] = useState(rule?.channelId || channels.find((item) => item.active)?.id || "");
  const [localError, setLocalError] = useState<string | null>(null);

  function toggleRecipient(id: string) {
    setRecipientIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const daysBefore = Number(daysPreset === "custom" ? customDays : daysPreset);
    const minimumAvailableQuantity = Number(minimumQuantity);
    if (eventType !== "inventory.lot_expiring" || !inventoryDefinition?.producer.active || !name.trim() || !Number.isInteger(daysBefore) || daysBefore < 1 || daysBefore > 365 || !Number.isFinite(minimumAvailableQuantity) || minimumAvailableQuantity < 0 || !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(sendAt)) {
      setLocalError("Revisá el tipo, nombre, anticipación, cantidad mínima y horario.");
      return;
    }
    const template = inventoryDefinition.templateContract;
    if (!template) {
      setLocalError("El catálogo no informó el contrato de template requerido.");
      return;
    }
    const payload = {
      name: name.trim(),
      eventType: inventoryDefinition.eventType,
      eventVersion: inventoryDefinition.eventVersion,
      triggerMode: "scheduled",
      conditions: { daysBefore, minimumAvailableQuantity, quantityBasis, repeatPolicy },
      schedule: { frequency: "daily", sendAt, timezone: "tenant" },
      deliveryPolicy: {},
      channelId: channelId || null,
      templateKey: template.templateKey,
      templateLanguage: template.language,
      formatterKey: inventoryDefinition.formatterKey,
      formatterVersion: inventoryDefinition.formatterVersion
    };
    try {
      await onSave(payload, recipientIds, rule);
    } catch {
      setLocalError("La regla no quedó lista. Revisá el aviso, actualizá los datos e intentá nuevamente.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{rule ? "Editar regla" : "Nueva regla"}</DialogTitle>
          <DialogDescription>La regla se guarda deshabilitada. Readiness determina si luego puede activarse.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-5 space-y-5">
          <fieldset>
            <legend className="text-sm font-medium text-white">Tipo de alerta</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <button type="button" aria-pressed={eventType === "inventory.lot_expiring"} onClick={() => setEventType("inventory.lot_expiring")} disabled={!inventoryDefinition?.producer.active || Boolean(rule)} className={`min-h-24 rounded-2xl border p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${eventType === "inventory.lot_expiring" ? "border-brand/50 bg-brand/10" : "border-white/10 bg-black/15"}`}>
                <span className="flex items-center justify-between gap-2"><span className="font-medium text-white">Próximos vencimientos de inventario</span><Badge variant={inventoryDefinition?.producer.active ? "success" : "danger"}>{inventoryDefinition?.producer.active ? "Disponible" : "No disponible"}</Badge></span>
                <span className="mt-2 block text-xs leading-5 text-muted">Resumen programado de lotes próximos a vencer.</span>
              </button>
              <button type="button" disabled aria-disabled="true" className="min-h-24 cursor-not-allowed rounded-2xl border border-white/8 bg-black/10 p-4 text-left opacity-65">
                <span className="flex items-center justify-between gap-2"><span className="font-medium text-white">Cierre de caja</span><Badge variant="muted">Próximamente</Badge></span>
                <span className="mt-2 block text-xs leading-5 text-muted">{cashDefinition ? "Configurable en backend, pero su productor todavía no está activo." : "No disponible todavía."}</span>
              </button>
            </div>
          </fieldset>
          <Field label="Nombre de la regla" htmlFor="rule-name"><Input id="rule-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={200} required /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Anticipación" htmlFor="rule-days">
              <select id="rule-days" className={SELECT_CLASS} value={daysPreset} onChange={(event) => setDaysPreset(event.target.value)}>
                <option value="3">3 días</option><option value="7">7 días</option><option value="15">15 días</option><option value="30">30 días</option><option value="custom">Personalizado</option>
              </select>
            </Field>
            {daysPreset === "custom" ? <Field label="Días personalizados" htmlFor="rule-custom-days"><Input id="rule-custom-days" type="number" min={1} max={365} value={customDays} onChange={(event) => setCustomDays(event.target.value)} /></Field> : <div className="hidden sm:block" />}
            <Field label="Frecuencia" htmlFor="rule-repeat"><select id="rule-repeat" className={SELECT_CLASS} value={repeatPolicy} onChange={(event) => setRepeatPolicy(event.target.value)}><option value="once_per_threshold">Una vez cuando llegue al umbral</option><option value="daily">Todos los días mientras esté dentro del período</option></select></Field>
            <Field label="Cantidad" htmlFor="rule-quantity-basis"><select id="rule-quantity-basis" className={SELECT_CLASS} value={quantityBasis} onChange={(event) => setQuantityBasis(event.target.value)}><option value="physical">Stock físico</option><option value="commercial">Stock disponible para vender</option></select></Field>
            <Field label="Cantidad mínima" htmlFor="rule-minimum"><Input id="rule-minimum" type="number" min={0} step="any" value={minimumQuantity} onChange={(event) => setMinimumQuantity(event.target.value)} /></Field>
            <Field label="Horario" htmlFor="rule-send-at" hint={timezone ? `Zona horaria: ${timezone}` : "Usa la zona horaria configurada para la cuenta."}><Input id="rule-send-at" type="time" value={sendAt} onChange={(event) => setSendAt(event.target.value)} aria-describedby="rule-send-at-hint" /></Field>
          </div>
          <fieldset>
            <legend className="text-sm font-medium text-white">Destinatarios</legend>
            <p className="mt-1 text-xs text-muted">Podés guardar la regla sin responsables, pero readiness bloqueará su activación.</p>
            <div className="mt-2 grid max-h-48 gap-2 overflow-y-auto rounded-2xl border border-white/8 bg-black/12 p-2 sm:grid-cols-2">
              {recipients.length ? recipients.map((recipient) => (
                <label key={recipient.id} className="flex min-h-12 items-center gap-3 rounded-xl border border-white/8 bg-card/60 p-3 text-sm text-white">
                  <input type="checkbox" className={CHECKBOX_CLASS} checked={recipientIds.includes(recipient.id)} onChange={() => toggleRecipient(recipient.id)} />
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{recipient.name}</span><span className="block text-xs text-muted">{recipient.active ? "Activo" : "Inactivo"} · {consentLabel(recipient.consent.status)}</span></span>
                </label>
              )) : <p className="p-3 text-sm text-muted">Primero creá un responsable.</p>}
            </div>
          </fieldset>
          <Field label="Canal WhatsApp" htmlFor="rule-channel">
            <select id="rule-channel" className={SELECT_CLASS} value={channelId} onChange={(event) => setChannelId(event.target.value)}>
              <option value="">Sin canal seleccionado</option>
              {channels.map((channel) => <option key={channel.id} value={channel.id} disabled={!channel.active}>{channel.label}{channel.active ? "" : " (inactivo)"}</option>)}
            </select>
          </Field>
          <div className="rounded-2xl border border-white/8 bg-black/15 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium text-white">Template requerido</span><Badge variant="muted">Se valida al guardar</Badge></div>
            <p className="mt-2 text-muted">Vencimientos de inventario · Español (Argentina) · Categoría Utility. El nombre técnico no es editable.</p>
          </div>
          {localError ? <p className="text-sm text-red-200" role="alert">{localError}</p> : null}
          <DialogFooter className="flex-col-reverse sm:flex-row">
            <DialogClose asChild><Button type="button" variant="secondary" disabled={busy}>Cancelar</Button></DialogClose>
            <Button type="submit" disabled={busy || eventType !== "inventory.lot_expiring"}>{busy ? "Guardando..." : "Guardar regla deshabilitada"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type HistoryFilters = { eventType: string; ruleId: string; status: string; dateFrom: string; dateTo: string };

function HistoryPanel({ items, rules, busy, pagination, onFilter, onOpen }: {
  items: OperationalAlertHistoryItem[];
  rules: OperationalAlertRule[];
  busy: boolean;
  pagination: OperationalAlertsInitialData["historyPagination"];
  onFilter: (filters: HistoryFilters, page?: number) => void;
  onOpen: (instanceId: string) => void;
}) {
  const [filters, setFilters] = useState<HistoryFilters>({ eventType: "", ruleId: "", status: "", dateFrom: "", dateTo: "" });
  return (
    <div>
      <PanelHeader icon={<History className="h-5 w-5" />} title="Historial" description={`${pagination.total} ejecución${pagination.total === 1 ? "" : "es"} registrada${pagination.total === 1 ? "" : "s"}.`} action={<Button variant="secondary" onClick={() => onFilter(filters, 1)} disabled={busy}><RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} />Aplicar filtros</Button>} />
      <div className="mb-4 grid gap-3 rounded-2xl border border-white/8 bg-card/80 p-3 sm:grid-cols-2 xl:grid-cols-5">
        <select aria-label="Filtrar por tipo" className={SELECT_CLASS} value={filters.eventType} onChange={(event) => setFilters((current) => ({ ...current, eventType: event.target.value }))}><option value="">Todos los tipos</option><option value="inventory.lot_expiring">Vencimientos</option><option value="cash.session_closed">Cierre de caja</option></select>
        <select aria-label="Filtrar por regla" className={SELECT_CLASS} value={filters.ruleId} onChange={(event) => setFilters((current) => ({ ...current, ruleId: event.target.value }))}><option value="">Todas las reglas</option>{rules.map((rule) => <option key={rule.id} value={rule.id}>{rule.name}</option>)}</select>
        <select aria-label="Filtrar por estado" className={SELECT_CLASS} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">Todos los estados</option><option value="pending">Pendiente</option><option value="completed">Completada</option><option value="completed_with_errors">Con errores</option><option value="failed">Fallida</option><option value="skipped">Omitida</option></select>
        <Input aria-label="Fecha desde" type="date" value={filters.dateFrom.slice(0, 10)} onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value ? `${event.target.value}T00:00:00.000Z` : "" }))} />
        <Input aria-label="Fecha hasta" type="date" value={filters.dateTo.slice(0, 10)} onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value ? `${event.target.value}T23:59:59.999Z` : "" }))} />
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<History className="h-7 w-7" />} title="Aún no se enviaron alertas" description="Cuando una regla activa genere una instancia, aparecerá acá con su estado de entrega." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <button key={item.instanceId} type="button" onClick={() => onOpen(item.instanceId)} className="group w-full rounded-2xl border border-white/8 bg-card/90 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-semibold text-white">{item.rule.name || "Regla sin nombre"}</p><p className="mt-1 text-sm text-muted">{operationalAlertEventLabel(item.eventType)} · {formatDate(item.occurredAt)}</p></div>
                <div className="flex items-center gap-2"><Badge variant={item.status === "completed" ? "success" : item.status.includes("failed") ? "danger" : "warning"}>{operationalAlertStatusLabel(item.status)}</Badge><ChevronRight className="h-4 w-4 text-muted group-hover:text-white" /></div>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center sm:max-w-md">
                <HistoryMetric label="Destinatarios" value={item.deliverySummary.total} />
                <HistoryMetric label="Entregadas" value={item.deliverySummary.delivered} />
                <HistoryMetric label="Leídas" value={item.deliverySummary.read} />
                <HistoryMetric label="Fallidas" value={item.deliverySummary.failed} />
              </div>
            </button>
          ))}
          {pagination.total > pagination.pageSize ? (
            <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-card/70 p-3">
              <Button variant="secondary" size="sm" disabled={busy || pagination.page <= 1} onClick={() => onFilter(filters, pagination.page - 1)}>Anterior</Button>
              <span className="text-xs text-muted">Página {pagination.page} de {Math.ceil(pagination.total / pagination.pageSize)}</span>
              <Button variant="secondary" size="sm" disabled={busy || pagination.page * pagination.pageSize >= pagination.total} onClick={() => onFilter(filters, pagination.page + 1)}>Siguiente</Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function HistoryMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-white/8 bg-black/15 px-2 py-2"><p className="text-base font-semibold text-white">{value}</p><p className="truncate text-[10px] text-muted">{label}</p></div>;
}

function PreviewDialog({ preview, onOpenChange }: { preview: OperationalAlertPreview | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={Boolean(preview)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Vista previa</DialogTitle><DialogDescription>Vista previa — no se enviará ningún mensaje. Esta acción no llama a WhatsApp ni a Graph.</DialogDescription></DialogHeader>
        {preview ? <div className="mt-5 space-y-4">
          <div className="flex flex-wrap gap-2"><Badge variant={preview.matched ? "success" : "warning"}>{preview.matched ? "La muestra coincide" : "La muestra no coincide"}</Badge><Badge variant="outline">{preview.template.key ? "Template identificado" : "Sin template"}</Badge></div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4"><p className="text-xs uppercase tracking-wider text-muted">Mensaje resultante</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white">{preview.renderedPreview?.auditText || "No hay mensaje para mostrar con esta configuración."}</p></div>
          <div><p className="text-sm font-medium text-white">Responsables seleccionados</p><div className="mt-2 flex flex-wrap gap-2">{preview.selectedRecipients.length ? preview.selectedRecipients.map((recipient) => <Badge key={recipient.id} variant={recipient.active && recipient.consentStatus === "granted" ? "success" : "warning"}>{recipient.name || "Responsable"} · {recipient.phoneMasked || "teléfono protegido"}</Badge>) : <span className="text-sm text-muted">No hay responsables seleccionados.</span>}</div></div>
          {preview.blockers.length ? <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 p-3"><p className="text-sm font-medium text-amber-100">Pendientes reales de readiness</p><ul className="mt-2 space-y-1 text-sm text-amber-100/80">{preview.blockers.map((blocker, index) => <li key={`${blocker.code}-${index}`}>• {readinessBlockerLabel(blocker)}</li>)}</ul></div> : null}
          {preview.warnings.length ? <div className="rounded-2xl border border-sky-500/20 bg-sky-500/8 p-3"><p className="text-sm font-medium text-sky-100">Advertencias</p><p className="mt-1 text-sm text-sky-100/75">La vista previa informó {preview.warnings.length} advertencia{preview.warnings.length === 1 ? "" : "s"}. Revisá readiness antes de activar.</p></div> : null}
          <DialogFooter><DialogClose asChild><Button variant="secondary">Cerrar vista previa</Button></DialogClose></DialogFooter>
        </div> : null}
      </DialogContent>
    </Dialog>
  );
}

function HistoryDetailDialog({ detail, onOpenChange }: { detail: OperationalAlertHistoryDetail | null; onOpenChange: (open: boolean) => void }) {
  const material = detail?.snapshot?.event && typeof detail.snapshot.event === "object"
    ? (detail.snapshot.event as Record<string, unknown>).material
    : null;
  const safeMaterial = material && typeof material === "object" ? material as Record<string, unknown> : null;
  const items = Array.isArray(safeMaterial?.items) ? safeMaterial.items.slice(0, 20) as Array<Record<string, unknown>> : [];
  return (
    <Dialog open={Boolean(detail)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>Detalle de alerta</DialogTitle><DialogDescription>Información operativa sanitizada. No se muestran credenciales, respuestas raw de Graph ni teléfonos completos.</DialogDescription></DialogHeader>
        {detail ? <div className="mt-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><RuleMetric label="Regla" value={detail.rule.name || "Sin nombre"} /><RuleMetric label="Evento" value={operationalAlertEventLabel(detail.event.eventType)} /><RuleMetric label="Fecha" value={formatDate(detail.event.occurredAt)} /><RuleMetric label="Estado" value={operationalAlertStatusLabel(detail.status)} /></div>
          <section><h3 className="text-sm font-semibold text-white">Resumen del evento</h3>{safeMaterial ? <div className="mt-2 rounded-2xl border border-white/8 bg-black/15 p-3 text-sm text-muted"><p>{Number(safeMaterial.totalLots || 0)} lote(s) · {Number(safeMaterial.totalProducts || 0)} producto(s) · Evaluación {String(safeMaterial.localDate || "sin fecha")}</p>{items.length ? <ul className="mt-3 space-y-2">{items.map((item, index) => <li key={`${String(item.lotId || "lot")}-${index}`} className="rounded-xl border border-white/8 bg-card/60 p-3"><span className="font-medium text-white">{String(item.productName || "Producto")}</span><span className="ml-2">Lote {String(item.lotCode || "sin código")} · vence {String(item.expiresAt || "sin fecha")} · cantidad {String(item.relevantQuantity ?? "-")}</span></li>)}</ul> : null}</div> : <p className="mt-2 text-sm text-muted">El snapshot no contiene un resumen visual compatible.</p>}</section>
          <section><h3 className="text-sm font-semibold text-white">Entregas</h3><div className="mt-2 space-y-2">{detail.deliveries.length ? detail.deliveries.map((delivery) => <div key={delivery.id} className="rounded-2xl border border-white/8 bg-black/15 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-medium text-white">{delivery.recipient.name || "Responsable"}</p><p className="mt-1 text-xs text-muted">{delivery.recipient.phoneMasked || "Teléfono protegido"}</p></div><Badge variant={delivery.status === "read" || delivery.status === "delivered" ? "success" : delivery.hasError ? "danger" : "warning"}>{operationalAlertStatusLabel(delivery.status)}</Badge></div><dl className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-4"><div><dt>Enviado</dt><dd className="mt-1 text-white">{formatDate(delivery.sentAt)}</dd></div><div><dt>Entregado</dt><dd className="mt-1 text-white">{formatDate(delivery.deliveredAt)}</dd></div><div><dt>Leído</dt><dd className="mt-1 text-white">{formatDate(delivery.readAt)}</dd></div><div><dt>Resultado</dt><dd className="mt-1 text-white">{delivery.hasError ? "Requiere revisión" : delivery.resultCode ? "Confirmado por el proveedor" : "Sin novedad"}</dd></div></dl></div>) : <p className="text-sm text-muted">No hay entregas asociadas.</p>}</div></section>
          <DialogFooter><DialogClose asChild><Button variant="secondary">Cerrar detalle</Button></DialogClose></DialogFooter>
        </div> : null}
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <Card className="border-dashed border-white/12 bg-card/60"><CardContent className="flex min-h-64 flex-col items-center justify-center p-6 text-center"><span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/20 bg-brand/10 text-brandBright">{icon}</span><h3 className="mt-4 text-lg font-semibold text-white">{title}</h3><p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>{action ? <div className="mt-5">{action}</div> : null}</CardContent></Card>;
}
