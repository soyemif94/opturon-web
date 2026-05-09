"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, CirclePercent, ClipboardList, HandCoins, MessageSquareText, Search, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PortalSalesMetrics, PortalSalesOpportunity, PortalSalesSummary } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMoney, formatDateTimeLabel, relativeDateLabel, titleCaseLabel } from "@/lib/billing";

const PRIMARY_OPPORTUNITY_LIMIT = 20;

type SalesHubProps = {
  summary: PortalSalesSummary;
  metrics: PortalSalesMetrics;
  opportunities: PortalSalesOpportunity[];
};

type SalesListMode = "main" | "archive";
type SalesOpportunityFilter = "all" | "closed" | "open" | "active_conversations";

export function SalesHub({ summary, metrics, opportunities }: SalesHubProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [listMode, setListMode] = useState<SalesListMode>("main");
  const [searchQuery, setSearchQuery] = useState("");
  const activeFilter = resolveOpportunityFilter(searchParams.get("view"));

  const stats = [
    {
      label: "Ventas del dia",
      value: formatMoney(summary.salesToday),
      helper: "Cobros cerrados hoy dentro del espacio.",
      icon: HandCoins
    },
    {
      label: "Ventas del mes",
      value: formatMoney(summary.salesMonth),
      helper: "Ingreso cobrado en el mes actual.",
      icon: TrendingUp
    },
    {
      label: "Oportunidades activas",
      value: String(summary.activeOpportunities),
      helper: "Operaciones que siguen en seguimiento comercial.",
      icon: ClipboardList
    },
    {
      label: "Tasa de cierre",
      value: `${summary.closeRate}%`,
      helper: "Ventas cobradas sobre el universo comercial visible.",
      icon: CirclePercent
    },
    {
      label: "Ticket promedio",
      value: formatMoney(summary.averageTicket),
      helper: "Promedio de ventas efectivamente cobradas.",
      icon: ArrowUpRight
    }
  ];

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const stageFilteredOpportunities = useMemo(() => {
    return opportunities.filter((item) => matchesOpportunityFilter(item, activeFilter));
  }, [activeFilter, opportunities]);

  const filteredOpportunities = useMemo(() => {
    if (!normalizedSearch) return opportunities;
    return opportunities.filter((item) => {
      const haystack = [
        item.customer.name,
        item.customer.phone,
        item.contactId,
        item.source,
        item.responsible?.name,
        item.commercialStage,
        item.collectionStatusLabel
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [normalizedSearch, opportunities]);
  const visibleFilteredOpportunities = useMemo(() => {
    if (!normalizedSearch) return stageFilteredOpportunities;
    return stageFilteredOpportunities.filter((item) => {
      const haystack = [
        item.customer.name,
        item.customer.phone,
        item.contactId,
        item.source,
        item.responsible?.name,
        item.commercialStage,
        item.collectionStatusLabel
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [normalizedSearch, stageFilteredOpportunities]);

  const visibleOpportunities =
    activeFilter === "all" && listMode === "main"
      ? visibleFilteredOpportunities.slice(0, PRIMARY_OPPORTUNITY_LIMIT)
      : visibleFilteredOpportunities;
  const archivedCount =
    activeFilter === "all" ? Math.max(visibleFilteredOpportunities.length - PRIMARY_OPPORTUNITY_LIMIT, 0) : 0;

  function setOpportunityFilter(nextFilter: SalesOpportunityFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextFilter === "all") {
      params.delete("view");
    } else {
      params.set("view", nextFilter);
    }
    const nextQuery = params.toString();
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="border-white/6 bg-card/90">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">{item.label}</p>
                    <p className="mt-3 text-2xl font-semibold">{item.value}</p>
                    <p className="mt-2 text-sm text-muted">{item.helper}</p>
                  </div>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brandBright">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader>
            <div>
              <CardTitle className="text-xl">Performance comercial</CardTitle>
              <CardDescription>Lectura simple para seguir cierres, seguimiento activo y conversaciones vinculadas a ventas.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 pt-0 md:grid-cols-3">
            <PerformanceTile
              label="Ventas cerradas"
              value={String(metrics.closedSalesCount)}
              helper="Operaciones ya cobradas y registradas como cierre real."
              href={`${pathname}?view=closed`}
              active={activeFilter === "closed"}
              onClick={() => setOpportunityFilter("closed")}
            />
            <PerformanceTile
              label="Oportunidades abiertas"
              value={String(metrics.openOpportunitiesCount)}
              helper="Cuentas que todavia requieren seguimiento o cobro."
              href={`${pathname}?view=open`}
              active={activeFilter === "open"}
              onClick={() => setOpportunityFilter("open")}
            />
            <PerformanceTile
              label="Conversaciones activas"
              value={String(metrics.activeSalesConversations)}
              helper="Chats abiertos que hoy empujan una oportunidad comercial."
              icon={<MessageSquareText className="h-4 w-4 text-brandBright" />}
              href={`${pathname}?view=active_conversations`}
              active={activeFilter === "active_conversations"}
              onClick={() => setOpportunityFilter("active_conversations")}
            />
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader>
            <div>
              <CardTitle className="text-xl">Responsables</CardTitle>
              <CardDescription>Se muestra cuando ya existe asignacion comercial sobre conversaciones u oportunidades.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {metrics.responsiblePerformance.length ? (
              metrics.responsiblePerformance.map((item) => (
                <div key={`${item.responsibleId || "unassigned"}-${item.responsibleName}`} className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.responsibleName}</p>
                      <p className="mt-1 text-sm text-muted">
                        {item.closedSales} cerradas / {item.openOpportunities} en seguimiento
                      </p>
                    </div>
                    <Badge variant="success">{formatMoney(item.closedRevenue)}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/40 p-5 text-sm leading-7 text-muted">
                Todavia no hay responsables comerciales visibles sobre estas operaciones, pero el bloque ya queda listo para cuando el equipo empiece a asignar seguimiento.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-white/6 bg-card/90">
        <CardHeader
          action={
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <Badge variant="muted">{visibleOpportunities.length} visibles</Badge>
              {listMode === "main" && archivedCount > 0 ? <Badge variant="warning">{archivedCount} en archivo</Badge> : null}
              {activeFilter !== "all" ? <Badge variant="warning">{labelForOpportunityFilter(activeFilter)}</Badge> : null}
            </div>
          }
        >
          <div>
            <CardTitle className="text-xl">Pipeline comercial activo</CardTitle>
            <CardDescription>
              La vista principal se enfoca en lo reciente. El resto queda en archivo con buscador para no convertir ventas en una lista infinita.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-2xl border border-[color:var(--border)] bg-surface/60 p-1">
                <Button type="button" size="sm" variant={listMode === "main" ? "primary" : "ghost"} onClick={() => setListMode("main")}>
                  Principal
                </Button>
                <Button type="button" size="sm" variant={listMode === "archive" ? "primary" : "ghost"} onClick={() => setListMode("archive")}>
                  Archivo
                </Button>
              </div>
              {activeFilter !== "all" ? (
                <Button type="button" size="sm" variant="secondary" onClick={() => setOpportunityFilter("all")}>
                  Ver todo
                </Button>
              ) : null}
            </div>
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                className="pl-10"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar por nombre, telefono, responsable u origen"
              />
            </div>
          </div>

          {activeFilter !== "all" ? (
            <div className="rounded-2xl border border-brand/25 bg-brand/10 px-4 py-3 text-sm text-brandBright">
              Mostrando {labelForOpportunityFilter(activeFilter).toLowerCase()} para operar mas rapido desde ventas.
            </div>
          ) : listMode === "main" ? (
            <div className="rounded-2xl border border-[color:var(--border)] bg-surface/45 px-4 py-3 text-sm text-muted">
              Mostrando hasta {PRIMARY_OPPORTUNITY_LIMIT} oportunidades recientes en principal. Usa archivo para consultar el historico sin sobrecargar la operacion diaria.
            </div>
          ) : (
            <div className="rounded-2xl border border-[color:var(--border)] bg-surface/45 px-4 py-3 text-sm text-muted">
              Archivo comercial buscable. Mantiene todo el historico visible sin ensuciar la mesa operativa principal.
            </div>
          )}

          {!visibleOpportunities.length ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/45 p-6 text-sm leading-7 text-muted">
              {filteredOpportunities.length === 0 && normalizedSearch
                ? "No encontramos oportunidades para esa busqueda."
                : "Todavia no hay oportunidades visibles. Cuando el equipo empiece a registrar operaciones y cobrar ventas, este modulo va a mostrar ritmo comercial y seguimiento real."}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[color:var(--border)]">
              <div className="hidden grid-cols-[minmax(0,1.4fr)_170px_150px_170px_130px_150px] gap-4 border-b border-[color:var(--border)] bg-surface/70 px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-muted lg:grid">
                <span>Cuenta</span>
                <span>Etapa</span>
                <span>Valor</span>
                <span>Ultimo movimiento</span>
                <span>Origen</span>
                <span>Seguimiento</span>
              </div>
              {visibleOpportunities.map((item) => (
                <div key={item.id} className="border-b border-[color:var(--border)] px-4 py-4 last:border-b-0">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_170px_150px_170px_130px_150px] lg:items-center lg:gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{item.customer.name}</p>
                        {item.contactId ? (
                          <Link href={`/app/contacts/${item.contactId}`} className="text-xs text-brandBright hover:underline">
                            Ver cliente
                          </Link>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted">{item.customer.phone || "Sin telefono"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={
                          item.commercialStage === "won" ? "success" : item.commercialStage === "lost" ? "danger" : "warning"
                        }
                      >
                        {item.commercialStageLabel}
                      </Badge>
                      <Badge variant="muted">{item.collectionStatusLabel}</Badge>
                    </div>
                    <p className="font-medium">{formatMoney(item.amount, item.currency)}</p>
                    <div>
                      <p className="text-sm">{formatDateTimeLabel(item.lastActivityAt)}</p>
                      <p className="text-xs text-muted">{relativeDateLabel(item.lastActivityAt)}</p>
                    </div>
                    <p className="text-sm text-muted">{item.source ? titleCaseLabel(item.source) : "Sin origen"}</p>
                    <p className="text-sm text-muted">{item.responsible?.name || "Sin asignar"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PerformanceTile({
  label,
  value,
  helper,
  icon,
  href,
  active = false,
  onClick
}: {
  label: string;
  value: string;
  helper: string;
  icon?: React.ReactNode;
  href: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block rounded-2xl border p-4 transition-all duration-200 ${
        active
          ? "border-brand/35 bg-brand/10 shadow-[0_0_0_1px_rgba(192,80,0,0.12),0_20px_40px_rgba(0,0,0,0.16)]"
          : "border-[color:var(--border)] bg-surface/55 hover:border-brand/30 hover:bg-brand/8 hover:-translate-y-0.5"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
        {icon || <ArrowUpRight className="h-4 w-4 text-brandBright" />}
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-muted">{helper}</p>
    </Link>
  );
}

function resolveOpportunityFilter(value: string | null): SalesOpportunityFilter {
  if (value === "closed" || value === "open" || value === "active_conversations") return value;
  return "all";
}

function matchesOpportunityFilter(item: PortalSalesOpportunity, filter: SalesOpportunityFilter) {
  if (filter === "closed") return item.commercialStage === "won";
  if (filter === "open") return item.commercialStage !== "won" && item.commercialStage !== "lost";
  if (filter === "active_conversations") {
    return Boolean(item.conversationId) && item.commercialStage !== "won" && item.commercialStage !== "lost" && item.status !== "closed";
  }
  return true;
}

function labelForOpportunityFilter(filter: SalesOpportunityFilter) {
  if (filter === "closed") return "Ventas cerradas";
  if (filter === "open") return "Oportunidades abiertas";
  if (filter === "active_conversations") return "Conversaciones activas";
  return "Todas las oportunidades";
}
