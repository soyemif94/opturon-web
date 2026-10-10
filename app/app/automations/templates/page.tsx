import { redirect } from "next/navigation";
import { requireAppPage } from "@/lib/saas/access";

export default async function AppAutomationsTemplatesPage() {
  await requireAppPage({ permission: "manage_workspace" });
  redirect("/app/settings/bot");
}
