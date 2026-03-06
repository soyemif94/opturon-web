import { BusinessSettingsForm } from "@/components/app/BusinessSettingsForm";
import { requireAppPage } from "@/lib/saas/access";
import { readSaasData } from "@/lib/saas/store";

const EMPTY_SETTINGS = {
  tenantId: "",
  openingHours: "",
  address: "",
  deliveryZones: "",
  paymentMethods: "",
  policies: ""
};

export default async function BusinessPage() {
  const ctx = await requireAppPage();

  try {
    const data = readSaasData();
    const tenants = Array.isArray(data.tenants) ? data.tenants : [];
    const businessSettings = Array.isArray(data.businessSettings) ? data.businessSettings : [];
    const tenantId = ctx.tenantId || tenants[0]?.id || "";
    const settings =
      businessSettings.find((item) => item?.tenantId === tenantId) || {
        ...EMPTY_SETTINGS,
        tenantId
      };

    return <BusinessSettingsForm initialSettings={settings} />;
  } catch (error) {
    console.error("[app/business] Failed to render business page.", error);
    return <BusinessSettingsForm initialSettings={EMPTY_SETTINGS} />;
  }
}
