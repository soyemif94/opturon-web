import { OpsDashboard } from "@/components/ops/ops-dashboard";
import { requireOpsPage } from "@/lib/saas/access";
import { calculateHealthScore, readSaasData } from "@/lib/saas/store";

type AlertSeverity = "warning" | "danger" | "success";
type HealthTone = "success" | "warning" | "danger";

export default async function OpsHomePage() {
  await requireOpsPage();
  const data = readSaasData();

  const activeClients = data.tenants.filter((tenant) => tenant.status === "active").length;
  const onboardingClients = data.tenants.filter((tenant) => tenant.status === "trial").length;
  const connectedChannels = data.tenants.filter((tenant) => tenant.status !== "cancelled").length;
  const conversationsToday = data.conversations.filter((conversation) => isWithinHours(conversation.lastMessageAt, 24)).length;
  const automatedMessages = data.messages.filter(
    (message) => message.direction !== "inbound" && isWithinHours(message.timestamp, 24 * 7)
  ).length;

  const incidentTenantIds = new Set(
    data.tenantMetrics.filter((metric) => metric.webhookErrors7d > 0).map((metric) => metric.tenantId)
  );
  data.tenants.filter((tenant) => tenant.status === "at_risk").forEach((tenant) => incidentTenantIds.add(tenant.id));
  const openIncidents = incidentTenantIds.size;

  const platformStatus =
    openIncidents === 0
      ? {
          label: "Operacion estable",
          detail: "No se detectan fricciones criticas en el snapshot actual.",
          tone: "success" as const
        }
      : {
          label: "Operacion con seguimiento",
          detail: "Hay cuentas o canales que requieren revision prioritaria para no perder ritmo operativo.",
          tone: "warning" as const
        };

  const recentTenants = [...data.tenants]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((tenant) => {
      const health = calculateHealthScore(tenant.id);
      const metrics = data.tenantMetrics.find((item) => item.tenantId === tenant.id);
      const healthTone: HealthTone = health.status === "verde" ? "success" : health.status === "amarillo" ? "warning" : "danger";
      return {
        id: tenant.id,
        name: tenant.name,
        industry: tenant.industry,
        status: tenant.status,
        healthScore: health.score,
        healthTone,
        lastActivity: metrics?.lastActivityAt ? relativeLabel(metrics.lastActivityAt) : "Sin actividad reciente"
      };
    });

  const alerts: Array<{ id: string; title: string; detail: string; severity: AlertSeverity }> = [
    ...data.tenants
      .filter((tenant) => tenant.status === "trial")
      .slice(0, 2)
      .map((tenant) => ({
        id: `trial-${tenant.id}`,
        title: `${tenant.name} sigue en onboarding`,
        detail: "Conviene revisar activacion de canal, contenido inicial y checklist comercial.",
        severity: "warning" as const
      })),
    ...data.tenantMetrics
      .filter((metric) => metric.webhookErrors7d > 0)
      .slice(0, 2)
      .map((metric) => {
        const tenant = data.tenants.find((item) => item.id === metric.tenantId);
        return {
          id: `incident-${metric.tenantId}`,
          title: `${tenant?.name || "Tenant"} reporta errores en webhooks`,
          detail: `${metric.webhookErrors7d} errores en los ultimos 7 dias. Requiere auditoria de canal y observabilidad.`,
          severity: "danger" as const
        };
      })
  ];

  if (alerts.length === 0) {
    alerts.push({
      id: "ops-ok",
      title: "Sin alertas criticas activas",
      detail: "El panel queda listo para seguimiento comercial, demos y operacion del dia.",
      severity: "success"
    });
  }

  const recentActivity = buildRecentActivity(data);

  const onboardingQueue =
    data.tenants
      .filter((tenant) => tenant.status === "trial")
      .slice(0, 3)
      .map((tenant) => ({
        id: `onboarding-${tenant.id}`,
        title: tenant.name,
        subtitle: `Setup inicial para ${tenant.industry}. Checklist comercial y tecnico en progreso.`,
        meta: "En onboarding",
        tone: "warning" as const
      })) || [];

  const inboxQueue =
    data.conversations.slice(0, 3).map((conversation) => {
      const contact = data.contacts.find((item) => item.id === conversation.contactId);
      return {
        id: `inbox-${conversation.id}`,
        title: contact?.name || "Conversacion activa",
        subtitle: `Prioridad ${conversation.priority}. Ultimo contacto ${relativeLabel(conversation.lastMessageAt)}.`,
        meta: conversation.status === "open" ? "Abierta" : "Seguimiento",
        tone: conversation.priority === "hot" ? ("warning" as const) : ("muted" as const)
      };
    }) || [];

  const channels = data.tenants.slice(0, 3).map((tenant) => ({
    id: `channel-${tenant.id}`,
    title: tenant.name,
    subtitle: `Canal principal asociado al tenant ${tenant.id.slice(0, 14)}...`,
    meta: tenant.status === "cancelled" ? "Desactivado" : "Conectado",
    tone: tenant.status === "cancelled" ? ("warning" as const) : ("success" as const)
  }));

  return (
    <OpsDashboard
      platformStatus={platformStatus}
      kpis={[
        {
          label: "Clientes activos",
          value: String(activeClients),
          helper: "Cuentas operativas en seguimiento continuo y listas para expansion.",
          tone: "brand",
          icon: "clients"
        },
        {
          label: "Clientes en onboarding",
          value: String(onboardingClients),
          helper: "Implementaciones en activacion comercial, tecnica o de contenido.",
          tone: "warning",
          icon: "sparkles"
        },
        {
          label: "Canales conectados",
          value: String(connectedChannels),
          helper: "Canales asignados a tenants con capacidad operativa prevista.",
          tone: "success",
          icon: "channels"
        },
        {
          label: "Conversaciones del dia",
          value: String(conversationsToday),
          helper: "Interacciones recientes capturadas para monitoreo global.",
          tone: "brand",
          icon: "inbox"
        },
        {
          label: "Mensajes automatizados",
          value: String(automatedMessages),
          helper: "Mensajes salientes o eventos del bot registrados en la ultima ventana operativa.",
          tone: "success",
          icon: "bot"
        },
        {
          label: "Incidencias abiertas",
          value: String(openIncidents),
          helper: "Cuentas con errores de webhook o senales claras de seguimiento prioritario.",
          tone: openIncidents > 0 ? "danger" : "success",
          icon: "alerts"
        }
      ]}
      recentTenants={recentTenants}
      alerts={alerts}
      recentActivity={recentActivity}
      onboardingQueue={
        onboardingQueue.length > 0
          ? onboardingQueue
          : [
              {
                id: "onboarding-empty",
                title: "Sin onboardings pendientes",
                subtitle: "No hay cuentas en setup inicial dentro del dataset actual.",
                meta: "Libre",
                tone: "success"
              }
            ]
      }
      inboxQueue={
        inboxQueue.length > 0
          ? inboxQueue
          : [
              {
                id: "inbox-empty",
                title: "Sin conversaciones priorizadas",
                subtitle: "No hay conversaciones recientes en el snapshot actual.",
                meta: "Sin cola",
                tone: "muted"
              }
            ]
      }
      channels={channels}
      quickActions={[
        { label: "Abrir clientes", href: "/ops/tenants", helper: "Navegar al listado completo de tenants y salud." },
        { label: "Revisar onboarding", href: "/ops#onboarding", helper: "Ver cuentas en setup y proximos pasos." },
        { label: "Auditar incidencias", href: "/ops#incidents", helper: "Priorizar alertas y definir seguimiento." },
        { label: "Evaluar readiness de canales", href: "/ops#channels", helper: "Verificar activos conectados y checklist Cloud API." }
      ]}
    />
  );
}

function isWithinHours(dateString: string, hours: number) {
  const value = new Date(dateString).getTime();
  if (Number.isNaN(value)) return false;
  return Date.now() - value <= hours * 60 * 60 * 1000;
}

function relativeLabel(dateString: string) {
  const value = new Date(dateString).getTime();
  if (Number.isNaN(value)) return "Sin fecha";
  const diffMs = Date.now() - value;
  const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} d`;
}

function buildRecentActivity(data: ReturnType<typeof readSaasData>) {
  const tenantItems = data.tenants.slice(0, 3).map((tenant) => ({
    id: `tenant-${tenant.id}`,
    title: `${tenant.name} incorporado al pipeline`,
    detail: `Cuenta de ${tenant.industry} disponible para seguimiento desde Ops.`,
    timeLabel: relativeLabel(tenant.createdAt),
    tone: tenant.status === "trial" ? ("warning" as const) : ("success" as const)
  }));

  const messageItems = data.messages
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 3)
    .map((message) => {
      const conversation = data.conversations.find((item) => item.id === message.conversationId);
      const contact = conversation ? data.contacts.find((item) => item.id === conversation.contactId) : undefined;
      return {
        id: `message-${message.id}`,
        title: `${contact?.name || "Contacto"} en inbox`,
        detail: truncate(message.text, 92),
        timeLabel: relativeLabel(message.timestamp),
        tone: message.direction === "outbound" ? ("success" as const) : ("neutral" as const)
      };
    });

  const activity = [...messageItems, ...tenantItems]
    .sort((a, b) => timeWeight(a.timeLabel) - timeWeight(b.timeLabel))
    .slice(0, 5);

  if (activity.length > 0) return activity;

  return [
    {
      id: "activity-empty",
      title: "Sin actividad reciente",
      detail: "El dashboard seguira mostrando nuevos eventos a medida que haya conversaciones y operaciones.",
      timeLabel: "Ahora",
      tone: "neutral" as const
    }
  ];
}

function truncate(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function timeWeight(label: string) {
  const parts = label.split(" ");
  const amount = Number(parts[1]);
  const unit = parts[2];
  if (Number.isNaN(amount)) return Number.MAX_SAFE_INTEGER;
  if (unit === "min") return amount;
  if (unit === "h") return amount * 60;
  if (unit === "d") return amount * 60 * 24;
  return Number.MAX_SAFE_INTEGER;
}
