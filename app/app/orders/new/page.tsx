import { ClientPageShell } from "@/components/app/client-page-shell";
import { OrderCreateEditor } from "@/components/app/OrderCreateEditor";
import { Button } from "@/components/ui/button";
import { canEditWorkspace } from "@/lib/app-permissions";
import { isBackendConfigured } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";

export default async function AppOrderCreatePage() {
  const ctx = await requireAppPage();
  const readOnly = !ctx.tenantId || !canEditWorkspace(ctx);
  const backendReady = Boolean(ctx.tenantId) && isBackendConfigured();

  return (
    <ClientPageShell
      title="Nuevo pedido"
      description="Crea un pedido con clientes, productos, stock, vendedor y cobro reales desde una pantalla dedicada."
      backHref="/app/orders"
      backLabel="Volver a pedidos"
      action={
        readOnly || !backendReady ? null : (
          <Button type="submit" form="order-create-form" className="rounded-2xl">
            Crear pedido
          </Button>
        )
      }
    >
      {!backendReady ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-sm text-muted">
          Este modulo necesita el backend del portal configurado para registrar pedidos reales.
        </div>
      ) : readOnly ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-sm text-muted">
          Este espacio esta en modo solo lectura y no puede crear pedidos.
        </div>
      ) : (
        <OrderCreateEditor />
      )}
    </ClientPageShell>
  );
}
