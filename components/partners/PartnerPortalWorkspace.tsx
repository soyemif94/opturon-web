"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, BadgeCheck, BriefcaseBusiness, CalendarRange, ChevronRight, Loader2, Search, SlidersHorizontal, Sparkles, Star, TrendingUp, Users2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SkeletonCard, SkeletonLine } from "@/components/ui/skeleton";
import {
  PARTNER_CAREER_LADDER,
  getPartnerPortalPreviewData,
  type PartnerPortalCareerProgress,
  type PartnerPortalCareerRequirement,
  type PartnerPortalClientAttribution,
  type PartnerPortalPage,
  type PartnerPortalPartner,
  type PartnerPortalRankHistoryEntry,
  type PartnerPortalSummary,
  clampCareerProgress,
  formatCareerRequirementValue,
  formatPartnerStatus,
  formatPortalDate,
  formatPortalDateTime,
  formatPortalMoney,
  formatRankLabel,
  hasPartnerClientBilling,
  isOpaqueIdentifier,
  partnerBillingVariant,
  partnerStatusVariant,
  resolvePartnerClientDisplayName,
  resolvePartnerClientPaymentState,
  resolveCareerStepProgress,
  resolveCurrentRank,
  resolveNextRankLabel,
  safePartnerName,
  summarizeCareerEvaluationStatus,
  summarizeCareerRequirementGap,
  summarizeAttributionSource,
  summarizeAttributionStatus,
  summarizePartnerBillingState,
  summarizePartnerSubscriptionStatus
} from "@/lib/partners-portal";

type WorkspaceState = {
  partner?: PartnerPortalPartner | null;
  summary?: PartnerPortalSummary | null;
  clients?: PartnerPortalClientAttribution[];
  rankHistory?: PartnerPortalRankHistoryEntry[];
  careerProgress?: PartnerPortalCareerProgress | null;
};

type PreviewState = "default" | "empty" | "error" | "max";
type ClientSortKey = "recent" | "oldest" | "name";

const PAGE_LOADERS: Record<PartnerPortalPage, Array<keyof WorkspaceState>> = {
  home: ["partner", "summary", "clients", "rankHistory"],
  clients: ["clients"],
  career: ["careerProgress", "partner", "summary"],
  commissions: ["summary", "partner"],
  profile: ["partner", "summary", "rankHistory"]
};

const ENDPOINTS: Record<keyof WorkspaceState, string> = {
  partner: "/api/partners/me",
  summary: "/api/partners/me/summary",
  clients: "/api/partners/me/clients",
  rankHistory: "/api/partners/me/rank-progress",
  careerProgress: "/api/partners/me/rank-progress"
};

export function PartnerPortalWorkspace({ page }: { page: PartnerPortalPage }) {
  const [state, setState] = useState<WorkspaceState>({});
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [sortKey, setSortKey] = useState<ClientSortKey>("recent");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const previewMode = process.env.NODE_ENV !== "production" && searchParams.get("preview") === "1";
  const previewState = (process.env.NODE_ENV !== "production" ? String(searchParams.get("previewState") || "default").trim().toLowerCase() : "default") as PreviewState;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      setError(null);

      try {
        if (previewMode) {
          if (previewState === "error") {
            throw new Error("No pudimos cargar la vista previa del portal partner.");
          }
          if (cancelled) return;
          setState(buildPartnerPreviewState(previewState));
          setStatus("ready");
          return;
        }

        const keys = PAGE_LOADERS[page];
        const entries = await Promise.all(
          keys.map(async (key) => {
            const response = await fetch(ENDPOINTS[key], { cache: "no-store" });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(String(payload?.detail || payload?.error || "No se pudo cargar el portal partner."));
            }

            if (key === "partner") return [key, payload?.partner || null] as const;
            if (key === "summary") return [key, payload?.summary || null] as const;
            if (key === "clients") return [key, Array.isArray(payload?.clients) ? payload.clients : []] as const;
            if (key === "careerProgress") return [key, payload || null] as const;
            return [key, Array.isArray(payload?.rankHistory) ? payload.rankHistory : []] as const;
          })
        );

        if (cancelled) return;

        setState((previous) => {
          const next = { ...previous };
          for (const [key, value] of entries) {
            next[key] = value as never;
          }
          return next;
        });
        setStatus("ready");
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el portal partner.");
        setStatus("error");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [page, previewMode, previewState]);

  if (status === "loading") {
    return <WorkspaceLoading page={page} />;
  }

  if (status === "error") {
    return (
      <EmptyState
        icon={<AlertCircle className="h-5 w-5" />}
        title="No pudimos cargar esta vista"
        description={error || "Reintenta en unos segundos para volver a consultar tus datos."}
        action={{ label: "Reintentar", onClick: () => window.location.reload() }}
        className="min-h-[420px] border-white/10 bg-white/[0.04] text-slate-100"
      />
    );
  }

  if (page === "clients") {
    return (
      <ClientsView
        clients={state.clients || []}
        query={query}
        statusFilter={statusFilter}
        paymentFilter={paymentFilter}
        sortKey={sortKey}
        selectedClientId={selectedClientId}
        onQueryChange={setQuery}
        onStatusFilterChange={setStatusFilter}
        onPaymentFilterChange={setPaymentFilter}
        onSortKeyChange={setSortKey}
        onSelectedClientChange={setSelectedClientId}
      />
    );
  }

  if (page === "career") {
    return <CareerView partner={state.partner || null} summary={state.summary || null} progress={state.careerProgress || null} />;
  }

  if (page === "commissions") {
    return <CommissionsView summary={state.summary || null} partner={state.partner || null} />;
  }

  if (page === "profile") {
    return <ProfileView partner={state.partner || null} summary={state.summary || null} rankHistory={state.rankHistory || []} />;
  }

  return <HomeView partner={state.partner || null} summary={state.summary || null} clients={state.clients || []} rankHistory={state.rankHistory || []} />;
}

function HomeView({
  partner,
  summary,
  clients,
  rankHistory
}: {
  partner: PartnerPortalPartner | null;
  summary: PartnerPortalSummary | null;
  clients: PartnerPortalClientAttribution[];
  rankHistory: PartnerPortalRankHistoryEntry[];
}) {
  const currentRank = resolveCurrentRank(summary, partner, rankHistory);
  const recentClients = clients.slice(0, 5);
  const activeClientsValue = summary?.activeClients ?? partner?.activeAttributionCount ?? null;
  const totalClientsValue = clients.length > 0 ? clients.length : null;
  const nextRankLabel = resolveNextRankLabel(currentRank);
  const stepProgress = resolveCareerStepProgress(currentRank);
  const currentIndex = PARTNER_CAREER_LADDER.findIndex((level) => level.code === String(currentRank || "").trim().toLowerCase());
  const currentRequirements = currentIndex >= 0 ? PARTNER_CAREER_LADDER[currentIndex]?.rules || [] : [];
  const nextRequirements = currentIndex >= 0 ? PARTNER_CAREER_LADDER[currentIndex + 1]?.rules || [] : [];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
        <Card className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_24%),radial-gradient(circle_at_78%_20%,rgba(244,114,182,0.14),transparent_22%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.78))] text-slate-100 shadow-[0_22px_70px_rgba(2,8,23,0.42)]">
          <CardContent className="p-6 md:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-amber-300/20 bg-amber-300/10 text-amber-100">Inicio</Badge>
              <Badge className="border-white/10 bg-white/6 text-slate-200">Datos reales</Badge>
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-[2.6rem]">Hola, {safePartnerName(partner)}.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Tu actividad comercial visible hoy en Opturon, con foco en cartera, estado de cuenta y evolucion de rango.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge variant={partnerStatusVariant(partner?.status)}>{formatPartnerStatus(partner?.status)}</Badge>
              <Badge className="border-white/10 bg-white/6 text-slate-100">{formatRankLabel(currentRank)}</Badge>
              <Badge className="border-white/10 bg-white/6 text-slate-300">Ultimo acceso: {formatPortalDateTime(partner?.lastLoginAt)}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(9,19,34,0.92),rgba(10,23,40,0.82))] text-slate-100 shadow-[0_22px_70px_rgba(2,8,23,0.35)]">
          <CardHeader action={<Badge className="border-white/10 bg-white/6 text-slate-200">Lectura segura</Badge>}>
            <div>
              <CardTitle className="text-xl text-white">Actividad comercial</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                Resumen ejecutivo del partner usando solamente datos disponibles en esta fase del backend.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <MetricStrip dark label="Rango actual" value={formatRankLabel(currentRank)} icon={<BadgeCheck className="h-4 w-4" />} />
            <MetricStrip dark label="Proximo rango" value={nextRankLabel} icon={<ArrowRight className="h-4 w-4" />} />
            <MetricStrip dark label="Progreso visible" value={`${stepProgress}%`} icon={<TrendingUp className="h-4 w-4" />} />
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-300">
              Tu estado actual es <span className="font-semibold text-white">{formatPartnerStatus(partner?.status)}</span>. Si el backend publica metas cuantificadas
              adicionales en proximas etapas, este bloque se enriquecera sin recalcular datos desde el navegador.
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard dark icon={<Users2 className="h-4 w-4" />} label="Clientes activos" value={formatMetricValue(activeClientsValue)} detail="Valor servido desde tu resumen partner actual." />
        <KpiCard dark icon={<BriefcaseBusiness className="h-4 w-4" />} label="Cartera visible" value={formatMetricValue(totalClientsValue)} detail="Clientes atribuidos visibles hoy en el portal." />
        <KpiCard dark icon={<Sparkles className="h-4 w-4" />} label="Rango actual" value={formatRankLabel(currentRank)} detail="Tomado del rango visible en backend o historial publicado." />
        <KpiCard dark icon={<Star className="h-4 w-4" />} label="Progreso al proximo rango" value={`${stepProgress}%`} detail="Referencia visual segun el rango actual publicado." />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,20,36,0.92),rgba(9,18,33,0.84))] text-slate-100 shadow-[0_22px_70px_rgba(2,8,23,0.35)]">
          <CardHeader action={<Badge className="border-white/10 bg-white/6 text-slate-200">{recentClients.length} recientes</Badge>}>
            <div>
              <CardTitle className="text-xl text-white">Clientes recientes</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                Ultimas atribuciones visibles desde `GET /api/partners/me/clients`, sin exponer identificadores internos.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {recentClients.length === 0 ? (
              <EmptyState
                icon={<Users2 className="h-5 w-5" />}
                title="Todavia no tenes clientes visibles"
                description="Cuando una atribucion quede asociada a tu cuenta, aparecera aca con su estado real."
                className="min-h-[260px] border-white/10 bg-white/[0.03] text-slate-100"
              />
            ) : (
              recentClients.map((client) => (
                <div key={client.id} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{client.clinicName || "Cliente atribuido"}</p>
                      <p className="mt-1 text-xs text-slate-400">Fecha de atribucion: {formatPortalDate(client.attributedAt)}</p>
                    </div>
                    <Badge variant={client.status === "active" ? "success" : "outline"}>{summarizeAttributionStatus(client.status)}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                    <span className="rounded-full border border-white/10 bg-slate-950/35 px-3 py-1">Origen: {client.attributionSource || "No informado"}</span>
                    {client.notes ? <span className="rounded-full border border-white/10 bg-slate-950/35 px-3 py-1">Detalle: {client.notes}</span> : null}
                    {client.endedAt ? <span className="rounded-full border border-white/10 bg-slate-950/35 px-3 py-1">Cierre: {formatPortalDate(client.endedAt)}</span> : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(9,19,34,0.92),rgba(10,23,40,0.84))] text-slate-100 shadow-[0_22px_70px_rgba(2,8,23,0.35)]">
            <CardHeader action={<Badge className="border-white/10 bg-white/6 text-slate-200">Rank progress</Badge>}>
              <div>
                <CardTitle className="text-xl text-white">Progreso de carrera</CardTitle>
                <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                  Referencia visible desde `GET /api/partners/me/rank-progress` y rango actual publicado.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-0">
              <div className="grid gap-3 md:grid-cols-2">
                <MetricStrip dark label="Rango actual" value={formatRankLabel(currentRank)} icon={<BadgeCheck className="h-4 w-4" />} />
                <MetricStrip dark label="Proximo rango" value={nextRankLabel} icon={<ArrowRight className="h-4 w-4" />} />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
                  <span>Progreso visible</span>
                  <span className="font-medium text-slate-200">{stepProgress}%</span>
                </div>
                <div className="h-3 rounded-full bg-white/10">
                  <div className="h-3 rounded-full bg-[linear-gradient(90deg,#f59e0b,#ec4899)]" style={{ width: `${stepProgress}%` }} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Requisitos cumplidos</p>
                  {currentRequirements.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {currentRequirements.map((rule) => (
                        <span key={rule} className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
                          {rule}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-slate-400">Todavia no hay un rango evaluado visible para marcar requisitos cumplidos.</p>
                  )}
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Requisitos pendientes</p>
                  {nextRequirements.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {nextRequirements.map((rule) => (
                        <span key={rule} className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">
                          {rule}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-slate-400">No hay un proximo rango publicado o ya alcanzaste el nivel maximo visible.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">
                La evaluacion oficial y cualquier meta cuantificada siguen dependiendo del backend. Esta vista no recalcula reglas privadas ni comisiones.
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(14,23,39,0.92),rgba(12,21,37,0.86))] text-slate-100 shadow-[0_22px_70px_rgba(2,8,23,0.32)]">
            <CardHeader action={<Badge className="border-white/10 bg-white/6 text-slate-200">Proximamente</Badge>}>
              <div>
                <CardTitle className="text-xl text-white">Proxima etapa</CardTitle>
                <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                  Hoja de ruta visible del portal partner sin adelantar datos no publicados.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.04] p-5">
                <p className="text-base font-semibold text-white">El detalle de pagos y comisiones estara disponible en una proxima etapa.</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  Esta version prioriza visibilidad de cartera, estado y carrera usando solamente informacion real disponible hoy.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function ClientsView({
  clients,
  query,
  statusFilter,
  paymentFilter,
  sortKey,
  selectedClientId,
  onQueryChange,
  onStatusFilterChange,
  onPaymentFilterChange,
  onSortKeyChange,
  onSelectedClientChange
}: {
  clients: PartnerPortalClientAttribution[];
  query: string;
  statusFilter: string;
  paymentFilter: string;
  sortKey: ClientSortKey;
  selectedClientId: string | null;
  onQueryChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onPaymentFilterChange: (value: string) => void;
  onSortKeyChange: (value: ClientSortKey) => void;
  onSelectedClientChange: (value: string | null) => void;
}) {
  const statuses = useMemo(() => ["all", ...Array.from(new Set(clients.map((item) => String(item.status || "").trim().toLowerCase()).filter(Boolean)))], [clients]);
  const paymentStates = useMemo(() => {
    const states = clients
      .map((item) => resolvePartnerClientPaymentState(item))
      .filter((state) => state !== "unknown");
    return states.length > 0 ? ["all", ...Array.from(new Set(states))] : [];
  }, [clients]);
  const normalizedQuery = query.trim().toLowerCase();
  const hasUsableDates = clients.some((item) => Boolean(item.attributedAt));
  const hasVisibleNames = clients.some((item) => Boolean(String(item.clinicName || "").trim()));
  const hasBillingStates = paymentStates.length > 0;
  const filtered = useMemo(() => {
    const visible = clients.filter((item, index) => {
      const displayName = resolvePartnerClientDisplayName(item, index).toLowerCase();
      const billingState = resolvePartnerClientPaymentState(item);
      const extraDetails = [
        item.notes,
        item.attributionSource,
        item.billing?.planName,
        summarizePartnerBillingState(billingState),
        summarizePartnerSubscriptionStatus(item.billing?.subscriptionStatus)
      ].map((value) => String(value || "").toLowerCase()).join(" ");
      const matchesQuery = !normalizedQuery || displayName.includes(normalizedQuery) || extraDetails.includes(normalizedQuery);
      const matchesStatus = statusFilter === "all" || String(item.status || "").trim().toLowerCase() === statusFilter;
      const matchesPayment = paymentFilter === "all" || billingState === paymentFilter;
      return matchesQuery && matchesStatus && matchesPayment;
    });

    return visible.sort((left, right) => {
      if (sortKey === "name") {
        return resolvePartnerClientDisplayName(left).localeCompare(resolvePartnerClientDisplayName(right), "es");
      }

      const leftTime = left.attributedAt ? new Date(left.attributedAt).getTime() : 0;
      const rightTime = right.attributedAt ? new Date(right.attributedAt).getTime() : 0;
      if (sortKey === "oldest") return leftTime - rightTime;
      return rightTime - leftTime;
    });
  }, [clients, normalizedQuery, paymentFilter, sortKey, statusFilter]);

  const selectedClient = filtered.find((item) => item.id === selectedClientId) || null;
  const activeClients = clients.filter((item) => String(item.status || "").trim().toLowerCase() === "active").length;
  const currentPaymentClients = clients.filter((item) => resolvePartnerClientPaymentState(item) === "current").length;
  const pendingOrOverdueClients = clients.filter((item) => {
    const state = resolvePartnerClientPaymentState(item);
    return state === "pending" || state === "overdue";
  }).length;
  useEffect(() => {
    if (selectedClientId && !filtered.some((item) => item.id === selectedClientId)) {
      onSelectedClientChange(null);
    }
  }, [filtered, onSelectedClientChange, selectedClientId]);

  useEffect(() => {
    if (hasBillingStates && paymentFilter !== "all" && !paymentStates.includes(paymentFilter)) {
      onPaymentFilterChange("all");
    }
  }, [hasBillingStates, onPaymentFilterChange, paymentFilter, paymentStates]);

  useEffect(() => {
    const sortOptions: ClientSortKey[] = [];
    if (hasUsableDates) {
      sortOptions.push("recent", "oldest");
    }
    if (hasVisibleNames) {
      sortOptions.push("name");
    }
    if (sortOptions.length > 0 && !sortOptions.includes(sortKey)) {
      onSortKeyChange(sortOptions[0]);
    }
  }, [hasUsableDates, hasVisibleNames, onSortKeyChange, sortKey]);

  const isTrueEmpty = clients.length === 0;
  const hasNoMatches = !isTrueEmpty && filtered.length === 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
        <Card className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_24%),radial-gradient(circle_at_85%_20%,rgba(59,130,246,0.16),transparent_24%),linear-gradient(180deg,rgba(8,18,34,0.95),rgba(9,21,38,0.84))] text-slate-100 shadow-[0_22px_70px_rgba(2,8,23,0.42)]">
          <CardContent className="p-6 md:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-amber-300/20 bg-amber-300/10 text-amber-100">Mis clientes</Badge>
              <Badge className="border-white/10 bg-white/6 text-slate-200">Contrato real</Badge>
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-[2.45rem]">Cartera del asesor</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Vista comercial de tus atribuciones activas e historicas usando unicamente los campos reales del endpoint partner.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">Total visible: {clients.length}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">Estados reales: {statuses.length - 1 || 0}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">Sin UUIDs expuestos</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(9,19,34,0.92),rgba(10,23,40,0.84))] text-slate-100 shadow-[0_22px_70px_rgba(2,8,23,0.35)]">
          <CardHeader action={<Badge className="border-white/10 bg-white/6 text-slate-200">Lectura de cartera</Badge>}>
            <div>
              <CardTitle className="text-xl text-white">Resumen superior</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                Derivado de atribuciones reales y billing publicado, sin importes ni comisiones inventadas.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0 md:grid-cols-3 xl:grid-cols-1">
            <MetricStrip dark label="Clientes totales" value={String(clients.length)} icon={<Users2 className="h-4 w-4" />} />
            <MetricStrip dark label="Al dia" value={hasBillingStates ? String(currentPaymentClients) : "Sin dato"} icon={<BadgeCheck className="h-4 w-4" />} />
            <MetricStrip dark label="Pendientes o vencidos" value={hasBillingStates ? String(pendingOrOverdueClients) : "Sin dato"} icon={<CalendarRange className="h-4 w-4" />} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(9,19,34,0.92),rgba(10,23,40,0.82))] text-slate-100 shadow-[0_20px_65px_rgba(2,8,23,0.34)]">
            <CardContent className={`grid gap-3 p-5 ${hasBillingStates ? "md:grid-cols-[minmax(0,1.4fr)_160px_160px_180px]" : "md:grid-cols-[minmax(0,1.4fr)_180px_180px]"}`}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  placeholder="Buscar por nombre, nota u origen"
                  className="border-white/10 bg-white/[0.05] pl-9 text-slate-100 placeholder:text-slate-500"
                />
              </div>

              <label className="grid gap-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Estado
                <select
                  value={statusFilter}
                  onChange={(event) => onStatusFilterChange(event.target.value)}
                  className="h-10 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm normal-case tracking-normal text-slate-100 outline-none"
                >
                  {statuses.map((currentStatus) => (
                    <option key={currentStatus} value={currentStatus} className="bg-slate-900 text-slate-100">
                      {currentStatus === "all" ? "Todos los estados" : summarizeAttributionStatus(currentStatus)}
                    </option>
                  ))}
                </select>
              </label>

              {hasBillingStates ? (
                <label className="grid gap-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Pago
                  <select
                    value={paymentFilter}
                    onChange={(event) => onPaymentFilterChange(event.target.value)}
                    className="h-10 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm normal-case tracking-normal text-slate-100 outline-none"
                  >
                    {paymentStates.map((currentState) => (
                      <option key={currentState} value={currentState} className="bg-slate-900 text-slate-100">
                        {currentState === "all" ? "Todos los estados de pago" : summarizePartnerBillingState(currentState)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="grid gap-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Orden
                <select
                  value={sortKey}
                  onChange={(event) => onSortKeyChange(event.target.value as ClientSortKey)}
                  className="h-10 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm normal-case tracking-normal text-slate-100 outline-none"
                >
                  {hasUsableDates ? <option value="recent" className="bg-slate-900 text-slate-100">Mas recientes</option> : null}
                  {hasUsableDates ? <option value="oldest" className="bg-slate-900 text-slate-100">Mas antiguas</option> : null}
                  {hasVisibleNames ? <option value="name" className="bg-slate-900 text-slate-100">Nombre A-Z</option> : null}
                </select>
              </label>
            </CardContent>
          </Card>

          {isTrueEmpty ? (
            <EmptyState
              icon={<Users2 className="h-5 w-5" />}
              title="Todavia no tenes clientes atribuidos"
              description="Cuando una atribucion quede asociada a tu cuenta, la cartera se va a completar automaticamente con su estado real."
              className="min-h-[340px] border-white/10 bg-white/[0.04] text-slate-100"
            />
          ) : hasNoMatches ? (
            <EmptyState
              icon={<Search className="h-5 w-5" />}
              title="No encontramos clientes con esos filtros"
              description="Proba cambiar el texto de busqueda o volver a todos los estados para revisar la cartera completa."
              action={{ label: "Limpiar filtros", onClick: () => { onQueryChange(""); onStatusFilterChange("all"); onPaymentFilterChange("all"); } }}
              className="min-h-[340px] border-white/10 bg-white/[0.04] text-slate-100"
            />
          ) : (
            <>
              <Card className="hidden overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(10,20,36,0.92),rgba(9,18,33,0.84))] text-slate-100 shadow-[0_20px_65px_rgba(2,8,23,0.32)] lg:block">
                <CardContent className="p-0">
                  {hasBillingStates ? (
                    <div className="grid grid-cols-[minmax(0,1.25fr)_110px_120px_135px_120px_135px_120px] gap-3 border-b border-white/10 px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <span>Cliente o negocio</span>
                      <span>Estado</span>
                      <span>Atribucion</span>
                      <span>Origen</span>
                      <span>Pago</span>
                      <span>Plan</span>
                      <span>Vinculo</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-[minmax(0,1.8fr)_150px_160px_160px_160px] gap-3 border-b border-white/10 px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <span>Cliente o negocio</span>
                      <span>Estado</span>
                      <span>Atribucion</span>
                      <span>Origen</span>
                      <span>Vinculo</span>
                    </div>
                  )}
                  {filtered.map((client, index) => {
                    const selected = client.id === selectedClientId;
                    const paymentState = resolvePartnerClientPaymentState(client);
                    return (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => onSelectedClientChange(client.id)}
                        className={`grid w-full gap-3 border-b border-white/10 px-5 py-4 text-left text-sm transition-colors last:border-b-0 ${
                          hasBillingStates
                            ? "grid-cols-[minmax(0,1.25fr)_110px_120px_135px_120px_135px_120px]"
                            : "grid-cols-[minmax(0,1.8fr)_150px_160px_160px_160px]"
                        } ${
                          selected ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">{resolvePartnerClientDisplayName(client, index)}</p>
                          <p className="mt-1 truncate text-xs text-slate-400">{client.notes || "Informacion adicional no publicada"}</p>
                        </div>
                        <div>
                          <Badge variant={client.status === "active" ? "success" : "outline"}>{summarizeAttributionStatus(client.status)}</Badge>
                        </div>
                        <div className="text-slate-300">{formatPortalDate(client.attributedAt)}</div>
                        {hasBillingStates ? (
                          <>
                            <div className="text-slate-300">{summarizeAttributionSource(client.attributionSource)}</div>
                            <div>
                              <Badge variant={partnerBillingVariant(paymentState)}>{summarizePartnerBillingState(paymentState)}</Badge>
                            </div>
                            <div className="truncate text-slate-300">{client.billing?.planName || "Sin informacion"}</div>
                            <div className="text-slate-300">{client.endedAt ? "Vinculo finalizado" : "Vinculo vigente"}</div>
                          </>
                        ) : (
                          <>
                            <div className="text-slate-300">{summarizeAttributionSource(client.attributionSource)}</div>
                            <div className="text-slate-300">{client.endedAt ? "Vinculo finalizado" : "Vinculo vigente"}</div>
                          </>
                        )}
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              <div className="grid gap-3 lg:hidden">
                {filtered.map((client, index) => (
                  <button key={client.id} type="button" onClick={() => onSelectedClientChange(client.id)} className="text-left">
                    <Card className={`border-white/10 bg-[linear-gradient(180deg,rgba(10,20,36,0.94),rgba(9,18,33,0.86))] text-slate-100 ${client.id === selectedClientId ? "ring-1 ring-amber-300/35" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-white">{resolvePartnerClientDisplayName(client, index)}</p>
                            <p className="mt-1 text-xs text-slate-400">{formatPortalDate(client.attributedAt)}</p>
                          </div>
                          <Badge variant={client.status === "active" ? "success" : "outline"}>{summarizeAttributionStatus(client.status)}</Badge>
                        </div>
                        <div className="mt-4 grid gap-2 text-sm text-slate-300">
                          <p>Origen: {summarizeAttributionSource(client.attributionSource)}</p>
                          <p>Vinculo: {client.endedAt ? "Finalizado" : "Vigente"}</p>
                          {hasPartnerClientBilling(client) ? <p>Pago: {summarizePartnerBillingState(resolvePartnerClientPaymentState(client))}</p> : null}
                          {client.billing?.planName ? <p>Plan: {client.billing.planName}</p> : null}
                          <p>{client.notes || "Sin observaciones comerciales publicadas"}</p>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-amber-100">
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                          Ver detalle
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <ClientDetailDrawer client={selectedClient} onClose={() => onSelectedClientChange(null)} />
      </section>
    </div>
  );
}

function ClientDetailDrawer({
  client,
  onClose
}: {
  client: PartnerPortalClientAttribution | null;
  onClose: () => void;
}) {
  return (
    <>
      {client ? <button type="button" aria-label="Cerrar detalle" className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-sm xl:hidden" onClick={onClose} /> : null}
      <aside
        className={`${
          client ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 xl:translate-x-0 xl:opacity-100"
        } fixed inset-y-0 right-0 z-40 w-full max-w-[420px] border-l border-white/10 bg-[linear-gradient(180deg,rgba(5,12,23,0.98),rgba(8,18,34,0.98))] p-4 shadow-[0_28px_90px_rgba(2,8,23,0.55)] transition-all duration-300 xl:sticky xl:top-8 xl:h-[calc(100vh-4rem)] xl:rounded-[28px] xl:border xl:bg-[linear-gradient(180deg,rgba(9,19,34,0.92),rgba(10,23,40,0.84))]`}
      >
        {client ? (
          <div className="flex h-full flex-col">
            {(() => {
              const paymentState = resolvePartnerClientPaymentState(client);
              const showBilling = hasPartnerClientBilling(client);
              return (
                <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge className="border-amber-300/20 bg-amber-300/10 text-amber-100">Detalle</Badge>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">{resolvePartnerClientDisplayName(client)}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">Ficha comercial de solo lectura con atribucion y estado de billing publicados para esta cartera.</p>
              </div>
              <Button variant="ghost" size="sm" className="text-slate-300 hover:bg-white/10 hover:text-white" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-6 space-y-3">
              <MetricStrip dark label="Estado" value={summarizeAttributionStatus(client.status)} icon={<BadgeCheck className="h-4 w-4" />} />
              <MetricStrip dark label="Fecha de atribucion" value={formatPortalDate(client.attributedAt)} icon={<CalendarRange className="h-4 w-4" />} />
              <MetricStrip dark label="Origen de atribucion" value={summarizeAttributionSource(client.attributionSource)} icon={<ChevronRight className="h-4 w-4" />} />
              {showBilling ? <MetricStrip dark label="Estado de pago" value={summarizePartnerBillingState(paymentState)} icon={<BadgeCheck className="h-4 w-4" />} /> : null}
            </div>

            <div className="mt-6 grid gap-3">
              <DrawerField label="Estado del vinculo" value={client.endedAt ? "Finalizado" : "Vigente"} />
              {client.endedAt ? <DrawerField label="Fecha de cierre" value={formatPortalDate(client.endedAt)} /> : null}
              {showBilling ? <DrawerField label="Suscripcion" value={summarizePartnerSubscriptionStatus(client.billing?.subscriptionStatus)} /> : null}
              {client.billing?.planName ? <DrawerField label="Plan" value={client.billing.planName} /> : null}
              {client.billing?.lastAccreditedPaymentAt ? <DrawerField label="Ultima acreditacion" value={formatPortalDate(client.billing.lastAccreditedPaymentAt)} /> : null}
              {client.billing?.nextPaymentAt ? <DrawerField label="Proximo vencimiento" value={formatPortalDate(client.billing.nextPaymentAt)} /> : null}
              <DrawerField label="Informacion adicional" value={client.notes || "Sin observaciones comerciales publicadas"} multiline />
              {!client.billing?.lastAccreditedPaymentAt && !client.billing?.nextPaymentAt ? (
                <DrawerField label="Pagos" value="Sin informacion confiable de pagos publicada para este cliente." multiline />
              ) : null}
            </div>

            <div className="mt-auto rounded-[24px] border border-dashed border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-300">
              No se muestran importes, comisiones ni identificadores internos. Esta vista queda lista para sumar mas detalle comercial cuando el backend lo publique.
            </div>
                </>
              );
            })()}
          </div>
        ) : (
          <div className="flex h-full flex-col justify-between rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-slate-100">
            <div>
              <Badge className="border-white/10 bg-white/6 text-slate-200">Panel de detalle</Badge>
              <h2 className="mt-4 text-xl font-semibold text-white">Selecciona un cliente</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                Al abrir una ficha vas a ver identidad visible, estado, fecha de atribucion, origen y observaciones reales de la cartera.
              </p>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-300">
              Este lateral ya muestra billing publicado y queda preparado para sumar mas detalle comercial sin exponer datos sensibles.
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function DrawerField({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-2 text-sm font-medium text-slate-100 ${multiline ? "leading-7" : ""}`}>{value}</p>
    </div>
  );
}

function CareerView({
  partner,
  summary,
  progress
}: {
  partner: PartnerPortalPartner | null;
  summary: PartnerPortalSummary | null;
  progress: PartnerPortalCareerProgress | null;
}) {
  const rankHistory = Array.isArray(progress?.rankHistory) ? progress?.rankHistory : [];
  const currentRank = progress?.currentRank || resolveCurrentRank(summary, partner, rankHistory);
  const nextRank = progress?.nextRank || null;
  const progressPercent = clampCareerProgress(progress?.progressPercent);
  const fallbackProgress = resolveCareerStepProgress(currentRank);
  const visibleProgress = progressPercent ?? fallbackProgress;
  const requirements = Array.isArray(progress?.requirements) ? progress.requirements : [];
  const completedRequirements = requirements.filter((item) => item.completed);
  const pendingRequirements = requirements.filter((item) => !item.completed);
  const evaluationStatus = summarizeCareerEvaluationStatus(progress?.evaluationStatus);
  const hasEvaluation = String(progress?.evaluationStatus || "").trim().toLowerCase() === "complete";
  const isMaxRank = !nextRank && String(currentRank || "").trim().toLowerCase() === "emperador";
  const evaluationWindow = progress?.windowStart && progress?.windowEnd
    ? `${formatPortalDate(progress.windowStart)} al ${formatPortalDate(progress.windowEnd)}`
    : null;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1fr_0.96fr]">
        <Card className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_24%),radial-gradient(circle_at_85%_18%,rgba(59,130,246,0.16),transparent_24%),linear-gradient(180deg,rgba(8,18,34,0.95),rgba(9,21,38,0.84))] text-slate-100 shadow-[0_22px_70px_rgba(2,8,23,0.42)]">
          <CardHeader action={<Badge className="border-emerald-300/20 bg-emerald-300/10 text-emerald-100">{formatRankLabel(currentRank)}</Badge>}>
            <div>
              <CardTitle className="text-3xl text-white">Mi carrera</CardTitle>
              <CardDescription className="mt-2 text-sm leading-7 text-slate-300">
                Entende tu rango actual, el siguiente objetivo visible y lo que falta para avanzar usando solo la evaluacion publicada por backend.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            <div className="flex flex-wrap gap-2">
              <Badge className="border-white/10 bg-white/8 text-slate-100">{evaluationStatus}</Badge>
              {progress?.evaluatedAt ? <Badge className="border-white/10 bg-white/8 text-slate-200">Evaluado: {formatPortalDate(progress.evaluatedAt)}</Badge> : null}
              {evaluationWindow ? <Badge className="border-white/10 bg-white/8 text-slate-200">Ventana: {evaluationWindow}</Badge> : null}
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-300">
              {isMaxRank
                ? "Alcanzaste el nivel mas alto de la carrera."
                : nextRank
                  ? `Tu proximo rango visible es ${formatRankLabel(nextRank)}. Esta vista muestra faltantes reales sin recalcular reglas en el navegador.`
                  : hasEvaluation
                    ? "No hay un proximo rango visible en la evaluacion actual."
                    : "Todavia no hay una evaluacion cuantificada visible para mostrar faltantes reales."}
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <MetricStrip dark label="Rango actual" value={formatRankLabel(currentRank)} icon={<BadgeCheck className="h-4 w-4" />} />
              <MetricStrip dark label="Proximo rango" value={nextRank ? formatRankLabel(nextRank) : (isMaxRank ? "Rango maximo" : "Sin dato")} icon={<ArrowRight className="h-4 w-4" />} />
              <MetricStrip dark label="Progreso visible" value={visibleProgress === null ? "Sin dato" : `${visibleProgress}%`} icon={<TrendingUp className="h-4 w-4" />} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(9,19,34,0.92),rgba(10,23,40,0.84))] text-slate-100 shadow-[0_22px_70px_rgba(2,8,23,0.35)]">
          <CardHeader action={<Badge className="border-white/10 bg-white/6 text-slate-200">Progreso principal</Badge>}>
            <div>
              <CardTitle className="text-2xl text-white">Progreso principal</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                Indicadores tomados directamente de la evaluacion partner y sus umbrales oficiales.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
                <span>Avance hacia el siguiente rango</span>
                <span className="font-medium text-slate-100">{visibleProgress === null ? "Sin dato" : `${visibleProgress}%`}</span>
              </div>
              <div className="h-3 rounded-full bg-white/10">
                <div className="h-3 rounded-full bg-[linear-gradient(90deg,#f59e0b,#38bdf8)]" style={{ width: `${visibleProgress ?? 6}%` }} />
              </div>
            </div>
            {requirements.length > 0 ? (
              <>
                <div className="grid gap-3">
                  {requirements.map((requirement) => (
                    <CareerRequirementCard key={requirement.code} requirement={requirement} />
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Requisitos cumplidos</p>
                    {completedRequirements.length > 0 ? (
                      <div className="mt-3 grid gap-3">
                        {completedRequirements.map((requirement) => (
                          <RequirementPill key={requirement.code} tone="success" text={requirement.label} />
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-slate-400">Todavia no hay requisitos marcados como cumplidos en la ultima evaluacion visible.</p>
                    )}
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Requisitos pendientes</p>
                    {pendingRequirements.length > 0 ? (
                      <div className="mt-3 grid gap-3">
                        {pendingRequirements.map((requirement) => (
                          <RequirementPill key={requirement.code} tone="warning" text={summarizeCareerRequirementGap(requirement)} />
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-slate-400">{isMaxRank ? "No hay requisitos pendientes porque ya alcanzaste el rango maximo visible." : "No hay faltantes visibles en esta evaluacion."}</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <EmptyState
                icon={<Sparkles className="h-5 w-5" />}
                title={hasEvaluation ? "Respuesta incompleta para progreso detallado" : "Sin evaluacion cuantificada visible"}
                description={hasEvaluation
                  ? "El backend publica rango y evaluacion, pero no hay requisitos suficientes en esta respuesta para mostrar faltantes reales."
                  : "Cuando exista una evaluacion de carrera publicada para tu cuenta, esta vista mostrara objetivos cumplidos y pendientes."}
                className="min-h-[320px] border-white/10 bg-white/[0.03] text-slate-100"
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,20,36,0.92),rgba(9,18,33,0.84))] text-slate-100 shadow-[0_22px_70px_rgba(2,8,23,0.35)]">
          <CardHeader>
            <div>
              <CardTitle className="text-2xl text-white">Escalera de rangos</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                Reglas aprobadas y jerarquia visible para entender tu ubicacion actual y el proximo tramo.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0">
            {PARTNER_CAREER_LADDER.map((level, index) => {
              const normalizedLevel = level.code;
              const currentIndex = PARTNER_CAREER_LADDER.findIndex((item) => item.code === String(currentRank || "").trim().toLowerCase());
              const nextIndex = PARTNER_CAREER_LADDER.findIndex((item) => item.code === String(nextRank || "").trim().toLowerCase());
              const isCurrent = normalizedLevel === String(currentRank || "").trim().toLowerCase();
              const isNext = nextRank ? normalizedLevel === String(nextRank || "").trim().toLowerCase() : false;
              const reached = currentIndex >= 0 && index < currentIndex;
              const future = currentIndex >= 0 && index > currentIndex;
              return (
                <div
                  key={level.code}
                  className={`rounded-[24px] border p-4 ${
                    isCurrent
                      ? "border-emerald-300/30 bg-emerald-300/10"
                      : isNext
                        ? "border-amber-300/30 bg-amber-300/10"
                        : reached
                          ? "border-sky-300/20 bg-sky-300/10"
                          : future || nextIndex >= 0
                            ? "border-white/10 bg-white/[0.04]"
                            : "border-white/10 bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-base font-semibold text-white">{level.label}</p>
                    {isCurrent ? <Badge variant="success">Actual</Badge> : isNext ? <Badge variant="warning">Siguiente</Badge> : reached ? <Badge variant="outline">Alcanzado</Badge> : <Badge variant="outline">Futuro</Badge>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {level.rules.map((rule) => (
                      <span key={rule} className="rounded-full border border-white/10 bg-slate-950/35 px-3 py-1 text-xs text-slate-200">{rule}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(14,23,39,0.92),rgba(12,21,37,0.86))] text-slate-100 shadow-[0_22px_70px_rgba(2,8,23,0.32)]">
          <CardHeader>
          <div>
            <CardTitle className="text-xl text-white">Aclaraciones vigentes</CardTitle>
            <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
              Contenido informativo aprobado para esta fase visual del portal.
            </CardDescription>
          </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0">
            <RuleCallout dark title="Tope recurrente" body="Tope recurrente acumulado por cliente: 15%." />
            <RuleCallout dark title="Sin pago por reclutar" body="No se paga por reclutar. La comision depende de operacion real." />
            <RuleCallout dark title="Evento valido" body="Solo se comisionan pagos reales acreditados y no revertidos." />
            <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">
              {isMaxRank
                ? "Alcanzaste el nivel mas alto de la carrera."
                : hasEvaluation
                  ? "Los faltantes visibles dependen de la ultima evaluacion publicada. Si la respuesta cambia, esta vista se actualiza sin recalcular reglas privadas."
                  : "Hasta que exista una evaluacion visible, solo podemos mostrar la escalera aprobada y tu rango actual publicado."}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function CareerRequirementCard({ requirement }: { requirement: PartnerPortalCareerRequirement }) {
  const currentValue = formatCareerRequirementValue(requirement, requirement.currentValue);
  const targetValue = formatCareerRequirementValue(requirement, requirement.targetValue);
  const completion = requirement.completed
    ? 100
    : requirement.valueType === "currency"
      ? (() => {
          const current = Number(requirement.currentValue || 0);
          const target = Number(requirement.targetValue || 0);
          if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return 0;
          return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
        })()
      : (() => {
          const current = Number(requirement.currentValue || 0);
          const target = Number(requirement.targetValue || 0);
          if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return 0;
          return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
        })();

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{requirement.label}</p>
          <p className="mt-1 text-sm text-slate-300">{currentValue} de {targetValue}</p>
        </div>
        <Badge variant={requirement.completed ? "success" : "warning"}>
          {requirement.completed ? "Cumplido" : "Pendiente"}
        </Badge>
      </div>
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          <span>Progreso</span>
          <span>{completion}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-white/10">
          <div className="h-2.5 rounded-full bg-[linear-gradient(90deg,#f59e0b,#38bdf8)]" style={{ width: `${completion}%` }} />
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{summarizeCareerRequirementGap(requirement)}</p>
    </div>
  );
}

function RequirementPill({ text, tone }: { text: string; tone: "success" | "warning" }) {
  return (
    <div className={`rounded-[18px] border px-3 py-2 text-sm ${
      tone === "success"
        ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
        : "border-amber-300/20 bg-amber-300/10 text-amber-100"
    }`}>
      {text}
    </div>
  );
}

function CommissionsView({ summary, partner }: { summary: PartnerPortalSummary | null; partner: PartnerPortalPartner | null }) {
  return (
    <div className="space-y-6">
      <Card className="border-slate-200/80 bg-white/92">
        <CardHeader action={<Badge variant="warning">Proximamente</Badge>}>
          <div>
            <CardTitle className="text-3xl text-slate-950">Comisiones</CardTitle>
            <CardDescription className="mt-2 text-sm leading-6 text-slate-600">
              La vista queda preparada para self-service, pero esta etapa no crea ni finge un endpoint nuevo.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Resumen actual</p>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{formatPortalMoney(summary?.generatedCommissions || null)}</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Este importe proviene del resumen del partner. El detalle de movimientos todavia no esta publicado para consulta directa del asesor.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant={partnerStatusVariant(partner?.status)}>{formatPartnerStatus(partner?.status)}</Badge>
              <Badge variant="outline">{formatRankLabel(summary?.latestRank || partner?.currentRankCode)}</Badge>
            </div>
          </div>

          <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-5">
            <p className="text-lg font-semibold text-slate-950">El detalle de movimientos estara disponible en la proxima etapa.</p>
            <div className="mt-4 grid gap-3 text-sm leading-7 text-slate-600 md:grid-cols-2">
              <RuleCallout title="Como se genera" body="Pagos reales, acreditados y no revertidos." />
              <RuleCallout title="Tipos previstos" body="Alta propia, recurrente propio, lineas y reversion cuando corresponda." />
              <RuleCallout title="Transparencia" body="La UI no recalcula importes ni arma simulaciones en produccion." />
              <RuleCallout title="Siguiente fase" body="Cuando exista endpoint self-service, esta pantalla ya esta lista para conectarlo." />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileView({
  partner,
  summary,
  rankHistory
}: {
  partner: PartnerPortalPartner | null;
  summary: PartnerPortalSummary | null;
  rankHistory: PartnerPortalRankHistoryEntry[];
}) {
  const sponsor = partner?.sponsorPartnerId;
  const sponsorLabel = sponsor && !isOpaqueIdentifier(sponsor) ? sponsor : sponsor ? "Asignado internamente" : "Sin sponsor visible";
  const currentRank = resolveCurrentRank(summary, partner, rankHistory);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200/80 bg-white/90 p-5 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge variant="outline">Perfil</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Datos de tu cuenta</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Vista de solo lectura usando `GET /api/partners/me`, sin editar campos que el backend no habilita.
          </p>
        </div>
        <Button variant="secondary" onClick={() => window.location.assign("/api/auth/signout?callbackUrl=/login")}>
          Cerrar sesion
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Card className="border-slate-200/80 bg-white/92">
          <CardContent className="grid gap-4 p-5 md:grid-cols-2">
            <ProfileField label="Nombre" value={safePartnerName(partner)} />
            <ProfileField label="Email" value={partner?.email || "Sin dato"} />
            <ProfileField label="Codigo" value={partner?.profile?.code || "Sin codigo"} />
            <ProfileField label="Telefono" value={partner?.profile?.phone || "Sin dato"} />
            <ProfileField label="Estado" value={formatPartnerStatus(partner?.status)} />
            <ProfileField label="Fecha de alta" value={formatPortalDate(partner?.createdAt)} />
            <ProfileField label="Ultimo acceso" value={formatPortalDateTime(partner?.lastLoginAt)} />
            <ProfileField label="Sponsor" value={sponsorLabel} />
            <ProfileField label="Rango actual" value={formatRankLabel(currentRank)} />
            <ProfileField label="Clientes activos" value={String(summary?.activeClients ?? partner?.activeAttributionCount ?? 0)} />
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/92">
          <CardHeader>
            <div>
              <CardTitle className="text-xl text-slate-950">Notas de esta etapa</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-600">
                Cuidamos no exponer identificadores internos ni propiedades no aprobadas para el partner.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0">
            <RuleCallout title="Sin edicion" body="Email, sponsor y rango siguen siendo de solo lectura hasta contar con endpoints dedicados." />
            <RuleCallout title="Sin UUIDs expuestos" body="Los identificadores opacos del backend no se muestran como dato de negocio." />
            <RuleCallout title="Sin secretos" body="No se renderizan claves internas, actor IDs ni metadata sensible." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  detail,
  dark = false
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  dark?: boolean;
}) {
  if (!dark) {
    return (
      <Card className="border-slate-200/80 bg-white/92">
        <CardContent className="p-5">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">{icon}</div>
          <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,20,36,0.92),rgba(9,18,33,0.84))] text-slate-100 shadow-[0_22px_70px_rgba(2,8,23,0.35)]">
      <CardContent className="p-5">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-100">{icon}</div>
        <p className="mt-4 text-sm font-medium text-slate-400">{label}</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>
      </CardContent>
    </Card>
  );
}

function MetricStrip({ label, value, icon, dark = false }: { label: string; value: string; icon: React.ReactNode; dark?: boolean }) {
  if (dark) {
    return (
      <div className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-100">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-1 truncate text-base font-semibold text-white">{value}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50/80 p-4">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <p className="mt-1 truncate text-base font-semibold text-slate-950">{value}</p>
      </div>
    </div>
  );
}

function RuleCallout({ title, body, dark = false }: { title: string; body: string; dark?: boolean }) {
  if (dark) {
    return (
      <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
      </div>
    );
  }
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50/75 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function WorkspaceLoading({ page }: { page: PartnerPortalPage }) {
  return (
    <div className="space-y-4">
      <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5">
        <SkeletonLine className="h-4 w-28 bg-white/10" />
        <SkeletonLine className="mt-4 h-8 w-2/5 bg-white/10" />
        <SkeletonLine className="mt-3 h-4 w-4/5 bg-white/10" />
      </div>
      <div className={`grid gap-4 ${page === "clients" ? "lg:grid-cols-1" : "md:grid-cols-2 xl:grid-cols-4"}`}>
        <SkeletonCard className="border-white/10 bg-white/[0.04]" />
        <SkeletonCard className="border-white/10 bg-white/[0.04]" />
        <SkeletonCard className="border-white/10 bg-white/[0.04]" />
        <SkeletonCard className="border-white/10 bg-white/[0.04]" />
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando datos reales del portal partner...
      </div>
    </div>
  );
}

function buildPartnerPreviewState(previewState: PreviewState): WorkspaceState {
  const base = getPartnerPortalPreviewData();
  if (previewState === "max") {
    return {
      ...base,
      partner: {
        ...base.partner,
        currentRankCode: "emperador"
      },
      summary: {
        ...base.summary,
        latestRank: "emperador"
      },
      careerProgress: {
        currentRank: "emperador",
        nextRank: null,
        progressPercent: 100,
        evaluationStatus: "complete",
        evaluatedAt: "2026-06-19T12:00:00.000Z",
        windowStart: "2026-05-20T00:00:00.000Z",
        windowEnd: "2026-06-19T23:59:59.000Z",
        requirements: [
          {
            code: "active_clients",
            label: "Clientes activos",
            currentValue: 12,
            targetValue: 8,
            remainingValue: 0,
            completed: true,
            valueType: "count",
            currency: null
          },
          {
            code: "generated_commission",
            label: "Objetivo comercial acreditado",
            currentValue: "210000.00",
            targetValue: "150000.00",
            remainingValue: "0.00",
            completed: true,
            valueType: "currency",
            currency: "ARS"
          }
        ],
        rankHistory: [
          {
            id: "preview-rank-max",
            partnerId: base.partner.id,
            rankCode: "emperador",
            effectiveFrom: "2026-06-19T12:00:00.000Z",
            effectiveTo: null,
            notes: "partner_rank_evaluated",
            createdAt: "2026-06-19T12:00:00.000Z"
          },
          ...base.rankHistory
        ],
        latestEvaluation: {
          currentRankCode: "emperador",
          nextRankCode: null
        }
      }
    };
  }
  if (previewState === "empty") {
    return {
      ...base,
      summary: {
        ...base.summary,
        activeClients: 0
      },
      clients: [],
      careerProgress: null
    };
  }
  return base;
}

function formatMetricValue(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "Sin dato";
}
