import { InboxWorkspace } from "@/components/app/InboxWorkspace";
import { CommandPaletteContextSetter } from "@/components/ui/command-palette";

export default async function AppInboxConversationPage({
  params,
  searchParams
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ demo?: string; tenantId?: string }>;
}) {
  const { conversationId } = await params;
  const sp = await searchParams;
  return (
    <>
      <CommandPaletteContextSetter value={{ conversationId }} />
      <InboxWorkspace initialConversationId={conversationId} demo={sp.demo === "1"} tenantId={sp.tenantId} />
    </>
  );
}

