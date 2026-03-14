import Link from "next/link";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAppPage } from "@/lib/saas/access";

const templates = [
  {
    id: "handoff",
    title: "Derivación a humano",
    description: "Ideal para urgencias, prospectos calientes o conversaciones sensibles."
  },
  {
    id: "off-hours",
    title: "Fuera de horario",
    description: "Responde automáticamente cuando el negocio no está atendiendo."
  },
  {
    id: "lead-capture",
    title: "Captura de prospectos",
    description: "Pide datos clave y ordena el primer contacto comercial."
  }
];

export default async function AppAutomationsTemplatesPage() {
  await requireAppPage({ permission: "manage_workspace" });

  return (
    <ClientPageShell
      title="Recomendaciones de automatización"
      description="Una vista simple para revisar por dónde conviene empezar. Esta ruta ya existe para sostener la navegación real del portal."
      badge="Automatizacion"
    >
      <div className="grid gap-4 xl:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="border-white/6 bg-card/90">
            <CardHeader action={<Badge variant="warning">Recomendada</Badge>}>
              <div>
                <CardTitle className="text-xl">{template.title}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4 text-sm leading-6 text-muted">
                Esta recomendación ya tiene ruta propia. El siguiente paso será conectar aquí presets reales del builder de automatizaciones.
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="rounded-2xl">
                  <Link href={`/app/automations/new?template=${encodeURIComponent(template.id)}`}>Usar esta base</Link>
                </Button>
                <Button asChild variant="secondary" className="rounded-2xl">
                  <Link href="/app/automations">Volver al centro</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ClientPageShell>
  );
}
