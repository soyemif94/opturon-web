import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { requireAppPage } from "@/lib/saas/access";
import { readSaasData } from "@/lib/saas/store";

export default async function AppMetricsPage() {
  const ctx = await requireAppPage();
  const data = readSaasData();
  const tenantId = ctx.tenantId || data.tenants[0]?.id || "";
  const metrics = data.tenantMetrics.find((item) => item.tenantId === tenantId);

  const cards = [
    { label: "Conversaciones", value: String(metrics?.activeConversations || 0), helper: "Conversaciones activas para el cliente." },
    { label: "Leads", value: String(data.deals.filter((item) => item.tenantId === tenantId).length), helper: "Oportunidades visibles en el pipeline actual." },
    { label: "Respuestas del bot", value: String(data.messages.filter((item) => item.tenantId === tenantId && item.direction === "system").length), helper: "Intervenciones o eventos asistidos por automatizacion." },
    { label: "Respuestas humanas", value: String(data.messages.filter((item) => item.tenantId === tenantId && item.direction === "outbound").length), helper: "Mensajes enviados desde el equipo o el workspace." }
  ];

  return (
    <ClientPageShell
      title="Metricas"
      description="Resumen visual de conversaciones, leads y rendimiento del bot para hacer la propuesta mas clara en demos."
      badge="Analytics"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="border-white/6 bg-card/90">
            <CardHeader className="pb-3">
              <CardDescription className="text-[11px] uppercase tracking-[0.18em]">{card.label}</CardDescription>
              <CardTitle className="mt-3 text-3xl">{card.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted">{card.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-white/6 bg-card/90">
        <CardHeader action={<Badge variant="muted">Vista demo</Badge>}>
          <div>
            <CardTitle className="text-xl">Comparativa operativa</CardTitle>
            <CardDescription>Base para sumar graficos reales cuando el backend exponga series temporales.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 pt-0 md:grid-cols-2">
          {cards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted">{card.label}</span>
                <span className="font-medium">{card.value}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/5">
                <div className="h-2 rounded-full bg-brand" style={{ width: `${Math.min(100, Math.max(18, Number(card.value) * 12))}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </ClientPageShell>
  );
}
