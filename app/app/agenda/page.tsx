import { requireAppPage } from "@/lib/saas/access";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientPageShell } from "@/components/app/client-page-shell";

const demoTasks = [
  { id: "task-1", title: "Responder prospectos calientes", time: "Hoy - 10:30", status: "Urgente" },
  { id: "task-2", title: "Confirmar demo comercial", time: "Hoy - 16:00", status: "Pendiente" },
  { id: "task-3", title: "Revisar consultas sin leer", time: "Manana - 09:00", status: "Seguimiento" }
];

export default async function AppAgendaPage() {
  const ctx = await requireAppPage();
  const isRealTenant = Boolean(ctx.tenantId);

  return (
    <ClientPageShell
      title="Agenda"
      description="Espacio visual para centralizar seguimientos, recordatorios y proximas acciones comerciales."
      badge="Seguimiento"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="muted">{isRealTenant ? "Proximamente" : "Agenda demo"}</Badge>}>
            <div>
              <CardTitle className="text-xl">Proximas tareas</CardTitle>
              <CardDescription>
                {isRealTenant
                  ? "Todavia no hay una agenda persistente conectada para este espacio. Cuando activemos esta capa vas a ver seguimientos y recordatorios reales."
                  : "Vista simple lista para evolucionar a agenda real conectada al inbox."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {isRealTenant ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/55 p-5 text-sm leading-6 text-muted">
                Este espacio todavia no tiene tareas ni seguimientos sincronizados. Cuando integremos agenda real por tenant, este espacio va a empezar vacio y a llenarse solo con actividad propia del negocio.
              </div>
            ) : (
              demoTasks.map((task) => (
                <div key={task.id} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="mt-1 text-sm text-muted">{task.time}</p>
                    </div>
                    <Badge variant={task.status === "Urgente" ? "danger" : task.status === "Pendiente" ? "warning" : "muted"}>{task.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader>
            <div>
              <CardTitle className="text-xl">Siguiente evolucion</CardTitle>
              <CardDescription>Este bloque puede conectarse luego a tareas del inbox y citas reales.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4 text-sm leading-6 text-muted">
              Pendiente de integracion con agenda del negocio, turnos o callbacks desde conversaciones.
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientPageShell>
  );
}
