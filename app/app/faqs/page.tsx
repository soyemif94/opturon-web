import { FaqManager } from "@/components/app/FaqManager";
import { isStaffRole } from "@/lib/app-permissions";
import { requireAppPage } from "@/lib/saas/access";
import { readSaasData } from "@/lib/saas/store";

export default async function FaqPage() {
  const ctx = await requireAppPage({ permission: "manage_workspace" });
  const canUseLocalDemoData = !ctx.tenantId && isStaffRole(ctx.globalRole);
  const data = canUseLocalDemoData ? readSaasData() : null;
  const tenantId = ctx.tenantId || (canUseLocalDemoData ? data?.tenants[0]?.id || "" : "");
  const faqs = data ? data.faqs.filter((item) => item.tenantId === tenantId) : [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">FAQ</h1>
      <FaqManager initialFaqs={faqs} />
    </div>
  );
}
