export type FilterKey = "all" | "hot" | "sin_responder" | "nuevas" | "asignadas";

export type ConversationRowData = {
  id: string;
  status: "open" | "closed" | "new";
  channelType?: "whatsapp" | "instagram" | "unknown";
  channelProvider?: string | null;
  assignedTo?: string;
  lastMessageAt: string;
  lastMessagePreview?: string;
  priority: "normal" | "hot";
  botEnabled: boolean;
  unreadCount: number;
  slaMinutes: number;
  contact?: {
    id: string;
    name: string;
    displayName?: string;
    username?: string;
    phone?: string;
    secondaryText?: string;
    technicalIdentifier?: string;
    email?: string;
    profileImageUrl?: string;
    tags?: string[];
  };
  deal?: { id: string; stage: string; value: number; probability: number };
};

export type DetailPayload = {
  readOnly: boolean;
  conversation: ConversationRowData;
  contact?: {
    id: string;
    name: string;
    displayName?: string;
    username?: string;
    phone?: string;
    secondaryText?: string;
    technicalIdentifier?: string;
    email?: string;
    profileImageUrl?: string;
    industry?: string;
    tags: string[];
  };
  deal?: { id: string; stage: string; value: number; probability: number };
  messages: Array<{ id: string; direction: string; text: string; timestamp: string; status: string; optimistic?: boolean }>;
  notes: Array<{ id: string; text: string; createdAt: string }>;
  tasks: Array<{ id: string; title: string; status: string; dueDate?: string }>;
  assignee?: { id: string; name: string };
  quickReplies: Array<{ intent: string; text: string }>;
  aiEvents: Array<{ id: string; text: string; createdAt: string }>;
};
