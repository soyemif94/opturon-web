import { ClientPageShell } from "@/components/app/client-page-shell";
import { IntegrationsHub } from "@/components/app/integrations-hub";
import {
  getPortalTenantContext,
  getPortalInstagramStatus,
  getPortalWhatsAppEmbeddedSignupStatus,
  getPortalWhatsAppStatus,
  isBackendConfigured,
  type PortalInstagramStatus,
  type PortalWhatsAppStatus
} from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";
import { buildWhatsAppConnectionStatus } from "@/lib/whatsapp-channel-state";

export default async function AppIntegrationsPage() {
  const ctx = await requireAppPage({ permission: "manage_workspace" });
  let whatsapp = buildWhatsAppConnectionStatus({ fallbackReason: "workspace_without_backend" });
  let whatsappStatus: PortalWhatsAppStatus | null = null;
  let instagramStatus: PortalInstagramStatus | null = null;

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const [result, onboarding, statusResult, instagramResult] = await Promise.all([
        getPortalTenantContext(ctx.tenantId),
        getPortalWhatsAppEmbeddedSignupStatus(ctx.tenantId).catch(() => null),
        getPortalWhatsAppStatus(ctx.tenantId).catch(() => null),
        getPortalInstagramStatus(ctx.tenantId).catch(() => null)
      ]);
      whatsapp = buildWhatsAppConnectionStatus({ context: result.data, onboarding: onboarding?.data || null });
      whatsappStatus = statusResult?.data || null;
      instagramStatus = instagramResult?.data || null;
    } catch {
      whatsapp = buildWhatsAppConnectionStatus({ fallbackReason: "portal_tenant_context_failed" });
    }
  }

  return (
    <ClientPageShell
      title="Integraciones"
      description="Centro de conexiones reales del producto: WhatsApp como canal principal e Instagram en modo lectura dentro del Inbox."
      badge="WhatsApp e Instagram"
    >
      <IntegrationsHub whatsapp={whatsapp} whatsappStatus={whatsappStatus} instagramStatus={instagramStatus} />
    </ClientPageShell>
  );
}
