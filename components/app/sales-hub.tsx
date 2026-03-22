import { ArrowUpRight, CirclePercent, ClipboardList, HandCoins, MessageSquareText, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { PortalSalesMetrics, PortalSalesOpportunity, PortalSalesSummary } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatDateTimeLabel, relativeDateLabel, titleCaseLabel } from "@/lib/billing";

type SalesHubProps = {
  summary: PortalSalesSummary;
  metrics: PortalSalesMetrics;
  opportunities: PortalSalesOpportunity[];
};

export function SalesHub({ summary, metrics, opportunities }: SalesHubProps) {
  const stats = [
    {
      label: "Ventas del dia",
      value: formatMoney(summary.salesToday),
      helper: "Cobros cerrados hoy dentro del espacio.",
      icon: HandCoins
    },
    {
      label: "Ventas del mes",
      value: formatMoney(summary.salesMonth),
      helper: "Ingreso cobrado en el mes actual.",
      icon: TrendingUp
    },
    {
      label: "Oportunidades activas",
      value: String(summary.activeOpportunities),
      helper: "Operaciones que siguen en seguimiento comercial.",
      icon: ClipboardList
    },
    {
      label: "Tasa de cierre",
      value: `${summary.closeRate}%`,
      helper: "Ventas cobradas sobre el universo comercial visible.",
      icon: CirclePercent
    },
    {
      label: "Ticket promedio",
      value: formatMoney(summary.averageTicket),
      helper: "Promedio de ventas efectivamente cobradas.",
      icon: ArrowUpRight
    }
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="border-white/6 bg-card/90">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">{item.label}</p>
                    <p className="mt-3 text-2xl font-semibold">{item.value}</p>
                    <p className="mt-2 text-sm text-muted">{item.helper}</p>
                  </div>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brandBright">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader>
            <div>
              <CardTitle className="text-xl">Performance comercial</CardTitle>
              <CardDescription>Lectura simple para seguir cierres, seguimiento activo y conversaciones vinculadas a ventas.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 pt-0 md:grid-cols-3">
            <PerformanceTile label="Ventas cerradas" value={String(metrics.closedSalesCount)} helper="Operaciones ya cobradas y registradas como cierre real." />
            <PerformanceTile label="Oportunidades abiertas" value={String(metrics.openOpportunitiesCount)} helper="Cuentas que todavia requieren seguimiento o cobro." />
            <PerformanceTile
              label="Conversaciones activas"
              value={String(metrics.activeSalesConversations)}
              helper="Chats abiertos que hoy empujan una oportunidad comercial."
              icon={<MessageSquareText className="h-4 w-4 text-brandBright" />}
            />
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader>
            <div>
              <CardTitle className="text-xl">Responsables</CardTitle>
              <CardDescription>Se muestra cuando ya existe asignacion comercial sobre conversaciones u oportunidades.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {metrics.responsiblePerformance.length ? (
              metrics.responsiblePerformance.map((item) => (
                <div key={`${item.responsibleId || "unassigned"}-${item.responsibleName}`} className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.responsibleName}</p>
                      <p className="mt-1 text-sm text-muted">
                        {item.closedSales} cerradas / {item.openOpportunities} en seguimiento
                      </p>
                    </div>
                    <Badge variant="success">{formatMoney(item.closedRevenue)}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/40 p-5 text-sm leading-7 text-muted">
                Todavia no hay responsables comerciales visibles sobre estas operaciones, pero el bloque ya queda listo para cuando el equipo empiece a asignar seguimiento.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-white/6 bg-card/90">
        <CardHeader>
          <div>
            <CardTitle className="text-xl">Pipeline comercial activo</CardTitle>
            <CardDescription>Vista operativa para seguir oportunidades, cierres logrados y cobros pendientes desde una sola mesa.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {!opportunities.length ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/45 p-6 text-sm leading-7 text-muted">
              Todavia no hay oportunidades visibles. Cuando el equipo empiece a registrar operaciones y cobrar ventas, este modulo va a mostrar ritmo comercial y seguimiento real.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[color:var(--border)]">
              <div className="hidden grid-cols-[minmax(0,1.4fr)_170px_150px_170px_130px_150px] gap-4 border-b border-[color:var(--border)] bg-surface/70 px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-muted lg:grid">
                <span>Cuenta</span>
                <span>Etapa</span>
                <span>Valor</span>
                <span>Ultimo movimiento</span>
                <span>Origen</span>
                <span>Seguimiento</span>
              </div>
              {opportunities.map((item) => (
                <div key={item.id} className="border-b border-[color:var(--border)] px-4 py-4 last:border-b-0">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_170px_150px_170px_130px_150px] lg:items-center lg:gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{item.customer.name}</p>
                        {item.contactId ? (
                          <Link href={`/app/contacts/${item.contactId}`} className="text-xs text-brandBright hover:underline">
                            Ver cliente
                          </Link>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted">{item.customer.phone || "Sin telefono"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={
                          item.commercialStage === "won" ? "success" : item.commercialStage === "lost" ? "danger" : "warning"
                        }
                      >
                        {item.commercialStageLabel}
                      </Badge>
                      <Badge variant="muted">{item.collectionStatusLabel}</Badge>
                    </div>
                    <p className="font-medium">{formatMoney(item.amount, item.currency)}</p>
                    <div>
                      <p className="text-sm">{formatDateTimeLabel(item.lastActivityAt)}</p>
                      <p className="text-xs text-muted">{relativeDateLabel(item.lastActivityAt)}</p>
                    </div>
                    <p className="text-sm text-muted">{item.source ? titleCaseLabel(item.source) : "Sin origen"}</p>
                    <p className="text-sm text-muted">{item.responsible?.name || "Sin asignar"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PerformanceTile({
  label,
  value,
  helper,
  icon
}: {
  label: string;
  value: string;
  helper: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
        {icon || null}
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-muted">{helper}</p>
    </div>
  );
}
