import { ClientPageShell } from "@/components/app/client-page-shell";
import { TransferConfigForm } from "@/components/app/TransferConfigForm";
import { getPortalBotTransferConfig, getPortalTenantContext, isBackendConfigured, type PortalBotTransferConfig } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";

const EMPTY_TRANSFER_CONFIG: PortalBotTransferConfig = {
  enabled: false,
  alias: "",
  cbu: "",
  titular: "",
  bank: "",
  instructions: ""
};

export default async function AppTransferSettingsPage() {
  const ctx = await requireAppPage({ permission: "manage_workspace" });
  const tenantId = ctx.tenantId || "";

  let initialConfig = EMPTY_TRANSFER_CONFIG;
  let clinicName = "Espacio del cliente";

  if (tenantId && isBackendConfigured()) {
    try {
      const [settingsResult, tenantContext] = await Promise.all([
        getPortalBotTransferConfig(tenantId).catch(() => null),
        getPortalTenantContext(tenantId).catch(() => null)
      ]);
      initialConfig = settingsResult?.data.settings?.transferConfig || EMPTY_TRANSFER_CONFIG;
      clinicName = tenantContext?.data?.clinic?.name || settingsResult?.data.settings?.clinicName || clinicName;
    } catch {
      initialConfig = EMPTY_TRANSFER_CONFIG;
    }
  }

  return (
    <ClientPageShell
      title="Cobro por transferencia"
      description="Configurá cómo el bot comparte los datos bancarios y guía el envío del comprobante en conversaciones reales."
      badge="Cobros"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_320px]">
        <TransferConfigForm initialConfig={initialConfig} tenantName={clinicName} />

        <div className="space-y-4">
          <div className="rounded-[24px] border border-[color:var(--border)] bg-card p-5 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Qué impacta</p>
            <p className="mt-3 text-xl font-semibold">Runtime real del cobro conversacional</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Lo que guardes acá se usa directo cuando el cliente pide alias, CBU o avisa que ya transfirió.
            </p>
          </div>

          <div className="rounded-[24px] border border-[color:var(--border)] bg-card p-5 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Buenas prácticas mínimas</p>
            <div className="mt-4 space-y-3">
              {[
                "Si activás transferencia, cargá al menos alias o CBU para evitar respuestas vacías.",
                "El mensaje opcional te permite adaptar el tono sin reescribir el flujo de comprobantes.",
                "La validación manual, bandeja y métricas siguen funcionando sobre la misma estructura actual."
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4 text-sm leading-6 text-muted">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ClientPageShell>
  );
}
