import { AdminOperationalAlertsWorkspace, type AdminOperationalAlertsTenant } from "@/components/app/admin-operational-alerts-workspace";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { getAdminTenantPolicies } from "@/lib/admin-client-policy";
import { requireOpturonAdminPage } from "@/lib/saas/access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function tenantLabel(value: { displayName?: string | null; name?: string | null; primaryEmail?: string | null; tenantId: string }) {
  return String(value.displayName || value.name || value.primaryEmail || value.tenantId).trim() || value.tenantId;
}

export default async function AdminOperationalAlertsPage() {
  const ctx = await requireOpturonAdminPage("/app/admin/operational-alerts");
  const adminWorkspaceTenantId = String(ctx.tenantId || "").trim();
  let initialLoadError: string | null = null;
  let clientTenants: AdminOperationalAlertsTenant[] = [];

  try {
    const result = await getAdminTenantPolicies();
    clientTenants = (result.data.tenants || [])
      .map((tenant) => ({
        tenantId: String(tenant.tenantId || tenant.externalTenantId || "").trim(),
        label: tenantLabel(tenant),
        source: "client" as const
      }))
      .filter((tenant) => Boolean(tenant.tenantId));
  } catch {
    initialLoadError = "No pudimos cargar la lista de tenants cliente. El workspace Admin sigue disponible para revisión.";
  }

  // The Admin workspace is resolved on the server from the authenticated
  // session. It is included even when /admin/clients intentionally lists only
  // client tenants, so the controlled Opturon QA tenant remains selectable.
  const adminWorkspace = adminWorkspaceTenantId ? [{
    tenantId: adminWorkspaceTenantId,
    label: "Workspace Opturon Admin",
    source: "admin_workspace" as const
  }] : [];
  const seen = new Set<string>();
  const tenants = [...adminWorkspace, ...clientTenants].filter((tenant) => {
    if (seen.has(tenant.tenantId)) return false;
    seen.add(tenant.tenantId);
    return true;
  });

  if (!adminWorkspaceTenantId) {
    initialLoadError = "La sesión Admin no resolvió su tenant de workspace. No se puede operar alertas de forma segura.";
  }

  return (
    <ClientPageShell
      title="Alertas operativas — Canario"
      description="Control manual y auditado de un canario por tenant. La pantalla no programa, reintenta ni envía mensajes por sí sola."
      badge="Opturon admin"
      backHref="/app/client-management"
      backLabel="Gestión de clientes"
    >
      <AdminOperationalAlertsWorkspace tenants={tenants} initialLoadError={initialLoadError} />
    </ClientPageShell>
  );
}
