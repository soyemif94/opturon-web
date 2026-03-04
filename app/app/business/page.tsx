import { requireAppPage } from "@/lib/saas/access";
import { ensureBusinessSettings, readSaasData } from "@/lib/saas/store";
import { BusinessSettingsForm } from "@/components/app/BusinessSettingsForm";

export default async function BusinessPage() {
  const ctx = await requireAppPage();
  const data = readSaasData();
  const tenantId = ctx.tenantId || data.tenants[0]?.id || "";
  const settings = ensureBusinessSettings(tenantId);

  return <BusinessSettingsForm initialSettings={settings} />;
}
