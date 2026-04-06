import { ClientPageShell } from "@/components/app/client-page-shell";
import { OpsDashboard } from "@/components/app/ops/OpsDashboard";
import { canEditWorkspace } from "@/lib/app-permissions";
import { getPortalConversations, getPortalUsers, isBackendConfigured } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";
import type { ConversationRowData } from "@/components/app/inbox/types";

type SellerOption = {
  id: string;
  name: string;
  role: string;
};

export default async function AppOpsPage() {
  const ctx = await requireAppPage();
  const backendReady = Boolean(ctx.tenantId) && isBackendConfigured();
  const readOnly = !canEditWorkspace(ctx);
  let initialConversations: ConversationRowData[] = [];
  let initialSellers: SellerOption[] = [];

  if (ctx.tenantId && backendReady) {
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
            .filter((user) => user && user.role !== "viewer")
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
      <OpsDashboard
        initialConversations={initialConversations}
        initialSellers={initialSellers}
        readOnly={!ctx.tenantId || readOnly}
        backendReady={backendReady}
      />
    </ClientPageShell>
  );
}
