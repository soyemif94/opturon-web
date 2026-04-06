export type FilterKey = "all" | "new" | "in_conversation" | "follow_up" | "closed" | "unassigned";
export type BotDomainOverride = "automatic" | "agenda" | "commerce";
export type BotFlowLock = "automatic" | "agenda" | "commerce";
export type LeadStatus = "NEW" | "IN_CONVERSATION" | "FOLLOW_UP" | "CLOSED";

export type ConversationRowData = {
  id: string;
  status: "open" | "closed" | "new";
  leadStatus: LeadStatus;
  leadStatusLabel?: string;
  assignedTo?: string;
  assignedSellerUserId?: string | null;
  assignedSellerName?: string | null;
  assignedSellerRole?: string | null;
  lastMessageAt: string;
  lastMessagePreview?: string;
  priority: "normal" | "hot";
  botEnabled: boolean;
  botFlowLock?: BotFlowLock;
  botDomainOverride?: BotDomainOverride;
  unreadCount: number;
  slaMinutes: number;
  transferPaymentStatus?: string | null;
  transferPaymentOrderId?: string | null;
  contact?: { id: string; name: string; phone?: string; email?: string; profileImageUrl?: string; tags?: string[] };
  deal?: { id: string; stage: string; value: number; probability: number };
};

export type DetailPayload = {
  readOnly: boolean;
  conversation: ConversationRowData;
  contact?: { id: string; name: string; phone?: string; email?: string; profileImageUrl?: string; industry?: string; tags: string[] };
  deal?: { id: string; stage: string; value: number; probability: number };
  messages: Array<{ id: string; direction: string; text: string; timestamp: string; status: string; optimistic?: boolean }>;
  notes: Array<{ id: string; text: string; createdAt: string }>;
  tasks: Array<{ id: string; title: string; status: string; dueDate?: string }>;
  assignee?: { id: string; name: string };
  assignedSeller?: { id?: string | null; name?: string | null; role?: string | null };
  relatedOrder?: {
    id: string;
    orderStatus?: string | null;
    paymentStatus?: string | null;
    total?: number;
    currency?: string | null;
    customerName?: string | null;
    createdAt?: string | null;
  } | null;
  quickReplies: Array<{ intent: string; text: string }>;
  aiEvents: Array<{ id: string; text: string; createdAt: string }>;
};
