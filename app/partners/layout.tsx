import type { Metadata } from "next";
import { PartnerPortalShell } from "@/components/partners/PartnerPortalShell";
import { requirePartnerPage } from "@/lib/saas/access";

export const metadata: Metadata = {
  title: "Opturon | Portal de asesores",
  description: "Portal independiente para asesores de Opturon."
};

export default async function PartnersLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePartnerPage();
  const user = ctx.session?.user;
  const previewMode = Boolean((ctx as any).previewMode);

  return (
    <PartnerPortalShell userName={String(user?.name || "Asesor")} userEmail={user?.email || null}>
      {previewMode ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Preview local de desarrollo para validar el portal partner sin credenciales productivas.
        </div>
      ) : null}
      {children}
    </PartnerPortalShell>
  );
}
