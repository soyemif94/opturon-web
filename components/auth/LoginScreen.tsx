"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoginForm } from "@/components/login-form";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { OpturonMark } from "@/components/opturon-mark";
import { isPartnerPortalHost, partnerLoginCallbackForHost } from "@/lib/partners-portal";

function isPartnerCallback(callbackUrl: string | null, partnerHost: boolean) {
  if (partnerHost) return true;
  const value = String(callbackUrl || "").trim();
  return value.startsWith("/partners") || (partnerHost && (value === "" || value === "/" || value.startsWith("/?")));
}

export function LoginScreen() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl");
  const [host, setHost] = useState("");
  const [plan, setPlan] = useState<{ key: string; displayName: string; amount: number | null; currency: string | null; pricingMode: string; billingCadence: string | null } | null>(null);
  const partnerHost = isPartnerPortalHost(host);
  const partnerMode = isPartnerCallback(callbackUrl, partnerHost);
  const partnerCallbackUrl = partnerLoginCallbackForHost(host);

  useEffect(() => {
    setHost(window.location.host);
  }, []);

  useEffect(() => {
    const selected = new URLSearchParams(callbackUrl?.split("?")[1] || "").get("planKey");
    if (!selected) return;
    const controller = new AbortController();
    fetch("/api/public/plans", { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => setPlan(Array.isArray(payload?.plans) ? payload.plans.find((item: { key?: string }) => item.key === selected) || null : null))
      .catch(() => undefined);
    return () => controller.abort();
  }, [callbackUrl]);

  if (!partnerMode) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#050b14] px-4 py-8 text-white sm:px-6 lg:px-8 lg:py-12">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -left-48 -top-48 h-[38rem] w-[38rem] rounded-full border border-sky-400/20 shadow-[0_0_120px_rgba(14,165,233,0.13)]" />
          <div className="absolute -right-72 top-12 h-[30rem] w-[55rem] rotate-[24deg] rounded-[50%] border border-sky-400/20" />
          <div className="absolute -bottom-64 left-1/3 h-[28rem] w-[70rem] -rotate-[8deg] rounded-[50%] border border-orange-400/20 shadow-[0_0_120px_rgba(249,115,22,0.1)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(14,165,233,0.13),transparent_38%),radial-gradient(circle_at_90%_80%,rgba(249,115,22,0.1),transparent_30%)]" />
        </div>
        <div className="relative mx-auto max-w-6xl">
          <header className="flex items-center justify-between">
            <a href="/" className="inline-flex items-center gap-2.5 font-semibold tracking-tight text-white" aria-label="Opturon, inicio"><OpturonMark /><span className="text-lg">Opturon</span></a>
            <a href="/#planes" className="text-sm text-slate-400 transition hover:text-white">Volver a planes</a>
          </header>
          <div className="mx-auto mt-12 max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-300">Tu próximo paso con Opturon</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Entrá o creá tu cuenta para continuar</h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-300">{plan ? `Estás eligiendo ${plan.displayName}. Entrá con tu cuenta o creá una nueva para continuar con la contratación.` : "Accedé a tu espacio Opturon o empezá una cuenta nueva."}</p>
          </div>
          {plan ? <SelectedPlan plan={plan} /> : null}
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <Card className="border-white/10 bg-[#0b1627]/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-8"><Badge variant="outline" className="border-sky-300/30 bg-sky-300/10 text-sky-200">Ya tengo cuenta</Badge><h2 className="mt-4 text-2xl font-semibold">Iniciar sesión</h2><p className="mt-2 text-sm leading-6 text-slate-400">Volvé a tu espacio y continuá exactamente donde lo dejaste.</p><div className="mt-7"><LoginForm defaultCallbackUrl={callbackUrl || "/app"} /></div></Card>
            <Card className="border-sky-300/20 bg-[linear-gradient(145deg,rgba(14,165,233,0.15),rgba(11,22,39,0.94)_48%)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-8"><Badge variant="success" className="border-orange-300/30 bg-orange-300/10 text-orange-200">Soy nuevo/a</Badge><div className="mt-4"><RegisterForm embedded /></div></Card>
          </div>
          <p className="mx-auto mt-7 max-w-2xl text-center text-xs leading-5 text-slate-500">Crear una cuenta no activa un plan pago. La contratación continúa sólo después de confirmar el checkout y el primer pago aprobado.</p>
        </div>
      </main>
    );
  }

  return (
    <section className="min-h-screen bg-[linear-gradient(180deg,#eef7f5_0%,#f7fafc_48%,#edf5f7_100%)] px-4 py-8 text-slate-900 md:px-6 md:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative overflow-hidden rounded-[34px] border border-emerald-100 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_36%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,248,250,0.94))] p-7 shadow-[0_32px_100px_rgba(15,23,42,0.12)] md:p-10">
          <Badge variant="success" className="border-emerald-200 bg-emerald-50 text-emerald-700">
            Portal de asesores
          </Badge>
          <div className="mt-6 max-w-xl space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Opturon</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Tu espacio de seguimiento comercial y crecimiento profesional.
            </h1>
            <p className="text-base leading-7 text-slate-600">
              Accedé a un portal separado del CRM, con lectura clara de tus clientes atribuidos, tu carrera y el estado
              general de tu cuenta dentro de Opturon.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <ValuePill title="Clientes" value="Seguimiento real" detail="Sólo con datos servidos por tus endpoints seguros." />
            <ValuePill title="Carrera" value="Progreso visible" detail="Rango actual, escalera y próximos pasos disponibles." />
            <ValuePill title="Acceso" value="Aislado del CRM" detail="Sin módulos de Inbox, Catálogo ni Admin interno." />
          </div>
        </div>

        <Card className="flex items-center border-white/60 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] md:p-8">
          <div className="w-full">
            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
              Acceso de asesores
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">Portal de asesores</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Ingresá con tu email y contraseña para entrar directamente al portal.
            </p>
            <div className="mt-6">
              <LoginForm
                defaultCallbackUrl={partnerCallbackUrl}
                emailPlaceholder="asesor@opturon.com"
                submitLabel="Entrar al portal"
                authIntent="partner"
                forgotPasswordHref="/forgot-password"
                forgotPasswordLabel="¿Olvidaste tu contraseña?"
              />
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

function SelectedPlan({ plan }: { plan: { displayName: string; amount: number | null; currency: string | null; pricingMode: string; billingCadence: string | null } }) {
  const price = plan.pricingMode === "fixed" && typeof plan.amount === "number" && plan.currency
    ? new Intl.NumberFormat("es-AR", { style: "currency", currency: plan.currency, currencyDisplay: "symbol", maximumFractionDigits: 0 }).format(plan.amount)
    : "A medida";
  return <div className="mx-auto mt-8 flex max-w-xl items-center justify-between gap-5 rounded-2xl border border-sky-300/20 bg-sky-300/[0.08] px-5 py-4 shadow-[0_0_50px_rgba(14,165,233,0.1)]"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">Plan seleccionado</p><p className="mt-1 text-lg font-semibold text-white">{plan.displayName}</p></div><p className="text-right text-xl font-semibold text-white">{price}<span className="ml-1 text-sm font-normal text-slate-400">{price !== "A medida" ? `/ ${plan.billingCadence === "yearly" ? "año" : "mes"}` : ""}</span></p></div>;
}

function ValuePill({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200/90 bg-white/80 p-4 shadow-[0_12px_34px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <p className="mt-3 text-lg font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}
