import { InboxWorkspace } from "@/components/app/InboxWorkspace";
import { CommandPaletteContextSetter } from "@/components/ui/command-palette";
import { requireAppPage } from "@/lib/saas/access";
import { canDeleteInboxConversation } from "@/lib/app-permissions";

export default async function AppInboxPage({ searchParams }: { searchParams: Promise<{ demo?: string; tenantId?: string }> }) {
  const ctx = await requireAppPage();
  const sp = await searchParams;
  return (
    <>
      <CommandPaletteContextSetter value={{ conversationId: undefined, contactId: undefined, dealId: undefined }} />
      <InboxWorkspace demo={sp.demo === "1"} tenantId={sp.tenantId} currentUserId={ctx.userId} canDeleteConversation={canDeleteInboxConversation(ctx)} />
    </>
  );
}
