"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { ChevronRight, LogOut, Menu, ShieldCheck, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatPartnerStatus,
  formatRankLabel,
  isPartnerPortalHost,
  PARTNER_PORTAL_NAV,
  partnerHrefForHost,
  partnerPublicPathForInternalPath
} from "@/lib/partners-portal";
import { cn } from "@/lib/ui/cn";

export function PartnerPortalShell({
  userName,
  userEmail,
  currentRank,
  accountStatus,
  requestHost,
  children
}: {
  userName: string;
  userEmail?: string | null;
  currentRank?: string | null;
  accountStatus?: string | null;
  requestHost?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [host, setHost] = useState(requestHost || "");
  const rankLabel = formatRankLabel(currentRank);
  const statusLabel = formatPartnerStatus(accountStatus);
  const partnerHost = isPartnerPortalHost(host);
  const signOutCallbackUrl = partnerHost ? "/login" : "/login?callbackUrl=/partners";

  useEffect(() => {
    setHost(window.location.host);
  }, []);

  function isActivePartnerNav(item: (typeof PARTNER_PORTAL_NAV)[number]) {
    return pathname === item.legacyHref || partnerPublicPathForInternalPath(pathname) === item.path;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.12),transparent_22%),radial-gradient(circle_at_15%_20%,rgba(251,191,36,0.12),transparent_18%),linear-gradient(180deg,#04111f_0%,#07182a_52%,#081423_100%)] text-slate-100">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(15,23,42,0.7),transparent)]" />
      <div className="mx-auto flex min-h-screen max-w-[1560px] gap-3 px-3 py-3 md:px-4 md:py-4">
        <aside className="hidden w-[296px] shrink-0 overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(7,18,34,0.96),rgba(9,20,37,0.92))] shadow-[0_24px_80px_rgba(2,8,23,0.55)] lg:flex lg:flex-col xl:w-[308px]">
          <div className="relative overflow-hidden border-b border-white/10 p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_28%),radial-gradient(circle_at_75%_15%,rgba(236,72,153,0.14),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
            <div className="relative">
              <PartnerPortalMark />
              <div className="mt-7 rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur">
                <Badge className="border-amber-400/20 bg-amber-300/10 text-amber-100">Canal de asesores</Badge>
                <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">Portal de asesores</h1>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  Seguimiento comercial, cartera visible y evolución profesional en una experiencia separada del CRM.
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-4">
            {PARTNER_PORTAL_NAV.map((item) => {
              const href = partnerHrefForHost(item.legacyHref, host);
              const active = isActivePartnerNav(item);
              return (
                <Link
                  key={item.legacyHref}
                  href={href}
                  className={cn(
                    "group flex items-center justify-between rounded-[22px] border px-4 py-3 text-sm font-medium transition-all",
                    active
                      ? "border-amber-300/25 bg-[linear-gradient(135deg,rgba(251,191,36,0.18),rgba(244,114,182,0.10))] text-white shadow-[0_20px_40px_rgba(15,23,42,0.25)]"
                      : "border-transparent bg-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span>{item.label}</span>
                  <ChevronRight className={cn("h-4 w-4 transition-transform", active ? "text-amber-200" : "text-slate-500 group-hover:translate-x-0.5 group-hover:text-slate-200")} />
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{userName}</p>
                  <p className="mt-1 truncate text-xs text-slate-400">{userEmail || "Cuenta de asesor"}</p>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
                  <ShieldCheck className="h-4 w-4" />
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Rango actual</p>
                  <p className="mt-2 text-sm font-semibold text-slate-100">{rankLabel}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Estado</p>
                  <p className="mt-2 text-sm font-semibold text-slate-100">{statusLabel}</p>
                </div>
              </div>

              <Button
                variant="secondary"
                className="mt-4 w-full justify-start border-white/10 bg-white/6 text-slate-100 hover:bg-white/10"
                onClick={() => void signOut({ callbackUrl: signOutCallbackUrl })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesion
              </Button>
            </div>
          </div>
        </aside>

        <div className="relative flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,18,34,0.88),rgba(8,19,35,0.82))] shadow-[0_24px_80px_rgba(2,8,23,0.55)] backdrop-blur">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.08),transparent_24%),radial-gradient(circle_at_left,rgba(244,114,182,0.08),transparent_20%)]" />
          <header className="relative flex min-h-[84px] items-center justify-between border-b border-white/10 px-4 py-4 md:px-6 lg:px-7 xl:px-8">
            <div className="min-w-0 max-w-[720px]">
              <Badge className="border-white/10 bg-white/6 text-slate-200">
                <Sparkles className="h-3.5 w-3.5" />
                Espacio de asesores
              </Badge>
              <p className="mt-3 truncate text-sm text-slate-400">Experiencia premium, comercial y aislada del CRM interno de Opturon.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 lg:flex">
                <span className="text-xs font-medium text-slate-300">{rankLabel}</span>
                <span className="h-1 w-1 rounded-full bg-slate-500" />
                <span className="text-xs text-slate-400">{statusLabel}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="border-white/10 bg-white/[0.06] text-slate-100 hover:bg-white/10 lg:hidden"
                onClick={() => setMobileOpen((value) => !value)}
              >
                <Menu className="mr-2 h-4 w-4" />
                Menu
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hidden text-slate-300 hover:bg-white/10 hover:text-white lg:inline-flex"
                onClick={() => void signOut({ callbackUrl: signOutCallbackUrl })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Salir
              </Button>
            </div>
          </header>

          {mobileOpen ? (
            <div className="absolute inset-0 z-20 lg:hidden">
              <button type="button" aria-label="Cerrar menu" className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
              <div className="absolute inset-y-0 left-0 w-[88%] max-w-[344px] border-r border-white/10 bg-[linear-gradient(180deg,rgba(7,18,34,0.98),rgba(9,20,37,0.96))] p-4 shadow-[0_24px_80px_rgba(2,8,23,0.62)]">
                <div className="flex items-start justify-between gap-3">
                  <PartnerPortalMark compact />
                  <Button variant="ghost" size="sm" className="text-slate-300 hover:bg-white/10 hover:text-white" onClick={() => setMobileOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.05] p-4">
                  <p className="truncate text-sm font-semibold text-white">{userName}</p>
                  <p className="mt-1 truncate text-xs text-slate-400">{userEmail || "Cuenta de asesor"}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge className="border-white/10 bg-white/6 text-slate-200">{rankLabel}</Badge>
                    <Badge className="border-emerald-300/20 bg-emerald-300/10 text-emerald-100">{statusLabel}</Badge>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-400">
                    Cartera, red, carrera y comisiones registradas en una vista separada del CRM interno.
                  </p>
                </div>

                <nav className="mt-5 grid gap-2">
                  {PARTNER_PORTAL_NAV.map((item) => {
                    const href = partnerHrefForHost(item.legacyHref, host);
                    const active = isActivePartnerNav(item);
                    return (
                      <Link
                        key={item.legacyHref}
                        href={href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "rounded-[22px] border px-4 py-3 text-sm font-medium transition-colors",
                          active
                            ? "border-amber-300/25 bg-[linear-gradient(135deg,rgba(251,191,36,0.18),rgba(244,114,182,0.10))] text-white"
                            : "border-white/10 bg-white/[0.04] text-slate-300"
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>

                <Button
                  variant="secondary"
                  className="mt-5 w-full justify-start border-white/10 bg-white/[0.06] text-slate-100 hover:bg-white/10"
                  onClick={() => void signOut({ callbackUrl: signOutCallbackUrl })}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesion
                </Button>
              </div>
            </div>
          ) : null}

          <main className="relative min-w-0 flex-1 px-4 py-5 md:px-6 lg:px-7 lg:py-7 xl:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

function PartnerPortalMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", compact ? "justify-center" : "")}>
      <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 shadow-[0_0_0_1px_rgba(251,191,36,0.08),0_18px_44px_rgba(244,114,182,0.12)]">
        <svg viewBox="0 0 32 32" aria-hidden="true" className="h-6 w-6 text-amber-200">
          <circle cx="16" cy="16" r="10.5" fill="none" stroke="currentColor" strokeWidth="5.5" />
          <circle cx="16" cy="16" r="3.2" fill="currentColor" opacity="0.22" />
        </svg>
      </span>
      {!compact ? (
        <div>
          <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">Opturon</p>
          <p className="text-sm font-semibold tracking-[0.02em] text-white">Portal de asesores</p>
        </div>
      ) : null}
    </div>
  );
}
