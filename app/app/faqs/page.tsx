import { requireAppPage } from "@/lib/saas/access";
import { readSaasData } from "@/lib/saas/store";
import { FaqManager } from "@/components/app/FaqManager";

export default async function FaqPage() {
  const ctx = await requireAppPage();
  const data = readSaasData();
  const tenantId = ctx.tenantId || data.tenants[0]?.id || "";
  const faqs = data.faqs.filter((item) => item.tenantId === tenantId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">FAQ</h1>
      <FaqManager initialFaqs={faqs} />
    </div>
  );
}
