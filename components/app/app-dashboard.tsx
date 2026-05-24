import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ContactRound,
  LayoutGrid,
  MessageSquareText,
  Package,
  PhoneCall,
  PlugZap,
  Settings2,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  UserRoundPlus,
  WalletCards,
  Zap
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

type SurfaceTone = "green" | "violet" | "orange" | "blue" | "amber" | "red";

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
  const conversationsStat = stats.find((item) => item.icon === "conversations") || stats[0];
  const contactsStat = stats.find((item) => item.icon === "contacts") || stats[1];
  const botStat = stats.find((item) => item.icon === "bot") || stats[2];
  const responseStat = stats.find((item) => item.icon === "response") || stats[3];
  const primaryChannelLabel = hasWhatsAppChannel ? "Conectado" : channelStatus.label;
  const portalStatus = hasWhatsAppChannel ? "Operacion lista" : "Configurar canal";
  const compactDateLabel = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short"
  }).format(new Date());

  const statusCards = [
    {
      key: "whatsapp",
      eyebrow: "WhatsApp",
      value: primaryChannelLabel,
      subtitle: hasWhatsAppChannel ? "Canal operativo" : channelStatus.detail,
      helper: channelStatus.detail,
      tone: hasWhatsAppChannel ? ("green" as const) : channelStatus.tone === "danger" ? ("red" as const) : ("amber" as const),
      icon: <PhoneCall className="h-5 w-5" />,
      foot: hasWhatsAppChannel ? "Operacion activa" : "Requiere revision"
    },
    {
      key: "bot",
      eyebrow: "Asistente (Bot)",
      value: hasWhatsAppChannel ? "Atendiendo" : "En espera",
      subtitle: hasWhatsAppChannel ? "Operacion activa" : "Listo para activarse",
      helper: botStat?.helper || "Mensajes automatizados visibles para el espacio.",
      tone: "violet" as const,
      icon: <Bot className="h-5 w-5" />,
      foot: `${botStat?.value || "0"} automatizaciones visibles`
    },
    {
      key: "conversations",
      eyebrow: "Conversaciones hoy",
      value: conversationsStat?.value || "0",
      subtitle: "Actividad comercial",
      helper: conversationsStat?.helper || "Conversaciones visibles para seguimiento.",
      tone: "orange" as const,
      icon: <MessageSquareText className="h-5 w-5" />,
      foot: "Seguimiento centralizado"
    },
    {
      key: "contacts",
      eyebrow: "Contactos nuevos",
      value: contactsStat?.value || String(contacts.length),
      subtitle: "Base en movimiento",
      helper: contactsStat?.helper || "Contactos recientes dentro del CRM.",
      tone: "blue" as const,
      icon: <UserRoundPlus className="h-5 w-5" />,
      foot: `${contacts.length} visibles en el CRM`
    },
    {
      key: "response",
      eyebrow: "Tiempo de respuesta",
      value: responseStat?.value || "-",
      subtitle: "Ritmo del equipo",
      helper: responseStat?.helper || "Promedio de respuesta del espacio.",
      tone: "green" as const,
      icon: <Clock3 className="h-5 w-5" />,
      foot: "Salud operacional"
    },
    {
      key: "portal",
      eyebrow: "Estado del espacio",
      value: portalStatus,
      subtitle: tenantIndustry,
      helper: "Inbox, agenda, contactos y automatizaciones dentro del mismo frente operativo.",
      tone: "amber" as const,
      icon: <Sparkles className="h-5 w-5" />,
      foot: hasWhatsAppChannel ? "Portal activo" : "Portal en setup"
    }
  ];

  const priorityItems = [
    {
      id: "priority-channel",
      title: hasWhatsAppChannel ? "Canal listo para atender" : "WhatsApp pendiente de activacion",
      detail: hasWhatsAppChannel ? "Tu canal principal ya esta conectado y listo para centralizar atencion." : channelStatus.detail,
      cta: hasWhatsAppChannel ? "Ver integraciones" : "Conectar ahora",
      href: "/app/integrations",
      tone: hasWhatsAppChannel ? ("green" as const) : channelStatus.tone === "danger" ? ("red" as const) : ("amber" as const),
      icon: <PlugZap className="h-4 w-4" />
    },
    {
      id: "priority-conversations",
      title: "Conversaciones que piden seguimiento",
      detail: `${conversationsStat?.value || "0"} conversaciones visibles para el equipo comercial hoy.`,
      cta: "Abrir inbox",
      href: "/app/inbox",
      tone: "orange" as const,
      icon: <MessageSquareText className="h-4 w-4" />
    },
    {
      id: "priority-contacts",
      title: "Contactos nuevos por ordenar",
      detail: `${contactsStat?.value || contacts.length} contactos listos para revisar, etiquetar o continuar.`,
      cta: "Gestionar contactos",
      href: "/app/contacts",
      tone: "blue" as const,
      icon: <ContactRound className="h-4 w-4" />
    },
    {
      id: "priority-response",
      title: "Respuesta del equipo en foco",
      detail: `Tiempo medio actual: ${responseStat?.value || "-"}. Revisa el ritmo y destraba atencion si hace falta.`,
      cta: "Ver metricas",
      href: "/app/metrics",
      tone: "violet" as const,
      icon: <Activity className="h-4 w-4" />
    }
  ];

  const operationalLinks = quickLinks.map((item) => ({
    ...item,
    icon: quickLinkMeta(item.label).icon,
    tone: quickLinkMeta(item.label).tone
  }));

  const performanceCards = [
    {
      id: "perf-conversations",
      label: "Conversaciones hoy",
      value: conversationsStat?.value || "0",
      helper: "Lectura comercial del dia",
      tone: "green" as const
    },
    {
      id: "perf-contacts",
      label: "Nuevos contactos",
      value: contactsStat?.value || String(contacts.length),
      helper: "Base nueva del espacio",
      tone: "violet" as const
    },
    {
      id: "perf-bot",
      label: "Mensajes del bot",
      value: botStat?.value || "0",
      helper: "Automatizacion visible",
      tone: "orange" as const
    },
    {
      id: "perf-response",
      label: "Tiempo de respuesta",
      value: responseStat?.value || "-",
      helper: "Ritmo medio de atencion",
      tone: "blue" as const
    },
    {
      id: "perf-channel",
      label: "Estado del canal",
      value: hasWhatsAppChannel ? "Saludable" : "Pendiente",
      helper: hasWhatsAppChannel ? "Canal operativo" : "Requiere activacion",
      tone: "green" as const
    },
    {
      id: "perf-space",
      label: "Espacio",
      value: hasWhatsAppChannel ? "Activo" : "En setup",
      helper: "Vision general del portal",
      tone: "violet" as const
    }
  ];

  return (
    <div className="space-y-6">
      {demoMode ? (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          Modo demo activo. Esta vista esta preparada para demos comerciales y walkthroughs de producto.
        </div>
      ) : null}

      <section className="rounded-[30px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-5 py-5 shadow-[var(--card-shadow)] xl:px-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Portal del cliente</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-text">Hola {tenantName} 👋</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Este es el resumen operativo de hoy. Tu equipo puede ver rapido que esta pasando, que necesita atencion y que accion conviene tomar.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className="flex flex-wrap gap-2">
              <Badge variant="muted">Espacio del cliente</Badge>
              <Badge variant={hasWhatsAppChannel ? "success" : "warning"}>Portal activo</Badge>
              <Badge variant={channelStatus.tone}>{hasWhatsAppChannel ? "Canal conectado" : channelStatus.label}</Badge>
              <Badge variant={hasWhatsAppChannel ? "success" : "outline"}>{portalStatus}</Badge>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-surface/70 px-4 py-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-brandBright">
                <LayoutGrid className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Espacio activo</p>
                <p className="mt-1 text-sm font-medium text-text">{tenantIndustry}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {statusCards.map((item) => (
          <StatusCard
            key={item.key}
            eyebrow={item.eyebrow}
            value={item.value}
            subtitle={item.subtitle}
            helper={item.helper}
            foot={item.foot}
            tone={item.tone}
            icon={item.icon}
          />
        ))}
      </section>

      {!hasWhatsAppChannel ? (
        <section>
          <Card className="overflow-hidden border-brand/25 bg-[linear-gradient(135deg,rgba(192,80,0,0.18),rgba(24,24,24,0.96))] shadow-[0_18px_60px_rgba(176,80,0,0.14)]">
            <CardContent className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-brand/30 bg-brand/15 text-brandBright">
                    <PlugZap className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">Canal principal</p>
                    <h3 className="mt-1 text-xl font-semibold">Activa tu WhatsApp para centralizar conversaciones reales</h3>
                  </div>
                </div>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">{channelStatus.detail}</p>
              </div>

              <Link
                href="/app/integrations"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
              >
                Conectar WhatsApp
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader>
            <div>
              <CardTitle className="text-[28px] leading-none tracking-tight">Prioridades del dia</CardTitle>
              <CardDescription className="mt-2 text-sm">Enfocate en lo que necesita atencion ahora.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {priorityItems.map((item) => (
              <PriorityRow key={item.id} title={item.title} detail={item.detail} cta={item.cta} href={item.href} tone={item.tone} icon={item.icon} />
            ))}

            <Link href="/app/metrics" className="inline-flex items-center gap-2 px-1 pt-2 text-sm font-medium text-brandBright hover:text-brand">
              Ver todas las prioridades
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="outline">En vivo</Badge>}>
            <div>
              <CardTitle className="text-[28px] leading-none tracking-tight">Actividad reciente</CardTitle>
              <CardDescription className="mt-2 text-sm">Lo ultimo que paso en tu negocio.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {recentActivity.map((item) => (
              <TimelineItem key={item.id} item={item} />
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-5 rounded-[30px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-5 shadow-[var(--card-shadow)] xl:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-[30px] font-semibold tracking-tight">Centro operativo</h3>
            <p className="mt-2 text-sm text-muted">Accesos rapidos a las herramientas que usas todos los dias.</p>
          </div>
          <Badge variant="muted">Accion rapida</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {operationalLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="group rounded-[24px] border border-[color:var(--border)] bg-card/75 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/35 hover:bg-card"
            >
              <div className="flex items-start justify-between gap-3">
                <span className={cn("inline-flex h-12 w-12 items-center justify-center rounded-2xl border", toneIconClass(item.tone))}>
                  {item.icon}
                </span>
                <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-4 text-xl font-medium text-text">{item.label}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{item.helper}</p>
            </Link>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[24px] border border-dashed border-brand/25 bg-[linear-gradient(135deg,rgba(192,80,0,0.08),rgba(255,255,255,0.02))] px-4 py-4 text-sm text-muted">
            Personaliza tus accesos y manten la operacion del equipo alineada desde un solo lugar.
          </div>

          <div className="rounded-[24px] border border-[color:var(--border)] bg-card/75 p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brandBright">
                <ContactRound className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-text">Contactos recientes</p>
                <p className="text-xs text-muted">Lectura rapida del CRM visible</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {contacts.slice(0, 3).map((contact) => (
                <div key={contact.id} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">{contact.name}</p>
                      <p className="mt-1 text-xs text-muted">{contact.phone}</p>
                    </div>
                    <span className="text-xs text-muted">{contact.lastInteraction}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5 rounded-[30px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-5 shadow-[var(--card-shadow)] xl:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-[30px] font-semibold tracking-tight">Rendimiento del negocio</h3>
            <p className="mt-2 text-sm text-muted">Metricas clave para tomar mejores decisiones.</p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-surface/75 px-4 py-2.5 text-sm text-muted">
            <CalendarClock className="h-4 w-4" />
            Hoy, {compactDateLabel}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {performanceCards.map((item) => (
            <PerformanceCard key={item.id} label={item.label} value={item.value} helper={item.helper} tone={item.tone} />
          ))}
        </div>

        <div className="flex flex-col gap-4 rounded-[26px] border border-[color:var(--border)] bg-card/80 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brandBright">
              <Zap className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold tracking-tight text-text">Opturon trabaja por vos todos los dias</p>
              <p className="mt-1 text-sm text-muted">
                Tu asistente esta atendiendo clientes, calificando oportunidades y ayudando a vender mas.
              </p>
            </div>
          </div>

          <Link
            href="/app/automations"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--border)] bg-surface px-4 py-3 text-sm font-medium text-text hover:bg-surface/80"
          >
            Ver automatizaciones
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatusCard({
  eyebrow,
  value,
  subtitle,
  helper,
  foot,
  tone,
  icon
}: {
  eyebrow: string;
  value: string;
  subtitle: string;
  helper: string;
  foot: string;
  tone: SurfaceTone;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <span className={cn("inline-flex h-12 w-12 items-center justify-center rounded-2xl border", toneIconClass(tone))}>{icon}</span>
          <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", toneDotClass(tone))} />
        </div>
        <p className="mt-5 text-sm text-muted">{eyebrow}</p>
        <p className="mt-2 text-[2rem] font-semibold leading-none tracking-tight text-text">{value}</p>
        <p className="mt-3 text-base font-medium text-text">{subtitle}</p>
        <p className="mt-2 min-h-[44px] text-sm leading-6 text-muted">{helper}</p>
        <p className={cn("mt-4 text-sm font-medium", toneTextClass(tone))}>{foot}</p>
      </CardContent>
    </Card>
  );
}

function PriorityRow({
  title,
  detail,
  cta,
  href,
  tone,
  icon
}: {
  title: string;
  detail: string;
  cta: string;
  href: string;
  tone: SurfaceTone;
  icon: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-[22px] border p-4", tonePanelClass(tone))}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border", toneIconClass(tone))}>{icon}</span>
          <div className="min-w-0">
            <p className="text-base font-medium text-text">{title}</p>
            <p className="mt-1 text-sm leading-6 text-muted">{detail}</p>
          </div>
        </div>

        <Link
          href={href}
          className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/6 px-4 py-2.5 text-sm font-medium text-text transition-colors hover:bg-white/10"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}

function TimelineItem({ item }: { item: ActivityItem }) {
  const meta =
    item.tone === "success"
      ? {
          icon: <CheckCircle2 className="h-4 w-4" />,
          dot: "bg-emerald-400",
          iconClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
        }
      : item.tone === "warning"
        ? {
            icon: <Bot className="h-4 w-4" />,
            dot: "bg-amber-300",
            iconClass: "border-amber-500/20 bg-amber-500/10 text-amber-300"
          }
        : {
            icon: <MessageSquareText className="h-4 w-4" />,
            dot: "bg-sky-400",
            iconClass: "border-sky-500/20 bg-sky-500/10 text-sky-300"
          };

  return (
    <div className="rounded-[22px] border border-[color:var(--border)] bg-surface/65 px-4 py-4">
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-2xl border", meta.iconClass)}>{meta.icon}</span>
          <span className="mt-2 h-full w-px bg-white/6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-medium text-text">{item.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{item.detail}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-muted">
              <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
              {item.timeLabel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PerformanceCard({
  label,
  value,
  helper,
  tone
}: {
  label: string;
  value: string;
  helper: string;
  tone: SurfaceTone;
}) {
  return (
    <div className={cn("rounded-[24px] border p-4", tonePerformanceClass(tone))}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-3 text-4xl font-semibold leading-none tracking-tight text-text">{value}</p>
      <p className="mt-3 text-sm text-muted">{helper}</p>
      <div className="mt-5">
        <Sparkline tone={tone} seed={`${label}:${value}`} />
      </div>
    </div>
  );
}

function Sparkline({ tone, seed }: { tone: SurfaceTone; seed: string }) {
  const bars = buildSparkline(seed);
  return (
    <div className="flex h-10 items-end gap-1">
      {bars.map((value, index) => (
        <span
          key={`${seed}-${index}`}
          className={cn("block w-full rounded-full", toneSparkClass(tone))}
          style={{ height: `${value}%` }}
        />
      ))}
    </div>
  );
}

function buildSparkline(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 9973;
  }

  return Array.from({ length: 10 }, (_, index) => {
    hash = (hash * 37 + 17 + index) % 9973;
    return 22 + (hash % 58);
  });
}

function quickLinkMeta(label: string) {
  const normalized = label.toLowerCase();

  if (normalized.includes("inbox")) return { icon: <MessageSquareText className="h-5 w-5" />, tone: "orange" as SurfaceTone };
  if (normalized.includes("agenda")) return { icon: <CalendarClock className="h-5 w-5" />, tone: "orange" as SurfaceTone };
  if (normalized.includes("contact")) return { icon: <ContactRound className="h-5 w-5" />, tone: "orange" as SurfaceTone };
  if (normalized.includes("metrica")) return { icon: <TrendingUp className="h-5 w-5" />, tone: "orange" as SurfaceTone };
  if (normalized.includes("whatsapp")) return { icon: <PlugZap className="h-5 w-5" />, tone: "orange" as SurfaceTone };
  if (normalized.includes("venta")) return { icon: <WalletCards className="h-5 w-5" />, tone: "orange" as SurfaceTone };
  if (normalized.includes("catalog")) return { icon: <Package className="h-5 w-5" />, tone: "orange" as SurfaceTone };
  if (normalized.includes("ops")) return { icon: <Shield className="h-5 w-5" />, tone: "orange" as SurfaceTone };
  if (normalized.includes("automat")) return { icon: <Zap className="h-5 w-5" />, tone: "orange" as SurfaceTone };
  if (normalized.includes("fidel")) return { icon: <Star className="h-5 w-5" />, tone: "orange" as SurfaceTone };

  return { icon: <Settings2 className="h-5 w-5" />, tone: "orange" as SurfaceTone };
}

function toneIconClass(tone: SurfaceTone) {
  if (tone === "green") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  if (tone === "violet") return "border-violet-500/20 bg-violet-500/10 text-violet-300";
  if (tone === "blue") return "border-sky-500/20 bg-sky-500/10 text-sky-300";
  if (tone === "amber") return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  if (tone === "red") return "border-rose-500/20 bg-rose-500/10 text-rose-300";
  return "border-brand/25 bg-brand/10 text-brandBright";
}

function toneDotClass(tone: SurfaceTone) {
  if (tone === "green") return "bg-emerald-400";
  if (tone === "violet") return "bg-violet-400";
  if (tone === "blue") return "bg-sky-400";
  if (tone === "amber") return "bg-amber-300";
  if (tone === "red") return "bg-rose-400";
  return "bg-brandBright";
}

function toneTextClass(tone: SurfaceTone) {
  if (tone === "green") return "text-emerald-300";
  if (tone === "violet") return "text-violet-300";
  if (tone === "blue") return "text-sky-300";
  if (tone === "amber") return "text-amber-300";
  if (tone === "red") return "text-rose-300";
  return "text-brandBright";
}

function tonePanelClass(tone: SurfaceTone) {
  if (tone === "green") return "border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.10),rgba(255,255,255,0.02))]";
  if (tone === "violet") return "border-violet-500/20 bg-[linear-gradient(135deg,rgba(139,92,246,0.10),rgba(255,255,255,0.02))]";
  if (tone === "blue") return "border-sky-500/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.10),rgba(255,255,255,0.02))]";
  if (tone === "amber") return "border-amber-500/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.10),rgba(255,255,255,0.02))]";
  if (tone === "red") return "border-rose-500/20 bg-[linear-gradient(135deg,rgba(244,63,94,0.10),rgba(255,255,255,0.02))]";
  return "border-brand/25 bg-[linear-gradient(135deg,rgba(192,80,0,0.10),rgba(255,255,255,0.02))]";
}

function tonePerformanceClass(tone: SurfaceTone) {
  if (tone === "green") return "border-emerald-500/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(255,255,255,0.02))]";
  if (tone === "violet") return "border-violet-500/20 bg-[linear-gradient(180deg,rgba(139,92,246,0.08),rgba(255,255,255,0.02))]";
  if (tone === "blue") return "border-sky-500/20 bg-[linear-gradient(180deg,rgba(14,165,233,0.08),rgba(255,255,255,0.02))]";
  if (tone === "amber") return "border-amber-500/20 bg-[linear-gradient(180deg,rgba(245,158,11,0.08),rgba(255,255,255,0.02))]";
  if (tone === "red") return "border-rose-500/20 bg-[linear-gradient(180deg,rgba(244,63,94,0.08),rgba(255,255,255,0.02))]";
  return "border-brand/25 bg-[linear-gradient(180deg,rgba(192,80,0,0.08),rgba(255,255,255,0.02))]";
}

function toneSparkClass(tone: SurfaceTone) {
  if (tone === "green") return "bg-emerald-400/90";
  if (tone === "violet") return "bg-violet-400/90";
  if (tone === "blue") return "bg-sky-400/90";
  if (tone === "amber") return "bg-amber-300/90";
  if (tone === "red") return "bg-rose-400/90";
  return "bg-brandBright/90";
}
