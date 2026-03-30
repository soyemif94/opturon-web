"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Bot,
  CalendarDays,
  ChartColumn,
  ChevronRight,
  ContactRound,
  Gift,
  Headset,
  House,
  MessageSquareText,
  LogOut,
  Menu,
  MoonStar,
  SunMedium,
  Package,
  PhoneCall,
  PlugZap,
  ReceiptText,
  Receipt,
  Settings2,
  Sparkles,
  TrendingUp,
  WalletCards
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { canAccessAppModule, canManageUsers, canManageWorkspace, type AppModule } from "@/lib/app-permissions";
import type { WhatsAppConnectionStatus } from "@/lib/whatsapp-channel-state";
import type { GlobalRole, TenantRole } from "@/lib/saas/types";
import { cn } from "@/lib/ui/cn";

const navItems: Array<{
  href: string;
  label: string;
  description: string;
  icon: any;
  module: AppModule;
  match: (pathname: string) => boolean;
}> = [
  {
    href: "/app",
    label: "Inicio",
    description: "Resumen de actividad, canal y accesos rapidos",
    icon: House,
    module: "home",
    match: (pathname: string) => pathname === "/app"
  },
  {
    href: "/app/inbox",
    label: "Bandeja",
    description: "Conversaciones, chat y contexto del contacto",
    icon: MessageSquareText,
    module: "inbox",
    match: (pathname: string) => pathname.startsWith("/app/inbox")
  },
  {
    href: "/app/contacts",
    label: "Contactos",
    description: "Base CRM simple con ultimas interacciones",
    icon: ContactRound,
    module: "contacts",
    match: (pathname: string) => pathname.startsWith("/app/contacts")
  },
  {
    href: "/app/agenda",
    label: "Agenda",
    description: "Disponibilidad, seguimientos y operacion diaria",
    icon: CalendarDays,
    module: "agenda",
    match: (pathname: string) => pathname.startsWith("/app/agenda")
  },
  {
    href: "/app/sales",
    label: "Ventas",
    description: "KPIs, oportunidades y lectura comercial del espacio",
    icon: TrendingUp,
    module: "sales",
    match: (pathname: string) => pathname.startsWith("/app/sales")
  },
  {
    href: "/app/loyalty",
    label: "Fidelizacion",
    description: "Puntos, recompensas y retencion por cliente",
    icon: Gift,
    module: "loyalty",
    match: (pathname: string) => pathname.startsWith("/app/loyalty")
  },
  {
    href: "/app/catalog",
    label: "Catalogo",
    description: "Productos, precios y stock base para operar pedidos",
    icon: Package,
    module: "catalog",
    match: (pathname: string) => pathname.startsWith("/app/catalog")
  },
  {
    href: "/app/orders",
    label: "Pedidos",
    description: "Pedidos internos, estados y preparacion desde el panel",
    icon: Receipt,
    module: "orders",
    match: (pathname: string) => pathname.startsWith("/app/orders")
  },
  {
    href: "/app/invoices",
    label: "Comprobantes",
    description: "Documentos internos, saldo y ciclo de pre-facturacion",
    icon: ReceiptText,
    module: "invoices",
    match: (pathname: string) => pathname.startsWith("/app/invoices")
  },
  {
    href: "/app/payments",
    label: "Cobros",
    description: "Cobros registrados, estado y asignacion sobre comprobantes",
    icon: PhoneCall,
    module: "payments",
    match: (pathname: string) => pathname.startsWith("/app/payments")
  },
  {
    href: "/app/cash",
    label: "Caja",
    description: "Apertura, control operativo y cierre de cajas del comercio",
    icon: WalletCards,
    module: "cash",
    match: (pathname: string) => pathname.startsWith("/app/cash")
  },
  {
    href: "/app/automations",
    label: "Automatizaciones",
    description: "Flujos del bot, respuestas y reglas",
    icon: Bot,
    module: "automations",
    match: (pathname: string) => pathname.startsWith("/app/automations")
  },
  {
    href: "/app/metrics",
    label: "Metricas",
    description: "Conversaciones, leads y performance",
    icon: ChartColumn,
    module: "metrics",
    match: (pathname: string) => pathname.startsWith("/app/metrics")
  },
  {
    href: "/app/integrations",
    label: "Integraciones",
    description: "WhatsApp operativo y CRM externo proximo",
    icon: PlugZap,
    module: "integrations",
    match: (pathname: string) => pathname.startsWith("/app/integrations")
  },
  {
    href: "/app/settings",
    label: "Configuracion",
    description: "Cuenta, negocio y preferencias del portal",
    icon: Settings2,
    module: "settings",
    match: (pathname: string) => pathname.startsWith("/app/settings")
  }
];

const APP_THEME_STORAGE_KEY = "opturon-app-theme";

function ThemeToggleButton() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    try {
      const storedTheme = window.localStorage.getItem(APP_THEME_STORAGE_KEY);
      const nextTheme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : "dark";
      setTheme(nextTheme);
      document.documentElement.setAttribute("data-app-theme", nextTheme);
    } catch {
      document.documentElement.setAttribute("data-app-theme", "dark");
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-app-theme", theme);
      window.localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
    } catch {
      document.documentElement.setAttribute("data-app-theme", theme);
    }
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"))}
      className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-surface/80 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-text"
      aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      title={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
    >
      {theme === "dark" ? <SunMedium className="h-3.5 w-3.5" /> : <MoonStar className="h-3.5 w-3.5" />}
      {theme === "dark" ? "Modo claro" : "Modo oscuro"}
    </button>
  );
}

export function AppShell({
  children,
  tenantId,
  tenantLabel,
  topbar,
  buildMarker,
  buildEnv,
  deploymentId,
  globalRole,
  tenantRole,
  whatsappStatus
}: {
  children: React.ReactNode;
  tenantId?: string | null;
  tenantLabel?: string;
  topbar?: React.ReactNode;
  buildMarker?: string;
  buildEnv?: string;
  deploymentId?: string;
  globalRole?: GlobalRole;
  tenantRole?: TenantRole;
  whatsappStatus?: WhatsAppConnectionStatus;
}) {
  const pathname = usePathname();
  const isInboxRoute = pathname.startsWith("/app/inbox");
  const accessContext = { globalRole, tenantRole };
  const visibleNavItems = navItems.filter((item) => canAccessAppModule(accessContext, item.module));
  const showManageShortcut = canManageWorkspace(accessContext);
  const showUsersShortcut = canManageUsers(accessContext);
  const [sidebarStatus, setSidebarStatus] = useState<WhatsAppConnectionStatus | undefined>(whatsappStatus);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setSidebarStatus(whatsappStatus);
  }, [whatsappStatus]);

  useEffect(() => {
    if (!tenantId) return;

    const controller = new AbortController();

    void fetch("/api/app/integrations/whatsapp", {
      method: "GET",
      cache: "no-store",
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`sidebar_whatsapp_status_failed_${response.status}`);
        }
        return response.json();
      })
      .then((payload) => {
        if (payload?.data) {
          setSidebarStatus(payload.data as WhatsAppConnectionStatus);
        }
      })
      .catch(() => {
        // Keep the current sidebar state if the refresh fails.
      });

    return () => controller.abort();
  }, [tenantId, pathname]);

  const buildLabel = [
    buildMarker ? `Build ${buildMarker}` : null,
    buildEnv ? `Env ${buildEnv}` : null,
    deploymentId ? `Deploy ${deploymentId}` : null
  ]
    .filter(Boolean)
    .join(" | ");
  const sidebarWhatsAppState = sidebarStatus?.state || "not_connected";
  const sidebarChannelStatusLabel =
    sidebarWhatsAppState === "connected"
      ? "Conectado"
      : sidebarWhatsAppState === "pending_meta" || sidebarWhatsAppState === "launching"
        ? "Pendiente"
        : sidebarWhatsAppState === "ambiguous_configuration"
          ? "Revisar"
          : sidebarWhatsAppState === "error"
            ? "Error"
            : "No conectado";
  const sidebarChannelTone =
    sidebarWhatsAppState === "connected"
      ? "text-emerald-300"
      : sidebarWhatsAppState === "error" || sidebarWhatsAppState === "ambiguous_configuration"
        ? "text-rose-300"
        : "text-amber-300";
  const sidebarActionLabel = sidebarWhatsAppState === "connected" ? "Ver integraciones" : "Conectar WhatsApp";

  return (
    <section className="min-h-screen w-full bg-[color:var(--bg)] px-3 py-3 text-[color:var(--text)] md:px-5 md:py-5">
      <div className="flex min-h-[calc(100vh-24px)] w-full items-stretch gap-3 md:min-h-[calc(100vh-40px)] md:gap-5">
        <aside className="hidden w-[304px] shrink-0 xl:block">
          <div className="sticky top-5 overflow-hidden rounded-[30px] border border-[color:var(--border)] bg-card/85 p-5 shadow-[0_28px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(192,80,0,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(176,80,0,0.08),transparent_34%)]" />

            <div className="relative">
              <div className="rounded-[24px] border border-brand/20 bg-[linear-gradient(135deg,rgba(192,80,0,0.18),rgba(16,16,16,0.94))] p-5">
                <Badge variant="warning" className="border-brand/30 bg-brand/10 text-brandBright">
                  Portal cliente
                </Badge>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight">Espacio de trabajo Opturon</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Conversaciones, agenda operativa y canal WhatsApp en una vista simple para el negocio.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {tenantLabel ? <Badge variant="muted">{tenantLabel}</Badge> : null}
                  <Badge variant="success">Espacio activo</Badge>
                  {buildMarker ? <Badge variant="outline">Build {buildMarker}</Badge> : null}
                </div>
                {buildLabel ? (
                  <p className="mt-3 font-mono text-[11px] font-medium tracking-[0.12em] text-muted" title={buildLabel}>
                    {buildLabel}
                  </p>
                ) : null}
              </div>

              <nav className="mt-6 space-y-2">
                {visibleNavItems.map((item) => {
                  const active = item.match(pathname);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={cn(
                        "group flex items-start gap-3 rounded-2xl border px-4 py-3 transition-all duration-200",
                        active
                          ? "border-brand/35 bg-brand/10 text-text shadow-[0_0_0_1px_rgba(192,80,0,0.12)]"
                          : "border-transparent bg-transparent text-muted hover:border-[color:var(--border)] hover:bg-surface/70 hover:text-text"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors",
                          active
                            ? "border-brand/30 bg-brand/15 text-brandBright"
                            : "border-[color:var(--border)] bg-surface text-muted group-hover:text-text"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3">
                          <span className="font-medium">{item.label}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 opacity-40 transition-transform group-hover:translate-x-0.5" />
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted">{item.description}</span>
                      </span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-6 rounded-[24px] border border-[color:var(--border)] bg-surface/75 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">Canal principal</p>
                    <p className="mt-1 text-sm font-medium">Conecta tu WhatsApp en 2 minutos</p>
                  </div>
                  <Headset className="h-4 w-4 text-brandBright" />
                </div>
                <div className="mt-4 space-y-3 text-sm text-muted">
                  <div className="flex items-center justify-between">
                    <span>Estado del canal</span>
                    <span className={sidebarChannelTone}>{sidebarChannelStatusLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Inbox</span>
                    <span className="text-text">Centralizado</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Bot</span>
                    <span className="text-text">Configurable</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Integraciones</span>
                    <span className={sidebarWhatsAppState === "connected" ? "text-emerald-300" : "text-amber-300"}>
                      {sidebarWhatsAppState === "connected" ? "WhatsApp listo" : "Configurar canal"}
                    </span>
                  </div>
                </div>
                {showManageShortcut ? (
                  <Link
                    href="/app/integrations"
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
                  >
                    <PhoneCall className="h-4 w-4" />
                    {sidebarActionLabel}
                  </Link>
                ) : null}
                {!showManageShortcut && showUsersShortcut ? (
                  <Link
                    href="/app/users"
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
                  >
                    <PhoneCall className="h-4 w-4" />
                    Gestionar usuarios
                  </Link>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: "/login" })}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--border)] bg-surface/65 px-4 py-3 text-sm font-medium text-muted transition-colors hover:text-text"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesion
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1">
          <div
            className={cn(
              "flex min-h-full min-w-0 flex-1 flex-col",
              isInboxRoute
                ? "min-h-[calc(100vh-40px)]"
                : "overflow-hidden rounded-[32px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] shadow-[0_32px_120px_rgba(0,0,0,0.30)]"
            )}
          >
            <header className="border-b border-[color:var(--border)] bg-surface/75 px-5 py-4 backdrop-blur xl:px-8">
              {topbar || (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setMobileNavOpen(true)}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-card/70 text-muted transition-colors hover:text-text xl:hidden"
                      aria-label="Abrir menu de navegacion"
                    >
                      <Menu className="h-4.5 w-4.5" />
                    </button>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">Portal del cliente</p>
                      <h1 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">
                        Gestiona conversaciones, automatizaciones y crecimiento
                      </h1>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ThemeToggleButton />
                    <Badge variant="muted">Espacio del cliente</Badge>
                    <Badge variant="success">Portal activo</Badge>
                    <Badge variant="outline" className="gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Operacion en vivo
                    </Badge>
                    {buildMarker ? <Badge variant="outline">Build {buildMarker}</Badge> : null}
                  </div>
                </div>
              )}
            </header>

            {buildLabel ? (
              <div
                className="border-b border-[color:var(--border)] bg-surface/55 px-5 py-2 font-mono text-[11px] font-medium tracking-[0.08em] text-muted xl:px-8"
                title={buildLabel}
              >
                {buildLabel}
              </div>
            ) : null}

            <main
              className={cn(
                "min-h-0 flex-1",
                isInboxRoute
                  ? "bg-transparent p-0"
                  : "bg-[radial-gradient(circle_at_top,rgba(176,80,0,0.10),transparent_26%)] p-5 xl:p-8"
              )}
            >
              {children}
            </main>
          </div>
        </div>
      </div>

      <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <DialogContent className="left-0 top-0 h-screen max-w-[320px] translate-x-0 translate-y-0 rounded-none border-l-0 border-t-0 border-b-0 border-r border-[color:var(--border)] bg-card/98 p-0 shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
          <div className="flex h-full flex-col">
            <DialogHeader className="border-b border-[color:var(--border)] px-5 py-4">
              <DialogTitle>Menu del portal</DialogTitle>
              <DialogDescription>Navega por todos los modulos del espacio desde telefono o tablet.</DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="mb-4 rounded-[20px] border border-brand/20 bg-[linear-gradient(135deg,rgba(192,80,0,0.18),rgba(16,16,16,0.94))] p-4">
                <p className="text-sm font-semibold">Espacio de trabajo Opturon</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tenantLabel ? <Badge variant="muted">{tenantLabel}</Badge> : null}
                  <Badge variant="success">Portal activo</Badge>
                  {buildMarker ? <Badge variant="outline">Build {buildMarker}</Badge> : null}
                </div>
              </div>

              <nav className="space-y-2">
                {visibleNavItems.map((item) => {
                  const active = item.match(pathname);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileNavOpen(false)}
                      className={cn(
                        "group flex items-start gap-3 rounded-2xl border px-4 py-3 transition-all duration-200",
                        active
                          ? "border-brand/35 bg-brand/10 text-text shadow-[0_0_0_1px_rgba(192,80,0,0.12)]"
                          : "border-transparent bg-transparent text-muted hover:border-[color:var(--border)] hover:bg-surface/70 hover:text-text"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors",
                          active
                            ? "border-brand/30 bg-brand/15 text-brandBright"
                            : "border-[color:var(--border)] bg-surface text-muted group-hover:text-text"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3">
                          <span className="font-medium">{item.label}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 opacity-40 transition-transform group-hover:translate-x-0.5" />
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted">{item.description}</span>
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="border-t border-[color:var(--border)] px-4 py-4">
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: "/login" })}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--border)] bg-surface/65 px-4 py-3 text-sm font-medium text-muted transition-colors hover:text-text"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesion
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
