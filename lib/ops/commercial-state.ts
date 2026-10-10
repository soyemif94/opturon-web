import type { ConversationRowData } from "@/components/app/inbox/types";

export const COLD_LEAD_HOURS = 72;

function validTimestamp(value?: string | null) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function isRecentlyReassigned(row: ConversationRowData, now = new Date()) {
  const reassignedAt = validTimestamp(row.lastReassignedAt);
  const elapsedMs = now.getTime() - (reassignedAt ?? Number.POSITIVE_INFINITY);
  return reassignedAt !== null && elapsedMs >= 0 && elapsedMs < COLD_LEAD_HOURS * 60 * 60 * 1000;
}

export function isInRecovery(row: ConversationRowData, now = new Date()) {
  const recoveryAt = validTimestamp(row.recoveryStartedAt || row.lastReassignedAt);
  const elapsedMs = now.getTime() - (recoveryAt ?? Number.POSITIVE_INFINITY);
  return recoveryAt !== null && elapsedMs >= 0 && elapsedMs < COLD_LEAD_HOURS * 60 * 60 * 1000;
}

export function isActiveCommercialFollowUp(row: ConversationRowData) {
  return validTimestamp(row.nextActionAt) !== null;
}

export function getLastCommercialActivityTimestamp(row: ConversationRowData) {
  const timelineActivity = (row.commercialTimeline || [])
    .filter((event) => ["seller_assigned", "seller_reassigned", "recovery_started", "commercial_follow_up_updated", "commercial_follow_up_completed", "commercial_note_updated"].includes(String(event.type || "")))
    .map((event) => validTimestamp(event.createdAt))
    .filter((value): value is number => value !== null);
  const timestamps = [
    validTimestamp(row.lastCommercialActivityAt),
    validTimestamp(row.lastMessageAt),
    validTimestamp(row.recoveryStartedAt),
    ...timelineActivity
  ]
    .filter((value): value is number => value !== null);
  return timestamps.length ? Math.max(...timestamps) : null;
}

export function isColdLead(row: ConversationRowData, now = new Date()) {
  if (
    row.leadStatus === "CLOSED" ||
    row.unreadCount > 0 ||
    isActiveCommercialFollowUp(row)
  ) return false;
  const lastActivityAt = getLastCommercialActivityTimestamp(row);
  if (lastActivityAt === null) return false;
  return now.getTime() - lastActivityAt >= COLD_LEAD_HOURS * 60 * 60 * 1000;
}

export function getOperationalAttentionState(row: ConversationRowData, now = new Date()) {
  if (isInRecovery(row, now)) return "in_recovery" as const;
  if (isColdLead(row, now)) return "cold" as const;
  return "active" as const;
}

export function isRecentlyCompletedFollowUp(row: ConversationRowData, now = new Date()) {
  if (isActiveCommercialFollowUp(row)) return false;
  const latestFollowUpEvent = [...(row.commercialTimeline || [])]
    .filter((event) => event.type === "commercial_follow_up_updated" || event.type === "commercial_follow_up_completed")
    .sort((left, right) => new Date(String(right.createdAt || 0)).getTime() - new Date(String(left.createdAt || 0)).getTime())[0];
  if (latestFollowUpEvent?.type !== "commercial_follow_up_completed") return false;
  const completedAt = validTimestamp(latestFollowUpEvent.createdAt);
  return completedAt !== null && now.getTime() - completedAt >= 0 && now.getTime() - completedAt < 30 * 24 * 60 * 60 * 1000;
}
