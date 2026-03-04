import { AppShell } from "@/components/layout/app-shell";
import { CommandPaletteProvider } from "@/components/ui/command-palette";
import { requireAppPage } from "@/lib/saas/access";

export default async function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAppPage();
  return (
    <CommandPaletteProvider
      scope="app"
      tenantId={ctx.tenantId}
      isStaff={Boolean(ctx.globalRole && ctx.globalRole !== "client")}
      userId={ctx.userId}
    >
      <AppShell tenantLabel={`Tenant: ${ctx.tenantId || "demo-mode"}`}>{children}</AppShell>
    </CommandPaletteProvider>
  );
}
