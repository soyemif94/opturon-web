import { requireAppPage } from "@/lib/saas/access";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { AgendaWorkspace } from "@/components/app/agenda-workspace";

export default async function AppAgendaPage() {
  await requireAppPage();

  return (
    <ClientPageShell
      title="Agenda"
      description="Modulo nativo de Opturon para organizar disponibilidad, seguimientos, notas internas y futura reserva de turnos desde conversaciones."
      badge="Agenda nativa"
    >
      <AgendaWorkspace />
    </ClientPageShell>
  );
}
