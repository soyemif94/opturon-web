import { readSaasData } from "@/lib/saas/store";
import type { GlobalRole, TenantRole } from "@/lib/saas/types";

const API_TIMEOUT_MS = Number(process.env.API_TIMEOUT_MS || 10000);
const AUTH_API_TIMEOUT_MS = Number(process.env.AUTH_API_TIMEOUT_MS || 2500);
const DEBUG_INBOX_MAX_ITEMS = Number(process.env.DEBUG_INBOX_MAX_ITEMS || 200);
const PROD_BACKEND_FALLBACK = "https://opturon-api.onrender.com";

let lastApiError: { at: string; message: string; path: string } | null = null;

type BackendError = Error & {
  status?: number;
  body?: unknown;
};

function registerApiError(path: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown API error";
  lastApiError = {
    at: new Date().toISOString(),
    message,
    path
  };
  console.error("[BOT_API_ERROR]", { path, message });
}

function clearApiError() {
  lastApiError = null;
}

export function getLastApiError() {
  return lastApiError;
}

function getApiBase() {
  const candidates = [
    process.env.BACKEND_BASE_URL,
    process.env.API_BASE_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL
  ];

  const resolved = candidates
    .map((value) => String(value || "").trim().replace(/\/$/, ""))
    .find(Boolean);

  if (resolved) {
    try {
      const hostname = new URL(resolved).hostname.toLowerCase();
      const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
      if (!(process.env.NODE_ENV === "production" && isLocalHost)) {
        return resolved;
      }
    } catch {
      return resolved;
    }
  }

  if (process.env.NODE_ENV === "production") {
    return PROD_BACKEND_FALLBACK;
  }

  return "";
}

export function isBackendConfigured() {
  return Boolean(getApiBase());
}

// Portal client identities must come from the persistent backend whenever it is configured.
// Local JSON data is allowed only for staff/demo compatibility outside the client auth path.
export function isPersistentPortalIdentityEnabled() {
  return isBackendConfigured();
}

function getPortalInternalKey() {
  return String(process.env.PORTAL_INTERNAL_KEY || "").trim();
}

export function isPortalInternalAuthConfigured() {
  return Boolean(getPortalInternalKey());
}

export function getBackendErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as BackendError).status);
    if (Number.isInteger(status) && status >= 400) {
      return status;
    }
  }
  return undefined;
}

export function getBackendErrorBody(error: unknown): unknown {
  if (error && typeof error === "object" && "body" in error) {
    return (error as BackendError).body;
  }
  return undefined;
}

async function backendFetch<T>(path: string, init?: RequestInit, withDebugKey = false, timeoutMs = API_TIMEOUT_MS): Promise<T> {
  const apiBase = getApiBase();

  if (!apiBase) {
    throw new Error("API base URL is not configured");
  }

  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");

  if (withDebugKey) {
    const debugKey = String(process.env.API_DEBUG_KEY || "").trim();
    if (!debugKey) {
      const error = new Error("missing_server_debug_key");
      registerApiError(path, error);
      throw error;
    }
    headers.set("x-debug-key", debugKey);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);

  try {
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      signal: controller.signal
    });

    const text = await response.text();
    let json: any = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }

    if (!response.ok) {
      const error = new Error(json?.error || `API request failed (${response.status})`) as BackendError;
      error.status = response.status;
      error.body = json;
      registerApiError(path, error);
      throw error;
    }

    clearApiError();
    return json as T;
  } catch (error) {
    const normalizedError =
      error instanceof Error && error.name === "AbortError"
        ? new Error(`API request timeout (${timeoutMs}ms)`)
        : error;
    registerApiError(path, normalizedError);
    throw normalizedError;
  } finally {
    clearTimeout(timeout);
  }
}

async function backendPortalFetch<T>(path: string, init?: RequestInit, timeoutMs?: number): Promise<T> {
  const headers = new Headers(init?.headers || {});
  const portalKey = getPortalInternalKey();

  if (!portalKey) {
    throw new Error("PORTAL_INTERNAL_KEY is not configured");
  }

  headers.set("x-portal-key", portalKey);
  return backendFetch<T>(path, { ...init, headers }, false, timeoutMs);
}

export type InboxItem = {
  ts: string;
  type: string;
  from: string | null;
  messageId: string | null;
  text: string | null;
  payload?: Record<string, unknown>;
};

function localInboxItems(limit = 50): InboxItem[] {
  const data = readSaasData();
  const conversationsById = new Map(data.conversations.map((c) => [c.id, c]));
  const contactsById = new Map(data.contacts.map((c) => [c.id, c]));

  const items = [...data.messages]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, Math.max(1, Math.min(limit, DEBUG_INBOX_MAX_ITEMS)))
    .map((msg) => {
      const conversation = conversationsById.get(msg.conversationId);
      const contact = conversation ? contactsById.get(conversation.contactId) : undefined;
      return {
        ts: msg.timestamp,
        type: msg.direction,
        from: contact?.phone || contact?.name || null,
        messageId: msg.id,
        text: msg.text || null,
        payload: {
          status: msg.status,
          tenantId: msg.tenantId,
          conversationId: msg.conversationId
        }
      } satisfies InboxItem;
    });

  return items;
}

export async function getHealth() {
  if (isBackendConfigured()) {
    return backendFetch<{ ok: boolean; service: string }>("/health", undefined, false);
  }

  return {
    ok: true,
    service: "opturon-web"
  };
}

export async function getBuild() {
  if (isBackendConfigured()) {
    return backendFetch<{ ok: boolean; buildId?: string; pid?: number; cwd?: string; file?: string }>("/build", undefined, false);
  }

  return {
    ok: true,
    buildId: process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_URL || "local",
    pid: process.pid,
    cwd: process.cwd(),
    file: "opturon-web-local"
  };
}

export type PortalTenantContext = {
  tenantId: string;
  clinic: {
    id: string;
    name: string | null;
    timezone: string | null;
    externalTenantId: string | null;
  } | null;
  channel: {
    id: string;
    clinicId: string;
    provider: string | null;
    phoneNumberId: string | null;
    displayPhoneNumber?: string | null;
    verifiedName?: string | null;
    wabaId: string | null;
    status: string | null;
  } | null;
  onboarding?: {
    hasChannel: boolean;
    hasProducts: boolean;
    hasMessages: boolean;
    botEnabled: boolean;
    productsCount: number;
    conversationsCount: number;
    automationsCount: number;
  };
  reason: string;
};

export type PortalWhatsAppOnboardingSession = {
  id: string;
  status: string | null;
  externalTenantId: string | null;
  clinicId: string | null;
  stateToken: string | null;
  channelId: string | null;
  wabaId: string | null;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  expiresAt: string | null;
};

export type PortalWhatsAppEmbeddedSignupStatus = {
  tenantId: string;
  clinicId: string | null;
  session: PortalWhatsAppOnboardingSession | null;
  onboardingState: "idle" | "pending_meta" | "connected" | "error";
};

export type PortalWhatsAppTemplateBlueprint = {
  key: string;
  title: string;
  description: string;
  category: string;
  defaultLanguage: string;
  version: number;
  components: Array<{
    type: string;
    text: string;
    example?: Record<string, unknown>;
  }>;
};

export type PortalWhatsAppTemplate = {
  id: string;
  clinicId: string;
  externalTenantId: string;
  channelId: string | null;
  wabaId: string;
  templateKey: string;
  metaTemplateId: string | null;
  metaTemplateName: string;
  language: string;
  category: string;
  status: string;
  rejectionReason: string | null;
  definition: Record<string, unknown> | null;
  lastSyncedAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export async function getPortalTenantContext(tenantId: string) {
  return backendFetch<{ success: boolean; data: PortalTenantContext }>(`/portal/tenants/${tenantId}/context`, undefined, false);
}

export async function getPortalWhatsAppEmbeddedSignupStatus(tenantId: string) {
  return backendPortalFetch<{
    success: boolean;
    data: PortalWhatsAppEmbeddedSignupStatus;
  }>(`/portal/tenants/${tenantId}/whatsapp/embedded-signup/status`);
}

export async function createPortalWhatsAppEmbeddedSignupBootstrap(
  tenantId: string,
  payload: { redirectUri: string; actorUserId?: string | null; metadata?: Record<string, unknown> | null }
) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      clinicId: string;
      ready: boolean;
      status: string;
      reason: string;
      session: PortalWhatsAppOnboardingSession | null;
    };
  }>(`/portal/tenants/${tenantId}/whatsapp/embedded-signup/bootstrap`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function finalizePortalWhatsAppEmbeddedSignup(
  tenantId: string,
  payload: {
    stateToken: string;
    code?: string | null;
    redirectUri: string;
    requestId?: string | null;
    metaPayload?: Record<string, unknown> | null;
    error?: string | null;
    errorDescription?: string | null;
  }
) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      clinicId: string;
      status: "connected" | "pending_meta";
      channel?: PortalTenantContext["channel"] | null;
      session: PortalWhatsAppOnboardingSession | null;
    };
  }>(`/portal/tenants/${tenantId}/whatsapp/embedded-signup/finalize`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function connectPortalWhatsAppManual(
  tenantId: string,
  payload: {
    wabaId: string;
    phoneNumberId: string;
    accessToken: string;
    channelName?: string | null;
  }
) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      clinicId: string;
      status: "connected" | "pending_meta";
      channel: PortalTenantContext["channel"] | null;
      validation: {
        wabaName: string | null;
        displayPhoneNumber: string | null;
        verifiedName: string | null;
        subscriptionOk: boolean;
      };
    };
  }>(`/portal/tenants/${tenantId}/whatsapp/manual-connect`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getPortalInstagramStatus(tenantId: string) {
  return backendPortalFetch<{
    success: boolean;
    data: PortalInstagramStatus;
  }>(`/portal/tenants/${tenantId}/instagram/status`);
}

export async function connectPortalInstagram(
  tenantId: string,
  payload: {
    code: string;
    redirectUri: string;
  }
) {
  return backendPortalFetch<{
    success: boolean;
    data: PortalInstagramStatus;
  }>(`/portal/tenants/${tenantId}/instagram/connect`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export type PortalWhatsAppDiscoveredAsset = {
  wabaId: string;
  wabaName: string | null;
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  qualityRating: string | null;
  status: string | null;
  label: string;
};

export async function discoverPortalWhatsAppAssets(
  tenantId: string,
  payload: { accessToken: string }
) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      clinicId: string;
      items: PortalWhatsAppDiscoveredAsset[];
    };
  }>(`/portal/tenants/${tenantId}/whatsapp/discover-assets`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getPortalWhatsAppTemplateBlueprints(tenantId: string) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      blueprints: PortalWhatsAppTemplateBlueprint[];
    };
  }>(`/portal/tenants/${tenantId}/whatsapp/templates/blueprints`);
}

export async function getPortalWhatsAppTemplates(tenantId: string) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      templates: PortalWhatsAppTemplate[];
    };
  }>(`/portal/tenants/${tenantId}/whatsapp/templates`);
}

export async function createPortalWhatsAppTemplateFromBlueprint(
  tenantId: string,
  payload: { templateKey: string; language?: string }
) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      template: PortalWhatsAppTemplate;
      created: boolean;
    };
  }>(`/portal/tenants/${tenantId}/whatsapp/templates/create-from-blueprint`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function syncPortalWhatsAppTemplates(tenantId: string) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      templates: PortalWhatsAppTemplate[];
      syncedCount: number;
    };
  }>(`/portal/tenants/${tenantId}/whatsapp/templates/sync`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export type PortalUser = {
  id: string;
  clinicId: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function getPortalUsers(tenantId: string) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      users: PortalUser[];
    };
  }>(`/portal/tenants/${tenantId}/users`);
}

export async function createPortalUser(
  tenantId: string,
  payload: { email: string; name: string; role: string; password: string }
) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      user: PortalUser;
    };
  }>(`/portal/tenants/${tenantId}/users`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function loginPortalUser(email: string, password: string) {
  return backendFetch<{
    success: boolean;
    data: {
      id: string;
      email: string;
      name: string;
      tenantId: string;
      tenantRole: TenantRole;
      globalRole: string;
    };
  }>(
    "/portal/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password })
    },
    false,
    AUTH_API_TIMEOUT_MS
  );
}

export async function getPortalAuthUserByEmail(email: string) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      id: string;
      email: string;
      name: string;
      tenantId: string;
      tenantRole: TenantRole;
      globalRole: GlobalRole;
    } | null;
  }>(`/portal/auth/users/by-email?email=${encodeURIComponent(email)}`, undefined, AUTH_API_TIMEOUT_MS);
}

export async function patchPortalUserRole(tenantId: string, userId: string, role: TenantRole) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      user: PortalUser;
    };
  }>(`/portal/tenants/${tenantId}/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role })
  });
}

export async function deletePortalUser(tenantId: string, userId: string, currentUserId?: string) {
  const headers = currentUserId ? { "x-portal-actor-id": currentUserId } : undefined;
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      userId: string;
    };
  }>(`/portal/tenants/${tenantId}/users/${userId}`, {
    method: "DELETE",
    headers
  });
}

export async function getPortalConversations(tenantId: string, options?: { visibility?: "active" | "archived" }) {
  const params = new URLSearchParams();
  if (options?.visibility === "archived") params.set("visibility", "archived");
  return backendFetch<{
    success: boolean;
    data: {
      tenantId: string;
      conversations: any[];
    };
  }>(`/portal/tenants/${tenantId}/conversations${params.toString() ? `?${params.toString()}` : ""}`, undefined, false);
}

export type PortalContact = {
  id: string;
  clinicId: string;
  waId: string | null;
  phone: string | null;
  name: string;
  profileImageUrl?: string | null;
  optedOut: boolean;
  lastInteractionAt: string | null;
  conversationCount: number;
  financialSignal?: {
    outstandingAmount: number;
    unallocatedPayments: number;
    status: "has_debt" | "settled" | "unallocated_payment";
  };
};

export type PortalContactDetail = PortalContact & {
  email?: string | null;
  profileImageUrl?: string | null;
  whatsappPhone?: string | null;
  taxId?: string | null;
  taxCondition?: string | null;
  companyName?: string | null;
  notes?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  financialSnapshot?: {
    totalInvoiced: number;
    totalCredited: number;
    totalDocumentBalance: number;
    totalPaid: number;
    outstandingAmount: number;
    unallocatedPayments: number;
  };
  relatedDocuments?: Array<{
    id: string;
    invoiceNumber: string | null;
    type: string;
    status: string;
    currency: string;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    issuedAt: string | null;
    createdAt: string | null;
  }>;
  relatedPayments?: Array<{
    id: string;
    amount: number;
    currency: string;
    method: string;
    status: string;
    paidAt: string | null;
    allocatedAmount: number;
    unallocatedAmount: number;
  }>;
  loyalty?: {
    summary: {
      contactId: string;
      currentPoints: number;
      totalEarned: number;
      totalRedeemed: number;
      totalAdjusted: number;
      lastMovementAt: string | null;
    };
    recentMovements: PortalLoyaltyLedgerEntry[];
  };
};

export async function getPortalContacts(tenantId: string, options?: { visibility?: "active" | "archived" }) {
  const params = new URLSearchParams();
  if (options?.visibility === "archived") params.set("visibility", "archived");
  return backendFetch<{
    success: boolean;
    data: {
      tenantId: string;
      contacts: PortalContact[];
    };
  }>(`/portal/tenants/${tenantId}/contacts${params.toString() ? `?${params.toString()}` : ""}`, undefined, false);
}

export async function getPortalContactDetail(tenantId: string, contactId: string) {
  return backendFetch<{ success: boolean; data: PortalContactDetail }>(
    `/portal/tenants/${tenantId}/contacts/${contactId}`,
    undefined,
    false
  );
}

export async function createPortalContact(
  tenantId: string,
  payload: {
    name: string;
    email?: string | null;
    phone?: string | null;
    profileImageUrl?: string | null;
    whatsappPhone?: string | null;
    companyName?: string | null;
    taxId?: string | null;
    notes?: string | null;
  }
) {
  return backendFetch<{ success: boolean; data: PortalContactDetail }>(
    `/portal/tenants/${tenantId}/contacts`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    false
  );
}

export async function patchPortalContact(
  tenantId: string,
  contactId: string,
  payload: {
    name: string;
    email?: string | null;
    phone?: string | null;
    profileImageUrl?: string | null;
    whatsappPhone?: string | null;
    companyName?: string | null;
    taxId?: string | null;
    taxCondition?: string | null;
    notes?: string | null;
  }
) {
  return backendFetch<{ success: boolean; data: PortalContactDetail }>(
    `/portal/tenants/${tenantId}/contacts/${contactId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
      false
    );
  }

export async function archivePortalContacts(tenantId: string, contactIds: string[]) {
  return backendFetch<{
    success: boolean;
    data: {
      archivedContactIds: string[];
      archivedCount: number;
    };
  }>(`/portal/tenants/${tenantId}/contacts/archive`, {
    method: "PATCH",
    body: JSON.stringify({ contactIds })
  }, false);
}

export async function restorePortalContacts(tenantId: string, contactIds: string[]) {
  return backendFetch<{
    success: boolean;
    data: {
      restoredContactIds: string[];
      restoredCount: number;
    };
  }>(`/portal/tenants/${tenantId}/contacts/restore`, {
    method: "PATCH",
    body: JSON.stringify({ contactIds })
  }, false);
}

export type PortalBusinessSettings = {
  tenantId: string;
  clinicId: string | null;
  clinicName: string | null;
  profileImageUrl: string;
  legalName: string;
  taxId: string;
  taxIdType: string;
  vatCondition: string;
  grossIncomeNumber: string;
  fiscalAddress: string;
  city: string;
  province: string;
  pointOfSaleSuggested: string;
  defaultSuggestedFiscalVoucherType: string;
  accountantEmail: string;
  accountantName: string;
  openingHours: string;
  address: string;
  deliveryZones: string;
  paymentMethods: string;
  policies: string;
};

export type PortalBotTransferConfig = {
  enabled: boolean;
  alias: string;
  cbu: string;
  titular: string;
  bank: string;
  instructions: string;
  destinationId?: string | null;
  reference?: string | null;
};

export async function getPortalBusinessSettings(tenantId: string) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      clinicId: string;
      settings: PortalBusinessSettings;
    };
  }>(`/portal/tenants/${tenantId}/business`);
}

export async function patchPortalBusinessSettings(
  tenantId: string,
  payload: Partial<PortalBusinessSettings>
) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      clinicId: string;
      settings: PortalBusinessSettings;
    };
  }>(`/portal/tenants/${tenantId}/business`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function getPortalBotTransferConfig(tenantId: string) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      clinicId: string;
      settings: {
        tenantId: string;
        clinicId: string;
        clinicName: string | null;
        transferConfig: PortalBotTransferConfig;
        previewText?: string;
      };
    };
  }>(`/portal/tenants/${tenantId}/bot/transfer-config`);
}

export async function savePortalBotTransferConfig(
  tenantId: string,
  payload: Partial<PortalBotTransferConfig>
) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      clinicId: string;
      settings: {
        tenantId: string;
        clinicId: string;
        clinicName: string | null;
        transferConfig: PortalBotTransferConfig;
        previewText?: string;
      };
    };
  }>(`/portal/tenants/${tenantId}/bot/transfer-config`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getPortalConversationDetail(tenantId: string, conversationId: string) {
  return backendFetch<{ success: boolean; data: any }>(
    `/portal/tenants/${tenantId}/conversations/${conversationId}`,
    undefined,
    false
  );
}

export async function patchPortalConversation(tenantId: string, conversationId: string, payload: Record<string, unknown>) {
  return backendFetch<{ success: boolean; data: any }>(
    `/portal/tenants/${tenantId}/conversations/${conversationId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload || {})
    },
      false
    );
  }

export async function archivePortalConversations(tenantId: string, conversationIds: string[]) {
  return backendFetch<{
    success: boolean;
    data: {
      archivedConversationIds: string[];
      archivedCount: number;
    };
  }>(`/portal/tenants/${tenantId}/conversations/archive`, {
    method: "PATCH",
    body: JSON.stringify({ conversationIds })
  }, false);
}

export async function restorePortalConversations(tenantId: string, conversationIds: string[]) {
  return backendFetch<{
    success: boolean;
    data: {
      restoredConversationIds: string[];
      restoredCount: number;
    };
  }>(`/portal/tenants/${tenantId}/conversations/restore`, {
    method: "PATCH",
    body: JSON.stringify({ conversationIds })
  }, false);
}

export async function sendPortalMessage(
  tenantId: string,
  payload: { conversationId: string; text: string }
) {
  return backendFetch<{ success: boolean; data: { message: any } }>(
    `/portal/tenants/${tenantId}/messages`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    false
  );
}

export type PortalOrderItem = {
  id: string;
  productId: string | null;
  nameSnapshot: string;
  skuSnapshot: string | null;
  priceSnapshot: number;
  currencySnapshot: string | null;
  quantity: number;
  variant: string | null;
  createdAt: string;
};

export type PortalOrderTransferPayment = {
  orderId: string | null;
  status: string | null;
  paymentMethod: string | null;
  destinationId: string | null;
  requestedAt: string | null;
  proofSubmittedAt: string | null;
  proofMessageId: string | null;
  proofMetadata: {
    messageId: string | null;
    providerMessageId: string | null;
    type: string | null;
    mediaId: string | null;
    mimeType: string | null;
    caption: string | null;
    filename: string | null;
    sha256: string | null;
  } | null;
  validationMode: string | null;
  validationDecision: string | null;
  validatedAt: string | null;
  validatedBy: string | null;
  validatedByName: string | null;
  rejectionReason: string | null;
  orderPaymentStatus: string | null;
  conversationId: string | null;
  conversationState: string | null;
  conversationStage: string | null;
};

export type PortalOrderConversationPreview = {
  conversationId: string;
  state: string | null;
  stage: string | null;
  messages: Array<{
    id: string;
    direction: string;
    text: string;
    timestamp: string;
    type: string | null;
  }>;
};

export type PortalOrder = {
  id: string;
  clinicId: string;
  contactId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerType: "registered_contact" | "final_consumer";
  notes: string | null;
  subtotal: number;
  total: number;
  currency: string;
  source: string | null;
  sellerUserId: string | null;
  sellerNameSnapshot?: string | null;
  paymentDestinationId?: string | null;
  paymentDestinationNameSnapshot?: string | null;
  paymentDestinationTypeSnapshot?: "bank" | "wallet" | "cash_box" | "other" | null;
  paymentStatus: string;
  orderStatus: string;
  conversationId?: string | null;
  createdAt: string;
  updatedAt: string;
  contact: {
    id: string;
    name: string | null;
    phone: string | null;
  } | null;
  seller?: {
    id: string | null;
    name: string | null;
    role: string | null;
  } | null;
  paymentDestination?: {
    id: string | null;
    name: string | null;
    type: "bank" | "wallet" | "cash_box" | "other" | null;
    isActive: boolean | null;
  } | null;
  transferPayment?: PortalOrderTransferPayment | null;
  conversationPreview?: PortalOrderConversationPreview | null;
  items: PortalOrderItem[];
};

export type PortalOrderPaymentMetricsRange = "today" | "last_7_days" | "last_30_days";

export type PortalOrderPaymentMetrics = {
  range: PortalOrderPaymentMetricsRange;
  pending: number;
  approved: number;
  rejected: number;
};

export type PortalPaymentDestinationType = "bank" | "wallet" | "cash_box" | "other";

export type PortalPaymentDestination = {
  id: string;
  clinicId: string;
  name: string;
  type: PortalPaymentDestinationType;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PortalInstagramChannel = {
  id: string;
  clinicId: string;
  type: "instagram";
  provider: string | null;
  externalId: string | null;
  externalPageId: string | null;
  externalPageName: string | null;
  instagramUserId: string | null;
  instagramUsername: string | null;
  status: string | null;
};

export type PortalInstagramStatus = {
  tenantId: string;
  clinicId: string | null;
  state: "connected" | "not_connected";
  channel: PortalInstagramChannel | null;
  channels: PortalInstagramChannel[];
};

export type PortalCashSessionOrder = {
  id: string;
  customerName: string;
  totalAmount: number;
  currency: string;
  createdAt: string | null;
  sellerName: string;
};

export type PortalCashSession = {
  id: string;
  clinicId: string;
  paymentDestinationId: string;
  openedByUserId: string;
  openedByNameSnapshot: string | null;
  openedAt: string | null;
  openingAmount: number;
  status: "open" | "closed";
  closedByUserId: string | null;
  closedByNameSnapshot: string | null;
  closedAt: string | null;
  countedAmount: number | null;
  expectedAmount: number | null;
  differenceAmount: number | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  paymentDestination?: {
    id: string;
    name: string;
    type: PortalPaymentDestinationType;
    isActive: boolean;
  } | null;
  metrics?: {
    ordersCount: number;
    salesAmount: number;
    expectedAmountCurrent: number;
    recentOrders: PortalCashSessionOrder[];
  };
  lifecycle?: {
    canClose: boolean;
    canReopen: boolean;
  };
};

export type PortalAgendaItem = {
  id: string;
  clinicId: string;
  date: string;
  startAt: string | null;
  endAt: string | null;
  contactId: string | null;
  contact: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
  startTime: string | null;
  endTime: string | null;
  type: "note" | "follow_up" | "task" | "appointment" | "blocked" | "availability";
  title: string;
  description: string | null;
  status: "pending" | "done" | "cancelled";
  createdAt: string | null;
  updatedAt: string | null;
};

export type PortalAgendaAvailabilityDay = {
  date: string;
  policy: "explicit_availability" | "implicit_open";
  availability: PortalAgendaItem[];
  blocked: PortalAgendaItem[];
  appointments: PortalAgendaItem[];
  informational: PortalAgendaItem[];
  occupiedWindows: Array<{
    date: string;
    type: string;
    title: string;
    startTime: string;
    endTime: string;
  }>;
  bookableWindows: Array<{
    date: string;
    startTime: string;
    endTime: string;
  }>;
  summary: {
    availabilityCount: number;
    blockedCount: number;
    appointmentCount: number;
    informationalCount: number;
    bookableWindowCount: number;
  };
};

export type PortalCashBoxOverview = PortalPaymentDestination & {
  currentSession: PortalCashSession | null;
};

export type PortalProduct = {
  id: string;
  clinicId: string;
  name: string;
  description: string | null;
  unitPrice?: number;
  price: number;
  currency: string;
  vatRate?: number;
  taxRate?: number;
  stock: number;
  status: string;
  active?: boolean;
  sku: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PortalProductCategory = {
  id: string;
  clinicId: string;
  name: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PortalInvoiceItem = {
  id: string;
  productId: string | null;
  descriptionSnapshot: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotalAmount: number;
  totalAmount: number;
  createdAt: string | null;
};

export type PortalPaymentAllocation = {
  id: string;
  clinicId: string;
  paymentId: string;
  invoiceId: string;
  amount: number;
  createdAt: string | null;
  updatedAt: string | null;
  payment?: {
    id: string;
    status: string | null;
    amount: number;
    currency: string | null;
    paidAt: string | null;
  } | null;
  invoice?: {
    id: string;
    invoiceNumber: string | null;
    type: string | null;
    status: string | null;
    totalAmount: number;
    currency: string | null;
  } | null;
};

export type PortalInvoice = {
  id: string;
  clinicId: string;
  contactId: string | null;
  orderId: string | null;
  parentInvoiceId: string | null;
  invoiceNumber: string | null;
  internalDocumentNumber: string | null;
  type: string;
  status: string;
  documentKind: string;
  fiscalStatus: string;
  documentMode: string;
  providerStatus: string | null;
  currency: string;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  issuedAt: string | null;
  dueAt: string | null;
  externalProvider: string | null;
  externalReference: string | null;
  customerTaxId: string | null;
  customerTaxIdType: string;
  customerLegalName: string | null;
  customerVatCondition: string | null;
  issuerLegalName: string | null;
  issuerTaxId: string | null;
  issuerTaxIdType: string;
  issuerVatCondition: string | null;
  issuerGrossIncomeNumber: string | null;
  issuerFiscalAddress: string | null;
  issuerCity: string | null;
  issuerProvince: string | null;
  pointOfSaleSuggested: string | null;
  suggestedFiscalVoucherType: string;
  accountantNotes: string | null;
  deliveredToAccountantAt: string | null;
  invoicedByAccountantAt: string | null;
  accountantReferenceNumber: string | null;
  noFiscal?: boolean;
  noFiscalLegend?: string | null;
  missingDataFlags?: string[];
  accountingComplete?: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
  updatedAt: string | null;
  balanceImpact: {
    affectsOperationalBalance: boolean;
    sign: string;
    amount: number;
  };
  paidAmount: number;
  outstandingAmount: number;
  receivableStatus: string;
  lifecycle?: {
    canEdit: boolean;
    canIssue: boolean;
    canVoid: boolean;
    internalStatus: string;
    providerStatus: string | null;
    documentMode: string;
  };
  contact?: {
    id: string;
    name: string | null;
    phone: string | null;
  } | null;
  parentInvoice?: {
    id: string;
    invoiceNumber: string | null;
    type: string | null;
    status: string | null;
    totalAmount: number;
  } | null;
  items?: PortalInvoiceItem[];
  allocations?: PortalPaymentAllocation[];
  relatedCreditNotes?: Array<{
    id: string;
    invoiceNumber: string | null;
    type: string;
    status: string;
    currency: string;
    totalAmount: number;
    issuedAt: string | null;
    createdAt: string | null;
    balanceImpact: {
      affectsOperationalBalance: boolean;
      sign: string;
      amount: number;
    };
  }>;
};

export type PortalPayment = {
  id: string;
  clinicId: string;
  contactId: string | null;
  invoiceId: string | null;
  amount: number;
  currency: string;
  method: string;
  status: string;
  paidAt: string | null;
  externalReference: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
  updatedAt: string | null;
  balanceImpact: {
    affectsOutstanding: boolean;
    amount: number;
  };
  allocatedAmount?: number;
  unallocatedAmount?: number;
  lifecycle?: {
    canVoid: boolean;
    canAllocate?: boolean;
    internalStatus: string;
  };
  contact?: {
    id: string;
    name: string | null;
    phone: string | null;
  } | null;
  allocations?: PortalPaymentAllocation[];
};

export type PortalSalesSummary = {
  salesToday: number;
  salesMonth: number;
  activeOpportunities: number;
  closeRate: number;
  averageTicket: number;
  activeSalesConversations: number;
};

export type PortalSalesPerformanceRow = {
  responsibleId: string | null;
  responsibleName: string;
  closedSales: number;
  openOpportunities: number;
  closedRevenue: number;
  humanResponses: number;
};

export type PortalSalesMetrics = {
  closedSalesCount: number;
  openOpportunitiesCount: number;
  activeSalesConversations: number;
  humanResponsesCount: number;
  automatedResponsesCount: number;
  totalConversationMessagesCount: number;
  responsiblePerformance: PortalSalesPerformanceRow[];
};

export type PortalSalesOpportunity = {
  id: string;
  contactId: string | null;
  customer: {
    id: string | null;
    name: string;
    phone: string | null;
  };
  status: string;
  paymentStatus: string;
  commercialStage: string;
  commercialStageLabel: string;
  collectionStatusLabel: string;
  amount: number;
  currency: string;
  lastActivityAt: string | null;
  source: string | null;
  responsible: { id: string; name: string } | null;
  conversationId: string | null;
};

export type PortalLoyaltyProgram = {
  id: string | null;
  clinicId: string | null;
  enabled: boolean;
  spendAmount: number;
  pointsAmount: number;
  programText: string;
  redemptionPolicyText: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PortalLoyaltyReward = {
  id: string;
  clinicId: string;
  name: string;
  description: string | null;
  pointsCost: number;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PortalLoyaltyLedgerEntry = {
  id: string;
  clinicId: string;
  contactId: string;
  direction: string;
  points: number;
  pointsDelta: number;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
  contact?: {
    id: string;
    name: string | null;
    phone: string | null;
  } | null;
};

export type PortalLoyaltyContactDetail = {
  contact: {
    id: string;
    name: string;
    phone: string | null;
  };
  loyalty: {
    summary: {
      contactId: string;
      currentPoints: number;
      totalEarned: number;
      totalRedeemed: number;
      totalAdjusted: number;
      lastMovementAt: string | null;
    };
    ledger: PortalLoyaltyLedgerEntry[];
  };
};

export type PortalLoyaltyOverview = {
  program: PortalLoyaltyProgram;
  rewards: PortalLoyaltyReward[];
  summary: {
    enrolledCustomers: number;
    activeCustomers: number;
    pointsIssued: number;
    pointsRedeemed: number;
    outstandingPoints: number;
    totalMovements: number;
    totalRedemptions: number;
    activeRewards: number;
  };
  recentMovements: PortalLoyaltyLedgerEntry[];
};

export type PortalAutomation = {
  id: string;
  clinicId: string;
  externalTenantId: string | null;
  name: string;
  description?: string | null;
  trigger: {
    type: string;
    keyword?: string | null;
  };
  conditions: Record<string, unknown>;
  actions: Array<{
    type: string;
    message?: string | null;
    tag?: string | null;
  }>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function getPortalOrders(tenantId: string) {
  return backendFetch<{
    success: boolean;
    data: {
      tenantId: string;
      orders: PortalOrder[];
    };
  }>(`/portal/tenants/${tenantId}/orders`, undefined, false);
}

export async function getPortalOrderDetail(tenantId: string, orderId: string) {
  return backendFetch<{ success: boolean; data: PortalOrder }>(
    `/portal/tenants/${tenantId}/orders/${orderId}`,
    undefined,
    false
  );
}

export async function getPortalOrderPaymentMetrics(
  tenantId: string,
  range: PortalOrderPaymentMetricsRange
) {
  const query = new URLSearchParams({ range });
  return backendFetch<{ success: boolean; data: PortalOrderPaymentMetrics }>(
    `/portal/tenants/${tenantId}/orders/payment-metrics?${query.toString()}`,
    undefined,
    false
  );
}

export async function createPortalOrder(
  tenantId: string,
  payload: {
    customerType?: "registered_contact" | "final_consumer";
    contactId?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    notes?: string;
    currency?: string;
    source?: string;
    sellerUserId?: string | null;
    paymentDestinationId?: string | null;
    orderStatus?: string;
    items: Array<{
      productId?: string | null;
      nameSnapshot?: string;
      priceSnapshot?: number;
      quantity: number;
      variant?: string | null;
    }>;
  }
) {
  return backendFetch<{ success: boolean; data: PortalOrder }>(
    `/portal/tenants/${tenantId}/orders`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    false
  );
}

export async function getPortalPaymentDestinations(
  tenantId: string,
  options?: { includeInactive?: boolean }
) {
  const query = options?.includeInactive ? "?includeInactive=1" : "";
  return backendFetch<{
    success: boolean;
    data: {
      tenantId: string;
      paymentDestinations: PortalPaymentDestination[];
    };
  }>(`/portal/tenants/${tenantId}/payment-destinations${query}`, undefined, false);
}

export async function createPortalPaymentDestination(
  tenantId: string,
  payload: {
    name: string;
    type: PortalPaymentDestinationType;
    isActive?: boolean;
  }
) {
  return backendPortalFetch<{ success: boolean; data: PortalPaymentDestination }>(
    `/portal/tenants/${tenantId}/payment-destinations`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export async function patchPortalPaymentDestination(
  tenantId: string,
  destinationId: string,
  payload: {
    name?: string;
    type?: PortalPaymentDestinationType;
    isActive?: boolean;
  }
) {
  return backendPortalFetch<{ success: boolean; data: PortalPaymentDestination }>(
    `/portal/tenants/${tenantId}/payment-destinations/${destinationId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    }
  );
}

export async function getPortalCashOverview(tenantId: string) {
  return backendFetch<{
    success: boolean;
    data: {
      tenantId: string;
      cashBoxes: PortalCashBoxOverview[];
      recentClosedSessions: PortalCashSession[];
    };
  }>(`/portal/tenants/${tenantId}/cash-sessions`, undefined, false);
}

export async function getPortalAgendaItems(
  tenantId: string,
  options: { from: string; to: string }
) {
  const params = new URLSearchParams();
  params.set("from", options.from);
  params.set("to", options.to);

  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      range: { fromDate: string; toDate: string };
      items: PortalAgendaItem[];
    };
  }>(`/portal/tenants/${tenantId}/agenda?${params.toString()}`);
}

export async function createPortalAgendaItem(
  tenantId: string,
  payload: {
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    contactId?: string | null;
    type: PortalAgendaItem["type"];
    title: string;
    description?: string | null;
    status?: PortalAgendaItem["status"];
  }
) {
  return backendPortalFetch<{
    success: boolean;
    data: PortalAgendaItem;
  }>(`/portal/tenants/${tenantId}/agenda`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getPortalAgendaAvailability(
  tenantId: string,
  options: { date?: string; from?: string; to?: string }
) {
  const params = new URLSearchParams();
  if (options.date) params.set("date", options.date);
  if (options.from) params.set("from", options.from);
  if (options.to) params.set("to", options.to);

  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      range: { fromDate: string; toDate: string };
      days: PortalAgendaAvailabilityDay[];
    };
  }>(`/portal/tenants/${tenantId}/agenda/availability?${params.toString()}`);
}

export async function createPortalAgendaReservation(
  tenantId: string,
  payload: {
    date: string;
    startTime: string;
    endTime: string;
    title: string;
    description?: string | null;
    contactId?: string | null;
    status?: PortalAgendaItem["status"];
  }
) {
  return backendPortalFetch<{
    success: boolean;
    data: PortalAgendaItem;
  }>(`/portal/tenants/${tenantId}/agenda/reservations`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function patchPortalAgendaItem(
  tenantId: string,
  itemId: string,
  payload: Partial<{
    date: string;
    startTime: string | null;
    endTime: string | null;
    contactId: string | null;
    type: PortalAgendaItem["type"];
    title: string;
    description: string | null;
    status: PortalAgendaItem["status"];
  }>
) {
  return backendPortalFetch<{
    success: boolean;
    data: PortalAgendaItem;
  }>(`/portal/tenants/${tenantId}/agenda/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function deletePortalAgendaItem(tenantId: string, itemId: string) {
  return backendPortalFetch<{
    success: boolean;
    data: PortalAgendaItem;
  }>(`/portal/tenants/${tenantId}/agenda/${itemId}`, {
    method: "DELETE"
  });
}

export async function openPortalCashSession(
  tenantId: string,
  payload: {
    paymentDestinationId: string;
    openingAmount: number;
    openedByUserId: string;
    notes?: string | null;
  }
) {
  return backendPortalFetch<{ success: boolean; data: PortalCashSession }>(
    `/portal/tenants/${tenantId}/cash-sessions`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export async function closePortalCashSession(
  tenantId: string,
  sessionId: string,
  payload: {
    countedAmount: number;
    closedByUserId: string;
    notes?: string | null;
  }
) {
  return backendPortalFetch<{ success: boolean; data: PortalCashSession }>(
    `/portal/tenants/${tenantId}/cash-sessions/${sessionId}/close`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export async function patchPortalOrderStatus(
  tenantId: string,
  orderId: string,
  payload: { orderStatus: string; paymentStatus?: string; paymentDestinationId?: string | null }
) {
  return backendFetch<{ success: boolean; data: PortalOrder }>(
    `/portal/tenants/${tenantId}/orders/${orderId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    false
  );
}

export async function validatePortalOrderTransferPayment(
  tenantId: string,
  orderId: string,
  payload: { action: "approve" | "reject"; rejectionReason?: string | null },
  actor?: { id?: string | null; name?: string | null }
) {
  const headers = new Headers();
  if (actor?.id) headers.set("x-portal-actor-id", actor.id);
  if (actor?.name) headers.set("x-portal-actor-name", actor.name);

  return backendFetch<{
    success: boolean;
    data: {
      order: PortalOrder;
      notification: {
        id?: string;
        status?: string;
        providerMessageId?: string | null;
        ok?: boolean;
        reason?: string | null;
      };
    };
  }>(
    `/portal/tenants/${tenantId}/orders/${orderId}/payment-validation`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload || {})
    },
    false
  );
}

export async function getPortalProducts(tenantId: string) {
  return backendFetch<{
    success: boolean;
    data: {
      tenantId: string;
      products: PortalProduct[];
    };
  }>(`/portal/tenants/${tenantId}/products`, undefined, false);
}

export async function deletePortalProduct(tenantId: string, productId: string) {
  return backendFetch<{
    success: boolean;
    data: {
      tenantId: string;
      productId: string;
    };
  }>(`/portal/tenants/${tenantId}/products/${productId}`, { method: "DELETE" }, false);
}

export async function getPortalInvoices(tenantId: string) {
  return backendFetch<{
    success: boolean;
    data: {
      tenantId: string;
      invoices: PortalInvoice[];
    };
  }>(`/portal/tenants/${tenantId}/invoices`, undefined, false);
}

export async function createPortalInvoice(
  tenantId: string,
  payload: {
    contactId: string | null;
    type?: string;
    parentInvoiceId?: string | null;
    documentMode?: string;
    currency?: string;
    metadata?: Record<string, unknown>;
    items: Array<{
      descriptionSnapshot: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
    }>;
  }
) {
  return backendFetch<{ success: boolean; data: PortalInvoice }>(
    `/portal/tenants/${tenantId}/invoices`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    false
  );
}

export async function getPortalInvoiceDetail(tenantId: string, invoiceId: string) {
  return backendFetch<{ success: boolean; data: PortalInvoice }>(
    `/portal/tenants/${tenantId}/invoices/${invoiceId}`,
    undefined,
    false
  );
}

export async function updatePortalInvoice(
  tenantId: string,
  invoiceId: string,
  payload: {
    contactId: string | null;
    type?: string;
    parentInvoiceId?: string | null;
    documentMode?: string;
    currency?: string;
    metadata?: Record<string, unknown>;
    items: Array<{
      descriptionSnapshot: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
    }>;
  }
) {
  return backendFetch<{ success: boolean; data: PortalInvoice }>(
    `/portal/tenants/${tenantId}/invoices/${invoiceId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    false
  );
}

export async function updatePortalInvoiceAccounting(
  tenantId: string,
  invoiceId: string,
  payload: {
    documentKind?: string;
    fiscalStatus?: string;
    customerTaxId?: string | null;
    customerTaxIdType?: string;
    customerLegalName?: string | null;
    customerVatCondition?: string | null;
    issuerLegalName?: string | null;
    issuerTaxId?: string | null;
    issuerTaxIdType?: string;
    issuerVatCondition?: string | null;
    issuerGrossIncomeNumber?: string | null;
    issuerFiscalAddress?: string | null;
    issuerCity?: string | null;
    issuerProvince?: string | null;
    pointOfSaleSuggested?: string | null;
    suggestedFiscalVoucherType?: string;
    accountantNotes?: string | null;
    accountantReferenceNumber?: string | null;
  }
) {
  return backendFetch<{ success: boolean; data: PortalInvoice }>(
    `/portal/tenants/${tenantId}/invoices/${invoiceId}/accounting`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    false
  );
}

export async function updatePortalInvoicesBulkStatus(
  tenantId: string,
  payload: {
    invoiceIds: string[];
    fiscalStatus: string;
  }
) {
  return backendFetch<{
    success: boolean;
    data: {
      tenantId: string;
      fiscalStatus: string;
      invoices: PortalInvoice[];
    };
  }>(
    `/portal/tenants/${tenantId}/invoices/bulk-status`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    false
  );
}

export async function issuePortalInvoice(tenantId: string, invoiceId: string, payload?: { issuedAt?: string; metadata?: Record<string, unknown> }) {
  return backendFetch<{ success: boolean; data: PortalInvoice }>(
    `/portal/tenants/${tenantId}/invoices/${invoiceId}/issue`,
    {
      method: "POST",
      body: JSON.stringify(payload || {})
    },
    false
  );
}

export async function voidPortalInvoice(tenantId: string, invoiceId: string, payload?: { reason?: string; metadata?: Record<string, unknown> }) {
  return backendFetch<{ success: boolean; data: PortalInvoice }>(
    `/portal/tenants/${tenantId}/invoices/${invoiceId}/void`,
    {
      method: "POST",
      body: JSON.stringify(payload || {})
    },
    false
  );
}

export async function getPortalPayments(tenantId: string) {
  return backendFetch<{
    success: boolean;
    data: {
      tenantId: string;
      payments: PortalPayment[];
    };
  }>(`/portal/tenants/${tenantId}/payments`, undefined, false);
}

export async function getPortalPaymentDetail(tenantId: string, paymentId: string) {
  return backendFetch<{ success: boolean; data: PortalPayment }>(
    `/portal/tenants/${tenantId}/payments/${paymentId}`,
    undefined,
    false
  );
}

export async function createPortalPayment(
  tenantId: string,
  payload: {
    amount: number;
    currency?: string;
    method?: string;
    paidAt?: string;
    contactId?: string | null;
    invoiceId?: string | null;
    notes?: string | null;
    metadata?: Record<string, unknown> | null;
  }
) {
  return backendFetch<{ success: boolean; data: PortalPayment }>(
    `/portal/tenants/${tenantId}/payments`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    false
  );
}

export async function voidPortalPayment(
  tenantId: string,
  paymentId: string,
  payload?: { reason?: string; notes?: string | null; metadata?: Record<string, unknown> }
) {
  return backendFetch<{ success: boolean; data: PortalPayment }>(
    `/portal/tenants/${tenantId}/payments/${paymentId}/void`,
    {
      method: "POST",
      body: JSON.stringify(payload || {})
    },
    false
  );
}

export async function createPortalPaymentAllocation(
  tenantId: string,
  paymentId: string,
  payload: { invoiceId: string; amount: number }
) {
  return backendFetch<{
    success: boolean;
    data: {
      allocation: PortalPaymentAllocation;
      payment: PortalPayment;
    };
  }>(
    `/portal/tenants/${tenantId}/payments/${paymentId}/allocations`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    false
  );
}

export async function getPortalAutomations(tenantId: string) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      automations: PortalAutomation[];
    };
  }>(`/portal/tenants/${tenantId}/automations`);
}

export async function getPortalSalesSummary(tenantId: string) {
  return backendFetch<{
    success: boolean;
    data: {
      tenantId: string;
      summary: PortalSalesSummary;
    };
  }>(`/portal/tenants/${tenantId}/sales/summary`, undefined, false);
}

export async function getPortalSalesMetrics(tenantId: string) {
  return backendFetch<{
    success: boolean;
    data: {
      tenantId: string;
      metrics: PortalSalesMetrics;
    };
  }>(`/portal/tenants/${tenantId}/sales/metrics`, undefined, false);
}

export async function getPortalSalesOpportunities(tenantId: string) {
  return backendFetch<{
    success: boolean;
    data: {
      tenantId: string;
      opportunities: PortalSalesOpportunity[];
    };
  }>(`/portal/tenants/${tenantId}/sales/opportunities`, undefined, false);
}

export async function getPortalLoyaltyProgram(tenantId: string) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      program: PortalLoyaltyProgram;
    };
  }>(`/portal/tenants/${tenantId}/loyalty/program`);
}

export async function patchPortalLoyaltyProgram(
  tenantId: string,
  payload: {
    enabled: boolean;
    spendAmount: number;
    pointsAmount: number;
    programText?: string;
    redemptionPolicyText?: string;
  }
) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      program: PortalLoyaltyProgram;
    };
  }>(`/portal/tenants/${tenantId}/loyalty/program`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function getPortalLoyaltyRewards(tenantId: string) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      rewards: PortalLoyaltyReward[];
    };
  }>(`/portal/tenants/${tenantId}/loyalty/rewards`);
}

export async function createPortalLoyaltyReward(
  tenantId: string,
  payload: { name: string; description?: string | null; pointsCost: number; active?: boolean }
) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      reward: PortalLoyaltyReward;
    };
  }>(`/portal/tenants/${tenantId}/loyalty/rewards`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function patchPortalLoyaltyReward(
  tenantId: string,
  rewardId: string,
  payload: { name?: string; description?: string | null; pointsCost?: number; active?: boolean }
) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      reward: PortalLoyaltyReward;
    };
  }>(`/portal/tenants/${tenantId}/loyalty/rewards/${rewardId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function getPortalLoyaltyOverview(tenantId: string) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      overview: PortalLoyaltyOverview;
    };
  }>(`/portal/tenants/${tenantId}/loyalty/overview`);
}

export async function getPortalLoyaltyContact(tenantId: string, contactId: string) {
  return backendPortalFetch<{
    success: boolean;
    data: PortalLoyaltyContactDetail;
  }>(`/portal/tenants/${tenantId}/loyalty/contacts/${contactId}`);
}

export async function redeemPortalLoyaltyReward(
  tenantId: string,
  payload: { contactId: string; rewardId: string; notes?: string | null }
) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      redemption: PortalLoyaltyLedgerEntry;
      contact: PortalLoyaltyContactDetail["contact"];
      loyalty: PortalLoyaltyContactDetail["loyalty"];
    };
  }>(`/portal/tenants/${tenantId}/loyalty/redemptions`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function createPortalAutomation(
  tenantId: string,
  payload: {
    name: string;
    description?: string | null;
    trigger: { type: string; keyword?: string | null };
    actions: Array<{ type: string; message?: string | null; tag?: string | null }>;
    enabled?: boolean;
  }
) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      automation: PortalAutomation;
    };
  }>(`/portal/tenants/${tenantId}/automations`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function patchPortalAutomation(
  tenantId: string,
  automationId: string,
  payload: {
    enabled: boolean;
  }
) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      automation: PortalAutomation;
    };
  }>(`/portal/tenants/${tenantId}/automations/${automationId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function deletePortalAutomation(tenantId: string, automationId: string) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      tenantId: string;
      automation: PortalAutomation;
    };
  }>(`/portal/tenants/${tenantId}/automations/${automationId}`, {
    method: "DELETE"
  });
}

export async function getPortalProductDetail(tenantId: string, productId: string) {
  return backendFetch<{ success: boolean; data: PortalProduct }>(
    `/portal/tenants/${tenantId}/products/${productId}`,
    undefined,
    false
  );
}

export async function patchPortalOrder(
  tenantId: string,
  orderId: string,
  payload: { paymentDestinationId?: string | null; sellerUserId?: string | null }
) {
  return backendFetch<{ success: boolean; data: PortalOrder }>(
    `/portal/tenants/${tenantId}/orders/${orderId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    false
  );
}

export async function getPortalProductCategories(tenantId: string, options?: { includeInactive?: boolean }) {
  const params = new URLSearchParams();
  if (options?.includeInactive) params.set("includeInactive", "true");
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return backendFetch<{
    success: boolean;
    data: {
      tenantId: string;
      categories: PortalProductCategory[];
    };
  }>(`/portal/tenants/${tenantId}/product-categories${suffix}`, undefined, false);
}

export async function createPortalProduct(
  tenantId: string,
  payload: {
    name: string;
    description?: string | null;
    price: number;
    currency?: string;
    vatRate?: number;
    taxRate?: number;
    stock?: number;
    sku?: string | null;
    categoryId?: string | null;
    status?: string;
    metadata?: Record<string, unknown>;
  }
) {
  return backendFetch<{ success: boolean; data: PortalProduct }>(
    `/portal/tenants/${tenantId}/products`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    false
  );
}

export async function createPortalProductCategory(
  tenantId: string,
  payload: {
    name: string;
    isActive?: boolean;
  }
) {
  return backendFetch<{ success: boolean; data: PortalProductCategory }>(
    `/portal/tenants/${tenantId}/product-categories`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    false
  );
}

export async function patchPortalProduct(
  tenantId: string,
  productId: string,
  payload: {
    name?: string;
    description?: string | null;
    price?: number;
    currency?: string;
    vatRate?: number;
    taxRate?: number;
    stock?: number;
    sku?: string | null;
    categoryId?: string | null;
    status?: string;
    metadata?: Record<string, unknown>;
  }
) {
  return backendFetch<{ success: boolean; data: PortalProduct }>(
    `/portal/tenants/${tenantId}/products/${productId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    false
  );
}

export async function patchPortalProductCategory(
  tenantId: string,
  categoryId: string,
  payload: {
    name?: string;
    isActive?: boolean;
  }
) {
  return backendFetch<{ success: boolean; data: PortalProductCategory }>(
    `/portal/tenants/${tenantId}/product-categories/${categoryId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    false
  );
}

export async function deletePortalProductCategory(tenantId: string, categoryId: string) {
  return backendFetch<{
    success: boolean;
    data: {
      tenantId: string;
      categoryId: string;
    };
  }>(
    `/portal/tenants/${tenantId}/product-categories/${categoryId}`,
    {
      method: "DELETE"
    },
    false
  );
}

export async function patchPortalProductStatus(
  tenantId: string,
  productId: string,
  payload: { status: string }
) {
  return backendFetch<{ success: boolean; data: PortalProduct }>(
    `/portal/tenants/${tenantId}/products/${productId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    false
  );
}

export async function createPortalProductsBulk(
  tenantId: string,
  payload: {
    items: Array<{
      name: string;
      sku?: string | null;
      price: number;
      stock: number;
      description?: string | null;
      categoryName?: string | null;
      currency?: string;
    }>;
  }
) {
  return backendFetch<{
    success: boolean;
    data: {
      tenantId: string;
      created: number;
      failed: number;
      results: Array<{
        row: number;
        status: "created" | "failed";
        productId?: string;
        code?: string;
      }>;
    };
  }>(
    `/portal/tenants/${tenantId}/products/bulk`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    false
  );
}

export async function getDebugInbox(limit = 50) {
  if (isBackendConfigured()) {
    return backendFetch<{ success: boolean; items: InboxItem[] }>(`/debug/inbox?limit=${limit}`, undefined, true);
  }

  return {
    success: true,
    items: localInboxItems(limit)
  };
}

export async function getDebugInboxHealth() {
  if (isBackendConfigured()) {
    return backendFetch<{ ok: boolean; size: number; max: number }>("/debug/inbox/health", undefined, true);
  }

  const size = readSaasData().messages.length;
  return {
    ok: true,
    size,
    max: DEBUG_INBOX_MAX_ITEMS
  };
}

export async function clearDebugInbox() {
  if (isBackendConfigured()) {
    return backendFetch<{ success: boolean }>("/debug/inbox/clear", { method: "POST", body: "{}" }, true);
  }

  return {
    success: true
  };
}
