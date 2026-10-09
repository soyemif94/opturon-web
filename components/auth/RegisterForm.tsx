"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { safeCheckoutCallback } from "@/lib/safe-internal-callback";

export function RegisterForm({ embedded = false }: { embedded?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const callbackUrl = safeCheckoutCallback(params.get("callbackUrl"), typeof window === "undefined" ? "https://opturon.com" : window.location.origin);
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, businessName, email, password })
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.user?.id) {
        setError(result?.error === "email_already_registered"
          ? "Ya existe una cuenta con ese email. Iniciá sesión para continuar."
          : "No pudimos crear la cuenta. Revisá los datos e intentá nuevamente.");
        return;
      }

      const auth = await signIn("credentials", {
        email,
        password,
        authIntent: "portal",
        redirect: false,
        callbackUrl
      });
      if (!auth?.ok || auth.error) {
        setError("La cuenta se creó, pero no pudimos iniciar la sesión. Ingresá con tu email y contraseña.");
        return;
      }
      router.replace(callbackUrl);
      router.refresh();
    } catch {
      setError("No pudimos completar el registro. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  const loginHref = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const content = (
    <>
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">Empezá con Opturon</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">Crear mi cuenta</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">Tu espacio queda sin un plan pago hasta que Mercado Pago confirme el primer pago.</p>
      <form className="mt-7 space-y-4" onSubmit={onSubmit}>
        <label className="grid gap-2 text-sm font-medium text-slate-200" htmlFor="register-name">Nombre<input id="register-name" className="h-10 w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300" autoComplete="name" placeholder="Tu nombre" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={120} required /></label>
        <label className="grid gap-2 text-sm font-medium text-slate-200" htmlFor="register-business">Negocio o empresa<input id="register-business" className="h-10 w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300" autoComplete="organization" placeholder="Nombre del negocio" value={businessName} onChange={(event) => setBusinessName(event.target.value)} minLength={2} maxLength={160} required /></label>
        <label className="grid gap-2 text-sm font-medium text-slate-200" htmlFor="register-email">Email<input id="register-email" className="h-10 w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300" autoComplete="email" type="email" placeholder="tu@empresa.com" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required /></label>
        <label className="grid gap-2 text-sm font-medium text-slate-200" htmlFor="register-password">Contraseña
          <span className="relative">
            <input id="register-password" className="h-10 w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 pr-12 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300" autoComplete="new-password" type={showPassword ? "text" : "password"} placeholder="12 caracteres o más" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} maxLength={128} required />
            <button type="button" className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
          </span>
        </label>
        {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
        <Button type="submit" className="w-full bg-sky-400 text-slate-950 hover:bg-sky-300" disabled={loading}>{loading ? "Creando cuenta…" : "Crear cuenta y continuar"}</Button>
      </form>
      {!embedded ? <p className="mt-5 text-center text-sm text-slate-400">¿Ya tenés una cuenta? <a className="font-semibold text-white underline-offset-4 hover:underline" href={loginHref}>Ingresar</a></p> : null}
    </>
  );
  return embedded ? <div>{content}</div> : <Card className="mx-auto w-full max-w-lg border-white/10 bg-[#0b1627]/95 p-7 shadow-2xl md:p-9">{content}</Card>;
}
