"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, BadgeCheck, BriefcaseBusiness, CalendarRange, ChevronRight, FileText, Loader2, LockKeyhole, Mail, Search, ShieldCheck, SlidersHorizontal, Sparkles, Star, TrendingUp, UploadCloud, UserCircle2, Users2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PartnerRecruitmentPanel } from "@/components/partners/PartnerRecruitmentPanel";
import { SkeletonCard, SkeletonLine } from "@/components/ui/skeleton";
import {
  PARTNER_CAREER_LADDER,
  getPartnerPortalPreviewData,
  type PartnerPortalCommissionEntry,
  type PartnerPortalCommissionLedger,
  type PartnerPortalCareerProgress,
  type PartnerPortalCareerRequirement,
  type PartnerPortalClientAttribution,
  type PartnerPortalNetwork,
  type PartnerPortalNetworkLevel,
  type PartnerPortalNetworkMember,
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
  partnerCommissionStatusVariant,
  partnerBillingVariant,
  partnerInitials,
  partnerStatusVariant,
  profileFallback,
  resolvePartnerCommissionClientName,
  resolvePartnerNetworkDisplayName,
  resolvePartnerClientDisplayName,
  resolvePartnerClientPaymentState,
  resolveCareerStepProgress,
  resolveCurrentRank,
  resolveNextRankLabel,
  safePartnerName,
  summarizePartnerCommissionStatus,
  summarizePartnerCommissionType,
  summarizeNetworkDepth,
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
  network?: PartnerPortalNetwork | null;
  commissionLedger?: PartnerPortalCommissionLedger | null;
};

type PreviewState = "default" | "empty" | "error" | "max";
type ClientSortKey = "recent" | "oldest" | "name";
type CommissionStatusFilter = "all" | "generated" | "reversed";
type CommissionTypeFilter = "all" | "own_signup" | "own_recurring" | "line_recurring_rebate";
type ClientRequestStatus = "draft" | "pending_review" | "changes_requested" | "approved" | "rejected" | "cancelled";
type ClientRequestPaymentMethod = "transfer" | "mercado_pago" | "cash" | "card" | "other";
type ClientRequestCurrency = "ARS" | "USD";

type PartnerClientRequest = {
  id: string;
  status: ClientRequestStatus;
  clientName: string;
  businessName?: string | null;
  email: string;
  phone: string;
  taxId?: string | null;
  planCode?: string | null;
  paymentMethod: ClientRequestPaymentMethod;
  reportedAmount: string;
  reportedCurrency: ClientRequestCurrency;
  reportedPaymentDate: string;
  paymentReference?: string | null;
  notes?: string | null;
  adminNotes?: string | null;
  submittedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  receipt?: {
    originalName?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
  };
};

const PAGE_LOADERS: Record<PartnerPortalPage, Array<keyof WorkspaceState>> = {
  home: ["partner", "summary", "clients", "rankHistory"],
  clients: ["clients"],
  career: ["careerProgress", "partner", "summary"],
  network: ["network"],
  commissions: ["commissionLedger"],
  profile: ["partner", "summary", "rankHistory"]
};

const ENDPOINTS: Record<keyof WorkspaceState, string> = {
  partner: "/api/partners/me",
  summary: "/api/partners/me/summary",
  clients: "/api/partners/me/clients",
  rankHistory: "/api/partners/me/rank-progress",
  careerProgress: "/api/partners/me/rank-progress",
  network: "/api/partners/me/network",
  commissionLedger: "/api/partners/me/commissions"
};

const PREMIUM_HERO_CARD =
  "overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(56,189,248,0.14),transparent_22%),linear-gradient(180deg,rgba(12,23,41,0.94),rgba(9,20,36,0.82))] text-slate-100 shadow-[0_22px_70px_rgba(2,8,23,0.42)]";
const PREMIUM_PANEL_CARD =
  "border-white/10 bg-[linear-gradient(180deg,rgba(9,19,34,0.92),rgba(10,23,40,0.84))] text-slate-100 shadow-[0_22px_70px_rgba(2,8,23,0.35)]";
const PREMIUM_SURFACE_CARD =
  "border-white/10 bg-[linear-gradient(180deg,rgba(10,20,36,0.92),rgba(9,18,33,0.84))] text-slate-100 shadow-[0_22px_70px_rgba(2,8,23,0.35)]";
const PREMIUM_TABLE_SHELL = "hidden overflow-hidden rounded-[24px] border border-white/10 lg:block";
const PREMIUM_EMPTY_STATE = "min-h-[320px] border-white/10 bg-white/[0.03] text-slate-100";
const PREMIUM_FILTER_FIELD =
  "h-10 rounded-xl border border-white/10 bg-slate-950/55 px-3 text-sm normal-case tracking-normal text-slate-100 outline-none transition focus:border-amber-300/45 focus:ring-2 focus:ring-amber-300/20 disabled:cursor-not-allowed disabled:opacity-55";
const PREMIUM_SELECT_TRIGGER =
  "flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/70 px-3 text-left text-sm normal-case tracking-normal text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition hover:border-white/20 hover:bg-slate-900/80 focus:border-amber-300/45 focus:ring-2 focus:ring-amber-300/20 disabled:cursor-not-allowed disabled:opacity-55";
const PREMIUM_SELECT_PANEL =
  "absolute z-[80] mt-2 max-h-64 min-w-full overflow-y-auto rounded-2xl border border-amber-200/15 bg-[linear-gradient(180deg,rgba(7,16,30,0.98),rgba(10,23,41,0.98))] p-1.5 text-slate-100 shadow-[0_24px_70px_rgba(2,8,23,0.62)] backdrop-blur";
const PREMIUM_SELECT_OPTION =
  "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-100 outline-none transition hover:bg-white/[0.08] focus:bg-white/[0.10] disabled:cursor-not-allowed disabled:text-slate-500 data-[selected=true]:bg-amber-300/12 data-[selected=true]:text-amber-100";

type PartnerSelectOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
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
  const [commissionStatusFilter, setCommissionStatusFilter] = useState<CommissionStatusFilter>("all");
  const [commissionTypeFilter, setCommissionTypeFilter] = useState<CommissionTypeFilter>("all");
  const [commissionFrom, setCommissionFrom] = useState("");
  const [commissionTo, setCommissionTo] = useState("");
  const [commissionPage, setCommissionPage] = useState(1);
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
            throw new Error("No pudimos cargar la vista previa del portal de asesores.");
          }
          if (cancelled) return;
          setState(buildPartnerPreviewState(previewState));
          setStatus("ready");
          return;
        }

        const keys = PAGE_LOADERS[page];
        const entries = await Promise.all(
          keys.map(async (key) => {
            const response = await fetch(
              key === "commissionLedger"
                ? buildPartnerCommissionLedgerEndpoint({
                    status: commissionStatusFilter,
                    type: commissionTypeFilter,
                    from: commissionFrom,
                    to: commissionTo,
                    page: commissionPage
                  })
                : ENDPOINTS[key],
              { cache: "no-store" }
            );
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(String(payload?.detail || payload?.error || "No se pudo cargar el portal de asesores."));
            }

            if (key === "partner") return [key, payload?.partner || null] as const;
            if (key === "summary") return [key, payload?.summary || null] as const;
            if (key === "clients") return [key, Array.isArray(payload?.clients) ? payload.clients : []] as const;
            if (key === "careerProgress") return [key, payload || null] as const;
            if (key === "network") return [key, payload || null] as const;
            if (key === "commissionLedger") return [key, payload || null] as const;
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
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el portal de asesores.");
        setStatus("error");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [page, previewMode, previewState, commissionStatusFilter, commissionTypeFilter, commissionFrom, commissionTo, commissionPage]);

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

  if (page === "network") {
    return <NetworkView network={state.network || null} />;
  }

  if (page === "commissions") {
    return (
      <CommissionsView
        ledger={state.commissionLedger || null}
        statusFilter={commissionStatusFilter}
        typeFilter={commissionTypeFilter}
        from={commissionFrom}
        to={commissionTo}
        onStatusFilterChange={(value) => {
          setCommissionStatusFilter(value);
          setCommissionPage(1);
        }}
        onTypeFilterChange={(value) => {
          setCommissionTypeFilter(value);
          setCommissionPage(1);
        }}
        onFromChange={(value) => {
          setCommissionFrom(value);
          setCommissionPage(1);
        }}
        onToChange={(value) => {
          setCommissionTo(value);
          setCommissionPage(1);
        }}
        onPageChange={setCommissionPage}
      />
    );
  }

  if (page === "profile") {
    return <ProfileView partner={state.partner || null} summary={state.summary || null} rankHistory={state.rankHistory || []} />;
  }

  return <HomeView partner={state.partner || null} summary={state.summary || null} clients={state.clients || []} rankHistory={state.rankHistory || []} />;
}

function PartnerPortalSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false
}: {
  value: T;
  options: PartnerSelectOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, options.findIndex((option) => option.value === value)));
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value) || options[0] || null;
  const enabledOptions = options.filter((option) => !option.disabled);

  useEffect(() => {
    setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)));
  }, [options, value]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!rootRef.current || (target && rootRef.current.contains(target))) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function choose(option: PartnerSelectOption<T>) {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
  }

  function moveActive(delta: number) {
    if (enabledOptions.length === 0) return;
    const currentOption = options[activeIndex] || selected || enabledOptions[0];
    const currentEnabledIndex = Math.max(0, enabledOptions.findIndex((option) => option.value === currentOption?.value));
    const nextEnabledIndex = (currentEnabledIndex + delta + enabledOptions.length) % enabledOptions.length;
    const nextOption = enabledOptions[nextEnabledIndex];
    setActiveIndex(Math.max(0, options.findIndex((option) => option.value === nextOption.value)));
  }

  return (
    <div ref={rootRef} className="relative" data-partner-portal-select>
      <button
        type="button"
        className={PREMIUM_SELECT_TRIGGER}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled || options.length === 0}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) setOpen(true);
            moveActive(event.key === "ArrowDown" ? 1 : -1);
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (open) {
              const option = options[activeIndex] || selected;
              if (option) choose(option);
            } else {
              setOpen(true);
            }
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          }
        }}
      >
        <span className="min-w-0 truncate">{selected?.label || "Seleccionar"}</span>
        <ChevronRight className={`h-4 w-4 shrink-0 text-amber-100/80 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open ? (
        <div className={PREMIUM_SELECT_PANEL} role="listbox" aria-label={ariaLabel} data-partner-portal-select-panel>
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                data-selected={isSelected ? "true" : "false"}
                className={`${PREMIUM_SELECT_OPTION} ${isActive ? "bg-white/[0.10]" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {isSelected ? <BadgeCheck className="h-4 w-4 shrink-0 text-amber-200" /> : <span className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
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
        <Card className={PREMIUM_HERO_CARD}>
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

        <Card className={PREMIUM_PANEL_CARD}>
          <CardHeader action={<Badge className="border-white/10 bg-white/6 text-slate-200">Lectura segura</Badge>}>
            <div>
              <CardTitle className="text-xl text-white">Actividad comercial</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                Resumen ejecutivo del asesor usando solamente datos disponibles en esta fase del backend.
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
        <KpiCard dark icon={<Users2 className="h-4 w-4" />} label="Clientes activos" value={formatMetricValue(activeClientsValue)} detail="Valor servido desde tu resumen de asesor actual." />
        <KpiCard dark icon={<BriefcaseBusiness className="h-4 w-4" />} label="Cartera visible" value={formatMetricValue(totalClientsValue)} detail="Clientes atribuidos visibles hoy en el portal." />
        <KpiCard dark icon={<Sparkles className="h-4 w-4" />} label="Rango actual" value={formatRankLabel(currentRank)} detail="Tomado del rango visible en backend o historial publicado." />
        <KpiCard dark icon={<Star className="h-4 w-4" />} label="Progreso al proximo rango" value={`${stepProgress}%`} detail="Referencia visual segun el rango actual publicado." />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className={PREMIUM_SURFACE_CARD}>
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
                className={PREMIUM_EMPTY_STATE}
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
          <Card className={PREMIUM_PANEL_CARD}>
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

          <Card className={PREMIUM_PANEL_CARD}>
            <CardHeader action={<Badge className="border-white/10 bg-white/6 text-slate-200">Proximamente</Badge>}>
              <div>
                <CardTitle className="text-xl text-white">Proxima etapa</CardTitle>
                <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                  Hoja de ruta visible del portal de asesores sin adelantar datos no publicados.
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
  const [requestStatusFilter, setRequestStatusFilter] = useState("all");
  const [clientRequests, setClientRequests] = useState<PartnerClientRequest[]>([]);
  const [clientRequestsLoading, setClientRequestsLoading] = useState(false);
  const [clientRequestBusyId, setClientRequestBusyId] = useState<string | null>(null);
  const [clientRequestMessage, setClientRequestMessage] = useState<string | null>(null);
  const [clientRequestError, setClientRequestError] = useState<string | null>(null);
  const [clientRequestFormOpen, setClientRequestFormOpen] = useState(false);
  const [clientRequestFile, setClientRequestFile] = useState<File | null>(null);
  const [clientRequestForm, setClientRequestForm] = useState({
    clientName: "",
    businessName: "",
    email: "",
    phone: "",
    taxId: "",
    planCode: "",
    paymentMethod: "transfer" as ClientRequestPaymentMethod,
    reportedAmount: "",
    reportedCurrency: "ARS" as ClientRequestCurrency,
    reportedPaymentDate: "",
    paymentReference: "",
    notes: ""
  });

  async function loadClientRequests() {
    setClientRequestsLoading(true);
    setClientRequestError(null);
    try {
      const suffix = requestStatusFilter !== "all" ? `?status=${encodeURIComponent(requestStatusFilter)}` : "";
      const response = await fetch(`/api/partners/me/client-requests${suffix}`, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin"
      });
      const payload = await readPartnerPortalJson(response);
      if (!response.ok) throw new Error(readPartnerPortalError(payload, "No pudimos cargar tus solicitudes."));
      setClientRequests(Array.isArray(payload?.data?.requests) ? payload.data.requests : []);
    } catch (error) {
      setClientRequests([]);
      setClientRequestError(error instanceof Error ? error.message : "No pudimos cargar tus solicitudes.");
    } finally {
      setClientRequestsLoading(false);
    }
  }

  useEffect(() => {
    void loadClientRequests();
  }, [requestStatusFilter]);

  function updateClientRequestField(field: keyof typeof clientRequestForm, value: string) {
    setClientRequestForm((current) => ({ ...current, [field]: value }));
  }

  async function submitClientRequest(requestId: string, source = "manual") {
    setClientRequestBusyId(requestId);
    setClientRequestError(null);
    setClientRequestMessage(null);
    try {
      const response = await fetch(`/api/partners/me/client-requests/${encodeURIComponent(requestId)}/submit`, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin"
      });
      const payload = await readPartnerPortalJson(response);
      if (!response.ok) throw new Error(readPartnerPortalError(payload, "No pudimos enviar la solicitud a revision."));
      setClientRequestMessage(source === "create" ? "Solicitud creada y enviada a revision." : "Solicitud enviada a revision.");
      await loadClientRequests();
    } catch (error) {
      setClientRequestError(error instanceof Error ? error.message : "No pudimos enviar la solicitud a revision.");
    } finally {
      setClientRequestBusyId(null);
    }
  }

  async function submitClientRequestForm(event: React.FormEvent) {
    event.preventDefault();
    setClientRequestError(null);
    setClientRequestMessage(null);
    if (!clientRequestFile) {
      setClientRequestError("El comprobante es obligatorio para guardar la solicitud.");
      return;
    }
    const required = ["clientName", "email", "phone", "paymentMethod", "reportedAmount", "reportedCurrency", "reportedPaymentDate"] as const;
    if (required.some((field) => !String(clientRequestForm[field] || "").trim())) {
      setClientRequestError("Completa los campos obligatorios antes de guardar.");
      return;
    }

    const formData = new FormData();
    Object.entries(clientRequestForm).forEach(([key, value]) => formData.set(key, String(value || "")));
    formData.set("receipt", clientRequestFile, clientRequestFile.name);
    setClientRequestBusyId("create");
    try {
      const response = await fetch("/api/partners/me/client-requests", {
        method: "POST",
        body: formData,
        cache: "no-store",
        credentials: "same-origin"
      });
      const payload = await readPartnerPortalJson(response);
      if (!response.ok) throw new Error(readPartnerPortalError(payload, "No pudimos guardar la solicitud."));
      const request = payload?.data?.request as PartnerClientRequest | undefined;
      if (request?.id) await submitClientRequest(request.id, "create");
      setClientRequestFormOpen(false);
      setClientRequestFile(null);
      setClientRequestForm({
        clientName: "",
        businessName: "",
        email: "",
        phone: "",
        taxId: "",
        planCode: "",
        paymentMethod: "transfer",
        reportedAmount: "",
        reportedCurrency: "ARS",
        reportedPaymentDate: "",
        paymentReference: "",
        notes: ""
      });
      await loadClientRequests();
    } catch (error) {
      setClientRequestError(error instanceof Error ? error.message : "No pudimos guardar la solicitud.");
    } finally {
      setClientRequestBusyId(null);
    }
  }

  async function cancelClientRequest(requestId: string) {
    setClientRequestBusyId(requestId);
    setClientRequestError(null);
    setClientRequestMessage(null);
    try {
      const response = await fetch(`/api/partners/me/client-requests/${encodeURIComponent(requestId)}/cancel`, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin"
      });
      const payload = await readPartnerPortalJson(response);
      if (!response.ok) throw new Error(readPartnerPortalError(payload, "No pudimos cancelar la solicitud."));
      setClientRequestMessage("Solicitud cancelada.");
      await loadClientRequests();
    } catch (error) {
      setClientRequestError(error instanceof Error ? error.message : "No pudimos cancelar la solicitud.");
    } finally {
      setClientRequestBusyId(null);
    }
  }

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
  const statusOptions = statuses.map((currentStatus) => ({
    value: currentStatus,
    label: currentStatus === "all" ? "Todos los estados" : summarizeAttributionStatus(currentStatus)
  }));
  const paymentOptions = paymentStates.map((currentState) => ({
    value: currentState,
    label: currentState === "all" ? "Todos los estados de pago" : summarizePartnerBillingState(currentState)
  }));
  const sortOptions = [
    ...(hasUsableDates ? [{ value: "recent" as const, label: "Mas recientes" }, { value: "oldest" as const, label: "Mas antiguas" }] : []),
    ...(hasVisibleNames ? [{ value: "name" as const, label: "Nombre A-Z" }] : [])
  ];
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
        <Card className={PREMIUM_HERO_CARD}>
          <CardContent className="p-6 md:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-amber-300/20 bg-amber-300/10 text-amber-100">Mis clientes</Badge>
              <Badge className="border-white/10 bg-white/6 text-slate-200">Contrato real</Badge>
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-[2.45rem]">Cartera del asesor</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Vista comercial de tus atribuciones activas e historicas usando unicamente los campos reales del endpoint de asesores.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">Total visible: {clients.length}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">Estados reales: {statuses.length - 1 || 0}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">Sin UUIDs expuestos</span>
            </div>
          </CardContent>
        </Card>

        <Card className={PREMIUM_PANEL_CARD}>
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

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className={PREMIUM_PANEL_CARD}>
          <CardHeader
            action={
              <Button type="button" className="rounded-2xl" onClick={() => setClientRequestFormOpen((current) => !current)}>
                <UploadCloud className="mr-2 h-4 w-4" />
                Registrar nuevo cliente
              </Button>
            }
          >
            <div>
              <CardTitle className="text-2xl text-white">Solicitudes de alta</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                Presenta nuevos clientes con comprobante. Quedan pendientes de revision; no se crean tenants, comisiones ni carrera en esta fase.
              </CardDescription>
            </div>
          </CardHeader>
          {clientRequestFormOpen ? (
            <CardContent className="pt-0">
              <form className="grid gap-4" onSubmit={submitClientRequestForm}>
                <div className="grid gap-3 md:grid-cols-2">
                  <ClientRequestField label="Nombre y apellido *" value={clientRequestForm.clientName} onChange={(value) => updateClientRequestField("clientName", value)} />
                  <ClientRequestField label="Negocio o razon social" value={clientRequestForm.businessName} onChange={(value) => updateClientRequestField("businessName", value)} />
                  <ClientRequestField label="Email *" type="email" value={clientRequestForm.email} onChange={(value) => updateClientRequestField("email", value)} />
                  <ClientRequestField label="Telefono *" value={clientRequestForm.phone} onChange={(value) => updateClientRequestField("phone", value)} />
                  <ClientRequestField label="CUIT/DNI" value={clientRequestForm.taxId} onChange={(value) => updateClientRequestField("taxId", value)} />
                  <ClientRequestField label="Plan" value={clientRequestForm.planCode} onChange={(value) => updateClientRequestField("planCode", value)} />
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <label className="grid gap-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                    Metodo *
                    <PartnerPortalSelect<ClientRequestPaymentMethod>
                      ariaLabel="Metodo de pago informado"
                      value={clientRequestForm.paymentMethod}
                      options={CLIENT_REQUEST_PAYMENT_OPTIONS}
                      onChange={(value) => updateClientRequestField("paymentMethod", value)}
                    />
                  </label>
                  <ClientRequestField label="Importe *" type="number" value={clientRequestForm.reportedAmount} onChange={(value) => updateClientRequestField("reportedAmount", value)} />
                  <label className="grid gap-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                    Moneda *
                    <PartnerPortalSelect<ClientRequestCurrency>
                      ariaLabel="Moneda informada"
                      value={clientRequestForm.reportedCurrency}
                      options={CLIENT_REQUEST_CURRENCY_OPTIONS}
                      onChange={(value) => updateClientRequestField("reportedCurrency", value)}
                    />
                  </label>
                  <ClientRequestField label="Fecha de pago *" type="date" value={clientRequestForm.reportedPaymentDate} onChange={(value) => updateClientRequestField("reportedPaymentDate", value)} />
                </div>
                <ClientRequestField label="Referencia de pago" value={clientRequestForm.paymentReference} onChange={(value) => updateClientRequestField("paymentReference", value)} />
                <label className="grid gap-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Observaciones
                  <textarea
                    value={clientRequestForm.notes}
                    onChange={(event) => updateClientRequestField("notes", event.target.value)}
                    className="min-h-24 rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2 text-sm normal-case tracking-normal text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-300/45 focus:ring-2 focus:ring-amber-300/20"
                    placeholder="Contexto comercial, condiciones conversadas o aclaraciones para Admin."
                  />
                </label>
                <label className="grid gap-2 rounded-2xl border border-dashed border-amber-200/20 bg-amber-200/[0.04] p-4 text-sm text-slate-300">
                  <span className="flex items-center gap-2 font-medium text-amber-100">
                    <FileText className="h-4 w-4" />
                    Comprobante obligatorio
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    className="text-sm text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-amber-300/15 file:px-3 file:py-2 file:text-amber-100"
                    onChange={(event) => setClientRequestFile(event.target.files?.[0] || null)}
                  />
                  <span className="text-xs text-slate-500">PDF, JPG, PNG o WEBP hasta 10 MB. No se publica por URL permanente.</span>
                  {clientRequestFile ? <span className="text-xs text-emerald-200">Seleccionado: {clientRequestFile.name}</span> : null}
                </label>
                {clientRequestError ? <p className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">{clientRequestError}</p> : null}
                {clientRequestMessage ? <p className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">{clientRequestMessage}</p> : null}
                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="secondary" className="rounded-2xl border-white/12 bg-white/6 text-white hover:bg-white/10" onClick={() => setClientRequestFormOpen(false)}>
                    Cerrar
                  </Button>
                  <Button type="submit" className="rounded-2xl" disabled={clientRequestBusyId === "create"}>
                    {clientRequestBusyId === "create" ? "Subiendo y enviando..." : "Guardar y enviar a revision"}
                  </Button>
                </div>
              </form>
            </CardContent>
          ) : (
            <CardContent className="pt-0">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm leading-7 text-slate-300">
                Usa el CTA para cargar datos, metodo de pago e evidencia. Admin revisa y resuelve; una solicitud aprobada no aparece como cliente activo automaticamente.
              </div>
            </CardContent>
          )}
        </Card>

        <Card className={PREMIUM_PANEL_CARD}>
          <CardHeader
            action={
              <PartnerPortalSelect
                ariaLabel="Filtrar solicitudes por estado"
                value={requestStatusFilter}
                options={CLIENT_REQUEST_STATUS_OPTIONS}
                onChange={setRequestStatusFilter}
              />
            }
          >
            <div>
              <CardTitle className="text-2xl text-white">Bandeja de solicitudes</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                Clientes aprobados y solicitudes de alta se mantienen separados para no confundir atribuciones activas con revisiones pendientes.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0">
            {clientRequestsLoading ? (
              <SkeletonLine className="h-24 w-full" />
            ) : clientRequests.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-5 w-5" />}
                title="Sin solicitudes visibles"
                description="Cuando registres un cliente, la solicitud aparecera aca con su estado de revision."
                className="min-h-[180px] border-white/10 bg-white/[0.03] text-slate-100"
              />
            ) : (
              clientRequests.map((request) => (
                <ClientRequestCard
                  key={request.id}
                  request={request}
                  busy={clientRequestBusyId === request.id}
                  onSubmit={() => submitClientRequest(request.id)}
                  onCancel={() => cancelClientRequest(request.id)}
                />
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card className={PREMIUM_PANEL_CARD}>
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
                <PartnerPortalSelect
                  ariaLabel="Filtrar clientes por estado"
                  value={statusFilter}
                  options={statusOptions}
                  onChange={onStatusFilterChange}
                />
              </label>

              {hasBillingStates ? (
                <label className="grid gap-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Pago
                  <PartnerPortalSelect
                    ariaLabel="Filtrar clientes por estado de pago"
                    value={paymentFilter}
                    options={paymentOptions}
                    onChange={onPaymentFilterChange}
                  />
                </label>
              ) : null}

              <label className="grid gap-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Orden
                <PartnerPortalSelect<ClientSortKey>
                  ariaLabel="Ordenar clientes"
                  value={sortKey}
                  options={sortOptions}
                  onChange={onSortKeyChange}
                />
              </label>
            </CardContent>
          </Card>

          {isTrueEmpty ? (
            <EmptyState
              icon={<Users2 className="h-5 w-5" />}
              title="Todavia no tenes clientes atribuidos"
              description="Cuando una atribucion quede asociada a tu cuenta, la cartera se va a completar automaticamente con su estado real."
              className={PREMIUM_EMPTY_STATE}
            />
          ) : hasNoMatches ? (
            <EmptyState
              icon={<Search className="h-5 w-5" />}
              title="No encontramos clientes con esos filtros"
              description="Proba cambiar el texto de busqueda o volver a todos los estados para revisar la cartera completa."
              action={{ label: "Limpiar filtros", onClick: () => { onQueryChange(""); onStatusFilterChange("all"); onPaymentFilterChange("all"); } }}
              className={PREMIUM_EMPTY_STATE}
            />
          ) : (
            <>
              <Card className={`${PREMIUM_SURFACE_CARD} ${PREMIUM_TABLE_SHELL}`}>
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
        } fixed inset-y-0 right-0 z-40 w-full max-w-[400px] border-l border-white/10 bg-[linear-gradient(180deg,rgba(5,12,23,0.98),rgba(8,18,34,0.98))] p-4 shadow-[0_28px_90px_rgba(2,8,23,0.55)] transition-all duration-300 xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] xl:rounded-[28px] xl:border xl:bg-[linear-gradient(180deg,rgba(9,19,34,0.92),rgba(10,23,40,0.84))]`}
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

const CLIENT_REQUEST_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  pending_review: "Pendiente de revision",
  changes_requested: "Correccion solicitada",
  approved: "Aprobada",
  rejected: "Rechazada",
  cancelled: "Cancelada"
};

const CLIENT_REQUEST_STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  { value: "draft", label: "Borrador" },
  { value: "pending_review", label: "Pendiente de revision" },
  { value: "changes_requested", label: "Correccion solicitada" },
  { value: "approved", label: "Aprobada" },
  { value: "rejected", label: "Rechazada" },
  { value: "cancelled", label: "Cancelada" }
];

const CLIENT_REQUEST_PAYMENT_OPTIONS: Array<PartnerSelectOption<ClientRequestPaymentMethod>> = [
  { value: "transfer", label: "Transferencia" },
  { value: "mercado_pago", label: "Mercado Pago" },
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "other", label: "Otro" }
];

const CLIENT_REQUEST_CURRENCY_OPTIONS: Array<PartnerSelectOption<ClientRequestCurrency>> = [
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" }
];

function ClientRequestField({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
      {label}
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-white/10 bg-slate-950/55 text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-300/20"
      />
    </label>
  );
}

function ClientRequestCard({
  request,
  busy,
  onSubmit,
  onCancel
}: {
  request: PartnerClientRequest;
  busy: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const canSubmit = request.status === "draft" || request.status === "changes_requested";
  const canCancel = request.status === "draft" || request.status === "pending_review" || request.status === "changes_requested";
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-white">{request.clientName}</p>
          <p className="mt-1 text-sm text-slate-400">{request.businessName || request.email}</p>
        </div>
        <Badge variant={clientRequestStatusVariant(request.status)}>{CLIENT_REQUEST_STATUS_LABELS[request.status] || request.status}</Badge>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
        <span>Presentacion: {request.submittedAt ? formatPortalDate(request.submittedAt) : "Sin enviar"}</span>
        <span>Importe: {request.reportedCurrency} {request.reportedAmount}</span>
        <span>Metodo: {CLIENT_REQUEST_PAYMENT_OPTIONS.find((item) => item.value === request.paymentMethod)?.label || request.paymentMethod}</span>
        <span>Actualizada: {formatPortalDateTime(request.updatedAt)}</span>
      </div>
      {request.adminNotes ? (
        <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-50">
          Observacion Admin: {request.adminNotes}
        </div>
      ) : null}
      {request.status === "approved" ? (
        <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm leading-6 text-emerald-50">
          Solicitud aprobada. La activacion del cliente sera procesada por Opturon.
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <a
          href={`/api/partners/me/client-requests/${encodeURIComponent(request.id)}/receipt`}
          className="inline-flex items-center gap-2 text-sm font-medium text-amber-100 hover:text-amber-50"
        >
          <FileText className="h-4 w-4" />
          Ver comprobante
        </a>
        <div className="flex flex-wrap gap-2">
          {canSubmit ? (
            <Button type="button" size="sm" className="rounded-2xl" onClick={onSubmit} disabled={busy}>
              {busy ? "Enviando..." : request.status === "changes_requested" ? "Reenviar" : "Enviar a revision"}
            </Button>
          ) : null}
          {canCancel ? (
            <Button type="button" size="sm" variant="secondary" className="rounded-2xl border-white/12 bg-white/6 text-white hover:bg-white/10" onClick={onCancel} disabled={busy}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function clientRequestStatusVariant(status: string) {
  if (status === "approved") return "success";
  if (status === "pending_review") return "warning";
  if (status === "changes_requested") return "outline";
  if (status === "rejected" || status === "cancelled") return "danger";
  return "muted";
}

async function readPartnerPortalJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function readPartnerPortalError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const detail = String((payload as Record<string, unknown>).detail || "").trim();
    const error = String((payload as Record<string, unknown>).error || "").trim();
    if (["partner_not_found", "partner_identity_invalid", "partner_inactive", "partner_forbidden", "partner_unauthorized"].includes(error)) {
      return "No pudimos identificar tu cuenta de asesor. Cerra sesion e ingresa nuevamente. Si continua, contacta a Administracion.";
    }
    if (detail) return detail;
    if (error) return error;
  }
  return fallback;
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
        <Card className={PREMIUM_HERO_CARD}>
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

        <Card className={PREMIUM_PANEL_CARD}>
          <CardHeader action={<Badge className="border-white/10 bg-white/6 text-slate-200">Progreso principal</Badge>}>
            <div>
              <CardTitle className="text-2xl text-white">Progreso principal</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                Indicadores tomados directamente de la evaluacion de asesor y sus umbrales oficiales.
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
                className={PREMIUM_EMPTY_STATE}
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <Card className={PREMIUM_SURFACE_CARD}>
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

        <Card className={PREMIUM_PANEL_CARD}>
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

function NetworkView({ network }: { network: PartnerPortalNetwork | null }) {
  const [selectedDepth, setSelectedDepth] = useState<1 | 2 | 3>(1);
  const levels = Array.isArray(network?.levels) ? network.levels : [];
  const summary = network?.summary || {
    firstLineCount: 0,
    secondLineCount: 0,
    thirdLineCount: 0,
    activeNetworkCount: 0
  };
  const selectedLevel = levels.find((level) => level.depth === selectedDepth) || { depth: selectedDepth, partners: [] };
  const hasNetwork = levels.some((level) => level.partners.length > 0);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className={PREMIUM_HERO_CARD}>
          <CardContent className="p-6 md:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-sky-300/20 bg-sky-300/10 text-sky-100">Mi red</Badge>
              <Badge className="border-white/10 bg-white/6 text-slate-200">Datos reales</Badge>
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-[2.6rem]">Mi red</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Conoce el crecimiento y la actividad comercial de tu equipo.
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
              Solo se muestran descendientes propios de hasta tercera linea, con estado, rango visible, clientes activos y fecha de incorporacion.
            </p>
          </CardContent>
        </Card>

        <Card className={PREMIUM_PANEL_CARD}>
          <CardHeader action={<Badge className="border-white/10 bg-white/6 text-slate-200">Profundidad maxima 3</Badge>}>
            <div>
              <CardTitle className="text-xl text-white">Resumen de red</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                Vista self-service aislada, sin exponer datos personales, IDs internos ni montos comerciales.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <MetricStrip dark label="Asesores visibles" value={String(summary.firstLineCount + summary.secondLineCount + summary.thirdLineCount)} icon={<Users2 className="h-4 w-4" />} />
            <MetricStrip dark label="Red activa total" value={String(summary.activeNetworkCount)} icon={<BadgeCheck className="h-4 w-4" />} />
            <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">
              Cada nivel mantiene aislamiento por sponsor. No se muestran sponsors, ramas hermanas ni nodos fuera de alcance.
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard dark icon={<Users2 className="h-4 w-4" />} label="Primera linea" value={String(summary.firstLineCount)} detail="Asesores patrocinados directamente por tu cuenta." />
        <KpiCard dark icon={<ChevronRight className="h-4 w-4" />} label="Segunda linea" value={String(summary.secondLineCount)} detail="Descendientes visibles de la primera linea." />
        <KpiCard dark icon={<ArrowRight className="h-4 w-4" />} label="Tercera linea" value={String(summary.thirdLineCount)} detail="Solo se muestra cuando existe dentro del alcance aprobado." />
        <KpiCard dark icon={<BadgeCheck className="h-4 w-4" />} label="Red activa total" value={String(summary.activeNetworkCount)} detail="Cantidad de asesores en estado activo dentro de tu red visible." />
      </section>

      <section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Card className={PREMIUM_SURFACE_CARD}>
          <CardHeader>
            <div>
              <CardTitle className="text-xl text-white">Vista por niveles</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                Cambia entre primera, segunda y tercera linea segun la informacion real publicada.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 pt-0">
            {[1, 2, 3].map((depth) => {
              const level = levels.find((item) => item.depth === depth);
              const active = selectedDepth === depth;
              return (
                <button
                  key={depth}
                  type="button"
                  onClick={() => setSelectedDepth(depth as 1 | 2 | 3)}
                  className={`rounded-[22px] border px-4 py-3 text-left transition-colors ${
                    active
                      ? "border-amber-300/25 bg-[linear-gradient(135deg,rgba(251,191,36,0.18),rgba(56,189,248,0.10))] text-white"
                      : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">{summarizeNetworkDepth(depth)}</span>
                    <Badge className={active ? "border-white/10 bg-white/10 text-white" : "border-white/10 bg-white/6 text-slate-300"}>
                      {level?.partners.length || 0}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className={PREMIUM_SURFACE_CARD}>
          <CardHeader action={<Badge className="border-white/10 bg-white/6 text-slate-200">{summarizeNetworkDepth(selectedLevel.depth)}</Badge>}>
            <div>
              <CardTitle className="text-xl text-white">Actividad del nivel seleccionado</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                Nombre, estado, rango, clientes activos y fecha de incorporacion, sin comisiones ni informacion sensible.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {!hasNetwork ? (
              <EmptyState
                icon={<Users2 className="h-5 w-5" />}
                title="Todavia no tenes asesores en tu red"
                description="Cuando existan descendientes asociados por sponsor, se mostraran aca por linea comercial."
                className={PREMIUM_EMPTY_STATE}
              />
            ) : selectedLevel.partners.length === 0 ? (
              <EmptyState
                icon={<ChevronRight className="h-5 w-5" />}
                title={`Sin asesores en ${summarizeNetworkDepth(selectedLevel.depth).toLowerCase()}`}
                description="Este nivel todavia no tiene asesores visibles con la informacion actual publicada."
                className={PREMIUM_EMPTY_STATE}
              />
            ) : (
              <div className="space-y-4">
                <div className={PREMIUM_TABLE_SHELL}>
                  <table className="min-w-full divide-y divide-white/10 text-sm">
                    <thead className="bg-white/[0.04] text-slate-400">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Asesor</th>
                        <th className="px-4 py-3 text-left font-medium">Estado</th>
                        <th className="px-4 py-3 text-left font-medium">Rango</th>
                        <th className="px-4 py-3 text-left font-medium">Clientes activos</th>
                        <th className="px-4 py-3 text-left font-medium">Incorporacion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {selectedLevel.partners.map((member, index) => (
                        <NetworkTableRow key={`${selectedLevel.depth}-${index}`} member={member} index={index} />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 lg:hidden">
                  {selectedLevel.partners.map((member, index) => (
                    <NetworkCard key={`${selectedLevel.depth}-${index}`} member={member} index={index} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <PartnerRecruitmentPanel />
    </div>
  );
}

function NetworkTableRow({ member, index }: { member: PartnerPortalNetworkMember; index: number }) {
  const displayName = resolvePartnerNetworkDisplayName(member, index);
  return (
    <tr className="bg-white/[0.02] text-slate-200">
      <td className="px-4 py-4">
        <div>
          <p className="font-semibold text-white">{displayName}</p>
          {!member.rankCode || !member.joinedAt ? <p className="mt-1 text-xs text-slate-500">Datos incompletos visibles para este asesor.</p> : null}
        </div>
      </td>
      <td className="px-4 py-4"><Badge variant={partnerStatusVariant(member.status)}>{formatPartnerStatus(member.status)}</Badge></td>
      <td className="px-4 py-4">{formatRankLabel(member.rankCode)}</td>
      <td className="px-4 py-4">{String(member.activeClientCount)}</td>
      <td className="px-4 py-4">{formatPortalDate(member.joinedAt)}</td>
    </tr>
  );
}

function NetworkCard({ member, index }: { member: PartnerPortalNetworkMember; index: number }) {
  const displayName = resolvePartnerNetworkDisplayName(member, index);
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{displayName}</p>
          <p className="mt-1 text-xs text-slate-400">Fecha de incorporacion: {formatPortalDate(member.joinedAt)}</p>
        </div>
        <Badge variant={partnerStatusVariant(member.status)}>{formatPartnerStatus(member.status)}</Badge>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MetricStrip dark label="Rango" value={formatRankLabel(member.rankCode)} icon={<Star className="h-4 w-4" />} />
        <MetricStrip dark label="Clientes activos" value={String(member.activeClientCount)} icon={<Users2 className="h-4 w-4" />} />
      </div>
      {!member.rankCode || !member.joinedAt ? (
        <div className="mt-4 rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-400">
          Datos incompletos visibles para este asesor.
        </div>
      ) : null}
    </div>
  );
}

function CommissionsView({
  ledger,
  statusFilter,
  typeFilter,
  from,
  to,
  onStatusFilterChange,
  onTypeFilterChange,
  onFromChange,
  onToChange,
  onPageChange
}: {
  ledger: PartnerPortalCommissionLedger | null;
  statusFilter: CommissionStatusFilter;
  typeFilter: CommissionTypeFilter;
  from: string;
  to: string;
  onStatusFilterChange: (value: CommissionStatusFilter) => void;
  onTypeFilterChange: (value: CommissionTypeFilter) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onPageChange: (value: number) => void;
}) {
  const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
  const summary = ledger?.summary || {
    totalGenerated: "0.00",
    totalReversed: "0.00",
    netAmount: "0.00",
    currency: null
  };
  const pagination = ledger?.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 };
  const currency = summary.currency || entries.find((entry) => entry.currency)?.currency || "ARS";
  const hasEntries = entries.length > 0;
  const hasActiveFilters = statusFilter !== "all" || typeFilter !== "all" || Boolean(from) || Boolean(to);
  const statusOptions: PartnerSelectOption<CommissionStatusFilter>[] = [
    { value: "all", label: "Todos los estados" },
    { value: "generated", label: "Registradas" },
    { value: "reversed", label: "Revertidas" }
  ];
  const typeOptions: PartnerSelectOption<CommissionTypeFilter>[] = [
    { value: "all", label: "Todos los tipos reales" },
    { value: "own_signup", label: "Alta propia" },
    { value: "own_recurring", label: "Recurrente propia" },
    { value: "line_recurring_rebate", label: "Linea comercial" }
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className={PREMIUM_HERO_CARD}>
          <CardContent className="p-6 md:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-emerald-300/20 bg-emerald-300/10 text-emerald-100">Comisiones registradas</Badge>
              <Badge className="border-white/10 bg-white/6 text-slate-200">Datos reales</Badge>
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-[2.6rem]">Movimientos del asesor</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Consulta tus altas propias, recurrentes y lineas comerciales con trazabilidad sobre registros persistidos.
            </p>
            <div className="mt-5 rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">
              Solo se registran pagos reales, acreditados y no revertidos. Las reversiones quedan visibles para mantener la trazabilidad.
            </div>
          </CardContent>
        </Card>

        <Card className={PREMIUM_PANEL_CARD}>
          <CardHeader action={<Badge className="border-white/10 bg-white/6 text-slate-200">Solo lectura</Badge>}>
            <div>
              <CardTitle className="text-xl text-white">Semantica contable visible</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                Esta vista muestra comisiones registradas, reversiones y neto registrado, sin suponer liquidaciones financieras no publicadas.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0">
            <RuleCallout dark title="Sin estados de cobro" body="No se usa 'Pagado', 'Cobrado' ni 'Disponible para retirar' porque no existe esa fuente en este modelo." />
            <RuleCallout dark title="Sin recalculo" body="Base, porcentaje e importe provienen del snapshot persistido en el ledger." />
            <RuleCallout dark title="Sin acciones" body="El portal no genera, aprueba, revierte ni liquida movimientos desde esta pantalla." />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard dark icon={<TrendingUp className="h-4 w-4" />} label="Comisiones generadas" value={formatPortalMoney(summary.totalGenerated, currency)} detail="Suma de entries con estado real `generated`." />
        <KpiCard dark icon={<ArrowRight className="h-4 w-4" />} label="Reversiones" value={formatPortalMoney(summary.totalReversed, currency)} detail="Importe revertido visible en el ledger publicado." />
        <KpiCard dark icon={<BadgeCheck className="h-4 w-4" />} label="Neto registrado" value={formatPortalMoney(summary.netAmount, currency)} detail="Generadas menos reversiones registradas." />
        <KpiCard dark icon={<BriefcaseBusiness className="h-4 w-4" />} label="Movimientos" value={String(pagination.total || 0)} detail="Cantidad total de registros segun los filtros aplicados." />
      </section>

      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className={PREMIUM_SURFACE_CARD}>
          <CardHeader>
            <div>
              <CardTitle className="text-xl text-white">Filtros</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                Periodo, tipo real y estado real de la entry.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 pt-0">
            <label className="grid gap-2 text-sm text-slate-300">
              <span>Estado</span>
              <PartnerPortalSelect
                ariaLabel="Filtrar comisiones por estado"
                value={statusFilter}
                options={statusOptions}
                onChange={onStatusFilterChange}
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-300">
              <span>Tipo</span>
              <PartnerPortalSelect
                ariaLabel="Filtrar comisiones por tipo"
                value={typeFilter}
                options={typeOptions}
                onChange={onTypeFilterChange}
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-300">
              <span>Desde</span>
              <Input type="date" value={from} onChange={(event) => onFromChange(event.target.value)} className="border-white/10 bg-white/[0.05] text-slate-100" />
            </label>

            <label className="grid gap-2 text-sm text-slate-300">
              <span>Hasta</span>
              <Input type="date" value={to} onChange={(event) => onToChange(event.target.value)} className="border-white/10 bg-white/[0.05] text-slate-100" />
            </label>
          </CardContent>
        </Card>

        <Card className={PREMIUM_SURFACE_CARD}>
          <CardHeader action={<Badge className="border-white/10 bg-white/6 text-slate-200">{hasEntries ? `${entries.length} visibles` : "Sin resultados"}</Badge>}>
            <div>
              <CardTitle className="text-xl text-white">Movimientos registrados</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                Fecha, cliente, concepto, base, porcentaje, importe y estado, sin exponer IDs internos ni metadata sensible.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {!hasEntries ? (
              <EmptyState
                icon={<BriefcaseBusiness className="h-5 w-5" />}
                title={hasActiveFilters ? "No encontramos movimientos con esos filtros" : "Todavia no tenes movimientos registrados"}
                description={hasActiveFilters ? "Ajusta periodo, tipo o estado para volver a consultar el ledger publicado." : "Cuando existan comisiones reales registradas para tu cuenta, apareceran aca con su trazabilidad."}
                className={PREMIUM_EMPTY_STATE}
              />
            ) : (
              <div className="space-y-4">
                <div className={PREMIUM_TABLE_SHELL}>
                  <table className="min-w-full divide-y divide-white/10 text-sm">
                    <thead className="bg-white/[0.04] text-slate-400">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Fecha</th>
                        <th className="px-4 py-3 text-left font-medium">Cliente</th>
                        <th className="px-4 py-3 text-left font-medium">Concepto</th>
                        <th className="px-4 py-3 text-left font-medium">Base</th>
                        <th className="px-4 py-3 text-left font-medium">Porcentaje</th>
                        <th className="px-4 py-3 text-left font-medium">Importe</th>
                        <th className="px-4 py-3 text-left font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {entries.map((entry, index) => (
                        <CommissionTableRow key={`${entry.eventAt || "entry"}-${index}`} entry={entry} index={index} currency={currency} />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 lg:hidden">
                  {entries.map((entry, index) => (
                    <CommissionCard key={`${entry.eventAt || "entry"}-${index}`} entry={entry} index={index} currency={currency} />
                  ))}
                </div>

                {pagination.totalPages && pagination.totalPages > 1 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-sm text-slate-300">
                      Pagina {pagination.page} de {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="secondary" disabled={pagination.page <= 1} className="border-white/10 bg-white/[0.06] text-slate-100 hover:bg-white/10" onClick={() => onPageChange(Math.max(1, pagination.page - 1))}>
                        Anterior
                      </Button>
                      <Button variant="secondary" disabled={pagination.page >= (pagination.totalPages || 1)} className="border-white/10 bg-white/[0.06] text-slate-100 hover:bg-white/10" onClick={() => onPageChange(Math.min(pagination.totalPages || pagination.page, pagination.page + 1))}>
                        Siguiente
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function CommissionTableRow({ entry, index, currency }: { entry: PartnerPortalCommissionEntry; index: number; currency: string }) {
  return (
    <tr className="bg-white/[0.02] text-slate-200">
      <td className="px-4 py-4">{formatPortalDateTime(entry.eventAt)}</td>
      <td className="px-4 py-4">{resolvePartnerCommissionClientName(entry, index)}</td>
      <td className="px-4 py-4">{summarizePartnerCommissionType(entry.type, entry.depthLevel)}</td>
      <td className="px-4 py-4">{formatPortalMoney(entry.basisAmount, entry.currency || currency)}</td>
      <td className="px-4 py-4">{entry.rate}%</td>
      <td className="px-4 py-4">{formatPortalMoney(entry.amount, entry.currency || currency)}</td>
      <td className="px-4 py-4">
        <Badge variant={partnerCommissionStatusVariant(entry.status)}>{summarizePartnerCommissionStatus(entry.status)}</Badge>
      </td>
    </tr>
  );
}

function CommissionCard({ entry, index, currency }: { entry: PartnerPortalCommissionEntry; index: number; currency: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{resolvePartnerCommissionClientName(entry, index)}</p>
          <p className="mt-1 text-xs text-slate-400">{formatPortalDateTime(entry.eventAt)}</p>
        </div>
        <Badge variant={partnerCommissionStatusVariant(entry.status)}>{summarizePartnerCommissionStatus(entry.status)}</Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MetricStrip dark label="Concepto" value={summarizePartnerCommissionType(entry.type, entry.depthLevel)} icon={<BriefcaseBusiness className="h-4 w-4" />} />
        <MetricStrip dark label="Importe" value={formatPortalMoney(entry.amount, entry.currency || currency)} icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MetricStrip dark label="Base" value={formatPortalMoney(entry.basisAmount, entry.currency || currency)} icon={<CalendarRange className="h-4 w-4" />} />
        <MetricStrip dark label="Porcentaje" value={`${entry.rate}%`} icon={<BadgeCheck className="h-4 w-4" />} />
      </div>

      {entry.reversed ? (
        <div className="mt-4 rounded-[18px] border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
          Reversion visible para mantener la trazabilidad.
        </div>
      ) : null}
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
  const currentRank = resolveCurrentRank(summary, partner, rankHistory);
  const name = safePartnerName(partner, "Asesor");
  const sponsorLabel = profileFallback(partner?.sponsorPartnerId, "No informado");
  const phoneLabel = profileFallback(partner?.profile?.phone, "No informado");
  const emailLabel = profileFallback(partner?.email, "No informado");
  const codeLabel = profileFallback(partner?.profile?.code, "No informado");
  const joinedAtLabel = partner?.createdAt ? formatPortalDate(partner.createdAt) : "No informado";
  const lastLoginLabel = partner?.lastLoginAt ? formatPortalDateTime(partner.lastLoginAt) : "No informado";
  const statusLabel = formatPartnerStatus(partner?.status);
  const rankLabel = formatRankLabel(currentRank);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className={PREMIUM_HERO_CARD}>
          <CardContent className="p-6 md:p-7">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-[24px] border border-amber-300/20 bg-amber-300/10 text-xl font-semibold text-amber-100 shadow-[0_16px_40px_rgba(251,191,36,0.12)]">
                  {partnerInitials(partner)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-white/10 bg-white/6 text-slate-200">Perfil</Badge>
                    <Badge variant={partnerStatusVariant(partner?.status)}>{statusLabel}</Badge>
                  </div>
                  <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-[2.5rem]">{name}</h1>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    Consulta tu identidad y estado dentro de Opturon desde una vista segura y de solo lectura.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge className="border-white/10 bg-white/6 text-slate-100">Codigo: {codeLabel}</Badge>
                    <Badge className="border-white/10 bg-white/6 text-slate-100">Rango: {rankLabel}</Badge>
                  </div>
                </div>
              </div>

              <Button variant="secondary" className="border-white/10 bg-white/[0.06] text-slate-100 hover:bg-white/10" onClick={() => window.location.assign("/api/auth/signout?callbackUrl=/login")}>
                Cerrar sesion
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className={PREMIUM_PANEL_CARD}>
          <CardHeader action={<Badge className="border-white/10 bg-white/6 text-slate-200">Cuenta protegida</Badge>}>
            <div>
              <CardTitle className="text-xl text-white">Seguridad</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                Protegemos la cuenta del asesor manteniendo datos sensibles y acciones criticas fuera de esta fase de lectura.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0">
            <RuleCallout dark title="Sesion segura" body="El cierre de sesion usa el flujo actual del portal para invalidar el acceso del asesor." />
            <RuleCallout dark title="Sin edicion sensible" body="Email, sponsor, rango, estado y codigo permanecen en solo lectura hasta contar con endpoints seguros reales." />
            <RuleCallout dark title="Datos protegidos" body="No se exponen IDs internos, hashes, actor interno ni metadata tecnica." />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className={PREMIUM_SURFACE_CARD}>
          <CardHeader>
            <div>
              <CardTitle className="text-xl text-white">Informacion personal</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                Nombre, email, telefono, fecha de ingreso y ultimo acceso usando solamente `GET /api/partners/me`.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 pt-0 md:grid-cols-2">
            <ProfileField dark icon={<UserCircle2 className="h-4 w-4" />} label="Nombre" value={name} />
            <ProfileField dark icon={<Mail className="h-4 w-4" />} label="Email" value={emailLabel} />
            <ProfileField dark icon={<ShieldCheck className="h-4 w-4" />} label="Telefono" value={phoneLabel} />
            <ProfileField dark icon={<CalendarRange className="h-4 w-4" />} label="Fecha de ingreso" value={joinedAtLabel} />
            <ProfileField dark icon={<LockKeyhole className="h-4 w-4" />} label="Ultimo acceso" value={lastLoginLabel} />
            <ProfileField dark icon={<BadgeCheck className="h-4 w-4" />} label="Estado de cuenta" value={statusLabel} />
          </CardContent>
        </Card>

        <Card className={PREMIUM_SURFACE_CARD}>
          <CardHeader>
            <div>
              <CardTitle className="text-xl text-white">Informacion comercial</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
                Codigo visible, sponsor, rango actual y estado del perfil, sin exponer claves tecnicas ni UUIDs.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 pt-0 md:grid-cols-2">
            <ProfileField dark icon={<Sparkles className="h-4 w-4" />} label="Codigo de asesor" value={codeLabel} />
            <ProfileField dark icon={<Users2 className="h-4 w-4" />} label="Sponsor" value={sponsorLabel} />
            <ProfileField dark icon={<Star className="h-4 w-4" />} label="Rango actual" value={rankLabel} />
            <ProfileField dark icon={<ShieldCheck className="h-4 w-4" />} label="Estado del perfil" value={statusLabel} />
          </CardContent>
        </Card>
      </section>
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
    <Card className={PREMIUM_SURFACE_CARD}>
      <CardContent className="flex min-h-[176px] flex-col p-5">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-100 shadow-[0_16px_32px_rgba(251,191,36,0.08)]">{icon}</div>
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
      <div className="flex min-h-[76px] items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-100">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-1 break-words text-base font-semibold text-white">{value}</p>
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

function ProfileField({ label, value, icon, dark = false }: { label: string; value: string; icon?: React.ReactNode; dark?: boolean }) {
  if (dark) {
    return (
      <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center gap-3">
          {icon ? <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-100">{icon}</div> : null}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
            <p className="mt-1 break-words text-sm font-semibold text-white">{value}</p>
          </div>
        </div>
      </div>
    );
  }

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
        Cargando datos reales del portal de asesores...
      </div>
    </div>
  );
}

function buildPartnerCommissionLedgerEndpoint(filters: {
  status: CommissionStatusFilter;
  type: CommissionTypeFilter;
  from: string;
  to: string;
  page: number;
}) {
  const params = new URLSearchParams();
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.page > 1) params.set("page", String(filters.page));
  const suffix = params.toString();
  return suffix ? `/api/partners/me/commissions?${suffix}` : "/api/partners/me/commissions";
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
      careerProgress: null,
      commissionLedger: {
        summary: {
          totalGenerated: "0.00",
          totalReversed: "0.00",
          netAmount: "0.00",
          currency: "ARS"
        },
        entries: [],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0
        }
      },
      network: {
        summary: {
          firstLineCount: 0,
          secondLineCount: 0,
          thirdLineCount: 0,
          activeNetworkCount: 0
        },
        levels: [
          { depth: 1, partners: [] },
          { depth: 2, partners: [] },
          { depth: 3, partners: [] }
        ]
      }
    };
  }
  return base;
}

function formatMetricValue(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "Sin dato";
}
