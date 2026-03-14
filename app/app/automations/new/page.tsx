import Link from "next/link";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAppPage } from "@/lib/saas/access";

export default async function AppAutomationsNewPage() {
  await requireAppPage({ permission: "manage_workspace" });

  return (
    <ClientPageShell
      title="Nueva automatización"
      description="Prepara la base de tu próxima automatización. Esta pantalla ya quedó conectada para que el flujo de creación exista dentro del portal."
      badge="Automatizacion"
    >
      <Card className="max-w-3xl border-white/6 bg-card/90">
        <CardHeader>
          <div>
            <CardTitle className="text-2xl">Crear primera automatización</CardTitle>
            <CardDescription>
              Dejamos la ruta operativa para que el portal no tenga CTAs muertos. El siguiente paso es conectar aquí el builder real de reglas.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4 text-sm leading-6 text-muted">
            Aquí vamos a montar el flujo real para elegir disparador, mensaje y acción. Mientras tanto, ya puedes navegar desde el Centro de automatización sin caer en un botón sin respuesta.
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="rounded-2xl">
              <Link href="/app/automations/templates">Ver recomendaciones</Link>
            </Button>
            <Button asChild variant="secondary" className="rounded-2xl">
              <Link href="/app/automations">Volver al centro</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </ClientPageShell>
  );
}
