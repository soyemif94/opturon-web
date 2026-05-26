import {
  Activity,
  Bot,
  Clock3,
  MessageSquareMore,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  WandSparkles
} from "lucide-react";
import type { ConversationRowData } from "@/components/app/inbox/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPortalContacts, getPortalConversations, getPortalSalesMetrics, isBackendConfigured } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";
import { readSaasData } from "@/lib/saas/store";

const PERIOD_DAYS = 30;
const WEEKDAY_LABELS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const TIME_BUCKETS = [
  { label: "00:00", start: 0, end: 6 },
  { label: "06:00", start: 6, end: 12 },
  { label: "12:00", start: 12, end: 18 },
  { label: "18:00", start: 18, end: 24 }
];

export default async function AppMetricsPage() {
  const ctx = await requireAppPage();
  const backendReady = Boolean(ctx.tenantId) && isBackendConfigured();
  const useLocalDemoData = !ctx.tenantId;
  const localData = useLocalDemoData ? readSaasData() : null;
  const tenantId = ctx.tenantId || localData?.tenants[0]?.id || "";

  let conversations: ConversationRowData[] = [];
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
      conversations = Array.isArray(conversationsResult.data?.conversations)
        ? (conversationsResult.data.conversations as ConversationRowData[])
        : [];
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
      conversations = [];
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
    const tenantConversations = (localData?.conversations || []).filter((item) => item.tenantId === tenantId);
    const contactsById = new Map((localData?.contacts || []).map((item) => [item.id, item]));
    conversations = tenantConversations.map((item) => ({
      id: item.id,
      status: item.status === "closed" ? "closed" : item.status === "new" ? "new" : "open",
      leadStatus: item.leadStatus || "NEW",
      leadStatusLabel: undefined,
      assignedTo: item.assignedSellerName || item.assignedSellerUserId || undefined,
      assignedSellerUserId: item.assignedSellerUserId || null,
      assignedSellerName: item.assignedSellerName || null,
      assignedSellerRole: item.assignedSellerRole || null,
      lastMessageAt: item.lastMessageAt,
      priority: item.priority === "hot" ? "hot" : "normal",
      botEnabled: item.botEnabled !== false,
      botFlowLock: item.botFlowLock,
      botDomainOverride: item.botDomainOverride,
      unreadCount: 0,
      slaMinutes: 0,
      nextActionAt: item.nextActionAt || null,
      nextActionNote: item.nextActionNote || null,
      contact: {
        id: item.contactId,
        name: contactsById.get(item.contactId)?.name || "Sin nombre",
        phone: contactsById.get(item.contactId)?.phone || undefined,
        email: contactsById.get(item.contactId)?.email || undefined
      }
    })) as ConversationRowData[];
    botResponses = tenantMessages.filter((item) => item.direction === "system").length;
    humanResponses = tenantMessages.filter((item) => item.direction === "outbound").length;
    totalInteractions = tenantMessages.length;
    activeConversations = Number(metrics?.activeConversations || tenantConversations.length || 0);
    prospects = (localData?.deals || []).filter((item) => item.tenantId === tenantId).length;
    activeResponsible = 0;
    topResponsibleLabel = "Disponible solo con backend real";
  } else {
    conversations = [];
    activeConversations = 0;
    prospects = 0;
    totalInteractions = 0;
    botResponses = 0;
    humanResponses = 0;
    activeResponsible = 0;
    topResponsibleLabel = "Sin datos";
  }

  const now = new Date();
  const periodLabel = "Ultimos 30 dias";
  const totalVisibleActivity = totalInteractions > 0 ? totalInteractions : conversations.length;

  const conversationBuckets = conversations.reduce(
    (accumulator, conversation) => {
      if (conversation.assignedSellerUserId || conversation.assignedSellerName || conversation.assignedTo) {
        accumulator.human += 1;
      } else if (conversation.botEnabled) {
        accumulator.bot += 1;
      } else {
        accumulator.pending += 1;
      }
      return accumulator;
    },
    { bot: 0, human: 0, pending: 0 }
  );

  const botManagedConversations = conversations.filter((item) => item.botEnabled).length;
  const botCoverage = totalVisibleActivity > 0 ? Math.round((botResponses / totalVisibleActivity) * 100) : 0;
  const humanCoverage = totalVisibleActivity > 0 ? Math.round((humanResponses / totalVisibleActivity) * 100) : 0;
  const automationReach = activeConversations > 0 ? Math.round((botManagedConversations / activeConversations) * 100) : 0;
  const pendingConversations = conversationBuckets.pending;
  const pendingCoverage = activeConversations > 0 ? Math.round((pendingConversations / activeConversations) * 100) : 0;

  const avgResponseMinutes =
    conversations.length > 0 ? Math.round(conversations.reduce((sum, item) => sum + Number(item.slaMinutes || 0), 0) / conversations.length) : 0;
  const estimatedMinutesPerAutomatedResponse = Math.max(2, Math.min(5, avgResponseMinutes || 3));
  const timeSavedHours = Math.round(((botResponses * estimatedMinutesPerAutomatedResponse) / 60) * 10) / 10;

  const dailyActivity = buildDailyActivity(conversations, now);
  const maxDailyValue = Math.max(1, ...dailyActivity.map((item) => item.total));
  const busiestDay = dailyActivity.reduce((current, item) => (item.total > current.total ? item : current), dailyActivity[0] || { label: "-", total: 0, bot: 0 });

  const heatmap = buildHeatmap(conversations);
  const heatMax = Math.max(1, ...heatmap.flatMap((row) => row.values));
  const hottestCell = findHottestCell(heatmap);

  const statusRows = [
    { label: "Nuevas", value: conversations.filter((item) => item.leadStatus === "NEW").length, tone: "sky" as const },
    { label: "En conversacion", value: conversations.filter((item) => item.leadStatus === "IN_CONVERSATION").length, tone: "orange" as const },
    { label: "Seguimiento", value: conversations.filter((item) => item.leadStatus === "FOLLOW_UP").length, tone: "amber" as const },
    { label: "Cerradas", value: conversations.filter((item) => item.leadStatus === "CLOSED").length, tone: "violet" as const }
  ];

  const topCards = [
    {
      label: "Conversaciones",
      value: formatNumber(activeConversations),
      helper: "Activas en el canal",
      foot: totalVisibleActivity > 0 ? `${formatNumber(totalVisibleActivity)} interacciones visibles` : "Sin actividad visible",
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
      helper: `${humanCoverage}% del volumen visible`,
      foot: activeResponsible > 0 ? `${activeResponsible} responsables activos` : topResponsibleLabel,
      tone: "green" as const,
      icon: UserRound
    },
    {
      label: "Respuestas del bot",
      value: formatNumber(botResponses),
      helper: `${formatNumber(botManagedConversations)} conversaciones con bot activo`,
      foot: botResponses > 0 ? "Conteo crudo de respuestas automaticas" : "El endpoint no reporta respuestas automaticas visibles",
      tone: "violet" as const,
      icon: Bot
    },
    {
      label: "Cobertura automatizada",
      value: `${automationReach}%`,
      helper: "Conversaciones con bot activo",
      foot: pendingConversations > 0 ? `${formatNumber(pendingConversations)} pendientes visibles` : "Cobertura estable",
      tone: "sky" as const,
      icon: ShieldCheck
    }
  ];

  const visibilityStats = [
    {
      label: "Cobertura automatizada",
      value: `${automationReach}%`,
      helper: `${formatNumber(botManagedConversations)} conversaciones con bot activo`,
      tone: "orange" as const
    },
    {
      label: "Intervencion humana",
      value: `${conversationPercent(conversationBuckets.human, activeConversations)}%`,
      helper: `${formatNumber(conversationBuckets.human)} conversaciones con responsable`,
      tone: "green" as const
    },
    {
      label: "Pendientes visibles",
      value: `${pendingCoverage}%`,
      helper: pendingConversations > 0 ? `${formatNumber(pendingConversations)} sin cobertura clara` : "Sin pendientes visibles",
      tone: "sky" as const
    }
  ];

  const insights = [
    {
      label: "Tiempo ahorrado al equipo",
      value: `${formatHours(timeSavedHours)} ahorradas`,
      helper: `Estimado con ${estimatedMinutesPerAutomatedResponse} min por respuesta automatica`,
      tone: "orange" as const,
      icon: Sparkles
    },
    {
      label: "Tiempo de respuesta promedio",
      value: avgResponseMinutes > 0 ? formatMinutes(avgResponseMinutes) : "Sin dato",
      helper: "Promedio visible del backlog comercial",
      tone: "violet" as const,
      icon: Clock3
    },
    {
      label: "Responsables activos",
      value: formatNumber(activeResponsible),
      helper: topResponsibleLabel,
      tone: "amber" as const,
      icon: WandSparkles
    }
  ];

  const recentInsights = [
    {
      title: "Pico de actividad",
      detail: busiestDay ? `${busiestDay.label}: ${formatNumber(busiestDay.total)} movimientos visibles` : "Sin actividad visible en el periodo",
      tone: "green" as const
    },
    {
      title: "Mejor horario del canal",
      detail: hottestCell ? `${hottestCell.dayLabel} ${hottestCell.timeLabel} concentra el mayor movimiento` : "Todavia no hay patron horario visible",
      tone: "violet" as const
    },
    {
      title: "Cobertura automatizada",
      detail: `${automationReach}% de las conversaciones visibles tienen el bot activo`,
      tone: "orange" as const
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

          <div className="flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-surface/70 px-4 py-2 text-sm text-muted">
            <span className="font-medium text-text">{periodLabel}</span>
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
            emphasis={index === 0 || card.label === "Cobertura automatizada"}
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-[28px] leading-none tracking-tight">Interacciones por dia</CardTitle>
                <CardDescription className="mt-2 text-sm">
                  Tendencia visible del canal durante los ultimos 30 dias.
                </CardDescription>
              </div>
              <Badge variant="outline">Ultimos 30 dias</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-[24px] border border-[color:var(--border)] bg-surface/60 p-4">
              <div className="flex flex-wrap items-center gap-5 text-sm">
                <LegendDot label="Interacciones visibles" color="bg-brand" />
                <LegendDot label="Conversaciones con bot activo" color="bg-emerald-500" />
              </div>
              <div className="mt-5">
                <div className="relative h-64">
                  <div className="absolute inset-0 flex flex-col justify-between">
                    {[0, 1, 2, 3].map((line) => (
                      <div key={line} className="border-t border-white/6" />
                    ))}
                  </div>
                  <div className="relative h-full">
                    <LineArea values={dailyActivity.map((item) => item.total)} maxValue={maxDailyValue} tone="orange" />
                    <LineArea values={dailyActivity.map((item) => item.bot)} maxValue={maxDailyValue} tone="green" />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-6 gap-2 text-xs text-muted xl:grid-cols-10">
                  {dailyActivity
                    .filter((_, index) => index % 3 === 0 || index === dailyActivity.length - 1)
                    .map((item) => (
                      <span key={item.label}>{item.label}</span>
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
          <CardHeader className="pb-4">
            <div>
              <CardTitle className="text-[28px] leading-none tracking-tight">Visibilidad comercial del canal</CardTitle>
              <CardDescription className="mt-2 text-sm">
                Distribucion ejecutiva entre automatizacion, responsables y pendientes visibles.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="rounded-[24px] border border-[color:var(--border)] bg-surface/60 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Resumen del periodo</p>
              <p className="mt-2 text-3xl font-semibold">{formatNumber(totalVisibleActivity)}</p>
              <p className="mt-1 text-sm text-muted">Volumen visible del canal durante {periodLabel.toLowerCase()}.</p>
              <div className="mt-4 grid gap-3">
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
              <div className="flex items-center gap-5">
                <DistributionRing
                  values={[
                    conversationPercent(conversationBuckets.bot, activeConversations),
                    conversationPercent(conversationBuckets.human, activeConversations),
                    pendingCoverage
                  ]}
                />
                <div className="min-w-0 flex-1 space-y-3">
                  <DistributionRow
                    label="Bot activo"
                    value={conversationPercent(conversationBuckets.bot, activeConversations)}
                    count={conversationBuckets.bot}
                    tone="orange"
                  />
                  <DistributionRow
                    label="Con responsable"
                    value={conversationPercent(conversationBuckets.human, activeConversations)}
                    count={conversationBuckets.human}
                    tone="green"
                  />
                  <DistributionRow label="Pendientes" value={pendingCoverage} count={pendingConversations} tone="sky" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.55fr)_minmax(340px,0.9fr)]">
        <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
          <CardHeader className="pb-4">
            <div>
              <CardTitle className="text-[28px] leading-none tracking-tight">Tiempo de respuesta promedio</CardTitle>
              <CardDescription className="mt-2 text-sm">
                Promedio visible del backlog comercial actual.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-[24px] border border-[color:var(--border)] bg-surface/60 p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-4xl font-semibold">{avgResponseMinutes > 0 ? formatMinutes(avgResponseMinutes) : "Sin dato"}</p>
                  <p className="mt-2 text-sm text-muted">Promedio general visible hoy</p>
                </div>
                <Badge variant={avgResponseMinutes <= 15 ? "success" : avgResponseMinutes <= 45 ? "warning" : "outline"}>
                  {avgResponseMinutes <= 15 ? "Rapido" : avgResponseMinutes <= 45 ? "En seguimiento" : "Revisar"}
                </Badge>
              </div>
              <MiniSparkline values={dailyActivity.map((item) => Math.max(item.total - item.bot, 0))} className="mt-6" tone="violet" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
          <CardHeader className="pb-4">
            <div>
              <CardTitle className="text-[28px] leading-none tracking-tight">Conversaciones por estado</CardTitle>
              <CardDescription className="mt-2 text-sm">
                Como se reparte hoy el canal entre nuevas, activas, seguimiento y cierre.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {statusRows.map((row) => (
              <StatusRow key={row.label} label={row.label} value={row.value} total={Math.max(conversations.length, 1)} tone={row.tone} />
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
          <CardHeader className="pb-4">
            <div>
              <CardTitle className="text-[28px] leading-none tracking-tight">Horarios de mayor actividad</CardTitle>
              <CardDescription className="mt-2 text-sm">
                Una lectura simple para entender cuando el canal recibe mas movimiento.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-[24px] border border-[color:var(--border)] bg-surface/60 p-4">
              <div className="grid gap-2">
                {heatmap.map((row) => (
                  <div key={row.label} className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] items-center gap-2">
                    <span className="text-xs text-muted">{row.label}</span>
                    {row.values.map((value, index) => (
                      <div
                        key={`${row.label}-${WEEKDAY_LABELS[index]}`}
                        className="h-9 rounded-lg border border-white/6"
                        style={{ backgroundColor: heatColor(value, heatMax) }}
                        title={`${WEEKDAY_LABELS[index]} ${row.label}: ${value}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted">
                <span>{WEEKDAY_LABELS.join(" · ")}</span>
                <Badge variant="warning">{hottestCell ? `${hottestCell.dayLabel} ${hottestCell.timeLabel}` : "Sin pico visible"}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
          <CardHeader className="pb-4">
            <div>
              <CardTitle className="text-[28px] leading-none tracking-tight">Actividad reciente</CardTitle>
              <CardDescription className="mt-2 text-sm">
                Insights operativos simples para entender lo que esta pasando en el canal.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0 md:grid-cols-3">
            {recentInsights.map((item) => (
              <InsightTile key={item.title} title={item.title} detail={item.detail} tone={item.tone} />
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
          <CardHeader className="pb-4">
            <div>
              <CardTitle className="text-[28px] leading-none tracking-tight">Lectura rapida</CardTitle>
              <CardDescription className="mt-2 text-sm">
                Los tres indicadores que mas resumen el trabajo del canal hoy.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {insights.map((card) => (
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
  tone: Tone;
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
  tone: Tone;
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

function LineArea({
  values,
  maxValue,
  tone
}: {
  values: number[];
  maxValue: number;
  tone: "orange" | "green";
}) {
  if (!values.length) return null;
  const width = 100;
  const height = 100;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - (value / Math.max(maxValue, 1)) * 88 - 6;
      return `${x},${y}`;
    })
    .join(" ");
  const stroke = tone === "orange" ? "#ff8a1f" : "#21c17a";
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 h-full w-full">
      <polyline fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

function MiniSparkline({ values, className = "", tone }: { values: number[]; className?: string; tone: "violet" | "orange" }) {
  if (!values.length) return null;
  const width = 120;
  const height = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className={className} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline fill="none" stroke={tone === "violet" ? "#8b5cf6" : "#ff8a1f"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

function StatusRow({
  label,
  value,
  total,
  tone
}: {
  label: string;
  value: number;
  total: number;
  tone: Tone;
}) {
  const pct = Math.round((value / Math.max(total, 1)) * 100);
  return (
    <div className="rounded-[18px] border border-[color:var(--border)] bg-surface/55 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-text">{label}</span>
        <span className="text-sm font-medium text-text">
          {formatNumber(value)} ({pct}%)
        </span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white/5">
        <div className={`h-2 rounded-full ${toneBarClass(tone)}`} style={{ width: `${Math.max(8, pct)}%` }} />
      </div>
    </div>
  );
}

function InsightTile({ title, detail, tone }: { title: string; detail: string; tone: Tone }) {
  return (
    <div className={`rounded-[22px] border p-4 ${toneSurfaceClass(tone)}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
    </div>
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

type Tone = "orange" | "amber" | "green" | "violet" | "sky";

function toneIconClass(tone: Tone) {
  if (tone === "orange") return "border-brand/25 bg-brand/10 text-brandBright";
  if (tone === "amber") return "border-[#f2a44c]/20 bg-[#f2a44c]/10 text-[#f2a44c]";
  if (tone === "green") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  if (tone === "violet") return "border-violet-500/20 bg-violet-500/10 text-violet-300";
  return "border-sky-500/20 bg-sky-500/10 text-sky-300";
}

function toneSurfaceClass(tone: Tone) {
  if (tone === "orange") return "border-brand/18 bg-[linear-gradient(180deg,rgba(192,80,0,0.12),rgba(255,255,255,0.02))]";
  if (tone === "amber") return "border-[#f2a44c]/18 bg-[linear-gradient(180deg,rgba(242,164,76,0.12),rgba(255,255,255,0.02))]";
  if (tone === "green") return "border-emerald-500/18 bg-[linear-gradient(180deg,rgba(34,120,84,0.12),rgba(255,255,255,0.02))]";
  if (tone === "violet") return "border-violet-500/18 bg-[linear-gradient(180deg,rgba(109,76,205,0.12),rgba(255,255,255,0.02))]";
  return "border-sky-500/18 bg-[linear-gradient(180deg,rgba(51,166,255,0.12),rgba(255,255,255,0.02))]";
}

function toneValueClass(tone: Tone) {
  if (tone === "orange") return "text-brandBright";
  if (tone === "amber") return "text-[#f2a44c]";
  if (tone === "green") return "text-emerald-300";
  if (tone === "violet") return "text-violet-300";
  return "text-sky-300";
}

function toneBarClass(tone: Tone) {
  if (tone === "orange") return "bg-brand";
  if (tone === "amber") return "bg-[#f2a44c]";
  if (tone === "green") return "bg-emerald-500";
  if (tone === "violet") return "bg-violet-500";
  return "bg-sky-500";
}

function buildDailyActivity(conversations: ConversationRowData[], now: Date) {
  const days = Array.from({ length: PERIOD_DAYS }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (PERIOD_DAYS - 1 - index));
    return {
      key: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(date),
      total: 0,
      bot: 0
    };
  });
  const dayMap = new Map(days.map((item) => [item.key, item]));
  for (const conversation of conversations) {
    const date = new Date(conversation.lastMessageAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().slice(0, 10);
    const bucket = dayMap.get(key);
    if (!bucket) continue;
    bucket.total += 1;
    if (conversation.botEnabled) bucket.bot += 1;
  }
  return days;
}

function buildHeatmap(conversations: ConversationRowData[]) {
  const matrix = TIME_BUCKETS.map((bucket) => ({ label: bucket.label, values: Array(7).fill(0) as number[] }));
  for (const conversation of conversations) {
    const date = new Date(conversation.lastMessageAt);
    if (Number.isNaN(date.getTime())) continue;
    const jsDay = date.getDay();
    const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
    const hour = date.getHours();
    const rowIndex = TIME_BUCKETS.findIndex((bucket) => hour >= bucket.start && hour < bucket.end);
    if (rowIndex >= 0) matrix[rowIndex].values[dayIndex] += 1;
  }
  return matrix;
}

function findHottestCell(heatmap: Array<{ label: string; values: number[] }>): { dayLabel: string; timeLabel: string } | null {
  let max = 0;
  let best: { dayLabel: string; timeLabel: string } | null = null;
  heatmap.forEach((row) => {
    row.values.forEach((value, index) => {
      if (value > max) {
        max = value;
        best = { dayLabel: WEEKDAY_LABELS[index], timeLabel: row.label };
      }
    });
  });
  return best;
}

function heatColor(value: number, max: number) {
  const alpha = max > 0 ? value / max : 0;
  if (alpha === 0) return "rgba(255,255,255,0.03)";
  const intensity = 0.14 + alpha * 0.62;
  return `rgba(255,138,31,${intensity.toFixed(2)})`;
}

function conversationPercent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function formatMinutes(value: number) {
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${hours}h ${minutes}m`;
}

function formatHours(value: number) {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-AR").format(Number.isFinite(value) ? value : 0);
}
