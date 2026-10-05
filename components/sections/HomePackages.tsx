"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, MessageCircle } from "lucide-react";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { Section } from "@/components/ui/Section";
import { getCardGlowClass } from "@/components/ui/card";

const stages = [
  {
    name: "Ordenar el ingreso",
    description:
      "Para negocios que ya reciben consultas, pero todavia trabajan cada chat por separado y sin criterio comun.",
    bullets: ["Inbox centralizado", "Contactos con contexto", "Primer seguimiento visible"],
    featured: false
  },
  {
    name: "Activar el seguimiento",
    description:
      "Para equipos que ya venden por WhatsApp, pero necesitan priorizar mejor, responder a tiempo y mover oportunidades con ritmo.",
    bullets: ["Pipeline comercial claro", "Tareas y recordatorios", "Seguimiento automatizado"],
    featured: true
  },
  {
    name: "Escalar sin perder control",
    description:
      "Para operaciones que ya tienen volumen y necesitan mas visibilidad, mas trazabilidad y menos dependencia de memoria humana.",
    bullets: ["Mas usuarios y conversaciones", "Mas control del flujo comercial", "Mas trazabilidad operativa"],
    featured: false
  }
];

type PublicPlan = {
  key: string;
  displayName: string;
  description: string;
  pricingMode: "fixed" | "contact";
  amount: number | null;
  currency: string | null;
  billingCadence: string | null;
  highlights: string[];
  recommended: boolean;
  ctaMode: "select_plan" | "contact";
};

function formatPlanPrice(plan: PublicPlan) {
  if (plan.pricingMode !== "fixed" || typeof plan.amount !== "number" || !plan.currency) return null;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: plan.currency,
    maximumFractionDigits: 0
  }).format(plan.amount);
}

function formatBillingCadence(cadence: string | null) {
  if (cadence === "monthly") return "mes";
  if (cadence === "yearly" || cadence === "annually") return "año";
  return "período";
}

export function HomePackages() {
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [plansState, setPlansState] = useState<"loading" | "ready" | "error">("loading");

  const loadPlans = useCallback(async (signal?: AbortSignal) => {
    setPlansState("loading");
    try {
      const response = await fetch("/api/public/plans", { signal, cache: "no-store" });
      if (!response.ok) throw new Error("public_plan_catalog_unavailable");
      const payload = await response.json();
      if (!Array.isArray(payload?.plans)) throw new Error("public_plan_catalog_invalid");
      setPlans(payload.plans);
      setPlansState("ready");
    } catch {
      if (!signal?.aborted) setPlansState("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadPlans(controller.signal);
    return () => controller.abort();
  }, [loadPlans]);

  return (
    <Section id="planes">
      <div className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">Etapas de implementacion</p>
        <h2 className="mt-3 text-balance text-3xl font-semibold md:text-5xl">
          Ubica rapido que nivel de sistema necesita hoy tu negocio
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
          No se trata de elegir un plan bonito. Se trata de entender en que punto esta hoy tu operacion comercial y
          cual es el siguiente nivel de orden que te conviene implementar.
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {stages.map((stage) => (
          <article
            key={stage.name}
            className={`rounded-[2rem] border p-7 ${getCardGlowClass("orange")} ${
              stage.featured
                ? "border-brand/40 bg-[linear-gradient(180deg,rgba(176,80,0,0.16),rgba(31,31,31,0.96))]"
                : "border-[color:var(--border)] bg-card/90"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold">{stage.name}</h3>
                <p className="mt-3 text-sm leading-7 text-muted">{stage.description}</p>
              </div>
              {stage.featured ? (
                <span className="rounded-full border border-brand/40 bg-brand/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brandBright">
                  Etapa mas comun
                </span>
              ) : null}
            </div>

            <div className="mt-8 grid gap-3">
              {stage.bullets.map((bullet) => (
                <div key={bullet} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-text">
                  {bullet}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <PrimaryButton href="/demo#planes-demo" ariaLabel="Ver el recorrido comercial y los niveles de servicio">
          Ver recorrido comercial
          <ArrowRight className="ml-2 h-4 w-4" />
        </PrimaryButton>
        <SecondaryButton href="/demo#demo-intake" ariaLabel="Ir al paso para ubicar la etapa ideal">
          <MessageCircle className="whatsapp-accent-icon mr-2 h-4 w-4" />
          Quiero ubicar mi etapa
        </SecondaryButton>
      </div>

      <p className="mt-4 text-xs text-muted">
        Primero ubicamos la etapa correcta. Despues definimos la configuracion que mejor encaja con tu operacion.
      </p>

      <div className="mt-16" aria-live="polite" aria-busy={plansState === "loading"}>
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">Planes Opturon</p>
          <h3 className="mt-3 text-2xl font-semibold md:text-4xl">Elegí cómo empezar</h3>
          <p className="mt-3 text-sm leading-7 text-muted">
            Capacidades y valores vigentes servidos desde el catálogo oficial de Opturon.
          </p>
        </div>

        {plansState === "loading" ? (
          <p className="mt-6 rounded-2xl border border-[color:var(--border)] bg-card/70 p-5 text-sm text-muted">Cargando planes vigentes…</p>
        ) : plansState === "error" ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
            <p className="text-sm text-muted">No pudimos cargar los planes. Reintentá en unos segundos.</p>
            <button type="button" className="inline-flex h-11 items-center justify-center rounded-xl border border-brand/40 bg-transparent px-5 text-sm font-semibold text-text transition-all hover:border-brand/70 hover:bg-brand/10" aria-label="Reintentar carga de planes" onClick={() => { void loadPlans(); }}>
              Reintentar
            </button>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 lg:grid-cols-4">
            {plans.map((plan) => {
              const contact = plan.pricingMode === "contact" || plan.ctaMode === "contact";
              const price = formatPlanPrice(plan);
              return (
                <article
                  key={plan.key}
                  className={`flex flex-col rounded-[2rem] border p-6 ${getCardGlowClass("orange")} ${
                    plan.recommended
                      ? "border-brand/40 bg-[linear-gradient(180deg,rgba(176,80,0,0.16),rgba(31,31,31,0.96))]"
                      : "border-[color:var(--border)] bg-card/90"
                  }`}
                >
                  <div className="flex min-h-10 items-start justify-between gap-3">
                    <h4 className="text-xl font-semibold">{plan.displayName}</h4>
                    {plan.recommended ? (
                      <span className="rounded-full border border-brand/40 bg-brand/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-brandBright">Recomendado</span>
                    ) : null}
                  </div>
                  <p className="mt-3 min-h-14 text-sm leading-6 text-muted">{plan.description}</p>
                  <div className="mt-5 min-h-14">
                    {contact ? (
                      <p className="text-2xl font-semibold">A medida</p>
                    ) : price ? (
                      <p className="text-2xl font-semibold">{price}<span className="ml-1 text-xs font-normal text-muted">/ {formatBillingCadence(plan.billingCadence)}</span></p>
                    ) : null}
                    {contact ? <p className="mt-1 text-xs text-muted">Precio según la operación</p> : null}
                  </div>
                  <ul className="mt-5 flex-1 space-y-2 text-sm text-text">
                    {plan.highlights.map((highlight) => <li key={highlight} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">{highlight}</li>)}
                  </ul>
                  <PrimaryButton
                    href={contact ? "/contacto" : `/checkout/start?planKey=${encodeURIComponent(plan.key)}`}
                    className="mt-6 w-full justify-center"
                    ariaLabel={contact ? `Contactar por ${plan.displayName}` : `Contratar ${plan.displayName}`}
                  >
                    {contact ? "Solicitar demo" : "Contratar"}
                  </PrimaryButton>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Section>
  );
}
