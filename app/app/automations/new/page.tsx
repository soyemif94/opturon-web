import { AutomationBuilder } from "@/components/app/AutomationBuilder";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { requireAppPage } from "@/lib/saas/access";

export default async function AppAutomationsNewPage() {
  await requireAppPage({ permission: "manage_workspace" });

  return (
    <ClientPageShell
      title="Nueva automatizacion"
      description="Crea una automatizacion personalizada para casos especiales, como vacaciones, avisos temporales, promociones puntuales o seguimientos especificos."
      badge="Automatizacion"
    >
      <AutomationBuilder />
    </ClientPageShell>
  );
}
