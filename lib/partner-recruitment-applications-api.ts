import { getApiBaseUrl } from "@/lib/api";

const API_TIMEOUT_MS = Number(process.env.API_TIMEOUT_MS || 10000);

type BackendError = Error & {
  status?: number;
  body?: unknown;
};

type BackendActor = {
  partnerId?: string | null;
  adminActorId?: string | null;
  traceId?: string | null;
};

function getPortalInternalKey() {
  return String(process.env.PORTAL_INTERNAL_KEY || "").trim();
}

function createBackendError(status: number, body: unknown, fallbackMessage: string) {
  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const error = new Error(String(payload?.error || fallbackMessage)) as BackendError;
  error.status = status;
  error.body = body;
  return error;
}

export function getRecruitmentBackendErrorStatus(error: unknown) {
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as BackendError).status);
    if (Number.isInteger(status) && status >= 400) return status;
  }
  return undefined;
}

export function getRecruitmentBackendErrorBody(error: unknown) {
  if (error && typeof error === "object" && "body" in error) return (error as BackendError).body;
  return undefined;
}

export async function callPartnerRecruitmentBackend<T>(
  path: string,
  init: RequestInit = {},
  actor: BackendActor = {},
  timeoutMs = API_TIMEOUT_MS
): Promise<T> {
  const apiBase = getApiBaseUrl();
  if (!apiBase) throw new Error("API base URL is not configured");
  const portalKey = getPortalInternalKey();
  if (!portalKey) throw new Error("PORTAL_INTERNAL_KEY is not configured");

  const headers = new Headers(init.headers || {});
  const bodyIsFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!bodyIsFormData && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  headers.set("x-portal-key", portalKey);
  if (actor.partnerId) headers.set("x-partner-id", actor.partnerId);
  if (actor.adminActorId) headers.set("x-portal-actor-id", actor.adminActorId);
  if (actor.traceId) headers.set("x-partner-identity-trace-id", actor.traceId);

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
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { error: "invalid_backend_json_response" };
      }
    }
    if (!response.ok) throw createBackendError(response.status, json, `API request failed (${response.status})`);
    return json as T;
  } finally {
    clearTimeout(timeout);
  }
}
