import { ClientPageShell } from "@/components/app/client-page-shell";
import { TenantOperatingProfileSettings } from "@/components/app/TenantOperatingProfileSettings";
import { getPortalTenantContext, isBackendConfigured } from "@/lib/api";
import { requireAppModulePage } from "@/lib/saas/access";

export default async function SettingsModulesPage() {
  const ctx = await requireAppModulePage("settings", { permission: "manage_workspace" });
  const result = ctx.tenantId && isBackendConfigured() ? await getPortalTenantContext(ctx.tenantId).catch(() => null) : null;
  const policy = result?.data?.policy;

  if (!policy) {
    return (
      <ClientPageShell title="Modulos y operacion" description="Configuracion operativa del tenant." badge="Configuracion">
        <div className="rounded-2xl border border-[color:var(--border)] bg-card/90 p-6 text-sm text-muted">
          No pudimos cargar la configuracion operativa del tenant.
        </div>
      </ClientPageShell>
    );
  }

  return (
    <ClientPageShell title="Modulos y operacion" description="Perfil operativo, subtipo y capacidades del tenant." badge="Configuracion">
      <TenantOperatingProfileSettings initialPolicy={policy} />
    </ClientPageShell>
  );
}
