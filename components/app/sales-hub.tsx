"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Bot,
  CircleCheckBig,
  CircleDot,
  CircleGauge,
  Clock3,
  Flame,
  Handshake,
  LayoutPanelTop,
  Search,
  Sparkles,
  Target,
  UserRound,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PortalSalesMetrics, PortalSalesOpportunity, PortalSalesSummary } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateTimeLabel, formatMoney, relativeDateLabel, titleCaseLabel } from "@/lib/billing";
import { cn } from "@/lib/ui/cn";

const PRIMARY_OPPORTUNITY_LIMIT = 20;

type SalesHubProps = {
  summary: PortalSalesSummary;
  metrics: PortalSalesMetrics;
  opportunities: PortalSalesOpportunity[];
};

type SalesListMode = "main" | "archive";
type SalesOpportunityFilter = "all" | "closed" | "open" | "active_conversations";
type PipelineLane = "new" | "contacted" | "negotiation" | "proposal" | "closed";
type OpportunityPriority = "hot" | "attention" | "follow_up" | "cold" | "closed";

type EnrichedOpportunity = PortalSalesOpportunity & {
  lane: PipelineLane;
  laneLabel: string;
  priority: OpportunityPriority;
  priorityLabel: string;
  attentionLabel: string;
  lastActivityLabel: string;
  stageTone: "emerald" | "blue" | "orange" | "violet" | "slate";
  ageDays: number | null;
};

const PIPELINE_LANES: Array<{
  key: PipelineLane;
  label: string;
  helper: string;
  accent: string;
  chip: string;
}> = [
  {
    key: "new",
    label: "Nuevo",
    helper: "Primeras senales comerciales",
    accent: "from-sky-500/24 via-sky-500/6 to-transparent",
    chip: "border-sky-400/30 bg-sky-500/14 text-sky-100"
  },
  {
    key: "contacted",
    label: "Contactado",
    helper: "Ya hubo ida y vuelta",
    accent: "from-cyan-500/24 via-cyan-500/6 to-transparent",
    chip: "border-cyan-400/30 bg-cyan-500/14 text-cyan-100"
  },
  {
    key: "negotiation",
    label: "En negociacion",
    helper: "Seguimiento comercial activo",
    accent: "from-amber-500/24 via-amber-500/6 to-transparent",
    chip: "border-amber-400/35 bg-amber-500/14 text-amber-100"
  },
  {
    key: "proposal",
    label: "Propuesta enviada",
    helper: "Oportunidades con decision cerca",
    accent: "from-violet-500/24 via-violet-500/6 to-transparent",
    chip: "border-violet-400/30 bg-violet-500/14 text-violet-100"
  },
  {
    key: "closed",
    label: "Cerrado",
    helper: "Cierres logrados",
    accent: "from-emerald-500/24 via-emerald-500/6 to-transparent",
    chip: "border-emerald-400/35 bg-emerald-500/14 text-emerald-100"
  }
];

const PRIORITY_META: Record<
  OpportunityPriority,
  {
    label: string;
    badgeClass: string;
    ringClass: string;
  }
> = {
  hot: {
    label: "Oportunidad caliente",
    badgeClass: "border-orange-400/35 bg-orange-500/14 text-orange-100",
    ringClass: "border-orange-400/30 shadow-[0_0_0_1px_rgba(249,115,22,0.16),0_18px_50px_rgba(249,115,22,0.10)]"
  },
  attention: {
    label: "Requiere atencion",
    badgeClass: "border-rose-400/35 bg-rose-500/14 text-rose-100",
    ringClass: "border-rose-400/30 shadow-[0_0_0_1px_rgba(244,63,94,0.15),0_18px_50px_rgba(244,63,94,0.10)]"
  },
  follow_up: {
    label: "Seguimiento pendiente",
    badgeClass: "border-amber-400/35 bg-amber-500/14 text-amber-100",
    ringClass: "border-amber-400/25 shadow-[0_0_0_1px_rgba(245,158,11,0.12),0_18px_40px_rgba(245,158,11,0.08)]"
  },
  cold: {
    label: "Oportunidad fria",
    badgeClass: "border-slate-400/30 bg-slate-500/14 text-slate-100",
    ringClass: "border-white/10"
  },
  closed: {
    label: "Cierre logrado",
    badgeClass: "border-emerald-400/35 bg-emerald-500/14 text-emerald-100",
    ringClass: "border-emerald-400/20"
  }
};

export function SalesHub({ summary, metrics, opportunities }: SalesHubProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [listMode, setListMode] = useState<SalesListMode>("main");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLane, setActiveLane] = useState<PipelineLane | "all">("all");
  const activeFilter = resolveOpportunityFilter(searchParams.get("view"));

  const enrichedOpportunities = useMemo<EnrichedOpportunity[]>(
    () => opportunities.map((item) => enrichOpportunity(item)),
    [opportunities]
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const stageFilteredOpportunities = useMemo(() => {
    return enrichedOpportunities.filter((item) => matchesOpportunityFilter(item, activeFilter));
  }, [activeFilter, enrichedOpportunities]);

  const searchedOpportunities = useMemo(() => {
    if (!normalizedSearch) return stageFilteredOpportunities;
    return stageFilteredOpportunities.filter((item) => {
      const haystack = [
        item.customer.name,
        item.customer.phone,
        item.contactId,
        item.source,
        item.responsible?.name,
        item.commercialStage,
        item.commercialStageLabel,
        item.collectionStatusLabel,
        item.priorityLabel,
        item.laneLabel
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [normalizedSearch, stageFilteredOpportunities]);

  const laneFilteredOpportunities = useMemo(() => {
    if (activeLane === "all") return searchedOpportunities;
    return searchedOpportunities.filter((item) => item.lane === activeLane);
  }, [activeLane, searchedOpportunities]);

  const visibleOpportunities =
    activeFilter === "all" && listMode === "main"
      ? laneFilteredOpportunities.slice(0, PRIMARY_OPPORTUNITY_LIMIT)
      : laneFilteredOpportunities;

  const archivedCount =
    activeFilter === "all" ? Math.max(laneFilteredOpportunities.length - PRIMARY_OPPORTUNITY_LIMIT, 0) : 0;

  const laneSummaries = useMemo(() => {
    return PIPELINE_LANES.map((lane) => {
      const items = searchedOpportunities.filter((item) => item.lane === lane.key);
      return {
        ...lane,
        count: items.length,
        amount: items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
        hotCount: items.filter((item) => item.priority === "hot" || item.priority === "attention").length
      };
    });
  }, [searchedOpportunities]);

  const closedToday = useMemo(
    () =>
      enrichedOpportunities.filter(
        (item) => item.lane === "closed" && item.lastActivityAt && isSameDay(item.lastActivityAt)
      ).length,
    [enrichedOpportunities]
  );

  const newToday = useMemo(
    () =>
      enrichedOpportunities.filter(
        (item) => item.lane !== "closed" && item.lastActivityAt && isSameDay(item.lastActivityAt)
      ).length,
    [enrichedOpportunities]
  );

  const hotCount = useMemo(
    () => searchedOpportunities.filter((item) => item.priority === "hot").length,
    [searchedOpportunities]
  );

  const attentionCount = useMemo(
    () => searchedOpportunities.filter((item) => item.priority === "attention").length,
    [searchedOpportunities]
  );

  const followUpCount = useMemo(
    () => searchedOpportunities.filter((item) => item.priority === "follow_up").length,
    [searchedOpportunities]
  );

  const unassignedCount = useMemo(
    () => searchedOpportunities.filter((item) => !item.responsible).length,
    [searchedOpportunities]
  );

  const sourceBreakdown = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const item of searchedOpportunities) {
      const key = normalizeOpportunitySource(item.source);
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }

    const total = searchedOpportunities.length || 1;
    return [...buckets.entries()]
      .map(([label, count], index) => ({
        label,
        count,
        percent: Math.round((count / total) * 100),
        colorClass: SOURCE_COLORS[index % SOURCE_COLORS.length]
      }))
      .sort((left, right) => right.count - left.count);
  }, [searchedOpportunities]);

  const sourceDonut = useMemo(() => {
    if (!sourceBreakdown.length) {
      return "conic-gradient(rgba(148,163,184,0.24) 0deg 360deg)";
    }

    let current = 0;
    const segments = sourceBreakdown.map((item) => {
      const next = current + item.percent * 3.6;
      const segment = `${item.colorClass.color} ${current}deg ${next}deg`;
      current = next;
      return segment;
    });

    if (current < 360) {
      segments.push(`rgba(148,163,184,0.18) ${current}deg 360deg`);
    }

    return `conic-gradient(${segments.join(", ")})`;
  }, [sourceBreakdown]);

  const topPerformer = metrics.responsiblePerformance[0] || null;
  const teamRows = metrics.responsiblePerformance.slice(0, 4);

  const topOpportunity = useMemo(() => {
    return [...searchedOpportunities].sort(compareOpportunities)[0] || null;
  }, [searchedOpportunities]);

  const recentActivity = useMemo(() => {
    return [...searchedOpportunities]
      .sort((left, right) => compareByDateDesc(left.lastActivityAt, right.lastActivityAt))
      .slice(0, 4);
  }, [searchedOpportunities]);

  const executiveStats = [
    {
      label: "Ventas cerradas",
      value: String(metrics.closedSalesCount),
      helper: "Operaciones cobradas sobre el pipeline visible.",
      icon: CircleCheckBig,
      tone: "emerald"
    },
    {
      label: "Oportunidades abiertas",
      value: String(summary.activeOpportunities),
      helper: "Cuentas en seguimiento comercial real.",
      icon: UsersRound,
      tone: "blue"
    },
    {
      label: "Tasa de cierre",
      value: `${summary.closeRate}%`,
      helper: "Cierres sobre el universo comercial visible.",
      icon: CircleGauge,
      tone: "violet"
    },
    {
      label: "Ticket promedio",
      value: formatMoney(summary.averageTicket),
      helper: "Promedio efectivo de operaciones cobradas.",
      icon: BadgeDollarSign,
      tone: "amber"
    }
  ] as const;

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
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-12">
            <Card className="relative overflow-hidden border-orange-400/30 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] shadow-[0_20px_80px_rgba(5,10,25,0.28)] lg:col-span-4 xl:col-span-5">
              <CardContent className="relative p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Facturacion del mes</p>
                    <p className="mt-4 text-4xl font-semibold tracking-tight text-white">{formatMoney(summary.salesMonth)}</p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/12 px-3 py-1 text-xs font-medium text-emerald-100">
                      <Sparkles className="h-3.5 w-3.5" />
                      {summary.salesToday > 0 ? `${formatMoney(summary.salesToday)} cobrados hoy` : "Pipeline listo para empujar cierres"}
                    </div>
                  </div>
                  <Button asChild size="sm" className="rounded-2xl bg-[linear-gradient(135deg,#f97316,#ea580c)] text-white shadow-[0_16px_30px_rgba(249,115,22,0.28)] hover:opacity-95">
                    <Link href="/app/inbox">
                      Ver conversaciones activas
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="mt-8">
                  <svg viewBox="0 0 240 68" className="h-16 w-full">
                    <defs>
                      <linearGradient id="sales-premium-line" x1="0%" x2="100%" y1="0%" y2="0%">
                        <stop offset="0%" stopColor="rgba(249,115,22,0.05)" />
                        <stop offset="35%" stopColor="rgba(249,115,22,0.55)" />
                        <stop offset="100%" stopColor="rgba(251,191,36,0.95)" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M8 58 C 34 58, 46 53, 62 50 S 92 48, 107 42 S 128 48, 142 39 S 161 33, 177 25 S 200 22, 232 8"
                      fill="none"
                      stroke="url(#sales-premium-line)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </CardContent>
            </Card>

            {executiveStats.map((stat) => (
              <ExecutiveStatCard key={stat.label} {...stat} />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl lg:col-span-7">
              <CardContent className="p-5">
                <div className="mb-4">
                  <p className="text-xl font-semibold text-white">Atencion comercial</p>
                  <p className="mt-1 text-sm text-muted">Lectura rapida de foco, friccion y seguimiento pendiente.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <MiniSignalCard
                    icon={Flame}
                    title="Oportunidades calientes"
                    value={String(hotCount)}
                    helper={hotCount ? "Movimientos recientes con potencial de cierre." : "Sin cuentas calientes ahora mismo."}
                    tone="orange"
                  />
                  <MiniSignalCard
                    icon={AlertTriangle}
                    title="Requieren atencion"
                    value={String(attentionCount)}
                    helper={attentionCount ? "Falta responsable o se estancaron." : "Sin alertas criticas visibles."}
                    tone="rose"
                  />
                  <MiniSignalCard
                    icon={Clock3}
                    title="Seguimiento pendiente"
                    value={String(followUpCount)}
                    helper={followUpCount ? "Cuentas para reactivar hoy." : "Seguimientos al dia."}
                    tone="amber"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl lg:col-span-5">
              <CardContent className="p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xl font-semibold text-white">Equipo comercial</p>
                    <p className="mt-1 text-sm text-muted">Ranking por cierres visibles dentro del periodo actual.</p>
                  </div>
                  {topPerformer ? <Badge variant="success">{formatMoney(topPerformer.closedRevenue)}</Badge> : null}
                </div>
                <div className="space-y-3">
                  {teamRows.length ? (
                    teamRows.map((item, index) => (
                      <TeamPerformanceRow
                        key={`${item.responsibleId || "unassigned"}-${item.responsibleName}`}
                        item={item}
                        maxRevenue={teamRows[0]?.closedRevenue || 1}
                        rank={index + 1}
                      />
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-muted">
                      Cuando haya responsables asignados, este bloque mostrara ritmo comercial, cierres y carga del equipo.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden border-white/10 bg-white/[0.03] shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <CardContent className="p-5 lg:p-6">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-xl font-semibold text-white">Pipeline comercial activo</p>
                    <p className="mt-1 text-sm text-muted">
                      Seguimiento ejecutivo de oportunidades, conversaciones y proximidad de cierre.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 xl:items-end">
                    <div className="flex flex-wrap items-center gap-2">
                      <FilterChip
                        active={activeFilter === "all"}
                        label={`Todas ${searchedOpportunities.length}`}
                        onClick={() => setOpportunityFilter("all")}
                      />
                      <FilterChip
                        active={activeFilter === "open"}
                        label={`Activas ${summary.activeOpportunities}`}
                        onClick={() => setOpportunityFilter("open")}
                      />
                      <FilterChip
                        active={activeFilter === "closed"}
                        label={`Cierres ${metrics.closedSalesCount}`}
                        onClick={() => setOpportunityFilter("closed")}
                      />
                      <FilterChip
                        active={activeFilter === "active_conversations"}
                        label={`Conversaciones ${summary.activeSalesConversations}`}
                        onClick={() => setOpportunityFilter("active_conversations")}
                      />
                    </div>
                    <div className="flex w-full flex-col gap-3 md:flex-row xl:w-auto">
                      <div className="relative min-w-[320px] flex-1 xl:flex-none">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                        <Input
                          className="h-11 rounded-2xl border-white/10 bg-black/18 pl-10 text-sm"
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                          placeholder="Buscar por nombre, telefono, responsable o origen"
                        />
                      </div>
                      <div className="inline-flex rounded-2xl border border-white/10 bg-black/18 p-1">
                        <Button type="button" size="sm" variant={listMode === "main" ? "primary" : "ghost"} onClick={() => setListMode("main")}>
                          Principal
                        </Button>
                        <Button type="button" size="sm" variant={listMode === "archive" ? "primary" : "ghost"} onClick={() => setListMode("archive")}>
                          Archivo
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 overflow-x-auto pb-1 xl:grid-cols-5">
                  {laneSummaries.map((lane) => (
                    <button
                      key={lane.key}
                      type="button"
                      onClick={() => setActiveLane((current) => (current === lane.key ? "all" : lane.key))}
                      className={cn(
                        "min-w-[220px] rounded-[24px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-4 text-left transition-all duration-200 hover:-translate-y-0.5",
                        activeLane === lane.key
                          ? "border-orange-400/35 shadow-[0_0_0_1px_rgba(249,115,22,0.14),0_18px_40px_rgba(0,0,0,0.20)]"
                          : "border-white/10"
                      )}
                    >
                      <div className={cn("rounded-[18px] border border-white/10 p-4", `bg-[radial-gradient(circle_at_top_left,var(--tw-gradient-stops))] ${lane.accent}`)}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-white">{lane.label}</p>
                            <p className="mt-1 text-xs text-white/55">{lane.helper}</p>
                          </div>
                          <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", lane.chip)}>
                            {lane.count}
                          </span>
                        </div>
                        <p className="mt-5 text-2xl font-semibold tracking-tight text-white">{formatMoney(lane.amount)}</p>
                        <p className="mt-2 text-xs text-muted">
                          {lane.hotCount ? `${lane.hotCount} con foco inmediato` : "Sin presion critica visible"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                {activeLane !== "all" || activeFilter !== "all" ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-orange-400/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-100">
                    <LayoutPanelTop className="h-4 w-4" />
                    Mostrando{" "}
                    <span className="font-medium">
                      {activeLane === "all" ? labelForOpportunityFilter(activeFilter) : laneLabel(activeLane)}
                    </span>
                    {activeFilter !== "all" && activeLane !== "all" ? " dentro del filtro comercial actual." : "."}
                    <button type="button" className="ml-auto text-orange-100/85 underline underline-offset-4" onClick={() => { setActiveLane("all"); setOpportunityFilter("all"); }}>
                      Limpiar foco
                    </button>
                  </div>
                ) : listMode === "main" ? (
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.025] px-4 py-3 text-sm text-muted">
                    Principal muestra las oportunidades mas relevantes del dia. El archivo conserva el historico sin ensuciar la lectura ejecutiva.
                  </div>
                ) : (
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.025] px-4 py-3 text-sm text-muted">
                    Archivo comercial buscable para revisar historico, cierres y cuentas frias sin sobrecargar la mesa activa.
                  </div>
                )}

                {!visibleOpportunities.length ? (
                  <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.025] p-7 text-sm leading-7 text-muted">
                    {normalizedSearch
                      ? "No encontramos oportunidades para esa busqueda."
                      : "Todavia no hay oportunidades visibles para este foco comercial."}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleOpportunities.map((item) => (
                      <OpportunityRow key={item.id} item={item} />
                    ))}
                  </div>
                )}

                {listMode === "main" && archivedCount > 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/[0.025] px-4 py-3 text-sm text-muted">
                    <span>{archivedCount} oportunidades adicionales quedaron en archivo para mantener lectura ejecutiva.</span>
                    <Button type="button" size="sm" variant="secondary" className="rounded-2xl" onClick={() => setListMode("archive")}>
                      Ver archivo
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="border-orange-400/24 bg-white/[0.03] backdrop-blur-xl">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-orange-400/25 bg-orange-500/12 p-2.5 text-orange-100">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-white">Resumen del dia</p>
                  <p className="mt-1 text-sm text-muted">Lectura instantanea del ritmo comercial visible.</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <SidebarMetricRow label="Ventas del dia" value={formatMoney(summary.salesToday)} tone="emerald" />
                <SidebarMetricRow label="Cierres del dia" value={String(closedToday)} tone="violet" />
                <SidebarMetricRow label="Nuevas oportunidades" value={String(newToday)} tone="blue" />
                <SidebarMetricRow label="Sin responsable" value={String(unassignedCount)} tone="rose" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl">
            <CardContent className="p-5">
              <p className="text-xl font-semibold text-white">Conversaciones activas</p>
              <p className="mt-1 text-sm text-muted">Chats abiertos que hoy empujan oportunidades.</p>
              <p className="mt-7 text-5xl font-semibold tracking-tight text-white">{summary.activeSalesConversations}</p>
              <p className="mt-2 text-sm text-muted">Conversaciones abiertas</p>
              <Button asChild className="mt-6 h-11 w-full rounded-2xl border border-orange-400/25 bg-orange-500/10 text-orange-100 hover:bg-orange-500/14" variant="ghost">
                <Link href="/app/inbox">
                  Ver en Inbox
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl">
            <CardContent className="p-5">
              <p className="text-xl font-semibold text-white">Origen de oportunidades</p>
              <p className="mt-1 text-sm text-muted">Distribucion por fuente usando datos ya visibles.</p>
              <div className="mt-5 flex items-center gap-4">
                <div className="relative h-28 w-28 shrink-0 rounded-full border border-white/10" style={{ backgroundImage: sourceDonut }}>
                  <div className="absolute inset-4 rounded-full border border-white/10 bg-[#07111f]/95" />
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  {sourceBreakdown.length ? (
                    sourceBreakdown.slice(0, 4).map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.colorClass.color }} />
                          <span className="text-white/88">{item.label}</span>
                        </div>
                        <span className="text-muted">{item.percent}%</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted">Todavia no hay origenes visibles para mostrar.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl">
            <CardContent className="p-5">
              <p className="text-xl font-semibold text-white">Foco comercial actual</p>
              <p className="mt-1 text-sm text-muted">Sugerencias a partir de la foto comercial ya existente.</p>
              <div className="mt-5 space-y-4">
                <QuickInsight
                  icon={Target}
                  title="Siguiente accion sugerida"
                  description={
                    topOpportunity
                      ? `${topOpportunity.customer.name}: ${topOpportunity.attentionLabel.toLowerCase()}.`
                      : "Todavia no hay una oportunidad prioritaria visible."
                  }
                />
                <QuickInsight
                  icon={Handshake}
                  title="Pipeline con mas temperatura"
                  description={
                    hotCount
                      ? `${hotCount} ${hotCount === 1 ? "oportunidad caliente" : "oportunidades calientes"} listas para seguimiento fino.`
                      : "No hay cuentas calientes visibles en este momento."
                  }
                />
                <QuickInsight
                  icon={UserRound}
                  title="Responsable destacado"
                  description={
                    topPerformer
                      ? `${topPerformer.responsibleName} lidera con ${topPerformer.closedSales} cierres y ${formatMoney(topPerformer.closedRevenue)}.`
                      : "Todavia no hay ranking comercial visible."
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl">
            <CardContent className="p-5">
              <p className="text-xl font-semibold text-white">Actividad reciente</p>
              <p className="mt-1 text-sm text-muted">Ultimos movimientos que sostienen la lectura del pipeline.</p>
              <div className="mt-5 space-y-3">
                {recentActivity.length ? (
                  recentActivity.map((item) => (
                    <div key={`recent-${item.id}`} className="rounded-[20px] border border-white/10 bg-white/[0.025] p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{item.customer.name}</p>
                          <p className="mt-1 text-xs text-muted">{item.lastActivityLabel}</p>
                        </div>
                        <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-medium", PRIORITY_META[item.priority].badgeClass)}>
                          {item.priorityLabel}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.025] px-4 py-5 text-sm text-muted">
                    Sin actividad reciente para mostrar.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}

function ExecutiveStatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof CircleGauge;
  tone: "emerald" | "blue" | "violet" | "amber";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
      : tone === "blue"
        ? "border-sky-400/20 bg-sky-500/10 text-sky-100"
        : tone === "violet"
          ? "border-violet-400/20 bg-violet-500/10 text-violet-100"
          : "border-amber-400/20 bg-amber-500/10 text-amber-100";

  return (
    <Card className="border-white/10 bg-white/[0.03] shadow-[0_16px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl lg:col-span-4 xl:col-span-2">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/92">{label}</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-white">{value}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{helper}</p>
          </div>
          <span className={cn("inline-flex h-12 w-12 items-center justify-center rounded-2xl border", toneClass)}>
            <Icon className="h-5 w-5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniSignalCard({
  icon: Icon,
  title,
  value,
  helper,
  tone
}: {
  icon: typeof AlertTriangle;
  title: string;
  value: string;
  helper: string;
  tone: "orange" | "rose" | "amber";
}) {
  const toneClass =
    tone === "orange"
      ? "border-orange-400/25 bg-orange-500/10 text-orange-100"
      : tone === "rose"
        ? "border-rose-400/25 bg-rose-500/10 text-rose-100"
        : "border-amber-400/25 bg-amber-500/10 text-amber-100";

  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-start gap-3">
        <span className={cn("inline-flex h-11 w-11 items-center justify-center rounded-2xl border", toneClass)}>
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
          <p className="mt-2 text-sm leading-6 text-muted">{helper}</p>
        </div>
      </div>
    </div>
  );
}

function TeamPerformanceRow({
  item,
  maxRevenue,
  rank
}: {
  item: PortalSalesMetrics["responsiblePerformance"][number];
  maxRevenue: number;
  rank: number;
}) {
  const progress = Math.max(8, Math.min(100, Math.round((Number(item.closedRevenue || 0) / Math.max(1, maxRevenue)) * 100)));

  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.025] p-3.5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-orange-400/25 bg-orange-500/12 text-sm font-semibold text-orange-100">
          {rank}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-medium text-white">{item.responsibleName}</p>
            <span className="text-sm font-medium text-white">{formatMoney(item.closedRevenue)}</span>
          </div>
          <p className="mt-1 text-xs text-muted">
            {item.closedSales} cierres - {item.openOpportunities} en seguimiento
          </p>
          <div className="mt-3 h-2 rounded-full bg-white/8">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(249,115,22,0.55),rgba(251,191,36,0.95))]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-orange-400/35 bg-orange-500/14 text-orange-100"
          : "border-white/10 bg-white/[0.03] text-muted hover:border-orange-400/20 hover:text-white"
      )}
    >
      {label}
    </button>
  );
}

function OpportunityRow({ item }: { item: EnrichedOpportunity }) {
  const priorityMeta = PRIORITY_META[item.priority];

  return (
    <div
      className={cn(
        "rounded-[24px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.018))] px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-400/20 sm:px-5",
        priorityMeta.ringClass
      )}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_180px_160px_210px_130px_190px_126px] xl:items-center">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.24),rgba(37,99,235,0.12))] text-sm font-semibold text-white">
              {initialsFromName(item.customer.name)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium text-white">{item.customer.name}</p>
                {item.contactId ? (
                  <Link href={`/app/contacts/${item.contactId}`} className="text-xs font-medium text-orange-100 transition hover:text-orange-200">
                    Ver cliente
                  </Link>
                ) : null}
              </div>
              <p className="mt-1 truncate text-sm text-muted">{item.customer.phone || "Sin telefono"}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", stageBadgeClass(item.stageTone))}>
            {item.commercialStageLabel}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/72">
            {item.collectionStatusLabel}
          </span>
        </div>

        <div>
          <p className="text-lg font-semibold text-white">{formatMoney(item.amount, item.currency)}</p>
          <p className="mt-1 text-xs text-muted">Valor de la oportunidad</p>
        </div>

        <div className="flex items-start gap-2.5">
          <Clock3 className="mt-0.5 h-4 w-4 text-white/40" />
          <div>
            <p className="text-sm text-white">{formatDateTimeLabel(item.lastActivityAt)}</p>
            <p className="mt-1 text-xs text-muted">{item.lastActivityLabel}</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          {item.source && item.source.toLowerCase().includes("bot") ? (
            <Bot className="mt-0.5 h-4 w-4 text-orange-100" />
          ) : (
            <CircleDot className="mt-0.5 h-4 w-4 text-white/45" />
          )}
          <div>
            <p className="text-sm text-white">{item.source ? titleCaseLabel(item.source) : "Sin origen"}</p>
            <p className="mt-1 text-xs text-muted">Origen</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <UserRound className="mt-0.5 h-4 w-4 text-white/45" />
          <div>
            <p className="text-sm text-white">{item.responsible?.name || "Sin asignar"}</p>
            <p className="mt-1 text-xs text-muted">Responsable</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 xl:justify-end">
          <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", priorityMeta.badgeClass)}>
            {item.priorityLabel}
          </span>
          {item.contactId ? (
            <Button asChild size="sm" variant="ghost" className="rounded-2xl border border-white/10 bg-black/16 text-white hover:bg-white/8">
              <Link href={`/app/contacts/${item.contactId}`}>
                Ver cliente
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SidebarMetricRow({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "emerald" | "violet" | "blue" | "rose";
}) {
  const toneDot =
    tone === "emerald"
      ? "bg-emerald-400"
      : tone === "violet"
        ? "bg-violet-400"
        : tone === "blue"
          ? "bg-sky-400"
          : "bg-rose-400";

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2.5">
        <span className={cn("h-2.5 w-2.5 rounded-full", toneDot)} />
        <span className="text-white/82">{label}</span>
      </div>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

function QuickInsight({
  icon: Icon,
  title,
  description
}: {
  icon: typeof Target;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-orange-100">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="mt-1.5 text-sm leading-6 text-muted">{description}</p>
        </div>
      </div>
    </div>
  );
}

function resolveOpportunityFilter(value: string | null): SalesOpportunityFilter {
  if (value === "closed" || value === "open" || value === "active_conversations") return value;
  return "all";
}

function matchesOpportunityFilter(item: EnrichedOpportunity, filter: SalesOpportunityFilter) {
  if (filter === "closed") return item.commercialStage === "won" || item.lane === "closed";
  if (filter === "open") return item.commercialStage !== "won" && item.commercialStage !== "lost" && item.lane !== "closed";
  if (filter === "active_conversations") {
    return Boolean(item.conversationId) && item.commercialStage !== "won" && item.commercialStage !== "lost" && item.status !== "closed";
  }
  return true;
}

function laneLabel(lane: PipelineLane) {
  return PIPELINE_LANES.find((item) => item.key === lane)?.label || "Pipeline";
}

function compareOpportunities(left: EnrichedOpportunity, right: EnrichedOpportunity) {
  const priorityScore = (item: EnrichedOpportunity) =>
    item.priority === "attention"
      ? 5
      : item.priority === "hot"
        ? 4
        : item.priority === "follow_up"
          ? 3
          : item.priority === "cold"
            ? 2
            : 1;

  return (
    priorityScore(right) - priorityScore(left) ||
    Number(right.amount || 0) - Number(left.amount || 0) ||
    compareByDateDesc(left.lastActivityAt, right.lastActivityAt)
  );
}

function compareByDateDesc(left: string | null, right: string | null) {
  return toDateMs(right) - toDateMs(left);
}

function toDateMs(value: string | null) {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function isSameDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function normalizeOpportunitySource(value: string | null) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "Sin origen";
  if (text.includes("bot") || text.includes("whatsapp")) return "Bot WhatsApp";
  if (text.includes("manual")) return "Manual";
  if (text.includes("web") || text.includes("form")) return "Web / Formulario";
  return titleCaseLabel(text);
}

function resolvePipelineLane(item: PortalSalesOpportunity): PipelineLane {
  const text = `${item.commercialStage} ${item.commercialStageLabel} ${item.collectionStatusLabel}`.toLowerCase();
  if (item.commercialStage === "won" || text.includes("cierre") || text.includes("cobrad")) return "closed";
  if (text.includes("proposal") || text.includes("propuesta")) return "proposal";
  if (text.includes("negoci") || text.includes("qualif") || text.includes("calific")) return "negotiation";
  if (text.includes("contact") || text.includes("seguim") || text.includes("interes")) return "contacted";
  return "new";
}

function resolvePriority(item: PortalSalesOpportunity, lane: PipelineLane): OpportunityPriority {
  if (lane === "closed" || item.commercialStage === "won") return "closed";
  if (!item.responsible) return "attention";

  const ageDays = ageInDays(item.lastActivityAt);
  if (item.conversationId && ageDays !== null && ageDays <= 2) return "hot";
  if (ageDays !== null && ageDays >= 7) return "cold";
  if (ageDays !== null && ageDays >= 3) return "follow_up";
  return "hot";
}

function resolveAttentionLabel(priority: OpportunityPriority) {
  if (priority === "attention") return "Falta responsable o seguimiento claro";
  if (priority === "hot") return "Momento ideal para empujar cierre";
  if (priority === "follow_up") return "Conviene retomar la conversacion";
  if (priority === "cold") return "Cuenta fria para reactivar con criterio";
  return "Operacion cerrada";
}

function resolveStageTone(lane: PipelineLane): EnrichedOpportunity["stageTone"] {
  if (lane === "closed") return "emerald";
  if (lane === "proposal") return "violet";
  if (lane === "negotiation") return "orange";
  if (lane === "contacted") return "blue";
  return "slate";
}

function enrichOpportunity(item: PortalSalesOpportunity): EnrichedOpportunity {
  const lane = resolvePipelineLane(item);
  const priority = resolvePriority(item, lane);
  return {
    ...item,
    lane,
    laneLabel: laneLabel(lane),
    priority,
    priorityLabel: PRIORITY_META[priority].label,
    attentionLabel: resolveAttentionLabel(priority),
    lastActivityLabel: item.lastActivityAt ? relativeDateLabel(item.lastActivityAt) : "Sin movimiento reciente",
    stageTone: resolveStageTone(lane),
    ageDays: ageInDays(item.lastActivityAt)
  };
}

function ageInDays(value: string | null) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24)));
}

function stageBadgeClass(tone: EnrichedOpportunity["stageTone"]) {
  if (tone === "emerald") return "border-emerald-400/35 bg-emerald-500/14 text-emerald-100";
  if (tone === "violet") return "border-violet-400/35 bg-violet-500/14 text-violet-100";
  if (tone === "orange") return "border-amber-400/35 bg-amber-500/14 text-amber-100";
  if (tone === "blue") return "border-sky-400/35 bg-sky-500/14 text-sky-100";
  return "border-white/10 bg-white/[0.05] text-white/82";
}

function initialsFromName(value: string) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() || "")
    .join("") || "CL";
}

function labelForOpportunityFilter(filter: SalesOpportunityFilter) {
  if (filter === "closed") return "Ventas cerradas";
  if (filter === "open") return "Oportunidades abiertas";
  if (filter === "active_conversations") return "Conversaciones activas";
  return "Todas las oportunidades";
}

const SOURCE_COLORS = [
  { color: "#34d399" },
  { color: "#f59e0b" },
  { color: "#3b82f6" },
  { color: "#8b5cf6" }
];
