import { BarChart3, Bot, ChartNoAxesColumn, MessageCircle, MoreHorizontal, Search, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/cn";

type MockupVariant = "hero" | "inbox" | "pipeline" | "automation" | "crm" | "metrics";

type HomeProductMockupProps = {
  variant?: MockupVariant;
  compact?: boolean;
};

const inboxItems = [
  { name: "Maria Diaz", stage: "Nuevo lead", tone: "text-emerald-300", message: "Hola, quiero info para empezar." },
  { name: "Tienda Nova", stage: "Seguimiento", tone: "text-amber-300", message: "Me pasas condiciones y forma de pago?" },
  { name: "Lucas Vera", stage: "Cierre", tone: "text-sky-300", message: "Listo, avancemos con el alta." }
];

const pipelineColumns = [
  { title: "Entrantes", count: "14", cards: ["Consulta nueva", "Pedido de precio"] },
  { title: "Seguimiento", count: "9", cards: ["Enviar propuesta", "Recordar demo"] },
  { title: "Cierre", count: "4", cards: ["Cobro pendiente", "Alta aprobada"] }
];

const automationSteps = [
  "Mensaje nuevo detectado",
  "Cliente creado",
  "Respuesta inicial enviada",
  "Tarea de seguimiento activa"
];

const contactFacts = [
  ["Origen", "WhatsApp"],
  ["Estado", "Oportunidad activa"],
  ["Ultimo contacto", "Hace 12 min"],
  ["Responsable", "Equipo ventas"]
];

const metricBars = [
  { label: "Respuesta", value: "34s", width: "w-[78%]" },
  { label: "Oportunidades", value: "42", width: "w-[62%]" },
  { label: "Seguimiento", value: "89%", width: "w-[86%]" }
];

export function HomeProductMockup({ variant = "hero", compact = false }: HomeProductMockupProps) {
  const isHero = variant === "hero";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[2rem] border border-white/10 bg-[#101010] text-white shadow-[0_24px_80px_rgba(0,0,0,0.32)]",
        compact ? "min-h-[20rem]" : "min-h-[28rem]"
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffd166]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#4ade80]" />
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
          <Sparkles className="h-3.5 w-3.5 text-brandBright" />
          Opturon
        </div>
      </div>

      {isHero ? (
        <div className="grid gap-4 p-4 lg:grid-cols-[0.88fr_1.12fr]">
          <SidebarPanel compact={compact} />
          <MainPanel variant="hero" compact={compact} />
        </div>
      ) : (
        <div className="p-4">
          <MainPanel variant={variant} compact={compact} />
        </div>
      )}
    </div>
  );
}

function SidebarPanel({ compact }: { compact: boolean }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Inbox</p>
          <p className="mt-2 text-lg font-semibold">Conversaciones</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
          <Search className="h-4 w-4 text-zinc-300" />
        </div>
      </div>
      <div className={cn("mt-4 grid gap-3", compact ? "max-h-[17rem]" : "max-h-[22rem]")}>
        {inboxItems.map((item) => (
          <div key={item.name} className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">{item.name}</p>
              <span className={cn("text-[11px] font-medium", item.tone)}>{item.stage}</span>
            </div>
            <p className="mt-2 text-xs leading-6 text-zinc-400">{item.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MainPanel({ variant, compact }: { variant: MockupVariant; compact: boolean }) {
  if (variant === "inbox") {
    return (
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <SidebarPanel compact={compact} />
        <SelectedConversation />
      </div>
    );
  }

  if (variant === "pipeline") return <PipelineBoard />;
  if (variant === "automation") return <AutomationBoard />;
  if (variant === "crm") return <CrmBoard />;
  if (variant === "metrics") return <MetricsBoard />;

  return (
    <div className="grid gap-4">
      <TopMetrics />
      <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
        <SelectedConversation />
        <PipelineMini />
      </div>
    </div>
  );
}

function TopMetrics() {
  const cards = [
    { label: "Leads activos", value: "128", icon: MessageCircle },
    { label: "Seguimientos hoy", value: "34", icon: Zap },
    { label: "Pipeline", value: "USD 9.4k", icon: ChartNoAxesColumn }
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {cards.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">{item.label}</p>
              <Icon className="h-4 w-4 text-brandBright" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
          </div>
        );
      })}
    </div>
  );
}

function SelectedConversation() {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Cliente seleccionado</p>
          <h3 className="mt-2 text-xl font-semibold">Maria Diaz</h3>
          <p className="mt-1 text-sm text-zinc-400">Quiere empezar esta semana y ya pidio condiciones.</p>
        </div>
        <button className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
          <MoreHorizontal className="h-4 w-4 text-zinc-300" />
        </button>
      </div>

      <div className="mt-5 grid gap-3">
        <MessageBubble author="Cliente" text="Hola, quiero empezar hoy. Como sigue?" />
        <MessageBubble author="Opturon" text="Ya te respondimos y activamos seguimiento automatico." accent />
        <MessageBubble author="Ventas" text="Quedo en etapa propuesta y con tarea para cierre." />
      </div>
    </div>
  );
}

function PipelineMini() {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Pipeline</p>
      <div className="mt-4 grid gap-3">
        {pipelineColumns.map((column) => (
          <div key={column.title} className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white">{column.title}</p>
              <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-zinc-300">{column.count}</span>
            </div>
            <div className="mt-3 grid gap-2">
              {column.cards.map((card) => (
                <div key={card} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-300">
                  {card}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PipelineBoard() {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Pipeline</p>
          <h3 className="mt-2 text-xl font-semibold">Ventas en movimiento</h3>
        </div>
        <ChartNoAxesColumn className="h-5 w-5 text-brandBright" />
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        {pipelineColumns.map((column) => (
          <div key={column.title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{column.title}</p>
              <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-zinc-300">{column.count}</span>
            </div>
            <div className="mt-4 grid gap-3">
              {column.cards.map((card) => (
                <div key={card} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-sm text-white">{card}</p>
                  <p className="mt-2 text-xs text-zinc-400">Siguiente accion definida</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AutomationBoard() {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Automatizaciones</p>
          <h3 className="mt-2 text-xl font-semibold">Flujo activo de seguimiento</h3>
        </div>
        <Bot className="h-5 w-5 text-brandBright" />
      </div>
      <div className="mt-5 grid gap-3">
        {automationSteps.map((step, index) => (
          <div key={step} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-brand/35 bg-brand/10 text-sm font-semibold text-brandBright">
              {index + 1}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{step}</p>
              <div className="mt-2 h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-brand" style={{ width: `${72 + index * 6}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CrmBoard() {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.96fr_1.04fr]">
      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Ficha del cliente</p>
        <h3 className="mt-2 text-xl font-semibold">Lucas Vera</h3>
        <div className="mt-4 grid gap-3">
          {contactFacts.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
              <p className="mt-2 text-sm text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Historial</p>
        <div className="mt-4 grid gap-3">
          <TimelineEvent title="Primera consulta" meta="WhatsApp · Hoy 09:15" />
          <TimelineEvent title="Respuesta automatica enviada" meta="Bot · Hoy 09:16" />
          <TimelineEvent title="Oportunidad creada" meta="Pipeline · Hoy 09:17" />
          <TimelineEvent title="Tarea de cierre asignada" meta="Ventas · Hoy 09:20" />
        </div>
      </div>
    </div>
  );
}

function MetricsBoard() {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Metricas</p>
          <h3 className="mt-2 text-xl font-semibold">Actividad comercial</h3>
        </div>
        <BarChart3 className="h-5 w-5 text-brandBright" />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-3">
          {metricBars.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between text-sm">
                <p className="text-zinc-300">{item.label}</p>
                <p className="font-medium text-white">{item.value}</p>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/10">
                <div className={cn("h-2 rounded-full bg-brand", item.width)} />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-medium text-white">Resumen semanal</p>
          <div className="mt-4 flex h-44 items-end gap-3">
            {["35%", "54%", "48%", "72%", "66%", "88%", "76%"].map((height, index) => (
              <div key={height + index} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-2xl bg-[linear-gradient(180deg,#c05000,#7a2d00)]" style={{ height }} />
                <span className="text-[11px] text-zinc-500">{["L", "M", "X", "J", "V", "S", "D"][index]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ author, text, accent = false }: { author: string; text: string; accent?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3",
        accent ? "border-brand/30 bg-brand/10" : "border-white/10 bg-black/20"
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{author}</p>
      <p className="mt-2 text-sm leading-7 text-white">{text}</p>
    </div>
  );
}

function TimelineEvent({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-2 text-xs text-zinc-400">{meta}</p>
    </div>
  );
}
