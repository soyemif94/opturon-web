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
  const tenantMessages = data.messages.filter((item) => item.tenantId === tenantId);
  const botResponses = tenantMessages.filter((item) => item.direction === "system").length;
  const humanResponses = tenantMessages.filter((item) => item.direction === "outbound").length;
  const totalInteractions = tenantMessages.length;
  const botCoverage = totalInteractions > 0 ? Math.round((botResponses / totalInteractions) * 100) : 0;
  const periodLabel = "Ultimos 30 dias";

  const cards = [
    { label: "Conversaciones", value: String(metrics?.activeConversations || 0), helper: "Conversaciones activas que el equipo puede seguir desde el portal." },
    { label: "Prospectos", value: String(data.deals.filter((item) => item.tenantId === tenantId).length), helper: "Oportunidades visibles hoy dentro del pipeline comercial." },
    { label: "Respuestas del bot", value: String(botResponses), helper: "Mensajes automatizados que ayudaron a responder mas rapido." },
    { label: "Respuestas humanas", value: String(humanResponses), helper: "Mensajes enviados por el equipo desde el workspace." },
    { label: "Interacciones totales", value: String(totalInteractions), helper: "Volumen total de mensajes trabajados en el periodo visible." },
    { label: "Cobertura del bot", value: `${botCoverage}%`, helper: "Porcentaje de interacciones donde el bot ya intervino." }
  ];

  return (
    <ClientPageShell
      title="Metricas"
      description="Entiende rapidamente el impacto del canal, el trabajo del equipo y cuanto valor ya esta aportando la automatizacion en tus conversaciones."
      badge="Analytics"
    >
      <Card className="border-white/6 bg-card/90">
        <CardHeader action={<Badge variant="outline">{periodLabel}</Badge>}>
          <div>
            <CardTitle className="text-xl">Visibilidad comercial del canal</CardTitle>
            <CardDescription>
              Estas metricas te ayudan a ver actividad, volumen de conversaciones y cuanto esta aportando el sistema para responder mas rapido.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 pt-0 md:grid-cols-3">
          <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Periodo</p>
            <p className="mt-2 text-lg font-semibold">{periodLabel}</p>
            <p className="mt-2 text-sm leading-6 text-muted">Referencia simple para leer el rendimiento del canal sin entrar en reportes tecnicos.</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Automatizacion</p>
            <p className="mt-2 text-lg font-semibold">{botCoverage}% de cobertura</p>
            <p className="mt-2 text-sm leading-6 text-muted">Mide cuanto de la conversacion ya esta siendo asistida por el bot.</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Actividad</p>
            <p className="mt-2 text-lg font-semibold">{totalInteractions} interacciones</p>
            <p className="mt-2 text-sm leading-6 text-muted">Volumen total para entender uso real del canal y ritmo de atencion.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
        <CardHeader action={<Badge variant="muted">{periodLabel}</Badge>}>
          <div>
            <CardTitle className="text-xl">Comparativa operativa</CardTitle>
            <CardDescription>Lectura simple para comparar actividad, conversion y participacion del bot sin depender de graficos complejos.</CardDescription>
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
