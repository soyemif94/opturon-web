"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoginForm } from "@/components/login-form";
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
  const partnerHost = isPartnerPortalHost(host);
  const partnerMode = isPartnerCallback(callbackUrl, partnerHost);
  const partnerCallbackUrl = partnerLoginCallbackForHost(host);

  useEffect(() => {
    setHost(window.location.host);
  }, []);

  if (!partnerMode) {
    return (
      <section className="container-opt py-20">
        <Card className="mx-auto max-w-md p-8">
          <h1 className="mb-2 text-2xl font-semibold">Panel Opturon</h1>
          <p className="mb-6 text-muted">Iniciá sesión para acceder al bot.</p>
          <LoginForm />
        </Card>
      </section>
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
              Login partner
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

function ValuePill({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200/90 bg-white/80 p-4 shadow-[0_12px_34px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <p className="mt-3 text-lg font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}
