import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { getDebugInbox } from "@/lib/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Opturon Bot | Metrics",
  description: "Métricas básicas derivadas del inbox."
};

export default async function BotMetricsPage() {
  let items: any[] = [];
  try {
    const inbox = await getDebugInbox(200);
    items = Array.isArray(inbox.items) ? inbox.items : [];
  } catch {
    items = [];
  }

  const total = items.length;
  const bySender = new Map<string, number>();
  for (const item of items) {
    const sender = item?.from || "unknown";
    bySender.set(sender, (bySender.get(sender) || 0) + 1);
  }

  const topSenders = Array.from(bySender.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Bot Metrics</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5"><p className="text-sm text-muted">Total messages</p><p className="mt-1 text-2xl">{total}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted">Últimos 7 días</p><p className="mt-1 text-2xl">{total}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted">Top senders</p><p className="mt-1 text-2xl">{topSenders.length}</p></Card>
      </div>
      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Top senders</h2>
        {topSenders.length === 0 ? <p className="text-muted">no data</p> : (
          <ul className="space-y-2 text-sm">
            {topSenders.map(([sender, count]) => <li key={sender} className="flex justify-between"><span>{sender}</span><span>{count}</span></li>)}
          </ul>
        )}
      </Card>
    </div>
  );
}
