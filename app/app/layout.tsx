import { AppShell } from "@/components/layout/app-shell";
import { CommandPaletteProvider } from "@/components/ui/command-palette";
import { isStaffRole } from "@/lib/app-permissions";
import { requireAppPage } from "@/lib/saas/access";
import { readSaasData } from "@/lib/saas/store";
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
      userId={ctx.userId}
    >
      <div className="min-h-screen w-full">
        <AppShell
          tenantId={ctx.tenantId}
          tenantLabel={tenantLabel}
          buildMarker={buildMarker}
          buildEnv={buildEnv}
          deploymentId={deploymentId}
          globalRole={ctx.globalRole}
          tenantRole={ctx.tenantRole}
          accountScope={ctx.accountScope}
          whatsappStatus={whatsappStatus}
        >
          {children}
        </AppShell>
      </div>
    </CommandPaletteProvider>
  );
}
