import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Opturon | Recuperar contraseña",
  description: "Solicita un enlace para restablecer tu contraseña."
};

export default function ForgotPasswordPage() {
  return (
    <section className="container-opt py-20">
      <Card className="mx-auto max-w-md p-8">
        <h1 className="mb-2 text-2xl font-semibold">Recuperar contraseña</h1>
        <p className="mb-6 text-muted">Te enviaremos un enlace de restablecimiento si el email existe en Opturon.</p>
        <ForgotPasswordForm />
      </Card>
    </section>
  );
}
