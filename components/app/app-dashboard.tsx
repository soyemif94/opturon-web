import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bot,
  Cable,
  CalendarClock,
  CircleCheckBig,
  Clock3,
  ContactRound,
  MessageSquareText,
  PlugZap,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/ui/cn";

type DashboardStat = {
  label: string;
  value: string;
  helper: string;
  icon: "conversations" | "contacts" | "bot" | "response";
};

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  timeLabel: string;
  tone: "neutral" | "success" | "warning";
};

type ContactItem = {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  lastInteraction: string;
};

export function AppDashboard({
  tenantName,
  tenantIndustry,
  demoMode,
  hasWhatsAppChannel,
  stats,
  channelStatus,
  recentActivity,
  contacts,
  quickLinks
}: {
  tenantName: string;
  tenantIndustry: string;
  demoMode: boolean;
  hasWhatsAppChannel: boolean;
  stats: DashboardStat[];
  channelStatus: { label: string; detail: string; tone: "success" | "warning" | "danger" };
  recentActivity: ActivityItem[];
  contacts: ContactItem[];
  quickLinks: Array<{ label: string; href: string; helper: string }>;
}) {
  return (
    <div className="space-y-8">
      {demoMode ? (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          Modo demo activo. Esta vista esta preparada para demos comerciales y walkthroughs de producto.
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[30px] border border-[color:var(--border)] bg-[linear-gradient(135deg,rgba(192,80,0,0.16),rgba(19,19,19,0.96)_42%,rgba(13,13,13,0.98))]">
        <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.5fr)_360px] lg:gap-8 lg:p-8">
          <div>
            <Badge variant="warning" className="mb-4 border-brand/30 bg-brand/10 text-brandBright">
              Portal cliente
            </Badge>
            <h2 className="max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
              Todo lo importante de tu negocio, tus conversaciones y tu canal WhatsApp en un solo lugar.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted lg:mt-4 lg:text-base lg:leading-7">
              {tenantName} puede seguir conversaciones, ver metricas, ordenar contactos y preparar la conexion de su WhatsApp sin salir del portal.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge variant="muted">{tenantIndustry}</Badge>
              <Badge variant={channelStatus.tone}>{channelStatus.label}</Badge>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-4 backdrop-blur sm:p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Estado del portal</p>
            <div className="mt-5 space-y-4">
              <SummaryRow
                icon={<MessageSquareText className="h-4 w-4 text-brandBright" />}
                title="Inbox centralizado"
                detail="Lista de conversaciones, panel de chat y ficha del contacto."
              />
              <SummaryRow
                icon={<CalendarClock className="h-4 w-4 text-sky-300" />}
                title="Agenda nativa"
                detail="Seguimientos, disponibilidad y base de turnos dentro de Opturon."
              />
              <SummaryRow
                icon={<Bot className="h-4 w-4 text-emerald-300" />}
                title="Bot y automatizaciones"
                detail="Base lista para evolucionar a flujos, respuestas y seguimiento."
              />
              <SummaryRow
                icon={<PlugZap className="h-4 w-4 text-sky-300" />}
                title="WhatsApp y CRM"
                detail="WhatsApp como canal principal hoy y CRM externo como siguiente capa de integracion."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon =
            item.icon === "conversations"
              ? MessageSquareText
              : item.icon === "contacts"
                ? ContactRound
                : item.icon === "bot"
                  ? Bot
                  : Clock3;

          return (
            <Card key={item.label} className="border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardDescription className="text-[11px] uppercase tracking-[0.18em]">{item.label}</CardDescription>
                    <CardTitle className="mt-3 text-2xl sm:text-3xl">{item.value}</CardTitle>
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

      {!hasWhatsAppChannel ? (
        <section>
          <Card className="overflow-hidden border-brand/25 bg-[linear-gradient(135deg,rgba(192,80,0,0.20),rgba(24,24,24,0.96))] shadow-[0_18px_60px_rgba(176,80,0,0.16)]">
            <CardContent className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-5 lg:p-8">
              <div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-brand/30 bg-brand/15 text-brandBright">
                    <Cable className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">WhatsApp channel</p>
                    <h3 className="mt-1 text-xl font-semibold sm:text-2xl">
                      {channelStatus.tone === "danger" ? "Revisa la conexion de tu WhatsApp" : "Conecta tu WhatsApp en 2 minutos"}
                    </h3>
                  </div>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
                  {channelStatus.detail}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/app/integrations"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-medium text-white transition-transform hover:-translate-y-0.5 sm:w-auto"
                >
                  {channelStatus.tone === "danger" ? "Revisar conexion" : "Conectar WhatsApp"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/app/integrations"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--border)] bg-white/5 px-5 py-3 text-sm font-medium text-text hover:bg-white/10 sm:w-auto"
                >
                  Ir a integraciones
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant={channelStatus.tone}>{channelStatus.label}</Badge>}>
            <div>
              <CardTitle className="text-xl">Actividad reciente</CardTitle>
              <CardDescription>Eventos de conversaciones, bot y operacion del canal.</CardDescription>
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
          <CardHeader action={<Badge variant="outline">Quick access</Badge>}>
            <div>
              <CardTitle className="text-xl">Accesos rapidos</CardTitle>
              <CardDescription>Atajos para operar conversaciones, agenda y foco comercial.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0">
            {quickLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-2xl border border-[color:var(--border)] bg-surface/70 p-4 transition-colors hover:bg-surface"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">{item.helper}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="muted">CRM light</Badge>}>
            <div>
              <CardTitle className="text-xl">Contactos recientes</CardTitle>
              <CardDescription>Vista simple de nombres, telefono, tags y ultima interaccion.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="hidden overflow-hidden rounded-2xl border border-[color:var(--border)] md:block">
              <div className="grid grid-cols-[minmax(0,1.2fr)_180px_180px_140px] gap-4 border-b border-[color:var(--border)] bg-surface/70 px-4 py-3 text-xs uppercase tracking-[0.16em] text-muted">
                <span>Contacto</span>
                <span>Telefono</span>
                <span>Tags</span>
                <span>Ultima interaccion</span>
              </div>
              {contacts.map((contact) => (
                <div key={contact.id} className="grid grid-cols-[minmax(0,1.2fr)_180px_180px_140px] gap-4 border-b border-[color:var(--border)] px-4 py-4 last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{contact.name}</p>
                  </div>
                  <div className="flex items-center text-sm text-muted">{contact.phone}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {contact.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="muted">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center text-sm text-muted">{contact.lastInteraction}</div>
                </div>
              ))}
            </div>
            <div className="space-y-3 md:hidden">
              {contacts.map((contact) => (
                <div key={contact.id} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
                  <p className="font-medium">{contact.name}</p>
                  <p className="mt-1 text-sm text-muted">{contact.phone}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {contact.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="muted">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted">Ultima interaccion: {contact.lastInteraction}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="warning">Inbox ready</Badge>}>
            <div>
              <CardTitle className="text-xl">Base del inbox cliente</CardTitle>
              <CardDescription>La estructura ya contempla lista, chat y perfil del contacto.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {[
              {
                icon: <MessageSquareText className="h-4 w-4 text-brandBright" />,
                title: "Lista de conversaciones",
                detail: "Panel lateral para filtrar, buscar y priorizar contactos."
              },
              {
                icon: <Sparkles className="h-4 w-4 text-emerald-300" />,
                title: "Panel de chat",
                detail: "Historial, cuadro de respuesta y sugerencias del bot listas para evolucionar."
              },
              {
                icon: <CalendarClock className="h-4 w-4 text-sky-300" />,
                title: "Perfil del contacto",
                detail: "Contexto comercial, notas, tareas y seguimiento del prospecto."
              }
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                    {item.icon}
                  </span>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">{item.detail}</p>
                  </div>
                </div>
              </div>
            ))}
            <Link
              href="/app/inbox"
              className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-surface px-4 py-3 text-sm font-medium hover:bg-surface/80"
            >
              Ir al inbox
              <ArrowRight className="h-4 w-4" />
            </Link>
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
