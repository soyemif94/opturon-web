import { ClientPageShell } from "@/components/app/client-page-shell";
import { LoyaltyWorkspace } from "@/components/app/LoyaltyWorkspace";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { canEditWorkspace } from "@/lib/app-permissions";
import { getPortalContacts, getPortalLoyaltyOverview, isBackendConfigured, type PortalContact, type PortalLoyaltyOverview } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";

function buildEmptyOverview(): PortalLoyaltyOverview {
  return {
    program: {
      id: null,
      clinicId: null,
      enabled: false,
      spendAmount: 1000,
      pointsAmount: 10,
      programText: "Cada compra valida suma puntos para futuras recompensas.",
      redemptionPolicyText: "El equipo puede canjear recompensas manualmente desde el panel.",
      createdAt: null,
      updatedAt: null
    },
    rewards: [],
    summary: {
      enrolledCustomers: 0,
      activeCustomers: 0,
      pointsIssued: 0,
      pointsRedeemed: 0,
      outstandingPoints: 0,
      totalMovements: 0,
      totalRedemptions: 0,
      activeRewards: 0
    },
    recentMovements: []
  };
}

export default async function AppLoyaltyPage() {
  const ctx = await requireAppPage();
  const readOnly = !ctx.tenantId || !canEditWorkspace(ctx);
  let overview = buildEmptyOverview();
  let contacts: PortalContact[] = [];

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const [overviewResult, contactsResult] = await Promise.all([
        getPortalLoyaltyOverview(ctx.tenantId),
        getPortalContacts(ctx.tenantId)
      ]);
      overview = overviewResult.data.overview;
      contacts = contactsResult.data.contacts || [];
    } catch {
      overview = buildEmptyOverview();
      contacts = [];
    }
  }

  return (
    <ClientPageShell
      title="Fidelizacion"
      description="Premia la lealtad de tus clientes con puntos, recompensas y seguimiento comercial desde un solo lugar."
      badge={overview.program.enabled ? "Programa activo" : "Programa pausado"}
      action={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button asChild variant="secondary" className="rounded-2xl">
            <Link href="#programa">Configuracion del programa</Link>
          </Button>
          {!readOnly ? (
            <Button asChild className="rounded-2xl">
              <Link href="#reward-editor">Crear recompensa</Link>
            </Button>
          ) : null}
        </div>
      }
    >
      <LoyaltyWorkspace initialOverview={overview} initialContacts={contacts} readOnly={readOnly} />
    </ClientPageShell>
  );
}
