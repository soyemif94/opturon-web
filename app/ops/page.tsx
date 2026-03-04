import Link from "next/link";
import { requireOpsPage } from "@/lib/saas/access";
import { calculateHealthScore, readSaasData } from "@/lib/saas/store";

export default async function OpsHomePage() {
  await requireOpsPage();
  const data = readSaasData();
  const active = data.tenants.filter((t) => t.status === "active").length;
  const atRisk = data.tenants.filter((t) => t.status === "at_risk").length;
  const scoreAvg =
    data.tenants.length > 0
      ? Math.round(data.tenants.reduce((acc, item) => acc + calculateHealthScore(item.id).score, 0) / data.tenants.length)
      : 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Ops Dashboard</h1>
        <p className="text-sm text-muted">Ventas y operaciones multi-tenant.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="Clientes activos" value={String(active)} />
        <Card title="Clientes en riesgo" value={String(atRisk)} />
        <Card title="Health promedio" value={`${scoreAvg}/100`} />
      </div>

      <div className="rounded-2xl border border-[color:var(--border)] bg-card p-5">
        <h2 className="text-lg font-semibold">Acciones rápidas</h2>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link href="/ops/tenants" className="rounded-lg border border-[color:var(--border)] px-3 py-2 hover:bg-surface">
            Ver clientes
          </Link>
          <Link href="/ops/tenants?status=trial" className="rounded-lg border border-[color:var(--border)] px-3 py-2 hover:bg-surface">
            Revisar trials
          </Link>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-card p-5">
      <p className="text-xs uppercase tracking-wide text-muted">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

