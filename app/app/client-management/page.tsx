import { AdminClientConfiguration } from "@/components/app/AdminClientConfiguration";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { redirect } from "next/navigation";
import { getAdminTenantPolicies } from "@/lib/admin-client-policy";
import { requireOpturonAdminPage, resolveOpturonAdminActorId } from "@/lib/saas/access";

export default async function ClientManagementPage() {
  const ctx = await requireOpturonAdminPage("/app/client-management");
  const actorUserId = resolveOpturonAdminActorId(ctx);
  if (!actorUserId) redirect("/app");
  const result = await getAdminTenantPolicies({ actorUserId });

  return (
    <ClientPageShell
      title="Gestión de clientes"
      description="Administra clientes, módulos, planes e integraciones"
      badge="Opturon admin"
    >
      <AdminClientConfiguration initialTenants={result.data.tenants || []} />
    </ClientPageShell>
  );
}
