import { AutomationsHub } from "@/components/app/automations-hub";
import { ClientPageShell } from "@/components/app/client-page-shell";

export default function AppAutomationsPage() {
  return (
    <ClientPageShell
      title="Automatizaciones"
      description="Centro claro para entender que partes de tu atencion ya automatiza el bot y cuales conviene configurar despues."
      badge="Bot control"
    >
      <AutomationsHub />
    </ClientPageShell>
  );
}
