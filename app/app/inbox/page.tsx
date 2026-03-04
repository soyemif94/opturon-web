import { InboxWorkspace } from "@/components/app/InboxWorkspace";
import { CommandPaletteContextSetter } from "@/components/ui/command-palette";

export default async function AppInboxPage({ searchParams }: { searchParams: Promise<{ demo?: string; tenantId?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <CommandPaletteContextSetter value={{ conversationId: undefined, contactId: undefined, dealId: undefined }} />
      <InboxWorkspace demo={sp.demo === "1"} tenantId={sp.tenantId} />
    </>
  );
}

