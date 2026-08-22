export const DESKTOP_INBOX_BREAKPOINT = 1280;

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
