import { ClientPageShell } from "@/components/app/client-page-shell";
import { PaymentsWorkspace } from "@/components/app/PaymentsWorkspace";
import { canEditWorkspace } from "@/lib/app-permissions";
import { getPortalInvoices, getPortalPayments, isBackendConfigured, type PortalInvoice, type PortalPayment } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";

export default async function AppPaymentsPage() {
  const ctx = await requireAppPage();
  const readOnly = !ctx.tenantId || !canEditWorkspace(ctx);
  let payments: PortalPayment[] = [];
  let invoices: PortalInvoice[] = [];

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const [paymentsResult, invoicesResult] = await Promise.all([
        getPortalPayments(ctx.tenantId),
        getPortalInvoices(ctx.tenantId).catch(() => null)
      ]);
      payments = Array.isArray(paymentsResult.data?.payments) ? paymentsResult.data.payments : [];
      invoices = Array.isArray(invoicesResult?.data?.invoices) ? invoicesResult.data.invoices : [];
    } catch {
      payments = [];
      invoices = [];
    }
  }

  return (
    <ClientPageShell
      title="Payments"
      description="Vista inicial de cobranzas para ver monto, metodo, estado y como se reparte cada cobro sobre invoices."
      badge="Cobranza"
    >
      <PaymentsWorkspace initialPayments={payments} initialInvoices={invoices} readOnly={readOnly} />
    </ClientPageShell>
  );
}
