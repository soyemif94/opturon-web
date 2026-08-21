import { PurchaseReceiptDetail } from "@/components/app/PurchaseReceiptDetail";
import { getPortalPurchaseReceiptDetail, isBackendConfigured, type PortalPurchaseReceiptDetail } from "@/lib/api";
import { getPortalInventoryReadActor, requireAppModulePage } from "@/lib/saas/access";

function EmptyState({ message }: { message: string }) {
  return (
    <section className="rounded-3xl border border-[color:var(--border)] bg-card/80 p-6">
      <h1 className="text-2xl font-semibold">Detalle no disponible</h1>
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </section>
  );
}

export default async function InventoryReceiptDetailPage({ params }: { params: Promise<{ receiptId: string }> }) {
  const ctx = await requireAppModulePage("inventory");
  const { receiptId } = await params;

  if (!ctx.tenantId || !isBackendConfigured()) {
    return <EmptyState message="No se pudo cargar la recepcion en este entorno." />;
  }

  let receipt: PortalPurchaseReceiptDetail | null = null;
  try {
    const result = await getPortalPurchaseReceiptDetail(ctx.tenantId, receiptId, getPortalInventoryReadActor(ctx));
    receipt = result.data || null;
  } catch {
    receipt = null;
  }

  if (!receipt) {
    return <EmptyState message="La recepcion no existe, no pertenece a este tenant o ya no esta disponible." />;
  }

  return <PurchaseReceiptDetail receipt={receipt} />;
}
