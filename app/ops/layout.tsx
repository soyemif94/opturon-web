import { OpsShell } from "@/components/layout/ops-shell";
import { CommandPaletteProvider } from "@/components/ui/command-palette";
import { requireOpsPage } from "@/lib/saas/access";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireOpsPage();
  return (
    <CommandPaletteProvider scope="ops" tenantId={ctx.tenantId} isStaff={true} userId={ctx.userId}>
      <OpsShell>{children}</OpsShell>
    </CommandPaletteProvider>
  );
}
