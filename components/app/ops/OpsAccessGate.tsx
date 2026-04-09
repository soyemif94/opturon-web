"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shield, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function OpsAccessGate({
  children,
  initialUnlocked,
  accessConfigured
}: {
  children: React.ReactNode;
  initialUnlocked: boolean;
  accessConfigured: boolean;
}) {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(initialUnlocked);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const helperText = useMemo(
    () => "Acceso simple para supervision comercial. No reemplaza seguridad fuerte ni RBAC.",
    []
  );

  async function handleUnlock() {
    if (!accessConfigured) {
      setError("OPS no esta configurado");
      return;
    }

    setError(null);
    const response = await fetch("/api/app/ops/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      if (payload?.error === "invalid_ops_password") {
        setError("Contrasena incorrecta");
      } else if (payload?.error === "ops_access_not_configured") {
        setError("OPS no esta configurado");
      } else {
        setError("No se pudo desbloquear OPS");
      }
      return;
    }

    setUnlocked(true);
    setPassword("");
    startTransition(() => {
      router.refresh();
    });
  }

  if (!unlocked) {
    return (
      <div className="mx-auto flex min-h-[520px] max-w-xl items-center">
        <Card className="w-full border-white/6 bg-card/95 shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
          <CardHeader className="space-y-4">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-[22px] border border-brand/20 bg-brand/10">
              <Shield className="h-6 w-6 text-brandBright" />
            </div>
            <div>
              <CardTitle className="text-2xl">Desbloquear OPS</CardTitle>
              <CardDescription className="mt-2 leading-6">
                Ingresa la contrasena operativa para acceder al centro de supervision comercial.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="ops-password" className="text-sm font-medium text-text">
                Contrasena
              </label>
              <Input
                id="ops-password"
                type="password"
                autoFocus
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleUnlock();
                  }
                }}
                placeholder="Ingresa la contrasena de OPS"
                disabled={isPending}
              />
            </div>

            {error ? (
              <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-100">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <Button type="button" className="w-full" onClick={() => void handleUnlock()} disabled={isPending}>
              {isPending ? "Entrando..." : "Entrar"}
            </Button>

            <p className="text-xs leading-5 text-muted">{helperText}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!children) {
    return (
      <Card className="border-white/6 bg-card/90">
        <CardContent className="flex min-h-[320px] items-center justify-center p-6 text-sm text-muted">
          Abriendo OPS...
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
