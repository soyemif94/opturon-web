"use client";

import { FormEvent, useMemo, useState } from "react";
import { toast } from "@/components/ui/toast";
import type { PortalBotTransferConfig } from "@/lib/api";

type TransferConfigFormProps = {
  initialConfig: PortalBotTransferConfig;
  tenantName?: string;
};

type FieldErrors = {
  general?: string;
  alias?: string;
  cbu?: string;
};

export function TransferConfigForm({ initialConfig, tenantName }: TransferConfigFormProps) {
  const [form, setForm] = useState<PortalBotTransferConfig>(normalizeForm(initialConfig));
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<{ tone: "success" | "error" | null; text: string }>({
    tone: null,
    text: ""
  });

  const previewText = useMemo(() => buildTransferPreview(form), [form]);

  function updateField<K extends keyof PortalBotTransferConfig>(key: K, value: PortalBotTransferConfig[K]) {
    setForm((current) => normalizeForm({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined, general: undefined }));
  }

  async function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const normalizedForm = normalizeForm(form);
    const nextFieldErrors = validateTransferForm(normalizedForm);
    setForm(normalizedForm);
    setFieldErrors(nextFieldErrors);
    setFeedback({ tone: null, text: "" });

    if (Object.keys(nextFieldErrors).length) {
      const message = nextFieldErrors.general || nextFieldErrors.alias || nextFieldErrors.cbu || "Revisá los datos de transferencia.";
      setFeedback({ tone: "error", text: message });
      toast.error("Error de validación", message);
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
        const message = json?.detail || json?.error || "No se pudo guardar la configuración de transferencia.";
        setFieldErrors(nextErrors);
        setFeedback({ tone: "error", text: String(message) });
        toast.error("Error al guardar", String(message));
        return;
      }

      const nextConfig = normalizeForm(json?.settings?.transferConfig || normalizedForm);
      setForm(nextConfig);
      setFieldErrors({});
      setFeedback({ tone: "success", text: "Configuración de transferencia guardada correctamente." });
      toast.success("Cobro por transferencia actualizado");
    } catch {
      setFeedback({ tone: "error", text: "Ocurrió un error de red. Reintentá en unos segundos." });
      toast.error("Error de red", "No pudimos guardar la configuración de transferencia.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="rounded-[24px] border border-[color:var(--border)] bg-card p-5 shadow-sm" onSubmit={save}>
      <h1 className="text-2xl font-semibold">Cobro por transferencia</h1>
      <p className="mt-2 text-sm leading-7 text-muted">
        Definí los datos que el bot usa para cobrar por transferencia y pedir el comprobante sin tocar código.
      </p>

      {tenantName ? (
        <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Espacio actual</p>
          <p className="mt-2 text-base font-semibold">{tenantName}</p>
          <p className="mt-1 text-sm text-muted">Configuración operativa del cobro conversacional</p>
        </div>
      ) : null}

      <section className="mt-5 rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Activar cobro por transferencia</p>
            <p className="mt-1 text-xs leading-6 text-muted">
              Si lo desactivás, el bot deja de ofrecer transferencia en runtime.
            </p>
          </div>
          <label className="inline-flex items-center gap-3 text-sm font-medium">
            <input type="checkbox" checked={form.enabled} onChange={(event) => updateField("enabled", event.target.checked)} />
            {form.enabled ? "Activo" : "Inactivo"}
          </label>
        </div>
        {fieldErrors.general ? <p className="mt-3 text-xs text-red-300">{fieldErrors.general}</p> : null}
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
            <div className="mb-4">
              <p className="text-sm font-semibold">Datos de cobro</p>
              <p className="mt-1 text-xs leading-6 text-muted">
                Cargá al menos alias o CBU si querés dejar la transferencia activa.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="Alias"
                value={form.alias}
                onChange={(value) => updateField("alias", value)}
                hint="Ejemplo: MI.NEGOCIO.VENTAS"
                error={fieldErrors.alias}
              />
              <Field
                label="CBU"
                value={form.cbu}
                onChange={(value) => updateField("cbu", value)}
                hint="22 dígitos numéricos"
                error={fieldErrors.cbu}
              />
              <Field label="Titular" value={form.titular} onChange={(value) => updateField("titular", value)} />
              <Field label="Banco" value={form.bank} onChange={(value) => updateField("bank", value)} />
            </div>
          </section>

          <section className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
            <div className="mb-4">
              <p className="text-sm font-semibold">Mensaje base</p>
              <p className="mt-1 text-xs leading-6 text-muted">
                Opcional. Si lo dejás vacío, el bot usa el mensaje estándar ya validado.
              </p>
            </div>
            <Field
              label="Instrucciones de pago"
              value={form.instructions}
              onChange={(value) => updateField("instructions", value)}
              multiline
              rows={4}
            />
          </section>
        </div>

        <section className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
          <p className="text-sm font-semibold">Preview del mensaje</p>
          <p className="mt-1 text-xs leading-6 text-muted">
            Así se va a ver el mensaje que el bot usa cuando el cliente pide pagar por transferencia.
          </p>
          <pre className="mt-4 whitespace-pre-wrap rounded-2xl border border-[color:var(--border)] bg-bg p-4 text-sm leading-6 text-text">
            {previewText}
          </pre>
          <p className="mt-3 text-xs leading-6 text-muted">
            La referencia se muestra si ya existe en la configuración actual del workspace.
          </p>
        </section>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-[color:var(--border)] pt-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm leading-6 text-muted">
          Esta configuración impacta directo en el mensaje que el bot envía cuando el cliente pide pagar por transferencia.
        </p>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={isSaving} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {isSaving ? "Guardando..." : "Guardar configuración"}
          </button>
          {feedback.tone ? <p className={`text-xs ${feedback.tone === "success" ? "text-green-400" : "text-red-300"}`}>{feedback.text}</p> : null}
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  rows,
  hint,
  error
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  hint?: string;
  error?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-text">{label}</span>
      {multiline ? (
        <textarea
          className="w-full rounded-lg border border-[color:var(--border)] bg-bg p-2"
          rows={rows || 3}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className="w-full rounded-lg border border-[color:var(--border)] bg-bg p-2"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {error ? <span className="text-xs text-red-300">{error}</span> : hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
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
    instructions: normalizeText(config.instructions)
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
    errors.general = "Para activar transferencia, cargá al menos alias o CBU.";
  }

  if (form.alias && !/^[a-z0-9._-]{6,40}$/i.test(form.alias)) {
    errors.alias = "Usá entre 6 y 40 caracteres con letras, números, punto, guion o guion bajo.";
  }

  if (form.cbu && !/^\d{22}$/.test(form.cbu)) {
    errors.cbu = "El CBU debe tener 22 dígitos numéricos.";
  }

  return errors;
}

function buildTransferPreview(config: PortalBotTransferConfig) {
  if (!config.enabled) {
    return "Transferencia desactivada.\n\nMientras esté inactiva, el bot no va a ofrecer alias ni CBU.";
  }

  const lines = [
    "Perfecto.",
    "",
    "Podés pagar por transferencia con estos datos:"
  ];

  if (config.alias) lines.push(`- Alias: ${config.alias}`);
  if (config.cbu) lines.push(`- CBU: ${config.cbu}`);
  if (config.titular) lines.push(`- Titular: ${config.titular}`);
  if (config.bank) lines.push(`- Banco: ${config.bank}`);
  if (config.reference) lines.push(`- Referencia: ${config.reference}`);

  lines.push("");
  lines.push(config.instructions || "Cuando hagas la transferencia, mandame el comprobante por acá y lo dejo registrado.");

  return lines.join("\n");
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
