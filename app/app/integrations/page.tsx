import { ClientPageShell } from "@/components/app/client-page-shell";
import { IntegrationsHub } from "@/components/app/integrations-hub";
import {
  getPortalTenantContext,
  getPortalWhatsAppEmbeddedSignupStatus,
  getPortalWhatsAppTemplateBlueprints,
  getPortalWhatsAppTemplates,
  isBackendConfigured,
  type PortalWhatsAppTemplate,
  type PortalWhatsAppTemplateBlueprint
} from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";
import { buildWhatsAppConnectionStatus } from "@/lib/whatsapp-channel-state";

export default async function AppIntegrationsPage() {
  const ctx = await requireAppPage({ permission: "manage_workspace" });
  let whatsapp = buildWhatsAppConnectionStatus({ fallbackReason: "workspace_without_backend" });
  let templateBlueprints: PortalWhatsAppTemplateBlueprint[] = [];
  let templates: PortalWhatsAppTemplate[] = [];

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const [result, onboarding, blueprintsResult, templatesResult] = await Promise.all([
        getPortalTenantContext(ctx.tenantId),
        getPortalWhatsAppEmbeddedSignupStatus(ctx.tenantId).catch(() => null),
        getPortalWhatsAppTemplateBlueprints(ctx.tenantId).catch(() => null),
        getPortalWhatsAppTemplates(ctx.tenantId).catch(() => null)
      ]);
      whatsapp = buildWhatsAppConnectionStatus({ context: result.data, onboarding: onboarding?.data || null });
      templateBlueprints = blueprintsResult?.data?.blueprints || [];
      templates = templatesResult?.data?.templates || [];
    } catch {
      whatsapp = buildWhatsAppConnectionStatus({ fallbackReason: "portal_tenant_context_failed" });
    }
  }

  return (
    <ClientPageShell
      title="Integraciones"
      description="Centro de conexiones reales del producto: WhatsApp como canal principal hoy y CRM externo como proximo paso de integracion."
      badge="WhatsApp y CRM"
    >
      <IntegrationsHub whatsapp={whatsapp} templateBlueprints={templateBlueprints} templates={templates} />
    </ClientPageShell>
  );
}
