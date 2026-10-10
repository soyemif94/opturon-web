export type OpsOpeningResult = "verified" | "invalid_password" | "access_denied" | "error";
const OPS_OPENING_REQUEST_TIMEOUT_MS = 15_000;

export async function verifyOpsOpening(request: typeof fetch = fetch, timeoutMs = OPS_OPENING_REQUEST_TIMEOUT_MS): Promise<OpsOpeningResult> {
  try {
    const response = await request("/api/app/ops/access", {
      cache: "no-store",
      credentials: "same-origin",
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (response.status === 401 || response.status === 403) return "access_denied";
    if (!response.ok) return "error";
    const payload = await response.json().catch(() => null);
    return payload?.ok === true ? "verified" : "error";
  } catch {
    return "error";
  }
}

export async function unlockAndVerifyOps(password: string, request: typeof fetch = fetch, timeoutMs = OPS_OPENING_REQUEST_TIMEOUT_MS): Promise<OpsOpeningResult> {
  try {
    const response = await request("/api/app/ops/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      credentials: "same-origin",
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({ password })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      if (response.status === 401 && payload?.error === "invalid_ops_password") return "invalid_password";
      return response.status === 401 || response.status === 403 ? "access_denied" : "error";
    }
    return verifyOpsOpening(request, timeoutMs);
  } catch {
    return "error";
  }
}
