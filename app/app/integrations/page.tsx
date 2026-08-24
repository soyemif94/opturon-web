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
import { isOpturonAdminWorkspaceContext, requireAppPage } from "@/lib/saas/access";
import { buildWhatsAppConnectionStatus } from "@/lib/whatsapp-channel-state";

export default async function AppIntegrationsPage() {
  const ctx = await requireAppPage({ permission: "manage_workspace" });
  const isOpturonAdmin = isOpturonAdminWorkspaceContext(ctx);
  let whatsapp = buildWhatsAppConnectionStatus({ fallbackReason: "workspace_without_backend" });
  let whatsappStatus: PortalWhatsAppStatus | null = null;
  let instagramStatus: PortalInstagramStatus | null = null;

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const [result, onboarding, statusResult, instagramResult] = await Promise.all([
        getPortalTenantContext(ctx.tenantId),
        getPortalWhatsAppEmbeddedSignupStatus(ctx.tenantId).catch(() => null),
        isOpturonAdmin ? getPortalWhatsAppStatus(ctx.tenantId).catch(() => null) : Promise.resolve(null),
        getPortalInstagramStatus(ctx.tenantId).catch(() => null)
      ]);
      whatsapp = buildWhatsAppConnectionStatus({ context: result.data, onboarding: onboarding?.data || null });
      whatsappStatus = statusResult?.data || null;
      instagramStatus = instagramResult?.data || null;
    } catch {
      whatsapp = buildWhatsAppConnectionStatus({ fallbackReason: "portal_tenant_context_failed" });
    }
  }

  if (!isOpturonAdmin) {
    return (
      <div data-client-integrations-page className="min-w-0 max-w-full space-y-5 sm:space-y-6">
        <header className="min-w-0 border-b border-[color:var(--border)] pb-4 sm:pb-5">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Integraciones</h1>
          <p className="mt-2 text-sm leading-6 text-muted sm:text-base">Conectá los canales que usa tu negocio.</p>
        </header>
        <IntegrationsHub
          whatsapp={whatsapp}
          whatsappStatus={whatsappStatus}
          instagramStatus={instagramStatus}
          isOpturonAdmin={false}
        />
      </div>
    );
  }

  return (
    <ClientPageShell
      title="Integraciones"
      description="Centro de conexiones reales del producto: WhatsApp como canal principal e Instagram en modo lectura dentro del Inbox."
      badge="WhatsApp e Instagram"
    >
      <IntegrationsHub
        whatsapp={whatsapp}
        whatsappStatus={whatsappStatus}
        instagramStatus={instagramStatus}
        isOpturonAdmin
      />
    </ClientPageShell>
  );
}
