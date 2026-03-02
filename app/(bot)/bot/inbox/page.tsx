import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { BotInboxActions } from "@/components/bot-inbox-actions";
import { getBuild, getDebugInbox, getDebugInboxHealth, getHealth } from "@/lib/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Opturon Bot | Inbox",
  description: "Bandeja de mensajes recientes del bot."
};

export default async function BotInboxPage() {
  let health: any = null;
  let build: any = null;
  let inboxHealth: any = null;
  let items: any[] = [];
  let warning: string | null = null;

  try {
    [health, build, inboxHealth] = await Promise.all([getHealth(), getBuild(), getDebugInboxHealth()]);
    const inbox = await getDebugInbox(50);
    items = Array.isArray(inbox.items) ? inbox.items : [];
  } catch (error) {
    warning = error instanceof Error ? error.message : "No se pudo cargar inbox";
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5"><p className="text-sm text-muted">API Health</p><p className="mt-1 text-xl">{health?.ok ? "OK" : "N/A"}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted">Build</p><p className="mt-1 break-all text-sm">{build?.buildId || "-"}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted">Inbox size</p><p className="mt-1 text-xl">{inboxHealth?.size ?? items.length}</p></Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Bot Inbox</h1>
          <BotInboxActions />
        </div>

        {warning ? <p className="mb-4 text-sm text-amber-300">{warning}</p> : null}

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] text-left text-muted">
                <th className="py-2 pr-2">Timestamp</th>
                <th className="py-2 pr-2">From</th>
                <th className="py-2 pr-2">Type</th>
                <th className="py-2 pr-2">Text</th>
                <th className="py-2">Message ID</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, index: number) => (
                <tr key={`${item.messageId || "msg"}-${index}`} className="border-b border-[color:var(--border)]/60">
                  <td className="whitespace-nowrap py-2 pr-2">{item.ts || "-"}</td>
                  <td className="py-2 pr-2">{item.from || "-"}</td>
                  <td className="py-2 pr-2">{item.type || "-"}</td>
                  <td className="max-w-md truncate py-2 pr-2">{item.text || "-"}</td>
                  <td className="max-w-xs truncate py-2">{item.messageId || "-"}</td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr><td colSpan={5} className="py-6 text-center text-muted">No hay mensajes recientes.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}