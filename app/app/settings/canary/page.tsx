import Link from "next/link";
import { BellRing } from "lucide-react";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { WhatsAppTemplateCanary } from "@/components/app/whatsapp-template-canary";
import { Button } from "@/components/ui/button";
import { requireOpturonAdminPage } from "@/lib/saas/access";

export default async function AppCanarySettingsPage() {
  await requireOpturonAdminPage("/app/settings/canary");

  return (
    <ClientPageShell
      title="Canary de WhatsApp"
      description="Ejecutá una prueba controlada del canal WhatsApp y verificá plantilla, envío y estados de entrega."
      badge="Herramienta interna"
      backHref="/app/settings"
      backLabel="Volver a Configuración"
      action={
        <Button asChild variant="secondary" className="rounded-2xl">
          <Link href="/app/settings/operational-alerts">
            <BellRing className="mr-2 h-4 w-4" />
            Gestionar destinatarios autorizados
          </Link>
        </Button>
      }
    >
      <div className="min-w-0 max-w-full overflow-hidden">
        <WhatsAppTemplateCanary />
      </div>
    </ClientPageShell>
  );
}
