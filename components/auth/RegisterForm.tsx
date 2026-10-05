"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { safeCheckoutCallback } from "@/lib/safe-internal-callback";

export function RegisterForm() {
  const params = useSearchParams();
  const router = useRouter();
  const callbackUrl = safeCheckoutCallback(params.get("callbackUrl"), typeof window === "undefined" ? "https://opturon.com" : window.location.origin);
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
  return (
    <Card className="mx-auto w-full max-w-lg border-white/10 bg-card/95 p-7 shadow-2xl md:p-9">
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">Empezá con Opturon</p>
      <h1 className="mt-3 text-3xl font-semibold">Creá tu cuenta</h1>
      <p className="mt-2 text-sm leading-6 text-muted">Tu espacio queda sin un plan pago hasta que Mercado Pago confirme el primer pago.</p>
      <form className="mt-7 space-y-4" onSubmit={onSubmit}>
        <Input autoComplete="name" placeholder="Tu nombre" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={120} required />
        <Input autoComplete="organization" placeholder="Nombre del negocio" value={businessName} onChange={(event) => setBusinessName(event.target.value)} minLength={2} maxLength={160} required />
        <Input autoComplete="email" type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required />
        <Input autoComplete="new-password" type="password" placeholder="Contraseña (12 caracteres o más)" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} maxLength={128} required />
        {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creando cuenta…" : "Crear cuenta y continuar"}</Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted-foreground">¿Ya tenés una cuenta? <a className="font-semibold text-foreground underline-offset-4 hover:underline" href={loginHref}>Ingresar</a></p>
    </Card>
  );
}
