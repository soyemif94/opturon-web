import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginScreen } from "@/components/auth/LoginScreen";

export const metadata: Metadata = {
  title: "Opturon | Login",
  description: "Acceso al panel interno y al portal de asesores."
};

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="px-6 py-10 text-sm text-muted">Cargando login...</p>}>
      <LoginScreen />
    </Suspense>
  );
}
