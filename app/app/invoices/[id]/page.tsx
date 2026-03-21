import { ClientPageShell } from "@/components/app/client-page-shell";
import { InvoiceDetailView } from "@/components/app/InvoiceDetailView";
import { canEditWorkspace } from "@/lib/app-permissions";
import { getPortalInvoiceDetail, getPortalPayments, isBackendConfigured, type PortalPayment } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";

export default async function AppInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAppPage();
  const { id } = await params;
  const readOnly = !ctx.tenantId || !canEditWorkspace(ctx);
  let invoice = null;
  let payments: PortalPayment[] = [];

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const [invoiceResult, paymentsResult] = await Promise.all([
        getPortalInvoiceDetail(ctx.tenantId, id),
        getPortalPayments(ctx.tenantId).catch(() => null)
      ]);
      invoice = invoiceResult.data;
      payments = Array.isArray(paymentsResult?.data?.payments) ? paymentsResult.data.payments : [];
    } catch {
      invoice = null;
      payments = [];
    }
  }

  return (
    <ClientPageShell
      title={
        invoice?.invoiceNumber
          ? `${invoice.type === "credit_note" ? "Nota de credito interna" : "Comprobante interno"} ${invoice.internalDocumentNumber || invoice.invoiceNumber}`
          : invoice?.type === "credit_note"
            ? "Detalle de nota de credito interna"
            : "Detalle de comprobante interno"
      }
      description={
        invoice?.type === "credit_note"
          ? "Panel para revisar origen, preparacion contable e impacto documental negativo de la nota de credito."
          : "Panel para revisar items, estado contable, saldo documental y descarga del documento interno."
      }
      badge={invoice?.type === "credit_note" ? "Detalle contable" : "Comprobante interno"}
    >
      {invoice ? (
        <InvoiceDetailView invoice={invoice} payments={payments} readOnly={readOnly} />
      ) : (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-sm text-muted">
          No pudimos cargar la invoice solicitada.
        </div>
      )}
    </ClientPageShell>
  );
}
