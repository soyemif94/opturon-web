"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, PauseCircle, PlayCircle, Save, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { AdminBillingSubscription, AdminTenantPolicyRow, TenantPolicy } from "@/lib/admin-client-policy";

const PLAN_OPTIONS = [
  { value: "basic", label: "Inicial" },
  { value: "growth", label: "Crecimiento" },
  { value: "pro", label: "Empresa" }
] as const;

const BILLING_PLAN_OPTIONS = [
  { value: "inicial", label: "Plan Inicial", amount: 40600, currency: "ARS" },
  { value: "crecimiento", label: "Plan Crecimiento", amount: 68600, currency: "ARS" },
  { value: "empresa", label: "Plan Empresa", amount: 208600, currency: "ARS" }
] as const;

const LIMIT_KEYS = [
  { key: "maxPortalUsers", label: "Usuarios portal" },
  { key: "maxAutomations", label: "Automatizaciones" },
  { key: "maxContacts", label: "Contactos" }
] as const;

const CAPABILITIES = [
  "whatsapp",
  "contacts",
  "crm",
  "agenda",
  "catalog",
  "automations",
  "sales",
  "payments",
  "payments_transfer",
  "loyalty"
] as const;

const MODULES = ["inbox", "agenda", "catalog", "automations", "sales", "loyalty", "payments"] as const;

const PLAN_LABELS: Record<string, string> = {
  basic: "Inicial",
  growth: "Crecimiento",
  pro: "Empresa",
  enterprise: "Empresa (historico)"
};

const MODULE_LABELS: Record<(typeof MODULES)[number], string> = {
  inbox: "Inbox",
  agenda: "Agenda",
  catalog: "Catalogo",
  automations: "Automatizaciones",
  sales: "Ventas",
  loyalty: "Fidelizacion",
  payments: "Cobros"
};

const CAPABILITY_LABELS: Record<(typeof CAPABILITIES)[number], string> = {
  whatsapp: "WhatsApp",
  contacts: "Contactos",
  crm: "CRM",
  agenda: "Agenda",
  catalog: "Catalogo",
  automations: "Automatizaciones",
  sales: "Ventas",
  payments: "Cobros",
  payments_transfer: "Transferencias",
  loyalty: "Fidelizacion"
};

type BillingPlanCode = (typeof BILLING_PLAN_OPTIONS)[number]["value"];
type BillingDraftState = {
  planCode: BillingPlanCode;
  payerEmail: string;
  amount: string;
  currency: string;
};

function normalizePolicy(policy: TenantPolicy): TenantPolicy {
  return {
    planCode: policy.planCode || "basic",
    limits: {
      maxPortalUsers: Number(policy.limits?.maxPortalUsers ?? 5),
      maxAutomations: Number(policy.limits?.maxAutomations ?? 20),
      maxContacts: Number(policy.limits?.maxContacts ?? 1000)
    },
    capabilities: Array.isArray(policy.capabilities) ? policy.capabilities : [],
    enabledModules: MODULES.reduce<Record<string, boolean>>((acc, key) => {
      acc[key] = policy.enabledModules?.[key] !== false;
      return acc;
    }, {}),
    source: policy.source
  };
}

function clonePolicy(policy: TenantPolicy): TenantPolicy {
  return {
    ...policy,
    limits: { ...policy.limits },
    capabilities: [...policy.capabilities],
    enabledModules: { ...policy.enabledModules }
  };
}

function getTenantLabel(tenant: AdminTenantPolicyRow) {
  return tenant.displayName || tenant.name || tenant.primaryEmail || tenant.tenantId;
}

function getPlanLabel(planCode: string) {
  return PLAN_LABELS[planCode] || PLAN_LABELS.basic;
}

function getPlanOptions(currentPlanCode: string) {
  if (currentPlanCode === "enterprise") {
    return [...PLAN_OPTIONS, { value: "enterprise", label: "Empresa (historico)" }] as const;
  }
  return PLAN_OPTIONS;
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Sin fecha" : date.toLocaleString("es-AR");
}

function formatMoney(amount?: number | null, currency = "ARS") {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return "-";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(Number(amount));
}

function statusVariant(status?: string | null): "success" | "warning" | "danger" | "muted" {
  if (status === "active") return "success";
  if (status === "pending" || status === "paused") return "warning";
  if (status === "payment_failed" || status === "suspended" || status === "canceled") return "danger";
  return "muted";
}

function normalizeSubscriptions(payload: unknown): AdminBillingSubscription[] {
  if (!payload || typeof payload !== "object") return [];
  const list = (payload as { subscriptions?: unknown[] }).subscriptions;
  return Array.isArray(list) ? (list as AdminBillingSubscription[]) : [];
}

function getBillingPlanDefinition(planCode: string) {
  return BILLING_PLAN_OPTIONS.find((plan) => plan.value === planCode) || BILLING_PLAN_OPTIONS[0];
}

export function AdminClientConfiguration({ initialTenants }: { initialTenants: AdminTenantPolicyRow[] }) {
  const [tenants, setTenants] = useState(
    initialTenants.map((tenant) => ({ ...tenant, policy: normalizePolicy(tenant.policy) }))
  );
  const [selectedTenantId, setSelectedTenantId] = useState(tenants[0]?.tenantId || "");
  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.tenantId === selectedTenantId) || tenants[0] || null,
    [selectedTenantId, tenants]
  );
  const [identityDraft, setIdentityDraft] = useState(() => ({
    displayName: selectedTenant ? getTenantLabel(selectedTenant) : "",
    primaryEmail: selectedTenant?.primaryEmail || ""
  }));
  const [draft, setDraft] = useState<TenantPolicy | null>(selectedTenant ? clonePolicy(selectedTenant.policy) : null);
  const [saving, setSaving] = useState(false);
  const [subscriptions, setSubscriptions] = useState<AdminBillingSubscription[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [creatingSubscription, setCreatingSubscription] = useState(false);
  const [actingSubscriptionId, setActingSubscriptionId] = useState<string | null>(null);
  const [sendingBillingLinkEmail, setSendingBillingLinkEmail] = useState(false);
  const [billingDraft, setBillingDraft] = useState<BillingDraftState>({
    planCode: BILLING_PLAN_OPTIONS[0].value,
    payerEmail: selectedTenant?.primaryEmail || "",
    amount: String(BILLING_PLAN_OPTIONS[0].amount),
    currency: BILLING_PLAN_OPTIONS[0].currency
  });

  const currentSubscription = subscriptions[0] || null;

  useEffect(() => {
    if (!selectedTenant) return;
    setBillingDraft((current) => ({
      ...current,
      payerEmail: current.payerEmail || selectedTenant.primaryEmail || ""
    }));
  }, [selectedTenant]);

  useEffect(() => {
    const planDefinition = getBillingPlanDefinition(billingDraft.planCode);
    setBillingDraft((current) => {
      const nextAmount = String(planDefinition.amount);
      const nextCurrency = planDefinition.currency;
      if (current.amount === nextAmount && current.currency === nextCurrency) {
        return current;
      }
      return {
        ...current,
        amount: nextAmount,
        currency: nextCurrency
      };
    });
  }, [billingDraft.planCode]);

  useEffect(() => {
    let cancelled = false;

    async function loadSubscriptions() {
      if (!selectedTenant) {
        setSubscriptions([]);
        return;
      }

      setLoadingSubscriptions(true);
      try {
        const response = await fetch(
          `/api/app/admin/billing/subscriptions?tenantId=${encodeURIComponent(selectedTenant.tenantId)}`,
          { cache: "no-store" }
        );
        const json = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(json?.error || "billing_subscriptions_load_failed");
        }
        if (!cancelled) {
          setSubscriptions(normalizeSubscriptions(json));
        }
      } catch (error) {
        if (!cancelled) {
          setSubscriptions([]);
        }
        toast.error(error instanceof Error ? error.message : "No se pudieron cargar las suscripciones.");
      } finally {
        if (!cancelled) {
          setLoadingSubscriptions(false);
        }
      }
    }

    loadSubscriptions();
    return () => {
      cancelled = true;
    };
  }, [selectedTenant]);

  function selectTenant(tenant: AdminTenantPolicyRow) {
    setSelectedTenantId(tenant.tenantId);
    setIdentityDraft({
      displayName: getTenantLabel(tenant),
      primaryEmail: tenant.primaryEmail || ""
    });
    setDraft(clonePolicy(normalizePolicy(tenant.policy)));
  }

  function patchDraft(patch: Partial<TenantPolicy>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  async function savePolicy() {
    if (!selectedTenant || !draft) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/app/admin/clients/${encodeURIComponent(selectedTenant.tenantId)}/policy`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          displayName: identityDraft.displayName.trim(),
          primaryEmail: identityDraft.primaryEmail.trim()
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || "policy_save_failed");
      const savedPolicy = normalizePolicy(json.policy);
      setTenants((current) =>
        current.map((tenant) =>
          tenant.tenantId === selectedTenant.tenantId
            ? {
                ...tenant,
                name: json?.clinic?.name || tenant.name,
                displayName: identityDraft.displayName.trim() || tenant.displayName || tenant.name,
                primaryEmail: json?.clinic?.primaryEmail || json?.primaryEmail || identityDraft.primaryEmail.trim() || null,
                policy: savedPolicy
              }
            : tenant
        )
      );
      setDraft(clonePolicy(savedPolicy));
      setIdentityDraft((current) => ({
        displayName: current.displayName.trim(),
        primaryEmail: current.primaryEmail.trim()
      }));
      toast.success("Configuracion guardada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function createSubscription() {
    if (!selectedTenant) return;
    setCreatingSubscription(true);
    try {
      const payload = {
        tenantId: selectedTenant.tenantId,
        planCode: billingDraft.planCode,
        payerEmail: billingDraft.payerEmail,
        amount: Number(billingDraft.amount),
        currency: billingDraft.currency || "ARS"
      };
      const response = await fetch("/api/app/admin/billing/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.detail || json?.error || "billing_subscription_create_failed");
      }
      const subscription = json?.subscription as AdminBillingSubscription;
      setSubscriptions((current) => [subscription, ...current.filter((item) => item.id !== subscription.id)]);
      toast.success("Suscripcion creada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la suscripcion.");
    } finally {
      setCreatingSubscription(false);
    }
  }

  async function runSubscriptionAction(action: "pause" | "cancel" | "reactivate") {
    if (!currentSubscription) return;
    setActingSubscriptionId(currentSubscription.id);
    try {
      const response = await fetch(
        `/api/app/admin/billing/subscriptions/${encodeURIComponent(currentSubscription.id)}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        }
      );
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || `billing_subscription_${action}_failed`);
      const subscription = json?.subscription as AdminBillingSubscription;
      setSubscriptions((current) => [subscription, ...current.filter((item) => item.id !== subscription.id)]);
      toast.success("Suscripcion actualizada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la suscripcion.");
    } finally {
      setActingSubscriptionId(null);
    }
  }

  async function copyAuthorizationLink() {
    if (!currentSubscription?.authorizationUrl) return;
    try {
      await navigator.clipboard.writeText(currentSubscription.authorizationUrl);
      toast.success("Link copiado");
    } catch {
      toast.error("No se pudo copiar el link");
    }
  }

  async function sendAuthorizationLinkEmail() {
    if (!selectedTenant || !currentSubscription || sendingBillingLinkEmail) return;
    setSendingBillingLinkEmail(true);
    try {
      const response = await fetch(
        `/api/app/admin/clients/${encodeURIComponent(selectedTenant.tenantId)}/billing/subscription/send-link`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        }
      );
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.detail || json?.error || "billing_subscription_send_link_failed");
      }
      const subscription = json?.subscription as AdminBillingSubscription;
      if (subscription?.id) {
        setSubscriptions((current) => [subscription, ...current.filter((item) => item.id !== subscription.id)]);
      }
      toast.success("Link enviado al email del cliente");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar el link por email.");
    } finally {
      setSendingBillingLinkEmail(false);
    }
  }

  if (!selectedTenant || !draft) {
    return (
      <div className="rounded-2xl border border-[color:var(--border)] bg-card/90 p-6 text-sm text-muted">
        No hay clientes con tenantId real para configurar.
      </div>
    );
  }

  const canSendBillingLinkEmail =
    Boolean(selectedTenant?.tenantId) &&
    Boolean(currentSubscription?.authorizationUrl) &&
    currentSubscription?.localStatus === "pending" &&
    Boolean(currentSubscription?.mercadoPagoPayerEmail);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(280px,360px)_1fr]">
      <section className="rounded-2xl border border-[color:var(--border)] bg-card/90 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Clientes</h2>
            <p className="text-sm text-muted">{tenants.length} tenants reales</p>
          </div>
          <Badge variant="muted">Admin</Badge>
        </div>
        <div className="space-y-2">
          {tenants.map((tenant) => {
            const active = tenant.tenantId === selectedTenant.tenantId;
            return (
              <button
                key={tenant.tenantId}
                type="button"
                onClick={() => selectTenant(tenant)}
                className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                  active ? "border-brand/40 bg-brand/10" : "border-[color:var(--border)] bg-surface/55 hover:bg-surface"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{getTenantLabel(tenant)}</p>
                    <p className="mt-1 truncate text-xs text-muted">{tenant.primaryEmail || tenant.tenantId}</p>
                  </div>
                  <Badge variant={tenant.policy.source === "settings.portal.policy" ? "success" : "warning"}>
                    {getPlanLabel(tenant.policy.planCode)}
                  </Badge>
                </div>
                <p className="mt-3 text-xs text-muted">
                  {Object.values(tenant.policy.enabledModules).filter(Boolean).length} modulos activos -
                  {tenant.policy.limits.maxPortalUsers} usuarios portal
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-5">
        <div className="rounded-2xl border border-[color:var(--border)] bg-card/90 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{getTenantLabel(selectedTenant)}</h2>
              <p className="mt-1 text-xs text-muted">
                {selectedTenant.primaryEmail ? `${selectedTenant.primaryEmail} / ` : ""}
                <span className="font-mono">{selectedTenant.tenantId}</span>
              </p>
            </div>
            <Button onClick={savePolicy} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Guardando" : "Guardar policy"}
            </Button>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.4fr_minmax(320px,0.9fr)]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-[color:var(--border)] bg-card/90 p-5">
              <h3 className="font-semibold">Datos base del cliente</h3>
              <p className="mt-2 text-sm text-muted">
                Corrige el nombre visible y el email principal sin recrear el tenant. El tenant ID tecnico no cambia.
              </p>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <label className="block text-sm text-muted">
                  Nombre visible
                  <input
                    type="text"
                    value={identityDraft.displayName}
                    onChange={(event) => setIdentityDraft((current) => ({ ...current, displayName: event.target.value }))}
                    className="mt-2 h-10 w-full rounded-xl border border-[color:var(--border)] bg-surface px-3 text-sm text-text"
                  />
                </label>
                <label className="block text-sm text-muted">
                  Email principal
                  <input
                    type="email"
                    value={identityDraft.primaryEmail}
                    onChange={(event) => setIdentityDraft((current) => ({ ...current, primaryEmail: event.target.value }))}
                    className="mt-2 h-10 w-full rounded-xl border border-[color:var(--border)] bg-surface px-3 text-sm text-text"
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-[color:var(--border)] bg-card/90 p-5">
                <h3 className="font-semibold">Plan y limites</h3>
                <label className="mt-4 block text-sm text-muted">
                  Plan
                  <select
                    value={draft.planCode}
                    onChange={(event) => patchDraft({ planCode: event.target.value })}
                    className="mt-2 h-10 w-full rounded-xl border border-[color:var(--border)] bg-surface px-3 text-sm text-text"
                  >
                    {getPlanOptions(draft.planCode).map((plan) => (
                      <option key={plan.value} value={plan.value}>
                        {plan.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="mt-2 text-xs text-muted">
                  Se muestran nombres comerciales. El codigo tecnico historico del tenant se conserva por compatibilidad.
                </p>

                <div className="mt-4 grid gap-3">
                  {LIMIT_KEYS.map((item) => (
                    <label key={item.key} className="block text-sm text-muted">
                      {item.label}
                      <input
                        type="number"
                        min={0}
                        value={draft.limits[item.key]}
                        onChange={(event) =>
                          patchDraft({
                            limits: {
                              ...draft.limits,
                              [item.key]: Math.max(0, Number.parseInt(event.target.value || "0", 10) || 0)
                            }
                          })
                        }
                        className="mt-2 h-10 w-full rounded-xl border border-[color:var(--border)] bg-surface px-3 text-sm text-text"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[color:var(--border)] bg-card/90 p-5">
                <h3 className="font-semibold">Modulos habilitados</h3>
                <p className="mt-2 text-sm text-muted">
                  Definen que areas del portal quedan disponibles para el cliente en su operacion diaria.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {MODULES.map((moduleName) => {
                    const checked = draft.enabledModules[moduleName] !== false;
                    return (
                      <label
                        key={moduleName}
                        className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-surface/60 px-3 py-2 text-sm"
                      >
                        <span>{MODULE_LABELS[moduleName]}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            patchDraft({
                              enabledModules: { ...draft.enabledModules, [moduleName]: event.target.checked }
                            })
                          }
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[color:var(--border)] bg-card/90 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">Capacidades tecnicas</h3>
                <Badge variant="muted">Interno</Badge>
              </div>
              <p className="mt-2 text-sm text-muted">
                Estas capacidades alimentan compatibilidades del backend y automatizaciones. No reemplazan a los modulos
                visibles del portal.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {CAPABILITIES.map((capability) => {
                  const checked = draft.capabilities.includes(capability);
                  return (
                    <label
                      key={capability}
                      className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-surface/60 px-3 py-2 text-sm"
                    >
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded border ${
                          checked ? "border-brand bg-brand text-white" : "border-[color:var(--border)]"
                        }`}
                      >
                        {checked ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={(event) =>
                          patchDraft({
                            capabilities: event.target.checked
                              ? Array.from(new Set([...draft.capabilities, capability]))
                              : draft.capabilities.filter((item) => item !== capability)
                          })
                        }
                      />
                      <span>{CAPABILITY_LABELS[capability]}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-[color:var(--border)] bg-card/90 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Billing SaaS</h3>
                  <p className="mt-1 text-sm text-muted">Suscripcion Mercado Pago mensual para este tenant.</p>
                </div>
                {loadingSubscriptions ? <Loader2 className="h-4 w-4 animate-spin text-muted" /> : null}
              </div>

              {currentSubscription ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-[color:var(--border)] bg-surface/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{currentSubscription.planCode}</p>
                        <p className="mt-1 text-xs text-muted">
                          {formatMoney(currentSubscription.amount, currentSubscription.currency)} / {currentSubscription.billingInterval}
                        </p>
                      </div>
                      <Badge variant={statusVariant(currentSubscription.localStatus)}>{currentSubscription.localStatus}</Badge>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-muted">
                      <p>Mercado Pago: {currentSubscription.mercadoPagoStatus || "sin sincronizar"}</p>
                      <p>Pagador: {currentSubscription.mercadoPagoPayerEmail || "sin email"}</p>
                      <p>Proximo cobro: {formatDate(currentSubscription.nextBillingDate)}</p>
                      <p>Ultimo pago: {currentSubscription.lastPaymentStatus || "sin pagos"}</p>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={copyAuthorizationLink}
                      disabled={!currentSubscription.authorizationUrl}
                      className="justify-start gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copiar link de autorizacion
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={sendAuthorizationLinkEmail}
                      disabled={!canSendBillingLinkEmail || sendingBillingLinkEmail}
                      className="justify-start gap-2"
                    >
                      {sendingBillingLinkEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Enviar link por email
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => currentSubscription.authorizationUrl && window.open(currentSubscription.authorizationUrl, "_blank")}
                      disabled={!currentSubscription.authorizationUrl}
                      className="justify-start gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir checkout de suscripcion
                    </Button>
                  </div>

                  {currentSubscription.localStatus === "pending" && !currentSubscription.mercadoPagoPayerEmail ? (
                    <p className="text-xs text-amber-700">
                      Falta email del pagador en la suscripcion para poder enviar el link por correo.
                    </p>
                  ) : null}

                  <div className="grid gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => runSubscriptionAction("pause")}
                      disabled={actingSubscriptionId === currentSubscription.id}
                      className="justify-start gap-2"
                    >
                      <PauseCircle className="h-4 w-4" />
                      Pausar suscripcion
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => runSubscriptionAction("reactivate")}
                      disabled={actingSubscriptionId === currentSubscription.id}
                      className="justify-start gap-2"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Reactivar suscripcion
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => runSubscriptionAction("cancel")}
                      disabled={actingSubscriptionId === currentSubscription.id}
                      className="justify-start gap-2 text-red-600"
                    >
                      <XCircle className="h-4 w-4" />
                      Cancelar suscripcion
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/40 p-4 text-sm text-muted">
                  Este tenant todavia no tiene suscripcion SaaS creada.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[color:var(--border)] bg-card/90 p-5">
              <h3 className="font-semibold">Crear suscripcion</h3>
              <div className="mt-4 grid gap-3">
                <label className="text-sm text-muted">
                  Plan comercial
                  <select
                    value={billingDraft.planCode}
                    onChange={(event) =>
                      setBillingDraft((current) => ({
                        ...current,
                        planCode: event.target.value as BillingPlanCode
                      }))
                    }
                    className="mt-2 h-10 w-full rounded-xl border border-[color:var(--border)] bg-surface px-3 text-sm text-text"
                  >
                    {BILLING_PLAN_OPTIONS.map((plan) => (
                      <option key={plan.value} value={plan.value}>
                        {plan.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-muted">
                  Email del pagador
                  <input
                    type="email"
                    value={billingDraft.payerEmail}
                    onChange={(event) => setBillingDraft((current) => ({ ...current, payerEmail: event.target.value }))}
                    className="mt-2 h-10 w-full rounded-xl border border-[color:var(--border)] bg-surface px-3 text-sm text-text"
                    placeholder="cliente@negocio.com"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
                  <label className="text-sm text-muted">
                    Monto
                    <input
                      type="number"
                      readOnly
                      value={billingDraft.amount}
                      className="mt-2 h-10 w-full rounded-xl border border-[color:var(--border)] bg-surface px-3 text-sm text-text"
                    />
                  </label>
                  <label className="text-sm text-muted">
                    Moneda
                    <input
                      type="text"
                      readOnly
                      value={billingDraft.currency}
                      className="mt-2 h-10 w-full rounded-xl border border-[color:var(--border)] bg-surface px-3 text-sm text-text"
                    />
                  </label>
                </div>
                <p className="text-xs text-muted">El monto oficial del plan se completa automaticamente para esta fase.</p>

                <Button onClick={createSubscription} disabled={creatingSubscription} className="gap-2">
                  {creatingSubscription ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {creatingSubscription ? "Creando" : "Crear link de suscripcion"}
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
