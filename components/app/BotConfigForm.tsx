"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { PortalBotConfig, PortalBotSettings } from "@/lib/api";
import { effectiveBotPresentation, formatBillingPeriod, provisioningPresentation } from "@/lib/bot-settings-presentation";

type BotConfigFormProps = {
  initialConfig: PortalBotConfig;
  initialSettings?: PortalBotSettings | null;
  tenantName?: string;
  portalActive?: boolean;
};

type FeedbackTone = "success" | "error" | null;

type FieldErrors = Partial<Record<keyof PortalBotConfig, string>> & {
  general?: string;
};

const TONE_OPTIONS: Array<{ value: PortalBotConfig["tone"]; label: string }> = [
  { value: "amigable", label: "Amigable" },
  { value: "profesional", label: "Profesional" },
  { value: "calido", label: "Calido" }
];

const TREATMENT_OPTIONS: Array<{ value: PortalBotConfig["treatment"]; label: string }> = [
  { value: "vos", label: "Vos" },
  { value: "usted", label: "Usted" }
];

const BUSINESS_PROFILE_OPTIONS: Array<{ value: NonNullable<PortalBotConfig["businessProfilePreset"]>; label: string }> = [
  { value: "wholesale_distributor", label: "Distribuidora mayorista" },
  { value: "retail", label: "Comercio minorista" },
  { value: "services", label: "Servicios" },
  { value: "professional", label: "Profesional" },
  { value: "restaurant", label: "Restaurante / gastronomía" },
  { value: "real_estate", label: "Inmobiliaria" },
  { value: "health_appointments", label: "Salud / turnos" },
  { value: "custom", label: "Otro / personalizado" }
];

const COMMERCIAL_OBJECTIVE_OPTIONS: Array<{ value: NonNullable<PortalBotConfig["commercialObjective"]>; label: string }> = [
  { value: "order_generation", label: "Generar pedidos" },
  { value: "product_sales", label: "Vender productos" },
  { value: "quote", label: "Cotizar" },
  { value: "appointments", label: "Agendar turnos" },
  { value: "lead_capture", label: "Captar clientes / leads" },
  { value: "inquiries", label: "Atender consultas" },
  { value: "custom", label: "Personalizado" }
];

const SALES_MODE_OPTIONS: Array<{ value: NonNullable<PortalBotConfig["salesMode"]>; label: string }> = [
  { value: "consultative", label: "Consultivo" },
  { value: "proactive", label: "Proactivo" },
  { value: "direct", label: "Directo" }
];

type CommercialPreset = Pick<PortalBotConfig, "commercialObjective" | "salesMode" | "businessInstructions">;

const PRESET_DEFAULTS: Record<NonNullable<PortalBotConfig["businessProfilePreset"]>, CommercialPreset> = {
  wholesale_distributor: {
    commercialObjective: "order_generation",
    salesMode: "proactive",
    businessInstructions: "Sos el asistente comercial de una distribuidora mayorista.\nDetectá qué necesita el cliente y ofrecé productos disponibles en el catálogo.\nAyudalo a elegir productos, variedades y cantidades.\nCuando tenga sentido, sugerí alternativas o productos complementarios.\nGuiá la conversación naturalmente hacia la concreción de un pedido.\nUsá únicamente información real disponible para este negocio."
  },
  retail: {
    commercialObjective: "product_sales",
    salesMode: "proactive",
    businessInstructions: "Ayudá al cliente a elegir productos reales del catálogo y a avanzar hacia una compra. Sugerí alternativas disponibles cuando aporten valor."
  },
  services: {
    commercialObjective: "quote",
    salesMode: "consultative",
    businessInstructions: "Entendé la necesidad, explicá los servicios reales disponibles y facilitá el próximo paso para contactar, reservar o cotizar."
  },
  professional: {
    commercialObjective: "lead_capture",
    salesMode: "consultative",
    businessInstructions: "Atendé consultas, calificá la necesidad con preguntas breves y facilitá un próximo paso claro con el profesional."
  },
  restaurant: {
    commercialObjective: "order_generation",
    salesMode: "direct",
    businessInstructions: "Informá únicamente la oferta disponible y facilitá un pedido o una reserva según las funciones habilitadas para el negocio."
  },
  real_estate: {
    commercialObjective: "lead_capture",
    salesMode: "consultative",
    businessInstructions: "Detectá el interés y las características buscadas. Usá sólo propiedades e información reales y facilitá el seguimiento con una persona."
  },
  health_appointments: {
    commercialObjective: "appointments",
    salesMode: "consultative",
    businessInstructions: "Resolvé información administrativa permitida y facilitá la agenda. No inventes información médica ni reemplaces la evaluación profesional."
  },
  custom: {
    commercialObjective: null,
    salesMode: null,
    businessInstructions: ""
  }
};

function optionLabel<T extends string>(options: Array<{ value: T; label: string }>, value: T | null) {
  return options.find((option) => option.value === value)?.label || "Sin configurar";
}

function normalizeForm(config: PortalBotConfig): PortalBotConfig {
  return {
    name: String(config?.name || "").trim(),
    greetingMessage: String(config?.greetingMessage || "").trim(),
    tone: config?.tone === "profesional" || config?.tone === "calido" ? config.tone : "amigable",
    treatment: config?.treatment === "usted" ? "usted" : "vos",
    outOfHoursMessage: String(config?.outOfHoursMessage || "").trim(),
    fallbackMessage: String(config?.fallbackMessage || "").trim(),
    handoffMessage: String(config?.handoffMessage || "").trim(),
    businessProfilePreset: BUSINESS_PROFILE_OPTIONS.some((option) => option.value === config?.businessProfilePreset)
      ? config.businessProfilePreset
      : null,
    commercialObjective: COMMERCIAL_OBJECTIVE_OPTIONS.some((option) => option.value === config?.commercialObjective)
      ? config.commercialObjective
      : null,
    salesMode: SALES_MODE_OPTIONS.some((option) => option.value === config?.salesMode) ? config.salesMode : null,
    businessInstructions: String(config?.businessInstructions || "").trim()
  };
}

function validateForm(config: PortalBotConfig): FieldErrors {
  const nextErrors: FieldErrors = {};
  if (config.name && config.name.length < 2) {
    nextErrors.name = "El nombre del bot debe tener al menos 2 caracteres.";
  }
  if (config.businessInstructions.length > 4000) {
    nextErrors.businessInstructions = "Las instrucciones no pueden superar los 4000 caracteres.";
  }
  return nextErrors;
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function BotConfigForm({ initialConfig, initialSettings, tenantName, portalActive = true }: BotConfigFormProps) {
  const normalizedInitial = useMemo(() => normalizeForm(initialConfig), [initialConfig]);
  const [form, setForm] = useState<PortalBotConfig>(normalizedInitial);
  const [savedConfig, setSavedConfig] = useState<PortalBotConfig>(normalizedInitial);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; text: string }>({ tone: null, text: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [botActive, setBotActive] = useState(initialSettings?.botActive === true);
  const [isToggling, setIsToggling] = useState(false);
  const [settings, setSettings] = useState<PortalBotSettings | null>(initialSettings || null);

  useEffect(() => {
    const warnings = (initialSettings?.quotaWarnings || []).sort((a, b) => b - a);
    const highest = warnings[0];
    if (highest) {
      const copy: Record<number, [string, string]> = {
        50: ["Consumo de respuestas", "Ya utilizaste el 50% de tus respuestas inteligentes incluidas."],
        70: ["Consumo elevado", "Ya utilizaste el 70% de las respuestas inteligentes de tu plan."],
        100: ["Cupo agotado", "Alcanzaste el cupo de respuestas inteligentes incluido en tu plan."]
      };
      toast.success(copy[highest][0], copy[highest][1]);
    }
  }, [initialSettings]);

  const normalizedCurrent = useMemo(() => normalizeForm(form), [form]);
  const isDirty = useMemo(
    () => JSON.stringify(normalizedCurrent) !== JSON.stringify(savedConfig),
    [normalizedCurrent, savedConfig]
  );

  function updateField<K extends keyof PortalBotConfig>(key: K, value: PortalBotConfig[K]) {
    setForm((current) => normalizeForm({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined, general: undefined }));
    setFeedback({ tone: null, text: "" });
  }

  function resetForm() {
    setForm(savedConfig);
    setFieldErrors({});
    setFeedback({ tone: null, text: "" });
    toast.success("Cambios descartados");
  }

  function applyBusinessProfilePreset(value: PortalBotConfig["businessProfilePreset"]) {
    setForm((current) => {
      if (!value) return normalizeForm({ ...current, businessProfilePreset: null });
      const preset = PRESET_DEFAULTS[value];
      const previousDefault = current.businessProfilePreset ? PRESET_DEFAULTS[current.businessProfilePreset].businessInstructions : "";
      const currentInstructions = String(current.businessInstructions || "").trim();
      const canReplaceInstructions = !currentInstructions || currentInstructions === previousDefault.trim();
      return normalizeForm({
        ...current,
        businessProfilePreset: value,
        commercialObjective: preset.commercialObjective,
        salesMode: preset.salesMode,
        businessInstructions: canReplaceInstructions ? preset.businessInstructions : current.businessInstructions
      });
    });
    setFieldErrors((current) => ({
      ...current,
      businessProfilePreset: undefined,
      commercialObjective: undefined,
      salesMode: undefined,
      businessInstructions: undefined,
      general: undefined
    }));
    setFeedback({ tone: null, text: "" });
  }

  async function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const normalized = normalizeForm(form);
    const nextErrors = validateForm(normalized);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const message = nextErrors.general || nextErrors.name || "Revisa la configuracion del bot.";
      setFeedback({ tone: "error", text: message });
      toast.error("Error de validacion", message);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/app/settings/bot-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized)
      });
      const json = await safeJson(response);
      if (!response.ok) {
        const message = "No pudimos guardar la configuración del bot. Intentá nuevamente.";
        setFieldErrors((json?.fieldErrors || {}) as FieldErrors);
        setFeedback({ tone: "error", text: message });
        toast.error("Error al guardar", message);
        return;
      }

      const nextConfig = normalizeForm(json?.settings?.botConfig || normalized);
      if (json?.settings) {
        setSettings(json.settings as PortalBotSettings);
        setBotActive(json.settings.botActive === true);
      }
      setForm(nextConfig);
      setSavedConfig(nextConfig);
      setFieldErrors({});
      setFeedback({ tone: "success", text: "Configuracion del bot guardada correctamente." });
      toast.success("Bot de WhatsApp actualizado");
    } catch {
      setFeedback({ tone: "error", text: "Ocurrio un error de red. Reintenta en unos segundos." });
      toast.error("Error de red", "No pudimos guardar la configuracion del bot.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleBot(next: boolean) {
    setIsToggling(true);
    try {
      const response = await fetch("/api/app/settings/bot-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botActive: next })
      });
      const json = await safeJson(response);
      if (!response.ok) {
        toast.error("No se pudo actualizar la atención automática", json?.detail || "La configuración no está disponible todavía.");
        return;
      }
      setBotActive(json?.settings?.botActive === true);
      if (json?.settings) setSettings(json.settings as PortalBotSettings);
      toast.success(next ? "Atención automática activada" : "Atención automática desactivada");
    } catch {
      toast.error("Error de red", "No pudimos actualizar la atención automática.");
    } finally {
      setIsToggling(false);
    }
  }

  const ai = settings || initialSettings;
  const planKey = String(ai?.entitlements?.planKey || ai?.aiProvisioning?.planKey || "core").toLowerCase();
  const included = ai?.aiUsage?.includedResponses ?? ai?.aiProvisioning?.includedResponses ?? (planKey === "growth" ? 2000 : planKey === "distribution" ? 3500 : null);
  const usage = ai?.aiUsage;
  const status = ai?.botStatus;
  const pending = ai?.aiProvisioning?.status === "pending";
  const blockedOrFailed = ai?.aiProvisioning?.status === "blocked" || ai?.aiProvisioning?.status === "failed";
  const core = planKey === "core" || !ai?.entitlements?.capabilities?.["bot.enabled"];
  const toggleDisabled = core || pending || blockedOrFailed || isToggling;
  const provisioning = provisioningPresentation(ai?.aiProvisioning?.status);
  const effective = effectiveBotPresentation({
    provisioningStatus: ai?.aiProvisioning?.status,
    botActive,
    quotaAvailable: usage?.quotaAvailable !== false,
    channelOperational: portalActive,
    entitled: !core
  });
  const period = formatBillingPeriod(usage?.periodStart || ai?.aiProvisioning?.periodStart, usage?.periodEnd || ai?.aiProvisioning?.periodEnd);

  return (
    <form className="space-y-5" onSubmit={save}>
      <section className="overflow-hidden rounded-[30px] border border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.14),transparent_18%),linear-gradient(180deg,rgba(8,14,23,0.98),rgba(7,12,20,0.98))] p-5 shadow-[var(--card-shadow)] lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Configuracion</p>
            <h1 className="mt-2 text-[2rem] font-semibold tracking-tight text-white">Bot de WhatsApp</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">
              Personaliza la voz del bot para este tenant sin tocar la logica conversacional ni los flujos comerciales validados.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="muted" className="rounded-full px-3 py-1.5">{tenantName || "Espacio del cliente"}</Badge>
            <Badge variant={portalActive ? "success" : "warning"} className="rounded-full px-3 py-1.5">
              {portalActive ? "WhatsApp activo" : "Canal pendiente"}
            </Badge>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] p-5 shadow-[var(--card-shadow)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#fdba74]">Asistente inteligente</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Atención automática</h2>
              <p className="mt-2 text-sm leading-6 text-muted">El asistente sólo responde cuando el canal, tu plan, la configuración y el cupo están disponibles.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="Atención automática"
              aria-checked={botActive}
              disabled={toggleDisabled}
              onClick={() => toggleBot(!botActive)}
              className="flex min-h-11 items-center gap-3 rounded-2xl border border-white/10 px-3 py-2 text-sm text-white transition hover:border-orange-300/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>{botActive ? "Activada" : "Desactivada"}</span>
              <span aria-hidden="true" className={`relative h-6 w-11 rounded-full transition ${botActive ? "bg-orange-400" : "bg-white/20"}`}>
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${botActive ? "left-6" : "left-1"}`} />
              </span>
            </button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Metric label="Estado" value={effective.label} detail={effective.detail} />
            <Metric label="Plan" value={planKey === "growth" ? "Growth" : planKey === "distribution" ? "Distribución" : planKey === "enterprise" ? "Enterprise" : "Core"} detail={planKey === "growth" ? "Estándar" : planKey === "distribution" ? "Avanzado" : planKey === "enterprise" ? "Personalizado / Avanzado" : "Sin asistente incluido"} />
            <Metric label="Configuración inicial" value={provisioning.label} detail={provisioning.detail} />
          </div>
          {core ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm text-amber-100"><span>El asistente inteligente no está incluido en Core.</span><a className="font-semibold text-orange-200 underline" href="/#planes">Ver planes</a></div> : null}
          {pending ? <p className="mt-4 rounded-2xl border border-sky-300/20 bg-sky-300/[0.06] p-4 text-sm leading-6 text-sky-100">Podrás activar la atención automática cuando finalice la configuración.</p> : null}
          {blockedOrFailed ? <a className="mt-4 inline-block rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white" href="/contacto">Contactar soporte</a> : null}
        </div>
        <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] p-5 shadow-[var(--card-shadow)]">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#fdba74]">Consumo</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Uso de respuestas inteligentes</h2>
          <p className="mt-2 text-sm text-muted">Período actual: {period}</p>
          <p className="mt-5 text-lg font-semibold text-white">{included == null ? `${usage?.usedResponses || 0} respuestas utilizadas` : `${usage?.usedResponses || 0} de ${included.toLocaleString("es-AR")} respuestas utilizadas`}</p>
          {included != null ? <>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-orange-400" style={{ width: `${Math.min(100, usage?.percent || 0)}%` }} /></div>
            <div className="mt-3 flex justify-between text-sm text-muted"><span>{usage?.remainingResponses ?? included} respuestas disponibles</span><span>{usage?.percent || 0}%</span></div>
          </> : <p className="mt-4 text-sm text-muted">Cupo personalizado según contrato.</p>}
          {usage && !usage.quotaAvailable ? <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-sm leading-6 text-amber-100">La atención manual y el resto de Opturon continúan funcionando. El asistente está pausado hasta disponer de capacidad.</p> : null}
          {planKey === "growth" && (usage?.percent || 0) >= 70 ? <a className="mt-4 inline-block text-sm font-semibold text-orange-200 underline" href="/contacto">Solicitar ampliación</a> : null}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-5 rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] p-5 shadow-[var(--card-shadow)]">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nombre del bot" helper="Opcional. Si lo cargas, el bot puede presentarse con ese nombre.">
              <Input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Ej: Alma" />
              {fieldErrors.name ? <FieldError text={fieldErrors.name} /> : null}
            </Field>

            <Field label="Tono" helper="Ajusta la voz general sin cambiar la logica del flujo.">
              <select
                className="h-12 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-100 outline-none transition focus:border-[#fb923c]"
                value={form.tone}
                onChange={(event) => updateField("tone", event.target.value as PortalBotConfig["tone"])}
              >
                {TONE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-950 text-slate-100">
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tratamiento" helper="Elige si el bot habla de vos o de usted en sus respuestas base.">
              <select
                className="h-12 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-100 outline-none transition focus:border-[#fb923c]"
                value={form.treatment}
                onChange={(event) => updateField("treatment", event.target.value as PortalBotConfig["treatment"])}
              >
                {TREATMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-950 text-slate-100">
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <section className="space-y-4 rounded-[24px] border border-[#fb923c]/20 bg-[#fb923c]/[0.04] p-4 md:p-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#fdba74]">Comportamiento comercial</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Definí qué negocio representa el bot y cómo debe acompañar cada oportunidad comercial.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Perfil del bot" helper="Aplica un punto de partida editable para tu tipo de negocio.">
                <select
                  className="h-12 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-100 outline-none transition focus:border-[#fb923c]"
                  value={form.businessProfilePreset || ""}
                  onChange={(event) => applyBusinessProfilePreset((event.target.value || null) as PortalBotConfig["businessProfilePreset"])}
                >
                  <option value="" className="bg-slate-950 text-slate-100">Sin configurar</option>
                  {BUSINESS_PROFILE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-950 text-slate-100">{option.label}</option>
                  ))}
                </select>
                {fieldErrors.businessProfilePreset ? <FieldError text={fieldErrors.businessProfilePreset} /> : null}
              </Field>

              <Field label="Objetivo principal" helper="Indica el resultado principal que debe facilitar el bot.">
                <select
                  className="h-12 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-100 outline-none transition focus:border-[#fb923c]"
                  value={form.commercialObjective || ""}
                  onChange={(event) => updateField("commercialObjective", (event.target.value || null) as PortalBotConfig["commercialObjective"])}
                >
                  <option value="" className="bg-slate-950 text-slate-100">Sin configurar</option>
                  {COMMERCIAL_OBJECTIVE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-950 text-slate-100">{option.label}</option>
                  ))}
                </select>
                {fieldErrors.commercialObjective ? <FieldError text={fieldErrors.commercialObjective} /> : null}
              </Field>

              <Field label="Estilo comercial" helper="Define cuánto explora, recomienda o va directo a la acción.">
                <select
                  className="h-12 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-100 outline-none transition focus:border-[#fb923c]"
                  value={form.salesMode || ""}
                  onChange={(event) => updateField("salesMode", (event.target.value || null) as PortalBotConfig["salesMode"])}
                >
                  <option value="" className="bg-slate-950 text-slate-100">Sin configurar</option>
                  {SALES_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-950 text-slate-100">{option.label}</option>
                  ))}
                </select>
                {fieldErrors.salesMode ? <FieldError text={fieldErrors.salesMode} /> : null}
              </Field>
            </div>

            <Field label="Instrucciones para el bot" helper="Contale al bot qué vende tu negocio, cómo querés que atienda y qué debería priorizar.">
              <Textarea
                rows={8}
                maxLength={4000}
                value={form.businessInstructions}
                onChange={(event) => updateField("businessInstructions", event.target.value)}
                placeholder="Ej: Detectá qué necesita el cliente y ofrecé únicamente productos disponibles en el catálogo real."
              />
              <div className="flex items-center justify-between gap-3 text-xs text-muted">
                <span>Las instrucciones personalizadas se conservan al cambiar de preset.</span>
                <span>{form.businessInstructions.length}/4000</span>
              </div>
              {fieldErrors.businessInstructions ? <FieldError text={fieldErrors.businessInstructions} /> : null}
            </Field>
          </section>

          <Field label="Saludo inicial" helper="Si lo dejas vacio, el bot mantiene el saludo actual por defecto.">
            <Textarea
              rows={4}
              value={form.greetingMessage}
              onChange={(event) => updateField("greetingMessage", event.target.value)}
              placeholder="Ej: Hola, soy Alma. Contame en qué te puedo ayudar hoy."
            />
          </Field>

          <Field label="Mensaje fuera de horario" helper="Se usa cuando entra un saludo y el negocio figura fuera de horario.">
            <Textarea
              rows={4}
              value={form.outOfHoursMessage}
              onChange={(event) => updateField("outOfHoursMessage", event.target.value)}
              placeholder="Ej: Ahora estamos fuera de horario. Apenas retomemos seguimos por acá."
            />
          </Field>

          <Field label="Fallback personalizado" helper="Respuesta base cuando el bot no logra entender el mensaje.">
            <Textarea
              rows={4}
              value={form.fallbackMessage}
              onChange={(event) => updateField("fallbackMessage", event.target.value)}
              placeholder="Ej: No llegué a entenderte del todo. Si querés, contame si buscás ayuda con ventas, agenda o pagos."
            />
          </Field>

          <Field label="Mensaje de derivacion a humano" helper="Se usa en derivaciones manuales y cierres de activacion cuando piden ayuda humana.">
            <Textarea
              rows={4}
              value={form.handoffMessage}
              onChange={(event) => updateField("handoffMessage", event.target.value)}
              placeholder="Ej: Te paso con una persona del equipo y seguimos por ahí."
            />
          </Field>
        </div>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(16,24,38,0.96),rgba(8,14,23,0.96))] p-5 shadow-[var(--card-shadow)]">
            <p className="text-sm font-medium text-white">Preview rapido</p>
            <div className="mt-4 space-y-3 rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm leading-6 text-slate-200">
              <PreviewBlock label="Saludo" text={normalizedCurrent.greetingMessage || "(usa el saludo actual por defecto)"} />
              <PreviewBlock label="Fuera de horario" text={normalizedCurrent.outOfHoursMessage || "(usa el mensaje por defecto)"} />
              <PreviewBlock label="Fallback" text={normalizedCurrent.fallbackMessage || "(usa el fallback actual)"} />
              <PreviewBlock label="Humano" text={normalizedCurrent.handoffMessage || "(usa el mensaje actual)"} />
              <PreviewBlock label="Perfil" text={optionLabel(BUSINESS_PROFILE_OPTIONS, normalizedCurrent.businessProfilePreset)} />
              <PreviewBlock label="Objetivo" text={optionLabel(COMMERCIAL_OBJECTIVE_OPTIONS, normalizedCurrent.commercialObjective)} />
              <PreviewBlock label="Estilo" text={optionLabel(SALES_MODE_OPTIONS, normalizedCurrent.salesMode)} />
              <PreviewBlock label="Fuente comercial" text="Catálogo y datos reales del negocio" />
              <PreviewBlock label="Reglas" text="No inventar productos, precios ni stock" />
            </div>
          </section>

          <section className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] p-5 shadow-[var(--card-shadow)]">
            <p className="text-sm font-medium text-white">Guardado</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Si un campo queda vacio, el tenant sigue usando el comportamiento actual del bot sin cambios funcionales.
            </p>

            {feedback.text ? (
              <div
                className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                  feedback.tone === "success"
                    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
                    : "border-red-500/25 bg-red-500/10 text-red-200"
                }`}
              >
                {feedback.text}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="submit" disabled={isSaving || !isDirty}>
                {isSaving ? "Guardando..." : "Guardar configuracion"}
              </Button>
              <Button type="button" variant="secondary" disabled={isSaving || !isDirty} onClick={resetForm}>
                Descartar cambios
              </Button>
            </div>
          </section>
        </aside>
      </section>
    </form>
  );
}

function Field({ label, helper, children }: { label: string; helper: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted">{helper}</p>
      </div>
      {children}
    </label>
  );
}

function FieldError({ text }: { text: string }) {
  return <p className="text-xs text-red-300">{text}</p>;
}

function PreviewBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"><p className="text-[10px] uppercase tracking-[0.16em] text-muted">{label}</p><p className="mt-2 text-sm font-semibold text-white">{value}</p><p className="mt-1 text-xs leading-5 text-muted">{detail}</p></div>;
}
