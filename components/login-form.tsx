"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const callbackUrl = params.get("callbackUrl") || "/bot/inbox";
    const result = await signIn("credentials", { email, password, redirect: false, callbackUrl });

    setLoading(false);
    if (!result || result.error) {
      if (result?.status === 429) {
        setError("Demasiados intentos de login. Esperá unos minutos e intentá nuevamente.");
        return;
      }
      setError("Credenciales inválidas");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input type="email" placeholder="admin@opturon.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={loading}>{loading ? "Ingresando..." : "Ingresar"}</Button>
    </form>
  );
}
