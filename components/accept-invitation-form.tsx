"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type InvitationSummary = {
  tenantId: string;
  tenantName: string | null;
  email: string;
  name: string | null;
  role: string;
  expiresAt: string;
};

function roleLabel(role: string) {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "owner") return "Propietario";
  if (normalized === "manager") return "Gerente";
  if (normalized === "seller") return "Vendedor";
  if (normalized === "viewer") return "Visualizador";
  return "Usuario";
}

export function AcceptInvitationForm({ token }: { token?: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!token) {
        setValidating(false);
        setValidToken(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/invitations?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        const json = await response.json();
        if (!cancelled) {
          setValidToken(Boolean(json.valid));
          setInvitation(json.invitation || null);
          setError(!json.valid ? "El enlace es invalido o ya expiro." : null);
        }
      } catch {
        if (!cancelled) {
          setValidToken(false);
          setError("No pudimos validar la invitacion.");
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
      setError("La contrasena debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "portal_invitation_accept_failed");
      }

      setMessage("Tu cuenta ya esta activa. Ahora puedes iniciar sesion.");
      setValidToken(false);
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "invalid_or_expired_invitation") {
        setError("El enlace es invalido o ya expiro.");
        return;
      }
      setError("No se pudo activar la cuenta. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  if (validating) {
    return <p className="text-sm text-muted">Validando invitacion...</p>;
  }

  if (!validToken) {
    return (
      <div className="space-y-4">
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        {!message ? <p className="text-sm text-red-400">{error || "El enlace es invalido o ya expiro."}</p> : null}
        <a href="/login" className="text-sm text-brand hover:text-brandBright">
          Ir al login
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {invitation ? (
        <div className="rounded-2xl border border-[color:var(--border)] bg-bg/70 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Espacio</p>
          <h2 className="mt-1 text-xl font-semibold">{invitation.tenantName || "Workspace Opturon"}</h2>
          <div className="mt-3 grid gap-3 text-sm text-muted sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Invitado</p>
              <p className="mt-1 text-foreground">{invitation.name || invitation.email}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Rol</p>
              <p className="mt-1 text-foreground">{roleLabel(invitation.role)}</p>
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          type="password"
          placeholder="Crear contrasena"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Repetir contrasena"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Activando..." : "Activar cuenta"}
        </Button>
      </form>
    </div>
  );
}
