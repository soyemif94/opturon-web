import { BotConfigForm } from "@/components/app/BotConfigForm";
import { getPortalBotSettings, getPortalTenantContext, isBackendConfigured, type PortalBotConfig } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";

const EMPTY_BOT_CONFIG: PortalBotConfig = {
  name: "",
  greetingMessage: "",
  tone: "amigable",
  treatment: "vos",
  outOfHoursMessage: "",
  fallbackMessage: "",
  handoffMessage: ""
};

export default async function AppBotSettingsPage() {
  const ctx = await requireAppPage({ permission: "manage_workspace" });
  const tenantId = ctx.tenantId || "";

  let initialConfig = EMPTY_BOT_CONFIG;
  let clinicName = "Espacio del cliente";
  let portalActive = false;

  if (tenantId && isBackendConfigured()) {
    try {
      const [settingsResult, tenantContext] = await Promise.all([
        getPortalBotSettings(tenantId).catch(() => null),
        getPortalTenantContext(tenantId).catch(() => null)
      ]);

      initialConfig = settingsResult?.data.settings?.botConfig || EMPTY_BOT_CONFIG;
      clinicName = tenantContext?.data?.clinic?.name || settingsResult?.data.settings?.clinicName || clinicName;
      portalActive = Boolean(tenantContext?.data?.onboarding?.hasChannel);
    } catch {
      initialConfig = EMPTY_BOT_CONFIG;
    }
  }

  return <BotConfigForm initialConfig={initialConfig} tenantName={clinicName} portalActive={portalActive} />;
}
