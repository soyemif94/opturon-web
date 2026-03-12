import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  Cable,
  CircleCheckBig,
  Clock3,
  Inbox,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/ui/cn";

type Kpi = {
  label: string;
  value: string;
  helper: string;
  tone: "brand" | "success" | "warning" | "danger";
  icon: "clients" | "sparkles" | "channels" | "inbox" | "bot" | "alerts";
};

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  timeLabel: string;
  tone: "neutral" | "success" | "warning";
};

type TenantPreview = {
  id: string;
  name: string;
  industry: string;
  status: string;
  healthScore: number;
  healthTone: "success" | "warning" | "danger";
  lastActivity: string;
};

type AlertItem = {
  id: string;
  title: string;
  detail: string;
  severity: "warning" | "danger" | "success";
};

type QueueItem = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  tone: "warning" | "success" | "muted";
};

type OpsDashboardProps = {
  platformStatus: {
    label: string;
    detail: string;
    tone: "success" | "warning" | "danger";
  };
  kpis: Kpi[];
  recentTenants: TenantPreview[];
  alerts: AlertItem[];
  recentActivity: ActivityItem[];
  onboardingQueue: QueueItem[];
  inboxQueue: QueueItem[];
  channels: QueueItem[];
  quickActions: Array<{ label: string; href: string; helper: string }>;
};

const kpiIcons = {
  clients: Building2,
  sparkles: Sparkles,
  channels: Cable,
  inbox: MessageSquareText,
  bot: Bot,
  alerts: AlertTriangle
};

export function OpsDashboard({
  platformStatus,
  kpis,
  recentTenants,
  alerts,
  recentActivity,
  onboardingQueue,
  inboxQueue,
  channels,
  quickActions
}: OpsDashboardProps) {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[30px] border border-[color:var(--border)] bg-[linear-gradient(135deg,rgba(192,80,0,0.16),rgba(19,19,19,0.96)_42%,rgba(13,13,13,0.98))]">
        <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1.5fr)_360px] lg:p-8">
          <div>
            <Badge variant={platformStatus.tone} className="mb-4">
              {platformStatus.label}
            </Badge>
            <h2 className="max-w-3xl text-3xl font-semibold tracking-tight lg:text-4xl">
              Panel de operaciones para gestionar clientes, canales y performance desde una sola vista.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted lg:text-base">
              {platformStatus.detail} Esta version de `/ops` ya queda lista para demo comercial y para uso interno de seguimiento operativo.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/ops/tenants"
                className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
              >
                Ver clientes
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#incidents"
                className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-white/5 px-4 py-3 text-sm font-medium text-text hover:bg-white/10"
              >
                Revisar incidencias
              </a>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Resumen ejecutivo</p>
            <div className="mt-5 space-y-4">
              <SummaryRow
                icon={<ShieldCheck className="h-4 w-4 text-emerald-300" />}
                title="Cobertura operativa"
                detail="Clientes, onboarding y canales bajo seguimiento diario."
              />
              <SummaryRow
                icon={<TrendingUp className="h-4 w-4 text-brandBright" />}
                title="Foco comercial"
                detail="Vista apta para demos, sales handoff y expansion de cuentas."
              />
              <SummaryRow
                icon={<Activity className="h-4 w-4 text-sky-300" />}
                title="Monitoreo continuo"
                detail="Metricas, conversaciones y alertas en el mismo flujo."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {kpis.map((item) => {
          const Icon = kpiIcons[item.icon];
          return (
            <Card
              key={item.label}
              className={cn(
                "overflow-hidden border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]",
                item.tone === "brand" && "shadow-[0_10px_40px_rgba(176,80,0,0.12)]",
                item.tone === "danger" && "shadow-[0_10px_40px_rgba(239,68,68,0.08)]"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardDescription className="text-[11px] uppercase tracking-[0.18em]">{item.label}</CardDescription>
                    <CardTitle className="mt-3 text-3xl">{item.value}</CardTitle>
                  </div>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                    <Icon className="h-5 w-5 text-brandBright" />
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted">{item.helper}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="muted">Ultimos clientes</Badge>}>
            <div>
              <CardTitle className="text-xl">Clientes recientes</CardTitle>
              <CardDescription>Cuenta, salud operativa y ultima actividad relevante.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-hidden rounded-2xl border border-[color:var(--border)]">
              <div className="grid grid-cols-[minmax(0,1.3fr)_160px_150px_120px] gap-4 border-b border-[color:var(--border)] bg-surface/70 px-4 py-3 text-xs uppercase tracking-[0.16em] text-muted">
                <span>Cliente</span>
                <span>Estado</span>
                <span>Health</span>
                <span>Actividad</span>
              </div>
              {recentTenants.map((tenant) => (
                <Link
                  key={tenant.id}
                  href={`/ops/tenants/${tenant.id}`}
                  className="grid grid-cols-[minmax(0,1.3fr)_160px_150px_120px] gap-4 border-b border-[color:var(--border)] px-4 py-4 transition-colors last:border-b-0 hover:bg-surface/60"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{tenant.name}</p>
                    <p className="mt-1 truncate text-sm text-muted">{tenant.industry}</p>
                  </div>
                  <div className="flex items-center">
                    <Badge variant={tenant.status === "active" ? "success" : tenant.status === "trial" ? "warning" : "danger"}>
                      {tenant.status}
                    </Badge>
                  </div>
                  <div className="flex items-center">
                    <Badge variant={tenant.healthTone}>{tenant.healthScore}/100</Badge>
                  </div>
                  <div className="flex items-center text-sm text-muted">{tenant.lastActivity}</div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card id="incidents" className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant={platformStatus.tone}>{platformStatus.label}</Badge>}>
            <div>
              <CardTitle className="text-xl">Alertas e incidencias</CardTitle>
              <CardDescription>Items que requieren seguimiento operativo o comercial.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {alerts.map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-[color:var(--border)] bg-surface/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{alert.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">{alert.detail}</p>
                  </div>
                  <Badge variant={alert.severity}>{alert.severity}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="outline">Timeline</Badge>}>
            <div>
              <CardTitle className="text-xl">Actividad reciente</CardTitle>
              <CardDescription>Senales recientes desde clientes, conversaciones y operaciones.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex gap-4 rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
                <div
                  className={cn(
                    "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
                    item.tone === "success" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
                    item.tone === "warning" && "border-amber-500/20 bg-amber-500/10 text-amber-300",
                    item.tone === "neutral" && "border-white/10 bg-white/5 text-brandBright"
                  )}
                >
                  {item.tone === "success" ? <CircleCheckBig className="h-4 w-4" /> : item.tone === "warning" ? <Clock3 className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{item.title}</p>
                    <span className="shrink-0 text-xs text-muted">{item.timeLabel}</span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted">{item.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="warning">Quick actions</Badge>}>
            <div>
              <CardTitle className="text-xl">Acciones rapidas</CardTitle>
              <CardDescription>Atajos pensados para operacion y demos comerciales.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="rounded-2xl border border-[color:var(--border)] bg-surface/70 p-4 transition-colors hover:bg-surface"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{action.label}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">{action.helper}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <OperationalPanel
          id="onboarding"
          title="Onboarding"
          description="Implementaciones activas y cuentas en setup."
          badge="Pipeline"
          items={onboardingQueue}
        />
        <OperationalPanel
          id="global-inbox"
          title="Inbox global"
          description="Conversaciones prioritarias y seguimiento de SLA."
          badge="Workspace"
          items={inboxQueue}
        />
        <OperationalPanel
          id="channels"
          title="Canales"
          description="Estado de WABA, phone numbers y readiness operativa."
          badge="Cloud API"
          items={channels}
        />
        <OperationalPanel
          id="metrics"
          title="Metricas"
          description="Indicadores utiles para expansion, soporte y performance."
          badge="Signals"
          items={[
            {
              id: "metric-1",
              title: "Clientes con health >= 70",
              subtitle: "Listos para expansion, up-sell o referencia comercial.",
              meta: recentTenants.filter((tenant) => tenant.healthScore >= 70).length + " cuentas",
              tone: "success"
            },
            {
              id: "metric-2",
              title: "Cuentas con seguimiento requerido",
              subtitle: "Incluye trials y estados con friccion operativa.",
              meta: alerts.length + " items",
              tone: "warning"
            },
            {
              id: "metric-3",
              title: "Cobertura de datos de demo",
              subtitle: "Panel listo para ventas, onboarding y trabajo interno.",
              meta: "Snapshot unificado",
              tone: "muted"
            }
          ]}
        />
      </section>

      <section id="settings">
        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="muted">Checklist</Badge>}>
            <div>
              <CardTitle className="text-xl">Configuracion operativa</CardTitle>
              <CardDescription>Referencias de lo que deberia quedar conectado en cada cuenta cliente.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              "Canal WhatsApp asociado a clinicId",
              "Token y phone number persistidos por canal",
              "Webhooks y WABA verificados",
              "Plantillas, FAQ y catalogo listos"
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
                <p className="text-sm leading-6 text-muted">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function SummaryRow({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/15">
          {icon}
        </span>
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function OperationalPanel({
  id,
  title,
  description,
  badge,
  items
}: {
  id: string;
  title: string;
  description: string;
  badge: string;
  items: QueueItem[];
}) {
  return (
    <Card id={id} className="border-white/6 bg-card/90">
      <CardHeader action={<Badge variant="outline">{badge}</Badge>}>
        <div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{item.subtitle}</p>
              </div>
              <Badge variant={item.tone === "success" ? "success" : item.tone === "warning" ? "warning" : "muted"}>{item.meta}</Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
