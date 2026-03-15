import { ClientPageShell } from "@/components/app/client-page-shell";
import { InvoicesWorkspace } from "@/components/app/InvoicesWorkspace";
import { canEditWorkspace } from "@/lib/app-permissions";
import { getPortalInvoices, isBackendConfigured, type PortalInvoice } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";

export default async function AppInvoicesPage() {
  const ctx = await requireAppPage();
  const readOnly = !ctx.tenantId || !canEditWorkspace(ctx);
  let invoices: PortalInvoice[] = [];

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const result = await getPortalInvoices(ctx.tenantId);
      invoices = Array.isArray(result.data?.invoices) ? result.data.invoices : [];
    } catch {
      invoices = [];
    }
  }

  return (
    <ClientPageShell
      title="Facturas"
      description="Primera vista operativa de facturacion para revisar documentos internos, saldo documental y cobranza sobre cada factura."
      badge="Facturacion"
    >
      <InvoicesWorkspace initialInvoices={invoices} readOnly={readOnly} />
    </ClientPageShell>
  );
}
