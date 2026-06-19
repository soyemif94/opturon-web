"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { BriefcaseBusiness, ChevronRight, LogOut, Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PARTNER_PORTAL_NAV } from "@/lib/partners-portal";
import { cn } from "@/lib/ui/cn";

export function PartnerPortalShell({
  userName,
  userEmail,
  children
}: {
  userName: string;
  userEmail?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef7f5_0%,#f7fafc_48%,#edf5f7_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-4 px-3 py-3 md:px-4 md:py-4">
        <aside className="hidden w-[292px] shrink-0 overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(242,249,247,0.94))] p-5 shadow-[0_28px_90px_rgba(15,23,42,0.10)] lg:flex lg:flex-col">
          <div className="rounded-[28px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(243,248,249,0.92))] p-5">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Opturon</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Portal de asesores</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Clientes, carrera y comisiones en una interfaz preparada para evolucionar a `partners.opturon.com`.
            </p>
          </div>

          <nav className="mt-6 flex-1 space-y-2">
            {PARTNER_PORTAL_NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition-all",
                    active
                      ? "border-emerald-200 bg-emerald-50 text-slate-950 shadow-[0_12px_28px_rgba(16,185,129,0.08)]"
                      : "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-950"
                  )}
                >
                  <span>{item.label}</span>
                  <ChevronRight className={cn("h-4 w-4 transition-transform", active ? "text-emerald-600" : "text-slate-400 group-hover:translate-x-0.5")} />
                </Link>
              );
            })}
          </nav>

          <div className="rounded-[24px] border border-slate-200/80 bg-white/85 p-4">
            <p className="text-sm font-semibold text-slate-950">{userName}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{userEmail || "Cuenta partner"}</p>
            <Button variant="secondary" className="mt-4 w-full justify-start text-slate-700" onClick={() => void signOut({ callbackUrl: "/login" })}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesion
            </Button>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/82 shadow-[0_28px_90px_rgba(15,23,42,0.10)] backdrop-blur">
          <header className="flex items-center justify-between border-b border-slate-200/80 px-4 py-4 md:px-6 lg:px-8">
            <div className="min-w-0">
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                Portal de asesores
              </Badge>
              <p className="mt-2 truncate text-sm text-slate-500">Experiencia separada del CRM y de la consola interna.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setMobileOpen((value) => !value)}>
                <Menu className="mr-2 h-4 w-4" />
                Menu
              </Button>
              <Button variant="ghost" size="sm" className="hidden text-slate-600 lg:inline-flex" onClick={() => void signOut({ callbackUrl: "/login" })}>
                <LogOut className="mr-2 h-4 w-4" />
                Salir
              </Button>
            </div>
          </header>

          {mobileOpen ? (
            <div className="border-b border-slate-200/80 bg-slate-50/80 px-4 py-4 lg:hidden">
              <nav className="grid gap-2">
                {PARTNER_PORTAL_NAV.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-sm font-medium transition-colors",
                        active ? "border-emerald-200 bg-emerald-50 text-slate-950" : "border-slate-200 bg-white text-slate-600"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                <Button variant="secondary" className="justify-start" onClick={() => void signOut({ callbackUrl: "/login" })}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesion
                </Button>
              </nav>
            </div>
          ) : null}

          <main className="min-w-0 flex-1 px-4 py-5 md:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
