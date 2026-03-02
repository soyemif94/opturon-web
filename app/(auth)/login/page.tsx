import { Suspense } from "react";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Opturon | Login",
  description: "Acceso al panel interno del bot."
};

export default function LoginPage() {
  return (
    <section className="container-opt py-20">
      <Card className="mx-auto max-w-md p-8">
        <h1 className="mb-2 text-2xl font-semibold">Panel Opturon</h1>
        <p className="mb-6 text-muted">Inici� sesi�n para acceder al bot.</p>
        <Suspense fallback={<p className="text-sm text-muted">Cargando login...</p>}>
          <LoginForm />
        </Suspense>
      </Card>
    </section>
  );
}