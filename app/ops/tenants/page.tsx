import Link from "next/link";
import { TenantsDataTable } from "@/components/ops/tenants-data-table";
import { requireOpsPage } from "@/lib/saas/access";
import { calculateHealthScore, daysActive, readSaasData } from "@/lib/saas/store";

export default async function OpsTenantsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireOpsPage();
  const { status } = await searchParams;
  const data = readSaasData();
  const tenants = data.tenants.filter((tenant) => (status ? tenant.status === status : true));

  const rows = tenants.map((tenant) => {
    const metrics = data.tenantMetrics.find((m) => m.tenantId === tenant.id);
    const health = calculateHealthScore(tenant.id);
    return {
      id: tenant.id,
      name: tenant.name,
      industry: tenant.industry,
      status: tenant.status,
      daysActive: daysActive(tenant),
      crm: tenant.crmEnabled ? tenant.crmName || "Si" : "No",
      salesTeamSize: tenant.salesTeamSize,
      lastActivityAt: metrics?.lastActivityAt || "",
      healthScore: health.score,
      healthStatus: health.status
    };
  });

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted">Gestion de tenants, salud y actividad.</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 text-sm">
        {[
          ["Todos", "/ops/tenants"],
          ["Activos", "/ops/tenants?status=active"],
          ["Trial", "/ops/tenants?status=trial"],
          ["En riesgo", "/ops/tenants?status=at_risk"],
          ["Cancelados", "/ops/tenants?status=cancelled"]
        ].map(([label, href]) => (
          <Link key={label} href={href} className="rounded-full border border-[color:var(--border)] px-3 py-1.5 hover:bg-surface">
            {label}
          </Link>
        ))}
      </div>

      <TenantsDataTable rows={rows} />
    </div>
  );
}
