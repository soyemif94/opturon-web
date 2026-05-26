import {
  Activity,
  Bot,
  MessageSquareMore,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  WandSparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPortalContacts, getPortalConversations, getPortalSalesMetrics, isBackendConfigured } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";
import { readSaasData } from "@/lib/saas/store";

export default async function AppMetricsPage() {
  const ctx = await requireAppPage();
  const backendReady = Boolean(ctx.tenantId) && isBackendConfigured();
  const useLocalDemoData = !ctx.tenantId;
  const localData = useLocalDemoData ? readSaasData() : null;
  const tenantId = ctx.tenantId || localData?.tenants[0]?.id || "";

  let activeConversations = 0;
  let prospects = 0;
  let botResponses = 0;
  let humanResponses = 0;
  let totalInteractions = 0;
  let activeResponsible = 0;
  let topResponsibleLabel = "Todavia no hay seguimiento asignado";

  if (ctx.tenantId && backendReady) {
    try {
      const [conversationsResult, contactsResult, salesMetricsResult] = await Promise.all([
        getPortalConversations(ctx.tenantId),
        getPortalContacts(ctx.tenantId),
        getPortalSalesMetrics(ctx.tenantId)
      ]);
      const conversations = Array.isArray(conversationsResult.data?.conversations) ? conversationsResult.data.conversations : [];
      const contacts = Array.isArray(contactsResult.data?.contacts) ? contactsResult.data.contacts : [];
      const metrics = salesMetricsResult.data?.metrics;
      const responsiblePerformance = Array.isArray(metrics?.responsiblePerformance) ? metrics.responsiblePerformance : [];

      activeConversations = conversations.length;
      prospects = contacts.length;
      totalInteractions = Number(metrics?.totalConversationMessagesCount || 0);
      botResponses = Number(metrics?.automatedResponsesCount || 0);
      humanResponses = Number(metrics?.humanResponsesCount || 0);
      activeResponsible = responsiblePerformance.length;
      if (responsiblePerformance.length) {
        const topResponsible = responsiblePerformance[0];
        topResponsibleLabel = `${topResponsible.responsibleName}: ${topResponsible.humanResponses} respuestas humanas`;
      }
    } catch {
      activeConversations = 0;
      prospects = 0;
      totalInteractions = 0;
      botResponses = 0;
      humanResponses = 0;
      activeResponsible = 0;
      topResponsibleLabel = "No se pudieron cargar responsables";
    }
  } else if (useLocalDemoData) {
    const metrics = localData?.tenantMetrics.find((item) => item.tenantId === tenantId);
    const tenantMessages = (localData?.messages || []).filter((item) => item.tenantId === tenantId);
    botResponses = tenantMessages.filter((item) => item.direction === "system").length;
    humanResponses = tenantMessages.filter((item) => item.direction === "outbound").length;
    totalInteractions = tenantMessages.length;
    activeConversations = Number(metrics?.activeConversations || 0);
    prospects = (localData?.deals || []).filter((item) => item.tenantId === tenantId).length;
    activeResponsible = 0;
    topResponsibleLabel = "Disponible solo con backend real";
  } else {
    activeConversations = 0;
    prospects = 0;
    totalInteractions = 0;
    botResponses = 0;
    humanResponses = 0;
    activeResponsible = 0;
    topResponsibleLabel = "Sin datos";
  }

  const botCoverage = totalInteractions > 0 ? Math.round((botResponses / totalInteractions) * 100) : 0;
  const humanCoverage = totalInteractions > 0 ? Math.round((humanResponses / totalInteractions) * 100) : 0;
  const uncoveredInteractions = Math.max(totalInteractions - botResponses - humanResponses, 0);
  const uncoveredCoverage = totalInteractions > 0 ? Math.round((uncoveredInteractions / totalInteractions) * 100) : 0;
  const automationSupport = totalInteractions > 0 ? Math.round(((botResponses + humanResponses) / totalInteractions) * 100) : 0;
  const periodLabel = "Ultimos 30 dias";

  const topCards = [
    {
      label: "Conversaciones",
      value: formatNumber(activeConversations),
      helper: "Activas en el canal",
      foot: totalInteractions > 0 ? `${formatNumber(totalInteractions)} interacciones visibles` : "Sin actividad visible",
      tone: "orange" as const,
      icon: MessageSquareMore
    },
    {
      label: "Prospectos",
      value: formatNumber(prospects),
      helper: "Contactos visibles",
      foot: prospects > 0 ? "Base comercial del periodo" : "Sin prospectos visibles",
      tone: "amber" as const,
      icon: Users
    },
    {
      label: "Respuestas humanas",
      value: formatNumber(humanResponses),
      helper: `${humanCoverage}% del volumen`,
      foot: activeResponsible > 0 ? `${activeResponsible} responsables activos` : topResponsibleLabel,
      tone: "green" as const,
      icon: UserRound
    },
    {
      label: "Respuestas del bot",
      value: formatNumber(botResponses),
      helper: `${botCoverage}% de cobertura`,
      foot: botCoverage > 0 ? "Automatizacion visible" : "Aun sin asistencia automatica",
      tone: "violet" as const,
      icon: Bot
    },
    {
      label: "Cobertura del canal",
      value: `${automationSupport}%`,
      helper: "Conversaciones con respuesta",
      foot: uncoveredInteractions > 0 ? `${formatNumber(uncoveredInteractions)} sin responder` : "Cobertura estable",
      tone: "sky" as const,
      icon: ShieldCheck
    }
  ];

  const visibilityStats = [
    {
      label: "Asistencia automatizada",
      value: `${botCoverage}%`,
      helper: `${formatNumber(botResponses)} respuestas del bot`,
      tone: "orange" as const
    },
    {
      label: "Intervencion humana",
      value: `${humanCoverage}%`,
      helper: `${formatNumber(humanResponses)} respuestas del equipo`,
      tone: "green" as const
    },
    {
      label: "Cobertura pendiente",
      value: `${uncoveredCoverage}%`,
      helper: uncoveredInteractions > 0 ? `${formatNumber(uncoveredInteractions)} interacciones sin responder` : "Sin pendientes visibles",
      tone: "sky" as const
    }
  ];

  const secondaryCards = [
    {
      label: "Interacciones totales",
      value: formatNumber(totalInteractions),
      helper: "Volumen del periodo",
      tone: "orange" as const,
      icon: Activity
    },
    {
      label: "Cobertura del bot",
      value: `${botCoverage}%`,
      helper: "Participacion automatizada",
      tone: "violet" as const,
      icon: WandSparkles
    },
    {
      label: "Responsables activos",
      value: formatNumber(activeResponsible),
      helper: topResponsibleLabel,
      tone: "amber" as const,
      icon: Sparkles
    }
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-5 py-4 shadow-[var(--card-shadow)] xl:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="warning">Analytics</Badge>
              <Badge variant="muted">Canal comercial</Badge>
            </div>
            <h1 className="mt-3 text-[2rem] font-semibold tracking-tight">Metricas</h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted">
              Entiende rapido el impacto del canal, el trabajo del equipo y cuanto valor ya esta aportando la automatizacion.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-surface/70 p-1.5">
              <RangeChip label="Hoy" />
              <RangeChip label="7 dias" />
              <RangeChip label="30 dias" active />
            </div>
            <div className="text-xs text-muted">{periodLabel}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {topCards.map((card, index) => (
          <MetricSummaryCard
            key={card.label}
            label={card.label}
            value={card.value}
            helper={card.helper}
            foot={card.foot}
            tone={card.tone}
            icon={card.icon}
            emphasis={index === 0 || card.label === "Cobertura del canal"}
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
          <CardHeader className="pb-4">
            <div>
              <CardTitle className="text-[28px] leading-none tracking-tight">Visibilidad comercial del canal</CardTitle>
              <CardDescription className="mt-2 text-sm">
                Lectura simple de volumen, asistencia y cobertura para entender rapido como se esta moviendo la conversacion comercial.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 pt-0 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
            <div className="space-y-3">
              <div className="rounded-[24px] border border-[color:var(--border)] bg-[linear-gradient(135deg,rgba(192,80,0,0.14),rgba(255,255,255,0.02))] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Resumen del periodo</p>
                <p className="mt-2 text-3xl font-semibold">{formatNumber(totalInteractions)}</p>
                <p className="mt-1 text-sm text-muted">Interacciones totales visibles en el canal durante {periodLabel.toLowerCase()}.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {visibilityStats.map((item) => (
                    <div key={item.label} className="rounded-[18px] border border-[color:var(--border)] bg-bg/55 px-3.5 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{item.label}</p>
                      <p className={`mt-2 text-xl font-semibold ${toneValueClass(item.tone)}`}>{item.value}</p>
                      <p className="mt-1 text-xs text-muted">{item.helper}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-[color:var(--border)] bg-surface/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Cobertura conversacional</p>
                    <p className="mt-1 text-sm text-muted">Cuanto del volumen ya recibio apoyo del bot o del equipo.</p>
                  </div>
                  <Badge variant={automationSupport >= 75 ? "success" : "warning"}>{automationSupport}% cubierto</Badge>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/5">
                  <div className="flex h-full w-full">
                    <div className="h-full bg-brand" style={{ width: `${botCoverage}%` }} />
                    <div className="h-full bg-emerald-500/80" style={{ width: `${humanCoverage}%` }} />
                    <div className="h-full bg-sky-500/60" style={{ width: `${uncoveredCoverage}%` }} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                  <LegendDot label="Bot" color="bg-brand" />
                  <LegendDot label="Equipo" color="bg-emerald-500" />
                  <LegendDot label="Pendiente" color="bg-sky-500" />
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[color:var(--border)] bg-surface/60 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Distribucion visible</p>
              <div className="mt-4 flex items-center gap-5">
                <DistributionRing values={[botCoverage, humanCoverage, uncoveredCoverage]} />
                <div className="min-w-0 flex-1 space-y-3">
                  <DistributionRow label="Bot" value={botCoverage} count={botResponses} tone="orange" />
                  <DistributionRow label="Humanas" value={humanCoverage} count={humanResponses} tone="green" />
                  <DistributionRow label="Pendientes" value={uncoveredCoverage} count={uncoveredInteractions} tone="sky" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
          <CardHeader className="pb-4">
            <div>
              <CardTitle className="text-[28px] leading-none tracking-tight">Lectura rapida</CardTitle>
              <CardDescription className="mt-2 text-sm">
                Lo mas importante para revisar el canal sin entrar en reportes largos.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {secondaryCards.map((card) => (
              <CompactInsightCard key={card.label} label={card.label} value={card.value} helper={card.helper} tone={card.tone} icon={card.icon} />
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricSummaryCard({
  label,
  value,
  helper,
  foot,
  tone,
  icon: Icon,
  emphasis = false
}: {
  label: string;
  value: string;
  helper: string;
  foot: string;
  tone: "orange" | "amber" | "green" | "violet" | "sky";
  icon: React.ComponentType<{ className?: string }>;
  emphasis?: boolean;
}) {
  return (
    <Card className={`${emphasis ? toneSurfaceClass(tone) : "border-white/6 bg-card/90"} shadow-[var(--card-shadow)]`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <span className={`inline-flex h-12 w-12 items-center justify-center rounded-[20px] border ${toneIconClass(tone)}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted">{helper}</p>
        <p className={`mt-2 text-xs font-medium ${toneValueClass(tone)}`}>{foot}</p>
      </CardContent>
    </Card>
  );
}

function CompactInsightCard({
  label,
  value,
  helper,
  tone,
  icon: Icon
}: {
  label: string;
  value: string;
  helper: string;
  tone: "orange" | "amber" | "green" | "violet" | "sky";
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-[22px] border border-[color:var(--border)] bg-surface/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-1 text-sm text-muted">{helper}</p>
        </div>
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-[18px] border ${toneIconClass(tone)}`}>
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <p className={`mt-4 text-2xl font-semibold ${toneValueClass(tone)}`}>{value}</p>
    </div>
  );
}

function RangeChip({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <span
      className={`inline-flex h-9 items-center rounded-xl px-3 text-sm font-medium ${
        active ? "bg-brand text-white" : "border border-[color:var(--border)] bg-transparent text-muted"
      }`}
    >
      {label}
    </span>
  );
}

function LegendDot({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function DistributionRow({
  label,
  value,
  count,
  tone
}: {
  label: string;
  value: number;
  count: number;
  tone: "orange" | "green" | "sky";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${tone === "orange" ? "bg-brand" : tone === "green" ? "bg-emerald-500" : "bg-sky-500"}`} />
        <span className="text-sm text-text">{label}</span>
      </div>
      <span className="text-sm text-muted">
        {value}% ({formatNumber(count)})
      </span>
    </div>
  );
}

function DistributionRing({ values }: { values: number[] }) {
  const [bot, human, pending] = values;
  const botAngle = (bot / 100) * 360;
  const humanAngle = (human / 100) * 360;
  return (
    <div
      className="relative h-40 w-40 shrink-0 rounded-full"
      style={{
        background: `conic-gradient(#ff8a1f 0deg ${botAngle}deg, #21c17a ${botAngle}deg ${botAngle + humanAngle}deg, #33a6ff ${botAngle + humanAngle}deg 360deg)`
      }}
    >
      <div className="absolute inset-[18px] flex items-center justify-center rounded-full border border-[color:var(--border)] bg-bg">
        <div className="text-center">
          <p className="text-3xl font-semibold">{values[0] + values[1] + values[2]}%</p>
          <p className="mt-1 text-sm text-muted">Cobertura</p>
        </div>
      </div>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-AR").format(Number.isFinite(value) ? value : 0);
}

function toneIconClass(tone: "orange" | "amber" | "green" | "violet" | "sky") {
  if (tone === "orange") return "border-brand/25 bg-brand/10 text-brandBright";
  if (tone === "amber") return "border-[#f2a44c]/20 bg-[#f2a44c]/10 text-[#f2a44c]";
  if (tone === "green") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  if (tone === "violet") return "border-violet-500/20 bg-violet-500/10 text-violet-300";
  return "border-sky-500/20 bg-sky-500/10 text-sky-300";
}

function toneSurfaceClass(tone: "orange" | "amber" | "green" | "violet" | "sky") {
  if (tone === "orange") return "border-brand/18 bg-[linear-gradient(180deg,rgba(192,80,0,0.12),rgba(255,255,255,0.02))]";
  if (tone === "amber") return "border-[#f2a44c]/18 bg-[linear-gradient(180deg,rgba(242,164,76,0.12),rgba(255,255,255,0.02))]";
  if (tone === "green") return "border-emerald-500/18 bg-[linear-gradient(180deg,rgba(34,120,84,0.12),rgba(255,255,255,0.02))]";
  if (tone === "violet") return "border-violet-500/18 bg-[linear-gradient(180deg,rgba(109,76,205,0.12),rgba(255,255,255,0.02))]";
  return "border-sky-500/18 bg-[linear-gradient(180deg,rgba(51,166,255,0.12),rgba(255,255,255,0.02))]";
}

function toneValueClass(tone: "orange" | "amber" | "green" | "violet" | "sky") {
  if (tone === "orange") return "text-brandBright";
  if (tone === "amber") return "text-[#f2a44c]";
  if (tone === "green") return "text-emerald-300";
  if (tone === "violet") return "text-violet-300";
  return "text-sky-300";
}
