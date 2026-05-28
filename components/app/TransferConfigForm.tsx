"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Building2,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Copy,
  CreditCard,
  LockKeyhole,
  MessageSquare,
  PlaneTakeoff,
  ShieldCheck,
  Sparkles,
  Wallet
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { PortalBotTransferConfig } from "@/lib/api";

type TransferConfigFormProps = {
  initialConfig: PortalBotTransferConfig;
  tenantName?: string;
  portalActive?: boolean;
};

type FieldErrors = {
  general?: string;
  alias?: string;
  cbu?: string;
};

type FeedbackTone = "success" | "error" | null;

type BankField = {
  key: "alias" | "cbu" | "titular" | "bank" | "accountType" | "taxId";
  label: string;
  value: string;
  editable: boolean;
  helper: string;
  copyable?: boolean;
  error?: string;
};

export function TransferConfigForm({ initialConfig, tenantName, portalActive = true }: TransferConfigFormProps) {
  const normalizedInitialConfig = useMemo(() => normalizeForm(initialConfig), [initialConfig]);
  const [form, setForm] = useState<PortalBotTransferConfig>(normalizedInitialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; text: string }>({ tone: null, text: "" });
  const [isEditingBankDetails, setIsEditingBankDetails] = useState(false);

  const previewData = useMemo(() => buildTransferPreview(form), [form]);
  const normalizedCurrent = useMemo(() => normalizeForm(form), [form]);
  const normalizedInitial = useMemo(() => normalizeForm(normalizedInitialConfig), [normalizedInitialConfig]);
  const isDirty = useMemo(() => JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedInitial), [normalizedCurrent, normalizedInitial]);
  const instructionsLength = normalizedCurrent.instructions.length;

  function updateField<K extends keyof PortalBotTransferConfig>(key: K, value: PortalBotTransferConfig[K]) {
    setForm((current) => normalizeForm({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined, general: undefined }));
    setFeedback({ tone: null, text: "" });
  }

  function resetChanges() {
    setForm(normalizedInitial);
    setFieldErrors({});
    setFeedback({ tone: null, text: "" });
    setIsEditingBankDetails(false);
    toast.success("Cambios descartados");
  }

  async function copyValue(label: string, value: string) {
    if (!value) {
      toast.error("Sin datos", `No hay ${label.toLowerCase()} cargado para copiar.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado`, value);
    } catch {
      toast.error("No se pudo copiar", "Revisa los permisos del navegador.");
    }
  }

  async function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const normalizedForm = normalizeForm(form);
    const nextFieldErrors = validateTransferForm(normalizedForm);
    setForm(normalizedForm);
    setFieldErrors(nextFieldErrors);
    setFeedback({ tone: null, text: "" });

    if (Object.keys(nextFieldErrors).length) {
      const message = nextFieldErrors.general || nextFieldErrors.alias || nextFieldErrors.cbu || "Revisa los datos de transferencia.";
      setFeedback({ tone: "error", text: message });
      toast.error("Error de validacion", message);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/app/settings/transfer-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedForm)
      });
      const json = await safeJson(response);
      if (!response.ok) {
        const nextErrors = normalizeFieldErrors(json?.fieldErrors);
        const message = json?.detail || json?.error || "No se pudo guardar la configuracion de transferencia.";
        setFieldErrors(nextErrors);
        setFeedback({ tone: "error", text: String(message) });
        toast.error("Error al guardar", String(message));
        return;
      }

      const nextConfig = normalizeForm(json?.settings?.transferConfig || normalizedForm);
      setForm(nextConfig);
      setFieldErrors({});
      setFeedback({ tone: "success", text: "Configuracion de transferencia guardada correctamente." });
      setIsEditingBankDetails(false);
      toast.success("Cobro por transferencia actualizado");
    } catch {
      setFeedback({ tone: "error", text: "Ocurrio un error de red. Reintenta en unos segundos." });
      toast.error("Error de red", "No pudimos guardar la configuracion de transferencia.");
    } finally {
      setIsSaving(false);
    }
  }

  const bankFields: BankField[] = [
    {
      key: "alias",
      label: "Alias",
      value: normalizedCurrent.alias,
      editable: true,
      copyable: true,
      error: fieldErrors.alias,
      helper: "Tu alias se comparte tal como esta guardado."
    },
    {
      key: "cbu",
      label: "CBU",
      value: normalizedCurrent.cbu,
      editable: true,
      copyable: true,
      error: fieldErrors.cbu,
      helper: "Debe tener 22 digitos numericos."
    },
    {
      key: "titular",
      label: "Titular de la cuenta",
      value: normalizedCurrent.titular,
      editable: true,
      helper: "Nombre completo del titular."
    },
    {
      key: "bank",
      label: "Banco",
      value: normalizedCurrent.bank,
      editable: true,
      helper: "Banco o billetera donde recibe la transferencia."
    },
    {
      key: "accountType",
      label: "Tipo de cuenta",
      value: "",
      editable: false,
      helper: "Este dato todavia no forma parte de la configuracion actual."
    },
    {
      key: "taxId",
      label: "CUIL del titular",
      value: "",
      editable: false,
      helper: "Este dato todavia no forma parte de la configuracion actual."
    }
  ];

  return (
    <form className="space-y-5" onSubmit={save}>
      <section className="overflow-hidden rounded-[30px] border border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(176,80,0,0.16),transparent_18%),linear-gradient(180deg,rgba(8,14,23,0.98),rgba(7,12,20,0.98))] p-5 shadow-[var(--card-shadow)] lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <span>Configuracion</span>
              <ChevronRight className="h-4 w-4" />
              <span className="text-text">Cobro por transferencia</span>
            </div>
            <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-white">Cobro por transferencia</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">
              Configura los datos bancarios que el bot compartira con tus clientes para que puedan pagar por transferencia.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 lg:max-w-[420px] lg:justify-end">
            <Badge variant="outline" className="rounded-full px-3 py-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Modo claro
            </Badge>
            <Badge variant="muted" className="rounded-full px-3 py-1.5">
              <Building2 className="h-3.5 w-3.5" />
              {tenantName || "Espacio del cliente"}
            </Badge>
            <Badge variant={portalActive ? "success" : "warning"} className="rounded-full px-3 py-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              {portalActive ? "Portal activo" : "Portal sin canal"}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1.5">
              <PlaneTakeoff className="h-3.5 w-3.5" />
              Operacion en vivo
            </Badge>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_380px]">
        <div className="space-y-5">
          <section className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] p-5 shadow-[var(--card-shadow)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xl font-semibold text-white">Estado del cobro conversacional</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Activalo para que el bot pueda compartir tus datos bancarios y guiar al cliente en el pago.
                </p>
              </div>

              <label className="inline-flex items-center gap-3 self-start rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-muted">
                <span>Cobro conversacional</span>
                <span className={normalizedCurrent.enabled ? "text-emerald-300" : "text-muted"}>{normalizedCurrent.enabled ? "Activo" : "Inactivo"}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={normalizedCurrent.enabled}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
                    normalizedCurrent.enabled
                      ? "border-emerald-400/40 bg-emerald-400/20"
                      : "border-white/10 bg-white/5"
                  }`}
                  onClick={() => updateField("enabled", !normalizedCurrent.enabled)}
                >
                  <span
                    className={`absolute h-5 w-5 rounded-full bg-white shadow transition ${
                      normalizedCurrent.enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
            </div>

            {fieldErrors.general ? (
              <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {fieldErrors.general}
              </div>
            ) : null}

            <div className="mt-5 rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(10,16,27,0.98),rgba(10,16,26,0.82))] p-4">
              <div className="flex items-start gap-4">
                <div
                  className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border ${
                    normalizedCurrent.enabled
                      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                      : "border-white/10 bg-white/5 text-muted"
                  }`}
                >
                  {normalizedCurrent.enabled ? <Check className="h-7 w-7" /> : <LockKeyhole className="h-6 w-6" />}
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">
                    {normalizedCurrent.enabled ? "Transferencias activadas" : "Transferencias desactivadas"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {normalizedCurrent.enabled
                      ? "El bot ya puede compartir tus datos bancarios automaticamente cuando el cliente lo solicite."
                      : "Mientras este apagado, el bot no va a compartir alias ni CBU dentro del flujo conversacional."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] p-5 shadow-[var(--card-shadow)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xl font-semibold text-white">Datos bancarios</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Estos son los datos que el bot compartira con tus clientes.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="rounded-2xl"
                onClick={() => setIsEditingBankDetails((current) => !current)}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {isEditingBankDetails ? "Cerrar edicion" : "Editar datos"}
              </Button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {bankFields.map((field) => {
                const isEditable = field.editable && isEditingBankDetails;
                const isUnavailable = !field.editable;
                const currentValue = field.value;

                return (
                  <div
                    key={field.key}
                    className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(11,18,29,0.95),rgba(9,15,24,0.88))] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-muted">{field.label}</p>
                      {field.copyable ? (
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted transition hover:text-text"
                          onClick={() => void copyValue(field.label, currentValue)}
                          aria-label={`Copiar ${field.label}`}
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>

                    {field.editable ? (
                      <div className="mt-3">
                        {isEditable ? (
                          field.key === "alias" || field.key === "cbu" || field.key === "titular" || field.key === "bank" ? (
                            <input
                              className="w-full rounded-2xl border border-[color:var(--field-border)] bg-[color:var(--field-bg)] px-4 py-3 text-sm text-text outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/20"
                              value={currentValue}
                              onChange={(event) =>
                                updateField(field.key as "alias" | "cbu" | "titular" | "bank", event.target.value)
                              }
                            />
                          ) : null
                        ) : (
                          <p className={`text-sm font-medium ${currentValue ? "text-white" : "text-muted"}`}>
                            {currentValue || "No configurado"}
                          </p>
                        )}
                        {field.error ? (
                          <p className="mt-2 text-xs text-red-200">{field.error}</p>
                        ) : (
                          <p className="mt-2 text-xs leading-5 text-muted">{field.helper}</p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <p className={`text-sm font-medium ${isUnavailable ? "text-muted" : "text-white"}`}>
                          {currentValue || "No configurado"}
                        </p>
                        <p className="text-xs leading-5 text-muted">{field.helper}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
              <p>Estos datos se muestran al cliente de forma segura y no requieren confirmacion manual.</p>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] p-5 shadow-[var(--card-shadow)]">
            <div>
              <p className="text-xl font-semibold text-white">Mensaje personalizado (opcional)</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Agrega un mensaje adicional que el bot incluira junto con los datos de pago.
              </p>
            </div>

            <div className="mt-5">
              <textarea
                className="min-h-[170px] w-full rounded-[24px] border border-[color:var(--field-border)] bg-[color:var(--field-bg)] px-4 py-4 text-sm leading-7 text-text outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/20"
                value={normalizedCurrent.instructions}
                onChange={(event) => updateField("instructions", event.target.value)}
                placeholder="Ejemplo: Si ya hiciste la transferencia, envianos el comprobante por este chat asi la confirmamos mas rapido."
              />
              <div className="mt-3 flex flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
                <p>El bot toma este texto y lo agrega al final del mensaje de cobro.</p>
                <p>{instructionsLength}/300 caracteres</p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] p-5 shadow-[var(--card-shadow)]">
            <div>
              <p className="text-xl font-semibold text-white">Preview del mensaje del bot</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Asi vera el cliente la informacion cuando pida como pagar.
              </p>
            </div>

            <div className="mt-5 rounded-[26px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_26%),linear-gradient(180deg,rgba(10,18,28,0.96),rgba(8,14,24,0.98))] p-4">
              <div className="flex justify-start">
                <div className="max-w-[82%] rounded-[18px] rounded-tl-sm border border-white/8 bg-white/5 px-4 py-3 text-sm text-slate-100 shadow-[0_12px_22px_rgba(0,0,0,0.18)]">
                  <div className="flex items-end gap-3">
                    <p>Como te transfiero?</p>
                    <span className="text-[11px] text-muted">11:35</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <div className="max-w-[88%] rounded-[22px] rounded-br-sm border border-emerald-400/15 bg-[linear-gradient(180deg,rgba(22,111,77,0.96),rgba(18,95,67,0.92))] px-4 py-4 text-sm text-emerald-50 shadow-[0_18px_34px_rgba(0,0,0,0.22)]">
                  <p className="font-medium">{previewData.heading}</p>
                  <div className="mt-4 space-y-2.5">
                    {previewData.lines.map((item) => (
                      <div key={`${item.label}-${item.value}`} className="flex items-start gap-2">
                        <span className="mt-0.5 text-emerald-100">
                          {item.icon}
                        </span>
                        <p className="leading-6">
                          <span className="font-semibold">{item.label}:</span>{" "}
                          <span className={item.value ? "text-white" : "text-emerald-100/80"}>{item.value || "No configurado"}</span>
                        </p>
                      </div>
                    ))}
                  </div>

                  {previewData.customMessage ? (
                    <>
                      <div className="mt-4 h-px bg-white/15" />
                      <p className="mt-4 whitespace-pre-wrap leading-6 text-emerald-50">{previewData.customMessage}</p>
                    </>
                  ) : null}

                  <div className="mt-4 h-px bg-white/15" />
                  <p className="mt-4 leading-6 text-emerald-50">
                    Luego envianos el comprobante por este chat para poder confirmar tu pago.
                  </p>

                  <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-emerald-100/80">
                    <span>11:35</span>
                    <CheckCheck className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Button type="button" variant="secondary" className="w-full justify-center rounded-2xl" disabled>
                <MessageSquare className="mr-2 h-4 w-4" />
                Probar mensaje
              </Button>
              <p className="mt-3 text-sm leading-6 text-muted">
                Preview local con tus datos reales. No hay una simulacion enviable disponible en esta pantalla.
              </p>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] p-5 shadow-[var(--card-shadow)]">
            <div>
              <p className="text-xl font-semibold text-white">Como funciona?</p>
            </div>

            <div className="mt-5 space-y-4">
              {[
                { icon: <CircleHelp className="h-4 w-4" />, text: "El cliente solicita como pagar." },
                { icon: <Wallet className="h-4 w-4" />, text: "El bot comparte tus datos bancarios automaticamente." },
                { icon: <Clipboard className="h-4 w-4" />, text: "El cliente realiza la transferencia." },
                { icon: <CheckCheck className="h-4 w-4" />, text: "El bot solicita el comprobante y continua el flujo." }
              ].map((item, index) => (
                <div key={item.text} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brandBright">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">Paso {index + 1}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-100">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
              <p>Todo el proceso es seguro y se integra con tus automatizaciones.</p>
            </div>
          </section>
        </div>
      </div>

      <div className="sticky bottom-4 z-20 rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,23,0.98))] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
                normalizedCurrent.enabled
                  ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-300"
                  : "border-white/10 bg-white/5 text-muted"
              }`}
            >
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${normalizedCurrent.enabled ? "text-emerald-200" : "text-white"}`}>
                {normalizedCurrent.enabled ? "Cobro activo" : "Cobro inactivo"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {normalizedCurrent.enabled
                  ? "El bot puede compartir tus datos de transferencia."
                  : "El bot no compartira datos bancarios hasta que vuelvas a activar el cobro."}
              </p>
              {feedback.tone ? (
                <p className={`mt-2 text-xs ${feedback.tone === "success" ? "text-emerald-300" : "text-red-200"}`}>{feedback.text}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="secondary" className="rounded-2xl" disabled={!isDirty || isSaving} onClick={resetChanges}>
              Cancelar cambios
            </Button>
            <Button type="submit" className="rounded-2xl px-5" disabled={isSaving || !isDirty}>
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function normalizeText(value: unknown) {
  return String(value || "").trim().normalize("NFC");
}

function normalizeForm(config: PortalBotTransferConfig): PortalBotTransferConfig {
  return {
    ...config,
    enabled: Boolean(config.enabled),
    alias: normalizeText(config.alias),
    cbu: normalizeText(config.cbu).replace(/\s+/g, ""),
    titular: normalizeText(config.titular),
    bank: normalizeText(config.bank),
    instructions: normalizeText(config.instructions),
    destinationId: config.destinationId || null,
    reference: config.reference || null
  };
}

function normalizeFieldErrors(input: unknown): FieldErrors {
  if (!input || typeof input !== "object") return {};
  const safe = input as Record<string, unknown>;
  return {
    general: typeof safe.general === "string" ? safe.general : undefined,
    alias: typeof safe.alias === "string" ? safe.alias : undefined,
    cbu: typeof safe.cbu === "string" ? safe.cbu : undefined
  };
}

function validateTransferForm(form: PortalBotTransferConfig): FieldErrors {
  const errors: FieldErrors = {};

  if (form.enabled && !form.alias && !form.cbu) {
    errors.general = "Para activar transferencia, carga al menos alias o CBU.";
  }

  if (form.alias && !/^[a-z0-9._-]{6,40}$/i.test(form.alias)) {
    errors.alias = "Usa entre 6 y 40 caracteres con letras, numeros, punto, guion o guion bajo.";
  }

  if (form.cbu && !/^\d{22}$/.test(form.cbu)) {
    errors.cbu = "El CBU debe tener 22 digitos numericos.";
  }

  return errors;
}

function buildTransferPreview(config: PortalBotTransferConfig) {
  return {
    heading: config.enabled
      ? "Perfecto. Podes pagar por transferencia con estos datos:"
      : "La transferencia esta desactivada en este momento.",
    lines: [
      { label: "Alias", value: config.alias, icon: <Copy className="h-4 w-4" /> },
      { label: "CBU", value: config.cbu, icon: <CreditCard className="h-4 w-4" /> },
      { label: "Titular", value: config.titular, icon: <Building2 className="h-4 w-4" /> },
      { label: "Banco", value: config.bank, icon: <Wallet className="h-4 w-4" /> }
    ],
    customMessage: config.instructions || ""
  };
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
