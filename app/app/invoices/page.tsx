import { ClientPageShell } from "@/components/app/client-page-shell";
import { InvoicesHeaderActions, InvoicesWorkspace } from "@/components/app/InvoicesWorkspace";
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
      title="Comprobantes internos"
      description="Visualiza, filtra y descarga todos los comprobantes emitidos desde el sistema y el bot."
      action={<InvoicesHeaderActions readOnly={readOnly} />}
    >
      <InvoicesWorkspace initialInvoices={invoices} readOnly={readOnly} />
    </ClientPageShell>
  );
}
