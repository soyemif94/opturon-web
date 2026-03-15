export type FilterKey = "all" | "hot" | "sin_responder" | "nuevas" | "asignadas";

export type ConversationRowData = {
  id: string;
  channelId?: string | null;
  status: "open" | "closed" | "new";
  assignedTo?: string;
  lastMessageAt: string;
  lastMessagePreview?: string;
  priority: "normal" | "hot";
  botEnabled: boolean;
  unreadCount: number;
  slaMinutes: number;
  contact?: { id: string; name: string; phone?: string; email?: string; tags?: string[] };
  deal?: { id: string; stage: string; value: number; probability: number };
};

export type DetailPayload = {
  readOnly: boolean;
  conversation: ConversationRowData;
  contact?: { id: string; name: string; phone?: string; email?: string; industry?: string; tags: string[] };
  deal?: { id: string; stage: string; value: number; probability: number };
  messages: Array<{ id: string; direction: string; text: string; timestamp: string; status: string; optimistic?: boolean }>;
  notes: Array<{ id: string; text: string; createdAt: string }>;
  tasks: Array<{ id: string; title: string; status: string; dueDate?: string }>;
  assignee?: { id: string; name: string };
  quickReplies: Array<{ intent: string; text: string }>;
  aiEvents: Array<{ id: string; text: string; createdAt: string }>;
  channelBinding?: {
    conversationChannelId: string | null;
    conversationChannel: {
      id: string;
      clinicId: string;
      provider: string | null;
      phoneNumberId: string | null;
      displayPhoneNumber?: string | null;
      verifiedName?: string | null;
      wabaId: string | null;
      status: string | null;
    } | null;
    workspaceDefaultChannel: {
      id: string;
      clinicId: string;
      provider: string | null;
      phoneNumberId: string | null;
      displayPhoneNumber?: string | null;
      verifiedName?: string | null;
      wabaId: string | null;
      status: string | null;
    } | null;
    matchesWorkspaceDefault: boolean | null;
    resolutionStatus: string;
  };
};
