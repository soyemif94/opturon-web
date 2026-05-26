import {
  Bot,
  MessageSquareMore,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import type { ConversationRowData } from "@/components/app/inbox/types";
import {
  MetricsInteractivePanels,
  type CompactInsight,
  type HeatmapCellRow,
  type InsightItem,
  type StatusRowItem
} from "@/app/app/metrics/metrics-interactive-panels";
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
  const hottestCell = findHottestCell(heatmap);

  const statusRows: StatusRowItem[] = [
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

  const insights: CompactInsight[] = [
    {
      label: "Tiempo ahorrado al equipo",
      value: `${formatHours(timeSavedHours)} ahorradas`,
      helper: `Estimado con ${estimatedMinutesPerAutomatedResponse} min por respuesta automatica`,
      tone: "orange" as const,
      iconKey: "sparkles"
    },
    {
      label: "Tiempo de respuesta promedio",
      value: avgResponseMinutes > 0 ? formatMinutes(avgResponseMinutes) : "Sin dato",
      helper: "Promedio visible del backlog comercial",
      tone: "violet" as const,
      iconKey: "clock"
    },
    {
      label: "Responsables activos",
      value: formatNumber(activeResponsible),
      helper: topResponsibleLabel,
      tone: "amber" as const,
      iconKey: "wand"
    }
  ];

  const recentInsights: InsightItem[] = [
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

      <MetricsInteractivePanels
        periodLabel={periodLabel}
        dailyActivity={dailyActivity}
        statusRows={statusRows}
        heatmap={heatmap}
        totalVisibleActivity={totalVisibleActivity}
        botManagedConversations={botManagedConversations}
        activeConversations={activeConversations}
        pendingConversations={pendingConversations}
        avgResponseLabel={avgResponseMinutes > 0 ? formatMinutes(avgResponseMinutes) : "Sin dato"}
        recentInsights={recentInsights}
        insights={insights}
      />
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

function buildDailyActivity(conversations: ConversationRowData[], now: Date) {
  const days = Array.from({ length: PERIOD_DAYS }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (PERIOD_DAYS - 1 - index));
    return {
      key: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(date),
      total: 0,
      bot: 0,
      human: 0,
      pending: 0
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
    if (conversation.assignedSellerUserId || conversation.assignedSellerName || conversation.assignedTo) {
      bucket.human += 1;
    } else if (conversation.botEnabled) {
      bucket.bot += 1;
    } else {
      bucket.pending += 1;
    }
  }
  return days;
}

function buildHeatmap(conversations: ConversationRowData[]): HeatmapCellRow[] {
  const matrix: HeatmapCellRow[] = TIME_BUCKETS.map((bucket) => ({
    label: bucket.label,
    values: WEEKDAY_LABELS.map((dayLabel) => ({
      dayLabel,
      timeLabel: bucket.label,
      value: 0,
      bot: 0,
      human: 0,
      pending: 0
    }))
  }));
  for (const conversation of conversations) {
    const date = new Date(conversation.lastMessageAt);
    if (Number.isNaN(date.getTime())) continue;
    const jsDay = date.getDay();
    const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
    const hour = date.getHours();
    const rowIndex = TIME_BUCKETS.findIndex((bucket) => hour >= bucket.start && hour < bucket.end);
    if (rowIndex < 0) continue;
    const cell = matrix[rowIndex]?.values[dayIndex];
    if (!cell) continue;
    cell.value += 1;
    if (conversation.assignedSellerUserId || conversation.assignedSellerName || conversation.assignedTo) {
      cell.human += 1;
    } else if (conversation.botEnabled) {
      cell.bot += 1;
    } else {
      cell.pending += 1;
    }
  }
  return matrix;
}

function findHottestCell(heatmap: HeatmapCellRow[]): { dayLabel: string; timeLabel: string } | null {
  let max = 0;
  let best: { dayLabel: string; timeLabel: string } | null = null;
  heatmap.forEach((row) => {
    row.values.forEach((cell) => {
      if (cell.value > max) {
        max = cell.value;
        best = { dayLabel: cell.dayLabel, timeLabel: row.label };
      }
    });
  });
  return best;
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
