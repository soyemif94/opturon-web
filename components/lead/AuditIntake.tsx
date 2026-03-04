"use client";

import { useMemo, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { WhatsAppCtaLink } from "@/components/ui/WhatsAppCtaLink";
import { getTrackedWhatsAppLink, isWhatsAppExternalLink } from "@/lib/whatsapp";
import { Input } from "@/components/ui/input";

type PackageInterest = "starter" | "sales-system" | "ops-scale" | "not-sure";
type Objective = "ventas" | "soporte" | "ambos";

type IntakeState = {
  industry: string;
  salesTeamSize: string;
  monthlyInquiries: string;
  crmCurrent: string;
  objective: Objective;
  packageInterest: PackageInterest;
};

const PACKAGE_LABELS: Record<PackageInterest, string> = {
  starter: "Starter",
  "sales-system": "Sales System (recomendado)",
  "ops-scale": "Ops & Scale",
  "not-sure": "No estoy seguro"
};

const INITIAL_STATE: IntakeState = {
  industry: "",
  salesTeamSize: "",
  monthlyInquiries: "",
  crmCurrent: "",
  objective: "ventas",
  packageInterest: "sales-system"
};

function sanitize(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "(no especificado)";
}

export function AuditIntake() {
  const [state, setState] = useState<IntakeState>(INITIAL_STATE);

  const prefill = useMemo(() => {
    return [
      "Hola Opturon. Quiero una auditoría estratégica inicial (15 min) para automatizar WhatsApp comercial e integrarlo con CRM.",
      "",
      `Rubro: ${sanitize(state.industry)}`,
      `Equipo comercial: ${sanitize(state.salesTeamSize)}`,
      `Consultas/mes: ${sanitize(state.monthlyInquiries)}`,
      `CRM actual: ${sanitize(state.crmCurrent)}`,
      `Objetivo: ${sanitize(state.objective)}`,
      `Paquete de interés: ${PACKAGE_LABELS[state.packageInterest]}`,
      "",
      "¿Me indican próximos pasos y disponibilidad?"
    ].join("\n");
  }, [state]);

  const whatsAppLink = getTrackedWhatsAppLink({ origin: "audit-intake", prefill });
  const isExternal = isWhatsAppExternalLink(whatsAppLink);

  function updateField<K extends keyof IntakeState>(field: K, value: IntakeState[K]) {
    setState((prev) => ({ ...prev, [field]: value }));
  }

  function onClickSubmit() {
    trackEvent("audit_intake_submit", { package: state.packageInterest });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold md:text-3xl">Auditoría estratégica inicial (15 min)</h2>
        <p className="mt-2 text-sm text-muted">
          Completá este intake breve para que la conversación por WhatsApp arranque con contexto y próximos pasos.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Rubro">
          <Input value={state.industry} onChange={(e) => updateField("industry", e.target.value)} placeholder="Ej: Salud, Retail, Servicios" />
        </Field>
        <Field label="Equipo comercial (cantidad)">
          <Input value={state.salesTeamSize} onChange={(e) => updateField("salesTeamSize", e.target.value)} placeholder="Ej: 4" />
        </Field>
        <Field label="Consultas/mes aprox">
          <Input value={state.monthlyInquiries} onChange={(e) => updateField("monthlyInquiries", e.target.value)} placeholder="Ej: 150" />
        </Field>
        <Field label="CRM actual (o sin CRM)">
          <Input value={state.crmCurrent} onChange={(e) => updateField("crmCurrent", e.target.value)} placeholder="Ej: HubSpot / Sin CRM" />
        </Field>
      </div>

      <Field label="Objetivo (ventas / soporte / ambos)">
        <div className="grid gap-2 sm:grid-cols-3">
          {["ventas", "soporte", "ambos"].map((item) => (
            <label key={item} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[color:var(--border)] bg-surface/60 px-3 py-2 text-sm text-text">
              <input
                type="radio"
                name="objective"
                value={item}
                checked={state.objective === item}
                onChange={() => updateField("objective", item as Objective)}
                className="accent-[color:var(--brand)]"
              />
              <span className="capitalize">{item}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field label="Paquete de interés">
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(PACKAGE_LABELS) as PackageInterest[]).map((item) => (
            <label key={item} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[color:var(--border)] bg-surface/60 px-3 py-2 text-sm text-text">
              <input
                type="radio"
                name="packageInterest"
                value={item}
                checked={state.packageInterest === item}
                onChange={() => updateField("packageInterest", item)}
                className="accent-[color:var(--brand)]"
              />
              <span>{PACKAGE_LABELS[item]}</span>
            </label>
          ))}
        </div>
      </Field>

      <WhatsAppCtaLink
        href={whatsAppLink}
        origin="audit-intake"
        onClick={onClickSubmit}
        postClickRedirectTo="/gracias"
        openInNewTab
        ariaLabel="Abrir WhatsApp con la auditoría cargada"
        isExternal={isExternal}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-brand transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-brandBright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        Abrir WhatsApp con mi auditoría
      </WhatsAppCtaLink>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-brandBright" />
          Auditoría estratégica inicial (15 min)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-brandBright" />
          Sin compromiso
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-brandBright" />
          Respuesta en el día hábil (lun-vie)
        </span>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">{label}</p>
      {children}
    </div>
  );
}
