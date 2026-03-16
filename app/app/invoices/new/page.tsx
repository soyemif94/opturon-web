import { ClientPageShell } from "@/components/app/client-page-shell";
import { InvoiceDraftEditor } from "@/components/app/InvoiceDraftEditor";
import { canEditWorkspace } from "@/lib/app-permissions";
import { getPortalContacts, getPortalInvoiceDetail, isBackendConfigured, type PortalContactDetail } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";

export default async function AppInvoiceDraftCreatePage({
  searchParams
}: {
  searchParams: Promise<{ type?: string; parentInvoiceId?: string }>;
}) {
  const ctx = await requireAppPage();
  const params = await searchParams;
  const readOnly = !ctx.tenantId || !canEditWorkspace(ctx);
  let contacts: PortalContactDetail[] = [];
  let parentInvoice = null;
  const isCreditNote = params?.type === "credit_note" && Boolean(params?.parentInvoiceId);

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const [contactsResult, parentInvoiceResult] = await Promise.all([
        getPortalContacts(ctx.tenantId),
        isCreditNote && params.parentInvoiceId ? getPortalInvoiceDetail(ctx.tenantId, params.parentInvoiceId).catch(() => null) : Promise.resolve(null)
      ]);
      contacts = Array.isArray(contactsResult.data?.contacts) ? (contactsResult.data.contacts as PortalContactDetail[]) : [];
      parentInvoice = parentInvoiceResult?.data || null;
    } catch {
      contacts = [];
      parentInvoice = null;
    }
  }

  return (
    <ClientPageShell
      title={isCreditNote ? "Nueva nota de credito draft" : "Nueva factura draft"}
      description={
        isCreditNote
          ? "Genera una nota de credito simple asociada a la factura origen y dejala lista para emitir luego."
          : "Crea un borrador simple con items manuales y dejalo listo para emitir luego desde el modulo de billing."
      }
      badge={isCreditNote ? "Nota de credito" : "Draft"}
    >
      {readOnly ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-sm text-muted">
          Este workspace esta en modo solo lectura y no puede crear drafts.
        </div>
      ) : isCreditNote && !parentInvoice ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-sm text-muted">
          No pudimos cargar la factura origen para crear esta nota de credito.
        </div>
      ) : (
        <InvoiceDraftEditor contacts={contacts} parentInvoice={parentInvoice} />
      )}
    </ClientPageShell>
  );
}
