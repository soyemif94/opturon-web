import { AutomationBuilder } from "@/components/app/AutomationBuilder";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { requireAppPage } from "@/lib/saas/access";

export default async function AppAutomationsNewPage() {
  await requireAppPage({ permission: "manage_workspace" });

  return (
    <ClientPageShell
      title="Nueva automatizacion"
      description="Crea la primera version de una regla automatica para responder, derivar o etiquetar conversaciones dentro de tu espacio."
      badge="Automatizacion"
    >
      <AutomationBuilder />
    </ClientPageShell>
  );
}
