"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type FormState = {
  name: string;
  company: string;
  email: string;
  phone: string;
  message: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

const INITIAL_STATE: FormState = {
  name: "",
  company: "",
  email: "",
  phone: "",
  message: ""
};

const STORAGE_KEY = "opturon_contact_lead";

export function ContactLeadForm() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = useMemo(() => !loading, [loading]);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSuccess(null);
  }

  function validate() {
    const nextErrors: Errors = {};
    if (!form.name.trim()) nextErrors.name = "Ingresá tu nombre.";
    if (!form.email.trim()) nextErrors.email = "Ingresá tu email.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = "Email inválido.";
    if (!form.message.trim()) nextErrors.message = "Contanos tu objetivo.";
    if (form.message.trim().length > 0 && form.message.trim().length < 10) {
      nextErrors.message = "El mensaje debe tener al menos 10 caracteres.";
    }
    return nextErrors;
  }

  function buildMailtoLink() {
    const lines = [
      `Nombre: ${form.name || "-"}`,
      `Empresa: ${form.company || "-"}`,
      `Email: ${form.email || "-"}`,
      `WhatsApp/Teléfono: ${form.phone || "-"}`,
      "",
      "Mensaje:",
      form.message || "-"
    ];

    const subject = encodeURIComponent("Consulta desde opturon.com");
    const body = encodeURIComponent(lines.join("\n"));
    return `mailto:contacto@opturon.com?subject=${subject}&body=${body}`;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setLoading(true);

    const payload = {
      ...form,
      timestamp: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    setSuccess(
      "Listo. Recibimos tu consulta y te respondemos a la brevedad. Si querés acelerar, escribinos por WhatsApp."
    );
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm text-muted">Nombre *</label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Tu nombre"
            aria-invalid={Boolean(errors.name)}
            required
          />
          {errors.name ? <p className="text-xs text-red-400">{errors.name}</p> : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="company" className="text-sm text-muted">Empresa</label>
          <Input
            id="company"
            value={form.company}
            onChange={(e) => updateField("company", e.target.value)}
            placeholder="Nombre de tu empresa"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm text-muted">Email *</label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="tu@email.com"
            aria-invalid={Boolean(errors.email)}
            required
          />
          {errors.email ? <p className="text-xs text-red-400">{errors.email}</p> : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm text-muted">WhatsApp / Teléfono</label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="+54 9 ..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="message" className="text-sm text-muted">Mensaje / Objetivo *</label>
        <Textarea
          id="message"
          value={form.message}
          onChange={(e) => updateField("message", e.target.value)}
          placeholder="Contanos qué querés automatizar y tu objetivo."
          aria-invalid={Boolean(errors.message)}
          required
        />
        {errors.message ? <p className="text-xs text-red-400">{errors.message}</p> : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-brand transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-brandBright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Enviando..." : "Enviar"}
        </button>

        <a
          href={buildMailtoLink()}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-brand/40 bg-transparent px-5 text-sm font-semibold text-text transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-brand/70 hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          Enviar por email
        </a>
      </div>

      {success ? <p className="text-sm text-emerald-300">{success}</p> : null}
    </form>
  );
}
