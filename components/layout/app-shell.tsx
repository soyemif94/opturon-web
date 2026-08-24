"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Bot,
  CircleDollarSign,
  ClipboardList,
  CalendarDays,
  ChartColumn,
  ChevronRight,
  Building2,
  ContactRound,
  FileText,
  Gift,
  HandCoins,
  Shield,
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
  Settings,
  Sparkles,
  TrendingUp,
  Users2,
  Warehouse,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { canAccessAppModule, canManageUsers, canManageWorkspace, type AppModule } from "@/lib/app-permissions";
import type { WhatsAppConnectionStatus } from "@/lib/whatsapp-channel-state";
import type { GlobalRole, TenantRole } from "@/lib/saas/types";
import { cn } from "@/lib/ui/cn";

type AuthGlobalRole = GlobalRole | "partner";

const navItems: Array<{
  href: string;
  label: string;
  description: string;
  icon: any;
  module: AppModule;
  adminOnly?: boolean;
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
    href: "/app/ops",
    label: "OPS",
    description: "Supervision comercial, alertas y accion rapida sobre leads",
    icon: Shield,
    module: "ops",
    match: (pathname: string) => pathname.startsWith("/app/ops")
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
    href: "/app/inventory",
    label: "Inventario",
    description: "Centro operativo de stock con alertas, reposicion y lectura bot-ready",
    icon: Warehouse,
    module: "inventory",
    match: (pathname: string) => pathname.startsWith("/app/inventory")
  },
  {
    href: "/app/orders",
    label: "Pedidos",
    description: "Pedidos internos, estados y preparacion desde el panel",
    icon: ClipboardList,
    module: "orders",
    match: (pathname: string) => pathname.startsWith("/app/orders")
  },
  {
    href: "/app/invoices",
    label: "Comprobantes",
    description: "Documentos internos, saldo y ciclo de pre-facturacion",
    icon: FileText,
    module: "invoices",
    match: (pathname: string) => pathname.startsWith("/app/invoices")
  },
  {
    href: "/app/payments",
    label: "Cobros",
    description: "Cobros registrados, estado y asignacion sobre comprobantes",
    icon: CircleDollarSign,
    module: "payments",
    match: (pathname: string) => pathname.startsWith("/app/payments")
  },
  {
    href: "/app/cash",
    label: "Caja",
    description: "Apertura, control operativo y cierre de cajas del comercio",
    icon: HandCoins,
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
    icon: Settings,
    module: "settings",
    match: (pathname: string) => pathname.startsWith("/app/settings")
  },
  {
    href: "/app/client-management",
    label: "Gesti\u00f3n de clientes",
    description: "Planes, l\u00edmites, m\u00f3dulos y capacidades por tenant",
    icon: Building2,
    module: "settings",
    adminOnly: true,
    match: (pathname: string) => pathname.startsWith("/app/client-management")
  },
  {
    href: "/app/admin/operational-alerts",
    label: "Canario de alertas",
    description: "Control manual, preflight e historial de alertas operativas",
    icon: Shield,
    module: "settings",
    adminOnly: true,
    match: (pathname: string) => pathname.startsWith("/app/admin/operational-alerts")
  },
  {
    href: "/app/partners",
    label: "Red de asesores",
    description: "Partners, sponsors, clientes atribuidos y estado comercial",
    icon: Users2,
    module: "settings",
    adminOnly: true,
    match: (pathname: string) => pathname.startsWith("/app/partners")
  }
];

const APP_THEME_STORAGE_KEY = "opturon-app-theme";
const APP_SIDEBAR_STORAGE_KEY = "opturon-desktop-sidebar-expanded";

function SidebarPanel({
  pathname,
  visibleNavItems,
  tenantLabel,
  buildMarker,
  buildLabel,
  sidebarChannelTone,
  sidebarChannelStatusLabel,
  sidebarWhatsAppState,
  sidebarActionLabel,
  showManageShortcut,
  showUsersShortcut,
  onNavigate,
  onSignOut,
  inventoryAlertCount
}: {
  pathname: string;
  visibleNavItems: typeof navItems;
  tenantLabel?: string;
  buildMarker?: string;
  buildLabel: string;
  sidebarChannelTone: string;
  sidebarChannelStatusLabel: string;
  sidebarWhatsAppState: string;
  sidebarActionLabel: string;
  showManageShortcut: boolean;
  showUsersShortcut: boolean;
  onNavigate?: () => void;
  onSignOut: () => void;
  inventoryAlertCount: number;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[30px] border border-[color:var(--border)] bg-card/95 p-3 shadow-[var(--card-shadow-strong)] backdrop-blur-xl sm:p-5">
      <div className="absolute inset-0 bg-[image:var(--sidebar-overlay)]" />

      <div className="relative min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="rounded-[20px] border border-brand/20 bg-[image:var(--sidebar-hero-gradient)] p-3 sm:rounded-[24px] sm:p-5">
          <Badge variant="warning" className="border-brand/30 bg-brand/10 text-brandBright">
            Portal cliente
          </Badge>
          <h2 className="mt-2 text-base font-semibold tracking-tight sm:mt-4 sm:text-2xl">Espacio de trabajo Opturon</h2>
          <p className="mt-2 hidden text-sm leading-6 text-muted sm:block">
            Conversaciones, agenda operativa y canal WhatsApp en una vista simple para el negocio.
          </p>
          <div className="mt-2 flex flex-wrap gap-2 sm:mt-5">
            {tenantLabel ? <Badge variant="muted">{tenantLabel}</Badge> : null}
            <Badge variant="success">Espacio activo</Badge>
            {buildMarker ? <Badge variant="outline">Build {buildMarker}</Badge> : null}
          </div>
          {buildLabel ? (
            <p className="mt-3 hidden font-mono text-[11px] font-medium tracking-[0.12em] text-muted sm:block" title={buildLabel}>
              {buildLabel}
            </p>
          ) : null}
        </div>

        <nav className="mt-3 space-y-1 sm:mt-6 sm:space-y-2">
          {visibleNavItems.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group flex min-h-11 items-center gap-3 rounded-xl border px-3 py-1.5 transition-all duration-200 sm:items-start sm:rounded-2xl sm:px-4 sm:py-3",
                  active
                    ? "border-brand/35 bg-brand/10 text-text shadow-[0_0_0_1px_rgba(192,80,0,0.12)]"
                    : "border-transparent bg-transparent text-muted hover:border-[color:var(--border)] hover:bg-surface/70 hover:text-text"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors sm:mt-0.5 sm:h-10 sm:w-10 sm:rounded-2xl",
                    active
                      ? "border-brand/30 bg-brand/15 text-brandBright"
                      : "border-[color:var(--border)] bg-surface text-muted group-hover:text-text"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 font-medium">
                      {item.label}
                      {item.href === "/app/inventory" && inventoryAlertCount > 0 ? (
                        <span className="rounded-full border border-rose-400/25 bg-rose-500/12 px-2 py-0.5 text-[11px] text-rose-200">{inventoryAlertCount}</span>
                      ) : null}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-40 transition-transform group-hover:translate-x-0.5" />
                  </span>
                  <span className="mt-1 hidden text-xs leading-5 text-muted sm:block">{item.description}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-3 rounded-[20px] border border-[color:var(--border)] bg-surface/75 p-3 sm:mt-6 sm:rounded-[24px] sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Canal principal</p>
              <p className="mt-1 text-sm font-medium">Conecta tu WhatsApp en 2 minutos</p>
            </div>
            <Headset className="h-4 w-4 text-brandBright" />
          </div>
          <div className="mt-3 hidden space-y-3 text-sm text-muted sm:block">
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
              onClick={onNavigate}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-medium text-white transition-transform hover:-translate-y-0.5 sm:mt-4 sm:py-3"
            >
              <PhoneCall className="h-4 w-4" />
              {sidebarActionLabel}
            </Link>
          ) : null}
          {!showManageShortcut && showUsersShortcut ? (
            <Link
              href="/app/users"
              onClick={onNavigate}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-medium text-white transition-transform hover:-translate-y-0.5 sm:mt-4 sm:py-3"
            >
              <PhoneCall className="h-4 w-4" />
              Gestionar usuarios
            </Link>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--border)] bg-surface/65 px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-text sm:mt-4 sm:py-3"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesion
        </button>
      </div>
    </div>
  );
}

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

function OpturonMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", compact ? "justify-center" : "")}>
      <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand/30 bg-brand/10 shadow-[0_0_0_1px_rgba(192,80,0,0.08),0_20px_48px_rgba(176,80,0,0.14)]">
        <svg
          viewBox="0 0 32 32"
          aria-hidden="true"
          className="h-6 w-6 text-brandBright drop-shadow-[0_4px_10px_rgba(255,122,0,0.18)]"
        >
          <circle cx="16" cy="16" r="10.5" fill="none" stroke="currentColor" strokeWidth="5.5" />
          <circle cx="16" cy="16" r="3.2" fill="currentColor" opacity="0.16" />
        </svg>
      </span>
      {!compact ? (
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Opturon</p>
          <p className="text-sm font-semibold tracking-[0.02em] text-text">CRM comercial</p>
        </div>
      ) : null}
    </div>
  );
}

function DesktopRail({
  pathname,
  visibleNavItems,
  onSignOut,
  inventoryAlertCount,
  expanded,
  onToggle
}: {
  pathname: string;
  visibleNavItems: typeof navItems;
  onSignOut: () => void;
  inventoryAlertCount: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      data-desktop-sidebar
      data-sidebar-state={expanded ? "expanded" : "collapsed"}
      className={cn(
        "hidden shrink-0 self-start overflow-x-hidden xl:block",
        "motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none",
        expanded ? "w-[272px]" : "w-[92px]"
      )}
    >
      <div className="relative sticky top-3 flex max-h-[calc(100dvh-1.5rem)] min-h-0 w-full flex-col items-center overflow-hidden rounded-[30px] border border-[color:var(--border)] bg-card/92 px-3 py-4 shadow-[var(--card-shadow-strong)] backdrop-blur-xl md:max-h-[calc(100dvh-2.5rem)]">
        <div className="absolute inset-0 rounded-[30px] bg-[image:var(--rail-overlay)]" />
        <div className="relative flex h-full min-h-0 w-full flex-col items-center overflow-hidden">
          <button
            type="button"
            data-sidebar-toggle
            onClick={onToggle}
            className={cn(
              "flex h-12 w-full shrink-0 items-center rounded-2xl text-left",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright focus-visible:ring-offset-2 focus-visible:ring-offset-card",
              expanded ? "justify-start px-0.5" : "justify-center"
            )}
            aria-label={expanded ? "Contraer navegación" : "Expandir navegación"}
            aria-expanded={expanded}
            title={expanded ? "Contraer navegación" : "Expandir navegación"}
          >
            <OpturonMark compact={!expanded} />
          </button>

          <nav
            data-sidebar-nav
            aria-label="Navegación principal"
            className={cn(
              "mt-6 flex min-h-0 w-full flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto overscroll-contain",
              "[scrollbar-gutter:stable_both-edges] [scrollbar-width:thin]",
              expanded ? "items-stretch" : "items-center"
            )}
          >
            {visibleNavItems.map((item) => {
              const active = item.match(pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  data-sidebar-nav-item
                  data-active={active ? "true" : "false"}
                  className={cn(
                    "group relative inline-flex h-11 shrink-0 items-center rounded-2xl border",
                    "transition-[color,background-color,border-color,box-shadow] duration-200 motion-reduce:transition-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright focus-visible:ring-offset-1 focus-visible:ring-offset-card",
                    expanded ? "w-full justify-start gap-3 px-3" : "w-11 justify-center px-0",
                    active
                      ? "border-brand/35 bg-brand/16 text-brandBright shadow-[0_0_0_1px_rgba(192,80,0,0.14),0_18px_40px_rgba(176,80,0,0.18)]"
                      : "border-transparent bg-transparent text-muted hover:border-[color:var(--border)] hover:bg-surface/75 hover:text-text"
                  )}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  title={expanded ? undefined : item.label}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span
                    aria-hidden={!expanded}
                    className={cn(
                      "min-w-0 overflow-hidden whitespace-nowrap text-sm font-medium",
                      "motion-safe:transition-[max-width,opacity] motion-safe:duration-150 motion-reduce:transition-none",
                      expanded ? "max-w-[172px] opacity-100" : "max-w-0 opacity-0"
                    )}
                  >
                    {item.label}
                  </span>
                  {item.href === "/app/inventory" && inventoryAlertCount > 0 ? (
                    <span className={cn(
                      "rounded-full border border-card bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white",
                      expanded ? "ml-auto" : "absolute right-0 top-0"
                    )}>
                      {inventoryAlertCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={onSignOut}
            data-sidebar-sign-out
            className={cn(
              "group relative mt-4 inline-flex h-11 shrink-0 items-center rounded-2xl border border-[color:var(--border)] bg-surface/72 text-muted transition-colors hover:text-text",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright focus-visible:ring-offset-1 focus-visible:ring-offset-card",
              expanded ? "w-full justify-start gap-3 px-3" : "w-11 justify-center px-0"
            )}
            aria-label="Cerrar sesion"
            title={expanded ? undefined : "Cerrar sesion"}
          >
            <LogOut className="h-4.5 w-4.5 shrink-0" />
            <span
              aria-hidden={!expanded}
              className={cn(
                "overflow-hidden whitespace-nowrap text-sm font-medium",
                "motion-safe:transition-[max-width,opacity] motion-safe:duration-150 motion-reduce:transition-none",
                expanded ? "max-w-[172px] opacity-100" : "max-w-0 opacity-0"
              )}
            >
              Cerrar sesion
            </span>
          </button>
        </div>
      </div>
    </aside>
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
  accountScope,
  tenantModules,
  whatsappStatus
}: {
  children: React.ReactNode;
  tenantId?: string | null;
  tenantLabel?: string;
  topbar?: React.ReactNode;
  buildMarker?: string;
  buildEnv?: string;
  deploymentId?: string;
  globalRole?: AuthGlobalRole;
  tenantRole?: TenantRole;
  accountScope?: string;
  tenantModules?: Record<string, boolean> | null;
  whatsappStatus?: WhatsAppConnectionStatus;
}) {
  const pathname = usePathname();
  const isInboxRoute = pathname.startsWith("/app/inbox");
  const accessContext = { globalRole, tenantRole, accountScope, tenantModules };
  const isOpturonAdmin = (globalRole === "superadmin" || globalRole === "ops_admin") && accountScope === "opturon_admin";
  const visibleNavItems = navItems.filter((item) => canAccessAppModule(accessContext, item.module) && (!item.adminOnly || isOpturonAdmin));
  const showManageShortcut = canManageWorkspace(accessContext);
  const showUsersShortcut = canManageUsers(accessContext);
  const [sidebarStatus, setSidebarStatus] = useState<WhatsAppConnectionStatus | undefined>(whatsappStatus);
  const [inventoryAlertCount, setInventoryAlertCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopNavExpanded, setDesktopNavExpanded] = useState(false);
  const [desktopNavPreferenceLoaded, setDesktopNavPreferenceLoaded] = useState(false);
  const previousPathnameRef = useRef(pathname);
  const activePathnameRef = useRef(pathname);
  const opsLockSentRef = useRef(false);

  function sendOpsLockRequest() {
    if (!activePathnameRef.current.startsWith("/app/ops") || opsLockSentRef.current) {
      return;
    }

    opsLockSentRef.current = true;

    try {
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const beaconSent = navigator.sendBeacon("/api/app/ops/lock", new Blob([], { type: "application/json" }));
        if (beaconSent) {
          return;
        }
      }
    } catch {
      // Fall through to fetch keepalive.
    }

    void fetch("/api/app/ops/lock", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      keepalive: true
    }).catch(() => {
      // The next visit to /app/ops will still validate server-side.
    });
  }

  useEffect(() => {
    setSidebarStatus(whatsappStatus);
  }, [whatsappStatus]);

  useEffect(() => {
    try {
      setDesktopNavExpanded(window.localStorage.getItem(APP_SIDEBAR_STORAGE_KEY) === "true");
    } catch {
      setDesktopNavExpanded(false);
    } finally {
      setDesktopNavPreferenceLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!desktopNavPreferenceLoaded) return;
    try {
      window.localStorage.setItem(APP_SIDEBAR_STORAGE_KEY, String(desktopNavExpanded));
    } catch {
      // Navigation remains usable when browser storage is unavailable.
    }
  }, [desktopNavExpanded, desktopNavPreferenceLoaded]);

  useEffect(() => {
    activePathnameRef.current = pathname;

    if (pathname.startsWith("/app/ops")) {
      opsLockSentRef.current = false;
    }

    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;

    if (!previousPathname.startsWith("/app/ops") || pathname.startsWith("/app/ops")) {
      return;
    }

    activePathnameRef.current = previousPathname;
    sendOpsLockRequest();
    activePathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        sendOpsLockRequest();
      }
    }

    function handleBeforeUnload() {
      sendOpsLockRequest();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

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

  useEffect(() => {
    if (!tenantId) return;
    if (!pathname.startsWith("/app/inventory")) return;
    const controller = new AbortController();
    void fetch("/api/app/inventory/expiration-summary", {
      cache: "no-store",
      signal: controller.signal
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const data = payload?.summary;
        if (!data) return;
        setInventoryAlertCount(Number(data.expiredLots || 0) + Number(data.urgentLots || 0));
      })
      .catch(() => {
        // Badge is helpful but never blocks navigation.
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
    <section
      data-app-shell
      data-desktop-sidebar-state={desktopNavExpanded ? "expanded" : "collapsed"}
      className="min-h-dvh w-full overflow-x-hidden bg-[color:var(--bg)] px-3 py-3 text-[color:var(--text)] md:px-5 md:py-5"
    >
      <div className="flex min-h-[calc(100dvh-1.5rem)] w-full items-stretch gap-3 md:min-h-[calc(100dvh-2.5rem)] md:gap-5">
        <DesktopRail
          pathname={pathname}
          visibleNavItems={visibleNavItems}
          inventoryAlertCount={inventoryAlertCount}
          expanded={desktopNavExpanded}
          onToggle={() => setDesktopNavExpanded((current) => !current)}
          onSignOut={() => void signOut({ callbackUrl: "/login" })}
        />

        <div className="flex min-w-0 flex-1">
          <div
            className={cn(
              "flex min-h-[calc(100dvh-1.5rem)] min-w-0 flex-1 flex-col md:min-h-[calc(100dvh-2.5rem)]",
              isInboxRoute
                ? "h-[calc(100dvh-1.5rem)] min-h-0 overflow-hidden rounded-[32px] border border-[color:var(--border)] bg-[image:var(--shell-gradient)] shadow-[var(--shell-shadow)] md:h-[calc(100dvh-2.5rem)]"
                : "overflow-hidden rounded-[32px] border border-[color:var(--border)] bg-[image:var(--shell-gradient)] shadow-[var(--shell-shadow)]"
            )}
          >
            <header className="shrink-0 border-b border-[color:var(--border)] bg-surface/75 px-3 py-2.5 backdrop-blur sm:px-5 sm:py-4 xl:px-8">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-card/70 text-muted transition-colors hover:text-text xl:hidden"
                  aria-label="Abrir menu de navegacion"
                >
                  <Menu className="h-4.5 w-4.5" />
                </button>

                <div className="min-w-0 flex-1">
                  {topbar || (
                    <div className="flex flex-col gap-2 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="hidden text-xs uppercase tracking-[0.24em] text-muted sm:block">Portal del cliente</p>
                        <h1 className="text-base font-semibold tracking-tight sm:mt-1 sm:text-xl md:text-2xl">
                          <span className="sm:hidden">Portal del cliente</span>
                          <span className="hidden sm:inline">Gestiona conversaciones, automatizaciones y crecimiento</span>
                        </h1>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <ThemeToggleButton />
                        <Badge variant="muted" className="hidden md:inline-flex">Espacio del cliente</Badge>
                        <Badge variant="success">Portal activo</Badge>
                        <Badge variant="outline" className="hidden gap-1.5 md:inline-flex">
                          <Sparkles className="h-3.5 w-3.5" />
                          Operacion en vivo
                        </Badge>
                        {buildMarker ? <Badge variant="outline">Build {buildMarker}</Badge> : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {buildLabel ? (
              <div
                className="hidden shrink-0 border-b border-[color:var(--border)] bg-surface/55 px-5 py-2 font-mono text-[11px] font-medium tracking-[0.08em] text-muted md:block xl:px-8"
                title={buildLabel}
              >
                {buildLabel}
              </div>
            ) : null}

            <main
              className={cn(
                "flex-1 min-h-0",
                isInboxRoute
                  ? "flex min-h-0 flex-1 flex-col overflow-hidden bg-[image:var(--panel-glow)] p-2 sm:p-4 xl:p-6"
                  : "overflow-x-visible overflow-y-auto bg-[image:var(--panel-glow)] p-5 xl:p-8"
              )}
            >
              {children}
            </main>
          </div>
        </div>
      </div>

      <Dialog open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <DialogContent className="left-0 top-0 h-dvh max-h-dvh max-w-[340px] translate-x-0 translate-y-0 rounded-none border-l-0 border-t-0 border-b-0 border-r border-[color:var(--border)] bg-transparent p-3 shadow-none sm:max-w-[360px] md:p-5">
          <DialogHeader className="sr-only">
            <DialogTitle>Menu del portal</DialogTitle>
            <DialogDescription>Navega por todos los modulos del espacio de trabajo.</DialogDescription>
          </DialogHeader>
          <SidebarPanel
            pathname={pathname}
            visibleNavItems={visibleNavItems}
            tenantLabel={tenantLabel}
            buildMarker={buildMarker}
            buildLabel={buildLabel}
            sidebarChannelTone={sidebarChannelTone}
            sidebarChannelStatusLabel={sidebarChannelStatusLabel}
            sidebarWhatsAppState={sidebarWhatsAppState}
            sidebarActionLabel={sidebarActionLabel}
            showManageShortcut={showManageShortcut}
            showUsersShortcut={showUsersShortcut}
            onNavigate={() => setSidebarOpen(false)}
            inventoryAlertCount={inventoryAlertCount}
            onSignOut={() => void signOut({ callbackUrl: "/login" })}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
