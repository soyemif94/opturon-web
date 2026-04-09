"use client";

import { useEffect, useMemo, useState } from "react";
import { Shield, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const OPS_UNLOCK_STORAGE_KEY = "ops_unlocked";
const OPS_PASSWORD = (process.env.NEXT_PUBLIC_OPS_PASSWORD || "opturon-ops").trim();

export function OpsAccessGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setUnlocked(window.localStorage.getItem(OPS_UNLOCK_STORAGE_KEY) === "true");
    } catch {
      setUnlocked(false);
    } finally {
      setChecking(false);
    }
  }, []);

  const helperText = useMemo(
    () => "Acceso simple para supervision comercial. No reemplaza seguridad fuerte ni RBAC.",
    []
  );

  function handleUnlock() {
    if (password.trim() !== OPS_PASSWORD) {
      setError("Contrasena incorrecta");
      return;
    }

    try {
      window.localStorage.setItem(OPS_UNLOCK_STORAGE_KEY, "true");
    } catch {
      // If localStorage is unavailable, keep the unlock in-memory for this session view.
    }

    setUnlocked(true);
    setPassword("");
    setError(null);
  }

  if (checking) {
    return (
      <Card className="border-white/6 bg-card/90">
        <CardContent className="flex min-h-[320px] items-center justify-center p-6 text-sm text-muted">
          Verificando acceso a OPS...
        </CardContent>
      </Card>
    );
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
                    handleUnlock();
                  }
                }}
                placeholder="Ingresa la contrasena de OPS"
              />
            </div>

            {error ? (
              <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-100">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <Button type="button" className="w-full" onClick={handleUnlock}>
              Entrar
            </Button>

            <p className="text-xs leading-5 text-muted">{helperText}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
