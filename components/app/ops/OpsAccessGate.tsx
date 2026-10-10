"use client";

import { useRef, useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, Lock, Shield, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { unlockAndVerifyOps, verifyOpsOpening, type OpsOpeningResult } from "@/lib/ops/ops-opening";

const supervisionAreas = [
  "Leads sin asignar o que requieren atención",
  "Seguimientos pendientes, vencidos y completados",
  "Actividad y carga de trabajo por vendedor",
  "Reasignaciones e historial comercial"
];

export function OpsAccessGate({
  children,
  initialUnlocked,
  accessConfigured
}: {
  children: React.ReactNode;
  initialUnlocked: boolean;
  accessConfigured: boolean;
}) {
  const unlockInFlight = useRef(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [canRetryVerification, setCanRetryVerification] = useState(false);

  function finishOpening(result: OpsOpeningResult) {
    if (result === "verified") {
      setPassword("");
      // The server owns the dashboard. A document navigation gives it the
      // verified, path-scoped cookie without retaining a stale gate payload.
      window.location.assign("/app/ops");
      return;
    }
    if (result === "invalid_password") {
      setError("Contraseña incorrecta. Verificá los datos e intentá nuevamente.");
    } else if (result === "access_denied") {
      setPassword("");
      setError("No pudimos abrir OPS. Volvé a validar el acceso.");
    } else {
      setError("No pudimos abrir OPS.");
      setCanRetryVerification(true);
    }
  }

  async function handleUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (unlockInFlight.current) return;

    if (!accessConfigured) {
      setError("El acceso a OPS no está disponible en este momento.");
      return;
    }

    unlockInFlight.current = true;
    setIsBusy(true);
    setError(null);
    setCanRetryVerification(false);

    try {
      finishOpening(await unlockAndVerifyOps(password));
    } catch {
      setError("No pudimos abrir OPS.");
      setCanRetryVerification(true);
    } finally {
      unlockInFlight.current = false;
      setIsBusy(false);
    }
  }

  async function handleRetryVerification() {
    if (unlockInFlight.current) return;
    unlockInFlight.current = true;
    setIsBusy(true);
    setError(null);
    setCanRetryVerification(false);
    try {
      finishOpening(await verifyOpsOpening());
    } catch {
      setError("No pudimos abrir OPS.");
      setCanRetryVerification(true);
    } finally {
      unlockInFlight.current = false;
      setIsBusy(false);
    }
  }

  async function handleLock() {
    setError(null);
    setIsBusy(true);
    try {
      const response = await fetch("/api/app/ops/lock", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin"
      });
      if (!response.ok) throw new Error("ops_lock_failed");
      window.location.assign("/app/ops");
    } catch {
      setError("No pudimos bloquear OPS. Intentá nuevamente.");
    } finally {
      setIsBusy(false);
    }
  }

  if (!initialUnlocked) {
    return (
      <section className="relative isolate overflow-hidden rounded-[30px] border border-white/10 bg-[#071326] shadow-[0_30px_90px_rgba(0,0,0,0.3)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="absolute -left-24 -top-36 h-80 w-80 rounded-full bg-blue-500/15 blur-[90px]" />
          <div className="absolute -right-20 bottom-[-9rem] h-80 w-80 rounded-full bg-orange-500/10 blur-[100px]" />
          <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(20,94,190,0.08),transparent_48%,rgba(243,130,50,0.04))]" />
        </div>

        <div className="relative z-10 grid min-h-[520px] grid-cols-1 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="flex flex-col justify-between gap-10 p-6 sm:p-9 lg:p-12">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-300/[0.08] px-3 py-1.5 text-[11px] font-semibold tracking-[0.2em] text-blue-100">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-300 shadow-[0_0_12px_rgba(253,186,116,0.8)]" />
                OPS COMERCIAL
              </div>
              <h2 className="mt-6 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Centro de Supervisión Comercial
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Un espacio protegido para supervisores, encargados y responsables comerciales. Desde acá podés revisar la actividad del equipo, los seguimientos y la carga operativa sin salir del inbox.
              </p>

              <ul className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="Áreas de supervisión">
                {supervisionAreas.map((item) => (
                  <li key={item} className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-sm leading-6 text-slate-200">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-400/15 text-blue-200">
                      <Check aria-hidden="true" className="h-3.5 w-3.5" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-start gap-3 border-t border-white/10 pt-5 text-sm leading-6 text-slate-300">
              <Shield aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-orange-200" />
              <p>Acceso exclusivo para supervisores y responsables autorizados.</p>
            </div>
          </div>

          <div className="flex items-center p-4 pt-0 sm:p-7 sm:pt-0 lg:p-8 lg:pl-2">
            <Card className="w-full border-white/10 bg-[#0c1a30]/90 shadow-[0_24px_70px_rgba(0,0,0,0.3)] backdrop-blur-xl">
              <CardHeader className="space-y-4 p-6 sm:p-8">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-200/20 bg-orange-200/[0.08] text-orange-100">
                  <Lock aria-hidden="true" className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-white">Acceder a OPS</CardTitle>
                  <CardDescription className="mt-2 leading-6 text-slate-300">
                    Ingresá la contraseña operativa para abrir el centro de supervisión.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
                <form className="space-y-5" onSubmit={(event) => void handleUnlock(event)}>
                  <div className="space-y-2">
                    <label htmlFor="ops-password" className="text-sm font-medium text-slate-100">
                      Contraseña
                    </label>
                    <div className="relative">
                      <Input
                        id="ops-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          if (error) setError(null);
                        }}
                        placeholder="Ingresá la contraseña de OPS"
                        disabled={isBusy || !accessConfigured}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? "ops-access-error" : "ops-access-note"}
                        className="h-12 border-white/10 bg-[#071326] pr-12 text-white placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 inline-flex min-w-11 items-center justify-center rounded-r-xl text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        aria-pressed={showPassword}
                        aria-controls="ops-password"
                        onClick={() => setShowPassword((visible) => !visible)}
                        disabled={isBusy || !accessConfigured}
                      >
                        {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {error ? (
                    <div id="ops-access-error" role="alert" className="flex items-start gap-2.5 rounded-2xl border border-red-400/25 bg-red-400/[0.08] px-3.5 py-3 text-sm leading-6 text-red-100">
                      <ShieldAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                      {canRetryVerification ? (
                        <button type="button" onClick={() => void handleRetryVerification()} disabled={isBusy} className="ml-auto shrink-0 font-semibold underline underline-offset-4">
                          Reintentar
                        </button>
                      ) : null}
                    </div>
                  ) : !accessConfigured ? (
                    <p id="ops-access-note" role="status" className="text-sm leading-6 text-amber-100">
                      El acceso a OPS no está disponible en este momento.
                    </p>
                  ) : (
                    <p id="ops-access-note" className="text-xs leading-5 text-slate-400">
                      Tu contraseña se verifica de forma segura en el servidor y no se guarda en este dispositivo.
                    </p>
                  )}

                  <Button type="submit" className="h-12 w-full justify-between rounded-xl px-5" disabled={isBusy || !accessConfigured}>
                    <span>{isBusy ? "Verificando acceso…" : error?.startsWith("No pudimos abrir OPS") ? "Volver a validar acceso" : "Entrar al panel"}</span>
                    {isBusy ? (
                      <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    )}
                  </Button>
                  <p className="text-center text-xs text-slate-500">Área interna de supervisión comercial</p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    );
  }

  if (!children) {
    return (
      <Card className="border-white/10 bg-card/90">
        <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-4 p-6 text-sm text-muted" role="alert">
          <span>No pudimos abrir OPS.</span>
          <div className="flex gap-3">
            <Button type="button" onClick={() => window.location.reload()}>Reintentar</Button>
            <Button type="button" variant="ghost" onClick={() => void handleLock()} disabled={isBusy}>Volver a validar acceso</Button>
          </div>
          {error ? <span>{error}</span> : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" className="rounded-2xl" onClick={() => void handleLock()} disabled={isBusy}>
          <Lock aria-hidden="true" className="mr-2 h-4 w-4" />
          Bloquear OPS
        </Button>
      </div>
      {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
      {children}
    </div>
  );
}
