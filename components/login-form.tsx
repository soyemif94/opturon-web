"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

const PARTNER_CALLBACK_PATHS = new Set(["/", "/clients", "/career", "/network", "/commissions", "/profile", "/invite"]);

function normalizeSafeCallbackUrl(value: string | null, fallback: string) {
  const candidate = String(value || "").trim();
  if (!candidate) return fallback;
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;

  try {
    const parsed = new URL(candidate);
    if (parsed.origin === window.location.origin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function safeCallbackUrl(value: string | null, fallback: string, authIntent: "portal" | "partner") {
  const candidate = normalizeSafeCallbackUrl(value, fallback);
  if (authIntent !== "partner") return candidate;

  const pathname = candidate.split(/[?#]/)[0] || "/";
  if (PARTNER_CALLBACK_PATHS.has(pathname)) return candidate;
  if (pathname === "/partners") return "/";
  if (pathname.startsWith("/partners/")) {
    const publicPath = pathname.slice("/partners".length) || "/";
    if (PARTNER_CALLBACK_PATHS.has(publicPath)) {
      return candidate.replace(pathname, publicPath);
    }
  }
  return fallback;
}

export function LoginForm({
  defaultCallbackUrl = "/app",
  emailPlaceholder = "admin@opturon.com",
  submitLabel = "Ingresar",
  forgotPasswordHref = "/forgot-password",
  forgotPasswordLabel = "Olvidaste tu contrasena?",
  authIntent = "portal"
}: {
  defaultCallbackUrl?: string;
  emailPlaceholder?: string;
  submitLabel?: string;
  forgotPasswordHref?: string;
  forgotPasswordLabel?: string;
  authIntent?: "portal" | "partner";
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugStatus, setDebugStatus] = useState<"idle" | "loading" | "ok" | "error" | "timeout">("idle");
  const router = useRouter();
  const params = useSearchParams();
  const isDev = process.env.NODE_ENV !== "production";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);
    setDebugStatus("loading");

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let didTimeout = false;

    try {
      const callbackUrl = safeCallbackUrl(params.get("callbackUrl"), defaultCallbackUrl, authIntent);
      timeoutId = setTimeout(() => {
        didTimeout = true;
        setLoading(false);
        setDebugStatus("timeout");
        toast.error("Timeout. Reintenta o revisa /api/auth/session");
        console.error("LOGIN TIMEOUT");
      }, 12000);

      const result = await Promise.race([
        signIn("credentials", {
          email,
          password,
          authIntent,
          redirect: false,
          callbackUrl
        }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 12000))
      ]);

      console.log("SIGNIN RESULT", result);

      if (!result || result.error) {
        setDebugStatus("error");
        if (result?.status === 429) {
          const message = "Demasiados intentos de login. Espera unos minutos e intenta nuevamente.";
          setError(message);
          toast.error("Login bloqueado", message);
          return;
        }
        const invalidMessage = authIntent === "partner" ? "Esta cuenta no tiene acceso al Portal de asesores." : "Credenciales invalidas.";
        setError(invalidMessage);
        toast.error(invalidMessage);
        return;
      }

      if (!result.ok) {
        setDebugStatus("error");
        setError("Credenciales invalidas.");
        toast.error("Login fallo (sin detalle). Revisar Network.");
        return;
      }

      setDebugStatus("ok");
      router.push(result.url || defaultCallbackUrl);
      router.refresh();
    } catch (err) {
      if (err instanceof Error && err.message === "timeout") {
        if (!didTimeout) {
          setDebugStatus("timeout");
          setError("Timeout en login.");
          setLoading(false);
          toast.error("Timeout. Reintenta o revisa /api/auth/session");
          console.error("LOGIN TIMEOUT");
        }
        return;
      }
      setDebugStatus("error");
      const message = "No se pudo iniciar sesion. Revisa NEXTAUTH_URL y NEXTAUTH_SECRET.";
      setError(message);
      toast.error("Error de autenticacion", message);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input type="email" placeholder={emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Ingresando..." : submitLabel}
      </Button>
      <div className="text-center text-sm text-muted-foreground">
        <a href={forgotPasswordHref} className="hover:text-foreground">
          {forgotPasswordLabel}
        </a>
        <p className="mt-1 text-xs">Te enviaremos un enlace temporal para crear una nueva contrasena.</p>
      </div>
      {isDev ? <p className="text-xs text-muted-foreground">Debug status: {debugStatus}</p> : null}
    </form>
  );
}
