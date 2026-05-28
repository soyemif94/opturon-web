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
  let portalActive = false;

  if (tenantId && isBackendConfigured()) {
    try {
      const [settingsResult, tenantContext] = await Promise.all([
        getPortalBotTransferConfig(tenantId).catch(() => null),
        getPortalTenantContext(tenantId).catch(() => null)
      ]);

      initialConfig = settingsResult?.data.settings?.transferConfig || EMPTY_TRANSFER_CONFIG;
      clinicName = tenantContext?.data?.clinic?.name || settingsResult?.data.settings?.clinicName || clinicName;
      portalActive = Boolean(tenantContext?.data?.onboarding?.hasChannel);
    } catch {
      initialConfig = EMPTY_TRANSFER_CONFIG;
    }
  }

  return <TransferConfigForm initialConfig={initialConfig} tenantName={clinicName} portalActive={portalActive} />;
}
