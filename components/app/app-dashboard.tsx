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

type PerformanceMetric = {
  id: string;
  label: string;
  value: string;
  changeLabel: string;
  changeTone: "positive" | "negative" | "neutral";
  tone: SurfaceTone;
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
  const conversationsStat = stats.find((item) => item.icon === "conversations") || stats[0];
  const contactsStat = stats.find((item) => item.icon === "contacts") || stats[1];
  const botStat = stats.find((item) => item.icon === "bot") || stats[2];
  const responseStat = stats.find((item) => item.icon === "response") || stats[3];

  const portalStatus = hasWhatsAppChannel ? "Operacion lista" : "Configurar canal";
  const compactDateLabel = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short"
  }).format(new Date());

  const statusCards = [
    {
      key: "whatsapp",
      eyebrow: "WhatsApp",
      value: hasWhatsAppChannel ? "Conectado" : channelStatus.label,
      subtitle: hasWhatsAppChannel ? "Canal operativo" : "Pendiente de activacion",
      helper: hasWhatsAppChannel ? "Centralizado en Opturon" : channelStatus.detail,
      foot: hasWhatsAppChannel ? "Operacion activa" : "Requiere revision",
      tone: hasWhatsAppChannel ? ("green" as const) : channelStatus.tone === "danger" ? ("red" as const) : ("amber" as const),
      icon: <PhoneCall className="h-5 w-5" />,
      emphasis: "primary" as const
    },
    {
      key: "bot",
      eyebrow: "Asistente (Bot)",
      value: hasWhatsAppChannel ? "Atendiendo" : "En espera",
      subtitle: hasWhatsAppChannel ? "Operacion activa" : "Listo para activarse",
      helper: hasWhatsAppChannel ? "Respuestas y seguimiento" : "Visible en tu espacio",
      foot: `${botStat?.value || "0"} automatizaciones visibles`,
      tone: "violet" as const,
      icon: <Bot className="h-5 w-5" />,
      emphasis: "primary" as const
    },
    {
      key: "conversations",
      eyebrow: "Conversaciones activas",
      value: conversationsStat?.value || "0",
      subtitle: "Seguimiento comercial",
      helper: "Conversaciones del dia en la bandeja",
      foot: "Revision prioritaria",
      tone: "orange" as const,
      icon: <MessageSquareText className="h-5 w-5" />,
      emphasis: "secondary" as const
    },
    {
      key: "contacts",
      eyebrow: "Leads sin asignar",
      value: contactsStat?.value || String(contacts.length),
      subtitle: "Base en movimiento",
      helper: "Contactos recientes para ordenar",
      foot: "Asignacion pendiente",
      tone: "blue" as const,
      icon: <UserRoundPlus className="h-5 w-5" />,
      emphasis: "secondary" as const
    },
    {
      key: "response",
      eyebrow: "Proximo seguimiento",
      value: responseStat?.value || "Hoy, 15:30",
      subtitle: "Ritmo del equipo",
      helper: "Tiempo medio de atencion",
      foot: "Control operacional",
      tone: "green" as const,
      icon: <Clock3 className="h-5 w-5" />,
      emphasis: "support" as const
    },
    {
      key: "portal",
      eyebrow: "Estado del espacio",
      value: portalStatus,
      subtitle: tenantIndustry,
      helper: "Portal, canal y modulos listos",
      foot: hasWhatsAppChannel ? "Portal activo" : "Espacio en setup",
      tone: "amber" as const,
      icon: <Sparkles className="h-5 w-5" />,
      emphasis: "support" as const
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
    tone: quickLinkMeta(item.label).tone,
    shortHelper: shortenQuickLink(item.helper)
  }));

  const performanceMetrics: PerformanceMetric[] = [
    {
      id: "perf-conversations",
      label: "Conversaciones hoy",
      value: conversationsStat?.value || "23",
      changeLabel: "↑ 18% vs ayer",
      changeTone: "positive",
      tone: "green"
    },
    {
      id: "perf-contacts",
      label: "Nuevos contactos",
      value: contactsStat?.value || "12",
      changeLabel: "↑ 9% vs ayer",
      changeTone: "positive",
      tone: "violet"
    },
    {
      id: "perf-sales",
      label: "Ventas del dia",
      value: "$ 61.818",
      changeLabel: "↑ 14% vs ayer",
      changeTone: "positive",
      tone: "orange"
    },
    {
      id: "perf-response",
      label: "Tiempo de respuesta",
      value: responseStat?.value || "2 min",
      changeLabel: "↓ 32% vs ayer",
      changeTone: "negative",
      tone: "blue"
    },
    {
      id: "perf-loyalty",
      label: "Clientes fidelizados",
      value: "47",
      changeLabel: "↑ 6% vs ayer",
      changeTone: "positive",
      tone: "green"
    },
    {
      id: "perf-bot",
      label: "Estado del bot",
      value: hasWhatsAppChannel ? "Saludable" : "En revision",
      changeLabel: hasWhatsAppChannel ? "100% operativo" : "Listo para activarse",
      changeTone: "neutral",
      tone: "violet"
    }
  ];

  return (
    <div className="space-y-5">
      {demoMode ? (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          Modo demo activo. Esta vista esta preparada para demos comerciales y walkthroughs de producto.
        </div>
      ) : null}

      <section className="rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))] px-5 py-4 shadow-[var(--card-shadow)] xl:px-6 xl:py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Portal del cliente</p>
            <h2 className="mt-1.5 text-[2rem] font-semibold tracking-tight text-text">Hola {tenantName} 👋</h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">
              Este es el resumen operativo de hoy. Tu equipo puede ver rapido que esta pasando y que accion conviene tomar.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2.5 lg:items-end">
            <div className="flex flex-wrap gap-2">
              <Badge variant="muted">Espacio del cliente</Badge>
              <Badge variant={hasWhatsAppChannel ? "success" : "warning"}>Portal activo</Badge>
              <Badge variant={channelStatus.tone}>{hasWhatsAppChannel ? "Canal conectado" : channelStatus.label}</Badge>
              <Badge variant={hasWhatsAppChannel ? "success" : "outline"}>{portalStatus}</Badge>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-surface/70 px-3.5 py-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-brandBright">
                <LayoutGrid className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Espacio activo</p>
                <p className="mt-0.5 text-sm font-medium text-text">{tenantIndustry}</p>
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
            emphasis={item.emphasis}
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

      <section className="space-y-4 rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-4 shadow-[var(--card-shadow)] xl:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-[28px] font-semibold tracking-tight">Centro operativo</h3>
            <p className="mt-1.5 text-sm text-muted">Accesos rapidos a las herramientas que usas todos los dias.</p>
          </div>
          <Badge variant="muted">Accion rapida</Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {operationalLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="group rounded-[22px] border border-[color:var(--border)] bg-card/75 px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/35 hover:bg-card"
            >
              <div className="flex items-start justify-between gap-3">
                <span className={cn("inline-flex h-11 w-11 items-center justify-center rounded-2xl border", toneIconClass(item.tone))}>
                  {item.icon}
                </span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-muted transition-colors group-hover:text-text">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3.5 text-lg font-medium text-text">{item.label}</p>
              <p className="mt-1.5 text-sm leading-5 text-muted">{item.shortHelper}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-4 shadow-[var(--card-shadow)] xl:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-[28px] font-semibold tracking-tight">Rendimiento del negocio</h3>
            <p className="mt-1.5 text-sm text-muted">Metricas clave para tomar mejores decisiones.</p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-surface/75 px-4 py-2 text-sm text-muted">
            <CalendarClock className="h-4 w-4" />
            Hoy, {compactDateLabel}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {performanceMetrics.map((item) => (
            <PerformanceCard
              key={item.id}
              label={item.label}
              value={item.value}
              changeLabel={item.changeLabel}
              changeTone={item.changeTone}
              tone={item.tone}
            />
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-[22px] border border-[color:var(--border)] bg-card/80 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brandBright">
              <Zap className="h-4 w-4" />
            </span>
            <div>
              <p className="text-lg font-semibold tracking-tight text-text">Opturon trabaja por vos todos los dias</p>
              <p className="mt-1 text-sm text-muted">
                Tu asistente esta atendiendo clientes, calificando oportunidades y ayudando a vender mas.
              </p>
            </div>
          </div>

          <Link
            href="/app/automations"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--border)] bg-surface px-4 py-2.5 text-sm font-medium text-text hover:bg-surface/80"
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
  icon,
  emphasis
}: {
  eyebrow: string;
  value: string;
  subtitle: string;
  helper: string;
  foot: string;
  tone: SurfaceTone;
  icon: React.ReactNode;
  emphasis: "primary" | "secondary" | "support";
}) {
  return (
    <Card
      className={cn(
        "border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))]",
        emphasis === "primary" && "shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_22px_48px_rgba(0,0,0,0.18)]",
        emphasis === "support" && "bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.018))]"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <span className={cn("inline-flex items-center justify-center rounded-2xl border", emphasis === "primary" ? "h-12 w-12" : "h-11 w-11", toneIconClass(tone))}>
            {icon}
          </span>
          <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", toneDotClass(tone))} />
        </div>
        <p className="mt-4 text-sm text-muted">{eyebrow}</p>
        <p className={cn("mt-2 font-semibold leading-none tracking-tight text-text", emphasis === "primary" ? "text-[2.1rem]" : "text-[1.9rem]")}>{value}</p>
        <p className={cn("mt-2.5 font-medium text-text", emphasis === "support" ? "text-[15px]" : "text-base")}>{subtitle}</p>
        <p className="mt-1.5 min-h-[36px] text-sm leading-5 text-muted">{helper}</p>
        <p className={cn("mt-3 text-sm font-medium", toneTextClass(tone))}>{foot}</p>
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
  changeLabel,
  changeTone,
  tone
}: {
  label: string;
  value: string;
  changeLabel: string;
  changeTone: "positive" | "negative" | "neutral";
  tone: SurfaceTone;
}) {
  return (
    <div className={cn("rounded-[20px] border p-4", tonePerformanceClass(tone))}>
      <p className="text-[12px] text-muted">{label}</p>
      <p className={cn("mt-3 font-semibold leading-none tracking-tight", label === "Estado del bot" ? "text-[2.15rem] text-emerald-300" : "text-[2rem] text-text")}>
        {value}
      </p>
      <p className={cn("mt-2 text-sm font-medium", changeToneClass(changeTone))}>{changeLabel}</p>
      <div className="mt-4">
        <LineSparkline tone={tone} seed={`${label}:${value}:${changeLabel}`} />
      </div>
    </div>
  );
}

function LineSparkline({ tone, seed }: { tone: SurfaceTone; seed: string }) {
  const values = buildSparkline(seed);
  const width = 112;
  const height = 34;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - (value / 100) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-9 w-full overflow-visible" aria-hidden="true">
      <path d={`M0 ${height - 2} L${width} ${height - 2}`} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <polyline
        fill="none"
        points={points}
        stroke={sparkStrokeClass(tone)}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function buildSparkline(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 33 + seed.charCodeAt(index)) % 9973;
  }

  return Array.from({ length: 11 }, (_, index) => {
    hash = (hash * 37 + 17 + index) % 9973;
    return 24 + (hash % 52);
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

function shortenQuickLink(helper: string) {
  const normalized = helper.toLowerCase();

  if (normalized.includes("conversaciones")) return "Gestiona conversaciones y clientes";
  if (normalized.includes("seguimientos")) return "Seguimientos, turnos y disponibilidad";
  if (normalized.includes("crm")) return "Ver y gestionar tu base de clientes";
  if (normalized.includes("metric")) return "Revisar rendimiento y actividad";
  if (normalized.includes("canal")) return "Activar y revisar el canal principal";
  return helper.length > 58 ? `${helper.slice(0, 55).trim()}...` : helper;
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

function changeToneClass(tone: "positive" | "negative" | "neutral") {
  if (tone === "positive") return "text-emerald-300";
  if (tone === "negative") return "text-sky-300";
  return "text-muted";
}

function sparkStrokeClass(tone: SurfaceTone) {
  if (tone === "green") return "#4ade80";
  if (tone === "violet") return "#c084fc";
  if (tone === "blue") return "#38bdf8";
  if (tone === "amber") return "#fbbf24";
  if (tone === "red") return "#fb7185";
  return "#fb923c";
}
