import { readSaasData } from "@/lib/saas/store";

const API_TIMEOUT_MS = Number(process.env.API_TIMEOUT_MS || 10000);
const DEBUG_INBOX_MAX_ITEMS = Number(process.env.DEBUG_INBOX_MAX_ITEMS || 200);
const PROD_BACKEND_FALLBACK = "https://opturon-api.onrender.com";

let lastApiError: { at: string; message: string; path: string } | null = null;

type BackendError = Error & {
  status?: number;
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

export function getBackendErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as BackendError).status);
    if (Number.isInteger(status) && status >= 400) {
      return status;
    }
  }
  return undefined;
}

async function backendFetch<T>(path: string, init?: RequestInit, withDebugKey = false): Promise<T> {
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
  const timeout = setTimeout(() => controller.abort("timeout"), API_TIMEOUT_MS);

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
      registerApiError(path, error);
      throw error;
    }

    clearApiError();
    return json as T;
  } catch (error) {
    const normalizedError =
      error instanceof Error && error.name === "AbortError"
        ? new Error(`API request timeout (${API_TIMEOUT_MS}ms)`)
        : error;
    registerApiError(path, normalizedError);
    throw normalizedError;
  } finally {
    clearTimeout(timeout);
  }
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
    wabaId: string | null;
    status: string | null;
  } | null;
  reason: string;
};

export async function getPortalTenantContext(tenantId: string) {
  return backendFetch<{ success: boolean; data: PortalTenantContext }>(`/portal/tenants/${tenantId}/context`, undefined, false);
}

export async function getPortalConversations(tenantId: string) {
  return backendFetch<{
    success: boolean;
    data: {
      tenantId: string;
      conversations: any[];
    };
  }>(`/portal/tenants/${tenantId}/conversations`, undefined, false);
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
  priceSnapshot: number;
  quantity: number;
  variant: string | null;
  createdAt: string;
};

export type PortalOrder = {
  id: string;
  clinicId: string;
  contactId: string | null;
  customerName: string;
  customerPhone: string;
  notes: string | null;
  subtotal: number;
  total: number;
  currency: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  updatedAt: string;
  contact: {
    id: string;
    name: string | null;
    phone: string | null;
  } | null;
  items: PortalOrderItem[];
};

export type PortalProduct = {
  id: string;
  clinicId: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  stock: number;
  status: string;
  sku: string | null;
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

export async function createPortalOrder(
  tenantId: string,
  payload: {
    customerName: string;
    customerPhone: string;
    notes?: string;
    currency?: string;
    orderStatus?: string;
    items: Array<{
      productId?: string | null;
      nameSnapshot: string;
      priceSnapshot: number;
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

export async function patchPortalOrderStatus(
  tenantId: string,
  orderId: string,
  payload: { orderStatus: string; paymentStatus?: string }
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

export async function getPortalProducts(tenantId: string) {
  return backendFetch<{
    success: boolean;
    data: {
      tenantId: string;
      products: PortalProduct[];
    };
  }>(`/portal/tenants/${tenantId}/products`, undefined, false);
}

export async function getPortalProductDetail(tenantId: string, productId: string) {
  return backendFetch<{ success: boolean; data: PortalProduct }>(
    `/portal/tenants/${tenantId}/products/${productId}`,
    undefined,
    false
  );
}

export async function createPortalProduct(
  tenantId: string,
  payload: {
    name: string;
    description?: string | null;
    price: number;
    currency?: string;
    stock?: number;
    sku?: string | null;
    status?: string;
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

export async function patchPortalProduct(
  tenantId: string,
  productId: string,
  payload: {
    name?: string;
    description?: string | null;
    price?: number;
    currency?: string;
    stock?: number;
    sku?: string | null;
    status?: string;
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
