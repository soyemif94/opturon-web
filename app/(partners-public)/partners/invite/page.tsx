import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { PartnerInvitationAcceptForm } from "@/components/partners/PartnerInvitationAcceptForm";

export const metadata: Metadata = {
  title: "Opturon | Activar acceso partner",
  description: "Activa tu acceso al Portal de asesores de Opturon."
};

export default async function PartnerInvitePage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,#2f2418_0%,#16100b_48%,#090705_100%)] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl items-center justify-center">
        <Card className="w-full max-w-xl border-white/10 bg-white/95 p-8 text-slate-950 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Portal de asesores</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Activa tu acceso</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Define tu contrasena para ingresar al portal comercial de Opturon.
            </p>
          </div>
          <PartnerInvitationAcceptForm token={sp.token} />
        </Card>
      </div>
    </section>
  );
}
