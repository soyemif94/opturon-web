import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOpsPage } from "@/lib/saas/access";
import { calculateHealthScore, daysActive, readSaasData } from "@/lib/saas/store";
import { TenantWorkbench } from "@/components/ops/TenantWorkbench";

export default async function TenantDetailPage({ params }: { params: Promise<{ tenantId: string }> }) {
  await requireOpsPage();
  const { tenantId } = await params;
  const data = readSaasData();
  const tenant = data.tenants.find((item) => item.id === tenantId);
  if (!tenant) notFound();

  const health = calculateHealthScore(tenantId);
  const notes = data.tenantNotes.filter((item) => item.tenantId === tenantId).slice(0, 50);
  const tasks = data.tenantTasks.filter((item) => item.tenantId === tenantId).slice(0, 50);
  const activity = data.auditLog.filter((item) => item.tenantId === tenantId).slice(0, 100);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-[color:var(--border)] bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{tenant.name}</h1>
            <p className="text-sm text-muted">{tenant.industry} · {tenant.city || "-"}, {tenant.country || "-"}</p>
          </div>
          <Link
            href={`/app?demo=1&tenantId=${tenant.id}`}
            className="rounded-lg border border-brand px-3 py-2 text-sm font-medium text-brandBright hover:bg-brand/10"
          >
            Ver portal cliente (modo demo)
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-sm">
          <Info label="CRM" value={tenant.crmEnabled ? tenant.crmName || "Conectado" : "No conectado"} />
          <Info label="Equipo comercial" value={String(tenant.salesTeamSize)} />
          <Info label="Inicio" value={new Date(tenant.startAt).toLocaleDateString()} />
          <Info label="Días activos" value={String(daysActive(tenant))} />
          <Info label="Health" value={`${health.status} (${health.score})`} />
        </div>
      </header>

      <TenantWorkbench
        tenantId={tenantId}
        notes={notes.map((item) => ({ id: item.id, text: item.text, createdAt: item.createdAt }))}
        tasks={tasks.map((item) => ({ id: item.id, title: item.title, status: item.status, dueDate: item.dueDate }))}
        activity={activity.map((item) => ({ id: item.id, action: item.action, entity: item.entity, createdAt: item.createdAt }))}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--border)] bg-surface p-3">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

