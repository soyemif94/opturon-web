"use client";

import { useState } from "react";

type Settings = {
  openingHours?: string;
  address?: string;
  deliveryZones?: string;
  paymentMethods?: string;
  policies?: string;
};

export function BusinessSettingsForm({ initialSettings }: { initialSettings: Settings }) {
  const [form, setForm] = useState<Settings>(initialSettings || {});
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaved(false);
    const response = await fetch("/api/app/business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (!response.ok) return;
    setSaved(true);
  }

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-card p-5">
      <h1 className="text-2xl font-semibold">Datos del negocio</h1>
      <div className="mt-4 grid gap-3">
        <Field label="Horarios" value={form.openingHours || ""} onChange={(v) => setForm((p) => ({ ...p, openingHours: v }))} />
        <Field label="Dirección" value={form.address || ""} onChange={(v) => setForm((p) => ({ ...p, address: v }))} />
        <Field label="Zonas de entrega" value={form.deliveryZones || ""} onChange={(v) => setForm((p) => ({ ...p, deliveryZones: v }))} />
        <Field label="Medios de pago" value={form.paymentMethods || ""} onChange={(v) => setForm((p) => ({ ...p, paymentMethods: v }))} />
        <Field label="Políticas" value={form.policies || ""} onChange={(v) => setForm((p) => ({ ...p, policies: v }))} multiline />
      </div>
      <button onClick={save} className="mt-4 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white">Guardar</button>
      {saved ? <p className="mt-2 text-xs text-green-400">Guardado</p> : null}
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

