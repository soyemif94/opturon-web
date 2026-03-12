"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm({ token }: { token?: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(true);
  const [validToken, setValidToken] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!token) {
        setValidating(false);
        setValidToken(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        const json = await response.json();
        if (!cancelled) {
          setValidToken(Boolean(json.valid));
        }
      } catch {
        if (!cancelled) {
          setValidToken(false);
        }
      } finally {
        if (!cancelled) {
          setValidating(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading || !token) return;

    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "reset_password_failed");
      }

      setMessage("Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión.");
      setValidToken(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo restablecer la contraseña.";
      setError(message === "invalid_or_expired_reset_token" ? "El enlace es inválido o ya venció." : "No se pudo restablecer la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  if (validating) {
    return <p className="text-sm text-muted">Validando enlace...</p>;
  }

  if (!validToken) {
    return (
      <div className="space-y-3">
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        {!message ? <p className="text-sm text-red-400">El enlace es inválido o ya expiró.</p> : null}
        <a href="/forgot-password" className="text-sm text-brand hover:text-brandBright">
          Solicitar un nuevo enlace
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        type="password"
        placeholder="Nueva contraseña"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="Repetir contraseña"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        required
      />
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Guardando..." : "Guardar nueva contraseña"}
      </Button>
    </form>
  );
}
