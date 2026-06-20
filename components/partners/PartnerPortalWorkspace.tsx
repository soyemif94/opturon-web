"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, BadgeCheck, BriefcaseBusiness, Loader2, Search, Sparkles, Star, TrendingUp, Users2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SkeletonCard, SkeletonLine } from "@/components/ui/skeleton";
import {
  PARTNER_CAREER_LADDER,
  getPartnerPortalPreviewData,
  type PartnerPortalClientAttribution,
  type PartnerPortalPage,
  type PartnerPortalPartner,
  type PartnerPortalRankHistoryEntry,
  type PartnerPortalSummary,
  formatPartnerStatus,
  formatPortalDate,
  formatPortalDateTime,
  formatPortalMoney,
  formatRankLabel,
  isOpaqueIdentifier,
  partnerStatusVariant,
  resolveCareerStepProgress,
  resolveCurrentRank,
  resolveNextRankLabel,
  safePartnerName,
  summarizeAttributionStatus
} from "@/lib/partners-portal";

type WorkspaceState = {
  partner?: PartnerPortalPartner | null;
  summary?: PartnerPortalSummary | null;
  clients?: PartnerPortalClientAttribution[];
  rankHistory?: PartnerPortalRankHistoryEntry[];
};

type PreviewState = "default" | "empty" | "error";

const PAGE_LOADERS: Record<PartnerPortalPage, Array<keyof WorkspaceState>> = {
  home: ["partner", "summary", "clients", "rankHistory"],
  clients: ["clients"],
  career: ["rankHistory", "summary", "partner"],
  commissions: ["summary", "partner"],
  profile: ["partner", "summary", "rankHistory"]
};

const ENDPOINTS: Record<keyof WorkspaceState, string> = {
  partner: "/api/partners/me",
  summary: "/api/partners/me/summary",
  clients: "/api/partners/me/clients",
  rankHistory: "/api/partners/me/rank-progress"
};

export function PartnerPortalWorkspace({ page }: { page: PartnerPortalPage }) {
  const [state, setState] = useState<WorkspaceState>({});
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
        onQueryChange={setQuery}
        onStatusFilterChange={setStatusFilter}
      />
    );
  }

  if (page === "career") {
    return <CareerView partner={state.partner || null} summary={state.summary || null} rankHistory={state.rankHistory || []} />;
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
  onQueryChange,
  onStatusFilterChange
}: {
  clients: PartnerPortalClientAttribution[];
  query: string;
  statusFilter: string;
  onQueryChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
}) {
  const statuses = useMemo(() => ["all", ...Array.from(new Set(clients.map((item) => String(item.status || "").trim()).filter(Boolean)))], [clients]);
  const filtered = useMemo(() => {
    return clients.filter((item) => {
      const matchesQuery = !query || `${item.clinicName || ""}`.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [clients, query, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200/80 bg-white/88 p-5 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge variant="outline">Mis clientes</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Clientes atribuidos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Seguimiento de tus clientes visibles en el contrato actual, sin exponer datos internos innecesarios.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Buscar por nombre" className="border-slate-200 bg-slate-50 pl-9 text-slate-900 placeholder:text-slate-400" />
          </div>
          <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none">
            {statuses.map((currentStatus) => (
              <option key={currentStatus} value={currentStatus}>
                {currentStatus === "all" ? "Todos los estados" : summarizeAttributionStatus(currentStatus)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users2 className="h-5 w-5" />}
          title="Todavia no tenes clientes atribuidos"
          description="Cuando una venta quede asociada a tu cuenta, vas a verla reflejada aca."
          className="min-h-[340px] border-slate-200 bg-white/88 text-slate-900"
        />
      ) : (
        <>
          <Card className="hidden overflow-hidden border-slate-200/80 bg-white/90 lg:block">
            <CardContent className="p-0">
              <div className="grid grid-cols-[minmax(0,1.6fr)_160px_170px_180px] gap-3 border-b border-slate-200/80 px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                <span>Cliente</span>
                <span>Estado</span>
                <span>Fecha</span>
                <span>Origen</span>
              </div>
              {filtered.map((client) => (
                <div key={client.id} className="grid grid-cols-[minmax(0,1.6fr)_160px_170px_180px] gap-3 border-b border-slate-200/70 px-5 py-4 text-sm last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">{client.clinicName || "Cliente atribuido"}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{client.notes || "Sin observaciones visibles"}</p>
                  </div>
                  <div>
                    <Badge variant={client.status === "active" ? "success" : "outline"}>{summarizeAttributionStatus(client.status)}</Badge>
                  </div>
                  <div className="text-slate-600">{formatPortalDate(client.attributedAt)}</div>
                  <div className="text-slate-600">{client.attributionSource || "No informado"}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-3 lg:hidden">
            {filtered.map((client) => (
              <Card key={client.id} className="border-slate-200/80 bg-white/92">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-950">{client.clinicName || "Cliente atribuido"}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatPortalDate(client.attributedAt)}</p>
                    </div>
                    <Badge variant={client.status === "active" ? "success" : "outline"}>{summarizeAttributionStatus(client.status)}</Badge>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-slate-600">
                    <p>Origen: {client.attributionSource || "No informado"}</p>
                    {client.endedAt ? <p>Cierre: {formatPortalDate(client.endedAt)}</p> : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CareerView({
  partner,
  summary,
  rankHistory
}: {
  partner: PartnerPortalPartner | null;
  summary: PartnerPortalSummary | null;
  rankHistory: PartnerPortalRankHistoryEntry[];
}) {
  const currentRank = resolveCurrentRank(summary, partner, rankHistory);
  const nextRank = resolveNextRankLabel(currentRank);
  const stepProgress = resolveCareerStepProgress(currentRank);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-slate-200/80 bg-white/92">
          <CardHeader action={<Badge variant="success">{formatRankLabel(currentRank)}</Badge>}>
            <div>
              <CardTitle className="text-2xl text-slate-950">Mi carrera</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-600">
                Historial real de rango y lectura transparente de la escalera comercial aprobada.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <MetricStrip label="Rango actual" value={formatRankLabel(currentRank)} icon={<BadgeCheck className="h-4 w-4" />} />
            <MetricStrip label="Proximo rango" value={nextRank} icon={<ArrowRight className="h-4 w-4" />} />
            <MetricStrip label="Fecha de obtencion" value={formatPortalDate(rankHistory[0]?.effectiveFrom)} icon={<Sparkles className="h-4 w-4" />} />
            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                <span>Progreso de carrera</span>
                <span>{stepProgress}%</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100">
                <div className="h-3 rounded-full bg-[linear-gradient(90deg,#10b981,#3b82f6)]" style={{ width: `${stepProgress}%` }} />
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-600">
              El endpoint actual de progreso devuelve historial de rango, pero todavia no expone requisitos pendientes ni metas cuantificadas para self-service.
              Por eso la interfaz no inventa calculos adicionales.
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/92">
          <CardHeader>
            <div>
              <CardTitle className="text-2xl text-slate-950">Escalera aprobada</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-600">
                Reglas informativas visibles para el partner. Los calculos y evaluaciones oficiales siguen dependiendo del backend.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0">
            {PARTNER_CAREER_LADDER.map((level) => {
              const active = String(currentRank || "").trim().toLowerCase() === level.code;
              return (
                <div key={level.code} className={`rounded-[22px] border p-4 ${active ? "border-emerald-200 bg-emerald-50/80" : "border-slate-200 bg-slate-50/70"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-base font-semibold text-slate-950">{level.label}</p>
                    {active ? <Badge variant="success">Actual</Badge> : <Badge variant="outline">Nivel</Badge>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {level.rules.map((rule) => (
                      <span key={rule} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">{rule}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <Card className="border-slate-200/80 bg-white/92">
        <CardHeader>
          <div>
            <CardTitle className="text-xl text-slate-950">Aclaraciones vigentes</CardTitle>
            <CardDescription className="mt-2 text-sm leading-6 text-slate-600">
              Contenido informativo aprobado para esta fase visual del portal.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 pt-0 md:grid-cols-3">
          <RuleCallout title="Tope recurrente" body="Tope recurrente acumulado por cliente: 15%." />
          <RuleCallout title="Sin pago por reclutar" body="No se paga por reclutar. La comision depende de operacion real." />
          <RuleCallout title="Evento valido" body="Solo se comisionan pagos reales acreditados y no revertidos." />
        </CardContent>
      </Card>
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

function RuleCallout({ title, body }: { title: string; body: string }) {
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
  if (previewState === "empty") {
    return {
      ...base,
      summary: {
        ...base.summary,
        activeClients: 0
      },
      clients: []
    };
  }
  return base;
}

function formatMetricValue(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "Sin dato";
}
