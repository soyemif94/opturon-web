import { getApiBaseUrl } from "./api";
import { resolveOpturonAdminActorId } from "./saas/access";

const API_TIMEOUT_MS = Number(process.env.API_TIMEOUT_MS || 10000);

type BackendError = Error & {
  status?: number;
  body?: unknown;
};

type AdminContext = {
  session?: {
    user?: {
      id?: string;
      portalActorId?: string;
      accountScope?: string;
    };
  } | null;
  userId?: string;
  portalActorId?: string;
  globalRole?: string;
  accountScope?: string;
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

export async function callAdminPartnersBackend<T>(
  ctx: AdminContext,
  path: string,
  init?: RequestInit,
  timeoutMs = API_TIMEOUT_MS
): Promise<T> {
  const apiBase = getApiBaseUrl();
  if (!apiBase) {
    throw new Error("API base URL is not configured");
  }

  const portalKey = getPortalInternalKey();
  if (!portalKey) {
    throw new Error("PORTAL_INTERNAL_KEY is not configured");
  }

  const actorUserId = resolveOpturonAdminActorId(ctx);
  if (!actorUserId) {
    throw new Error("opturon_admin_actor_unavailable");
  }

  const headers = new Headers(init?.headers || {});
  const bodyIsFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (!bodyIsFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("x-portal-key", portalKey);
  headers.set("x-portal-actor-id", actorUserId);
  headers.delete("x-portal-actor-role");
  headers.delete("x-partner-id");

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

    if (!response.ok) {
      throw createBackendError(response.status, json, `API request failed (${response.status})`);
    }

    return json as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`API request timeout (${timeoutMs}ms)`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
