import { ClientPageShell } from "@/components/app/client-page-shell";
import { IntegrationsHub } from "@/components/app/integrations-hub";

export default function AppIntegrationsPage() {
  return (
    <ClientPageShell
      title="Integraciones"
      description="Centro de integraciones para que el cliente entienda rapido que puede conectar y como se activa su canal principal."
      badge="Embedded Signup ready"
    >
      <IntegrationsHub />
    </ClientPageShell>
  );
}
