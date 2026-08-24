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
      title="Prueba de WhatsApp"
      description="Verificá con un envío controlado que plantillas, entrega y estados del canal WhatsApp estén funcionando correctamente."
      badge="Canary interno"
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
      <p className="rounded-2xl border border-[color:var(--border)] bg-surface/45 px-4 py-3 text-sm leading-6 text-muted">
        Herramienta interna de diagnóstico. No corresponde al sistema de alertas automáticas de clientes.
      </p>
      <div className="min-w-0 max-w-full overflow-hidden">
        <WhatsAppTemplateCanary />
      </div>
    </ClientPageShell>
  );
}
