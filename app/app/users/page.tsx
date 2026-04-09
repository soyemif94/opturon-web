import { TenantUsersManager } from "@/components/app/TenantUsersManager";
import { canManageUsers } from "@/lib/app-permissions";
import type { PortalUsersMeta } from "@/lib/api";
import { getPortalUsers, isBackendConfigured, isPortalInternalAuthConfigured } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";
import { listTenantMembers, readSaasData } from "@/lib/saas/store";

const DEFAULT_SUBACCOUNT_LIMIT = (() => {
  const parsed = Number.parseInt(String(process.env.DEFAULT_TENANT_SUBACCOUNT_LIMIT || "5"), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 5;
})();

export default async function AppUsersPage() {
  const ctx = await requireAppPage({ permission: "manage_users" });
  const data = !ctx.tenantId ? readSaasData() : null;
  const tenantId = ctx.tenantId || data?.tenants[0]?.id || "";
  const canManage = canManageUsers(ctx);
  const backendUsersReady = tenantId && isBackendConfigured() && isPortalInternalAuthConfigured();

  let users: Array<{ id: string; email: string; name: string; tenantRole: string; accountKind: "primary" | "subaccount" }> =
    !ctx.tenantId && !backendUsersReady
      ? listTenantMembers(tenantId).map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          tenantRole: user.tenantRole,
          accountKind: user.tenantRole === "owner" ? "primary" : "subaccount"
        }))
      : [];
  let initialMeta: PortalUsersMeta = {
    subaccountCount: users.filter((user) => user.accountKind === "subaccount").length,
    primaryAccountCount: users.filter((user) => user.accountKind === "primary").length,
    primaryPortalUserId: users.find((user) => user.accountKind === "primary")?.id || null,
    subaccountLimit: DEFAULT_SUBACCOUNT_LIMIT,
    remainingSubaccounts: Math.max(
      0,
      DEFAULT_SUBACCOUNT_LIMIT - users.filter((user) => user.accountKind === "subaccount").length
    ),
    futureLimitKey: "tenant_portal_users",
    limitScope: "subaccounts",
    limitSource: "default_env"
  };

  if (backendUsersReady) {
    try {
      const response = await getPortalUsers(tenantId);
      users = (response.data.users || []).map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        tenantRole: user.role,
        accountKind: user.accountKind === "primary" ? "primary" : "subaccount"
      }));
      initialMeta = response.data.meta || initialMeta;
    } catch (error) {
      console.error("[app-users-page] Failed to load backend users.", error);
    }
  }

  return (
    <TenantUsersManager
      initialUsers={users}
      canManage={canManage}
      currentUserId={ctx.userId}
      currentTenantRole={ctx.tenantRole}
      currentGlobalRole={ctx.globalRole}
      initialMeta={initialMeta}
    />
  );
}
