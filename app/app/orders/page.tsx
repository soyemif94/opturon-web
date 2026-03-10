import { ClientPageShell } from "@/components/app/client-page-shell";
import { OrdersHub } from "@/components/app/orders-hub";
import { getPortalOrders, isBackendConfigured, type PortalOrder } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";

export default async function AppOrdersPage() {
  const ctx = await requireAppPage();
  const backendReady = Boolean(ctx.tenantId) && isBackendConfigured();
  let initialOrders: PortalOrder[] = [];

  if (ctx.tenantId && backendReady) {
    try {
      const result = await getPortalOrders(ctx.tenantId);
      initialOrders = Array.isArray(result.data?.orders) ? result.data.orders : [];
    } catch {
      initialOrders = [];
    }
  }

  return (
    <ClientPageShell
      title="Pedidos"
      description="Registra pedidos internos, revisa su estado y prepara la operacion diaria desde un modulo simple pero listo para crecer hacia pagos y facturacion."
      badge="Operacion comercial"
    >
      <OrdersHub initialOrders={initialOrders} backendReady={backendReady} readOnly={!ctx.tenantId} />
    </ClientPageShell>
  );
}
