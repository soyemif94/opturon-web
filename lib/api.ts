const API_BASE_URL = String(process.env.API_BASE_URL || "https://api.opturon.com").replace(/\/$/, "");
const API_TIMEOUT_MS = Number(process.env.API_TIMEOUT_MS || 10000);

let lastApiError: { at: string; message: string; path: string } | null = null;

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

async function apiFetch<T>(path: string, init?: RequestInit, withDebugKey = false): Promise<T> {
  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");

  if (withDebugKey) {
    const debugKey = String(process.env.API_DEBUG_KEY || "").trim();
    if (!debugKey) {
      const error = new Error("Missing API_DEBUG_KEY for debug endpoint access");
      registerApiError(path, error);
      throw error;
    }
    headers.set("x-debug-key", debugKey);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), API_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
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
      const error = new Error(json?.error || `API request failed (${response.status})`);
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

export async function getHealth() {
  return apiFetch<{ ok: boolean; service: string }>("/health", undefined, false);
}

export async function getBuild() {
  return apiFetch<{ ok: boolean; buildId?: string; pid?: number; cwd?: string; file?: string }>("/__build", undefined, false);
}

export async function getDebugInbox(limit = 50) {
  return apiFetch<{ success: boolean; items: InboxItem[] }>(`/debug/inbox?limit=${limit}`, undefined, true);
}

export async function getDebugInboxHealth() {
  return apiFetch<{ ok: boolean; size: number; max: number }>("/debug/inbox/health", undefined, true);
}

export async function clearDebugInbox() {
  return apiFetch<{ success: boolean }>("/debug/inbox/clear", { method: "POST", body: "{}" }, true);
}
