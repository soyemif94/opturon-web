"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentType } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  Bot,
  CalendarClock,
  Check,
  CircleHelp,
  Clock3,
  Hand,
  Pencil,
  PhoneCall,
  Sparkles,
  UserRound
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/ui/cn";

type TriggerType = "message_received" | "keyword" | "off_hours" | "new_contact";
type ActionType = "send_message" | "assign_human" | "tag_contact";
type GoalId = "welcome" | "handoff" | "off-hours" | "lead-capture" | "followup" | "custom" | "size-guide" | "outfit" | "promotions" | "faq" | "vacations";

type GoalDefinition = {
  id: GoalId;
  title: string;
  description: string;
  badge: string;
  tone: "emerald" | "violet" | "orange" | "sky" | "amber" | "slate";
  icon: ComponentType<{ className?: string }>;
  defaultName: string;
  defaultMessage: string;
  defaultTag?: string;
  defaultTrigger: TriggerType;
  defaultKeyword?: string;
  previewReply: string;
  supportedTriggers: TriggerType[];
  includeAssignHuman?: boolean;
  includeTag?: boolean;
};

const GOALS: GoalDefinition[] = [
  {
    id: "welcome",
    title: "Dar bienvenida",
    description: "Saluda automaticamente cuando alguien te escribe por primera vez.",
    badge: "Mas utilizada",
    tone: "emerald",
    icon: Hand,
    defaultName: "Bienvenida automatica",
    defaultMessage: "Hola 👋 Gracias por escribirnos. En que podemos ayudarte hoy?",
    previewReply: "Hola 👋 Gracias por escribirnos. En que podemos ayudarte hoy?",
    defaultTrigger: "new_contact",
    supportedTriggers: ["new_contact", "message_received"]
  },
  {
    id: "handoff",
    title: "Derivar a una persona",
    description: "Pasa la conversacion al equipo cuando se necesita atencion humana.",
    badge: "Esencial",
    tone: "violet",
    icon: UserRound,
    defaultName: "Derivacion a una persona",
    defaultMessage: "Perfecto. Te conecto con una persona del equipo para ayudarte mejor.",
    previewReply: "Perfecto. Te conecto con una persona del equipo para ayudarte mejor.",
    defaultTrigger: "keyword",
    defaultKeyword: "humano",
    supportedTriggers: ["keyword", "message_received"],
    includeAssignHuman: true
  },
  {
    id: "off-hours",
    title: "Responder fuera de horario",
    description: "Informa que estas fuera de horario o de vacaciones.",
    badge: "Esencial",
    tone: "orange",
    icon: Clock3,
    defaultName: "Respuesta fuera de horario",
    defaultMessage: "Gracias por escribirnos. Ahora estamos fuera de horario, pero te respondemos en nuestro proximo bloque operativo.",
    previewReply: "Gracias por escribirnos. Ahora estamos fuera de horario, pero te respondemos en nuestro proximo bloque operativo.",
    defaultTrigger: "off_hours",
    supportedTriggers: ["off_hours"]
  },
  {
    id: "lead-capture",
    title: "Captar prospectos",
    description: "Hace preguntas simples para obtener datos y ordenar el primer contacto.",
    badge: "Muy recomendada",
    tone: "sky",
    icon: Sparkles,
    defaultName: "Captura de prospectos",
    defaultMessage: "Hola. Gracias por escribirnos. Para ayudarte mejor, cuentanos que necesitas y como prefieres que te contactemos.",
    previewReply: "Hola. Gracias por escribirnos. Para ayudarte mejor, cuentanos que necesitas y como prefieres que te contactemos.",
    defaultTrigger: "new_contact",
    supportedTriggers: ["new_contact", "message_received"],
    defaultTag: "prospecto",
    includeTag: true
  },
  {
    id: "followup",
    title: "Seguimiento comercial",
    description: "Deja una base lista para retomar conversaciones importantes.",
    badge: "Muy recomendada",
    tone: "amber",
    icon: BellRing,
    defaultName: "Seguimiento comercial",
    defaultMessage: "Hola. Queria retomar la conversacion contigo por si todavia necesitas ayuda con esto.",
    previewReply: "Hola. Queria retomar la conversacion contigo por si todavia necesitas ayuda con esto.",
    defaultTrigger: "keyword",
    defaultKeyword: "retomar",
    supportedTriggers: ["keyword", "message_received"]
  },
  {
    id: "custom",
    title: "Personalizada",
    description: "Crea tu automatizacion desde cero, a tu manera.",
    badge: "Avanzada",
    tone: "slate",
    icon: Pencil,
    defaultName: "Automatizacion personalizada",
    defaultMessage: "Hola. Gracias por escribirnos. Te compartimos esta respuesta automatica que puedes editar como quieras.",
    previewReply: "Hola. Gracias por escribirnos. Te compartimos esta respuesta automatica que puedes editar como quieras.",
    defaultTrigger: "message_received",
    supportedTriggers: ["message_received", "keyword", "new_contact", "off_hours"]
  },
  {
    id: "faq",
    title: "Preguntas frecuentes",
    description: "Ideal para horarios, direccion, formas de pago o dudas repetidas.",
    badge: "Lista para usar",
    tone: "amber",
    icon: CircleHelp,
    defaultName: "Preguntas frecuentes",
    defaultMessage: "Hola. Te compartimos una respuesta base para preguntas frecuentes. Puedes editarla con horarios, direccion, medios de pago o cualquier dato repetido de tu negocio.",
    previewReply: "Hola. Te compartimos una respuesta base para preguntas frecuentes.",
    defaultTrigger: "keyword",
    defaultKeyword: "horarios",
    supportedTriggers: ["keyword", "message_received"]
  },
  {
    id: "size-guide",
    title: "Consulta de talles",
    description: "Responde dudas sobre talles y ayuda a elegir mejor.",
    badge: "Lista para usar",
    tone: "sky",
    icon: CircleHelp,
    defaultName: "Consulta de talles",
    defaultMessage: "Claro. Aqui puedes dejar tu guia de talles, equivalencias o recomendaciones de calce para ayudar al cliente a decidir mejor.",
    previewReply: "Claro. Aqui puedes dejar tu guia de talles, equivalencias o recomendaciones de calce para ayudar al cliente a decidir mejor.",
    defaultTrigger: "keyword",
    defaultKeyword: "talle",
    supportedTriggers: ["keyword", "message_received"]
  },
  {
    id: "outfit",
    title: "Recomendacion de productos",
    description: "Sugiere productos complementarios o ideas relacionadas.",
    badge: "Lista para usar",
    tone: "sky",
    icon: Sparkles,
    defaultName: "Recomendacion de productos",
    defaultMessage: "Perfecto. Aqui puedes recomendar combinaciones, productos complementarios o una opcion parecida para seguir la venta.",
    previewReply: "Perfecto. Aqui puedes recomendar combinaciones, productos complementarios o una opcion parecida para seguir la venta.",
    defaultTrigger: "keyword",
    defaultKeyword: "combinar",
    supportedTriggers: ["keyword", "message_received"]
  },
  {
    id: "promotions",
    title: "Promo temporal",
    description: "Deja lista una promo puntual o una accion de campaña.",
    badge: "Lista para usar",
    tone: "orange",
    icon: Bot,
    defaultName: "Promocion puntual",
    defaultMessage: "Hola. Aqui puedes dejar una promocion temporal, un descuento o una accion puntual de campana.",
    previewReply: "Hola. Aqui puedes dejar una promocion temporal, un descuento o una accion puntual de campana.",
    defaultTrigger: "keyword",
    defaultKeyword: "promo",
    supportedTriggers: ["keyword", "message_received"]
  },
  {
    id: "vacations",
    title: "Vacaciones o aviso temporal",
    description: "Comunica un cierre puntual o un aviso especial al cliente.",
    badge: "Lista para usar",
    tone: "orange",
    icon: CalendarClock,
    defaultName: "Aviso temporal o vacaciones",
    defaultMessage: "Estamos de vacaciones hasta el 15/06. Te respondemos al volver. Si quieres, deja tu mensaje y te contactamos apenas retomemos.",
    previewReply: "Estamos de vacaciones hasta el 15/06. Te respondemos al volver. Si quieres, deja tu mensaje y te contactamos apenas retomemos.",
    defaultTrigger: "message_received",
    supportedTriggers: ["message_received", "off_hours"]
  }
];

const TRIGGER_COPY: Record<TriggerType, { title: string; description: string }> = {
  new_contact: {
    title: "Cuando me escriben por primera vez",
    description: "Ideal para bienvenida o para captar el primer contacto."
  },
  keyword: {
    title: "Cuando escriben cierta palabra",
    description: "Sirve para precios, talles, promos o una necesidad puntual."
  },
  off_hours: {
    title: "Cuando el local esta cerrado",
    description: "Pensada para respuestas fuera del horario habitual."
  },
  message_received: {
    title: "Cada vez que entra un mensaje",
    description: "Util para mensajes generales o avisos simples."
  }
};

const QUICK_SNIPPETS = [
  "Hola 👋 Gracias por escribirnos.",
  "En que podemos ayudarte hoy?",
  "Si quieres, dejanos tu nombre.",
  "Tambien puedes dejarnos tu telefono.",
  "Enseguida te responde una persona."
] as const;

function goalToneClasses(tone: GoalDefinition["tone"], selected = false) {
  if (tone === "emerald") return selected ? "border-emerald-400/60 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(52,211,153,0.18)]" : "border-white/8 bg-black/12";
  if (tone === "violet") return selected ? "border-violet-400/60 bg-violet-500/10 shadow-[0_0_0_1px_rgba(167,139,250,0.18)]" : "border-white/8 bg-black/12";
  if (tone === "orange") return selected ? "border-brand/60 bg-brand/10 shadow-[0_0_0_1px_rgba(249,115,22,0.18)]" : "border-white/8 bg-black/12";
  if (tone === "sky") return selected ? "border-sky-400/60 bg-sky-500/10 shadow-[0_0_0_1px_rgba(56,189,248,0.18)]" : "border-white/8 bg-black/12";
  if (tone === "amber") return selected ? "border-amber-400/60 bg-amber-500/10 shadow-[0_0_0_1px_rgba(251,191,36,0.18)]" : "border-white/8 bg-black/12";
  return selected ? "border-white/20 bg-white/8 shadow-[0_0_0_1px_rgba(255,255,255,0.12)]" : "border-white/8 bg-black/12";
}

function goalIconTone(tone: GoalDefinition["tone"]) {
  if (tone === "emerald") return "border-emerald-400/35 bg-emerald-500/18 text-emerald-200";
  if (tone === "violet") return "border-violet-400/35 bg-violet-500/18 text-violet-200";
  if (tone === "orange") return "border-orange-400/35 bg-orange-500/18 text-orange-200";
  if (tone === "sky") return "border-sky-400/35 bg-sky-500/18 text-sky-200";
  if (tone === "amber") return "border-amber-400/35 bg-amber-500/18 text-amber-200";
  return "border-white/15 bg-white/8 text-white";
}

export function AutomationBuilder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const template = (searchParams.get("template") || "welcome") as GoalId;

  const initialGoal = GOALS.find((goal) => goal.id === template) || GOALS[0];

  const [step, setStep] = useState(1);
  const [goalId, setGoalId] = useState<GoalId>(initialGoal.id);
  const [triggerType, setTriggerType] = useState<TriggerType>(initialGoal.defaultTrigger);
  const [keyword, setKeyword] = useState(initialGoal.defaultKeyword || "");
  const [name, setName] = useState(initialGoal.defaultName);
  const [message, setMessage] = useState(initialGoal.defaultMessage);
  const [tag, setTag] = useState(initialGoal.defaultTag || "");
  const [includeAssignHuman, setIncludeAssignHuman] = useState(Boolean(initialGoal.includeAssignHuman));
  const [includeTag, setIncludeTag] = useState(Boolean(initialGoal.includeTag));
  const [isSaving, setIsSaving] = useState(false);

  const goal = useMemo(() => GOALS.find((item) => item.id === goalId) || GOALS[0], [goalId]);
  const supportedTriggers = useMemo(() => goal.supportedTriggers, [goal]);

  const actionSummary = useMemo(() => {
    const items = ["Enviara un mensaje automatico."];
    if (includeAssignHuman) items.push("Tambien va a derivar a una persona.");
    if (includeTag && tag.trim()) items.push(`Va a etiquetar el contacto como "${tag.trim()}".`);
    return items;
  }, [includeAssignHuman, includeTag, tag]);

  function selectGoal(nextGoal: GoalDefinition) {
    setGoalId(nextGoal.id);
    setTriggerType(nextGoal.defaultTrigger);
    setKeyword(nextGoal.defaultKeyword || "");
    setName(nextGoal.defaultName);
    setMessage(nextGoal.defaultMessage);
    setTag(nextGoal.defaultTag || "");
    setIncludeAssignHuman(Boolean(nextGoal.includeAssignHuman));
    setIncludeTag(Boolean(nextGoal.includeTag));
  }

  function goNext() {
    setStep((current) => Math.min(4, current + 1));
  }

  function goBack() {
    setStep((current) => Math.max(1, current - 1));
  }

  async function handleSubmit() {
    setIsSaving(true);

    try {
      const actions: Array<{ type: ActionType; message?: string | null; tag?: string | null }> = [
        {
          type: "send_message",
          message: message.trim()
        }
      ];

      if (includeAssignHuman) {
        actions.unshift({ type: "assign_human" });
      }

      if (includeTag && tag.trim()) {
        actions.push({ type: "tag_contact", tag: tag.trim() });
      }

      const response = await fetch("/api/app/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          trigger: {
            type: triggerType,
            keyword: triggerType === "keyword" ? keyword.trim() : null
          },
          actions,
          enabled: true
        })
      });

      const json = (await response.json().catch(() => null)) as { error?: string; detail?: string } | null;
      if (!response.ok) {
        throw new Error(json?.detail || json?.error || "No pudimos guardar la automatizacion.");
      }

      toast.success("Automatizacion activada", "La base ya quedo guardada en tu espacio.");
      router.push("/app/automations");
      router.refresh();
    } catch (error) {
      toast.error("No pudimos crear la automatizacion", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(10,18,30,0.98),rgba(8,14,23,0.96))] p-6 shadow-[0_24px_80px_rgba(4,9,18,0.45)] lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-brand/30 bg-brand/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brandBright">
              Automatizaciones
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white lg:text-5xl">Creemos tu automatizacion</h1>
            <p className="mt-3 text-sm leading-7 text-muted lg:text-base">
              Elige que quieres que haga Opturon y te guiamos paso a paso. Todo se puede editar despues.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="secondary" className="rounded-2xl px-5">
              <Link href="#builder-help">
                <CircleHelp className="mr-2 h-4 w-4" />
                Como funciona?
              </Link>
            </Button>
            <Button asChild variant="secondary" className="rounded-2xl px-5">
              <Link href="/app/automations">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancelar
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <Card className="border-white/8 bg-black/12">
              <CardContent className="grid gap-4 p-4 lg:grid-cols-4">
                {[
                  { id: 1, title: "Elige el objetivo", copy: "Que quieres lograr?" },
                  { id: 2, title: "Cuando se activa", copy: "Define el disparador" },
                  { id: 3, title: "Que responde", copy: "El mensaje y acciones" },
                  { id: 4, title: "Revision final", copy: "Activa tu automatizacion" }
                ].map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-4">
                    <span
                      className={cn(
                        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                        step === item.id ? "border-brand/60 bg-brand/15 text-brandBright" : step > item.id ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/5 text-muted"
                      )}
                    >
                      {step > item.id ? <Check className="h-4 w-4" /> : item.id}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="mt-1 text-xs text-muted">{item.copy}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
              <CardContent className="space-y-6 p-6">
                {step === 1 ? (
                  <>
                    <div>
                      <h2 className="text-2xl font-semibold text-white">1. Elige el objetivo de tu automatizacion</h2>
                      <p className="mt-2 text-sm leading-6 text-muted">Selecciona que quieres que haga Opturon por vos. El objetivo define la base y te evita empezar desde cero.</p>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-3">
                      {GOALS.slice(0, 6).map((item) => {
                        const Icon = item.icon;
                        const selected = item.id === goal.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => selectGoal(item)}
                            className={cn("rounded-[26px] border p-5 text-left transition", goalToneClasses(item.tone, selected))}
                          >
                            <span className={cn("inline-flex h-16 w-16 items-center justify-center rounded-[24px] border", goalIconTone(item.tone))}>
                              <Icon className="h-7 w-7" />
                            </span>
                            <h3 className="mt-5 text-2xl font-semibold text-white">{item.title}</h3>
                            <p className="mt-3 text-sm leading-7 text-muted">{item.description}</p>
                            <div className="mt-4">
                              <Badge variant={selected ? "success" : "warning"}>{item.badge}</Badge>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="rounded-[24px] border border-white/8 bg-black/12 px-5 py-4 text-sm leading-6 text-muted">
                      Estas plantillas son recomendadas para tu negocio y ya vienen preconfiguradas. Puedes editarlas, activarlas o desactivarlas en cualquier momento.
                    </div>
                  </>
                ) : null}

                {step === 2 ? (
                  <>
                    <div>
                      <h2 className="text-2xl font-semibold text-white">2. Cuando se activa?</h2>
                      <p className="mt-2 text-sm leading-6 text-muted">Ahora elegimos el momento en que la automatizacion tiene que intervenir. Todo esta explicado en lenguaje simple.</p>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      {supportedTriggers.map((item) => {
                        const selected = triggerType === item;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setTriggerType(item)}
                            className={cn("rounded-[24px] border p-5 text-left transition", selected ? "border-brand/60 bg-brand/10" : "border-white/8 bg-black/12 hover:border-white/15")}
                          >
                            <p className="text-lg font-semibold text-white">{TRIGGER_COPY[item].title}</p>
                            <p className="mt-2 text-sm leading-6 text-muted">{TRIGGER_COPY[item].description}</p>
                          </button>
                        );
                      })}
                    </div>

                    {triggerType === "keyword" ? (
                      <label className="grid gap-2 text-sm">
                        <span className="font-medium text-white">Palabra o frase que la activa</span>
                        <input
                          className="h-12 w-full rounded-2xl border border-white/10 bg-black/12 px-4 text-text"
                          placeholder='Ej. "precio", "humano", "talle"'
                          value={keyword}
                          onChange={(event) => setKeyword(event.target.value)}
                        />
                      </label>
                    ) : null}
                  </>
                ) : null}

                {step === 3 ? (
                  <>
                    <div>
                      <h2 className="text-2xl font-semibold text-white">3. Que responde?</h2>
                      <p className="mt-2 text-sm leading-6 text-muted">Aqui defines el mensaje principal y, si quieres, una accion extra como derivar o etiquetar.</p>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                      <div className="space-y-4">
                        <label className="grid gap-2 text-sm">
                          <span className="font-medium text-white">Nombre visible de la automatizacion</span>
                          <input
                            className="h-12 w-full rounded-2xl border border-white/10 bg-black/12 px-4 text-text"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                          />
                        </label>

                        <label className="grid gap-2 text-sm">
                          <span className="font-medium text-white">Mensaje que recibira el cliente</span>
                          <textarea
                            className="min-h-[190px] w-full rounded-[24px] border border-white/10 bg-black/12 p-4 text-text"
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                          />
                        </label>

                        <div className="flex flex-wrap gap-2">
                          {QUICK_SNIPPETS.map((snippet) => (
                            <button
                              key={snippet}
                              type="button"
                              onClick={() => setMessage((current) => `${current.trim()}\n${snippet}`.trim())}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-text transition hover:border-brand/30 hover:text-white"
                            >
                              + {snippet}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4 rounded-[24px] border border-white/8 bg-black/12 p-4">
                        <h3 className="text-lg font-semibold text-white">Acciones utiles</h3>

                        <label className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/5 p-4">
                          <input
                            type="checkbox"
                            checked={includeAssignHuman}
                            onChange={(event) => setIncludeAssignHuman(event.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
                          />
                          <div>
                            <p className="font-medium text-white">Derivar a humano</p>
                            <p className="mt-1 text-sm leading-6 text-muted">Activa esto si quieres que ademas se notifique a una persona del equipo.</p>
                          </div>
                        </label>

                        <label className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/5 p-4">
                          <input
                            type="checkbox"
                            checked={includeTag}
                            onChange={(event) => setIncludeTag(event.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
                          />
                          <div className="w-full">
                            <p className="font-medium text-white">Etiquetar el contacto</p>
                            <p className="mt-1 text-sm leading-6 text-muted">Sirve para ordenar ventas, prospectos o seguimientos.</p>
                            {includeTag ? (
                              <input
                                className="mt-3 h-11 w-full rounded-2xl border border-white/10 bg-black/12 px-4 text-text"
                                placeholder="Ej. prospecto, seguimiento, promo"
                                value={tag}
                                onChange={(event) => setTag(event.target.value)}
                              />
                            ) : null}
                          </div>
                        </label>
                      </div>
                    </div>
                  </>
                ) : null}

                {step === 4 ? (
                  <>
                    <div>
                      <h2 className="text-2xl font-semibold text-white">4. Revision final</h2>
                      <p className="mt-2 text-sm leading-6 text-muted">Antes de activarla, revisa en lenguaje simple que va a pasar y como lo vera tu cliente.</p>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                      <div className="space-y-4 rounded-[24px] border border-white/8 bg-black/12 p-5">
                        <div>
                          <p className="text-sm font-medium text-white">Nombre</p>
                          <p className="mt-2 text-xl font-semibold text-white">{name || "Sin nombre"}</p>
                        </div>
                        <div className="space-y-3 text-sm leading-7 text-muted">
                          <div className="flex gap-3">
                            <Check className="mt-1 h-4 w-4 text-emerald-300" />
                            <p>Se activara cuando: {TRIGGER_COPY[triggerType].title.toLowerCase()}.</p>
                          </div>
                          <div className="flex gap-3">
                            <Check className="mt-1 h-4 w-4 text-emerald-300" />
                            <p>Va a responder: {message.trim() || "Sin mensaje todavia."}</p>
                          </div>
                          {actionSummary.map((item) => (
                            <div key={item} className="flex gap-3">
                              <Check className="mt-1 h-4 w-4 text-emerald-300" />
                              <p>{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-white/8 bg-black/12 p-5">
                        <p className="text-sm font-medium text-white">Consejo final</p>
                        <p className="mt-3 text-sm leading-6 text-muted">
                          Nada de esto es definitivo. Puedes mejorar el mensaje, apagarla o reemplazarla despues sin romper el asistente.
                        </p>
                      </div>
                    </div>
                  </>
                ) : null}

                <div className="flex flex-col gap-4 border-t border-white/8 pt-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">Vas por buen camino</p>
                    <p className="mt-1 text-sm text-muted">Paso {step} de 4</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {step > 1 ? (
                      <Button type="button" variant="secondary" className="rounded-2xl px-5" onClick={goBack}>
                        Volver
                      </Button>
                    ) : null}
                    {step < 4 ? (
                      <Button type="button" className="rounded-2xl px-5" onClick={goNext}>
                        Siguiente paso
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button type="button" className="rounded-2xl px-5" disabled={isSaving || !name.trim() || !message.trim() || (triggerType === "keyword" && !keyword.trim())} onClick={() => void handleSubmit()}>
                        {isSaving ? "Activando..." : "Activar automatizacion"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-5">
            <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
              <CardContent className="space-y-5 p-5">
                <div>
                  <h2 className="text-2xl font-semibold text-white">Resumen de tu automatizacion</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">Asi se vera una vez activa. Todo esto lo puedes editar despues.</p>
                </div>

                <Badge variant="warning">{goal.title}</Badge>

                <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#10352b]">
                  <div className="border-b border-black/10 bg-[#1f4f42] px-4 py-3 text-sm font-medium text-white">Vista previa para el cliente</div>
                  <div className="space-y-4 bg-[linear-gradient(180deg,rgba(23,58,48,0.92),rgba(13,36,30,0.96))] p-4">
                    <div className="max-w-[86%] rounded-[18px] bg-[#2d3240] px-4 py-3 text-sm leading-6 text-white shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
                      {goal.previewReply}
                    </div>
                    <div className="ml-auto max-w-[74%] rounded-[18px] bg-[#d9fdd3] px-4 py-3 text-sm leading-6 text-slate-900 shadow-[0_12px_28px_rgba(0,0,0,0.12)]">
                      Quiero mas informacion
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="font-medium text-white">Esto hara tu automatizacion:</p>
                  {actionSummary.map((item) => (
                    <div key={item} className="flex gap-3 text-sm leading-6 text-muted">
                      <Check className="mt-1 h-4 w-4 text-emerald-300" />
                      <p>{item}</p>
                    </div>
                  ))}
                </div>

                <div id="builder-help" className="rounded-[24px] border border-white/8 bg-black/12 p-4">
                  <p className="font-medium text-white">Consejo</p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Puedes cambiar o mejorar todo despues. No te preocupes, nada es definitivo.
                  </p>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>
    </div>
  );
}
