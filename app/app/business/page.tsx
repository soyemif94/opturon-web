import { ClientPageShell } from "@/components/app/client-page-shell";
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
  const ctx = await requireAppPage({ permission: "manage_workspace" });

  try {
    const data = readSaasData();
    const tenants = Array.isArray(data.tenants) ? data.tenants : [];
    const businessSettings = Array.isArray(data.businessSettings) ? data.businessSettings : [];
    const tenantId = ctx.tenantId || tenants[0]?.id || "";
    const tenant = tenants.find((item) => item.id === tenantId) || null;
    const settings =
      businessSettings.find((item) => item?.tenantId === tenantId) || {
        ...EMPTY_SETTINGS,
        tenantId
      };
    const profileFields = [settings.openingHours, settings.address, settings.deliveryZones, settings.paymentMethods, settings.policies];
    const completedFields = profileFields.filter((value) => String(value || "").trim().length > 0).length;
    const completionLabel = `${completedFields} de ${profileFields.length} bloques cargados`;

    return (
      <ClientPageShell
        title="Perfil del negocio"
        description="Configura la informacion principal de tu negocio para que el equipo, el canal y las automatizaciones respondan con mejor contexto."
        badge="Ficha operativa"
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_320px]">
          <BusinessSettingsForm initialSettings={settings} tenantName={tenant?.name} tenantIndustry={tenant?.industry} />

          <div className="space-y-4">
            <div className="rounded-[24px] border border-[color:var(--border)] bg-card p-5 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Resumen del negocio</p>
              <p className="mt-3 text-xl font-semibold">{tenant?.name || "Tu negocio"}</p>
              <p className="mt-1 text-sm text-muted">{tenant?.industry || "Operacion comercial"}</p>
              <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Completitud del perfil</p>
                <p className="mt-2 text-lg font-semibold">{completionLabel}</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Estos datos ayudan a ordenar la atencion, mejorar respuestas y darle mas contexto al canal y a las automatizaciones.
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-[color:var(--border)] bg-card p-5 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Por que importa</p>
              <div className="mt-4 space-y-3">
                {[
                  "Un horario claro mejora respuestas fuera de horario y la experiencia del cliente.",
                  "La direccion y la zona de atencion ayudan a orientar mejor consultas y seguimiento comercial.",
                  "Medios de pago y politicas hacen que el equipo y el bot respondan con mas consistencia."
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
        title="Perfil del negocio"
        description="Configura la informacion principal de tu negocio para que el equipo, el canal y las automatizaciones respondan con mejor contexto."
        badge="Ficha operativa"
      >
        <BusinessSettingsForm initialSettings={{ ...EMPTY_SETTINGS, tenantId: ctx.tenantId || "" }} />
      </ClientPageShell>
    );
  }
}
