import { ClientPageShell } from "@/components/app/client-page-shell";
import { PaymentsWorkspace } from "@/components/app/PaymentsWorkspace";
import { canEditWorkspace } from "@/lib/app-permissions";
import {
  getPortalInvoices,
  getPortalOrders,
  getPortalPaymentDestinations,
  getPortalPayments,
  isBackendConfigured,
  type PortalInvoice,
  type PortalOrder,
  type PortalPayment,
  type PortalPaymentDestination
} from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";

export default async function AppPaymentsPage() {
  const ctx = await requireAppPage();
  const readOnly = !ctx.tenantId || !canEditWorkspace(ctx);
  let payments: PortalPayment[] = [];
  let invoices: PortalInvoice[] = [];
  let orders: PortalOrder[] = [];
  let paymentDestinations: PortalPaymentDestination[] = [];

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const [paymentsResult, invoicesResult, ordersResult, destinationsResult] = await Promise.all([
        getPortalPayments(ctx.tenantId),
        getPortalInvoices(ctx.tenantId).catch(() => null),
        getPortalOrders(ctx.tenantId).catch(() => null),
        getPortalPaymentDestinations(ctx.tenantId, { includeInactive: true }).catch(() => null)
      ]);
      payments = Array.isArray(paymentsResult.data?.payments) ? paymentsResult.data.payments : [];
      invoices = Array.isArray(invoicesResult?.data?.invoices) ? invoicesResult.data.invoices : [];
      orders = Array.isArray(ordersResult?.data?.orders) ? ordersResult.data.orders : [];
      paymentDestinations = Array.isArray(destinationsResult?.data?.paymentDestinations)
        ? destinationsResult.data.paymentDestinations
        : [];
    } catch {
      payments = [];
      invoices = [];
      orders = [];
      paymentDestinations = [];
    }
  }

  return (
    <ClientPageShell
      title="Cobros"
      description="Vista inicial de cobranzas para ver monto, metodo, estado y como se reparte cada cobro sobre facturas."
      badge="Cobranza"
    >
      <PaymentsWorkspace
        initialPayments={payments}
        initialInvoices={invoices}
        initialOrders={orders}
        initialPaymentDestinations={paymentDestinations}
        readOnly={readOnly}
      />
    </ClientPageShell>
  );
}
