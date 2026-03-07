"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  CalendarDays,
  ChartColumn,
  ChevronRight,
  ContactRound,
  Headset,
  House,
  MessageSquareText,
  PhoneCall,
  PlugZap,
  Settings2,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/ui/cn";

const navItems = [
  {
    href: "/app",
    label: "Inicio",
    description: "Resumen de actividad, canal y accesos rapidos",
    icon: House,
    match: (pathname: string) => pathname === "/app"
  },
  {
    href: "/app/inbox",
    label: "Inbox",
    description: "Conversaciones, chat y contexto del contacto",
    icon: MessageSquareText,
    match: (pathname: string) => pathname.startsWith("/app/inbox")
  },
  {
    href: "/app/contacts",
    label: "Contactos",
    description: "Base CRM simple con ultimas interacciones",
    icon: ContactRound,
    match: (pathname: string) => pathname.startsWith("/app/contacts")
  },
  {
    href: "/app/automations",
    label: "Automatizaciones",
    description: "Flujos del bot, respuestas y reglas",
    icon: Bot,
    match: (pathname: string) => pathname.startsWith("/app/automations")
  },
  {
    href: "/app/agenda",
    label: "Agenda",
    description: "Pendientes, seguimientos y proxima atencion",
    icon: CalendarDays,
    match: (pathname: string) => pathname.startsWith("/app/agenda")
  },
  {
    href: "/app/metrics",
    label: "Metricas",
    description: "Conversaciones, leads y performance",
    icon: ChartColumn,
    match: (pathname: string) => pathname.startsWith("/app/metrics")
  },
  {
    href: "/app/integrations",
    label: "Integraciones",
    description: "WhatsApp, CRM y proximas conexiones",
    icon: PlugZap,
    match: (pathname: string) => pathname.startsWith("/app/integrations")
  },
  {
    href: "/app/settings",
    label: "Configuracion",
    description: "Cuenta, negocio y preferencias del portal",
    icon: Settings2,
    match: (pathname: string) => pathname.startsWith("/app/settings")
  }
];

export function AppShell({
  children,
  tenantLabel,
  topbar,
  buildMarker,
  buildEnv,
  deploymentId
}: {
  children: React.ReactNode;
  tenantLabel?: string;
  topbar?: React.ReactNode;
  buildMarker?: string;
  buildEnv?: string;
  deploymentId?: string;
}) {
  const pathname = usePathname();
  const isInboxRoute = pathname.startsWith("/app/inbox");
  const buildLabel = [
    buildMarker ? `Build ${buildMarker}` : null,
    buildEnv ? `Env ${buildEnv}` : null,
    deploymentId ? `Deploy ${deploymentId}` : null
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <section className="w-full px-5 py-5">
      <div className="flex min-h-[calc(100vh-40px)] w-full gap-5">
        <aside className="hidden w-[304px] shrink-0 xl:block">
          <div className="sticky top-5 overflow-hidden rounded-[30px] border border-[color:var(--border)] bg-card/85 p-5 shadow-[0_28px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(192,80,0,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(176,80,0,0.08),transparent_34%)]" />

            <div className="relative">
              <div className="rounded-[24px] border border-brand/20 bg-[linear-gradient(135deg,rgba(192,80,0,0.18),rgba(16,16,16,0.94))] p-5">
                <Badge variant="warning" className="border-brand/30 bg-brand/10 text-brandBright">
                  Portal cliente
                </Badge>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight">Opturon Workspace</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Conversaciones, automatizaciones y canal WhatsApp en una vista simple para el negocio.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {tenantLabel ? <Badge variant="muted">{tenantLabel}</Badge> : null}
                  <Badge variant="success">Demo ready</Badge>
                  {buildMarker ? <Badge variant="outline">Build {buildMarker}</Badge> : null}
                </div>
                {buildLabel ? (
                  <p className="mt-3 font-mono text-[11px] font-medium tracking-[0.12em] text-muted" title={buildLabel}>
                    {buildLabel}
                  </p>
                ) : null}
              </div>

              <nav className="mt-6 space-y-2">
                {navItems.map((item) => {
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
                    <span className="text-amber-300">No conectado</span>
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
                    <span className="text-amber-300">Proximo paso</span>
                  </div>
                </div>
                <Link
                  href="/app/integrations"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
                >
                  <PhoneCall className="h-4 w-4" />
                  Conectar WhatsApp
                </Link>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div
            className={cn(
              isInboxRoute
                ? "min-h-[calc(100vh-40px)]"
                : "overflow-hidden rounded-[32px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] shadow-[0_32px_120px_rgba(0,0,0,0.30)]"
            )}
          >
            <header className="border-b border-[color:var(--border)] bg-surface/75 px-5 py-4 backdrop-blur xl:px-8">
              {topbar || (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">Client portal</p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight">Gestiona conversaciones, automatizaciones y crecimiento</h1>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="muted">Workspace cliente</Badge>
                    <Badge variant="success">Portal activo</Badge>
                    <Badge variant="outline" className="gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Demo comercial
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

            <div className="border-b border-[color:var(--border)] bg-card/50 px-4 py-3 xl:hidden">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {navItems.map((item) => {
                  const active = item.match(pathname);

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={cn(
                        "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "border-brand/35 bg-brand/10 text-text"
                          : "border-[color:var(--border)] bg-surface/70 text-muted hover:text-text"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <main
              className={cn(
                "min-h-[calc(100vh-140px)]",
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
    </section>
  );
}
