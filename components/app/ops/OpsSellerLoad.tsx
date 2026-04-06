"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type OpsSellerLoadItem = {
  sellerUserId: string;
  sellerName: string;
  totalActiveLeads: number;
  overdueLeads: number;
  followUpLeads: number;
};

export function OpsSellerLoad({
  items
}: {
  items: OpsSellerLoadItem[];
}) {
  return (
    <Card className="border-white/6 bg-card/90">
      <CardHeader>
        <div>
          <CardTitle className="text-xl">Carga por vendedor</CardTitle>
          <CardDescription>Ayuda a detectar sobrecarga y distribuir mejor la atencion del pipeline.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 px-4 py-5 text-sm text-muted">
            Todavia no hay leads asignados a vendedores.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.sellerUserId}
              className="rounded-[22px] border border-[color:var(--border)] bg-surface/55 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{item.sellerName}</p>
                  <p className="mt-1 text-xs text-muted">Carga viva del pipeline comercial.</p>
                </div>
                <Badge variant="warning">{item.totalActiveLeads} activos</Badge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Metric label="Leads activos" value={item.totalActiveLeads} />
                <Metric label="Vencidos" value={item.overdueLeads} />
                <Metric label="Con seguimiento" value={item.followUpLeads} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-bg/70 p-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
