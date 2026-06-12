"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { PortalBotConfig } from "@/lib/api";

type BotConfigFormProps = {
  initialConfig: PortalBotConfig;
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

function normalizeForm(config: PortalBotConfig): PortalBotConfig {
  return {
    name: String(config?.name || "").trim(),
    greetingMessage: String(config?.greetingMessage || "").trim(),
    tone: config?.tone === "profesional" || config?.tone === "calido" ? config.tone : "amigable",
    treatment: config?.treatment === "usted" ? "usted" : "vos",
    outOfHoursMessage: String(config?.outOfHoursMessage || "").trim(),
    fallbackMessage: String(config?.fallbackMessage || "").trim(),
    handoffMessage: String(config?.handoffMessage || "").trim()
  };
}

function validateForm(config: PortalBotConfig): FieldErrors {
  const nextErrors: FieldErrors = {};
  if (config.name && config.name.length < 2) {
    nextErrors.name = "El nombre del bot debe tener al menos 2 caracteres.";
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

export function BotConfigForm({ initialConfig, tenantName, portalActive = true }: BotConfigFormProps) {
  const normalizedInitial = useMemo(() => normalizeForm(initialConfig), [initialConfig]);
  const [form, setForm] = useState<PortalBotConfig>(normalizedInitial);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; text: string }>({ tone: null, text: "" });
  const [isSaving, setIsSaving] = useState(false);

  const normalizedCurrent = useMemo(() => normalizeForm(form), [form]);
  const isDirty = useMemo(
    () => JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedInitial),
    [normalizedCurrent, normalizedInitial]
  );

  function updateField<K extends keyof PortalBotConfig>(key: K, value: PortalBotConfig[K]) {
    setForm((current) => normalizeForm({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined, general: undefined }));
    setFeedback({ tone: null, text: "" });
  }

  function resetForm() {
    setForm(normalizedInitial);
    setFieldErrors({});
    setFeedback({ tone: null, text: "" });
    toast.success("Cambios descartados");
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
        const message = String(json?.detail || json?.error || "No se pudo guardar la configuracion del bot.");
        setFieldErrors((json?.fieldErrors || {}) as FieldErrors);
        setFeedback({ tone: "error", text: message });
        toast.error("Error al guardar", message);
        return;
      }

      const nextConfig = normalizeForm(json?.settings?.botConfig || normalized);
      setForm(nextConfig);
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
