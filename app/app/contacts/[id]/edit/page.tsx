import { ClientPageShell } from "@/components/app/client-page-shell";
import { ContactEditor } from "@/components/app/ContactEditor";
import { canEditWorkspace } from "@/lib/app-permissions";
import { getPortalContactDetail, isBackendConfigured } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";

export default async function AppContactEditPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAppPage();
  const { id } = await params;
  const readOnly = !ctx.tenantId || !canEditWorkspace(ctx);
  let contact = null;

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const result = await getPortalContactDetail(ctx.tenantId, id);
      contact = result.data;
    } catch {
      contact = null;
    }
  }

  return (
    <ClientPageShell
      title={contact?.name ? `Editar ${contact.name}` : "Editar contacto"}
      description="Ajusta datos del cliente para mantener el CRM y billing operables desde el portal."
      badge="Edicion de contacto"
    >
      {!contact ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-sm text-muted">
          No pudimos cargar el contacto solicitado.
        </div>
      ) : readOnly ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-sm text-muted">
          Este workspace esta en modo solo lectura y no puede editar contactos.
        </div>
      ) : (
        <ContactEditor contact={contact} />
      )}
    </ClientPageShell>
  );
}
