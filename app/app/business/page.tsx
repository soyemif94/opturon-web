import Link from "next/link";
import { ArrowLeft, ArrowRight, Bot, BriefcaseBusiness, CheckCircle2, Landmark, ShieldCheck, Users } from "lucide-react";
import { BUSINESS_SETTINGS_FORM_ID, BusinessSettingsForm } from "@/components/app/BusinessSettingsForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

function buildWorkspace({
  settings,
  clinicName,
  tenantIndustry,
  backendReady
}: {
  settings: BusinessProfilePageSettings;
  clinicName: string;
  tenantIndustry?: string;
  backendReady: boolean;
}) {
  const businessReady = Boolean(String(settings.legalName || "").trim() && String(settings.profileImageUrl || "").trim());
  const operationReady = Boolean(String(settings.openingHours || "").trim() && String(settings.address || "").trim());
  const shippingReady = Boolean(String(settings.deliveryZones || "").trim() && String(settings.policies || "").trim());
  const fiscalReady = Boolean(String(settings.taxId || "").trim() && String(settings.vatCondition || "").trim());
  const accountantReady = Boolean(String(settings.accountantName || "").trim() && String(settings.accountantEmail || "").trim());
  const progressItems = [
    { label: "Identidad del negocio", ready: businessReady },
    { label: "Operacion del negocio", ready: operationReady },
    { label: "Horarios de envio", ready: shippingReady },
    { label: "Perfil fiscal", ready: fiscalReady },
    { label: "Contacto contador", ready: accountantReady }
  ];
  const completion = Math.round((progressItems.filter((item) => item.ready).length / progressItems.length) * 100);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_80%_18%,rgba(176,80,0,0.14),transparent_18%),linear-gradient(135deg,rgba(12,20,32,0.98),rgba(10,16,28,0.96))] p-5 shadow-[var(--card-shadow)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Link href="/app/settings" className="transition-colors hover:text-white">
                Configuracion
              </Link>
              <span>/</span>
              <span className="text-white">Cuenta y negocio</span>
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-white">Cuenta y negocio</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Administra la informacion principal de tu negocio y como opera en Opturon.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="success" className="rounded-full px-3 py-1.5">
              <Bot className="mr-2 h-3.5 w-3.5" />
              Vista previa del bot
            </Badge>
            <Button asChild variant="secondary" className="rounded-2xl">
              <Link href="/app/settings">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Link>
            </Button>
            <Button type="submit" form={BUSINESS_SETTINGS_FORM_ID} className="rounded-2xl">
              Guardar cambios
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_320px]">
        <BusinessSettingsForm initialSettings={settings} tenantName={clinicName} tenantIndustry={tenantIndustry} />

        <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] shadow-[var(--card-shadow)]">
            <CardContent className="space-y-5 p-5">
              <div>
                <p className="text-2xl font-semibold text-white">Estado de la configuracion</p>
                <p className="mt-2 text-sm leading-6 text-muted">Tu negocio esta {completion >= 80 ? "casi listo" : "en configuracion"}. Completa los datos faltantes para mejorar la experiencia del bot.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-brand/20 bg-[conic-gradient(from_180deg,var(--brand)_0deg,rgba(176,80,0,0.16)_0deg)]" style={{ background: `conic-gradient(var(--brand) ${completion * 3.6}deg, rgba(255,255,255,0.08) 0deg)` }}>
                  <div className="flex h-[78px] w-[78px] flex-col items-center justify-center rounded-full bg-[rgba(10,16,26,0.96)]">
                    <span className="text-2xl font-semibold text-white">{completion}%</span>
                    <span className="text-xs text-muted">Completado</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-muted">
                  <p className="font-medium text-white">{clinicName}</p>
                  <p>{tenantIndustry || "Operacion comercial"}</p>
                  <p>{backendReady ? "Conectado al backend real del portal." : "Usando datos locales del espacio actual."}</p>
                </div>
              </div>

              <div className="space-y-2">
                {progressItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-[18px] border border-white/8 bg-surface/55 px-4 py-3">
                    <span className="text-sm text-white">{item.label}</span>
                    <span className={`text-sm ${item.ready ? "text-emerald-300" : "text-amber-300"}`}>{item.ready ? "Completo" : "Pendiente"}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] shadow-[var(--card-shadow)]">
            <CardContent className="space-y-3 p-5">
              <QuickRead icon={<BriefcaseBusiness className="h-4 w-4" />} title="Negocio visible" copy={businessReady ? "La identidad principal ya esta cargada." : "Todavia falta completar nombre o imagen del negocio."} />
              <QuickRead icon={<Users className="h-4 w-4" />} title="Operacion clara" copy={operationReady ? "Horario y direccion ya ayudan al equipo y al bot." : "Completa horario y direccion para mejorar las respuestas."} />
              <QuickRead icon={<Landmark className="h-4 w-4" />} title="Cobertura comercial" copy={shippingReady ? "Zonas y notas de entrega ya estan definidas." : "Falta completar zonas o notas para una mejor comunicacion."} />
              <div className="rounded-[20px] border border-white/8 bg-surface/55 p-4">
                <p className="text-lg font-semibold text-white">Necesitas ayuda?</p>
                <p className="mt-2 text-sm leading-6 text-muted">Nuestro equipo te acompana para dejar el negocio alineado con el bot y la operacion.</p>
                <Button asChild variant="secondary" className="mt-4 w-full rounded-2xl">
                  <Link href="/app/settings">
                    Contactar soporte
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

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

      return buildWorkspace({
        settings: realTenantSettings,
        clinicName,
        tenantIndustry: "Configuracion operativa del espacio",
        backendReady: true
      });
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

    return buildWorkspace({
      settings,
      clinicName: tenant?.name || "Espacio del cliente",
      tenantIndustry: tenant?.industry || "Operacion comercial",
      backendReady: false
    });
  } catch (error) {
    console.error("[app/business] Failed to render business page.", error);
    return buildWorkspace({
      settings: { ...EMPTY_SETTINGS, tenantId: ctx.tenantId || "" },
      clinicName: "Espacio del cliente",
      tenantIndustry: "Operacion comercial",
      backendReady: false
    });
  }
}

function QuickRead({
  icon,
  title,
  copy
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/8 bg-surface/55 p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-brandBright">{icon}</span>
        <div>
          <p className="font-medium text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{copy}</p>
        </div>
      </div>
    </div>
  );
}
