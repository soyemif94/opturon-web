import { CashHub } from "@/components/app/cash-hub";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { canEditWorkspace } from "@/lib/app-permissions";
import { getPortalCashOverview, isBackendConfigured, type PortalCashBoxOverview, type PortalCashSession } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";

export default async function AppCashPage() {
  const ctx = await requireAppPage();
  const readOnly = !canEditWorkspace(ctx);
  const backendReady = Boolean(ctx.tenantId) && isBackendConfigured();
  let cashBoxes: PortalCashBoxOverview[] = [];
  let recentClosedSessions: PortalCashSession[] = [];

  if (ctx.tenantId && backendReady) {
    try {
      const result = await getPortalCashOverview(ctx.tenantId);
      cashBoxes = Array.isArray(result.data?.cashBoxes) ? result.data.cashBoxes : [];
      recentClosedSessions = Array.isArray(result.data?.recentClosedSessions) ? result.data.recentClosedSessions : [];
    } catch {
      cashBoxes = [];
      recentClosedSessions = [];
    }
  }

  return (
    <ClientPageShell
      title="Caja"
      description="Abre cajas, controla el esperado durante el turno y cierra con diferencia visible sin salir del portal."
      badge="Operacion de caja"
    >
      <CashHub
        initialCashBoxes={cashBoxes}
        initialRecentClosedSessions={recentClosedSessions}
        backendReady={backendReady}
        readOnly={!ctx.tenantId || readOnly}
      />
    </ClientPageShell>
  );
}
