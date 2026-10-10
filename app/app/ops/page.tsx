import { cookies } from "next/headers";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { OpsAccessGate } from "@/components/app/ops/OpsAccessGate";
import { OpsDashboard } from "@/components/app/ops/OpsDashboard";
import { canAccessAppModule, canManageWorkspace } from "@/lib/app-permissions";
import { getPortalConversations, getPortalUsers, isBackendConfigured } from "@/lib/api";
import { hasOpsAccessCookie, isOpsAccessConfigured } from "@/lib/ops-access";
import { isOperationalPortalAssigneeUser } from "@/lib/portal-users";
import { requireAppModulePage } from "@/lib/saas/access";
import type { ConversationRowData } from "@/components/app/inbox/types";

type SellerOption = {
  id: string;
  name: string;
  role: string;
};

export default async function AppOpsPage() {
  const ctx = await requireAppModulePage("ops");
  const cookieStore = await cookies();
  const accessConfigured = isOpsAccessConfigured();
  const opsUnlocked = accessConfigured && hasOpsAccessCookie(cookieStore);
  const backendReady = Boolean(ctx.tenantId) && isBackendConfigured();
  const readOnly = !canManageWorkspace(ctx);
  let initialConversations: ConversationRowData[] = [];
  let initialSellers: SellerOption[] = [];

  if (ctx.tenantId && backendReady && opsUnlocked) {
    try {
      const [conversationsResult, usersResult] = await Promise.all([
        getPortalConversations(ctx.tenantId),
        getPortalUsers(ctx.tenantId)
      ]);

      initialConversations = Array.isArray(conversationsResult.data?.conversations)
        ? (conversationsResult.data.conversations as ConversationRowData[])
        : [];
      initialSellers = Array.isArray(usersResult.data?.users)
        ? usersResult.data.users
            .filter((user) => isOperationalPortalAssigneeUser(user))
            .map((user) => ({
              id: user.id,
              name: user.name,
              role: user.role
            }))
        : [];
    } catch {
      initialConversations = [];
      initialSellers = [];
    }
  }

  return (
    <ClientPageShell
      title="OPS comercial"
      description="Centro de control operativo para detectar leads sin atender, seguimientos vencidos y carga por vendedor sin salir del inbox."
      badge="Supervision comercial"
    >
      <OpsAccessGate initialUnlocked={opsUnlocked} accessConfigured={accessConfigured}>
        {opsUnlocked ? (
          <OpsDashboard
            initialConversations={initialConversations}
            initialSellers={initialSellers}
            readOnly={!ctx.tenantId || readOnly}
            backendReady={backendReady}
            reportModules={{
              sales: canAccessAppModule(ctx, "sales") && canAccessAppModule(ctx, "orders"),
              inventory: canAccessAppModule(ctx, "inventory"),
              contacts: canAccessAppModule(ctx, "contacts"),
              metrics: canAccessAppModule(ctx, "metrics"),
              orders: canAccessAppModule(ctx, "orders"),
              invoices: canAccessAppModule(ctx, "invoices"),
              payments: canAccessAppModule(ctx, "payments"),
              cash: canAccessAppModule(ctx, "cash"),
              catalog: canAccessAppModule(ctx, "catalog")
            }}
          />
        ) : null}
      </OpsAccessGate>
    </ClientPageShell>
  );
}
