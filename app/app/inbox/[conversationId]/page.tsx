import { InboxWorkspace } from "@/components/app/InboxWorkspace";
import { CommandPaletteContextSetter } from "@/components/ui/command-palette";
import { requireAppPage } from "@/lib/saas/access";

export default async function AppInboxConversationPage({
  params,
  searchParams
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ demo?: string; tenantId?: string }>;
}) {
  const ctx = await requireAppPage();
  const { conversationId } = await params;
  const sp = await searchParams;
  return (
    <>
      <CommandPaletteContextSetter value={{ conversationId }} />
      <InboxWorkspace initialConversationId={conversationId} demo={sp.demo === "1"} tenantId={sp.tenantId} currentUserId={ctx.userId} />
    </>
  );
}

