export type ReportDateFilter = {
  dateFrom?: string;
  dateTo?: string;
};

export function isWithinReportDateRange(value: unknown, filter: ReportDateFilter) {
  if (!filter.dateFrom && !filter.dateTo) return true;
  if (!value) return false;
  const date = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return (!filter.dateFrom || date >= filter.dateFrom) && (!filter.dateTo || date <= filter.dateTo);
}

export function escapeCsvCell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[\s]*[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildCsv(headers: string[], rows: Array<Array<unknown>>) {
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n") + "\r\n";
}

export function filterBySeller<T extends { sellerUserId?: string | null }>(rows: T[], sellerId?: string) {
  return sellerId ? rows.filter((row) => row.sellerUserId === sellerId) : rows;
}

export function summarizeSellerRows(
  conversations: Array<{
    assignedSellerUserId?: string | null;
    assignedSellerName?: string | null;
    leadStatus?: string | null;
    nextActionAt?: string | null;
    recoveryStartedAt?: string | null;
    lastReassignedAt?: string | null;
    lastCommercialActivityAt?: string | null;
    lastMessageAt?: string | null;
    channelType?: string | null;
    unreadCount?: number;
    contact?: { name?: string | null };
  }>,
  orders: Array<{
    sellerUserId?: string | null;
    sellerNameSnapshot?: string | null;
    total?: number;
    currency?: string;
    paymentStatus?: string;
    orderStatus?: string;
    createdAt?: string;
  }>,
  now = new Date()
) {
  const bySeller = new Map<string, {
    sellerUserId: string;
    sellerName: string;
    activeLeads: number;
    newLeads: number;
    followUps: number;
    overdueFollowUps: number;
    recoveryStarted72h: number;
    coldLeads: number;
    salesCount: number;
    paidSalesCount: number;
    revenue: number;
    currency: string;
  }>();
  const rowFor = (id: string, name: string | null | undefined) => {
    let row = bySeller.get(id);
    if (!row) {
      row = { sellerUserId: id, sellerName: name || "Vendedor", activeLeads: 0, newLeads: 0, followUps: 0, overdueFollowUps: 0, recoveryStarted72h: 0, coldLeads: 0, salesCount: 0, paidSalesCount: 0, revenue: 0, currency: "ARS" };
      bySeller.set(id, row);
    }
    return row;
  };
  const nowMs = now.getTime();
  for (const conversation of conversations) {
    const sellerId = String(conversation.assignedSellerUserId || "").trim();
    if (!sellerId || conversation.leadStatus === "CLOSED") continue;
    const seller = rowFor(sellerId, conversation.assignedSellerName);
    seller.activeLeads += 1;
    if (conversation.leadStatus === "NEW") seller.newLeads += 1;
    if (conversation.nextActionAt) {
      seller.followUps += 1;
      const dueAt = new Date(conversation.nextActionAt).getTime();
      if (Number.isFinite(dueAt) && dueAt < nowMs) seller.overdueFollowUps += 1;
    }
    const recoveryAt = conversation.recoveryStartedAt || conversation.lastReassignedAt;
    const recoveryMs = recoveryAt ? new Date(recoveryAt).getTime() : Number.NaN;
    if (Number.isFinite(recoveryMs) && nowMs >= recoveryMs && nowMs - recoveryMs < 72 * 60 * 60 * 1000) seller.recoveryStarted72h += 1;
    const activityValue = conversation.lastCommercialActivityAt || conversation.lastMessageAt;
    const activityMs = activityValue ? new Date(activityValue).getTime() : Number.NaN;
    const hasActiveFollowUp = conversation.nextActionAt ? Number.isFinite(new Date(conversation.nextActionAt).getTime()) : false;
    if (conversation.leadStatus !== "CLOSED" && Number(conversation.unreadCount || 0) === 0 && !hasActiveFollowUp && Number.isFinite(activityMs) && nowMs - activityMs >= 72 * 60 * 60 * 1000) seller.coldLeads += 1;
  }
  for (const order of orders) {
    const sellerId = String(order.sellerUserId || "").trim();
    if (!sellerId || order.orderStatus === "cancelled") continue;
    const seller = rowFor(sellerId, order.sellerNameSnapshot);
    seller.salesCount += 1;
    if (String(order.paymentStatus || "").toLowerCase() === "paid") {
      seller.paidSalesCount += 1;
      seller.revenue += Number(order.total || 0);
    }
    if (order.currency) seller.currency = order.currency;
  }
  return [...bySeller.values()].sort((a, b) => b.revenue - a.revenue || b.activeLeads - a.activeLeads || a.sellerName.localeCompare(b.sellerName));
}
