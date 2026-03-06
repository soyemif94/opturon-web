"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";

type Settings = {
  openingHours?: string;
  address?: string;
  deliveryZones?: string;
  paymentMethods?: string;
  policies?: string;
};

export function BusinessSettingsForm({ initialSettings }: { initialSettings: Settings }) {
  const [form, setForm] = useState<Settings>(initialSettings || {});
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error" | null; text: string }>({ tone: null, text: "" });

  async function save() {
    const hasAnyValue = Object.values(form).some((value) => String(value || "").trim().length > 0);
    if (!hasAnyValue) {
      setFeedback({ tone: "error", text: "Completá al menos un dato del negocio antes de guardar." });
      toast.error("No hay cambios útiles para guardar");
      return;
    }

    setIsSaving(true);
    setFeedback({ tone: null, text: "" });

    try {
      const response = await fetch("/api/app/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        const json = await safeJson(response);
        const message = json?.error?.formErrors?.[0] || json?.error || "No se pudieron guardar los datos del negocio.";
        setFeedback({ tone: "error", text: String(message) });
        toast.error("Error al guardar", String(message));
        return;
      }

      setFeedback({ tone: "success", text: "Datos del negocio guardados correctamente." });
      toast.success("Datos del negocio actualizados");
    } catch {
      setFeedback({ tone: "error", text: "Ocurrio un error de red. Reintentá en unos segundos." });
      toast.error("Error de red", "No pudimos guardar los datos del negocio.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-card p-5">
      <h1 className="text-2xl font-semibold">Datos del negocio</h1>
      <p className="mt-2 text-sm text-muted">Completá la informacion que el bot y el equipo necesitan para responder mejor.</p>
      <div className="mt-4 grid gap-3">
        <Field label="Horarios" value={form.openingHours || ""} onChange={(v) => setForm((p) => ({ ...p, openingHours: v }))} />
        <Field label="Dirección" value={form.address || ""} onChange={(v) => setForm((p) => ({ ...p, address: v }))} />
        <Field label="Zonas de entrega" value={form.deliveryZones || ""} onChange={(v) => setForm((p) => ({ ...p, deliveryZones: v }))} />
        <Field label="Medios de pago" value={form.paymentMethods || ""} onChange={(v) => setForm((p) => ({ ...p, paymentMethods: v }))} />
        <Field label="Políticas" value={form.policies || ""} onChange={(v) => setForm((p) => ({ ...p, policies: v }))} multiline />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={isSaving}
          className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isSaving ? "Guardando..." : "Guardar"}
        </button>
        {feedback.tone ? (
          <p className={`text-xs ${feedback.tone === "success" ? "text-green-400" : "text-red-300"}`}>{feedback.text}</p>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-muted">{label}</span>
      {multiline ? (
        <textarea className="w-full rounded-lg border border-[color:var(--border)] bg-bg p-2" rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="w-full rounded-lg border border-[color:var(--border)] bg-bg p-2" value={value} onChange={(e) => onChange(e.target.value)} />
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
