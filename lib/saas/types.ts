export type GlobalRole = "superadmin" | "ops_admin" | "sales_rep" | "support_agent" | "client";
export type TenantRole = "owner" | "manager" | "seller" | "viewer";

export type TenantStatus = "active" | "trial" | "at_risk" | "cancelled";
export type TaskStatus = "todo" | "in_progress" | "done";
export type ConversationStatus = "open" | "closed" | "new";
export type ConversationPriority = "normal" | "hot";
export type MessageDirection = "inbound" | "outbound" | "system";
export type MessageStatus = "sent" | "delivered" | "read" | "failed";
export type DealStage = "lead" | "qualified" | "proposal" | "won" | "lost";

export type Tenant = {
  id: string;
  name: string;
  industry: string;
  status: TenantStatus;
  createdAt: string;
  startAt: string;
  crmName: string;
  crmEnabled: boolean;
  salesTeamSize: number;
  website?: string;
  city?: string;
  country?: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  globalRole: GlobalRole;
  passwordHash?: string;
  createdAt: string;
};

export type Membership = {
  id: string;
  userId: string;
  tenantId: string;
  role: TenantRole;
  createdAt: string;
};

export type TenantNote = {
  id: string;
  tenantId: string;
  authorId: string;
  contactId?: string;
  conversationId?: string;
  text: string;
  createdAt: string;
};

export type TenantTask = {
  id: string;
  tenantId: string;
  contactId?: string;
  conversationId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignedTo?: string;
  dueDate?: string;
  createdAt: string;
};

export type CatalogProduct = {
  id: string;
  tenantId: string;
  name: string;
  category?: string;
  sku?: string;
  price: number;
  promoPrice?: number;
  stockQty: number;
  tags?: string[];
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Template = {
  id: string;
  tenantId: string;
  name: string;
  text: string;
  tags: string[];
};

export type CommandAction = {
  id: string;
  label: string;
  tags: string[];
};

export type CatalogCategory = {
  id: string;
  tenantId: string;
  name: string;
};

export type Faq = {
  id: string;
  tenantId: string;
  question: string;
  answer: string;
  active: boolean;
};

export type BusinessSettings = {
  id: string;
  tenantId: string;
  openingHours?: string;
  address?: string;
  deliveryZones?: string;
  paymentMethods?: string;
  policies?: string;
};

export type AuditLog = {
  id: string;
  tenantId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type IndustryTemplate = {
  id: string;
  industry: string;
  defaultFAQs: Array<{ question: string; answer: string }>;
  defaultCategories: string[];
  defaultProducts: Array<{
    name: string;
    category: string;
    sku?: string;
    price: number;
    promoPrice?: number;
    stockQty: number;
    description?: string;
    active: boolean;
  }>;
};

export type TenantMetrics = {
  tenantId: string;
  lastActivityAt?: string;
  messages7d: number;
  webhookErrors7d: number;
  activeConversations: number;
};

export type Contact = {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  email?: string;
  industry?: string;
  tags: string[];
};

export type Conversation = {
  id: string;
  tenantId: string;
  contactId: string;
  status: ConversationStatus;
  assignedTo?: string;
  assignedSellerUserId?: string;
  assignedSellerName?: string;
  assignedSellerRole?: TenantRole | string;
  lastMessageAt: string;
  priority: ConversationPriority;
  botEnabled: boolean;
  botFlowLock?: "automatic" | "agenda" | "commerce";
  botDomainOverride?: "automatic" | "agenda" | "commerce";
};

export type Message = {
  id: string;
  tenantId: string;
  conversationId: string;
  direction: MessageDirection;
  text: string;
  timestamp: string;
  status: MessageStatus;
  providerMessageId?: string;
};

export type Deal = {
  id: string;
  tenantId: string;
  contactId: string;
  stage: DealStage;
  value: number;
  probability: number;
};

export type SaasData = {
  tenants: Tenant[];
  users: User[];
  memberships: Membership[];
  contacts: Contact[];
  conversations: Conversation[];
  messages: Message[];
  deals: Deal[];
  tenantNotes: TenantNote[];
  tenantTasks: TenantTask[];
  catalogProducts: CatalogProduct[];
  templates: Template[];
  commandActions: CommandAction[];
  catalogCategories: CatalogCategory[];
  faqs: Faq[];
  businessSettings: BusinessSettings[];
  auditLog: AuditLog[];
  industryTemplates: IndustryTemplate[];
  tenantMetrics: TenantMetrics[];
};

