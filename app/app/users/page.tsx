import { TenantUsersManager } from "@/components/app/TenantUsersManager";
import { getPortalUsers, isBackendConfigured, isPortalInternalAuthConfigured } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";
import { listTenantMembers, readSaasData } from "@/lib/saas/store";

export default async function AppUsersPage({ searchParams }: { searchParams?: Promise<{ tenantId?: string }> }) {
  const sp = searchParams ? await searchParams : {};
  const ctx = await requireAppPage({ permission: "manage_users" });
  const data = !ctx.tenantId ? readSaasData() : null;
  const requestedTenantId = String(sp?.tenantId || "").trim();
  const canUseRequestedTenant = Boolean(requestedTenantId && ["superadmin", "ops_admin", "sales_rep", "support_agent"].includes(String(ctx.globalRole || "")));
  const tenantId = (canUseRequestedTenant ? requestedTenantId : "") || ctx.tenantId || data?.tenants[0]?.id || "";
  const canManage = ctx.tenantRole === "owner" || ctx.globalRole === "superadmin";
  const backendUsersReady = tenantId && isBackendConfigured() && isPortalInternalAuthConfigured();

  let users: Array<{ id: string; email: string; name: string; tenantRole: string }> =
    !ctx.tenantId && !backendUsersReady
      ? listTenantMembers(tenantId).map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          tenantRole: user.tenantRole
        }))
      : [];

  if (backendUsersReady) {
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

  return <TenantUsersManager initialUsers={users} canManage={canManage} currentUserId={ctx.userId} tenantId={tenantId} />;
}
