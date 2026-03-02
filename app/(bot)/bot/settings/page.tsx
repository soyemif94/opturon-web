import type { Metadata } from "next";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Opturon Bot | Settings",
  description: "Configuración operativa del bot."
};

export default function BotSettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Bot Settings</h1>
      <Card className="p-6">
        <p className="text-muted">Auto-reply (placeholder)</p>
        <p className="text-sm text-muted mt-2">Pending admin endpoints para cambios persistentes.</p>
      </Card>
    </div>
  );
}
