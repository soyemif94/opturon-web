import { AutomationsHub } from "@/components/app/automations-hub";
import { ClientPageShell } from "@/components/app/client-page-shell";
import {
  getPortalAutomations,
  isBackendConfigured,
  type PortalAutomation,
  type PortalAutomationCatalogItem,
  type PortalBusinessSettings
} from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";

export default async function AppAutomationsPage() {
  const ctx = await requireAppPage({ permission: "manage_workspace" });
  let automations: PortalAutomation[] = [];
  let catalog: PortalAutomationCatalogItem[] = [];
  let businessProfile: PortalBusinessSettings | null = null;

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const result = await getPortalAutomations(ctx.tenantId);
      automations = Array.isArray(result.data?.automations) ? result.data.automations : [];
      catalog = Array.isArray(result.data?.catalog) ? result.data.catalog : [];
      businessProfile = result.data?.businessProfile
        ? {
            tenantId: ctx.tenantId,
            clinicId: result.data.businessProfile.clinicId,
            clinicName: result.data.businessProfile.clinicName,
            profileImageUrl: "",
            legalName: "",
            taxId: "",
            taxIdType: "NONE",
            vatCondition: "",
            grossIncomeNumber: "",
            fiscalAddress: "",
            city: "",
            province: "",
            pointOfSaleSuggested: "",
            defaultSuggestedFiscalVoucherType: "NONE",
            accountantEmail: "",
            accountantName: "",
            openingHours: "",
            address: "",
            deliveryZones: "",
            paymentMethods: "",
            policies: "",
            businessType: result.data.businessProfile.businessType,
            capabilities: result.data.businessProfile.capabilities
          }
        : null;
    } catch {
      automations = [];
      catalog = [];
      businessProfile = null;
    }
  }

  return (
    <ClientPageShell
      title="Automatizaciones"
      description="Automatiza respuestas, seguimientos y ventas por WhatsApp sin conocimientos tecnicos."
      badge="Automatizaciones"
    >
      <AutomationsHub automations={automations} catalog={catalog} businessProfile={businessProfile} />
    </ClientPageShell>
  );
}
