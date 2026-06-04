const API_TIMEOUT_MS = Number(process.env.API_TIMEOUT_MS || 10000);
const PROD_BACKEND_FALLBACK = "https://opturon-api.onrender.com";

type BackendError = Error & {
  status?: number;
  body?: unknown;
};

export type TenantPolicy = {
  planCode: string;
  limits: {
    maxPortalUsers: number;
    maxAutomations: number;
    maxContacts: number;
  };
  capabilities: string[];
  enabledModules: Record<string, boolean>;
  source?: string;
};

export type AdminTenantPolicyRow = {
  id: string;
  name: string;
  displayName?: string | null;
  primaryEmail?: string | null;
  tenantId: string;
  externalTenantId: string;
  timezone?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  lifecycle?: {
    status?: string | null;
    archivedAt?: string | null;
    deletedAt?: string | null;
    activePortalUsers?: number;
    activeOwners?: number;
    visible?: boolean;
  };
  policy: TenantPolicy;
};

export type AdminBillingSubscription = {
  id: string;
  clinicId: string;
  externalTenantId: string;
  clientId?: string | null;
  planCode: "inicial" | "crecimiento" | "empresa";
  amount: number;
  currency: string;
  billingInterval: "monthly";
  mercadoPagoPreapprovalId?: string | null;
  mercadoPagoPayerEmail?: string | null;
  mercadoPagoStatus?: string | null;
  localStatus: "pending" | "active" | "paused" | "canceled" | "payment_failed" | "suspended";
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  nextBillingDate?: string | null;
  lastPaymentId?: string | null;
  lastPaymentStatus?: string | null;
  externalReference: string;
  authorizationUrl?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CreateAdminBillingSubscriptionPayload = {
  tenantId: string;
  planCode: "inicial" | "crecimiento" | "empresa";
  payerEmail: string;
  amount: number;
  currency?: string;
};

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

  return process.env.NODE_ENV === "production" ? PROD_BACKEND_FALLBACK : "";
}

function getPortalInternalKey() {
  return String(process.env.PORTAL_INTERNAL_KEY || "").trim();
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

async function backendPortalFetch<T>(path: string, init?: RequestInit, timeoutMs = API_TIMEOUT_MS): Promise<T> {
  const apiBase = getApiBase();
  if (!apiBase) throw new Error("API base URL is not configured");

  const portalKey = getPortalInternalKey();
  if (!portalKey) throw new Error("PORTAL_INTERNAL_KEY is not configured");

  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");
  headers.set("x-portal-key", portalKey);

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
    const json = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const error = new Error(json?.error || `API request failed (${response.status})`) as BackendError;
      error.status = response.status;
      error.body = json;
      throw error;
    }

    return json as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getAdminTenantPolicies() {
  return backendPortalFetch<{
    success: boolean;
    data: {
      ok: boolean;
      tenants: AdminTenantPolicyRow[];
    };
  }>("/api/admin/tenants");
}

export async function getAdminTenantPolicy(tenantId: string) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      ok: boolean;
      tenantId: string;
      clinic: {
        id: string;
        name: string | null;
        externalTenantId: string | null;
        primaryEmail?: string | null;
      };
      primaryEmail?: string | null;
      policy: TenantPolicy;
    };
  }>(`/api/admin/tenants/${encodeURIComponent(tenantId)}/policy`);
}

export async function patchAdminTenantPolicy(
  tenantId: string,
  payload: Partial<TenantPolicy> & { displayName?: string; primaryEmail?: string }
) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      ok: boolean;
      tenantId: string;
      clinic: {
        id: string;
        name: string | null;
        externalTenantId: string | null;
        primaryEmail?: string | null;
      };
      primaryEmail?: string | null;
      policy: TenantPolicy;
    };
  }>(`/api/admin/tenants/${encodeURIComponent(tenantId)}/policy`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function listAdminBillingSubscriptions(tenantId?: string) {
  const search = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
  return backendPortalFetch<{
    success: boolean;
    data: {
      ok: boolean;
      subscriptions: AdminBillingSubscription[];
    };
  }>(`/api/admin/billing/subscriptions${search}`);
}

export async function createAdminBillingSubscription(payload: CreateAdminBillingSubscriptionPayload) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      ok: boolean;
      subscription: AdminBillingSubscription;
    };
  }>("/api/admin/billing/subscriptions", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getAdminBillingSubscription(subscriptionId: string) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      ok: boolean;
      subscription: AdminBillingSubscription;
    };
  }>(`/api/admin/billing/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

export async function postAdminBillingSubscriptionAction(
  subscriptionId: string,
  action: "cancel" | "pause" | "reactivate"
) {
  return backendPortalFetch<{
    success: boolean;
    data: {
      ok: boolean;
      subscription: AdminBillingSubscription;
    };
  }>(`/api/admin/billing/subscriptions/${encodeURIComponent(subscriptionId)}/${action}`, {
    method: "POST",
    body: JSON.stringify({})
  });
}
