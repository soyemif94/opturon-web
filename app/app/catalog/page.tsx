import Link from "next/link";
import { requireAppPage } from "@/lib/saas/access";
import { readSaasData } from "@/lib/saas/store";
import { CatalogManager } from "@/components/app/CatalogManager";

export default async function CatalogPage() {
  const ctx = await requireAppPage();
  const data = readSaasData();
  const tenantId = ctx.tenantId || data.tenants[0]?.id || "";
  const products = data.catalogProducts.filter((item) => item.tenantId === tenantId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Catálogo</h1>
        <Link href="/app/catalog/new" className="rounded-lg border border-[color:var(--border)] px-3 py-2 text-sm hover:bg-surface">
          Nuevo producto
        </Link>
      </div>
      <CatalogManager initialProducts={products} />
    </div>
  );
}
