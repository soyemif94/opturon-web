"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, PauseCircle, PlayCircle, Save, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { AdminBillingSubscription, AdminTenantPolicyRow, TenantPolicy } from "@/lib/admin-client-policy";

const PLAN_CODES = ["basic", "growth", "pro", "enterprise"];
const BILLING_PLAN_OPTIONS = [
  { value: "inicial", label: "Plan Inicial" },
  { value: "crecimiento", label: "Plan Crecimiento" },
  { value: "empresa", label: "Plan Empresa" }
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
];
const MODULES = ["inbox", "agenda", "catalog", "automations", "sales", "loyalty", "payments"];

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

export function AdminClientConfiguration({ initialTenants }: { initialTenants: AdminTenantPolicyRow[] }) {
  const [tenants, setTenants] = useState(
    initialTenants.map((tenant) => ({ ...tenant, policy: normalizePolicy(tenant.policy) }))
  );
  const [selectedTenantId, setSelectedTenantId] = useState(tenants[0]?.tenantId || "");
  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.tenantId === selectedTenantId) || tenants[0] || null,
    [selectedTenantId, tenants]
  );
  const [draft, setDraft] = useState<TenantPolicy | null>(selectedTenant ? clonePolicy(selectedTenant.policy) : null);
  const [saving, setSaving] = useState(false);
  const [subscriptions, setSubscriptions] = useState<AdminBillingSubscription[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [creatingSubscription, setCreatingSubscription] = useState(false);
  const [actingSubscriptionId, setActingSubscriptionId] = useState<string | null>(null);
  const [billingDraft, setBillingDraft] = useState({
    planCode: "inicial",
    payerEmail: selectedTenant?.primaryEmail || "",
    amount: "0",
    currency: "ARS"
  });

  const currentSubscription = subscriptions[0] || null;

  useEffect(() => {
    if (!selectedTenant) return;
    setDraft(clonePolicy(normalizePolicy(selectedTenant.policy)));
    setBillingDraft((current) => ({
      ...current,
      payerEmail: current.payerEmail || selectedTenant.primaryEmail || ""
    }));
  }, [selectedTenant]);

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
        body: JSON.stringify(draft)
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || "policy_save_failed");
      const savedPolicy = normalizePolicy(json.policy);
      setTenants((current) =>
        current.map((tenant) => (tenant.tenantId === selectedTenant.tenantId ? { ...tenant, policy: savedPolicy } : tenant))
      );
      setDraft(clonePolicy(savedPolicy));
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
      if (!response.ok) throw new Error(json?.error || "billing_subscription_create_failed");
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

  if (!selectedTenant || !draft) {
    return (
      <div className="rounded-2xl border border-[color:var(--border)] bg-card/90 p-6 text-sm text-muted">
        No hay clientes con tenantId real para configurar.
      </div>
    );
  }

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
                    <p className="truncate font-medium">{tenant.name}</p>
                    <p className="mt-1 truncate font-mono text-xs text-muted">{tenant.tenantId}</p>
                  </div>
                  <Badge variant={tenant.policy.source === "settings.portal.policy" ? "success" : "warning"}>
                    {tenant.policy.planCode}
                  </Badge>
                </div>
                <p className="mt-3 text-xs text-muted">
                  {tenant.policy.capabilities.length} capabilities / {Object.values(tenant.policy.enabledModules).filter(Boolean).length} modulos
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
              <h2 className="text-xl font-semibold">{selectedTenant.name}</h2>
              <p className="mt-1 font-mono text-xs text-muted">{selectedTenant.tenantId}</p>
            </div>
            <Button onClick={savePolicy} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Guardando" : "Guardar policy"}
            </Button>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.4fr_minmax(320px,0.9fr)]">
          <div className="space-y-5">
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
                    {PLAN_CODES.map((plan) => (
                      <option key={plan} value={plan}>{plan}</option>
                    ))}
                  </select>
                </label>

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
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {MODULES.map((moduleName) => {
                    const checked = draft.enabledModules[moduleName] !== false;
                    return (
                      <label key={moduleName} className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-surface/60 px-3 py-2 text-sm">
                        <span>{moduleName}</span>
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
              <h3 className="font-semibold">Capabilities</h3>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {CAPABILITIES.map((capability) => {
                  const checked = draft.capabilities.includes(capability);
                  return (
                    <label key={capability} className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-surface/60 px-3 py-2 text-sm">
                      <span className={`inline-flex h-5 w-5 items-center justify-center rounded border ${checked ? "border-brand bg-brand text-white" : "border-[color:var(--border)]"}`}>
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
                      <span>{capability}</span>
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
                      onClick={() => currentSubscription.authorizationUrl && window.open(currentSubscription.authorizationUrl, "_blank")}
                      disabled={!currentSubscription.authorizationUrl}
                      className="justify-start gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir checkout de suscripcion
                    </Button>
                  </div>

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
                    onChange={(event) => setBillingDraft((current) => ({ ...current, planCode: event.target.value }))}
                    className="mt-2 h-10 w-full rounded-xl border border-[color:var(--border)] bg-surface px-3 text-sm text-text"
                  >
                    {BILLING_PLAN_OPTIONS.map((plan) => (
                      <option key={plan.value} value={plan.value}>{plan.label}</option>
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
                      min="0"
                      step="0.01"
                      value={billingDraft.amount}
                      onChange={(event) => setBillingDraft((current) => ({ ...current, amount: event.target.value }))}
                      className="mt-2 h-10 w-full rounded-xl border border-[color:var(--border)] bg-surface px-3 text-sm text-text"
                    />
                  </label>
                  <label className="text-sm text-muted">
                    Moneda
                    <input
                      type="text"
                      value={billingDraft.currency}
                      onChange={(event) => setBillingDraft((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
                      className="mt-2 h-10 w-full rounded-xl border border-[color:var(--border)] bg-surface px-3 text-sm text-text"
                    />
                  </label>
                </div>

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
