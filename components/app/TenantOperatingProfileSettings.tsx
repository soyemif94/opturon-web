"use client";

import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { IMPLEMENTED_APP_MODULES, type TenantPortalPolicy } from "@/lib/tenant-policy";

const CAPABILITY_LABELS: Record<string, string> = {
  inbox: "Inbox",
  contacts: "Contactos",
  catalog: "Catalogo",
  orders: "Pedidos",
  receipts: "Comprobantes",
  payments: "Cobros",
  cash_management: "Caja",
  sales_pipeline: "Ventas",
  appointments: "Agenda",
  loyalty: "Fidelizacion",
  automations: "Automatizaciones",
  metrics: "Metricas",
  inventory: "Inventario",
  inventory_lots: "Lotes",
  expiration_tracking: "Vencimientos",
  suppliers: "Proveedores",
  purchasing: "Compras",
  customer_credit: "Cuenta corriente cliente",
  collections: "Cobranza",
  field_sales: "Venta en campo",
  mobile_inventory: "Stock movil",
  whatsapp_documents: "Documentos por WhatsApp"
};

const FUTURE_CAPABILITIES = new Set([
  "inventory_lots",
  "expiration_tracking",
  "suppliers",
  "purchasing",
  "customer_credit",
  "collections",
  "field_sales",
  "mobile_inventory",
  "whatsapp_documents"
]);

const MODULE_LABELS: Record<string, string> = {
  inbox: "Inbox",
  contacts: "Contactos",
  catalog: "Catalogo",
  inventory: "Inventario",
  orders: "Pedidos",
  invoices: "Comprobantes",
  payments: "Cobros",
  cash: "Caja",
  sales: "Ventas",
  agenda: "Agenda",
  loyalty: "Fidelizacion",
  automations: "Automatizaciones",
  metrics: "Metricas"
};

function clonePolicy(policy: TenantPortalPolicy): TenantPortalPolicy {
  return {
    ...policy,
    operatingProfile: policy.operatingProfile ? { ...policy.operatingProfile } : undefined,
    limits: { ...policy.limits },
    capabilities: [...(policy.capabilities || [])],
    enabledModules: { ...(policy.enabledModules || {}) }
  };
}

export function TenantOperatingProfileSettings({ initialPolicy }: { initialPolicy: TenantPortalPolicy }) {
  const [draft, setDraft] = useState<TenantPortalPolicy>(clonePolicy(initialPolicy));
  const [saving, setSaving] = useState(false);

  const capabilityList = useMemo(() => {
    const merged = Array.from(new Set([...(draft.recommendedCapabilities || []), ...(draft.capabilities || [])]));
    return merged.sort((a, b) => (CAPABILITY_LABELS[a] || a).localeCompare(CAPABILITY_LABELS[b] || b));
  }, [draft.capabilities, draft.recommendedCapabilities]);

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/app/settings/operating-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatingProfile: {
            businessSubtype: draft.operatingProfile?.businessSubtype || ""
          },
          enabledModules: draft.enabledModules
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || "tenant_policy_save_failed");
      }
      setDraft(clonePolicy(json.policy || draft));
      toast.success("Configuracion operativa guardada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la configuracion.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[color:var(--border)] bg-card/90 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Configuracion</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Modulos y operacion</h1>
            <p className="mt-2 text-sm text-muted">Desactivar un modulo oculta accesos y bloquea rutas, pero no elimina datos existentes.</p>
          </div>
          <Button onClick={save} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Guardando" : "Guardar"}
          </Button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-[color:var(--border)] bg-card/90 p-5">
          <h2 className="font-semibold">Perfil operativo</h2>
          <div className="mt-4 grid gap-3">
            <label className="text-sm text-muted">
              Perfil operativo
              <input
                type="text"
                readOnly
                value={draft.operatingProfile?.industryProfile || "custom"}
                className="mt-2 h-10 w-full rounded-xl border border-[color:var(--border)] bg-surface/60 px-3 text-sm text-text"
              />
            </label>

            <label className="text-sm text-muted">
              Modelo operativo
              <input
                type="text"
                readOnly
                value={draft.operatingProfile?.operatingModel || "hybrid"}
                className="mt-2 h-10 w-full rounded-xl border border-[color:var(--border)] bg-surface/60 px-3 text-sm text-text"
              />
            </label>

            <label className="text-sm text-muted">
              Subtipo comercial
              <input
                type="text"
                value={draft.operatingProfile?.businessSubtype || ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    operatingProfile: {
                      ...(current.operatingProfile || { industryProfile: "custom", presetKey: "custom", operatingModel: "hybrid" }),
                      businessSubtype: event.target.value
                    }
                  }))
                }
                placeholder="Ej: beverage_distribution"
                className="mt-2 h-10 w-full rounded-xl border border-[color:var(--border)] bg-surface px-3 text-sm text-text"
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-card/90 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">Modulos habilitados</h2>
            <Badge variant="muted">Editable por owner</Badge>
          </div>
          <p className="mt-2 text-sm text-muted">Solo puedes ocultar o volver a mostrar modulos ya concedidos al tenant. No cambia contrato ni limites.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {IMPLEMENTED_APP_MODULES.map((moduleKey) => (
              <label key={moduleKey} className="rounded-xl border border-[color:var(--border)] bg-surface/60 px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span>{MODULE_LABELS[moduleKey] || moduleKey}</span>
                  <input
                    type="checkbox"
                    checked={draft.enabledModules?.[moduleKey] !== false}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        enabledModules: {
                          ...(current.enabledModules || {}),
                          [moduleKey]: event.target.checked
                        }
                      }))
                    }
                  />
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-card/90 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">Capacidades</h2>
            <Badge variant="muted">Solo lectura</Badge>
          </div>
          <p className="mt-2 text-sm text-muted">Las capacidades concedidas las administra Opturon. Las futuras se pueden registrar sin crear menu ni rutas visibles.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {capabilityList.map((capability) => {
              return (
                <div key={capability} className="rounded-xl border border-[color:var(--border)] bg-surface/60 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span>{CAPABILITY_LABELS[capability] || capability}</span>
                    <Badge variant={draft.capabilities.includes(capability) ? "success" : "muted"}>
                      {draft.capabilities.includes(capability) ? "Concedida" : "Sugerida"}
                    </Badge>
                  </div>
                  {FUTURE_CAPABILITIES.has(capability) ? (
                    <p className="mt-1 text-xs text-muted">Proximamente. Se persiste, pero no habilita navegacion visible en esta fase.</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
