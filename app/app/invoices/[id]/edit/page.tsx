import { ClientPageShell } from "@/components/app/client-page-shell";
import { InvoiceDraftEditor } from "@/components/app/InvoiceDraftEditor";
import { canEditWorkspace } from "@/lib/app-permissions";
import { getPortalContacts, getPortalInvoiceDetail, isBackendConfigured, type PortalContactDetail } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";

export default async function AppInvoiceDraftEditPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAppPage();
  const { id } = await params;
  const readOnly = !ctx.tenantId || !canEditWorkspace(ctx);
  let contacts: PortalContactDetail[] = [];
  let invoice = null;

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const [contactsResult, invoiceResult] = await Promise.all([
        getPortalContacts(ctx.tenantId),
        getPortalInvoiceDetail(ctx.tenantId, id)
      ]);
      contacts = Array.isArray(contactsResult.data?.contacts) ? (contactsResult.data.contacts as PortalContactDetail[]) : [];
      invoice = invoiceResult.data;
    } catch {
      contacts = [];
      invoice = null;
    }
  }

  return (
    <ClientPageShell
      title={
        invoice?.invoiceNumber
          ? `Editar ${invoice.type === "credit_note" ? "nota de credito" : "factura"} ${invoice.invoiceNumber}`
          : "Editar factura draft"
      }
      description={
        invoice?.type === "credit_note"
          ? "Ajusta la nota de credito draft antes de emitirla desde su detail."
          : "Ajusta items y datos basicos del borrador antes de emitirlo desde el detail."
      }
      badge={invoice?.type === "credit_note" ? "Editar nota de credito" : "Editar draft"}
    >
      {!invoice ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-sm text-muted">
          No pudimos cargar la draft solicitada.
        </div>
      ) : readOnly ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-sm text-muted">
          Este workspace esta en modo solo lectura y no puede editar drafts.
        </div>
      ) : invoice.status !== "draft" ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-sm text-muted">
          Solo las invoices en estado draft pueden editarse.
        </div>
      ) : (
        <InvoiceDraftEditor contacts={contacts} invoice={invoice} />
      )}
    </ClientPageShell>
  );
}
