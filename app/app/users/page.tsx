import { requireAppPage } from "@/lib/saas/access";
import { listTenantMembers, readSaasData } from "@/lib/saas/store";
import { TenantUsersManager } from "@/components/app/TenantUsersManager";

export default async function AppUsersPage() {
  const ctx = await requireAppPage();
  const data = readSaasData();
  const tenantId = ctx.tenantId || data.tenants[0]?.id || "";
  const users = listTenantMembers(tenantId);
  const canManage = ctx.tenantRole === "owner" || ctx.tenantRole === "manager" || ctx.globalRole === "superadmin";

  return <TenantUsersManager initialUsers={users} canManage={canManage} />;
}
