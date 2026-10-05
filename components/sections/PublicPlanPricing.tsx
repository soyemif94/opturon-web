"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { PublicPlanDto } from "@/lib/api";

type PlanState = "loading" | "ready" | "error";

function formatPlanPrice(plan: PublicPlanDto) {
  if (plan.pricingMode !== "fixed" || typeof plan.amount !== "number" || !plan.currency) return null;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: plan.currency,
    currencyDisplay: "code",
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

  return (
    <section id="planes" className="border-y border-white/10 bg-[#0b111a] py-20 sm:py-24" aria-labelledby="public-plans-title">
      <div className="container-opt" aria-live="polite" aria-busy={state === "loading"}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">Planes Opturon</p>
          <h2 id="public-plans-title" className="mt-3 text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">Elegí cómo empezar</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            Capacidades y valores vigentes servidos desde el catálogo oficial de Opturon.
          </p>
        </div>

        {state === "loading" ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center text-sm text-slate-400">Cargando planes vigentes…</div>
        ) : state === "error" ? (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-5">
            <p className="text-sm text-slate-300">No pudimos cargar los planes. Reintentá en unos segundos.</p>
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-orange-300/40 px-4 text-sm font-semibold text-orange-200 transition hover:bg-orange-300/10"
              aria-label="Reintentar carga de planes"
              onClick={() => { void loadPlans(); }}
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => {
              const contact = plan.pricingMode === "contact" || plan.ctaMode === "contact";
              const price = formatPlanPrice(plan);
              return (
                <article
                  key={plan.key}
                  className={`flex min-w-0 flex-col rounded-3xl border p-5 sm:p-6 ${
                    plan.recommended
                      ? "border-orange-400/40 bg-[linear-gradient(180deg,rgba(249,115,22,0.13),rgba(10,16,24,0.94))] shadow-[0_20px_70px_rgba(249,115,22,0.08)]"
                      : "border-white/10 bg-white/[0.035]"
                  }`}
                >
                  <div className="flex min-h-9 items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-white sm:text-xl">{plan.displayName}</h3>
                    {plan.recommended ? <span className="shrink-0 rounded-full border border-orange-300/30 bg-orange-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-orange-200">Recomendado</span> : null}
                  </div>
                  <p className="mt-3 min-h-14 text-sm leading-6 text-slate-400">{plan.description}</p>
                  <div className="mt-4 min-h-12">
                    {contact ? (
                      <p className="text-2xl font-semibold text-white">A medida</p>
                    ) : price ? (
                      <p className="text-2xl font-semibold text-white">{price}<span className="ml-1 text-xs font-normal text-slate-400">/ {formatBillingCadence(plan.billingCadence)}</span></p>
                    ) : null}
                    {contact ? <p className="mt-1 text-xs text-slate-500">Precio según la operación</p> : null}
                  </div>
                  <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-300">
                    {plan.highlights.map((highlight) => <li key={highlight} className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">{highlight}</li>)}
                  </ul>
                  <Link
                    href={contact ? "/contacto" : `/checkout/start?planKey=${encodeURIComponent(plan.key)}`}
                    className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b111a]"
                    aria-label={contact ? `Contactar por ${plan.displayName}` : `Contratar ${plan.displayName}`}
                  >
                    {contact ? "Solicitar demo" : "Contratar"}
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
