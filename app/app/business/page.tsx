import { ClientPageShell } from "@/components/app/client-page-shell";
import { BusinessSettingsForm } from "@/components/app/BusinessSettingsForm";
import { getPortalBusinessSettings, getPortalTenantContext, isBackendConfigured } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";
import { readSaasData } from "@/lib/saas/store";

const EMPTY_SETTINGS = {
  tenantId: "",
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
  policies: ""
};

type BusinessProfilePageSettings = typeof EMPTY_SETTINGS;

export default async function BusinessPage() {
  const ctx = await requireAppPage({ permission: "manage_workspace" });
  const isRealTenant = Boolean(ctx.tenantId);

  try {
    if (isRealTenant) {
      const settingsResult =
        ctx.tenantId && isBackendConfigured() ? await getPortalBusinessSettings(ctx.tenantId).catch(() => null) : null;
      const tenantContext =
        ctx.tenantId && isBackendConfigured() ? await getPortalTenantContext(ctx.tenantId).catch(() => null) : null;
      const realTenantSettings: BusinessProfilePageSettings = {
        ...EMPTY_SETTINGS,
        ...(settingsResult?.data.settings || {}),
        tenantId: ctx.tenantId || settingsResult?.data.settings?.tenantId || ""
      };
      const clinicName = tenantContext?.data?.clinic?.name || settingsResult?.data.settings?.clinicName || "Espacio del cliente";

      return (
        <ClientPageShell
          title="Perfil fiscal del negocio"
          description="Centraliza los datos del emisor para que los comprobantes internos salgan listos para contador sin recargar cada documento."
          badge="Perfil emisor"
        >
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_320px]">
            <BusinessSettingsForm
              initialSettings={realTenantSettings}
              tenantName={clinicName}
              tenantIndustry="Configuracion operativa del espacio"
            />

            <div className="space-y-4">
              <div className="rounded-[24px] border border-[color:var(--border)] bg-card p-5 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Estado del perfil fiscal</p>
                {(realTenantSettings.profileImageUrl || "").trim() ? (
                  <div className="mt-3 h-20 w-20 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-surface/60">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={realTenantSettings.profileImageUrl} alt={clinicName} className="h-full w-full object-cover" />
                  </div>
                ) : null}
                <p className="mt-3 text-xl font-semibold">Fuente central del emisor conectada al espacio</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Los datos del negocio se guardan sobre la clinica real del espacio y alimentan por defecto la pre-facturacion contable.
                </p>
              </div>
            </div>
          </div>
        </ClientPageShell>
      );
    }

    const data = readSaasData();
    const tenants = Array.isArray(data.tenants) ? data.tenants : [];
    const businessSettings = Array.isArray(data.businessSettings) ? data.businessSettings : [];
    const tenantId = tenants[0]?.id || "";
    const tenant = tenants.find((item) => item.id === tenantId) || null;
    const settings: BusinessProfilePageSettings = {
      ...EMPTY_SETTINGS,
      ...(businessSettings.find((item) => item?.tenantId === tenantId) || {}),
      tenantId
    };
    const profileFields = [
      settings.legalName,
      settings.taxId,
      settings.vatCondition,
      settings.fiscalAddress,
      settings.pointOfSaleSuggested,
      settings.defaultSuggestedFiscalVoucherType,
      settings.accountantName,
      settings.accountantEmail
    ];
    const completedFields = profileFields.filter((value) => String(value || "").trim().length > 0 && value !== "NONE").length;
    const completionLabel = `${completedFields} de ${profileFields.length} bloques cargados`;

    return (
      <ClientPageShell
        title="Perfil fiscal del negocio"
        description="Centraliza los datos del emisor para que los comprobantes internos salgan listos para contador sin recargar cada documento."
        badge="Perfil emisor"
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_320px]">
          <BusinessSettingsForm initialSettings={settings} tenantName={tenant?.name} tenantIndustry={tenant?.industry} />

          <div className="space-y-4">
            <div className="rounded-[24px] border border-[color:var(--border)] bg-card p-5 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Resumen del negocio</p>
              {(settings.profileImageUrl || "").trim() ? (
                <div className="mt-3 h-20 w-20 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-surface/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={settings.profileImageUrl} alt={tenant?.name || "Tu negocio"} className="h-full w-full object-cover" />
                </div>
              ) : null}
              <p className="mt-3 text-xl font-semibold">{tenant?.name || "Tu negocio"}</p>
              <p className="mt-1 text-sm text-muted">{tenant?.industry || "Operacion comercial"}</p>
              <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Completitud fiscal</p>
                <p className="mt-2 text-lg font-semibold">{completionLabel}</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Estos datos completan mejor al emisor, mejoran la pre-facturacion y ordenan el envio de lotes al contador.
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-[color:var(--border)] bg-card p-5 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Por que importa</p>
              <div className="mt-4 space-y-3">
                {[
                  "Una razon social, CUIT y condicion IVA consistentes reducen correcciones manuales en cada comprobante.",
                  "El punto de venta sugerido y el tipo de comprobante orientan mejor al contador sin mezclar numeracion fiscal real.",
                  "Tener el contacto del estudio contable centralizado ordena la entrega de lotes y el seguimiento posterior."
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4 text-sm leading-6 text-muted">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ClientPageShell>
    );
  } catch (error) {
    console.error("[app/business] Failed to render business page.", error);
    return (
      <ClientPageShell
        title="Perfil fiscal del negocio"
        description="Centraliza los datos del emisor para que los comprobantes internos salgan listos para contador sin recargar cada documento."
        badge="Perfil emisor"
      >
        <BusinessSettingsForm initialSettings={{ ...EMPTY_SETTINGS, tenantId: ctx.tenantId || "" }} />
      </ClientPageShell>
    );
  }
}
