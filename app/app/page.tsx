import { requireAppPage } from "@/lib/saas/access";
import { readSaasData } from "@/lib/saas/store";

export default async function ClientPortalHome({ searchParams }: { searchParams: Promise<{ demo?: string; tenantId?: string }> }) {
  const ctx = await requireAppPage();
  const sp = await searchParams;
  const isDemo = sp.demo === "1";

  const data = readSaasData();
  const tenantId = ctx.tenantId || sp.tenantId || data.tenants[0]?.id || "";
  const tenant = data.tenants.find((item) => item.id === tenantId);

  return (
    <div className="space-y-6">
      {isDemo ? (
        <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm text-yellow-200">
          Modo demo activo (solo lectura recomendado para ventas).
        </div>
      ) : null}

      <header>
        <h1 className="text-3xl font-semibold">Portal Cliente</h1>
        <p className="text-sm text-muted">Gestioná catálogo, FAQ y datos operativos del bot.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="Empresa" value={tenant?.name || "-"} />
        <Card title="Rubro" value={tenant?.industry || "-"} />
        <Card title="Estado" value={tenant?.status || "-"} />
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{title}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
