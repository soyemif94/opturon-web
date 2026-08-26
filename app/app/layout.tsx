import { AppShell } from "@/components/layout/app-shell";
import { CommandPaletteProvider } from "@/components/ui/command-palette";
import { isStaffRole } from "@/lib/app-permissions";
import { getPortalTenantContext, isBackendConfigured } from "@/lib/api";
import { isOpturonAdminWorkspaceContext, requireAppPage } from "@/lib/saas/access";
import { readSaasData } from "@/lib/saas/store";
import { buildTenantAppModules } from "@/lib/tenant-policy";
import { buildWhatsAppConnectionStatus } from "@/lib/whatsapp-channel-state";

export default async function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAppPage();
  const canUseLocalDemoData = !ctx.tenantId && isStaffRole(ctx.globalRole);
  const rawTenantLabel = ctx.tenantId
    ? "Espacio del cliente"
    : canUseLocalDemoData
      ? (() => {
        const data = readSaasData();
        const tenant = data.tenants.find((item) => item.id === ctx.tenantId) || data.tenants[0];
        return tenant ? tenant.name : `Tenant: ${ctx.tenantId || "espacio"}`;
      })()
      : "Espacio sin asignar";
  const tenantLabel = /demo tenant/i.test(rawTenantLabel) ? "Espacio del cliente" : rawTenantLabel;
  const showDebugInfo = process.env.NEXT_PUBLIC_SHOW_DEBUG_INFO === "true";
  const buildMarker = showDebugInfo
    ? process.env.NEXT_PUBLIC_APP_BUILD_MARKER || process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || process.env.VERCEL_DEPLOYMENT_ID || "local-dev"
    : undefined;
  const buildEnv = showDebugInfo
    ? process.env.VERCEL_ENV ||
      (process.env.NODE_ENV === "production" ? "production" : process.env.NODE_ENV || "development")
    : undefined;
  const deploymentId = showDebugInfo
    ? process.env.VERCEL_DEPLOYMENT_ID?.slice(0, 8) ||
      process.env.VERCEL_URL?.replace(/\.vercel\.app$/i, "") ||
      undefined
    : undefined;
  const appGlobalRole = ctx.globalRole === "partner" ? undefined : ctx.globalRole;
  let tenantSuspended = false;
  const tenantContext =
    ctx.tenantId && isBackendConfigured() && !isOpturonAdminWorkspaceContext(ctx)
      ? await getPortalTenantContext(ctx.tenantId).catch((error: unknown) => {
          const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 0;
          const body = error && typeof error === "object" && "body" in error ? error.body : null;
          tenantSuspended = status === 423 || Boolean(body && typeof body === "object" && "error" in body && body.error === "tenant_suspended");
          return null;
        })
      : null;
  if (tenantSuspended) {
    return (
      <main className="grid min-h-screen place-items-center bg-surface px-5" data-tenant-suspended-screen>
        <section className="w-full max-w-lg rounded-2xl border border-[color:var(--border)] bg-card p-6 text-center shadow-[var(--card-shadow)]">
          <h1 className="text-xl font-semibold text-text">Cuenta temporalmente suspendida</h1>
          <p className="mt-3 text-sm leading-6 text-muted">Tu cuenta está temporalmente suspendida. Contactá al administrador de Opturon.</p>
        </section>
      </main>
    );
  }
  const tenantModules = buildTenantAppModules(tenantContext?.data?.policy || null);
  const whatsappStatus = buildWhatsAppConnectionStatus({
    fallbackReason: ctx.tenantId
      ? "portal_status_pending_client_refresh"
      : canUseLocalDemoData
        ? "workspace_without_backend"
        : "missing_tenant_id"
  });

  return (
    <CommandPaletteProvider
      scope="app"
      tenantId={ctx.tenantId}
      isStaff={Boolean(ctx.globalRole && ctx.globalRole !== "client")}
      globalRole={ctx.globalRole}
      tenantRole={ctx.tenantRole}
      accountScope={ctx.accountScope}
      tenantModules={tenantModules}
      userId={ctx.userId}
    >
      <div className="min-h-screen w-full">
        <AppShell
          tenantId={ctx.tenantId}
          tenantLabel={tenantLabel}
          buildMarker={buildMarker}
          buildEnv={buildEnv}
          deploymentId={deploymentId}
          globalRole={appGlobalRole}
          tenantRole={ctx.tenantRole}
          accountScope={ctx.accountScope}
          tenantModules={tenantModules}
          whatsappStatus={whatsappStatus}
        >
          {children}
        </AppShell>
      </div>
    </CommandPaletteProvider>
  );
}
