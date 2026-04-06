import type { ConversationRowData } from "@/components/app/inbox/types";

export type ConversationPriorityLevel = "high" | "medium" | "low";

export const RECENT_PRIORITY_WINDOW_MS = 1000 * 60 * 60 * 24;

function getConversationTimestamp(row: ConversationRowData) {
  const timestamp = new Date(row.lastMessageAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function getConversationPriority(row: ConversationRowData): ConversationPriorityLevel {
  if (row.transferPaymentStatus === "payment_pending_validation") return "high";
  const lastMessageAt = getConversationTimestamp(row);
  if (lastMessageAt > 0 && Date.now() - lastMessageAt <= RECENT_PRIORITY_WINDOW_MS) return "medium";
  return "low";
}

function getPriorityRank(priority: ConversationPriorityLevel) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}

export function sortConversationsByPriority(rows: ConversationRowData[]) {
  return [...rows].sort((left, right) => {
    const priorityDelta = getPriorityRank(getConversationPriority(left)) - getPriorityRank(getConversationPriority(right));
    if (priorityDelta !== 0) return priorityDelta;
    return getConversationTimestamp(right) - getConversationTimestamp(left);
  });
}
