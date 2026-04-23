"use client";

import { useMemo, useState } from "react";
import { Check, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { AdminTenantPolicyRow, TenantPolicy } from "@/lib/admin-client-policy";

const PLAN_CODES = ["basic", "growth", "pro", "enterprise"];
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

function getTenantLabel(tenant: AdminTenantPolicyRow) {
  return tenant.displayName || tenant.name || tenant.primaryEmail || tenant.tenantId;
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

  function selectTenant(tenant: AdminTenantPolicyRow) {
    setSelectedTenantId(tenant.tenantId);
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

  if (!selectedTenant || !draft) {
    return (
      <div className="rounded-2xl border border-[color:var(--border)] bg-card/90 p-6 text-sm text-muted">
        No hay clientes con tenantId real para configurar.
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(280px,380px)_1fr]">
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
                    {tenant.policy.planCode}
                  </Badge>
                </div>
                <p className="mt-3 text-xs text-muted">
                  {tenant.policy.capabilities.length} capabilities · {Object.values(tenant.policy.enabledModules).filter(Boolean).length} módulos
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
                {selectedTenant.primaryEmail ? `${selectedTenant.primaryEmail} · ` : ""}
                <span className="font-mono">{selectedTenant.tenantId}</span>
              </p>
            </div>
            <Button onClick={savePolicy} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Guardando" : "Guardar"}
            </Button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-[color:var(--border)] bg-card/90 p-5">
            <h3 className="font-semibold">Plan y límites</h3>
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
            <h3 className="font-semibold">Módulos habilitados</h3>
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
      </section>
    </div>
  );
}
