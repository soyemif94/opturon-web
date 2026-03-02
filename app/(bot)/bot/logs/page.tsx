import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { getBuild, getHealth, getLastApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Opturon Bot | Logs",
  description: "Estado operativo y errores recientes del panel bot."
};

export default async function BotLogsPage() {
  let health: any = null;
  let build: any = null;

  try {
    [health, build] = await Promise.all([getHealth(), getBuild()]);
  } catch {
    // Error details are persisted by lib/api.ts for observability.
  }

  const lastError = getLastApiError();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Bot Logs</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <p className="text-sm text-muted">API health</p>
          <p className="mt-1 text-xl">{health?.ok ? "OK" : "N/A"}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted">Build</p>
          <p className="mt-1 break-all text-sm">{build?.buildId || "-"}</p>
        </Card>
      </div>

      <Card className="p-6">
        <p className="text-sm text-muted">Last fetch error</p>
        {lastError ? (
          <div className="mt-2 space-y-1 text-sm">
            <p><span className="text-muted">At:</span> {lastError.at}</p>
            <p><span className="text-muted">Path:</span> {lastError.path}</p>
            <p><span className="text-muted">Message:</span> {lastError.message}</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">no errors</p>
        )}
      </Card>
    </div>
  );
}