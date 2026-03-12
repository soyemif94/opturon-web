"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BellRing,
  Building2,
  Cable,
  ChevronRight,
  Gauge,
  Inbox,
  LayoutDashboard,
  Settings2,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/ui/cn";

const navItems = [
  {
    href: "/ops",
    label: "Dashboard",
    description: "Vista ejecutiva y salud general",
    icon: LayoutDashboard,
    match: (pathname: string) => pathname === "/ops"
  },
  {
    href: "/ops/tenants",
    label: "Clientes",
    description: "Tenants, owners y estado comercial",
    icon: Building2,
    match: (pathname: string) => pathname.startsWith("/ops/tenants")
  },
  {
    href: "/ops#onboarding",
    label: "Onboarding",
    description: "Implementaciones y activaciones",
    icon: Sparkles,
    match: (pathname: string) => pathname === "/ops"
  },
  {
    href: "/ops/inbox",
    label: "Inbox global",
    description: "Conversaciones y SLA pendientes",
    icon: Inbox,
    match: (pathname: string) => pathname.startsWith("/ops/inbox")
  },
  {
    href: "/ops#channels",
    label: "Canales",
    description: "WABA, phone IDs y conectividad",
    icon: Cable,
    match: (pathname: string) => pathname === "/ops"
  },
  {
    href: "/ops#metrics",
    label: "Metricas",
    description: "Actividad, automatizacion y health",
    icon: Gauge,
    match: (pathname: string) => pathname === "/ops"
  },
  {
    href: "/ops#incidents",
    label: "Incidencias",
    description: "Alertas y seguimiento operativo",
    icon: AlertTriangle,
    match: (pathname: string) => pathname === "/ops"
  },
  {
    href: "/ops#settings",
    label: "Configuracion",
    description: "Checklist de setup y gobierno",
    icon: Settings2,
    match: (pathname: string) => pathname === "/ops"
  }
];

export function OpsShell({ children, topbar }: { children: React.ReactNode; topbar?: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <section className="container-opt py-5">
      <div className="flex min-h-[calc(100vh-40px)] gap-5">
        <aside className="hidden w-[304px] shrink-0 xl:block">
          <div className="sticky top-5 overflow-hidden rounded-[30px] border border-[color:var(--border)] bg-card/85 p-5 shadow-[0_28px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(192,80,0,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(176,80,0,0.12),transparent_34%)]" />

            <div className="relative">
              <div className="rounded-[24px] border border-brand/20 bg-[linear-gradient(135deg,rgba(192,80,0,0.18),rgba(16,16,16,0.92))] p-5">
                <Badge variant="warning" className="border-brand/30 bg-brand/10 text-brandBright">
                  Opturon Ops
                </Badge>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight">Centro operativo SaaS</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Operacion unificada de clientes, onboarding, canales y conversaciones.
                </p>
                <div className="mt-5 flex items-center gap-2">
                  <Badge variant="success">Live workspace</Badge>
                  <Badge variant="muted">Multi-tenant</Badge>
                </div>
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
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">Estado plataforma</p>
                    <p className="mt-1 text-sm font-medium">Monitoreo activo</p>
                  </div>
                  <Activity className="h-4 w-4 text-emerald-300" />
                </div>
                <div className="mt-4 space-y-3 text-sm text-muted">
                  <div className="flex items-center justify-between">
                    <span>Automations</span>
                    <span className="text-emerald-300">Operativas</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Canales Cloud</span>
                    <span className="text-text">Revisados</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Alertas</span>
                    <span className="text-amber-300">Seguimiento diario</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-[32px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] shadow-[0_32px_120px_rgba(0,0,0,0.30)]">
            <header className="border-b border-[color:var(--border)] bg-surface/75 px-5 py-4 backdrop-blur xl:px-8">
              {topbar || (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">Opturon SaaS Operations</p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight">Vista unificada de clientes y canales</h1>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="muted">Ops mode</Badge>
                    <Badge variant="success">Acceso staff</Badge>
                    <Badge variant="outline" className="gap-1.5">
                      <BellRing className="h-3.5 w-3.5" />
                      Alertas operativas
                    </Badge>
                  </div>
                </div>
              )}
            </header>

            <main className="min-h-[calc(100vh-140px)] bg-[radial-gradient(circle_at_top,rgba(176,80,0,0.10),transparent_26%)] p-5 xl:p-8">
              {children}
            </main>
          </div>
        </div>
      </div>
    </section>
  );
}
