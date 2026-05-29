import Link from "next/link";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAppPage } from "@/lib/saas/access";

const ideas = [
  {
    id: "welcome",
    title: "Bienvenida automatica",
    description: "Ideal para recibir al cliente y guiar el primer paso de la conversacion."
  },
  {
    id: "handoff",
    title: "Derivacion a humano",
    description: "Util cuando el cliente necesita atencion personalizada del equipo."
  },
  {
    id: "off-hours",
    title: "Fuera de horario",
    description: "Sirve para dejar un mensaje temporal cuando no estas disponible."
  },
  {
    id: "lead-capture",
    title: "Captar prospectos",
    description: "Pide datos clave y te ayuda a ordenar el primer contacto comercial."
  }
];

export default async function AppAutomationsTemplatesPage() {
  await requireAppPage({ permission: "manage_workspace" });

  return (
    <ClientPageShell
      title="Ideas listas para usar"
      description="Aqui tienes algunas bases simples para arrancar. Si quieres algo especial, usa el builder personalizado."
      badge="Automatizaciones"
      backHref="/app/automations"
      backLabel="Volver al centro"
    >
      <div className="grid gap-4 xl:grid-cols-2">
        {ideas.map((idea) => (
          <Card key={idea.id} className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
            <CardHeader action={<Badge variant="warning">Base guiada</Badge>}>
              <div>
                <CardTitle className="text-xl text-white">{idea.title}</CardTitle>
                <p className="mt-2 text-sm leading-6 text-muted">{idea.description}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="rounded-2xl border border-white/8 bg-black/12 p-4 text-sm leading-6 text-muted">
                Esta base abre el wizard con una configuracion inicial para que no tengas que empezar desde cero.
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="rounded-2xl">
                  <Link href={`/app/automations/new?template=${encodeURIComponent(idea.id)}`}>Usar esta base</Link>
                </Button>
                <Button asChild variant="secondary" className="rounded-2xl">
                  <Link href="/app/automations/new?template=custom">Crear una personalizada</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ClientPageShell>
  );
}
