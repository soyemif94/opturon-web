import { ClientPageShell } from "@/components/app/client-page-shell";
import { IntegrationsHub } from "@/components/app/integrations-hub";
import { getPortalTenantContext, getPortalWhatsAppEmbeddedSignupStatus, isBackendConfigured } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";
import { buildWhatsAppConnectionStatus } from "@/lib/whatsapp-channel-state";

export default async function AppIntegrationsPage() {
  const ctx = await requireAppPage({ permission: "manage_workspace" });
  let whatsapp = buildWhatsAppConnectionStatus({ fallbackReason: "workspace_without_backend" });

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const [result, onboarding] = await Promise.all([
        getPortalTenantContext(ctx.tenantId),
        getPortalWhatsAppEmbeddedSignupStatus(ctx.tenantId).catch(() => null)
      ]);
      whatsapp = buildWhatsAppConnectionStatus({ context: result.data, onboarding: onboarding?.data || null });
    } catch {
      whatsapp = buildWhatsAppConnectionStatus({ fallbackReason: "portal_tenant_context_failed" });
    }
  }

  return (
    <ClientPageShell
      title="Integraciones"
      description="Conecta tu WhatsApp Business, revisa el estado real del canal y deja tu workspace listo para responder desde Opturon."
      badge="Canales y conexiones"
    >
      <IntegrationsHub whatsapp={whatsapp} />
    </ClientPageShell>
  );
}
