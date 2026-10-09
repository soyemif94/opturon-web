"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Check, Crown, LayoutGrid, UsersRound, Warehouse } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PublicPlanDto } from "@/lib/api";

type PlanKey = PublicPlanDto["key"];
type PlanState = "loading" | "ready" | "error";

const planOrder: PlanKey[] = ["core", "growth", "distribution", "enterprise"];

const planPresentation: Record<PlanKey, {
  description: string;
  features: string[];
  icon: LucideIcon;
  cta: string;
}> = {
  core: {
    description: "Ideal para empezar y profesionalizar tu negocio.",
    features: ["WhatsApp e Inbox", "CRM y seguimiento", "Pipeline de venta", "Agenda y recordatorios", "Métricas esenciales"],
    icon: UsersRound,
    cta: "Contratar"
  },
  growth: {
    description: "Más herramientas para hacer crecer tu negocio.",
    features: ["Todo en Core", "Bot estándar", "Instagram", "Catálogo y pedidos", "Automatizaciones comerciales"],
    icon: LayoutGrid,
    cta: "Contratar"
  },
  distribution: {
    description: "Pensado para mayoristas y distribuidoras.",
    features: ["Todo en Growth", "Bot avanzado", "Inventario", "Compras y proveedores", "Reportes para distribuidoras"],
    icon: Warehouse,
    cta: "Contratar"
  },
  enterprise: {
    description: "Una solución a medida para grandes operaciones.",
    features: ["Todo en Distribución", "Bot a medida", "Permisos avanzados", "Implementación personalizada", "Soporte prioritario"],
    icon: Building2,
    cta: "Contactar"
  }
};

function formatPlanPrice(plan: PublicPlanDto) {
  if (plan.pricingMode !== "fixed" || typeof plan.amount !== "number" || !plan.currency) return null;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: plan.currency,
    currencyDisplay: "symbol",
    maximumFractionDigits: 0
  }).format(plan.amount);
}

function formatBillingCadence(cadence: string | null) {
  if (cadence === "monthly") return "mes";
  if (cadence === "yearly" || cadence === "annually") return "año";
  return "período";
}

export function PublicPlanPricing() {
  const [plans, setPlans] = useState<PublicPlanDto[]>([]);
  const [state, setState] = useState<PlanState>("loading");

  const loadPlans = useCallback(async (signal?: AbortSignal) => {
    setState("loading");
    try {
      const response = await fetch("/api/public/plans", { signal, cache: "no-store" });
      if (!response.ok) throw new Error("public_plan_catalog_unavailable");
      const payload = await response.json();
      if (!Array.isArray(payload?.plans)) throw new Error("public_plan_catalog_invalid");
      setPlans(payload.plans);
      setState("ready");
    } catch {
      if (!signal?.aborted) setState("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadPlans(controller.signal);
    return () => controller.abort();
  }, [loadPlans]);

  const orderedPlans = planOrder
    .map((key) => plans.find((plan) => plan.key === key))
    .filter((plan): plan is PublicPlanDto => Boolean(plan));

  return (
    <section id="planes" className="relative isolate overflow-hidden border-y border-white/10 bg-[#07111f] py-24 sm:py-28" aria-labelledby="public-plans-title">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute -left-44 -top-48 h-[38rem] w-[38rem] rounded-full border border-sky-400/20 shadow-[0_0_100px_rgba(14,165,233,0.12)]" />
        <div className="absolute -right-56 top-20 h-[32rem] w-[52rem] rotate-[24deg] rounded-[50%] border border-sky-400/25" />
        <div className="absolute -bottom-72 left-1/3 h-[30rem] w-[70rem] -rotate-[8deg] rounded-[50%] border border-orange-400/25 shadow-[0_0_100px_rgba(249,115,22,0.08)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(14,165,233,0.12),transparent_36%),radial-gradient(circle_at_85%_85%,rgba(249,115,22,0.1),transparent_32%)]" />
      </div>

      <div className="container-opt relative" aria-live="polite" aria-busy={state === "loading"}>
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex items-center justify-center gap-5 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400">
            <span className="h-px w-6 bg-orange-300" aria-hidden="true" />
            <span>Planes</span>
            <span className="h-px w-6 bg-orange-300" aria-hidden="true" />
          </div>
          <h2 id="public-plans-title" className="mt-5 text-balance text-5xl font-semibold tracking-[-0.06em] text-white sm:text-6xl">Planes</h2>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-sky-100/80 sm:text-xl">
            Elegí el plan ideal para tu negocio y activá Opturon en minutos.
          </p>
        </div>

        {state === "loading" ? (
          <div className="mx-auto mt-14 max-w-2xl rounded-2xl border border-white/10 bg-white/[0.05] p-5 text-center text-sm text-slate-300">Cargando planes vigentes…</div>
        ) : state === "error" ? (
          <div className="mx-auto mt-14 flex max-w-2xl flex-wrap items-center justify-center gap-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-5">
            <p className="text-sm text-slate-200">No pudimos cargar los planes. Reintentá en unos segundos.</p>
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-sky-300/50 px-4 text-sm font-semibold text-sky-100 transition hover:bg-sky-300/10"
              aria-label="Reintentar carga de planes"
              onClick={() => { void loadPlans(); }}
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="mt-14 grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {orderedPlans.map((plan) => {
              const presentation = planPresentation[plan.key];
              const Icon = presentation.icon;
              const contact = plan.key === "enterprise" || plan.pricingMode === "contact" || plan.ctaMode === "contact";
              const price = formatPlanPrice(plan);
              const highlighted = plan.key === "growth" || plan.recommended;
              return (
                <article
                  key={plan.key}
                  className={`relative flex min-w-0 flex-col rounded-[1.45rem] border p-6 text-slate-900 shadow-[0_22px_70px_rgba(1,9,20,0.34)] transition-transform duration-300 hover:-translate-y-1 sm:p-7 ${
                    highlighted
                      ? "border-sky-400 bg-[linear-gradient(145deg,#ffffff_0%,#e8f7ff_100%)] shadow-[0_0_0_2px_rgba(14,165,233,0.8),0_25px_80px_rgba(14,165,233,0.28)]"
                      : "border-white/80 bg-[linear-gradient(145deg,#ffffff_0%,#f0f7fb_100%)]"
                  }`}
                >
                  {plan.key === "growth" ? (
                    <div className="absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-sky-300 bg-sky-500 px-4 py-2 text-xs font-bold text-white shadow-[0_8px_22px_rgba(14,165,233,0.42)]">
                      <Crown className="h-3.5 w-3.5" />
                      Más elegido
                    </div>
                  ) : null}

                  <div className="flex min-h-[5.5rem] items-start gap-4">
                    <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 ring-1 ring-inset ring-sky-200">
                      <Icon className="h-7 w-7" strokeWidth={1.8} />
                    </span>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-[#07143c]">{plan.displayName}</h3>
                      <p className="mt-1 text-sm leading-5 text-slate-600">{presentation.description}</p>
                    </div>
                  </div>

                  <div className="mt-8 min-h-14">
                    {contact ? (
                      <p className="text-[2.1rem] font-bold tracking-[-0.045em] text-[#07143c]">A medida</p>
                    ) : price ? (
                      <p className="flex items-baseline gap-1 text-[#07143c]"><span className="text-4xl font-bold tracking-[-0.055em]">{price}</span><span className="text-base text-slate-600">/ {formatBillingCadence(plan.billingCadence)}</span></p>
                    ) : null}
                  </div>

                  <div className="my-6 h-px bg-slate-200" />
                  <ul className="flex-1 space-y-4 text-sm text-[#172b58]">
                    {presentation.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <span className="mt-[-1px] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </span>
                        <span className="pt-0.5">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={contact ? "/contacto" : `/checkout/start?planKey=${encodeURIComponent(plan.key)}`}
                    className={`mt-8 inline-flex min-h-12 items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 ${
                      highlighted ? "bg-sky-500 text-white shadow-[0_8px_22px_rgba(14,165,233,0.25)] hover:bg-sky-600" : "bg-sky-100 text-sky-600 hover:bg-sky-200"
                    }`}
                    aria-label={`${presentation.cta} ${plan.displayName}`}
                  >
                    {presentation.cta}
                    <span aria-hidden="true" className="text-xl leading-none">→</span>
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-sky-100/65 sm:gap-x-8">
          <span>Más clientes</span><span className="text-orange-300" aria-hidden="true">•</span><span>Más ventas</span><span className="text-orange-300" aria-hidden="true">•</span><span>Un negocio más eficiente</span>
        </div>
      </div>
    </section>
  );
}
