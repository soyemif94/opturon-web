import { ClientPageShell } from "@/components/app/client-page-shell";
import { IntegrationsHub } from "@/components/app/integrations-hub";
import {
  getPortalInstagramStatus,
  getPortalTenantContext,
  getPortalWhatsAppEmbeddedSignupStatus,
  getPortalWhatsAppTemplateBlueprints,
  getPortalWhatsAppTemplates,
  isBackendConfigured,
  type PortalInstagramStatus,
  type PortalWhatsAppTemplate,
  type PortalWhatsAppTemplateBlueprint
} from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";
import { buildWhatsAppConnectionStatus } from "@/lib/whatsapp-channel-state";

export default async function AppIntegrationsPage() {
  const ctx = await requireAppPage({ permission: "manage_workspace" });
  let whatsapp = buildWhatsAppConnectionStatus({ fallbackReason: "workspace_without_backend" });
  let instagram: PortalInstagramStatus = {
    tenantId: ctx.tenantId || "",
    clinicId: null,
    state: "not_connected",
    channel: null,
    channels: []
  };
  let templateBlueprints: PortalWhatsAppTemplateBlueprint[] = [];
  let templates: PortalWhatsAppTemplate[] = [];

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const [result, onboarding, blueprintsResult, templatesResult, instagramResult] = await Promise.all([
        getPortalTenantContext(ctx.tenantId),
        getPortalWhatsAppEmbeddedSignupStatus(ctx.tenantId).catch(() => null),
        getPortalWhatsAppTemplateBlueprints(ctx.tenantId).catch(() => null),
        getPortalWhatsAppTemplates(ctx.tenantId).catch(() => null),
        getPortalInstagramStatus(ctx.tenantId).catch(() => null)
      ]);
      whatsapp = buildWhatsAppConnectionStatus({ context: result.data, onboarding: onboarding?.data || null });
      templateBlueprints = blueprintsResult?.data?.blueprints || [];
      templates = templatesResult?.data?.templates || [];
      instagram = instagramResult?.data || instagram;
    } catch {
      whatsapp = buildWhatsAppConnectionStatus({ fallbackReason: "portal_tenant_context_failed" });
    }
  }

  return (
    <ClientPageShell
      title="Integraciones"
      description="Conecta tu WhatsApp Business, revisa el estado real del canal y deja tu espacio listo para responder desde Opturon."
      badge="Canales y conexiones"
    >
      <IntegrationsHub whatsapp={whatsapp} instagram={instagram} templateBlueprints={templateBlueprints} templates={templates} />
    </ClientPageShell>
  );
}
