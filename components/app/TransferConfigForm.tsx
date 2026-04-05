"use client";

import { FormEvent, useState } from "react";
import { toast } from "@/components/ui/toast";
import type { PortalBotTransferConfig } from "@/lib/api";

type TransferConfigFormProps = {
  initialConfig: PortalBotTransferConfig;
  tenantName?: string;
};

export function TransferConfigForm({ initialConfig, tenantName }: TransferConfigFormProps) {
  const [form, setForm] = useState<PortalBotTransferConfig>(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error" | null; text: string }>({
    tone: null,
    text: ""
  });

  async function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setIsSaving(true);
    setFeedback({ tone: null, text: "" });

    try {
      const response = await fetch("/api/app/settings/transfer-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const json = await safeJson(response);
      if (!response.ok) {
        const message = json?.detail || json?.error || "No se pudo guardar la configuración de transferencia.";
        setFeedback({ tone: "error", text: String(message) });
        toast.error("Error al guardar", String(message));
        return;
      }

      const nextConfig = json?.settings?.transferConfig || form;
      setForm(nextConfig);
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
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))}
            />
            {form.enabled ? "Activo" : "Inactivo"}
          </label>
        </div>
      </section>

      <div className="mt-5 grid gap-5">
        <section className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold">Datos de cobro</p>
            <p className="mt-1 text-xs leading-6 text-muted">
              Cargá al menos alias o CBU si querés dejar la transferencia activa.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Alias" value={form.alias} onChange={(value) => setForm((current) => ({ ...current, alias: value }))} />
            <Field label="CBU" value={form.cbu} onChange={(value) => setForm((current) => ({ ...current, cbu: value }))} />
            <Field label="Titular" value={form.titular} onChange={(value) => setForm((current) => ({ ...current, titular: value }))} />
            <Field label="Banco" value={form.bank} onChange={(value) => setForm((current) => ({ ...current, bank: value }))} />
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
            onChange={(value) => setForm((current) => ({ ...current, instructions: value }))}
            multiline
            rows={4}
          />
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
  rows
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
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
    </label>
  );
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
