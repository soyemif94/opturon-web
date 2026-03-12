import { AutomationsHub } from "@/components/app/automations-hub";
import { ClientPageShell } from "@/components/app/client-page-shell";

export default function AppAutomationsPage() {
  return (
    <ClientPageShell
      title="Automatizaciones"
      description="Automatiza respuestas y acciones cuando llegan mensajes de WhatsApp. Desde aqui puedes ver que esta activo, que conviene configurar y por donde empezar."
      badge="Automatizacion"
    >
      <AutomationsHub />
    </ClientPageShell>
  );
}
