import { ClientPageShell } from "@/components/app/client-page-shell";
import { OrdersHub } from "@/components/app/orders-hub";
import { Button } from "@/components/ui/button";
import { canEditWorkspace } from "@/lib/app-permissions";
import { getPortalOrders, isBackendConfigured, type PortalOrder } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";

export default async function AppOrdersPage({
  searchParams
}: {
  searchParams?: Promise<{ orderId?: string | string[] | undefined }>;
}) {
  const ctx = await requireAppPage();
  const readOnly = !canEditWorkspace(ctx);
  const backendReady = Boolean(ctx.tenantId) && isBackendConfigured();
  let initialOrders: PortalOrder[] = [];
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialOrderId = Array.isArray(resolvedSearchParams?.orderId)
    ? resolvedSearchParams?.orderId[0]
    : resolvedSearchParams?.orderId;

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
      description="Gestiona pedidos activos, pagos, entregas y seguimiento comercial desde un solo lugar."
      action={
        readOnly ? null : (
          <Button asChild className="rounded-2xl">
            <a href="/app/orders/new">Nuevo pedido</a>
          </Button>
        )
      }
    >
      <OrdersHub
        initialOrders={initialOrders}
        initialOrderId={typeof initialOrderId === "string" ? initialOrderId : undefined}
        backendReady={backendReady}
        readOnly={!ctx.tenantId || readOnly}
      />
    </ClientPageShell>
  );
}
