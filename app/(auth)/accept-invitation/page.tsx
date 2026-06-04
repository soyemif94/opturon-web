import type { Metadata } from "next";
import { AcceptInvitationForm } from "@/components/accept-invitation-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Opturon | Activar invitacion",
  description: "Activa tu cuenta y crea tu contrasena para ingresar al espacio."
};

export default async function AcceptInvitationPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;

  return (
    <section className="container-opt py-20">
      <Card className="mx-auto max-w-xl p-8">
        <h1 className="mb-2 text-2xl font-semibold">Activa tu cuenta</h1>
        <p className="mb-6 text-muted">Confirma tu invitacion y define tu contrasena para entrar a Opturon.</p>
        <AcceptInvitationForm token={sp.token} />
      </Card>
    </section>
  );
}
