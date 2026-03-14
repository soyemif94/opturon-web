import { AutomationsHub } from "@/components/app/automations-hub";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { getPortalAutomations, isBackendConfigured, type PortalAutomation } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";

export default async function AppAutomationsPage() {
  const ctx = await requireAppPage({ permission: "manage_workspace" });
  let automations: PortalAutomation[] = [];

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const result = await getPortalAutomations(ctx.tenantId);
      automations = Array.isArray(result.data?.automations) ? result.data.automations : [];
    } catch {
      automations = [];
    }
  }

  return (
    <ClientPageShell
      title="Automatizaciones"
      description="Automatiza respuestas y acciones cuando llegan mensajes de WhatsApp. Desde aqui puedes ver que esta activo, que conviene configurar y por donde empezar."
      badge="Automatizacion"
    >
      <AutomationsHub automations={automations} />
    </ClientPageShell>
  );
}
