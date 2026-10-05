"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PublicPlanDto } from "@/lib/api";

type FixedPlanKey = "core" | "growth" | "distribution";

function formatBillingCadence(cadence: string | null) {
  if (cadence === "monthly") return "mes";
  if (cadence === "yearly" || cadence === "annually") return "año";
  return "período";
}

function formatPrice(plan: PublicPlanDto) {
  if (plan.pricingMode !== "fixed" || typeof plan.amount !== "number" || !plan.currency) return null;
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: plan.currency, maximumFractionDigits: 0 }).format(plan.amount);
}

function isMercadoPagoUrl(value: unknown) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" && /(^|\.)mercadopago\.com(\.ar)?$/i.test(url.hostname);
  } catch {
    return false;
  }
}

export function CheckoutStartClient({ planKey }: { planKey: FixedPlanKey }) {
  const [plan, setPlan] = useState<PublicPlanDto | null>(null);
  const [catalogUnavailable, setCatalogUnavailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/public/plans", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("unavailable");
        const payload = await response.json();
        const match = Array.isArray(payload?.plans) ? payload.plans.find((item: PublicPlanDto) => item.key === planKey) : null;
        if (!match || match.pricingMode !== "fixed" || typeof match.amount !== "number" || !match.currency) throw new Error("invalid");
        setPlan(match);
      })
      .catch(() => { if (!controller.signal.aborted) setCatalogUnavailable(true); });
    return () => controller.abort();
  }, [planKey]);

  async function continueToAuthorization() {
    if (!plan || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.checkout) {
        const code = String(payload?.error || "");
        setError(code === "subscription_already_exists" || code === "subscription_multiple_non_terminal"
          ? "Este espacio ya tiene una suscripción activa o un checkout pendiente. Revisá la cuenta antes de iniciar otra autorización."
          : code === "existing_checkout_terms_changed"
            ? "El checkout pendiente tiene condiciones anteriores. Contactá a Opturon para revisar esa autorización antes de continuar."
            : code === "billing_actor_forbidden"
              ? "Sólo la persona propietaria o gerente del espacio puede gestionar el plan."
              : "No pudimos iniciar el checkout. El plan y la cuenta siguen sin cambios; podés reintentar.");
        return;
      }
      const checkout = payload.checkout;
      if (checkout.planKey !== planKey || !isMercadoPagoUrl(checkout.authorizationUrl)) {
        setError("No pudimos validar el destino seguro del checkout. Volvé a intentar más tarde.");
        return;
      }
      window.location.assign(checkout.authorizationUrl);
    } catch {
      setError("No pudimos conectar con el servicio de billing. Reintentá en unos segundos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container-opt flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-2xl border-white/10 bg-card/95 p-7 shadow-2xl md:p-9">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">Checkout seguro</p>
        <h1 className="mt-3 text-3xl font-semibold">Confirmá tu plan</h1>
        {catalogUnavailable ? (
          <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 text-sm text-muted" role="alert">
            El catálogo oficial no está disponible. No iniciaremos una suscripción con valores guardados en el navegador.
          </div>
        ) : !plan ? (
          <p className="mt-6 text-sm text-muted">Cargando condiciones vigentes…</p>
        ) : (
          <>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><h2 className="text-xl font-semibold">{plan.displayName}</h2><p className="mt-1 text-sm text-muted">{plan.description}</p></div>
                <p className="text-xl font-semibold">{formatPrice(plan)}<span className="ml-1 text-xs font-normal text-muted">/ {formatBillingCadence(plan.billingCadence)}</span></p>
              </div>
              <ul className="mt-5 grid gap-2 text-sm text-muted sm:grid-cols-2">
                {plan.highlights.map((highlight) => <li key={highlight}>• {highlight}</li>)}
              </ul>
            </div>
            <p className="mt-5 text-sm leading-6 text-muted">
              La suscripción se autoriza en Mercado Pago. El acceso pago se habilita únicamente cuando Opturon confirma un pago aprobado por el webhook firmado.
            </p>
            {error ? <p className="mt-4 text-sm text-red-400" role="alert">{error}</p> : null}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button type="button" onClick={() => void continueToAuthorization()} disabled={loading || !plan}>
                {loading ? "Preparando checkout…" : "Continuar a Mercado Pago"}
              </Button>
              <Link href="/#planes" className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline">Volver a planes</Link>
            </div>
          </>
        )}
      </Card>
    </main>
  );
}
