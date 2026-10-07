const SAFE_ERROR_CODE = /^[a-z0-9_.-]{1,120}$/i;

export function formatAdminBillingActionError(status: number, body: unknown): string {
  const errorCode =
    body && typeof body === "object" && "error" in body && typeof body.error === "string"
      ? body.error.trim()
      : "";
  const safeCode = SAFE_ERROR_CODE.test(errorCode) ? `: ${errorCode}` : "";
  return `No se pudo completar la acción de suscripción (HTTP ${status}${safeCode}).`;
}
