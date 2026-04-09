import { requireAppPage } from "@/lib/saas/access";
import { listTenantMembers } from "@/lib/saas/store";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { AgendaWorkspace } from "@/components/app/agenda-workspace";

type AgendaPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AppAgendaPage({ searchParams }: AgendaPageProps) {
  const ctx = await requireAppPage();
  const params = searchParams ? await searchParams : undefined;
  const actionType = getSearchParam(params?.actionType);
  const sellerOptions = ctx.tenantId
    ? listTenantMembers(ctx.tenantId)
        .filter((member) => member.tenantRole !== "viewer")
        .map((member) => ({
          id: member.id,
          name: member.name,
          role: member.tenantRole
        }))
    : [];

  return (
    <ClientPageShell
      title="Agenda"
      description="Modulo nativo de Opturon para organizar disponibilidad, seguimientos, notas internas y futura reserva de turnos desde conversaciones."
      badge="Agenda nativa"
    >
      <AgendaWorkspace
        currentUserId={ctx.userId}
        sellerOptions={sellerOptions}
        initialCommercialPrefill={
          actionType === "visit" || actionType === "demo"
            ? {
                conversationId: getSearchParam(params?.conversationId),
                contactId: getSearchParam(params?.contactId),
                contactName: getSearchParam(params?.contactName),
                phone: getSearchParam(params?.phone),
                actionType
              }
            : undefined
        }
      />
    </ClientPageShell>
  );
}
