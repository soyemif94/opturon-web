import type { Metadata } from "next";
import { PartnerPortalShell } from "@/components/partners/PartnerPortalShell";
import { getPartnerMe, getPartnerMeRankProgress } from "@/lib/api";
import { resolveCurrentRank } from "@/lib/partners-portal";
import { requirePartnerPage } from "@/lib/saas/access";

export const metadata: Metadata = {
  title: "Opturon | Portal de asesores",
  description: "Portal independiente para asesores de Opturon."
};

export default async function PartnersLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePartnerPage();
  const user = ctx.session?.user;
  const previewMode = Boolean((ctx as any).previewMode);
  const partnerId = String(user?.partnerId || "").trim();
  let currentRank: string | null = null;
  let accountStatus: string | null = null;

  if (!previewMode && partnerId) {
    try {
      const [partnerResult, rankResult] = await Promise.all([getPartnerMe(partnerId), getPartnerMeRankProgress(partnerId)]);
      const partner = (partnerResult as any)?.data?.partner || null;
      const rankHistory = Array.isArray((rankResult as any)?.data?.rankHistory) ? (rankResult as any).data.rankHistory : [];
      currentRank = resolveCurrentRank(undefined, partner, rankHistory);
      accountStatus = String(partner?.status || "").trim() || null;
    } catch {
      currentRank = null;
      accountStatus = null;
    }
  }

  return (
    <PartnerPortalShell
      userName={String(user?.name || "Asesor")}
      userEmail={user?.email || null}
      currentRank={currentRank}
      accountStatus={accountStatus}
    >
      {previewMode ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Preview local de desarrollo para validar el portal partner sin credenciales productivas.
        </div>
      ) : null}
      {children}
    </PartnerPortalShell>
  );
}
