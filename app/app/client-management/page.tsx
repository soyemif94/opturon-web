import { AdminClientConfiguration } from "@/components/app/AdminClientConfiguration";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { getAdminTenantPolicies } from "@/lib/admin-client-policy";
import { requireOpturonAdminPage } from "@/lib/saas/access";

export default async function ClientManagementPage() {
  await requireOpturonAdminPage("/app/client-management");
  const result = await getAdminTenantPolicies();

  return (
    <ClientPageShell
      title="Gestion de clientes"
      description="Administra plan, limites, modulos y capacidades tecnicas de cada tenant desde la policy central."
      badge="Opturon admin"
    >
      <AdminClientConfiguration initialTenants={result.data.tenants || []} />
    </ClientPageShell>
  );
}
