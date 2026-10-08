"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { PublicPlanDto } from "@/lib/api";

type PlanKey = PublicPlanDto["key"];
type PlanState = "loading" | "ready" | "error";

const planOrder: PlanKey[] = ["core", "growth", "distribution", "enterprise"];

const planPresentation: Record<PlanKey, {
  positioning: string;
  features: string[];
  bot: string;
  cta: string;
}> = {
  core: {
    positioning: "La base para ordenar y hacer crecer tu gestión comercial.",
    features: [
      "WhatsApp e Inbox — Centralizá las conversaciones con tus clientes y atendelas desde Opturon.",
      "CRM y seguimiento — Organizá contactos, historial y oportunidades para no perder ventas.",
      "Pipeline de ventas — Visualizá cada oportunidad según la etapa comercial en la que se encuentra.",
      "Agenda y recordatorios — Coordiná tareas, seguimientos y compromisos comerciales.",
      "Métricas esenciales — Consultá los principales indicadores de actividad y ventas."
    ],
    bot: "Gestión comercial sin bot IA autónomo.",
    cta: "Comenzar con Core"
  },
  growth: {
    positioning: "Automatizá la operación comercial y convertí más oportunidades.",
    features: [
      "Todo lo de Core",
      "Instagram e Inbox omnicanal — Gestioná tus conversaciones desde todos tus canales.",
      "Asistente IA",
      "Catálogo y pedidos",
      "Cobros y caja",
      "Automatizaciones",
      "Fidelización",
      "Métricas de crecimiento"
    ],
    bot: "Bot IA Standard",
    cta: "Elegir Growth"
  },
  distribution: {
    positioning: "Controlá el stock y la operación de distribución desde un solo lugar.",
    features: [
      "Todo lo de Growth",
      "Inventario",
      "Compras y proveedores",
      "Vendedores",
      "Lotes y vencimientos",
      "Alertas operativas",
      "Reportes avanzados",
      "IA avanzada"
    ],
    bot: "Bot IA Avanzado",
    cta: "Elegir Distribución"
  },
  enterprise: {
    positioning: "Adaptá Opturon a la complejidad y escala de tu operación.",
    features: [
      "Todo lo de Distribución",
      "Configuración avanzada",
      "IA personalizada",
      "Permisos avanzados",
      "Implementación acompañada"
    ],
    bot: "Configuración de IA a medida",
    cta: "Hablar con Opturon"
  }
};

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

  const orderedPlans = planOrder
    .map((key) => plans.find((plan) => plan.key === key))
    .filter((plan): plan is PublicPlanDto => Boolean(plan));

  return (
    <section id="planes" className="border-y border-white/10 bg-[#0b111a] py-20 sm:py-24" aria-labelledby="public-plans-title">
      <div className="container-opt" aria-live="polite" aria-busy={state === "loading"}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Planes</p>
          <h2 id="public-plans-title" className="mt-3 text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">Elegí el plan ideal para tu negocio y activá Opturon en minutos.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            Empezá con las herramientas que tu operación necesita hoy y escalá cuando estés listo.
          </p>
        </div>

        {state === "loading" ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center text-sm text-slate-400">Cargando planes vigentes…</div>
        ) : state === "error" ? (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-5">
            <p className="text-sm text-slate-300">No pudimos cargar los planes. Reintentá en unos segundos.</p>
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-cyan-300/40 px-4 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-300/10"
              aria-label="Reintentar carga de planes"
              onClick={() => { void loadPlans(); }}
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {orderedPlans.map((plan) => {
              const presentation = planPresentation[plan.key];
              const contact = plan.key === "enterprise" || plan.pricingMode === "contact" || plan.ctaMode === "contact";
              const price = formatPlanPrice(plan);
              return (
                <article
                  key={plan.key}
                  className={`flex min-w-0 flex-col rounded-3xl border p-5 sm:p-6 ${
                    plan.recommended
                      ? "border-cyan-300/60 bg-[linear-gradient(180deg,rgba(34,211,238,0.16),rgba(10,16,24,0.96))] shadow-[0_20px_70px_rgba(34,211,238,0.12)]"
                      : "border-white/10 bg-white/[0.035]"
                  }`}
                >
                  <div className="flex min-h-9 items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-white sm:text-xl">{plan.displayName}</h3>
                    {plan.key === "growth" ? <span className="shrink-0 rounded-full border border-cyan-300/40 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-100">Más elegido</span> : null}
                  </div>
                  <p className="mt-3 min-h-14 text-sm leading-6 text-slate-400">{presentation.positioning}</p>
                  <div className="mt-4 min-h-12">
                    {contact ? (
                      <p className="text-2xl font-semibold text-white">A medida</p>
                    ) : price ? (
                      <p className="text-2xl font-semibold text-white">{price}<span className="ml-1 text-xs font-normal text-slate-400">/ {formatBillingCadence(plan.billingCadence)}</span></p>
                    ) : null}
                    {contact ? <p className="mt-1 text-xs text-slate-500">Precio según la operación</p> : null}
                  </div>
                  <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-300">
                    {presentation.features.map((feature) => <li key={feature} className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">{feature}</li>)}
                    <li className="rounded-xl border border-cyan-300/10 bg-cyan-300/[0.04] px-3 py-2 text-cyan-100">{presentation.bot}</li>
                  </ul>
                  <Link
                    href={contact ? "/contacto" : `/checkout/start?planKey=${encodeURIComponent(plan.key)}`}
                    className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b111a]"
                    aria-label={presentation.cta}
                  >
                    {presentation.cta}
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
