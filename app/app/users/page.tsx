import { TenantUsersManager } from "@/components/app/TenantUsersManager";
import { getPortalUsers, isBackendConfigured, isPortalInternalAuthConfigured } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";
import { listTenantMembers, readSaasData } from "@/lib/saas/store";

export default async function AppUsersPage() {
  const ctx = await requireAppPage({ permission: "manage_users" });
  const data = readSaasData();
  const tenantId = ctx.tenantId || data.tenants[0]?.id || "";
  const canManage = ctx.tenantRole === "owner" || ctx.globalRole === "superadmin";

  let users: Array<{ id: string; email: string; name: string; tenantRole: string }> = listTenantMembers(tenantId).map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    tenantRole: user.tenantRole
  }));

  if (tenantId && isBackendConfigured() && isPortalInternalAuthConfigured()) {
    try {
      const response = await getPortalUsers(tenantId);
      users = (response.data.users || []).map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        tenantRole: user.role
      }));
    } catch (error) {
      console.error("[app-users-page] Failed to load backend users.", error);
    }
  }

  return <TenantUsersManager initialUsers={users} canManage={canManage} currentUserId={ctx.userId} />;
}
