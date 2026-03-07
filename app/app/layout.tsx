import { AppShell } from "@/components/layout/app-shell";
import { CommandPaletteProvider } from "@/components/ui/command-palette";
import { requireAppPage } from "@/lib/saas/access";
import { readSaasData } from "@/lib/saas/store";

export default async function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAppPage();
  const data = readSaasData();
  const tenant = data.tenants.find((item) => item.id === ctx.tenantId) || data.tenants[0];
  const tenantLabel = tenant ? tenant.name : `Tenant: ${ctx.tenantId || "workspace"}`;
  const buildMarker = process.env.NEXT_PUBLIC_APP_BUILD_MARKER || process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || process.env.VERCEL_DEPLOYMENT_ID || "local-dev";
  const buildEnv =
    process.env.VERCEL_ENV ||
    (process.env.NODE_ENV === "production" ? "production" : process.env.NODE_ENV || "development");
  const deploymentId =
    process.env.VERCEL_DEPLOYMENT_ID?.slice(0, 8) ||
    process.env.VERCEL_URL?.replace(/\.vercel\.app$/i, "") ||
    undefined;

  return (
    <CommandPaletteProvider
      scope="app"
      tenantId={ctx.tenantId}
      isStaff={Boolean(ctx.globalRole && ctx.globalRole !== "client")}
      userId={ctx.userId}
    >
      <div className="flex min-h-screen w-full">
        <AppShell tenantLabel={tenantLabel} buildMarker={buildMarker} buildEnv={buildEnv} deploymentId={deploymentId}>
          {children}
        </AppShell>
      </div>
    </CommandPaletteProvider>
  );
}
