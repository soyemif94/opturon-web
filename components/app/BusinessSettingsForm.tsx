"use client";

import { FormEvent, useMemo, useState } from "react";
import { toast } from "@/components/ui/toast";

type Settings = {
  tenantId?: string;
  openingHours?: string;
  address?: string;
  deliveryZones?: string;
  paymentMethods?: string;
  policies?: string;
};

export function BusinessSettingsForm({
  initialSettings,
  tenantName,
  tenantIndustry
}: {
  initialSettings: Settings;
  tenantName?: string;
  tenantIndustry?: string;
}) {
  const [form, setForm] = useState<Settings>(initialSettings || {});
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error" | null; text: string }>({
    tone: null,
    text: ""
  });
  const completion = useMemo(() => {
    const values = [form.openingHours, form.address, form.deliveryZones, form.paymentMethods, form.policies];
    const total = values.length;
    const completed = values.filter((value) => String(value || "").trim().length > 0).length;
    return {
      total,
      completed,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [form]);

  async function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const hasAnyValue = Object.values(form).some((value) => String(value || "").trim().length > 0);
    if (!hasAnyValue) {
      setFeedback({ tone: "error", text: "Completa al menos un dato del negocio antes de guardar." });
      toast.error("No hay cambios utiles para guardar");
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
      setFeedback({ tone: "error", text: "Ocurrio un error de red. Reintenta en unos segundos." });
      toast.error("Error de red", "No pudimos guardar los datos del negocio.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="rounded-[24px] border border-[color:var(--border)] bg-card p-5 shadow-sm" onSubmit={save}>
      <h1 className="text-2xl font-semibold">Datos principales del negocio</h1>
      <p className="mt-2 text-sm leading-7 text-muted">
        Mantener este perfil actualizado ayuda a responder mejor en WhatsApp, ordenar la operacion y darle mas contexto al bot y al equipo.
      </p>
      {tenantName || tenantIndustry ? (
        <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Perfil actual</p>
          <p className="mt-2 text-base font-semibold">{tenantName || "Tu negocio"}</p>
          <p className="mt-1 text-sm text-muted">{tenantIndustry || "Operacion comercial"}</p>
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Checklist del perfil</p>
            <p className="mt-1 text-base font-semibold">
              {completion.completed} de {completion.total} bloques completados
            </p>
            <p className="mt-1 text-sm text-muted">
              Completa lo esencial para que el canal, el inbox y las automatizaciones trabajen con mejor contexto.
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--border)] bg-bg px-4 py-3 text-sm">
            <p className="text-muted">Estado actual</p>
            <p className="mt-1 font-semibold">{completion.progress}% completo</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/6">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.max(completion.progress, completion.completed > 0 ? 8 : 0)}%` }} />
        </div>
      </div>

      <div className="mt-5 grid gap-5">
        <section className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Atencion y operacion</p>
              <p className="mt-1 text-xs leading-6 text-muted">Define cuando atiendes y en que zonas operas para responder con mayor claridad.</p>
            </div>
            <span className="rounded-full border border-[color:var(--border)] bg-bg px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-muted">
              Basico
            </span>
          </div>
          <div className="grid gap-3">
            <Field
              label="Horarios"
              helper="Ejemplo: Lun a Vie de 9 a 18 hs, Sab de 10 a 13 hs."
              placeholder="Lun a Vie 9 a 18 hs"
              value={form.openingHours || ""}
              onChange={(v) => setForm((p) => ({ ...p, openingHours: v }))}
            />
            <Field
              label="Direccion"
              helper="Sirve para orientar visitas, retiro en local o consultas de ubicacion."
              placeholder="Av. Ejemplo 123, Bahia Blanca"
              value={form.address || ""}
              onChange={(v) => setForm((p) => ({ ...p, address: v }))}
            />
            <Field
              label="Zonas de entrega o atencion"
              helper="Indica barrios, ciudades o area de cobertura."
              placeholder="Bahia Blanca centro, Palihue, Villa Mitre"
              value={form.deliveryZones || ""}
              onChange={(v) => setForm((p) => ({ ...p, deliveryZones: v }))}
              multiline
            />
          </div>
        </section>

        <section className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Condiciones comerciales</p>
              <p className="mt-1 text-xs leading-6 text-muted">Estos datos ayudan a responder mejor sobre pagos, condiciones y reglas del negocio.</p>
            </div>
            <span className="rounded-full border border-[color:var(--border)] bg-bg px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-muted">
              Recomendado
            </span>
          </div>
          <div className="grid gap-3">
            <Field
              label="Medios de pago"
              helper="Aclara metodos disponibles para evitar consultas repetidas."
              placeholder="Transferencia, debito, credito, efectivo"
              value={form.paymentMethods || ""}
              onChange={(v) => setForm((p) => ({ ...p, paymentMethods: v }))}
            />
            <Field
              label="Politicas"
              helper="Incluye cambios, devoluciones, senas o condiciones importantes."
              placeholder="Cambios dentro de las 72 hs con ticket. Senas no reembolsables."
              value={form.policies || ""}
              onChange={(v) => setForm((p) => ({ ...p, policies: v }))}
              multiline
              rows={4}
            />
          </div>
        </section>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-[color:var(--border)] pt-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm leading-6 text-muted">
          Guarda esta ficha para que el equipo y las automatizaciones respondan con mejor contexto desde el primer mensaje.
        </p>
        <div className="flex items-center gap-3">
        <button
          type="submit"
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
    </form>
  );
}

function Field({
  label,
  helper,
  placeholder,
  value,
  onChange,
  multiline,
  rows
}: {
  label: string;
  helper?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-text">{label}</span>
      {helper ? <span className="text-xs leading-5 text-muted">{helper}</span> : null}
      {multiline ? (
        <textarea
          className="w-full rounded-lg border border-[color:var(--border)] bg-bg p-2"
          rows={rows || 3}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="w-full rounded-lg border border-[color:var(--border)] bg-bg p-2"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
