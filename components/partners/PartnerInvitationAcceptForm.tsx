"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { partnerLoginCallbackForHost } from "@/lib/partners-portal";

type PartnerInvitationSummary = {
  partnerId: string;
  email: string;
  displayName: string | null;
  code: string | null;
  phone: string | null;
  sponsorDisplayName: string | null;
  expiresAt: string;
  sourceType?: string | null;
};

function formatDateTime(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "sin fecha visible";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

export function PartnerInvitationAcceptForm({ token }: { token?: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<PartnerInvitationSummary | null>(null);
  const [host, setHost] = useState("");
  const loginHref = `/login?callbackUrl=${encodeURIComponent(partnerLoginCallbackForHost(host))}`;

  useEffect(() => {
    setHost(window.location.host);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!token) {
        setValidating(false);
        setValidToken(false);
        setError("El enlace es invalido o ya expiro.");
        return;
      }

      try {
        const response = await fetch(`/api/partners/invitations?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        const json = await response.json();
        if (!cancelled) {
          setValidToken(Boolean(json.valid));
          setInvitation(json.invitation || null);
          setError(!json.valid ? "El enlace es invalido, fue reemplazado o ya expiro." : null);
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
    if (!token || loading) return;

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
      const response = await fetch("/api/partners/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(String(json?.error || "partner_invitation_accept_failed"));
      }
      setMessage("Tu acceso ya esta activo. Ahora puedes iniciar sesion en el portal.");
      setValidToken(false);
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "invalid_or_expired_invitation" || code === "invalid_invitation_acceptance") {
        setError("El enlace ya no es valido. Solicita un nuevo envio al equipo de Opturon.");
        return;
      }
      setError("No se pudo activar tu acceso. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  if (validating) {
    return <p className="text-sm text-slate-600">Validando invitacion segura...</p>;
  }

  if (!validToken) {
    return (
      <div className="space-y-4">
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {!message ? <p className="text-sm text-rose-600">{error || "El enlace es invalido o ya expiro."}</p> : null}
        <Link href={loginHref} className="text-sm font-medium text-amber-700 hover:text-amber-800">
          Ir al acceso de asesores
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {invitation ? (
        <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,rgba(255,248,238,0.98),rgba(255,255,255,0.98))] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Invitacion segura</p>
          <h2 className="mt-2 text-xl font-semibold">{invitation.displayName || invitation.email}</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Email</p>
              <p className="mt-1 text-slate-900">{invitation.email}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Codigo</p>
              <p className="mt-1 text-slate-900">{invitation.code || "No informado"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Sponsor</p>
              <p className="mt-1 text-slate-900">{invitation.sponsorDisplayName || "Sin sponsor asignado"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Tipo</p>
              <p className="mt-1 text-slate-900">
                {invitation.sourceType === "partner_recruitment_application" ? "Postulacion patrocinada" : "Invitacion directa"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Vence</p>
              <p className="mt-1 text-slate-900">{formatDateTime(invitation.expiresAt)}</p>
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
        <p className="text-xs leading-5 text-slate-500">
          Usa una contrasena de al menos 8 caracteres. Nadie de Opturon te la va a solicitar.
        </p>
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Activando..." : "Activar acceso"}
        </Button>
      </form>
    </div>
  );
}
