import { AutomationBuilder } from "@/components/app/AutomationBuilder";
import { requireAppPage } from "@/lib/saas/access";

export default async function AppAutomationsNewPage() {
  await requireAppPage({ permission: "manage_workspace" });

  return <AutomationBuilder />;
}
