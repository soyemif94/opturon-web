export const DESKTOP_INBOX_BREAKPOINT = 1280;

export type InboxDetailMode = "LIST" | "DETAIL_LOADING" | "DETAIL_READY" | "DETAIL_ERROR";

export function resolveInboxDetailMode({
  selectedId,
  resolvedConversationId,
  errorConversationId
}: {
  selectedId?: string;
  resolvedConversationId?: string | null;
  errorConversationId?: string | null;
}): InboxDetailMode {
  if (!selectedId) return "LIST";
  if (errorConversationId === selectedId) return "DETAIL_ERROR";
  if (resolvedConversationId === selectedId) return "DETAIL_READY";
  return "DETAIL_LOADING";
}

export function preserveSelectedConversationId({
  selectedId,
  viewportWidth,
  nextRowIds
}: {
  selectedId?: string;
  viewportWidth: number;
  nextRowIds: string[];
}) {
  if (selectedId) return selectedId;
  return viewportWidth >= DESKTOP_INBOX_BREAKPOINT ? nextRowIds[0] : undefined;
}

export function shouldAutoSelectFirstConversation({
  viewportWidth,
  selectedId,
  rowCount
}: {
  viewportWidth: number;
  selectedId?: string;
  rowCount: number;
}) {
  return viewportWidth >= DESKTOP_INBOX_BREAKPOINT && !selectedId && rowCount > 0;
}

export function shouldStickInboxToBottom({
  conversationChanged,
  distanceFromBottom
}: {
  conversationChanged: boolean;
  distanceFromBottom: number;
}) {
  return conversationChanged || distanceFromBottom < 120;
}
