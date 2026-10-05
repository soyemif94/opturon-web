"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

type BillingStatus = {
  planKey: string | null;
  subscriptionStatus: string | null;
  billingState: string;
  entitlementState: string;
  entitlementActive: boolean;
  paymentPending: boolean;
  accountActive: boolean;
  canResume: boolean;
};

type ViewState = "loading" | "activated" | "processing" | "pending" | "failed" | "suspended" | "unavailable";

function resolveView(status: BillingStatus | null): ViewState {
  if (!status) return "unavailable";
  if (status.entitlementState === "suspended_for_nonpayment") return "suspended";
  if (status.entitlementActive && status.accountActive) return "activated";
  if (status.paymentPending) return "processing";
  if (["cancelled", "canceled", "rejected", "payment_failed", "failed"].includes(String(status.subscriptionStatus || "").toLowerCase())) return "failed";
  return "pending";
}

const messages: Record<ViewState, { title: string; detail: string }> = {
  loading: { title: "Verificando tu suscripción", detail: "Consultamos el estado seguro de tu cuenta." },
  activated: { title: "Tu plan está activo", detail: "El pago aprobado fue confirmado por Opturon y tus capacidades están disponibles." },
  processing: { title: "Autorización recibida", detail: "El pago todavía se está confirmando. Esta pantalla se actualizará automáticamente por un tiempo breve." },
  pending: { title: "Pago pendiente", detail: "Todavía no vemos una confirmación aprobada. Tu plan no se activa desde esta página de retorno." },
  failed: { title: "No se completó el pago", detail: "La autorización no se completó. Tu cuenta y los datos del espacio siguen disponibles para reintentar." },
  suspended: { title: "Plan suspendido por falta de pago", detail: "La cuenta conserva sus datos. Un pago aprobado válido permite la reactivación automática del plan contratado." },
  unavailable: { title: "Estado temporalmente no disponible", detail: "No pudimos consultar billing. Volvé a intentar más tarde desde tu cuenta." }
};

export function CheckoutReturnStatus() {
  const [view, setView] = useState<ViewState>("loading");
  const [attempt, setAttempt] = useState(0);
  const [resumePlan, setResumePlan] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/billing/status", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error("status_unavailable");
      const payload = await response.json();
      const status = payload?.status || null;
      const nextView = resolveView(status);
      setView(nextView);
      if (status?.canResume && ["core", "growth", "distribution"].includes(status.planKey)) setResumePlan(status.planKey);
      return nextView;
    } catch {
      setView("unavailable");
      return "unavailable" as const;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let checks = 0;
    const poll = async () => {
      const state = await checkStatus();
      if (cancelled) return;
      checks += 1;
      setAttempt(checks);
      if (checks < 5 && (state === "processing" || state === "pending" || state === "unavailable")) {
        timer = setTimeout(() => void poll(), 5000);
      }
    };
    void poll();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [checkStatus]);

  const message = messages[view];
  return (
    <main className="container-opt flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-2xl border-white/10 bg-card/95 p-8 shadow-2xl md:p-10" aria-live="polite">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">Retorno de Mercado Pago</p>
        <h1 className="mt-3 text-3xl font-semibold">{message.title}</h1>
        <p className="mt-4 text-sm leading-7 text-muted">{message.detail}</p>
        {view === "loading" || view === "processing" || view === "pending" ? (
          <p className="mt-5 text-xs text-muted">Consulta {Math.max(1, attempt)} de 5. El retorno del proveedor no modifica el entitlement.</p>
        ) : null}
        {view === "unavailable" ? <button type="button" className="mt-6 font-semibold text-brandBright underline-offset-4 hover:underline" onClick={() => void checkStatus()}>Consultar de nuevo</button> : null}
        <div className="mt-7 flex flex-wrap gap-4 text-sm">
          <Link href="/app" className="font-semibold text-brandBright underline-offset-4 hover:underline">Ir a mi cuenta</Link>
          {resumePlan ? <Link href={`/checkout/start?planKey=${encodeURIComponent(resumePlan)}`} className="font-semibold text-brandBright underline-offset-4 hover:underline">Reanudar autorización pendiente</Link> : null}
          <Link href="/#planes" className="text-muted underline-offset-4 hover:text-foreground hover:underline">Ver planes</Link>
        </div>
      </Card>
    </main>
  );
}
