import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata: Metadata = {
  title: "Opturon | Nueva contraseña",
  description: "Define una nueva contraseña para tu acceso."
};

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;

  return (
    <section className="container-opt py-20">
      <Card className="mx-auto max-w-md p-8">
        <h1 className="mb-2 text-2xl font-semibold">Nueva contraseña</h1>
        <p className="mb-6 text-muted">Define una nueva contraseña para continuar.</p>
        <ResetPasswordForm token={sp.token} />
      </Card>
    </section>
  );
}
