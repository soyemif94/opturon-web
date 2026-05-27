import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  CheckCircle2,
  Cog,
  Landmark,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { canManageUsers } from "@/lib/app-permissions";
import {
  getPortalBotTransferConfig,
  getPortalBusinessSettings,
  getPortalTenantContext,
  getPortalUsers,
  isBackendConfigured,
  type PortalBotTransferConfig,
  type PortalBusinessSettings,
  type PortalUser,
  type PortalUsersMeta
} from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";
import { listTenantMembers, readSaasData } from "@/lib/saas/store";

const EMPTY_BUSINESS_SETTINGS: PortalBusinessSettings = {
  clinicId: "",
  clinicName: "",
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

const EMPTY_TRANSFER_CONFIG: PortalBotTransferConfig = {
  enabled: false,
  alias: "",
  cbu: "",
  titular: "",
  bank: "",
  instructions: "",
  destinationId: null,
  reference: null
};

const DEFAULT_USERS_META: PortalUsersMeta = {
  subaccountCount: 0,
  primaryAccountCount: 0,
  primaryPortalUserId: null,
  subaccountLimit: 5,
  remainingSubaccounts: 5,
  futureLimitKey: "tenant_portal_users",
  limitScope: "subaccounts",
  limitSource: "default_env"
};

function completionLabel(value: boolean, okText: string, missingText: string) {
  return value ? okText : missingText;
}

export default async function AppSettingsPage() {
  const ctx = await requireAppPage({ permission: "manage_workspace" });
  const tenantId = ctx.tenantId || "";
  const backendReady = tenantId && isBackendConfigured();
  const allowUsers = canManageUsers(ctx);

  let clinicName = "Espacio del cliente";
  let businessSettings = EMPTY_BUSINESS_SETTINGS;
  let transferConfig = EMPTY_TRANSFER_CONFIG;
  let users: PortalUser[] = [];
  let usersMeta: PortalUsersMeta = DEFAULT_USERS_META;

  if (backendReady) {
    const [tenantContext, businessResult, transferResult, usersResult] = await Promise.all([
      getPortalTenantContext(tenantId).catch(() => null),
      getPortalBusinessSettings(tenantId).catch(() => null),
      getPortalBotTransferConfig(tenantId).catch(() => null),
      allowUsers ? getPortalUsers(tenantId).catch(() => null) : Promise.resolve(null)
    ]);

    clinicName = tenantContext?.data?.clinic?.name || transferResult?.data?.settings?.clinicName || clinicName;
    businessSettings = { ...EMPTY_BUSINESS_SETTINGS, ...(businessResult?.data?.settings || {}), tenantId };
    transferConfig = transferResult?.data?.settings?.transferConfig || EMPTY_TRANSFER_CONFIG;
    users = usersResult?.data?.users || [];
    usersMeta = usersResult?.data?.meta || DEFAULT_USERS_META;
  } else {
    const data = readSaasData();
    const fallbackTenantId = tenantId || data.tenants[0]?.id || "";
    const tenant = data.tenants.find((item) => item.id === fallbackTenantId) || null;
    clinicName = tenant?.name || clinicName;
    businessSettings = {
      ...EMPTY_BUSINESS_SETTINGS,
      ...(data.businessSettings.find((item) => item?.tenantId === fallbackTenantId) || {}),
      tenantId: fallbackTenantId
    };
    users = listTenantMembers(fallbackTenantId).map((user) => ({
      id: user.id,
      clinicId: fallbackTenantId,
      name: user.name,
      email: user.email,
      role: user.tenantRole,
      accountKind: user.tenantRole === "owner" ? "primary" : "subaccount",
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    usersMeta = {
      ...DEFAULT_USERS_META,
      subaccountCount: users.filter((user) => user.accountKind !== "primary").length,
      primaryAccountCount: users.filter((user) => user.accountKind === "primary").length,
      primaryPortalUserId: users.find((user) => user.accountKind === "primary")?.id || null,
      remainingSubaccounts: Math.max(0, (DEFAULT_USERS_META.subaccountLimit || 0) - users.filter((user) => user.accountKind !== "primary").length)
    };
  }

  const activeUsers = users.filter((user) => user.active !== false);
  const managersCount = activeUsers.filter((user) => ["owner", "manager"].includes(String(user.role || "").toLowerCase())).length;
  const sellersCount = activeUsers.filter((user) => String(user.role || "").toLowerCase() === "seller").length;
  const otherUsersCount = Math.max(0, activeUsers.length - managersCount - sellersCount);

  const businessChecks = [
    {
      label: "Informacion del negocio",
      value: Boolean(businessSettings.legalName || clinicName)
    },
    {
      label: "Horarios de atencion",
      value: Boolean(String(businessSettings.openingHours || "").trim())
    },
    {
      label: "Ubicacion y operacion",
      value: Boolean(String(businessSettings.address || businessSettings.fiscalAddress || "").trim())
    },
    {
      label: "Datos fiscales",
      value: Boolean(String(businessSettings.taxId || "").trim())
    }
  ];

  const transferChecks = [
    { label: "Alias configurado", value: Boolean(String(transferConfig.alias || "").trim()), detail: transferConfig.alias || "Pendiente" },
    { label: "CBU cargado", value: Boolean(String(transferConfig.cbu || "").trim()), detail: transferConfig.cbu || "Pendiente" },
    { label: "Mensaje personalizado", value: Boolean(String(transferConfig.instructions || "").trim()), detail: transferConfig.enabled ? "Activo" : "Sin activar" }
  ];

  const configuredModules = [
    businessChecks.filter((item) => item.value).length > 0 ? "Negocio" : null,
    allowUsers ? "Equipo" : null,
    transferConfig.enabled || transferChecks.some((item) => item.value) ? "Cobros" : null
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_82%_18%,rgba(176,80,0,0.14),transparent_22%),linear-gradient(135deg,rgba(12,20,32,0.98),rgba(10,16,28,0.96))] p-5 shadow-[var(--card-shadow)]">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="muted">Portal del cliente</Badge>
            <Badge variant="success">Portal activo</Badge>
            <Badge variant="success">Espacio activo</Badge>
            {backendReady ? <Badge variant="warning">Operacion en vivo</Badge> : null}
          </div>
          <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-muted">Configuracion</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Configuracion</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Administra negocio, equipo y cobros desde un solo lugar.
          </p>

          <div className="mt-4 rounded-[22px] border border-white/8 bg-black/18 p-3.5">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-brand/20 bg-brand/10 text-brandBright">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="font-medium text-white">El estado de este centro impacta en la operacion diaria.</p>
                <p className="mt-1 text-sm leading-6 text-muted">Completar negocio, usuarios y cobros mejora la atencion y reduce friccion.</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] shadow-[var(--card-shadow)]">
          <CardContent className="space-y-3 p-4">
            <div>
              <p className="text-lg font-semibold">Lectura rapida</p>
              <p className="mt-1 text-sm leading-6 text-muted">Estado actual de {clinicName}.</p>
            </div>

            {[
              {
                icon: <Building2 className="h-5 w-5 text-brandBright" />,
                title: "Datos actualizados",
                copy: businessChecks.filter((item) => item.value).length >= 3 ? "La informacion del negocio ya acompana bien la operacion." : "Todavia hay datos clave del negocio para completar."
              },
              {
                icon: <Users className="h-5 w-5 text-violet-300" />,
                title: "Equipo organizado",
                copy: `${activeUsers.length || 0} usuario${activeUsers.length === 1 ? "" : "s"} activo${activeUsers.length === 1 ? "" : "s"} en el espacio.`
              },
              {
                icon: <Banknote className="h-5 w-5 text-emerald-300" />,
                title: "Cobros automaticos",
                copy: transferConfig.enabled ? "El bot ya puede compartir datos bancarios automaticamente." : "Activa transferencia para que el bot comparta alias, CBU e instrucciones."
              },
              {
                icon: <Sparkles className="h-5 w-5 text-sky-300" />,
                title: "Operacion optimizada",
                copy: configuredModules.length ? `${configuredModules.join(" · ")} ya estan presentes en este centro.` : "Todavia no hay modulos configurados por completo."
              }
            ].map((item) => (
              <div key={item.title} className="rounded-[20px] border border-white/8 bg-surface/55 p-3.5">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                    {item.icon}
                  </span>
                  <div>
                    <p className="font-medium text-white">{item.title}</p>
                    <p className="mt-1 text-sm leading-5 text-muted">{item.copy}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <HubCard
          href="/app/business"
          icon={<Building2 className="h-6 w-6 text-brandBright" />}
          title="Cuenta y negocio"
          subtitle="Informacion esencial de tu negocio"
          description="Gestiona los datos principales de la empresa, horarios, ubicacion, perfil fiscal e informacion que usa el bot."
          cta="Editar negocio"
          accent="brand"
        >
          <div className="space-y-3">
            {businessChecks.map((item) => (
              <StatusRow
                key={item.label}
                label={item.label}
                value={completionLabel(item.value, "Completo", "Pendiente")}
                tone={item.value ? "success" : "muted"}
              />
            ))}
          </div>
        </HubCard>

        <HubCard
          href={allowUsers ? "/app/users" : undefined}
          icon={<Users className="h-6 w-6 text-violet-300" />}
          title="Usuarios del espacio"
          subtitle="Gestiona tu equipo"
          description="Invita usuarios, organiza roles y controla cuantos accesos siguen disponibles para la operacion del espacio."
          cta={allowUsers ? "Gestionar equipo" : "Sin permisos"}
          accent="violet"
          disabled={!allowUsers}
        >
          <div className="rounded-[22px] border border-white/8 bg-surface/60 p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm text-muted">Usuarios activos</p>
                <p className="mt-2 text-4xl font-semibold text-white">{activeUsers.length || 0}</p>
              </div>
              <p className="text-sm text-muted">
                {usersMeta.subaccountLimit ? `de ${usersMeta.subaccountLimit} permitidos` : "Sin limite visible"}
              </p>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#8b5cf6,#c084fc)]"
                style={{
                  width: `${Math.min(
                    100,
                    usersMeta.subaccountLimit
                      ? ((activeUsers.length || 0) / Math.max(usersMeta.subaccountLimit, 1)) * 100
                      : activeUsers.length
                        ? 100
                        : 8
                  )}%`
                }}
              />
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3 text-center">
              <MiniMetric label="Managers" value={String(managersCount)} />
              <MiniMetric label="Vendedores" value={String(sellersCount)} />
              <MiniMetric label="Otros" value={String(otherUsersCount)} />
              <MiniMetric label="Disponibles" value={String(Math.max(0, Number(usersMeta.remainingSubaccounts || 0)))} />
            </div>
          </div>
        </HubCard>

        <HubCard
          href="/app/settings/transfer"
          icon={<Landmark className="h-6 w-6 text-emerald-300" />}
          title="Cobro por transferencia"
          subtitle="Datos bancarios para el bot"
          description="Configura alias, CBU e instrucciones para que el bot pueda compartir los datos bancarios y pedir comprobantes."
          cta="Configurar cobros"
          accent="green"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-[18px] border border-white/8 bg-surface/60 px-4 py-3">
              <span className="text-sm text-muted">Estado del cobro</span>
              <Badge variant={transferConfig.enabled ? "success" : "muted"}>{transferConfig.enabled ? "Activo" : "Pendiente"}</Badge>
            </div>
            {transferChecks.map((item) => (
              <StatusRow
                key={item.label}
                label={item.label}
                value={item.detail}
                tone={item.value ? "success" : "muted"}
              />
            ))}
          </div>
        </HubCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
        <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,23,0.96))] shadow-[var(--card-shadow)]">
          <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-300">
                <Cog className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xl font-semibold text-white">Mejora continua del espacio</p>
                <p className="mt-1 text-sm leading-6 text-muted">Negocio, equipo y cobros completos ayudan a operar con menos friccion.</p>
              </div>
            </div>
            <Button asChild variant="secondary" className="rounded-2xl">
              <Link href="/app/business">
                Ver recomendaciones
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,23,0.96))] shadow-[var(--card-shadow)]">
          <CardContent className="space-y-3 p-4">
            <p className="text-lg font-semibold text-white">Lectura rapida</p>
            <p className="text-sm leading-6 text-muted">Estado actual del centro de configuracion de {clinicName}.</p>
            {[
              {
                label: "Negocio",
                ready: businessChecks.every((item) => item.value)
              },
              {
                label: "Equipo",
                ready: activeUsers.length > 0
              },
              {
                label: "Cobros",
                ready: transferChecks.some((item) => item.value)
              }
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-[18px] border border-white/8 bg-surface/55 px-4 py-3">
                <span className="text-sm text-white">{item.label}</span>
                <span className={`inline-flex items-center gap-2 text-sm ${item.ready ? "text-emerald-300" : "text-muted"}`}>
                  <CheckCircle2 className="h-4 w-4" />
                  {item.ready ? "Listo" : "Pendiente"}
                </span>
              </div>
            ))}
            <div className="rounded-[18px] border border-white/8 bg-surface/55 p-4 text-sm leading-6 text-muted">
              {backendReady
                ? "El espacio esta conectado al backend real del portal y el hub muestra datos activos del negocio."
                : "El hub usa datos locales del espacio actual mientras el backend real no esta disponible para este tenant."}
            </div>
            <Button asChild className="w-full rounded-2xl">
              <Link href="/app/settings/transfer">
                Configurar cobros
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function HubCard({
  href,
  icon,
  title,
  subtitle,
  description,
  cta,
  accent,
  disabled = false,
  children
}: {
  href?: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  accent: "brand" | "violet" | "green";
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const accents = {
    brand: "border-brand/20 bg-brand/10 text-brandBright",
    violet: "border-violet-500/20 bg-violet-500/10 text-violet-300",
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
  } as const;

  const buttonClasses = {
    brand: "border-brand/35 bg-brand/8 text-brandBright hover:bg-brand/12",
    violet: "border-violet-500/35 bg-violet-500/8 text-violet-300 hover:bg-violet-500/12",
    green: "border-emerald-500/35 bg-emerald-500/8 text-emerald-300 hover:bg-emerald-500/12"
  } as const;

  const content = (
    <Card className={`h-full border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,23,0.96))] shadow-[var(--card-shadow)] ${disabled ? "opacity-80" : ""}`}>
      <CardContent className="flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border ${accents[accent]}`}>
              {icon}
            </span>
            <div>
              <p className="text-xl font-semibold text-white">{title}</p>
              <p className="mt-1 text-sm text-muted">{subtitle}</p>
            </div>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80">
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>

        <p className="mt-4 text-sm leading-6 text-muted">{description}</p>

        <div className="mt-4 flex-1">{children}</div>

        <div className={`mt-4 flex items-center justify-between rounded-[18px] border px-4 py-3 text-sm font-medium transition-colors ${buttonClasses[accent]}`}>
          <span>{cta}</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );

  if (!href || disabled) {
    return content;
  }

  return (
    <Link href={href} className="block transition-transform duration-200 hover:-translate-y-0.5">
      {content}
    </Link>
  );
}

function StatusRow({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "success" | "muted";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-surface/60 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${tone === "success" ? "text-emerald-300" : "text-muted"}`}>
          <BadgeCheck className="h-4 w-4" />
        </span>
        <span className="truncate text-sm text-white">{label}</span>
      </div>
      <span className={`shrink-0 text-sm ${tone === "success" ? "text-emerald-300" : "text-muted"}`}>{value}</span>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-white/8 bg-black/14 px-3 py-3">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}
