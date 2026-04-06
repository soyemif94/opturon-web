"use client";

import { FormEvent, type ReactNode, useMemo, useState } from "react";
import { toast } from "@/components/ui/toast";

type Settings = {
  tenantId?: string;
  profileImageUrl?: string;
  legalName?: string;
  taxId?: string;
  taxIdType?: string;
  vatCondition?: string;
  grossIncomeNumber?: string;
  fiscalAddress?: string;
  city?: string;
  province?: string;
  pointOfSaleSuggested?: string;
  defaultSuggestedFiscalVoucherType?: string;
  accountantEmail?: string;
  accountantName?: string;
  openingHours?: string;
  address?: string;
  deliveryZones?: string;
  paymentMethods?: string;
  policies?: string;
};

const TAX_ID_TYPES = ["NONE", "DNI", "CUIT", "CUIL"] as const;
const VOUCHER_TYPES = ["NONE", "A", "B", "C"] as const;

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
    const values = [
      form.legalName,
      form.taxId,
      form.vatCondition,
      form.fiscalAddress,
      form.pointOfSaleSuggested,
      form.defaultSuggestedFiscalVoucherType,
      form.accountantName,
      form.accountantEmail
    ];
    const completed = values.filter((value) => String(value || "").trim().length > 0 && value !== "NONE").length;
    return { total: values.length, completed, progress: Math.round((completed / values.length) * 100) };
  }, [form]);

  async function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setIsSaving(true);
    setFeedback({ tone: null, text: "" });
    try {
      const response = await fetch("/api/app/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const json = await safeJson(response);
      if (!response.ok) {
        const message = json?.error?.formErrors?.[0] || json?.detail || json?.error || "No se pudieron guardar los datos del negocio.";
        setFeedback({ tone: "error", text: String(message) });
        toast.error("Error al guardar", String(message));
        return;
      }
      setForm(json?.settings || form);
      setFeedback({ tone: "success", text: "Perfil fiscal y operativo guardado correctamente." });
      toast.success("Perfil del negocio actualizado");
    } catch {
      setFeedback({ tone: "error", text: "Ocurrio un error de red. Reintenta en unos segundos." });
      toast.error("Error de red", "No pudimos guardar los datos del negocio.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="rounded-[24px] border border-[color:var(--border)] bg-card p-5 shadow-sm" onSubmit={save}>
      <h1 className="text-2xl font-semibold">Perfil fiscal y operativo del negocio</h1>
      <p className="mt-2 text-sm leading-7 text-muted">
        Este perfil alimenta por default los comprobantes internos y reduce la carga manual documento por documento.
      </p>
      {tenantName || tenantIndustry ? (
        <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Espacio actual</p>
          <p className="mt-2 text-base font-semibold">{tenantName || "Tu negocio"}</p>
          <p className="mt-1 text-sm text-muted">{tenantIndustry || "Operacion comercial"}</p>
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Checklist contable</p>
            <p className="mt-1 text-base font-semibold">
              {completion.completed} de {completion.total} bloques fiscales completos
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
        <Section title="Perfil fiscal del emisor" helper="Estos datos se usan como fuente por default para los comprobantes internos nuevos.">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Razon social" value={form.legalName || ""} onChange={(v) => setForm((p) => ({ ...p, legalName: v }))} />
            <Field label="CUIT / DNI" value={form.taxId || ""} onChange={(v) => setForm((p) => ({ ...p, taxId: v }))} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <SelectField label="Tipo ID" value={form.taxIdType || "NONE"} onChange={(v) => setForm((p) => ({ ...p, taxIdType: v }))} options={TAX_ID_TYPES} />
            <Field label="Condicion IVA" value={form.vatCondition || ""} onChange={(v) => setForm((p) => ({ ...p, vatCondition: v }))} />
            <Field label="Ingresos Brutos" value={form.grossIncomeNumber || ""} onChange={(v) => setForm((p) => ({ ...p, grossIncomeNumber: v }))} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Direccion fiscal" value={form.fiscalAddress || ""} onChange={(v) => setForm((p) => ({ ...p, fiscalAddress: v }))} />
            <Field label="Ciudad" value={form.city || ""} onChange={(v) => setForm((p) => ({ ...p, city: v }))} />
            <Field label="Provincia" value={form.province || ""} onChange={(v) => setForm((p) => ({ ...p, province: v }))} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Punto de venta sugerido" value={form.pointOfSaleSuggested || ""} onChange={(v) => setForm((p) => ({ ...p, pointOfSaleSuggested: v }))} />
            <SelectField
              label="Comprobante sugerido por default"
              value={form.defaultSuggestedFiscalVoucherType || "NONE"}
              onChange={(v) => setForm((p) => ({ ...p, defaultSuggestedFiscalVoucherType: v }))}
              options={VOUCHER_TYPES}
            />
          </div>
        </Section>

        <Section title="Contacto con contador" helper="Sirve para cerrar mejor el flujo de entrega al estudio contable.">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nombre del contador" value={form.accountantName || ""} onChange={(v) => setForm((p) => ({ ...p, accountantName: v }))} />
            <Field label="Email del contador" value={form.accountantEmail || ""} onChange={(v) => setForm((p) => ({ ...p, accountantEmail: v }))} />
          </div>
        </Section>

        <Section title="Operacion del negocio" helper="Se mantiene la ficha operativa de Fase 1 para inbox, ventas y automatizaciones.">
          <div className="grid gap-3">
            <Field label="Imagen del negocio (URL)" value={form.profileImageUrl || ""} onChange={(v) => setForm((p) => ({ ...p, profileImageUrl: v }))} />
            {(form.profileImageUrl || "").trim() ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-bg/70 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Preview</p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-surface/60">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.profileImageUrl} alt={form.legalName || tenantName || "Negocio"} className="h-full w-full object-cover" />
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border border-[color:var(--border)] px-3 py-2 text-sm text-muted"
                    onClick={() => setForm((p) => ({ ...p, profileImageUrl: "" }))}
                  >
                    Quitar imagen
                  </button>
                </div>
              </div>
            ) : null}
            <Field label="Horarios" value={form.openingHours || ""} onChange={(v) => setForm((p) => ({ ...p, openingHours: v }))} />
            <Field label="Direccion operativa" value={form.address || ""} onChange={(v) => setForm((p) => ({ ...p, address: v }))} />
            <Field label="Zonas de entrega o atencion" value={form.deliveryZones || ""} onChange={(v) => setForm((p) => ({ ...p, deliveryZones: v }))} multiline />
            <Field label="Medios de pago" value={form.paymentMethods || ""} onChange={(v) => setForm((p) => ({ ...p, paymentMethods: v }))} />
            <Field label="Politicas" value={form.policies || ""} onChange={(v) => setForm((p) => ({ ...p, policies: v }))} multiline rows={4} />
          </div>
        </Section>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-[color:var(--border)] pt-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm leading-6 text-muted">
          Lo que cargues aqui se toma como default del emisor en los comprobantes nuevos, sin reescribir historicos.
        </p>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={isSaving} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {isSaving ? "Guardando..." : "Guardar perfil"}
          </button>
          {feedback.tone ? <p className={`text-xs ${feedback.tone === "success" ? "text-green-400" : "text-red-300"}`}>{feedback.text}</p> : null}
        </div>
      </div>
    </form>
  );
}

function Section({ title, helper, children }: { title: string; helper: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
      <div className="mb-4">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs leading-6 text-muted">{helper}</p>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
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
  onChange: (v: string) => void;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-text">{label}</span>
      {multiline ? (
        <textarea className="w-full rounded-lg border border-[color:var(--border)] bg-bg p-2" rows={rows || 3} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="w-full rounded-lg border border-[color:var(--border)] bg-bg p-2" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-text">{label}</span>
      <select className="w-full rounded-lg border border-[color:var(--border)] bg-bg p-2" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
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
