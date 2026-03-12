import { ClientPageShell } from "@/components/app/client-page-shell";
import { IntegrationsHub } from "@/components/app/integrations-hub";
import { getPortalTenantContext, isBackendConfigured } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";

export default async function AppIntegrationsPage() {
  const ctx = await requireAppPage();
  let whatsapp = {
    state: "not_connected" as "not_connected" | "connecting" | "connected" | "error",
    connectedNumber: null as string | null,
    channelStatus: null as string | null,
    webhookActive: null as boolean | null,
    lastActivity: null as string | null
  };

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const result = await getPortalTenantContext(ctx.tenantId);
      const channel = result.data.channel;
      const channelStatus = String(channel?.status || "").trim().toLowerCase() || null;
      whatsapp = {
        state: !channel
          ? "not_connected"
          : channelStatus === "active"
            ? "connected"
            : channelStatus === "pending" || channelStatus === "connecting"
              ? "connecting"
              : "error",
        connectedNumber: channel?.phoneNumberId || null,
        channelStatus: channel?.status || null,
        webhookActive: channelStatus === "active",
        lastActivity: null
      };
    } catch {
      whatsapp = {
        state: "error",
        connectedNumber: null,
        channelStatus: null,
        webhookActive: null,
        lastActivity: null
      };
    }
  }

  return (
    <ClientPageShell
      title="Integraciones"
      description="Conecta tu canal principal, revisa su estado y deja tu operación lista para responder desde Opturon."
      badge="Canales y conexiones"
    >
      <IntegrationsHub whatsapp={whatsapp} />
    </ClientPageShell>
  );
}
